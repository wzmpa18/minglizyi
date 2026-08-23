const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 480, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
  });
  const page = await ctx.newPage();

  const apiCalls = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/')) {
      let body = '';
      try { body = (await res.text()).slice(0, 200); } catch {}
      apiCalls.push(`${res.request().method()} ${res.status()} ${url.replace('https://yandaoguoxue.yandao.vip', '')} :: ${body}`);
    }
  });

  console.log('=== 1. open login page ===');
  await page.goto('https://yandaoguoxue.yandao.vip/login/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);

  console.log('=== 2. fill account/password ===');
  const acct = page.locator('input[placeholder*="手机号"]').first();
  await acct.fill('13612674128');
  const pwd = page.locator('input[type="password"]').first();
  await pwd.fill('wuzhimin123');

  // 勾选协议（若有未勾选的 checkbox）
  const agreeRow = page.locator('text=用户协议').first();
  if (await agreeRow.isVisible().catch(() => false)) {
    const box = agreeRow.locator('..').locator('input[type=checkbox], .checkbox, [class*=checkbox]').first();
    const checked = await box.isChecked().catch(() => true);
    if (!checked) { await box.click().catch(() => console.log('agree click fail')); console.log('agreement clicked'); }
  }

  await page.screenshot({ path: 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots/t2-filled.png' });

  console.log('=== 3. click 登录 ===');
  await page.locator('button', { hasText: /^登录$|^登 录$|立即登录/ }).first().click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots/t3-after-login.png' });

  const store = await page.evaluate(() => {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.includes('token') || k.includes('profile') || k.includes('login')) o[k] = (localStorage.getItem(k) || '').slice(0, 150);
    }
    return o;
  });
  console.log('localStorage auth keys:', JSON.stringify(store, null, 1).slice(0, 800));
  console.log('current URL after login:', page.url());

  const prof = await page.evaluate(() => localStorage.getItem('yandao_user_profile'));
  console.log('profile exists:', !!prof);

  if (prof) {
    console.log('=== 4. go to membership & pay ===');
    await page.goto('https://yandaoguoxue.yandao.vip/membership/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    const monthly = page.locator('text=月度会员').first();
    await monthly.click().catch(() => {});
    await page.waitForTimeout(600);
    const btn = page.locator('button', { hasText: /立即开通|支付/ }).last();
    console.log('btn text:', ((await btn.textContent().catch(() => 'N/A')) || '').trim());
    await btn.click();
    let qr = false;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(1000);
      qr = await page.locator('text=扫一扫').isVisible().catch(() => false);
      if (qr) break;
    }
    console.log('QR MODAL VISIBLE:', qr);
    await page.screenshot({ path: 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots/t5-pay.png' });
  }

  console.log('\n=== API CALLS ===');
  apiCalls.forEach((c) => console.log(c));
  await browser.close();
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
