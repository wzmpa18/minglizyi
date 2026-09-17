// 百度sitemap tab提交：连接9224已登录Edge。点击sitemap tab -> 填URL -> 提交。不关浏览器。
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null, protocolTimeout: 90000 });
  const page = await browser.newPage();
  await page.goto('https://ziyuan.baidu.com/linksubmit/index?site=https%3A%2F%2Fyandaoguoxue.yandao.vip%2F&tab=sitemap', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);

  // 点击 sitemap tab
  const clicked = await page.evaluate(() => {
    const els = [...document.querySelectorAll('a, span, div, li')].filter(e => /^sitemap$/i.test((e.innerText || '').trim()));
    if (!els.length) return { ok: false, why: 'no-tab' };
    els[0].click();
    return { ok: true };
  });
  console.log('TAB_CLICK:', JSON.stringify(clicked));
  await sleep(6000);
  await page.screenshot({ path: 'baidu_sm_tab.png' }).catch(() => {});

  // 找 sitemap 输入框并填入
  const filled = await page.evaluate(() => {
    // sitemap 输入通常是 text input，placeholder 含 sitemap 或文件地址
    const inputs = [...document.querySelectorAll('input[type="text"]')];
    const inp = inputs.find(i => /sitemap|地图|文件/i.test(i.placeholder || '') || /sitemap/i.test(i.className || ''));
    if (!inp) return { ok: false, why: 'no-input', phs: inputs.map(i => i.placeholder).slice(0, 8) };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(inp, 'https://yandaoguoxue.yandao.vip/sitemap.xml');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, ph: inp.placeholder };
  });
  console.log('FILL:', JSON.stringify(filled));
  await sleep(1500);
  await page.screenshot({ path: 'baidu_sm_filled.png' }).catch(() => {});

  if (!filled.ok) { await browser.disconnect(); process.exit(3); }

  // 点提交按钮
  const submit = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /^提交$/.test((b.innerText || '').trim()));
    if (!btns.length) return { ok: false, why: 'no-btn' };
    btns[btns.length - 1].click();
    return { ok: true };
  });
  console.log('SUBMIT:', JSON.stringify(submit));
  await sleep(8000);
  await page.screenshot({ path: 'baidu_sm_result.png' }).catch(() => {});

  // 读取结果反馈（弹窗/toast/表格）
  const result = await page.evaluate(() => {
    const dlg = [...document.querySelectorAll('.m-dialog, [class*="dialog"], [class*="modal"], [class*="toast"], [class*="tips"]')].map(e => (e.innerText || '').trim()).filter(t => t && t.length < 300);
    const rows = [...document.querySelectorAll('tr')].map(r => (r.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8);
    return { dlg: dlg.slice(0, 5), rows };
  }).catch(e => ({ err: e.message }));
  console.log('RESULT_DIALOG:', JSON.stringify(result.dlg || result.err, null, 1));
  console.log('ROWS:', JSON.stringify(result.rows, null, 1));

  await browser.disconnect();
  console.log('DONE');
})();
