/**
 * hash 路由。
 *
 * 【本模块最重要的约定：只接管以 #/ 开头的 hash】
 *
 *   #/               → 首页
 *   #/notes          → 笔记列表（可带 ?tag=xxx）
 *   #/notes/<slug>   → 笔记详情
 *   #/projects       → 项目列表（可带 ?status=done&tag=Python）
 *   #/resume         → 简历页
 *
 *   #about / #skills / #projects / #hero / #now / #contact（不带斜杠）
 *                    → 完全不管，交回浏览器原生锚点滚动
 *
 * 为什么非要划这条线：整站导航用的就是 #about 这类锚点。路由一旦把它们也接管，
 * 轻则平滑滚动失效，重则点导航完全没反应 —— 等于把整站导航弄坏。
 * 所以 parseHash() 对这些返回 null，表示「不归我管」。
 *
 * 【项目筛选为什么挂在 #/projects 上，而不是给首页的 #projects 锚点挂参数】
 * 需求写的是「筛选状态反映在 URL 查询参数上」。最直观的做法是给首页那个
 * #projects 锚点加参数（#projects?status=done），但 hash 里 ? 之前的部分一旦
 * 不是纯 id，浏览器就找不到同名元素，原生锚点滚动当场失效；而且路由规则要
 * 额外开一个「不带斜杠也带参数」的口子，等于把上面那条线弄脏。
 * 所以筛选参数挂在 #/projects 这条路由上 —— 目标（可分享的筛选视图）完全一致，
 * 且锚点契约一个字都没动。
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

/**
 * 项目列表的状态筛选值。UI 上只有「全部 / 已完成 / 进行中」三档，
 * 而 content 里的 status 有三档（done / wip / planned），
 * 所以「进行中」= wip 或 planned，在 URL 里记作 doing。
 */
export const PROJECT_STATUS_FILTERS = ['done', 'doing'];

/**
 * 解析 '?status=done&tag=Python' 型查询串。
 *
 * 只认 tag 与 status 两个键，其余忽略 —— 认不出来的参数不该让页面出错。
 * 值里带 & 或 = 的情况不处理（encodeURIComponent 会把它们转义掉，够用了）。
 */
function readQuery(query) {
  const out = { tag: null, status: null };
  if (!query) return out;

  for (const pair of query.split('&')) {
    const [key, value] = splitOnce(pair, '=');
    if (!value) continue;
    if (key === 'tag') out.tag = safeDecode(value);
    else if (key === 'status') out.status = safeDecode(value);
  }

  // status 是封闭集合：写成别的值（手改链接、或以前用过的旧值）一律当「全部」，
  // 而不是甩一个空列表给用户。tag 是开放集合，认不出来的标签空列表本身就是正确答案。
  if (!PROJECT_STATUS_FILTERS.includes(out.status)) out.status = null;

  return out;
}

/**
 * 解析 hash → 路由对象；不归本路由管的返回 null。
 *
 * 纯函数：不读 window、不碰 DOM，所以可以直接在 Node 里断言
 * （验收里的 parseHash('#about') === null 就是这么测的）。
 *
 * @param {string} hash 形如 '#/notes/xxx'（带不带 # 都接受）
 * @returns {{name:'home'}
 *          |{name:'notes', tag:string|null}
 *          |{name:'note', slug:string}
 *          |{name:'projects', status:string|null, tag:string|null}
 *          |{name:'resume'}
 *          |null}
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

  const query = readQuery(queryPart);

  if (segments.length === 1) {
    if (segments[0] === 'notes') return { name: 'notes', tag: query.tag };
    if (segments[0] === 'projects') {
      return { name: 'projects', status: query.status, tag: query.tag };
    }
    if (segments[0] === 'resume') return { name: 'resume' };
  }

  if (segments[0] === 'notes' && segments.length === 2) {
    return { name: 'note', slug: safeDecode(segments[1]) };
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
