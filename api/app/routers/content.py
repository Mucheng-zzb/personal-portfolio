"""只读内容接口：/profile、/projects、/projects/{slug}、/notes、/notes/{slug}、/now。

六个端点一条共同规矩：**只读、不写**（v0.5-A 的【不做】）。
所以这里没有一个 POST / PUT / DELETE，也没有任何东西会改服务器状态。

分页边界（这是必须写死的，否则前端只能猜）：
  · `limit` 默认 20、**最小 1、最大 100**；越界（0、-1、101…）→ 422 `validation_error`。
  · `offset` 最小 0；超过总数不报错，返回空 items + 真实 total（翻页翻过头不是错误）。
  · 过滤后 `total` 是**过滤后、分页前**的数量，前端据此画「共 N 个」。
"""

from __future__ import annotations

from fastapi import APIRouter, Path, Query, Request

from ..models.schemas import (
    NoteDetail,
    NotePage,
    NoteSummary,
    NowItem,
    Profile,
    Project,
    ProjectPage,
    ProjectStatus,
)

router = APIRouter(prefix="/api/v1", tags=["content"])


@router.get("/profile", response_model=Profile, summary="个人简介、链接、技能")
def get_profile(request: Request) -> Profile:
    return Profile.model_validate(request.app.state.content.get_profile())


@router.get("/projects", response_model=ProjectPage, summary="项目列表（支持 ?tag=&status=）")
def list_projects(
    request: Request,
    tag: str | None = Query(None, description="按标签精确过滤（区分大小写；未知标签返回空列表，不是错误）"),
    status: ProjectStatus | None = Query(None, description="按状态过滤"),
    limit: int = Query(20, ge=1, le=100, description="每页条数（1–100）"),
    offset: int = Query(0, ge=0, description="从第几条开始"),
) -> ProjectPage:
    items = request.app.state.content.list_projects(tag=tag, status=status)
    return ProjectPage(
        items=[Project.model_validate(item) for item in items[offset : offset + limit]],
        total=len(items),
        limit=limit,
        offset=offset,
        request_id=request.state.request_id,
    )


@router.get("/projects/{slug}", response_model=Project, summary="单个项目详情")
def get_project(
    request: Request,
    slug: str = Path(description="文件名去掉 .md，例如 personal-portfolio"),
) -> Project:
    # 查不到就抛 NotFoundError，由 errors.py 的处理器统一成 404 + not_found
    return Project.model_validate(request.app.state.content.get_project(slug))


@router.get("/notes", response_model=NotePage, summary="笔记列表（不含正文）")
def list_notes(
    request: Request,
    limit: int = Query(20, ge=1, le=100, description="每页条数（1–100）"),
    offset: int = Query(0, ge=0, description="从第几条开始"),
) -> NotePage:
    items = request.app.state.content.list_notes()
    return NotePage(
        items=[NoteSummary.model_validate(item) for item in items[offset : offset + limit]],
        total=len(items),
        limit=limit,
        offset=offset,
        request_id=request.state.request_id,
    )


@router.get("/notes/{slug}", response_model=NoteDetail, summary="笔记详情（含正文）")
def get_note(
    request: Request,
    slug: str = Path(description="文件名去掉 .md，例如 function-definition-vs-call"),
) -> NoteDetail:
    return NoteDetail.model_validate(request.app.state.content.get_note(slug))


@router.get("/now", response_model=list[NowItem], summary="近况时间线")
def get_now(request: Request) -> list[NowItem]:
    return [NowItem.model_validate(item) for item in request.app.state.content.get_now()]
