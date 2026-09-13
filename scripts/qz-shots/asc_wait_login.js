// 轮询等待Owner在已打开的浏览器中登录ASC，登录后自动深度核查
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const SHOT = (n) => path.join(__dirname, `asc_${n}.png`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find((p) => p.url().includes('appstoreconnect')) || pages[0];
  console.log('[wait] 监控页: ' + page.url());

  // 最多等25分钟
  const t0 = Date.now();
  let logged = false;
  while (Date.now() - t0 < 25 * 60 * 1000) {
    await sleep(10000);
    const st = await page.evaluate(() => {
      const t = document.body.innerText || '';
      return { url: location.href, len: t.length, head: t.replace(/\s+/g, ' ').slice(0, 80) };
    }).catch(() => null);
    if (!st) continue;
    if ((st.url.includes('/apps') || st.head.includes('所有状态') || st.head.includes('言道国学')) && st.len > 100) {
      logged = true;
      console.log('[wait] ✅ 检测到已登录!');
      break;
    }
    const min = Math.round((Date.now() - t0) / 60000);
    if (Math.floor((Date.now() - t0) / 10000) % 6 === 0) {
      console.log(`[wait] ${min}分钟 | 页面: ${st.url.slice(0, 55)} | ${st.len}字 | ${st.head.slice(0, 50)}`);
    }
  }
  if (!logged) { console.log('[wait] 25分钟超时'); process.exit(2); }

  await sleep(5000);
  if (!page.url().includes('/apps')) {
    await page.goto('https://appstoreconnect.apple.com/apps', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(8000);
  }

  const appUrl = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')];
    const hit = links.find((a) => (a.textContent || '').includes('言道国学'));
    return hit ? hit.href : null;
  });
  console.log('[wait] 言道国学URL: ' + appUrl);
  if (!appUrl) { console.log('[wait] 未找到，可能页面未加载完'); process.exit(1); }

  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(10000);
  const appText = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 3500));
  console.log('[wait] ===== App主页文本 =====\n' + appText);
  await page.screenshot({ path: SHOT('10_app_home') }).catch(() => {});

  const vl = await page.evaluateHandle(() => {
    const els = [...document.querySelectorAll('a, [role="button"], td, div')];
    return els.filter((n) => (n.textContent || '').includes('v25.0.77'))[0] || null;
  });
  const vle = vl && vl.asElement();
  if (vle) {
    await vle.evaluate((n) => n.scrollIntoView({ block: 'center' })).catch(() => {});
    await sleep(500);
    await vle.evaluate((n) => n.click()).catch(() => {});
    console.log('[wait] 已点击版本 v25.0.77');
    await sleep(9000);
  }
  const verText = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 5000));
  console.log('[wait] ===== 版本页文本 =====\n' + verText);
  await page.screenshot({ path: SHOT('11_version_detail') }).catch(() => {});

  const appId = (appUrl.match(/\/apps\/(\d+)/) || [])[1];
  let ratingText = '', revText = '';
  try {
    await page.goto(`https://appstoreconnect.apple.com/apps/${appId}/appinfo/ios/ratings_reviews`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(7000);
    ratingText = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2000));
    console.log('[wait] ===== 年龄分级页 =====\n' + ratingText);
    await page.screenshot({ path: SHOT('12_rating') }).catch(() => {});
    await page.goto(`https://appstoreconnect.apple.com/apps/${appId}/appinfo/ios/reviewinfo`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(7000);
    revText = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2500));
    console.log('[wait] ===== 审核信息页 =====\n' + revText);
    await page.screenshot({ path: SHOT('13_reviewinfo') }).catch(() => {});
  } catch (e) { console.log('[wait] 附加页跳过: ' + e.message.slice(0, 60)); }

  fs.writeFileSync(path.join(__dirname, 'asc_deep_state.txt'),
    'AppURL: ' + appUrl + '\n\n===== App主页 =====\n' + appText + '\n\n===== 版本页 =====\n' + verText + '\n\n===== 年龄分级 =====\n' + ratingText + '\n\n===== 审核信息 =====\n' + revText, 'utf8');
  console.log('[wait] 已存 asc_deep_state.txt 完成');
  await browser.disconnect();
})().catch((e) => { console.error('[wait] FATAL', e.message); process.exit(1); });
