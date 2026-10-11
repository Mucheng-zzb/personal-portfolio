# HANDOFF.md —— 交接与核验记录（架构师工作台）

> **这不是事实来源。** 范围与验收以 `docs/ROADMAP.md` 为准；架构与契约以 `docs/ARCHITECTURE.md` 为准；
> 指令格式与禁止清单以 `docs/CLAUDE-CODE-PLAYBOOK.md` 为准。三份文档与本文件冲突时，以它们为准。
>
> 用途：产品架构师（只写 `.md`，不写代码）把「当前要交给 Claude Code 的活」「已定决策」「核验记录」
> 集中在一处，避免每次靠聊天记录交接。
>
> 最后更新：2026-10-11（**v0.4-A 实现完成并推送，待架构师核验**；`v0.4-A` 之后还有 v0.4-B 待定）

---

## 0. 状态速览

| 版本 | 状态 | 证据 / 备注 |
| :-- | :-- | :-- |
| v0.2-A | ✅ 完成（tag `v0.2-A` → 3c63ceb） | 构建可复现；根目录三副本相对 v0.1 为 11 增 0 删 |
| v0.2-B | ✅ 完成（run #2 / #3 success，硬门禁通过） | 线上已由 Actions 产物提供；实测 push → 上线约 30 秒 |
| v0.2-C | ✅ 完成（`39a83df` / `7bf50f8` / `bbcb0b9` / `8a3925c`，已推送） | run #4 success（30 秒）；线上与本地 `web/dist` 逐字节相同（sha256 `0b366317…`）；体积 JS 1.41→4.64 KB gzip |
| A 块（v0.2-B 遗留） | ✅ 完成（`ee90d6c` / `be9a6a2` / `363c643`） | ADR-011 改为 tag 留档；CLAUDE.md 已入库；docs/ 不在 paths 白名单，未触发部署，线上未受影响 |
| v0.2-D | ✅ 完成（`9e3c10f` / `042ce4e` `style:` / `d8f3781` / `1b20150` / `e0f4fc8`，已推送） | 见 §4；tag `v0.2.0` 已打并推送；Lighthouse 100/95/100/100 写进 BASELINE |
| v0.3-A 笔记子系统 | ✅ **验收全部关闭**（`fb9d97b`；run `38114432920` success，31 秒） | 架构师复核：线上 5/5 文件与本地 dist 逐字节一致；notes 集合 draft 构建期排除；体积首屏 54.16 KB gzip。**用户手工点检导航锚点：通过（2026-10-11）** |
| v0.3-B 与 `v0.3.0` | ✅ 完成（`721dcdb` ARCHITECTURE §13 渲染策略 / `626e4ae` PLAYBOOK §5.2-B；tag `v0.3.0` → 626e4ae 已推送） | docs-only 两个提交；按 paths 白名单**不触发部署**（线上仍 200，属预期，不是失败） |
| v0.4-A 门面达标 | 🟡 **已实现并推送**（`b3ff71c` … `13db499`；run `38121103823` success 34 秒） | 线上 7/7 文件与本地 `web/dist` 逐字节一致；Lighthouse 移动端**线上**复跑：浅色 98/100/100/100 与 100/100/100/100、暗色 100/100/100/100（BASELINE §1）。**待架构师核验与人工真机走查** |
| v0.4-B 及之后 | ⬜ 未开始 | 真机走查（ROADMAP §5.4 要求）尚未做；B2/B3 内容轨未动 |

---

## 1. 现在要做的事

### 1.1 v0.2-B / C / D 与收尾 —— ✅ 全部完成（2026-10-11，架构师已核验）

**v0.2-D**（`9e3c10f` Prettier 依赖 → `042ce4e` 纯格式化 → `d8f3781` check 换成 prettier+eslint+vite build → `1b20150` HANDOFF → `e0f4fc8` BASELINE）；
Lighthouse 移动端 100/95/100/100，唯一失分是页脚对比度 4.19（留到 v0.4 与主题/无障碍一起改）；tag `v0.2.0` 已推送。

线上核验证据见 §4。

**日期修正已完成**（`9fee6c2`）：用户把 `now.json` 三条改成真实日期
（`2026-09-05` / `2026-09-09` / `2026-10-10`），README 的「我推断出来的日期」表已同步。
仍未确认的只剩 `now.json` 第 4 条与 `web/content/projects/personal-portfolio.md` 的 `2026-10-11`（已标注保留）。

### 1.2 A 块与收尾 —— ✅ 全部完成（`ee90d6c` / `be9a6a2` / `363c643` / `9fee6c2` / `476148b` / `c8af79e`）

| 项 | 结果 |
| :-- | :-- |
| ARCHITECTURE **ADR-011** | ✅ 改写为「单工作区 + git tag 留档」 |
| 仓库根 **CLAUDE.md** | ✅ 已建立入库；PLAYBOOK §2 的重复模板已删除，§2 改为指向它 |
| `docs/HANDOFF.md` | ✅ 已提交并持续更新 |
| 近况日期 | ✅ `now.json` 三条改为真实日期，README 推断表同步 |
| 线上 | ✅ run（`c8af79e`）success 32 秒；线上 HTML/JS 与本地 `web/dist` 逐字节相同 |

**教训（已写进 §5）**：我两次把验收判据写成「grep 不到 `v2.1-A`」，而我自己给的替换正文里
正当地点了这个已废弃路径的名字。**字面 0 命中不是好判据**，应写成语义判据：
「没有一处把 `v2.1-A` 当作在用的工作区」。

### 1.3 v0.3-B —— ✅ 已完成（`721dcdb` / `626e4ae`，tag `v0.3.0`）

1. notes 的日期格式校验（故意写错日期 → 构建失败并指出文件 + 字段）；
2. ARCHITECTURE 补「渲染策略与升级触发器」一节（客户端渲染 + 构建期内联；笔记 > 30 篇转预渲染）；
3. 改写 PLAYBOOK §5.2-B：**去掉** `web/snapshot/content.json` 与 `export_content.py`（D5，推迟到 v0.5-A），
   验收条改为「日期格式错误会导致构建失败」。

做完 v0.3 结束 → 打 tag `v0.3.0` 并推送。

**之后的顺序（用户 2026-10-11 决定）**：先 **B1（数据小工具 CLI，内容轨）**，再做 **v0.4（门面）**。
理由：工程轨已有约两周提前量，v0.4 拖到 10/26 开工仍在它自己的 W5（11/09–11/15）之前；
而 B1 做完，v0.4 的项目卡筛选/排序/封面才有真实数据可用，顺序上更顺。
**注意**：v0.4 里包含 BASELINE 记下的唯一失分项（页脚对比度 4.19 → 需 ≥4.5），修完整站 Lighthouse 即 100/100/100/100。

### 1.4 剩一处文档不一致（已列为待办，交给 Claude Code）

`docs/ARCHITECTURE.md` §3 的目标目录树仍有两行与 D5 矛盾：
- 第 197 行 `web/snapshot/`（「由构建脚本生成的内置数据快照（降级用）」）—— 前端不需要运行时快照，应删除；
- 第 210 行 `export_content.py` 的注释写着「→ 前端快照」，应改为「v0.5 定：把内容导出为后端可读结构（前端不再用它做快照）」。

---

## 2. 待办队列（v0.2-D → v1.0）

| 版本 | 要点 | 关键校准点 |
| :-- | :-- | :-- |
| ~~v0.2-D~~ | ✅ 已完成（见 §0 / §4） | — |
| ~~v0.3-A~~ | 🟡 本地完成、待 `git push origin main`（见 §0） | — |
| v0.3-B | ① notes 的日期格式校验（写错日期 → 构建失败）；② ARCHITECTURE 补「渲染策略与升级触发器」；③ 改写 PLAYBOOK §5.2-B 去掉 snapshot/export_content | **不做** `web/snapshot/` 与 `export_content.py`（D5，推迟到 v0.5-A）；做完打 `v0.3.0` |
| ~~v0.4-A~~ | ✅ 已实现并推送（见 §0；待核验） | 主题防闪烁走 head 内联脚本；筛选参数挂 `#/projects` 而非 `#projects` 锚点（router.js 有说明）；砍单序里 **PDF 与 OG 都没砍**（本机 Chrome 无头截图/打印即可生成） |
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
| D1 | 版本留档用 git tag，废弃 `v1.0/`、`v2.1-A/` 目录式留档 | ✅ 已落地（ADR-011 + PLAYBOOK §2） | ARCHITECTURE ADR-011 / PLAYBOOK §2 |
| D2 | 仓库根 CLAUDE.md（含本机环境注意） | ✅ 已落地 | `CLAUDE.md` |
| D3 | 内容管线在构建期（校验 / draft 排除 / sitemap），前端不做运行时校验 | ✅ 已落地 | `web/build/*` |
| D4 | 禁用 JS 只承诺 姓名/定位/邮箱/GitHub；项目卡由 JS 渲染 | ✅ 已落地 | ARCHITECTURE §4 |
| D5 | 不做 `web/snapshot/`、不做 `export_content.py`（推迟到 v0.5-A） | ✅ 本期遵守；PLAYBOOK §5.2-B 已改写；**ARCHITECTURE §3 目录树待同步（见 §1.4）** | PLAYBOOK §5.2-B（已改写）/ ARCHITECTURE §3（待同步） |
| D6 | 代码高亮选 highlight.js（core + 手动注册语言），排除 shiki | ✅ 已落地（v0.3-A，5 种语言） | PLAYBOOK §5.2-A / 代码注释 |
| D7 | CI 按路径过滤（web-ci / api-ci 各管各的） | ⏳ v0.8-A | PLAYBOOK §5.7 |
| D8 | SSE 平台超时 → 降级为一次性返回 | ⏳ v0.7-A | ARCHITECTURE §8 |
| D9 | 相似度阈值用 20 条评测集标定 | ⏳ v0.7-A | ARCHITECTURE §8 + `docs/AI-EVAL.md` |
| D10 | `ip_hash = SHA256(IP + IP_HASH_SALT + 日期前缀)`，不每日换盐 | ⏳ v0.6-A | ARCHITECTURE §7 |
| D11 | v0.5 部署降级阶梯；三者都不可用则不虚报 done | ⏳ v0.5-B | ADR-005 / ROADMAP §5 |
| D12 | 项目卡内容修正（Node.js→FastAPI、笔记卡合并、status 诚实） | ✅ 已落地（v0.2-C） | `web/content/projects/*.md` |
| D13 | `#/notes` 暂用纯文本，不新增 front-matter 字段 | 🟡 v0.3-B 再评估（当前仍是纯文本） | — |
| D14 | `profile.json` 字段面封口：8 必填 + 4 可选 | ✅ 已落地 | ARCHITECTURE §5 |
| D15 | 体积统一用 `zlib.gzipSync` 口径 | ✅ 已落地（v0.2-D 写入，v0.3-A 沿用） | `docs/BASELINE.md` |
| D16 | Vite 8 插件用 `hotUpdate`（`handleHotUpdate` 已弃用） | ✅ 已落地 | 代码注释 |
| D17 | hash 路由**只接管 `#/` 开头的 hash**；`#about` 等锚点仍走原生滚动 | ✅ 已落地（v0.3-A） | PLAYBOOK §5.2-A / 代码注释 |
| D18 | 构建产物**禁止**写 lastmod / 构建时间（保住可复现构建） | ✅ 已落地（sitemap/robots） | 代码注释 |
| D19 | 首屏体积阈值：≤80KB gzip 保持静态 import，>80KB 才懒加载笔记渲染器 | ✅ 已落地（v0.4-A 实测 48.14KB，仍未懒加载） | `docs/BASELINE.md` §2 |
| D20 | 项目筛选参数挂在 `#/projects` 路由上，**不**给首页 `#projects` 锚点挂查询串 | ✅ 已落地（v0.4-A，`17c0995`） | 代码注释 `src/router.js` / 提交信息 |
| D21 | 简历的「教育」只收 `profile.education` 一个可选字符串，不做 `education[]` 数组 | ✅ 已落地（v0.4-A，`9cdfb9f`） | ARCHITECTURE §5 / README |
| D22 | 站内资源路径（如项目封面）一律过 `import.meta.env.BASE_URL`，不直接用 content 里的 `/…` | ✅ 已落地（v0.4-A，`6ee4859`） | 代码注释 `src/ui/projects.js` |

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
| 10-11 | **A 块（ADR-011 + CLAUDE.md + HANDOFF）** | ✅ 通过 | `ee90d6c` / `be9a6a2` / `363c643` 已推送；`git ls-files` 含 `CLAUDE.md`；ADR-011 标题已是「单工作区 + git tag 留档」；无新 workflow run（docs/ 不在 paths），线上仍 200 |
| 10-11 | **收尾（PLAYBOOK §2 + 近况日期）** | ✅ 通过 | `476148b` / `9fee6c2` 已推送；run（`c8af79e`）success 32 秒；线上 JS `index-CinFOPtF.js` 与本地逐字节相同；线上 bundle 含 2026-09-05 / 09-09 / 10-10 / 10-11，旧推断值 0 命中 |
| 10-11 | **v0.2-D** | ✅ 通过 | tag `v0.2.0` 在远端；`style:` 是独立提交（10 文件纯格式化）；`npm run check` = prettier+eslint+vite build；BASELINE 四项 100/95/100/100 |
| 10-11 | **v0.3-A（本地）** | ✅ 通过（待推送） | 架构师复核：`slugFromFilename` 已去目录前缀；CRLF 归一化已修；notes 集合带 `withBody` + draft 构建期排除；sitemap/robots 无 lastmod；**我自己重跑两次 build，5 个 dist 文件 sha256 逐字节一致**；dist bundle 含笔记标题 |
| 10-11 | **v0.3-A 部署（推送后）** | ✅ 通过 | `fb9d97b` 已推送（`main == origin/main`）；run `38114432920` success 31 秒；线上 index.html / JS `index-DdMUI8O7.js`（130309 B）/ CSS `index-D55ilY8h.css`（13898 B）/ sitemap.xml / robots.txt **5/5 与本地 dist 逐字节一致**；线上 JS bundle 含 `#/notes`、`function-definition-vs-call`、marked、sanitize、highlight |
| 10-11 | **v0.3-A 导航锚点人工点检** | ✅ 通过（**用户执行**，非机器验证） | 用户反馈：线上 `#/notes` 页面点导航「关于/技能/项目/近况/联系」均可正常滚动，无异常；无截图留档 |
| 10-11 | **v0.3-B 与 v0.3.0** | ✅ 通过 | 架构师复验：`721dcdb` / `626e4ae` 两个 docs 提交；远端 tag `v0.3.0` → 626e4ae；ARCHITECTURE 558/560/573 行有「构建期预渲染 / 笔记 > 30 篇」触发器；全 PLAYBOOK 内 `web/snapshot`、`export_content` **0 命中**；`npm run check` exit 0；docs-only 推送不触发 run（预期）；线上 200 |

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
- **可回滚锚点**：远端现有 tag `v0.1.0` / `v0.2-A` / `v0.2-B` → `a2e7f18` / `v0.2.0` → `e0f4fc8`。
  注意：`workflow_dispatch` 指定 ref 回滚时，该 ref 必须自带 `web-deploy.yml` —— 所以只有 `v0.2-B` 及以后的 tag 可用。
- **首个真实回滚演练**仍待做（ROADMAP §9 要求 v0.9 前至少演练一次）。
- **验收判据要写语义，不要写字面 grep**：文档修订常常需要「点名已废弃的旧路径」
  （ADR-011 与 PLAYBOOK §2 都要提到 `v2.1-A` 才能把废弃说明白），所以判据应写成
  「没有一处把 X 当作在用的做法」，而不是「grep 不到 X」。这条已两次踩到。

---

## 6. 本文件自身的落库方式

本文件由产品架构师创建与维护，**已入库**（首次提交 `363c643`，`docs/ARCHITECTURE.md` §3 的 docs 清单也已补上它）。
后续每次架构师更新后，由 Claude Code 用 `docs: 更新 HANDOFF（…）` 一并提交——避免它长期停在旧状态。

> 教训记录：v0.2-D 落地后我漏更了 §0 的状态表与 §2 的队列，导致文件一度显示「v0.2-D 未开始」。
> 台账类文档必须与版本同步更新，否则比没有更糟（会误导下一个接手的人）。
