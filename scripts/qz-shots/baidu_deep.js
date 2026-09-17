// 百度资源平台深度核查(9224已登录)：三站收录/索引量/抓取/sitemap
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
const save = () => fs.writeFileSync(path.join(__dirname, 'baidu_deep_state.txt'), JSON.stringify(out, null, 2), 'utf8');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 }).catch(() => {});

  // 1. 站点管理页（看三站状态）
  console.log('[1] 百度站点管理页...');
  await page.goto('https://ziyuan.baidu.com/site/index', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await sleep(9000);
  out.siteIndex = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2500)).catch(() => '');
  console.log(out.siteIndex.slice(0, 1200));
  await page.screenshot({ path: path.join(__dirname, 'baidu_live_01_sites.png') }).catch(() => {});
  save();

  // 2. 普通收录-索引量（国学站）
  console.log('[2] 索引量...');
  await page.goto('https://ziyuan.baidu.com/main/indexation/index?site=https://yandaoguoxue.yandao.vip', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await sleep(8000);
  out.indexYdx = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 1500)).catch(() => '');
  console.log(out.indexYdx.slice(0, 800));
  await page.screenshot({ path: path.join(__dirname, 'baidu_live_02_index.png') }).catch(() => {});
  save();

  // 3. 抓取频次（国学站）
  console.log('[3] 抓取频次...');
  await page.goto('https://ziyuan.baidu.com/crawl/index?site=https://yandaoguoxue.yandao.vip', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await sleep(8000);
  out.crawlYdx = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 1200)).catch(() => '');
  console.log(out.crawlYdx.slice(0, 600));
  await page.screenshot({ path: path.join(__dirname, 'baidu_live_03_crawl.png') }).catch(() => {});
  save();

  await browser.disconnect();
  console.log('DONE');
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
