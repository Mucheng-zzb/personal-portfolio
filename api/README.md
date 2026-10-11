# api/ —— 后端服务（占位，v0.5 开始动工）

这个目录**现在什么都没有**，只放了这份说明。留着它是为了让仓库结构先立起来，
后面往里填东西时不用再动目录。

## 将来这里放什么

按 `docs/ARCHITECTURE.md` ADR-004 / ADR-009，这里会是**用 Python + FastAPI 写的后端服务**，
与 `web/` 分开部署（不同域名），前端通过 CORS 调它：

| 版本 | 内容 |
| :--- | :--- |
| v0.5 | 只读内容 API（`/api/v1/health`、`/projects`、`/notes`…）+ 自动生成的 OpenAPI 文档（`/docs`） |
| v0.6 | 数据库 + 留言板写接口（限流、校验、IP 只存哈希） |
| v0.7 | AI 问答（RAG，SSE 流式返回） |

预计的目录长这样（见 ARCHITECTURE §3）：

```text
api/
├── app/
│   ├── main.py          # 应用装配、中间件、CORS
│   ├── core/            # 配置、日志、错误、限流
│   ├── routers/         # health / content / guestbook / ask
│   ├── services/        # 业务逻辑
│   └── models/          # Pydantic schema / SQLModel
├── scripts/             # 生成向量索引
├── tests/               # pytest
├── requirements.txt
├── .env.example         # 入库；真正的 .env 在 .gitignore 里（ADR-010）
└── Dockerfile
```

## 两条现在就该遵守的规矩

1. **密钥永不进仓库。** 只写 `.env.example`，真实密钥放部署平台的环境变量里（ADR-010）。
2. **后端是增强，不是依赖。** 它挂掉时 `web/` 必须照常能看 —— 前端要能降级到内置数据
   （ADR-005，这是 v0.5 的硬验收）。

## 现在要不要做

**不要。** 按 `docs/ROADMAP.md` §4 的依赖铁律：v0.2 工程基线没做完之前不要碰后端，
否则后面要迁移两遍。当前进度见 ROADMAP §0 的版本表。
