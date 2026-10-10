// Vite 配置 —— https://vite.dev/config/
// 这个文件只需要管两件事，但两件都是"漏了就线上白屏"的那种。
import { defineConfig } from 'vite';
import { contentPlugin } from './build/content-plugin.js';

export default defineConfig({
  plugins: [
    // 内容管线：读 web/content/ → 校验 → 以 virtual:content 暴露给页面。
    // 校验不通过时构建直接失败，详见 build/content-schema.js 开头的说明。
    contentPlugin(),
  ],

  // ① 线上地址是子路径，不是域名根目录：
  //    https://mucheng-zzb.github.io/personal-portfolio/
  //    所以页面里的资源必须写成 /personal-portfolio/assets/xxx.js。
  //    漏掉这一行，构建照样成功，但线上会白屏 + 控制台一堆 404。
  //    开发服务器也会跟着变成 http://localhost:5173/personal-portfolio/，
  //    这是正常的，不是地址写错了。
  base: '/personal-portfolio/',

  build: {
    // 产物目录：web/dist（相对本文件所在的 web/），纯静态文件，可直接交给 Pages。
    outDir: 'dist',
    // 每次构建前清空 dist：否则删掉的旧文件会留在里面，骗过肉眼检查。
    emptyOutDir: true,
  },
});
