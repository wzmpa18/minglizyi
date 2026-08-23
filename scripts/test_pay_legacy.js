const { chromium } = require('playwright');

// 模拟旧版本登录态：userId 为数字（旧 loginService 无 String 转换时存储的格式）
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 480, height: 900 } });
  const page = await ctx.newPage();

  const apiCalls = [];
  page.on('response', async (res) => {
    if (res.url().includes('/api/payment')) {
      let body = '';
      try { body = (await res.text()).slice(0, 200); } catch {}
      apiCalls.push(`${res.status()} ${body}`);
    }
  });

  await page.goto('https://yandaoguoxue.yandao.vip/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    // 旧版格式：userId 是数字，token 旧格式
    localStorage.setItem('yandao_user_token', 'old_token_legacy');
    localStorage.setItem('yandao_user_profile', JSON.stringify({
      userId: 100029,             // 数字！旧格式
      nickname: '美好未来',
      memberLevel: 'basic',
      loginTime: Date.now() - 86400000,
    }));
  });
  console.log('注入旧格式登录态(userId=100029 数字)');

  await page.goto('https://yandaoguoxue.yandao.vip/membership/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);

  const monthly = page.locator('text=月度会员').first();
  await monthly.click().catch(() => {});
  await page.waitForTimeout(600);
  const btn = page.locator('button', { hasText: /立即开通|支付/ }).last();
  console.log('btn:', ((await btn.textContent().catch(() => 'N/A')) || '').trim());
  await btn.click();

  let qr = false, errText = '';
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(1000);
    qr = await page.locator('text=扫一扫').isVisible().catch(() => false);
    if (qr) break;
  }
  if (!qr) {
    const err = page.locator('div').filter({ hasText: /无效|失败|错误/ }).first();
    errText = (await err.textContent().catch(() => '')) || '';
  }
  console.log('QR MODAL VISIBLE (legacy profile):', qr);
  if (errText) console.log('页面错误提示:', errText.slice(0, 150));
  await page.screenshot({ path: 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots/legacy-profile-pay.png' });
  console.log('payment API:', apiCalls.join('\n') || '(无请求)');
  await browser.close();
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
