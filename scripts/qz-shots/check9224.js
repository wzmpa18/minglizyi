// 连接9224（用户已登录的Edge）检查GSC登录态，并打开百度sitemap提交页。不关浏览器。
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null, protocolTimeout: 90000 });
  const page = await browser.newPage();

  // 1) GSC 登录态
  console.log('[1] GSC login check...');
  const PROP = encodeURIComponent('sc-domain:yandao.vip');
  await page.goto(`https://search.google.com/search-console/sitemaps?resource_id=${PROP}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(10000);
  let st = await page.evaluate(() => ({
    url: location.href.slice(0, 150),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 250),
  })).catch(e => ({ url: 'eval-fail', text: e.message }));
  console.log('GSC url:', st.url);
  console.log('GSC text:', st.text.slice(0, 200));
  const gscOk = !/accounts\.google\.com/.test(st.url);
  console.log('GSC_LOGGED_IN:', gscOk);

  // 2) 百度资源平台 sitemap 提交页（普通收录-sitemap）
  console.log('\n[2] Baidu ziyuan sitemap page...');
  await page.goto('https://ziyuan.baidu.com/sitemap/index?site=https://yandaoguoxue.yandao.vip/', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(8000);
  st = await page.evaluate(() => ({
    url: location.href.slice(0, 150),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
  })).catch(e => ({ url: 'eval-fail', text: e.message }));
  console.log('BAIDU url:', st.url);
  console.log('BAIDU text:', st.text.slice(0, 280));
  await page.screenshot({ path: 'baidu_sitemap_page.png' }).catch(() => {});

  await browser.disconnect();
  console.log('\nDONE_DISCONNECTED_9224');
})();
