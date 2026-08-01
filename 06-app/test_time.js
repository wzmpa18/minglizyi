const { util } = require('iztro');

// Test iztro's timeToIndex for all hours
console.log('iztro.util.timeToIndex:');
for (let h = 0; h < 24; h++) {
  console.log(`  hour=${h}: index=${util.timeToIndex(h)}`);
}

// Test: does iztro handle late zi shi (23:00+)?
// If we pass 23:00 to bySolar with date 1990-6-15, does it use next day?
const { astro } = require('iztro');

console.log('\n=== Testing late 子时 (23:00) ===');
// 1990-6-15 23:00 - should this be next day (6-16) for ziwei?
const a1 = astro.bySolar('1990-6-15', util.timeToIndex(23), '男', true, 'zh-CN');
console.log('1990-6-15 23:00 timeIndex=' + util.timeToIndex(23) + ': lunarDate=' + a1.lunarDate + ', chineseDate=' + a1.chineseDate);

const a2 = astro.bySolar('1990-6-16', 0, '男', true, 'zh-CN');
console.log('1990-6-16 00:00 timeIndex=0: lunarDate=' + a2.lunarDate + ', chineseDate=' + a2.chineseDate);

// Compare if they produce the same palaces
console.log('Same palace positions?', 
  a1.palaces.map(p => p.name + p.earthlyBranch + ':' + p.majorStars.map(s=>s.name).join(',')).join('|') === 
  a2.palaces.map(p => p.name + p.earthlyBranch + ':' + p.majorStars.map(s=>s.name).join(',')).join('|')
);
