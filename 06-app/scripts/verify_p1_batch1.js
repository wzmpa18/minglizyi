/**
 * ============================================================================
 * P1首批三工具交叉校验脚本
 * ============================================================================
 * 用法: cd 06-app && npx tsx scripts/verify_p1_batch1.js
 *
 * 校验模块:
 *   1. 奇门遁甲 (qimen)  - 3组用例
 *   2. 六爻占卜 (liuyao) - 3组用例
 *   3. 八字合婚 (hehun)  - 2组用例
 * ============================================================================
 */

import { calculateQimen } from '../src/algorithm-core/modules/qimen/index.ts';
import { calculateLiuyao } from '../src/algorithm-core/modules/liuyao/index.ts';
import { solarToBazi, calculateHehun } from '../src/algorithm-core/index.ts';

// ============================================================================
// 工具函数
// ============================================================================

const results = { pass: 0, fail: 0, total: 0 };

function section(title) {
  console.log('\n' + '='.repeat(70));
  console.log('  ' + title);
  console.log('='.repeat(70));
}

function subSection(title) {
  console.log('\n  --- ' + title + ' ---');
}

function check(label, condition, detail) {
  results.total++;
  if (condition) {
    results.pass++;
    console.log(`  [PASS] ${label}`);
  } else {
    results.fail++;
    console.log(`  [FAIL] ${label}`);
  }
  if (detail) console.log(`         ${detail}`);
}

// 九宫顺序（用于输出）
const JIUGONG_ORDER = ['坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离'];
const JIUGONG_NUM = { '坎': 1, '坤': 2, '震': 3, '巽': 4, '中': 5, '乾': 6, '兑': 7, '艮': 8, '离': 9 };

// ============================================================================
// 1. 奇门遁甲校验
// ============================================================================

section('1. 奇门遁甲 (qimen) - calculateQimen()');

const qimenCases = [
  { year: 2026, month: 7, day: 31, hour: 8, minute: 0, desc: '2026-7-31 辰时(8时)' },
  { year: 2026, month: 6, day: 28, hour: 18, minute: 0, desc: '2026-6-28 酉时(18时)' },
  { year: 2024, month: 1, day: 1, hour: 12, minute: 0, desc: '2024-1-1 午时(12时)' },
];

for (const c of qimenCases) {
  console.log(`\n【奇门用例${qimenCases.indexOf(c) + 1}】${c.desc}`);
  try {
    const r = calculateQimen({
      year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute,
      panMethod: 'chaibu', anganType: 'zhishi',
    });

    console.log(`  阴阳遁局数: ${r.yinYangDun}${r.juNumber}局 ${r.sanYuan}元`);
    console.log(`  节气区间: ${r.jieqi}`);
    console.log(`  四柱: ${r.siZhu.year} ${r.siZhu.month} ${r.siZhu.day} ${r.siZhu.hour}`);
    console.log(`  值符: ${r.zhiFuZhiShi.zhiFuXingGong[0]} (落${r.zhiFuZhiShi.zhiFuXingGong[1]}宫)`);
    console.log(`  值使: ${r.zhiFuZhiShi.zhiShiMenGong[0]} (落${r.zhiFuZhiShi.zhiShiMenGong[1]}宫)`);
    console.log(`  旬首: ${r.xunShou}  旬空(空亡): ${r.xunKong}`);
    console.log(`  日空: ${r.riKong}  时空: ${r.shiKong}`);
    console.log(`  驿马: ${r.maXing.yiMa}  天马: ${r.maXing.tianMa}  丁马: ${r.maXing.dingMa}`);

    // 九宫数据
    console.log('  九宫盘面（神/星/门/天盘干/地盘干/暗干/地八神）:');
    for (const gong of JIUGONG_ORDER) {
      const p = r.palaceByGua[gong];
      if (!p) continue;
      const num = JIUGONG_NUM[gong];
      let line = `    ${gong}${num}宫: 神=${p.tianShen || '-'} 星=${p.star || '-'} 门=${p.door || '-'}`;
      line += ` 天盘干=${p.tianPanGan} 地盘干=${p.diPanGan} 暗干=${p.anGan || '-'} 地神=${p.diShen || '-'}`;
      const marks = [];
      if (p.kongwang) marks.push('空亡');
      if (p.ma) marks.push('马');
      if (p.jixing) marks.push('击刑');
      if (p.rumu) marks.push('入墓');
      if (p.menpo) marks.push('门迫');
      if (p.zhongGongDiPan) marks.push(`中寄${p.zhongGongDiPan}`);
      if (marks.length > 0) line += ` [${marks.join(',')}]`;
      console.log(line);
    }

    // 校验项
    check(`阴阳遁判定有效`, r.yinYangDun === '阳遁' || r.yinYangDun === '阴遁', r.yinYangDun);
    check(`局数1-9`, r.juNumber >= 1 && r.juNumber <= 9, `${r.juNumber}局`);
    check(`四柱完整`, r.siZhu.year && r.siZhu.month && r.siZhu.day && r.siZhu.hour,
      `${r.siZhu.year} ${r.siZhu.month} ${r.siZhu.day} ${r.siZhu.hour}`);
    check(`值符星有效`, !!r.zhiFuZhiShi.zhiFuXingGong[0], r.zhiFuZhiShi.zhiFuXingGong[0]);
    check(`值使门有效`, !!r.zhiFuZhiShi.zhiShiMenGong[0], r.zhiFuZhiShi.zhiShiMenGong[0]);
    check(`旬首有效`, r.xunShou.length >= 3, r.xunShou);
    check(`空亡为两字`, r.xunKong.length === 2, r.xunKong);
    check(`九宫数据完整(8宫+中宫)`, r.palaces.length === 9, `${r.palaces.length}宫`);

    // 检查八宫都有星门神（中宫除外）
    const bgGongs = ['坎','坤','震','巽','乾','兑','艮','离'];
    let allHaveStarDoor = true;
    for (const bg of bgGongs) {
      const p = r.palaceByGua[bg];
      if (!p || !p.star || !p.door || !p.tianShen) { allHaveStarDoor = false; break; }
    }
    check(`八宫均有星/门/神`, allHaveStarDoor);

    // 检查天盘干地盘干完整
    let allHaveGan = true;
    for (const gong of JIUGONG_ORDER) {
      const p = r.palaceByGua[gong];
      if (!p || !p.tianPanGan || !p.diPanGan) { allHaveGan = false; break; }
    }
    check(`九宫均有天盘干/地盘干`, allHaveGan);

    // 吉门三吉门标记
    const jiMen = ['休门','生门','开门'];
    let jiMenCount = 0;
    for (const bg of bgGongs) {
      const p = r.palaceByGua[bg];
      if (p && jiMen.includes(p.door)) jiMenCount++;
    }
    check(`吉门数量正确(3个)`, jiMenCount === 3, `${jiMenCount}个吉门`);

  } catch (e) {
    check(`${c.desc} 奇门排盘异常`, false, e.message + '\n' + e.stack);
  }
}

// ============================================================================
// 2. 六爻占卜校验
// ============================================================================

section('2. 六爻占卜 (liuyao) - calculateLiuyao()');

// 2a. 时间起卦（当前时间）
subSection('时间起卦（当前时间）');
const now = new Date();
try {
  const r = calculateLiuyao({
    method: 'time',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    question: '测试时间起卦',
  });

  console.log(`  日期: ${r.dateStr} (${r.lunarStr})`);
  console.log(`  四柱: ${r.siZhu.join(' ')}`);
  console.log(`  日辰: ${r.dayGanZhi}  空亡: ${r.kongWang}  驿马: ${r.yiMa}  桃花: ${r.taoHua}`);
  console.log(`  本卦: ${r.benGua.name} (${r.benGua.gong}${r.benGua.gongWuxing})  ${r.benGua.alias || ''}`);
  console.log(`  上卦: ${r.benGua.upperTrigram}  下卦: ${r.benGua.lowerTrigram}`);

  // 世应位置
  const shiYao = r.benGua.yaos.find(y => y.isShi);
  const yingYao = r.benGua.yaos.find(y => y.isYing);
  console.log(`  世爻: 第${shiYao?.position}爻 (${shiYao?.gan}${shiYao?.zhi} ${shiYao?.liuQin})`);
  console.log(`  应爻: 第${yingYao?.position}爻 (${yingYao?.gan}${yingYao?.zhi} ${yingYao?.liuQin})`);

  // 六爻详情
  console.log('  六爻（从初爻到上爻）:');
  const posNames = ['初', '二', '三', '四', '五', '上'];
  for (const y of r.benGua.yaos) {
    let line = `    ${posNames[y.position - 1]}爻: ${y.isYang ? '阳' : '阴'}${y.isDong ? '(动)' : ''} ${y.gan}${y.zhi}`;
    line += ` 六亲=${y.liuQin}(${y.liuQinShort}) 六神=${y.liuShen}`;
    if (y.isShi) line += ' [世]';
    if (y.isYing) line += ' [应]';
    if (y.isKong) line += ' [空]';
    if (y.isYuePo) line += ' [月破]';
    if (y.isRiChong) line += ' [日冲]';
    if (y.fushen) line += ` 伏神=${y.fushen.liuQin}(${y.fushen.gan}${y.fushen.zhi})`;
    if (y.isDong && y.bianGan) {
      line += ` → 变${y.bianGan}${y.bianZhi}(${y.bianLiuQin})`;
    }
    console.log(line);
  }

  // 变卦
  if (r.bianGua) {
    console.log(`  变卦: ${r.bianGua.name} (${r.bianGua.gong}${r.bianGua.gongWuxing})`);
    const dongYaos = r.benGua.yaos.filter(y => y.isDong);
    console.log(`  动爻: ${dongYaos.map(y => `第${y.position}爻`).join(', ')}`);
  } else {
    console.log(`  变卦: 无（静卦，无动爻）`);
  }
  console.log(`  用神: ${r.yongShen}`);

  // 校验
  check(`时间起卦本卦名有效`, !!r.benGua.name && r.benGua.name.length >= 2, r.benGua.name);
  check(`卦宫有效`, !!r.benGua.gong, r.benGua.gong);
  check(`六爻完整(6爻)`, r.benGua.yaos.length === 6, `${r.benGua.yaos.length}爻`);
  check(`有世爻`, !!shiYao, `第${shiYao?.position}爻`);
  check(`有应爻`, !!yingYao, `第${yingYao?.position}爻`);
  check(`世应不同位`, shiYao?.position !== yingYao?.position);
  check(`每爻有干支六亲六神`, r.benGua.yaos.every(y => y.gan && y.zhi && y.liuQin && y.liuShen));
  check(`空亡为两字`, r.kongWang.length === 2, r.kongWang);
  check(`四柱完整`, r.siZhu.every(s => s.length === 2), r.siZhu.join(' '));

} catch (e) {
  check(`时间起卦异常`, false, e.message + '\n' + e.stack);
}

// 2b. 数字起卦（123）
subSection('数字起卦（1,2,3）');
try {
  const r = calculateLiuyao({
    method: 'number',
    year: 2026, month: 7, day: 31, hour: 12,
    number: { upperNum: 1, lowerNum: 2, dongYao: 3 },
    question: '测试数字起卦',
  });

  console.log(`  日期: ${r.dateStr}`);
  console.log(`  本卦: ${r.benGua.name} (${r.benGua.gong}${r.benGua.gongWuxing})`);
  console.log(`  上卦: ${r.benGua.upperTrigram}  下卦: ${r.benGua.lowerTrigram}`);

  const shiYao = r.benGua.yaos.find(y => y.isShi);
  const yingYao = r.benGua.yaos.find(y => y.isYing);
  console.log(`  世爻: 第${shiYao?.position}爻  应爻: 第${yingYao?.position}爻`);

  console.log('  六爻六亲六神:');
  const posNames = ['初', '二', '三', '四', '五', '上'];
  for (const y of r.benGua.yaos) {
    let line = `    ${posNames[y.position - 1]}爻: ${y.isYang ? '阳' : '阴'}${y.isDong ? '(动)' : ''} ${y.gan}${y.zhi}`;
    line += ` ${y.liuQin}(${y.liuQinShort}) ${y.liuShen}`;
    if (y.isShi) line += ' [世]';
    if (y.isYing) line += ' [应]';
    if (y.isDong && y.bianGan) line += ` →变${y.bianGan}${y.bianZhi}(${y.bianLiuQin})`;
    console.log(line);
  }

  if (r.bianGua) {
    console.log(`  变卦: ${r.bianGua.name} (${r.bianGua.gong})`);
  }
  const dongCount = r.benGua.yaos.filter(y => y.isDong).length;
  console.log(`  动爻数: ${dongCount}`);

  check(`数字起卦本卦名有效`, !!r.benGua.name, r.benGua.name);
  check(`六爻完整`, r.benGua.yaos.length === 6);
  check(`世应存在`, !!shiYao && !!yingYao);
  check(`动爻数正确(指定3爻动)`, dongCount === 1, `${dongCount}个动爻`);
  check(`变卦存在(有动爻)`, r.bianGua !== null, r.bianGua?.name);

} catch (e) {
  check(`数字起卦异常`, false, e.message + '\n' + e.stack);
}

// 2c. 手动起卦（六静爻 - 乾为天）
subSection('手动起卦（六静爻：乾为天）');
try {
  // 六静爻：全阳爻(乾为天)
  const r = calculateLiuyao({
    method: 'manual',
    year: 2026, month: 7, day: 31, hour: 10,
    manual: { yaoTypes: ['1', '1', '1', '1', '1', '1'] },
    question: '测试手动起卦六静爻',
  });

  console.log(`  日期: ${r.dateStr}`);
  console.log(`  本卦: ${r.benGua.name} (${r.benGua.gong}${r.benGua.gongWuxing}) ${r.benGua.alias || ''}`);
  console.log(`  上卦: ${r.benGua.upperTrigram}  下卦: ${r.benGua.lowerTrigram}`);

  const shiYao = r.benGua.yaos.find(y => y.isShi);
  const yingYao = r.benGua.yaos.find(y => y.isYing);
  console.log(`  世爻: 第${shiYao?.position}爻  应爻: 第${yingYao?.position}爻`);

  console.log('  六爻（从初爻到上爻）:');
  const posNames = ['初', '二', '三', '四', '五', '上'];
  for (const y of r.benGua.yaos) {
    let line = `    ${posNames[y.position - 1]}爻: ${y.isYang ? '阳' : '阴'} ${y.gan}${y.zhi}`;
    line += ` ${y.liuQin}(${y.liuQinShort}) ${y.liuShen}`;
    if (y.isShi) line += ' [世]';
    if (y.isYing) line += ' [应]';
    if (y.fushen) line += ` 伏${y.fushen.liuQin}`;
    console.log(line);
  }

  console.log(`  变卦: ${r.bianGua ? r.bianGua.name : '无（静卦）'}`);
  const dongCount = r.benGua.yaos.filter(y => y.isDong).length;
  console.log(`  动爻数: ${dongCount}（静卦应为0）`);

  check(`手动起卦为乾为天`, r.benGua.name === '乾为天', r.benGua.name);
  check(`乾宫卦`, r.benGua.gong === '乾宫', r.benGua.gong);
  check(`六冲卦(八纯卦)`, r.benGua.alias === '六冲', r.benGua.alias || '无');
  check(`世爻在上爻(第6爻)`, shiYao?.position === 6, `第${shiYao?.position}爻`);
  check(`应爻在三爻(第3爻)`, yingYao?.position === 3, `第${yingYao?.position}爻`);
  check(`无动爻(静卦)`, dongCount === 0, `${dongCount}个动爻`);
  check(`无变卦(静卦)`, r.bianGua === null);
  check(`纳甲正确(乾卦:子寅辰午申戌)`,
    r.benGua.yaos.map(y => y.zhi).join('') === '子寅辰午申戌',
    r.benGua.yaos.map(y => y.zhi).join(''));

} catch (e) {
  check(`手动起卦异常`, false, e.message + '\n' + e.stack);
}

// ============================================================================
// 3. 八字合婚校验
// ============================================================================

section('3. 八字合婚 (hehun) - solarToBazi() + calculateHehun()');

const hehunCases = [
  {
    male: { year: 1990, month: 5, day: 15, hour: 12, minute: 0, gender: 'male', desc: '1990-5-15 12:00 男' },
    female: { year: 1992, month: 8, day: 20, hour: 14, minute: 0, gender: 'female', desc: '1992-8-20 14:00 女' },
  },
  {
    male: { year: 1985, month: 10, day: 3, hour: 8, minute: 0, gender: 'male', desc: '1985-10-3 8:00 男' },
    female: { year: 1990, month: 5, day: 15, hour: 12, minute: 0, gender: 'female', desc: '1990-5-15 12:00 女' },
  },
];

for (let ci = 0; ci < hehunCases.length; ci++) {
  const c = hehunCases[ci];
  console.log(`\n【合婚用例${ci + 1}】${c.male.desc} vs ${c.female.desc}`);
  try {
    const maleBazi = solarToBazi(c.male);
    const femaleBazi = solarToBazi(c.female);
    const r = calculateHehun(maleBazi, femaleBazi);

    // 男方八字
    console.log(`  男方: ${c.male.desc}`);
    console.log(`    生肖: ${r.male.shengxiao}`);
    const mPillars = r.male.pillars.map(p => p.ganzhi).join(' ');
    console.log(`    四柱: ${mPillars}`);
    const mWx = r.male.wuxingCount;
    console.log(`    五行: 金${mWx.金} 木${mWx.木} 水${mWx.水} 火${mWx.火} 土${mWx.土}`);
    console.log(`    日主: ${r.male.dayGan}${r.male.dayZhi}`);
    if (r.male.shenQiangRuo) console.log(`    身强身弱: ${r.male.shenQiangRuo}`);
    if (r.male.mainPattern) console.log(`    格局: ${r.male.mainPattern}`);

    // 女方八字
    console.log(`  女方: ${c.female.desc}`);
    console.log(`    生肖: ${r.female.shengxiao}`);
    const fPillars = r.female.pillars.map(p => p.ganzhi).join(' ');
    console.log(`    四柱: ${fPillars}`);
    const fWx = r.female.wuxingCount;
    console.log(`    五行: 金${fWx.金} 木${fWx.木} 水${fWx.水} 火${fWx.火} 土${fWx.土}`);
    console.log(`    日主: ${r.female.dayGan}${r.female.dayZhi}`);
    if (r.female.shenQiangRuo) console.log(`    身强身弱: ${r.female.shenQiangRuo}`);
    if (r.female.mainPattern) console.log(`    格局: ${r.female.mainPattern}`);

    // 评分结果
    console.log(`  综合评分: ${r.totalScore}分`);
    console.log(`  合婚等级: ${r.grade}`);
    console.log(`  等级评语: ${r.gradeDesc}`);

    // 各项分析
    console.log('  8维度分析:');
    for (const item of r.items) {
      const status = item.pass ? '吉' : '凶';
      console.log(`    [${status}] ${item.name}(${item.score}/${item.maxScore}分): ${item.passDesc}`);
      console.log(`         ${item.detail}`);
    }

    console.log(`  总评: ${r.summary}`);

    // 校验
    check(`男方四柱完整(4柱)`, r.male.pillars.length === 4, mPillars);
    check(`女方四柱完整(4柱)`, r.female.pillars.length === 4, fPillars);
    check(`男方生肖有效`, !!r.male.shengxiao, r.male.shengxiao);
    check(`女方生肖有效`, !!r.female.shengxiao, r.female.shengxiao);
    check(`综合评分0-100`, r.totalScore >= 0 && r.totalScore <= 100, `${r.totalScore}分`);
    check(`等级有效`, ['天作之合','上等婚','中等婚','下等婚','需谨慎'].includes(r.grade), r.grade);
    check(`8维度分析完整`, r.items.length === 8, `${r.items.length}项`);
    check(`每项分数0-10`, r.items.every(i => i.score >= 0 && i.score <= 10),
      r.items.map(i => `${i.name}=${i.score}`).join(', '));
    check(`双方日主有效`, !!r.male.dayGan && !!r.female.dayGan,
      `男${r.male.dayGan} vs 女${r.female.dayGan}`);

  } catch (e) {
    check(`合婚用例${ci + 1}异常`, false, e.message + '\n' + e.stack);
  }
}

// ============================================================================
// 验证总结
// ============================================================================

section('验证总结');

console.log(`
  总测试项: ${results.total}
  通过:     ${results.pass}
  失败:     ${results.fail}
  通过率:   ${results.total > 0 ? ((results.pass / results.total) * 100).toFixed(1) : 0}%
`);

if (results.fail === 0) {
  console.log('  P1首批三工具（奇门遁甲/六爻占卜/八字合婚）全部校验通过。\n');
  process.exit(0);
} else {
  console.log(`  有 ${results.fail} 项未通过，请检查相关模块。\n`);
  process.exit(1);
}
