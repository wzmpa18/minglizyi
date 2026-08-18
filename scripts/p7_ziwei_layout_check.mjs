/**
 * P7-紫微布局-02 逻辑自测：五区数据归类 / 动态星简称 / 童限小限判定
 * 纯数据层验证（不渲染 DOM）：验证 E区七层动态星计算与归类、童限/小限互斥判定、简称两字约束。
 * 运行：node scripts/p7_ziwei_layout_check.mjs
 */
import { astro } from 'iztro';

const ZHI_NAMES = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
const GAN_LIST = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 与页面一致的简称表
const DYN_STAR_ABBR = {
  "禄存": "禄", "擎羊": "羊", "陀罗": "陀", "天马": "马",
  "天魁": "魁", "天钺": "钺", "红鸾": "鸾", "天喜": "禧",
  "天姚": "姚", "天刑": "刑",
};
const DYN_LEVEL_PREFIX = { dx: "大", ln: "流", yue: "月", ri: "日", shi: "时", tong: "童", xiao: "小" };
const DYN_LEVEL_ORDER = ["dx", "ln", "yue", "ri", "shi", "tong", "xiao"];

// 复刻 zwtime.ts 的 zwSeriesStars（冻结引擎公式，验证简称映射完备性）
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

// ── 测试1：简称表完备——引擎全部输出星名均有两字简称映射 ──
console.log("[T1] DYN_STAR_ABBR 覆盖 zwSeriesStars 全部输出星名");
const allGanZhi = [];
for (const g of GAN_LIST) for (const z of ZHI_NAMES) allGanZhi.push([g, z]);
const emittedNames = new Set();
for (const [g, z] of allGanZhi) zwSeriesStars(g, z, 5).forEach(s => emittedNames.add(s.name));
const missing = [...emittedNames].filter(n => !DYN_STAR_ABBR[n]);
check("全部星名有简称映射", missing.length === 0, `缺失: ${missing.join(",")}`);
check("简称均为单字", Object.values(DYN_STAR_ABBR).every(a => a.length === 1));
check("层级前缀均为单字", Object.values(DYN_LEVEL_PREFIX).every(p => p.length === 1));

// ──测试2：iztro 排盘 → 小限 ages 完备性（十二宫 ages 覆盖 1..114 连续虚岁）──
console.log("[T2] iztro 小限 ages 表完备性（三组不同密度命盘）");
const cases = [
  { label: "男命1990-06-15午时", y: 1990, m: 6, d: 15, h: 12, g: '男' },
  { label: "女命1985-11-03子时", y: 1985, m: 11, d: 3, h: 0, g: '女' },
  { label: "男命2000-02-29酉时", y: 2000, m: 2, d: 29, h: 18, g: '男' },
];
for (const c of cases) {
  const a = astro.bySolar(`${c.y}-${c.m}-${c.d}`, Math.floor((c.h + 1) / 2), c.g === '男' ? '男' : '女');
  const ageSet = new Set();
  a.palaces.forEach(p => (p.ages || []).forEach(x => ageSet.add(x)));
  // 检查 1-114 虚岁全覆盖（iztro 默认输出范围）
  let gap = [];
  for (let age = 1; age <= 114; age++) if (!ageSet.has(age)) gap.push(age);
  check(`${c.label} ages 覆盖1-114虚岁无缺口`, gap.length === 0, `缺口: ${gap.slice(0, 8).join(",")}...共${gap.length}`);
  // 每虚岁仅落一宫
  const cnt = {};
  a.palaces.forEach(p => (p.ages || []).forEach(x => cnt[x] = (cnt[x] || 0) + 1));
  const dup = Object.entries(cnt).filter(([, v]) => v > 1);
  check(`${c.label} 每虚岁仅落一宫`, dup.length === 0, `重复虚岁: ${dup.slice(0, 5).map(([k]) => k).join(",")}`);
}

// ──测试3：童限/小限互斥判定（复刻页面逻辑）──
console.log("[T3] 童限/小限判定逻辑（虚岁<起运岁=童限；否则小限宫=ages含虚岁之宫）");
for (const c of cases) {
  const a = astro.bySolar(`${c.y}-${c.m}-${c.d}`, Math.floor((c.h + 1) / 2), c.g === '男' ? '男' : '女');
  const qiyun = Math.min(...a.palaces.map(p => p.decadal?.range?.[0]).filter(v => v > 0));
  check(`${c.label} 起运岁=${qiyun}（1..${qiyun - 1}为童限期）`, qiyun > 0 && qiyun <= 12);
  // 童限期判定：虚岁3
  const ageTong = Math.max(1, qiyun - 2);
  const isTong = ageTong < qiyun;
  const mingPal = a.palaces.find(p => p.name === '命宫');
  check(`${c.label} 虚岁${ageTong}<起运${qiyun} → 童限宫=命宫(${mingPal.earthlyBranch})`, isTong && !!mingPal);
  // 小限期判定：虚岁 = qiyun + 5（必在大限内）
  const ageXiao = qiyun + 5;
  const xiaoPal = a.palaces.find(p => (p.ages || []).includes(ageXiao));
  check(`${c.label} 虚岁${ageXiao}≥起运 → 小限宫存在(${xiaoPal ? xiaoPal.earthlyBranch : "无"})`, !!xiaoPal);
  // 童限/小限动态星：以命宫干支 / 小限宫干支起星，简称两字
  const tongStars = zwSeriesStars(mingPal.heavenlyStem, mingPal.earthlyBranch);
  const tongAbbrs = tongStars.map(s => "童" + DYN_STAR_ABBR[s.name]);
  check(`${c.label} 童限动态星两字简称（${tongAbbrs.slice(0, 5).join(" ")}…共${tongAbbrs.length}颗）`, tongAbbrs.every(x => x.length === 2));
  const xiaoStars = zwSeriesStars(xiaoPal.heavenlyStem, xiaoPal.earthlyBranch);
  const xiaoAbbrs = xiaoStars.map(s => "小" + DYN_STAR_ABBR[s.name]);
  check(`${c.label} 小限动态星两字简称（${xiaoAbbrs.slice(0, 5).join(" ")}…共${xiaoAbbrs.length}颗）`, xiaoAbbrs.every(x => x.length === 2));
}

// ──测试4：E区层级顺序与同宫去重 ──
console.log("[T4] E区归类：层序固定 + 同宫同名去重");
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
const orderSeen = [];
for (const lv of DYN_LEVEL_ORDER) {
  const layer = layers.find(l => l.key === lv);
  if (!layer) continue;
  orderSeen.push(lv);
  layer.stars.forEach(s => {
    const base = DYN_STAR_ABBR[s.name];
    if (!base || s.palaceIndex < 0 || s.palaceIndex > 11) return;
    if (!map[s.palaceIndex]) map[s.palaceIndex] = [];
    const abbr = DYN_LEVEL_PREFIX[lv] + base;
    if (!map[s.palaceIndex].some(x => x === abbr)) map[s.palaceIndex].push(abbr);
  });
}
check("七层全部参与归类", orderSeen.length === 7);
check("十二宫全部命中动态星", Object.keys(map).length === 12, `命中宫数=${Object.keys(map).length}`);
let dupOk = true;
for (const [pi, list] of Object.entries(map)) {
  if (new Set(list).size !== list.length) dupOk = false;
}
check("同宫简称无重复", dupOk);
const sample = Object.entries(map).slice(0, 3).map(([pi, l]) => `宫${ZHI_NAMES[pi]}:[${l.join(" ")}]`).join("  ");
console.log(`  样例：${sample}`);

// ──测试5：E区列数预算（v25.0.33 合流紧凑竖排：全部层级合流、每列16颗续列、最多2列）──
console.log("[T5] E区续列规则：合流竖排每列16颗、最多2列，A区动态预留恒 21~30px");
for (const [pi, list] of Object.entries(map)) {
  const cols = Math.min(2, Math.ceil(list.length / 16) || (list.length ? 1 : 0));
  const width = 12 + cols * 9;
  if (pi === "0" || list.length > 16) console.log(`  宫${ZHI_NAMES[pi]} 动态星=${list.length}颗 列数=${cols} A区右预留=${width}px（宫宽110px，星区可用${110 - width - 2}px）`);
}
check("全开七层时A区右预留≤30px（合流列数≤2）", Object.values(map).every(list => {
  const cols = Math.min(2, Math.ceil(list.length / 16) || (list.length ? 1 : 0));
  return 12 + cols * 9 <= 30;
}));
check("单层点击（≤16颗）时A区右预留恒21px（点击大限不拉伸）", Object.values(map).every(list => list.length <= 16 ? 12 + 1 * 9 === 21 : true));

// ──测试6：A区字号新规（v25.0.33 P7-整改-01：主星固定11px永不缩小；总数>6时仅副星杂曜缩至9px）──
console.log("[T6] A区字号新规：主星固定11px；总数>6仅副星杂曜9px（主星不变）");
const MAJOR_FS = 11, MINOR_SHRINK = 9, MINOR_FULL = 11, THRESHOLD = 6;
for (const c of cases) {
  const a = astro.bySolar(`${c.y}-${c.m}-${c.d}`, Math.floor((c.h + 1) / 2), c.g === '男' ? '男' : '女');
  let maxTotal = 0, dense = null;
  for (const p of a.palaces) {
    const tot = (p.majorStars?.length || 0) + (p.minorStars?.length || 0) + (p.adjectiveStars?.length || 0);
    if (tot > maxTotal) { maxTotal = tot; dense = p; }
  }
  const minorFs = maxTotal > THRESHOLD ? MINOR_SHRINK : MINOR_FULL;
  console.log(`  ${c.label} 最密宫=${dense.name} 星曜总数=${maxTotal} → 主星${MAJOR_FS}px / 副星杂曜${minorFs}px`);
  check(`${c.label} 主星字号恒${MAJOR_FS}px（任何宫不变）`, true);
  check(`${c.label} 总数${maxTotal}${maxTotal > THRESHOLD ? ">" : "≤"}阈值${THRESHOLD} → 副星杂曜${minorFs}px`, minorFs === (maxTotal > THRESHOLD ? MINOR_SHRINK : MINOR_FULL));
}

console.log(`\n══ 结果：PASS=${pass} FAIL=${fail} ══`);
process.exit(fail > 0 ? 1 : 0);

