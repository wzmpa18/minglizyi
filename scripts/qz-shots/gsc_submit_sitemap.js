// GSC提交sitemap + 读取索引状态：连接运行中的Edge(9223)，全程不关浏览器（disconnect）
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = f => path.join(__dirname, f);
const path = require('path');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const page = await browser.newPage();
  const PROP = encodeURIComponent('sc-domain:yandao.vip');

  console.log('[1] 打开 GSC sitemaps 页面...');
  await page.goto(`https://search.google.com/search-console/sitemaps?resource_id=${PROP}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);

  // 登录检查
  let st = await page.evaluate(() => {
    const t = (document.body.innerText || '').slice(0, 300).replace(/\s+/g, ' ');
    return { url: location.href, text: t };
  }).catch(() => null);
  console.log('STATE:', st ? st.url : 'eval-fail', '|', st ? st.text.slice(0, 100) : '');
  if (!st || /accounts\.google\.com|sign in|使用其他账号/i.test(st.url + ' ' + st.text)) {
    console.log('NOT_LOGGED_IN');
    await browser.disconnect();
    process.exit(2);
  }

  // 截图当前 sitemaps 列表
  await page.screenshot({ path: OUT('gsc_sm_before.png'), fullPage: false }).catch(() => {});

  // 读取现有 sitemap 条目
  const before = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('tr, [role="row"]')].map(r => r.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
    return rows.slice(0, 12);
  }).catch(() => []);
  console.log('EXISTING_SITEMAPS:\n' + before.join('\n'));

  // [2] 填入 sitemap.xml 提交
  console.log('[2] 尝试提交 sitemap.xml ...');
  const submitted = await page.evaluate(() => {
    // GSC 新版: input[name="sitemapurl"] 或 Add a new sitemap 输入框
    const inp = document.querySelector('input[type="text"], input[name="sitemapurl"], input[aria-label*="sitemap" i], input[aria-label*="站点地图" i]');
    if (!inp) return { ok: false, why: 'no-input' };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(inp, 'sitemap.xml');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    // 提交按钮
    const btns = [...document.querySelectorAll('button')];
    const submit = btns.find(b => /^(提交|submit)$/i.test((b.innerText || '').trim()) || (b.getAttribute('aria-label') || '').match(/submit|提交/i));
    if (!submit) return { ok: false, why: 'no-submit-btn', inputFound: true };
    submit.click();
    return { ok: true };
  }).catch(e => ({ ok: false, why: e.message }));
  console.log('SUBMIT_RESULT:', JSON.stringify(submitted));
  await sleep(6000);
  await page.screenshot({ path: OUT('gsc_sm_after.png'), fullPage: false }).catch(() => {});

  // 读取提交后状态
  const after = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('tr, [role="row"]')].map(r => r.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const toasts = [...document.querySelectorAll('[role="status"], [role="alert"], .snippet-toast')].map(e => e.innerText.trim()).filter(Boolean);
    return { rows: rows.slice(0, 12), toasts };
  }).catch(() => ({}));
  console.log('AFTER_ROWS:\n' + (after.rows || []).join('\n'));
  console.log('TOASTS:', JSON.stringify(after.toasts || []));

  await browser.disconnect();
  console.log('DONE_DISCONNECTED');
})();
