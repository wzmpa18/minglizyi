// 抓取诊断：填URL→点击抓取→读结果
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 }).catch(() => {});
  await page.goto('https://ziyuan.baidu.com/crawltools/index?site=https://yandaoguoxue.yandao.vip/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await sleep(8000);

  // 填URL
  await page.evaluate(() => { const i = document.querySelector('input.submit-input'); i.focus(); });
  await page.type('input.submit-input', 'https://yandaoguoxue.yandao.vip/', { delay: 15 });
  await sleep(600);

  // 看是否出现验证码
  let vcode = await page.evaluate(() => {
    const v = document.querySelector('.err-code-input');
    const img = document.querySelector('img[src*="vcode"], img[src*="captcha"]');
    return { visible: v && v.offsetParent !== null, img: !!img };
  }).catch(() => ({ visible: false }));
  console.log('vcode check: ' + JSON.stringify(vcode));

  if (vcode.visible || vcode.img) {
    console.log('CAPTCHA_APPEARED - 需要Owner处理');
    await page.screenshot({ path: path.join(__dirname, 'baidu_diag_captcha.png') });
    await browser.disconnect();
    return;
  }

  // 点击抓取
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === '抓取'); if (b) b.click(); });
  console.log('clicked 抓取, waiting...');
  await sleep(15000);

  const result = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2500)).catch(() => '');
  console.log(result.slice(0, 1800));
  await page.screenshot({ path: path.join(__dirname, 'baidu_diag_result.png') });
  fs.writeFileSync(path.join(__dirname, 'baidu_diag_result.txt'), result, 'utf8');
  await browser.disconnect();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
