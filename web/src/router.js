/**
 * hash 路由。
 *
 * 【本模块最重要的约定：只接管以 #/ 开头的 hash】
 *
 *   #/               → 首页
 *   #/notes          → 笔记列表（可带 ?tag=xxx）
 *   #/notes/<slug>   → 笔记详情
 *
 *   #about / #skills / #projects / #hero / #now / #contact（不带斜杠）
 *                    → 完全不管，交回浏览器原生锚点滚动
 *
 * 为什么非要划这条线：整站导航用的就是 #about 这类锚点。路由一旦把它们也接管，
 * 轻则平滑滚动失效，重则点导航完全没反应 —— 等于把整站导航弄坏。
 * 所以 parseHash() 对这些返回 null，表示「不归我管」。
 *
 * 为什么用 hash 而不是 history 路由：GitHub Pages 没有服务端重写能力，
 * history 路由一刷新就 404（见 docs/ARCHITECTURE.md ADR-001）。
 *
 * 职责边界：本模块只做「匹配 + 通知」，不渲染内容（ARCHITECTURE §4）。
 * 具体显示哪个视图由调用方在回调里决定。
 */

/** '%E4%B8%AD' → '中'。解不开就原样返回 —— 路由不该因为一个坏链接整页崩掉。 */
function safeDecode(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/** 只按第一个分隔符切一次：'a?b?c' → ['a', 'b?c'] */
function splitOnce(text, sep) {
  const at = text.indexOf(sep);
  if (at === -1) return [text, ''];
  return [text.slice(0, at), text.slice(at + 1)];
}

/** 从 '?tag=Python' 的查询串里取 tag；没有就返回 null */
function readTag(query) {
  if (!query) return null;
  for (const pair of query.split('&')) {
    const [key, value] = splitOnce(pair, '=');
    if (key === 'tag' && value) return safeDecode(value);
  }
  return null;
}

/**
 * 解析 hash → 路由对象；不归本路由管的返回 null。
 *
 * 纯函数：不读 window、不碰 DOM，所以可以直接在 Node 里断言
 * （验收里的 parseHash('#about') === null 就是这么测的）。
 *
 * @param {string} hash 形如 '#/notes/xxx'（带不带 # 都接受）
 * @returns {{name:'home'}|{name:'notes', tag:string|null}|{name:'note', slug:string}|null}
 */
export function parseHash(hash) {
  const raw = String(hash ?? '');
  const body = raw.startsWith('#') ? raw.slice(1) : raw;

  // 关键一步：不以 / 开头就不是我们的路由。
  // ''（无 hash）、'#about'、'#hero' 全都从这里返回 null，
  // 后面交给浏览器原生锚点滚动，路由一个字都不碰。
  if (!body.startsWith('/')) return null;

  const [pathPart, queryPart] = splitOnce(body, '?');
  const segments = pathPart.split('/').filter(Boolean); // '/notes/x' → ['notes','x']

  if (segments.length === 0) return { name: 'home' }; // '#/' 或 '#/?...'

  if (segments[0] === 'notes') {
    if (segments.length === 1) return { name: 'notes', tag: readTag(queryPart) };
    if (segments.length === 2) return { name: 'note', slug: safeDecode(segments[1]) };
  }

  // 其它 #/... 不认识的，回落到首页，不报错、不留白屏
  return { name: 'home' };
}

/**
 * 订阅 hash 变化并立即处理一次。
 *
 * 为什么要显式跑第一次：hashchange 在首次加载时【不会】触发。
 * 少了这一步，把 #/notes/<slug> 直接粘贴到新标签页打开会停在首页，
 * 而这个 bug 只有真的粘贴一次链接才发现得了。
 *
 * @param {(route: object|null, hash: string) => void} onRoute
 *   route 为 null 表示「这次 hash 不归路由管」（多半是个锚点）。
 * @returns {() => void} 手动触发一次的函数（一般用不到，测试时方便）
 */
export function startRouter(onRoute) {
  const handle = () => onRoute(parseHash(window.location.hash), window.location.hash);

  window.addEventListener('hashchange', handle);
  handle();

  return handle;
}
