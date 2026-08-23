// v25.0.47_23 取证：会员页点击会员卡片后视口内是否有购买引导
const BASE = 'https://yandaoguoxue.yandao.vip';
const SHOTS = 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots';

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({
    viewport: { width: 480, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  })).newPage();

  console.log('=== [1] 登录 13612674128 ===');
  await page.goto(`${BASE}/login/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator('input[placeholder*="手机号"]').first().fill('13612674128');
  await page.locator('input[type="password"]').first().fill('wuzhimin123');
  await page.locator('button:has-text("登录")').first().click();
  await page.waitForTimeout(3000);

  console.log('=== [2] 进入会员页（不滚动，模拟用户点击会员卡片的初始视口） ===');
  await page.goto(`${BASE}/membership/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/v23-before-top.png` });

  console.log('=== [3] 点击月度会员卡片（用户行为：点击会员按键） ===');
  const monthlyCard = page.locator('text=月度会员').first();
  if (await monthlyCard.isVisible().catch(() => false)) {
    await monthlyCard.click();
    await page.waitForTimeout(800);
  } else {
    console.log('月度会员卡片不可见');
  }
  await page.screenshot({ path: `${SHOTS}/v23-after-click-card.png` });

  console.log('=== [4] 检查「立即开通」按钮是否在当前视口内 ===');
  const payBtn = page.locator('button:has-text("立即开通")').first();
  const btnCount = await page.locator('button:has-text("立即开通")').count();
  console.log(`立即开通按钮总数: ${btnCount}`);
  if (btnCount === 0) {
    console.log('RESULT: 按钮不存在于DOM（渲染被条件阻断）');
  } else {
    const visible = await payBtn.isVisible().catch(() => false);
    const box = visible ? await payBtn.boundingBox() : null;
    const inViewport = box && box.y >= 0 && box.y < 900;
    console.log(`按钮isVisible: ${visible}, boundingBox: ${JSON.stringify(box)}, 在900px视口内: ${inViewport}`);
    if (visible && !inViewport) {
      console.log('RESULT: 按钮存在但需滚动才能看到 → 复现「点击会员按键无购买引导」');
    }
  }

  console.log('=== [5] 滚动到页面最底部，确认按钮位置 ===');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/v23-after-scroll-bottom.png` });
  const box2 = await payBtn.boundingBox().catch(() => null);
  console.log(`滚动后按钮位置: ${JSON.stringify(box2)}`);
  const pageH = await page.evaluate(() => document.body.scrollHeight);
  console.log(`页面总高度: ${pageH}px（视口900px，需要滚动 ${pageH - 900}px 才能看到按钮）`);

  await browser.close();
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
