const { chromium } = require('playwright');

// v25.0.47_22 MARKETING-POSTER-V2-AI 公网实测（真实账号全流程）
// 覆盖：三套模板渲染/切换、海报3:4尺寸、AI换文案(生成→应用→再来一组→恢复)、
//       保存海报下载、分享文案库三场景、AI推广助手页入口
const BASE = 'https://yandaoguoxue.yandao.vip';
const SHOTS = 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 480, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    acceptDownloads: true,
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
  const agreeRow = page.locator('text=用户协议').first();
  if (await agreeRow.isVisible().catch(() => false)) {
    const box = agreeRow.locator('..').locator('input[type=checkbox], .checkbox, [class*=checkbox]').first();
    if (!(await box.isChecked().catch(() => true))) await box.click().catch(() => {});
  }
  await page.locator('button', { hasText: /^登录$|^登 录$|立即登录/ }).first().click();
  await page.waitForTimeout(6000);
  const prof = await page.evaluate(() => localStorage.getItem('yandao_user_profile'));
  log('登录态建立', !!prof);

  console.log('=== [2] 邀请页-海报默认渲染 ===');
  await page.goto(`${BASE}/invite/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);
  const poster = page.locator('img[alt="邀请海报"]');
  const posterVisible = await poster.isVisible().catch(() => false);
  log('海报图片渲染', posterVisible);
  if (posterVisible) {
    const info = await poster.evaluate((img) => {
      const src = img.src || '';
      return { loaded: img.naturalWidth > 0, srcHead: src.slice(0, 30), srcLen: src.length };
    });
    log('海报图片加载完成(dataURL)', info.loaded, `srcLen=${info.srcLen}`);
    // 3:4 比例校验（解码 dataURL 头）
    const dim = await poster.evaluate((img) => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      return { w: img.naturalWidth, h: img.naturalHeight };
    });
    const ratio = dim.w && dim.h ? (dim.w / dim.h).toFixed(3) : '0';
    log('海报3:4比例', Math.abs(dim.w / dim.h - 0.75) < 0.02, `${dim.w}x${dim.h}`);
  }
  await page.screenshot({ path: `${SHOTS}/v22-invite-default.png`, fullPage: true });

  console.log('=== [3] 三套模板切换 ===');
  const tplBtns = ['朋友圈种草', '社群引流', '学习进阶'];
  for (const name of tplBtns) {
    const btn = page.locator('button', { hasText: name }).first();
    const exists = await btn.isVisible().catch(() => false);
    log(`模板按钮[${name}]`, exists);
  }
  const srcBefore = await poster.getAttribute('src').catch(() => '');
  await page.locator('button', { hasText: '社群引流' }).first().click();
  await page.waitForTimeout(3000);
  const srcAfter2 = await poster.getAttribute('src').catch(() => '');
  log('切换社群引流版海报重渲染', srcBefore && srcAfter2 && srcBefore !== srcAfter2);
  await page.screenshot({ path: `${SHOTS}/v22-invite-tpl-group.png`, fullPage: true });
  await page.locator('button', { hasText: '学习进阶' }).first().click();
  await page.waitForTimeout(3000);
  const srcAfter3 = await poster.getAttribute('src').catch(() => '');
  log('切换学习进阶版海报重渲染', srcAfter3 && srcAfter2 && srcAfter2 !== srcAfter3);
  // 回到默认模板一
  await page.locator('button', { hasText: '朋友圈种草' }).first().click();
  await page.waitForTimeout(2500);

  console.log('=== [4] AI换文案（生成→3套卡片） ===');
  await page.locator('button', { hasText: 'AI换文案' }).first().click();
  await page.waitForTimeout(1500);
  // 等待AI生成完成（最多120秒）
  const genOk = await page.waitForSelector('text=朋友种草风', { timeout: 120000 }).then(() => true).catch(() => false);
  const fallbackNote = await page.locator('text=AI文案生成暂不可用').isVisible().catch(() => false);
  const cardCount = await page.locator('div', { hasText: /^朋友种草风$|^专业干货风$|^简洁直接风$/ }).count().catch(() => 0);
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasCards = ['朋友种草风', '专业干货风', '简洁直接风'].every((s) => bodyText.includes(s));
  log('AI生成3套风格卡片', hasCards, fallbackNote ? '（使用了内置兜底文案）' : '（AI实时生成）');
  await page.screenshot({ path: `${SHOTS}/v22-ai-picker.png`, fullPage: true });

  if (hasCards) {
    console.log('=== [5] 应用AI文案到海报 ===');
    const applyBtn = page.locator('button', { hasText: /^应用$/ }).first();
    await applyBtn.click();
    await page.waitForTimeout(3000);
    const applied = await page.locator('text=已应用AI文案').first().isVisible().catch(() => false);
    log('AI文案应用到海报', applied);
    await page.screenshot({ path: `${SHOTS}/v22-ai-applied.png`, fullPage: true });

    console.log('=== [6] 恢复模板文案 ===');
    const resetBtn = page.locator('button', { hasText: '恢复模板文案' }).first();
    const resetVisible = await resetBtn.isVisible().catch(() => false);
    if (resetVisible) {
      await resetBtn.click();
      await page.waitForTimeout(2000);
      const stillApplied = await page.locator('text=已应用AI文案').first().isVisible().catch(() => false);
      log('恢复模板文案', !stillApplied);
    } else {
      log('恢复模板文案', false, '按钮不可见');
    }
  }

  console.log('=== [7] 保存海报图片（下载） ===');
  const dlPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await page.locator('button', { hasText: '保存海报图片' }).first().click();
  const dl = await dlPromise;
  if (dl) {
    const path = await dl.path();
    const size = require('fs').statSync(path).size;
    log('保存海报下载触发', size > 50000, `${(size / 1024).toFixed(0)}KB`);
  } else {
    log('保存海报下载触发', false);
  }

  console.log('=== [8] 分享文案库三场景 ===');
  const pageText = await page.evaluate(() => document.body.innerText);
  for (const sc of ['朋友圈种草文案', '社群引流文案', '私聊好友文案']) {
    log(`分享文案[${sc}]`, pageText.includes(sc));
  }

  console.log('=== [9] AI推广助手页（invite/poster） ===');
  await page.goto(`${BASE}/invite/poster/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);
  const noLoginBtn = page.locator('button', { hasText: '暂不登录' });
  if (await noLoginBtn.isVisible().catch(() => false)) { await noLoginBtn.click(); await page.waitForTimeout(1000); }
  const poster2 = await page.evaluate(() => document.body.innerText);
  const aiBtn2 = await page.locator('button', { hasText: 'AI换文案' }).first().isVisible().catch(() => false);
  log('AI推广助手页可访问', poster2.includes('海报') || poster2.includes('推广'), `AI按钮:${aiBtn2 ? '有' : '无'}`);
  await page.screenshot({ path: `${SHOTS}/v22-invite-poster.png`, fullPage: true });

  console.log(`\n===== RESULT: PASS=${pass} FAIL=${fail} =====`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
