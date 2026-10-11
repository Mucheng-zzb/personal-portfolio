/**
 * 页脚的「实时数据」状态（v0.5-B）
 *
 * 四种状态，只有两种会真的出现在页面上：
 *   disabled —— 没配后端。**不显示**：站点就是静态的，谈不上「不可用」
 *   loading  —— 「正在获取实时数据…」+ 一个微光条（骨架感的进度信号）
 *   ok       —— 「实时数据已同步」，2.5 秒后自动收起
 *   failed   —— 「显示的是构建时快照」，常驻 ← 这是硬验收要求的那一条
 *               （文案于 v0.5.1 换过：容器睡着是常态，几乎每个访客都会看到它，
 *                而旧句读起来像站点坏了 —— 其实内容一字不差。旧句见那次提交）
 *
 * 为什么 loading 要有东西显示：免费实例冷启动要 30–60 秒。
 * 首屏内容已经立刻渲染了（不等后端），但如果没有一点动静，用户会以为
 * 「我看到的这些是不是过期的？」。微光条回答的就是这个问题。
 * 它**不是**占位骨架：内容和它同时显示，不是「先空着再填」。
 */

const OK_HIDE_DELAY_MS = 2500;

let okTimer = null;

export function setLiveStatus(status, detail = {}) {
  const box = document.getElementById('liveStatus');
  const text = box?.querySelector('.live-status__text');
  if (!box || !text) return;

  clearTimeout(okTimer);

  box.dataset.state = status;

  if (status === 'disabled' || status === 'ok') {
    if (status === 'ok') {
      // 成功也留一下痕迹：否则用户没法知道「这份数据是实时拉的还是内置的」。
      // 稍后自动收起 —— 页脚常驻一句成功提示是噪音。
      box.hidden = false;
      text.textContent = '实时数据已同步';
      box.removeAttribute('aria-busy');
      box.title = '';
      okTimer = setTimeout(() => {
        box.hidden = true;
      }, OK_HIDE_DELAY_MS);
      return;
    }
    box.hidden = true;
    box.removeAttribute('aria-busy');
    box.title = '';
    return;
  }

  box.hidden = false;

  if (status === 'loading') {
    text.textContent = '正在获取实时数据…';
    // aria-busy：屏幕阅读器会把这块当成「正在更新」，而不是「已经就位」
    box.setAttribute('aria-busy', 'true');
    box.title = '';
    return;
  }

  // failed：可见文案说「这是什么」，技术原因放 title（见 D50）
  box.removeAttribute('aria-busy');
  text.textContent = '显示的是构建时快照';
  const why = typeof detail.error?.toString === 'function' ? detail.error.toString() : '';
  box.title = why ? `正在显示构建期内置内容（${why}）` : '正在显示构建期内置内容';
}

export default setLiveStatus;
