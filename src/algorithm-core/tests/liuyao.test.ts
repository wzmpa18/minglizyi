/**
 * ============================================================================
 * 测试用例集 —— 六爻模块测试
 * ============================================================================
 * 协议：MIT License
 * 创建日期：2026-07-26
 * 版本：v1.0.0
 *
 * 基准来源：suangua (MIT)
 * 测试范围：
 *   - 六爻起卦（calculateLiuyao）
 *   - 六十四卦列表（getHexagramList）
 *   - 核心算法函数（getWorldLine, wxRelation, getLiuQin, assignLiuShen,
 *     getKongWang, getNajiaBranch, timeDivination, hourToDizhi, annotateWithNajia）
 * ============================================================================
 */

import {
  calculateLiuyao,
  getHexagramList,
  getWorldLine,
  wxRelation,
  getLiuQin,
  assignLiuShen,
  getKongWang,
  getNajiaBranch,
  timeDivination,
  hourToDizhi,
  annotateWithNajia,
} from '../modules/liuyao';

// ============================================================================
// 一、六十四卦列表测试
// ============================================================================

describe('六十四卦列表', () => {
  test('卦列表包含64卦', () => {
    const list = getHexagramList();
    expect(list.length).toBe(64);
  });

  test('乾为天', () => {
    const list = getHexagramList();
    const qian = list.find((g) => g.number === 1);
    expect(qian).toBeTruthy();
    expect(qian!.name).toBe('乾为天');
    expect(qian!.upper).toBe('乾');
    expect(qian!.lower).toBe('乾');
  });

  test('坤为地', () => {
    const list = getHexagramList();
    const kun = list.find((g) => g.number === 2);
    expect(kun).toBeTruthy();
    expect(kun!.name).toBe('坤为地');
    expect(kun!.upper).toBe('坤');
    expect(kun!.lower).toBe('坤');
  });

  test('水火既济（第63卦）', () => {
    const list = getHexagramList();
    const jiji = list.find((g) => g.number === 63);
    expect(jiji).toBeTruthy();
    expect(jiji!.name).toBe('水火既济');
    expect(jiji!.upper).toBe('坎');
    expect(jiji!.lower).toBe('离');
  });

  test('火水未济（第64卦）', () => {
    const list = getHexagramList();
    const weiji = list.find((g) => g.number === 64);
    expect(weiji).toBeTruthy();
    expect(weiji!.name).toBe('火水未济');
    expect(weiji!.upper).toBe('离');
    expect(weiji!.lower).toBe('坎');
  });
});

// ============================================================================
// 二、时辰转地支测试
// ============================================================================

describe('时辰转地支', () => {
  test('子时（23-1点）', () => {
    expect(hourToDizhi(0)).toBe('子');
    expect(hourToDizhi(23)).toBe('子');
  });

  test('午时（11-13点）', () => {
    expect(hourToDizhi(12)).toBe('午');
  });

  test('各时辰覆盖', () => {
    const expected = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    for (let h = 0; h < 24; h++) {
      const idx = Math.floor(((h + 1) % 24) / 2);
      expect(hourToDizhi(h)).toBe(expected[idx]);
    }
  });
});

// ============================================================================
// 三、世爻测试
// ============================================================================

describe('世爻位置', () => {
  test('乾为天（本宫卦）世6', () => {
    const [world, ying] = getWorldLine(1);
    expect(world).toBe(6);
    expect(ying).toBe(3);
  });

  test('天风姤（一世卦）世1', () => {
    const [world, ying] = getWorldLine(44);
    expect(world).toBe(1);
    expect(ying).toBe(4);
  });

  test('天地否（三世卦）世3', () => {
    const [world, ying] = getWorldLine(12);
    expect(world).toBe(3);
    expect(ying).toBe(6);
  });

  test('火地晋（游魂卦）世4', () => {
    const [world, ying] = getWorldLine(35);
    expect(world).toBe(4);
    expect(ying).toBe(1);
  });

  test('火天大有（归魂卦）世3', () => {
    const [world, ying] = getWorldLine(14);
    expect(world).toBe(3);
    expect(ying).toBe(6);
  });
});

// ============================================================================
// 四、五行关系→六亲测试
// ============================================================================

describe('五行关系→六亲', () => {
  test('同我者兄弟', () => {
    expect(wxRelation('金', '金')).toBe('兄弟');
    expect(wxRelation('木', '木')).toBe('兄弟');
  });

  test('我生者子孙', () => {
    expect(wxRelation('金', '水')).toBe('子孙'); // 金生水
    expect(wxRelation('木', '火')).toBe('子孙'); // 木生火
  });

  test('生我者父母', () => {
    expect(wxRelation('水', '金')).toBe('父母'); // 金生水
    expect(wxRelation('火', '木')).toBe('父母'); // 木生火
  });

  test('我克者妻财', () => {
    expect(wxRelation('金', '木')).toBe('妻财'); // 金克木
    expect(wxRelation('木', '土')).toBe('妻财'); // 木克土
  });

  test('克我者官鬼', () => {
    expect(wxRelation('木', '金')).toBe('官鬼'); // 金克木
    expect(wxRelation('土', '木')).toBe('官鬼'); // 木克土
  });
});

// ============================================================================
// 五、六亲测试
// ============================================================================

describe('六亲', () => {
  test('乾宫卦配子水（初爻）→ 子孙', () => {
    // 乾宫属金，子水为金所生 → 子孙
    expect(getLiuQin('乾宫', '子')).toBe('子孙');
  });

  test('乾宫卦配寅木（二爻）→ 妻财', () => {
    // 乾宫属金，金克木 → 妻财
    expect(getLiuQin('乾宫', '寅')).toBe('妻财');
  });

  test('乾宫卦配辰土（三爻）→ 父母', () => {
    // 乾宫属金，土生金 → 父母
    expect(getLiuQin('乾宫', '辰')).toBe('父母');
  });

  test('坤宫卦配未土 → 兄弟', () => {
    // 坤宫属土，土同土 → 兄弟
    expect(getLiuQin('坤宫', '未')).toBe('兄弟');
  });
});

// ============================================================================
// 六、六神测试
// ============================================================================

describe('六神分配', () => {
  test('甲乙日青龙起', () => {
    const result = assignLiuShen('甲');
    expect(result[0]).toBe('青龙');
    expect(result[1]).toBe('朱雀');
    expect(result[2]).toBe('勾陈');
    expect(result[3]).toBe('螣蛇');
    expect(result[4]).toBe('白虎');
    expect(result[5]).toBe('玄武');
  });

  test('丙丁日朱雀起', () => {
    const result = assignLiuShen('丙');
    expect(result[0]).toBe('朱雀');
    expect(result[5]).toBe('青龙');
  });

  test('庚辛日白虎起', () => {
    const result = assignLiuShen('庚');
    expect(result[0]).toBe('白虎');
    expect(result[1]).toBe('玄武');
    expect(result[2]).toBe('青龙');
  });

  test('壬癸日玄武起', () => {
    const result = assignLiuShen('壬');
    expect(result[0]).toBe('玄武');
    expect(result[1]).toBe('青龙');
  });
});

// ============================================================================
// 七、空亡测试
// ============================================================================

describe('空亡', () => {
  test('甲子日空戌亥', () => {
    const kw = getKongWang(0);
    expect(kw).toEqual(['戌', '亥']);
  });

  test('甲戌日空申酉', () => {
    const kw = getKongWang(10);
    expect(kw).toEqual(['申', '酉']);
  });

  test('甲申日空午未', () => {
    const kw = getKongWang(20);
    expect(kw).toEqual(['午', '未']);
  });

  test('甲午日空辰巳', () => {
    const kw = getKongWang(30);
    expect(kw).toEqual(['辰', '巳']);
  });

  test('甲辰日空寅卯', () => {
    const kw = getKongWang(40);
    expect(kw).toEqual(['寅', '卯']);
  });

  test('甲寅日空子丑', () => {
    const kw = getKongWang(50);
    expect(kw).toEqual(['子', '丑']);
  });
});

// ============================================================================
// 八、纳甲地支测试
// ============================================================================

describe('纳甲地支', () => {
  test('乾卦初爻子', () => {
    expect(getNajiaBranch('乾', 1)).toBe('子');
  });

  test('乾卦上爻戌', () => {
    expect(getNajiaBranch('乾', 6)).toBe('戌');
  });

  test('坤卦初爻未', () => {
    expect(getNajiaBranch('坤', 1)).toBe('未');
  });

  test('坤卦上爻酉', () => {
    expect(getNajiaBranch('坤', 6)).toBe('酉');
  });

  test('坎卦初爻寅', () => {
    expect(getNajiaBranch('坎', 1)).toBe('寅');
  });

  test('离卦初爻卯', () => {
    expect(getNajiaBranch('离', 1)).toBe('卯');
  });
});

// ============================================================================
// 九、时间起卦测试
// ============================================================================

describe('时间起卦', () => {
  test('起卦结果包含必要字段', () => {
    const result = timeDivination(2024, 7, 26, 14);
    expect(result.hexagramNumber).toBeGreaterThan(0);
    expect(result.hexagramName).toBeTruthy();
    expect(result.upperTrigram).toBeTruthy();
    expect(result.lowerTrigram).toBeTruthy();
    expect(result.changePosition).toBeGreaterThanOrEqual(1);
    expect(result.changePosition).toBeLessThanOrEqual(6);
    expect(result.lines).toHaveLength(6);
  });

  test('每爻包含正确字段', () => {
    const result = timeDivination(2024, 7, 26, 14);
    for (const line of result.lines) {
      expect(line.position).toBeGreaterThanOrEqual(1);
      expect(line.position).toBeLessThanOrEqual(6);
      expect(['阳', '阴']).toContain(line.yaoType);
      expect(typeof line.isChanging).toBe('boolean');
    }
  });

  test('有且仅有一个动爻', () => {
    const result = timeDivination(2024, 7, 26, 14);
    const changingLines = result.lines.filter((l) => l.isChanging);
    expect(changingLines).toHaveLength(1);
  });
});

// ============================================================================
// 十、六爻起卦主入口测试
// ============================================================================

describe('六爻起卦', () => {
  test('时间起卦返回完整排盘结果', () => {
    const input = {
      method: 'time' as const,
      year: 2024,
      month: 7,
      day: 26,
      hour: 14,
    };
    const result = calculateLiuyao(input);
    expect(result.hexagramName).toBeTruthy();
    expect(result.hexagramNumber).toBeGreaterThan(0);
    expect(result.lines).toHaveLength(6);
    expect(result.worldLine).toBeGreaterThanOrEqual(1);
    expect(result.worldLine).toBeLessThanOrEqual(6);
    expect(result.yingLine).toBeGreaterThanOrEqual(1);
    expect(result.yingLine).toBeLessThanOrEqual(6);
    expect(result.upperTrigram).toBeTruthy();
    expect(result.lowerTrigram).toBeTruthy();

    // 每爻有完整标注
    for (const line of result.lines) {
      expect(line.najia).toBeTruthy();
      expect(line.liuQin).toBeTruthy();
      expect(line.liuShen).toBeTruthy();
      expect(['阳', '阴']).toContain(line.yaoType);
    }
  });

  test('不支持的起卦方式抛出错误', () => {
    const input = {
      method: 'coin' as const,
      year: 2024,
      month: 7,
      day: 26,
      hour: 14,
    };
    expect(() => calculateLiuyao(input)).toThrow();
  });
});