// 百度抓取诊断：模拟Baiduspider抓取首页，看蜘蛛视角结果。连接9224。不关浏览器。
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null, protocolTimeout: 90000 });
  const page = await browser.newPage();
  await page.goto('https://ziyuan.baidu.com/crawltools/index?site=https%3A%2F%2Fyandaoguoxue.yandao.vip%2F', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);
  const probe = await page.evaluate(() => {
    const t = (document.body.innerText || '').replace(/\s+/g, ' ');
    const inputs = [...document.querySelectorAll('input')].map(i => ({ type: i.type, ph: i.placeholder || '', cls: (i.className || '').slice(0, 40) }));
    const btns = [...document.querySelectorAll('button')].map(b => (b.innerText || '').trim()).filter(Boolean);
    return { hasDiag: /抓取诊断/.test(t), noAuth: /暂无.*权限/.test(t), inputs: inputs.slice(0, 10), btns: btns.slice(0, 15), text: t.slice(0, 500) };
  }).catch(e => ({ err: e.message }));
  console.log('HAS_DIAG_PAGE:', probe.hasDiag, '| NO_AUTH:', probe.noAuth);
  console.log('INPUTS:', JSON.stringify(probe.inputs));
  console.log('BTNS:', JSON.stringify(probe.btns));
  console.log('TEXT:', probe.text.slice(0, 400));
  await browser.disconnect();
})();
