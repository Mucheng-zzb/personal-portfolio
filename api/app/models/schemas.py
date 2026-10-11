"""接口的出参模型（Pydantic）。

这一层只做两件事：**形状**和**给文档看**。
不在这里写业务规则 —— 字段该怎么校验、内容错在哪，都在 services/content_parser.py，
那里才是与前端 `content-schema.js` 一一对应的地方。

两个刻意的选择：
  · `date` 一律是 **字符串**，不转 `datetime.date`。转了就可能在 JSON 里变成
    带时区的时间戳，而前端拿到的构建期数据是 `"2026-10-11"` 这种纯字符串 ——
    两边形状必须一样，否则 v0.5-B 的前端要写两套解析。
  · 可选的 `repo / live / cover / featured` **缺省时补 null 而不是省略键**。
    前端的项目卡可以直接 `p.repo ? 显示链接 : 不显示`，不必先判 `'repo' in p`。
    代价是接口载荷与构建期产物在「有没有这个键」上不完全一致 ——
    所以契约测试比的是**解析层**（services 的输出，与 JS 逐字一致），
    不是这一层。
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ProjectStatus = Literal["done", "wip", "planned"]
NowStatus = Literal["doing", "planned", "done"]


class _Strict(BaseModel):
    """多一个没声明的字段就报错。

    与「未知字段一律报错」这条内容规矩保持一致 —— 悄悄吞掉一个字段，
    比当场失败更难查。
    """

    model_config = ConfigDict(extra="forbid")


class SkillGroup(_Strict):
    title: str
    items: list[str]


class Profile(_Strict):
    name: str
    tagline: str
    email: str
    github: str
    heroChips: list[str]
    about: list[str]
    learning: list[str]
    skills: list[SkillGroup]
    location: str | None = None
    resume: str | None = None
    contactNote: str | None = None
    footerNote: str | None = None
    education: str | None = None


class Project(_Strict):
    slug: str
    title: str
    status: ProjectStatus
    date: str
    tags: list[str]
    summary: str
    order: int | float
    repo: str | None = None
    live: str | None = None
    cover: str | None = None
    featured: bool | None = None


class NoteSummary(_Strict):
    """列表用：**不含正文**（ARCHITECTURE §6）。"""

    slug: str
    title: str
    date: str
    tags: list[str]
    summary: str
    draft: bool | None = None


class NoteDetail(NoteSummary):
    """详情用：多一个 `body`（Markdown 原文）。"""

    body: str


class NowItem(_Strict):
    text: str
    date: str
    status: NowStatus


class ProjectPage(BaseModel):
    """列表信封。带 total（过滤后、分页前的总数）前端才能画「共 N 个」。"""

    items: list[Project]
    total: int
    limit: int
    offset: int
    request_id: str


class NotePage(BaseModel):
    items: list[NoteSummary]
    total: int
    limit: int
    offset: int
    request_id: str


class DependencyHealth(BaseModel):
    status: Literal["ok", "error"]
    detail: str
    source_dir: str
    projects: int | None = None
    notes: int | None = None
    loaded_at: str | None = None


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    version: str
    env: str
    dependencies: dict[str, DependencyHealth]
    request_id: str


class ErrorDetail(BaseModel):
    code: str = Field(description="机器可读的错误码，前端按它分支文案")
    message: str = Field(description="给人看的一句话")
    request_id: str = Field(description="拿它去日志里搜这一次请求")


class ErrorResponse(BaseModel):
    """统一错误结构（ARCHITECTURE §6）。**只有这三个键**。"""

    error: ErrorDetail


__all__ = [
    "DependencyHealth",
    "ErrorResponse",
    "HealthResponse",
    "NoteDetail",
    "NotePage",
    "NoteSummary",
    "NowItem",
    "Profile",
    "Project",
    "ProjectPage",
    "ProjectStatus",
]
