/**
 * 笔记的三个视图：列表 / 详情 / 首页的「最近 N 篇」。
 *
 * 职责边界（docs/ARCHITECTURE.md §4）：ui/* 只做「接收数据 → 生成 DOM」，
 * 不发请求、不读文件。数据由 lib/content.js 从构建期注入的虚拟模块拿。
 *
 * 列表顺序由【构建期】排好（date 倒序，新的在前），这里不再排序 ——
 * 排序口径只有一处，避免前后端/构建期各排一次排得不一致。
 */

import { el, render, tagList } from './dom.js';
import { renderMarkdown, highlightCodeBlocks } from '../lib/markdown.js';
import { formatDate, readingTime } from '../lib/format.js';

const noteHref = (slug) => `#/notes/${slug}`;
const tagHref = (tag) => `#/notes?tag=${encodeURIComponent(tag)}`;

/** 列表项：标题 / 日期 / 标签 / 一行摘要。列表里【不放正文】。 */
function noteItem(note, { withReadingTime = true } = {}) {
  const meta = withReadingTime
    ? `${formatDate(note.date)} · 约 ${readingTime(note.body)} 分钟`
    : formatDate(note.date);

  return el('article', { class: 'card note-item' }, [
    el('h3', { class: 'note-item__title' }, [
      el('a', { class: 'note-item__link', href: noteHref(note.slug), text: note.title }),
    ]),
    el('p', { class: 'note-item__meta', text: meta }),
    el('p', { class: 'note-item__summary', text: note.summary }),
    tagList(note.tags),
  ]);
}

/**
 * 标签筛选条。用 <a href="#/notes?tag=..."> 而不是按钮：
 * 这样筛选结果也有可复制的 URL，刷新之后筛选状态还在。
 */
function tagFilter(allNotes, activeTag) {
  const counts = new Map();
  for (const note of allNotes) {
    for (const tag of note.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
  }

  const tags = [...counts.keys()].sort((a, b) => a.localeCompare(b, 'zh'));

  const chips = [
    el('a', {
      class: activeTag ? 'chip' : 'chip is-active',
      href: '#/notes',
      text: `全部 ${allNotes.length}`,
    }),
    ...tags.map((tag) =>
      el('a', {
        class: activeTag === tag ? 'chip is-active' : 'chip',
        href: tagHref(tag),
        text: `${tag} ${counts.get(tag)}`,
      }),
    ),
  ];

  return el('div', { class: 'chips' }, chips);
}

/** 笔记列表视图（#/notes，可带 ?tag=） */
export function renderNotesList(container, notes, { activeTag = null } = {}) {
  if (!container) return;

  const all = notes || [];

  if (!all.length) {
    render(container, el('p', { class: 'notes-empty', text: '还没有笔记。' }));
    return;
  }

  const filtered = activeTag ? all.filter((note) => note.tags.includes(activeTag)) : all;
  const children = [tagFilter(all, activeTag)];

  if (!filtered.length) {
    children.push(el('p', { class: 'notes-empty', text: `没有带「${activeTag}」标签的笔记。` }));
  } else {
    children.push(
      el(
        'div',
        { class: 'notes-list' },
        filtered.map((note) => noteItem(note)),
      ),
    );
  }

  render(container, children);
}

/**
 * 笔记详情视图（#/notes/<slug>）。
 *
 * 上一篇 / 下一篇的口径：列表是 date 倒序（新的在前），所以
 *   「上一篇」= 数组里更靠前 = 更新的一篇
 *   「下一篇」= 数组里更靠后 = 更早的一篇
 */
export function renderNoteDetail(container, notes, slug) {
  if (!container) return;

  const all = notes || [];
  const index = all.findIndex((note) => note.slug === slug);

  const backLink = el('a', { class: 'link', href: '#/notes', text: '← 回到笔记列表' });

  // 未知 slug 要给出明确结果，不能白屏（比如手工改坏了 URL）
  if (index === -1) {
    render(container, [
      el('p', { class: 'notes-empty', text: '没有这篇笔记，可能链接写错了。' }),
      el('p', { class: 'note__back' }, [backLink]),
    ]);
    return;
  }

  const note = all[index];
  const newer = all[index - 1];
  const older = all[index + 1];

  const prose = el('div', { class: 'prose' });
  const article = el('article', { class: 'note' }, [
    el('p', { class: 'note__back' }, [backLink]),
    el('h2', { class: 'note__title', text: note.title }),
    el('p', {
      class: 'note__meta',
      text: `${formatDate(note.date)} · 约 ${readingTime(note.body)} 分钟`,
    }),
    tagList(note.tags),
    prose,
  ]);

  const nav = [];
  if (newer)
    nav.push(
      el('a', { class: 'link', href: noteHref(newer.slug), text: `← 上一篇：${newer.title}` }),
    );
  if (older)
    nav.push(
      el('a', { class: 'link', href: noteHref(older.slug), text: `下一篇：${older.title} →` }),
    );

  const children = [article];
  if (nav.length)
    children.push(el('nav', { class: 'note-nav', 'aria-label': '上一篇 / 下一篇' }, nav));

  render(container, children);

  /* ------------------------------------------------------------------
     ↓↓↓ 全站唯一一处往页面写 innerHTML 的地方 ↓↓↓

     写进去的是 renderMarkdown() 的产物，也就是【已经被 DOMPurify 清洗过】的 HTML，
     永远不是 web/content/ 里的原始内容。

     dom.js 开头写着「只走 createElement + textContent，不拼 innerHTML」，
     这一处是有意破例的 —— 而且只此一处，这样审计时只需要看这一行。

     顺序也是固定的，不能倒过来：
       marked → DOMPurify.sanitize →（这里）插入 DOM → 再给代码块上色
     先清洗再高亮：绝不能让未经清洗的 HTML 先进到页面里。
     ------------------------------------------------------------------ */
  prose.innerHTML = renderMarkdown(note.body);

  // 插入 DOM 之后再高亮（highlight.js 需要节点已经在文档里）
  highlightCodeBlocks(prose);
}

/**
 * 首页的「最近 N 篇」。
 *
 * 这一节【只出】标题 / 日期 / 标签 / 一行摘要 + 「查看全部 →」，
 * 刻意不渲染 Markdown 正文：首页没必要为正文付出解析成本，
 * marked + DOMPurify + highlight.js 只在笔记详情页用得上。
 */
export function renderRecentNotes(container, notes, limit = 3) {
  if (!container) return;

  const recent = (notes || []).slice(0, limit);

  if (!recent.length) {
    render(container, el('p', { class: 'notes-empty', text: '还没有笔记。' }));
    return;
  }

  render(container, [
    el(
      'div',
      { class: 'notes-list notes-list--recent' },
      recent.map((note) => noteItem(note, { withReadingTime: false })),
    ),
    el('p', { class: 'notes-more' }, [
      el('a', { class: 'link', href: '#/notes', text: '查看全部 →' }),
    ]),
  ]);
}
