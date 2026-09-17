// 检查已有标签页登录态：连接Edge(9223)，复用已开页面，不关浏览器
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null, protocolTimeout: 90000 });
  const targets = await browser.targets();
  const wanted = [
    { name: 'baidu-ziyuan', match: /ziyuan\.baidu\.com/ },
    { name: 'toutiao-zhanzhang', match: /zhanzhang\.toutiao\.com/ },
    { name: 'sogou', match: /sogou\.com\/web/ },
    { name: 'gsc', match: /search\.google\.com\/search-console/ },
  ];
  for (const w of wanted) {
    const t = targets.find(x => w.match.test(x.url()) && x.type() === 'page');
    if (!t) { console.log(`[${w.name}] no open tab`); continue; }
    try {
      const page = await t.page();
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
      await sleep(6000);
      const st = await page.evaluate(() => ({
        url: location.href.slice(0, 130),
        text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 220),
      })).catch(e => ({ url: 'eval-fail', text: e.message }));
      console.log(`\n[${w.name}] ${st.url}`);
      console.log(`  ${st.text.slice(0, 200)}`);
      await page.screenshot({ path: `login_recheck_${w.name}.png` }).catch(() => {});
    } catch (e) { console.log(`[${w.name}] ERR: ${e.message.slice(0, 100)}`); }
  }
  await browser.disconnect();
  console.log('\nDONE');
})();
