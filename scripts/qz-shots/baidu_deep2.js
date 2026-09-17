// 百度平台导航提取 + 索引量/抓取频次正确页面
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
const save = () => fs.writeFileSync(path.join(__dirname, 'baidu_deep_state2.txt'), JSON.stringify(out, null, 2), 'utf8');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 }).catch(() => {});

  // 从抓取异常页提取菜单真实链接
  await page.goto('https://ziyuan.baidu.com/crawl/index?site=https://yandaoguoxue.yandao.vip', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await sleep(6000);
  out.nav = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('a').forEach((a) => {
      const t = (a.innerText || '').trim();
      if (['索引量', '抓取频次', '抓取诊断', '流量与关键词', '普通收录'].includes(t)) links.push(t + ' -> ' + a.href);
    });
    return links;
  }).catch(() => []);
  console.log('=== 导航链接 ===');
  out.nav.forEach((l) => console.log(l));
  save();

  // 索引量
  const idxUrl = (out.nav.find((l) => l.startsWith('索引量')) || '').split(' -> ')[1];
  if (idxUrl) {
    console.log('[索引量] ' + idxUrl);
    await page.goto(idxUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await sleep(9000);
    out.indexVolume = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 1500)).catch(() => '');
    console.log(out.indexVolume.slice(0, 900));
    await page.screenshot({ path: path.join(__dirname, 'baidu_live_04_indexvol.png') }).catch(() => {});
    save();
  }

  // 抓取频次
  const crawlUrl = (out.nav.find((l) => l.startsWith('抓取频次')) || '').split(' -> ')[1];
  if (crawlUrl) {
    console.log('[抓取频次] ' + crawlUrl);
    await page.goto(crawlUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await sleep(9000);
    out.crawlFreq = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 1500)).catch(() => '');
    console.log(out.crawlFreq.slice(0, 900));
    await page.screenshot({ path: path.join(__dirname, 'baidu_live_05_crawlfreq.png') }).catch(() => {});
    save();
  }

  await browser.disconnect();
  console.log('DONE');
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
