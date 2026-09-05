// 计算八字排盘实例（用于文章真实案例演示）
const { Lunar, Solar } = require('lunar-javascript');

function eightChar(y, mo, d, h, mi) {
  return Lunar.fromDate(new Date(y, mo - 1, d, h, mi, 0)).getEightChar();
}

// 例：2000年1月1日 12:00 出生
const b1 = eightChar(2000, 1, 1, 12, 0);
console.log('=== 案例：2000年1月1日 12:00 ===');
console.log('农历:', Lunar.fromDate(new Date(2000, 0, 1, 12, 0)).toString());
console.log('四柱:', b1.getYear(), b1.getMonth(), b1.getDay(), b1.getTime());
console.log('年柱纳音:', b1.getYearNaYin(), '| 月柱纳音:', b1.getMonthNaYin(), '| 日柱纳音:', b1.getDayNaYin());

// 立春边界案例：2024年2月4日 16:27 前后
console.log('\n=== 立春边界（2024-02-04 16:27 立春）===');
console.log('16:25 年柱:', eightChar(2024, 2, 4, 16, 25).getYear());
console.log('16:29 年柱:', eightChar(2024, 2, 4, 16, 29).getYear());

// 大运（案例1）：男命
const yun = b1.getYun(0);
console.log('\n=== 大运（男命）===');
console.log('阳男顺排:', yun.isForward() ? '是' : '否');
const dayun = yun.getDaYun();
for (let i = 1; i <= 4; i++) {
  const d = dayun[i];
  if (d) console.log(`大运${i}: ${d.getGanZhi()} 起于${d.getStartYear()}岁`);
}
console.log('起运岁数:', yun.getStartYear(), '岁');
