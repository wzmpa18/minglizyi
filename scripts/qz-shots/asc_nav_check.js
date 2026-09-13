// 点击左侧导航抓取App审核+历史记录
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const SHOT = (n) => path.join(__dirname, `asc_${n}.png`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('appstoreconnect')) || pages[0];

  async function clickNav(label) {
    const h = await page.evaluateHandle((t) => {
      const els = [...document.querySelectorAll('a, button, [role="button"], li, span, div')];
      const hits = els.filter((n) => {
        const s = (n.textContent || '').trim();
        return s === t && n.offsetParent !== null;
      });
      return hits[0] || null;
    }, label);
    const el = h && h.asElement();
    if (!el) { console.log(`[nav] 未找到 "${label}"`); return false; }
    await el.evaluate((n) => n.scrollIntoView({ block: 'center' })).catch(() => {});
    await sleep(400);
    await el.evaluate((n) => n.click()).catch(() => {});
    console.log(`[nav] 已点击 "${label}"`);
    return true;
  }

  const out = {};
  // App 审核
  if (await clickNav('App 审核')) {
    await sleep(8000);
    out.review = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 3500)).catch(() => '');
    console.log('[nav] ===== App审核页 =====\n' + out.review);
    await page.screenshot({ path: SHOT('16_review') }).catch(() => {});
  }
  // 历史记录
  if (await clickNav('历史记录')) {
    await sleep(8000);
    out.history = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 3500)).catch(() => '');
    console.log('[nav] ===== 历史记录页 =====\n' + out.history);
    await page.screenshot({ path: SHOT('17_history') }).catch(() => {});
  }
  fs.writeFileSync(path.join(__dirname, 'asc_nav_state.txt'), JSON.stringify(out, null, 2), 'utf8');
  console.log('[nav] 已存 asc_nav_state.txt');
  await browser.disconnect();
})().catch((e) => { console.error('[nav] FATAL', e.message); process.exit(1); });
