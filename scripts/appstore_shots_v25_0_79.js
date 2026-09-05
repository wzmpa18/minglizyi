const { chromium } = require('playwright');

const BASE = 'https://yandaoguoxue.yandao.vip';
const OUT = 'C:/Users/ZhuanZ/Projects/minglizyi/appstore-screenshots';
const SENSITIVE = /算命|吉凶|祸福|财运|姻缘|运势|预测|化解|改运|断事|占卜|择吉避凶|旺衰/;

const PAGES = [
  { name: '01_home', url: '/' },
  { name: '02_exam', url: '/zhongyi/exam' },
  { name: '03_books', url: '/zhongyi/classic' },
  { name: '04_compass', url: '/yixue/compass' },
];

(async () => {
  const fs = require('fs');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    locale: 'zh-CN',
    permissions: [],
  });
  const page = await ctx.newPage();

  for (const p of PAGES) {
    try {
      await page.goto(BASE + p.url, { waitUntil: 'networkidle', timeout: 45000 });
    } catch (e) {
      await page.goto(BASE + p.url, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
    }
    await page.waitForTimeout(3500);
    const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, '');
    const hits = text.match(new RegExp(SENSITIVE.source, 'g'));
    console.log(`=== ${p.name} ${p.url} ===`);
    console.log(`textLen=${text.length} sensitiveHits=${hits ? JSON.stringify(hits) : 'NONE'}`);
    console.log(`head300: ${text.slice(0, 300)}`);
    await page.screenshot({ path: `${OUT}/${p.name}_probe.png` });
  }
  await browser.close();
})();
