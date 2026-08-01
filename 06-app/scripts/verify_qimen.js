// 奇门遁甲排盘验证脚本
const path = require('path');

// 使用tsx运行TypeScript
require('tsx/cjs');
const { calculateQimen } = require(path.join(__dirname, '../src/algorithm-core/modules/qimen/index.ts'));

const testCases = [
  { date: [2026, 7, 31], hour: 8, desc: '2026-7-31 辰时' },
  { date: [2026, 6, 28], hour: 18, desc: '2026-6-28 酉时' },
  { date: [2024, 1, 1], hour: 12, desc: '2024-1-1 午时' },
];

console.log('=== 奇门遁甲排盘验证 ===\n');

testCases.forEach((tc, idx) => {
  try {
    const r = calculateQimen(tc.date, tc.hour, 'chaibu');
    console.log(`【测试用例${idx+1}】${tc.desc}`);
    console.log(`  阴阳遁/局数: ${r.yinYangDun}${r.juNumber}局 ${r.sanYuan}元`);
    console.log(`  节气: ${r.jieqi}`);
    console.log(`  四柱: ${r.siZhu.year}-${r.siZhu.month}-${r.siZhu.day}-${r.siZhu.hour}`);
    console.log(`  值符星: ${r.zhiFuZhiShi.zhiFuXingGong[0]} (落${r.zhiFuZhiShi.zhiFuXingGong[1]}宫)`);
    console.log(`  值使门: ${r.zhiFuZhiShi.zhiShiMenGong[0]} (落${r.zhiFuZhiShi.zhiShiMenGong[1]}宫)`);
    console.log(`  旬首: ${r.xunShou}, 空亡: ${r.xunKong.join('')}`);
    console.log(`  驿马: ${r.maXing.yiMa}`);
    
    // 检查九宫关键数据
    const gongs = [1,2,3,4,6,7,8,9];
    console.log('  九宫数据:');
    gongs.forEach(g => {
      const p = r.palaces[g];
      console.log(`    ${p.bagua}${p.dir}${g}宫: 神=${p.tianShen} 星=${p.star} 门=${p.door} 天干=${p.tianPanGan}/${p.diPanGan}` + 
        (p.kongwang ? ' [空]' : '') + (p.ma ? ' [马]' : '') + (p.jixing ? ' [击刑]' : '') + (p.rumu ? ' [入墓]' : '') + (p.menpo ? ' [门迫]' : ''));
    });
    console.log('');
  } catch(e) {
    console.error(`【测试用例${idx+1}】错误:`, e.message);
    console.error(e.stack);
  }
});

console.log('=== 验证完成 ===');
