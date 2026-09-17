// Google收录明细：取实际收录URL列表
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 }).catch(() => {});
  const HOST = 'yandaoguoxue.yandao.vip';
  const allLinks = [];

  for (let start = 0; start < 100; start += 10) {
    try {
      await page.goto(`https://www.google.com/search?q=site%3A${HOST}&num=10&start=${start}`, { waitUntil: 'domcontentloaded', timeout: 40000 });
      await sleep(5000);
      const r = await page.evaluate((h) => {
        const stats = (document.querySelector('#result-stats') || {}).innerText || '';
        const captcha = /unusual traffic|recaptcha/i.test(document.title + document.body.innerText);
        const urls = [];
        document.querySelectorAll('a').forEach((a) => {
          const m = (a.href || '').match(/^https?:\/\/[^\/]*\b(yandaoguoxue\.yandao\.vip)\b[^]*/);
          if (m && a.href.indexOf('google.') === -1 && a.innerText.trim().length > 3) urls.push(a.href.split('&ved=')[0]);
        });
        return { stats, captcha, urls: [...new Set(urls)] };
      }, HOST).catch(() => ({ urls: [], captcha: true }));
      if (r.captcha) { console.log('captcha at start=' + start); break; }
      if (!r.urls.length && start > 0) { console.log('no more results at start=' + start); break; }
      r.urls.forEach((u) => allLinks.push(u));
      console.log(`start=${start}: +${r.urls.length} (stats: ${r.stats.slice(0, 40)})`);
      await sleep(4000);
    } catch (e) { console.log('page fail at ' + start + ': ' + e.message); break; }
  }

  const uniq = [...new Set(allLinks)];
  fs.writeFileSync(path.join(__dirname, 'google_indexed_urls.txt'), uniq.join('\n'), 'utf8');
  console.log('TOTAL unique indexed URLs: ' + uniq.length);
  uniq.slice(0, 40).forEach((u) => console.log('  ' + u));
  await browser.disconnect();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
