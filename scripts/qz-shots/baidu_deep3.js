// 百度普通收录(API推送状态)+抓取诊断实测
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
const save = () => fs.writeFileSync(path.join(__dirname, 'baidu_deep_state3.txt'), JSON.stringify(out, null, 2), 'utf8');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 }).catch(() => {});

  // 1. 普通收录页（看API推送配额/历史/sitemap）
  console.log('[1] 普通收录页...');
  await page.goto('https://ziyuan.baidu.com/linksubmit/index?site=https://yandaoguoxue.yandao.vip/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await sleep(9000);
  out.linksubmit = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2200)).catch(() => '');
  console.log(out.linksubmit.slice(0, 1600));
  await page.screenshot({ path: path.join(__dirname, 'baidu_live_06_linksubmit.png') }).catch(() => {});
  save();

  // 2. 抓取诊断 - 提交首页诊断
  console.log('[2] 抓取诊断...');
  await page.goto('https://ziyuan.baidu.com/crawltools/index?site=https://yandaoguoxue.yandao.vip/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await sleep(8000);
  // 找到输入框填入URL并点击诊断
  const diag = await page.evaluate(() => {
    const input = document.querySelector('input[type=text]');
    return { hasInput: !!input, placeholder: input ? input.placeholder : '', body: (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 1200) };
  }).catch(() => ({ hasInput: false }));
  out.crawlDiagInit = diag;
  console.log('hasInput=' + diag.hasInput + ' placeholder=' + (diag.placeholder || ''));
  console.log((diag.body || '').slice(0, 700));
  if (diag.hasInput) {
    await page.evaluate(() => { const i = document.querySelector('input[type=text]'); i.value = ''; });
    await page.type('input[type=text]', 'https://yandaoguoxue.yandao.vip/', { delay: 20 });
    await sleep(500);
    // 找诊断按钮
    const clicked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button, a.btn, input[type=button], input[type=submit], .diagnosis-btn')];
      const b = btns.find((x) => /诊断|抓取一下|提交/.test(x.innerText || x.value || ''));
      if (b) { b.click(); return (b.innerText || b.value || '').trim(); }
      return null;
    });
    out.diagClicked = clicked;
    console.log('clicked: ' + clicked);
    await sleep(12000);
    out.crawlDiagResult = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 1800)).catch(() => '');
    console.log(out.crawlDiagResult.slice(0, 1200));
    await page.screenshot({ path: path.join(__dirname, 'baidu_live_07_crawldiag.png') }).catch(() => {});
    save();
  }

  await browser.disconnect();
  console.log('DONE');
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
