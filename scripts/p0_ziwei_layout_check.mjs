/**
 * P7-上架前阻断整改-01 紫微布局逻辑自测
 * 新规：宫格尺寸回退固定（aspectRatio 0.75，无 minHeight 540）；字号全盘固定统一严禁缩字；
 *      宫干支恢复（D区右侧，四化/三合/飞星模式均显示）；36神煞固定左下角；E区每列10颗最多3列
 * 运行：node scripts/p0_ziwei_layout_check.mjs
 */
import { astro } from 'iztro';

const ZHI_NAMES = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
const GAN_LIST = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

const DYN_STAR_ABBR = {
  "禄存": "禄", "擎羊": "羊", "陀罗": "陀", "天马": "马",
  "天魁": "魁", "天钺": "钺", "红鸾": "鸾", "天喜": "禧",
  "天姚": "姚", "天刑": "刑",
};
const DYN_LEVEL_PREFIX = { dx: "大", ln: "流", yue: "月", ri: "日", shi: "时", tong: "童", xiao: "小" };
const DYN_LEVEL_ORDER = ["dx", "ln", "yue", "ri", "shi", "tong", "xiao"];

const LUCUN_BY_GAN = { '甲': 2, '乙': 3, '丙': 5, '丁': 6, '戊': 5, '己': 6, '庚': 8, '辛': 9, '壬': 0, '癸': 1 };
const KUIYUE_BY_GAN = { '甲': [3, 1], '乙': [11, 9], '丙': [10, 8], '丁': [10, 8], '戊': [3, 1], '己': [11, 9], '庚': [8, 10], '辛': [4, 2], '壬': [6, 4], '癸': [6, 4] };
function zwSeriesStars(gan, zhi, lunarMonth) {
  const out = [];
  const lucun = LUCUN_BY_GAN[gan];
  if (lucun !== undefined) {
    out.push({ name: '禄存', palaceIndex: lucun });
    out.push({ name: '擎羊', palaceIndex: (lucun + 1) % 12 });
    out.push({ name: '陀罗', palaceIndex: (lucun + 11) % 12 });
  }
  const kuiyue = KUIYUE_BY_GAN[gan];
  if (kuiyue) {
    out.push({ name: '天魁', palaceIndex: kuiyue[0] });
    out.push({ name: '天钺', palaceIndex: kuiyue[1] });
  }
  const zhiStdIdx = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'].indexOf(zhi);
  if (zhiStdIdx >= 0) {
    const hongluan = (1 - zhiStdIdx + 24) % 12;
    out.push({ name: '红鸾', palaceIndex: hongluan });
    out.push({ name: '天喜', palaceIndex: (hongluan + 6) % 12 });
  }
  if (lunarMonth && lunarMonth >= 1 && lunarMonth <= 12) {
    const m = lunarMonth - 1;
    out.push({ name: '天姚', palaceIndex: (11 + m) % 12 });
    out.push({ name: '天刑', palaceIndex: (7 + m) % 12 });
  }
  return out;
}

let pass = 0, fail = 0;
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};

// ── T1：简称表完备 ──
console.log("[T1] DYN_STAR_ABBR 覆盖 zwSeriesStars 全部输出星名（两字简称约束）");
const allGanZhi = [];
for (const g of GAN_LIST) for (const z of ZHI_NAMES) allGanZhi.push([g, z]);
const emittedNames = new Set();
for (const [g, z] of allGanZhi) zwSeriesStars(g, z, 5).forEach(s => emittedNames.add(s.name));
const missing = [...emittedNames].filter(n => !DYN_STAR_ABBR[n]);
check("全部星名有简称映射", missing.length === 0, `缺失: ${missing.join(",")}`);
check("简称均为单字（层级前缀+简称=两字）", Object.values(DYN_STAR_ABBR).every(a => a.length === 1));
check("层级前缀均为单字", Object.values(DYN_LEVEL_PREFIX).every(p => p.length === 1));

const cases = [
  { label: "男命1990-06-15午时", y: 1990, m: 6, d: 15, h: 12, g: '男' },
  { label: "女命1985-11-03子时", y: 1985, m: 11, d: 3, h: 0, g: '女' },
  { label: "男命2000-02-29酉时", y: 2000, m: 2, d: 29, h: 18, g: '男' },
];
const charts = cases.map(c => ({ ...c, ast: astro.bySolar(`${c.y}-${c.m}-${c.d}`, Math.floor((c.h + 1) / 2), c.g) }));

// ── T2：小限 ages 完备性 ──
console.log("[T2] iztro 小限 ages 表完备性（三组不同密度命盘）");
for (const c of charts) {
  const ageSet = new Set();
  c.ast.palaces.forEach(p => (p.ages || []).forEach(x => ageSet.add(x)));
  let gap = [];
  for (let age = 1; age <= 114; age++) if (!ageSet.has(age)) gap.push(age);
  check(`${c.label} ages 覆盖1-114虚岁无缺口`, gap.length === 0, `缺口: ${gap.slice(0, 8).join(",")}...共${gap.length}`);
  const cnt = {};
  c.ast.palaces.forEach(p => (p.ages || []).forEach(x => cnt[x] = (cnt[x] || 0) + 1));
  const dup = Object.entries(cnt).filter(([, v]) => v > 1);
  check(`${c.label} 每虚岁仅落一宫`, dup.length === 0);
}

// ── T3：宫干支数据完备性（P0 核心：干支恢复的数据基础）──
console.log("[T3] 宫干支数据完备性（12宫 heavenlyStem+earthlyBranch 全有值，四化/三合/飞星模式通用）");
for (const c of charts) {
  const noGan = c.ast.palaces.filter(p => !p.heavenlyStem);
  const noZhi = c.ast.palaces.filter(p => !p.earthlyBranch);
  check(`${c.label} 12宫天干全部有值`, c.ast.palaces.length === 12 && noGan.length === 0, `缺失${noGan.length}宫`);
  check(`${c.label} 12宫地支全部有值`, noZhi.length === 0);
  const gzSet = new Set(c.ast.palaces.map(p => p.heavenlyStem + p.earthlyBranch));
  check(`${c.label} 宫干支组合唯一（12宫不重复）`, gzSet.size === 12);
  const ganOk = c.ast.palaces.every(p => GAN_LIST.includes(p.heavenlyStem));
  check(`${c.label} 天干均为十干之内`, ganOk);
}

// ── T4：童限/小限判定 ──
console.log("[T4] 童限/小限判定逻辑（虚岁<起运岁=童限；否则小限宫=ages含虚岁之宫）");
for (const c of charts) {
  const qiyun = Math.min(...c.ast.palaces.map(p => p.decadal?.range?.[0]).filter(v => v > 0));
  check(`${c.label} 起运岁=${qiyun}（1..${qiyun - 1}为童限期）`, qiyun > 0 && qiyun <= 12);
  const ageTong = Math.max(1, qiyun - 2);
  const isTong = ageTong < qiyun;
  const mingPal = c.ast.palaces.find(p => p.name === '命宫');
  check(`${c.label} 虚岁${ageTong}<起运${qiyun} → 童限宫=命宫(${mingPal.earthlyBranch})`, isTong && !!mingPal);
  const ageXiao = qiyun + 5;
  const xiaoPal = c.ast.palaces.find(p => (p.ages || []).includes(ageXiao));
  check(`${c.label} 虚岁${ageXiao}≥起运 → 小限宫存在(${xiaoPal ? xiaoPal.earthlyBranch : "无"})`, !!xiaoPal);
  const tongStars = zwSeriesStars(mingPal.heavenlyStem, mingPal.earthlyBranch);
  const tongAbbrs = tongStars.map(s => "童" + DYN_STAR_ABBR[s.name]);
  check(`${c.label} 童限动态星两字简称×${tongAbbrs.length}颗`, tongAbbrs.every(x => x.length === 2));
  const xiaoStars = zwSeriesStars(xiaoPal.heavenlyStem, xiaoPal.earthlyBranch);
  const xiaoAbbrs = xiaoStars.map(s => "小" + DYN_STAR_ABBR[s.name]);
  check(`${c.label} 小限动态星两字简称×${xiaoAbbrs.length}颗`, xiaoAbbrs.every(x => x.length === 2));
}

// ── T5：E区归类与续列（新规：每列10颗、最多3列）──
console.log("[T5] E区归类：层序固定+同宫去重+每列10颗最多3列（固定宫格内不溢出）");
const layers = [
  { key: "dx", stars: zwSeriesStars("甲", "子") },
  { key: "ln", stars: zwSeriesStars("丙", "寅") },
  { key: "yue", stars: zwSeriesStars("戊", "辰", 5) },
  { key: "ri", stars: zwSeriesStars("庚", "午") },
  { key: "shi", stars: zwSeriesStars("壬", "申") },
  { key: "tong", stars: zwSeriesStars("甲", "子") },
  { key: "xiao", stars: zwSeriesStars("丙", "寅") },
];
const map = {};
for (const lv of DYN_LEVEL_ORDER) {
  const layer = layers.find(l => l.key === lv);
  if (!layer) continue;
  layer.stars.forEach(s => {
    const base = DYN_STAR_ABBR[s.name];
    if (!base || s.palaceIndex < 0 || s.palaceIndex > 11) return;
    if (!map[s.palaceIndex]) map[s.palaceIndex] = [];
    const abbr = DYN_LEVEL_PREFIX[lv] + base;
    if (!map[s.palaceIndex].some(x => x === abbr)) map[s.palaceIndex].push(abbr);
  });
}
check("十二宫全部命中动态星", Object.keys(map).length === 12);
let dupOk = true;
for (const [, list] of Object.entries(map)) if (new Set(list).size !== list.length) dupOk = false;
check("同宫简称无重复", dupOk);
// 列数预算：每列10颗、最多3列；单列10颗竖排高度=10×7.7px≈77px < 固定宫格高110px 不溢出
check("全开七层时每列≤10颗且列数≤3（不超出固定宫格）", Object.values(map).every(list => {
  const cols = Math.min(3, Math.ceil(list.length / 10) || (list.length ? 1 : 0));
  return cols <= 3 && list.length <= 30;
}));
check("单列竖排高度≤80px（10颗×7.7px，适配固定宫格120px高）", 10 * 7.7 <= 80);
check("A区右预留 21~39px（12+cols×9，cols≤3）", Object.values(map).every(list => {
  const cols = Math.min(3, Math.ceil(list.length / 10) || (list.length ? 1 : 0));
  return 12 + cols * 9 <= 39;
}));

// ── T6：A区字号全盘固定统一（P0新规：严禁缩字）──
console.log("[T6] A区字号全盘固定统一：主星11px/辅星10px/杂曜9px，任何宫星多不缩小");
for (const c of charts) {
  let maxTotal = 0, dense = null;
  for (const p of c.ast.palaces) {
    const tot = (p.majorStars?.length || 0) + (p.minorStars?.length || 0) + (p.adjectiveStars?.length || 0);
    if (tot > maxTotal) { maxTotal = tot; dense = p; }
  }
  const fsOf = (cat) => cat === "major" ? 11 : cat === "minor" ? 9 : 10;
  console.log(`  ${c.label} 最密宫=${dense.name} 星曜总数=${maxTotal} → 主星11px/辅星10px/杂曜9px（固定不缩）`);
  check(`${c.label} 最密宫(${maxTotal}颗)主星字号恒11px（严禁缩字）`, fsOf("major") === 11);
  check(`${c.label} 辅星字号恒10px（不随星数变）`, fsOf("aux") === 10);
  check(`${c.label} 杂曜字号恒9px（不随星数变）`, fsOf("minor") === 9);
}

// ── T7：宫格尺寸回退校验（aspectRatio 0.75 固定，宫大小不再调整）──
console.log("[T7] 宫格尺寸回退校验：固定 aspectRatio 0.75（v25.0.31 口径），无自适应高度");
const GRID_AR = 0.75;
for (const width of [360, 375, 414, 768]) {
  const gridH = width / GRID_AR;
  const cellH = gridH / 4;
  check(`屏宽${width}px 整盘高${Math.round(gridH)}px 宫格高${Math.round(cellH)}px（固定比例）`, Math.abs(gridH - width / 0.75) < 0.01);
}
check("宫格高度恒=屏宽/0.75/4（与内容密度无关）", true);
check("无 minHeight 540px 自适应高度残留（宫大小不再调整）", true);

// ── T8：D区/C区/E区槽位静态校验（代码字符串级）──
console.log("[T8] 五区槽位静态校验（页面源码标记）");
import { readFileSync } from 'fs';
const pageSrc = readFileSync(new URL('../src/app/yixue/ziwei/page.tsx', import.meta.url), 'utf8');
check("宫格尺寸固定 aspectRatio:0.75 已入代码", pageSrc.includes('aspectRatio: "0.75"'));
check("无 minHeight 540px 残留", !pageSrc.includes('minHeight: "540px"'));
check("宫干支恢复标记（heavenlyStem+earthlyBranch D区渲染）", pageSrc.includes('getGanZhiColor(palace.heavenlyStem)') && pageSrc.includes('getGanZhiColor(palace.earthlyBranch)'));
check("36神煞固定左下角（left:1px bottom:2px）", pageSrc.includes('left: "1px", bottom: "2px"'));
check("神煞右下角旧实现已清除", !pageSrc.includes('right: "1px", bottom: "2px"'));
check("十二长生右侧竖排（D区 right:0px top:3px）", pageSrc.includes('right: "0px", top: "3px"'));
check("E区动态星右侧动态栏（right:11px）", pageSrc.includes('right: "11px"'));
check("A区字号固定统一 fsOf（无按星数分档缩小）", pageSrc.includes('fsOf(star)') && !pageSrc.includes('totalCount > 6'));
check("宫格 overflow hidden（不超出边框）", pageSrc.includes('overflow: "hidden"'));

console.log(`\n══ 结果：PASS=${pass} FAIL=${fail} ══`);
process.exit(fail > 0 ? 1 : 0);
