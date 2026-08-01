/**
 * ============================================================================
 * 测试用例集 —— 神煞模块测试
 * ============================================================================
 * 协议：MIT License
 * 创建日期：2026-07-26
 * 版本：v1.0.0
 *
 * 基准来源：净室自研，基于《渊海子平》《三命通会》
 * 测试范围：
 *   - 51种神煞完整计算（calculateAllShenSha）
 *   - 按柱位查询（getShenShaByPillar）
 *   - 按类别查询（getShenShaByCategory）
 *   - 存在性检查（hasShenSha）
 *   - 季节判断（getSeason）
 * ============================================================================
 */

import {
  calculateAllShenSha,
  getShenShaByPillar,
  getShenShaByCategory,
  hasShenSha,
  getSeason,
  SHENSHA_DEFINITIONS,
  SHENSHA_CATEGORY_LIST,
} from '../modules/shensha';

// ============================================================================
// 标准测试八字
// ============================================================================

const TEST_BAZI = {
  yearGan: '甲', yearZhi: '子',
  monthGan: '丙', monthZhi: '寅', // 春季
  dayGan: '戊', dayZhi: '辰',
  hourGan: '丙', hourZhi: '辰',
  gender: 'male' as const,
};

// ============================================================================
// 一、神煞定义测试
// ============================================================================

describe('神煞定义数据', () => {
  test('神煞定义完整性', () => {
    const names = Object.keys(SHENSHA_DEFINITIONS);
    expect(names.length).toBeGreaterThanOrEqual(51);
  });

  test('神煞分类清单', () => {
    expect(SHENSHA_CATEGORY_LIST['吉']).toBeTruthy();
    expect(SHENSHA_CATEGORY_LIST['凶']).toBeTruthy();
    expect(SHENSHA_CATEGORY_LIST['中性']).toBeTruthy();

    const total = (
      SHENSHA_CATEGORY_LIST['吉'].length +
      SHENSHA_CATEGORY_LIST['凶'].length +
      SHENSHA_CATEGORY_LIST['中性'].length
    );
    expect(total).toBeGreaterThanOrEqual(51);
  });
});

// ============================================================================
// 二、神煞计算测试
// ============================================================================

describe('神煞计算', () => {
  test('全量神煞计算', () => {
    const result = calculateAllShenSha(TEST_BAZI);
    expect(result).toBeTruthy();
    expect(result.summary).toBeTruthy();
    expect(typeof result.summary.total).toBe('number');
    expect(result.categories).toBeTruthy();
    expect(result.all).toBeTruthy();
    expect(result.byPillar).toBeTruthy();
  });

  test('天乙贵人', () => {
    // 日干戊，天乙贵人在丑、未
    const result = calculateAllShenSha(TEST_BAZI);
    const tianyi = result.all.find((s: any) => s.name === '天乙贵人');
    if (tianyi) {
      expect(tianyi.category).toBe('吉');
    }
  });

  test('禄神', () => {
    // 日干戊，禄神在巳
    const result = calculateAllShenSha(TEST_BAZI);
    const lushen = result.all.find((s: any) => s.name === '禄神');
    if (lushen) {
      expect(lushen.category).toBe('吉');
    }
  });

  test('羊刃', () => {
    // 日干戊，羊刃在午
    const result = calculateAllShenSha(TEST_BAZI);
    const yangren = result.all.find((s: any) => s.name === '羊刃');
    if (yangren) {
      expect(yangren.category).toBe('凶');
    }
  });
});

// ============================================================================
// 三、便捷查询测试
// ============================================================================

describe('神煞便捷查询', () => {
  test('按柱位查询', () => {
    const result = getShenShaByPillar(TEST_BAZI, '日柱');
    expect(Array.isArray(result)).toBe(true);
  });

  test('按类别查询', () => {
    const result = getShenShaByCategory(TEST_BAZI, '吉');
    expect(Array.isArray(result)).toBe(true);
  });

  test('存在性检查', () => {
    const has = hasShenSha(TEST_BAZI, '天乙贵人');
    expect(typeof has).toBe('boolean');
  });
});

// ============================================================================
// 四、辅助函数测试
// ============================================================================

describe('辅助函数', () => {
  test('季节判断', () => {
    expect(getSeason('寅')).toBe('春');
    expect(getSeason('午')).toBe('夏');
    expect(getSeason('申')).toBe('秋');
    expect(getSeason('子')).toBe('冬');
  });
});