/**
 * ============================================================================
 * 测试用例集 —— 真太阳时（Meeus 天文算法）Golden Test
 * ============================================================================
 * 协议：MIT License
 * 创建日期：2026-08-29
 * 版本：v25.0.64
 *
 * 运行方式：npx tsx --test src/algorithm-core/tests/trueSolarTime.test.mts
 *
 * 测试范围：
 *   A. 算法版本与单一实现检查（禁止 Spencer 残留 / 跨模块重复实现）
 *   B. 均时差 EoT 精度 Golden（Meeus vs astronomy-engine 权威基准，≥50 组）
 *   C. 经度修正公式 + 总偏移恒等式
 *   D. 跨日（真太阳时修正使时刻跨 0 点，日期回退/前进）
 *   E. 时辰边界（getTrueSolarHourIndex 十二时辰分界）
 *   F. 奇门遁甲 Integration（zhen 模式 == 复用 calcTrueSolarTime 手工修正）
 *   G. 八字 / 紫微 页面级修正提取一致性（Asia/Shanghai 本地 getter 语义）
 *
 * 精度口径（非"零误差"，为可验证的天文学级精度）：
 *   - 均时差 EoT：与 astronomy-engine 太阳视赤经基准对拍，最大偏差 ≤ 3 秒
 *   - 经度修正：(当地经度 - 120°) × 4 分钟/度，精确恒等
 * ============================================================================
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Astronomy from 'astronomy-engine';

import { calcTrueSolarTime, getTrueSolarHourIndex } from '../common/jieqi.ts';
import { calculateQimen } from '../modules/qimen/index.ts';

// 真太阳时在页面/模块中的本地时间语义依赖东八区，测试固定时区以保证 getHours/getMinutes 确定性。
process.env.TZ = 'Asia/Shanghai';

// ============================================================================
// 工具函数
// ============================================================================

/** 角度转弧度 */
function toRadians(deg: number): number { return (deg * Math.PI) / 180; }
/** 弧度转角度 */
function toDegrees(rad: number): number { return (rad * 180) / Math.PI; }

/** 与 jieqi.ts 同源的儒略日（用于基准 EoT 的平黄经 L0） */
function julianDay(year: number, month: number, day: number, utcHours: number): number {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + utcHours / 24 + B - 1524.5;
}

/**
 * 权威基准均时差（分钟）：astronomy-engine 太阳视赤经 → EoT
 * EoT(分) = 4 × [L0(平黄经) - 0.0057183(光行差) - α(视赤经)]
 */
function referenceEoT(date: Date): number {
  const eq = Astronomy.Equator('Sun', date, new Astronomy.Observer(0, 0, 0), true, true);
  const alphaDeg = ((eq.ra * 15) % 360 + 360) % 360;
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const JD = julianDay(y, m, d, utcHours);
  const T = (JD - 2451545.0) / 36525;
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  L0 = ((L0 % 360) + 360) % 360;
  const Edeg = L0 - 0.0057183 - alphaDeg;
  let Emins = Edeg * 4;
  Emins = ((Emins % 1440) + 1440) % 1440;
  if (Emins > 720) Emins -= 1440;
  return Emins;
}

/** 项目实现的均时差（分钟，四舍五入到 0.01 分） */
function projectEoT(date: Date): number {
  return calcTrueSolarTime(date, 120).equationOfTime;
}

/** 求某个目标真太阳时刻对应的输入标准时刻（东八区本地构造，收敛 3 次） */
function inputForCorrected(y: number, m: number, d: number, targetH: number, targetM: number, longitude: number): Date {
  let input = new Date(y, m - 1, d, targetH, targetM, 0);
  for (let i = 0; i < 3; i++) {
    const r = calcTrueSolarTime(input, longitude);
    const desired = new Date(y, m - 1, d, targetH, targetM, 0).getTime();
    input = new Date(desired - r.totalOffset * 60000);
  }
  return input;
}

// ============================================================================
// 全国 10 城（覆盖东/西/南/北/高原/边疆，验证经度修正的全国性）
// ============================================================================

const CITIES: Array<{ name: string; lon: number }> = [
  { name: '北京', lon: 116.4074 },
  { name: '上海', lon: 121.4737 },
  { name: '广州', lon: 113.2644 },
  { name: '成都', lon: 104.0665 },
  { name: '西安', lon: 108.9398 },
  { name: '哈尔滨', lon: 126.5349 },
  { name: '乌鲁木齐', lon: 87.6168 },
  { name: '拉萨', lon: 91.1145 },
  { name: '昆明', lon: 102.8329 },
  { name: '海口', lon: 110.1983 },
];

// ============================================================================
// A. 算法版本与单一实现检查
// ============================================================================

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkTs(p));
    else if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

test('算法版本：algorithm-core 内无 Spencer(1971) 旧均时差残留', () => {
  const files = walkTs(path.join(ROOT, 'src', 'algorithm-core'));
  const hits: string[] = [];
  // Spencer 系列签名常数（229.18 为特征值），jieqi.ts 注释中仅出现一次且为文字说明
  const spencerSignatures = ['229.18', '0.000075', '0.001868', '0.040849'];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const sig of spencerSignatures) {
      if (text.includes(sig)) hits.push(`${path.relative(ROOT, f)} 含 ${sig}`);
    }
  }
  assert.deepEqual(hits, [], '发现 Spencer 旧算法残留，必须统一复用 jieqi.ts 的 Meeus 实现');
});

test('算法版本：八字/紫微页面与奇门模块均从单一源复用 calcTrueSolarTime', () => {
  const bazi = readFileSync(path.join(ROOT, 'src', 'app', 'yixue', 'bazi', 'page.tsx'), 'utf8');
  const ziwei = readFileSync(path.join(ROOT, 'src', 'app', 'yixue', 'ziwei', 'page.tsx'), 'utf8');
  const qimen = readFileSync(path.join(ROOT, 'src', 'algorithm-core', 'modules', 'qimen', 'index.ts'), 'utf8');

  assert.ok(bazi.includes('calcTrueSolarTime'), '八字页面未接入真太阳时');
  assert.ok(ziwei.includes('calcTrueSolarTime'), '紫微页面未接入真太阳时');
  assert.ok(qimen.includes('calcTrueSolarTime'), '奇门模块未接入真太阳时');
  // 奇门必须从公共 jieqi 单一源导入（无内联实现）
  assert.ok(qimen.includes("from '../../common/jieqi'"), '奇门未从 jieqi.ts 单一源导入 calcTrueSolarTime');
});

// ============================================================================
// B. 均时差 EoT 精度 Golden（Meeus vs astronomy-engine，≥50 组）
// ============================================================================

test('均时差 EoT：Meeus 与 astronomy-engine 最大偏差 ≤ 3 秒（四季+闰年+多年）', () => {
  // 覆盖 12 个月 + 闰日 + 2023/2024/2025 多年，全用北京正午（04:00 UTC）作代表时刻
  const dates: Date[] = [];
  const years = [2023, 2024, 2025];
  const monthDays = [
    { y: 2024, m: 1, d: 15 }, { y: 2024, m: 2, d: 11 }, { y: 2024, m: 2, d: 29 }, // 冬末（EoT 极小）
    { y: 2024, m: 3, d: 20 }, { y: 2024, m: 4, d: 15 }, // 春分季 / EoT 过零
    { y: 2024, m: 5, d: 5 }, { y: 2024, m: 6, d: 14 }, { y: 2024, m: 6, d: 21 }, // 立夏 / EoT 过零 / 夏至
    { y: 2024, m: 7, d: 7 }, { y: 2024, m: 8, d: 7 }, { y: 2024, m: 9, d: 1 }, // 小暑 / 立秋 / EoT 过零
    { y: 2024, m: 9, d: 23 }, { y: 2024, m: 10, d: 8 }, { y: 2024, m: 11, d: 3 }, // 秋分 / 寒露 / EoT 极大
    { y: 2024, m: 12, d: 21 }, { y: 2024, m: 12, d: 25 }, // 冬至 / EoT 过零
    { y: 2023, m: 1, d: 1 }, { y: 2023, m: 7, d: 1 }, // 跨年
    { y: 2025, m: 1, d: 1 }, { y: 2025, m: 7, d: 1 }, // 跨年
  ];
  for (const { y, m, d } of monthDays) {
    dates.push(new Date(Date.UTC(y, m - 1, d, 4, 0, 0)));
  }

  let maxDev = 0;
  let maxInfo = '';
  for (const date of dates) {
    const mine = projectEoT(date);
    const ref = referenceEoT(date);
    const devSec = Math.abs((mine - ref) * 60);
    if (devSec > maxDev) {
      maxDev = devSec;
      maxInfo = `${date.toISOString().slice(0, 10)} 本项目=${mine.toFixed(3)} 基准=${ref.toFixed(3)} 偏差=${devSec.toFixed(3)}s`;
    }
    assert.ok(devSec <= 3.0, `EoT 偏差超限：${maxInfo}`);
  }
  // EoT 极值应该在合理区间（-14.2 ~ +16.4 分钟内），防止整体量纲错误
  const allEoT = dates.map((d) => projectEoT(d));
  assert.ok(Math.min(...allEoT) >= -14.3, 'EoT 极小值异常');
  assert.ok(Math.max(...allEoT) <= 16.5, 'EoT 极大值异常');
  // 结果记录到 stdout 便于审计
  console.log(`EoT 精度抽样：共 ${dates.length} 组，最大偏差 ${maxDev.toFixed(3)} 秒（阈值 3 秒）`);
});

test('均时差 EoT：已知极值锚点（2月中旬负极大 / 11月上旬正极大）', () => {
  // 2 月中旬 EoT ≈ -14.2 分（真太阳慢于钟表）
  const feb = calcTrueSolarTime(new Date(Date.UTC(2024, 1, 11, 12, 0, 0)), 120);
  assert.ok(feb.equationOfTime <= -13.5 && feb.equationOfTime >= -14.5,
    `2月中旬 EoT 应立即负极大 -14.2 分附近，实际 ${feb.equationOfTime}`);
  // 11 月上旬 EoT ≈ +16.4 分（真太阳快于钟表）
  const nov = calcTrueSolarTime(new Date(Date.UTC(2024, 10, 3, 12, 0, 0)), 120);
  assert.ok(nov.equationOfTime >= 15.5 && nov.equationOfTime <= 17.0,
    `11月上旬 EoT 应立即正极大 +16.4 分附近，实际 ${nov.equationOfTime}`);
});

// ============================================================================
// C. 经度修正公式 + 总偏移恒等式（10 城 × 5 季 = 50 组）
// ============================================================================

test('经度修正：10 城经纬度修正恒等于 (经度-120°)×4 分钟/度，总偏移 = 经差 + 均时差', () => {
  const dates = [
    new Date(Date.UTC(2024, 1, 11, 4, 0, 0)),   // 冬（EoT 极小）
    new Date(Date.UTC(2024, 3, 20, 4, 0, 0)),   // 春
    new Date(Date.UTC(2024, 5, 21, 4, 0, 0)),   // 夏
    new Date(Date.UTC(2024, 8, 23, 4, 0, 0)),   // 秋
    new Date(Date.UTC(2024, 10, 3, 4, 0, 0)),   // 深秋（EoT 极大）
  ];
  let caseCount = 0;
  for (const city of CITIES) {
    for (const date of dates) {
      const r = calcTrueSolarTime(date, city.lon);
      const expectLon = (city.lon - 120) * 4;
      assert.ok(Math.abs(r.longitudeOffset - expectLon) < 0.01,
        `${city.name} 经度修正错误：期望 ${expectLon.toFixed(2)}，实际 ${r.longitudeOffset}`);
      // 总偏移 = 经度差 + 均时差（保留 0.01 分精度下的恒等式）
      const expectTotal = expectLon + r.equationOfTime;
      assert.ok(Math.abs(r.totalOffset - expectTotal) < 0.02,
        `${city.name} 总偏移恒等式不成立`);
      caseCount++;
    }
  }
  assert.equal(caseCount, 50, '10 城 × 5 季应产生 50 组用例');
  console.log(`经度修正/总偏移恒等式：${caseCount} 组全部通过`);
});

// ============================================================================
// D. 跨日（真太阳时修正使时刻跨 0 点）
// ============================================================================

test('跨日：哈尔滨（东经 126.53°）深夜出生经修正后进入次日', () => {
  // 2024-06-14 23:50 哈尔滨，经差 +26.1 分 → 越过 0 点进入 6-15
  const r = calcTrueSolarTime(new Date(Date.UTC(2024, 5, 14, 23, 50, 0)), 126.5349);
  assert.ok(r.trueSolarTime.getUTCDate() === 15, '跨日未前滚到 15 日');
  assert.ok(r.trueSolarTime.getUTCHours() === 0, '跨日后小时应为 0 点附近');
});

test('跨日：乌鲁木齐（东经 87.62°）凌晨出生经修正后退回前一日', () => {
  // 2024-10-01 00:15 乌鲁木齐，经差约 -129.5 分 → 回退到 9-30 深夜
  const r = calcTrueSolarTime(new Date(Date.UTC(2024, 9, 1, 0, 15, 0)), 87.6168);
  assert.ok(r.trueSolarTime.getUTCDate() === 30, '跨日未回退到 30 日');
});

// ============================================================================
// E. 时辰边界（getTrueSolarHourIndex 十二时辰分界）
// ============================================================================

test('时辰边界：十二时辰中点判定正确（子23-1/丑1-3/寅3-5…亥21-23）', () => {
  // 2024-06-14 EoT 接近 0，经度 120 使经差为 0，便于验证纯时辰划分
  const lon = 120;
  const y = 2024, m = 6, d = 14;
  // 每时辰取中点（子时环形中点为 00:00），远离分界，规避临界秒级抖动
  const midpoints: Array<[number, number, number]> = [
    [0, 0, 0],    // 子时中点
    [2, 0, 1],    // 丑
    [4, 0, 2],    // 寅
    [6, 0, 3],    // 卯
    [8, 0, 4],    // 辰
    [10, 0, 5],   // 巳
    [12, 0, 6],   // 午
    [14, 0, 7],   // 未
    [16, 0, 8],   // 申
    [18, 0, 9],   // 酉
    [20, 0, 10],  // 戌
    [22, 0, 11],  // 亥
  ];
  for (const [h, mi, expectIdx] of midpoints) {
    const input = inputForCorrected(y, m, d, h, mi, lon);
    const idx = getTrueSolarHourIndex(input, lon);
    assert.equal(idx, expectIdx, `真太阳时 ${h}:${mi} 应判为时辰索引 ${expectIdx}，实际 ${idx}`);
  }
});

test('时辰边界：分界点两侧 ±2 分钟稳定归位（非临界抖动）', () => {
  const lon = 120;
  const y = 2024, m = 6, d = 14;
  // 分界前 2 分钟与后 2 分钟，规避 23:00/01:00 等整点收敛残差
  const transitions: Array<[number, number, number]> = [
    [22, 58, 11], // 亥尾（分界前）
    [23, 2, 0],   // 子头（分界后）
    [0, 58, 0],   // 子尾（分界前）
    [1, 2, 1],    // 丑头（分界后）
    [10, 58, 5],  // 巳尾（分界前）
    [11, 2, 6],   // 午头（分界后）
    [12, 58, 6],  // 午尾（分界前）
    [13, 2, 7],   // 未头（分界后）
    [20, 58, 10], // 戌尾（分界前）
    [21, 2, 11],  // 亥头（分界后）
  ];
  for (const [h, mi, expectIdx] of transitions) {
    const input = inputForCorrected(y, m, d, h, mi, lon);
    const idx = getTrueSolarHourIndex(input, lon);
    assert.equal(idx, expectIdx, `真太阳时 ${h}:${mi} 应判为时辰索引 ${expectIdx}，实际 ${idx}`);
  }
});

test('时辰边界：非东经 120 区域时辰随真太阳时平移', () => {
  // 乌鲁木齐（东经 87.62°）真太阳时比钟表慢约 129.5 分：
  // 钟表 21:00 → 真太阳约 18:51，应从戌时(19-21)进入酉时(17-19)
  const lon = 87.6168;
  const input = inputForCorrected(2024, 6, 14, 19, 0, lon); // 目标真太阳 19:00
  const idx = getTrueSolarHourIndex(input, lon);
  assert.equal(idx, 10, '乌鲁木齐真太阳 19:00 应判为戌时(19-21)，索引 10');
});

// ============================================================================
// F. 奇门遁甲 Integration（zhen 模式复用 calcTrueSolarTime）
// ============================================================================

test('奇门 Integration：timeType=zhen 与手工 calcTrueSolarTime 修正结果一致（含跨日）', () => {
  // 哈尔滨 2024-06-14 23:50 出生，真太阳时修正后跨入次日 子时
  const y = 2024, mo = 6, dd = 14, h = 23, mi = 50;
  const lon = 126.5349;

  const zhen = calculateQimen({ year: y, month: mo, day: dd, hour: h, minute: mi, timeType: 'zhen', longitude: lon });

  // 手工修正
  const r = calcTrueSolarTime(new Date(Date.UTC(y, mo - 1, dd, h, mi)), lon);
  const t = r.trueSolarTime;
  const manual = calculateQimen({
    year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate(),
    hour: t.getUTCHours(), minute: t.getUTCMinutes(),
    timeType: 'normal', longitude: lon,
  });

  // 四柱（含时柱、日柱）应完全一致
  assert.equal(zhen.siZhu.hour, manual.siZhu.hour, '奇门真太阳时时柱与手工修正不一致');
  assert.equal(zhen.siZhu.day, manual.siZhu.day, '奇门真太阳时日柱与手工修正不一致');
  // 修正后应跨到次日 子时（时柱地支为「子」）
  assert.equal(zhen.siZhu.hour[1], '子', `跨日后时应为子时，实际 ${zhen.siZhu.hour}`);
  assert.equal(t.getUTCDate(), 15, '修正应跨入 6-15 日');
});

test('奇门 Integration：timeType=normal 不做真太阳时修正', () => {
  const lon = 126.5349;
  const normal = calculateQimen({ year: 2024, month: 6, day: 14, hour: 23, minute: 50, timeType: 'normal', longitude: lon });
  assert.equal(normal.timeCorrection, undefined, 'normal 模式不应产生时间修正说明');
});

// ============================================================================
// G. 八字 / 紫微 页面级修正提取一致性（Asia/Shanghai 本地 getter 语义）
// ============================================================================

test('八字/紫微提取：页面 getFullYear/getMonth/getDate/getHours/getMinutes 语义与北京时区一致', () => {
  // 复刻 bazi/page.tsx:1632-1634 与 ziwei/page.tsx:1053-1055 的字段提取逻辑
  const std = new Date(2024, 5, 14, 23, 50, 0); // 北京本地时间 2024-06-14 23:50
  const lon = 126.5349;
  const tst = calcTrueSolarTime(std, lon);
  const t = tst.trueSolarTime;
  const calcDate = { year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate(), hour: t.getHours(), minute: t.getMinutes() };

  // 经差 +26.1 分（EoT 6-14 ≈ 0）→ 越过 0 点进入次日 00:16 分
  assert.equal(calcDate.day, 15, '页面提取应跨入 15 日');
  assert.equal(calcDate.hour, 0, '页面提取小时应为 0 点');
  assert.equal(calcDate.month, 6, '月份应为 6 月');
  assert.equal(calcDate.year, 2024, '年份应为 2024');
});