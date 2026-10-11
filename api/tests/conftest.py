"""pytest 的公共夹具。

两条原则：
  1. **接口与契约测试用仓库里真实的 `web/content/**`**（D41 之前，规则测试也用它的副本；
     现在规则测试改用自己合成的临时内容 —— 见 tests/test_content_rules.py 顶部）。
     需要「坏内容」的测试另建临时目录，绝不往真实内容里写东西（也不改它）。
  2. **一个测试一个 app 实例**。缓存挂在 app.state.content 上，
     共用实例会让「第一个测试缓存了什么」影响第二个测试。
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import DEFAULT_CORS_ORIGINS, REPO_ROOT, Settings
from app.main import create_app

CONTRACT_DIR = Path(__file__).parent / "contract"
CONTENT_DIR = REPO_ROOT / "web" / "content"


@pytest.fixture(scope="session")
def js_fixture() -> dict:
    """Node 跑 content-schema.js 得到的期望值（契约测试的另一半）。"""
    return json.loads((CONTRACT_DIR / "fixture_js.json").read_text(encoding="utf-8"))["data"]


@pytest.fixture
def settings() -> Settings:
    return Settings(env="test", content_dir=CONTENT_DIR, cors_origins=DEFAULT_CORS_ORIGINS)


@pytest.fixture
def app(settings: Settings):
    return create_app(settings)


@pytest.fixture
def client(app):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def client_no_raise(app):
    """不把服务端异常重新抛给测试自己 —— 否则验不了 500 的响应体长什么样。"""
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.fixture
def store(app):
    """直接拿内容服务，绕开 HTTP，用来验解析结果。"""
    return app.state.content


@pytest.fixture
def temp_content_dir(tmp_path: Path) -> Path:
    """真实内容的一份副本，测试可以往里加 / 改文件。

    D41 之后只剩一条测试用它：`test_health_hides_absolute_path_in_production`
    —— 那条验的是「生产环境报**相对仓库根**的路径」，需要的是一个**在仓库根之下**的
    目录（pytest 的 tmp_path 正好在 `api/` 下面）。内容是什么它并不关心，
    所以继续用真实内容的副本最省事。
    规则测试请用 test_content_rules.py 的 synthetic_content_dir。
    """
    target = tmp_path / "content"
    shutil.copytree(CONTENT_DIR, target)
    return target
