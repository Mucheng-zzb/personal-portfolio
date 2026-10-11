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
> 同一轮追加：完成 ADR-005 免费 PaaS **现查六问**（§7）——HF Spaces 的 Docker Space 与 Fly.io 都已不再对新用户免费，**原三级降级阶梯只剩 Render**，见 D24（**已被 D34 更新**：Render 实测要支付方式 → 主选 SnapDeploy、备选 Zeabur，见 §7.0）。
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
>
> **v0.5-A 已交付并通过架构师核验**（详见 §0 与 §4）：37 tests / exit 0、7 端点 + `/docs`、CORS、统一错误体、无密钥、JS↔Python fixture 逐字节可复现、`resume.pdf` 已修。收尾 2 项：D30（排序统一码点序）、D29（ARCHITECTURE §6 补错误码）；另有 Dockerfile 未构建（v0.5-B 首验）。**3 个提交还没推送**。

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
| v0.4 收尾 → tag `v0.4.0` | ✅ **已完成**（代决后已执行） | 远端 `gh api`：`v0.4.0` → **`509b785`**（旧指向 `e6ce078` 作废）；只移动 tag 引用，提交历史未改。`resume.pdf` 已在 `42d48a1` 重生成，架构师解码验证：旧 tagline「大一在读」**0 命中**、新 tagline 在位 |
| **v0.5-A 只读 API** | ✅ **验收全部关闭**（`bbeb939` / `42d48a1` / `5daf913` + 修复 `bda40c3` / `ad5d5e5` / `9fc1abb` / `2a171c2` / `269fc07`；**已推送**，`main == origin/main`） | 架构师实跑：`pytest` **42 passed / exit 0**（含契约 3 项、500 无堆栈 2 项、非 UTF-8 三路径 3 项）；7 端点全 200 且都带 `X-Request-Id`；`/openapi.json` 恰好 **7 条路径**；`limit=101`→422、`status=bogus`→422、未知 slug→404 统一错误体；伪造 Origin 无 `allow-origin`，Pages 与 `localhost:5173` 有；仓库无密钥、`.env` **从未入库**；`web/content` 直读（D26）4 项目/1 笔记；**JS 侧 fixture 可由 `make_fixture.mjs` 逐字节复现** |
| **v0.5-B 前端消费 + 降级（代码）** | ✅ **代码完成 + 架构师核验**（`602069e` / `5b6bb81` / `8eea813` / `aad9b97`；run #11 success 31 秒） | 新增 `lib/api.js`（3s 超时 / 只重试 1 次 / 错误归一化 / 绝不 `console.error`）、`lib/live.js`、`ui/live-status.js`；**未配 `VITE_API_BASE` 时一个请求都不发**（线上当前=纯静态）。首屏 **62.64 KB**（+2.42 KB），JS 50.14 KB = 预算 33% / 懒加载线 63%。架构师复验：两次 build 逐字节一致、线上 7/7 一致、HTML 含 `id=liveStatus`；**api CI 首次上线**（run #1/#2 success） |
| **`v0.5.0` tag** | ⏸ **暂缓**（用户 2026-10-11：「等完善了再去打」） | **锚点候选已锁定 `c1dd704`**（含 v0.5-B 部署 + C 高亮 + 内容刷新）。**将来补打时必须打在「代表 v0.5 最终状态」的那个 commit 上，而不是当时的 HEAD** —— 否则就重犯 D23「tag 早于版本最终状态」的错。打完更新 §5 锚点表。**暂缓 ≠ 放弃锚点**：回滚本来就可以用 commit sha（`workflow_dispatch` 接受任何自带 workflow 的 ref） |
| v0.5-B 部署（**SnapDeploy**，D34） | ✅ **验收全部关闭 —— v0.5（A+B）至此完成** | 容器「个人投资组合-728bd」→ `https://personal-portfolio-728bd.containers.snapdeploy.app`。`/docs` 200 + `/openapi.json` 恰 7 条路径；`/health` 200 且 `env=production`、**`projects:4 / notes:1`**（D38 判据）、`source_dir` 相对路径（D33）；7 端点全 200（**271–494 ms**）；CORS 白名单有头 / 伪造无头；404 与 422 统一错误体。前端已接 `API_BASE`（线上 JS 含后端域名，本地同变量重建**逐字节一致**）；**三种降级演练用真实 Chrome 全部通过**（判据按 D39 收紧）。v0.5 无遗留 |

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

### 1.7 v0.5-B 指令（**已发放**；平台按 D34 定为 SnapDeploy）

> 前提：v0.5-A 已核验通过。平台按 **D34** = **SnapDeploy**（Render 实测要支付方式，已弃用；事实见 §7.0）。
> 发放当天**重跑一次 ADR-005 六问**（§7.4 有官方链接与 10-11 的结论），别直接抄这页。

```text
【版本】v0.5-B
【目标】把 v0.5-A 的 API 部署成公网服务，并让前端真正消费它，同时在它失效时完整降级。
【范围】
1) 在 SnapDeploy 建容器（用 GitHub 注册，**不需要信用卡**）：连仓库 → 构建方式选 Dockerfile → 部署。域名形如 https://xxx.snapdeploy…
   注意：**Root Directory 必须留空**（SnapDeploy 把它理解为「Dockerfile 所在目录」；填 api 会让构建上下文丢掉 web/content）——所以 `Dockerfile` 已按 D35 放在**仓库根**。
2) 所有配置走平台环境变量（CORS 白名单、ENV、CONTENT_DIR）；api/.env.example 同步；仓库里不得出现任何真实值。
3) 前端 web/src/lib/api.js：统一请求封装（3s 超时、只重试 1 次、错误归一化），失败时【回退到构建产物内已有的内容数据】
   （v0.3 的 content 模块，构建期内联；按 D5 不生成任何独立快照文件），页脚显示「实时数据不可用」小字，控制台【只打 warning】（不能有 error）。
4) 冷启动体验：首屏照旧用构建期内容【立即】渲染，后端数据到达后再替换；【不要让首屏等 API】，也不要出现空白转圈。
5) 探活（可选）：给出免费定时探活的具体操作步骤（每 5 分钟打一次 /api/v1/health），并说明代价：
   常驻 7×24 ≈ 720 小时/月，而 SnapDeploy 免费额度只有 **100 容器小时/月**（睡眠中的容器不消耗）——**探活在这里不是省不省的问题，是根本装不下**。结论：**不要配探活**，让它睡；「睡着时站点照常完整可读」正是本版硬验收。
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
- 演练 1 · 服务不存在：在 SnapDeploy 控制台把容器停掉（或把前端 API base 指到坏地址），刷新页面。
  通过 = 站点完整可读、项目/笔记仍在、角落显示「实时数据不可用」、控制台只有 warning。
- 演练 2 · 网络不可达：DevTools → Network → Offline（或断网）后刷新。
  通过 = 不白屏、不无限转圈；≤3 秒内降级到构建期内置内容。
- 演练 3 · 慢或坏响应：让后端人为变慢（临时 sleep 5）或返回 5xx。
  通过 = 超时后降级、提示一致、只重试 1 次（Network 里请求数不放大）；唤醒过程中显示骨架而不是卡死。
- ⚠️ SnapDeploy 特有：**休眠中的容器对任何请求直接返回 503 唤醒页**。所以「睡着的站点」本身就是一个真实的降级场景 —— 第一次访问看到「实时数据不可用」属正常，约 1 分钟后刷新才会变成实时数据。这不算失败，正是要验的路径。
【验证方式】每个演练各贴：操作步骤 + Network 要点 + 页面状态 + 控制台输出（证明只有 warning）。
另贴：/docs 与 /health 的 curl -i 输出、CORS 两次 curl、密钥扫描命令与输出。
【输出要求】变更摘要 / 验证结果（含三演练原始输出）/ 我在 SnapDeploy 上要手点的步骤清单 / 未完成项 / 下一步建议。
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
- [x] ~~ARCHITECTURE ADR-005 候选表~~ —— 已按 D34 改写：SnapDeploy 主选、Zeabur 备选、Render / HF / Fly 标注弃用及原因
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
| v0.5-B | 部署到免费 PaaS + **前端降级硬验收** | 平台见 **D34 = SnapDeploy**（无卡、Docker、仓库根构建）；事实见 §7.0；**指令见 §1.7**（含架构师定义的三种降级演练） |
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
| D24 | ADR-005 降级阶梯只剩 Render（HF Docker 与 Fly 已不免费）：接受「Render 单点 + 后端离线走前端降级」，还是引入绑卡备选（Cloud Run / Oracle Always Free） | ✅ **已定（架构师代决）**：**接受 Render 单点 + 前端降级**。不引入绑卡平台（守住「0 元、不为部署引入付费项」）；真出问题就长期走「后端离线模式」——这正是 ADR-005 的硬约束。部署当天仍要重跑六问。**D24 修订（2026-10-11，实测）**：用户实际去建 Render 服务时，**加卡弹窗被触发**（文案是「Access paid instances…」，即使 Free 档已选中），而用户的底线是**不绑卡** → 平台改选见 **D34**。Render 的官方文档仍写「没有支付方式也能有免费服务」，所以这是账号/地区层面的验证要求，不是文档说的规则。 | §1.9 B 组 → 修订见 D34 |
| D25 | v0.6 线上数据库：Render 免费 Postgres 30 天过期 → 付费升级 / 换持久化方案 / 砍掉 v0.6 | ⏳ 到 v0.6 前决定（依据 §7.3） | ARCHITECTURE ADR-007 / ROADMAP §6 |
| D26 | v0.5 后端数据源：直接解析 `web/content/**`（架构师推荐），还是走 `export_content.py` 中间 JSON | ✅ **已定（架构师代决）**：**直接解析 `web/content/**`**，不生成中间 JSON。理由与 `content-plugin.js` 拒绝写中间产物一致：多一份会过期、会忘生成的产物。`export_content.py` 随之取消 | §1.9 A 组 |
| D27 | v1.0 检查清单要求的 **404 页**由哪个版本做、怎么做 | ✅ **已定（架构师代决）**：归 **v0.8**，实现为 `web/public/404.html`（Vite 复制到 dist 根），**不依赖 JS** 也能点回首页 | §1.9 D 组 |
| D28 | v0.7 的两项基础设施：`index.json` 提交进仓库还是部署时生成（牵涉 key 面）；若 v0.6 被砍，`ask_logs` 的退路（stdout 日志 / 保留 DB 骨架） | ✅ **已定（架构师代决）**：① `index.json` **提交进仓库**（嵌入模型 key 只在本地 `.env`，不进 CI/部署环境），**CI 用 `content_hash` 校验它与 `web/content` 同步**，不一致就红；② 无 `DATABASE_URL` 时 `ask_logs` **退化为结构化 stdout 日志 + 进程内计数**，统计脚本读日志——这样 v0.6 仍可整版砍掉 | §1.9 C 组 |
| D29 | v0.5 新增 503 `content_unavailable`；`/health` 在内容坏掉时返回 503 + 自身体检单（不是统一错误体） | ✅ **已定（核验时确认）**：两者都成立且语义正确——内容坏了是服务端**临时、可自愈**的问题，用 503 而非 500 才说得通。**必须补进 ARCHITECTURE §6 错误码表**（现表只有 `ai_unavailable`），并把 `/health` 写成「第一个在非 2xx 时返回自身报告而非统一错误体」的显式例外；第二个例外：白名单外 Origin 的 CORS 预检是 Starlette 直接给的 400 `text/plain`（不经过我们的错误处理器）。**已落地 `ad5d5e5`，但两处残留**：① 错误码表**漏了 `405 method_not_allowed`**（实测返回的就是这个 code）；② ARCHITECTURE 仍把 `/health` 写成「**唯一**」例外——应改成「唯一由**应用**产生的例外」，并注明 CORS 预检那个 400 是框架行为、不算契约 | ✅ **已落地并核验**（`ad5d5e5` + `2a171c2`）：§6 表已有 `content_unavailable` 与 `405 method_not_allowed`；`/health` 例外改成「由应用产生」；CORS 预检作为框架例外写明 |
| D30 | 排序 tie-break：JS 用 `localeCompare(x,'zh')`（ICU 拼音），Python 标准库只有码点序 | ✅ **已定**：**统一为码点序**（改 JS 侧，不改 Python）。理由：① 两侧规则必须一致，否则 v0.5-B 接上 API 后，「实时数据」与「内置兜底」在并列项上顺序会不一样；② `localeCompare` 依赖 ICU 数据版本，会威胁构建可复现（D18）。改动量：`web/build/content-schema.js` 两处 sort + 重生成 `api/tests/contract/fixture_js.json`。**已落地 `bda40c3`，核验通过**：`compareCodePoint()` 替换两处 `localeCompare`；fixture 重生成后与提交版**逐字节一致**（当前内容无并列项）；`pytest` 与 `npm run check` 均 exit 0。遗留（不阻塞）：JS 的 `<` `>` 比 **UTF-16 码元**、Python 比**码点**，只有 emoji 等增补平面字符理论上会不同——现无内容触发，先记下 | ✅ **已落地并核验**（`bda40c3`）：`compareCodePoint()` 替换两处 `localeCompare`，fixture 逐字节一致，pytest / `npm run check` 全绿 |
| D32 | api/ 无 CI，42 个测试只在本机跑过 | ✅ **已落地并核验**（`5b6bb81` + `aad9b97`）：`api-ci.yml` 已在 run #1/#2 success；触发路径 `api/**` + **`web/content/**`** + 自身；步骤 = pytest、**fixture 与内容同步检查**、**语义密钥扫描**（明确写了为什么不用 PLAYBOOK §6 那条字面 grep）。完整门禁仍留 v0.8（D7 不变） |
| D34 | 部署平台改选：Render 要求支付方式验证，用户不绑卡 | ✅ **已定（架构师代决，取代 D24 的 Render 单点）**：主选 **SnapDeploy**，备选 **Zeabur**。理由与事实：SnapDeploy 官方文档明确「**不需要信用卡**」（email/GitHub 注册即可）、**支持自己的 Dockerfile**、**默认构建上下文=仓库根**（正是我们需要的）、免费档 **100 容器小时/月**且**睡眠中的容器不消耗小时**、约 15 分钟无流量休眠、**自动 HTTPS**、每月刷新、不过期；其官方举例就是「作品集站一天醒约 1 小时 ≈ 30 小时/月」。Zeabur 官方 Free Plan 文档同样写「**No credit card required**」+ 空闲自动休眠，作为备选。Back4App 只有第三方说法，未核实 | v0.5-B 部署步骤（替换 §1.7 里的 Render 部分） |
| D35 | `api/Dockerfile` 把端口写死成 `8000`（`EXPOSE 8000` + `CMD --port 8000`） | ✅ **已定**：改成**跟随平台注入的 `$PORT`**（`sh -c` 里用 `${PORT:-8000}`），保持本地默认 8000 不变。理由：SnapDeploy 会从 `EXPOSE` 探测端口（本就兼容），但很多 PaaS 直接注入 `PORT`；写死端口的镜像换个平台就会「构建成功但路由不通」。反正这个 Dockerfile 一次都还没真构建过，现在改成本最低。**查 SnapDeploy 文档后追加一条**：它「仓库里有 Dockerfile 就用、端口读 EXPOSE」，而 Root Directory 的语义是「**Dockerfile 所在目录**」——设成 `api` 就会让构建上下文丢掉 `web/content`（文档明说「Shared packages outside the root directory are not visible to the build」）→ **把 `api/Dockerfile` 移到仓库根 `Dockerfile`**（文件内容不用改，里面本来就是 `COPY api/…` + `COPY web/content` 的仓库根写法）。同时 `PORT` 在 SnapDeploy 是**平台托管且锁定**的，所以 `$PORT` 那条是硬要求，不是可选 | v0.5-B 开工前（与 D34 一批） |
| D36 | `api-ci` 里要不要真的 `docker build` 一次（Claude Code 主动提：补了 paths 后改 Dockerfile 只跑 pytest，**绿灯不代表镜像能构建**） | ✅ **已定：要，而且再加一步冒烟测试**。GitHub 的 ubuntu runner 自带 Docker，代价每次 +1–2 分钟（有层缓存）。步骤：`docker build -t portfolio-api:ci .` → `docker run -d -e PORT=9000 -p 9000:9000 portfolio-api:ci` → `curl -fsS http://127.0.0.1:9000/api/v1/health`（**故意用非默认 PORT**，顺便验证 D35 的 `${PORT:-8000}`）。这样「这个 Dockerfile 从没被构建过」这个最大盲区在 CI 里被永久消掉，而不是等 SnapDeploy 第一次部署才发现 `COPY` 路径写错 | v0.5-B（立即） |
| D37 | SnapDeploy 的「检测到的环境变量」把 Dockerfile **多行 `ENV`** 的行尾续行符 `\` 吃进了值里（实测：`CONTENT_DIR` = `/app/web/content \`、`PYTHONDONTWRITEBYTECODE` = `1\`） | ✅ **已定**：① 用户当场把这两个值改成干净的（`/app/web/content`、`1`）；② **根治**：把 Dockerfile 里的多行 `ENV` 拆成**一行一个**（`ENV A=1` / `ENV B=2`），不让任何朴素解析器有续行符可吃。危害等级：平台环境变量会**覆盖镜像里的值**，`CONTENT_DIR` 错 → 容器找不到内容目录 → **起来就 503**，正好是部署当天最容易被误判为「代码坏了」的失败 | v0.5-B（立即） |
| D38 | 镜像冒烟测试的判据：只看进程活着（`status:"ok"`）够不够 | ✅ **已定：不够，必须断言「内容非空」**（`projects ≥ 1` 且 `notes ≥ 1`）。教训来自 D36 第一次真跑：`.dockerignore` 的 `**.md` 把 `web/content/**/*.md` 一起排掉了，而 `profile.json`/`now.json` 是 `.json` 照旧进镜像 → `status:"ok"` 但内容为空，**不报错、不降级、控制台干净**，会一路活到部署完毕才以「怎么项目都没了」的形式暴露。已落地在 `api-ci.yml`。推论（写进 §5 口径）：**凡是有「依赖外部资源才能正常」的组件，判据都要断言那份资源真的到了，而不是断言进程起来了** | 已落地 |
| D40 | 线上常态会是「容器睡着 → 访客看到『实时数据不可用』」——这条提示该不该改 | ⏳ **待定（记下来，v0.6/发布前再处理）**：现状符合设计（ADR-005 要求降级可见），但对**第一次来访的陌生人**，「实时数据不可用」读起来像站点坏了，而他看到的其实和实时数据一字不差。可选方向：① 保持现状（诚实、且面试时可讲「这就是降级设计」）；② 改成更中性的措辞（如「显示的是构建时快照」）；③ 只在**用户主动交互过**（如点过筛选）或**第二次访问**时才提示。**注意**：无论选哪个，都不能让访客以为内容缺失 —— 内容其实完全一样 | v0.6 / v0.9 前 |
| D39 | 「控制台只打 warning（不能有 error）」这条硬验收怎么判 | ✅ **已定（实测后收紧语义）**：判据是「**应用代码**不产生 error」，不是「控制台里一条 error 都没有」。原因：主机不可达时，**浏览器网络栈自己**会打 `Failed to load resource: net::ERR_CONNECTION_REFUSED`，JS **无法抑制**它。实测四种场景：真后端在线 → 控制台**零消息**；超时 → **只有我们的一条 warning**；坏响应 503 → 只有 warning；服务不存在 → 我们一条 warning + 浏览器自己两条 resource error（后者不算违反） | 已用于本轮演练判据 |
| D33 | `/health` 暴露绝对 `source_dir` | ✅ **已落地并核验**（`8eea813`），实现比原措辞更合理，**采纳**：本地给绝对路径（排查方便）；生产只给**相对仓库根的路径**（`web/content`）；若内容不在仓库根之下则显示「路径已隐藏」。实测 `ENV=production` 下不再出现绝对路径与用户名 |
| D31 | 内容**读取失败**（非 UTF-8 / IO 错误）该归哪一类：现在是 500，而 D29 承诺「内容坏了 → 503」 | ✅ **已定（核验发现，必须修）**：读取失败也要归 **503 `content_unavailable`**——它同样是内容问题、可自愈，不是代码 bug。且 **`/health` 在任何情况下都不得 500**（它自己的注释就写着「健康检查必须能回答坏在哪，而不是自己也坏掉」）。修法：① `content_service.py:71` 以及 `_load_profile`/`_load_now` 的 `read_text`，把 `UnicodeDecodeError`/`OSError` 收进 errors 列表；② `health()` 的 `except` 放宽到 `Exception`，兜底返回 `status: "error"`。附带发现：Node 的 utf8 解码是**有损替换**（U+FFFD），Python 是**严格抛错**——两侧对非 UTF-8 文件的行为天然不同。**第二轮冷启动实测：三处 `read_text` 全中**——`profile.json` 非 UTF-8 → `/profile` **500** + `/health` **500**；`now.json` 非 UTF-8 → `/now` **500** + `/health` **500**。所以修复必须覆盖 markdown 与两个 JSON 的全部读取路径 | ✅ **已修复并核验**（`9fc1abb` + `269fc07`）：三处读取路径统一走 `_read_text()`，`health()` 兜底 catch `Exception`；实测三种坏法全部 503 + 体检单点名文件，**无一处 500** |

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
| 10-11 | **用户决定：v0.5.0 tag 暂缓** | ⏸ 记入台账 | **不等同于取消**：① 目标锚点锁定 **`c1dd704`**，将来补打要打在「v0.5 最终状态」的 commit 上而不是当时的 HEAD（否则重犯 D23）；② 回滚不受影响（`workflow_dispatch` 可用 commit sha）；③ **与 v0.5 无关的待办仍然成立**：远端丢失的 `v0.2-A`/`v0.2-B` 建议补回（`git push origin v0.2-A v0.2-B`，纯 reflog 级操作，随时可做） |
| 10-11 | **tag 审计：v0.5.0 漏打 + 远端丢失两个归档 tag** | ⚠️ 已定位，待执行 | ① 用户发现 **v0.5 的 tag 没打** —— 确认为**架构师漏提醒**（版本验收关闭那一刻就该打；D23 的教训是「打太早」，这次是「忘了打」）；② 顺带审计远端 tag 时发现 **`v0.2-A`(3c63ceb) 与 `v0.2-B`(a2e7f18) 在远端 404**（三种方法交叉确认），本地仍在 → 已列入待补。**教训**：tag 是唯一留档、且只存在于远端一份，版本关闭核验必须顺带数 tag（已写进 §5） |
| 10-11 | **内容轨推进 + 交付核验** | ✅ 项目门槛达标（3/3）；笔记 2/5 | 用户新增笔记 `print-is-not-return.md`（1694 字，结构：结论→问题→误解→做法→代价→总结），并把 `api-service` 转 `done`、`data-toolkit` 补上**真实存在**的仓库链接。架构师核验：① 线上 JS `index-B9Qj1G-h.js` 149632 B / **gzip 53.21 KB**，产物里含 `size_t`/`printf` → **C 语法确实打进包了**（`cpp` 按「增量 > 3 KB 不加」的规则未加，实测 +c=+1.62 KB、+c+cpp=+3.12 KB）；② 远端 `main == origin`（`c1dd704`），api CI **#7** 与 web 部署 **#14** 均 success，fixture-sync 检查通过；③ **用浏览器唤醒容器后实测接口返回的是新内容**：`projects=4 notes=2`、`api-service.status=done`、`tags` 无 `SQLite`、`repo`/`live` 就位；④ 测试改动经审查是**正当更新且有加强**（新增「有值的字段必须是非空串」断言），不是放水 |
| 10-11 | **v0.5 三种降级演练（架构师用真实 Chrome 实测）** | ✅ 全部通过 | 方法：用无头 Chrome 走 **CDP**（`--dump-dom` 与挂起网络不兼容），分别把 `VITE_API_BASE` 指向（a）死域名（b）立即返 503 的桩（c）挂住不回的桩，页面各自实测 `#liveStatus`：
| 场景 | data-state | 提示文案 | 内置内容 | 控制台 |
| :-- | :-- | :-- | :-- | :-- |
| 真后端在线（**线上站点实测**） | `ok` | 实时数据已同步 | ✅ | **零消息** |
| 服务不存在 / 断网 | `failed` | 实时数据不可用 + `[network] 请求发不出去` | ✅ 项目卡照常 | 我们 1 条 warning（+浏览器自身 resource error） |
| 坏响应 503 | `failed` | 实时数据不可用 + `[http 503] mock` | ✅ | 只有 warning |
| 慢/挂起（3s 超时） | `failed` | 实时数据不可用 + `[timeout] 请求超过 3000ms 未完成` | ✅ | 只有 warning |
坏响应那次后端共收到 **8 次 GET / 4 个端点 = 每端点恰好重试 1 次**（「请求数不放大」成立）。**诚实附注**：挂起那次后端只记录到 1 次 GET、0 次预检，与坏响应那次不一致，我没能解释清楚（不影响验收：每端点 ≤ 2 次、3s 内降级）。判据措辞已按 D39 收紧 |
| 10-11 | **v0.5-B 公网验收（SnapDeploy 上线）** | ✅ 3/3 通过 | 容器「个人投资组合-728bd」→ `https://personal-portfolio-728bd.containers.snapdeploy.app`（平台显示「跑步」，CPU 6.4%、内存 49MB、已用 0.0 小时）。架构师实测：① `/docs` **200** `text/html`；`/openapi.json` **恰好 7 条路径**；② `/api/v1/health` **200**（383ms）带 `X-Request-Id`，`env:"production"`、`source_dir:"web/content"`（D33 生效）、**`projects:4, notes:1`**（D38 判据通过——内容真的进了镜像）；③ 7 个端点全 **200**，**271–494 ms**；④ CORS：`https://mucheng-zzb.github.io` 带回 `allow-origin`，`https://evil.example` **无**；⑤ 404 `not_found` / 422 `validation_error` 都是统一错误体且带 `request_id`。**未做**：前端 `API_BASE` 接入 + 三种降级演练 |
| 10-11 | **v0.5-B 镜像真构建 + 冒烟测试（D36）——挖出一个静默 bug** | ⚠️ 真 bug，已修并复核 | D36 第一次真跑就照出：`.dockerignore` 的 `**.md` 把 `web/content/**/*.md` 也排除了 → 镜像里 `profile.json`/`now.json` 正常、内容 Markdown 全丢 → `/health` 仍 `status:"ok"`，但 `/projects`、`/notes` **空数组**，站点显示空项目区/空笔记区且不报错（比 503 难发现得多）。修复（`3750e3c`）把 `**.md` 换成点名文件并把原因写在旁边；同时把冒烟判据从「`status:"ok"`」加强为「**`projects ≥ 1` 且 `notes ≥ 1`**」。架构师复核：`main == origin/main` = `3750e3c`；run **#6 api CI success**；**#5 api CI failure**（`cd74151`）与 **PR #1（已关闭）check `test` = FAILURE** 就是那次「故意写坏 → 必须变红」的真实证据；修复后 #6 日志里 `/health` 返回 `"projects":4, "notes":1` |
| 10-11 | **SnapDeploy 首次部署：环境变量检测有坑** | ⚠️ 已定位并给出对策 | 平台从 Dockerfile 的多行 `ENV` 里检测变量时，把行尾续行符 `\` 连同前面的空格一起当成了值：`CONTENT_DIR` = `/app/web/content \`、`PYTHONDONTWRITEBYTECODE` = `1\`。照原样部署 → 容器去找名为 `/app/web/content \` 的目录 → **503**。已让用户当场改成干净值；根治方式见 D37（拆成一行一个 ENV） |
| 10-11 | **平台切换落地核验（D34/D35 的 push）** | ✅ 通过 | 远端 `gh api`：`/Dockerfile` **存在**、`api/Dockerfile` **404（已删）**；`main == origin/main`（`3c5e73f`）；run **#3 api CI success**、**#12 Deploy web success**。`api-ci.yml` 的 paths 已补 `Dockerfile` / `.dockerignore`（补掉了 D35 带来的路径盲区）。⚠️ 那次 web 部署是**空部署**：`web/**` 未变，只因 `8f35035` 改了 `web-deploy.yml` 自己的注释而触发（该文件在它自己的 paths 白名单里）——架构师抽查线上 4 个文件（`index.html` `55a8b12e`、JS `f31f2227`、CSS `e5186b49`、`resume.pdf` `387f42aa`）**与 run #11 逐字节一致** |
| 10-11 | **v0.5-B 代码核验（架构师，只读 + 实跑）** | ✅ 代码通过；⬜ 部署待用户 | ① 前端降级链：`lib/api.js`（3s 超时、只重试 1 次、错误归一化、绝不 `console.error`）+ `lib/live.js` + `ui/live-status.js`；**`VITE_API_BASE` 为空时 `apiEnabled=false`，一个请求都不发**——线上当前就是纯静态（架构师在构建产物里确认没有后端地址：`onrender` 0 命中；`VITE_API_BASE` 只剩源码里的标识符，`BASE` 求值为空）。② 体积（zlib 口径）：首屏 **62.64 KB**（HTML 7.43 + CSS 5.06 + JS 50.14），较 v0.4-A +2.42 KB；JS 50.14 = 150 KB 预算 **33%**、80 KB 懒加载线 **63%**，仍未触发代码分割。③ **两次 `npm run build` 产物逐字节一致**。④ 线上 7/7 与本地 `web/dist` 逐字节一致（run #11 @ `580a819`，31 秒）。⑤ `api-ci.yml`（D32）上线并在 run #1/#2 success；里面还多做了两件我没要求的好事——**fixture 与 `web/content` 同步检查**，并把 `web/content/**` 加进触发路径（内容变了 fixture 会过期，只盯 `api/**` 会漏掉这种最常见的失误）。⑥ D33 实测：`ENV=production` 下 `/health` 不再出现绝对路径/用户名。**未覆盖**：Render 部署本身、三条公网验收、三种降级演练（都要等部署） |
| 10-11 | **D32 / D33 立项** | ✅ 已定 | D32：api/ **没有任何 CI**，42 个测试只在本机跑过（Claude Code 主动提出）→ 把**最小 `api-ci.yml`**（按 `api/**` 路径过滤，跑 pytest + 密钥形态扫描）提前到 **v0.5-B**；完整门禁仍按 D7 留 v0.8。D33：`/health` 暴露绝对 `source_dir` → **生产环境不返回**，本地保留 |
| 10-11 | **D31 修复核验（架构师实测）** | ✅ 通过 | `9fc1abb` 新增 `_read_text()`，三处读取路径（集合 `.md`、`profile.json`、`now.json`）统一走它；`health()` 兜底 catch `Exception`。冷启动实测：三种坏法分别 → `/projects`、`/profile`、`/now` **503 `content_unavailable`**，`/health` **503 + `status: degraded`** 且 `detail` 点名「哪个文件、第几字节」（例：`…/data-toolkit.md: 不是合法的 UTF-8 文本：第 2043 个字节处解码失败`），**无一处 500** |
| 10-11 | **v0.5-A 收尾：推送 + 线上（run #10）** | ✅ 通过 | `main == origin/main`（`269fc07`）；run #10（`2a171c2`）success 30 秒；deployment `6993202319`；Pages `built/workflow`。架构师独立复验：**两次 `npm run build` 产物逐字节一致**；线上 **7/7 与本地 `web/dist` 逐字节一致**（`index.html` `95049652` 20445B、JS `index-BIq1GmEs.js` `48ba5299` 136524B、CSS `index-zHbQBzuy.css` `ece0fb70` 19047B、**`resume.pdf` `387f42aa` 148712B**、`images/og.png` `5efd89e3`、`sitemap.xml`、`robots.txt`）；HTML 含 `/personal-portfolio/assets/index-` 标记；`/script.js`、`/style.css` 均 404；首屏 gzip 合计 **60.22 KB**。**v0.4 的 resume.pdf 遗留至此在生产环境关闭** |
| 10-11 | **v0.5-A 收尾修复核验（D29/D30）** | ✅ D30 通过；🟡 D29 部分；❌ D31 未修 | D30（`bda40c3`）：`compareCodePoint()` 已替换 `localeCompare`，`make_fixture.mjs` 重跑与提交 fixture 逐字节一致，`pytest` exit 0、`npm run check` exit 0（构建产物文件名与体积未变：`index-BIq1GmEs.js` / `index-zHbQBzuy.css`）。D29（`ad5d5e5`）：§6 表已加 `503 content_unavailable`，但**仍缺 405**，且 `/health` 被写成「唯一」例外。D31：`git log -3 -- api/app/services/content_service.py` 仍止于 `5daf913` → **非 UTF-8 内容依旧 500**。`main` 现领先 origin **5 个提交，未推送** |
| 10-11 | **v0.5-A 加验（测试工程师视角，真实服务器）** | ⚠️ 发现 1 个真缺陷 | 独立探测通过项：信封 `items/total/limit/offset/request_id`；`/notes` 列表无 `body`、详情有 `body`；`offset` 分页正确；`X-Request-Id` 合法值透传、非法值被服务端替换；405 / `OPTIONS` 预检 / 路径穿越 `..%2Fprofile` 均返回统一错误体；未知查询参数被忽略（与内容文件未知字段报错不同）；22/22 日志行是合法 JSON 且含 `request_id/method/path/status/duration_ms`。**缺陷（A/B 实测）**：(A) `status: nope`（合法 UTF-8）→ **503 `content_unavailable`**，`/health` → 503 + `status: degraded` 体检单（D29 成立）；(B) 同一文件改成**非 UTF-8 字节** → `/projects` **500 `internal_error`**，**`/health` 同样 500**。根因：`api/app/services/content_service.py:71` 的 `read_text(encoding="utf-8")` 抛 `UnicodeDecodeError`，未进入 errors 收集。另：`/health` 暴露绝对 `source_dir`（容器里无害，本机暴露用户名）。**第二轮探测**：`offset=-1`/`limit=0` → 422；未知 tag → `total:0`；重复 `tag` 取最后一个；`X-Request-Id` 64 字符透传、65 字符被替换；`/projects/` → 307 重定向、`HEAD` → 405；**`/health?reload=true` 确实重载**（加一个文件后 4→5，后续 `/projects` 同步变 5）——文档承诺成立；**新发现**：白名单外 Origin 的 CORS 预检由 Starlette 直接返回 **400 `text/plain`「Disallowed CORS origin」**，不是统一错误体（浏览器不把它交给 JS，影响低，记为例外）。见 D31 |
| 10-11 | **v0.5-A 交付核验（架构师，只读 + 实跑）** | ✅ 通过（2 项收尾待办） | ① `git status` 干净、`main` 领先 origin **3 个提交**（未推送）；② `gh api`：远端 `v0.4.0` → `509b785`（重打已生效）；③ `pytest` 37 passed / exit 0；④ 7 端点 200 + `X-Request-Id`，`/docs` 200 HTML，`/openapi.json` 7 路径；⑤ `limit=101`/`status=bogus`→422、未知 slug→404，全是 `{error:{code,message,request_id}}`；⑥ 伪造 Origin 被拒（无 `allow-origin`），`github.io` 与 `localhost:5173` 通过；⑦ `git ls-files api/` 无 `.venv`/`__pycache__`/`pytest-of-*`/`.env`；⑧ `make_fixture.mjs` 重跑输出与提交的 `fixture_js.json` **逐字节一致**；⑨ `resume.pdf` 解码：旧 tagline「大一在读」0 命中、「专科在读（大一）」在位；⑩ 文档 A 组已改（ARCHITECTURE/BASELINE/PLAYBOOK/ROADMAP）。**未覆盖**：Dockerfile 未构建（无 Docker）、500 是测试证据而非线上触发 |
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
- **可回滚锚点**：`v0.1.0` → `859a713` / `v0.2-A` → `3c63ceb` / `v0.2-B` → `a2e7f18` / `v0.2.0` → `e0f4fc8` /
  `v0.3.0` → `626e4ae` / `v0.4.0` → `509b785` / `v0.5.0` → **`c1dd704`（⏸ 暂缓，用户决定「完善了再打」；锚点候选已锁定，见 §0）**。
  注意：`workflow_dispatch` 指定 ref 回滚时，该 ref 必须自带 `web-deploy.yml` —— 所以只有 `v0.2-B` 及以后的 tag 可用。
- ⚠️ **2026-10-11 发现：远端丢过 `v0.2-A` 与 `v0.2-B`**（三种方法交叉确认：`gh api tags?per_page=100` 只剩 4 个、
  `git/refs/tags` 只有 4 个、直查 `v0.2-A` 得 404；**本地仍在**）。已让 Claude Code 用 `git push origin v0.2-A v0.2-B` 补回。
  **上面这张映射表就是重建它们的唯一依据** —— 所以「每次版本关闭核验」必须顺带数一遍远端 tag，
  别等真要回滚时才发现最老的锚点没了。
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

### 7.0 追加（2026-10-11 实测，推翻 7.1 的 Render 结论）

| 候选 | 无卡可用？ | 证据 / 限制 |
| :-- | :-- | :-- |
| **SnapDeploy** | ✅ **不需要信用卡** | 官方 Free Tier 文档：「Does the SnapDeploy free tier need a credit card? **No.**」；支持自己的 Dockerfile；**默认构建上下文=仓库根**；免费 100 容器小时/月（**睡眠的容器不消耗**）、最多 4 个容器、512 MB / 0.25 vCPU、10 次部署/天、自动 HTTPS、每月刷新不过期；约 15 分钟无流量休眠，**休眠时对请求返回 503 唤醒页**（浏览器打开后约 60 秒唤醒）。官方举例：作品集站一天醒约 1 小时 ≈ 30 小时/月 |
| **Zeabur** | ✅ **No credit card required** | 官方 Free Plan 文档原文「No credit card required — just sign up and start deploying」；空闲自动休眠；无 SLA。作为备选 |
| **Render** | ⚠️ 文档说不用卡，**实测要卡** | 官方文档仍写「没有支付方式也能有免费服务」，但用户实际创建服务时被要求 Add Card（$1 临时授权）→ 用户不绑卡，弃用（D34） |
| Back4App | ❓ 未核实 | 只有第三方说法（「不要卡、Docker+GitHub」），官网定价页是 JS 渲染，没拿到原文 |

**对 v0.5-B 的影响**：换成 SnapDeploy 不影响任何前端代码与验收标准（`VITE_API_BASE` 指向新域名即可）；但要注意它**休眠时返回 503 而不是加载页** —— 前端会立刻降级显示「实时数据不可用」，这对我们是可接受甚至更真实的降级演练。

### 7.1 结论（2026-10-11 首次现查，部分已被 §7.0 更新）：ADR-005 的「降级阶梯 Render→HF Spaces→Fly」已断两条

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
| ≥ 3 个真实项目，每个都有描述 + 技术栈 + **链接** | ✅ **3 个**：`personal-portfolio`、`data-toolkit`（新仓库 `Mucheng-zzb/data-toolkit`，架构师实测 HTTP **200**）、`api-service`（`repo` + `live=/docs`，文案已改成「只读、无数据库」） | **已达标** |
| ≥ 5 篇真实笔记 | **2 篇**（`function-definition-vs-call`、`print-is-not-return`） | 还差 **3 篇** |
| 「没有标着已完成却拿不出东西的假项目」 | ✅ 已修：`api-service` 正文从「还没开工」改成实际交付说明，并**主动写明没做什么**（无写接口、无数据库 → v0.6） | — |

（`now.json` 4 条，最新 2026-10-11，正常。）

**补齐路径（建议顺序）**
1. **给 `data-toolkit` 加链接**：把 CLI 代码推到一个公开仓库，卡片补 `repo:`。一个标着「已完成」却点不开的项目比没有更伤口碑 —— §8 明确要求「没有标着已完成却拿不出东西的假项目」。
2. **让 `api-service` 转真**：v0.5-B 部署成功后把 `status` 改成 `done`，补 `live:`（部署 URL）与 `repo:`（本仓库）。这也正是「轨道 B2 = 站点 v0.5」同一次劳动。
3. **处理 `notes-collection`**：要么补 `live:`（指向本站），要么按 D12 的「笔记卡合并」并进本站那张卡；现在它是一个既不算完成、也点不开的 planned 卡。
4. **笔记**：目标 ≥5、现在 1；距 12/27 约 11 周，按 ROADMAP §9「每周 ≥1 篇」时间够，但**必须从本周开始**，否则会在最后几周挤成一堆。

**剩余动作**
1. ✅ ~~给 `data-toolkit` 加链接~~ 已完成（仓库真实存在，架构师实测 200）
2. ✅ ~~让 `api-service` 转真~~ 已完成（含文案纠正，见上）
3. **`notes-collection`**：仍是无链接的 `planned` 卡。不影响 3 个门槛，可并入本站卡或补 `live:`（低优先）
4. **笔记 2/5**：还差 3 篇。建议下一篇写 `learning` 里的「HTTP / REST API 是怎么工作的」——刚写完 API，趁热最有料

**一条实测事实（卡片文案用）**：SnapDeploy 睡着时，**接口请求唤不醒它**（架构师轮询 97 秒全是 503）；**用浏览器打开地址才会唤醒**（实测约 **6 秒**恢复，平台文档保守地说约 60 秒）。所以站点访客的常态是「内置内容 + 实时数据不可用」，而点项目卡上的 `live` 链接恰好是浏览器打开、会把它唤醒。这让 **D40**（提示文案措辞）更值得尽早处理。
