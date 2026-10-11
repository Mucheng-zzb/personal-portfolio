/**
 * Markdown → 安全 HTML。
 *
 * 职责边界（docs/ARCHITECTURE.md §4）：本模块是「Markdown → 安全 HTML」，
 * 【不处理业务字段】、【不碰 DOM】。所以这里只导出字符串和「给已有节点上色」，
 * 真正把 HTML 插进页面的那一行在 web/src/ui/notes.js —— 只此一处，便于审计。
 *
 * 清洗是硬性要求，不是可选优化：笔记正文来自 web/content/，属于「数据」，
 * 绝不能当成可信 HTML 直接插进页面。
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import c from 'highlight.js/lib/languages/c';

/*
   高亮配色【不在这里引】。

   v0.3 时这里引的是 highlight.js 自带的 github-dark.css，那份 CSS 的颜色是写死的，
   跟着明暗主题切换只能靠 JS 换 <link>，而换样式表必然闪一下。
   v0.4 改成：配色写进 web/style.css，用 --hl-* 变量表达两套主题
   （规则见 style.css §4.10 末尾，变量见 :root 与 html.theme-light）。
   于是切主题时配色自动跟着走，这个模块一个字节的 CSS 都不用管。
*/

/* ------------------------------------------------------------------
   只注册用得到的 6 种语言（python / javascript / sql / bash / json / c）。
   加 c（以后要写 C 练习笔记）实测 +1.66 KB gzip；cpp 单独再 +1.54 KB，
   合计会越过 3 KB 这条线，所以 C++ 等真要用了再加。

   【体积警戒】这里走的是 highlight.js/lib/core。
   改成完整的 'highlight.js' 或 common 构建，光它自己就约 40KB gzip，
   会把首屏 JS 顶到 80KB 门槛线上 —— 那是本仓「是否改懒加载」的分界。
   加语言是加一行 import + 一行 registerLanguage，别图省事换成全量构建。
   ------------------------------------------------------------------ */
hljs.registerLanguage('python', python);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('c', c);

/**
 * Markdown → 清洗后的 HTML 字符串。
 *
 * marked.parse() 默认【同步】返回字符串（async 未开启），不要 await。
 * 不传 highlight / mangle / headerIds / langPrefix：这些选项在 marked v8 已从核心移除，
 * 传了是静默无效（网上 v4–v12 的教程大多已经过期）。
 * 也不需要自定义 renderer：默认的 Renderer.code 本来就会输出
 * class="language-xxx"，正好是 highlight.js 认的格式。
 */
export function renderMarkdown(md) {
  // 先渲染，再清洗 —— 这两步的顺序不能反
  return DOMPurify.sanitize(marked.parse(String(md ?? '')));
}

/**
 * 给容器里每个代码块上色。
 *
 * 由调用方在 HTML 【已经插入 DOM 之后】调用：先清洗、再插入、最后高亮。
 * （highlight.js 会读节点在文档中的位置，所以必须在插入之后。）
 *
 * 语言没注册就跳过 —— 不报错、也不会渲染成乱码。
 * 注意 hljs.highlightElement() 在【没有】语言类名时会退化成自动检测（highlightAuto），
 * 这里用 getLanguage() 把它挡住：猜错语言比不上色更难看。
 * 另外，同一个节点重复高亮会告警「Element previously highlighted」，
 * 所以换文章时用 replaceChildren 整块替换，不要复用节点。
 */
export function highlightCodeBlocks(root) {
  if (!root) return;

  for (const block of root.querySelectorAll('pre code')) {
    const lang = (block.className.match(/language-([\w-]+)/) || [])[1];
    if (!lang || !hljs.getLanguage(lang)) continue;
    hljs.highlightElement(block);
  }
}
