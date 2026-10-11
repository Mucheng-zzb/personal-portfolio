/**
 * 格式化小工具：日期、阅读时长。
 *
 * 职责边界（docs/ARCHITECTURE.md §4）：纯计算，不碰 DOM、不读数据文件、不发请求。
 */

/**
 * '2026-10-11' → '2026 年 10 月 11 日'
 *
 * 刻意【不用】 new Date('2026-10-11')：那会按 UTC 午夜解析，
 * 处在负时区（比如 UTC-5）的读者会看到前一天，是典型的差一天 bug。
 * 手工拆字符串没有这个问题 —— 与 web/build/content-schema.js 里
 * isRealDate() 用 UTC 取值的谨慎是同一条理由。
 *
 * 格式不对时原样返回，不抛错：日期合法性由构建期校验负责（构建不过就上不了线）。
 */
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!m) return String(iso ?? '');
  const [, year, month, day] = m;
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
}

/**
 * 预计阅读时长（分钟）。
 *
 * 口径：中日韩字符按「每字一个词」算，其余按空白切词，两者相加再按 300 词/分钟折算。
 * 中英混排时分开计数是必要的 —— 整段中文如果没有空白，按空白切只会得到 1 个词。
 * 代码块与行内代码不算阅读量（读代码和读散文的速度不是一回事）。
 *
 * 只求量级正确，不追求精确；最少返回 1 分钟，避免出现「约 0 分钟」。
 */
export function readingTime(md) {
  const text = String(md ?? '')
    .replace(/```[\s\S]*?```/g, ' ') // 围栏代码块
    .replace(/`[^`\n]*`/g, ' ') // 行内代码
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1'); // 链接只保留可见文字

  // 用 \u 转义而不是直接写汉字/假名，免得一行里塞满肉眼分不清的字符范围
  // 汉字扩展A + 基本汉字 + 日文假名 + 谚文
  const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g;

  const cjk = (text.match(CJK) || []).length;

  const latin = text.replace(CJK, ' ').split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.ceil((cjk + latin) / 300));
}
