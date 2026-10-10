/**
 * 近况时间线：now.json = [{ text, date, status }]。
 *
 * 状态 → 小圆点与右侧小字的映射：
 *   doing   → 会呼吸的蓝点，右侧「更新于 2026.9」
 *   planned → 灰色静态点，右侧「计划中」
 *   done    → 灰色静态点，右侧「已完成」
 */

import { el, render } from './dom.js';

/** 2026-09-01 → 2026.9（月份不补零，和改版前的写法一致） */
function formatMonth(date) {
  const [year, month] = String(date).split('-');
  return `${year}.${Number(month)}`;
}

function metaText(item) {
  if (item.status === 'planned') return '计划中';
  if (item.status === 'done') return '已完成';
  return `更新于 ${formatMonth(item.date)}`;
}

export function renderNow(items) {
  const container = document.getElementById('nowList');
  if (!container) return;

  render(
    container,
    (items || []).map((item) => {
      const pulseClass = item.status === 'doing' ? 'pulse' : 'pulse pulse--todo';
      return el('li', { class: 'now-item card' }, [
        el('i', { class: pulseClass }),
        el('div', {}, [
          el('p', { class: 'now-item__text', text: item.text }),
          el('p', { class: 'now-item__meta', text: metaText(item) }),
        ]),
      ]);
    })
  );
}
