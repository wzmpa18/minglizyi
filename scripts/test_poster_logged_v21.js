const { chromium } = require('playwright');

// v25.0.47_21 海报页登录态回归（海报保存功能）
const BASE = 'https://yandaoguoxue.yandao.vip';
const SHOTS = 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({
    viewport: { width: 480, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  })).newPage();

  console.log('=== 登录 ===');
  await page.goto(`${BASE}/login/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator('input[placeholder*="手机号"]').first().fill('13612674128');
  await page.locator('input[type="password"]').first().fill('wuzhimin123');
  const agreeRow = page.locator('text=用户协议').first();
  if (await agreeRow.isVisible().catch(() => false)) {
    const box = agreeRow.locator('..').locator('input[type=checkbox], .checkbox, [class*=checkbox]').first();
    if (!(await box.isChecked().catch(() => true))) await box.click().catch(() => {});
  }
  await page.locator('button', { hasText: /^登录$|^登 录$|立即登录/ }).first().click();
  await page.waitForTimeout(6000);
  const prof = await page.evaluate(() => localStorage.getItem('yandao_user_profile'));
  console.log('登录态:', prof ? 'OK' : 'FAIL');

  console.log('=== 海报页（登录态） ===');
  await page.goto(`${BASE}/invite/poster/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3500);
  const text = await page.evaluate(() => document.body.innerText);
  // 若还有登录弹窗则关闭
  const noLoginBtn = page.locator('button', { hasText: '暂不登录' });
  if (await noLoginBtn.isVisible().catch(() => false)) { await noLoginBtn.click(); await page.waitForTimeout(800); }
  await page.screenshot({ path: `${SHOTS}/v21-poster-logged.png`, fullPage: true });

  const hasStep = text.includes('下一步') || text.includes('第');
  const hasPosterWord = text.includes('海报');
  const hasSave = text.includes('保存') || text.includes('下载');
  const hasStyle = text.includes('风格') || text.includes('模板');
  console.log('海报流程/步骤:', hasStep ? 'PASS' : 'FAIL');
  console.log('海报元素:', hasPosterWord ? 'PASS' : 'FAIL');
  console.log('保存/下载入口:', hasSave ? 'PASS' : 'FAIL');
  console.log('风格/模板切换:', hasStyle ? 'PASS' : 'FAIL');

  // 尝试走一步流程：直接点下一步（若在第一步）
  const nextBtn = page.locator('button', { hasText: '下一步' }).first();
  if (await nextBtn.isVisible().catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOTS}/v21-poster-step2.png`, fullPage: true });
    const t2 = await page.evaluate(() => document.body.innerText);
    console.log('步骤2内容摘要:', t2.replace(/\s+/g, ' ').slice(0, 200));
  }

  await browser.close();
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
