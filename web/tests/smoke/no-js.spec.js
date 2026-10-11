// 冒烟①：禁用 JS 时，首屏四项关键内容仍然可见。
//
// 依据：CLAUDE.md 硬性约束「首屏关键内容（姓名 / 定位 / 邮箱 / GitHub）
// 必须留在 web/index.html 的静态 HTML 里，禁用 JS 仍可见」。
// 这条约束过去只能靠人肉在浏览器里关掉 JS 看一眼 —— 而它是**会悄悄失效**的那种：
// 只要有人把这四项改成由 JS 渲染，页面在有 JS 的机器上看起来一模一样，
// 改了的人和review 的人也看不出来。
//
// 顺带说明为什么这个断言是有意义的：页面用 `.js .reveal { opacity: 0 }`
// 做进场动画（`.js` 类由入口脚本打到 <html> 上）。JS 一关，`.js` 不出现，
// 所有板块都是可见的 —— 所以「可见」这个断言真的在测内容，不是在测动画。

import { expect, test } from '@playwright/test';

// 整个文件都在无 JS 环境下跑。
test.use({ javaScriptEnabled: false });

test('禁用 JS：姓名 / 定位 / 邮箱 / GitHub 四项可见且有内容', async ({ page }) => {
  await page.goto('./');

  // 先证明「JS 确实是关的」—— 否则万一哪天 javaScriptEnabled 没生效，
  // 后面四条断言在有 JS 的环境里照样会绿，这条测试就变成了心理安慰。
  // `.js` 是入口脚本打到 <html> 上的类：没有它 = 脚本没跑过。
  await expect(page.locator('html')).not.toHaveClass(/\bjs\b/);

  // ① 姓名
  const name = page.locator('#heroName');
  await expect(name).toBeVisible();
  await expect(name).toHaveText(/\S/);

  // ② 一句话定位
  const tagline = page.locator('#heroTagline');
  await expect(tagline).toBeVisible();
  await expect(tagline).toHaveText(/\S/);

  // ③ 邮箱（联系区的邮箱卡；hero 区没有邮箱，只有「联系我」按钮）
  const email = page.locator('#contactEmail');
  await expect(email).toBeVisible();
  await expect(email).toHaveAttribute('href', /^mailto:./);

  // ④ GitHub（hero 区那一个 —— 首屏就看得到的那个）
  const github = page.locator('#heroGithub');
  await expect(github).toBeVisible();
  await expect(github).toHaveAttribute('href', /github\.com\/.+/);
});
