/**
 * ============================================================================
 * 伏神对拍脚本 —— FuShenCore vs 吉时雨(ji.js.cn)开源基准 全64卦差分验证
 * ============================================================================
 *
 * 用途：
 *   用户指令（FINAL-CLEAN-RC-01）：伏神数据在开源对标「吉时雨」中已有，
 *   本脚本以吉时雨公开的排盘规则为基准，对拍本项目 FuShenCore 的输出。
 *
 * 基准来源（传统京房纳甲通例，与吉时雨 master 分支 6yao.js 公开行为一致）：
 *   - 卦宫：归魂卦归内卦宫；世爻在[0,1,2,5]→外卦为宫；否则内卦全变为宫
 *   - 世应：八纯世5 / 全异世2 / 天同世1 / 天异世4 / 地同世3 / 地异世0 /
 *           人同世3(游魂) / 人异世2(归魂)；应爻=隔三位
 *   - 伏神（A类·传统缺亲）：卦中缺某六亲时，取本宫八纯卦中该六亲所在爻
 *           的干支，平移到本卦同爻位（隐于飞神之下）
 *   - 隐藏地支层（B类·本项目产品定义）：每爻取本宫八纯卦同爻位干支六亲
 *
 * 合规说明：
 *   - 零行复制吉时雨 AGPL-3.0 源码；本脚本为独立编写的对拍基准实现，
 *     数据表均为公开传统命理知识（纳甲表/五行生克），本项目 MIT 实现中
 *     同值数据已先行逐项人工核对一致。
 *   - 本脚本仅用于开发期验证，不进入产品运行时。
 *
 * 运行：
 *   node scripts/fushen-jishiyu-verify.mjs
 *   （需先编译：见脚本内 compile 提示，或直接运行——脚本自动调用 tsc）
 * ============================================================================
 */

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(PROJECT_ROOT, '.tmp-fushen-verify');
const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// 一、编译 FuShenCore（TS → CJS）
// ---------------------------------------------------------------------------
if (!fs.existsSync(path.join(OUT_DIR, 'modules/liuyao/index.js'))) {
  console.log('[compile] tsc 编译 algorithm-core/modules/liuyao ...');
  execSync(
    `npx tsc src/algorithm-core/modules/liuyao/index.ts --outDir .tmp-fushen-verify --module commonjs --esModuleInterop --skipLibCheck --target es2020 --moduleResolution node`,
    { cwd: PROJECT_ROOT, stdio: 'inherit' },
  );
}

const core = require(path.join(OUT_DIR, 'modules/liuyao/index.js'));
const { getFuShenForHexagram, getGongNameForHexagram, calculateLiuyao } = core;

// ---------------------------------------------------------------------------
// 二、对拍基准实现（传统京房纳甲通例 · 与吉时雨公开行为一致）
// ---------------------------------------------------------------------------

/** 三爻卦码→卦名（上爻在前：char0=天爻，char2=地爻）——吉时雨约定 */
const guaCodeMap = {
  '111': '乾', '000': '坤', '001': '震', '010': '坎',
  '100': '艮', '110': '巽', '101': '离', '011': '兑',
};

/** 归魂卦列表 [内卦, 外卦] */
const guiHunList = [
  ['离', '乾'], ['震', '兑'], ['乾', '离'], ['兑', '震'],
  ['艮', '巽'], ['坤', '坎'], ['巽', '艮'], ['坎', '坤'],
];

/** 天干纳甲 */
const ganMap = {
  '乾': { inner: '甲', outer: '壬' }, '坤': { inner: '乙', outer: '癸' },
  '艮': { inner: '丙', outer: '丙' }, '兑': { inner: '丁', outer: '丁' },
  '坎': { inner: '戊', outer: '戊' }, '离': { inner: '己', outer: '己' },
  '震': { inner: '庚', outer: '庚' }, '巽': { inner: '辛', outer: '辛' },
};

/** 地支纳甲 */
const zhiMap = {
  '乾': { inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  '兑': { inner: ['巳', '卯', '丑'], outer: ['亥', '酉', '未'] },
  '离': { inner: ['卯', '丑', '亥'], outer: ['酉', '未', '巳'] },
  '震': { inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  '巽': { inner: ['丑', '亥', '酉'], outer: ['未', '巳', '卯'] },
  '坎': { inner: ['寅', '辰', '午'], outer: ['申', '戌', '子'] },
  '艮': { inner: ['辰', '午', '申'], outer: ['戌', '子', '寅'] },
  '坤': { inner: ['未', '巳', '卯'], outer: ['丑', '亥', '酉'] },
};

const zhiWuXing = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

const guaWuXingMap = {
  '乾': '金', '兑': '金', '艮': '土', '坤': '土',
  '震': '木', '巽': '木', '坎': '水', '离': '火',
};

/** 六亲：短名→全名 */
const QIN_FULL = { '孙': '子孙', '父': '父母', '兄': '兄弟', '财': '妻财', '官': '官鬼' };

/** 卦名（上爻在左） */
const GUAMING = {
  '000000': '坤为地', '100000': '山地剥', '010000': '水地比', '110000': '风地观',
  '001000': '雷地豫', '101000': '火地晋', '011000': '泽地萃', '111000': '天地否',
  '000100': '地山谦', '100100': '艮为山', '010100': '水山蹇', '110100': '风山渐',
  '001100': '雷山小过', '101100': '火山旅', '011100': '泽山咸', '111100': '天山遁',
  '000010': '地水师', '100010': '山水蒙', '010010': '坎为水', '110010': '风水涣',
  '001010': '雷水解', '101010': '火水未济', '011010': '泽水困', '111010': '天水讼',
  '000110': '地风升', '100110': '山风蛊', '010110': '水风井', '110110': '巽为风',
  '001110': '雷风恒', '101110': '火风鼎', '011110': '泽风大过', '111110': '天风姤',
  '000001': '地雷复', '100001': '山雷颐', '010001': '水雷屯', '110001': '风雷益',
  '001001': '震为雷', '101001': '火雷噬嗑', '011001': '泽雷随', '111001': '天雷无妄',
  '000101': '地火明夷', '100101': '山火贲', '010101': '水火既济', '110101': '风火家人',
  '001101': '雷火丰', '101101': '离为火', '011101': '泽火革', '111101': '天火同人',
  '000011': '地泽临', '100011': '山泽损', '010011': '水泽节', '110011': '风泽中孚',
  '001011': '雷泽归妹', '101011': '火泽睽', '011011': '兑为泽', '111011': '天泽履',
  '000111': '地天泰', '100111': '山天大畜', '010111': '水天需', '110111': '风天小畜',
  '001111': '雷天大壮', '101111': '火天大有', '011111': '泽天夬', '111111': '乾为天',
};

/** 八卦爻阴阳（index0=初爻/下爻） */
const TRIGRAM_LINES = {
  '乾': [1, 1, 1], '坤': [0, 0, 0], '震': [1, 0, 0], '坎': [0, 1, 0],
  '艮': [0, 0, 1], '巽': [0, 1, 1], '离': [1, 0, 1], '兑': [1, 1, 0],
};

/** 三爻(下→上)→上爻在前的卦码（兼容 number/boolean） */
function toTopFirstCode(lines) {
  const b = v => (v ? 1 : 0);
  return `${b(lines[2])}${b(lines[1])}${b(lines[0])}`;
}

/** 基准：计算世爻位置（京房天地人法） */
function refCalcShi(innerTopCode, outerTopCode) {
  const tianSame = innerTopCode[0] === outerTopCode[0];
  const renSame = innerTopCode[1] === outerTopCode[1];
  const diSame = innerTopCode[2] === outerTopCode[2];
  if (tianSame && renSame && diSame) return 5;
  if (!tianSame && !renSame && !diSame) return 2;
  if (tianSame && !renSame && !diSame) return 1;
  if (!tianSame && renSame && diSame) return 4;
  if (!tianSame && !renSame && diSame) return 3;
  if (tianSame && renSame && !diSame) return 0;
  if (!tianSame && renSame && !diSame) return 3;
  return 2;
}

/** 基准：计算卦宫 */
function refCalcGuaGong(yaoYangFlags, innerName, outerName) {
  if (guiHunList.some(([i, o]) => i === innerName && o === outerName)) return innerName;
  const innerTopCode = toTopFirstCode(yaoYangFlags.slice(0, 3));
  const outerTopCode = toTopFirstCode(yaoYangFlags.slice(3, 6));
  const shiIdx = refCalcShi(innerTopCode, outerTopCode);
  if ([0, 1, 2, 5].includes(shiIdx)) return outerName;
  const reversedInner = yaoYangFlags.slice(0, 3).map(v => (v ? 0 : 1)).reverse().join('');
  return guaCodeMap[reversedInner];
}

/** 生克判定：宫五行self 与 爻五行target → 六亲短名（吉时雨 wuXing['被生'] 等价逻辑） */
function refLiuQin(self, target) {
  const SHENG = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };   // 我生→孙
  const BEI_SHENG = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' }; // 生我→父
  const KE = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };       // 我克→财
  if (self === target) return '兄';
  if (SHENG[self] === target) return '孙';
  if (BEI_SHENG[self] === target) return '父';
  if (KE[self] === target) return '财';
  return '官';
}

/** 基准：本宫八纯卦某爻位(1-6)的干支六亲（短名） */
function refPalaceYao(gong, pos) {
  const isInner = pos <= 3;
  const side = isInner ? 'inner' : 'outer';
  const idx = isInner ? pos - 1 : pos - 4;
  const gan = ganMap[gong][side];
  const zhi = zhiMap[gong][side][idx];
  const qin = refLiuQin(guaWuXingMap[gong], zhiWuXing[zhi]);
  return { gan, zhi, qin };
}

/**
 * 基准：完整伏神计算（吉时雨公开行为）
 * @returns { gong, palaceYaos[6], fushenMap: {爻位: {liuQin全名, gan, zhi}} }
 */
function refFushen(yaoYangFlags) {
  const innerLines = yaoYangFlags.slice(0, 3);
  const outerLines = yaoYangFlags.slice(3, 6);
  const innerName = guaCodeMap[toTopFirstCode(innerLines)];
  const outerName = guaCodeMap[toTopFirstCode(outerLines)];
  const gong = refCalcGuaGong(yaoYangFlags, innerName, outerName);

  // 本卦装卦后的六亲集合（短名）
  const existingQin = new Set();
  for (let i = 0; i < 6; i++) {
    const trig = i < 3 ? innerName : outerName;
    const side = i < 3 ? 'inner' : 'outer';
    const idx = i < 3 ? i : i - 3;
    const zhi = zhiMap[trig][side][idx];
    existingQin.add(refLiuQin(guaWuXingMap[gong], zhiWuXing[zhi]));
  }

  // 本宫八纯卦全部爻
  const palaceYaos = [];
  for (let pos = 1; pos <= 6; pos++) {
    palaceYaos.push({ pos, ...refPalaceYao(gong, pos) });
  }

  // 缺亲→伏神（放在本卦同爻位）
  const fushenMap = {};
  for (const q of ['孙', '父', '兄', '财', '官']) {
    if (!existingQin.has(q)) {
      for (const py of palaceYaos) {
        if (py.qin === q) {
          fushenMap[py.pos] = { liuQin: QIN_FULL[q], gan: py.gan, zhi: py.zhi };
        }
      }
    }
  }

  return { gong, innerName, outerName, palaceYaos, existingQin, fushenMap };
}

// ---------------------------------------------------------------------------
// 三、全64卦差分对拍
// ---------------------------------------------------------------------------

const TRIGRAMS = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
let totalChecks = 0;
let failures = 0;
const failDetails = [];

function check(cond, label) {
  totalChecks++;
  if (!cond) {
    failures++;
    failDetails.push(label);
  }
}

console.log('='.repeat(72));
console.log('伏神对拍：FuShenCore vs 吉时雨基准 —— 全64卦 × 每爻');
console.log('='.repeat(72));

for (const inner of TRIGRAMS) {
  for (const outer of TRIGRAMS) {
    const yaoYangFlags = [...TRIGRAM_LINES[inner], ...TRIGRAM_LINES[outer]];
    const topFirst = yaoYangFlags.slice().reverse().join('');
    const guaName = GUAMING[topFirst] || `${inner}/${outer}`;

    // 基准
    const ref = refFushen(yaoYangFlags);

    // FuShenCore
    const coreInput = { yaoYangFlags, innerTrigram: inner, outerTrigram: outer };
    const coreLayers = getFuShenForHexagram(coreInput);
    const coreGongName = getGongNameForHexagram(coreInput);

    // 1) 卦宫
    check(coreGongName === `${ref.gong}宫`,
      `${guaName} 卦宫: core=${coreGongName} ref=${ref.gong}宫`);

    // 2) B类隐藏地支层：每爻的宫卦干支六亲
    for (let i = 0; i < 6; i++) {
      const hb = coreLayers[i];
      const rp = ref.palaceYaos[i];
      check(hb.position === rp.pos, `${guaName} 第${i + 1}爻 position: core=${hb.position} ref=${rp.pos}`);
      check(hb.gan === rp.gan, `${guaName} 第${i + 1}爻 伏干: core=${hb.gan} ref=${rp.gan}`);
      check(hb.zhi === rp.zhi, `${guaName} 第${i + 1}爻 伏支: core=${hb.zhi} ref=${rp.zhi}`);
      check(hb.liuQin === QIN_FULL[rp.qin], `${guaName} 第${i + 1}爻 伏六亲: core=${hb.liuQin} ref=${QIN_FULL[rp.qin]}`);
      // 3) A类缺亲标记：isMissingLiuQin ⇔ 该爻在基准fushenMap中
      const refHasFushen = ref.fushenMap[i + 1] !== undefined;
      check(hb.isMissingLiuQin === refHasFushen,
        `${guaName} 第${i + 1}爻 isMissingLiuQin: core=${hb.isMissingLiuQin} ref=${refHasFushen}`);
    }

    // 4) A类伏神集合：位置+干支+六亲 完全一致
    const coreAMap = {};
    coreLayers.forEach(hb => {
      if (hb.isMissingLiuQin) coreAMap[hb.position] = { liuQin: hb.liuQin, gan: hb.gan, zhi: hb.zhi };
    });
    const refKeys = Object.keys(ref.fushenMap).map(Number).sort((a, b) => a - b);
    const coreKeys = Object.keys(coreAMap).map(Number).sort((a, b) => a - b);
    check(JSON.stringify(refKeys) === JSON.stringify(coreKeys),
      `${guaName} 伏神爻位集合: core=[${coreKeys}] ref=[${refKeys}]`);
    for (const pos of refKeys) {
      const c = coreAMap[pos];
      const r = ref.fushenMap[pos];
      check(c && c.gan === r.gan && c.zhi === r.zhi && c.liuQin === r.liuQin,
        `${guaName} 伏神@${pos}爻: core=${c ? `${c.liuQin}${c.gan}${c.zhi}` : '缺失'} ref=${r.liuQin}${r.gan}${r.zhi}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 四、全管线抽检（calculateLiuyao 手动起卦 → yaos 挂载核对）
// ---------------------------------------------------------------------------
console.log('-'.repeat(72));
console.log('全管线抽检：calculateLiuyao → yaos[].fushen / yaos[].hiddenBranch');

const PIPELINE_CASES = [
  // 天山遁（乾宫二世，下艮上乾）
  { name: '天山遁', yaoTypes: ['0', '0', '1', '1', '1', '1'] },
  // 乾为天（八纯卦，六亲俱全）
  { name: '乾为天', yaoTypes: ['1', '1', '1', '1', '1', '1'] },
  // 火山旅（离宫四世，下艮上离）
  { name: '火山旅', yaoTypes: ['0', '0', '1', '1', '0', '1'] },
  // 雷地豫（震宫一世，下坤上震）
  { name: '雷地豫', yaoTypes: ['0', '0', '0', '1', '0', '0'] },
  // 水火既济（坎宫三世，下离上坎）
  { name: '水火既济', yaoTypes: ['1', '0', '1', '0', '1', '0'] },
];

for (const tc of PIPELINE_CASES) {
  const result = calculateLiuyao({
    method: 'manual',
    year: 2026, month: 8, day: 21, hour: 14,
    manual: { yaoTypes: tc.yaoTypes },
  });
  const yaoYangFlags = tc.yaoTypes.map(t => t === '1' || t === '1o');
  const ref = refFushen(yaoYangFlags);

  check(result.benGua.name === tc.name, `管线 ${tc.name}: 卦名=${result.benGua.name}`);
  check(result.benGua.gong === `${ref.gong}宫`, `管线 ${tc.name}: 卦宫=${result.benGua.gong} ref=${ref.gong}宫`);

  for (let i = 0; i < 6; i++) {
    const y = result.benGua.yaos[i];
    const refHasFushen = ref.fushenMap[i + 1] !== undefined;
    // A类 fushen 字段
    if (refHasFushen) {
      const r = ref.fushenMap[i + 1];
      check(y.fushen && y.fushen.gan === r.gan && y.fushen.zhi === r.zhi && y.fushen.liuQin === r.liuQin,
        `管线 ${tc.name} 第${i + 1}爻 fushen: core=${y.fushen ? `${y.fushen.liuQin}${y.fushen.gan}${y.fushen.zhi}` : '缺失'} ref=${r.liuQin}${r.gan}${r.zhi}`);
    } else {
      check(!y.fushen, `管线 ${tc.name} 第${i + 1}爻 不应有fushen: core=${JSON.stringify(y.fushen)}`);
    }
    // B类 hiddenBranch 字段
    const rp = ref.palaceYaos[i];
    check(y.hiddenBranch && y.hiddenBranch.gan === rp.gan && y.hiddenBranch.zhi === rp.zhi
      && y.hiddenBranch.liuQin === QIN_FULL[rp.qin],
      `管线 ${tc.name} 第${i + 1}爻 hiddenBranch: core=${y.hiddenBranch ? `${y.hiddenBranch.liuQin}${y.hiddenBranch.gan}${y.hiddenBranch.zhi}` : '缺失'} ref=${QIN_FULL[rp.qin]}${rp.gan}${rp.zhi}`);
  }
}

// ---------------------------------------------------------------------------
// 五、结果汇总
// ---------------------------------------------------------------------------
console.log('='.repeat(72));
if (failures === 0) {
  console.log(`✔ 全部通过：${totalChecks} 项断言（64卦×6爻 卦宫/伏干支/伏六亲/缺亲标记/伏神集合 + ${PIPELINE_CASES.length}例全管线）`);
  console.log('  FuShenCore 与吉时雨基准完全一致（A类缺亲伏神 + B类隐藏地支层）。');
} else {
  console.log(`✘ 失败 ${failures}/${totalChecks} 项：`);
  failDetails.slice(0, 60).forEach(d => console.log('  - ' + d));
  process.exitCode = 1;
}
