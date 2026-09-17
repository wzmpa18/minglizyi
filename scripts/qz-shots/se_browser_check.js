// 用9223真实浏览器查 Bing/Google/搜狗 的 site: 收录（真实浏览器绕风控）
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
const HOST = 'yandaoguoxue.yandao.vip';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 }).catch(() => {});

  // 1. Bing
  try {
    await page.goto(`https://www.bing.com/search?q=site%3A${HOST}`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(6000);
    out.bing = await page.evaluate((h) => {
      const t = (document.body.innerText || '');
      const stats = (document.querySelector('.sb_count') || {}).innerText || '';
      const noRes = /没有找到|找不到|not find/i.test(t);
      const links = [...document.querySelectorAll('h2 a')].map((a) => a.href).filter((u) => u.includes(h));
      const captcha = /验证|puzzle|challenge/i.test(t);
      return { stats, noRes, links: links.length, captcha, title: document.title };
    }, HOST).catch(() => 'ERR');
    console.log('BING: ' + JSON.stringify(out.bing));
  } catch (e) { out.bing = 'FAIL:' + e.message; console.log('BING FAIL: ' + e.message); }

  await sleep(3000);

  // 2. Google
  try {
    await page.goto(`https://www.google.com/search?q=site%3A${HOST}&num=10`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(6000);
    out.google = await page.evaluate((h) => {
      const t = (document.body.innerText || '');
      const stats = (document.querySelector('#result-stats') || {}).innerText || '';
      const noRes = /did not match any documents|未找到|没有找到/.test(t);
      const links = [...document.querySelectorAll('a')].map((a) => a.href).filter((u) => u.includes(h) && !u.includes('google.')).length;
      const captcha = /unusual traffic|不是机器人|recaptcha/i.test(t);
      return { stats, noRes, links, captcha, title: document.title };
    }, HOST).catch(() => 'ERR');
    console.log('GOOGLE: ' + JSON.stringify(out.google));
  } catch (e) { out.google = 'FAIL:' + e.message; console.log('GOOGLE FAIL: ' + e.message); }

  await sleep(3000);

  // 3. 搜狗
  try {
    await page.goto(`https://www.sogou.com/web?query=site%3A${HOST}`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(6000);
    out.sogou = await page.evaluate((h) => {
      const t = (document.body.innerText || '');
      const captcha = /验证码|请依次点击/.test(t);
      const found = (t.match(/找到约?([\d,，]+)条/)||[])[1] || '';
      const noRes = /未找到相关结果|没有找到/.test(t);
      const links = [...document.querySelectorAll('h3 a')].map((a) => a.href).filter((u) => u.includes(h) || u.includes('sogou.com/link')).length;
      return { captcha, found, noRes, links, title: document.title };
    }, HOST).catch(() => 'ERR');
    console.log('SOGOU: ' + JSON.stringify(out.sogou));
  } catch (e) { out.sogou = 'FAIL:' + e.message; console.log('SOGOU FAIL: ' + e.message); }

  fs.writeFileSync(path.join(__dirname, 'se_browser_state.txt'), JSON.stringify(out, null, 2), 'utf8');
  await browser.disconnect();
  console.log('DONE');
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
