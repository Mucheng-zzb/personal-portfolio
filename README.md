# 个人作品集

我的第一个项目：一个单页响应式的个人主页。线上地址：<https://mucheng-zzb.github.io/personal-portfolio/>

**技术栈**：原生 HTML + CSS + JavaScript + Vite（只负责打包，产物仍是纯静态文件）。没有 UI 框架，没有运行时依赖。

---

## 过渡状态

> **版本 v0.2-A（2026-10-11 起）**：仓库正在从「根目录几个文件」迁成「monorepo + 构建」。
> 迁移途中**新旧两套并存**，先看清这张表再动手。

| 位置 | 是什么 | 现状 |
| :--- | :--- | :--- |
| `web/` | **唯一开发入口**，以后所有改动都做在这里 | 已可用：`cd web && npm run dev` |
| 根目录 `index.html` / `style.css` / `script.js` | **临时保活副本，请勿编辑** | 线上目前仍由它提供（Pages 还是从 main 分支根目录部署）|
| `api/` | 后端，v0.5 才动工 | 暂时只有一份说明（`api/README.md`）|

**过渡期的三条规矩**

1. 改内容、改样式、改逻辑，**只改 `web/` 里的同名文件**，不要碰根目录副本 —— 否则两边会不一致。
2. 根目录那三个文件的顶部各加了一行 `⚠️ 临时保活副本` 注释，看到它就说明你走错地方了。
3. **v0.2-B 完成后**会删掉根目录这三件套：改成 GitHub Actions 构建 `web/dist` 再发布到 Pages。线上 URL 不变。

> **为什么现在不直接删掉？** 因为 Pages 目前是从分支根目录部署的，把文件搬走线上会**立刻 404**。
> 所以先留副本保活，等自动部署打通再删，中间不留断线 —— 这是 v0.2-A 唯一接受的取舍。

---

## 目录

- [过渡状态](#过渡状态)
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
├── web/                  前端（Vite 项目）
│   ├── index.html          页面结构
│   ├── style.css           所有样式（颜色、字体、间距、响应式）
│   ├── script.js           交互（滚动淡入、导航高亮、复制邮箱…）
│   ├── vite.config.js      构建配置（base 必须指向 Pages 的子路径）
│   ├── package.json        四个脚本：dev / build / preview / check
│   ├── node_modules/       依赖（不入库，已写进 .gitignore）
│   └── dist/               构建产物（不入库，部署时现构建）
├── api/                  后端，占位，v0.5 才动（见 api/README.md）
├── docs/                 路线图（ROADMAP）与架构文档（ARCHITECTURE）
├── index.html            ⚠️ 临时保活副本，请勿编辑
├── style.css             ⚠️ 临时保活副本，请勿编辑
├── script.js             ⚠️ 临时保活副本，请勿编辑
└── README.md             就是这个文件
```

根目录那三个只是过渡期的保活副本，**真正的工作目录是 `web/`**（原因见上面的[过渡状态](#过渡状态)）。

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

根目录那个副本双击**仍然能打开**，但它已经不是你该改的文件了（见上面的[过渡状态](#过渡状态)）。

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

### 已经填好的（不用再动）

名字「周同学」、首屏一句话介绍、GitHub 链接（`Mucheng-zzb`）、邮箱（`254180649@qq.com`）、
页脚署名、浏览器标题 —— 这些都已经换成你的真实信息了。

### 还需要你改的（3 处）

`web/index.html` 里剩下的地方都用 `TODO` 注释标出来了。**用编辑器搜索 `TODO` 就能全部找到**：

| 编号 | 要改什么 | 大概在文件哪里 |
| :--- | :--- | :--- |
| TODO 1 | About 的自我介绍（我按你给的信息写了草稿，建议改成你自己的话） | `#about` 板块 |
| TODO 2 | 技能标签（现在填的是 Python / Node.js / SQL / Pandas 这些，改成你真正会的） | `#skills` 板块 |
| TODO 3 | 最近在做什么（这一块最需要你亲自写，也最值得定期更新） | `#now` 板块 |

以后要是想换名字、换邮箱、换 GitHub 地址，直接在 `web/index.html` 里搜你现在的内容就能定位到。

> **注意**：邮箱在 `#contact` 板块里出现了 **2 处** —— 显示的文字和「复制邮箱」按钮的 `data-email` 属性。
> 改的时候两个要一起改，不然按钮复制的还是旧地址。

### 几个常见操作

**加一个技能标签** —— 复制一整行然后改文字：

```html
<li class="tag">Python</li>
```

**加一个项目卡片** —— 复制 `#projects` 里任意一个 `<article class="card project project--wip">...</article>` 整段，粘在它后面再改内容。

**删掉不要的板块** —— 直接删掉整个 `<section>...</section>`，同时把页头 `<nav>` 里对应的那个链接也删掉。底部的 `01 / 02 / 03` 编号记得顺手改成连续的。

**改主题色** —— 打开 `web/style.css`，最上面的 `:root` 里改这两行就行，整站的蓝色渐变会一起变：

```css
--accent-1: #4f7cff;   /* 主色（蓝） */
--accent-2: #a855f7;   /* 辅色（紫） */
```

---

## 部署到 GitHub Pages

> ⚠️ **这一节记录的是 v0.1 的部署方式（从 main 分支根目录部署），目前仍然生效。**
> v0.2-B 会改成 GitHub Actions 构建 `web/dist` 后自动发布，届时这一节会重写。
> 在那之前，**请不要在仓库 Settings → Pages 里改任何设置**，否则线上会挂。

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

1. 在仓库页面点 **Settings**（设置）
2. 左侧菜单找到 **Pages**
3. **Source** 选 `Deploy from a branch`
4. **Branch** 选 `main`，右边的文件夹保持 `/ (root)`，点 **Save**
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

- **网页上传**：进仓库 → 点开要改的文件 → 右上角铅笔图标 ✏️ → 改完点 **Commit changes**，等 1 分钟就生效
- **命令行**：改完文件后执行三条命令

```bash
git add .
git commit -m "更新：改了自我介绍"
git push
```

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
A：按顺序排查 ① 是不是等了 1 分钟以上 ② 仓库是不是 Public ③ 文件名是不是严格的小写 `index.html`（`Index.html` 不行）④ 文件是不是放在仓库根目录，而不是某个子文件夹里。

**Q：手机上字太小 / 太挤？**
A：`style.css` 文件末尾有三段 `@media`，管的就是手机适配。先用 F12 切到手机尺寸看一眼，再调里面的数字。

**Q：改了 CSS 但页面没变化？**
A：`Ctrl + F5` 强制刷新。还不行就检查是不是写错了文件 —— 是不是改到别的文件夹里的同名文件了。

**Q：可以删掉 `script.js` 吗？**
A：可以。删掉之后页面照样能用，只是少了滚动淡入、导航高亮和复制邮箱这三个效果 —— 我在代码里做了保护，JS 不工作时内容不会消失。

---

*用 HTML / CSS / JavaScript 手写，没有用任何框架。*
