/**
 * 建 DOM 的小工具。
 *
 * 刻意只走 createElement + textContent，不拼 innerHTML：
 * 这些文字来自 web/content/ 下的数据文件，属于「数据」而不是「代码」，
 * 不该被当成 HTML 解析（哪怕现在是自己写的，以后也可能是别处来的）。
 */

/**
 * @param {string} tag
 * @param {object} [attrs] class / text / dataset / 其他属性
 * @param {Array<Node|string>|Node|string} [children]
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(key, value);
  }

  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    node.append(child);
  }

  return node;
}

/** 清掉容器里已有的子节点，再挂上新的 */
export function render(container, nodes) {
  if (!container) return;
  container.replaceChildren(...[].concat(nodes).filter(Boolean));
}

/** 生成一串 <li class="tag">文字</li> */
export function tagList(items, { as = 'ul', itemClass = 'tag' } = {}) {
  return el(
    as,
    { class: 'tags' },
    items.map((text) => el('li', { class: itemClass, text })),
  );
}
