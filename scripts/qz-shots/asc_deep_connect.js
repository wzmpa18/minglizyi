// 连接已运行的Edge（9223）做ASC深度核查
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const SHOT = (n) => path.join(__dirname, `asc_${n}.png`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  console.log('[deep] 已连接运行中的Edge');
  const pages = await browser.pages();
  let page = pages.find((p) => p.url().includes('appstoreconnect')) || pages[0];
  if (!page) { page = await browser.newPage(); await page.goto('https://appstoreconnect.apple.com/apps', { waitUntil: 'domcontentloaded' }).catch(() => {}); }
  console.log('[deep] 当前页: ' + page.url());
  await sleep(5000);

  // 确保在apps列表页
  if (!page.url().includes('/apps')) {
    await page.goto('https://appstoreconnect.apple.com/apps', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(8000);
  }

  // 找言道国学的链接URL
  const appUrl = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')];
    const hit = links.find((a) => (a.textContent || '').includes('言道国学'));
    return hit ? hit.href : null;
  });
  console.log('[deep] 言道国学URL: ' + appUrl);

  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(10000);
  const appText = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 3500));
  console.log('[deep] ===== App主页文本 =====\n' + appText);
  await page.screenshot({ path: SHOT('10_app_home') }).catch(() => {});

  // 点击版本行 v25.0.77
  const vl = await page.evaluateHandle(() => {
    const els = [...document.querySelectorAll('a, [role="button"], td, div')];
    return els.filter((n) => (n.textContent || '').includes('v25.0.77'))[0] || null;
  });
  const vle = vl && vl.asElement();
  if (vle) {
    await vle.evaluate((n) => n.scrollIntoView({ block: 'center' })).catch(() => {});
    await sleep(500);
    await vle.evaluate((n) => n.click()).catch(() => {});
    console.log('[deep] 已点击版本 v25.0.77');
    await sleep(9000);
  }
  const verText = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 5000));
  console.log('[deep] ===== 版本页文本 =====\n' + verText);
  await page.screenshot({ path: SHOT('11_version_detail') }).catch(() => {});

  const appId = (appUrl.match(/\/apps\/(\d+)/) || [])[1];
  // 年龄分级
  await page.goto(`https://appstoreconnect.apple.com/apps/${appId}/appinfo/ios/ratings_reviews`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(7000);
  const ratingText = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2000));
  console.log('[deep] ===== 年龄分级页 =====\n' + ratingText);
  await page.screenshot({ path: SHOT('12_rating') }).catch(() => {});

  // App审核信息/消息
  await page.goto(`https://appstoreconnect.apple.com/apps/${appId}/appinfo/ios/reviewinfo`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(7000);
  const revText = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2500));
  console.log('[deep] ===== 审核信息页 =====\n' + revText);
  await page.screenshot({ path: SHOT('13_reviewinfo') }).catch(() => {});

  fs.writeFileSync(path.join(__dirname, 'asc_deep_state.txt'),
    'AppURL: ' + appUrl + '\n\n===== App主页 =====\n' + appText + '\n\n===== 版本页 =====\n' + verText + '\n\n===== 年龄分级 =====\n' + ratingText + '\n\n===== 审核信息 =====\n' + revText, 'utf8');
  console.log('[deep] 已存 asc_deep_state.txt');
  await browser.disconnect();
})().catch((e) => { console.error('[deep] FATAL', e.message); process.exit(1); });
