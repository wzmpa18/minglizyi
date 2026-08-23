const { chromium } = require('playwright');
const fs = require('fs');

// v22 本地排版预演：mock API 渲染三套模板海报，导出PNG检查3:4布局是否溢出
const PORT = 3456;
const SHOTS = 'C:/Users/ZhuanZ/Projects/minglizyi/.test-shots';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 480, height: 900 } });
  const page = await ctx.newPage();

  await ctx.addInitScript(() => {
    localStorage.setItem('yandao_user_token', 'preview-token');
    localStorage.setItem('yandao_user_profile', JSON.stringify({
      userId: '910080', nickname: '预演用户', phone: '13600000000', memberLevel: 'free',
    }));
  });

  await page.route('**/api/**', (route) => {
    const url = route.request().url();
    const json = (data) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    if (url.includes('/api/auth/invite/link')) {
      return json({ success: true, data: {
        userId: 910080, inviteCode: 'YD8K2M', inviteLink: 'https://yandaoguoxue.yandao.vip/register?code=YD8K2M',
        inviteRef: 'r', inviteTs: '2026-08-24', inviteSig: 's',
        rewardRules: { register: 100, firstPay: 500 },
      }});
    }
    if (url.includes('/api/auth/invite/overview')) {
      return json({ success: true, data: {
        stats: { totalInvites: 3, todayInvites: 1, monthInvites: 2, totalRewardPoints: 300, pointsBalance: 1200 },
        invitees: [{ inviteeId: 1, name: '好友A', invitedAt: '2026-08-20' }],
        rewards: [],
      }});
    }
    if (url.includes('/api/auth/points/transactions')) {
      return json({ success: true, data: { balance: 1200, transactions: [] }});
    }
    return json({ success: true, data: {} });
  });

  await page.goto(`http://localhost:${PORT}/invite/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4500);

  const poster = page.locator('img[alt="邀请海报"]');
  const ok = await poster.isVisible().catch(() => false);
  console.log('poster visible:', ok);
  if (!ok) { console.log((await page.evaluate(() => document.body.innerText)).slice(0, 400)); process.exit(1); }

  const savePoster = async (name) => {
    const src = await poster.getAttribute('src');
    const dim = await poster.evaluate((img) => ({ w: img.naturalWidth, h: img.naturalHeight }));
    if (src && src.startsWith('data:image')) {
      fs.writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(src.split(',')[1], 'base64'));
    }
    console.log(`${name}: ${dim.w}x${dim.h} ratio=${(dim.w / dim.h).toFixed(3)} file=${src ? Math.round(src.length / 1024) : 0}KB`);
  };

  await savePoster('local-tpl1-moments');
  for (const t of ['社群引流', '学习进阶', '朋友圈种草']) {
    await page.locator('button', { hasText: t }).first().click();
    await page.waitForTimeout(2500);
    await savePoster(`local-tpl-${t}`);
  }
  await page.screenshot({ path: `${SHOTS}/local-invite-full.png`, fullPage: true });
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
