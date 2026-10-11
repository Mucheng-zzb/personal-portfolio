# BASELINE.md —— 质量与体积基线

> 用途：记下 v0.2-D 收尾时的真实分数，供 **v0.4 重跑后对比**。
> 这是基线，不是目标；目标见 `docs/ROADMAP.md` §8 发布检查清单。
> 分数一律照抄工具输出，不做四舍五入修饰。

---

## 1. Lighthouse —— 移动端

### 四项分数

| 类别 | 分数 | ROADMAP §8 目标 | 是否达标 |
| :--- | ---: | ---: | :--- |
| 性能 Performance | **100** | ≥ 90 | ✅ |
| 无障碍 Accessibility | **95** | ≥ 95 | ✅（正好压线） |
| 最佳实践 Best Practices | **100** | ≥ 95 | ✅ |
| SEO | **100** | ≥ 95 | ✅ |

### 测试条件（对比时必须一致，否则数字不可比）

| 项 | 值 |
| :--- | :--- |
| 测试日期 | 2026-10-10 22:59:12 UTC（本机 2026-10-11 06:59 +08:00） |
| 被测地址 | `https://mucheng-zzb.github.io/personal-portfolio/`（线上，非本地） |
| 对应提交 | `1b20150`（v0.2-D），workflow run `38093293205` success |
| 工具 | Lighthouse **13.5.0**（`npx lighthouse`，本地无头 Chrome 驱动） |
| 设备仿真 | `formFactor: mobile`，视口 412×823，DPR 1.75 |
| 仿真机型 UA | `moto g power (2022)`，Android 11 |
| 网络与 CPU 节流 | `throttlingMethod: simulate`：RTT 150 ms、吞吐 1638.4 kbps、CPU 降速 4× |
| 稳定性 | 连跑两次，四项分数**完全一致**（100/95/100/100） |

> **为什么不是 PageSpeed Insights**：本机网络连不上 `www.googleapis.com`（22 秒超时），
> 所以改用本地 Lighthouse CLI 对同一个线上 URL 跑 Mobile。二者设备/节流参数接近，
> 但不是同一套基础设施，**换工具要重新记基线**。

### 关键指标

| 指标 | 实测 | 分数 |
| :--- | ---: | ---: |
| First Contentful Paint (FCP) | 1.1 s | 0.99 |
| Largest Contentful Paint (LCP) | 1.1 s | 1.00 |
| Total Blocking Time (TBT) | 0 ms | 1.00 |
| Cumulative Layout Shift (CLS) | 0 | 1.00 |
| Speed Index (SI) | 2.6 s | 0.97 |
| Time to Interactive (TTI) | 1.1 s | 1.00 |

ARCHITECTURE §4 的性能预算要求 LCP < 2.5 s、CLS < 0.1 —— 实测 1.1 s / 0，均在预算内。

---

### v0.4-A 复跑（2026-10-11）

> 这一轮修掉了本文件 §3 记下的唯一失分项（页脚对比度 4.19 → 需 ≥ 4.5）。
> **v0.4 新增了明暗主题，所以这一版起要跑两套**：Lighthouse 用无头 Chrome，
> 默认命中 `prefers-color-scheme: light`，暗色要靠 `--force-dark-mode` 才跑得到。

#### 四项分数

| 类别 | 浅色（第 1 次） | 浅色（第 2 次） | 暗色 | v0.2-D | ROADMAP §8 目标 |
| :--- | ---: | ---: | ---: | ---: | ---: |
| 性能 Performance | 98 | **100** | **100** | 100 | ≥ 90 |
| 无障碍 Accessibility | **100** | **100** | **100** | 95 | ≥ 95 |
| 最佳实践 Best Practices | **100** | **100** | **100** | 100 | ≥ 95 |
| SEO | **100** | **100** | **100** | 100 | ≥ 95 |

**结论**：目标 100/100/100/100 **已达到**（浅色第 2 次与暗色均为满分）。
唯独浅色第 1 次性能 98，差的**不是代码** —— 见下。

#### 那 98 差在哪（如实记录）

同一份字节、同一个 URL，只是网络抖了一下：

| 运行 | FCP | LCP | Speed Index | TBT | 传输 |
| :--- | ---: | ---: | ---: | ---: | ---: |
| 浅色第 1 次 | 1.1 s | 1.2 s | **4.0 s（得分 0.81）** | 80 ms | 60.6 KB |
| 浅色第 2 次 | 0.9 s | 0.9 s | 1.2 s（1.00） | 80 ms | 60.6 KB |
| 暗色 | 1.0 s | 1.0 s | 1.7 s（1.00） | 80 ms | 60.5 KB |

**唯一掉分的指标是 Speed Index**（权重高、对首屏绘制时刻极其敏感）。
请求数三次都是 3，传输字节三次都是 60.6 KB 上下 —— 内容没变，
变的是页面开始绘制的时刻。所以这是 GitHub Pages 网络的抖动，
不是回归；重复跑一次就回到 100。

**TBT 从 v0.2-D 的 0 ms 变成 80 ms**：这是真实变化，来自首屏 JS 从 4.65 KB 涨到
48.14 KB（v0.3-A 引入 marked / DOMPurify / highlight.js，v0.4-A 又加了主题、
项目列表、简历三个渲染模块）。80 ms 远在「好」的区间内（< 200 ms 满分线），
但这是**第一个不随时间自愈的下降**，值得记下来：下次再加首屏依赖前先量一次。

#### 测试条件

| 项 | 值 |
| :--- | :--- |
| 测试日期 | 2026-10-11 07:26 UTC（本机 15:26 +08:00） |
| 被测地址 | `https://mucheng-zzb.github.io/personal-portfolio/`（线上） |
| 对应提交 | `13db499`（v0.4-A），workflow run `38121103823` success（34 秒） |
| 工具 | Lighthouse **13.5.0**（与 v0.2-D 同版本，可比） |
| 设备仿真 | Lighthouse 默认移动端预设：`formFactor: mobile`，视口 412×823，DPR 1.75 |
| 网络与 CPU 节流 | `throttlingMethod: simulate`：RTT 150 ms、吞吐 1638.4 kbps、CPU 降速 4× |
| 暗色如何触发 | Chrome 加 `--force-dark-mode`，让 `prefers-color-scheme` 命中 dark |
| 稳定性 | 浅色连跑两次：无障碍/最佳实践/SEO 完全一致（100×3），性能 98 → 100 |

> **本机环境注意**：沙箱里 Chrome 直接访问线上会 `net::ERR_CONNECTION_RESET`
> （HTTPS 经 Watt Toolkit 中间人代理，Chrome 不认那张根证书；`curl` 不受影响）。
> Lighthouse 因此要加 `--chrome-flags="... --ignore-certificate-errors"` 才跑得动。
> 这只影响「本机怎么连上站点」，不动被测页面本身。

#### 无障碍 95 → 100 是怎么来的

v0.2-D 时 `color-contrast` 是唯一未过的审计（权重 7），页脚四个元素
（`#year` / `#footerName` / `#footerNote` / `a.footer__top`）用 `--text-faint: #6b7488`，
对页面底 4.19。v0.4-A 提亮到 `#7c8698`，并顺手补了
`.js .reveal:focus-within`（Tab 到一个还没淡入的板块时，焦点原本是看不见的）。

两套主题、各处实际底色（半透明卡片要先合成）都算过：

| 令牌 | 暗色值 | 最低对比度 | 亮色值 | 最低对比度 |
| :--- | :--- | ---: | :--- | ---: |
| `--text-faint` | `#7c8698` | 4.97（表头底） | `#5d6b82` | 4.66（标签片底） |
| `--text-muted` | `#98a2b6` | 7.10 | `#475467` | 6.63 |
| `--link` | `#a8c0ff` | 10.11 | `#2557c7` | 5.54 |
| `--text` | `#e9ecf3` | 15.42 | `#101828` | 15.31 |

（全部 ≥ 4.5，满足 WCAG AA。）

---

## 2. 体积基线（zlib 口径）

口径统一用 Node `zlib.gzipSync`（`gzip` 命令行会写入文件名与 mtime，数字不可比）。
命令（在**仓库根**执行）：

```bash
node -e "const fs=require('fs'),z=require('zlib');for(const f of fs.readdirSync('web/dist/assets'))console.log(f,(z.gzipSync(fs.readFileSync('web/dist/assets/'+f)).length/1024).toFixed(2)+'KB gzip')"
```

| 文件 | gzip | 原始字节 |
| :--- | ---: | ---: |
| `index.html` | 3.48 KB | 9 314 B |
| `assets/index-B1oqHC4e.css` | 2.81 KB | 9 540 B |
| `assets/index-CinFOPtF.js` | 4.65 KB | 10 028 B |
| **合计** | **10.94 KB** | 28 882 B |

Lighthouse 实测网络请求数 **3**、总传输 **11.5 KB**（与上表吻合，差值是响应头）。

对照 ARCHITECTURE §4 的性能预算：首屏 JS ≤ 150 KB、CSS ≤ 40 KB —— 当前 JS 4.65 KB 约为预算的 **3%**，
CSS 2.81 KB 约为 **7%**，余量极大。

### 与 v0.2-B 的对比（同为 zlib 口径）

| 类型 | v0.2-B | v0.2-D | 变化 | 说明 |
| :--- | ---: | ---: | :--- | :--- |
| HTML | 4.29 KB | 3.48 KB | −0.81 KB | v0.2-C 把内容搬出 HTML；v0.2-D 的 Prettier 重新缩排又加了约 0.07 KB |
| CSS | 2.81 KB | 2.81 KB | 0 | 文件 sha256 未变 |
| JS | 1.41 KB | 4.65 KB | +3.24 KB | v0.2-C 把 profile/now/projects 三个数据集打进了 bundle |

### v0.3-A（笔记子系统，引入 marked + DOMPurify + highlight.js）

新增三个依赖：`marked` ^18.1.0、`dompurify` ^3.4.16、`highlight.js` ^11.12.0。
highlight.js 走的是 `lib/core` + 5 种语言（python / javascript / sql / bash / json），
**没有**引完整构建 —— 完整构建光它自己就约 40 KB gzip，是这一版最大的体积风险点。

| 文件 | gzip | 原始字节 |
| :--- | ---: | ---: |
| `index.html` | 4.28 KB | 11 381 B |
| `assets/index-D55ilY8h.css` | 3.82 KB | 13 898 B |
| `assets/index-DdMUI8O7.js` | 46.06 KB | 130 309 B |
| **合计（首屏，口径同 v0.2-D）** | **54.16 KB** | **155 588 B** |

另外两个文件是给爬虫看的，**不属于首屏请求**，单独列出，不计入上表合计：

| 文件 | gzip | 原始字节 |
| :--- | ---: | ---: |
| `sitemap.xml` | 0.43 KB | 487 B |
| `robots.txt` | 0.10 KB | 94 B |

**懒加载：没有做（并已确认不需要）。** 本版设的判据是「首屏 JS ≤ 80 KB 就保持静态 import，
> 80 KB 才把笔记详情渲染器（marked + DOMPurify + highlight.js）改成动态 import」。
实测 **46.06 KB**，低于阈值，因此三者都是静态 import，没有做代码分割。

### 与 v0.2-D 的对比（v0.3-A）

| 类型 | v0.2-D | v0.3-A | 变化 | 说明 |
| :--- | ---: | ---: | :--- | :--- |
| HTML | 3.48 KB | 4.28 KB | +0.80 KB | 新增首页笔记节、笔记视图容器、导航项 |
| CSS | 2.81 KB | 3.82 KB | +1.01 KB | 笔记样式 + 正文排版 + github-dark 主题 |
| JS | 4.65 KB | 46.06 KB | **+41.41 KB** | 三个新依赖约占 32–39 KB，其余是笔记数据与路由/视图代码 |

对照 ARCHITECTURE §4 的性能预算：首屏 JS 46.06 KB ≈ 150 KB 预算的 **31%**，
CSS 3.82 KB ≈ 40 KB 预算的 **10%**，两项都仍在预算内。

**这 46 KB 里绝大部分是库，不是本站代码**，而这三个库之所以进首屏，是因为
「笔记正文在客户端渲染」这条 v0.3 的既定决策（ARCHITECTURE §5.2 / §13）。
换句话说这个数字就是那条演进触发器的现实依据：真涨破 80 KB 时，
第一个该动的就是把详情渲染器拆成动态 import，而不是删功能。

### v0.4-A（主题 / 项目列表 / 简历 / OG / 无障碍）

| 文件 | gzip | 原始字节 |
| :--- | ---: | ---: |
| `index.html` | 7.20 KB | 20 361 B |
| `assets/index-zHbQBzuy.css` | 4.94 KB | 19 047 B |
| `assets/index-rhHOB_2q.js` | 48.14 KB | 136 500 B |
| **合计（首屏）** | **60.28 KB** | **175 908 B** |

不在首屏请求里的（单独列出，不计入合计）：

| 文件 | 体积 | 说明 |
| :--- | ---: | :--- |
| `resume.pdf` | 145.2 KB | 点「下载 PDF」才请求 |
| `images/og.png` | 177.3 KB | 只有社交平台抓取时读，浏览器不加载 |
| `sitemap.xml` / `robots.txt` | 0.43 / 0.10 KB | 给爬虫 |

Lighthouse 实测网络请求数 **3**、总传输 **60.6 KB**（与上表吻合，差值是响应头）。

| 类型 | v0.3-A | v0.4-A | 变化 | 说明 |
| :--- | ---: | ---: | :--- | :--- |
| HTML | 4.28 KB | 7.20 KB | +2.92 KB | 主题防闪内联脚本、OG/twitter 元信息、两个新视图容器 |
| CSS | 3.82 KB | 4.94 KB | +1.12 KB | 亮色令牌、代码高亮调色板（替掉 github-dark.css）、简历与打印样式 |
| JS | 46.06 KB | 48.14 KB | +2.08 KB | 主题、项目列表与筛选、简历三个渲染模块；删除的 highlight.js 主题 CSS 抵掉一部分 |

对照 ARCHITECTURE §4 的预算：首屏 JS 48.14 KB ≈ 150 KB 的 **32%**，CSS 4.94 KB ≈ 40 KB 的 **12%**，
两项仍宽裕。**离 v0.3-A 定的 80 KB 懒加载触发线还差 32 KB**，但这一版又吃掉了 2 KB 的余量 ——
详见 §3 的「不需要动的项」。

---

## 3. 基线解读：哪一项最该先改

> **本节写于 v0.2-D 收尾时（2026-10-10），下面两条建议后来都执行了：**
>
> - ✅ **页脚对比度已修**（v0.4-A，`13db499`）：`--text-faint` 提亮为 `#7c8698`，
>   无障碍 **95 → 100**。过程与两套主题的完整色值表见 §1 的「v0.4-A 复跑」。
> - ⏳ **体积**：v0.4-A 后首屏 JS 48.14 KB（预算 150 KB 的 32%，懒加载线 80 KB 的 60%）。
>   详见 §2 与下面「不需要动的项」。
>
> 下面保留原文，作为当时的判断依据 —— 历史记录不改写。

### 唯一失分项：页脚文字对比度 4.19（需 ≥ 4.5）

Lighthouse 的 `color-contrast` 检查（权重 7）**是四项分数里唯一拖后腿的**，
其余 20 多项无障碍检查全部满分（`link-name` / `button-name` / `heading-order` / `html-has-lang` 均为 1）。

受影响的是页脚这一行的 4 个元素，前景 `#6b7488`、背景 `#0a0b10`：

| 元素 | 说明 |
| :--- | :--- |
| `span#year` | 页脚年份 2026 |
| `span#footerName` | 页脚姓名 |
| `span#footerNote` | 页脚署名后缀 |
| `a.footer__top` | 「回到顶部 ↑」 |

实测对比度 **4.19 : 1**，文字 13.12 px、字重 normal —— WCAG AA 要求普通字号文本 ≥ **4.5**，
差了 **0.31**。也就是说，只要把 `--text-faint` 提亮一点点就能过线，不需要动布局。

**为什么排第一**：

1. 它是当前唯一未达满分且**有真实用户影响**的项 —— 对比度不足对低视力用户是实际可读性障碍，
   不只是分数问题；
2. 修复成本极低（改 `web/style.css` 里 `--text-faint` 一个色值），风险几乎为零；
3. 它是**可达成的满分项** —— 其余三项已经 100，把这项修掉整站就是 100/100/100/100，
   而 v0.4 会重跑并对比，一次干净的小改动就能换来可量化的提升。

**建议放 v0.4**，与「明暗主题、无障碍、真机」那一批一起做（ROADMAP §5.3 / §5.4 的范围），
这样色值的调整能在两套主题下一起定，避免改两次。

### 不需要动的项

- **性能 / CLS**：v0.4-A 复跑 LCP 0.9–1.2 s、CLS 0，仍无优化空间，
  也不该为了数字去动设计（【不做】已明确）。
  **唯一新变化是 TBT 0 → 80 ms**（首屏 JS 变大的直接后果），仍在满分区间内。
- **体积**：v0.2-D 时距离预算还有一个数量级。v0.3-A 引入 marked + DOMPurify + highlight.js 后，
  首屏 JS 涨到 46.06 KB（150 KB 预算的 31%）—— **这条基线已按 §2 重新记录**。
  v0.4-A 再涨到 48.14 KB（32%）。
  余量从「一个数量级」收窄到大约三分之一预算，**下次再加依赖前先量一次**。
  懒加载的触发线是 80 KB，现在还剩 32 KB —— 但如果 v0.5（前端接 API）或 v0.7（AI 浮层）
  要往首屏塞任何东西，**先量再写**。

### 对比时要注意

- 这是**线上**测量，受 GitHub Pages 网络与 CDN 影响；本地 `npm run preview` 的分数不可直接与之比较。
- Lighthouse 版本会影响可比性（本次 13.5.0）。v0.4 重跑请记录版本号；
  若版本跨度大，分数变化可能来自审计规则变化而不是代码变化。
- 性能类指标（FCP/SI）天然有波动，无障碍/最佳实践/SEO 才是确定性的；
  对比时优先看后三项，前三项要看多次运行的中位数。
