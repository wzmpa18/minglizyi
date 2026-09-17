// 快速检查9224实例上各平台登录态
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
  const page = await browser.newPage();

  const checks = [
    ['Google账号', 'https://myaccount.google.com/'],
    ['百度资源平台', 'https://ziyuan.baidu.com/'],
    ['360站长', 'https://zhanzhang.so.com/'],
    ['搜狗站长', 'https://zhanzhang.sogou.com/'],
    ['头条站长', 'https://zhanzhang.toutiao.com/'],
  ];
  for (const [name, url] of checks) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {});
    await sleep(6000);
    const st = await page.evaluate(() => {
      const t = (document.body.innerText || '').replace(/\s+/g, ' ');
      return { url: location.href.slice(0, 90), head: t.slice(0, 90) };
    }).catch(() => ({ url: 'ERR', head: 'ERR' }));
    const loggedIn = !/登录|login|sign in|验证/i.test(st.head) || /退出|控制台|工作台|首页/.test(st.head);
    console.log(`[${name}] ${loggedIn ? '可能已登录' : '需登录'} | ${st.url}`);
    console.log(`   ${st.head}`);
  }
  await browser.disconnect();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
