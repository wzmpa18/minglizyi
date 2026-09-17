// 百度快速抓取：主动触发Baiduspider抓取指定URL。连接9224已登录Edge。不关浏览器。
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const URLS = [
  'https://yandaoguoxue.yandao.vip/',
  'https://yandaoguoxue.yandao.vip/sitemap.xml',
  'https://yandaoguoxue.yandao.vip/zixue/zhongyi-zenme-rumen.html',
];

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null, protocolTimeout: 90000 });
  const page = await browser.newPage();

  for (const u of URLS) {
    console.log(`\n=== 快速抓取: ${u} ===`);
    await page.goto('https://ziyuan.baidu.com/crawltools/index?site=https%3A%2F%2Fyandaoguoxue.yandao.vip%2F', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(8000);
    const res = await page.evaluate(async (url) => {
      // 找输入框
      const inputs = [...document.querySelectorAll('input[type="text"]')];
      const inp = inputs.find(i => /网址|url|链接/i.test(i.placeholder || '') || i.className.includes('input'));
      if (!inp) return { ok: false, why: 'no-input', phs: inputs.map(i => i.placeholder).slice(0, 6) };
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, url);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, ph: inp.placeholder };
    }, u).catch(e => ({ ok: false, why: e.message }));
    console.log('FILL:', JSON.stringify(res));
    if (!res.ok) continue;

    await sleep(1200);
    const clickRes = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button, a')].filter(e => /抓取诊断|快速抓取|^抓取$/.test((e.innerText || '').trim()));
      if (!btns.length) return { ok: false, why: 'no-btn' };
      btns[0].click();
      return { ok: true, text: btns[0].innerText.trim() };
    });
    console.log('CLICK:', JSON.stringify(clickRes));
    // 等待诊断结果（模拟抓取需时间）
    await sleep(20000);
    const out = await page.evaluate(() => {
      const t = (document.body.innerText || '').replace(/\s+/g, ' ');
      const i = t.indexOf('抓取诊断结果');
      const j = t.indexOf('HTTP状态') >= 0 ? t.indexOf('HTTP状态') : t.indexOf('抓取状态');
      const seg = i >= 0 ? t.slice(i, i + 400) : (j >= 0 ? t.slice(j - 50, j + 350) : t.slice(-500));
      return seg;
    }).catch(() => 'eval-fail');
    console.log('RESULT:', out.slice(0, 380));
    await page.screenshot({ path: 'baidu_crawl_diag_' + URLS.indexOf(u) + '.png' }).catch(() => {});
  }

  await browser.disconnect();
  console.log('\nDONE');
})();
