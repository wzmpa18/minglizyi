/**
 * 验证脚本：测试3组参数，确认 iztro 集成后的排盘结果
 */
const path = require('path');
const iztroPath = path.join(__dirname, 'node_modules', 'iztro');
const { astro } = require(iztroPath);

function hourToTimeIndex(hour) {
  if (hour === 23) return 12;
  if (hour === 0) return 0;
  return Math.floor((hour + 1) / 2);
}

const MUTAGEN_MAP = { '禄': '禄', '权': '权', '科': '科', '忌': '忌' };

function testCase(year, month, day, hour, gender, label) {
  console.log('\n' + '='.repeat(70));
  console.log(label);
  console.log('='.repeat(70));

  const solarDateStr = `${year}-${month}-${day}`;
  const timeIndex = hourToTimeIndex(hour);
  const genderStr = gender === 'male' ? '男' : '女';

  const a = astro.bySolar(solarDateStr, timeIndex, genderStr, true, 'zh-CN');

  console.log(`公历: ${a.solarDate}  农历: ${a.lunarDate}`);
  console.log(`四柱: ${a.chineseDate}`);
  console.log(`性别: ${genderStr}  五行局: ${a.fiveElementsClass}  命主:${a.soul} 身主:${a.body}`);

  // 找命宫
  const ming = a.palaces.find(p => p.isOriginalPalace && p.name === '命宫');
  const shen = a.palaces.find(p => p.isBodyPalace);
  console.log(`命宫: ${ming ? ming.earthlyBranch : '?'} (${ming ? ming.heavenlyStem + ming.earthlyBranch : '?'})  身宫: ${shen ? shen.name + shen.earthlyBranch : '?'}`);

  // 四化
  const sihuaStars = [];
  a.palaces.forEach(p => {
    [...p.majorStars, ...p.minorStars].forEach(s => {
      if (s.mutagen) sihuaStars.push(`${s.name}${MUTAGEN_MAP[s.mutagen]}@${p.name}`);
    });
  });
  console.log('生年四化:', sihuaStars.join(', '));

  // 十二宫主星速览
  console.log('\n--- 十二宫位（寅起） ---');
  a.palaces.forEach((p, i) => {
    const majors = p.majorStars.map(s => s.name + (s.brightness ? `(${s.brightness})` : '')).join(',') || '无主星';
    const shaList = p.minorStars.filter(s => s.type === 'tough').map(s => s.name).join(',');
    const jiList = p.minorStars.filter(s => s.type === 'soft').map(s => s.name).join(',');
    const lucun = p.minorStars.find(s => s.type === 'lucun');
    const tianma = p.minorStars.find(s => s.type === 'tianma');
    const extraMinors = [lucun?.name, tianma?.name].filter(Boolean).join(',');
    const adjStars = p.adjectiveStars.map(s => s.name).join(',');
    const marker = p.isOriginalPalace ? ' [命]' : '';
    const bodyMark = p.isBodyPalace ? ' [身]' : '';
    const range = `[${p.decadal.range[0]}-${p.decadal.range[1]}岁]`;
    console.log(`${i.toString().padStart(2)} ${p.earthlyBranch} ${p.heavenlyStem}${p.earthlyBranch} ${p.name.padEnd(2)}${marker}${bodyMark} ${range.padEnd(10)} ${majors} | 六吉:${jiList} | 六煞:${shaList} | 禄马:${extraMinors} | 杂曜:${adjStars} | 长生:${p.changsheng12} 博士:${p.boshi12}`);
  });

  // 大限顺逆验证
  const yearGan = a.chineseDate.split(' ')[0][0];
  const isYangGan = ['甲','丙','戊','庚','壬'].includes(yearGan);
  const expectedShun = (gender === 'male' && isYangGan) || (gender === 'female' && !isYangGan);
  console.log(`\n大限方向: ${expectedShun ? '顺行(阳男阴女)' : '逆行(阴男阳女)'} (年干${yearGan}属${isYangGan?'阳':'阴'})`);
  console.log('大限年龄序列(寅→丑):', a.palaces.map(p => `${p.name}${p.decadal.range[0]}-${p.decadal.range[1]}`).join(' | '));
}

// 测试3组参数
testCase(1990, 6, 15, 0, 'male', '测试1: 1990-06-15 0:00 男');
testCase(1985, 3, 20, 12, 'female', '测试2: 1985-03-20 12:00 女');
testCase(1995, 11, 8, 6, 'male', '测试3: 1995-11-08 6:00 男');
