// Apple ASC 真实审核状态核查 v2（文本状态监控，不依赖视觉识别）
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PROFILE = 'C:\\Users\\ZhuanZ\\Projects\\minglizyi\\.edge-asc-profile';
const SHOT = (n) => path.join(__dirname, `asc_${n}.png`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: false,
    userDataDir: PROFILE,
    args: ['--no-sandbox', '--window-size=1400,950', '--disable-blink-features=AutomationControlled', '--lang=zh-CN', '--start-maximized'],
    defaultViewport: null,
  });
  const page = (await browser.pages())[0] || (await browser.newPage());
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0');

  console.log('[asc] 打开 App Store Connect ...');
  let loaded = false;
  for (let i = 0; i < 3 && !loaded; i++) {
    await page.goto('https://appstoreconnect.apple.com/apps', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((e) => console.log('[asc] goto重试:', e.message.slice(0, 80)));
    await sleep(8000);
    const st = await page.evaluate(() => ({
      url: location.href,
      len: (document.body.innerText || '').length,
      head: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 120),
    })).catch(() => null);
    if (st) console.log(`[asc] 页面状态: url=${st.url.slice(0, 60)} 文本长度=${st.len} 开头="${st.head}"`);
    if (st && st.len > 50) loaded = true;
  }
  if (!loaded) console.log('[asc] 警告: 页面文本仍很少，可能是加载慢，继续等待');

  // 等待Owner登录：最多40分钟，每15秒用文本检测
  let phase = 'login';
  const t0 = Date.now();
  while (Date.now() - t0 < 40 * 60 * 1000) {
    await sleep(15000);
    const st = await page.evaluate(() => {
      const t = document.body.innerText || '';
      return {
        url: location.href,
        len: t.length,
        hasApple: t.includes('Apple') || t.includes('苹果'),
        hasSignin: t.includes('登录') || t.includes('Sign in') || t.includes('电子邮') || t.includes('密码'),
        hasApps: t.includes('言道国学') || t.includes('我的 App') || t.includes('App Store Connect'),
        head: t.replace(/\s+/g, ' ').slice(0, 100),
      };
    }).catch(() => null);
    if (!st) continue;

    if ((st.url.includes('apps') || st.head.includes('所有状态') || st.head.includes('言道国学')) && !st.url.includes('signin') && st.len > 100) {
      phase = 'apps';
      console.log(`[asc] ✅ 登录成功！App列表已可见 url=${st.url}`);
      break;
    }
    const min = Math.round((Date.now() - t0) / 60000);
    // 每分钟报一次状态（文本）
    if (Math.floor((Date.now() - t0) / 15000) % 4 === 0) {
      console.log(`[asc] ${min}分钟 | 等待Owner登录 | 文本${st.len}字 | 页面开头: ${st.head.slice(0, 60)}`);
    }
    if (st.len < 20 && min > 2) {
      // 页面空白，重载一次
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      console.log(`[asc] ${min}分钟 | 页面空白，已重新加载`);
    }
  }
  if (phase !== 'apps') {
    await page.screenshot({ path: SHOT('timeout') }).catch(() => {});
    console.log('[asc] 40分钟未完成登录，超时退出。');
    await browser.close();
    process.exit(2);
  }
  await page.screenshot({ path: SHOT('01_apps_list') }).catch(() => {});
  console.log('[asc] 进入言道国学 ...');

  // 进入言道国学
  const appLink = await page.evaluateHandle(() => {
    const els = [...document.querySelectorAll('a, [role="button"], div, td')];
    return els.find((n) => (n.textContent || '').includes('言道国学')) || null;
  });
  const al = appLink && appLink.asElement();
  if (al) {
    await al.evaluate((n) => n.scrollIntoView({ block: 'center' }));
    await sleep(400);
    await al.evaluate((n) => n.click());
    console.log('[asc] 点击言道国学');
  } else {
    const first = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('a')].filter((a) => /\/apps\/\d+/.test(a.href));
      return rows[0] ? rows[0].href : null;
    });
    if (first) { await page.goto(first, { waitUntil: 'domcontentloaded' }); console.log('[asc] 兜底进入第一个App:', first); }
  }
  await sleep(8000);
  await page.screenshot({ path: SHOT('02_app_page') }).catch(() => {});

  // 读取App页核心信息
  let info = await page.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      url: location.href,
      snippet: t.replace(/\n{2,}/g, '\n').slice(0, 2500),
    };
  }).catch(() => ({}));
  console.log('[asc] App页文本:\n' + info.snippet);

  // 进入 App Store 标签
  const verBtn = await page.evaluateHandle(() => {
    const els = [...document.querySelectorAll('a, button, [role="tab"]')];
    return els.find((n) => (n.textContent || '').trim().match(/^(版本|App Store)$/) && n.offsetParent !== null) || null;
  });
  const vb = verBtn && verBtn.asElement();
  if (vb) { await vb.evaluate((n) => n.click()).catch(() => {}); await sleep(5000); }
  await page.screenshot({ path: SHOT('03_version_page') }).catch(() => {});

  info = await page.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      url: location.href,
      status: (t.match(/(等待审核|正在审核|已准备好提交|被拒绝|已拒绝|Ready for Sale|元数据被拒|二进制文件被拒)/g) || []).join(','),
      versionBuild: (t.match(/版本号?\s*[:：]?\s*([0-9.]+)[\s\S]{0,60}?构建[版本号]?\s*[:：]?\s*([0-9]+)/) || []).slice(1, 3).join(' / '),
      submittedAt: (t.match(/(提交于|已提交)\s*[：:]?\s*([0-9]{4}[\/.-][0-9]{1,2}[\/.-][0-9]{1,2}[^,\n]{0,10})/) || [])[0] || '',
      statusLines: t.split('\n').filter((l) => /等待审核|正在审核|被拒绝|Ready|提交|拒绝/.test(l)).slice(0, 10),
      fullText: t.replace(/\n{2,}/g, '\n').slice(0, 4000),
    };
  }).catch(() => ({}));
  console.log('[asc] 版本页状态:', JSON.stringify(info.statusLines));
  console.log('[asc] 版本页文本:\n' + info.fullText);

  fs.writeFileSync(path.join(__dirname, 'asc_state.txt'), JSON.stringify(info, null, 2) + '\n\nURL: ' + page.url(), 'utf8');
  console.log('[asc] 状态已存 asc_state.txt。浏览器保持打开60秒...');
  await sleep(60000);
  await browser.close();
})().catch((e) => { console.error('[asc] FATAL', e.message); process.exit(1); });
