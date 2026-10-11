/**
 * 把 profile.json 里「必须留在静态 HTML 里」的四项（姓名 / 定位 / 邮箱 / GitHub）
 * 覆写进页面。
 *
 * 为什么是「覆写」而不是「用 JS 生成整段」：
 * 这四项是禁用 JS 时唯一还能看到的东西（决策 A），所以它们必须已经存在于
 * index.html 的静态 HTML 里。这里只把文字换掉，不重建 section ——
 * 重建会让页面闪一下，也会把降级能力弄丢。
 *
 * 姓名在页面上出现 3 处（导航 logo、首屏大标题、页脚），三处都由 profile.name 驱动。
 */

const setText = (id, text) => {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
};

export function renderProfile(profile) {
  if (!profile) return;

  /* ---- 姓名：导航 logo（首字普通色 + 其余渐变色）---- */
  const logo = document.getElementById('logoName');
  const logoRest = document.getElementById('logoNameRest');
  if (logo && logoRest && logo.firstChild) {
    logo.firstChild.nodeValue = profile.name.slice(0, 1);
    logoRest.textContent = profile.name.slice(1);
  }

  /* ---- 姓名：首屏大标题 ---- */
  setText('heroName', profile.name);

  /* ---- 定位：首屏副标题 ---- */
  setText('heroTagline', profile.tagline);

  /* ---- 姓名 / 定位：简历页抬头（v0.4-A）。
       简历页的 h1 就是姓名（它会变成 PDF 的第一行），
       所以这两处和首屏一样是"静态 HTML + 覆写文字"的写法。 ---- */
  setText('resumeName', profile.name);
  setText('resumeTagline', profile.tagline);

  /* ---- 邮箱：显示文字 + mailto 链接 + 复制按钮读的 data-email 三处一起改 ---- */
  const emailLink = document.getElementById('contactEmail');
  if (emailLink) {
    emailLink.textContent = profile.email;
    emailLink.setAttribute('href', `mailto:${profile.email}`);
  }
  const copyBtn = document.getElementById('copyEmailBtn');
  if (copyBtn) copyBtn.dataset.email = profile.email;

  /* ---- GitHub：首屏按钮 + 联系板块卡片 ---- */
  const heroGithub = document.getElementById('heroGithub');
  if (heroGithub) heroGithub.setAttribute('href', profile.github);

  const githubLink = document.getElementById('contactGithub');
  if (githubLink) {
    githubLink.setAttribute('href', profile.github);
    // 显示时去掉协议头，看得清爽一点：https://github.com/x → github.com/x
    githubLink.textContent = profile.github.replace(/^https?:\/\//, '');
  }

  /* ---- 姓名：页脚 ---- */
  setText('footerName', profile.name);

  /* ---- 可选字段：给了才改，没给就保留静态 HTML 里的原句 ---- */
  if (profile.contactNote) setText('contactGithubNote', profile.contactNote);

  const footer = document.getElementById('footerNote');
  if (footer && profile.footerNote) {
    footer.textContent = `· ${profile.footerNote}`;
  }
}
