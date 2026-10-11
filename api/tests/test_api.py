"""接口行为测试：端点齐全、过滤、分页边界、404、错误结构、CORS、请求 id、500 不泄漏堆栈。

契约（「数据对不对」）在 tests/contract/ 里；这里管「接口的行为对不对」。
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


# --------------------------------------------------------------- 端点齐全


def test_openapi_exposes_exactly_seven_endpoints(client) -> None:
    assert client.get("/docs").status_code == 200
    paths = client.get("/openapi.json").json()["paths"]
    assert set(paths) == EXPECTED_PATHS
    # 每个端点都只有 GET：只读接口不该有第二条动词
    for path, operations in paths.items():
        assert set(operations) == {"get"}, f"{path} 出现了非 GET 方法：{set(operations)}"


def test_health_reports_dependency_status(client) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "ok"
    assert body["env"] == "test"
    content = body["dependencies"]["content"]
    assert content["status"] == "ok"
    assert content["projects"] == 4
    assert content["notes"] == 3
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


def test_profile(client) -> None:
    body = client.get("/api/v1/profile").json()
    assert body["name"] == "周同学"
    assert body["education"] == "专科在读（大一）"
    assert body["skills"][0]["title"] == "后端开发"


def test_projects_default_order_and_shape(client) -> None:
    body = client.get("/api/v1/projects").json()
    assert body["total"] == 4
    assert body["limit"] == 20 and body["offset"] == 0
    # 顺序 = 构建期定好的顺序：order 升序
    assert [p["slug"] for p in body["items"]] == [
        "personal-portfolio",
        "notes-collection",
        "data-toolkit",
        "api-service",
    ]
    # 可选字段缺省补 null（前端不用先判 'repo' in p）。
    # 样本换成 notes-collection —— api-service 交付后补上了 repo/live，
    # 如今没写这两个字段的项目只剩它一个。
    first = body["items"][0]
    assert first["repo"] and first["live"] and first["featured"] is True
    assert body["items"][1]["repo"] is None and body["items"][1]["live"] is None
    # 写了的就是字符串，不是空串
    assert body["items"][3]["repo"] and body["items"][3]["live"]


def test_projects_status_filter(client) -> None:
    body = client.get("/api/v1/projects?status=done").json()
    assert body["total"] == 3
    assert {p["slug"] for p in body["items"]} == {
        "personal-portfolio",
        "data-toolkit",
        "api-service",
    }


def test_projects_tag_filter_is_exact_and_case_sensitive(client) -> None:
    hit = client.get("/api/v1/projects?tag=Python").json()
    assert hit["total"] == 2
    assert {p["slug"] for p in hit["items"]} == {"data-toolkit", "api-service"}

    # 未知标签 / 大小写不同：返回空列表，不是错误
    miss = client.get("/api/v1/projects?tag=python")
    assert miss.status_code == 200
    assert miss.json() == {
        "items": [],
        "total": 0,
        "limit": 20,
        "offset": 0,
        "request_id": miss.json()["request_id"],
    }


def test_projects_tag_and_status_combine(client) -> None:
    body = client.get("/api/v1/projects?tag=Python&status=done").json()
    assert [p["slug"] for p in body["items"]] == ["data-toolkit", "api-service"]


def test_project_detail(client) -> None:
    body = client.get("/api/v1/projects/personal-portfolio").json()
    assert body["slug"] == "personal-portfolio"
    assert body["live"] == "https://mucheng-zzb.github.io/personal-portfolio/"
    assert "body" not in body  # 项目不带正文（与构建期一致）


def test_notes_list_has_no_body_but_detail_does(client) -> None:
    listed = client.get("/api/v1/notes").json()
    assert listed["total"] == 3
    assert "body" not in listed["items"][0]
    # 三篇同一天，标题按码点序兜底：'p'(0x70) < 函(U+51FD) < 变(U+53D8)
    assert [n["slug"] for n in listed["items"]] == [
        "print-is-not-return",
        "function-definition-vs-call",
        "assignment-is-not-copy",
    ]

    detail = client.get("/api/v1/notes/function-definition-vs-call").json()
    assert "def greet()" in detail["body"]
    assert detail["body"].startswith("一句话结论")


def test_now(client) -> None:
    body = client.get("/api/v1/now").json()
    assert isinstance(body, list) and len(body) == 4
    assert {item["status"] for item in body} == {"doing", "planned"}
    assert body[0]["date"] == "2026-09-05"


# --------------------------------------------------------------- 分页边界


def test_pagination_slices_and_reports_true_total(client) -> None:
    body = client.get("/api/v1/projects?limit=2&offset=1").json()
    assert body["total"] == 4  # total 是分页【前】的数量
    assert [p["slug"] for p in body["items"]] == ["notes-collection", "data-toolkit"]


def test_pagination_offset_past_the_end_is_not_an_error(client) -> None:
    body = client.get("/api/v1/projects?offset=99").json()
    assert body["items"] == []
    assert body["total"] == 4


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
