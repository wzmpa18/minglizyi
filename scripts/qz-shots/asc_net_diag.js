// 诊断ASC登录页网络请求失败情况
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('appstoreconnect')) || pages[0];
  const failed = [];
  page.on('requestfailed', (r) => failed.push(`FAIL ${r.url().slice(0, 90)} | ${r.failure() && r.failure().errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`HTTP${r.status()} ${r.url().slice(0, 90)}`); });
  await page.goto('https://appstoreconnect.apple.com/login', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await sleep(12000);
  console.log('[net] 失败请求 (' + failed.length + '):');
  failed.slice(0, 15).forEach((f) => console.log('  ' + f));
  // 请求统计
  const st = await page.evaluate(() => ({ len: (document.body.innerText || '').length }));
  console.log('[net] 页面文本: ' + st.len + '字');
  await browser.disconnect();
})().catch((e) => { console.error('[net] FATAL', e.message); process.exit(1); });
