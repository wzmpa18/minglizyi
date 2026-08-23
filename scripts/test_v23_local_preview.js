// v25.0.47_23 本地预演：验证立即开通按钮 fixed 悬浮（任何滚动位置可见）
const BASE = 'http://localhost:3457';
const SHOTS = 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots';

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({
    viewport: { width: 480, height: 900 },
  })).newPage();

  console.log('=== [1] 会员页（页面顶部，未滚动） ===');
  await page.goto(`${BASE}/membership/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/v23-local-top.png` });

  const payBtn = page.locator('button:has-text("立即开通")').first();
  const box1 = await payBtn.boundingBox().catch(() => null);
  console.log(`顶部时按钮位置: ${JSON.stringify(box1)}`);
  const visibleTop = box1 && box1.y >= 0 && box1.y < 900 && box1.y + box1.height <= 900;
  console.log(`视口(900px)内可见: ${visibleTop}`);

  console.log('=== [2] 点击月度会员卡片 ===');
  await page.locator('text=月度会员').first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/v23-local-click-card.png` });
  const btnText = await payBtn.textContent().catch(() => '');
  console.log(`点击后按钮文案: ${btnText}`);

  console.log('=== [3] 滚动到页面中部（模拟用户浏览权益） ===');
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/v23-local-mid.png` });
  const box2 = await payBtn.boundingBox().catch(() => null);
  console.log(`中部时按钮位置: ${JSON.stringify(box2)}`);

  console.log('=== [4] 滚动到页面顶部再验证 ===');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const box3 = await payBtn.boundingBox().catch(() => null);
  console.log(`顶部时按钮位置: ${JSON.stringify(box3)}`);
  await page.screenshot({ path: `${SHOTS}/v23-local-top2.png` });

  const fixedOk = box1 && box2 && box3 && Math.abs(box1.y - box2.y) < 2 && Math.abs(box2.y - box3.y) < 2;
  console.log(`\nRESULT: 按钮fixed悬浮(滚动位置不变): ${fixedOk}`);
  console.log(`RESULT: 按钮在视口内: ${visibleTop}`);

  await browser.close();
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
