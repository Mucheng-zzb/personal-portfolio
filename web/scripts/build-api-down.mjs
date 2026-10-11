#!/usr/bin/env node
// 构建一份「后端地址指向死域名」的产物到 dist-api-down/，供降级冒烟测试用。
//
// 为什么单独写个脚本、而不是在 npm script 里写 `VITE_API_BASE=xxx vite build`：
// npm 在 Windows 上用 cmd.exe 跑 script，`VAR=value cmd` 这种前缀写法在那边**不成立**
// （会去找一个叫 `VITE_API_BASE=xxx` 的可执行文件）。在 Node 里设 process.env 则两边都对。

import { build } from 'vite';

// `.invalid` 是 RFC 2606 保留的顶级域，**保证**解析不出来 —— 不会像
// `example.com` 那样被某个代理/劫持页接管，从而把「连不上」变成「连上了但返回 200」。
const DEAD_API_BASE = 'https://api-down.invalid';

process.env.VITE_API_BASE = DEAD_API_BASE;

await build({
  // 用 vite.config.js（内容插件、base 都得跟着走），只覆盖产物目录。
  build: { outDir: 'dist-api-down' },
});

console.log(`已构建 dist-api-down（VITE_API_BASE=${DEAD_API_BASE}）`);
