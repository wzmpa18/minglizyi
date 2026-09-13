// GSC核查：连接运行中的Edge（9223），等Owner登录Google后读取Search Console数据
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const SHOT = (n) => path.join(__dirname, `gsc_${n}.png`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const page = await browser.newPage();
  console.log('[gsc] 打开 Google Search Console ...');
  const PROP0 = encodeURIComponent('sc-domain:yandao.vip');
  await page.goto(`https://search.google.com/search-console?resource_id=${PROP0}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(8000);

  // 若跳到账号选择/登录页，等Owner登录（最多25分钟）
  const t0 = Date.now();
  while (Date.now() - t0 < 25 * 60 * 1000) {
    const st = await page.evaluate(() => {
      const t = document.body.innerText || '';
      return { url: location.href, len: t.length, head: t.replace(/\s+/g, ' ').slice(0, 80) };
    }).catch(() => null);
    if (!st) { await sleep(8000); continue; }
    // 登录成功的标志：进入resource_id页且无登录表单
    if (st.url.includes('resource_id') && st.len > 150) break;
    if (st.url.includes('performance') || st.url.includes('sitemaps')) { if (st.len > 200 && !st.head.includes('登录') && !st.head.includes('Sign in')) break; }
    const min = Math.round((Date.now() - t0) / 60000);
    if (Math.floor((Date.now() - t0) / 10000) % 6 === 0) console.log(`[gsc] ${min}分钟 | ${st.url.slice(0, 60)} | ${st.len}字 | ${st.head.slice(0, 45)}`);
    await sleep(10000);
  }
  console.log('[gsc] 登录状态确认，开始读取...');
  await sleep(5000);

  // yandao.vip property 概览
  const PROP = encodeURIComponent('sc-domain:yandao.vip');
  const urls = {
    overview: `https://search.google.com/search-console?resource_id=${PROP}`,
    sitemaps: `https://search.google.com/search-console/sitemaps?resource_id=${PROP}`,
    indexing: `https://search.google.com/search-console/index/drilldown?resource_id=${PROP}&item_key=ALL_PAGES`,
    performance: `https://search.google.com/search-console/performance/search-analytics?resource_id=${PROP}`,
  };

  const out = {};
  // 概览
  await page.goto(urls.overview, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);
  out.overview = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2200)).catch(() => '');
  console.log('[gsc] ===== 概览 =====\n' + out.overview);
  await page.screenshot({ path: SHOT('01_overview') }).catch(() => {});

  // 站点地图
  await page.goto(urls.sitemaps, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);
  out.sitemaps = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2200)).catch(() => '');
  console.log('[gsc] ===== 站点地图 =====\n' + out.sitemaps);
  await page.screenshot({ path: SHOT('02_sitemaps') }).catch(() => {});

  // 索引覆盖
  await page.goto(urls.indexing, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);
  out.indexing = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2500)).catch(() => '');
  console.log('[gsc] ===== 索引 =====\n' + out.indexing);
  await page.screenshot({ path: SHOT('03_indexing') }).catch(() => {});

  // 效果
  await page.goto(urls.performance, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(10000);
  out.performance = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2500)).catch(() => '');
  console.log('[gsc] ===== 效果 =====\n' + out.performance);
  await page.screenshot({ path: SHOT('04_performance') }).catch(() => {});

  fs.writeFileSync(path.join(__dirname, 'gsc_state.txt'), JSON.stringify(out, null, 2), 'utf8');
  console.log('[gsc] 已存 gsc_state.txt');
  await browser.disconnect();
})().catch((e) => { console.error('[gsc] FATAL', e.message); process.exit(1); });
