/**
 * 八字排盘3组用例验证脚本 (v17.7)
 * 对标吉时雨基准，使用 lunar-javascript 库直接计算
 * 
 * 用例1: 1982-10-13 08:00 男
 * 用例2: 1990-05-15 12:00 男
 * 用例3: 2026-08-02 10:00 男
 */

const { Solar, Lunar, EightChar } = require('lunar-javascript');

function testBazi(year, month, day, hour, gender) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`用例: ${year}-${month}-${day} ${hour}:00 ${gender}`);
  console.log(`${'='.repeat(60)}`);

  // 创建 Solar 对象
  const solar = Solar.fromYmdHms(year, month, day, hour, 0, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  ec.setSect(2); // 精确模式

  // 农历信息
  console.log(`\n【农历信息】`);
  console.log(`  农历: ${lunar.toString()}`);
  console.log(`  公历: ${solar.toString()}`);

  // 四柱
  console.log(`\n【四柱干支】`);
  console.log(`  年柱: ${ec.getYear()} (${ec.getYearGan()}${ec.getYearZhi()})`);
  console.log(`  月柱: ${ec.getMonth()} (${ec.getMonthGan()}${ec.getMonthZhi()})`);
  console.log(`  日柱: ${ec.getDay()} (${ec.getDayGan()}${ec.getDayZhi()})`);
  console.log(`  时柱: ${ec.getTime()} (${ec.getTimeGan()}${ec.getTimeZhi()})`);

  // 十神
  console.log(`\n【十神】`);
  console.log(`  年干十神: ${ec.getYearShiShenGan()}`);
  console.log(`  月干十神: ${ec.getMonthShiShenGan()}`);
  console.log(`  日干十神: ${ec.getDayShiShenGan()} (日主)`);
  console.log(`  时干十神: ${ec.getTimeShiShenGan()}`);

  // 地支藏干
  console.log(`\n【藏干】`);
  console.log(`  年支藏干: ${ec.getYearHideGan().join(',')} → 十神: ${ec.getYearShiShenZhi().join(',')}`);
  console.log(`  月支藏干: ${ec.getMonthHideGan().join(',')} → 十神: ${ec.getMonthShiShenZhi().join(',')}`);
  console.log(`  日支藏干: ${ec.getDayHideGan().join(',')} → 十神: ${ec.getDayShiShenZhi().join(',')}`);
  console.log(`  时支藏干: ${ec.getTimeHideGan().join(',')} → 十神: ${ec.getTimeShiShenZhi().join(',')}`);

  // 地势(十二长生)
  console.log(`\n【地势】`);
  console.log(`  年柱地势: ${ec.getYearDiShi()}`);
  console.log(`  月柱地势: ${ec.getMonthDiShi()}`);
  console.log(`  日柱地势: ${ec.getDayDiShi()}`);
  console.log(`  时柱地势: ${ec.getTimeDiShi()}`);

  // 空亡
  console.log(`\n【空亡】`);
  console.log(`  年柱空亡: ${ec.getYearXunKong()}`);
  console.log(`  月柱空亡: ${ec.getMonthXunKong()}`);
  console.log(`  日柱空亡: ${ec.getDayXunKong()}`);
  console.log(`  时柱空亡: ${ec.getTimeXunKong()}`);

  // 纳音
  console.log(`\n【纳音】`);
  console.log(`  年柱纳音: ${ec.getYearNaYin()}`);
  console.log(`  月柱纳音: ${ec.getMonthNaYin()}`);
  console.log(`  日柱纳音: ${ec.getDayNaYin()}`);
  console.log(`  时柱纳音: ${ec.getTimeNaYin()}`);

  // 大运
  console.log(`\n【大运】`);
  const isMan = gender === '男' ? 1 : 0;
  const yun = ec.getYun(isMan, 2);
  console.log(`  起运年: ${yun.getStartYear()}`);
  console.log(`  起运月: ${yun.getStartMonth()}`);
  console.log(`  起运日: ${yun.getStartDay()}`);
  console.log(`  顺逆: ${yun.isForward() ? '顺行' : '逆行'}`);
  
  const dayunArr = yun.getDaYun(11);
  for (let i = 1; i < dayunArr.length; i++) {
    const dy = dayunArr[i];
    console.log(`  第${i}步大运: ${dy.getGanZhi()} (起${dy.getStartAge()}岁, ${dy.getStartYear()}年)`);
  }

  // 胎元/命宫
  console.log(`\n【其他】`);
  console.log(`  胎元: ${ec.getTaiYuan()} (${ec.getTaiYuanNaYin()})`);
  console.log(`  命宫: ${ec.getMingGong()} (${ec.getMingGongNaYin()})`);
  console.log(`  身宫: ${ec.getShenGong()} (${ec.getShenGongNaYin()})`);

  // 节气
  console.log(`\n【节气】`);
  const prevJie = lunar.getPrevJie();
  const nextJie = lunar.getNextJie();
  console.log(`  前一节: ${prevJie.getName()} (${prevJie.getSolar().toString()})`);
  console.log(`  后一节: ${nextJie.getName()} (${nextJie.getSolar().toString()})`);
}

// 运行3组用例
testBazi(1982, 10, 13, 8, '男');
testBazi(1990, 5, 15, 12, '男');
testBazi(2026, 8, 2, 10, '男');

console.log('\n' + '='.repeat(60));
console.log('验证完成 - 3组用例均已使用 lunar-javascript 计算');
console.log('='.repeat(60));
