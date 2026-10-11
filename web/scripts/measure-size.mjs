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
//   # 体积门禁（CI 用；阈值只从命令行来，脚本不内置"当前预算"：
//   # 预算写在 ARCHITECTURE §4，改预算应该是改调用方一处，而不是改两处）
//   node web/scripts/measure-size.mjs \
//     --max-js-kb 150 --max-css-kb 40 --warn-js-kb 80
//
// 门禁语义：
//   --max-*-kb   硬线，越线 → 退出码 2（CI 失败）
//   --warn-js-kb 预警线，越线只打 ::warning:: 注解，不影响退出码
//   不给任何阈值参数 = 纯报告，永远退出 0（BASELINE 抄数字就用这种跑法）
//
// 退出码：0 = 量到了（且门禁全过）；1 = 找不到产物（先跑 `npm run build`）；2 = 越硬线。

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

// 取一个 `--flag <number>`。没给 → null（= 不检查这一项）。给了个不是数字的值 →
// 直接报错退出：静默地把 "--max-js-kb 1O0"（字母 O）当成"没设阈值"，等于门禁悄悄消失。
function numberFlag(name) {
  const at = process.argv.indexOf(name);
  if (at === -1) return null;
  const raw = process.argv[at + 1];
  const value = Number(raw);
  if (raw === undefined || raw.trim() === '' || !Number.isFinite(value)) {
    console.error(`${name} 需要一个数字，收到的是 ${JSON.stringify(raw)}。`);
    process.exit(1);
  }
  return value;
}

const THRESHOLDS = {
  js: { max: numberFlag('--max-js-kb'), warn: numberFlag('--warn-js-kb') },
  css: { max: numberFlag('--max-css-kb'), warn: numberFlag('--warn-css-kb') },
};

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

// ---- 体积门禁 ----
// 打印格式踩过的坑：GitHub Actions 只认行首的 `::warning::` / `::error::`，
// 前面加空格或缩进都会退化成普通文本（注解就不显示了）。
const breaches = [];
for (const kind of ['js', 'css']) {
  const { max, warn } = THRESHOLDS[kind];
  const actual = result[kind].gzipKb;

  if (warn !== null && actual > warn) {
    // 预警线不是装饰：D19 定的 80 KB 是"该把笔记渲染器拆成动态 import"的信号线。
    const msg = `首屏 ${kind.toUpperCase()} ${actual} KB 越过预警线 ${warn} KB（D19：该做懒加载了）`;
    console.error(`::warning::${msg}`);
    console.error(`⚠️  ${msg}`);
  }

  if (max !== null && actual > max) {
    const msg = `首屏 ${kind.toUpperCase()} ${actual} KB 超出硬线 ${max} KB`;
    console.error(`::error::${msg}`);
    console.error(`❌ ${msg}`);
    breaches.push(msg);
  }
}

if (breaches.length > 0) {
  console.error(
    '\n体积门禁未通过。预算见 docs/ARCHITECTURE.md §4，当前基线见 docs/BASELINE.md §2。',
  );
  process.exit(2);
}

if (THRESHOLDS.js.max !== null || THRESHOLDS.css.max !== null) {
  console.error(
    `\n体积门禁通过：JS ${result.js.gzipKb} KB / CSS ${result.css.gzipKb} KB` +
      `（硬线 ${THRESHOLDS.js.max ?? '－'} / ${THRESHOLDS.css.max ?? '－'} KB）。`,
  );
}
