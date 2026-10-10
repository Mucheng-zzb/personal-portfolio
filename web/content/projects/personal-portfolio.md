---
title: 个人作品集 v0.1
status: done
date: 2026-10-11
tags: [HTML, CSS, JavaScript, 响应式布局, GitHub Pages]
summary: 就是你现在正在看的这个页面。用纯 HTML + CSS + JavaScript 手写， 没有框架、没有依赖，手机和电脑都能正常显示，已部署到 GitHub Pages。 做它的目的是把「结构 / 样式 / 交互」这三件事从头到尾走一遍。
repo: https://github.com/Mucheng-zzb/personal-portfolio
live: https://mucheng-zzb.github.io/personal-portfolio/
featured: true
order: 1
---

## 背景

我想有一个能放自己东西的地方，而不是只把笔记散落在本地。这也是我的第一个前端项目，
所以目标不是做得花哨，而是借它把「一个网页从无到有、再到公网可访问」这条路完整走一遍。

## 做了什么

一个单页响应式的个人主页，包含首屏、关于我、技能、项目、近况、联系六个板块。
交互有三个：内容滚动到视野里时淡入、导航栏高亮当前所在板块、「复制邮箱」按钮。

写完之后又做了一轮工程化迁移：把文件搬进 `web/` 用 Vite 打包，
再接入 GitHub Actions —— 现在 push 到 `main` 就会自动构建并发布，
线上始终是构建产物，而不是手写的源文件。

## 技术栈

原生 HTML / CSS / JavaScript（不用框架），Vite 只负责打包，GitHub Actions 负责部署，
托管在 GitHub Pages。

## 难点

最坑的是**子路径**。线上地址是 `https://mucheng-zzb.github.io/personal-portfolio/`，
页面挂在 `/personal-portfolio/` 下面，不是域名根目录。Vite 的 `base` 漏写这一行，
构建照样成功，但线上直接白屏 + 控制台一片 404 —— 而且本地开发完全看不出来。

第二个难点是**迁移期间不能让线上断**：Pages 原本是「从分支根目录部署」的，
如果直接把根目录的文件删掉搬走，线上会立刻 404。最后的做法是根目录先留一份只读的保活副本，
等自动部署打通、并确认线上真的由构建产物提供之后，再删副本。

## 收获

走通了「结构 / 样式 / 交互」这三件事，也走通了「构建 / 部署 / 回滚」这三件事。
比起做出一个页面，更值钱的是知道了**怎么判断改动有没有真的生效** ——
不看构建日志、不去比对线上 HTML，就很容易把「跑绿了」当成「上线了」。
