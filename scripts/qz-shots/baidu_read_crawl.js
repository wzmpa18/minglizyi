// 读取百度抓取频次+抓取异常+抓取诊断结果。连接9224已登录Edge。不关浏览器。
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null, protocolTimeout: 90000 });
  const page = await browser.newPage();

  // 1) 抓取频次
  console.log('=== [1] 抓取频次 ===');
  await page.goto('https://ziyuan.baidu.com/pressure/index?site=https%3A%2F%2Fyandaoguoxue.yandao.vip%2F', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);
  let st = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ')).catch(() => '');
  console.log(st.slice(0, 600));
  await page.screenshot({ path: 'baidu_pressure.png' }).catch(() => {});

  // 2) 抓取异常
  console.log('\n=== [2] 抓取异常 ===');
  await page.goto('https://ziyuan.baidu.com/crawl/index?site=https%3A%2F%2Fyandaoguoxue.yandao.vip%2F', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);
  st = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ')).catch(() => '');
  console.log(st.slice(0, 600));
  await page.screenshot({ path: 'baidu_crawl_err.png' }).catch(() => {});

  await browser.disconnect();
  console.log('\nDONE');
})();
