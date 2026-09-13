// GSC重新提交sitemap（完整URL格式）
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('search.google.com/search-console')) || pages[0];
  const PROP = encodeURIComponent('sc-domain:yandao.vip');
  await page.goto(`https://search.google.com/search-console/sitemaps?resource_id=${PROP}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);

  const done = await page.evaluate(async () => {
    const input = document.querySelector('input[type="text"], input:not([type])');
    if (!input) return '未找到输入框';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'https://yandaoguoxue.yandao.vip/sitemap.xml');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 800));
    const btn = [...document.querySelectorAll('button, [role="button"]')].find((b) => (b.textContent || '').trim() === '提交' || (b.textContent || '').trim() === 'Submit');
    if (!btn) return '未找到提交按钮';
    btn.click();
    return '已点击提交(完整URL)';
  });
  console.log('[sm2] ' + done);
  await sleep(10000);
  const t = await page.evaluate(() => (document.body.innerText || '')).catch(() => '');
  const lines = t.split('\n');
  const hits = lines.filter((l) => l.includes('yandaoguoxue.yandao.vip/sitemap.xml'));
  console.log('[sm2] yandaoguoxue行: ' + hits.join(' || '));
  // 检查是否出现成功提示
  const toast = lines.filter((l) => /已成功提交|successfully|成功提交/.test(l)).slice(0, 3);
  console.log('[sm2] 提示: ' + toast.join(' / '));
  await page.screenshot({ path: 'C:\\Users\\ZhuanZ\\Projects\\minglizyi\\scripts\\qz-shots\\gsc_06_sitemap_resubmit2.png' }).catch(() => {});
  await browser.disconnect();
})().catch((e) => { console.error('[sm2] FATAL', e.message); process.exit(1); });
