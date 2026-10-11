/**
 * 契约测试的「另一半」：用 **Node 真跑一次前端的校验器**，
 * 把 JS 侧的期望值固化成 fixture_js.json。
 *
 * 为什么要有这个文件：
 *   Python 侧的解析规则是照 content-schema.js 重写的（JS 进程 import 不进 Python）。
 *   「两份实现是否一致」不能靠人读代码点头 —— 得让 JS 那边把答案写下来，
 *   再由 pytest 拿同一份 web/content 跑 Python 侧，逐字段比对。
 *
 * 用法（在仓库根目录）：
 *   node api/tests/contract/regen_fixture.mjs
 *   —— 本文件只把 JSON 吐到 stdout，落盘交给 regen_fixture.mjs（它明确按 UTF-8 写，
 *      不经过 shell）。**别写成 `make_fixture.mjs > fixture_js.json`**：PowerShell 的 `>`
 *      会把文件写成 UTF-16/BOM，之后 pytest 读它报 UnicodeDecodeError。
 *      单独跑本文件只适合用眼睛看一眼输出，不要拿它落盘。
 *
 * 什么时候要重跑：
 *   · 改了 web/content/** —— fixture 过期，契约测试会红（这是它该做的事）；
 *   · 改了 web/build/content-schema.js 的字段表或排序规则。
 * 不许手改 fixture：它是「Node 的输出」，不是人写的期望。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateContent } from '../../../web/build/content-schema.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const contentDir = path.join(repoRoot, 'web', 'content');

/** 绝对路径 → 相对仓库根的正斜杠路径（与 content-plugin.js 的 rel() 一致） */
const rel = (abs) => path.relative(repoRoot, abs).split(path.sep).join('/');

const readJson = (name) => {
  const abs = path.join(contentDir, name);
  if (!fs.existsSync(abs)) return null;
  return { path: rel(abs), text: fs.readFileSync(abs, 'utf8') };
};

const readMarkdown = (dir) => {
  const absDir = path.join(contentDir, dir);
  if (!fs.existsSync(absDir)) return [];
  return fs
    .readdirSync(absDir)
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .sort()
    .map((name) => {
      const abs = path.join(absDir, name);
      return { path: rel(abs), text: fs.readFileSync(abs, 'utf8') };
    });
};

const files = {
  profile: readJson('profile.json'),
  now: readJson('now.json'),
  projects: readMarkdown('projects'),
  notes: readMarkdown('notes'),
};

const { data, errors } = validateContent(files);

if (errors.length) {
  // 校验都没过就别生成 fixture：拿坏数据当「期望」比没有期望更糟
  console.error(`[contract] content-schema.js 校验未通过，共 ${errors.length} 处：`);
  for (const entry of errors) {
    console.error(`  ✗ ${entry.path}`);
    for (const message of entry.messages) console.error(`      · ${message}`);
  }
  process.exit(1);
}

process.stdout.write(
  JSON.stringify(
    {
      _note:
        '由 make_fixture.mjs 自动生成，请勿手改。它是 Node 跑 content-schema.js 的原始输出，' +
        '契约测试拿它当 JS 侧的期望值。',
      _generated_by: 'node api/tests/contract/make_fixture.mjs',
      _sources: {
        projects: files.projects.map((f) => f.path),
        notes: files.notes.map((f) => f.path),
        profile: files.profile?.path ?? null,
        now: files.now?.path ?? null,
      },
      data,
    },
    null,
    2,
  ) + '\n',
);
