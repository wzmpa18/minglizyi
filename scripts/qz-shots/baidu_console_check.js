// 百度搜索资源平台核查：连接运行中的Edge（9223），等Owner登录后读取数据
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const SHOT = (n) => path.join(__dirname, `baidu_${n}.png`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const page = await browser.newPage();
  console.log('[baidu] 打开百度搜索资源平台 ...');
  await page.goto('https://ziyuan.baidu.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(8000);

  // 检查登录状态
  let ok = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 20 * 60 * 1000) {
    const st = await page.evaluate(() => {
      const t = document.body.innerText || '';
      return { url: location.href, len: t.length, head: t.replace(/\s+/g, ' ').slice(0, 70), hasLogin: t.includes('登录') && t.length < 200 };
    }).catch(() => null);
    if (!st) { await sleep(8000); continue; }
    if (st.len > 250 && (st.head.includes('搜索资源平台') || st.head.includes('数据'))) { ok = true; break; }
    const min = Math.round((Date.now() - t0) / 60000);
    if (Math.floor((Date.now() - t0) / 10000) % 6 === 0) console.log(`[baidu] ${min}分钟 | ${st.url.slice(0, 55)} | ${st.len}字 | ${st.head.slice(0, 45)}`);
    await sleep(10000);
  }
  if (!ok) console.log('[baidu] 等待登录超时，尽力读取当前页');
  await sleep(3000);

  const out = {};
  // 抓取诊断/索引量
  const pages = [
    ['index', 'https://ziyuan.baidu.com/site/index'],
    ['crawl', 'https://ziyuan.baidu.com/pressure/index'],
    ['kw', 'https://ziyuan.baidu.com/keyword/index'],
  ];
  for (const [k, u] of pages) {
    await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(8000);
    out[k] = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 2000)).catch(() => '');
    console.log(`[baidu] ===== ${k} =====\n` + out[k]);
    await page.screenshot({ path: SHOT(`0${pages.findIndex(p => p[0] === k) + 1}_${k}`) }).catch(() => {});
  }
  fs.writeFileSync(path.join(__dirname, 'baidu_console_state.txt'), JSON.stringify(out, null, 2), 'utf8');
  console.log('[baidu] 已存 baidu_console_state.txt');
  await browser.disconnect();
})().catch((e) => { console.error('[baidu] FATAL', e.message); process.exit(1); });
