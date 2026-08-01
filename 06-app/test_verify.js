// Test solar-to-lunar and bazi calculations for the 3 test cases
const path = require('path');

// Test iztro
const { astro } = require('iztro');

// Test cases
const testCases = [
  { year: 1990, month: 6, day: 15, hour: 0, gender: '男' },
  { year: 1985, month: 3, day: 20, hour: 12, gender: '女' },
  { year: 1995, month: 11, day: 8, hour: 6, gender: '男' },
];

for (const tc of testCases) {
  console.log(`\n=== ${tc.year}-${tc.month}-${tc.day} ${tc.hour}:00 ${tc.gender} ===`);
  
  // iztro time index
  function hourToTimeIndex(hour) {
    if (hour === 23) return 12;
    if (hour === 0) return 0;
    return Math.floor((hour + 1) / 2);
  }
  
  const timeIdx = hourToTimeIndex(tc.hour);
  console.log('timeIdx:', timeIdx);
  
  try {
    const a = astro.bySolar(`${tc.year}-${tc.month}-${tc.day}`, timeIdx, tc.gender, true, 'zh-CN');
    console.log('iztro solarDate:', a.solarDate);
    console.log('iztro lunarDate:', a.lunarDate);
    console.log('iztro chineseDate:', a.chineseDate);
    console.log('iztro rawDates:', JSON.stringify(a.rawDates, null, 2));
    console.log('iztro time:', a.time, 'timeRange:', a.timeRange);
    console.log('iztro zodiac:', a.zodiac, 'sign:', a.sign);
    console.log('iztro earthlyBranchOfSoulPalace:', a.earthlyBranchOfSoulPalace);
    console.log('iztro earthlyBranchOfBodyPalace:', a.earthlyBranchOfBodyPalace);
  } catch(e) {
    console.error('iztro error:', e.message);
  }
}

// Also check the jieqi dates
console.log('\n=== 节气日期验证 ===');
// 1985 惊蛰
// Using our bazi jieqi approximation: D = 0.2422*(y-1900) - floor((y-1900)/4)
function getJieQiDate(year, jieName) {
  var JIEQI_1900 = {
    '小寒': { m: 1, d: 6 }, '大寒': { m: 1, d: 20 },
    '立春': { m: 2, d: 4 }, '雨水': { m: 2, d: 19 },
    '惊蛰': { m: 3, d: 6 }, '春分': { m: 3, d: 21 },
    '清明': { m: 4, d: 5 }, '谷雨': { m: 4, d: 20 },
    '立夏': { m: 5, d: 6 }, '小满': { m: 5, d: 21 },
    '芒种': { m: 6, d: 6 }, '夏至': { m: 6, d: 22 },
    '小暑': { m: 7, d: 7 }, '大暑': { m: 7, d: 23 },
    '立秋': { m: 8, d: 8 }, '处暑': { m: 8, d: 23 },
    '白露': { m: 9, d: 8 }, '秋分': { m: 9, d: 23 },
    '寒露': { m: 10, d: 8 }, '霜降': { m: 10, d: 24 },
    '立冬': { m: 11, d: 8 }, '小雪': { m: 11, d: 22 },
    '大雪': { m: 12, d: 7 }, '冬至': { m: 12, d: 22 }
  };
  var base = JIEQI_1900[jieName];
  if (!base) return null;
  var D = 0.2422 * (year - 1900) - Math.floor((year - 1900) / 4);
  var day = Math.round(base.d + D);
  return { month: base.m, day: day };
}

for (const y of [1985, 1990, 1995]) {
  const lichun = getJieQiDate(y, '立春');
  const jingzhe = getJieQiDate(y, '惊蛰');
  const dahan = getJieQiDate(y-1, '大寒');
  console.log(`${y}年: 立春≈${lichun.month}/${lichun.day}, 惊蛰≈${jingzhe.month}/${jingzhe.day}`);
}
