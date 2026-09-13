// 把百度平台标签页带到最前
const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('ziyuan.baidu.com'));
  if (page) {
    await page.bringToFront();
    console.log('[front] 百度标签页已置前: ' + page.url().slice(0, 50));
  } else {
    console.log('[front] 未找到百度标签页，现有页面:');
    for (const p of pages) console.log('  ' + p.url().slice(0, 60));
  }
  await browser.disconnect();
})();
