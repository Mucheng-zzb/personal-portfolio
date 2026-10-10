/**
 * 项目卡：一张卡 = web/content/projects/*.md 一个文件（排序在构建期做完了）。
 *
 * 状态 → 样式/文案的映射（想让卡片换个说法，改这里）：
 *   done    → class 带 project--featured（若 featured 为真），徽章「已完成」，没有施工提示
 *   wip     → 虚线边框卡片，徽章「建设中」，底部「施工中，敬请期待 🚧」
 *   planned → 虚线边框卡片，徽章「计划中」，底部「计划中，敬请期待 🚧」
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

function externalLink(href, text) {
  return el('a', {
    class: 'link',
    href,
    text,
    target: '_blank',
    rel: 'noopener noreferrer',
  });
}

function projectCard(project) {
  // 只有「已完成」的项目才可能占满整行；没做完的按普通卡排
  const featured = project.featured === true && project.status === 'done';
  const badgeClass = project.status === 'done' ? 'badge badge--done' : 'badge';

  const head = el('div', { class: 'project__head' }, [
    el('h3', { class: 'project__title', text: project.title }),
    el('span', { class: badgeClass, text: BADGE[project.status] || project.status }),
  ]);

  const children = [
    head,
    el('p', { class: 'project__desc', text: project.summary }),
    tagList(project.tags),
  ];

  if (project.status === 'done') {
    const links = [];
    if (project.repo) links.push(externalLink(project.repo, '查看仓库 →'));
    if (project.live) links.push(externalLink(project.live, '在线版本 ↗'));
    // 占满整行的卡片才有这一条，和改版前的结构保持一致
    if (featured) links.push(el('a', { class: 'link', href: '#hero', text: '回到顶部 ↑' }));
    if (links.length) children.push(el('div', { class: 'project__links' }, links));
  } else {
    children.push(el('p', { class: 'project__wip', text: NOTE[project.status] }));
  }

  const cardClass = featured ? 'card project project--featured' : 'card project project--wip';
  return el('article', { class: cardClass }, children);
}

export function renderProjects(projects) {
  const container = document.getElementById('projectsList');
  if (!container) return;
  render(container, (projects || []).map(projectCard));
}
