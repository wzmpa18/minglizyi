const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('appstoreconnect')) || pages[0];
  await sleep(2000);
  await page.screenshot({ path: 'C:\\Users\\ZhuanZ\\Projects\\minglizyi\\scripts\\qz-shots\\asc_now.png' });
  // 也检查shadow DOM和iframe内的输入框
  const deep = await page.evaluate(() => {
    const input = document.querySelector('input');
    const iframes = [...document.querySelectorAll('iframe')].map((f) => f.src.slice(0, 70));
    const shadowRoots = [...document.querySelectorAll('*')].filter((n) => n.shadowRoot).length;
    return { hasInput: !!input, iframes, shadowRoots, inputs: document.querySelectorAll('input').length };
  }).catch(() => null);
  console.log('[shot] DOM状态:', JSON.stringify(deep));
  await browser.disconnect();
})();
