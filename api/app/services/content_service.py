"""内容服务：读 `web/content/**` → 校验 → 进程内缓存 → 给路由用的查询方法。

**数据源是 Markdown / JSON 本身，不是任何中间产物**（D26）。
不生成 `export_content.py` 那种快照文件，理由和前端 `content-plugin.js` 拒绝写中间
JSON 完全一样：多一份产物，就多一份会过期、会被忘记重新生成的东西。

缓存策略（PLAYBOOK §5.4-A 第 3 条要求「进程内缓存，内容变更后可通过 /health 或重启刷新」）：
  · 第一次访问时读盘，结果缓存在内存里；
  · `GET /health?reload=true` 强制重读（改完内容不必重启进程）；
  · 进程重启自然也会重读。
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from ..core.config import REPO_ROOT, Settings
from ..core.errors import ContentUnavailableError, NotFoundError
from ..core.logging import get_logger
from . import content_parser as parser

logger = get_logger("api.content")


@dataclass(frozen=True)
class ContentBundle:
    """一次成功加载的结果。frozen：缓存出去的东西不该被调用方改。"""

    profile: dict[str, Any]
    now: list[dict[str, Any]]
    projects: tuple[dict[str, Any], ...]
    notes: tuple[dict[str, Any], ...]
    loaded_at: datetime
    source_dir: Path


def _summarize_errors(errors: list[tuple[str, list[str]]], limit: int = 3) -> str:
    """挑前几处错误拼成一行，给 /health 的体检单用。

    要的是「**哪个文件、什么原因**」—— 只说「内容校验未通过」，
    那下一个看到它的人还是得去翻日志才知道该打开哪个文件。
    超出的部分不在这一行里展开：体检单要能一眼看完，全量清单在日志里。
    """
    parts = [f"{path}: {messages[0]}" for path, messages in errors[:limit]]
    extra = "" if len(errors) <= limit else f"（共 {len(errors)} 处，其余见服务端日志）"
    return "；".join(parts) + extra


def _rel(path: Path) -> str:
    """绝对路径 → 相对仓库根的正斜杠路径（`web/content/projects/x.md`）。

    报错里要能一眼看出是哪个文件，所以对齐前端插件里 `rel()` 的写法。
    不在仓库根下面（比如测试用的临时目录）就退化成绝对路径。
    """
    try:
        return path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


class ContentStore:
    """一个 app 实例一个 store：缓存和配置都挂在实例上，测试之间不串味。"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._lock = threading.Lock()
        self._bundle: ContentBundle | None = None

    # ------------------------------------------------------------ 读 + 校验

    def _read_text(self, path: Path) -> tuple[str | None, str | None]:
        """读一个文本文件，**不抛异常**：读不出来就返回一句能定位原因的错误。

        为什么非要接住（D31）：内容文件坏了 —— 存成了 GBK/ANSI、权限不对 ——
        是**内容问题**，该走 503 `content_unavailable`；让它抛出去就变成
        500 `internal_error`，运维看到 500 会去翻代码，而真正该做的事是
        看看那个文件。两类问题混在一个状态码里，等于把排查方向指错。

        文案必须带**具体原因**（哪个字节解码失败），只说一句「读取失败」，
        等于把「哪个文件、为什么」留给下一个人重新去猜一遍。
        """
        try:
            return path.read_text(encoding="utf-8"), None
        except UnicodeDecodeError as exc:
            return None, (
                f"不是合法的 UTF-8 文本：第 {exc.start} 个字节处解码失败（{exc.reason}）"
                f" —— 很可能是被 GBK/ANSI 编码存过，用编辑器另存为 UTF-8 即可"
            )
        except OSError as exc:
            return None, f"读不出文件：{exc.strerror or exc}"

    def _read_markdown_dir(self, directory: Path) -> list[tuple[Path, str]]:
        """按文件名升序**列出** .md —— 顺序确定，校验顺序与报错顺序才稳定。

        只列不读：读文件可能失败，而失败必须变成一条「指向具体文件」的校验错误，
        所以交给调用方逐个读（见 _load_from_disk）。
        """
        if not directory.is_dir():
            return []
        return sorted(
            ((p, p.name) for p in directory.iterdir() if p.is_file() and p.suffix.lower() == ".md"),
            key=lambda item: item[1],
        )

    def _load_from_disk(self) -> ContentBundle:
        content_dir = self.settings.content_dir
        if not content_dir.is_dir():
            raise ContentUnavailableError(
                "内容目录不存在，服务无法启动",
                log_detail=f"CONTENT_DIR={content_dir} 不是一个目录",
            )

        errors: list[tuple[str, list[str]]] = []
        collected: dict[str, list[dict[str, Any]]] = {"projects": [], "notes": []}

        for kind, collection in parser.MD_COLLECTIONS.items():
            seen_slugs: dict[str, str] = {}
            kept: list[dict[str, Any]] = []

            for path, filename in self._read_markdown_dir(content_dir / kind):
                rel = _rel(path)

                text, read_error = self._read_text(path)
                if read_error is not None:
                    # 单独一条：这个文件连读都读不了，后面解析、校验都无从谈起
                    errors.append((rel, [f"文件: {read_error}"]))
                    continue

                data, body, error = parser.parse_front_matter(text)

                if error is not None:
                    errors.append((rel, [error]))
                    continue

                # 排除在校验【之前】：草稿里的字段拼错不该让整站报错（与 JS 一致）
                exclude = collection["exclude"]
                if exclude is not None and exclude(data):
                    continue

                messages = parser.validate_markdown(collection, rel, filename, data)
                if messages:
                    errors.append((rel, messages))

                slug = parser.slug_from_filename(filename)
                if slug in seen_slugs:
                    # slug 只在同一个集合里才是命名空间，所以按集合各自去重
                    errors.append((rel, [f"文件名: slug「{slug}」与 {seen_slugs[slug]} 重复"]))
                else:
                    seen_slugs[slug] = rel

                entry: dict[str, Any] = {"slug": slug, **data}
                if collection["with_body"]:
                    # 只有声明了 with_body 的集合才带正文，projects 的负载因此不变
                    entry["body"] = body
                kept.append(entry)

            collected[kind] = kept

        profile = self._load_profile(errors)
        now = self._load_now(errors)

        # 有错就在排序【之前】停：排序要读 order / date / title 这几个键，
        # 校验没过的条目可能缺键，硬排会抛 KeyError —— 那样 500 就把
        # 「内容坏了」这个真正的原因盖掉了。（JS 侧是先排后炸，
        # 因为 NaN 比较不会抛；对调用方而言结果一样是失败。）
        if errors:
            raise ContentUnavailableError(
                "内容数据校验未通过，服务暂不可用",
                log_detail=parser.format_errors(errors) + f"\n来源目录：{content_dir}",
                summary=_summarize_errors(errors),
            )

        for kind, collection in parser.MD_COLLECTIONS.items():
            collected[kind].sort(key=collection["sort_key"])

        bundle = ContentBundle(
            profile=profile,
            now=now,
            projects=tuple(collected["projects"]),
            notes=tuple(collected["notes"]),
            loaded_at=datetime.now(timezone.utc),
            source_dir=content_dir,
        )
        logger.info(
            "内容已加载",
            extra={
                "content_dir": str(content_dir),
                "projects": len(bundle.projects),
                "notes": len(bundle.notes),
            },
        )
        return bundle

    def _load_profile(self, errors: list[tuple[str, list[str]]]) -> dict[str, Any]:
        path = self.settings.content_dir / "profile.json"
        if not path.is_file():
            # 前端少了 profile.json 还能靠 index.html 里的静态首屏撑着，
            # 但接口没有这个退路：/profile 就是它的全部意义，缺了就是服务不可用。
            errors.append((_rel(path), ["文件不存在（/profile 依赖它）"]))
            return {}
        text, read_error = self._read_text(path)
        if read_error is not None:
            errors.append((_rel(path), [read_error]))
            return {}
        data, error = parser.parse_json_file(text)
        if error is not None:
            errors.append((_rel(path), [error]))
            return {}
        messages = parser.validate_profile(data)
        if messages:
            errors.append((_rel(path), messages))
        return data if not messages else {}

    def _load_now(self, errors: list[tuple[str, list[str]]]) -> list[dict[str, Any]]:
        path = self.settings.content_dir / "now.json"
        if not path.is_file():
            errors.append((_rel(path), ["文件不存在（/now 依赖它）"]))
            return []
        text, read_error = self._read_text(path)
        if read_error is not None:
            errors.append((_rel(path), [read_error]))
            return []
        data, error = parser.parse_json_file(text)
        if error is not None:
            errors.append((_rel(path), [error]))
            return []
        messages = parser.validate_now(data)
        if messages:
            errors.append((_rel(path), messages))
            return []
        return data

    # ------------------------------------------------------------ 缓存

    def load(self, *, force: bool = False) -> ContentBundle:
        """拿内容。默认走缓存；force=True 重新读盘（/health?reload=true 用）。

        加锁：uvicorn 默认多线程跑同步路由，两个请求同时第一次访问
        会读两遍盘 —— 不是灾难，但没必要，而且日志会重复。
        """
        if self._bundle is not None and not force:
            return self._bundle
        with self._lock:
            if self._bundle is not None and not force:
                return self._bundle
            self._bundle = self._load_from_disk()
            return self._bundle

    def invalidate(self) -> None:
        with self._lock:
            self._bundle = None

    # ------------------------------------------------------------ 查询

    def get_profile(self) -> dict[str, Any]:
        return dict(self.load().profile)

    def get_now(self) -> list[dict[str, Any]]:
        return [dict(item) for item in self.load().now]

    def list_projects(
        self, *, tag: str | None = None, status: str | None = None
    ) -> list[dict[str, Any]]:
        """列表。顺序就是构建期定好的顺序（order↑ → date↓ → title↑），这里不重排。

        过滤写在列表接口里、不写进缓存：缓存的是「全部内容」，
        过滤是每次请求的事，两者分开才不会出现「换了个 tag 却拿到上次的缓存」。
        """
        items: Iterable[dict[str, Any]] = self.load().projects
        if tag is not None:
            items = (item for item in items if tag in item.get("tags", []))
        if status is not None:
            items = (item for item in items if item.get("status") == status)
        return [dict(item) for item in items]

    def get_project(self, slug: str) -> dict[str, Any]:
        for item in self.load().projects:
            if item["slug"] == slug:
                return dict(item)
        raise NotFoundError(f"项目「{slug}」")

    def list_notes(self) -> list[dict[str, Any]]:
        """列表**不含正文**（ARCHITECTURE §6：详情才含正文）。"""
        return [{k: v for k, v in item.items() if k != "body"} for item in self.load().notes]

    def get_note(self, slug: str) -> dict[str, Any]:
        for item in self.load().notes:
            if item["slug"] == slug:
                return dict(item)
        raise NotFoundError(f"笔记「{slug}」")

    # ------------------------------------------------------------ 健康检查

    def health(self) -> dict[str, Any]:
        """依赖状态。**不抛异常**：健康检查必须能回答「坏在哪」，而不是自己也坏掉。"""
        try:
            bundle = self.load()
        except ContentUnavailableError as exc:
            return {
                "status": "error",
                # 这里刻意给**具体**的一句（哪个文件、什么原因），
                # 而普通 503 响应体里的 message 保持通用 —— 见 errors.ApiError.summary
                "detail": exc.summary or exc.message,
                "source_dir": str(self.settings.content_dir),
            }
        except Exception as exc:  # noqa: BLE001 —— 这里是**故意**兜住一切（D31）
            # 上面那句「不能自己也坏掉」原来的实现只接住了 ContentUnavailableError，
            # 而内容读取失败抛的是 UnicodeDecodeError / OSError —— 它会穿出去，
            # 于是「探活」自己变成 500：最需要它回答「坏在哪」的时候，它失联了。
            # 所以这里放宽到 Exception：异常进日志（带堆栈），体检单照常返回。
            logger.exception(
                "健康检查时内容加载抛出未预期异常",
                extra={"content_dir": str(self.settings.content_dir)},
            )
            return {
                "status": "error",
                "detail": f"内容加载时抛出未预期的异常（{type(exc).__name__}）—— 详见服务端日志",
                "source_dir": str(self.settings.content_dir),
            }
        return {
            "status": "ok",
            "detail": "内容已加载",
            "source_dir": str(bundle.source_dir),
            "projects": len(bundle.projects),
            "notes": len(bundle.notes),
            "loaded_at": bundle.loaded_at.isoformat(timespec="seconds"),
        }
