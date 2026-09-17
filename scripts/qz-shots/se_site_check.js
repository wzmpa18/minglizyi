// 搜狗/360/头条 site:收录核查：用真实Edge查询，不登录平台。不关浏览器。
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SITE = 'yandaoguoxue.yandao.vip';
const QUERIES = [
  { name: 'sogou', url: `https://www.sogou.com/web?query=site%3A${SITE}` },
  { name: 'so360', url: `https://www.so.com/s?q=site%3A${SITE}` },
  { name: 'toutiao', url: `https://so.toutiao.com/search?dvpf=pc&source=input&keyword=site%3A${SITE}` },
  { name: 'bing', url: `https://www.bing.com/search?q=site%3A${SITE}` },
];

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null, protocolTimeout: 90000 });
  const page = await browser.newPage();
  for (const q of QUERIES) {
    console.log(`\n=== [${q.name}] ===`);
    await page.goto(q.url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(8000);
    const st = await page.evaluate(() => {
      const t = (document.body.innerText || '').replace(/\s+/g, ' ');
      // 结果数
      const m = t.match(/(找到[^，,\s]{0,12}(条|个|篇)|约[\d,.\s]+条|共[\d,.\s]+条|[\d,]+ results)/);
      const results = [...document.querySelectorAll('h3 a')].slice(0, 6).map(a => ({ t: (a.innerText || '').slice(0, 50), h: (a.href || '').slice(0, 80) }));
      return { count: m ? m[0] : 'not-found', head: t.slice(0, 200), results };
    }).catch(e => ({ count: 'eval-fail: ' + e.message.slice(0, 50), head: '', results: [] }));
    console.log('COUNT:', st.count);
    console.log('HEAD:', st.head.slice(0, 160));
    st.results.slice(0, 4).forEach(r => console.log('  -', r.t, '|', r.h.slice(0, 70)));
  }
  await browser.disconnect();
  console.log('\nDONE');
})();
