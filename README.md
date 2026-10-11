# 个人作品集

我的第一个项目：一个单页响应式的个人主页。线上地址：<https://mucheng-zzb.github.io/personal-portfolio/>

**技术栈**：原生 HTML + CSS + JavaScript + Vite（只负责打包，产物仍是纯静态文件）。没有 UI 框架，没有运行时依赖。

---

## 迁移状态

> **版本 v0.2-B（2026-10-11）**：从「根目录几个文件」迁成「monorepo + 构建」这件事**已经做完**。
> 根目录不再有 `index.html` / `style.css` / `script.js`，线上由 GitHub Actions 构建 `web/dist` 后发布，URL 不变。

| 位置 | 是什么 | 现状 |
| :--- | :--- | :--- |
| `web/` | **唯一开发入口**，所有前端改动都做在这里 | 日常用 `cd web && npm run dev` |
| `.github/workflows/web-deploy.yml` | 部署流水线 | push `main` 自动构建并发布（见[部署到 GitHub Pages](#部署到-github-pages)）|
| `api/` | 后端（FastAPI），只读内容接口 | v0.5-A 起可用：`cd api && uvicorn app.main:app --reload`（见 `api/README.md`）|

> **过渡期踩过的坑，留个记录**：v0.2-A 到 v0.2-B 之间，根目录和 `web/` 各存了一份同名文件，
> 因为当时的 Pages 是「从分支根目录部署」，直接删文件线上会**立刻 404**。
> 那段时间的铁律是**只改 `web/`**，根目录那三份是只读的保活副本。
> 现在三件套已删，这条规矩自然作废 —— 但教训还在：**部署方式没切完之前，不要删正在提供服务的文件。**

---

## 目录

- [迁移状态](#迁移状态)
- [文件结构](#文件结构)
- [本地打开](#本地打开)
- [改成你自己的内容](#改成你自己的内容)
- [部署到 GitHub Pages](#部署到-github-pages)
- [下一步可以加什么](#下一步可以加什么)
- [常见问题](#常见问题)

---

## 文件结构

```text
personal-portfolio/
├── .github/workflows/
│   └── web-deploy.yml     部署流水线：push main 后构建 web/ 并发布到 Pages
├── web/                  前端（Vite 项目）—— 唯一开发入口
│   ├── content/            ★ 页面内容都在这里，改内容只改这里
│   │   ├── profile.json      姓名/定位/邮箱/GitHub/技能/关于我/正在学什么
│   │   ├── now.json          最近在做什么（时间线）
│   │   └── projects/*.md     项目卡，一个文件一张
│   ├── build/              构建期内容管线（只在构建时跑，不进浏览器）
│   │   ├── content-schema.js  纯函数校验，可单测
│   │   ├── content-plugin.js  Vite 插件：虚拟模块 + 校验失败 + dev 监听
│   │   └── og-card.html       分享卡片（og:image）的源文件，用它截图生成 og.png
│   ├── public/             ★ 原样拷进 dist 根目录的静态文件（不进 JS 打包）
│   │   ├── resume.pdf         简历 PDF —— 由 #/resume「打印成 PDF」而来
│   │   └── images/og.png      社交分享缩略图 1200×630
│   ├── src/                浏览器侧代码
│   │   ├── lib/content.js     读取 virtual:content 的薄封装
│   │   └── ui/*.js            渲染模块（profile / hero / about / skills / projects / now / notes / resume / theme）
│   ├── index.html          页面结构（首屏静态字段 + 各路由视图的容器）
│   ├── style.css           所有样式（设计令牌、各板块、响应式、打印）
│   ├── script.js           入口：渲染内容 + 交互 + 路由（滚动淡入、导航高亮、复制邮箱…）
│   ├── vite.config.js      构建配置（base 必须指向 Pages 的子路径）
│   ├── package.json        四个脚本：dev / build / preview / check
│   ├── node_modules/       依赖（不入库，已写进 .gitignore）
│   └── dist/               构建产物（不入库，部署时现构建）
├── api/                  后端：只读内容 API（FastAPI），v0.5-A 起可用（见 api/README.md）
├── docs/                 路线图（ROADMAP）与架构文档（ARCHITECTURE）
└── README.md             就是这个文件
```

**根目录已经不再有网页文件了** —— 页面结构、样式、交互全在 `web/` 下，
根目录只放仓库级的东西（`README.md`、`.gitignore`、`api/`、`docs/`、`.github/`）。

---

## 本地打开

**现在只有一条正确的路：Vite 开发服务器。**

```bash
cd web          # ← 先进入 web/ 目录
npm install     # 第一次，或者 package.json 变过之后
npm run dev     # 启动开发服务器
```

终端会打印一个地址，在浏览器里打开它：**`http://localhost:5173/personal-portfolio/`**

> 地址里那段 `/personal-portfolio/` 是**正常的**，不是写错了。
> 因为线上部署在子路径下，开发服务器要和线上保持一致（原因写在 `web/vite.config.js` 的注释里）。

改代码浏览器会自动刷新，不用按 F5。停止服务器按 `Ctrl + C`。

### 双击 `index.html` 还能用吗？

**现在不能了** —— v0.2-B 之后根目录已经没有 `index.html` 了，看效果只有 `npm run dev` 这一条路。

`web/` 里的文件**不能**双击打开：那里用的是 ES module，浏览器在 `file://` 下会直接拦下来报错。
所以写代码、看效果都走 `npm run dev`。这个取舍是**有意接受**的（换来的是能用 Vite 打包、后面能把代码拆成多个模块），不是配置出错了。

### 四个脚本分别干什么

| 命令 | 作用 | 什么时候用 |
| :--- | :--- | :--- |
| `npm run dev` | 启动开发服务器，改代码自动刷新 | **平时写代码，只用这个** |
| `npm run build` | 打包成纯静态文件，输出到 `web/dist/` | 想看看「线上那版」长什么样 |
| `npm run preview` | 用本地服务器跑 `dist/` 里的产物 | 构建之后验收（要先跑 `build`） |
| `npm run check` | **目前只是 `vite build` 的占位**，不是代码检查 | 见下面的说明 |

> **`npm run check` 现在不代表任何质量检查**，它只是把构建又跑了一遍。
> 真正的质量基线（Prettier + 可选的 ESLint + Lighthouse）属于 **v0.2-D**，那时才把 `check` 换成真检查，
> 而且会是一次**独立提交**（`style: 用 Prettier 统一格式`）—— 不会和这次「搬家」混在同一个 commit 里。

**怎么检查手机上的效果**：在浏览器里按 `F12` 打开开发者工具，点左上角的手机图标（或按 `Ctrl + Shift + M`），就能切换到手机尺寸预览。

---

## 改成你自己的内容

**内容全在 `web/content/` 下，改内容不用碰 HTML。**（v0.2-C 起）

| 你想改什么 | 改哪个文件 | 对应字段 |
| :--- | :--- | :--- |
| 姓名 / 一句话定位 / 邮箱 / GitHub | `web/content/profile.json` | `name` / `tagline` / `email` / `github` |
| 简历页的「教育」栏 | `web/content/profile.json` | `education`（可选） |
| 首屏那三个小标签 | `web/content/profile.json` | `heroChips` |
| 「关于我」的两段正文 | `web/content/profile.json` | `about` |
| 「正在学什么」那张卡 | `web/content/profile.json` | `learning` |
| 技能分组 | `web/content/profile.json` | `skills` |
| 项目卡 | `web/content/projects/*.md` | 一个文件一张卡 |
| 「最近在做什么」时间线 | `web/content/now.json` | 数组，一项一行 |

改完在 `web/` 下跑 `npm run build` 重新构建；本地看效果用 `npm run dev`（自动刷新）。

### 怎么改个人信息

打开 `web/content/profile.json`，直接改对应的值：

```json
{
  "name": "周同学",
  "tagline": "专科在读（大一），在学后端与 AI，想做出自己的第一个作品。",
  "email": "254180649@qq.com",
  "github": "https://github.com/Mucheng-zzb"
}
```

- `name` 会自动出现在**三个地方**：页头 logo、首屏大标题、页脚。改一处就够了。
- `github` 要写完整的 `https://...`，页面上的显示文字会自动去掉 `https://` 前缀。
- 邮箱只要改 `email` 一处，链接、显示文字、复制按钮三处会一起跟着变。
- 简历页（`#/resume`）的**「教育」栏就来自 `education`**（可选字段，一个字符串，
  例：`"education": "专科在读（大一）"`）。不写这一项也不会构建失败，简历页那栏会显示
  「教育信息待补充」；技能栏与项目栏分别自动取自 `skills` 和 `projects/`，不用重复填。

### 简历页与 `resume.pdf` 怎么更新

简历页**没有单独的内容文件**：教育取自 `profile.json` 的 `education`，技能取自 `skills`，
项目取自 `projects/*.md`，联系方式取自 `email` / `github`。所以改完上面任一处，简历页自动跟着变。

`web/public/resume.pdf` 是这一页「打印成 PDF」的产物（`style.css` 里的 `@media print`
负责强制亮色并藏掉页头/页脚）。**改了内容想同步 PDF**，在**仓库根目录**跑：

```bash
# ① 起本地预览（另开一个终端）——注意用 /personal-portfolio/ 子路径打开，和线上一致
#    端口以它实际打印的为准：4173 被别的进程占用时会自动换到 4174
cd web && npm run preview

# ② 用本机 Chrome 把 #/resume 打印成 A4 PDF（Windows 路径按需替换）
"C:/Program Files/Google/Chrome/Application/chrome.exe" \
  --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$PWD/web/public/resume.pdf" \
  "http://localhost:4173/personal-portfolio/#/resume"

# ③ 自查：必须仍是 1 页，且正文里的 tagline 与 profile.json 一字不差
#    （PDF 正文的 tagline 是 index.html 的静态 #resumeTagline，
#      改文案时它和 profile.json 必须一起改，只改一边就漂移；
#      PDF 抽出的文本在「AI」这类西文两侧会多空格，比较时要忽略空白）
python -m pip install pypdf            # 只在第一次需要
python -c "import json;from pypdf import PdfReader;r=PdfReader('web/public/resume.pdf');s=''.join(''.join(p.extract_text() for p in r.pages).split());d=json.load(open('web/content/profile.json',encoding='utf-8'));print('pages:',len(r.pages));print('tagline ok:', ''.join(d['tagline'].split()) in s)"

# ④ 重新构建（resume.pdf 在 public/ 里，dist 里那份要靠 build 才会更新）
cd web && npm run build
```

> 不想折腾 PDF：`#/resume` 那个网页版本身就是一页纸，浏览器里 Ctrl+P 也能直接印。

### 分享缩略图 `og.png` 怎么更新

分享到微信 / 推特时那张 1200×630 的卡片，源文件是 `web/build/og-card.html`。
**改了姓名或定位**，在 `web/` 下重新截一张（Chrome 路径按本机情况替换）：

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 \
  --screenshot="$(pwd -W)/public/images/og.png" \
  "file:///$(pwd -W)/build/og-card.html"
```

`index.html` 里的 `og:*` / `twitter:*` 标签**写的是绝对地址**（抓取方不在你的页面上，
解析不了相对路径）。以后换域名，`index.html` 的这几条和 `web/build/content-plugin.js`
里的 `SITE_ORIGIN` 要一起改。

### 怎么改技能分组

`skills` 是一个数组，**一个对象 = 页面上的一张卡片**：

```json
"skills": [
  { "title": "后端开发", "items": ["Python", "SQL", "Git"] },
  { "title": "工具与基础", "items": ["HTML / CSS", "VS Code"] }
]
```

- 加一组 = 往数组里加一个对象；加一个标签 = 往 `items` 里加一个字符串。
- 删掉一组 = 删掉那个对象。整站样式会自动排下去，不用管布局。

### 怎么改「正在学什么」

`learning` 是字符串数组，一项就是清单里的一行：

```json
"learning": ["Python 编程基础与常用库", "SQL 与数据库设计入门"]
```

> 别和 `web/content/now.json` 搞混了：`learning` 是「关于我」右边那张**勾选清单**，
> `now.json` 是下面**「最近在做什么」的时间线**，两码事。

### 怎么改首屏三个小标签

`heroChips` 是字符串数组，首屏名字下面那三个小圆标签就按这个顺序渲染：

```json
"heroChips": ["后端开发", "AI · 数据", "持续学习中"]
```

### 如何新增一个项目

**一步：在 `web/content/projects/` 里新建一个 `.md` 文件。** 文件名就是它的 slug，必须是小写英文 + 连字符。

```markdown
---
title: 数据小工具
status: planned          # done | wip | planned
date: 2026-10-11         # 必须是 YYYY-MM-DD，且是真实存在的日期
tags: [Python, Pandas]   # 数组，不能写成字符串
summary: 一句话说明它解决什么问题，会显示在卡片上
order: 3                 # 排序用，越小越靠前
repo: https://github.com/Mucheng-zzb/xxx   # 可选
live:                                      # 可选，在线可访问地址
cover: /images/xxx.webp                    # 可选，以 / 开头
featured: false                            # 可选，true 会占满一整行（仅 done 的项目生效）
---

正文写这里（背景 / 做了什么 / 技术栈 / 难点 / 收获）。
正文目前不会显示在页面上，是给 v0.3 的详情页留的。
```

保存后 `npm run build`，卡片就出来了 —— **全程不用碰 HTML**。

### 还需要你亲自改的（4 条）

这几处我只能按你给的信息写草稿，得你自己换成真实内容：

| 编号 | 要改什么 | 改哪里 |
| :--- | :--- | :--- |
| 1 | 「关于我」的自我介绍（现在是草稿，建议改成你自己的话） | `web/content/profile.json` → `about` |
| 2 | 技能标签（现在填的是 Python / Node.js / SQL / Pandas 这些，改成你真正会的） | `web/content/profile.json` → `skills[].items` |
| 3 | 「最近在做什么」（最需要你亲自写，也最值得定期更新） | `web/content/now.json` → 每项的 `text` |
| 4 | **我推断出来的日期**（见下方说明，请核对后改正） | `web/content/now.json` → 每项 `date`；`web/content/projects/personal-portfolio.md` → `date` |

> **关于第 4 条 —— 日期是怎么来的、哪些还没确认：**
>
> 原页面上的时间只有「月」这一级精度（「更新于 2026.9」），而校验规则要求 `YYYY-MM-DD`，所以有一轮补值。
> 其中三条已经由本人核对改正为真实日期，剩下两条仍是推断值：
>
> | 位置 | 当前值 | 来源 | 状态 |
> | :--- | :--- | :--- | :--- |
> | `now.json` 第 1 条 | `2026-09-05` | 本人核对后改正 | ✅ 已确认 |
> | `now.json` 第 2 条 | `2026-09-09` | 本人核对后改正 | ✅ 已确认 |
> | `now.json` 第 3 条 | `2026-10-10` | 本人核对后改正 | ✅ 已确认 |
> | `now.json` 第 4 条 | `2026-10-11` | 原文只写「计划中」没有日期，按记录这条的那天填 | ⏳ **待确认** |
> | `personal-portfolio.md` | `2026-10-11` | git 里 v0.1 的全部提交都在 `2026-10-11` | ⏳ **待确认**（若你另有开工日，以你的为准） |
>
> 这些只影响「更新于 2026.9」这类小字（**只显示到月**），页面上看不出差别。

> 另外 `data-toolkit` / `notes-collection` / `api-service` 三张卡都标着 `status: planned`。
> 真开工之后记得把状态改成 `wip`（建设中）或 `done`（已完成）—— 别留在 `planned` 上，也别没做完就标 `done`。
> （`planned` 的卡片只需写「背景 + 打算做什么」，**不用**编造技术栈 / 难点 / 收获 —— 那是 `done` 才写的。）

### 几个常见操作

**改主题色** —— 打开 `web/style.css`，最上面的 `:root` 里改这两行就行，整站的蓝色渐变会一起变：

```css
--accent-1: #4f7cff;   /* 主色（蓝） */
--accent-2: #a855f7;   /* 辅色（紫） */
```

**改页面上的固定文案**（板块标题、「想交流…都欢迎」这类）—— 那些不是内容数据，写在 `web/index.html` 里。
只有 `web/content/` 里有的东西才归数据管。

**删掉不要的板块** —— 删掉 `web/index.html` 里整个 `<section>...</section>`，
同时把页头 `<nav>` 里对应的链接也删掉。底部的 `01 / 02 / 03` 编号记得顺手改成连续的。

### 改坏了会怎样

**构建会直接失败，并告诉你哪个文件、哪个字段、期望什么。** 例如把 `status` 写成 `doing`：

```text
[content] 内容校验失败，共 1 处问题：
  ✗ web/content/projects/data-toolkit.md
      · status: 非法值「doing」（允许：done | wip | planned）
构建已中止：npm run build 退出码非 0。修好上面 1 处后重新构建。
```

一次会把**所有**问题都列出来，不用改一处、构建一次、再发现下一处。
另外，字段名拼错（比如 `sumary`）也会报错，不会静默忽略。

---

## 部署到 GitHub Pages

> **v0.2-B（当前）**：线上由 **GitHub Actions** 部署 —— push 到 `main` 之后，
> `.github/workflows/web-deploy.yml` 会构建 `web/`，把 `web/dist` 发布到 Pages。
> **线上 URL 不变**：<https://mucheng-zzb.github.io/personal-portfolio/>

### 一次性人工步骤：把 Source 改成 GitHub Actions ✅ 已完成

**2026-10-11 已经切好了**（仓库的 `build_type` = `workflow`，线上已由 `web/dist` 提供）。
这一步只能人工在网页上点，Claude Code 没有你的 GitHub 权限 —— 留在这里备查，重建仓库时照做：

1. 进仓库 → **Settings** → 左侧菜单 **Pages**
2. **Source** 选 **GitHub Actions**（**不要**选 “Deploy from a branch”）
3. 选完之后 Branch / 文件夹那两个下拉框会消失，这是正常的，不用再填

> ⚠️ **切换的那一瞬间线上会 404**，一直到 workflow 完成第一次部署为止。
> 所以顺序是：**先把 workflow 推上去，再去改这个设置**，空窗期越短越好。

### 之后怎么更新

push 到 `main` 就会自动部署，约 1～3 分钟生效：

```bash
git add .
git commit -m "docs: 更新自我介绍"
git push
```

**只有这些路径变了才会触发部署**（见 workflow 里的 `paths`）：`web/**` 和 workflow 文件本身。
只改 `docs/` 或 `README.md` 不会重新部署 —— 这是有意的，省 CI 时间。

> workflow 的 `paths` 里还留着 `index.html` / `script.js` / `style.css` 三条。
> 那是过渡期为了让「删除根目录三件套」那次提交也能触发部署而加的；
> 文件已经删了，这三条永远不会再匹配到 —— 留着无害，下次动 workflow 时可以顺手清掉。

### 回滚

1. **最省事的退法**：`Actions → Deploy web to GitHub Pages → Run workflow`，
   在 `Use workflow from` 里选一个旧的 ref，再跑一次。
   > ⚠️ 只能选**本身就包含这个 workflow 文件**的 ref —— 也就是这次改动合并进 `main` 之后
   > 打的 tag（`v0.2-B` 及以后）。
   > 更早的 tag（比如 `v0.2-A`）里还没有这个文件，GitHub 找不到 workflow，选它会直接报错 ——
   > 那种情况走下面第 2 条。
2. **或者 `git revert`** 掉出问题的那次提交，push 后会自动重新部署一次。

### ⚠️ 「分支部署」这条退路已经失效了

v0.2-B 的硬门禁已经执行：根目录的 `index.html` / `script.js` / `style.css` **已删除**。
**所以「把 Source 切回 `Deploy from a branch`」这条最原始的回滚路径现在没用了** ——
分支根目录下已经没有任何网页文件，切回去只会得到一个 404 的站点。

要临时恢复这条退路，得先把三件套从旧 tag 里取回来：

```bash
git checkout <tag> -- index.html script.js style.css
```

把 `<tag>` 换成还留着三件套的 tag（例如 `v0.2-A`），push，然后把 Source 切回
`Deploy from a branch` + `main` + `/ (root)`。

---

> 下面第 1～3 步是 **v0.1 时代从零建仓库**的过程说明，仓库已经建好了，留着作回顾，
> **不要照着做，也不要改任何 Pages 设置**。

免费，不用买服务器。做完之后你会得到一个公网地址，别人点开就能看到你的主页。

### 第 1 步：注册 / 登录 GitHub

没有账号就去 https://github.com 注册一个。

### 第 2 步：新建仓库

1. 点右上角 `+` → **New repository**
2. **Repository name** 填 `personal-portfolio`（或者别的名字，建议英文）
3. 选 **Public**（公开），Private 仓库用不了免费的 Pages
4. **不要**勾选 "Add a README file"（我们本地已经有了）
5. 点 **Create repository**

### 第 3 步：把文件传上去

#### 方法 A：网页上传（不用装任何东西，推荐新手）

1. 进入刚建好的仓库，点 **uploading an existing file** 链接
2. 把 `index.html`、`style.css`、`script.js`、`README.md` 四个文件**一起拖进去**
3. 下面的 commit message 随便写，比如 `first commit`
4. 点 **Commit changes**

#### 方法 B：命令行 Git

在 `personal-portfolio` 文件夹里打开终端（Windows 可以在文件夹地址栏输入 `cmd` 回车），依次执行：

```bash
git init
git add .
git commit -m "feat: 个人作品集 v0.1"
git branch -M main
# ↓ 把 yourname 换成你的 GitHub 用户名
git remote add origin https://github.com/yourname/personal-portfolio.git
git push -u origin main
```

### 第 4 步：开启 GitHub Pages

> v0.2-B 起这里已经改成 **Source 选 `GitHub Actions`**，做法见本页顶部的
> 「一次性人工步骤」。下面这几行是 v0.1 的老做法（`Deploy from a branch`），
> **已经不是线上实际的配置**，只留作对照，别照着点。

1. 在仓库页面点 **Settings**（设置）
2. 左侧菜单找到 **Pages**
3. ~~**Source** 选 `Deploy from a branch`~~ → 现在选 **GitHub Actions**
4. ~~**Branch** 选 `main`，右边的文件夹保持 `/ (root)`，点 **Save**~~
5. 等 1～3 分钟（第一次会慢一点），刷新这个页面，顶部会出现绿色的一条：
   `Your site is live at https://...`

### 第 5 步：访问你的主页

地址规则是：

```
https://你的用户名.github.io/personal-portfolio/
```

> **小技巧**：如果仓库名写成 `你的用户名.github.io`（比如 `zhangsan.github.io`），
> 地址就会变成 `https://zhangsan.github.io/` —— 更短更好看，效果完全一样。
> 想改成这样，就去建一个叫这个名字的新仓库，把文件传过去，再开启 Pages。

### 以后改了内容怎么更新

见本页顶部的「[之后怎么更新](#之后怎么更新)」—— push 到 `main` 即自动部署。

> **v0.1 的历史做法**：进仓库 → 点开文件 → 右上角铅笔图标 ✏️ → 改完 **Commit changes**，
> 等 1 分钟生效。这个操作现在**依然会触发部署**（commit 落到了 `main` 上），
> 但只建议用来改 `README.md` 这类文件；`web/` 的改动请在本地做完、构建过再 push。

---

## 下一步可以加什么

v0.1 已经能用了，下面是往后可以一个一个加的东西，**按从易到难排的**：

### 很快就能加（改几行代码）

1. **换标题字体** —— 现在用的是系统字体。想更有设计感可以引入 Google Fonts 的 `Inter` 或 `Space Grotesk`
2. **加一个头像** —— 首屏名字旁边放个圆形头像，`border-radius: 50%` 就行
3. **加浅色/暗色切换按钮** —— 现在只有暗色，可以加个按钮让访客自己选，用 CSS 变量切换很好实现
4. **加简历下载** —— 把 PDF 放进文件夹，联系方式旁边加个「下载简历」按钮
5. **加网站访问统计** —— 接入免费的 [Umami](https://umami.is/) 或 [Busuanzi](https://busuanzi.ibruce.info/)，看看有没有人来看

### 需要学一点新东西

6. **项目卡片加截图** —— 用 `<img>` 加图片，配合 `loading="lazy"` 懒加载
7. **写博客 / 笔记** —— 把「最近在做什么」换成真正能点进去的文章列表，最简单的做法是每个笔记一个 HTML 文件
8. **加联系表单** —— 不写后端也能做，用 [Formspree](https://formspree.io/) 之类的免费服务代收邮件
9. **自定义域名** —— 花几十块买个域名（比如 `yourname.com`），在 Pages 设置里填上，比 GitHub 的地址专业很多

### 想往深了走

10. **换成一个前端框架** —— 比如 React 或 Vue，随着内容变多会更好维护
11. **加一个后端** —— 自己写接口存留言、存笔记，正好把后端的知识用上
12. **加动画库** —— GSAP 或 `framer-motion`，做更细腻的滚动效果

### 我的建议

**先别急着加东西。** 先把名字和介绍换成真的，部署上线，然后把网址发给一个朋友让他打开看看 —— 在别人手机上是什么样，你自己是发现不了的。等你真的想往里面写东西的时候（比如想放第三、第四个真项目了），再回来加功能，那时候你会更清楚自己需要什么。

---

## 常见问题

**Q：为什么双击打开后样式是对的，但感觉和部署后不一样？**
A：大概率是浏览器缓存。部署后按 `Ctrl + F5` 强制刷新一下。

**Q：GitHub Pages 显示 404？**
A：线上现在由 GitHub Actions 部署，排查顺序是 ① 去仓库 **Actions** 页看最近一次 `Deploy web to GitHub Pages` 是不是红的，红了点进去看哪一步失败 ② **Settings → Pages** 的 Source 是否还停在 `GitHub Actions` ③ 是不是刚推完不到 1 分钟 ④ 仓库是不是 Public。

**Q：手机上字太小 / 太挤？**
A：`web/style.css` 末尾有三段 `@media`，管的就是手机适配。先用 F12 切到手机尺寸看一眼，再调里面的数字。

**Q：改了 CSS 但页面没变化？**
A：先确认改的是 `web/style.css`（现在只有这一份样式文件了），再 `Ctrl + F5` 强制刷新。线上还要等一次部署跑完（约 1～3 分钟）。

**Q：可以删掉 `script.js` 吗？**
A：可以。删掉之后页面照样能用，只是少了滚动淡入、导航高亮和复制邮箱这三个效果 —— 我在代码里做了保护，JS 不工作时内容不会消失。

---

*用 HTML / CSS / JavaScript 手写，没有用任何框架。*
