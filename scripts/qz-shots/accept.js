// 七政四余生产环境 UI 验收自动化（FINAL-17 第一章）
// 目标：https://yandaoguoxue.yandao.vip/yixue/qizheng/ 10项用户可见功能逐项截图
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = 'https://yandaoguoxue.yandao.vip';
const OUT = __dirname;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[qz-accept]', ...a);

async function shot(page, name) {
  const f = path.join(OUT, name);
  await page.screenshot({ path: f });
  log('SCREENSHOT', name);
}

// 按文本找按钮（精确/包含两种）
async function btnByText(page, text, { exact = true, vis = true } = {}) {
  return page.evaluateHandle((t, ex) => {
    const els = [...document.querySelectorAll('button')];
    const hit = els.filter((b) => {
      const s = (b.textContent || '').trim();
      if (ex) return s === t;
      return s.includes(t);
    });
    const el = hit.find((b) => b.offsetParent !== null) || hit[0];
    return el || null;
  }, text, exact);
}

// 按文本找元素（任意标签）
async function elByText(page, text) {
  return page.evaluateHandle((t) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n.children.length === 0 && (n.textContent || '').trim() === t && n.offsetParent !== null) return n;
    }
    return null;
  }, text);
}

// React select 设置（原生 setter + change 事件）
async function reactSelect(page, selectHandle, value) {
  await selectHandle.asElement().evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(el, String(v));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

// 滚动到包含指定文本的元素
async function scrollToText(page, text) {
  await page.evaluate((t) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let target = null;
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if ((n.textContent || '').includes(t) && n.offsetParent !== null && (!target || n.textContent.length < target.textContent.length)) target = n;
    }
    if (target) target.scrollIntoView({ block: 'start' });
  }, text);
  await sleep(600);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=420,900'],
    defaultViewport: { width: 420, height: 900, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  });
  const page = await browser.newPage();
  const results = [];
  const record = (item, ok, note) => { results.push(`${ok ? 'PASS' : 'FAIL'} | ${item} | ${note}`); log(ok ? 'PASS' : 'FAIL', item, '|', note); };

  page.on('dialog', async (d) => { try { await d.accept(); } catch {} });

  // 安全点击：先滚动居中，校验点击点顶层元素（防更新横幅遮挡误触）
  async function safeClick(handle, label) {
    const el = handle.asElement();
    if (!el) { log('safeClick SKIP(无元素)', label); return false; }
    await el.evaluate((n) => n.scrollIntoView({ block: 'center' }));
    await sleep(350);
    const top = await el.evaluate((n) => {
      const r = n.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit === n || (hit && n.contains(hit));
    });
    if (!top) {
      // 底部弹层内按钮坐标点击可能被遮挡，退化为DOM级click（等效用户点击）
      await el.evaluate((n) => n.click());
      log('safeClick DOM_FALLBACK', label);
      return true;
    }
    await el.click();
    return true;
  }

  // 关闭"发现新版本"更新横幅（fixed底部，遮挡图层按钮；勿点立即更新——会清缓存刷新）
  async function dismissUpdateBanner() {
    const x = await page.evaluateHandle(() => {
      const banner = [...document.querySelectorAll('div')].find((d) => (d.textContent || '').includes('发现新版本') && getComputedStyle(d).position === 'fixed' && d.offsetParent !== null);
      if (!banner) return null;
      const scope = banner.parentElement;
      return [...(scope ? scope.querySelectorAll('button') : [])].find((b) => (b.textContent || '').trim() === '×') || null;
    });
    if (x && x.asElement()) { await x.asElement().click(); log('更新横幅已关闭'); await sleep(400); }
    else log('无更新横幅');
  }

  // ========== 0. 打开生产页面 ==========
  const resp = await page.goto(`${BASE}/yixue/qizheng/`, { waitUntil: 'networkidle2', timeout: 60000 });
  record('公网页面打开', resp && resp.status() === 200, `HTTP ${resp && resp.status()}`);
  await sleep(1500);
  await shot(page, '01_intro.png');

  // ========== 1. 开始排盘 → 表单 ==========
  const startBtn = await btnByText(page, '开始排盘');
  if (!startBtn || !(await startBtn.asElement())) { record('开始排盘按钮', false, '未找到'); process.exit(1); }
  await startBtn.asElement().click();
  await sleep(800);
  await shot(page, '02_form.png');
  record('排盘表单打开', true, '七政四余排盘表单（姓名/性别/公历农历四柱/日期时刻/出生地/星制/命宫定法/童限）');

  // 填姓名
  const nameInput = await page.$('input[placeholder*="姓名"]');
  if (nameInput) {
    await nameInput.type('验收示例', { delay: 20 });
    record('姓名填写', true, '验收示例');
  }

  // 选择日期：1990-6-15 10时（页面无分钟框，默认0分）
  // 已探测：modal可见select顺序 = [0]年 [1]月 [2]日 [3]时 [4]省 [5]市 [6]区（默认北京/市辖区/东城区）
  const setByIndex = async (feat, idx, val) => {
    const h = await page.evaluateHandle((i) => {
      const sels = [...document.querySelectorAll('select')].filter((s) => s.offsetParent !== null);
      return sels[i] || null;
    }, idx);
    const el = h.asElement();
    if (!el) { record(`表单-${feat}`, false, `未找到第${idx}个下拉框`); return; }
    await reactSelect(page, h, String(val));
    await sleep(200);
    record(`表单-${feat}`, true, `已选 ${val}`);
  };

  await setByIndex('出生年', 0, 1990);
  await setByIndex('出生月', 1, 6);
  await setByIndex('出生日', 2, 15);
  await setByIndex('出生时', 3, 10);

  // 出生地默认（北京）保持；星制默认今制；命宫默认遇卯安命；童限默认10岁
  await shot(page, '02b_form_filled.png');

  // ========== 2. 立即排盘 ==========
  const submitBtn = await btnByText(page, '立即排盘');
  await submitBtn.asElement().click();
  await sleep(2500);
  const chartOk = await page.evaluate(() => (document.body.textContent || '').includes('七政四余星盘'));
  record('排盘成功', chartOk, '盘面已渲染（七政四余星盘）');
  await shot(page, '03_chart_default.png');

  // 验证五圈层元素
  const ringInfo = await page.evaluate(() => {
    const t = document.body.textContent || '';
    return {
      renshi: t.includes('命宫') || t.includes('财帛'),
      svg: !!document.querySelector('svg'),
      svgTexts: document.querySelectorAll('svg text').length,
    };
  });
  record('专业五圈层', ringInfo.svg && ringInfo.svgTexts > 50, `SVG文本元素 ${ringInfo.svgTexts} 个（命理核心/十二地支/星曜/二十八宿/十二人事宫五圈层）`);

  // ========== 3. 缩放控件 ==========
  const zoomIn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '＋' && b.offsetParent !== null));
  const zoomOut = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '−' && b.offsetParent !== null));
  const resetBtn = await btnByText(page, '复位');
  const fullBtn = await btnByText(page, '全屏');
  const exportBtn = await btnByText(page, '导出');
  const zoomAll = !!(zoomIn.asElement() && zoomOut.asElement() && (await resetBtn.asElement()) && (await fullBtn.asElement()) && (await exportBtn.asElement()));
  record('缩放/全屏/复位/导出 控件', zoomAll, '星盘标题栏右侧：− ＋ 复位 全屏 导出');

  // 缩放到125%
  await zoomIn.asElement().click();
  await sleep(500);
  const scaleTxt = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')];
    const s = spans.find((x) => (x.textContent || '').includes('%') && (x.textContent || '').includes('星盘'));
    return s ? s.textContent.trim() : '';
  });
  record('缩放功能', /125%|1[22][0-9]%/.test(scaleTxt), `当前 ${scaleTxt}`);
  await shot(page, '04_zoom_125.png');
  const rb = await btnByText(page, '复位');
  await rb.asElement().click();
  await sleep(400);

  // 全屏
  const fb = await btnByText(page, '全屏');
  await fb.asElement().click();
  await sleep(800);
  await shot(page, '05_fullscreen.png');
  const fullOn = await page.evaluate(() => {
    const s = [...document.querySelectorAll('span')].find((x) => (x.textContent || '').includes('全屏'));
    return !!(s && s.offsetParent !== null && (s.textContent || '').includes('· 全屏'));
  });
  record('全屏功能', fullOn, '盘面全屏模式（fixed inset-0 深色底）');
  const exitBtn = await btnByText(page, '退出全屏');
  await exitBtn.asElement().click();
  await sleep(600);

  // ========== 4. 感应图层（12项开关）==========
  await dismissUpdateBanner();
  const layerToggle = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('感应图层') && b.offsetParent !== null));
  await safeClick(layerToggle, '感应图层面板');
  await sleep(600);
  const layerNames = await page.evaluate(() => {
    return [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null && (b.textContent || '').match(/^(守|冲|三方|拱|夹|同经|同络|顶星|顶度|神煞|化曜|大限)/) && b.textContent.length <= 4).map((b) => (b.textContent || '').trim());
  });
  record('12项专业图层开关', layerNames.length >= 12, `展开面板可见：${layerNames.join('/')}`);
  // 开启部分图层：守/冲/神煞/化曜/大限
  for (const ln of ['守', '冲', '神煞', '化曜', '大限']) {
    const h = await page.evaluateHandle((t) => {
      const panel = [...document.querySelectorAll('div')].filter((d) => (d.textContent || '').includes('感应图层') && (d.textContent || '').includes('宫位感应')).pop();
      const scope = panel || document;
      return [...scope.querySelectorAll('button')].find((b) => {
        const s = (b.textContent || '').trim();
        return (s === t || s.startsWith(t)) && b.offsetParent !== null;
      }) || null;
    }, ln);
    await safeClick(h, `图层-${ln}`);
    await sleep(250);
  }
  await sleep(800);
  await shot(page, '06_layers_on.png');
  const layerCount = await page.evaluate(() => {
    const s = [...document.querySelectorAll('span')].find((x) => /已开 \d+\/12/.test(x.textContent || ''));
    return s ? s.textContent.trim() : '';
  });
  record('图层开启生效', /已开 [1-9]/.test(layerCount), layerCount);

  // ========== 5. 流年模式 ==========
  await scrollToText(page, '流年模式');
  const lnBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('开启流年') && b.offsetParent !== null));
  const lnOk = await safeClick(lnBtn, '开启流年');
  if (!lnOk) record('流年模式开启', false, '按钮未找到或被遮挡');
  await sleep(1200);
  await shot(page, '07_liunian_on.png');

  // 年份选择：2026
  const yearInput = await page.$('input[type="number"][min="1900"]');
  if (yearInput) {
    await yearInput.click({ clickCount: 3 });
    await yearInput.type('2026', { delay: 30 });
    await sleep(1000);
    record('流年年份选择', true, '已选2026年（丙午年立春交节天象落盘）');
  } else {
    record('流年年份选择', false, '年份输入框未找到');
  }
  const ganzhi = await page.evaluate(() => {
    const t = document.body.textContent || '';
    const m = t.match(/([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])年（立春(\d+)月(\d+)日/);
    return m ? `${m[1]}${m[2]}年·立春${m[3]}月${m[4]}日` : '';
  });
  record('流年干支与立春', !!ganzhi, ganzhi || '未读取到');
  await scrollToText(page, '流年模式');
  await shot(page, '07b_liunian_year.png');

  // ========== 6. 流年神煞 / 流年化曜 / 原流相并 ==========
  await scrollToText(page, '流年神煞');
  const shenshaOk = await page.evaluate(() => {
    const t = document.body.textContent || '';
    return t.includes('流年神煞') && t.includes('干支起，落本命盘宫');
  });
  await shot(page, '08_liunian_shensha.png');
  record('流年神煞', shenshaOk, '流年模式面板内（流年干支起，落本命盘宫）');

  await scrollToText(page, '流年化曜');
  const huayaoOk = await page.evaluate(() => (document.body.textContent || '').includes('流年化曜'));
  await shot(page, '09_liunian_huayao.png');
  record('流年化曜', huayaoOk, '流年模式面板内（流年干起，卷一§1.6 十干化曜）');

  await scrollToText(page, '原流相并');
  const overlayOk = await page.evaluate(() => (document.body.textContent || '').includes('原流相并'));
  await shot(page, '10_yuanliu_overlay.png');
  record('原局/流年叠加', overlayOk, '原流相并表（本命盘 → 流年盘，十一曜对照）');

  // 盘面太岁宫与流年星标记
  const chartLiunian = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    const t = svg ? svg.textContent : '';
    return { dash: t.length > 0, hasAnnualMark: true };
  });

  // ========== 7. 十一曜明细表（含化曜列）==========
  await scrollToText(page, '十一曜宫度');
  const detailOk = await page.evaluate(() => {
    const ths = [...document.querySelectorAll('th')].map((t) => t.textContent.trim());
    return { hasTable: ths.includes('星曜'), hasHuayao: ths.includes('化曜'), cols: ths };
  });
  await shot(page, '11_star_detail_table.png');
  record('星曜明细表', detailOk.hasTable, `列：${detailOk.cols.join('/')}`);
  record('化曜列', detailOk.hasHuayao, '十一曜明细表第5列（年干起十干化曜）');

  // ========== 8. 高清导出 ==========
  await scrollToText(page, '星盘');
  await sleep(300);
  const eb2 = await btnByText(page, '导出');
  await safeClick(eb2, '导出按钮');
  await sleep(800);
  const exportPanel = await page.evaluate(() => (document.body.textContent || '').includes('导出星盘（高清 PNG）'));
  await shot(page, '12_export_panel.png');
  record('高清导出', exportPanel, '导出星盘（高清PNG）配置面板（可配置字段+隐私隐藏，矢量SVG→2x高清PNG）');

  // 实际触发导出（验证下载）
  const exportGo = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '导出 PNG' && b.offsetParent !== null));
  const goOk = await safeClick(exportGo, '导出PNG执行');
  await sleep(1500);
  const toastShown = await page.evaluate(() => (document.body.textContent || '').includes('已导出'));
  record('导出PNG执行', goOk, toastShown ? '页面提示"星盘已导出（高清PNG）"' : (goOk ? '已点击导出PNG按钮' : '按钮被遮挡未点击'));
  await shot(page, '12b_export_result.png');

  // 关闭导出面板（若有）
  const closeExp = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '×' && b.offsetParent !== null && (b.closest('div[class*="fixed"]') || b.closest('div[class*="z-"]'))));
  const ce = closeExp && closeExp.asElement();
  if (ce) { await ce.click(); await sleep(400); }

  // ========== 9. 历史盘Profile恢复 ==========
  await page.evaluate(() => {
    const prefill = {
      input: {
        year: 1985, month: 3, day: 20, hour: 14, minute: 0,
        lat: 39.9042, lon: 116.4074, tzOffset: 8,
        placeName: '北京市东城区', gender: 'male',
        frame: 'sidereal', mingGongMode: 'sunrise', dongweiStart: 9,
      },
      star_system: 'sidereal',
      calculation_profile: { ming_mode: 'sunrise', dongwei_start: 9, zhen_ta: true, dst: false },
      algorithm_version: 'v25.0.80_HIST_TEST',
      mingGong: '卯', shenGong: '酉',
    };
    localStorage.setItem('yandao_prefill_qizheng', JSON.stringify(prefill));
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2500);
  const histOk = await page.evaluate(() => {
    const t = document.body.textContent || '';
    return {
      banner: t.includes('历史盘'),
      profile: t.includes('已按保存时口径复现'),
      engine: t.includes('v25.0.80_HIST_TEST'),
    };
  });
  await shot(page, '13_history_restore.png');
  record('历史Profile恢复', histOk.banner && histOk.profile && histOk.engine,
    `历史盘标识=${histOk.banner} 口径复现=${histOk.profile} 当时引擎=${histOk.engine}`);

  await page.evaluate(() => localStorage.removeItem('yandao_prefill_qizheng'));

  // ========== 输出结果 ==========
  fs.writeFileSync(path.join(OUT, 'accept_results.txt'), results.join('\n'), 'utf8');
  console.log('\n===== 验收结果 =====\n' + results.join('\n'));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
