"""GET /api/v1/health —— 健康检查 + 依赖状态。

**有什么依赖就报什么**：v0.5-A 只有「内容」一个依赖（尚未接数据库，更没有 LLM）。
以后 v0.6 加 Postgres、v0.7 加模型，都往 `dependencies` 里再加一项即可 ——
形状不变，前端与监控不用改。

关于状态码：内容坏了返回 **503**（而不是 200 + 一个 `degraded` 字段）。
理由：`/health` 的首要用户是**定时探活**（Render、UptimeRobot 之类），
它们只看状态码。返回 200 再在 body 里写「其实我坏了」，等于把这个检查做成了摆设。
代价是这一条的响应体不是统一错误结构（是健康体检单），这一点已写进 README 与 HANDOFF。
"""

from __future__ import annotations

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from ..core.logging import get_logger
from ..models.schemas import DependencyHealth, HealthResponse

router = APIRouter(prefix="/api/v1", tags=["health"])
logger = get_logger("api.health")


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="健康检查（含依赖状态）",
    responses={503: {"model": HealthResponse, "description": "有依赖不可用"}},
)
def health(
    request: Request,
    reload: bool = Query(False, description="强制重新读盘（改完内容不想重启进程时用）"),
):
    settings = request.app.state.settings
    store = request.app.state.content

    if reload:
        # 只清缓存，下一次 load() 自然会重读。这里不直接 load()，
        # 是为了让「读失败」也走下面那条统一的体检路径，而不是在这儿抛出去。
        store.invalidate()
        logger.info("内容缓存已作废，将重新读盘", extra={"request_id": request.state.request_id})

    content = DependencyHealth(**store.health())
    healthy = content.status == "ok"

    payload = HealthResponse(
        status="ok" if healthy else "degraded",
        version=settings.app_version,
        env=settings.env,
        dependencies={"content": content},
        request_id=request.state.request_id,
    )

    if not healthy:
        return JSONResponse(status_code=503, content=payload.model_dump())
    return payload
