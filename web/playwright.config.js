// 两条黑盒冒烟测试的配置（v0.5.x 加固，D43）
//
// 为什么是「黑盒」：这两条守的都是**站点在坏情况下还能不能用**，
// 而那不是任何单个模块能证明的事 —— 必须真的起一个服务器、真的用浏览器打开。
// 它们不 import 任何 src/ 下的代码，只看浏览器里出现了什么。
//
//   ① 禁用 JS：姓名 / 定位 / 邮箱 / GitHub 四项仍然可见
//      （CLAUDE.md 的硬性约束，也是 ROADMAP §8 发布清单的一项）
//   ② 后端不可达：项目卡仍有内容，页脚出现「实时数据不可用」
//      （v0.5 的核心验收：后端失败不能让站点跟着坏）
//
// 两条各用自己的一份产物，所以起了两个 preview 服务器：
//   4173 → dist/（默认构建，VITE_API_BASE 未注入 → 纯静态）
//   4174 → dist-api-down/（死域名构建，先跑 `node scripts/build-api-down.mjs`）
//
// 浏览器：默认用 Playwright 自带的 chromium。本机若下不动浏览器
// （HTTPS 走中间人代理时 `playwright install` 会卡在 0%），用 PW_CHANNEL=chrome
// 改走系统已装的 Chrome —— 它不影响被测页面，只是换了个浏览器跑。

import { defineConfig } from '@playwright/test';

const BASE_PATH = '/personal-portfolio/';
const PORT_STATIC = 4173;
const PORT_API_DOWN = 4174;

// CI 上用自带 chromium；本机可 PW_CHANNEL=chrome 走系统 Chrome。
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: './tests/smoke',

  // 两条测试彼此独立（不同端口、不同产物），并行跑。
  fullyParallel: true,

  // 本地留着 test.only 方便调试；CI 上它会让「只跑了一条」变成假绿灯，必须禁止。
  forbidOnly: !!process.env.CI,

  // 这两条断言的是确定性行为（不看分数、不量时间），不该有 flake。
  // CI 上留 1 次重试只是为了对冲服务器启动慢这种环境噪声；本地 0 次，
  // 免得偶发失败被重试掩盖成绿色。
  retries: process.env.CI ? 1 : 0,

  reporter: process.env.CI ? [['list'], ['github']] : [['list']],

  use: {
    channel,
    // 失败时留证据：CI 的日志会过期，trace 不会。
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'no-js',
      testMatch: /no-js\.spec\.js/,
      use: { baseURL: `http://127.0.0.1:${PORT_STATIC}${BASE_PATH}` },
    },
    {
      name: 'api-down',
      testMatch: /api-down\.spec\.js/,
      use: { baseURL: `http://127.0.0.1:${PORT_API_DOWN}${BASE_PATH}` },
    },
  ],

  webServer: [
    {
      // --host 127.0.0.1 是必须的：vite preview 默认只绑 `localhost`，
      // 而本机上 `localhost` 先解析到 ::1（IPv6）—— 于是 Playwright 去连
      // 127.0.0.1 会「连接被拒绝」，报出来却是一句含糊的
      // 「Timed out waiting 60000ms from config.webServer」。显式绑 IPv4 消掉这个歧义。
      command: `npx vite preview --port ${PORT_STATIC} --strictPort --host 127.0.0.1`,
      url: `http://127.0.0.1:${PORT_STATIC}${BASE_PATH}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `npx vite preview --outDir dist-api-down --port ${PORT_API_DOWN} --strictPort --host 127.0.0.1`,
      url: `http://127.0.0.1:${PORT_API_DOWN}${BASE_PATH}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
