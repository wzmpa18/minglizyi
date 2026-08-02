/**
 * 八字3组标准用例验证脚本 —— 对标吉时雨基准
 *
 * 算法对标:
 *   吉时雨 (jishiyu) baziutils.js 使用 lunar-javascript 的
 *   Solar.fromYmdHms() -> getLunar() -> getEightChar() 进行排盘。
 *   本项目 base.ts 的 solarToBazi() 同样基于 lunar-javascript 重写。
 *
 * 本脚本同时:
 *   1. 调用项目 solarToBazi() 获取项目结果
 *   2. 直接调用 lunar-javascript EightChar 获取吉时雨同源基准值
 *   3. 逐字段对比: 干支 / 十神 / 藏干 / 空亡 / 纳音 / 地势
 *
 * 用例:
 *   用例1: 1982-10-13 08:00 男
 *   用例2: 1990-05-15 12:00 男 (四柱应为 庚午 辛巳 庚辰 壬午)
 *   用例3: 2026-08-02 10:00 男
 *
 * 用法: npx tsx scripts/verify_bazi_cases.ts
 */

// @ts-nocheck

import { solarToBazi } from '../src/algorithm-core/modules/bazi/base';
import { Solar } from 'lunar-javascript';

// ============================================================================
// 类型定义
// ============================================================================

interface PillarFields {
  ganzhi: string;      // 干支
  shishenGan: string;  // 天干十神
  canggan: string[];   // 藏干
  xunkong: string;     // 空亡
  nayin: string;       // 纳音
  dishi: string;       // 地势(十二长生)
}

interface CaseResult {
  project: PillarFields[];   // 项目 solarToBazi 结果
  baseline: PillarFields[];  // lunar-javascript 直接基准
}

// ============================================================================
// 基准计算: 直接调用 lunar-javascript (与吉时雨同源)
// ============================================================================

function computeBaseline(
  year: number,
  month: number,
  day: number,
  hour: number,
  sect: number = 1
): PillarFields[] {
  const solar = Solar.fromYmdHms(year, month, day, hour, 0, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  ec.setSect(sect);

  // 四柱提取函数 (对标吉时雨 buildPillarCol)
  function extractPillar(prefix: 'Year' | 'Month' | 'Day' | 'Time'): PillarFields {
    const gan = (ec as any)[`get${prefix}Gan`]();
    const zhi = (ec as any)[`get${prefix}Zhi`]();
    const shishenGan = (ec as any)[`get${prefix}ShiShenGan`]();
    const hideGan = (ec as any)[`get${prefix}HideGan`]();
    const xunkong = (ec as any)[`get${prefix}XunKong`]();
    const nayin = (ec as any)[`get${prefix}NaYin`]();
    const dishi = (ec as any)[`get${prefix}DiShi`]();

    return {
      ganzhi: gan + zhi,
      shishenGan: prefix === 'Day' ? '日主' : shishenGan,
      canggan: hideGan || [],
      xunkong: xunkong || '',
      nayin: nayin || '',
      dishi: dishi || '',
    };
  }

  return [
    extractPillar('Year'),
    extractPillar('Month'),
    extractPillar('Day'),
    extractPillar('Time'),
  ];
}

// ============================================================================
// 项目结果提取
// ============================================================================

function computeProject(
  year: number,
  month: number,
  day: number,
  hour: number,
  gender: string
): PillarFields[] {
  const result = solarToBazi({ year, month, day, hour, gender, sect: 1 });
  return result.pillars.map((p: any) => ({
    ganzhi: p.ganzhi,
    shishenGan: p.shishen.gan,
    canggan: p.canggan,
    xunkong: p.xunkong,
    nayin: p.nayin,
    dishi: p.changsheng,
  }));
}

// ============================================================================
// 对比输出
// ============================================================================

const PILLAR_NAMES = ['年柱', '月柱', '日柱', '时柱'];
const FIELD_LABELS: { key: keyof PillarFields; label: string }[] = [
  { key: 'ganzhi', label: '干支' },
  { key: 'shishenGan', label: '十神' },
  { key: 'canggan', label: '藏干' },
  { key: 'xunkong', label: '空亡' },
  { key: 'nayin', label: '纳音' },
  { key: 'dishi', label: '地势' },
];

function formatValue(val: any): string {
  if (Array.isArray(val)) return val.length > 0 ? val.join('') : '(空)';
  return val === '' || val == null ? '(空)' : String(val);
}

function compareCase(
  caseName: string,
  caseDesc: string,
  project: PillarFields[],
  baseline: PillarFields[]
): { total: number; pass: number; fail: number } {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${caseName}: ${caseDesc}`);
  console.log('='.repeat(80));

  let total = 0;
  let pass = 0;
  let fail = 0;

  for (let i = 0; i < 4; i++) {
    console.log(`\n  【${PILLAR_NAMES[i]}】`);
    console.log(
      `    ${'字段'.padEnd(8)} | ${'项目结果'.padEnd(16)} | ${'基准(lunar-javascript)'.padEnd(20)} | ${'对比'.padEnd(6)}`
    );
    console.log('    ' + '-'.repeat(72));

    for (const { key, label } of FIELD_LABELS) {
      const pVal = project[i][key];
      const bVal = baseline[i][key];

      // 藏干比较: 数组内容一致即通过(顺序也需一致, 因为吉时雨用相同库)
      let match: boolean;
      if (key === 'canggan') {
        const pArr = pVal as any[];
        const bArr = bVal as any[];
        match =
          pArr.length === bArr.length &&
          pArr.every((v, idx) => v === bArr[idx]);
      } else {
        match = pVal === bVal;
      }

      total++;
      if (match) pass++;
      else fail++;

      const mark = match ? 'PASS' : 'FAIL';
      const pStr = formatValue(pVal);
      const bStr = formatValue(bVal);

      console.log(
        `    ${label.padEnd(8)} | ${pStr.padEnd(16)} | ${bStr.padEnd(20)} | ${mark}`
      );
    }
  }

  console.log('\n  ' + '-'.repeat(72));
  console.log(
    `  用例统计: 总计 ${total} 项, 通过 ${pass} 项, 失败 ${fail} 项`
  );

  return { total, pass, fail };
}

// ============================================================================
// 主流程
// ============================================================================

function main() {
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + '  八字3组用例验证脚本 —— 对标吉时雨(lunar-javascript同源)基准'.padEnd(78) + '║');
  console.log('║' + `  项目算法: src/algorithm-core/modules/bazi/base.ts -> solarToBazi()`.padEnd(78) + '║');
  console.log('║' + `  基准来源: lunar-javascript EightChar (吉时雨 baziutils.js 同源)`.padEnd(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');

  const cases: {
    name: string;
    desc: string;
    year: number;
    month: number;
    day: number;
    hour: number;
    gender: string;
    expected?: string;
  }[] = [
    {
      name: '用例1',
      desc: '1982-10-13 08:00 男',
      year: 1982,
      month: 10,
      day: 13,
      hour: 8,
      gender: 'male',
    },
    {
      name: '用例2',
      desc: '1990-05-15 12:00 男 (期望四柱: 庚午 辛巳 庚辰 壬午)',
      year: 1990,
      month: 5,
      day: 15,
      hour: 12,
      gender: 'male',
      expected: '庚午 辛巳 庚辰 壬午',
    },
    {
      name: '用例3',
      desc: '2026-08-02 10:00 男',
      year: 2026,
      month: 8,
      day: 2,
      hour: 10,
      gender: 'male',
    },
  ];

  let grandTotal = 0;
  let grandPass = 0;
  let grandFail = 0;

  for (const c of cases) {
    const project = computeProject(c.year, c.month, c.day, c.hour, c.gender);
    const baseline = computeBaseline(c.year, c.month, c.day, c.hour, 1);

    const stats = compareCase(c.name, c.desc, project, baseline);
    grandTotal += stats.total;
    grandPass += stats.pass;
    grandFail += stats.fail;

    // 额外: 对用例2验证期望四柱
    if (c.expected) {
      const actualGanZhi = project.map((p) => p.ganzhi).join(' ');
      const matchExpected = actualGanZhi === c.expected;
      console.log('\n  [期望四柱验证]');
      console.log(`    期望: ${c.expected}`);
      console.log(`    实际: ${actualGanZhi}`);
      console.log(`    结果: ${matchExpected ? 'PASS 一致' : 'FAIL 不一致'}`);
    }
  }

  // 汇总
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + '  汇总统计'.padEnd(78) + '║');
  console.log('╠' + '═'.repeat(78) + '╣');
  console.log('║' + `  总对比项数: ${grandTotal}`.padEnd(78) + '║');
  console.log('║' + `  通过项数:   ${grandPass}`.padEnd(78) + '║');
  console.log('║' + `  失败项数:   ${grandFail}`.padEnd(78) + '║');
  const rate = grandTotal > 0 ? ((grandPass / grandTotal) * 100).toFixed(1) : '0';
  console.log('║' + `  通过率:     ${rate}%`.padEnd(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');

  if (grandFail > 0) {
    console.log('\n  [结论] 存在字段不一致，请检查上方 FAIL 项。');
  } else {
    console.log('\n  [结论] 全部字段一致，项目 solarToBazi() 与吉时雨同源基准完全吻合。');
  }
}

main();
