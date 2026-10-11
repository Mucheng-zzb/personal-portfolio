/**
 * 构建期内容校验 —— 纯函数：不 import vite，也不碰文件系统。
 *
 * 为什么单独一个文件：以后要给校验逻辑写单测，不能把它绑死在 Vite 插件里。
 * 文件内容由调用方读好传进来，这里只负责「判断 + 生成报错文案」。
 *
 * 改动时别破坏的三条：
 *   1. 一次收集全部问题再返回，不要遇到第一个错就 return（否则你改一处、
 *      重建一次、再发现下一处，来回折腾）。
 *   2. 未知字段一律【报错】而不是 warning —— 拼错 sumary: 必须当场构建失败。
 *   3. 新增内容集合（v0.3 的 notes/）往下面 MD_COLLECTIONS 表里加一项即可，
 *      校验引擎本身不用动；draft 之类的排除逻辑走同一张表上的 filter 钩子。
 */

import { parse as parseYaml } from 'yaml';

export const PROJECT_STATUS = ['done', 'wip', 'planned'];
export const NOW_STATUS = ['doing', 'planned', 'done'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_HINT = '期望 YYYY-MM-DD，例：2026-10-20';

/* ============================================================
   1. 类型判断小工具
   ============================================================ */

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFilled = (v) => typeof v === 'string' && v.trim() !== '';

/** 把值描述成报错里要用的中文，例如 字符串「Python」 */
function describe(v) {
  if (Array.isArray(v)) return '数组';
  if (v === null) return 'null';
  if (typeof v === 'string') return `字符串「${v}」`;
  if (typeof v === 'number') return `数字 ${v}`;
  if (typeof v === 'boolean') return `布尔值 ${v}`;
  return typeof v;
}

/** 格式对、但日子不真实（2026-02-30）也算错 */
function isRealDate(v) {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const isNonEmptyStringArray = (v) => Array.isArray(v) && v.length > 0 && v.every(isFilled);
const isHttpUrl = (v) => isFilled(v) && /^https?:\/\//.test(v);

/* ============================================================
   2. 字段检查词表
   每条告诉校验器两件事：怎么算合法、报错时该写「期望什么」。
   ============================================================ */

function checkField(value, spec) {
  const { kind, expected, values } = spec;

  switch (kind) {
    case 'enum': {
      if (typeof value === 'string' && values.includes(value)) return null;
      return `非法值「${value}」（允许：${values.join(' | ')}）`;
    }
    case 'date': {
      if (isRealDate(value)) return null;
      if (typeof value === 'string' && DATE_RE.test(value)) {
        return `不是真实存在的日期「${value}」（${DATE_HINT}）`;
      }
      return `日期格式错误「${value}」（${DATE_HINT}）`;
    }
    case 'nonEmptyStringArray': {
      if (isNonEmptyStringArray(value)) return null;
      if (Array.isArray(value)) {
        const bad = value.findIndex((item) => !isFilled(item));
        const where = bad === -1 ? '数组不能为空' : `第 ${bad + 1} 项不是非空字符串`;
        return `期望非空字符串数组，实际${where}`;
      }
      return `期望非空字符串数组，实际是${describe(value)}`;
    }
    case 'nonEmptyString': {
      if (isFilled(value)) return null;
      if (value === undefined) return `缺少必填字段（期望：${expected || '非空字符串'}）`;
      return `期望${expected || '非空字符串'}，实际是${describe(value)}`;
    }
    case 'email': {
      if (isFilled(value) && value.includes('@')) return null;
      if (value === undefined) return '缺少必填字段（期望：含 @ 的非空字符串）';
      if (!isFilled(value)) return `期望含 @ 的非空字符串，实际是${describe(value)}`;
      return `期望含 @ 的非空字符串，实际是${describe(value)}（缺少 @）`;
    }
    case 'httpsString': {
      if (isFilled(value) && value.startsWith('https://')) return null;
      if (value === undefined) return '缺少必填字段（期望：以 https:// 开头的字符串）';
      return `期望以 https:// 开头的字符串，实际是${describe(value)}`;
    }
    case 'number': {
      if (typeof value === 'number' && Number.isFinite(value)) return null;
      return `期望数字，实际是${describe(value)}`;
    }
    case 'boolean': {
      if (typeof value === 'boolean') return null;
      return `期望布尔值 true / false，实际是${describe(value)}`;
    }
    case 'httpUrl': {
      if (isHttpUrl(value)) return null;
      return `期望以 https:// 开头的链接，实际是${describe(value)}`;
    }
    case 'coverPath': {
      if (isFilled(value) && value.startsWith('/')) return null;
      return `期望以 / 开头的站内路径（例：/images/cover.webp），实际是${describe(value)}`;
    }
    default:
      return null;
  }
}

/**
 * 通用字段块校验：必填缺失 → 报错；未知字段 → 报错；可选字段给了就要合法。
 * 返回报错文案数组。
 */
function checkFields(obj, { required, optional }, msgs) {
  const known = new Set([...Object.keys(required), ...Object.keys(optional)]);

  // ① 未知字段（拼错字段名在这里被抓住）
  for (const key of Object.keys(obj)) {
    if (!known.has(key)) {
      msgs.push(`${key}: 未知字段（本项目允许的字段：${[...known].join(' / ')}）`);
    }
  }

  // ② 必填
  for (const [key, spec] of Object.entries(required)) {
    const msg = checkField(obj[key], spec);
    if (msg) msgs.push(`${key}: ${msg}`);
  }

  // ③ 可选（缺省直接跳过；给了就得合法）
  for (const [key, spec] of Object.entries(optional)) {
    if (obj[key] === undefined) continue;
    const msg = checkField(obj[key], spec);
    if (msg) msgs.push(`${key}: ${msg}`);
  }
}

/* ============================================================
   3. front-matter 解析
   不用 gray-matter：它走 js-yaml（YAML 1.1），date: 2026-10-20 会被解析成
   JS Date 对象，序列化后变成 UTC 时间戳，埋时区 bug。
   这里的 yaml 包按 YAML 1.2 core 解析，得到的是【字符串】。
   ============================================================ */

/**
 * @returns {{ data: object|null, body: string, error: string|null }}
 *   error 已经带上「第 N 行第 M 列」的文件内坐标。
 *   body 是闭合 --- 之后的正文（去掉首尾空行）。笔记详情要渲染它，
 *   所以从 v0.3-A 起这里不再丢弃正文；projects 不受影响（它不读 body）。
 */
export function parseFrontMatter(text) {
  // 先去 BOM，再把 CRLF / 孤立 CR 统一成 LF。
  // 不统一的话，front-matter 的【最后一行】会带着 \r 进入 YAML 标量
  // （中间行没事：它们的 \r 后面跟着 \n，是一个完整的换行符，YAML 会吃掉），
  // 于是 `draft: false` 会被解析成字符串 "false\r" 而不是布尔值。
  // 这在 Windows 上写出来的文件里是常态，不是异常输入。
  const src = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

  if (!src.startsWith('---')) {
    return { data: null, body: '', error: '文件必须以 --- 开头（front-matter 分隔符）' };
  }

  const afterOpen = src.indexOf('\n');
  if (afterOpen === -1) {
    return { data: null, body: '', error: '只有开头的 --- ，找不到结束的 ---' };
  }

  // 找结束分隔符：单独占一行的 ---
  const rest = src.slice(afterOpen + 1);
  const lines = rest.split('\n');
  let endIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) {
    return { data: null, body: '', error: '找不到结束的 ---（front-matter 没有闭合）' };
  }

  const yamlText = lines.slice(0, endIndex).join('\n');
  const body = lines
    .slice(endIndex + 1)
    .join('\n')
    .trim();

  let data;
  try {
    data = parseYaml(yamlText);
  } catch (err) {
    return { data: null, body, error: `front-matter YAML 解析失败：${formatYamlError(err)}` };
  }

  if (!isObject(data)) {
    return { data: null, body, error: 'front-matter 必须是一组 key: value，不能是标量或列表' };
  }
  return { data, body, error: null };
}

function formatYamlError(err) {
  const linePos = err && err.linePos && err.linePos[0];
  // yaml 的报错行号是相对 front-matter 内容的；文件里第一行是 ---，所以要 +1
  const where = linePos ? `第 ${linePos.line + 1} 行第 ${linePos.col} 列 —— ` : '';
  const reason = String(err && err.message ? err.message : err)
    .split('\n')[0]
    .replace(/ at line \d+, column \d+.*$/, '')
    .trim();
  return `${where}${reason}`;
}

/**
 * 文件名 / 相对路径 → slug。
 *   'data-toolkit.md'                      → 'data-toolkit'
 *   'web/content/notes/data-toolkit.md'    → 'data-toolkit'
 *
 * 一定要先丢掉目录部分：slug 是【路由用的标识】（#/notes/<slug>），
 * 带着 web/content/notes/ 前缀的话，URL 会变成 #/notes/web/content/notes/x，
 * 在 router 里被切成 5 段而匹配不上任何路由，点了链接会掉回首页。
 */
export function slugFromFilename(filename) {
  const base = String(filename).slice(String(filename).lastIndexOf('/') + 1);
  return base.replace(/\.md$/i, '');
}

/* ============================================================
   4. 集合声明表
   v0.3 加 notes/ 时：往这里加一项 + 在 content-plugin.js 的扫描列表里加一行。
   filter 钩子用于构建期排除（例如 notes 的 draft: true）。
   ============================================================ */

const PROJECT_FIELDS = {
  required: {
    title: { kind: 'nonEmptyString', expected: '非空字符串' },
    status: { kind: 'enum', values: PROJECT_STATUS },
    date: { kind: 'date' },
    tags: { kind: 'nonEmptyStringArray' },
    summary: { kind: 'nonEmptyString', expected: '非空字符串' },
    order: { kind: 'number' },
  },
  optional: {
    repo: { kind: 'httpUrl' },
    live: { kind: 'httpUrl' },
    cover: { kind: 'coverPath' },
    featured: { kind: 'boolean' },
  },
};

const NOTES_FIELDS = {
  required: {
    title: { kind: 'nonEmptyString', expected: '非空字符串' },
    date: { kind: 'date' },
    tags: { kind: 'nonEmptyStringArray' },
    summary: { kind: 'nonEmptyString', expected: '非空字符串' },
  },
  optional: {
    draft: { kind: 'boolean' },
  },
};

export const MD_COLLECTIONS = {
  projects: {
    dir: 'web/content/projects',
    fields: PROJECT_FIELDS,
    // 排序保证输出确定：order 升序 → date 降序 → title 升序
    sort: (a, b) =>
      a.order - b.order ||
      String(b.date).localeCompare(String(a.date)) ||
      String(a.title).localeCompare(String(b.title), 'zh'),
    filter: null,
  },
  notes: {
    dir: 'web/content/notes',
    fields: NOTES_FIELDS,
    // 笔记详情要渲染正文，所以这一集合把 body 一起带到前端；
    // projects 不设这个标志，负载因此逐字节不变。
    withBody: true,
    // 排序保证输出确定：date 降序（新的在前）→ title 升序兜底
    sort: (a, b) =>
      String(b.date).localeCompare(String(a.date)) ||
      String(a.title).localeCompare(String(b.title), 'zh'),
    // 草稿在构建期就排除，永远不进产物（v0.3-A 的硬性要求）。
    // 注意：filter 在校验之前执行，所以草稿里的字段拼错不会当场报错 ——
    // 这是有意的，草稿不该受构建约束。
    filter: (fm) => fm.draft !== true,
  },
};

/* ============================================================
   5. 各集合的校验函数
   ============================================================ */

const PROFILE_REQUIRED = {
  name: { kind: 'nonEmptyString', expected: '非空字符串' },
  tagline: { kind: 'nonEmptyString', expected: '非空字符串' },
  email: { kind: 'email', expected: '含 @ 的非空字符串' },
  github: { kind: 'httpsString', expected: '以 https:// 开头的字符串' },
  heroChips: { kind: 'nonEmptyStringArray' },
  about: { kind: 'nonEmptyStringArray' },
  learning: { kind: 'nonEmptyStringArray' },
  skills: { kind: 'skills' },
};

const PROFILE_OPTIONAL = {
  location: { kind: 'plainString' },
  resume: { kind: 'plainString' },
  contactNote: { kind: 'nonEmptyString', expected: '非空字符串' },
  footerNote: { kind: 'nonEmptyString', expected: '非空字符串' },
};

function validateProfile(root, relPath) {
  const entry = { path: relPath, messages: [] };
  if (!isObject(root)) {
    entry.messages.push(`顶层: 期望一个 JSON 对象，实际是${describe(root)}`);
    return entry;
  }

  // email / github 的 expected 文案要更具体，单独补两条
  const known = new Set([...Object.keys(PROFILE_REQUIRED), ...Object.keys(PROFILE_OPTIONAL)]);
  for (const key of Object.keys(root)) {
    if (!known.has(key)) {
      entry.messages.push(`${key}: 未知字段（本项目允许的字段：${[...known].join(' / ')}）`);
    }
  }

  for (const key of Object.keys(PROFILE_REQUIRED)) {
    if (key === 'skills') continue; // 下面单独处理
    const spec = PROFILE_REQUIRED[key];
    if (root[key] === undefined) {
      entry.messages.push(`${key}: 缺少必填字段（期望：${spec.expected}）`);
      continue;
    }
    const msg = checkField(root[key], spec);
    if (msg) entry.messages.push(`${key}: ${msg}`);
  }

  // learning 专门的提示语（空数组时告诉他删掉这个字段，而不是留个空壳）
  if (Array.isArray(root.learning) && root.learning.length === 0) {
    const i = entry.messages.findIndex((m) => m.startsWith('learning:'));
    const msg = 'learning: 期望非空字符串数组；暂时没有在学的内容请删除该字段';
    if (i === -1) entry.messages.push(msg);
    else entry.messages[i] = msg;
  }

  // skills: [{ title, items[] }]
  if (root.skills === undefined) {
    entry.messages.push('skills: 缺少必填字段（期望：数组，每项 { title, items }）');
  } else if (!Array.isArray(root.skills) || root.skills.length === 0) {
    entry.messages.push(`skills: 期望非空数组，实际是${describe(root.skills)}`);
  } else {
    root.skills.forEach((group, gi) => {
      const at = `skills[${gi}]`;
      if (!isObject(group)) {
        entry.messages.push(`${at}: 期望 { title, items }，实际是${describe(group)}`);
        return;
      }
      const extra = Object.keys(group).filter((k) => k !== 'title' && k !== 'items');
      for (const k of extra) entry.messages.push(`${at}.${k}: 未知字段（只允许 title / items）`);
      if (!isFilled(group.title)) {
        entry.messages.push(`${at}.title: 期望非空字符串，实际是${describe(group.title)}`);
      }
      if (!isNonEmptyStringArray(group.items)) {
        entry.messages.push(`${at}.items: 期望非空字符串数组，实际是${describe(group.items)}`);
      }
    });
  }

  // 可选字段
  for (const key of Object.keys(PROFILE_OPTIONAL)) {
    const v = root[key];
    if (v === undefined) continue;
    if (typeof v !== 'string') {
      entry.messages.push(`${key}: 期望字符串，实际是${describe(v)}`);
    }
  }

  return entry;
}

function validateNow(root, relPath) {
  const entry = { path: relPath, messages: [] };
  if (!Array.isArray(root)) {
    entry.messages.push(`顶层: 期望一个数组，实际是${describe(root)}`);
    return entry;
  }

  root.forEach((item, i) => {
    const at = (key) => `[${i}].${key}`;
    if (!isObject(item)) {
      entry.messages.push(`[${i}]: 期望 { text, date, status }，实际是${describe(item)}`);
      return;
    }
    const known = new Set(['text', 'date', 'status']);
    for (const k of Object.keys(item)) {
      if (!known.has(k)) entry.messages.push(`${at(k)}: 未知字段（只允许 text / date / status）`);
    }
    if (item.text === undefined) {
      entry.messages.push(`${at('text')}: 缺少必填字段（期望：非空字符串）`);
    } else if (!isFilled(item.text)) {
      entry.messages.push(`${at('text')}: 期望非空字符串，实际是${describe(item.text)}`);
    }
    if (item.date === undefined) {
      entry.messages.push(`${at('date')}: 缺少必填字段（期望：${DATE_HINT}）`);
    } else {
      const msg = checkField(item.date, { kind: 'date' });
      if (msg) entry.messages.push(`${at('date')}: ${msg}`);
    }
    if (item.status === undefined) {
      entry.messages.push(`${at('status')}: 缺少必填字段（期望：doing | planned | done）`);
    } else {
      const msg = checkField(item.status, { kind: 'enum', values: NOW_STATUS });
      if (msg) entry.messages.push(`${at('status')}: ${msg}`);
    }
  });

  return entry;
}

function validateMarkdownFile(collection, file, parsed) {
  const relPath = file.path;
  const entry = { path: relPath, messages: [] };

  if (parsed.error) {
    entry.messages.push(parsed.error);
    return entry;
  }

  const filename = relPath.slice(relPath.lastIndexOf('/') + 1);
  const slug = slugFromFilename(filename);

  if (!KEBAB_RE.test(slug)) {
    entry.messages.push(
      `文件名: 必须是 kebab-case（小写字母、数字、连字符），实际是「${filename}」`,
    );
  }

  checkFields(parsed.data, collection.fields, entry.messages);
  return entry;
}

/* ============================================================
   6. 主入口
   ============================================================ */

/**
 * @param {object} files
 *   {
 *     profile: { path, text } | null,
 *     now:     { path, text } | null,
 *     projects: [{ path, text }, ...],
 *     notes:    [{ path, text }, ...],
 *   }
 * @param {object} [options]
 *   options.filters[kind](frontMatter, file) → false 表示该条不进 data、也不校验
 *   （notes 的 draft 排除走 MD_COLLECTIONS 里的 filter，不走这里）
 * @returns {{ data: object, errors: Array<{path: string, messages: string[]}> }}
 */
export function validateContent(files, options = {}) {
  const filters = options.filters || {};
  const errors = [];
  const data = { profile: null, now: null, projects: [], notes: [] };

  // ---- 6.1 markdown 集合（projects / notes）----
  for (const [kind, collection] of Object.entries(MD_COLLECTIONS)) {
    const list = files[kind] || [];
    const kept = [];

    // slug 去重按集合各自做：slug 只在同一个集合里才是命名空间
    // （路由上也是分开的：#/notes/<slug> 与项目卡互不相干）。
    // 放在循环外会让「笔记与项目同名」直接构建失败。
    const seenSlugs = new Map();

    for (const file of list) {
      const parsed = parseFrontMatter(file.text);

      // filter 钩子：把 notes 的 draft 挡在构建产物之外
      const filter = filters[kind] || collection.filter;
      if (typeof filter === 'function' && parsed.data && filter(parsed.data, file) === false) {
        continue;
      }

      const entry = validateMarkdownFile(collection, file, parsed);
      if (entry.messages.length) errors.push(entry);

      // slug 去重（同集合内两个文件推出同一 slug 是错误）
      const slug = slugFromFilename(file.path);
      if (parsed.data && !parsed.error && seenSlugs.has(slug)) {
        errors.push({
          path: file.path,
          messages: [`文件名: slug「${slug}」与 ${seenSlugs.get(slug)} 重复`],
        });
      } else if (parsed.data) {
        seenSlugs.set(slug, file.path);
      }

      if (parsed.data) {
        // 只有声明了 withBody 的集合才带正文，避免 projects 的负载跟着变大
        kept.push(
          collection.withBody
            ? { slug, ...parsed.data, body: parsed.body }
            : { slug, ...parsed.data },
        );
      }
    }

    if (!list.length) {
      // 目录为空只提示，不算错误
      console.log(`[content] ${collection.dir}/ 下没有 .md 文件，跳过（不算错误）`);
    }

    data[kind] = collection.sort ? kept.sort(collection.sort) : kept;
  }

  // ---- 6.2 now.json ----
  if (files.now) {
    const parsed = parseJsonFile(files.now.text);
    if (parsed.error) {
      errors.push({ path: files.now.path, messages: [parsed.error] });
    } else {
      const entry = validateNow(parsed.data, files.now.path);
      if (entry.messages.length) errors.push(entry);
      else data.now = parsed.data;
    }
  }

  // ---- 6.3 profile.json ----
  if (files.profile) {
    const parsed = parseJsonFile(files.profile.text);
    if (parsed.error) {
      errors.push({ path: files.profile.path, messages: [parsed.error] });
    } else {
      const entry = validateProfile(parsed.data, files.profile.path);
      if (entry.messages.length) errors.push(entry);
      else data.profile = parsed.data;
    }
  }

  return { data, errors };
}

/** JSON 解析，语法错误要带行列号 */
export function parseJsonFile(text) {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  try {
    return { data: JSON.parse(src), error: null };
  } catch (err) {
    return { data: null, error: `JSON 解析失败：${formatJsonError(err, src)}` };
  }
}

function formatJsonError(err, src) {
  const raw = String(err.message);
  // 现代 V8 的消息形如：Expected ',' or '}' ... in JSON at position 123 (line 7 column 3)
  const withPos = /^(.*?) in JSON at position (\d+)(?: \(line (\d+) column (\d+)\))?$/.exec(raw);
  if (withPos) {
    const [, reason, pos, line, col] = withPos;
    if (line && col) return `第 ${line} 行第 ${col} 列 —— ${reason}`;
    const before = src.slice(0, Number(pos)).split('\n');
    return `第 ${before.length} 行第 ${before[before.length - 1].length + 1} 列 —— ${reason}`;
  }
  return raw;
}

/* ============================================================
   7. 报错输出格式
   ============================================================ */

/**
 * 把 errors 拼成人能直接照着改的文本。
 * 一次列全，不藏第二条 —— 否则要来回构建好几轮。
 */
export function formatContentErrors(errors) {
  const head = `[content] 内容校验失败，共 ${errors.length} 处问题：`;
  const body = errors
    .map((entry) => [`  ✗ ${entry.path}`, ...entry.messages.map((m) => `      · ${m}`)].join('\n'))
    .join('\n');
  const tail = `构建已中止：npm run build 退出码非 0。修好上面 ${errors.length} 处后重新构建。`;
  return `${head}\n${body}\n${tail}`;
}
