const { astro } = require('iztro');

// Test dates around 立春 and 惊蛰 to see if iztro handles solar terms
const tests = [
  { date: '1985-2-3', hour: 12, desc: '1985-2-3 (before Lichun 1985)', expected_year: '甲子' },
  { date: '1985-2-5', hour: 12, desc: '1985-2-5 (after Lichun 1985)', expected_year: '乙丑' },
  { date: '1985-3-4', hour: 12, desc: '1985-3-4 (before Jingzhe)', expected_month: '寅' },
  { date: '1985-3-6', hour: 12, desc: '1985-3-6 (after Jingzhe)', expected_month: '卯' },
  { date: '1995-11-7', hour: 6, desc: '1995-11-7 (before Lidong)', expected_month: '戌' },
  { date: '1995-11-8', hour: 6, desc: '1995-11-8 (day of Lidong)', expected_month: '亥' },
];

for (const t of tests) {
  const a = astro.bySolar(t.date, 6, '男', true, 'zh-CN');
  const [yg, mg, dg, hg] = a.chineseDate.split(' ');
  console.log(`${t.desc}:`);
  console.log(`  iztro: ${a.chineseDate}, lunar: ${a.lunarDate}`);
  if (t.expected_year) console.log(`  年柱期望: ${t.expected_year}, 实际: ${yg} ${yg===t.expected_year?'✓':'✗'}`);
  if (t.expected_month) console.log(`  月支期望: ${t.expected_month}, 实际: ${mg.charAt(1)} ${mg.charAt(1)===t.expected_month?'✓':'✗'}`);
}
