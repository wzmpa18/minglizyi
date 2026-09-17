// GSC登录态快速检查(9224)
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
  const page = await browser.newPage();
  const PROP = encodeURIComponent('sc-domain:yandao.vip');
  await page.goto(`https://search.google.com/search-console?resource_id=${PROP}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(10000);
  const st = await page.evaluate(() => {
    const t = (document.body.innerText || '').replace(/\s+/g, ' ');
    return { url: location.href.slice(0, 100), head: t.slice(0, 150), len: t.length };
  }).catch(() => ({ url: 'ERR', head: 'ERR', len: 0 }));
  console.log('url=' + st.url);
  console.log('head=' + st.head);
  console.log('len=' + st.len);
  const isLogin = st.url.includes('accounts.google.com') || /继续使用 Google 搜索控制台/.test(st.head);
  console.log(isLogin ? 'RESULT: GSC_NOT_LOGGED_IN' : 'RESULT: GSC_LOGGED_IN');
  await browser.disconnect();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
