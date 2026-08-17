// 净室验证脚本：探明 iztro 运限 palaceNames 语义与叠宫排列方向（仅读 API 输出，不复制代码）
// 用例：1988-06-16 12时 男（阳男顺行）
const { astro } = require('iztro');

const ZHI_ORDER = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

function probe(year, month, day, hour, gender, label) {
  console.log('='.repeat(72));
  console.log(`用例 ${label}: ${year}-${month}-${day} ${hour}时 ${gender === '男' ? '阳男/阴男' : '女'}`);
  const a = astro.bySolar(`${year}-${month}-${day}`, Math.floor((hour + 1) / 2), gender, true, 'zh-CN');
  console.log(`年干支: ${a.solarDate} 农历:${a.lunarDate} 五行局:${a.fiveElementsClass} 命主:${a.soulStar}`);

  // 本命十二宫排布（index 0=寅）
  console.log('--- 本命十二宫（宫序 寅→丑）---');
  const names = a.palaces.map(p => `${ZHI_ORDER.indexOf(p.earthlyBranch)}:${p.earthlyBranch}${p.heavenlyStem}=${p.name}`);
  console.log(names.join(' '));
  const mingIdx = a.palaces.findIndex(p => p.name === '命宫');
  console.log(`命宫 index=${mingIdx}(${ZHI_ORDER[mingIdx]})`);

  // 大限起运方向
  console.log('--- 12 大限（iztro decadal.range 顺序按宫序）---');
  a.palaces.forEach((p, i) => {
    if (p.decadal) console.log(`  宫${i} ${p.earthlyBranch} ${p.name} 限${p.decadal.range.join('-')}岁 [${p.decadal.heavenlyStem}${p.earthlyBranch}]`);
  });

  // 运限快照：探 palaceNames 语义
  const probeDates = [new Date(2026, 0, 15), new Date(2026, 7, 15)];
  for (const d of probeDates) {
    const h = a.horoscope(d);
    console.log(`--- horoscope(${d.toISOString().slice(0, 10)}) ---`);
    console.log(`  decadal: idx=${h.decadal.index} 干支=${h.decadal.heavenlyStem}${h.decadal.earthlyBranch} palaceNames=[${h.decadal.palaceNames.join(',')}]`);
    console.log(`  yearly : idx=${h.yearly.index} 干支=${h.yearly.heavenlyStem}${h.yearly.earthlyBranch} palaceNames=[${h.yearly.palaceNames.join(',')}]`);
    console.log(`  monthly: idx=${h.monthly.index} palaceNames=[${h.monthly.palaceNames.slice(0, 6).join(',')}...]`);
    console.log(`  daily  : idx=${h.daily.index} palaceNames=[${h.daily.palaceNames.slice(0, 6).join(',')}...]`);
    // 关键验证：palaceNames[i] 是否 = 第i宫在此运限中的宫名
    // 取 decadal.index（运限命宫所在宫），则 palaceNames[decadal.index] 应为 '命宫' 类
  }
}

probe(1988, 6, 16, 12, '男', 'A');
probe(1990, 11, 5, 4, '女', 'B');
