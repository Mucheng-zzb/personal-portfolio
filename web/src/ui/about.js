/**
 * 关于我：左侧两段正文（profile.about[]）+ 右侧「正在学什么」卡片（profile.learning[]）。
 *
 * 两者的区别要记牢，别合并：
 *   about[]    = 关于我这个人的两段自我介绍
 *   learning[] = 「正在学什么」那张卡的勾选清单
 *   now.json   = 「最近在做什么」的时间线（在 ui/now.js）
 */

import { el, render } from './dom.js';

export function renderAbout(profile) {
  if (!profile) return;

  const textBox = document.getElementById('aboutText');
  if (textBox) {
    render(
      textBox,
      (profile.about || []).map((paragraph) => el('p', { text: paragraph })),
    );
  }

  const list = document.getElementById('learningList');
  if (list) {
    render(
      list,
      (profile.learning || []).map((text) => el('li', { text })),
    );
  }
}
