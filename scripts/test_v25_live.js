// v25.0.47_25 公网 E2E：后台用户列表分页（浏览全部用户）
// 覆盖：分页控件可见（共N条·第X/Y页+上一页/页码/下一页+每页条数）、
//       20条/页翻页切换数据、切「全部显示」一页拉全量、v24 回归（手机号/邮箱列完整）
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

  console.log('=== [1] 管理员进入 /admin/moderation（用户tab） ===');
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate((k) => localStorage.setItem('yandao_console_admin_key', k), ADMIN_KEY);
  await page.goto(`${BASE}/admin/moderation/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SHOTS}/v25-pager-default.png`, fullPage: true });

  console.log('=== [2] 分页控件可见性 ===');
  log('概览文案「共 N 条 · 第 X/Y 页」', await page.locator('text=/共 \\d+ 条 · 第 \\d+\\/\\d+ 页/').first().isVisible().catch(() => false));
  log('上一页按钮可见', await page.locator('button:has-text("上一页")').first().isVisible().catch(() => false));
  log('下一页按钮可见', await page.locator('button:has-text("下一页")').first().isVisible().catch(() => false));
  log('每页条数选择器可见', await page.locator('select:has(option:has-text("全部显示"))').first().isVisible().catch(() => false));

  // API 验证分页数据正确性
  console.log('=== [3] 接口分页数据 ===');
  const fetchUsers = async (p, size) => page.evaluate(async ({ p, size }) => {
    const key = localStorage.getItem('yandao_console_admin_key');
    const r = await fetch(`/api/admin/unified/moderation/users?page=${p}&size=${size}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const j = await r.json().catch(() => null);
    return j && j.success ? { total: j.data.total, n: (j.data.users || []).length, first: j.data.users?.[0]?.user_id } : null;
  }, { p, size });
  const total20 = await fetchUsers(1, 20);
  log('默认 20 条/页', total20 && total20.n === Math.min(20, total20.total), `total=${total20 ? total20.total} n=${total20 ? total20.n}`);
  if (total20 && total20.total > 20) {
    const p2 = await fetchUsers(2, 20);
    log('第 2 页返回下一批数据', p2 && p2.n > 0 && p2.first !== total20.first, `page2 first=${p2 ? p2.first}`);
    const pEnd = await fetchUsers(Math.ceil(total20.total / 20), 20);
    log('末页条数=总数-前面页数', pEnd && pEnd.n === total20.total - (Math.ceil(total20.total / 20) - 1) * 20, `lastPage n=${pEnd ? pEnd.n}`);
  }
  const all = await fetchUsers(1, 500);
  log('size=500 全部拉取', all && all.n === all.total, `total=${all ? all.total} n=${all ? all.n}`);

  console.log('=== [4] 页面交互：翻页 ===');
  const overview1 = await page.locator('text=/共 \\d+ 条 · 第 1\\/\\d+ 页/').first().textContent().catch(() => '');
  const firstIdP1 = await page.locator('table tbody tr').first().locator('td').first().textContent().catch(() => '');
  const nextBtn = page.locator('button:has-text("下一页")').first();
  if (await nextBtn.isEnabled().catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(1500);
    const overview2 = await page.locator('text=/共 \\d+ 条 · 第 2\\/\\d+ 页/').first().isVisible().catch(() => false);
    log('点击下一页→第 2 页概览', overview2, `p1概览=${overview1}`);
    const firstIdP2 = await page.locator('table tbody tr').first().locator('td').first().textContent().catch(() => '');
    log('第 2 页数据不同于第 1 页', firstIdP1 !== firstIdP2, `p1首ID=${firstIdP1} p2首ID=${firstIdP2}`);
    await page.screenshot({ path: `${SHOTS}/v25-pager-page2.png`, fullPage: true });
    // 页码 1 按钮跳回
    await page.locator('button', { hasText: /^1$/ }).first().click().catch(async () => {
      await page.locator('button:text-is("1")').first().click();
    });
    await page.waitForTimeout(1500);
    const overview1b = await page.locator('text=/共 \\d+ 条 · 第 1\\/\\d+ 页/').first().isVisible().catch(() => false);
    log('点击页码 1 跳回第 1 页', overview1b);
  } else {
    log('单页无需翻页（总数≤20）', true, `total=${total20 ? total20.total}`);
  }

  console.log('=== [5] 切「全部显示」一页拉全量 ===');
  await page.locator('select:has(option:has-text("全部显示"))').first().selectOption('500');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOTS}/v25-pager-all.png`, fullPage: true });
  const rowCount = await page.locator('table tbody tr').count();
  const totalVal = total20 ? total20.total : 0;
  log('全部显示=表格行数等于总数', rowCount === totalVal, `rows=${rowCount} total=${totalVal}`);
  const overviewAll = await page.locator('text=/共 \\d+ 条 · 第 1\\/1 页/').first().isVisible().catch(() => false);
  log('概览显示第 1/1 页', overviewAll);

  console.log('=== [6] v24 回归：手机号/邮箱列完整 ===');
  log('表头手机号列仍在', await page.locator('th:has-text("手机号")').first().isVisible().catch(() => false));
  log('表头邮箱列仍在', await page.locator('th:has-text("邮箱")').first().isVisible().catch(() => false));
  const bodyText = await page.locator('table').first().textContent().catch(() => '');
  log('完整手机号渲染（无脱敏）', /\d{11}/.test(bodyText) && !/\d{3}\*{4}\d{4}/.test(bodyText));

  await ctx.close();
  console.log(`\n===== RESULT: PASS=${pass} FAIL=${fail} =====`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
