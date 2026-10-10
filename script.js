/* ⚠️ 临时保活副本，请勿编辑；真正入口是 web/ 下的同名文件，本副本将在 v0.2-B 完成后删除。
   为什么还留在这：GitHub Pages 目前仍从仓库根目录部署，删掉它线上会立刻 404。
   过渡期内任何逻辑修改，都请只改 web/ 下的同名文件。 */

/* ============================================================
   个人主页 v1 —— 交互脚本
   ------------------------------------------------------------
   这个文件一共做 5 件小事，每件事都是一个独立的 init 函数：
     initReveal()     —— 内容滚动到视野里时淡入
     initActiveNav()  —— 高亮当前所在的导航项
     initYear()       —— 自动更新页脚年份
     initCopyEmail()  —— "复制邮箱"按钮
     initSmoothScrollFallback() —— 给不支持 CSS 平滑滚动的浏览器兜底

   为什么用 defer？（见 index.html 最后的 <script> 标签）
   加 defer 后，脚本会等 HTML 全部解析完再执行，
   所以下面能放心地直接操作页面元素，不用套 DOMContentLoaded。
   ============================================================ */


/* ============================================================
   0. 标记「JS 可用」
   在 <html> 上加一个 .js 类。style.css 里的进场动画写成
   `.js .reveal { opacity: 0 }`，只有 JS 正常运行时才会把内容
   先藏起来。万一 JS 报错或用户禁用 JS，内容依然正常显示 —— 不会白屏。
   ============================================================ */
document.documentElement.classList.add('js');


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
    }
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

  const sections = Array.from(document.querySelectorAll('section[id]'))
    .filter((section) => linkById.has(section.id));

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
    }
  );

  sections.forEach((section) => observer.observe(section));

  // 小补丁：滚到页面最底部时，上面那条带子可能扫不到最后一个板块，
  // 这里单独判断一下，保证滚到底时最后一个导航项是亮的。
  window.addEventListener(
    'scroll',
    () => {
      const atBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 4;
      if (atBottom) setActive(sections[sections.length - 1].id);
    },
    { passive: true } // passive：告诉浏览器这个监听器不会阻止滚动，滚动更流畅
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
  } catch (err) {
    // 静默失败，继续走方案 B
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
  } catch (err) {
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
  const supportsCssSmooth =
    'scrollBehavior' in document.documentElement.style;
  if (supportsCssSmooth) return;

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : document.body;
      if (!target) return;

      event.preventDefault();

      // 减去吸顶导航的高度，否则标题会被导航条盖住
      const headerHeight =
        document.querySelector('.header')?.offsetHeight ?? 0;
      const top =
        target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;

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
