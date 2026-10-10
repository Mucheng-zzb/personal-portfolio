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

---

## 3. 基线解读：哪一项最该先改

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

- **性能 100 / TBT 0 ms / CLS 0**：没有任何优化空间，也不该为了数字去动设计（【不做】已明确）。
- **体积**：距离预算还有一个数量级，v0.3 加笔记子系统时有充足余量；
  但 v0.3 要引入 marked + DOMPurify + highlight.js，**届时需重新记这条基线**。

### 对比时要注意

- 这是**线上**测量，受 GitHub Pages 网络与 CDN 影响；本地 `npm run preview` 的分数不可直接与之比较。
- Lighthouse 版本会影响可比性（本次 13.5.0）。v0.4 重跑请记录版本号；
  若版本跨度大，分数变化可能来自审计规则变化而不是代码变化。
- 性能类指标（FCP/SI）天然有波动，无障碍/最佳实践/SEO 才是确定性的；
  对比时优先看后三项，前三项要看多次运行的中位数。
