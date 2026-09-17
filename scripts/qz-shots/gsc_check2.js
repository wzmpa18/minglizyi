// GSC实时核查：读取索引报告三类新问题（重复/404/重定向）+sitemap状态
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(__dirname, 'gsc_live_state.txt');
const out = { time: new Date().toLocaleString('zh-CN') };

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const page = await browser.newPage();
  const PROP = encodeURIComponent('sc-domain:yandao.vip');

  // 1. 打开GSC检查登录态
  console.log('[1] 打开GSC...');
  await page.goto(`https://search.google.com/search-console?resource_id=${PROP}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);
  let st = await page.evaluate(() => ({ url: location.href, len: (document.body.innerText || '').length, head: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 100) })).catch(() => null);
  console.log('[1] url=' + (st ? st.url.slice(0, 80) : 'NULL') + ' len=' + (st ? st.len : 0));
  console.log('[1] head=' + (st ? st.head : ''));
  if (!st || st.len < 100 || st.url.includes('accounts.google.com')) {
    out.login = 'NOT_LOGGED_IN: ' + (st ? st.url : 'null');
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
    console.log('RESULT: NOT_LOGGED_IN');
    await browser.disconnect();
    return;
  }
  out.login = 'OK';

  // 2. 索引报告-网页总览
  console.log('[2] 索引编制报告...');
  await page.goto(`https://search.google.com/search-console/index/drilldown?resource_id=${PROP}&item_key=ALL_PAGES`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(10000);
  out.indexingAll = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 3000)).catch(() => '');
  console.log('[2] ===== 索引总览 =====\n' + out.indexingAll.slice(0, 1500));
  await page.screenshot({ path: path.join(__dirname, 'gsc_live_01_indexing.png') }).catch(() => {});

  // 3. 未编入索引原因细分
  console.log('[3] 未编入索引细分...');
  await page.goto(`https://search.google.com/search-console/index/drilldown?resource_id=${PROP}&item_key=EXCLUDED`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(10000);
  out.indexingExcluded = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 3500)).catch(() => '');
  console.log('[3] ===== 未编入索引 =====\n' + out.indexingExcluded.slice(0, 2000));
  await page.screenshot({ path: path.join(__dirname, 'gsc_live_02_excluded.png') }).catch(() => {});

  // 4. sitemap状态
  console.log('[4] 站点地图...');
  await page.goto(`https://search.google.com/search-console/sitemaps?resource_id=${PROP}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);
  out.sitemaps = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2500)).catch(() => '');
  console.log('[4] ===== 站点地图 =====\n' + out.sitemaps.slice(0, 1500));
  await page.screenshot({ path: path.join(__dirname, 'gsc_live_03_sitemaps.png') }).catch(() => {});

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log('DONE -> gsc_live_state.txt');
  await browser.disconnect();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
