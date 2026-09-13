// 抓取ASC的App审核消息页+历史记录页
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const SHOT = (n) => path.join(__dirname, `asc_${n}.png`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('appstoreconnect')) || pages[0];
  console.log('[rev] 当前页: ' + page.url().slice(0, 70));

  const APP = 'https://appstoreconnect.apple.com/apps/6807592575';
  // App审核页（问题和消息）
  await page.goto(`${APP}/reviewinfo/ios`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);
  let t1 = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 3000)).catch(() => '');
  console.log('[rev] ===== App审核页 =====\n' + t1);
  await page.screenshot({ path: SHOT('14_reviewinfo') }).catch(() => {});

  // 历史记录
  await page.goto(`${APP}/activity/ios`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);
  let t2 = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 3000)).catch(() => '');
  console.log('[rev] ===== 历史记录页 =====\n' + t2);
  await page.screenshot({ path: SHOT('15_activity') }).catch(() => {});

  // 综合页(带提交时间)
  await page.goto(`${APP}/distribution/ios`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);
  let t3 = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 1500)).catch(() => '');
  console.log('[rev] ===== 综合页开头 =====\n' + t3);

  fs.writeFileSync(path.join(__dirname, 'asc_review_state.txt'),
    '===== App审核页 =====\n' + t1 + '\n\n===== 历史记录 =====\n' + t2 + '\n\n===== 综合页 =====\n' + t3, 'utf8');
  console.log('[rev] 已存 asc_review_state.txt');
  await browser.disconnect();
})().catch((e) => { console.error('[rev] FATAL', e.message); process.exit(1); });
