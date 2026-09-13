// 搜索引擎真实收录核查（无头Edge真实浏览器执行，绕过curl风控）
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const HOST = 'yandaoguoxue.yandao.vip';
const OUT = path.join(__dirname, 'index_check_result.txt');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const log = (s) => { results.push(s); console.log(s); };

async function baiduQuery(page, query) {
  const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=20&ie=utf-8`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2500);
  const info = await page.evaluate(() => {
    const t = document.body.innerText || '';
    const captcha = t.includes('安全验证') || t.includes('网络不给力') || location.href.includes('wappass') || t.includes('人机身份');
    const m = t.match(/找到相关结果数约?([\d,，]+)个/);
    const none = t.includes('很抱歉，没有找到');
    const results = [...document.querySelectorAll('h3 a')].map((a) => a.href).filter((h) => h.includes('yandao') || h.includes('baidu.com/link')).length;
    return { captcha, count: m ? m[1] : '', none, results, title: document.title };
  });
  return info;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 },
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });

  log('===== 百度收录核查（真实浏览器） ' + new Date().toLocaleString('zh-CN') + ' =====');

  // 1. 整站
  let info = await baiduQuery(page, `site:${HOST}`);
  if (info.captcha) { log('百度整站: 触发验证码，需Owner手动'); await page.screenshot({ path: path.join(__dirname, 'baidu_captcha.png') }); }
  else log(`百度整站: 收录数=${info.count || (info.none ? '0(未收录任何页)' : '未解析')} 页内结果=${info.results}`);

  await sleep(4000);

  // 2. 重点路径逐条
  const paths = [
    ['七政排盘页', `site:${HOST}/yixue/qizheng`],
    ['七政学习专区', `site:${HOST}/qizheng-study`],
    ['中医自学集群', `site:${HOST}/zixue`],
    ['医考题库集群', `site:${HOST}/yikao`],
    ['中医题库落地页', `site:${HOST}/learn/mianfei-zhongyi-tiku`],
    ['罗盘工具', `site:${HOST}/tools/luopan`],
    ['立极尺', `site:${HOST}/tools/liji-ruler`],
    ['鲁班尺', `site:${HOST}/tools/luban-ruler`],
  ];
  for (const [name, q] of paths) {
    const r = await baiduQuery(page, q);
    if (r.captcha) { log(`${name}: 触发验证码（后续查询跳过）`); break; }
    const n = r.count || (r.none ? '0' : '未解析');
    log(`${name}: 收录=${n} 页内结果=${r.results}`);
    await sleep(4000);
  }

  // 3. 关键词排名抽查（百度）
  const keywords = ['七政四余排盘', '中医自学入门', '中医免费题库', '免费医考题库'];
  for (const kw of keywords) {
    const r = await baiduQuery(page, kw);
    if (r.captcha) { log(`关键词[${kw}]: 触发验证码`); break; }
    const hasSite = await page.evaluate((h) => (document.body.innerText || '').includes(h), HOST);
    log(`关键词[${kw}]: 前20页结果${hasSite ? '含本站（有排名）' : '不含本站'}`);
    await sleep(5000);
  }

  // 4. 搜狗
  await sleep(3000);
  try {
    await page.goto(`https://www.sogou.com/web?query=${encodeURIComponent('site:' + HOST)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2500);
    const sg = await page.evaluate((h) => {
      const t = document.body.innerText || '';
      const captcha = t.includes('验证码') || location.href.includes('antispider');
      const m = t.match(/约?([\d,，]+)?(条结果|条相关)/);
      return { captcha, count: m ? m[0] : (t.includes('未收录') ? '0' : '未解析'), hasSite: t.includes(h) };
    }, HOST);
    log(`搜狗整站: ${sg.captcha ? '触发反爬' : `收录=${sg.count} 含本站=${sg.hasSite}`}`);
  } catch (e) { log('搜狗: 请求异常 ' + e.message); }

  // 5. 360
  await sleep(3000);
  try {
    await page.goto(`https://www.so.com/s?q=${encodeURIComponent('site:' + HOST)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2500);
    const so = await page.evaluate((h) => {
      const t = document.body.innerText || '';
      const captcha = t.includes('验证码') || t.includes('请输入');
      const m = t.match(/共约?([\d,，]+)条?/);
      return { captcha, count: m ? m[1] : '未解析', hasSite: t.includes(h), none: t.includes('没有找到') };
    }, HOST);
    log(`360整站: ${so.captcha ? '触发验证码' : `收录=${so.count}${so.none ? '(0)' : ''} 含本站=${so.hasSite}`}`);
  } catch (e) { log('360: 请求异常 ' + e.message); }

  fs.writeFileSync(OUT, results.join('\n'), 'utf8');
  await browser.close();
  console.log('\n结果已存 ' + OUT);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
