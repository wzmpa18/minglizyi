// v25.0.47_23 公网 E2E：会员购买引导 fixed 悬浮底栏全流程实测
// 覆盖：登录→会员页→点卡片→按钮视口内可见→点开通→二维码弹出→四档位文案→未登录引导
const BASE = 'https://yandaoguoxue.yandao.vip';
const SHOTS = 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots';

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 480, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();
  let pass = 0, fail = 0;
  const log = (name, ok, extra = '') => {
    if (ok) { pass++; console.log(`PASS ${name}${extra ? ' | ' + extra : ''}`); }
    else { fail++; console.log(`FAIL ${name}${extra ? ' | ' + extra : ''}`); }
  };

  console.log('=== [1] 登录（13612674128） ===');
  await page.goto(`${BASE}/login/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator('input[placeholder*="手机号"]').first().fill('13612674128');
  await page.locator('input[type="password"]').first().fill('wuzhimin123');
  // 勾选「登录即同意《用户协议》和《隐私政策》」（不勾选会被拦截：请先同意用户协议和隐私政策）
  const agreeBox = page.locator('label:has-text("登录即同意") input[type="checkbox"]').first();
  if (await agreeBox.count() > 0 && !(await agreeBox.isChecked())) {
    await agreeBox.click({ force: true });
    await page.waitForTimeout(300);
    log('协议勾选成功', await agreeBox.isChecked());
  }
  await page.locator('button:has-text("登录")').first().click();
  await page.waitForTimeout(3000);
  // 登录结果校验：页面不能停留在报错状态
  const errText = await page.locator('text=请先同意').first().isVisible().catch(() => false)
    ? '请先同意' : '';
  log('登录无协议拦截', !errText, errText);
  await page.screenshot({ path: `${SHOTS}/v23-live-login.png` });
  // 登录态校验：localStorage 或跳转离开登录页
  const loginOk = await page.evaluate(() => {
    try { return !!(localStorage.getItem('yd_token') || localStorage.getItem('token') || sessionStorage.getItem('token')); } catch { return false; }
  }) || !page.url().includes('/login');
  log('登录成功', loginOk, page.url());

  console.log('=== [2] 会员页：页面顶部（未滚动）按钮可见性 ===');
  await page.goto(`${BASE}/membership/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  const payBtn = page.locator('button:has-text("立即开通")').first();
  const box1 = await payBtn.boundingBox().catch(() => null);
  log('按钮存在于DOM', !!box1, JSON.stringify(box1));
  const visibleTop = box1 && box1.y >= 0 && box1.y + box1.height <= 900;
  log('页面顶部按钮在视口内', !!visibleTop, `y=${box1?.y}`);
  await page.screenshot({ path: `${SHOTS}/v23-live-top.png` });

  console.log('=== [3] 点击月度会员卡片 → 购买引导即时可见 ===');
  await page.locator('text=月度会员').first().click();
  await page.waitForTimeout(800);
  const btnText = await payBtn.textContent().catch(() => '');
  log('点击卡片后按钮文案联动', btnText.includes('¥37'), btnText.trim());
  await page.screenshot({ path: `${SHOTS}/v23-live-click-card.png` });

  console.log('=== [4] 滚动到中部/底部，按钮位置恒定（fixed） ===');
  await page.evaluate(() => window.scrollTo(0, 1800));
  await page.waitForTimeout(400);
  const box2 = await payBtn.boundingBox().catch(() => null);
  log('滚动后按钮位置不变', Math.abs((box2?.y ?? 999) - (box1?.y ?? 0)) < 2, `y=${box2?.y}`);
  await page.screenshot({ path: `${SHOTS}/v23-live-mid.png` });

  console.log('=== [5] 点击「立即开通」→ 支付二维码弹出 ===');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await payBtn.click();
  // 等待二维码弹窗：扫码引导文案 / 取消支付按钮 / 二维码图片（img 或 canvas）
  const qrVisible = await page.waitForSelector('text=扫一扫', { timeout: 20000 }).then(() => true).catch(() => false)
    || await page.waitForSelector('button:has-text("取消支付")', { timeout: 3000 }).then(() => true).catch(() => false);
  log('支付二维码弹出', qrVisible);
  const priceOnModal = await page.locator('text=¥37.00').first().isVisible().catch(() => false)
    || await page.locator('text=¥37').first().isVisible().catch(() => false);
  log('弹窗显示正确价格¥37', priceOnModal);
  await page.screenshot({ path: `${SHOTS}/v23-live-qr.png` });
  // 关闭弹窗（取消支付按钮）
  const cancelBtn = page.locator('button:has-text("取消支付")').first();
  if (await cancelBtn.isVisible().catch(() => false)) { await cancelBtn.click().catch(() => {}); }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(1000);
  const modalGone = !(await page.locator('button:has-text("取消支付")').first().isVisible().catch(() => false));
  log('取消支付可关闭弹窗', modalGone);

  console.log('=== [6] 四档位文案联动回归（价格动态读服务端SSOT） ===');
  // v25.0.47_10 价格SSOT：按钮价格优先来自服务端 /api/public/pricing（后台改价实时生效）
  // 断言基准动态取服务端值，避免后台调价后测试误报
  const pricing = await ctx.request.get(`${BASE}/api/public/pricing`).then(r => r.json()).catch(() => null);
  const serverPlans = (pricing?.data?.membershipPlans || []).filter(p => p.price > 0);
  log('服务端价格接口可用', serverPlans.length >= 4, serverPlans.map(p => `${p.name}¥${p.price}`).join(' '));
  const nameMap = { monthly: '月度会员', quarterly: '季度会员', yearly: '年度会员', lifetime: '终身会员' };
  const plans = serverPlans.length >= 4
    ? serverPlans.map(p => ({ name: nameMap[p.level] || p.name, price: `¥${p.price}` }))
    : [
      { name: '月度会员', price: '¥37' },
      { name: '季度会员', price: '¥99' },
      { name: '年度会员', price: '¥374' },
      { name: '终身会员', price: '¥3600' },
    ];
  for (const p of plans) {
    const card = page.locator(`text=${p.name}`).first();
    const vis = await card.isVisible().catch(() => false);
    if (vis) {
      await card.scrollIntoViewIfNeeded().catch(() => {});
      await card.click();
      await page.waitForTimeout(500);
      const t = await payBtn.textContent().catch(() => '');
      log(`档位[${p.name}]按钮文案`, t.includes(p.price), t.trim());
    } else {
      log(`档位[${p.name}]卡片可见`, false, '卡片未找到');
    }
  }

  console.log('=== [7] 未登录引导回归（无痕新上下文） ===');
  const ctx2 = await browser.newContext({ viewport: { width: 480, height: 900 } });
  const page2 = await ctx2.newPage();
  await page2.goto(`${BASE}/membership/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page2.waitForTimeout(2500);
  const btn2 = page2.locator('button:has-text("立即开通")').first();
  const boxN = await btn2.boundingBox().catch(() => null);
  log('未登录按钮fixed可见', !!boxN && boxN.y >= 0 && boxN.y + boxN.height <= 900, `y=${boxN?.y}`);
  await btn2.click();
  await page2.waitForTimeout(1500);
  const loginGuide = await page2.locator('text=登录').first().isVisible().catch(() => false);
  const needLoginBar = await page2.locator('text=请先登录').first().isVisible().catch(() => false);
  log('未登录点击弹出登录引导', loginGuide || needLoginBar);
  await page2.screenshot({ path: `${SHOTS}/v23-live-loggedout.png` });

  console.log(`\n===== RESULT: PASS=${pass} FAIL=${fail} =====`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
