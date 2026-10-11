// ESLint flat config（ESLint 9+ 的写法，旧的 .eslintrc 已不推荐）
//
// 两套环境要分开声明，否则会互相误报：
//   - script.js 与 src/** 跑在浏览器里 → globals.browser（document / window / fetch …）
//   - build/**、scripts/**（.mjs）、vite.config.js 跑在 Node 里 → globals.node（process / console …）
// 不区分的话，浏览器代码会被报 "process is not defined"，反之亦然。
//
// 注意：src/lib/content.js 里 `import content from 'virtual:content'` 是构建期
// 虚拟模块，ESLint 解析不到它，但 recommended 规则集不含模块解析检查，所以不会误报。

import js from '@eslint/js';
import globals from 'globals';

export default [
  // 产物与依赖不是我们写的，不检查
  { ignores: ['dist/**', 'node_modules/**'] },

  js.configs.recommended,

  {
    files: ['script.js', 'src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
  },

  {
    files: ['build/**/*.js', 'scripts/**/*.mjs', 'vite.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },
];
