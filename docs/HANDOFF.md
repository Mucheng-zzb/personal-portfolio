# HANDOFF.md —— 交接与核验记录（架构师工作台）

> **这不是事实来源。** 范围与验收以 `docs/ROADMAP.md` 为准；架构与契约以 `docs/ARCHITECTURE.md` 为准；
> 指令格式与禁止清单以 `docs/CLAUDE-CODE-PLAYBOOK.md` 为准。三份文档与本文件冲突时，以它们为准。
>
> 用途：产品架构师（只写 `.md`，不写代码）把「当前要交给 Claude Code 的活」「已定决策」「核验记录」
> 集中在一处，避免每次靠聊天记录交接。
>
> 最后更新：2026-10-11（v0.2-C 已推送并通过线上核验）

---

## 0. 状态速览

| 版本 | 状态 | 证据 / 备注 |
| :-- | :-- | :-- |
| v0.2-A | ✅ 完成（tag `v0.2-A` → 3c63ceb） | 构建可复现；根目录三副本相对 v0.1 为 11 增 0 删 |
| v0.2-B | ✅ 完成（run #2 / #3 success，硬门禁通过） | 线上已由 Actions 产物提供；实测 push → 上线约 30 秒 |
| v0.2-C | ✅ 完成（`39a83df` / `7bf50f8` / `bbcb0b9` / `8a3925c`，已推送） | run #4 success（30 秒）；线上与本地 `web/dist` 逐字节相同（sha256 `0b366317…`）；体积 JS 1.41→4.64 KB gzip |
| v0.2-D | ⬜ 未开始 | 见 §2 队列 |
| v0.3 → v1.0 | ⬜ 未开始 | 指令块已备齐（见 §2） |

---

## 1. 现在要做的事

### 1.1 v0.2-C —— ✅ 已完成（2026-10-11，架构师已核验）

线上核验证据见 §4。**仍剩下一条只有你能做的事**：核对 `web/content/now.json` 里由「2026.9」
补成的月初日期、以及 `web/content/projects/personal-portfolio.md` 的 `date: 2026-10-11`
（README 的「还需要你亲自改」已列出这 4 条）。

### 1.2 v0.2-B 遗留的「A 块」——必须在 v0.3 之前补

| 项 | 现状 | 要做 |
| :-- | :-- | :-- |
| ARCHITECTURE **ADR-011** | ❌ 仍是过期版本（标题「工作区与版本命名」，写的是 `v2.1-A/` + `v1.0/` 目录式留档） | 改写为「单工作区 + git tag 留档」，废弃目录式留档 |
| 仓库根 **CLAUDE.md** | ❌ 不存在 | 按 PLAYBOOK §2 模板建立，并补「本机环境注意」（Watt Toolkit 代理 / gh CLI / 线上部署判定标记 / gzip 口径） |

> 这两项在 v0.2-B 时期被跳过（当时的提交只做了 workflow 与 README、删三件套）。ADR-011 是**给未来会话的指令**，过期会误导下一个接手的人。

---

## 2. 待办队列（v0.2-D → v1.0）

| 版本 | 要点 | 关键校准点 |
| :-- | :-- | :-- |
| v0.2-D | Prettier（**独立提交** `style:`）+ 可选 ESLint；Lighthouse 移动端基线写进 `docs/BASELINE.md`；把 `npm run check` 换成真检查 | 不设 Lighthouse CI 门禁；体积口径用 `zlib.gzipSync` |
| v0.3-A | `notes/*.md` + hash 路由（`#/notes`、`#/notes/<slug>`）+ marked&DOMPurify + **构建期**排除 draft + sitemap/robots | draft 必须在构建期排除；代码高亮选 highlight.js(core)；浮层/渲染懒加载 |
| v0.3-B | 校验收扩展到 notes；ARCHITECTURE 补「渲染策略与升级触发器」 | **不做** `web/snapshot/` 与 `export_content.py`（推迟到 v0.5-A） |
| v0.4-A | 明暗主题、项目筛选、简历、OG、无障碍、真机 | 主题防闪烁；hash 路由下筛选参数自己解析；砍单序：简历 PDF → OG → 主题 |
| v0.5-A | FastAPI 只读 API（`/api/v1`）+ 统一错误结构 + request-id + CORS 白名单 | 两侧 schema 一致性测试；不接数据库 |
| v0.5-B | 部署到免费 PaaS + **前端降级硬验收** | 先执行 ADR-005 现查六问；降级阶梯 Render→HF Spaces→Fly；三种演练手法 |
| v0.6-A | SQLite/Postgres + 留言板（**整版可砍**） | 限流放进程内；`ip_hash` 加盐策略；不留生产后门 |
| v0.7-A / B | RAG：离线索引 + `POST /api/v1/ask`(SSE) + 前端浮层 | 阈值用 20 条评测集标定；SSE 平台超时则降级非流式；浮层懒加载 |
| v0.8-A | pytest/Vitest + CI **按路径过滤** + 安全扫描 + 文档 | 门禁在分支/PR 上验证，别污染 main |
| v0.9-A | 按 ROADMAP §8 逐条自检 + 三故障演练 + 外链与 TODO 扫描 | 产出 `docs/RELEASE-CHECK.md` |
| v1.0-A | CHANGELOG + tag `v1.0.0` + Release/公告 + 复盘笔记 | 发布 commit 不夹带功能改动 |

---

## 3. 决策登记表

| # | 决策 | 状态 | 应写进哪里 |
| :-- | :-- | :-- | :-- |
| D1 | 版本留档用 git tag，废弃 `v1.0/`、`v2.1-A/` 目录式留档 | ⏳ 待落地（见 §1.2） | ARCHITECTURE ADR-011 |
| D2 | 仓库根 CLAUDE.md（含本机环境注意） | ⏳ 待落地 | `CLAUDE.md` |
| D3 | 内容管线在构建期（校验 / draft 排除 / sitemap），前端不做运行时校验 | ✅ 已落地 | `web/build/*` |
| D4 | 禁用 JS 只承诺 姓名/定位/邮箱/GitHub；项目卡由 JS 渲染 | ✅ 已落地 | ARCHITECTURE §4 |
| D5 | 不做 `web/snapshot/`、不做 `export_content.py`（推迟到 v0.5-A） | ✅ 本期遵守，v0.3-B 复核 | ARCHITECTURE §3 / PLAYBOOK §5.2-B |
| D6 | 代码高亮选 highlight.js（core + 手动注册语言），排除 shiki | ⏳ v0.3-A | PLAYBOOK §5.2-A / ARCHITECTURE §1 |
| D7 | CI 按路径过滤（web-ci / api-ci 各管各的） | ⏳ v0.8-A | PLAYBOOK §5.7 |
| D8 | SSE 平台超时 → 降级为一次性返回 | ⏳ v0.7-A | ARCHITECTURE §8 |
| D9 | 相似度阈值用 20 条评测集标定 | ⏳ v0.7-A | ARCHITECTURE §8 + `docs/AI-EVAL.md` |
| D10 | `ip_hash = SHA256(IP + IP_HASH_SALT + 日期前缀)`，不每日换盐 | ⏳ v0.6-A | ARCHITECTURE §7 |
| D11 | v0.5 部署降级阶梯；三者都不可用则不虚报 done | ⏳ v0.5-B | ADR-005 / ROADMAP §5 |
| D12 | 项目卡内容修正（Node.js→FastAPI、笔记卡合并、status 诚实） | ✅ 已落地（v0.2-C） | `web/content/projects/*.md` |
| D13 | `#/notes` 暂用纯文本，不新增 front-matter 字段 | ⏳ v0.3 再评估 | — |
| D14 | `profile.json` 字段面封口：8 必填 + 4 可选 | ✅ 已落地 | ARCHITECTURE §5 |
| D15 | 体积统一用 `zlib.gzipSync` 口径 | ⏳ 写进 BASELINE（v0.2-D） | `docs/BASELINE.md` |
| D16 | Vite 8 插件用 `hotUpdate`（`handleHotUpdate` 已弃用） | ✅ 已落地 | 代码注释 |

---

## 4. 核验日志（架构师，只读）

| 日期 | 对象 | 结论 | 关键证据 |
| :-- | :-- | :-- | :-- |
| 10-11 | 远端历史 | ✅ | `gh api` refs：tag `v0.1.0`、`v0.2-A` 在远端 |
| 10-11 | v0.2-B 部署 | ✅ 线上由 Actions 产物提供 | `/script.js`、`/style.css` 均 404；`/assets/index-*` 200 且与本地 `web/dist` **逐字节相同**（sha256 `0744c9ea…`） |
| 10-11 | v0.2-B 硬门禁 | ✅ | run #3 success；`git ls-files` 顶层只剩 `.gitattributes` / `.gitignore` / `README.md` |
| 10-11 | push → 上线耗时 | ✅ 约 30 秒（要求 ≤3 分钟） | commit 21:54:08 → run #2 于 21:54:42 success → 线上 `last-modified` 21:54:35 |
| 10-11 | v0.2-C 实现与本地演练 | ✅ | 架构师代码审查：`content-schema.js` 529 行、插件用 `hotUpdate`、`MD_COLLECTIONS` 预留 filter 钩子；Claude Code 本地 10 步全绿（含两条「故意失败」演练的真实输出，已在其会话中贴出） |
| 10-11 | v0.2-C 体积（zlib 口径） | ✅ 预算内 | CSS 2.81→2.81 KB（sha256 不变）、HTML 4.29→3.41 KB、JS 1.41→4.64 KB；预算 150KB |
| 10-11 | **v0.2-C 部署（推送后）** | ✅ 通过 | run #4（`bbcb0b9`）success，30 秒；线上 HTML 与本地 `web/dist/index.html` **逐字节相同**（sha256 `0b366317…`）；新 JS `index-Co5RLd3b.js` 200，旧 JS 与 `/script.js` 均 404；线上 JS 内含 数据小工具 / 第一个 API 服务 / 本站笔记合集 / Python 编程基础与常用库 / FastAPI / SQLite；静态 HTML 含 姓名·定位·邮箱·GitHub·「正在学什么」 |

---

## 5. 口径与工具备注

- **远端核验**：本机 `gh` CLI 已登录，优先用只读 `gh api`（匿名 API 额度 60/小时，已耗尽过一次）：
  `gh api repos/Mucheng-zzb/personal-portfolio/{tags,actions/runs,deployments,pages}`。
- **线上部署判定标记**：HTML 含 `./script.js` = 分支部署；含 `/personal-portfolio/assets/index-*` = Actions 产物。
- **沙箱内 git 走 HTTPS** 会因 Watt Toolkit 中间人代理失败（schannel 无凭据 / openssl 缺该根证书）。
  可行做法：导出 SteamTools 根证书为 PEM，再
  `git -c http.sslBackend=openssl -c http.sslCAInfo=<pem> …`（沙箱还需放宽一次）；
  `raw.githubusercontent.com` 需 `--ssl-no-revoke`。
- **gzip 体积口径**：统一用 Node `zlib.gzipSync`（`gzip` 命令行会多写文件名与 mtime，数字不可比）。
- **无 JS 降级**：姓名 / 定位 / 邮箱 / GitHub 必须留在静态 HTML。
- **可回滚锚点**：远端已有 tag `v0.2-B` → `a2e7f18`（该 ref 自带 `web-deploy.yml`，可用于 `workflow_dispatch` 回滚）。

---

## 6. 本文件自身的落库方式

本文件由产品架构师创建，**尚未提交**。建议由 Claude Code 提交：
`docs: 添加架构师交接与核验记录（HANDOFF.md）`，
并在 `docs/ARCHITECTURE.md` §3 的 docs 目录清单里补一行 `HANDOFF.md`。
