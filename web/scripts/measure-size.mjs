#!/usr/bin/env node
// 量「首屏三件」（index.html + 入口 JS + 入口 CSS）的 gzip 体积，输出 JSON。
//
// 为什么要有这个脚本：`docs/BASELINE.md` 里的每条体积记录，过去都是作者手工跑一段
// 一次性 `node -e` 命令抄下来的。手抄的后果有两个 —— 数字没有统一出口（谁都能用不同
// 口径算出不同结果），以及 CI 里没法比对（没有可解析的输出）。这个脚本把口径固定下来。
//
// 口径（改动即等于作废历史数字，不要动）：
//   1) 压缩器用 Node 内置 zlib.gzipSync —— `gzip` 命令行会把文件名与 mtime 写进头部，
//      同一份文件每次跑出来的字节数都可能不同，数字不可比。
//   2) KB = 字节 / 1024（不是 1000）—— 与 BASELINE 表里的历史数字保持一致。
//      ⚠️ Vite 构建日志里的 gzip 尺寸用的是 kB(1000)，所以两者数值不同、不可混用。
//   3) 「首屏」= dist/index.html 真正引用的那一个 JS + 一个 CSS，不是 assets/ 里所有文件。
//      照目录扫的话，将来做了代码分割会把懒加载的 chunk 全算进来，虚报首屏。
//
// 输出字段与 BASELINE 的表列一一对应：gzipKb（gzip 后 KB）+ bytes（原始字节）。
// 合计行的 bytes 是三者原始字节之和（BASELINE 合计行同此口径）。
//
// 用法（在仓库根或 web/ 下都行）：
//   node web/scripts/measure-size.mjs             # stdout 一份 JSON
//   node web/scripts/measure-size.mjs --pretty    # 追加一份人读的表到 stderr
//
// 退出码：0 = 量到了；1 = 找不到产物（先跑 `npm run build`）。

import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// 脚本在 web/scripts/，产物在 web/dist/ —— 用脚本自身的位置定位，不依赖 cwd。
const WEB_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST_DIR = join(WEB_DIR, 'dist');
const HTML_PATH = join(DIST_DIR, 'index.html');

const pretty = process.argv.includes('--pretty');
const round2 = (n) => Math.round(n * 100) / 100;

if (!existsSync(HTML_PATH)) {
  console.error(`找不到 ${HTML_PATH}。先在 web/ 下跑一次 \`npm run build\`。`);
  process.exit(1);
}

function measure(absPath) {
  const raw = readFileSync(absPath);
  const gzipped = gzipSync(raw);
  return {
    file: relative(DIST_DIR, absPath).split('\\').join('/'),
    gzipBytes: gzipped.length,
    gzipKb: round2(gzipped.length / 1024),
    bytes: raw.length,
  };
}

const html = readFileSync(HTML_PATH, 'utf8');

// Vite 产出形如 <script type="module" crossorigin src="/personal-portfolio/assets/index-XXXX.js">，
// href 同理。这里只认 assets/ 下带哈希的入口文件 —— 认不出来就如实报错，不猜。
function findAsset(kind) {
  const pattern =
    kind === 'js'
      ? /<script[^>]+src="([^"]*assets\/index-[^"]+\.js)"/
      : /<link[^>]+rel="stylesheet"[^>]+href="([^"]*assets\/index-[^"]+\.css)"/;

  const match = html.match(pattern);
  if (!match) {
    console.error(`index.html 里找不到入口 ${kind.toUpperCase()}（assets/index-*.${kind}）。`);
    console.error('产物结构可能变了。改这里之前先确认真的不再需要量这一项。');
    process.exit(1);
  }
  // 引用里带 base 前缀（/personal-portfolio/assets/...），从 assets/ 开始截，
  // 前缀无论叫什么都能对上（写死前缀的话，base 一改就断）。
  const relPath = match[1].slice(match[1].indexOf('assets/'));
  return join(DIST_DIR, ...relPath.split('/'));
}

const result = {
  html: measure(HTML_PATH),
  js: measure(findAsset('js')),
  css: measure(findAsset('css')),
};

// 合计只加 gzip 才代表首屏传输量；原始字节之和照抄 BASELINE 合计行的口径。
const parts = [result.html, result.js, result.css];
result.total = {
  gzipBytes: parts.reduce((s, p) => s + p.gzipBytes, 0),
  gzipKb: round2(parts.reduce((s, p) => s + p.gzipKb, 0)),
  bytes: parts.reduce((s, p) => s + p.bytes, 0),
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');

if (pretty) {
  const row = (label, name, gzip, bytes) =>
    `${label.padEnd(6)}${name.padEnd(40)}${(gzip + ' KB').padStart(10)}${(bytes + ' B').padStart(12)}`;
  console.error('\n首屏体积（zlib.gzipSync；KB = 字节 / 1024）\n');
  console.error(row('', '文件', 'gzip', '原始'));
  for (const key of ['html', 'js', 'css']) {
    const m = result[key];
    console.error(row(key.toUpperCase(), m.file, m.gzipKb, m.bytes));
  }
  console.error(row('', '合计', result.total.gzipKb, result.total.bytes));
}
