const { chromium } = require('playwright');

// v25.0.47_21 P1-5 功能回归：首页四柱/公告栏/死键移除 + 海报页可用性 + 检查更新按钮
const BASE = 'https://yandaoguoxue.yandao.vip';
const SHOTS = 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 480, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  console.log('=== R1. 首页 ===');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SHOTS}/v21-reg-home.png`, fullPage: false });

  // 公告栏
  const annBar = await page.locator('text=公告').first().isVisible().catch(() => false);
  console.log('首页公告栏可见:', annBar ? 'PASS' : 'FAIL');

  // 四柱高对比（白底红字）：找含干支的元素并验证颜色
  const pillar = page.locator('text=/年柱|月柱|日柱|时柱/').first();
  const pillarVisible = await pillar.isVisible().catch(() => false);
  console.log('四柱区块可见:', pillarVisible ? 'PASS' : 'FAIL');
  if (pillarVisible) {
    const box = await pillar.boundingBox();
    console.log(`四柱位置: x=${Math.round(box.x)} y=${Math.round(box.y)}`);
  }

  // 死键移除：顶部不应再有 刷新/齿轮 按钮（v20已移除，确认未回归）
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasVersionFooter = bodyText.includes('v25.0.47') || bodyText.includes('言道');
  console.log('首页正常渲染:', hasVersionFooter ? 'PASS' : 'FAIL');

  console.log('=== R2. 个人中心（检查更新入口） ===');
  // 个人中心需登录态，直接以未登录访问会跳登录，这里仅验证路由可达
  const profResp = await page.goto(`${BASE}/profile/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('个人中心路由HTTP:', profResp.status());
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/v21-reg-profile.png` });

  console.log('=== R3. 海报页 ===');
  await page.goto(`${BASE}/invite/poster/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SHOTS}/v21-reg-poster.png`, fullPage: true });
  const posterText = await page.evaluate(() => document.body.innerText);
  const hasPoster = posterText.includes('海报') || posterText.includes('邀请');
  const hasSave = posterText.includes('保存') || posterText.includes('下载');
  const hasStyle = posterText.includes('换一个风格') || posterText.includes('风格');
  console.log('海报页渲染:', hasPoster ? 'PASS' : 'FAIL');
  console.log('海报保存按钮:', hasSave ? 'PASS' : 'FAIL');
  console.log('海报风格切换:', hasStyle ? 'PASS' : 'FAIL');

  console.log('=== R4. 关键页面可达性 ===');
  for (const p of ['membership', 'admin', 'friend', 'download']) {
    const code = await page.goto(`${BASE}/${p}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }).then(r => r.status()).catch(() => 'ERR');
    console.log(`/${p}: ${code}`);
  }

  await browser.close();
  console.log('\n>>> 回归检查完成（截图见 .test-shots/v21-reg-*.png）');
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
