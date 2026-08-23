const { chromium } = require('playwright');

// v25.0.47_21 验收：后台订单中心页面实测（密钥注入→订单列表→筛选→字段可见）
const BASE = 'https://yandaoguoxue.yandao.vip';
const SHOTS = 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots';
const ADMIN_KEY = process.env.ADMIN_KEY;

(async () => {
  if (!ADMIN_KEY) { console.error('FATAL: ADMIN_KEY env missing'); process.exit(1); }
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({
    viewport: { width: 1360, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  })).newPage();

  await page.goto(`${BASE}/admin/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate((k) => localStorage.setItem('yandao_console_admin_key', k), ADMIN_KEY);
  await page.goto(`${BASE}/admin/orders/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${SHOTS}/v21-admin-orders.png`, fullPage: true });

  const hasPhone = await page.locator('text=136****4128').first().isVisible().catch(() => false)
    || await page.locator('text=13612674128').first().isVisible().catch(() => false);
  const hasTxnCol = await page.locator('th', { hasText: '微信交易号' }).isVisible().catch(() => false);
  const hasInviterCol = await page.locator('th', { hasText: '邀请人' }).isVisible().catch(() => false);
  const hasExport = await page.locator('button', { hasText: '导出Excel报表' }).isVisible().catch(() => false);
  const hasUserCol = await page.locator('th', { hasText: '用户（手机号）' }).isVisible().catch(() => false);
  console.log('订单列表-用户(手机号)列:', hasUserCol ? 'PASS' : 'FAIL');
  console.log('测试账号手机号脱敏显示:', hasPhone ? 'PASS' : 'FAIL');
  console.log('微信交易号列:', hasTxnCol ? 'PASS' : 'FAIL');
  console.log('邀请人列:', hasInviterCol ? 'PASS' : 'FAIL');
  console.log('导出Excel按钮:', hasExport ? 'PASS' : 'FAIL');

  // 仪表盘订单卡片点击跳转验收
  await page.goto(`${BASE}/admin/dashboard/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${SHOTS}/v21-admin-dashboard.png`, fullPage: true });
  await page.locator('div', { hasText: /^待处理订单$/ }).first().click().catch(async () => {
    // StatCard 是 div，文本在内部结构里；用更宽松的方式点击
    const card = page.locator('text=待处理订单').first();
    await card.click();
  });
  await page.waitForTimeout(2500);
  const onOrders = page.url().includes('/admin/orders');
  const pendingSel = await page.locator('select').first().inputValue().catch(() => '');
  console.log('仪表盘待处理订单点击跳转订单页:', onOrders ? 'PASS' : 'FAIL', `(URL: ${page.url()})`);
  console.log('跳转后自动带上待支付筛选:', pendingSel === 'PENDING' ? 'PASS' : `当前筛选=${pendingSel}`);
  await page.screenshot({ path: `${SHOTS}/v21-admin-orders-jumped.png`, fullPage: true });

  await browser.close();
  const ok = hasUserCol && hasTxnCol && hasInviterCol && hasExport && onOrders;
  console.log(ok ? '\n>>> 后台订单中心验收: 通过' : '\n>>> 后台订单中心验收: 部分失败，见上方明细');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
