// 检查9223实例各中国平台登录态
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const page = await browser.newPage();

  const checks = [
    ['百度资源平台', 'https://ziyuan.baidu.com/site/index'],
    ['360站长', 'https://zhanzhang.so.com/'],
    ['搜狗站长', 'https://zhanzhang.sogou.com/'],
    ['头条站长', 'https://zhanzhang.toutiao.com/'],
  ];
  for (const [name, url] of checks) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {});
    await sleep(7000);
    const st = await page.evaluate(() => {
      const t = (document.body.innerText || '').replace(/\s+/g, ' ');
      return { url: location.href.slice(0, 100), head: t.slice(0, 130) };
    }).catch(() => ({ url: 'ERR', head: 'ERR' }));
    console.log(`[${name}] ${st.url}`);
    console.log(`   ${st.head}`);
  }
  await browser.disconnect();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
