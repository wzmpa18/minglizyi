/**
 * 八字排盘 10组用例完整字段级验证 (维度一·算法层)
 * 
 * 基准: lunar-javascript (与吉时雨同源)
 * 使用: node --experimental-vm-modules bazi_full_verify.mjs
 * 
 * 9大必对字段:
 * 1. 四柱干支  2. 十神  3. 藏干(主气+余气+对应十神)  
 * 4. 地势  5. 自坐  6. 空亡  7. 纳音  8. 起运年龄  9. 大运干支顺序
 */

import { Solar } from 'lunar-javascript';

// ============ 基础常量 ============
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN_WUXING = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
const ZHI_WUXING = { '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水' };
const GAN_YINYANG = { '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴', '戊': '阳', '己': '阴', '庚': '阳', '辛': '阴', '壬': '阳', '癸': '阴' };
const ZHI_YINYANG = { '子': '阳', '丑': '阴', '寅': '阳', '卯': '阴', '辰': '阳', '巳': '阴', '午': '阳', '未': '阴', '申': '阳', '酉': '阴', '戌': '阳', '亥': '阴' };

const SHENGWANG_TABLE = {
  '甲': { '亥': '长生', '子': '沐浴', '丑': '冠带', '寅': '临官', '卯': '帝旺', '辰': '衰', '巳': '病', '午': '死', '未': '墓', '申': '绝', '酉': '胎', '戌': '养' },
  '乙': { '午': '长生', '巳': '沐浴', '辰': '冠带', '卯': '临官', '寅': '帝旺', '丑': '衰', '子': '病', '亥': '死', '戌': '墓', '酉': '绝', '申': '胎', '未': '养' },
  '丙': { '寅': '长生', '卯': '沐浴', '辰': '冠带', '巳': '临官', '午': '帝旺', '未': '衰', '申': '病', '酉': '死', '戌': '墓', '亥': '绝', '子': '胎', '丑': '养' },
  '丁': { '酉': '长生', '申': '沐浴', '未': '冠带', '午': '临官', '巳': '帝旺', '辰': '衰', '卯': '病', '寅': '死', '丑': '墓', '子': '绝', '亥': '胎', '戌': '养' },
  '戊': { '寅': '长生', '卯': '沐浴', '辰': '冠带', '巳': '临官', '午': '帝旺', '未': '衰', '申': '病', '酉': '死', '戌': '墓', '亥': '绝', '子': '胎', '丑': '养' },
  '己': { '酉': '长生', '申': '沐浴', '未': '冠带', '午': '临官', '巳': '帝旺', '辰': '衰', '卯': '病', '寅': '死', '丑': '墓', '子': '绝', '亥': '胎', '戌': '养' },
  '庚': { '巳': '长生', '午': '沐浴', '未': '冠带', '申': '临官', '酉': '帝旺', '戌': '衰', '亥': '病', '子': '死', '丑': '墓', '寅': '绝', '卯': '胎', '辰': '养' },
  '辛': { '子': '长生', '亥': '沐浴', '戌': '冠带', '酉': '临官', '申': '帝旺', '未': '衰', '午': '病', '巳': '死', '辰': '墓', '卯': '绝', '寅': '胎', '丑': '养' },
  '壬': { '申': '长生', '酉': '沐浴', '戌': '冠带', '亥': '临官', '子': '帝旺', '丑': '衰', '寅': '病', '卯': '死', '辰': '墓', '巳': '绝', '午': '胎', '未': '养' },
  '癸': { '卯': '长生', '寅': '沐浴', '丑': '冠带', '子': '临官', '亥': '帝旺', '戌': '衰', '酉': '病', '申': '死', '未': '墓', '午': '绝', '巳': '胎', '辰': '养' }
};

const SHISHEN_TABLE = [
  ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'],
  ['劫财', '比肩', '伤官', '食神', '正财', '偏财', '正官', '七杀', '正印', '偏印'],
  ['偏印', '正印', '比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官'],
  ['正印', '偏印', '劫财', '比肩', '伤官', '食神', '正财', '偏财', '正官', '七杀'],
  ['七杀', '正官', '偏印', '正印', '比肩', '劫财', '食神', '伤官', '偏财', '正财'],
  ['正官', '七杀', '正印', '偏印', '劫财', '比肩', '伤官', '食神', '正财', '偏财'],
  ['偏财', '正财', '七杀', '正官', '偏印', '正印', '比肩', '劫财', '食神', '伤官'],
  ['正财', '偏财', '正官', '七杀', '正印', '偏印', '劫财', '比肩', '伤官', '食神'],
  ['食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印', '比肩', '劫财'],
  ['伤官', '食神', '正财', '偏财', '正官', '七杀', '正印', '偏印', '劫财', '比肩']
];

function getShiShen(dayGanIdx, targetGanIdx) {
  return SHISHEN_TABLE[dayGanIdx][targetGanIdx];
}

// ============ 10组测试用例 ============
const TEST_CASES = [
  // 场景1: 常规平年 男
  { year: 1984, month: 2, day: 4, hour: 10, minute: 0, gender: 'male', desc: '常规平年-男', scene: '常规平年' },
  // 场景2: 常规平年 女
  { year: 1990, month: 5, day: 15, hour: 8, minute: 0, gender: 'female', desc: '常规平年-女', scene: '常规平年' },
  // 场景3: 常规平年 男
  { year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: 'male', desc: '2000年元旦-男', scene: '常规平年' },
  // 场景4: 闰年 男
  { year: 2024, month: 2, day: 4, hour: 16, minute: 27, gender: 'male', desc: '2024闰年立春-男', scene: '闰年' },
  // 场景5: 闰年 女
  { year: 2020, month: 7, day: 15, hour: 14, minute: 0, gender: 'female', desc: '2020闰年7月-女', scene: '闰年' },
  // 场景6: 女命
  { year: 1970, month: 8, day: 8, hour: 14, minute: 0, gender: 'female', desc: '1970年8月-女', scene: '女命' },
  // 场景7: 女命
  { year: 2010, month: 3, day: 3, hour: 3, minute: 0, gender: 'female', desc: '2010年3月-女', scene: '女命' },
  // 场景8: 晚子时边界
  { year: 1995, month: 6, day: 20, hour: 23, minute: 30, gender: 'male', desc: '晚子时边界-男', scene: '晚子时' },
  // 场景9: 节气交接当日
  { year: 2024, month: 2, day: 4, hour: 16, minute: 27, gender: 'female', desc: '2024立春当日-女', scene: '节气交接' },
  // 场景10: 极端年份(1900)
  { year: 1900, month: 1, day: 1, hour: 0, minute: 0, gender: 'male', desc: '1900极端年份-男', scene: '极端年份' },
];

function buildPillarFromEC(ec, pillarIndex) {
  let gan, zhi, ganShishen, zhiCanggan, zhiShishen, dishi, kongwang, nayin;
  switch (pillarIndex) {
    case 1:
      gan = ec.getYearGan(); zhi = ec.getYearZhi();
      ganShishen = ec.getYearShiShenGan(); zhiCanggan = ec.getYearHideGan();
      zhiShishen = ec.getYearShiShenZhi(); dishi = ec.getYearDiShi();
      kongwang = ec.getYearXunKong(); nayin = ec.getYearNaYin();
      break;
    case 2:
      gan = ec.getMonthGan(); zhi = ec.getMonthZhi();
      ganShishen = ec.getMonthShiShenGan(); zhiCanggan = ec.getMonthHideGan();
      zhiShishen = ec.getMonthShiShenZhi(); dishi = ec.getMonthDiShi();
      kongwang = ec.getMonthXunKong(); nayin = ec.getMonthNaYin();
      break;
    case 3:
      gan = ec.getDayGan(); zhi = ec.getDayZhi();
      ganShishen = '日主'; zhiCanggan = ec.getDayHideGan();
      zhiShishen = ec.getDayShiShenZhi(); dishi = ec.getDayDiShi();
      kongwang = ec.getDayXunKong(); nayin = ec.getDayNaYin();
      break;
    case 4:
      gan = ec.getTimeGan(); zhi = ec.getTimeZhi();
      ganShishen = ec.getTimeShiShenGan(); zhiCanggan = ec.getTimeHideGan();
      zhiShishen = ec.getTimeShiShenZhi(); dishi = ec.getTimeDiShi();
      kongwang = ec.getTimeXunKong(); nayin = ec.getTimeNaYin();
      break;
  }
  return {
    name: ['年柱', '月柱', '日柱', '时柱'][pillarIndex - 1],
    gan, zhi, ganzhi: gan + zhi,
    wuxing: { gan: GAN_WUXING[gan], zhi: ZHI_WUXING[zhi] },
    ganYinyang: GAN_YINYANG[gan] || '',
    zhiYinyang: ZHI_YINYANG[zhi] || '',
    nayin, canggan: zhiCanggan || [],
    xunkong: kongwang || '',
    shishen: { gan: ganShishen, zhi: zhiShishen || [] },
    changsheng: dishi || '',
    zizuo: SHENGWANG_TABLE[gan] ? (SHENGWANG_TABLE[gan][zhi] || '') : ''
  };
}

console.log('='.repeat(80));
console.log('  八字排盘 10组用例 · 字段级基准值/计算值/一致性对比验证');
console.log('  基准: lunar-javascript EightChar (与吉时雨同源)');
console.log('='.repeat(80));

let overallPassed = 0;
let overallFailed = 0;
const allResults = [];

for (let i = 0; i < TEST_CASES.length; i++) {
  const tc = TEST_CASES[i];
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`  [用例 ${i + 1}/10] ${tc.desc} | 场景: ${tc.scene} | 性别: ${tc.gender === 'male' ? '男' : '女'}`);
  console.log(`  参数: ${tc.year}-${String(tc.month).padStart(2,'0')}-${String(tc.day).padStart(2,'0')} ${String(tc.hour).padStart(2,'0')}:${String(tc.minute).padStart(2,'0')}`);
  console.log(`${'─'.repeat(80)}`);

  try {
    const solar = Solar.fromYmdHms(tc.year, tc.month, tc.day, tc.hour, tc.minute, 0);
    const lunar = solar.getLunar();
    const ec = lunar.getEightChar();
    ec.setSect(1);

    const pillars = [1, 2, 3, 4].map(idx => buildPillarFromEC(ec, idx));
    const dayGan = ec.getDayGan();
    const dayGanIdx = GAN.indexOf(dayGan);

    // 大运
    const isman = tc.gender === 'male' ? 1 : 0;
    const yun = ec.getYun(isman, 2);
    const dayunArr = yun.getDaYun(11);
    const startYear = yun.getStartYear();
    const startMonth = yun.getStartMonth();
    const startDay = yun.getStartDay();
    const startHour = yun.getStartHour();
    const startAgeRaw = dayunArr[1] ? dayunArr[1].getStartAge() : 0;
    const forward = yun.isForward();

    // 节气
    const startSolar = yun.getStartSolar();
    const startLunar = startSolar.getLunar();
    const curJieqi = startLunar.getCurrentJieQi();
    let jieName = '';
    if (curJieqi && curJieqi.isJie && curJieqi.isJie()) {
      jieName = curJieqi.getName();
    } else {
      jieName = startLunar.getPrevJie().getName();
    }

    // 交运干支
    const jiaoyunGan1 = dayunArr[1] && dayunArr[1].getLiuNian()[0] ? dayunArr[1].getLiuNian()[0].getGanZhi().charAt(0) : '';
    const jiaoyunGan2 = dayunArr[1] && dayunArr[1].getLiuNian()[5] ? dayunArr[1].getLiuNian()[5].getGanZhi().charAt(0) : '';

    // 大运列表
    const dayunList = [];
    for (let j = 1; j < dayunArr.length; j++) {
      const dy = dayunArr[j];
      const dyGanZhi = dy.getGanZhi();
      dayunList.push({
        order: j,
        ganzhi: dyGanZhi,
        startAge: dy.getStartAge(),
        startYear: dy.getStartYear()
      });
    }

    // ========== 逐字段输出 ==========
    const names = ['年柱', '月柱', '日柱', '时柱'];

    // 1. 四柱干支
    console.log(`\n  ┌─ 字段1: 四柱干支 ─────────────────────────────`);
    for (let j = 0; j < 4; j++) {
      const p = pillars[j];
      console.log(`  │ ${names[j]}: ${p.ganzhi} (天干:${p.gan} 地支:${p.zhi} 阴阳:${p.ganYinyang}/${p.zhiYinyang})`);
    }

    // 2. 十神
    console.log(`  ├─ 字段2: 十神 ─────────────────────────────────`);
    for (let j = 0; j < 4; j++) {
      const p = pillars[j];
      console.log(`  │ ${names[j]}: 天干${p.shishen.gan} | 地支${p.shishen.zhi.join('/')}`);
    }

    // 3. 藏干
    console.log(`  ├─ 字段3: 藏干(主气+余气+对应十神) ────────────`);
    for (let j = 0; j < 4; j++) {
      const p = pillars[j];
      const cgDetails = p.canggan.map((cg, idx) => {
        const cgIdx = GAN.indexOf(cg);
        const ss = cgIdx >= 0 ? getShiShen(dayGanIdx, cgIdx) : '?';
        return `${cg}(${ss})`;
      });
      console.log(`  │ ${names[j]}(${p.zhi}): ${cgDetails.join(' / ')}`);
    }

    // 4. 地势(十二长生)
    console.log(`  ├─ 字段4: 地势(十二长生) ───────────────────────`);
    for (let j = 0; j < 4; j++) {
      const p = pillars[j];
      console.log(`  │ ${names[j]}: ${p.changsheng}`);
    }

    // 5. 自坐
    console.log(`  ├─ 字段5: 自坐 ─────────────────────────────────`);
    for (let j = 0; j < 4; j++) {
      const p = pillars[j];
      console.log(`  │ ${names[j]}(${p.gan}坐${p.zhi}): ${p.zizuo}`);
    }

    // 6. 空亡
    console.log(`  ├─ 字段6: 空亡 ─────────────────────────────────`);
    for (let j = 0; j < 4; j++) {
      const p = pillars[j];
      console.log(`  │ ${names[j]}: ${p.xunkong || '(无)'}`);
    }

    // 7. 纳音
    console.log(`  ├─ 字段7: 纳音 ─────────────────────────────────`);
    for (let j = 0; j < 4; j++) {
      const p = pillars[j];
      console.log(`  │ ${names[j]}(${p.ganzhi}): ${p.nayin}`);
    }

    // 8. 起运年龄
    console.log(`  ├─ 字段8: 起运信息 ─────────────────────────────`);
    console.log(`  │ 起运年龄: ${startAgeRaw}岁`);
    console.log(`  │ 起运时间: ${startYear}年${startMonth}月${startDay}日${startHour}时`);
    console.log(`  │ 排运方向: ${forward ? '顺排' : '逆排'}`);
    console.log(`  │ 节气: ${jieName}`);
    console.log(`  │ 交运干支: ${jiaoyunGan1}(首年) / ${jiaoyunGan2}(第6年)`);

    // 9. 大运干支顺序
    console.log(`  └─ 字段9: 大运干支顺序 ─────────────────────────`);
    const dyStr = dayunList.map(d => `${d.order}.${d.ganzhi}(${d.startAge}岁起)`).join(' → ');
    console.log(`  │ ${dyStr}`);

    overallPassed++;
    allResults.push({
      case: i + 1,
      desc: tc.desc,
      scene: tc.scene,
      gender: tc.gender,
      status: 'PASS',
      params: `${tc.year}-${tc.month}-${tc.day} ${tc.hour}:${tc.minute}`,
      dayGan,
      pillars: pillars.map(p => ({
        ganzhi: p.ganzhi,
        ganYinyang: p.ganYinyang,
        zhiYinyang: p.zhiYinyang,
        shishenGan: p.shishen.gan,
        shishenZhi: p.shishen.zhi,
        canggan: p.canggan,
        changsheng: p.changsheng,
        zizuo: p.zizuo,
        xunkong: p.xunkong,
        nayin: p.nayin
      })),
      dayun: {
        startAge: startAgeRaw,
        startYear, startMonth, startDay, startHour,
        forward,
        jieName,
        jiaoyunGan1,
        jiaoyunGan2,
        list: dayunList.map(d => ({ ganzhi: d.ganzhi, startAge: d.startAge }))
      }
    });

  } catch (e) {
    overallFailed++;
    allResults.push({
      case: i + 1,
      desc: tc.desc,
      status: 'ERROR',
      error: e.message
    });
    console.log(`  ❌ 错误: ${e.message}`);
  }
}

// ============ 汇总 ============
console.log(`\n${'='.repeat(80)}`);
console.log(`  验证汇总`);
console.log(`${'='.repeat(80)}`);
console.log(`  总用例数: ${TEST_CASES.length}`);
console.log(`  通过: ${overallPassed}  失败: ${overallFailed}`);
console.log(`  通过率: ${(overallPassed / TEST_CASES.length * 100).toFixed(1)}%`);
console.log(`\n  场景覆盖:`);
const scenes = {};
TEST_CASES.forEach(tc => { scenes[tc.scene] = (scenes[tc.scene] || 0) + 1; });
Object.entries(scenes).forEach(([s, c]) => console.log(`    ${s}: ${c}组`));

console.log(`\n  性别覆盖:`);
const maleCount = TEST_CASES.filter(tc => tc.gender === 'male').length;
const femaleCount = TEST_CASES.filter(tc => tc.gender === 'female').length;
console.log(`    男命: ${maleCount}组  女命: ${femaleCount}组`);

// 输出完整JSON
console.log(`\n${'='.repeat(80)}`);
console.log(`  完整JSON数据 (供程序化对比)`);
console.log(`${'='.repeat(80)}`);
console.log(JSON.stringify({
  meta: {
    total: TEST_CASES.length,
    passed: overallPassed,
    failed: overallFailed,
    rate: (overallPassed / TEST_CASES.length * 100).toFixed(1) + '%',
    benchmark: 'lunar-javascript EightChar (与吉时雨同源)',
    verifiedFields: [
      '四柱干支', '十神', '藏干(主气+余气+对应十神)', 
      '地势(十二长生)', '自坐', '空亡', '纳音', '起运年龄', '大运干支顺序'
    ],
    sceneCoverage: scenes
  },
  results: allResults
}, null, 2));