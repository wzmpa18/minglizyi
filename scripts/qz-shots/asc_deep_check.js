// ASC 深度核查：言道国学版本页+审核消息+年龄分级状态
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PROFILE = 'C:\\Users\\ZhuanZ\Projects\\minglizyi\\.edge-asc-profile2';
const SHOT = (n) => path.join(__dirname, `asc_${n}.png`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: false,
    userDataDir: PROFILE,
    args: ['--no-sandbox', '--window-size=1400,950', '--disable-blink-features=AutomationControlled', '--lang=zh-CN'],
    defaultViewport: null,
  });
  const page = (await browser.pages())[0] || (await browser.newPage());

  await page.goto('https://appstoreconnect.apple.com/apps', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(8000);

  // 找言道国学的链接URL
  const appUrl = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')];
    const hit = links.find((a) => (a.textContent || '').includes('言道国学'));
    return hit ? hit.href : null;
  });
  console.log('[deep] 言道国学URL: ' + appUrl);
  if (!appUrl) { console.log('[deep] 未找到言道国学链接'); await browser.close(); process.exit(1); }

  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(10000);
  const appText = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 3500));
  console.log('[deep] ===== App主页文本 =====\n' + appText);
  await page.screenshot({ path: SHOT('10_app_home') }).catch(() => {});

  // 尝试点击"言道 v25.0.77"版本行，进版本详情
  const verLink = await page.evaluateHandle(() => {
    const els = [...document.querySelectorAll('a, [role="button"], td, div')];
    return els.filter((n) => (n.textContent || '').includes('v25.0.77'))[0] || null;
  });
  const vl = verLink && verLink.asElement();
  if (vl) {
    await vl.evaluate((n) => n.scrollIntoView({ block: 'center' })).catch(() => {});
    await sleep(500);
    await vl.evaluate((n) => n.click()).catch(() => {});
    console.log('[deep] 点击版本 v25.0.77');
    await sleep(9000);
  }
  const verText = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 4500));
  console.log('[deep] ===== 版本页文本 =====\n' + verText);
  await page.screenshot({ path: SHOT('11_version_detail') }).catch(() => {});

  // 审核信息和消息页
  const msgUrl = (appUrl.match(/\/apps\/(\d+)/) || [])[1];
  if (msgUrl) {
    await page.goto(`https://appstoreconnect.apple.com/apps/${msgUrl}/appinfo/ios/ratings_reviews`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(6000);
    await page.screenshot({ path: SHOT('12_rating') }).catch(() => {});
    // App Review消息
    await page.goto(`https://appstoreconnect.apple.com/apps/${msgUrl}/activity`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(6000);
    const actText = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2500));
    console.log('[deep] ===== 活动页文本 =====\n' + actText);
    await page.screenshot({ path: SHOT('13_activity') }).catch(() => {});
  }

  fs.writeFileSync(path.join(__dirname, 'asc_deep_state.txt'),
    'AppURL: ' + appUrl + '\n\n===== App主页 =====\n' + appText + '\n\n===== 版本页 =====\n' + verText, 'utf8');
  console.log('[deep] 已存 asc_deep_state.txt');
  await sleep(10000);
  await browser.close();
})().catch((e) => { console.error('[deep] FATAL', e.message); process.exit(1); });
