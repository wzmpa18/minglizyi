// 抓取诊断：dump元素+执行真实抓取诊断
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 }).catch(() => {});
  await page.goto('https://ziyuan.baidu.com/crawltools/index?site=https://yandaoguoxue.yandao.vip/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await sleep(8000);

  // dump所有可交互元素
  const els = await page.evaluate(() => {
    const r = { inputs: [], buttons: [], selects: [] };
    document.querySelectorAll('input').forEach((i, idx) => r.inputs.push({ idx, type: i.type, cls: i.className.slice(0, 40), val: (i.value || '').slice(0, 60), ph: i.placeholder }));
    document.querySelectorAll('button, .btn, a[class*=btn]').forEach((b, idx) => r.buttons.push({ idx, tag: b.tagName, cls: b.className.toString().slice(0, 40), txt: (b.innerText || '').trim().slice(0, 20) }));
    document.querySelectorAll('select').forEach((s, idx) => r.selects.push({ idx, cls: s.className.slice(0, 30), opts: [...s.options].map((o) => o.text).slice(0, 5) }));
    return r;
  }).catch(() => ({ inputs: [], buttons: [], selects: [] }));
  console.log(JSON.stringify(els, null, 1).slice(0, 2500));
  fs.writeFileSync(path.join(__dirname, 'baidu_diag_elements.json'), JSON.stringify(els, null, 1), 'utf8');

  await browser.disconnect();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
