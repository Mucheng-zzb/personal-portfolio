/* ============================================================
   个人主页 —— 入口脚本
   ------------------------------------------------------------
   这个文件一共做 7 件事，每件事都是一个独立的函数：
     renderContent()  —— 把 web/content/ 的数据渲染进页面（v0.2-C 起）
     initRouter()     —— hash 路由：在首页与笔记视图之间切换（v0.3-A 起）
     initReveal()     —— 内容滚动到视野里时淡入
     initActiveNav()  —— 高亮当前所在的导航项
     initYear()       —— 自动更新页脚年份
     initCopyEmail()  —— "复制邮箱"按钮
     initSmoothScrollFallback() —— 给不支持 CSS 平滑滚动的浏览器兜底

   为什么用 defer？（见 index.html 最后的 <script> 标签）
   加 defer 后，脚本会等 HTML 全部解析完再执行，
   所以下面能放心地直接操作页面元素，不用套 DOMContentLoaded。

   注意：renderContent() 必须排在 initReveal() 前面 ——
   内容渲染会改变页面高度，先渲染完再让 IntersectionObserver 去观察，
   否则首屏元素的淡入判定会基于错误的位置。
   ============================================================ */

import { profile, now, projects, notes } from './src/lib/content.js';
import { renderProfile } from './src/ui/profile.js';
import { renderHeroChips } from './src/ui/hero.js';
import { renderAbout } from './src/ui/about.js';
import { renderSkills } from './src/ui/skills.js';
import { renderProjects } from './src/ui/projects.js';
import { renderNow } from './src/ui/now.js';
import { renderNotesList, renderNoteDetail, renderRecentNotes } from './src/ui/notes.js';
import { startRouter } from './src/router.js';

/* ============================================================
   0. 标记「JS 可用」
   在 <html> 上加一个 .js 类。style.css 里的进场动画写成
   `.js .reveal { opacity: 0 }`，只有 JS 正常运行时才会把内容
   先藏起来。万一 JS 报错或用户禁用 JS，内容依然正常显示 —— 不会白屏。
   ============================================================ */
document.documentElement.classList.add('js');

/* ============================================================
   0.5 内容渲染
   数据来自构建期注入的虚拟模块（见 web/build/content-plugin.js），
   已经在构建时校验过，这里不再判断合法性。

   姓名 / 定位 / 邮箱 / GitHub 四项【不在此列】：它们必须留在
   index.html 的静态 HTML 里，保证禁用 JS 也能看见（决策 A）。
   renderProfile() 只覆写这几处的文字，不重建节点。
   ============================================================ */
function renderContent() {
  renderProfile(profile);
  renderHeroChips(profile?.heroChips);
  renderAbout(profile);
  renderSkills(profile);
  renderProjects(projects);
  renderRecentNotes(document.getElementById('recentNotesList'), notes);
  renderNow(now);
}

/* ============================================================
   0.6 路由与视图切换（v0.3-A）
   ------------------------------------------------------------
   只接管以 #/ 开头的 hash：#/ 、#/notes 、#/notes/<slug>。
   #about / #hero 这类【不带斜杠】的锚点完全不归路由管，仍旧走浏览器
   原生平滑滚动 —— 这条线在 src/router.js 的 parseHash() 里划死。

   视图切换靠 hidden 属性：
     首页 = <main>（原本就在的节点，一个子节点都不动）
     笔记 = #notesView（新增的节点，默认 hidden）
   这样五个现有板块的 DOM 完全不受影响。
   ============================================================ */

/** 当前是否停在笔记视图。initActiveNav 要用它判断要不要管导航高亮 */
let inNotesView = false;

/** 在笔记视图里点亮「笔记」那一项；回首页时清掉，交给 initActiveNav 重新判定 */
function setNotesNavActive(active) {
  const link = document.querySelector('.nav__link[href="#/notes"]');
  if (link) link.classList.toggle('is-active', active);
}

function showHomeView() {
  const main = document.querySelector('main');
  const notesView = document.getElementById('notesView');
  if (main) main.hidden = false;
  if (notesView) notesView.hidden = true;
  inNotesView = false;
  setNotesNavActive(false);
}

/**
 * 自己滚到某个锚点。
 * 只在「刚从笔记视图切回首页」时调用 —— 那时 <main> 还藏着，
 * 隐藏元素没有布局盒，浏览器的原生锚点滚动会静默失败，所以要先把它放出来再补滚一次。
 * 在首页点锚点时【不】走这里：原生平滑滚动才是我们要的效果，插手反而会打架。
 */
function scrollToAnchor(hash) {
  const id = String(hash || '').replace(/^#/, '');
  if (!id) return;

  const target = document.getElementById(id);
  if (!target) return;

  const headerHeight = document.querySelector('.header')?.offsetHeight ?? 0;
  const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;

  window.scrollTo({ top, behavior: 'smooth' });
}

/** 路由 → 视图。route 为 null 表示「这次 hash 不归路由管」（多半是个锚点）。 */
function applyRoute(route, hash) {
  const main = document.querySelector('main');
  const notesView = document.getElementById('notesView');
  if (!main || !notesView) return;

  if (route === null) {
    if (inNotesView) {
      showHomeView();
      scrollToAnchor(hash);
    }
    return;
  }

  if (route.name === 'home') {
    showHomeView();
    return;
  }

  // ---- 笔记视图 ----
  main.hidden = true;
  notesView.hidden = false;
  inNotesView = true;
  setNotesNavActive(true);

  const listEl = document.getElementById('notesListView');
  const detailEl = document.getElementById('noteDetailView');
  const isList = route.name === 'notes';
  if (listEl) listEl.hidden = !isList;
  if (detailEl) detailEl.hidden = isList;

  if (isList) {
    renderNotesList(listEl, notes, { activeTag: route.tag });
  } else {
    renderNoteDetail(detailEl, notes, route.slug);
  }

  // 换视图后回到顶部，否则会停在上一个视图的滚动位置
  window.scrollTo(0, 0);
}

/**
 * 启动路由。startRouter 内部会立刻跑一次 —— hashchange 在首次加载时不会触发，
 * 少了这一步，把 #/notes/<slug> 粘贴到新标签页打开会停在首页。
 */
function initRouter() {
  startRouter(applyRoute);
}

/* ============================================================
   1. 滚动淡入
   用 IntersectionObserver 监听元素是否进入视口。
   它比监听 scroll 事件性能好得多（浏览器内部做了优化，
   不会因为滚动而频繁触发回调）。
   ============================================================ */
function initReveal() {
  const items = document.querySelectorAll('.reveal');

  // 老浏览器不支持 IntersectionObserver 时，直接全部显示出来
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('is-visible');
        // 显示过一次就取消监听：动画只播一次，不会来回闪
        observer.unobserve(entry.target);
      });
    },
    {
      // 元素露出 12% 就触发，不用等它完整出现
      threshold: 0.12,
      // 底部提前 60px 触发，滚到底时不会"慢半拍"
      rootMargin: '0px 0px -60px 0px',
    },
  );

  items.forEach((el) => observer.observe(el));
}

/* ============================================================
   2. 高亮当前板块对应的导航项
   同样是 IntersectionObserver：哪个 section 正处在
   「导航栏下方 ~ 屏幕中间」这条带子里，就点亮它的导航链接。
   ============================================================ */
function initActiveNav() {
  const links = Array.from(document.querySelectorAll('.nav__link'));
  if (!links.length) return;

  // 建立 id -> 导航链接 的映射，方便反查：{ about: <a>, skills: <a>, ... }
  const linkById = new Map();
  links.forEach((link) => {
    const id = link.getAttribute('href').slice(1); // 把 "#about" 变成 "about"
    if (id) linkById.set(id, link);
  });

  const sections = Array.from(document.querySelectorAll('section[id]')).filter((section) =>
    linkById.has(section.id),
  );

  if (!sections.length || !('IntersectionObserver' in window)) return;

  const setActive = (id) => {
    links.forEach((link) => link.classList.remove('is-active'));
    const target = linkById.get(id);
    if (target) target.classList.add('is-active');
  };

  // 记录当前处于"激活带"里的 section。可能有多个，取最靠上的那个
  const visible = new Set();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      });

      // 按页面顺序取第一个可见的，避免快速滚动时高亮乱跳
      const current = sections.find((section) => visible.has(section.id));
      if (current) setActive(current.id);
    },
    {
      // 上边留出导航栏高度，下边留 55%：形成一条位于屏幕上部的"激活带"
      rootMargin: '-72px 0px -55% 0px',
      threshold: 0,
    },
  );

  sections.forEach((section) => observer.observe(section));

  // 小补丁：滚到页面最底部时，上面那条带子可能扫不到最后一个板块，
  // 这里单独判断一下，保证滚到底时最后一个导航项是亮的。
  window.addEventListener(
    'scroll',
    () => {
      // 笔记视图下 <main> 是隐藏的，页面上根本没有这些板块，
      // 这条补丁会误把「联系」点亮，所以直接跳过。
      if (inNotesView) return;

      const atBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 4;
      if (atBottom) setActive(sections[sections.length - 1].id);
    },
    { passive: true }, // passive：告诉浏览器这个监听器不会阻止滚动，滚动更流畅
  );
}

/* ============================================================
   3. 页脚年份自动更新
   这样到了 2027 年也不用回来改 HTML。
   ============================================================ */
function initYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = String(new Date().getFullYear());
}

/* ============================================================
   4. 复制邮箱
   优先用现代的 navigator.clipboard；失败就回退到
   创建一个隐藏的 <textarea> 再 document.execCommand('copy')。
   （本地用 file:// 打开时，某些浏览器不给用 clipboard API，
   所以这个兜底是必要的。）
   ============================================================ */
async function copyToClipboard(text) {
  // 方案 A：现代 API
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 静默失败，继续走方案 B（不关心具体错误，用可选 catch 绑定）
  }

  // 方案 B：老办法兜底
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    // 放到屏幕外，避免复制时页面跳动
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function initCopyEmail() {
  const btn = document.getElementById('copyEmailBtn');
  if (!btn) return;

  const originalText = btn.textContent; // 记住按钮原本的文字，用来还原
  let resetTimer = null;

  btn.addEventListener('click', async () => {
    // 邮箱地址写在 HTML 的 data-email 属性里，改邮箱只用改 HTML
    const email = btn.dataset.email || '';
    if (!email) return;

    const ok = await copyToClipboard(email);

    btn.textContent = ok ? '已复制 ✓' : '复制失败，请手动选中';
    btn.disabled = true;

    // 1.8 秒后恢复原样。先清掉上一个定时器，
    // 防止用户连点几下导致文字错乱
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 1800);
  });
}

/* ============================================================
   5. 平滑滚动兜底
   主方案是 CSS 的 `html { scroll-behavior: smooth }`。
   少数老浏览器不支持这个属性，这里用 JS 补上。
   先判断支持性，支持就不插手，避免两套逻辑打架。
   ============================================================ */
function initSmoothScrollFallback() {
  const supportsCssSmooth = 'scrollBehavior' in document.documentElement.style;
  if (supportsCssSmooth) return;

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href').slice(1);

      // 两种情况【不插手】，让浏览器按默认行为走：
      //   ① #/notes 这类路由链接不是锚点，归 router 管；
      //   ② 首页此刻是隐藏的（正在笔记视图），目标没有布局盒滚不过去 ——
      //      而且这里 preventDefault 会连 hashchange 一起吃掉，路由就再也收不到通知了。
      //      （applyRoute 里有对应的处理：先放出首页，再自己滚。）
      if (id.startsWith('/') || document.querySelector('main')?.hidden) return;

      const target = id ? document.getElementById(id) : document.body;
      if (!target) return;

      event.preventDefault();

      // 减去吸顶导航的高度，否则标题会被导航条盖住
      const headerHeight = document.querySelector('.header')?.offsetHeight ?? 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ============================================================
   启动
   每个 init 都单独包一层 try/catch：万一某一块出问题，
   其他功能照常工作，而不是整个脚本停摆。
   ============================================================ */
[
  renderContent,
  initRouter,
  initReveal,
  initActiveNav,
  initYear,
  initCopyEmail,
  initSmoothScrollFallback,
].forEach((init) => {
  try {
    init();
  } catch (err) {
    console.error(`[初始化失败] ${init.name}:`, err);
  }
});
