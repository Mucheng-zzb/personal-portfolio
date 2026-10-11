"""契约测试：Python 侧的解析结果，必须与 JS 侧（content-schema.js）逐字一致。

这三个测试是「前后端说同一套话」的唯一机器保证（HANDOFF §1.5 的「一致性必须由测试
保证，不能靠自觉」）。它们比的是**解析层**的输出，不是 HTTP 响应 ——
响应模型会把缺省的 repo/live 补成 null，那是刻意的形状选择，
而「解析结果」这一层应该和构建期产物一模一样。

fixture 怎么来的：仓库根跑 `node api/tests/contract/regen_fixture.mjs`。
它过期了（比如改了 web/content/），测试就该红 —— 那正是它存在的意义。
"""

from __future__ import annotations

from app.services.content_service import ContentStore


def _keys(dicts: list[dict]) -> list[list[str]]:
    """每个字典的键顺序。dict 相等不看顺序，但前端产物是按顺序序列化的，
    顺序变了说明字段的来源变了，值得单独断言一次。"""
    return [list(item) for item in dicts]


def test_projects_identical_to_js(js_fixture: dict, store: ContentStore) -> None:
    expected = js_fixture["projects"]
    actual = store.list_projects()

    # ① slug 集合与顺序（order↑ → date↓ → title↑）
    assert [p["slug"] for p in actual] == [p["slug"] for p in expected]
    # ② 全字段逐字相等：title / status / date / tags / summary / order
    #    以及可选的 repo / live / cover / featured（缺省就是缺省，不补 null）
    assert actual == expected
    # ③ 键顺序也一致
    assert _keys(actual) == _keys(expected)


def test_notes_identical_to_js(js_fixture: dict, store: ContentStore) -> None:
    expected = js_fixture["notes"]
    detail_actual = [store.get_note(n["slug"]) for n in expected]

    assert [n["slug"] for n in detail_actual] == [n["slug"] for n in expected]
    # 笔记的期望值里带 body（详情要渲染正文），这里逐字比
    assert detail_actual == expected
    assert _keys(detail_actual) == _keys(expected)

    # 列表接口**不含**正文（ARCHITECTURE §6），但其余字段与详情一致
    listed = store.list_notes()
    assert [n["slug"] for n in listed] == [n["slug"] for n in expected]
    for item in listed:
        assert "body" not in item
    assert listed == [{k: v for k, v in n.items() if k != "body"} for n in expected]


def test_profile_and_now_identical_to_js(js_fixture: dict, store: ContentStore) -> None:
    assert store.get_profile() == js_fixture["profile"]
    assert store.get_now() == js_fixture["now"]
