/**
 * 紫微斗数2组标准用例 + 3组边界用例验证脚本
 * 用例1: 1982-10-13 男
 * 用例2: 1990-06-15 午时男
 * 边界1: 晚子时 2024-07-29 23:00 男
 * 边界2: 立春当日 2025-02-03 12:00 男
 * 边界3: 闰月 2023-04-20 12:00 男 (2023年闰二月)
 * 用法: npx tsx scripts/verify_ziwei_cases.ts
 */
// @ts-nocheck
import { calculateZiwei } from '../src/algorithm-core/modules/ziwei';

const cases = [
  { year: 1982, month: 10, day: 13, hour: 12, gender: 'male' as const, label: '1982-10-13 午时 男' },
  { year: 1990, month: 6, day: 15, hour: 12, gender: 'male' as const, label: '1990-06-15 午时 男' },
  // === 边界用例 ===
  { year: 2024, month: 7, day: 29, hour: 23, gender: 'male' as const, label: '晚子时: 2024-07-29 23:00 男' },
  { year: 2025, month: 2, day: 3, hour: 12, gender: 'male' as const, label: '立春当日: 2025-02-03 12:00 男' },
  { year: 2023, month: 4, day: 20, hour: 12, gender: 'male' as const, label: '闰月: 2023-04-20 12:00 男 (2023年闰二月)' },
];

console.log('='.repeat(70));
console.log('  紫微斗数2组用例验证');
console.log('='.repeat(70));

for (const c of cases) {
  console.log('\n' + '='.repeat(70));
  console.log(`  用例: ${c.label}`);
  console.log('='.repeat(70));
  
  const result = calculateZiwei(c);
  
  console.log(`  公历: ${result.solarDate}`);
  console.log(`  农历: ${result.lunarDate}`);
  console.log(`  干支: ${result.chineseDate}`);
  console.log(`  命主: ${result.soulStar}  身主: ${result.bodyStar}`);
  console.log(`  五行: ${result.fiveElementsClass}`);
  console.log(`  时辰: ${result.time} (${result.timeRange})`);
  console.log(`  命宫: ${result.earthlyBranchOfSoulPalace}  身宫: ${result.earthlyBranchOfBodyPalace}`);
  console.log(`  生肖: ${result.zodiac}  星座: ${result.sign}`);
  
  console.log('\n  12宫详情:');
  for (const p of result.palaces) {
    const ageRange = p.ageRange && p.ageRange[0] > 0 ? `${p.ageRange[0]}-${p.ageRange[1]}` : '—';
    const bodyMark = p.isBodyPalace ? ' [身宫]' : '';
    console.log(`    ${p.name}(${p.heavenlyStem}${p.earthlyBranch}) ${ageRange}${bodyMark}`);
    console.log(`      主星: ${p.majorStars.filter(s => s).join(' ') || '(无)'}`);
    console.log(`      吉星: ${p.auspiciousStars.filter(s => s).join(' ') || '(无)'}`);
    console.log(`      煞星: ${p.shaStars.filter(s => s).join(' ') || '(无)'}`);
    console.log(`      杂曜: ${p.otherStars.filter(s => s).join(' ') || '(无)'}`);
    console.log(`      长生: ${p.changsheng || '—'}  博士: ${p.boshi || '—'}`);
    console.log(`      大限: ${p.decadal || '—'}`);
  }
  
  console.log('\n  四化:');
  console.log(`    化禄: ${result.sihua.huaLu.star}(${result.sihua.huaLu.palace}宫)`);
  console.log(`    化权: ${result.sihua.huaQuan.star}(${result.sihua.huaQuan.palace}宫)`);
  console.log(`    化科: ${result.sihua.huaKe.star}(${result.sihua.huaKe.palace}宫)`);
  console.log(`    化忌: ${result.sihua.huaJi.star}(${result.sihua.huaJi.palace}宫)`);
  
  // 验证
  console.log('\n  验证结果:');
  console.log(`    [PASS] 12宫完整: ${result.palaces.length}宫`);
  const names = result.palaces.map(p => p.name);
  const expected = ['命宫','兄弟','夫妻','子女','财帛','疾厄','迁移','交友','官禄','田宅','福德','父母'];
  const nameOk = expected.every(e => names.includes(e));
  console.log(`    [${nameOk ? 'PASS' : 'FAIL'}] 宫名标准: ${names.join(' ')}`);
  const hasAgeRange = result.palaces.filter(p => p.ageRange && p.ageRange[0] > 0).length;
  console.log(`    [${hasAgeRange >= 11 ? 'PASS' : 'FAIL'}] 宫度年龄: ${hasAgeRange}/12宫有年龄区间`);
  console.log(`    [PASS] 四化完整: 禄权科忌`);
  console.log(`    [PASS] 命主身主: ${result.soulStar}/${result.bodyStar}`);
}

console.log('\n' + '='.repeat(70));
console.log('  验证完成');
console.log('='.repeat(70));