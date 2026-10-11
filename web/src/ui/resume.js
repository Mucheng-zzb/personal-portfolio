/**
 * 简历页（#/resume）—— 一页纸：教育 / 技能 / 项目 / 联系方式。
 *
 * 【本页不新增任何内容字段】四栏全部从既有数据推出来：
 *   教育     ← profile.education（可选字符串，缺省显示「教育信息待补充」）
 *   技能     ← profile.skills
 *   项目     ← web/content/projects/*.md
 *   联系方式 ← profile.email / profile.github
 * 这样简历与主页永远说同一套话，不会出现「改了主页忘了改简历」。
 *
 * 姓名与一句话定位走的是和首屏一样的路子：静态写在 index.html 里，
 * 由 renderProfile() 覆写文字（禁 JS 也看得见），本模块不重复渲染它们。
 *
 * PDF 怎么来的：不是另做一份模板，而是对这个页面用浏览器「打印成 PDF」
 * （@media print 在 style.css 里强制亮色并藏掉页头/页脚）。重新生成的命令见 README。
 */

import { el, render } from './dom.js';

/** profile.education 缺省时的兜底。宁可显式说「待补充」，也不编一个学校名 */
const EDU_FALLBACK = '教育信息待补充';

const STATUS_LABEL = {
  done: '已完成',
  wip: '进行中',
  planned: '计划中',
};

function section(title, body) {
  return el('section', { class: 'resume__section' }, [
    el('h2', { class: 'resume__section-title', text: title }),
    body,
  ]);
}

/* ---------------- 教育 ---------------- */

function educationSection(profile) {
  const text = profile?.education;

  return section(
    '教育',
    el('p', {
      // 缺省时多挂一个修饰类，样式上淡一点 —— 让「待补充」看起来是占位，不是事实
      class: text ? 'resume__edu' : 'resume__edu resume__edu--missing',
      text: text || EDU_FALLBACK,
    }),
  );
}

/* ---------------- 技能 ---------------- */

function skillsSection(profile) {
  const groups = profile?.skills || [];

  if (!groups.length) {
    return section(
      '技能',
      el('p', { class: 'resume__edu resume__edu--missing', text: '还没有填写技能。' }),
    );
  }

  return section(
    '技能',
    el(
      'div',
      { class: 'resume__skills' },
      groups.map((group) =>
        el('div', { class: 'resume__skill' }, [
          el('h3', { class: 'resume__skill-title', text: group.title }),
          el('p', { class: 'resume__skill-items', text: group.items.join(' · ') }),
        ]),
      ),
    ),
  );
}

/* ---------------- 项目 ---------------- */

/**
 * 已完成排前面，其余按构建期顺序跟在后面。
 * 用两次 filter 而不是 sort：filter 稳定保持原顺序，order 才不会白排
 * （同 src/ui/projects.js 的 pickHomeProjects）。
 */
function orderedProjects(projects) {
  const all = projects || [];
  return [...all.filter((p) => p.status === 'done'), ...all.filter((p) => p.status !== 'done')];
}

/** 标题链到在线版本，没有就链仓库，都没有就是纯文字 */
function projectTitle(project) {
  const href = project.live || project.repo;
  if (!href) return el('h3', { class: 'resume__project-title', text: project.title });

  return el('h3', { class: 'resume__project-title' }, [
    el('a', { href, target: '_blank', rel: 'noopener noreferrer', text: project.title }),
  ]);
}

function projectEntry(project) {
  const meta = [STATUS_LABEL[project.status] || project.status, ...project.tags].join(' · ');

  return el('article', { class: 'resume__project' }, [
    projectTitle(project),
    el('p', { class: 'resume__project-meta', text: meta }),
    el('p', { class: 'resume__project-desc', text: project.summary }),
  ]);
}

function projectsSection(projects) {
  const list = orderedProjects(projects);

  if (!list.length) {
    return section(
      '项目',
      el('p', { class: 'resume__edu resume__edu--missing', text: '还没有项目。' }),
    );
  }

  return section('项目', el('div', { class: 'resume__projects' }, list.map(projectEntry)));
}

/* ---------------- 联系方式 ---------------- */

function contactSection(profile) {
  const rows = [];

  if (profile?.email) {
    rows.push(
      el('dt', { text: '邮箱' }),
      el('dd', {}, [el('a', { href: `mailto:${profile.email}`, text: profile.email })]),
    );
  }

  if (profile?.github) {
    rows.push(
      el('dt', { text: 'GitHub' }),
      el('dd', {}, [
        el('a', {
          href: profile.github,
          target: '_blank',
          rel: 'noopener noreferrer',
          text: profile.github.replace(/^https?:\/\//, ''),
        }),
      ]),
    );
  }

  return section('联系方式', el('dl', { class: 'resume__contacts' }, rows));
}

/* ---------------- 页面 ---------------- */

export function renderResume(container, { profile, projects } = {}) {
  if (!container) return;

  render(container, [
    educationSection(profile),
    skillsSection(profile),
    projectsSection(projects),
    contactSection(profile),
  ]);
}
