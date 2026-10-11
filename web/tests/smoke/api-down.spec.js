// 冒烟②：后端不可达时，站点照常完整可读。
//
// 这一条守的是 v0.5 的核心验收（也是 ROADMAP「绝对不砍」清单里的
// 「API 不可用时的前端降级」）。它跑在**另一份产物**上：`dist-api-down/`，
// 由 `node scripts/build-api-down.mjs` 用 VITE_API_BASE=https://api-down.invalid 构建。
//
// 为什么真的重建一份、而不是在测试里拦请求（page.route 把接口打回 500）：
// 拦截只改了「运行时的网络」，改不了「构建期注入了什么」。而这里的 bug 恰恰
// 最可能出在构建期 —— 比如 VITE_API_BASE 被写进产物后，代码变成了
// 「先等接口、等不到就不渲染内容」，那种错误在拦请求的测法下和在真实
// 死域名下的表现不一样。用真产物测，测的就是线上会拿到的那份东西。

import { expect, test } from '@playwright/test';

test('后端不可达：项目卡仍有内容，页脚提示「显示的是构建时快照」', async ({ page }) => {
  await page.goto('./');

  // ⚠️ 断言顺序是有讲究的，别调换 —— 这一条是「故意写坏」时实测踩出来的：
  //
  // 一开始我把「项目卡有内容」写在前面，结果**它证明不了任何事**。
  // expect(...).toBeVisible() 会自动重试，页面一打开内置内容就已经渲染好了，
  // 所以那条断言在降级**发生之前**就立刻通过了。把 live.js 改成
  // 「后端失败就清空内容」，测试照样是绿的 —— 一个假的绿灯。
  //
  // 正确的做法是先等到降级真的发生（页脚出现「显示的是构建时快照」），
  // 再去断言主体内容还在。这样断言的就是【降级之后】的状态。

  // ① 先等降级落地。
  //    等文字而不是等元素可见：那个 <p> 在 HTML 里本来就有（带 hidden），
  //    先出现的可能是「正在获取实时数据…」。
  //    默认 5 秒够用（api.js 是 3 秒超时 + 一次重试；死域名通常立刻失败）。
  await expect(page.locator('#liveStatus .live-status__text')).toHaveText('显示的是构建时快照');

  // ② 降级之后，项目卡仍然有内容 —— 这才是这条冒烟要守的东西。
  //    断言的是**渲染出来的卡片**，不是构建期数据：
  //    「数据在 bundle 里」和「页面上真的出现了」是两件事。
  const cards = page.locator('#projectsList article.project');
  const firstCard = cards.first();
  await expect(firstCard).toBeVisible();
  await expect(firstCard.locator('.project__title')).toHaveText(/\S/);
  await expect(firstCard.locator('.project__desc')).toHaveText(/\S/);

  // 数量 ≥ 1（不要写成 ===N：加一个项目就会让测试无谓地红）。
  expect(await cards.count()).toBeGreaterThan(0);

  // ③ 降级不该是「白屏 + 一行错」。抽查首屏姓名：后端坏了，内置内容必须还在。
  await expect(page.locator('#heroName')).toHaveText(/\S/);
});
