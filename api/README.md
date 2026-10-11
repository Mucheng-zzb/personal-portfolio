# api/ —— 后端服务（FastAPI）

**只读内容接口**：把仓库里的内容（`web/content/**`）用 HTTP 暴露出来，
带自动生成的接口文档。v0.5-A 起可用。

它**不是**：数据库应用、写接口、用户系统、AI 服务 —— 那些分别在 v0.6 / v0.7，也可能被砍。
它**不存**任何数据：没有数据库、没有中间产物文件，每次读的都是仓库里那份 Markdown / JSON。

## 本地怎么跑

```bash
cd api
python -m venv .venv                  # 第一次
.venv/Scripts/activate                # Windows；macOS/Linux 是 source .venv/bin/activate
pip install -r requirements.txt       # 运行时依赖
pip install -r requirements-dev.txt   # 跑测试才需要（pytest）
uvicorn app.main:app --reload         # http://127.0.0.1:8000
```

- 接口文档：<http://127.0.0.1:8000/docs>
- 健康检查：<http://127.0.0.1:8000/api/v1/health>
- 什么都不配也能起来：所有环境变量都有默认值（见下面的「环境变量」）。

跑测试：

```bash
cd api
pytest -q            # 全部
pytest tests/contract -q   # 只跑契约测试（与前端解析器比对）
```

## 环境变量

真实的值只放在**环境变量**里，仓库里只有 `api/.env.example` 这张模板（ADR-010）。

| 变量 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `ENV` | `local` | 环境标识，出现在 `/health` 的 `env` 字段；线上设 `production` |
| `CONTENT_DIR` | **仓库根的 `web/content`** | 内容目录。默认值由代码算出来（`app/core/config.py` 用文件位置推仓库根），所以从哪个目录起服务都对。容器里必须显式设成 `/app/web/content` |
| `CORS_ORIGINS` | 本地 Vite 的 5173 / 4173（含 `127.0.0.1` 两种写法）+ `https://mucheng-zzb.github.io` | 逗号分隔的白名单。**origin 不含路径**，所以不写仓库名 |

## 端点（前缀 `/api/v1`，共 7 个，全部只读）

| 方法 | 路径 | 说明 |
| :--- | :--- | :--- |
| GET | `/health` | 健康检查 + 依赖状态；`?reload=true` 强制重新读盘 |
| GET | `/profile` | 个人简介、链接、技能 |
| GET | `/projects` | 项目列表，支持 `?tag=` `?status=` |
| GET | `/projects/{slug}` | 单个项目详情 |
| GET | `/notes` | 笔记列表（**不含正文**） |
| GET | `/notes/{slug}` | 笔记详情（含正文） |
| GET | `/now` | 近况时间线 |

`slug` = 文件名去掉 `.md`，例如 `web/content/projects/personal-portfolio.md` → `personal-portfolio`。

### 分页与过滤（边界必须写死，否则前端只能猜）

- `limit` 默认 **20**，最小 1、最大 **100**；`offset` 默认 0，最小 0。
- **越界一律 422**（`limit=0` / `limit=101` / `offset=-1`），不静默夹到上下限 ——
  夹一下看起来「更友好」，但会让前端以为拿到了 200 条，其实是 100 条。
- `offset` 超过总数**不是错误**：返回空 `items` + 真实 `total`。
- `total` 是**过滤后、分页前**的数量。
- `?tag=` 精确匹配（区分大小写），未知标签返回空列表而不是 404；`?status=` 只接受 `done | wip | planned`，别的值 422。

## 错误结构

```json
{ "error": { "code": "not_found", "message": "项目「nope」不存在", "request_id": "8f3c..." } }
```

- 只有这三个键。前端按 `code` 分支文案，不用去猜 `message`。
- 每个响应都带 `X-Request-Id`（错误响应也是），**拿它去日志里搜**就能找到那一次请求。
  请求方自己传一个合法的 `X-Request-Id` 会被沿用（前端报错时能把 id 显示给用户）。
- **500 不带堆栈**：响应体只有一句固定文案，堆栈只进服务端日志。

| HTTP | code | 什么时候 |
| :--- | :--- | :--- |
| 404 | `not_found` | slug 不存在 |
| 422 | `validation_error` | 查询参数不合法 |
| 503 | `content_unavailable` | 内容读不到或校验没过（**本版新增的码**，见下） |
| 500 | `internal_error` | 未预期的错误 |

两个需要说明的决定：

1. **内容坏了返回 503 而不是 500**：内容坏了是「临时不可用、改好内容就好」，
   500 的含义是「代码有没预料到的错」。运维看到这两个数字要做的事完全不同。
   （`content_unavailable` 不在 ARCHITECTURE §6 的错误码表里，已记进 HANDOFF 等架构师确认。）
2. **`/health` 在内容坏掉时返回 503**，响应体是体检单（不是统一错误结构）。
   理由：`/health` 的首要用户是**定时探活**，它们只看状态码；返回 200 再在 body 里
   写「其实我坏了」，等于把这个检查做成摆设。它的形状也因此**不含** `error` 键 ——
   统一错误结构管的是「接口报错」，健康体检单是另一回事。

## 内容规则从哪来（这是本版最要紧的一条）

**后端不定义内容规则，它抄前端的。** 唯一的规则来源是 `web/build/content-schema.js`：

| 规则 | 内容 |
| :--- | :--- |
| projects 必填 | `title` `status` `date` `tags` `summary` `order` |
| projects 可选 | `repo` `live` `cover` `featured` |
| notes 必填 | `title` `date` `tags` `summary`；可选 `draft` |
| `status` | `done \| wip \| planned` |
| `date` | `YYYY-MM-DD` 且必须是真实存在的日期（2026-02-30 会被挡住） |
| 未知字段 | **报错**，不是 warning（拼错 `sumary:` 会让接口 503） |
| `draft: true` | 构建期与接口**都不出现**；排除发生在校验之前，所以草稿里的字段错误不会让服务挂掉 |
| projects 排序 | `order` ↑ → `date` ↓ → `title` ↑ |
| notes 排序 | `date` ↓ → `title` ↑ |

JS 进程 import 不进 Python，所以这是**照抄规则 + 读同一份内容**，不是代码复用。
「两份实现是否真的一致」由契约测试保证：

```bash
# ① 让 Node 真跑一次前端的校验器，把 JS 侧的期望值固化成 fixture（改了 web/content 就要重跑）
node api/tests/contract/make_fixture.mjs > api/tests/contract/fixture_js.json

# ② pytest 拿同一份 web/content 跑 Python 侧，逐字段比对
cd api && pytest tests/contract -q
```

`fixture_js.json` 是「Node 的输出」，不许手改；它过期了（比如改了内容）测试就该红。

> **排序口径（D30）：日期与标题的比较，两侧都是码点序。**
> 标题兜底原本 JS 用 `localeCompare(x, 'zh')`（ICU 拼音序），Python 给不出拼音 ——
> 已**改 JS 侧**统一为码点序（`content-schema.js` 的 `compareCodePoint`）。不改的话，
> v0.5-B 接上 API 后「实时数据」与「内置兜底」会在并列项上排出不同顺序；
> 而且 `localeCompare` 的结果依赖运行环境的 ICU 数据版本，威胁「构建可复现」（D18）。
> 测试 `tests/test_content_rules.py::test_title_tiebreak_matches_js_code_point_order` 把它钉住。
>
> 不受影响、也不打算改的一处：页面上的**标签筛选按钮**仍按 `localeCompare(x,'zh')` 排序
> （`web/src/ui/notes.js`、`projects.js`）。那是纯展示顺序，没有后端对应物 ——
> 标签本身由接口按内容里的原顺序返回，两边一致。

另外两个刻意的选择：

- **`date` 是字符串，不转 `datetime`**。转了就可能变成带时区的时间戳，而前端构建期拿到的是
  `"2026-10-11"` 这种纯字符串。PyYAML 默认按 YAML 1.1 把日期解析成 `datetime.date`，
  所以这里把 timestamp 解析器摘掉了 —— 前端为同一个坑弃用过 gray-matter。
- **接口会把缺省的可选字段补成 `null`**（`repo: null`），而构建期产物是直接省略这个键。
  这是给前端的方便（`p.repo ? … : …` 不用先判存在）。所以契约测试比的是**解析层**，
  不是 HTTP 响应 —— 那一层与 JS 逐字一致。
- **文件读不出来也是「内容问题」→ 503**（D31）：非 UTF-8、权限不对，一律 503
  `content_unavailable`，并且告诉你是**哪个文件、什么原因**（`/health` 的体检单能直接看到，
  全量清单在服务端日志里）。500 只留给「代码出了没预料到的错」——
  两类问题混在一个状态码里，会把排查方向指错。
  ⚠️ 两侧对非 UTF-8 的行为**天生不同**：Node 的 utf8 解码是**有损替换**（坏字节变 U+FFFD，
  构建照过），Python 是**严格抛错**（503）。同一个坏文件，前端会带着替换字符上线、
  后端会拒绝服务。目前没有内容触发；真遇到时按「把文件另存为 UTF-8」解决，
  而不是让两侧去模仿对方的容错。

## 目录结构

```text
api/
├── app/
│   ├── main.py          # 应用装配：中间件（请求 id / 访问日志）、CORS、错误处理器、路由
│   ├── core/            # config.py 环境变量 / logging.py 结构化 JSON 日志 / errors.py 统一错误
│   ├── routers/         # health.py / content.py（v0.6 加 guestbook.py，v0.7 加 ask.py）
│   ├── services/        # content_parser.py 规则（与 JS 对齐）/ content_service.py 读盘+缓存
│   └── models/          # schemas.py：Pydantic 出参（v0.6 才加 db.py）
├── tests/
│   ├── contract/        # 与 web/build/content-schema.js 的一致性测试 + fixture
│   ├── test_api.py      # 端点行为：过滤、分页边界、404、CORS、请求 id、500 不泄漏堆栈
│   └── test_content_rules.py  # 内容规则：草稿排除、假日期、未知字段、CRLF、排序兜底
├── requirements.txt     # 运行时
├── requirements-dev.txt # 只有开发和 CI 需要
├── .env.example         # 入库的模板；真正的 .env 在 .gitignore 里（ADR-010）
├── Dockerfile
└── pytest.ini
```

`scripts/` 目录本版**不存在**：内容不做导出（D26 —— 后端直接读 `web/content`），
向量索引要到 v0.7 才需要 `scripts/build_index.py`。

## 容器

```bash
# 在【仓库根】执行 —— 构建上下文必须是仓库根，否则容器里没有 web/content/，
# 起来就 503。/dockerignore 也在仓库根（不然每次构建都要把 web/node_modules 传一遍）
docker build -f api/Dockerfile -t portfolio-api .
docker run --rm -p 8000:8000 portfolio-api
```

> **未验证**：写下这个 Dockerfile 的机器上没有 Docker，**没有跑过 `docker build`**。
> 只核对了它 COPY 的路径在仓库里都存在。第一次真正构建时请把输出贴回来。

## 部署到 Render（v0.5-B）

> **这一段是给「需要在网页上点几下」的那个人看的。** 仓库这边能做的都做完了，
> 剩下的必须在 Render 的控制台里点 —— 那一步只能由账号持有者做。
> 依据：`docs/ARCHITECTURE.md` ADR-005 的 2026-10-11 复核结论（HF Spaces 与 Fly.io 已不可用，
> Render 是唯一免费选项）。**部署当天请重跑一次那六问**，别直接抄这一页。

### 在 Render 上要点什么（按顺序）

1. 注册 / 登录 <https://render.com>，用 GitHub 账号登录最省事。**不需要绑卡**
   （不绑卡的代价见下面「出网流量」）。
2. 右上 **New +** → **Web Service**。
3. **Connect a repository** → 选 `Mucheng-zzb/personal-portfolio`（首次要授权 Render 读仓库）。
4. 填这张表（**其余字段全部保持默认**）：

   | 字段 | 填什么 | 为什么 |
   | :--- | :--- | :--- |
   | Name | 例如 `portfolio-api` | 决定默认域名 `https://<name>.onrender.com` |
   | Language / Runtime | **Docker** | 用仓库里的 `api/Dockerfile` |
   | Root Directory | **留空**（= 仓库根） | 构建上下文必须是仓库根，否则容器里没有 `web/content/`，起来就 503 |
   | Dockerfile Path | `api/Dockerfile` | 相对 Root Directory |
   | Instance Type | **Free** | 唯一免费的档 |
   | Health Check Path | `/api/v1/health` | 内容坏掉时它返回 503，Render 会因此判为不健康（正是我们要的） |
   | Auto-Deploy | **Yes**（默认） | push `main` 即部署；`api/**` 变更会触发（与 `web-deploy.yml` 的 paths 白名单互不干扰） |

5. **Environment Variables** 里加下面两个（其余用代码里的默认值）：

   | Key | Value |
   | :--- | :--- |
   | `ENV` | `production` |
   | `CORS_ORIGINS` | `https://mucheng-zzb.github.io` |

   不设 `CONTENT_DIR`：镜像里已经写死成 `/app/web/content`（见 `api/Dockerfile`）。
   `ENV=production` 还会让 `/health` 不再暴露绝对路径（D33）。
6. **Create Web Service**。首次构建会真的执行 `docker build` —— **这是这个 Dockerfile
   第一次被真正构建**（写它的时候本机没有 Docker），失败请把 Build Log 贴回来。
7. 构建成功后打开 `https://<name>.onrender.com/docs`，确认 7 个端点都在。

### 部署完立刻验证（把输出贴回来）

```bash
HOST=https://<name>.onrender.com
curl -s  "$HOST/api/v1/health"        # 200 + dependencies.content.status=ok
curl -s  "$HOST/api/v1/projects" | head -c 300
curl -sI "$HOST/api/v1/health" | grep -i x-request-id

# CORS：白名单来源应当带回 access-control-allow-origin，伪造来源应当没有
curl -sI -H 'Origin: https://mucheng-zzb.github.io' "$HOST/api/v1/projects" | grep -i access-control
curl -sI -H 'Origin: https://evil.example'          "$HOST/api/v1/projects" | grep -i access-control || echo "（无 access-control 头 = 正确）"
```

### 然后把前端指过去（这一步不设，站点就是纯静态的）

前端在**构建期**注入后端地址。在 GitHub 仓库里加一个**变量**
（Settings → Secrets and variables → Actions → **Variables** → New repository variable）：

| Name | Value |
| :--- | :--- |
| `API_BASE` | `https://<name>.onrender.com`（**不要带 `/api/v1`**） |

然后手动跑一次部署：Actions → **Deploy web to GitHub Pages** → **Run workflow**（`workflow_dispatch`）。
之后再打开站点，页脚会短暂显示「实时数据已同步」，说明这份数据是从后端拿的。

> 变量没设时构建出的站点**不报错也不显示「不可用」**：它压根不发请求，就是原来的静态站。
> 这是刻意的 —— 「后端还没建好」和「后端挂了」是两件事，不该让访客看到后者的提示。

### 冷启动与「定时探活」的代价（想清楚再开）

免费实例**闲置 15 分钟就休眠**，唤醒**约 1 分钟**；而前端超时是 3 秒，
所以冷启动时访客看到的是**降级后的内置内容 + 页脚「实时数据不可用」**（站点功能不受影响）。

要避免它就得定时ping（UptimeRobot 免费版 / GitHub Actions 定时任务，每 5 分钟一次）：

- 常驻约 **720–744 实例小时/月**，而免费额度是 **750/月/工作区** —— 只有它**是唯一的免费服务**时才装得下；
- 而且那样就永远没有休眠测试的机会了：**降级路径反而不会被真实触发**。
- **建议：先不配探活**，让它睡。降级是这一版的硬验收，睡着才是常态。

### 出网流量（2026-10-11 复核出的变化）

免费档出网流量**已从 100 GB/月 降到 5 GB/月**，超出按 $0.15/GB；
**没绑卡的账号超量后当月所有免费服务停用**。
只读接口返回的是小 JSON（每次约 2 KB），5 GB ≈ 250 万次请求，够用；
但**不要拿这个 API 托管图片或大文件** —— 那些继续放静态站。

## 两条一直有效的规矩

1. **密钥永不进仓库。** 只写 `.env.example`，真值放平台的环境变量里（ADR-010）。
2. **后端是增强，不是依赖。** 它挂掉时 `web/` 必须照常能看 —— 前端降级到构建期内置数据
   （ADR-005，v0.5-B 的硬验收）。任何让前端强依赖后端的改动都必须拒绝。
