/**
 * 项目卡：一张卡 = web/content/projects/*.md 一个文件。
 *
 * 排序在【构建期】就排好了（content-schema.js 的 sort：order 升序 → date 降序 →
 * title 升序），这里一个字都不重排 —— 排序口径只有一处，否则列表页和首页
 * 早晚会排得不一样。
 *
 * 状态 → 样式/文案的映射（想让卡片换个说法，改这里）：
 *   done    → class 带 project--featured（若 featured 为真），徽章「已完成」，没有施工提示
 *   wip     → 虚线边框卡片，徽章「建设中」，底部「施工中，敬请期待 🚧」
 *   planned → 虚线边框卡片，徽章「计划中」，底部「计划中，敬请期待 🚧」
 *
 * 本模块出两个视图：
 *   renderProjects()     —— 首页板块：精选优先 + 最多 HOME_LIMIT 张 + 「查看全部项目 →」
 *   renderProjectList()  —— #/projects 列表页：状态筛选 + 标签过滤
 */

import { el, render, tagList } from './dom.js';

const BADGE = {
  done: '已完成',
  wip: '建设中',
  planned: '计划中',
};

const NOTE = {
  wip: '施工中，敬请期待 🚧',
  planned: '计划中，敬请期待 🚧',
};

/** 首页板块最多展示几张卡。超出的去 #/projects 看 */
const HOME_LIMIT = 4;

/** 列表页的路由前缀。筛选参数一律挂在这条路由上，理由见 src/router.js 的注释 */
const LIST_PATH = '#/projects';

function externalLink(href, text) {
  return el('a', {
    class: 'link',
    href,
    text,
    target: '_blank',
    rel: 'noopener noreferrer',
  });
}

/**
 * 封面图。
 *
 * 输出 <picture>：AVIF → WebP → 原图，浏览器挑第一个认识的。
 * 三份文件按同一前缀不同扩展名摆放（/images/x.avif、/images/x.webp、/images/x.png），
 * 所以只把扩展名换掉就能推出另外两份 —— content 里只写一个 cover 路径。
 * 没导出那两份时 <source> 会 404，浏览器静默回退到 <img>，不会破图。
 *
 * loading="lazy"：首屏之外的图不抢带宽；宽高交给 CSS 的 aspect-ratio 预留，
 * 所以不需要写 width/height 属性也不会抖（CLS）。
 *
 * alt 给空字符串是【故意的】：卡片右侧就是项目标题（h3），封面属于装饰，
 * 再念一遍标题只会让读屏用户听两遍。空 alt 的图片不进无障碍树。
 */
function coverPicture(src) {
  const base = String(src).replace(/\.(png|jpe?g|webp|avif)$/i, '');

  const sources =
    base === src
      ? []
      : [
          el('source', { srcset: `${base}.avif`, type: 'image/avif' }),
          el('source', { srcset: `${base}.webp`, type: 'image/webp' }),
        ];

  return el('picture', { class: 'project__cover' }, [
    ...sources,
    el('img', { src, alt: '', loading: 'lazy', decoding: 'async' }),
  ]);
}

/**
 * @param {object} project 构建期校验过的项目数据
 * @param {boolean} onHome 首页板块里的卡片会多一个「回到顶部 ↑」（沿用改版前的结构）
 */
function projectCard(project, { onHome = false } = {}) {
  // 只有「已完成」的项目才可能占满整行；没做完的按普通卡排
  const featured = project.featured === true && project.status === 'done';
  const badgeClass = project.status === 'done' ? 'badge badge--done' : 'badge';

  const children = [];

  if (project.cover) children.push(coverPicture(project.cover));

  children.push(
    el('div', { class: 'project__head' }, [
      el('h3', { class: 'project__title', text: project.title }),
      el('span', { class: badgeClass, text: BADGE[project.status] || project.status }),
    ]),
    el('p', { class: 'project__desc', text: project.summary }),
    tagList(project.tags),
  );

  if (project.status === 'done') {
    const links = [];
    if (project.repo) links.push(externalLink(project.repo, '查看仓库 →'));
    if (project.live) links.push(externalLink(project.live, '在线版本 ↗'));
    if (onHome && featured)
      links.push(el('a', { class: 'link', href: '#hero', text: '回到顶部 ↑' }));
    if (links.length) children.push(el('div', { class: 'project__links' }, links));
  } else {
    children.push(el('p', { class: 'project__wip', text: NOTE[project.status] }));
  }

  // project--wip 是「虚线边框 + 降透明度」的施工中外观，只有没做完的才该有。
  // 老写法是 featured 以外的统统套 project--wip，于是「已完成但没设 featured」
  // 的项目（比如数据小工具）会带着徽章「已完成」却长成施工中的样子。
  const cardClass = featured
    ? 'card project project--featured'
    : project.status === 'done'
      ? 'card project'
      : 'card project project--wip';

  return el('article', { class: cardClass }, children);
}

/**
 * 首页要展示哪几张：featured 的排前面，其余保持构建期顺序，最多 HOME_LIMIT 张。
 *
 * 用 filter 做分区而不是 sort：filter 稳定保持原顺序，
 * 而 sort 在「两个 featured 谁在前」上没有定义，构建期排好的 order 就白排了。
 */
function pickHomeProjects(projects) {
  const all = projects || [];
  const featured = all.filter((project) => project.featured === true);
  const rest = all.filter((project) => project.featured !== true);
  return [...featured, ...rest].slice(0, HOME_LIMIT);
}

/* ============================================================
   首页板块
   ============================================================ */

export function renderProjects(projects) {
  const container = document.getElementById('projectsList');
  if (!container) return;

  const shown = pickHomeProjects(projects);

  const children = [];

  if (!shown.length) {
    children.push(el('p', { class: 'empty-note', text: '还没有项目。' }));
  } else {
    // 卡片统一包一层 .projects（网格容器）。
    // 不能把网格类挂在外层容器上：这样「查看全部项目 →」会被当成一个网格单元。
    children.push(
      el(
        'div',
        { class: 'projects' },
        shown.map((project) => projectCard(project, { onHome: true })),
      ),
    );
  }

  // 「查看全部项目 →」永远显示：它是首页板块通往列表页的固定入口，
  // 不只在被截断时才出现（否则项目少的时候用户根本不知道有筛选页）。
  children.push(
    el('p', { class: 'more-link' }, [
      el('a', { class: 'link', href: LIST_PATH, text: '查看全部项目 →' }),
    ]),
  );

  render(container, children);
}

/* ============================================================
   列表页（#/projects）
   ============================================================ */

/** 状态三档。value 为 null 表示不带参数 —— URL 干净，也和 readQuery 的默认值对上 */
const STATUS_CHOICES = [
  { value: null, label: '全部' },
  { value: 'done', label: '已完成' },
  { value: 'doing', label: '进行中' },
];

/**
 * 「进行中」包含 wip 与 planned 两种。
 * 对访客来说「还没做完」是一件事，不必把内部的两档状态暴露成两个筛选项。
 */
function matchesStatus(project, status) {
  if (!status) return true;
  if (status === 'done') return project.status === 'done';
  return project.status !== 'done';
}

/**
 * 拼筛选链接。用 <a> 而不是按钮：筛选结果因此自带可复制、可分享的 URL，
 * 刷新之后状态还在 —— 和笔记页的标签筛选是同一套做法（见 src/ui/notes.js）。
 * 参数顺序固定 status → tag，和验收里那条 #/projects?status=done&tag=Python 一致。
 */
function listHref({ status = null, tag = null } = {}) {
  const params = [];
  if (status) params.push(`status=${encodeURIComponent(status)}`);
  if (tag) params.push(`tag=${encodeURIComponent(tag)}`);
  return params.length ? `${LIST_PATH}?${params.join('&')}` : LIST_PATH;
}

function countBy(items, keyOf) {
  const counts = new Map();
  for (const item of items) {
    for (const key of keyOf(item)) counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

/** 状态筛选条。切状态时要带上当前标签，否则一点状态就把标签过滤丢了 */
function statusFilter(all, activeStatus, activeTag) {
  return el(
    'div',
    { class: 'chips', role: 'group', 'aria-label': '按状态筛选' },
    STATUS_CHOICES.map(({ value, label }) => {
      const count = all.filter((project) => matchesStatus(project, value)).length;
      return el('a', {
        class: activeStatus === value ? 'chip is-active' : 'chip',
        href: listHref({ status: value, tag: activeTag }),
        text: `${label} ${count}`,
      });
    }),
  );
}

/** 标签筛选条 */
function tagFilter(all, activeStatus, activeTag) {
  const counts = countBy(all, (project) => project.tags);
  const tags = [...counts.keys()].sort((a, b) => a.localeCompare(b, 'zh'));

  return el('div', { class: 'chips', role: 'group', 'aria-label': '按标签筛选' }, [
    el('a', {
      class: activeTag ? 'chip' : 'chip is-active',
      href: listHref({ status: activeStatus }),
      text: '全部标签',
    }),
    ...tags.map((tag) =>
      el('a', {
        class: activeTag === tag ? 'chip is-active' : 'chip',
        href: listHref({ status: activeStatus, tag }),
        text: `${tag} ${counts.get(tag)}`,
      }),
    ),
  ]);
}

/** 空结果时说清楚是哪个条件组合没命中，而不是干甩一句「没有数据」 */
function emptyMessage(all, status, tag) {
  const statusLabel = (STATUS_CHOICES.find((choice) => choice.value === status) || {}).label;

  if (status && tag) return `没有同时满足「${statusLabel}」和标签「${tag}」的项目。`;
  if (tag) return `没有带「${tag}」标签的项目。`;
  if (status) return `没有「${statusLabel}」的项目。`;
  return '还没有项目。';
}

/** 项目列表视图（#/projects，可带 ?status= 与 ?tag=） */
export function renderProjectList(container, projects, { status = null, tag = null } = {}) {
  if (!container) return;

  const all = projects || [];
  const filtered = all.filter(
    (project) => matchesStatus(project, status) && (!tag || project.tags.includes(tag)),
  );

  const children = [statusFilter(all, status, tag), tagFilter(all, status, tag)];

  if (!filtered.length) {
    children.push(el('p', { class: 'empty-note', text: emptyMessage(all, status, tag) }));
  } else {
    children.push(
      el(
        'div',
        { class: 'projects' },
        filtered.map((project) => projectCard(project)),
      ),
    );
  }

  render(container, children);
}
