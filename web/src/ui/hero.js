/**
 * 首屏的三个小标签（后端开发 / AI · 数据 / 持续学习中）。
 * 这几条不在「禁用 JS 也要可见」的承诺范围内，所以整个由数据渲染。
 */

import { el, render } from './dom.js';

export function renderHeroChips(chips) {
  const container = document.getElementById('heroChips');
  if (!container) return;

  render(
    container,
    (chips || []).map((text) => el('li', { class: 'chip' }, [el('i', { class: 'dot' }), text])),
  );
}
