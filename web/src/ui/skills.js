/**
 * 技能：profile.skills = [{ title, items[] }]，一组一张卡片。
 * 加一组技能 = 往 profile.json 的数组里加一个对象，不用碰这里。
 */

import { el, render, tagList } from './dom.js';

export function renderSkills(profile) {
  const container = document.getElementById('skillsGrid');
  if (!container || !profile) return;

  render(
    container,
    (profile.skills || []).map((group) =>
      el('div', { class: 'card skill-card' }, [
        el('h3', { class: 'card__title', text: group.title }),
        tagList(group.items),
      ]),
    ),
  );
}
