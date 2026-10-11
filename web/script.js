/* ============================================================
   个人主页 —— 入口脚本
   ------------------------------------------------------------
   这个文件一共做 9 件事，每件事都是一个独立的函数：
     renderContent()  —— 把 web/content/ 的数据渲染进页面（v0.2-C 起）
     initRouter()     —— hash 路由：在首页 / 笔记 / 项目三个视图间切换（v0.4-A 起）
     initTheme()      —— 明暗主题切换按钮（v0.4-A 起）
     initLiveData()   —— 拉后端实时数据，到了就替换、失败就保持内置内容（v0.5-B 起）
     initReveal()     —— 内容滚动到视野里时淡入
     initActiveNav()  —— 高亮当前所在的导航项
     initYear()       —— 自动更新页脚年份
     initCopyEmail()  —— "复制邮箱"按钮
     initSmoothScrollFallback() —— 给不支持 CSS 平滑滚动的浏览器兜底

   为什么用 defer？（见 index.html 最后的 <script> 标签）
   加 defer 后，脚本会等 HTML 全部解析完再执行，
   所以下面能放心地直接操作页面元素，不用套 DOMContentLoaded。

   注意顺序：
     · renderContent() 必须排在 initReveal() 前面 ——
       内容渲染会改变页面高度，先渲染完再让 IntersectionObserver 去观察，
       否则首屏元素的淡入判定会基于错误的位置。
     · initLiveData() 排在【最后】：它是纯增强（后端挂了也照样跑），
       不该占用首屏可交互的时间。它是异步的，不 await。
   ============================================================ */

import { getContent, onChange, startLiveSync } from './src/lib/live.js';
import { api, apiEnabled } from './src/lib/api.js';
import { setLiveStatus } from './src/ui/live-status.js';
import { renderProfile } from './src/ui/profile.js';
import { renderHeroChips } from './src/ui/hero.js';
import { renderAbout } from './src/ui/about.js';
import { renderSkills } from './src/ui/skills.js';
import { renderProjects, renderProjectList } from './src/ui/projects.js';
import { renderNow } from './src/ui/now.js';
import { renderNotesList, renderNoteDetail, renderRecentNotes } from './src/ui/notes.js';
import { renderResume } from './src/ui/resume.js';
import { initTheme } from './src/ui/theme.js';
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
  // 内容从 live.js 拿，不再直接 import 构建期数据：
  // 首批渲染时它就是构建期内置内容（同步就绪，不等后端），
  // 后端数据到了之后 live.js 会换掉它并通知我们重画（见 refreshActiveView）。
  const { profile, now, projects, notes } = getContent();

  renderProfile(profile);
  renderHeroChips(profile?.heroChips);
  renderAbout(profile);
  renderSkills(profile);
  renderProjects(projects);
  renderRecentNotes(document.getElementById('recentNotesList'), notes);
  renderNow(now);
}

/* ============================================================
   0.6 路由与视图切换（v0.3-A 起，v0.4-A 加了项目列表）
   ------------------------------------------------------------
   只接管以 #/ 开头的 hash：#/ 、#/notes、#/notes/<slug>、#/projects。
   #about / #projects 这类【不带斜杠】的锚点完全不归路由管，仍旧走浏览器
   原生平滑滚动 —— 这条线在 src/router.js 的 parseHash() 里划死。

   视图切换靠 hidden 属性：
     首页   = <main>（原本就在的节点，一个子节点都不动）
     笔记   = #notesView（v0.3-A 加的，默认 hidden）
     项目   = #projectsView（v0.4-A 加的，默认 hidden）
   这样首页那五个板块的 DOM 完全不受影响。

   加新视图只有三步：在 index.html 里加一个默认 hidden 的容器、
   在下面的 VIEW_ELEMENT 里登记、在 applyRoute() 里渲染它。
   ============================================================ */

/** 路由视图名 → 容器 id。首页不在此列：它就是 <main> 本身 */
const VIEW_ELEMENT = {
  notes: 'notesView',
  projects: 'projectsView',
  resume: 'resumeView',
};

/**
 * 路由视图 → 切换过去时要「点亮」的导航项。
 * 首页没有条目：那里的高亮是按滚动位置算的（见 initActiveNav）。
 *
 * 项目列表点亮的仍是导航里那个「项目」锚点（href="#projects"）：
 * 导航保持「整站都是锚点」的形状不变，只有笔记是路由链接。
 */
const NAV_HREF_BY_VIEW = {
  notes: '#/notes',
  projects: '#projects',
  resume: '#/resume',
};

/** 当前停在哪个视图。initActiveNav 的滚动补丁要用它判断该不该管导航高亮 */
let activeView = 'home';

/**
 * 点亮导航项。
 *
 * 规矩：只要在路由视图里（非首页），锚点型导航项一律不亮 —— 首页那五个板块
 * 此刻根本不在页面上，让它们亮着是假的。首页视图下则完全交给 initActiveNav。
 */
function setNavActive(view) {
  const wanted = NAV_HREF_BY_VIEW[view] ?? null;

  document.querySelectorAll('.nav__link').forEach((link) => {
    const href = link.getAttribute('href');

    // 首页视图下，锚点型的交给 initActiveNav 按滚动位置决定
    if (view === 'home' && !href.startsWith('#/')) return;

    link.classList.toggle('is-active', href === wanted);
  });
}

/** 只显示 name 对应的那个视图，其余收起。name 取值：'home' | 'notes' | 'projects' */
function showView(name) {
  const main = document.querySelector('main');
  if (!main) return;

  main.hidden = name !== 'home';

  for (const [view, id] of Object.entries(VIEW_ELEMENT)) {
    const box = document.getElementById(id);
    if (box) box.hidden = view !== name;
  }

  activeView = name;
  setNavActive(name);
}

/**
 * 自己滚到某个锚点。
 * 只在「刚从其它视图切回首页」时调用 —— 那时 <main> 还藏着，
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

/**
 * 当前停在哪个路由。实时数据到了之后要「按当前视图重画一次」，
 * 所以得记住它（applyRoute 是路由驱动的，那时不会再被调用）。
 */
let currentRoute = { name: 'home' };

/**
 * 重画当前视图的内容。**不切视图、不滚动。**
 *
 * 与 applyRoute 的区别就在这两个「不」：实时数据通常在页面加载完约 1 秒后到，
 * 那时用户可能已经滚到「技能」或点进了 #/projects —— 再走一遍 applyRoute
 * 会把他弹回顶部，那是很讨厌的体验。
 */
function refreshActiveView() {
  const content = getContent();

  if (currentRoute.name === 'projects') {
    renderProjectList(document.getElementById('projectListView'), content.projects, {
      status: currentRoute.status,
      tag: currentRoute.tag,
    });
    return;
  }

  if (currentRoute.name === 'notes') {
    renderNotesList(document.getElementById('notesListView'), content.notes, {
      activeTag: currentRoute.tag,
    });
    return;
  }

  if (currentRoute.name === 'note') {
    openNoteDetail(document.getElementById('noteDetailView'), currentRoute.slug);
    return;
  }

  if (currentRoute.name === 'resume') {
    renderResume(document.getElementById('resumeBody'), {
      profile: content.profile,
      projects: content.projects,
    });
    return;
  }

  renderContent();
}

/**
 * 打开一篇笔记详情。
 *
 * 构建期就有正文的（绝大多数）：直接渲染，一次请求都不发。
 * 只存在于后端的新笔记：`/notes` 列表接口按契约【不含正文】
 * （ARCHITECTURE §6，正文在 /notes/{slug}），所以这时才按需取。
 * 取之前先渲染一句「正在获取正文…」，不让详情页停在空白上。
 */
async function openNoteDetail(container, slug) {
  const content = getContent();
  const note = content.notes.find((item) => item.slug === slug);

  // 构建期有正文 / 笔记不存在 / 后端没启用 —— 三种都用现成的渲染
  if (!note || note.body !== undefined || !apiEnabled) {
    renderNoteDetail(container, content.notes, slug);
    return;
  }

  note.body = '_（正在获取正文…）_';
  renderNoteDetail(container, content.notes, slug);

  try {
    const detail = await api.note(slug);
    Object.assign(note, detail);
  } catch (err) {
    // 正文取不到就明说，而不是给一个空白正文让人以为这篇是空的
    note.body = '> 正文暂时取不到（后端不可用），稍后刷新重试。';
    console.warn(`[api] 笔记正文取不到 —— ${err?.toString?.() ?? err}`);
  }

  // 期间用户可能已经跳走，别把别的页面重画掉
  if (currentRoute.name === 'note' && currentRoute.slug === slug) {
    renderNoteDetail(container, getContent().notes, slug);
  }
}

/** 路由 → 视图。route 为 null 表示「这次 hash 不归路由管」（多半是个锚点）。 */
function applyRoute(route, hash) {
  if (!document.querySelector('main')) return;

  if (route === null) {
    // 锚点：只有当刚才停在别的视图时才需要处理（要先放出首页才滚得动）
    if (activeView !== 'home') {
      showView('home');
      scrollToAnchor(hash);
    }
    currentRoute = { name: 'home' };
    return;
  }

  currentRoute = route;

  if (route.name === 'home') {
    showView('home');
    return;
  }

  // 换视图后回到顶部，否则会停在上一个视图的滚动位置
  const goToTop = () => window.scrollTo(0, 0);
  const content = getContent();

  if (route.name === 'notes' || route.name === 'note') {
    showView('notes');

    const listEl = document.getElementById('notesListView');
    const detailEl = document.getElementById('noteDetailView');
    const isList = route.name === 'notes';
    if (listEl) listEl.hidden = !isList;
    if (detailEl) detailEl.hidden = isList;

    if (isList) {
      renderNotesList(listEl, content.notes, { activeTag: route.tag });
    } else {
      openNoteDetail(detailEl, route.slug);
    }

    goToTop();
    return;
  }

  if (route.name === 'projects') {
    showView('projects');
    renderProjectList(document.getElementById('projectListView'), content.projects, {
      status: route.status,
      tag: route.tag,
    });
    goToTop();
    return;
  }

  if (route.name === 'resume') {
    showView('resume');
    renderResume(document.getElementById('resumeBody'), {
      profile: content.profile,
      projects: content.projects,
    });
    goToTop();
  }
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
      // 非首页视图下 <main> 是隐藏的，页面上根本没有这些板块，
      // 这条补丁会误把「联系」点亮，所以直接跳过。
      if (activeView !== 'home') return;

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
   6. 后端实时数据（v0.5-B）
   ------------------------------------------------------------
   首屏【不等】它：上面 renderContent() 已经用构建期内容把页面画好了，
   这里只做「数据到了再替换」。

   失败是**预期路径**，不是异常：Render 免费实例闲置 15 分钟休眠、
   冷启动约 1 分钟，而我们的超时是 3 秒 —— 冷启动时几乎必然会走失败分支。
   所以：
     · 内容保持构建期那份（页面完整可读，不白屏、不转圈）
     · 页脚显示「显示的是构建时快照」（v0.5.1 前的文案是「实时数据不可用」）
     · 控制台只打 warning，绝不打 error
   ============================================================ */
function initLiveData() {
  // 内容被换成实时那份之后，重画当前视图（不切视图、不滚动）
  onChange(refreshActiveView);

  // 状态提示自己出错不该影响取数据，所以这里再包一层
  const reportStatus = (status, detail) => {
    try {
      setLiveStatus(status, detail);
    } catch (err) {
      console.warn('[ui] 实时数据状态提示更新失败：', err);
    }
  };

  // 不 await：这是增强，不该占住启动流程
  startLiveSync(reportStatus);
}

/* ============================================================
   启动
   每个 init 都单独包一层 try/catch：万一某一块出问题，
   其他功能照常工作，而不是整个脚本停摆。
   initLiveData 放最后：它是纯增强，排在所有「页面本来就该有」的功能之后。
   ============================================================ */
[
  renderContent,
  initRouter,
  initTheme,
  initReveal,
  initActiveNav,
  initYear,
  initCopyEmail,
  initSmoothScrollFallback,
  initLiveData,
].forEach((init) => {
  try {
    init();
  } catch (err) {
    console.error(`[初始化失败] ${init.name}:`, err);
  }
});
