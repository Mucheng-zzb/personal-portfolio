/**
 * 内容仓库：一份「当前该显示什么内容」的单一来源（v0.5-B）
 *
 * 为什么要有这一层：以前 script.js 直接 import 构建期数据，是个常量。
 * 现在内容可能来自两个地方 —— 构建期内置（virtual:content）与后端实时数据 ——
 * 渲染层不该知道区别，它只问「现在的内容是什么」。
 *
 * 三条硬规矩（v0.5-B 的硬验收）：
 *   1. **首屏绝不等待后端**。初始值就是构建期内容，页面立刻可读；
 *      后端数据到了再替换。所以这个模块的初始值是同步就绪的。
 *   2. **失败就保持构建期内容**。不出现空白，不出现半截数据 ——
 *      宁可整份是内置的，也不要一半实时一半内置（那样最难解释）。
 *   3. **reconcile 只发生在数据到手之后**。fetch 期间页面显示的是内置内容，
 *      不是「加载中」的空壳（没有空白转圈）。
 *
 * 注意这是 lib/ 层：**不碰 DOM**。状态怎么显示由调用方传给 onStatus 的回调决定
 * （script.js 把它接到 ui/live-status.js）。
 */

import content from 'virtual:content';
import { api, apiEnabled } from './api.js';

/** 当前内容。source 只用来回答「这份数据是哪来的」 */
const state = {
  profile: content.profile,
  now: content.now,
  projects: content.projects,
  notes: content.notes,
  source: 'build', // 'build' | 'live'
};

const listeners = new Set();

export const getContent = () => state;
export const isLive = () => state.source === 'live';

/** 订阅内容变化。返回取消订阅的函数。 */
export function onChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish() {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch (err) {
      // 渲染层出错不能把整条链路带下去（那会让页面停在半截状态）。
      // 这里刻意用 warning 而不是 error：v0.5-B 的硬验收要求降级路径上
      // 控制台【只有 warning】—— 而这一条本身也确实是「内容没换成实时的那份，
      // 页面回到内置内容即可继续用」，属于可降级的情形。
      console.warn('[live] 重新渲染时出错，保留当前内容：', err);
    }
  }
}

/**
 * 笔记正文的取舍。
 *
 * `/notes` 列表接口按契约【不含正文】（正文只在 /notes/{slug}）。
 * 打开一篇笔记时，构建期就有正文的那几篇直接复用，省掉一次请求；
 * 只存在于后端的新笔记没有正文，那时再按需取（script.js 的 openNoteDetail）。
 * 这样「列表来自实时、正文点开才拉」——既符合契约，又不让每次点开都付一次网络。
 */
function mergeNoteBodies(liveNotes) {
  const builtIn = new Map((content.notes || []).map((note) => [note.slug, note.body]));
  return liveNotes.map((note) =>
    builtIn.has(note.slug) ? { ...note, body: builtIn.get(note.slug) } : note,
  );
}

/**
 * 拉一次实时数据并替换内容。
 *
 * @param {(status: 'loading'|'ok'|'failed'|'disabled', detail?: object) => void} [onStatus]
 * @returns {Promise<{ok: boolean, reason?: string, error?: Error}>} 不抛异常 ——
 *          降级是预期路径，调用方不需要 try/catch。
 */
export async function startLiveSync(onStatus = () => {}) {
  if (!apiEnabled) {
    // 没配 VITE_API_BASE：站点就是纯静态的，不发请求、也不显示提示 ——
    // 没有后端可依赖，就谈不上「这份数据是快照」。
    onStatus('disabled');
    return { ok: false, reason: 'disabled' };
  }

  onStatus('loading');
  try {
    const data = await api.loadContent();

    state.profile = data.profile;
    state.projects = data.projects;
    state.notes = mergeNoteBodies(data.notes);
    state.now = data.now;
    state.source = 'live';

    publish();
    onStatus('ok', { projects: state.projects.length, notes: state.notes.length });
    return { ok: true };
  } catch (err) {
    // 到这里说明四个端点里至少有一个没成功 → 整份保持构建期内容（见规矩 2）
    onStatus('failed', { error: err });
    // console 与「用户可见文案」是两种东西，措辞刻意不同：
    // 可见文案要中性（D50：「显示的是构建时快照」—— 容器睡着是常态，而内容其实一字不差），
    // console 是给排查的人看的，说清技术含义就够。
    console.warn(`[api] 实时数据取不到，已回退到构建期内置内容 —— ${err?.toString?.() ?? err}`);
    return { ok: false, reason: 'error', error: err };
  }
}

export default { getContent, isLive, onChange, startLiveSync };
