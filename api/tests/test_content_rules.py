"""内容规则测试：不是「接口通不通」，而是「规则抄得对不对」。

这里覆盖的每一条，都能在前端 `web/build/content-schema.js` 里找到对应的一行。

**D41：这里用「合成内容」，不再用 `web/content/**` 的副本。**
规则测试要的是「一个内容目录」，不是「作者正好写了几篇」：拿真实内容当底，
作者加一篇笔记就可能让名单断言变红 —— 而它想验的是规则，不是写作。
所以下面的内容与期望名单来自**同一组常量**（测试自己写下来的），
真实内容怎么长都不影响这里；`web/content/` 是用户的写作，任何测试都不许往里写东西。
（「真实内容跑出来对不对」由 tests/contract/ 的契约测试负责，那边比的是 fixture。）
"""

from __future__ import annotations

import json
from contextlib import contextmanager
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import DEFAULT_CORS_ORIGINS, Settings
from app.core.errors import ContentUnavailableError
from app.main import create_app
from app.services import content_parser as parser
from app.services.content_service import ContentStore


@contextmanager
def client_for(content_dir: Path):
    app = create_app(
        Settings(env="test", content_dir=Path(content_dir), cors_origins=DEFAULT_CORS_ORIGINS)
    )
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


def store_for(content_dir: Path) -> ContentStore:
    return ContentStore(
        Settings(env="test", content_dir=Path(content_dir), cors_origins=DEFAULT_CORS_ORIGINS)
    )


# --------------------------------------------------------------- 合成内容
#
# 一份最小、合法、和作者写作无关的内容目录。写成 (slug, front-matter) 的形式：
# 文件由这些元组生成，断言也拿同一批 slug —— 一处定义，两处使用，对不上才奇怪。

SYNTHETIC_PROFILE = {
    "name": "合成用户",
    "tagline": "这份资料由测试自己生成，不是作者的写作。",
    "email": "synthetic@example.com",
    "github": "https://github.com/synthetic",
    "heroChips": ["合成内容"],
    "about": ["用来跑内容规则的合成资料。"],
    "learning": ["规则测试"],
    "skills": [{"title": "合成技能", "items": ["合成"]}],
}

SYNTHETIC_NOW = [
    {"text": "合成近况一。", "date": "2026-01-01", "status": "doing"},
    {"text": "合成近况二。", "date": "2026-01-02", "status": "planned"},
]

# 列表顺序即 order 升序 = 接口该给出的顺序
SYNTHETIC_PROJECTS = (
    (
        "synthetic-alpha",
        "title: 合成项目甲\nstatus: done\ndate: 2026-01-02\ntags: [Synthetic]\n"
        "summary: 合成摘要甲。\norder: 1\n"
        "repo: https://example.invalid/alpha\nlive: https://example.invalid/alpha-live\n"
        "featured: true",
    ),
    (
        "synthetic-beta",
        "title: 合成项目乙\nstatus: planned\ndate: 2026-01-01\ntags: [Synthetic, Second]\n"
        "summary: 合成摘要乙。\norder: 2",
    ),
)

# 列表顺序即 date 降序 = 接口该给出的顺序
SYNTHETIC_NOTES = (
    (
        "synthetic-note-newer",
        "title: 合成笔记（新）\ndate: 2026-01-02\ntags: [Synthetic]\nsummary: 合成笔记摘要。",
    ),
    (
        "synthetic-note-older",
        "title: 合成笔记（旧）\ndate: 2026-01-01\ntags: [Synthetic]\nsummary: 合成笔记摘要。",
    ),
)

SYNTHETIC_PROJECT_SLUGS = tuple(slug for slug, _ in SYNTHETIC_PROJECTS)
SYNTHETIC_NOTE_SLUGS = tuple(slug for slug, _ in SYNTHETIC_NOTES)

# 甲写了链接、乙没写 —— 「可选字段缺省补 null」两边都有样本
SYNTHETIC_PROJECT_WITH_LINKS = "synthetic-alpha"
SYNTHETIC_PROJECT_WITHOUT_LINKS = "synthetic-beta"


@pytest.fixture
def synthetic_content_dir(tmp_path: Path) -> Path:
    """把上面那份合成内容落到临时目录里（测试专属，跑完即弃）。"""
    target = tmp_path / "synthetic-content"
    (target / "projects").mkdir(parents=True)
    (target / "notes").mkdir()
    _write_json(target / "profile.json", SYNTHETIC_PROFILE)
    _write_json(target / "now.json", SYNTHETIC_NOW)
    for slug, front_matter in SYNTHETIC_PROJECTS:
        _write_markdown(target / "projects" / f"{slug}.md", front_matter)
    for slug, front_matter in SYNTHETIC_NOTES:
        _write_markdown(target / "notes" / f"{slug}.md", front_matter)
    return target


def _write_json(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _write_markdown(path: Path, front_matter: str, body: str = "合成正文。\n") -> None:
    path.write_text(f"---\n{front_matter}\n---\n\n{body}", encoding="utf-8")


NOTE = """---
title: 一篇新笔记
date: 2026-10-12
tags: [Python]
summary: 用来测排序与草稿排除。
draft: {draft}
---

正文第一行。
"""


# --------------------------------------------------------------- 草稿排除


def test_draft_note_never_appears_anywhere(synthetic_content_dir: Path) -> None:
    """draft: true 的笔记不得出现在任何结果里（与构建期排除一致）。

    顺带证明「排除发生在校验之前」：这篇草稿里 `sumary` 是拼错的字段，
    如果它走了校验，整份内容就会因为这篇草稿而 503 —— 草稿不该受构建约束。
    """
    (synthetic_content_dir / "notes" / "draft-note.md").write_text(
        NOTE.format(draft="true").replace("summary:", "sumary:"), encoding="utf-8"
    )

    with client_for(synthetic_content_dir) as client:
        listed = client.get("/api/v1/notes").json()
        # 期望名单 = 合成内容里那几篇非草稿笔记（顺序：date 降序）
        assert listed["total"] == len(SYNTHETIC_NOTE_SLUGS)
        assert [n["slug"] for n in listed["items"]] == list(SYNTHETIC_NOTE_SLUGS)
        assert client.get("/api/v1/notes/draft-note").status_code == 404
        # 整份内容仍然健康：草稿的字段错误没有把服务拖下水
        assert client.get("/api/v1/health").status_code == 200


def test_non_draft_note_appears_and_sorts_by_date_desc(synthetic_content_dir: Path) -> None:
    """新写的笔记按 date 降序排到最前（若写成升序，它会沉到合成笔记后面）。"""
    (synthetic_content_dir / "notes" / "newer-note.md").write_text(
        NOTE.format(draft="false"), encoding="utf-8"
    )
    with client_for(synthetic_content_dir) as client:
        items = client.get("/api/v1/notes").json()["items"]

    # NOTE 的日期（2026-10-12）比合成笔记那两篇（2026-01-0x）新 → 排最前；
    # 其余保持合成内容自己的顺序（date 降序）
    assert [n["slug"] for n in items] == ["newer-note", *SYNTHETIC_NOTE_SLUGS]


def test_optional_project_fields_default_to_null(synthetic_content_dir: Path) -> None:
    """可选字段缺省 → 接口补 null，而不是省略键（前端不用先判 `'repo' in p`）。

    这条**必须**用合成内容：它要的前提是「内容里确实没写 repo / live / featured」。
    真实内容一旦把每个项目的链接都补齐，样本就会变成 0 个、断言悄悄空转；
    合成内容里甲写了、乙没写，两边永远都有样本。
    """
    with client_for(synthetic_content_dir) as client:
        items = {
            item["slug"]: item for item in client.get("/api/v1/projects").json()["items"]
        }

    with_links = items[SYNTHETIC_PROJECT_WITH_LINKS]
    assert with_links["repo"] and with_links["live"]
    assert with_links["featured"] is True

    without_links = items[SYNTHETIC_PROJECT_WITHOUT_LINKS]
    for key in ("repo", "live", "featured"):
        assert key in without_links, f"{key} 被省略了，应该补 null"
        assert without_links[key] is None


# --------------------------------------------------------------- front-matter


def test_date_is_a_string_not_a_date_object() -> None:
    """PyYAML 默认按 YAML 1.1 把 `date: 2026-10-11` 变成 datetime.date。

    那样进 JSON 就换了形状（还可能带时区），前端拿到的构建期产物是纯字符串，
    两边就分叉了。JS 侧为此弃用了 gray-matter，这里必须同样处理。
    """
    data, body, error = parser.parse_front_matter("---\ndate: 2026-10-11\n---\n正文\n")
    assert error is None
    assert data == {"date": "2026-10-11"}
    assert isinstance(data["date"], str)
    assert body == "正文"


def test_crlf_front_matter_keeps_booleans_boolean() -> None:
    """Windows 上写出来的文件是 CRLF，front-matter 最后一行会带着 \\r。

    不归一化的话 `draft: false` 会变成字符串 "false\\r"，草稿就绕过了排除。
    """
    data, _, error = parser.parse_front_matter("---\r\ndraft: false\r\n---\r\n")
    assert error is None
    assert data["draft"] is False


def test_unclosed_front_matter_is_rejected() -> None:
    data, _, error = parser.parse_front_matter("---\ntitle: 没有闭合\n")
    assert data is None
    assert "找不到结束的 ---" in error


# --------------------------------------------------------------- 校验规则


def _write_project(content_dir: Path, name: str, front_matter: str) -> None:
    (content_dir / "projects" / name).write_text(f"---\n{front_matter}\n---\n\n正文\n", encoding="utf-8")


def test_unknown_field_fails_loudly(synthetic_content_dir: Path) -> None:
    """拼错的字段名必须当场失败，而不是悄悄少一个字段。"""
    _write_project(
        synthetic_content_dir,
        "typo.md",
        "title: 拼错了字段\nstatus: done\ndate: 2026-10-11\ntags: [X]\nsummary: 摘要\norder: 9\nsumary: 多余的",
    )
    with pytest.raises(ContentUnavailableError) as excinfo:
        store_for(synthetic_content_dir).load()
    assert "未知字段" in excinfo.value.log_detail
    assert "typo.md" in excinfo.value.log_detail


def test_unreal_date_is_rejected(synthetic_content_dir: Path) -> None:
    """格式对、日子不存在（2 月 30 日）也要挡住。"""
    _write_project(
        synthetic_content_dir,
        "bad-date.md",
        "title: 假日期\nstatus: done\ndate: 2026-02-30\ntags: [X]\nsummary: 摘要\norder: 9",
    )
    with pytest.raises(ContentUnavailableError) as excinfo:
        store_for(synthetic_content_dir).load()
    assert "不是真实存在的日期" in excinfo.value.log_detail


def test_status_enum_is_enforced(synthetic_content_dir: Path) -> None:
    _write_project(
        synthetic_content_dir,
        "bad-status.md",
        "title: 状态非法\nstatus: 做完了\ndate: 2026-10-11\ntags: [X]\nsummary: 摘要\norder: 9",
    )
    with pytest.raises(ContentUnavailableError) as excinfo:
        store_for(synthetic_content_dir).load()
    assert "允许：done | wip | planned" in excinfo.value.log_detail


def test_filename_must_be_kebab_case(synthetic_content_dir: Path) -> None:
    _write_project(
        synthetic_content_dir,
        "Bad_Name.md",
        "title: 文件名不规范\nstatus: done\ndate: 2026-10-11\ntags: [X]\nsummary: 摘要\norder: 9",
    )
    with pytest.raises(ContentUnavailableError) as excinfo:
        store_for(synthetic_content_dir).load()
    assert "kebab-case" in excinfo.value.log_detail


def test_only_first_level_markdown_files_are_read(synthetic_content_dir: Path) -> None:
    """只读目录**第一层**的 .md；子目录与别的扩展名都不算内容。

    这条锁的是「谁会被读到」——它也是规则的一部分，而且比看上去重要：
    在子目录里放一个 .md 想「先存着不发布」，它本来就不该出现；
    而一个**名叫 x.md 的目录**在前端那边会被 readdirSync 当成条目读进来，
    readFileSync 直接 EISDIR。这里按 is_file 过滤，比 JS 更稳。
    """
    nested = synthetic_content_dir / "projects" / "nested.md"  # 一个「长得像 .md 的目录」
    nested.mkdir()
    (nested / "inner.md").write_text("不会被读到\n", encoding="utf-8")
    (synthetic_content_dir / "projects" / "draft.txt").write_text("不是 markdown\n", encoding="utf-8")

    slugs = [p["slug"] for p in store_for(synthetic_content_dir).list_projects()]
    # 名单 = 合成内容里那几个项目（顺序：order 升序）；子目录里的 .md 与 .txt 都不该冒出来
    assert slugs == list(SYNTHETIC_PROJECT_SLUGS)


# --------------------------------------------------------------- 排序兜底


def test_title_tiebreak_matches_js_code_point_order(synthetic_content_dir: Path) -> None:
    """标题打平时按**码点序** —— 这是 D30 定下的、两侧共用的规则。

    「本站笔记合集」(ben…) 的拼音在前，「数据小工具」(shu…) 在后，这是 ICU 的答案；
    码点序（数 U+6570 < 本 U+672C）给出相反的顺序。D30 选了码点序，
    JS 侧已同步改成 `compareCodePoint`（`web/build/content-schema.js`），
    所以这个断言锁的**不再是「差异」，而是「同一条规则」**。

    为什么不在契约测试里比：契约测试对的是 `web/content/projects` 里那几个项目，
    而它需要「同 order 同 date」这种并列才触发，真实内容里没有 ——
    往里加两个专为测试存在的项目就等于往用户的写作里塞东西，不能那么干。
    所以这条由 Python 侧钉住，JS 侧由 `compareCodePoint` 的注释与代码本身钉住。
    （现在这里用合成内容，加项目就是在测试自己的地盘上加，没有任何顾虑。）
    """
    order = "status: done\ndate: 2026-10-11\ntags: [X]\nsummary: 摘要\norder: 1"
    _write_project(synthetic_content_dir, "pinyin-a.md", f"title: 本站笔记合集\n{order}")
    _write_project(synthetic_content_dir, "pinyin-b.md", f"title: 数据小工具\n{order}")

    slugs = [p["slug"] for p in store_for(synthetic_content_dir).list_projects()]
    # 码点序：数(6570) < 本(672C) → pinyin-b 在前（ICU 拼音序会给出相反的答案）
    assert slugs.index("pinyin-b") < slugs.index("pinyin-a")


# --------------------------------------------------------------- 文件读不出来（D31）
#
# 这组是架构师核验时实测出来的真缺陷：内容文件不是合法 UTF-8 时，
# read_text 抛的 UnicodeDecodeError 直接穿透 → /projects 500、/health 也 500。
# 但「文件坏了」是**内容问题**（可自愈），该走 503 content_unavailable；
# 500 会把运维引去查代码，而真正该做的事是打开那个文件看一眼。


def _gbk_bytes(text: str) -> bytes:
    """把文本按 GBK 编码，并**当场断言**它确实不是合法 UTF-8。

    这个前提不是废话：GBK 里有一部分字节序列**恰好也是合法 UTF-8**
    （例如「目录」的 GBK 字节 C4 BF C2 BC 解码出来是两个字），
    不做这个自检，测试可能悄悄测了个「合法文件」还显示通过。
    """
    raw = text.encode("gbk")
    with pytest.raises(UnicodeDecodeError):
        raw.decode("utf-8")
    return raw


def test_non_utf8_markdown_is_503_not_500(synthetic_content_dir: Path) -> None:
    (synthetic_content_dir / "projects" / "gbk-saved.md").write_bytes(
        _gbk_bytes(
            "---\ntitle: 用 GBK 存过的项目\nstatus: done\ndate: 2026-10-11\n"
            "tags: [中文]\nsummary: 中文摘要\norder: 9\n---\n\n正文\n"
        )
    )

    with client_for(synthetic_content_dir) as client:
        response = client.get("/api/v1/projects")
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "content_unavailable"

        # /health 必须给得出答案，而不是自己也 500
        health = client.get("/api/v1/health")
        assert health.status_code == 503
        assert health.json()["status"] == "degraded"
        content = health.json()["dependencies"]["content"]
        assert content["status"] == "error"
        # 而且答案要**具体**：哪个文件、什么原因 —— 否则等于没说
        assert "gbk-saved.md" in content["detail"]
        assert "UTF-8" in content["detail"]


def test_non_utf8_profile_json_is_503(synthetic_content_dir: Path) -> None:
    (synthetic_content_dir / "profile.json").write_bytes(_gbk_bytes('{"name": "合成用户"}'))

    with client_for(synthetic_content_dir) as client:
        response = client.get("/api/v1/profile")
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "content_unavailable"

        health = client.get("/api/v1/health")
        assert health.status_code == 503
        assert "profile.json" in health.json()["dependencies"]["content"]["detail"]


def test_non_utf8_now_json_is_503(synthetic_content_dir: Path) -> None:
    """now.json 非 UTF-8：和 .md、profile.json 一样归 503。

    三处读取路径（集合目录下的 .md、profile.json、now.json）现在走的是同一个
    `_read_text()`，但**每个入口都值得各测一遍** —— 这正是一个入口被漏掉时
    最容易出错的地方（D31 起初就是只在 .md 上被发现，另外两处是第二轮冷启动才中的）。
    """
    (synthetic_content_dir / "now.json").write_bytes(
        _gbk_bytes('[{"text": "在学 Python", "date": "2026-10-11", "status": "doing"}]')
    )

    with client_for(synthetic_content_dir) as client:
        response = client.get("/api/v1/now")
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "content_unavailable"

        health = client.get("/api/v1/health")
        assert health.status_code == 503
        assert "now.json" in health.json()["dependencies"]["content"]["detail"]


def test_read_failure_message_names_the_file_and_the_reason(synthetic_content_dir: Path) -> None:
    """报错要能看出**哪个文件**、**什么原因** —— 只说一句「读取失败」等于没说。"""
    (synthetic_content_dir / "projects" / "broken.md").write_bytes(b"---\ntitle: \xff\xfe bad\n---\n\n")

    with pytest.raises(ContentUnavailableError) as excinfo:
        store_for(synthetic_content_dir).load()

    detail = excinfo.value.log_detail
    assert "broken.md" in detail  # 哪个文件
    assert "UTF-8" in detail  # 什么原因
    assert "字节" in detail


def test_health_never_raises_even_on_unexpected_errors(tmp_path: Path, monkeypatch) -> None:
    """`/health` 永不 500 的最后一道保险。

    内容读取失败现在会被收进 errors（上面几条），所以这条测的是**更外层**：
    万一 load() 抛的是完全没预料到的异常，health() 也必须返回一张体检单
    （status: error + 原因 + 堆栈进日志），而不是把 500 抛给探活方。
    """

    def explode(self) -> None:
        raise RuntimeError("假设的意外，用来验证 health 的兜底分支")

    monkeypatch.setattr(ContentStore, "_load_from_disk", explode)

    status = store_for(tmp_path).health()  # 关键：不抛
    assert status["status"] == "error"
    assert "RuntimeError" in status["detail"]
