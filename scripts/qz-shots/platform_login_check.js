// 检查各站长平台登录状态：连接运行中的Edge(9223)，不关浏览器
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null, protocolTimeout: 60000 });
  const checks = [
    { name: 'baidu', url: 'https://ziyuan.baidu.com/main/index?site=https://yandaoguoxue.yandao.vip' },
    { name: 'toutiao', url: 'https://zhanzhang.toutiao.com/' },
    { name: 'sogou', url: 'https://zhanzhang.sogou.com/' },
    { name: 'so360', url: 'https://zhanzhang.so.com/' },
  ];
  const page = await browser.newPage();
  for (const c of checks) {
    try {
      await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await sleep(5000);
      const st = await page.evaluate(() => {
        const t = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200);
        return { url: location.href.slice(0, 120), text: t };
      }).catch(() => ({ url: 'eval-fail', text: '' }));
      const logged = !/登录|login|注册|sign in/i.test(st.text) || /退出|我的|数据|站点管理|抓取|收录/i.test(st.text);
      console.log(`[${c.name}] url=${st.url}`);
      console.log(`  text: ${st.text.slice(0, 150)}`);
      console.log(`  guess_logged_in: ${logged}`);
    } catch (e) { console.log(`[${c.name}] ERR ${e.message}`); }
  }
  await page.close().catch(() => {});
  await browser.disconnect();
  console.log('DONE');
})();
