const { chromium } = require('playwright');

// v22 补充验证：AI推广助手4步向导走到生成海报步骤，验证AI换文案按钮与3:4海报
const BASE = 'https://yandaoguoxue.yandao.vip';
const SHOTS = 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({
    viewport: { width: 480, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  })).newPage();
  let pass = 0, fail = 0;
  const log = (name, ok, extra = '') => {
    if (ok) { pass++; console.log(`PASS ${name}${extra ? ' | ' + extra : ''}`); }
    else { fail++; console.log(`FAIL ${name}${extra ? ' | ' + extra : ''}`); }
  };

  console.log('=== [1] 登录 ===');
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

  console.log('=== [2] 向导4步走到生成海报 ===');
  await page.goto(`${BASE}/invite/poster/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3500);
  const noLoginBtn = page.locator('button', { hasText: '暂不登录' });
  if (await noLoginBtn.isVisible().catch(() => false)) { await noLoginBtn.click(); await page.waitForTimeout(800); }

  // 步骤1：选第一个产品（默认可能已选）
  const opt = page.locator('text=国学综合').first();
  if (await opt.isVisible().catch(() => false)) await opt.click().catch(() => {});
  for (let i = 0; i < 3; i++) {
    const next = page.locator('button', { hasText: '下一步' }).first();
    if (await next.isVisible().catch(() => false)) {
      await next.click();
      await page.waitForTimeout(2200);
    } else {
      // 可能有其他确认按钮
      const alt = page.locator('button', { hasText: /生成|完成|确认/ }).first();
      if (await alt.isVisible().catch(() => false)) { await alt.click(); await page.waitForTimeout(2500); }
    }
  }
  await page.screenshot({ path: `${SHOTS}/v22-poster-wizard-step4.png`, fullPage: true });

  const aiBtn = page.locator('button', { hasText: 'AI换文案' }).first();
  const aiBtnVisible = await aiBtn.isVisible().catch(() => false);
  log('第4步AI换文案按钮', aiBtnVisible);

  const poster = page.locator('img[alt="邀请海报"], img[alt*="海报"]').first();
  const posterVisible = await poster.isVisible().catch(() => false);
  log('第4步海报渲染', posterVisible);
  if (posterVisible) {
    const dim = await poster.evaluate((img) => ({ w: img.naturalWidth, h: img.naturalHeight }));
    log('海报3:4比例', Math.abs(dim.w / dim.h - 0.75) < 0.02, `${dim.w}x${dim.h}`);
  }

  if (aiBtnVisible) {
    console.log('=== [3] AI推广助手页AI换文案生成 ===');
    await aiBtn.click();
    const ok = await page.waitForSelector('text=朋友种草风', { timeout: 120000 }).then(() => true).catch(() => false);
    log('AI生成3套风格卡片(助手页)', ok);
    await page.screenshot({ path: `${SHOTS}/v22-poster-ai-picker.png`, fullPage: true });
  }

  console.log(`\n===== RESULT: PASS=${pass} FAIL=${fail} =====`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
