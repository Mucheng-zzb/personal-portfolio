# 个人主页 v1

我的第一个项目：一个单页响应式的个人主页。

**技术栈**：纯 HTML + CSS + JavaScript。没有框架、没有依赖、不需要构建工具 —— 双击 `index.html` 就能看到效果。

---

## 目录

- [文件结构](#文件结构)
- [本地打开](#本地打开)
- [改成你自己的内容](#改成你自己的内容)
- [部署到 GitHub Pages](#部署到-github-pages)
- [下一步可以加什么](#下一步可以加什么)
- [常见问题](#常见问题)

---

## 文件结构

```
personal-portfolio/
├── index.html    页面结构（内容都写在这里）
├── style.css     所有样式（颜色、字体、间距、响应式）
├── script.js     交互（滚动淡入、导航高亮、复制邮箱…）
└── README.md     就是这个文件
```

就这四个文件，没有别的。部署的时候整个文件夹传上去就行。

---

## 本地打开

### 方式一：直接双击（最简单）

打开 `personal-portfolio` 文件夹，双击 **`index.html`**，浏览器就会打开它。

> 地址栏显示的是 `file:///C:/Users/...` 开头，这是正常的 —— 说明页面直接在本地运行，不需要服务器。

### 方式二：用 VS Code + Live Server（写代码时推荐）

改代码时能自动刷新，不用手动按 F5。

1. 用 VS Code 打开这个文件夹（`文件 → 打开文件夹`）
2. 左侧扩展面板搜索 **Live Server** 并安装
3. 右键 `index.html` → **Open with Live Server**

**怎么检查手机上的效果**：在浏览器里按 `F12` 打开开发者工具，点左上角的手机图标（或按 `Ctrl + Shift + M`），就能切换到手机尺寸预览。

---

## 改成你自己的内容

### 已经填好的（不用再动）

名字「周同学」、首屏一句话介绍、GitHub 链接（`Mucheng-zzb`）、邮箱（`254180649@qq.com`）、
页脚署名、浏览器标题 —— 这些都已经换成你的真实信息了。

### 还需要你改的（3 处）

`index.html` 里剩下的地方都用 `TODO` 注释标出来了。**用编辑器搜索 `TODO` 就能全部找到**：

| 编号 | 要改什么 | 大概在文件哪里 |
| :--- | :--- | :--- |
| TODO 1 | About 的自我介绍（我按你给的信息写了草稿，建议改成你自己的话） | `#about` 板块 |
| TODO 2 | 技能标签（现在填的是 Python / Node.js / SQL / Pandas 这些，改成你真正会的） | `#skills` 板块 |
| TODO 3 | 最近在做什么（这一块最需要你亲自写，也最值得定期更新） | `#now` 板块 |

以后要是想换名字、换邮箱、换 GitHub 地址，直接在 `index.html` 里搜你现在的内容就能定位到。

> **注意**：邮箱在 `#contact` 板块里出现了 **2 处** —— 显示的文字和「复制邮箱」按钮的 `data-email` 属性。
> 改的时候两个要一起改，不然按钮复制的还是旧地址。

### 几个常见操作

**加一个技能标签** —— 复制一整行然后改文字：

```html
<li class="tag">Python</li>
```

**加一个项目卡片** —— 复制 `#projects` 里任意一个 `<article class="card project project--wip">...</article>` 整段，粘在它后面再改内容。

**删掉不要的板块** —— 直接删掉整个 `<section>...</section>`，同时把页头 `<nav>` 里对应的那个链接也删掉。底部的 `01 / 02 / 03` 编号记得顺手改成连续的。

**改主题色** —— 打开 `style.css`，最上面的 `:root` 里改这两行就行，整站的蓝色渐变会一起变：

```css
--accent-1: #4f7cff;   /* 主色（蓝） */
--accent-2: #a855f7;   /* 辅色（紫） */
```

---

## 部署到 GitHub Pages

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
git commit -m "feat: 个人主页 v1"
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

v1 已经能用了，下面是往后可以一个一个加的东西，**按从易到难排的**：

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
