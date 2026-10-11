# CLAUDE.md

## 项目
个人作品集（v1.0 目标）。前台 = GitHub Pages 静态站（Vite + 原生 JS，不用框架），由 GitHub Actions
构建 `web/` 并发布；后台 = FastAPI（`api/`），独立部署，前端必须能在后端失效时降级。

## 必读
- `docs/ROADMAP.md`：版本范围、验收标准、砍单顺序
- `docs/ARCHITECTURE.md`：架构决策（ADR）、API 契约、内容模型
- `docs/CLAUDE-CODE-PLAYBOOK.md`：逐版指令块与禁止清单
- `docs/HANDOFF.md`：架构师的当前交接、决策登记与核验日志（不是事实来源）

## 硬性约束
- 不引入前端框架（React/Vue/Svelte/Next），不引入 CSS 框架。
- 不做用户系统；不做 SSR；不引入向量数据库。
- 密钥一律走环境变量；`.env` 不得入库；`.env.example` 必须同步更新。
- 每个外部依赖都要有明确失效表现（API / 数据库 / LLM 都要能降级）。
- 首屏关键内容（姓名 / 定位 / 邮箱 / GitHub）必须留在 `web/index.html` 的静态 HTML 里，禁用 JS 仍可见。
- **内容与代码分离**：页面内容只存在于 `web/content/`（`profile.json`、`now.json`、`projects/*.md`、
  以后 `notes/*.md`）；校验在构建期，由 `web/build/` 的插件负责；不要为了改内容去动 HTML。
- 不擅自改动 `web/content/` 的**内容**（那是我的写作）；可以改解析、校验、渲染逻辑。
- 唯一工作区 = 仓库根目录；版本留档用 git tag，不用目录；不要从任何副本目录提交或推送。
- 根目录的 `index.html` / `script.js` / `style.css` **已于 v0.2-B 删除**，线上只由 `web/dist` 产物提供。

## 命令
- 前端（**在 `web/` 下执行**）：`npm ci` / `npm run dev` / `npm run build` / `npm run preview` / `npm run check`
  - `npm run check` 在 v0.2-D 完成前可能仍是 `vite build` 占位；真实质量基线见 `docs/BASELINE.md`
- 后端（v0.5 起，在 `api/` 下）：`pip install -r requirements.txt` / `uvicorn app.main:app --reload` / `pytest`
- 重生成契约 fixture（**在仓库根执行**）：`node api/tests/contract/regen_fixture.mjs`
  - **唯一指定做法，不要用 shell 的 `>` 重定向**：Windows PowerShell 的 `>` 会把文件写成 UTF-16/BOM，
    之后 pytest 报 `UnicodeDecodeError`（已踩两次）。改了 `web/content/**` 或 JS 排序规则后必须重跑。

## 提交规范
Conventional Commits，描述用中文：`feat:` `fix:` `docs:` `chore:` `refactor:` `test:`；
格式化改动必须是独立的 `style:` 提交。

## 完成标准
任何任务结束前必须：运行构建与测试、粘贴真实输出、报告未完成项。不要用「应该」「大概」描述结果。
- 改动 `web/**` 时，除 `npm run check` 外必须跑 `npm run smoke`（两条黑盒冒烟：禁用 JS / 后端不可达）——
  只跑 lint 与 build 看不见这两种失效。

## 本机环境注意（Windows + DSH 沙箱）
- HTTPS 出网经过 Watt Toolkit（SteamTools 证书）中间人代理：沙箱内 `git ls-remote` / `git push` 可能因
  TLS 失败（schannel 报 `SEC_E_NO_CREDENTIALS`，openssl 后端找不到该根证书）。可行做法：导出根证书为
  PEM 后 `git -c http.sslBackend=openssl -c http.sslCAInfo=<pem> …`；`raw.githubusercontent.com` 需 `--ssl-no-revoke`。
- 远端核验优先用本机已登录的 `gh` CLI（只读 `gh api`）；匿名 API 额度只有 60/小时。
- 同一个根证书问题也挡住**无头 Chrome 访问线上**（Lighthouse 会报 `net::ERR_CONNECTION_RESET`）：
  加 `--ignore-certificate-errors` 即可。它只影响「本机怎么连上站点」，不动被测页面：
  `npx lighthouse <URL> --chrome-flags="--headless=new --no-sandbox --disable-gpu --ignore-certificate-errors"`。
  测暗色主题再追加 `--force-dark-mode`（它会让 `prefers-color-scheme` 命中 dark）。
- 无头 Chrome 的 `--window-size` 会被钳到 ~512px 宽，**不能用它测小屏**；
  要真的模拟手机得走 CDP 的 `Emulation.setDeviceMetricsOverride`。
- 线上部署判定标记：HTML 含 `/personal-portfolio/assets/index-*` = Actions 产物；含 `./script.js` = 旧的
  分支部署（已不再使用）。
- 体积口径统一用 Node `zlib.gzipSync`（`gzip` 命令行会多写文件名与 mtime，数字不可比）。
