const { astro } = require('iztro');

console.log('=== 1990-05-15 12:00 男 (默认参数) ===');
const a = astro.bySolar('1990-5-15', 6, '男', true, 'zh-CN');
console.log('solarDate:', a.solarDate);
console.log('lunarDate:', a.lunarDate);
console.log('chineseDate:', a.chineseDate);
console.log('fiveElementsClass:', a.fiveElementsClass);
console.log('soul:', a.soul, 'body:', a.body);
console.log('earthlyBranchOfSoulPalace:', a.earthlyBranchOfSoulPalace);
console.log('earthlyBranchOfBodyPalace:', a.earthlyBranchOfBodyPalace);
console.log('zodiac:', a.zodiac);
a.palaces.forEach((p, i) => {
  const majors = p.majorStars.map(s => s.name + (s.brightness ? '(' + s.brightness + ')' : '') + (s.mutagen ? '[' + s.mutagen + ']' : '')).join(', ');
  const minors = p.minorStars.map(s => s.name + (s.mutagen ? '[' + s.mutagen + ']' : '')).join(', ');
  const adjs = p.adjectiveStars.map(s => s.name).join(', ');
  const bodyMark = p.isBodyPalace ? ' [身宫]' : '';
  console.log(`  [${i}] ${p.earthlyBranch}(${p.name})${bodyMark}: 主星[${majors || '空'}] 辅[${minors}] 杂[${adjs}] 大限:${p.decadal.heavenlyStem}${p.decadal.earthlyBranch}[${p.decadal.range[0]}-${p.decadal.range[1]}]`);
});
