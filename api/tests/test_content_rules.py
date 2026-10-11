"""内容规则测试：不是「接口通不通」，而是「规则抄得对不对」。

这里覆盖的每一条，都能在前端 `web/build/content-schema.js` 里找到对应的一行。
测试用**真实内容的副本**（temp_content_dir）再往里加文件 ——
`s web/content/` 是用户的写作，任何测试都不许往里写东西。
"""

from __future__ import annotations

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


def test_draft_note_never_appears_anywhere(temp_content_dir: Path) -> None:
    """draft: true 的笔记不得出现在任何结果里（与构建期排除一致）。

    顺带证明「排除发生在校验之前」：这篇草稿里 `sumary` 是拼错的字段，
    如果它走了校验，整份内容就会因为这篇草稿而 503 —— 草稿不该受构建约束。
    """
    (temp_content_dir / "notes" / "draft-note.md").write_text(
        NOTE.format(draft="true").replace("summary:", "sumary:"), encoding="utf-8"
    )

    with client_for(temp_content_dir) as client:
        listed = client.get("/api/v1/notes").json()
        assert listed["total"] == 1
        assert [n["slug"] for n in listed["items"]] == ["function-definition-vs-call"]
        assert client.get("/api/v1/notes/draft-note").status_code == 404
        # 整份内容仍然健康：草稿的字段错误没有把服务拖下水
        assert client.get("/api/v1/health").status_code == 200


def test_non_draft_note_appears_and_sorts_by_date_desc(temp_content_dir: Path) -> None:
    (temp_content_dir / "notes" / "newer-note.md").write_text(
        NOTE.format(draft="false"), encoding="utf-8"
    )
    with client_for(temp_content_dir) as client:
        items = client.get("/api/v1/notes").json()["items"]
        # 2026-10-12 比 2026-10-11 新 → 排前面
        assert [n["slug"] for n in items] == ["newer-note", "function-definition-vs-call"]


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


def test_unknown_field_fails_loudly(temp_content_dir: Path) -> None:
    """拼错的字段名必须当场失败，而不是悄悄少一个字段。"""
    _write_project(
        temp_content_dir,
        "typo.md",
        "title: 拼错了字段\nstatus: done\ndate: 2026-10-11\ntags: [X]\nsummary: 摘要\norder: 9\nsumary: 多余的",
    )
    with pytest.raises(ContentUnavailableError) as excinfo:
        store_for(temp_content_dir).load()
    assert "未知字段" in excinfo.value.log_detail
    assert "typo.md" in excinfo.value.log_detail


def test_unreal_date_is_rejected(temp_content_dir: Path) -> None:
    """格式对、日子不存在（2 月 30 日）也要挡住。"""
    _write_project(
        temp_content_dir,
        "bad-date.md",
        "title: 假日期\nstatus: done\ndate: 2026-02-30\ntags: [X]\nsummary: 摘要\norder: 9",
    )
    with pytest.raises(ContentUnavailableError) as excinfo:
        store_for(temp_content_dir).load()
    assert "不是真实存在的日期" in excinfo.value.log_detail


def test_status_enum_is_enforced(temp_content_dir: Path) -> None:
    _write_project(
        temp_content_dir,
        "bad-status.md",
        "title: 状态非法\nstatus: 做完了\ndate: 2026-10-11\ntags: [X]\nsummary: 摘要\norder: 9",
    )
    with pytest.raises(ContentUnavailableError) as excinfo:
        store_for(temp_content_dir).load()
    assert "允许：done | wip | planned" in excinfo.value.log_detail


def test_filename_must_be_kebab_case(temp_content_dir: Path) -> None:
    _write_project(
        temp_content_dir,
        "Bad_Name.md",
        "title: 文件名不规范\nstatus: done\ndate: 2026-10-11\ntags: [X]\nsummary: 摘要\norder: 9",
    )
    with pytest.raises(ContentUnavailableError) as excinfo:
        store_for(temp_content_dir).load()
    assert "kebab-case" in excinfo.value.log_detail


def test_only_first_level_markdown_files_are_read(temp_content_dir: Path) -> None:
    """只读目录**第一层**的 .md；子目录与别的扩展名都不算内容。

    这条锁的是「谁会被读到」——它也是规则的一部分，而且比看上去重要：
    在子目录里放一个 .md 想「先存着不发布」，它本来就不该出现；
    而一个**名叫 x.md 的目录**在前端那边会被 readdirSync 当成条目读进来，
    readFileSync 直接 EISDIR。这里按 is_file 过滤，比 JS 更稳。
    """
    nested = temp_content_dir / "projects" / "nested.md"  # 一个「长得像 .md 的目录」
    nested.mkdir()
    (nested / "inner.md").write_text("不会被读到\n", encoding="utf-8")
    (temp_content_dir / "projects" / "draft.txt").write_text("不是 markdown\n", encoding="utf-8")

    slugs = [p["slug"] for p in store_for(temp_content_dir).list_projects()]
    assert slugs == ["personal-portfolio", "notes-collection", "data-toolkit", "api-service"]


# --------------------------------------------------------------- 排序兜底


def test_title_tiebreak_is_codepoint_not_pinyin(temp_content_dir: Path) -> None:
    """⚠️ 本条锁的是**已知差异**，不是「正确行为」。

    JS 侧用 `localeCompare(other, 'zh')`（ICU 拼音序），Python 标准库没有拼音，
    用的是码点序。「本站笔记合集」(ben…) 拼音在前，「数据小工具」(shu…) 在后；
    码点则是 数 U+6570 < 本 U+672C，顺序相反。

    它只在 order + date 全打平时才出现，当前内容不触发。
    引入拼音库去「差不多地」模拟，比一个明确的差异更糟，所以先记下来。
    哪天架构师定了口径（比如两边都改用码点），改这一个测试就是全部的改动。
    """
    order = "status: done\ndate: 2026-10-11\ntags: [X]\nsummary: 摘要\norder: 1"
    _write_project(temp_content_dir, "pinyin-a.md", f"title: 本站笔记合集\n{order}")
    _write_project(temp_content_dir, "pinyin-b.md", f"title: 数据小工具\n{order}")

    slugs = [p["slug"] for p in store_for(temp_content_dir).list_projects()]
    # 码点序：数(6570) < 本(672C) → pinyin-b 在前（而 ICU 拼音序会给出相反的答案）
    assert slugs.index("pinyin-b") < slugs.index("pinyin-a")
