// 百度sitemap提交：连接9224已登录Edge，在linksubmit sitemap tab填URL提交。不关浏览器。
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null, protocolTimeout: 90000 });
  const page = await browser.newPage();
  await page.goto('https://ziyuan.baidu.com/linksubmit/index?site=https%3A%2F%2Fyandaoguoxue.yandao.vip%2F&tab=sitemap', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);
  await page.screenshot({ path: 'baidu_sm_form.png' }).catch(() => {});

  // 分析表单结构
  const form = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input')].map(i => ({ type: i.type, name: i.name, ph: i.placeholder, cls: (i.className || '').slice(0, 50) }));
    const btns = [...document.querySelectorAll('button, a.m-button, .m-button')].map(b => ({ tag: b.tagName, text: (b.innerText || '').trim().slice(0, 30), cls: (b.className || '').slice(0, 60) }));
    return { inputs, btns };
  }).catch(e => ({ err: e.message }));
  console.log('INPUTS:', JSON.stringify(form.inputs, null, 1).slice(0, 800));
  console.log('BTNS:', JSON.stringify(form.btns, null, 1).slice(0, 600));

  await browser.disconnect();
  console.log('DONE');
})();
