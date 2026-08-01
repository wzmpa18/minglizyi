const { astro } = require('iztro');

const cases = [
  { solarStr: '1990-6-15', timeIndex: 0, gender: '男', label: 'Case 1: 1990-06-15 00:00 男 (庚午年 阳男顺排)', expected: { yearGZ: '庚午', monthGZ: '壬午', dayGZ: '辛亥', hourGZ: '戊子' } },
  { solarStr: '1985-3-20', timeIndex: 6, gender: '女', label: 'Case 2: 1985-03-20 12:00 女 (乙丑年 阴女顺排)', expected: { yearGZ: '乙丑', monthGZ: '己卯', dayGZ: '戊午', hourGZ: '戊午' } },
  { solarStr: '1995-11-8', timeIndex: 2, gender: '男', label: 'Case 3: 1995-11-08 06:00 男 (乙亥年 阴男逆排)', expected: { yearGZ: '乙亥', monthGZ: '丁亥', dayGZ: '癸卯', hourGZ: '乙卯' } },
];

// 正确的十二宫顺序（逆时针从命宫开始）
const PALACE_ORDER = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母'];
// 地支索引到宫位网格位置映射
const ZHI_NAMES = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
// 4x4网格映射
const GRID_4X4 = [
  [3, 4, 5, 6],     // row 0: 巳,午,未,申
  [2, null, null, 7], // row 1: 辰, center, center, 酉
  [1, null, null, 8], // row 2: 卯, center, center, 戌
  [0, 11, 10, 9],    // row 3: 寅,丑,子,亥
];

for (const c of cases) {
  console.log('\n' + '='.repeat(70));
  console.log(c.label);
  console.log('='.repeat(70));
  
  try {
    const a = astro.bySolar(c.solarStr, c.timeIndex, c.gender, true, 'zh-CN');
    
    console.log('solarDate:', a.solarDate);
    console.log('lunarDate:', a.lunarDate);
    console.log('chineseDate:', a.chineseDate);
    console.log('fiveElementsClass:', a.fiveElementsClass);
    console.log('soul(命主):', a.soul, 'body(身主):', a.body);
    console.log('命宫地支:', a.earthlyBranchOfSoulPalace, '身宫地支:', a.earthlyBranchOfBodyPalace);
    console.log('zodiac:', a.zodiac);
    
    // Verify chineseDate matches expected
    const [yg, mg, dg, hg] = a.chineseDate.split(' ');
    console.log('\n四柱校验:');
    console.log('  年柱:', yg, '期望:', c.expected.yearGZ, yg === c.expected.yearGZ ? '✓' : '✗ 错误!');
    console.log('  月柱:', mg, '期望:', c.expected.monthGZ, mg === c.expected.monthGZ ? '✓' : '✗ 错误!');
    console.log('  日柱:', dg, '期望:', c.expected.dayGZ, dg === c.expected.dayGZ ? '✓' : '✗ 错误!');
    console.log('  时柱:', hg, '期望:', c.expected.hourGZ, hg === c.expected.hourGZ ? '✓' : '✗ 错误!');
    
    // Find 命宫 index
    let mingIdx = -1;
    let bodyIdx = -1;
    for (let i = 0; i < 12; i++) {
      if (a.palaces[i].isSoulPalace) mingIdx = i;
      if (a.palaces[i].isBodyPalace) bodyIdx = i;
    }
    console.log('\n命宫索引:', mingIdx, '身宫索引:', bodyIdx);
    
    // Verify palace name order counterclockwise from 命宫
    console.log('\n宫位排布校验(逆时针从命宫):');
    let allCorrect = true;
    for (let offset = 0; offset < 12; offset++) {
      const idx = (mingIdx - offset + 12 * 2) % 12;
      const p = a.palaces[idx];
      const expectedName = PALACE_ORDER[offset];
      const correct = p.name === expectedName;
      if (!correct) allCorrect = false;
      const bodyMark = p.isBodyPalace ? ' [身宫]' : '';
      const soulMark = p.isSoulPalace ? ' [命宫]' : '';
      const majors = p.majorStars.map(s => s.name + (s.mutagen ? '[' + s.mutagen + ']' : '')).join(',');
      console.log(`  ${expectedName.padEnd(4)} -> ${ZHI_NAMES[idx]}宫: ${p.name}${soulMark}${bodyMark} 主星:${majors || '空'} ${correct ? '✓' : '✗ 错误!'}`);
    }
    
    if (allCorrect) {
      console.log('  ✓ 十二宫名称顺序正确!');
    }
    
    // Check 四化
    console.log('\n生年四化:');
    const sihuaMap = { 化禄: null, 化权: null, 化科: null, 化忌: null };
    const MUTAGEN_MAP = { '禄': '化禄', '权': '化权', '科': '化科', '忌': '化忌' };
    for (const p of a.palaces) {
      for (const s of [...p.majorStars, ...p.minorStars]) {
        if (s.mutagen && MUTAGEN_MAP[s.mutagen]) {
          sihuaMap[MUTAGEN_MAP[s.mutagen]] = { star: s.name, palace: p.name };
        }
      }
    }
    for (const [key, val] of Object.entries(sihuaMap)) {
      console.log(`  ${key}: ${val ? val.star + '(' + val.palace + ')' : '未找到'}`);
    }
    
    // Print age ranges (大限)
    console.log('\n大限(阳男/阴女顺行, 阴男/阳女逆行):');
    const yearGan = yg.charAt(0);
    const isYang = '甲丙戊庚壬'.includes(yearGan);
    const isShun = (isYang && c.gender === '男') || (!isYang && c.gender === '女');
    console.log('  年干:', yearGan, isYang ? '阳' : '阴', c.gender, isShun ? '顺行' : '逆行');
    
    const daXianOrder = [];
    for (let i = 0; i < 12; i++) {
      const idx = isShun ? (mingIdx + i) % 12 : (mingIdx - i + 12) % 12;
      const p = a.palaces[idx];
      daXianOrder.push(`${p.decadal.heavenlyStem}${p.decadal.earthlyBranch}(${p.name})[${p.decadal.range[0]}-${p.decadal.range[1]}]`);
    }
    console.log('  ' + daXianOrder.join(' → '));
    
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  }
}
