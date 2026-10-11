/**
 * 后端 API 的请求封装（v0.5-B）
 *
 * 全站只有这一个文件会发网络请求。ui/* 只负责「收到数据 → 生成 DOM」，
 * 这条分工从 v0.3 起就没变过；这里是那条线之外唯一的口子，所以规矩都集中写在这儿：
 *
 *   1. **超时 3 秒**。免费实例冷启动要 30–60 秒，等它等于首屏卡死。
 *      3 秒拿不到就走降级 —— 用户看的是内容，不是我们的后端有没有醒着。
 *   2. **只重试 1 次**，且只重试「可能自愈」的失败（网络错、超时、5xx）。
 *      4xx 重试没有意义：同样的请求会得到同样的 404/422，重试只是浪费。
 *      这条也保证故障演练里「请求数不放大」。
 *   3. **错误归一化**：不管底层是断网、超时、CORS 还是后端 503，
 *      调用方拿到的都是一个带 kind/status/code 的对象，不用去认各浏览器
 *      五花八门的 DOMException 文案。
 *   4. **绝不 console.error**。后端挂掉是预期内的降级路径，不是代码错误；
 *      控制台刷红字会让人以为站点坏了。降级只打 warning（硬验收要求）。
 *
 * 后端基址来自构建期注入的 VITE_API_BASE：
 *   · 没配（空）→ api.enabled === false，**一个请求都不发**，站点就是纯静态。
 *     这样本地开发、以及 Render 还没建好的时候，站点都是完整可用的。
 *   · 配了 → 启动时拉一次实时数据，失败就回退到构建期内置内容。
 */

/** 去掉结尾的斜杠，避免拼出 `//api/v1/...`（有些服务会 301） */
const BASE = String(import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

/** 超时：3 秒。见上面第 1 条 */
const TIMEOUT_MS = 3000;

/** 重试次数：1（总共最多 2 次请求）。见上面第 2 条 */
const MAX_RETRIES = 1;

/** 列表一次要多少条。上限就是接口允许的 100 —— 传小了会静默截断内容 */
const PAGE_SIZE = 100;

export const apiEnabled = BASE !== '';

/**
 * 给这次请求配一个 id 并随请求发出去。
 *
 * 用途只有排查：后端会把合法的 X-Request-Id 原样回显，也会写进它自己的日志。
 * 前端在控制台把 id 打出来，用户截图给你看时，拿这个 id 就能在服务端日志里
 * 找到那一次请求 —— 不用靠时间戳去猜。形状必须合法（64 位以内、字母数字），
 * 否则后端会当成伪造值换掉。
 */
function newRequestId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replace(/-/g, '');
  } catch {
    /* 非安全上下文下 randomUUID 不存在，走下面的兜底 */
  }
  return Math.random().toString(16).slice(2, 14) + Date.now().toString(16);
}

/**
 * 归一化后的错误。
 *
 * kind 的取值（调用方只需要认这几个）：
 *   'timeout'   —— 超过 3 秒
 *   'network'   —— 断网 / DNS 失败 / CORS 被拒 / 服务不存在
 *   'http'      —— 拿到了响应但状态码不是 2xx（status/code 会有值）
 *   'parse'     —— 响应不是合法 JSON
 */
export class ApiError extends Error {
  constructor(kind, message, { status = 0, code = null, requestId = null, cause = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.cause = cause;
  }

  /** 可自愈 = 值得重试一次；4xx 不值得 */
  get retryable() {
    if (this.kind === 'timeout' || this.kind === 'network' || this.kind === 'parse') return true;
    return this.status >= 500;
  }

  toString() {
    return `[${this.kind}${this.status ? ' ' + this.status : ''}] ${this.message}`;
  }
}

/** 一次请求（不含重试）。抛出的都是 ApiError。 */
async function attempt(path, { requestId, timeoutMs = TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${BASE}/api/v1${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json', 'X-Request-Id': requestId },
      signal: controller.signal,
      // 后端是只读的、内容变更靠 /health?reload=true，所以不吃浏览器缓存也没关系；
      // 这里用 default，让 GitHub Pages 与 CDN 的规则照常起作用。
      credentials: 'omit',
      mode: 'cors',
    });
  } catch (err) {
    // 中断有两种来源：我们自己的超时，或页面卸载。前者按 timeout 报。
    if (controller.signal.aborted) {
      throw new ApiError('timeout', `请求超过 ${timeoutMs}ms 未完成`, { cause: err });
    }
    throw new ApiError('network', '请求发不出去（断网 / 服务不存在 / CORS 被拒）', { cause: err });
  } finally {
    clearTimeout(timer);
  }

  // 后端的统一错误结构：{ error: { code, message, request_id } }
  let payload = null;
  try {
    payload = await response.json();
  } catch (err) {
    if (response.ok) {
      throw new ApiError('parse', '响应不是合法 JSON', { status: response.status, cause: err });
    }
    // 不是 2xx 又解析不出 JSON（例如 CORS 预检被拒返回的纯文本），
    // 下面按状态码报错即可，不必在这里抛。
  }

  if (!response.ok) {
    const detail = payload?.error;
    throw new ApiError('http', detail?.message || `后端返回 ${response.status}`, {
      status: response.status,
      code: detail?.code || null,
      requestId: detail?.request_id || response.headers.get('X-Request-Id'),
    });
  }

  if (payload === null) {
    throw new ApiError('parse', '响应体是空的', { status: response.status });
  }
  return payload;
}

/** 带重试的请求。重试间隔 300ms —— 给唤醒中的实例一点时间，又不至于拖长降级。 */
export async function get(path, { timeoutMs, retries = MAX_RETRIES } = {}) {
  if (!apiEnabled) {
    throw new ApiError('network', 'VITE_API_BASE 没配，实时数据未启用');
  }

  let lastError = null;
  for (let tries = 0; tries <= retries; tries += 1) {
    const requestId = newRequestId();
    try {
      return await attempt(path, { requestId, timeoutMs });
    } catch (err) {
      lastError = err;
      if (!(err instanceof ApiError) || !err.retryable || tries === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw lastError;
}

/* ============================================================
   具体端点。形状与构建期内容一致，所以拿回来可以直接喂给 ui/*
   （唯一差别：可选的 repo/live/cover/featured 后端会补 null，
   而构建期产物是直接省略。渲染层用真值判断，两者等价。）
   ============================================================ */

export const api = {
  enabled: apiEnabled,
  base: BASE,
  health: () => get('/health'),
  profile: () => get('/profile'),
  projects: ({ tag, status } = {}) => {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (tag) query.set('tag', tag);
    if (status) query.set('status', status);
    return get(`/projects?${query}`).then((page) => page.items);
  },
  project: (slug) => get(`/projects/${encodeURIComponent(slug)}`),
  notes: () => get(`/notes?limit=${PAGE_SIZE}`).then((page) => page.items),
  note: (slug) => get(`/notes/${encodeURIComponent(slug)}`),
  now: () => get('/now'),

  /** 四个端点并行拉取，凑成与 virtual:content 同形状的一份内容 */
  async loadContent() {
    const [profile, projects, notes, now] = await Promise.all([
      api.profile(),
      api.projects(),
      api.notes(),
      api.now(),
    ]);
    return { profile, projects, notes, now };
  },
};

export default api;
