/**
 * 内容管线（Vite 插件）
 *
 * 职责：
 *   1. 把 web/content/ 下的文件读进来 → 交给 content-schema.js 校验；
 *   2. 校验通过 → 以一个「虚拟模块」virtual:content 暴露给浏览器侧代码；
 *      校验失败 → 构建直接失败（npm run build 退出码非 0）；
 *   3. dev 模式下监听 web/content/，改内容自动重新校验 + 全量刷新；
 *      改坏了就弹 Vite 错误覆盖层，但【不退出】dev server。
 *
 * 为什么走虚拟模块而不是把数据写成一个 .json 文件：
 *   校验必须发生在构建期，而「构建期」最自然的挂载点就是插件。
 *   写死一个中间 json 会多出一份可能过期、可能忘了重新生成的产物。
 *
 * 绝对不许做的事：往数据里注入构建时间 / 随机数 / 绝对路径 / 机器名。
 * 一旦注入，两次构建的产物就不一样了，「构建可复现」这条基线会被破坏。
 */

import fs from 'node:fs';
import path from 'node:path';
import { validateContent, formatContentErrors, MD_COLLECTIONS } from './content-schema.js';

const VIRTUAL_ID = 'virtual:content';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const PLUGIN_NAME = 'vite-plugin-content';

/**
 * 站点源。必须是写死的常量 —— 不能从 env / 主机名 / 构建时间推导，
 * 否则同一份代码在不同机器上会产出不同的 sitemap，「构建可复现」就没了。
 * 路径前缀取 vite.config.js 的 base（只有路径、没有源，所以源只能在这儿写）。
 */
const SITE_ORIGIN = 'https://mucheng-zzb.github.io';

/**
 * sitemap.xml —— 只列站点根 URL，不列笔记。
 *
 * 为什么不逐篇列出笔记：笔记路由是 hash（#/notes/<slug>），而 URL 的 fragment
 * 对爬虫不可见 —— #/notes/a 与 #/notes/b 在爬虫眼里是同一个文档（index.html）。
 * 逐篇列出来既不会被单独收录，还会让人误以为做了 SEO。
 * 等构建期预渲染（笔记 > 30 篇触发，见 docs/ARCHITECTURE.md §13）之后，
 * 每篇笔记会有自己的真实 URL，那时再逐篇列出。
 *
 * 严禁写入构建时间或 <lastmod>：会破坏 v0.2-A 验证过的可复现构建。
 * 真要 lastmod，也只能用内容自身的日期。
 */
function buildSitemap(siteUrl) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  笔记路由是 hash（#/notes/<slug>）。fragment 对爬虫不可见，
  爬虫会把 #/notes/a 与 #/notes/b 视作同一个文档（首页），所以这里不逐篇列出；
  等构建期预渲染（笔记 > 30 篇触发，见 docs/ARCHITECTURE.md §13）后再逐篇列出。
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
  </url>
</urlset>
`;
}

/** robots.txt —— 允许全站抓取，并指向绝对地址的 sitemap。不禁 /assets/。 */
function buildRobots(siteUrl) {
  return `User-agent: *
Allow: /

Sitemap: ${siteUrl}sitemap.xml
`;
}

export function contentPlugin() {
  /** 仓库根目录（web/ 的上一级）—— 报错里的路径要相对它来写 */
  let repoRoot = process.cwd();
  let root = path.join(repoRoot, 'web');

  let isDev = false;
  let server = null;
  let state = { data: null, errors: [] };
  /** 来自 vite.config.js 的 base，默认 '/'；只用来拼 sitemap 的绝对地址 */
  let base = '/';

  const contentDir = () => path.join(root, 'content');

  /**
   * 站点根 URL：SITE_ORIGIN + base。
   * base 可能是 '/repo/'、'/repo'、'./' 或 ''，统一成「以 / 开头、以 / 结尾」，
   * 这样拼 sitemap.xml 时不用在每个调用点再判一次。
   */
  function siteUrl() {
    let b = base === './' ? '/' : base;
    if (!b.startsWith('/')) b = '/' + b;
    if (!b.endsWith('/')) b += '/';
    return SITE_ORIGIN + b;
  }

  /** 绝对路径 → 相对仓库根的正斜杠路径，例如 web/content/profile.json */
  function rel(abs) {
    return path.relative(repoRoot, abs).split(path.sep).join('/');
  }

  /* ---------------- 读取 ---------------- */

  function readJsonFile(abs) {
    if (!fs.existsSync(abs)) return null;
    return { path: rel(abs), text: fs.readFileSync(abs, 'utf8') };
  }

  function readMarkdownFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => name.toLowerCase().endsWith('.md'))
      .sort() // 排序保证读取顺序确定 → 校验顺序与报错顺序稳定
      .map((name) => {
        const abs = path.join(dir, name);
        return { path: rel(abs), text: fs.readFileSync(abs, 'utf8'), abs };
      });
  }

  function collectFiles() {
    return {
      profile: readJsonFile(path.join(contentDir(), 'profile.json')),
      now: readJsonFile(path.join(contentDir(), 'now.json')),
      projects: readMarkdownFiles(path.join(contentDir(), 'projects')),
      notes: readMarkdownFiles(path.join(contentDir(), 'notes')),
    };
  }

  /* ---------------- 校验 ---------------- */

  function revalidate() {
    const files = collectFiles();
    const { data, errors } = validateContent(files);

    state = { data, errors };
    return state;
  }

  /** 校验失败时统一的处理：打印 → 构建就 throw（退出码非 0），dev 就弹覆盖层 */
  function fail(errors, context) {
    const message = formatContentErrors(errors);

    if (!isDev) {
      // 先原样打印一遍，保证即使 Vite 的报错包装把信息截断，完整清单也在终端里
      console.error(`\n${message}\n`);
      throw new Error(message);
    }

    console.error(`\n${message}\n`);
    server?.ws.send({
      type: 'error',
      err: {
        message,
        stack: '',
        plugin: PLUGIN_NAME,
        id: context || contentDir(),
      },
    });
  }

  function clearOverlayAndReload() {
    // 内容修好了：让页面重新拉一次虚拟模块，覆盖层随之消失
    server?.ws.send({ type: 'full-reload' });
  }

  /* ---------------- dev：重新校验 + 通知浏览器 ---------------- */

  let timer = null;

  function scheduleRevalidate(reason) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const { errors } = revalidate();

      const mod = server?.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);

      if (errors.length) fail(errors, reason);
      else clearOverlayAndReload();
    }, 30);
  }

  const isContentFile = (file) =>
    path.resolve(file).startsWith(contentDir() + path.sep) || path.resolve(file) === contentDir();

  return {
    name: PLUGIN_NAME,
    // 必须在 vite:build-html 之前跑，才能在 HTML 解析前就抛出内容错误
    enforce: 'pre',

    configResolved(config) {
      root = config.root;
      repoRoot = path.resolve(config.root, '..');
      base = config.base || '/';
    },

    buildStart() {
      const { errors } = revalidate();

      // 把这些文件挂进 rollup 的 watch 列表：内容变了要让构建失效。
      // 按 MD_COLLECTIONS 遍历，将来再加集合不用回来改这里。
      const files = collectFiles();
      for (const kind of Object.keys(MD_COLLECTIONS)) {
        for (const f of files[kind] || []) this.addWatchFile?.(f.abs);
      }
      const profileAbs = path.join(contentDir(), 'profile.json');
      const nowAbs = path.join(contentDir(), 'now.json');
      if (fs.existsSync(profileAbs)) this.addWatchFile?.(profileAbs);
      if (fs.existsSync(nowAbs)) this.addWatchFile?.(nowAbs);

      if (errors.length) fail(errors);
    },

    /**
     * 构建产物里补两个静态文件：sitemap.xml 与 robots.txt。
     *
     * 挂在 generateBundle 而不是 buildStart：这个钩子在 emptyOutDir 清空 dist
     * 之后才跑，写进去的文件不会被清掉；dev（serve 模式）下它根本不触发，
     * 所以也不会撞上「emitFile 在 serve 模式不支持」的警告。
     */
    generateBundle(_options, _bundle, isWrite) {
      // 只有真的要落盘时才写（调用方可以不写盘地触发这个钩子）
      if (!isWrite) return;

      const url = siteUrl();

      // 必须用 fileName：用 name 会被 Vite 的 assetFileNames 规则接管，
      // 文件会跑到 assets/robots-<hash>.txt 去，而不是 dist 根目录。
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemap(url) });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buildRobots(url) });
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },

    load(id) {
      if (id !== RESOLVED_ID) return null;

      if (state.errors.length) {
        if (!isDev) {
          // buildStart 已经抛过了；这里兜底，防止有人单独请求这个模块
          throw new Error(formatContentErrors(state.errors));
        }
        // dev：给一个空壳，覆盖层已经在 fail() 里弹出来了，
        // 别让模块解析失败把整页搞崩（那样连覆盖层都看不见）
        return 'export default { profile: null, now: null, projects: [], notes: [] };';
      }

      // 只导出校验后的数据本身；不含时间戳/路径/随机值
      return `export default ${JSON.stringify(state.data)};`;
    },

    configureServer(devServer) {
      isDev = true;
      server = devServer;

      const { errors } = revalidate();
      if (errors.length) fail(errors);

      // web/content/ 整个目录进监听，这样「新增文件」才有事件
      devServer.watcher.add(contentDir());

      // 新增 / 删除 .md 不会命中 hotUpdate（文件还不在模块图里），单独接一下
      const onFsEvent = (file) => {
        if (isContentFile(file)) scheduleRevalidate(file);
      };
      devServer.watcher.on('add', onFsEvent);
      devServer.watcher.on('unlink', onFsEvent);
    },

    /**
     * 内容文件变化 → 重新校验 → 让虚拟模块失效 → 全量刷新。
     * 内容变化不做细粒度 HMR：整页刷新更简单，也不会留下半旧半新的 DOM。
     *
     * 注：Vite 6 起 handleHotUpdate 已被 hotUpdate 取代（Vite 8 里旧名字会打
     * 弃用警告），所以这里用新名字。
     */
    hotUpdate(ctx) {
      if (!isContentFile(ctx.file)) return;

      scheduleRevalidate(ctx.file);
      // 返回空数组：告诉 Vite 这次不用走它自己那套 HMR，我们手动全量刷新
      return [];
    },
  };
}
