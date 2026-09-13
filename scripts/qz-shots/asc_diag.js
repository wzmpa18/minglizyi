// 快速诊断：刷新ASC登录页并报告表单状态
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('appstoreconnect')) || pages[0];
  console.log('[diag] 页面: ' + page.url());
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => console.log('[diag] reload: ' + e.message.slice(0, 50)));
  for (let i = 0; i < 6; i++) {
    await sleep(8000);
    const st = await page.evaluate(() => {
      const input = document.querySelector('input[type="email"], input[type="text"], input[name="appleid"], #account_name_text_field');
      const t = document.body.innerText || '';
      return { len: t.length, hasInput: !!input, url: location.href, head: t.replace(/\s+/g, ' ').slice(0, 60) };
    }).catch(() => null);
    if (st) console.log(`[diag] ${8 * (i + 1)}s | ${st.len}字 | 输入框=${st.hasInput} | ${st.url.slice(0, 50)} | ${st.head}`);
    if (st && st.len > 150) break;
  }
  await browser.disconnect();
})().catch((e) => { console.error('[diag] FATAL', e.message); process.exit(1); });
