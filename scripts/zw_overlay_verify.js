// ZW-OVERLAY 叠宫对拍验证（净室合规：仅调用 iztro MIT 库公开 API 输出做交叉验证，无代码复制）
// 验证点：
//   V1 本命盘自洽：natal 命宫 anchor 叠宫公式应还原本命十二宫名
//   V2 大限层：公式 vs iztro horoscope.decadal.palaceNames
//   V3 流年层：公式 vs iztro horoscope.yearly.palaceNames
//   V4 流月层：公式 vs iztro horoscope.monthly.palaceNames
//   V5 流日层：公式 vs iztro horoscope.daily.palaceNames
//   V6 流时层：公式 vs iztro horoscope.hourly.palaceNames
//   V7 跨层叠宫 zwOverlayAt 与 zwOverlayNames 一致性
const { astro } = require('iztro');

// ---- 与 zwtime.ts 相同的净室公式（此处复刻仅为对拍，正式实现以引擎文件为准）----
const SEQ = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];
function zwOverlayNames(anchor) {
  const o = new Array(12).fill('');
  for (let k = 0; k < 12; k++) o[(anchor - k + 24) % 12] = SEQ[k];
  return o;
}
function zwOverlayAt(a1, a2) { return SEQ[(a1 - a2 + 24) % 12]; }

// iztro 输出用「仆役」，平台口径「交友」；iztro 运限层命宫输出「命」，统一后比对
function norm(name) {
  const n = name === '仆役' ? '交友' : name === '仆役宫' ? '交友宫' : name;
  return n === '命' || n === '命宫' ? '命' : n;
}

let pass = 0, fail = 0;
function check(tag, ok, detail) {
  if (ok) { pass++; }
  else { fail++; console.log(`  ✗ ${tag} ${detail || ''}`); }
}

const cases = [
  [1988, 6, 16, 12, '男'], [1990, 11, 5, 4, '女'], [2000, 1, 1, 0, '男'],
  [1985, 3, 20, 23, '女'], [1995, 8, 8, 6, '男'], [1976, 12, 31, 11, '女'],
  [2001, 2, 29, 13, '男'], [1963, 7, 7, 5, '女'], [1999, 9, 19, 17, '男'],
  [1972, 4, 13, 19, '女'], [2020, 5, 5, 9, '男'], [1955, 10, 26, 21, '女'],
];
const probeDates = [
  new Date(2024, 1, 10), new Date(2026, 0, 15), new Date(2026, 7, 14),
  new Date(2031, 5, 20), new Date(1999, 11, 31),
];

for (const [y, m, d, h, g] of cases) {
  const a = astro.bySolar(`${y}-${m}-${d}`, h === 23 ? 12 : Math.floor((h + 1) / 2), g, true, 'zh-CN');

  // V1 本命自洽（双侧统一 norm：命宫/命 → 命）
  const natalNames = a.palaces.map(p => norm(p.name));
  const natalAnchor = a.palaces.findIndex(p => p.name === '命宫');
  const v1 = zwOverlayNames(natalAnchor).map(n => norm(n));
  check(`V1本命自洽 ${y}-${g}`, v1.join(',') === natalNames.join(','), `${v1.join(',')} vs ${natalNames.join(',')}`);

  for (const pd of probeDates) {
    const hs = a.horoscope(pd);
    const tag = `${y}-${g}@${pd.getFullYear()}-${pd.getMonth() + 1}-${pd.getDate()}`;

    // V2-V6 各层叠宫
    for (const [key, label] of [['decadal', 'V2大限'], ['yearly', 'V3流年'], ['monthly', 'V4流月'], ['daily', 'V5流日'], ['hourly', 'V6流时']]) {
      const item = hs[key];
      if (!item || typeof item.index !== 'number' || !Array.isArray(item.palaceNames)) continue;
      const mine = zwOverlayNames(item.index).map(n => norm(n));
      const iz = item.palaceNames.map(n => norm(n));
      const ok = mine.every((n, i) => n === iz[i]);
      check(`${label} ${tag}`, ok, `anchor=${item.index} mine=[${mine}] iz=[${iz}]`);
    }

    // V7 跨层：流年命宫叠大限盘
    if (hs.decadal && hs.yearly) {
      const cross = zwOverlayAt(hs.decadal.index, hs.yearly.index);
      const direct = zwOverlayNames(hs.decadal.index)[hs.yearly.index];
      check(`V7跨层 ${tag}`, cross === direct, `${cross} vs ${direct}`);
    }
  }
}

console.log('='.repeat(60));
console.log(`ZW-OVERLAY 对拍结果：${pass} 通过 / ${fail} 失败（合计 ${pass + fail} 项）`);
process.exit(fail > 0 ? 1 : 0);
