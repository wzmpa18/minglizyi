// v25.0.47_24 公网 E2E：后台用户完整注册信息 + 屏幕放大默认关闭
// 覆盖：[A] 后台用户管理表格手机号/邮箱列（完整号码非脱敏）+ 邮箱搜索
//       [B] 设置页屏幕放大默认关闭（无痕）+ 开关切换持久化 + 历史开启用户保持
const BASE = 'https://yandaoguoxue.yandao.vip';
const SHOTS = 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots';
const ADMIN_KEY = process.env.ADMIN_KEY;

(async () => {
  if (!ADMIN_KEY) { console.error('FATAL: ADMIN_KEY env missing'); process.exit(1); }
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  let pass = 0, fail = 0;
  const log = (name, ok, extra = '') => {
    if (ok) { pass++; console.log(`PASS ${name}${extra ? ' | ' + extra : ''}`); }
    else { fail++; console.log(`FAIL ${name}${extra ? ' | ' + extra : ''}`); }
  };

  // ==================== [A] 后台用户管理：完整手机号/邮箱 ====================
  console.log('=== [A1] 管理员进入 /admin/moderation（用户tab） ===');
  const actx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  const apage = await actx.newPage();
  await apage.goto(`${BASE}/admin/`, { waitUntil: 'networkidle', timeout: 60000 });
  await apage.evaluate((k) => localStorage.setItem('yandao_console_admin_key', k), ADMIN_KEY);
  await apage.goto(`${BASE}/admin/moderation/`, { waitUntil: 'networkidle', timeout: 60000 });
  await apage.waitForTimeout(3000);
  await apage.screenshot({ path: `${SHOTS}/v24-admin-users.png`, fullPage: true });

  console.log('=== [A2] 表头新增 手机号/邮箱 列 ===');
  log('表头含手机号列', await apage.locator('th:has-text("手机号")').first().isVisible().catch(() => false));
  log('表头含邮箱列', await apage.locator('th:has-text("邮箱")').first().isVisible().catch(() => false));
  log('搜索框含邮箱placeholder', (await apage.locator('input[placeholder*="邮箱"]').first().getAttribute('placeholder').catch(() => '') || '').includes('手机号'));

  console.log('=== [A3] 完整手机号（非脱敏）+ 邮箱直出 ===');
  // API 断言：直接调接口验证返回完整手机号
  const apiResp = await actx.request.get(`${BASE}/api/admin/unified/moderation/users?page=1`, {
    headers: { 'X-Admin-Key': ADMIN_KEY, Authorization: `Bearer ${ADMIN_KEY}` },
  }).catch(() => null);
  let apiUsers = null;
  if (apiResp && apiResp.ok()) {
    const j = await apiResp.json().catch(() => null);
    apiUsers = j && j.success ? (j.data.users || []) : null;
  }
  if (!apiUsers) {
    // 页面上下文内 fetch（带 cookie/localStorage 头不适用，用 evaluate 走页面内 fetch）
    apiUsers = await apage.evaluate(async () => {
      const key = localStorage.getItem('yandao_console_admin_key');
      const r = await fetch('/api/admin/unified/moderation/users?page=1', {
        headers: { 'X-Admin-Key': key, Authorization: `Bearer ${key}` },
      });
      const j = await r.json().catch(() => null);
      return j && j.success ? (j.data.users || []) : null;
    });
  }
  log('接口返回用户列表', Array.isArray(apiUsers) && apiUsers.length > 0, `共 ${apiUsers ? apiUsers.length : 0} 条`);
  if (Array.isArray(apiUsers) && apiUsers.length > 0) {
    const withPhone = apiUsers.filter(u => u.phone);
    log('返回字段含 email', 'email' in apiUsers[0], `首条 email=${apiUsers[0].email || '(空)'}`);
    const masked = withPhone.filter(u => u.phone.includes('****'));
    log('手机号完整非脱敏', withPhone.length > 0 && masked.length === 0,
      `含手机号 ${withPhone.length} 条，脱敏 ${masked.length} 条，样例 ${withPhone[0] ? withPhone[0].phone : '-'}`);
    // 页面表格渲染断言
    const bodyText = await apage.locator('table').first().textContent().catch(() => '');
    const pageHasFullPhone = withPhone.some(u => u.phone && bodyText.includes(u.phone));
    log('表格渲染完整手机号', pageHasFullPhone, withPhone[0] ? `应见 ${withPhone[0].phone}` : '');
    log('表格无脱敏星号', !/\d{3}\*{4}\d{4}/.test(bodyText));
  }

  console.log('=== [A4] 手机号搜索（用户测试账号 13612674128） ===');
  await apage.locator('input[placeholder*="邮箱"]').first().fill('13612674128');
  await apage.locator('button:has-text("搜索")').first().click();
  await apage.waitForTimeout(1500);
  await apage.screenshot({ path: `${SHOTS}/v24-admin-search-phone.png`, fullPage: true });
  const searchText = await apage.locator('table').first().textContent().catch(() => '');
  log('按完整手机号搜索命中', searchText.includes('13612674128'), searchText.slice(0, 120));
  await actx.close();

  // ==================== [B] 屏幕放大默认关闭 ====================
  console.log('=== [B1] 无痕新用户：设置页「屏幕放大」默认关闭 ===');
  const bctx = await browser.newContext({ viewport: { width: 480, height: 900 } });
  const bpage = await bctx.newPage();
  // 需要登录态（settings 有 PageLoginGuard）—— 先登录
  await bpage.goto(`${BASE}/login/`, { waitUntil: 'networkidle', timeout: 60000 });
  await bpage.waitForTimeout(1500);
  await bpage.locator('input[placeholder*="手机号"]').first().fill('13612674128');
  await bpage.locator('input[type="password"]').first().fill('wuzhimin123');
  const agreeBox = bpage.locator('label:has-text("登录即同意") input[type="checkbox"]').first();
  if (await agreeBox.count() > 0 && !(await agreeBox.isChecked())) {
    await agreeBox.click({ force: true });
    await bpage.waitForTimeout(300);
  }
  await bpage.locator('button:has-text("登录")').first().click();
  await bpage.waitForTimeout(3000);
  await bpage.goto(`${BASE}/profile/settings/`, { waitUntil: 'networkidle', timeout: 60000 });
  await bpage.waitForTimeout(2000);
  await bpage.screenshot({ path: `${SHOTS}/v24-settings-default.png`, fullPage: true });

  // 断言：屏幕放大开关为关闭态（灰底 #d1d5db，非紫色 #7B2FBE）
  const zoomRow = bpage.locator('button', { hasText: '' }).filter({ has: bpage.locator('span:has-text("屏幕放大")') });
  const zoomToggle = bpage.locator('div:has(> div > span:text-is("屏幕放大")) button[style*="border-radius"]').first();
  let toggleBg = '';
  const rowBtn = bpage.locator('span:text-is("屏幕放大")').first().locator('xpath=ancestor::button[1]');
  if (await rowBtn.count() > 0) {
    toggleBg = await rowBtn.locator('button').first().evaluate(el => el.style.backgroundColor).catch(() => '');
  }
  log('屏幕放大默认关闭（灰底）', toggleBg.includes('211, 213, 219') || toggleBg === 'rgb(209, 213, 219)', `bg=${toggleBg}`);

  // localStorage 无标记时 zoom_disabled 状态 = 未显式开启
  const zdVal = await bpage.evaluate(() => localStorage.getItem('yandao_zoom_disabled'));
  log('未开启过时无标记或非0', zdVal !== '0', `yandao_zoom_disabled=${zdVal}`);

  console.log('=== [B2] 切换开启 → 持久化 + 重进仍开 ===');
  await rowBtn.locator('button').first().click();
  await bpage.waitForTimeout(500);
  const zdOn = await bpage.evaluate(() => localStorage.getItem('yandao_zoom_disabled'));
  log('开启后标记=0', zdOn === '0', `val=${zdOn}`);
  await bpage.goto(`${BASE}/profile/settings/`, { waitUntil: 'networkidle', timeout: 60000 });
  await bpage.waitForTimeout(1500);
  const rowBtn2 = bpage.locator('span:text-is("屏幕放大")').first().locator('xpath=ancestor::button[1]');
  const bgOn = await rowBtn2.locator('button').first().evaluate(el => el.style.backgroundColor).catch(() => '');
  log('重进后保持开启（紫底）', bgOn.includes('123, 47, 190') || bgOn === 'rgb(123, 47, 190)', `bg=${bgOn}`);
  await bpage.screenshot({ path: `${SHOTS}/v24-settings-on.png` });

  console.log('=== [B3] 关闭 → 标记=1 + 重进仍关 ===');
  await rowBtn2.locator('button').first().click();
  await bpage.waitForTimeout(500);
  const zdOff = await bpage.evaluate(() => localStorage.getItem('yandao_zoom_disabled'));
  log('关闭后标记=1', zdOff === '1', `val=${zdOff}`);
  await bpage.goto(`${BASE}/profile/settings/`, { waitUntil: 'networkidle', timeout: 60000 });
  await bpage.waitForTimeout(1500);
  const rowBtn3 = bpage.locator('span:text-is("屏幕放大")').first().locator('xpath=ancestor::button[1]');
  const bgOff = await rowBtn3.locator('button').first().evaluate(el => el.style.backgroundColor).catch(() => '');
  log('重进后保持关闭（灰底）', bgOff.includes('211, 213, 219') || bgOff === 'rgb(209, 213, 219)', `bg=${bgOff}`);

  console.log('=== [B4] 无痕首页无首次放大提示（默认关） ===');
  const cctx = await browser.newContext({ viewport: { width: 480, height: 900 } });
  const cpage = await cctx.newPage();
  await cpage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await cpage.waitForTimeout(3500);
  const hintVisible = await cpage.locator('text=双指捏拉可放大页面').first().isVisible().catch(() => false);
  log('首页无放大提示弹层', !hintVisible);
  await cctx.close();
  await bctx.close();

  console.log(`\n===== RESULT: PASS=${pass} FAIL=${fail} =====`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
