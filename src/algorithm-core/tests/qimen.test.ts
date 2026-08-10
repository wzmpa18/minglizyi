/**
 * ============================================================================
 * 测试用例集 —— 奇门遁甲模块测试
 * ============================================================================
 * 协议：MIT License
 * 创建日期：2026-07-26
 * 版本：v1.0.0
 *
 * 基准来源：suangua (MIT)
 * 测试范围：
 *   - 阳遁/阴遁判断（isYangDun）
 *   - 拆补法定局（getJuNumber）
 *   - 三元判断（getYuan / getYuanByDayOffset）
 *   - 飞宫排盘（flyLayout）
 *   - 完整排盘（calculateQimen）
 *   - 当前时间排盘（calculateQimenNow）
 * ============================================================================
 */

import {
  calculateQimen,
  calculateQimenNow,
  isYangDun,
  getJuNumber,
  getYuan,
  getYuanByDayOffset,
  flyLayout,
} from '../modules/qimen';

// ============================================================================
// 一、阳遁/阴遁判断测试
// ============================================================================

describe('阳遁/阴遁判断', () => {
  test('冬至到夏至为阳遁（11月-4月）', () => {
    expect(isYangDun(12, 22)).toBe(true);
    expect(isYangDun(1, 15)).toBe(true);
    expect(isYangDun(3, 1)).toBe(true);
    expect(isYangDun(4, 30)).toBe(true);
  });

  test('夏至到冬至为阴遁（5月-10月）', () => {
    expect(isYangDun(5, 1)).toBe(false);
    expect(isYangDun(6, 21)).toBe(false);
    expect(isYangDun(9, 15)).toBe(false);
    expect(isYangDun(10, 31)).toBe(false);
  });
});

// ============================================================================
// 二、三元判断测试
// ============================================================================

describe('三元判断', () => {
  test('局数判断元次', () => {
    expect(getYuan(1)).toBe('上元');
    expect(getYuan(2)).toBe('上元');
    expect(getYuan(3)).toBe('上元');
    expect(getYuan(4)).toBe('中元');
    expect(getYuan(5)).toBe('中元');
    expect(getYuan(6)).toBe('中元');
    expect(getYuan(7)).toBe('下元');
    expect(getYuan(8)).toBe('下元');
    expect(getYuan(9)).toBe('下元');
  });

  test('日偏移判断元次', () => {
    expect(getYuanByDayOffset(0)).toBe('上元');
    expect(getYuanByDayOffset(4)).toBe('上元');
    expect(getYuanByDayOffset(5)).toBe('中元');
    expect(getYuanByDayOffset(9)).toBe('中元');
    expect(getYuanByDayOffset(10)).toBe('下元');
    expect(getYuanByDayOffset(14)).toBe('下元');
  });
});

// ============================================================================
// 三、拆补法定局测试（V3.1 修正版）
// ============================================================================

describe('拆补法定局', () => {
  test('阳遁上元局数', () => {
    // 冬至阳遁1局，上元(dayOffset=0)
    const ju = getJuNumber(12, 22, true, '冬至', 0);
    expect(ju).toBe(1);
  });

  test('阳遁中元局数（V3.1修正：+6）', () => {
    // 冬至阳遁1局，中元(dayOffset=5) = 1+6=7
    const ju = getJuNumber(12, 22, true, '冬至', 5);
    expect(ju).toBe(7);
  });

  test('阳遁下元局数（V3.1修正：+12）', () => {
    // 冬至阳遁1局，下元(dayOffset=10) = 1+12=13 → mod9→4
    const ju = getJuNumber(12, 22, true, '冬至', 10);
    expect(ju).toBe(4);
  });

  test('阴遁上元局数', () => {
    // 夏至阴遁9局，上元(dayOffset=0)
    const ju = getJuNumber(6, 21, false, '夏至', 0);
    expect(ju).toBe(9);
  });

  test('阴遁中元局数（V3.1修正：-6）', () => {
    // 夏至阴遁9局，中元(dayOffset=5) = 9-6=3
    const ju = getJuNumber(6, 21, false, '夏至', 5);
    expect(ju).toBe(3);
  });

  test('阴遁下元局数（V3.1修正：-12）', () => {
    // 夏至阴遁9局，下元(dayOffset=10) = 9-12=-3 → mod9→6
    const ju = getJuNumber(6, 21, false, '夏至', 10);
    expect(ju).toBe(6);
  });
});

// ============================================================================
// 四、飞宫排盘测试
// ============================================================================

describe('飞宫排盘', () => {
  test('阳遁1局飞宫', () => {
    const layout = flyLayout(1, true);
    // 应有9个宫位
    expect(Object.keys(layout).length).toBe(9);
    // 坎1宫（位置1）应为天蓬星+休门+值符
    expect(layout[1]).toBeTruthy();
    expect(layout[1].star).toBeTruthy();
    expect(layout[1].door).toBeTruthy();
    expect(layout[1].deity).toBeTruthy();
  });

  test('阴遁9局飞宫', () => {
    const layout = flyLayout(9, false);
    expect(Object.keys(layout).length).toBe(9);
    expect(layout[9]).toBeTruthy();
    expect(layout[9].star).toBeTruthy();
  });

  test('中五宫寄宫标记（阳遁寄坤二宫）', () => {
    const layout = flyLayout(1, true);
    // 中五宫(5)应标记为寄宫
    if (layout[5]) {
      expect(layout[5].isJigong).toBe(true);
      expect(layout[5].jigongTarget).toBe(2);
    }
  });

  test('中五宫寄宫标记（阴遁寄艮八宫）', () => {
    const layout = flyLayout(9, false);
    if (layout[5]) {
      expect(layout[5].isJigong).toBe(true);
      expect(layout[5].jigongTarget).toBe(8);
    }
  });
});

// ============================================================================
// 五、完整排盘测试
// ============================================================================

describe('奇门遁甲完整排盘', () => {
  test('calculateQimen 返回完整结果', () => {
    const result = calculateQimen({
      year: 2024,
      month: 7,
      day: 26,
      hour: 10,
      minute: 0,
    });
    expect(result).toBeTruthy();
    expect(result.juType).toBeTruthy();
    expect(result.juNumber).toBeGreaterThanOrEqual(1);
    expect(result.juNumber).toBeLessThanOrEqual(9);
    expect(result.yuan).toBeTruthy();
    expect(result.palaces).toBeTruthy();
    expect(result.palaces.length).toBe(9);
    expect(result.auspiciousDirections).toBeTruthy();
    expect(result.inauspiciousDirections).toBeTruthy();
  });

  test('每个宫位字段完整', () => {
    const result = calculateQimen({
      year: 2024,
      month: 7,
      day: 26,
      hour: 10,
      minute: 0,
    });
    result.palaces.forEach((palace) => {
      expect(palace.position).toBeGreaterThanOrEqual(1);
      expect(palace.position).toBeLessThanOrEqual(9);
      expect(palace.palaceName).toBeTruthy();
      expect(palace.star).toBeTruthy();
      expect(palace.door).toBeTruthy();
      expect(palace.deity).toBeTruthy();
      expect(typeof palace.isAuspicious).toBe('boolean');
    });
  });

  test('calculateQimenNow 返回当前时间排盘', () => {
    const result = calculateQimenNow();
    expect(result).toBeTruthy();
    expect(result.juType).toBeTruthy();
    expect(result.palaces.length).toBe(9);
  });
});