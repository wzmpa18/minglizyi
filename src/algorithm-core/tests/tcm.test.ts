/**
 * ============================================================================
 * 测试用例集 —— 中医模块测试
 * ============================================================================
 * 协议：MIT License
 * 创建日期：2026-07-26
 * 版本：v1.0.0
 *
 * 基准来源：TCM-Learning-Assistant (MIT) / tcm-cli (MIT) / nihaixia (MulanPSL-2.0)
 * 测试范围：
 *   - 中药搜索（searchHerbs / getHerbById / getHerbCategories / getHerbsByCategory）
 *   - 方剂搜索（searchFormulas / getFormulaById / getFormulaCategories / getFormulasByCategory）
 *   - 经络搜索（searchMeridians / getMeridianById / searchAcupoints / getAcupointByCode）
 *   - 辨证学习（studySyndromeMatch / searchClassicTexts）
 * ============================================================================
 */

import {
  HERBS_DB,
  searchHerbs,
  getHerbById,
  getHerbCategories,
  getHerbsByCategory,
  getHerbByName,
} from '../modules/tcm/herbs';

import {
  FORMULAS_DB,
  searchFormulas,
  getFormulaById,
  getFormulaCategories,
  getFormulasByCategory,
} from '../modules/tcm/formulas';

import {
  MERIDIANS_DB,
  ACUPOINTS_DB,
  searchMeridians,
  getMeridianById,
  getMeridianByName,
  searchAcupoints,
  getAcupointByCode,
  getAcupointByName,
  getAcupointsByMeridian,
} from '../modules/tcm/meridians';

import {
  SHANGHAN_SYNDROMES,
  studySyndromeMatch,
  searchClassicTexts,
  getClassicTextsCount,
  getClassicNames,
} from '../modules/tcm/shanghan';

// ============================================================================
// 一、中药模块测试
// ============================================================================

describe('中药模块', () => {
  test('内嵌数据库非空', () => {
    expect(HERBS_DB.length).toBeGreaterThanOrEqual(30);
  });

  test('搜索桂枝', () => {
    const results = searchHerbs('桂枝');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('桂枝');
  });

  test('搜索拼音', () => {
    const results = searchHerbs('guizhi');
    expect(results.length).toBeGreaterThan(0);
  });

  test('按功效搜索', () => {
    const results = searchHerbs('解表');
    expect(results.length).toBeGreaterThan(0);
  });

  test('空搜索返回所有', () => {
    const results = searchHerbs('');
    expect(results.length).toBeGreaterThanOrEqual(30);
  });

  test('根据ID查询', () => {
    const herb = getHerbById('h001');
    expect(herb).toBeTruthy();
    if (herb) {
      expect(herb.name).toBeTruthy();
      expect(herb.pinyin).toBeTruthy();
    }
  });

  test('根据名称查询', () => {
    const herb = getHerbByName('桂枝');
    expect(herb).toBeTruthy();
    if (herb) {
      expect(herb.name).toBe('桂枝');
    }
  });

  test('不存在ID返回undefined', () => {
    const herb = getHerbById('nonexistent');
    expect(herb).toBeUndefined();
  });

  test('分类列表非空', () => {
    const categories = getHerbCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
  });

  test('按分类筛选', () => {
    const categories = getHerbCategories();
    if (categories.length > 0) {
      const results = getHerbsByCategory(categories[0]);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    }
  });

  test('合规字段存在', () => {
    const herb = getHerbById('h001');
    if (herb) {
      expect(herb.indications).toBeTruthy();
      expect(herb.source).toBeTruthy();
    }
  });
});

// ============================================================================
// 二、方剂模块测试
// ============================================================================

describe('方剂模块', () => {
  test('内嵌数据库非空', () => {
    expect(FORMULAS_DB.length).toBeGreaterThanOrEqual(20);
  });

  test('搜索麻黄汤', () => {
    const results = searchFormulas('麻黄汤');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test('按功效搜索', () => {
    const results = searchFormulas('解表');
    expect(results.length).toBeGreaterThan(0);
  });

  test('空搜索返回所有', () => {
    const results = searchFormulas('');
    expect(results.length).toBeGreaterThanOrEqual(20);
  });

  test('根据ID查询', () => {
    const formula = getFormulaById('f001');
    expect(formula).toBeTruthy();
    if (formula) {
      expect(formula.name).toBeTruthy();
      expect(formula.composition).toBeTruthy();
      expect(formula.composition.length).toBeGreaterThan(0);
    }
  });

  test('不存在ID返回undefined', () => {
    const formula = getFormulaById('nonexistent');
    expect(formula).toBeUndefined();
  });

  test('分类列表非空', () => {
    const categories = getFormulaCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
  });

  test('按分类筛选', () => {
    const categories = getFormulaCategories();
    if (categories.length > 0) {
      const results = getFormulasByCategory(categories[0]);
      expect(Array.isArray(results)).toBe(true);
    }
  });
});

// ============================================================================
// 三、经络穴位模块测试
// ============================================================================

describe('经络穴位模块', () => {
  test('经络数据库非空', () => {
    expect(MERIDIANS_DB.length).toBeGreaterThanOrEqual(12);
  });

  test('穴位数据库非空', () => {
    expect(ACUPOINTS_DB.length).toBeGreaterThanOrEqual(20);
  });

  test('经络搜索', () => {
    const results = searchMeridians('肝经');
    expect(results.length).toBeGreaterThan(0);
  });

  test('经络ID查询', () => {
    const meridian = getMeridianById('m1');
    expect(meridian).toBeTruthy();
    if (meridian) {
      expect(meridian.name).toBeTruthy();
    }
  });

  test('经络名称查询', () => {
    const meridian = getMeridianByName('肝经');
    expect(meridian).toBeTruthy();
  });

  test('穴位搜索', () => {
    const results = searchAcupoints('百会');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('百会');
  });

  test('穴位编码查询', () => {
    const acupoint = getAcupointByCode('DU20');
    expect(acupoint).toBeTruthy();
    if (acupoint) {
      expect(acupoint.name).toBe('百会');
    }
  });

  test('穴位名称查询', () => {
    const acupoint = getAcupointByName('百会');
    expect(acupoint).toBeTruthy();
  });

  test('按经络查穴位', () => {
    const acupoints = getAcupointsByMeridian('督脉');
    expect(Array.isArray(acupoints)).toBe(true);
  });
});

// ============================================================================
// 四、辨证学习模块测试
// ============================================================================

describe('辨证学习模块', () => {
  test('证型数据库非空', () => {
    expect(SHANGHAN_SYNDROMES.length).toBeGreaterThanOrEqual(10);
  });

  test('太阳病辨证匹配', () => {
    const result = studySyndromeMatch(['发热', '恶寒', '头痛', '脉浮']);
    expect(result).toBeTruthy();
    expect(result.symptoms).toEqual(['发热', '恶寒', '头痛', '脉浮']);
    expect(Array.isArray(result.syndromes)).toBe(true);
    expect(result.syndromes.length).toBeGreaterThan(0);
  });

  test('阳明病辨证匹配', () => {
    const result = studySyndromeMatch(['大热', '大汗', '大渴', '脉洪大']);
    expect(result.syndromes.length).toBeGreaterThan(0);
  });

  test('空症状返回空结果', () => {
    const result = studySyndromeMatch([]);
    expect(result.syndromes.length).toBe(0);
  });

  test('免责声明存在', () => {
    const result = studySyndromeMatch(['咳嗽']);
    expect(result.disclaimer).toBeTruthy();
    expect(result.disclaimer.length).toBeGreaterThan(0);
  });

  test('典籍文本搜索', () => {
    const result = searchClassicTexts('太阳病');
    expect(result).toBeTruthy();
    expect(Array.isArray(result.items)).toBe(true);
  });

  test('典籍总数', () => {
    const count = getClassicTextsCount();
    expect(count).toBeGreaterThan(0);
  });

  test('典籍名称列表', () => {
    const names = getClassicNames();
    expect(Array.isArray(names)).toBe(true);
    expect(names.length).toBeGreaterThan(0);
  });
});