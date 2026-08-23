const { chromium } = require('playwright');

// v25.0.47_21 验收测试：真实账号支付全流程
//   A. 登录 → 会员页 → 月度档 → 立即开通 → 微信付款二维码弹窗
//   B. 未登录 → 会员页 → 立即开通 → 登录引导弹窗
const BASE = 'https://yandaoguoxue.yandao.vip';
const SHOTS = 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const apiCalls = [];

  const ctx = await browser.newContext({
    viewport: { width: 480, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/')) {
      let body = '';
      try { body = (await res.text()).slice(0, 300); } catch {}
      apiCalls.push(`${res.request().method()} ${res.status()} ${url.replace(BASE, '')} :: ${body}`);
    }
  });

  console.log('=== A1. 未登录直接进会员页点开通（登录引导验收） ===');
  await page.goto(`${BASE}/membership/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  const payBtn = page.locator('button', { hasText: /立即开通/ }).last();
  await payBtn.click();
  await page.waitForTimeout(1200);
  const loginGuide = await page.locator('text=登录后即可购买会员').isVisible().catch(() => false);
  console.log('未登录登录引导弹窗:', loginGuide ? 'PASS' : 'FAIL');
  await page.screenshot({ path: `${SHOTS}/v21-a1-login-guide.png` });
  // 关闭弹窗
  await page.locator('button', { hasText: '暂不登录' }).click().catch(() => {});
  await page.waitForTimeout(500);

  console.log('=== A2. 去登录页登录 13612674128 ===');
  await page.goto(`${BASE}/login/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  const acct = page.locator('input[placeholder*="手机号"]').first();
  await acct.fill('13612674128');
  const pwd = page.locator('input[type="password"]').first();
  await pwd.fill('wuzhimin123');
  const agreeRow = page.locator('text=用户协议').first();
  if (await agreeRow.isVisible().catch(() => false)) {
    const box = agreeRow.locator('..').locator('input[type=checkbox], .checkbox, [class*=checkbox]').first();
    const checked = await box.isChecked().catch(() => true);
    if (!checked) await box.click().catch(() => {});
  }
  await page.screenshot({ path: `${SHOTS}/v21-a2-filled.png` });
  await page.locator('button', { hasText: /^登录$|^登 录$|立即登录/ }).first().click();
  await page.waitForTimeout(6000);
  console.log('登录后URL:', page.url());

  const prof = await page.evaluate(() => localStorage.getItem('yandao_user_profile'));
  console.log('profile存在:', !!prof);
  if (prof) {
    const p = JSON.parse(prof);
    console.log('userId值:', JSON.stringify(p.userId), '| 类型:', typeof p.userId, '(必须为string)');
  }

  console.log('=== A3. 会员页选月度档并开通 ===');
  await page.goto(`${BASE}/membership/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  const monthly = page.locator('text=月度会员').first();
  await monthly.click().catch(() => {});
  await page.waitForTimeout(800);
  const btn = page.locator('button', { hasText: /立即开通/ }).last();
  console.log('按钮文案:', ((await btn.textContent().catch(() => 'N/A')) || '').trim());
  await page.screenshot({ path: `${SHOTS}/v21-a3-monthly.png` });
  await btn.click();

  let qr = false;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1000);
    qr = await page.locator('text=扫一扫').isVisible().catch(() => false)
      || await page.locator('img[alt="微信支付二维码"]').isVisible().catch(() => false);
    if (qr) break;
  }
  console.log('微信付款二维码弹窗:', qr ? 'PASS' : 'FAIL');
  await page.screenshot({ path: `${SHOTS}/v21-a4-qr.png` });

  console.log('\n=== API 调用记录 ===');
  apiCalls.filter(c => c.includes('payment') || c.includes('login') || c.includes('auth')).forEach(c => console.log(c));

  await browser.close();
  console.log(qr ? '\n>>> 支付链路验收: 通过' : '\n>>> 支付链路验收: 失败');
  process.exit(qr ? 0 : 1);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
