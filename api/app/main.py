"""应用装配：中间件、CORS、错误处理器、路由。

读这个文件的人应该能在半分钟内答出「一次请求从进来到出去经过了什么」。
顺序（从外到内）：

    ServerErrorMiddleware         最外层：兜住所有没被处理的异常 → 500（无堆栈）
      RequestContextMiddleware    生成/透传 X-Request-Id、计时、记一条访问日志
        CORSMiddleware            白名单外的 Origin 在这里被拒
          ExceptionMiddleware     ApiError / 422 / HTTPException → 统一错误结构
            Router                具体端点

为什么用「纯 ASGI 中间件」而不是 `@app.middleware("http")`：
Starlette 的 BaseHTTPMiddleware 会把请求体包一层 task group，异常要在任务之间传播；
我们的 500 恰恰依赖异常能原样往上抛到 ServerErrorMiddleware。
纯 ASGI 就三层函数调用，没有这层魔法，行为可预期。
"""

from __future__ import annotations

import re
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.datastructures import MutableHeaders

from .core.config import Settings, load_settings
from .core.errors import install_error_handlers
from .core.logging import get_logger, setup_logging
from .routers import content, health
from .services.content_service import ContentStore

#: 上游传进来的 X-Request-Id 只认这个形状（防日志伪造：换行/控制字符会污染 JSON 日志）
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


class RequestContextMiddleware:
    """给每个请求配一个 id、记一条日志、计时。"""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            # lifespan / websocket 不走这套
            return await self.app(scope, receive, send)

        request_id = self._request_id_from_headers(scope)
        # Request.state 读的就是 scope["state"]，所以放在这儿
        # 上游的错误处理器也能拿到同一个 id。
        scope.setdefault("state", {})["request_id"] = request_id

        logger = get_logger("api.request")
        method = scope.get("method", "-")
        path = scope.get("path", "-")
        client = scope.get("client") or ("-", 0)
        started = time.perf_counter()

        def fields(status: int) -> dict:
            return {
                "request_id": request_id,
                "method": method,
                "path": path,
                "status": status,
                "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                "client": client[0],
            }

        status_holder = {"status": 500}

        async def send_with_request_id(message):
            """纯 ASGI 中间件拿不到 Response 对象（内层app 只往 send 里写消息），
            所以头只能在「响应开始」这条消息上改。"""
            if message["type"] == "http.response.start":
                status_holder["status"] = message["status"]
                # 就算端点自己也想设这个头，也以中间件为准：一个请求只能有一个 id
                MutableHeaders(scope=message)["X-Request-Id"] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception:
            # 异常本身由 errors.py 的兜底处理器连堆栈一起记（带同一个 request_id）；
            # 这里补一条访问日志，保证「每个请求都有一行」这件事不被 500 破例。
            logger.error("请求处理时抛出异常", extra=fields(500))
            raise

        logger.info("请求完成", extra=fields(status_holder["status"]))

    @staticmethod
    def _request_id_from_headers(scope) -> str:
        """优先沿用上游（反向代理/前端）传进来的 id，形状不对就自己生成。

        沿用是有用的：以后前端带着自己那次的 id 发请求，
        报错时用户截图上的 id 和后台日志就是同一个，不用靠时间戳去猜。
        """
        for name, value in scope.get("headers", []):
            if name == b"x-request-id":
                candidate = value.decode("latin-1").strip()
                if _SAFE_REQUEST_ID.match(candidate):
                    return candidate
        return uuid4().hex


def create_app(settings: Settings | None = None) -> FastAPI:
    """造一个 app。测试可以传自己的 Settings（比如换 CONTENT_DIR），互不干扰。"""
    settings = settings or load_settings()
    setup_logging()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # uvicorn 会在启动应用之后才配置它自己的 logging，
        # 所以这里**再设一次**，把 uvicorn 的文本访问日志顶掉（见 logging.py）。
        setup_logging()
        get_logger("api.startup").info(
            "服务启动",
            extra={
                "env": settings.env,
                "version": settings.app_version,
                "content_dir": str(settings.content_dir),
                "cors_origins": list(settings.cors_origins),
            },
        )
        yield
        get_logger("api.startup").info("服务停止")

    app = FastAPI(
        title="personal-portfolio API",
        version=settings.app_version,
        description=(
            "个人作品集的只读内容接口。数据来自仓库里的 `web/content/**`，"
            "与前端构建期读的是同一份（D26）。\n\n"
            "**只读**：没有写接口、没有认证、没有数据库。"
        ),
        lifespan=lifespan,
    )

    app.state.settings = settings
    app.state.content = ContentStore(settings)

    install_error_handlers(app)

    # 先加 CORS（内层）、后加 RequestContext（外层），
    # 这样连「被 CORS 拒掉」的响应也带 X-Request-Id。
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["GET", "OPTIONS"],
        allow_headers=["*"],
        # 让浏览器里的 JS 读得到这个头，报错时能把 id 一起显示出来
        expose_headers=["X-Request-Id"],
        max_age=600,
    )
    app.add_middleware(RequestContextMiddleware)

    app.include_router(health.router)
    app.include_router(content.router)

    return app


#: `uvicorn app.main:app` 用的就是这个
app = create_app()
