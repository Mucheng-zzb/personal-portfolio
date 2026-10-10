# CLAUDE.md

## 项目

个人作品集（v1.0 目标）。前台 = GitHub Pages 静态站（Vite + 原生 JS，不用框架）；
后台 = FastAPI（`api/`），独立部署，前端必须能在后端失效时降级。

## 必读

- `docs/ROADMAP.md`：版本范围、验收标准、砍单顺序
- `docs/ARCHITECTURE.md`：架构决策（ADR）、API 契约、内容模型
- `docs/CLAUDE-CODE-PLAYBOOK.md`：逐版指令块与禁止清单

## 硬性约束

- 不引入前端框架（React/Vue/Svelte/Next）。
- 不做用户系统；不做 SSR；不引入向量数据库。
- 密钥一律走环境变量；`.env` 不得入库；`.env.example` 必须同步更新。
- 每个外部依赖必须实现降级路径。
- 首屏关键内容（姓名/定位/联系方式）必须写在静态 HTML 里，禁用 JS 也要可见。
- 不擅自改动 `web/content/` 的内容（那是我的写作，不是你的素材）。
- 唯一工作区与仓库根是同一个目录（`personal-portfolio`）；版本留档用 git tag，不用目录。
- 根目录 `index.html` / `script.js` / `style.css` 是 v0.2-B 完成前的临时保活副本：不要编辑，也不要在硬门禁通过前删除。
- `npm run check` 在 v0.2-D 之前只是 `vite build` 的占位，不是代码检查。

## 命令

- 前端（**在 `web/` 下执行**）：`npm ci` / `npm run dev` / `npm run build` / `npm run preview` / `npm run check`
- 后端（v0.5 起）：`pip install -r api/requirements.txt` / `uvicorn app.main:app --reload`（在 `api/` 下）/ `pytest`

## 提交规范

Conventional Commits，描述用中文：`feat:` `fix:` `docs:` `chore:` `refactor:` `test:`

## 完成标准

任何任务结束前必须：运行构建与测试、粘贴真实输出、报告未完成项。
不要用「应该」「大概」描述结果。

## 本机环境注意（Windows + DSH 沙箱）

- 本机 HTTPS 出网经过 Watt Toolkit（SteamTools 证书）中间人代理：沙箱内 `git ls-remote` / `git push`
  会因 TLS 失败（schannel 报 `SEC_E_NO_CREDENTIALS`，openssl 后端找不到该根证书）。
  核对远端与 Actions 状态用 `node --use-system-ca` + GitHub API；需要 push 时先试同样办法，
  仍失败就把确切命令交给用户在本人终端执行。
- 线上部署方式有可判定标记：HTML 含 `./script.js` = 从分支根目录部署（v0.2-B 之前）；
  含 `/personal-portfolio/assets/index-*.js` = 由 Actions 构建后发布。
- 过渡期结束前，根目录三件套与 `web/` 下同名文件只允许有顶部注释的差异；任何改动只做在 `web/`。
