"""接口行为测试：端点齐全、过滤、分页边界、404、错误结构、CORS、请求 id、500 不泄漏堆栈。

契约（「数据对不对」）在 tests/contract/ 里；这里管「接口的行为对不对」。

**D41：内容事实（有几篇、哪几个 slug、谁排前面）一律从契约 fixture 推导，不写字面量。**
这些数字与名单是 `web/content/**` 的属性，不是接口的属性：写死的话，作者加一篇笔记
就会让「接口行为」测试变红 —— 红的是「写作变了」，排查方向却被指到接口身上。
所以这里比的是「接口算出来的 == Node 算出来的」（`fixture_js.json`），内容怎么长都不影响这一层。
与内容无关的**规则**照旧写死：状态码、错误体形状、limit 默认/上限/越界 422、404 的 code、
tag 的精确与大小写敏感；「缺省字段补 null」另由 tests/test_content_rules.py 的合成内容兜底。
"""

from __future__ import annotations

import re
from pathlib import Path

from app.services.content_service import ContentStore

EXPECTED_PATHS = {
    "/api/v1/health",
    "/api/v1/now",
    "/api/v1/notes",
    "/api/v1/notes/{slug}",
    "/api/v1/profile",
    "/api/v1/projects",
    "/api/v1/projects/{slug}",
}

HEX32 = re.compile(r"^[0-9a-f]{32}$")

# Profile 里「内容可以不写」的字段（schemas.Profile 的默认 None 那一组）。
# 这是**形状**约定，不是内容事实，所以写在这里；它们的值是 null 由上面那条测试验。
OPTIONAL_PROFILE_KEYS = ("location", "resume")


def _slugs(items: list[dict]) -> list[str]:
    """只取 slug —— 顺序断言用它，读起来也比列表推导清楚。"""
    return [item["slug"] for item in items]


def _fixture_tags(js_fixture: dict) -> list[str]:
    """契约 fixture 里出现过的所有标签（去重后排序）。

    用它当 tag 查询的参数：「查什么」也来自内容，不写死 `tag=Python` 这种具体值。
    """
    return sorted({tag for project in js_fixture["projects"] for tag in project["tags"]})


# --------------------------------------------------------------- 端点齐全


def test_openapi_exposes_exactly_seven_endpoints(client) -> None:
    assert client.get("/docs").status_code == 200
    paths = client.get("/openapi.json").json()["paths"]
    assert set(paths) == EXPECTED_PATHS
    # 每个端点都只有 GET：只读接口不该有第二条动词
    for path, operations in paths.items():
        assert set(operations) == {"get"}, f"{path} 出现了非 GET 方法：{set(operations)}"


def test_health_reports_dependency_status(client, js_fixture) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "ok"
    assert body["env"] == "test"
    content = body["dependencies"]["content"]
    assert content["status"] == "ok"
    # 计数从契约 fixture 推导（D41）：体检单报的就是「读到了几篇」
    assert content["projects"] == len(js_fixture["projects"])
    assert content["notes"] == len(js_fixture["notes"])
    assert body["request_id"] == response.headers["X-Request-Id"]


def test_health_reload_query_forces_reread(client) -> None:
    assert client.get("/api/v1/health?reload=true").status_code == 200


# --------------------------------------------------------------- /health 的路径暴露（D33）


def _health_content_detail(client) -> dict:
    return client.get("/api/v1/health").json()["dependencies"]["content"]


def test_health_keeps_absolute_path_locally(client) -> None:
    """本地/测试：给绝对路径，一眼看出读的是哪份内容。"""
    assert Path(_health_content_detail(client)["source_dir"]).is_absolute()


def test_health_hides_absolute_path_in_production(temp_content_dir) -> None:
    """ENV=production：只给相对仓库根的路径，绝不吐绝对路径。

    判据用的是**不变式**而不是某个固定字符串：被测目录可能在仓库根之下
    （给相对路径），也可能不在（干脆不给路径）—— 两种都行，**绝对路径不行**。
    顺带钉住架构师担心的那件事：不能把本机用户名带出去。
    """
    from fastapi.testclient import TestClient

    from app.core.config import DEFAULT_CORS_ORIGINS, Settings
    from app.main import create_app

    app = create_app(
        Settings(env="production", content_dir=temp_content_dir, cors_origins=DEFAULT_CORS_ORIGINS)
    )
    with TestClient(app) as production_client:
        reported = _health_content_detail(production_client)["source_dir"]

    assert not Path(reported).is_absolute(), reported
    assert str(temp_content_dir) not in reported
    # 真正的威胁是「主机目录结构 / 本机用户名被写进公网响应」：
    # 绝对路径一定含 home 目录（仓库就在它下面），这条能抓住回归。
    # 不拿 Path.home().name 单独断言 —— 那会被 pytest 自己的临时目录名
    # （api/pytest-of-<用户名>/…）误伤，而那不是主机路径泄漏。
    assert str(Path.home()) not in reported


def test_health_hides_path_in_production_even_when_content_is_broken(tmp_path) -> None:
    """内容坏了走 error 分支时，同样不许暴露绝对路径（D33 覆盖两条返回路径）。"""
    from fastapi.testclient import TestClient

    from app.core.config import DEFAULT_CORS_ORIGINS, Settings
    from app.main import create_app

    app = create_app(
        Settings(env="production", content_dir=tmp_path / "nope", cors_origins=DEFAULT_CORS_ORIGINS)
    )
    with TestClient(app) as production_client:
        response = production_client.get("/api/v1/health")
        assert response.status_code == 503
        detail = response.json()["dependencies"]["content"]

    assert detail["status"] == "error"
    assert not Path(detail["source_dir"]).is_absolute(), detail["source_dir"]


# --------------------------------------------------------------- 六个内容端点


def test_profile(client, js_fixture) -> None:
    """字段值 = 契约 fixture；契约里省略的可选字段补 null，且不多带别的键。"""
    body = client.get("/api/v1/profile").json()
    expected = js_fixture["profile"]

    for key, value in expected.items():
        assert body[key] == value, f"{key} 与契约 fixture 不一致"

    # 内容里没写的可选字段：补 null，而不是省略键（前端不用先判 'location' in p）
    for key in OPTIONAL_PROFILE_KEYS:
        if key not in expected:
            assert key in body and body[key] is None, key

    assert set(body) == set(expected) | {k for k in OPTIONAL_PROFILE_KEYS if k not in expected}


def test_projects_default_order_and_shape(client, js_fixture) -> None:
    """顺序 = 构建期定好的顺序（fixture 就是这个顺序）；可选字段缺省补 null。"""
    body = client.get("/api/v1/projects").json()
    expected = js_fixture["projects"]

    assert body["total"] == len(expected)
    assert body["limit"] == 20 and body["offset"] == 0
    assert _slugs(body["items"]) == _slugs(expected)

    # 可选字段：内容里写了 → 非空字符串；没写 → 补 null。
    # （「内容里确实没写」这个前提由 test_content_rules.py 的合成内容单独钉住 ——
    #   真实内容哪天把链接补全了，这里就会没有样本可覆盖，合成内容不会。）
    by_slug = {item["slug"]: item for item in body["items"]}
    for project in expected:
        item = by_slug[project["slug"]]
        for key in ("repo", "live"):
            if key in project:
                assert isinstance(item[key], str) and item[key], (project["slug"], key)
            else:
                assert key in item and item[key] is None, (project["slug"], key)
        if "featured" in project:
            assert item["featured"] is project["featured"], project["slug"]
        else:
            assert item["featured"] is None, project["slug"]


def test_projects_status_filter(client, js_fixture) -> None:
    """status 是枚举，过滤 = 全等匹配。三个取值各查一次，名单从 fixture 推导。"""
    for status in ("done", "wip", "planned"):
        expected = {p["slug"] for p in js_fixture["projects"] if p["status"] == status}
        body = client.get(f"/api/v1/projects?status={status}").json()
        assert body["total"] == len(expected), status
        assert {p["slug"] for p in body["items"]} == expected, status


def test_projects_tag_filter_is_exact_and_case_sensitive(client, js_fixture) -> None:
    """tag 过滤是**全等**匹配：不做包含、也不折叠大小写。

    每个真实标签都查两遍 —— 原样一次、改成大写一次。第二遍就是大小写敏感的证明：
    期望值按「内容里是否真的写着这个大写标签」算；接口要是折叠了大小写，
    就会把只写了小写标签的项目也吐出来，两边立刻对不上。
    """
    projects = js_fixture["projects"]
    tags = _fixture_tags(js_fixture)
    assert tags, "契约 fixture 里没有标签，这条测试无从验证"

    for tag in tags:
        for query in (tag, tag.upper()):
            body = client.get("/api/v1/projects", params={"tag": query}).json()
            expected = {p["slug"] for p in projects if query in p["tags"]}
            assert body["total"] == len(expected), query
            assert {p["slug"] for p in body["items"]} == expected, query

    # 未知标签：空列表 + 200，不是错误（顺带把信封形状与分页默认值钉一次）
    miss = client.get("/api/v1/projects?tag=__no_such_tag__")
    assert miss.status_code == 200
    assert miss.json() == {
        "items": [],
        "total": 0,
        "limit": 20,
        "offset": 0,
        "request_id": miss.json()["request_id"],
    }


def test_projects_tag_and_status_combine(client, js_fixture) -> None:
    """两个过滤条件是**交集**（AND），不是「命中任一」。"""
    projects = js_fixture["projects"]
    # 取「出现次数最多」的标签，交集最可能有内容；具体是哪个由 fixture 决定
    tag = max(_fixture_tags(js_fixture), key=lambda t: sum(t in p["tags"] for p in projects))

    body = client.get("/api/v1/projects", params={"tag": tag, "status": "done"}).json()
    expected = {
        p["slug"] for p in projects if tag in p["tags"] and p["status"] == "done"
    }
    assert {p["slug"] for p in body["items"]} == expected
    assert body["total"] == len(expected)


def test_project_detail(client, js_fixture) -> None:
    """详情 = 该项目的契约 fixture 内容；项目不带正文（与构建期一致）。"""
    for expected in js_fixture["projects"]:
        body = client.get(f"/api/v1/projects/{expected['slug']}").json()

        for key, value in expected.items():
            assert body[key] == value, (expected["slug"], key)
        # 契约里没写的可选字段补 null
        for key in ("repo", "live", "cover", "featured"):
            if key not in expected:
                assert key in body and body[key] is None, (expected["slug"], key)
        assert "body" not in body, expected["slug"]


def test_notes_list_has_no_body_but_detail_does(client, js_fixture) -> None:
    expected = js_fixture["notes"]

    listed = client.get("/api/v1/notes").json()
    assert listed["total"] == len(expected)
    assert _slugs(listed["items"]) == _slugs(expected)

    # 列表不含正文（ARCHITECTURE §6），其余字段与内容一致；
    # 内容里没写的可选字段（draft）在列表里补 null。
    # 注意别用「整条 dict 相等」来比：内容没写 draft 时 fixture 里根本没这个键，
    # 而响应模型会补一个 null，两边形状不同 —— 那不是缺陷，是这一层刻意的选择。
    for item, note in zip(listed["items"], expected):
        assert "body" not in item
        for key, value in note.items():
            if key != "body":
                assert item[key] == value, (note["slug"], key)
        if "draft" not in note:
            assert item["draft"] is None, note["slug"]

    # 详情带正文，且与契约 fixture 逐字一致（渲染用的就是这份 Markdown）
    for note in expected:
        detail = client.get(f"/api/v1/notes/{note['slug']}").json()
        assert detail["body"] == note["body"], note["slug"]


def test_now(client, js_fixture) -> None:
    """时间线逐条一致：顺序与字段都来自内容（fixture），不写死第一天是哪条。"""
    body = client.get("/api/v1/now").json()
    expected = js_fixture["now"]

    assert body == expected
    # status 只能取枚举里的值（JS 侧校验器与 Python 校验器都按同一张词表放行）
    assert {item["status"] for item in body} <= {"doing", "planned", "done"}


# --------------------------------------------------------------- 分页边界


def test_pagination_slices_and_reports_true_total(client, js_fixture) -> None:
    """分页只是切片：total 始终是**分页前**的数量，items 是切出来的那一段。"""
    expected = _slugs(js_fixture["projects"])

    # 逐个边界试：第一页、从中间切、一次取满上限、切到尾巴上
    for limit, offset in ((1, 0), (2, 1), (100, 0), (3, 2)):
        body = client.get(f"/api/v1/projects?limit={limit}&offset={offset}").json()
        assert _slugs(body["items"]) == expected[offset : offset + limit], (limit, offset)
        assert body["total"] == len(expected), (limit, offset)
        assert body["limit"] == limit and body["offset"] == offset, (limit, offset)


def test_pagination_offset_past_the_end_is_not_an_error(client, js_fixture) -> None:
    body = client.get("/api/v1/projects?offset=99").json()
    assert body["items"] == []
    assert body["total"] == len(js_fixture["projects"])


def test_limit_out_of_range_is_422(client) -> None:
    for query in ("limit=0", "limit=101", "limit=-1", "offset=-1", "status=bogus", "limit=abc"):
        response = client.get(f"/api/v1/projects?{query}")
        assert response.status_code == 422, query
        error = response.json()["error"]
        assert error["code"] == "validation_error"
        assert set(error) == {"code", "message", "request_id"}


# --------------------------------------------------------------- 404 与错误结构


def test_missing_slug_is_404_with_error_envelope(client) -> None:
    response = client.get("/api/v1/projects/does-not-exist")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/json")

    error = response.json()["error"]
    assert set(error) == {"code", "message", "request_id"}
    assert error["code"] == "not_found"
    assert "does-not-exist" in error["message"]
    # 响应体里的 request_id 和响应头是同一个
    assert error["request_id"] == response.headers["X-Request-Id"]

    assert client.get("/api/v1/notes/does-not-exist").status_code == 404


# --------------------------------------------------------------- 请求 id


def test_request_id_is_echoed_when_well_formed(client) -> None:
    response = client.get("/api/v1/now", headers={"X-Request-Id": "trace-abc.123"})
    assert response.headers["X-Request-Id"] == "trace-abc.123"


def test_request_id_is_replaced_when_malformed(client) -> None:
    # 带空格 / 超长的 id 会污染日志（甚至能伪造日志行），必须换掉。
    # （换行、非 latin-1 的字符根本发不出去：HTTP 头按 latin-1 编码，客户端就会先拒。）
    for bad in ("bad id", "x" * 65, ""):
        response = client.get("/api/v1/now", headers={"X-Request-Id": bad})
        assert HEX32.match(response.headers["X-Request-Id"]), bad


def test_request_id_is_generated_when_absent(client) -> None:
    assert HEX32.match(client.get("/api/v1/now").headers["X-Request-Id"])


# --------------------------------------------------------------- CORS


ALLOWED_ORIGIN = "https://mucheng-zzb.github.io"


def test_cors_allows_whitelisted_origin(client) -> None:
    response = client.get("/api/v1/projects", headers={"Origin": ALLOWED_ORIGIN})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN


def test_cors_rejects_forged_origin_on_preflight(client) -> None:
    response = client.options(
        "/api/v1/projects",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert response.status_code == 400
    assert "disallowed" in response.text.lower()
    # 被拒的响应也带着请求 id —— 否则用户报错时对不上日志
    assert HEX32.match(response.headers["X-Request-Id"])


def test_cors_omits_header_for_forged_origin_on_get(client) -> None:
    response = client.get("/api/v1/projects", headers={"Origin": "https://evil.example"})
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


# --------------------------------------------------------------- 500


def test_unhandled_error_is_500_without_stack_trace(client_no_raise, monkeypatch) -> None:
    def boom(self, *, force: bool = False):  # noqa: ARG001 —— 故意签名一致
        raise RuntimeError("数据库密码是 hunter2 —— 这句话绝不能出现在响应里")

    monkeypatch.setattr(ContentStore, "load", boom)

    response = client_no_raise.get("/api/v1/profile")
    assert response.status_code == 500

    raw = response.text
    error = response.json()["error"]
    assert set(error) == {"code", "message", "request_id"}
    assert error["code"] == "internal_error"
    assert error["request_id"] == response.headers["X-Request-Id"]

    # 无堆栈、无异常详情
    assert "Traceback" not in raw
    assert "RuntimeError" not in raw
    assert "hunter2" not in raw
    assert "content_parser" not in raw


def test_broken_content_is_503_not_500(tmp_path) -> None:
    """内容坏了是「服务暂时不可用」（503），不是「代码出了没预料到的错」（500）。

    这两种情形运维要做的动作完全不同，所以必须分开。
    """
    from app.core.config import DEFAULT_CORS_ORIGINS, Settings
    from app.main import create_app
    from fastapi.testclient import TestClient

    empty = tmp_path / "no-such-content-dir"
    app = create_app(Settings(env="test", content_dir=empty, cors_origins=DEFAULT_CORS_ORIGINS))

    with TestClient(app, raise_server_exceptions=False) as test_client:
        assert test_client.get("/api/v1/projects").status_code == 503
        assert test_client.get("/api/v1/projects").json()["error"]["code"] == "content_unavailable"

        # /health 不抛异常：它必须能回答「坏在哪」
        health = test_client.get("/api/v1/health")
        assert health.status_code == 503
        assert health.json()["status"] == "degraded"
        assert health.json()["dependencies"]["content"]["status"] == "error"
