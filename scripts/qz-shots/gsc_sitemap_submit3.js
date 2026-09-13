// GSC重新提交sitemap v3：精确定位"添加新的站点地图"卡片内的输入框
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('search.google.com/search-console')) || pages[0];
  const PROP = encodeURIComponent('sc-domain:yandao.vip');
  await page.goto(`https://search.google.com/search-console/sitemaps?resource_id=${PROP}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);

  const result = await page.evaluate(async () => {
    // 找到含"添加新的站点地图"的容器，然后在其中找input和提交按钮
    const allH = [...document.querySelectorAll('h1,h2,h3,div,span')].filter((n) => (n.textContent || '').trim() === '添加新的站点地图');
    let container = null;
    for (const h of allH) {
      let p = h;
      for (let i = 0; i < 6 && p; i++) {
        if (p.querySelector && p.querySelector('input') && [...p.querySelectorAll('button,[role="button"]')].some((b) => (b.textContent || '').trim() === '提交')) { container = p; break; }
        p = p.parentElement;
      }
      if (container) break;
    }
    if (!container) return '未找到添加容器';
    const input = container.querySelector('input');
    if (!input) return '容器内无input';
    // 用原生setter设值
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'https://yandaoguoxue.yandao.vip/sitemap.xml');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 1000));
    const btn = [...container.querySelectorAll('button,[role="button"]')].find((b) => (b.textContent || '').trim() === '提交');
    if (!btn) return '容器内无提交按钮';
    const disabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
    if (disabled) return '提交按钮仍禁用';
    btn.click();
    return '已点击提交';
  });
  console.log('[sm3] ' + result);
  await sleep(12000);
  const t = await page.evaluate(() => (document.body.innerText || '')).catch(() => '');
  const lines = t.split('\n');
  const hits = lines.filter((l) => l.includes('yandaoguoxue.yandao.vip/sitemap.xml'));
  console.log('[sm3] yandaoguoxue行: ' + hits.join(' || '));
  await page.screenshot({ path: 'C:\\Users\\ZhuanZ\\Projects\\minglizyi\\scripts\\qz-shots\\gsc_07_sitemap_v3.png' }).catch(() => {});
  await browser.disconnect();
})().catch((e) => { console.error('[sm3] FATAL', e.message); process.exit(1); });
