/**
 * 明暗主题切换。
 *
 * 【分工要说清楚，否则以后一定会改错地方】
 *
 *   「首屏用哪个主题」不归本模块管 —— 那是 index.html <head> 里的一段内联脚本定的，
 *   它在样式表之前同步执行，先把 theme-light / theme-dark 打到 <html> 上，
 *   所以刷新时不会先闪一下别的颜色。本模块跑的时候，class 早就有了。
 *
 *   本模块只负责「用户点了按钮之后」：换 class、写 localStorage、同步按钮的无障碍名。
 *
 * 两边读的是同一个 localStorage 键（'theme'）——改键名时两处都要改。
 * 取值只有 'light' / 'dark'；【没有值】= 用户没显式选过 = 跟随系统。
 *
 * 为什么把「没选过」和「选了暗色」区分开：前者要跟着系统实时变
 * （晚上系统自动切暖色时页面也该跟着切），后者是用户的明确意愿，系统再变也不动它。
 */

const STORAGE_KEY = 'theme';

/** 用户显式选过什么；没选过（或隐私模式下读不到）返回 null */
function savedTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    // Safari 无痕模式等场景下 localStorage 会直接抛异常。
    // 这里当"没选过"处理：只影响记忆功能，不影响当次切换。
    return null;
  }
}

/** 当前页面上生效的主题 = <html> 上挂着哪个 class */
function activeTheme() {
  return document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle('theme-light', theme === 'light');
  root.classList.toggle('theme-dark', theme === 'dark');

  // 手机上地址栏 / 状态栏的颜色跟着走。没这个 meta 时静默跳过。
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f7f8fc' : '#0a0b10');
}

/**
 * 按钮的无障碍名要写「点下去会发生什么」，而不是「现在是什么」——
 * 读屏用户听到的是下一步动作。图标本身 aria-hidden，不参与朗读。
 */
function syncToggleLabel(toggle) {
  if (!toggle) return;
  const next = activeTheme() === 'light' ? '暗色' : '亮色';
  toggle.setAttribute('aria-label', `切换到${next}主题`);
}

export function initTheme() {
  const toggle = document.getElementById('themeToggle');

  applyTheme(activeTheme());
  syncToggleLabel(toggle);

  toggle?.addEventListener('click', () => {
    const next = activeTheme() === 'light' ? 'dark' : 'light';
    applyTheme(next);
    syncToggleLabel(toggle);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 存不下就只当次生效。不弹提示 —— 主题没记住不值得打断用户。
    }
  });

  // 只在「用户没显式选过」时跟随系统实时变化。
  // addEventListener 在旧 Safari 上不存在（只有 addListener），所以先判断再绑。
  const media =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: light)')
      : null;
  if (!media) return;

  const onSystemChange = (event) => {
    if (savedTheme()) return; // 用户选过了，系统怎么变都不动
    applyTheme(event.matches ? 'light' : 'dark');
    syncToggleLabel(toggle);
  };

  if (typeof media.addEventListener === 'function')
    media.addEventListener('change', onSystemChange);
  else if (typeof media.addListener === 'function') media.addListener(onSystemChange);
}
