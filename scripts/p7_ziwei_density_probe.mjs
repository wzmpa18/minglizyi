// P7-紫微布局-02 密度探针：三组样例命盘的A区星曜密度统计（供真机录屏验收选盘）
import { astro } from 'iztro';

const CASES = [
  { label: '样例1·男命1990-06-15午时', y: 1990, m: 6, d: 15, h: 12, gender: '男' },
  { label: '样例2·女命1985-11-03子时', y: 1985, m: 11, d: 3, h: 0, gender: '女' },
  { label: '样例3·男命2000-02-29酉时', y: 2000, m: 2, d: 29, h: 18, gender: '男' },
];

for (const c of CASES) {
  const hourIdx = c.h === 23 ? 12 : c.h === 0 ? 0 : Math.floor((c.h + 1) / 2);
  const a = astro.bySolar(`${c.y}-${String(c.m).padStart(2, '0')}-${String(c.d).padStart(2, '0')}`, hourIdx, c.gender === '男' ? '男' : '女', true, 'zh-CN');
  let total = 0, maxPalace = 0, maxName = '';
  const perPalace = [];
  for (const p of a.palaces) {
    const stars = [
      ...(p.majorStars || []).map((s) => s.name),
      ...(p.minorStars || []).map((s) => s.name),
      ...(p.adjectiveStars || []).map((s) => s.name),
    ];
    total += stars.length;
    perPalace.push(`${p.earthlyBranch}:${stars.length}`);
    if (stars.length > maxPalace) { maxPalace = stars.length; maxName = p.name; }
  }
  console.log(`${c.label}`);
  console.log(`  命宫=${a.soulPalace} 身宫=${a.bodyPalace} 五行局=${a.fiveElementsClass}`);
  console.log(`  十二宫星曜总数=${total}  单宫最多=${maxPalace}颗(${maxName})  平均=${(total / 12).toFixed(1)}颗/宫`);
  console.log(`  各宫星数 ${perPalace.join(' ')}`);
}
