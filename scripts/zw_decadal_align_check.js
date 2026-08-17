// 验证：zwDecadal（引擎宫序）与 decadalData（页面起运年龄序）同索引取值是否错位
const { astro } = require('iztro');
const ZHI_ORDER = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

const cases = [
  [1988, 6, 16, '男'], [1990, 11, 5, '女'], [2000, 1, 1, '男'],
  [1976, 12, 31, '女'], [1995, 8, 8, '男'], [1963, 7, 7, '女'],
];

for (const [y, m, d, g] of cases) {
  const a = astro.bySolar(`${y}-${m}-${d}`, 6, g, true, 'zh-CN');
  // 页面 decadalData：从命宫起，阳男阴女顺(ZHI_ORDER+)，阴男阳女逆
  const mingIdx = a.palaces.findIndex(p => p.name === '命宫');
  const yearGan = a.palaces.find(p => p.name === '命宫'); // 仅占位
  const ganChar = a.solarDate ? '' : '';
  // 年干
  const yg = '甲乙丙丁戊己庚辛壬癸'[(y - 4) % 10];
  const isYang = ['甲', '丙', '戊', '庚', '壬'].includes(yg);
  const isShun = (g === '男' && isYang) || (g === '女' && !isYang);
  const mism = [];
  for (let k = 0; k < 12; k++) {
    const palaceArrIdx = isShun ? (mingIdx + k) % 12 : (mingIdx - k + 36) % 12;
    const ageOrderPalace = a.palaces[palaceArrIdx]; // decadalData[k] 对应宫
    const enginePalace = a.palaces[k];              // zwDecadal[k] 对应宫
    if (ageOrderPalace.heavenlyStem !== enginePalace.heavenlyStem) {
      mism.push(`k=${k}: 年龄序=${ageOrderPalace.heavenlyStem}${ageOrderPalace.earthlyBranch} vs 宫序=${enginePalace.heavenlyStem}${enginePalace.earthlyBranch}`);
    }
  }
  console.log(`${y}-${g} 年干${yg} ${isShun ? '顺' : '逆'}行 命宫${ZHI_ORDER[mingIdx]} → ${mism.length ? '错位! ' + mism.slice(0, 3).join(' ; ') : '偶合一致'}`);
}
