/**
 * 浏览器侧的内容入口 —— 一层薄封装。
 *
 * 它只消费构建期注入的虚拟模块 virtual:content，仅此而已：
 * 不校验、不读文件、不做兜底解析。校验已经在构建期做完了
 * （web/build/content-schema.js），跑得起来的构建产物里内容一定是合法的。
 *
 * 如果这个 import 在编辑器里报「找不到模块」：那是正常的，
 * virtual:content 由 web/build/content-plugin.js 在构建时提供，
 * 编辑器没有插件上下文。构建能过就没问题。
 */

import content from 'virtual:content';

export const profile = content.profile;
export const now = content.now;
export const projects = content.projects;
export const notes = content.notes;

export default content;
