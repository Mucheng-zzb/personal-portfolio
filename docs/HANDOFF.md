# HANDOFF.md —— 交接与核验记录（架构师工作台）

> **这不是事实来源。** 范围与验收以 `docs/ROADMAP.md` 为准；架构与契约以 `docs/ARCHITECTURE.md` 为准；
> 指令格式与禁止清单以 `docs/CLAUDE-CODE-PLAYBOOK.md` 为准。三份文档与本文件冲突时，以它们为准。
>
> 用途：产品架构师（只写 `.md`，不写代码）把「当前要交给 Claude Code 的活」「已定决策」「核验记录」
> 集中在一处，避免每次靠聊天记录交接。
>
> 最后更新：2026-10-11（**第二次核验**：线上 7/7 文件仍与本地 `web/dist` 逐字节一致；`resume.pdf` 已用硬证据证实仍是文案统一前的旧 tagline；
> tag `v0.4.0` 已建 → `e6ce078`，**但它早于最后两个提交**（`a46707e` 文案统一 / `509b785` OG 重生成），位置存疑待用户决定。下一步：v0.5-A）
>
> 同一轮追加：完成 ADR-005 免费 PaaS **现查六问**（§7）——HF Spaces 的 Docker Space 与 Fly.io 都已不再对新用户免费，**原三级降级阶梯只剩 Render**，见 D24。
>
> 再追加：v0.5-A 开工前的架构复查发现 4 处文档不一致（§1.4），其中「复用 v0.3 解析逻辑」字面不可行（JS vs Python），已在 §1.5 写成可执行的规则清单；新增 D26。
>
> 又追加：v1.0 检查清单复查（§1.6）——**404 页无人负责**（登记 D27）、**密钥检查是字面 grep**（同类错误第三次）。
>
> 再追加：体积复核 **60.22 KB**（预算内，BASELINE 待刷新资产名）+ **内容轨盘点**（§8：已完成带链接项目 **1/≥3**、笔记 **1/≥5**——这才是最紧的瓶颈）。
>
> 又追加：写好 **§1.7 v0.5-B 指令草稿**（含原文档缺失的三种降级演练定义），等 D24 拍板即可发放。
>
> 再追加：v0.6/v0.7 契约复查（§1.4-5/6、§1.8）——`ip_hash`「每日盐」与 D10 矛盾、`ask_logs` 依赖被砍单第一位的 v0.6、`index.json` 时机未定（D28）。
>
> 又追加：内容模型与实现对照 —— 字段/枚举/排序全一致；但 ARCHITECTURE §4 的「图片失败 `onerror` 占位」契约在 `web/src` 里 **0 实现**（§1.4-7），且 D14 的「4 可选」更正为 5。
>
> **最高优先级追记（用户授权架构师代决）**：D23 重打 tag → `509b785`；D24 接受 Render 单点 + 前端降级；**D26 后端直接解析 `web/content/**`**；D27 404 页归 v0.8；D28 `index.json` 提交进仓库 + CI 校验 `content_hash`、`ask_logs` 退化为 stdout；D13 关闭。批准的文档改动见 **§1.9**，A 组必须先做。

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
| v0.4-A 门面达标 | ✅ 完成（`b3ff71c` … `b997afd`；run `38121103823` success 34 秒） | 线上 7/7 与本地 `web/dist` 逐字节一致；无 JS 降级四项仍在；Lighthouse 线上复跑 100/100/100/100（浅色首跑 98 系 Pages 网络抖动，非代码问题） |
| 文案统一 + OG 重生成 | ✅ 完成（`a46707e` / `509b785`；run #9 success 33 秒） | 「大一在读」→「专科在读（大一）」同步到 `profile.json` / 首屏静态 HTML / 简历页静态 HTML / meta / README，OG 图重生成。架构师 10-11 复验线上 7/7 逐字节一致（`index.html` `95049652` 20445B、JS `index-BIq1GmEs.js` 136524B `48ba5299`、CSS `index-zHbQBzuy.css` 19047B、`images/og.png` 184011B、`resume.pdf` 148716B、robots 94B、sitemap 487B） |
| v0.4 收尾 → tag `v0.4.0` | ✅ **已定：重打到 `509b785`（待执行）** | D23 代决：tag 应含该版本最终文案，`509b785` 的线上产物已核验 7/7 逐字节一致。执行 `git tag -f v0.4.0 509b785` + `git push -f origin v0.4.0`（只移 tag 引用，不动提交）。**`resume.pdf` 旧文案仍待重生成（§1.4 / §1.9 A 组）** |
| v0.5 与 B2 | ⬜ 未开始（`api/` 只有 `README.md` 占位） | 内容轨下一站 B2 = 第一个 REST API（FastAPI + SQLite），它同时就是站点 v0.5 的后端。发放的指令 = PLAYBOOK §5.4 第 1 块 + §1.5 的两条前置 |

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

### 1.4 文档不一致 —— 旧的已关闭，新增 7 处待修（6 处文档之间 + 1 处文档与实现，交给 Claude Code）

**已关闭（架构师 10-11 复验）**：`docs/ARCHITECTURE.md` §3 目录树原先那两处与 D5 的矛盾已消失——
`web/snapshot/` 在 ARCHITECTURE 全文中不存在，`export_content.py` 的注释已是「v0.5 定：把内容导出为后端可读结构（前端不再用它做快照）」。
（判据是语义：没有任何一处把「独立的运行时快照文件」当成在用的做法，而不是字面 0 命中。）

**新增（共 3 处，v0.5-A 开工前修）**：

1. `docs/CLAUDE-CODE-PLAYBOOK.md` §5.4 的 v0.5-B 第 3 条仍写「失败时回退到 **v0.3 生成的内置快照**」，
   与 `docs/ARCHITECTURE.md`（「产物本身就是降级快照，前端不需要额外的运行时快照文件」）不一致。
   应改为：「失败时回退到**构建产物内已有的内容数据**（v0.3 的 content 模块，构建期内联；按 D5 不生成任何独立快照文件）」。
2. `docs/ARCHITECTURE.md` §3 目录树的 `api/scripts/export_content.py  # v0.5 定：把内容导出为后端可读结构`
   与 `docs/CLAUDE-CODE-PLAYBOOK.md` §5.4-A 第 3 条「数据源：直接解析 `web/content/**`」是**两个不同设计**。
   架构师建议用「直接解析」——理由和 `web/build/content-plugin.js` 反对写中间 JSON 完全一样：多一份会过期、会忘了重新生成的产物。
   应把 ARCHITECTURE 那一行删掉，或改成「不做：后端直接读 `web/content`，不生成中间 JSON」。见 D26。
   同类遗留：`api/README.md` 第 27 行 `scripts/  # 生成向量索引、导出内容快照` 里的「导出内容快照」也是同一个废弃概念，按 D26 一并去掉。
3. `docs/CLAUDE-CODE-PLAYBOOK.md` §5.4-A 第 3 条的「**复用 v0.3 的解析逻辑，不要重复实现**」字面做不到：
   v0.3 的解析器是 JS（`web/build/content-schema.js`），Python 进程 import 不了。
   应改成「**复用同一套规则与同一份内容**：Python 侧按 `content-schema.js` 的字段表和排序规则重新实现，并用契约测试证明两侧一致」。
4. `docs/ROADMAP.md` §5「范围」只列了 6 个端点（`/health`、`/profile`、`/projects`、`/notes`、`/notes/{slug}`、`/now`），
   漏了 `/projects/{slug}`；`ARCHITECTURE` §6 与 PLAYBOOK §5.4-A 都是 **7 个**。以 ARCHITECTURE 为准，ROADMAP 那行补齐或注明。
5. `docs/ARCHITECTURE.md` §7 的表注释写着 `ip_hash ... -- SHA256(ip + 每日盐)`，与**已定决策 D10**
   （`SHA256(IP + IP_HASH_SALT + 日期前缀)`，**不每日换盐**）直接矛盾。实施者照 ARCHITECTURE 写就会每天换盐，
   把「同一 IP 的跨天识别」和限流窗口全打乱。以 D10 为准，§7 那行注释必须改。
6. `docs/CLAUDE-CODE-PLAYBOOK.md` §5.6 的 v0.7-A 验收写「超过日限额返回 **503/429**」，没定死。
   按 `ARCHITECTURE` §8 应区分：**单 IP 超限 → 429**，**全站日上限 / `AI_ENABLED=false` / 无 key → 503**。
   v0.7-B 对这两种状态的文案不同（前者可等明天，后者是「暂时不可用 / 直接发邮件」），必须写清，否则前端只能瞎猜。
7. **文档与实现不一致（不是文档之间的）**：`docs/ARCHITECTURE.md` §4 的「降级契约（**必须严格实现**）」写着
   「图片加载失败 → `onerror` 回退到占位图，不出现破图」，但 `web/src` 全文 **0 处 `onerror`**：
   `web/src/ui/projects.js:74` 的 `coverPicture()` 只处理了 `<source>` 404 的静默回退，没处理 `<img>` 自身失败；
   `web/public/images/` 里也没有占位图。目前 4 张项目卡都没有 `cover:`，所以这条从未被触发 —— 一旦加封面就会暴露。
   要么补实现（`onerror` + 一张占位图），要么把这条从 §4 的降级契约里删掉/改写。建议归到 v0.8。

### 1.5 现在要做的事：v0.5-A（发放指令 + 交付后核验清单）

**发给实施者的指令** = `docs/CLAUDE-CODE-PLAYBOOK.md` §5.4 第 1 块（v0.5-A），前面加两条前置：

1. **第 0 条（v0.4 遗留）**：重新生成 `web/public/resume.pdf`，第 1 页首行 tagline 改成与 `web/content/profile.json` 一致的
   「专科在读（大一），在学后端与 AI，想做出自己的第一个作品。」；并写明生成方法（保持可重复），下次改文案不再漂移。
2. **第 0.5 条（文档，1 个独立 `docs:` 提交）**：修 §1.4 列的 4 处——(a) PLAYBOOK §5.4-B 的「内置快照」措辞；(b) ARCHITECTURE §3 的 `export_content.py` 与「直接解析」对齐（按 D26 结论）；(c) PLAYBOOK §5.4-A「复用 v0.3 解析逻辑」改成「复用同一套规则与内容」；(d) ROADMAP §5 的范围补齐 `/projects/{slug}`。另外 §1.6 的密钥判据可顺带改成语义版（不依赖 D27）。

**架构师核验清单**（拿到交付后逐条做，只读、拿证据）：

- 本地 `uvicorn` 起服务；`/docs` 能打开且 7 个端点齐全（`GET /health`、`/profile`、`/projects`、`/projects/{slug}`、`/notes`、`/notes/{slug}`、`/now`）
- 7 个端点各 `curl` 一次并贴响应；`?tag=`/`?status=` 过滤真实生效；`limit` 越界行为明确（422 或夹到 100，二选一写清）
- 伪造 `Origin` 被拒；白名单来源返回 `access-control-allow-origin`
- 构造一次 500：响应体是 `{ error: { code, message, request_id } }` 且**无堆栈**；响应头有 `X-Request-Id`；日志里同 id 可关联
- 仓库无密钥：要求给出真实 `grep` 命令与输出（不是「我检查过了」）
- `pytest` 全绿：贴真实输出与**退出码**；契约测试 2–3 个（至少覆盖过滤、404、分页边界）
- 数据源与解析：直接读 `web/content/**`（**不是**读 `export_content.py` 生成的中间 JSON）；Python 规则与 `content-schema.js` 一致，且有一致性测试（见本节的「解析复用」小节）
- `[ ]` 每条都要有对应的原始输出；任何一条拿不到证据 → 记「未通过」，不记「应该没问题」

**关于「解析复用」的可行做法（架构师先定，避免实施者卡住）**：
- v0.3 的校验器是 JS、后端是 Python → **代码没法复用，能复用的是规则与内容**。Python 侧照 `web/build/content-schema.js` 实现：
  - projects 必填 `title/status/date/tags/summary/order`，可选 `repo/live/cover/featured`；`status ∈ done|wip|planned`；
    日期是 `YYYY-MM-DD` 且必须是真实存在的日期；未知字段一律报错（不是 warning）。
  - notes 必填 `title/date/tags/summary`，可选 `draft`；**`draft: true` 的笔记不得出现在任何 API 结果里**（与构建期排除一致）。
  - 排序：projects = `order` 升序 → `date` 降序 → `title` 升序；notes = `date` 降序 → `title` 升序兜底。
- **一致性必须由测试保证，不能靠自觉**：契约测试对同一份 `web/content/**` 断言 Python 侧的 slug 集合与顺序、关键字段值与 JS 侧一致
  （可以先用 Node 跑一次 `content-schema.js`，把期望值固化成 fixture）。
- **路径要可配置**：环境变量 `CONTENT_DIR`，默认指向仓库根的 `web/content`（从 `api/` 起服务时即 `../web/content`）；
  Dockerfile 以**仓库根为构建上下文**把 `web/content` 复制进镜像。这一条必须写进 `api/README.md`。

### 1.6 v1.0 发布检查清单（ROADMAP §8）里的一个空洞 + 一个坏判据

**空洞：404 页没有任何版本负责建它。**
- `docs/ROADMAP.md` §8 第 507 行要求「404 页面存在且能回到首页」，§7 的 v0.9 全流程演练也要「检查 404 页」。
- 但 PLAYBOOK 的逐版指令块里**没有任何一块**产出它；`web/public/` 只有 `resume.pdf` 与 `images/og.png`，
  构建产物 7 个文件里也没有 `404.html`。
- 后果：v0.9「按 §8 逐条自检」一定在这条上失败，而那时才发现就晚了。
- 建议：归到 **v0.8**（v0.9 只做自检，不该在自检里补功能）；实现 = `web/public/404.html`（Vite 会复制到 dist 根），
  一个**不依赖 JS**也能点回首页的最小页面，并写进 v0.8 的验收。见 D27。

**坏判据（同类错误第三次）：密钥检查写成字面 grep。**
- `docs/ROADMAP.md` §5 第 306 行 `git log -p | grep -i key`、§8 第 516 行
  `git log -p | grep -iE "api[_-]?key|secret|token"`，以及 `docs/CLAUDE-CODE-PLAYBOOK.md` §6 第 434 行同款命令。
- 这几条**必然命中我们自己的正当文本**：`.env.example` 的占位符（`DELETE_TOKEN=` 之类）、ADR-010 与 v0.6 里的
  「密钥」「Bearer token」措辞、文档里所有含 `key` 子串的英文词。
- 后果：v1.0 的「安全」门禁要么误报失败，要么逼人删掉正当文档 —— 比没有检查更糟。
- 应改成语义判据：「仓库与 Git 历史中不存在**真实可用**的密钥：`.env` 未入库（`git log --all -- .env` 为空）、
  `.env.example` 全部是占位符、对已知密钥形态（`sk-…`、`AKIA…`、长 base64/hex）扫描无命中；任何命中都逐条解释。」

### 1.7 v0.5-B 指令（草稿，等 D24 拍板后发放）

> 前提：v0.5-A 已核验通过；D24 选定部署方案。下面按「**Render 单点**」写（依据 §7.2）。
> 发放当天**重跑一次 ADR-005 六问**（§7.4 有官方链接与 10-11 的结论），别直接抄这页。

```text
【版本】v0.5-B
【目标】把 v0.5-A 的 API 部署成公网服务，并让前端真正消费它，同时在它失效时完整降级。
【范围】
1) 按 §7.2 的六问结论在 Render 建 Web Service（Hobby workspace + Free 实例）：Dockerfile 部署、健康检查路径 /api/v1/health、push 即部署。
   注意：构建上下文必须是【仓库根】（Dockerfile 放 api/Dockerfile，Render 的 Root Directory 设仓库根），否则容器里没有 web/content/。
2) 所有配置走平台环境变量（CORS 白名单、ENV、CONTENT_DIR）；api/.env.example 同步；仓库里不得出现任何真实值。
3) 前端 web/src/lib/api.js：统一请求封装（3s 超时、只重试 1 次、错误归一化），失败时【回退到构建产物内已有的内容数据】
   （v0.3 的 content 模块，构建期内联；按 D5 不生成任何独立快照文件），页脚显示「实时数据不可用」小字，控制台【只打 warning】（不能有 error）。
4) 冷启动体验：首屏照旧用构建期内容【立即】渲染，后端数据到达后再替换；【不要让首屏等 API】，也不要出现空白转圈。
5) 探活（可选）：给出免费定时探活的具体操作步骤（每 5 分钟打一次 /api/v1/health），并说明代价：
   常驻约 720–744 实例小时/月，而 Render 免费额度是 750/月/workspace —— 只有它是唯一的免费 Web Service 时才装得下。不想占额度就接受休眠。
6) 部署成功后，把 api-service 项目卡的 status 改成 done、补 live: 与 repo:（文案由用户确认，不要擅改）。
【不做】不接数据库、不做写接口、不动 v0.6 范围；不为部署引入任何付费项；不把密钥写进任何配置文件。
【验收标准】
- [ ] 公网 https://<host>/docs 可访问，7 个端点齐全
- [ ] https://<host>/api/v1/health 返回 200 且含依赖状态
- [ ] 打开站点，Network 面板能看到前端确实请求了后端；且首屏不依赖该请求
- [ ] 硬验收：三种故障演练全部通过（见下）
- [ ] CORS：白名单来源正常、伪造 Origin 被拒（各 curl 一次）
- [ ] 仓库 grep 不到任何密钥/真实值（给出命令与原始输出）
- [ ] 首屏 JS 增量用 zlib.gzipSync 量过并写进 BASELINE；若越过 80 KB 懒加载触发线，按 D19 改造
【三种降级演练 —— 架构师定义，原文档没有】
- 演练 1 · 服务不存在：在 Render 控制台 Suspend（或把前端 API base 指到坏地址），刷新页面。
  通过 = 站点完整可读、项目/笔记仍在、角落显示「实时数据不可用」、控制台只有 warning。
- 演练 2 · 网络不可达：DevTools → Network → Offline（或断网）后刷新。
  通过 = 不白屏、不无限转圈；≤3 秒内降级到构建期内置内容。
- 演练 3 · 慢或坏响应：让后端人为变慢（临时 sleep 5）或返回 5xx。
  通过 = 超时后降级、提示一致、只重试 1 次（Network 里请求数不放大）；唤醒过程中显示骨架而不是卡死。
【验证方式】每个演练各贴：操作步骤 + Network 要点 + 页面状态 + 控制台输出（证明只有 warning）。
另贴：/docs 与 /health 的 curl -i 输出、CORS 两次 curl、密钥扫描命令与输出。
【输出要求】变更摘要 / 验证结果（含三演练原始输出）/ 我在 Render 上要手点的步骤清单 / 未完成项 / 下一步建议。
```

### 1.8 v0.6 / v0.7 的隐藏依赖与未定项（提前记，免得到时才发现）

**① v0.7 依赖 v0.6 的数据库 —— 而 v0.6 是砍单序第一位。**
- `ARCHITECTURE` §7 定义了 `ask_logs` 表，§8 第 8 步与 PLAYBOOK §5.6 第 6 条都要写 `ask_logs` 并出统计脚本。
- 但 ROADMAP §6 的砍单顺序里 **v0.6（数据库）第一个被砍**。一旦砍掉，`ask_logs` 就没有落点。
- 必须在 v0.7 开工前定：要么 v0.7 在**没有 `DATABASE_URL`** 时把 `ask_logs` 退化成结构化日志（stdout）+ 进程内计数，
  要么 v0.6 只砍留言板 UI/端点、**保留 DB 骨架与 Alembic**。两条路对应的排期与代码不同（与 D25 联动）。

**② `index.json` 放哪里、什么时候生成，没定。**
- `ARCHITECTURE` §8 与 PLAYBOOK §5.6 都说由 `api/scripts/build_index.py` 生成 `api/app/data/index.json`，meta 含 `built_at`；
  但没说它是**提交进仓库**还是**CI/部署时生成**。这决定两件事：
  - 提交进仓库 → 每次重建都改 `built_at`，仓库会持续抖动，且可能相对 `web/content` 过期；
  - 部署时生成 → **嵌入模型的 key 必须出现在部署/CI 环境**（多一个密钥面），但索引永远与内容同步。
- 这个选择直接影响 `api-ci` 要不要注入密钥、Dockerfile 要不要带索引。见 **D28**。

**③ D9（20 条评测集）没进 v0.7-A 的验收标准。**
- `ARCHITECTURE` §8 明确要求「维护 20 条评测问题（含 5 条应拒答的），每次改 Prompt/模型后跑一遍，记录到 `docs/AI-EVAL.md`」，
  HANDOFF 的 D9 也是这么登记的；但 PLAYBOOK §5.6 的验收清单里**没有这一条**，实施者不会主动做。
- 应把「跑一遍 20 条评测并把命中率/引用正确率写进 `docs/AI-EVAL.md`」补进 v0.7-A 验收。

### 1.9 已批准的文档对齐清单（用户 2026-10-11 授权架构师代决；由 Claude Code 执行）

> 架构师不碰 ROADMAP / ARCHITECTURE / PLAYBOOK 三份权威文档，只在这里给逐条改法。
> **A 组是 v0.5-A 开工前必须做完的**；B/C/D 组到对应版本再动，**不要一次全改**（避免一大坨 churn 挡住建档节奏）。

**A 组 —— v0.5-A 开工前（1 个 `docs:` 提交）**
- [ ] PLAYBOOK §5.4-B 第 3 条：「失败时回退到 v0.3 生成的内置快照」→「失败时回退到构建产物内已有的内容数据（v0.3 的 content 模块，构建期内联；按 D5 不生成独立快照文件）」
- [ ] PLAYBOOK §5.4-A 第 3 条：「复用 v0.3 的解析逻辑，不要重复实现」→「复用同一套规则与同一份内容；Python 侧按 `web/build/content-schema.js` 的字段表与排序规则重新实现，并用契约测试证明两侧一致」
- [ ] ARCHITECTURE §3：删掉 `api/scripts/export_content.py` 那一行（D26 = 直接解析，不需要导出脚本）
- [ ] `api/README.md`：目录树里的「导出内容快照」去掉，`scripts/` 只留「生成向量索引」
- [ ] ROADMAP §5 的端点清单补上 `/projects/{slug}`（凑齐 7 个）
- [ ] BASELINE：v0.4-A 表里的 `index-rhHOB_2q.js` 换成 `index-BIq1GmEs.js`，首屏合计 60.22 KB
- [ ] **（git 操作，不是文档）** 重打 tag：`git tag -f v0.4.0 509b785` → `git push -f origin v0.4.0`（只移动 tag 引用，**不改任何提交**）

**B 组 —— v0.5-B 前**
- [ ] ARCHITECTURE ADR-005 候选表：HF Spaces（Docker/Gradio 需付费计划）与 Fly.io（2024-10-07 起不再对新用户免费）标为不可用；写明「Render 是唯一免费选项，其余靠前端降级兜底」（D24）
- [ ] ROADMAP §5 的风险段同步这条结论

**C 组 —— v0.6 / v0.7 前**
- [ ] ARCHITECTURE §7：`ip_hash` 注释从「每日盐」改为与 D10 一致（`SHA256(IP + IP_HASH_SALT + 日期前缀)`，**盐不每日轮换**）
- [ ] PLAYBOOK §5.6 验收：把「503/429」拆开 —— **单 IP 超限 → 429**；**全站日上限 / `AI_ENABLED=false` / 无 key → 503**
- [ ] PLAYBOOK §5.6 验收补一条：跑 20 条评测集（含 5 条应拒答）并把命中率/引用正确率写进 `docs/AI-EVAL.md`（D9）
- [ ] ARCHITECTURE §7/§8 与 PLAYBOOK §5.6：写明 `index.json` **提交进仓库**、CI 用 `content_hash` 校验它与 `web/content` 同步（不一致就红）；`ask_logs` 在无 `DATABASE_URL` 时退化为结构化 stdout 日志 + 进程内计数（D28）

**D 组 —— v0.8 / v0.9 前**
- [ ] v0.8 块加入 404 页：`web/public/404.html`，不依赖 JS 也能回首页（D27）
- [ ] ARCHITECTURE §4 的图片降级契约改为「`onerror` 时隐藏封面，不出现破图」，并在 `web/src/ui/projects.js` 实现（**不新增占位图资产**）
- [ ] ROADMAP §5/§8 与 PLAYBOOK §6 的三处密钥检查：字面 grep 换成语义判据（`.env` 未入库 + `.env.example` 全占位 + 已知密钥形态扫描 + 命中逐条解释）

---

## 2. 待办队列（v0.2-D → v1.0）

| 版本 | 要点 | 关键校准点 |
| :-- | :-- | :-- |
| ~~v0.2-D~~ | ✅ 已完成（见 §0 / §4） | — |
| ~~v0.3-A~~ | ✅ 已完成并部署（`fb9d97b`；run `38114432920` success） | 导航锚点人工点检已通过（见 §4） |
| ~~v0.3-B~~ | ✅ 已完成（`721dcdb` / `626e4ae`；tag `v0.3.0`） | 三个子项见 §1.3；**不做** `web/snapshot/` 与 `export_content.py`（D5） |
| ~~v0.4-A~~ | ✅ 已实现、已核验（见 §0 / §4）；tag `v0.4.0` → `e6ce078`（位置存疑，见 §0） | 主题防闪烁走 head 内联脚本；筛选参数挂 `#/projects` 而非 `#projects` 锚点（router.js 有说明）；砍单序里 **PDF 与 OG 都没砍**（本机 Chrome 无头截图/打印即可生成） |
| **v0.5-A** | FastAPI 只读 API（`/api/v1`）+ 统一错误结构 + request-id + CORS 白名单 | 两侧 schema 一致性测试；不接数据库。**发放的指令** = PLAYBOOK §5.4 第 1 块 + §1.5 的两条前置；核验清单见 §1.5 |
| v0.5-B | 部署到免费 PaaS + **前端降级硬验收** | 六问结果见 **§7**（实测：HF Docker 与 Fly 已不再免费，只剩 Render）；阶梯见 D24；**可直接发放的指令草稿见 §1.7**（含架构师定义的三种降级演练） |
| v0.6-A | SQLite/Postgres + 留言板（**整版可砍**） | 限流放进程内；`ip_hash` **必须按 D10（不每日换盐）**，ARCHITECTURE §7 的「每日盐」注释待改（§1.4-5）；不留生产后门 |
| v0.7-A / B | RAG：离线索引 + `POST /api/v1/ask`(SSE) + 前端浮层 | 阈值用 20 条评测集标定（**要补进 v0.7-A 验收**）；SSE 平台超时→非流式；浮层懒加载；**`ask_logs` 与 `index.json` 的依赖见 §1.8 / D28** |
| v0.8-A | pytest/Vitest + CI **按路径过滤** + 安全扫描 + 文档（**+ 404 页，待 D27**） | 门禁在分支/PR 上验证，别污染 main |
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
| D5 | 不做 `web/snapshot/`、不做 `export_content.py`（推迟到 v0.5-A） | ✅ 全站文档已对齐（架构师 10-11 复验：ARCHITECTURE 无 `web/snapshot/`，`export_content.py` 注释已改）；**仅剩 PLAYBOOK §5.4-B 的措辞待修（见 §1.4）** | PLAYBOOK §5.2-B（已改写）/ ARCHITECTURE §3（已同步） |
| D6 | 代码高亮选 highlight.js（core + 手动注册语言），排除 shiki | ✅ 已落地（v0.3-A，5 种语言） | PLAYBOOK §5.2-A / 代码注释 |
| D7 | CI 按路径过滤（web-ci / api-ci 各管各的） | ⏳ v0.8-A | PLAYBOOK §5.7 |
| D8 | SSE 平台超时 → 降级为一次性返回 | ⏳ v0.7-A | ARCHITECTURE §8 |
| D9 | 相似度阈值用 20 条评测集标定 | ⏳ v0.7-A | ARCHITECTURE §8 + `docs/AI-EVAL.md` |
| D10 | `ip_hash = SHA256(IP + IP_HASH_SALT + 日期前缀)`，不每日换盐 | ⏳ v0.6-A | ARCHITECTURE §7 |
| D11 | v0.5 部署降级阶梯；三者都不可用则不虚报 done | ⏳ v0.5-B | ADR-005 / ROADMAP §5 |
| D12 | 项目卡内容修正（Node.js→FastAPI、笔记卡合并、status 诚实） | ✅ 已落地（v0.2-C） | `web/content/projects/*.md` |
| D13 | `#/notes` 暂用纯文本，不新增 front-matter 字段 | ✅ **已定（关闭）**：保持纯文本，不加字段；v0.8 有测试后再评估 | — |
| D14 | `profile.json` 字段面封口：**8 必填 + 5 可选**（v0.4-A 起 `education` 是第 5 个可选） | ✅ 已落地；**台账原先写的「4 可选」已更正**（ARCHITECTURE §5 与 `content-schema.js` 都是 5） | ARCHITECTURE §5 / `web/build/content-schema.js` |
| D15 | 体积统一用 `zlib.gzipSync` 口径 | ✅ 已落地（v0.2-D 写入，v0.3-A 沿用） | `docs/BASELINE.md` |
| D16 | Vite 8 插件用 `hotUpdate`（`handleHotUpdate` 已弃用） | ✅ 已落地 | 代码注释 |
| D17 | hash 路由**只接管 `#/` 开头的 hash**；`#about` 等锚点仍走原生滚动 | ✅ 已落地（v0.3-A） | PLAYBOOK §5.2-A / 代码注释 |
| D18 | 构建产物**禁止**写 lastmod / 构建时间（保住可复现构建） | ✅ 已落地（sitemap/robots） | 代码注释 |
| D19 | 首屏体积阈值：≤80KB gzip 保持静态 import，>80KB 才懒加载笔记渲染器 | ✅ 已落地（v0.4-A 实测 48.14KB，仍未懒加载） | `docs/BASELINE.md` §2 |
| D20 | 项目筛选参数挂在 `#/projects` 路由上，**不**给首页 `#projects` 锚点挂查询串 | ✅ 已落地（v0.4-A，`17c0995`） | 代码注释 `src/router.js` / 提交信息 |
| D21 | 简历的「教育」只收 `profile.education` 一个可选字符串，不做 `education[]` 数组 | ✅ 已落地（v0.4-A，`9cdfb9f`） | ARCHITECTURE §5 / README |
| D22 | 站内资源路径（如项目封面）一律过 `import.meta.env.BASE_URL`，不直接用 content 里的 `/…` | ✅ 已落地（v0.4-A，`6ee4859`） | 代码注释 `src/ui/projects.js` |
| D23 | tag `v0.4.0` 的位置：重打到 `509b785`，还是接受 `e6ce078`（把文案统一算作 v0.5 前置） | ✅ **已定（架构师代决）**：**重打到 `509b785`** —— tag 就该含该版本的最终文案，且 `509b785` 的线上产物已核验 7/7 逐字节一致；只移动 tag 引用，不改任何提交 | §1.9 A 组（git 操作） |
| D24 | ADR-005 降级阶梯只剩 Render（HF Docker 与 Fly 已不免费）：接受「Render 单点 + 后端离线走前端降级」，还是引入绑卡备选（Cloud Run / Oracle Always Free） | ✅ **已定（架构师代决）**：**接受 Render 单点 + 前端降级**。不引入绑卡平台（守住「0 元、不为部署引入付费项」）；真出问题就长期走「后端离线模式」——这正是 ADR-005 的硬约束。部署当天仍要重跑六问 | §1.9 B 组 |
| D25 | v0.6 线上数据库：Render 免费 Postgres 30 天过期 → 付费升级 / 换持久化方案 / 砍掉 v0.6 | ⏳ 到 v0.6 前决定（依据 §7.3） | ARCHITECTURE ADR-007 / ROADMAP §6 |
| D26 | v0.5 后端数据源：直接解析 `web/content/**`（架构师推荐），还是走 `export_content.py` 中间 JSON | ✅ **已定（架构师代决）**：**直接解析 `web/content/**`**，不生成中间 JSON。理由与 `content-plugin.js` 拒绝写中间产物一致：多一份会过期、会忘生成的产物。`export_content.py` 随之取消 | §1.9 A 组 |
| D27 | v1.0 检查清单要求的 **404 页**由哪个版本做、怎么做 | ✅ **已定（架构师代决）**：归 **v0.8**，实现为 `web/public/404.html`（Vite 复制到 dist 根），**不依赖 JS** 也能点回首页 | §1.9 D 组 |
| D28 | v0.7 的两项基础设施：`index.json` 提交进仓库还是部署时生成（牵涉 key 面）；若 v0.6 被砍，`ask_logs` 的退路（stdout 日志 / 保留 DB 骨架） | ✅ **已定（架构师代决）**：① `index.json` **提交进仓库**（嵌入模型 key 只在本地 `.env`，不进 CI/部署环境），**CI 用 `content_hash` 校验它与 `web/content` 同步**，不一致就红；② 无 `DATABASE_URL` 时 `ask_logs` **退化为结构化 stdout 日志 + 进程内计数**，统计脚本读日志——这样 v0.6 仍可整版砍掉 | §1.9 C 组 |

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
| 10-11 | **v0.4-A 部署（推送后）** | ✅ 通过（两项人工待做） | 架构师实测：线上 7/7 文件与本地 `web/dist` 逐字节一致（index.html `4ad87bf7`、JS `index-rhHOB_2q.js` 133.3KB、CSS `index-zHbQBzuy.css` 18.6KB、`resume.pdf` 145.2KB、`images/og.png` 177.3KB、sitemap、robots）；无 JS 降级四项仍在；线上 HTML 含 `#/projects`、`#/resume`、`og:title`、`og:image`；BASELINE 已有 v0.4-A 复跑表（100/100/100/100，TBT 80ms 如实记录） |
| 10-11 | **v0.4 文案统一 + OG（线上，第二次核验）** | ✅ 通过 | `gh api`：run #9（`509b785`）success；deployment `6992598810` @ `509b785`；Pages `status=built`、`build_type=workflow`。架构师 Node fetch 线上 7/7 与本地 `web/dist` **逐字节一致**（`index.html` 20445B `95049652`、JS `index-BIq1GmEs.js` 136524B `48ba5299`、CSS `index-zHbQBzuy.css` 19047B `ece0fb70`、`images/og.png` 184011B `5efd89e3`、`resume.pdf` 148716B `00925715`、robots 94B `879a784a`、sitemap 487B `a45cf6ff`） |
| 10-11 | **`resume.pdf` 旧文案（硬证据）** | ⬜ 未修（已列 §1.5 第 0 条） | 架构师用 PDF 的 ToUnicode CMap 解码正文：第 1 页 tagline 仍是「大一在读，在学后端与 AI，想做出自己的第一个作品。」，与 `profile.json` 的「专科在读（大一）」不一致；该文件最后一次改动是 `9cdfb9f`，早于 `a46707e` |
| 10-11 | **tag `v0.4.0` 位置** | ⚠️ 存疑，待用户决定（D23） | `gh api .../tags`：远端 `v0.4.0` → `e6ce078`（15:41:17 的提交），其后 2 分钟又有 `a46707e`（15:43:23 文案统一）与 `509b785`（OG 重生成）→ tag 未含最终文案。全部 tag 均为轻量 tag（`%(objecttype)=commit`） |
| 10-11 | **免费 PaaS 现查（ADR-005 六问）** | ✅ 完成；**结论改变了候选表** | 官方文档实测：Render 仍免费（15 分钟休眠、~1 分钟唤醒、750 实例小时/月、Hobby 出网 5 GB/月、免费 Postgres 30 天过期、免费无持久盘）；HF Spaces 创建 Docker Space 需付费计划；Fly 自 2024-10-07 起不再对新用户提供（只 2 VM 小时/7 天试用）。详见 §7 |
| 10-11 | **内容模型 / 降级契约对照实现** | ⚠️ 1 处契约未实现；1 处台账笔误已更正 | ARCHITECTURE §5 与 `content-schema.js` 的字段/枚举/排序**完全一致**（projects 6 必填 + 4 可选、notes 4 必填 + 1 可选、profile 8 必填 + 5 可选；`cover` 的「以 / 开头」约定与 `projects.js` 的 `withBase()` 也对得上）。但 §4「图片加载失败 → `onerror` 回退占位图」在 `web/src` 无实现（0 处 `onerror`、无占位图）；D14 原写「4 可选」应为 5 |
| 10-11 | **v0.6 / v0.7 契约复查** | ⚠️ 2 处矛盾 + 3 项未定 | ① ARCHITECTURE §7 的 `ip_hash`「每日盐」与 D10（不每日换盐）矛盾；② PLAYBOOK §5.6 验收的「503/429」没区分单 IP 与全站；③ v0.7 的 `ask_logs` 依赖被砍单序第一位的 v0.6；④ `index.json` 的存放/生成时机未定；⑤ D9 的 20 条评测集没进 v0.7-A 验收。见 §1.4-5/6 与 §1.8，登记 D28 |
| 10-11 | **体积复核（文案统一后的线上产物）** | ✅ 预算内 | `zlib.gzipSync`：HTML 7.19 KB + JS 48.10 KB（`index-BIq1GmEs.js`，136524 B）+ CSS 4.93 KB = **60.22 KB**（BASELINE 记的 v0.4-A 是 60.28 KB，差异来自文案统一）。JS 48.10 KB = 150 KB 预算的 32%、80 KB 懒加载线的 60%。注意：BASELINE 表里的 `index-rhHOB_2q.js` 已被 `index-BIq1GmEs.js` 取代，文件名待刷新 |
| 10-11 | **内容轨盘点（v1.0 门槛）** | ⚠️ 两项均不足 | 「已完成且带链接」的项目 **1/≥3**（`data-toolkit` 标 done 但无 `repo`/`live`）；笔记 **1/≥5**。补齐路径见 §8 |
| 10-11 | **v1.0 发布检查清单复查（ROADMAP §8）** | ⚠️ 1 空洞 + 1 坏判据 | ① 404 页无任何版本负责（`web/public/` 与 dist 均无 `404.html`）；② 密钥检查是三处字面 grep（ROADMAP §5 第 306 行 / §8 第 516 行、PLAYBOOK §6 第 434 行），必然命中 `.env.example` 占位符与文档里的 key/token 字样。已记 §1.6，登记 D27 |
| 10-11 | **架构/文档一致性复查（v0.5-A 开工前）** | ⚠️ 共 3 处待修 | ① PLAYBOOK §5.4-B「内置快照」措辞；② ARCHITECTURE §3 的 `export_content.py` 与 PLAYBOOK §5.4-A「直接解析」是两种设计；③ PLAYBOOK §5.4-A「复用 v0.3 的解析逻辑」字面不可行（JS 解析器 vs Python 后端）。可行做法与规则清单已写进 §1.4/§1.5，并登记 D26 |
| 10-11 | **§1.4 文档不一致复验** | ✅ 旧项已关闭；⬜ 新增 3 项待修 | ARCHITECTURE 全文无 `web/snapshot/`（语义：无人把独立快照文件当在用做法）；`export_content.py` 注释已是「v0.5 定…前端不再用它做快照」。新发现：PLAYBOOK §5.4-B 第 3 条仍写「回退到 v0.3 生成的内置快照」，与 ARCHITECTURE「产物本身就是降级快照」矛盾 |

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
- **huggingface.co 本机不可直连**（`web_fetch` 报 non-public IP）：读 HF 官方文档可走 jsDelivr 镜像
  `https://cdn.jsdelivr.net/gh/huggingface/hub-docs@main/<path>`；Mintlify 系文档站（Render / Fly）加 `.md` 后缀可直取纯文本。
- **无 JS 降级**：姓名 / 定位 / 邮箱 / GitHub 必须留在静态 HTML。
- **可回滚锚点**：远端 tag `v0.1.0` → `859a713` / `v0.2-A` → `3c63ceb` / `v0.2-B` → `a2e7f18` / `v0.2.0` → `e0f4fc8` /
  `v0.3.0` → `626e4ae` / `v0.4.0` → **`509b785`**（D23 已定，待执行；旧指向 `e6ce078` 作废）。
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

---

## 7. 免费 PaaS 现查结果（ADR-005 六问，2026-10-11 实测）

> 用途：v0.5-B 部署前的强制「现查」。下面的数字都来自**官方文档原文**（2026-10-11 本机抓取），不是记忆。
> 落地当天必须再核一次（这类条款变得比排期快）。第三方综述只当线索，不当依据。

### 7.1 结论：ADR-005 的「降级阶梯 Render→HF Spaces→Fly」已断两条

| 候选（ADR-005 原表） | 现在还能免费吗 | 证据 |
| :-- | :-- | :-- |
| **Render 免费 Web Service** | ✅ 仍免费，无需信用卡 | 官方：Hobby workspace `$0/month` + Free compute `$0/month`（0.1 CPU / 512 MB）；官方文章称 no credit card required（注册页再确认） |
| **Hugging Face Spaces（Docker）** | ❌ **创建 Docker/Gradio Space 现在要付费计划** | 官方 hub-docs：「creating a Space that runs on compute (Gradio or Docker) requires a paid plan」（个人版需 PRO）；免费账号只留 2 个 ZeroGPU 的 **Gradio** Space |
| **Fly.io** | ❌ 2024-10-07 起不再向新用户提供 | 官方：「Fly.io no longer offers plans to new customers」；新用户只有 **2 VM 小时或 7 天**试用（先到者为准），试用机 5 分钟自动停 |
| Cloudflare Workers | ❌ 与 ADR-004（Python/FastAPI）冲突 | ADR-005 已注明 |

### 7.2 Render 的六问答案（v0.5-B 直接用）

1. **套餐在不在 / 要不要卡**：在。Hobby `$0` + Free compute `$0`；免费 Web Service 与静态站都计 workspace 的出网带宽与构建分钟。官方文章称无需信用卡；注册页再确认一次。
2. **休眠**：连续 **15 分钟**无入站流量即 spin down（含 WebSocket）；下一个请求自动唤醒，**约 1 分钟**，期间浏览器看到加载页。休眠时 `/robots.txt` 自动返回 disallow-all，且**不会**触发唤醒。
3. **额度**：每 workspace 每月 **750 free instance hours**（休眠不计、不结转；用尽 → 免费服务停到下月初）。Hobby 出网带宽 **5 GB/月**（超出 $0.15/GB；没绑卡就停服）。构建分钟也有限额（文档未给具体数，超限则新构建被停）。
   - 算术：一个服务 7×24 常驻 ≈ 720–744 小时/月 → **刚好卡在 750 以内**，但前提是 workspace 里**只有它一个**免费 Web Service。想省额度就别常驻：让它睡，前端上骨架屏。
4. **域名 / HTTPS / Docker**：支持自定义域名与托管 TLS；支持 Dockerfile 部署。
5. **免费数据库**：Free Render Postgres 1 GB，**创建满 30 天过期**，再给 14 天宽限，之后**连同数据删除**；每 workspace 限一个。Free Key Value 是**纯内存**（重启即丢）。**免费实例没有持久磁盘** → 本地 SQLite 会在重部署/重启/休眠后丢失。
6. **构建时长 / 内存**：Free 实例 0.1 CPU / 512 MB RAM。512 MB 装 Python 依赖是经典翻车点 → `requirements.txt` 要瘦、版本要钉。
- **额外风险**：Render 可因「服务主动发起的出网流量异常高」暂停免费服务（v0.7 调 LLM 时留意）；免费服务随时可能被重启。

### 7.3 由此产生的待决项 / 风险

- **D24（待用户决定）**：降级阶梯只剩 Render 一条。要么接受「Render 单点 + 真出问题时长期走前端降级（后端离线模式）」，要么引入需要绑卡的备选（Google Cloud Run 有 always-free 额度、Oracle Always Free），要么去评估第三方综述提到、但**未经官方核实**的 Zeabur / Back4App / SnapDeploy。建议第一种——与 ADR-005「三者都不可用则不虚报 done」一致，且前端降级本来就是硬约束。
- **v0.6 的免费 Postgres 不持久**：30 天过期意味着留言板每月清空。ADR-007 的「线上免费 Postgres」需要重新决定：付费升级 / 换持久化方案 / 直接砍 v0.6（它本来就是砍单序第一位）。到 v0.6 前必须决定。
- **v0.5-B 的前端降级硬验收因此更关键**：它是后端随时消失时唯一的兜底，不能只当作一条普通验收。

### 7.4 来源（2026-10-11 抓取）

- Render：<https://render.com/docs/free.md>、<https://render.com/pricing.md>、<https://render.com/docs/outbound-bandwidth.md>
- HF Spaces：<https://cdn.jsdelivr.net/gh/huggingface/hub-docs@main/docs/hub/spaces-overview.md>（huggingface.co 在本机不可直连，走 jsDelivr 镜像读官方仓库同一文件）
- Fly.io：<https://docs.fly.io/about/free-trial.md>、<https://docs.fly.io/about/discontinued-plans.md>
- Railway（备选，官方）：<https://railway.com/pricing.md> —— Free 计划每月只有 **$1** 额度，24/7 的 1 vCPU 服务约 $50/月，等于跑不起来
- 旁证（第三方，仅作线索）：<https://snapdeploy.dev/state-of-free-hosting>

---

## 8. 内容轨盘点（对照 ROADMAP §8 的 v1.0 门槛，2026-10-11）

> 内容轨是本项目的第一风险（ROADMAP R2，影响=高）。本节只做盘点与提醒，**不替用户写内容**。

**两个硬门槛**

| ROADMAP §8 门槛 | 现状 | 差距 |
| :-- | :-- | :-- |
| ≥ 3 个真实项目，每个都有描述 + 技术栈 + **链接** | 「已完成」且带链接的只有 **1 个**：`personal-portfolio`（`repo` + `live` 都有）。`data-toolkit` 标着 `done` 却 **`repo`/`live` 都空**；`api-service`、`notes-collection` 是 `planned`（无链接，符合预期） | 还差 2 个「点得开」的已完成项目 |
| ≥ 5 篇真实笔记 | **1 篇**（`function-definition-vs-call`） | 还差 4 篇 |

（`now.json` 4 条，最新 2026-10-11，正常。）

**补齐路径（建议顺序）**
1. **给 `data-toolkit` 加链接**：把 CLI 代码推到一个公开仓库，卡片补 `repo:`。一个标着「已完成」却点不开的项目比没有更伤口碑 —— §8 明确要求「没有标着已完成却拿不出东西的假项目」。
2. **让 `api-service` 转真**：v0.5-B 部署成功后把 `status` 改成 `done`，补 `live:`（部署 URL）与 `repo:`（本仓库）。这也正是「轨道 B2 = 站点 v0.5」同一次劳动。
3. **处理 `notes-collection`**：要么补 `live:`（指向本站），要么按 D12 的「笔记卡合并」并进本站那张卡；现在它是一个既不算完成、也点不开的 planned 卡。
4. **笔记**：目标 ≥5、现在 1；距 12/27 约 11 周，按 ROADMAP §9「每周 ≥1 篇」时间够，但**必须从本周开始**，否则会在最后几周挤成一堆。

**这些是用户侧的活（不是 Claude Code 的）**：写笔记、决定 `data-toolkit` 用哪个仓库、提供 `api-service` 部署后的 URL。
