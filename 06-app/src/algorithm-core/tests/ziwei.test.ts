/**
 * ============================================================================
 * 测试用例集 —— 紫微斗数模块测试
 * ============================================================================
 * 协议：MIT License
 * 创建日期：2026-07-26
 * 版本：v1.0.0
 *
 * 基准来源：iztro (MIT)
 * 测试范围：
 *   - 紫微斗数完整排盘（calculateZiwei）
 *   - 时辰选项（getShichenOptions）
 * ============================================================================
 */

import { calculateZiwei, getShichenOptions } from '../modules/ziwei';

// ============================================================================
// 标准测试用例
// ============================================================================

/** 测试用例 1: 公历 1984-02-04 08:00 (甲子年) */
const TC1 = { year: 1984, month: 2, day: 4, hour: 8, gender: 'male' as const };

/** 测试用例 2: 公历 2000-01-01 12:00 */
const TC2 = { year: 2000, month: 1, day: 1, hour: 12, gender: 'female' as const };

/** 测试用例 3: 公历 2024-03-15 06:00 */
const TC3 = { year: 2024, month: 3, day: 15, hour: 6, gender: 'male' as const };

// ============================================================================
// 一、时辰选项测试
// ============================================================================

describe('时辰选项', () => {
  test('时辰选项列表', () => {
    const options = getShichenOptions();
    expect(options.length).toBe(12);
    expect(options[0].zhi).toBe('子');
    expect(options[11].zhi).toBe('亥');
  });

  test('每个选项结构完整', () => {
    const options = getShichenOptions();
    options.forEach((opt) => {
      expect(typeof opt.value).toBe('number');
      expect(opt.label).toBeTruthy();
      expect(opt.zhi).toBeTruthy();
    });
  });
});

// ============================================================================
// 二、紫微排盘测试
// ============================================================================

describe('紫微斗数完整排盘', () => {
  test('排盘测试用例1: 1984-02-04 08:00', () => {
    const result = calculateZiwei(TC1);
    expect(result).toBeTruthy();
    expect(result.solarDate).toBeTruthy();
    expect(result.lunarDate).toBeTruthy();
    expect(result.heavenlyStem).toBeTruthy();
    expect(result.earthlyBranch).toBeTruthy();
    expect(result.fiveElementsClass).toBeTruthy();
  });

  test('排盘测试用例2: 2000-01-01 12:00', () => {
    const result = calculateZiwei(TC2);
    expect(result).toBeTruthy();
    expect(result.solarDate).toBeTruthy();
  });

  test('排盘测试用例3: 2024-03-15 06:00', () => {
    const result = calculateZiwei(TC3);
    expect(result).toBeTruthy();
    expect(result.solarDate).toBeTruthy();
  });

  test('12宫位完整性', () => {
    const result = calculateZiwei(TC1);
    expect(result.palaces).toBeTruthy();
    expect(result.palaces.length).toBe(12);

    result.palaces.forEach((palace) => {
      expect(palace.name).toBeTruthy();
      expect(palace.heavenlyStem).toBeTruthy();
      expect(palace.earthlyBranch).toBeTruthy();
      expect(Array.isArray(palace.majorStars)).toBe(true);
      expect(typeof palace.isBodyPalace).toBe('boolean');
    });

    // 应恰好有一个身宫
    const bodyCount = result.palaces.filter((p) => p.isBodyPalace).length;
    expect(bodyCount).toBe(1);
  });

  test('五行局应存在', () => {
    const result = calculateZiwei(TC1);
    expect(result.fiveElementsClass).toBeTruthy();
    // 五行局应为：水二局、木三局、金四局、土五局、火六局之一
    expect(['水二局', '木三局', '金四局', '土五局', '火六局']).toContain(
      result.fiveElementsClass
    );
  });

  test('星耀汇总', () => {
    const result = calculateZiwei(TC1);
    expect(result.stars).toBeTruthy();
    expect(result.stars.length).toBeGreaterThan(0);
    result.stars.forEach((star) => {
      expect(star.name).toBeTruthy();
      expect(star.type).toBe('major');
      expect(typeof star.palaceIndex).toBe('number');
    });
  });

  test('四化星耀', () => {
    const result = calculateZiwei(TC1);
    expect(result.sihua).toBeTruthy();
    expect(result.sihua.huaLu).toBeTruthy();
    expect(result.sihua.huaQuan).toBeTruthy();
    expect(result.sihua.huaKe).toBeTruthy();
    expect(result.sihua.huaJi).toBeTruthy();
  });

  test('大限数据', () => {
    const result = calculateZiwei(TC1);
    expect(result.decadal).toBeTruthy();
    expect(result.decadal.ageRange).toBeTruthy();
    expect(result.decadal.ageRange.length).toBe(2);
    expect(result.decadal.palaces).toBeTruthy();
    expect(result.decadal.palaces.length).toBe(12);
  });

  test('身宫存在', () => {
    const result = calculateZiwei(TC1);
    expect(result.bodyPalace).toBeTruthy();
  });
});