"""统一错误结构（ARCHITECTURE §6）。

    { "error": { "code": "not_found", "message": "...", "request_id": "..." } }

三条不许破的：
  1. **形状只有这三个键**。前端要能写一句 `err.error.code` 就分支出文案，
     多塞字段就是给前端加隐性依赖。
  2. **500 绝不带堆栈**。堆栈进日志（logging.py 负责），响应体只给一个 code。
     这是安全底线：堆栈会暴露路径、库版本、代码结构。
  3. **每个响应都有 X-Request-Id**，错误响应也一样 —— 否则用户截图给你看的时候
     你没法把那次失败和日志对上。
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .logging import get_logger

logger = get_logger("api.errors")

#: HTTP 状态码 → 默认错误码。没列出的一律 `internal_error`（保守）。
_STATUS_CODE_NAMES = {
    400: "bad_request",
    404: "not_found",
    405: "method_not_allowed",
    422: "validation_error",
    429: "rate_limited",
    500: "internal_error",
    503: "service_unavailable",
}


class ApiError(Exception):
    """业务错误基类。子类只改三个类属性，不用写 __init__。"""

    status_code: int = 500
    code: str = "internal_error"
    message: str = "服务器内部错误"

    def __init__(
        self,
        message: str | None = None,
        *,
        log_detail: str | None = None,
        summary: str | None = None,
    ):
        super().__init__(message or self.message)
        self.message = message or self.message
        #: 只进日志、不进响应的排查线索（比如内容校验的完整错误清单）。
        self.log_detail = log_detail
        #: 给**诊断端点**用的一句话摘要（含文件名与原因）。
        #: 普通错误响应不碰它 —— 统一错误体的 `message` 保持通用，
        #: 免得把内部路径按请求方的心情散到每一个 4xx/5xx 上；
        #: 而 /health 的意义就是回答「坏在哪」，它需要这一句。
        self.summary = summary


class NotFoundError(ApiError):
    status_code = 404
    code = "not_found"

    def __init__(self, what: str = "资源"):
        super().__init__(f"{what}不存在")


class ContentUnavailableError(ApiError):
    """内容读不出来或校验没过 —— 服务端的问题，不是请求的问题。

    用 503 而不是 500，理由：这是**临时的、可自愈的**（改好内容再 reload 就好），
    500 的含义是「代码出了没预料到的错」。前端对二者的处置也一样（降级），
    但运维看 503 就知道「去查内容文件」，看 500 才知道「去查代码」。

    注意：ARCHITECTURE §6 的错误码表里没有这个码，是本版新增的语义
    （表里只有 ai_unavailable 是 503）。已记进 HANDOFF，等架构师确认。
    """

    status_code = 503
    code = "content_unavailable"

    def __init__(
        self,
        message: str = "内容数据暂不可用",
        *,
        log_detail: str | None = None,
        summary: str | None = None,
    ):
        super().__init__(message, log_detail=log_detail, summary=summary)


def error_body(code: str, message: str, request_id: str) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "request_id": request_id}}


def _request_id(request: Request) -> str:
    """取本次请求的 id。

    中间件一定会先写上（它在最外层）；这里再兜一次底，
    是为了「中间件自己就炸了」这种极端情况 —— 返回体里给一个空串，
    前端拿到的就不是 undefined，少一类崩溃。
    """
    return getattr(request.state, "request_id", "") or ""


def install_error_handlers(app: FastAPI) -> None:
    """把四类异常全部收敛到统一结构。注册顺序不影响匹配（按类名精确匹配）。"""

    @app.exception_handler(ApiError)
    async def _api_error(request: Request, exc: ApiError) -> JSONResponse:
        request_id = _request_id(request)
        # 5xx 是我们自己的问题，要有人能看见；4xx 是调用方的问题，用 warning 即可。
        log = logger.error if exc.status_code >= 500 else logger.warning
        log(
            "请求失败",
            extra={
                "request_id": request_id,
                "code": exc.code,
                "status": exc.status_code,
                "detail": exc.log_detail or exc.message,
                "path": request.url.path,
            },
        )
        return _json(exc.status_code, exc.code, exc.message, request_id)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        request_id = _request_id(request)
        message = _summarize_validation(exc)
        logger.warning(
            "请求参数不合法",
            extra={
                "request_id": request_id,
                "code": "validation_error",
                "status": 422,
                "detail": message,
                "path": request.url.path,
            },
        )
        return _json(422, "validation_error", message, request_id)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        request_id = _request_id(request)
        code = _STATUS_CODE_NAMES.get(exc.status_code, "internal_error")
        message = str(exc.detail) if exc.detail else "请求无法完成"
        logger.warning(
            "HTTP 错误",
            extra={
                "request_id": request_id,
                "code": code,
                "status": exc.status_code,
                "detail": message,
                "path": request.url.path,
            },
        )
        return _json(exc.status_code, code, message, request_id)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        """兜底。

        这里**故意不把 exc 的内容放进响应**，只用一句固定文案；
        异常本身用 logger.exception 连堆栈一起写进日志。
        响应里唯一的线索是 request_id —— 拿它去日志里搜，堆栈就在那儿。
        """
        request_id = _request_id(request)
        logger.exception(
            "未处理异常",
            extra={
                "request_id": request_id,
                "code": "internal_error",
                "status": 500,
                "path": request.url.path,
            },
        )
        return _json(500, "internal_error", "服务器内部错误", request_id)


def _json(status_code: int, code: str, message: str, request_id: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=error_body(code, message, request_id),
        headers={"X-Request-Id": request_id} if request_id else None,
    )


def _summarize_validation(exc: RequestValidationError) -> str:
    """把 pydantic 的报错压成一句人话（字段: 原因），多个用「；」连。

    只取 loc / msg / type —— `ctx` 里可能装着一个 ValueError 对象，
    直接丢给 json.dumps 会炸在「序列化自己人」上。

    pydantic 的 msg 是英文（"Input should be less than or equal to 100"）。
    全站都说中文，这里给常见的几类配上中文，其余原样透出 ——
    半个中文句子比一个看不懂的英文句子更糟，所以宁可留着原文。
    """
    parts: list[str] = []
    for err in exc.errors():
        location = ".".join(str(item) for item in err.get("loc", ()) if item != "query")
        parts.append(f"{location or '请求'}: {_explain(err)}")
    return "；".join(parts) or "请求参数不合法"


#: pydantic 的 error type → 中文说法。ctx 里带的是边界值本身。
_ZH_REASONS = {
    "less_than_equal": lambda ctx: f"不能大于 {ctx.get('le')}",
    "greater_than_equal": lambda ctx: f"不能小于 {ctx.get('ge')}",
    "less_than": lambda ctx: f"必须小于 {ctx.get('lt')}",
    "greater_than": lambda ctx: f"必须大于 {ctx.get('gt')}",
    "missing": lambda ctx: "缺少必填参数",
    "int_parsing": lambda ctx: "需要一个整数",
    "float_parsing": lambda ctx: "需要一个数字",
    "bool_parsing": lambda ctx: "需要 true 或 false",
    "string_type": lambda ctx: "需要一个字符串",
    "literal_error": lambda ctx: f"只能是 {ctx.get('expected', '列出的几个值之一')}",
    "extra_forbidden": lambda ctx: "不认识的参数",
}


def _explain(err: dict) -> str:
    reason = _ZH_REASONS.get(err.get("type", ""))
    if reason is None:
        return err.get("msg", "不合法")
    try:
        return reason(err.get("ctx") or {})
    except Exception:  # noqa: BLE001 —— 兜底：拿不到上下文就用原文，绝不因为「翻译」把 422 变成 500
        return err.get("msg", "不合法")
