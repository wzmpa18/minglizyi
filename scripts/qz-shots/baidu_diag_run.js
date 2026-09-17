// 百度抓取诊断执行：填URL点抓取，读取蜘蛛视角结果。连接9224。不关浏览器。
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null, protocolTimeout: 120000 });
  const page = await browser.newPage();
  await page.goto('https://ziyuan.baidu.com/crawltools/index?site=https%3A%2F%2Fyandaoguoxue.yandao.vip%2F', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);

  // 填 URL（submit-input 类）
  const fill = await page.evaluate(() => {
    const inp = document.querySelector('input.submit-input');
    if (!inp) return { ok: false };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(inp, 'https://yandaoguoxue.yandao.vip/');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, val: inp.value };
  });
  console.log('FILL:', JSON.stringify(fill));
  await sleep(1000);

  // 点"抓取"按钮
  const click = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /^抓取$/.test((b.innerText || '').trim()));
    if (!btn) return { ok: false, why: 'no-btn' };
    btn.click();
    return { ok: true };
  });
  console.log('CLICK:', JSON.stringify(click));

  // 等待诊断结果（可能要1-2分钟）
  for (let i = 0; i < 10; i++) {
    await sleep(15000);
    const st = await page.evaluate(() => {
      const t = (document.body.innerText || '').replace(/\s+/g, ' ');
      const hasResult = /抓取成功|抓取失败|HTTP状态码|抓取异常|诊断结果/.test(t);
      const idx = t.search(/抓取成功|抓取失败|HTTP状态码|诊断结果/);
      return { hasResult, seg: idx >= 0 ? t.slice(Math.max(0, idx - 30), idx + 350) : '' };
    }).catch(() => ({ hasResult: false, seg: '' }));
    console.log(`poll ${(i + 1) * 15}s: hasResult=${st.hasResult}`);
    if (st.hasResult) {
      console.log('SEGMENT:', st.seg);
      // 检查蜘蛛视角内容里是否有 canonical（进入诊断详情可能需另一步）
      const canonical = await page.evaluate(() => {
        const frames = [...document.querySelectorAll('iframe')].map(f => f.src);
        return frames;
      }).catch(() => []);
      console.log('IFRAMES:', JSON.stringify(canonical));
      break;
    }
  }
  await page.screenshot({ path: 'baidu_diag_result.png' }).catch(() => {});
  await browser.disconnect();
  console.log('DONE');
})();
