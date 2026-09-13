// GSC重新提交yandaoguoxue sitemap（触发107URL重读）
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('search.google.com/search-console')) || pages[0];
  const PROP = encodeURIComponent('sc-domain:yandao.vip');
  await page.goto(`https://search.google.com/search-console/sitemaps?resource_id=${PROP}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(8000);

  // 在"输入站点地图网址"框填入新sitemap并提交
  const done = await page.evaluate(async () => {
    const input = document.querySelector('input[type="text"], input:not([type])');
    if (!input) return '未找到输入框';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'yandaoguoxue.yandao.vip/sitemap.xml');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 600));
    // 找提交按钮
    const btn = [...document.querySelectorAll('button, [role="button"]')].find((b) => (b.textContent || '').trim() === '提交' || (b.textContent || '').trim() === 'Submit');
    if (!btn) return '未找到提交按钮';
    btn.click();
    return '已点击提交';
  });
  console.log('[sm] ' + done);
  await sleep(8000);
  const t = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')).catch(() => '');
  // 找yandaoguoxue行
  const lines = t.split('\n');
  const idx = lines.findIndex((l) => l.includes('yandaoguoxue.yandao.vip/sitemap.xml'));
  console.log('[sm] sitemap行上下文: ' + (idx >= 0 ? lines.slice(Math.max(0, idx - 2), idx + 4).join(' | ') : '未找到'));
  await page.screenshot({ path: 'C:\\Users\\ZhuanZ\\Projects\\minglizyi\\scripts\\qz-shots\\gsc_05_sitemap_resubmit.png' }).catch(() => {});
  await browser.disconnect();
})().catch((e) => { console.error('[sm] FATAL', e.message); process.exit(1); });
