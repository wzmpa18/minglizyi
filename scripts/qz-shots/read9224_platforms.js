// 读取百度索引量+抓取频次；检查头条/360/搜狗登录态。连接9224。不关浏览器。
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9224', defaultViewport: null, protocolTimeout: 90000 });
  const page = await browser.newPage();

  // 1) 百度索引量
  console.log('=== [1] 百度索引量 ===');
  await page.goto('https://ziyuan.baidu.com/indexs?site=https%3A%2F%2Fyandaoguoxue.yandao.vip%2F', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(9000);
  let st = await page.evaluate(() => ({
    url: location.href.slice(0, 120),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 400),
  })).catch(e => ({ url: 'fail', text: e.message }));
  console.log('URL:', st.url);
  console.log('TEXT:', st.text.slice(0, 380));
  await page.screenshot({ path: 'baidu_index.png' }).catch(() => {});

  // 2) 头条站长平台登录态
  console.log('\n=== [2] 头条站长 ===');
  await page.goto('https://zhanzhang.toutiao.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(6000);
  st = await page.evaluate(() => ({
    url: location.href.slice(0, 120),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200),
  })).catch(e => ({ url: 'fail', text: e.message }));
  console.log('URL:', st.url);
  console.log('LOGGED_IN guess:', !/登录 \| 注册|立即登录/.test(st.text));
  console.log('TEXT:', st.text.slice(0, 180));

  // 3) 360站长平台
  console.log('\n=== [3] 360站长 ===');
  await page.goto('https://zhanzhang.so.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(6000);
  st = await page.evaluate(() => ({
    url: location.href.slice(0, 120),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200),
  })).catch(e => ({ url: 'fail', text: e.message }));
  console.log('URL:', st.url);
  console.log('TEXT:', st.text.slice(0, 180));

  // 4) 搜狗站长平台
  console.log('\n=== [4] 搜狗站长 ===');
  await page.goto('https://zhanzhang.sogou.com/', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(6000);
  st = await page.evaluate(() => ({
    url: location.href.slice(0, 120),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200),
  })).catch(e => ({ url: 'fail', text: e.message }));
  console.log('URL:', st.url);
  console.log('TEXT:', st.text.slice(0, 180));

  await browser.disconnect();
  console.log('\nDONE');
})();
