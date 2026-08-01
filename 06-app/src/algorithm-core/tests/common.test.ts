/**
 * ============================================================================
 * 测试用例集 —— 公共基础层测试
 * ============================================================================
 * 协议：MIT License
 * 创建日期：2026-07-26
 * 版本：v1.0.0
 *
 * 测试范围：
 *   - 干支换算（天干地支索引、六十甲子查表）
 *   - 纳音五行（查表、计算）
 *   - 空亡计算（旬空规则）
 *   - 地支藏干（藏干查表）
 *   - 十二长生（生旺死绝表）
 *   - 五鼠遁（时柱天干推算）
 *   - 五虎遁（月柱天干推算）
 *   - 生肖计算
 *   - 五行生克
 *   - 十神计算
 *   - 天干五合、地支六合六冲三合三会六害刑破
 *   - 节气计算
 *   - 真太阳时校正
 *   - 日期工具函数
 * ============================================================================
 */

import {
  // 干支
  getGanIndex, getGanByIndex, getZhiIndex, getZhiByIndex,
  getJiaziName, getJiaziIndex, splitGanZhi,
  getYearGanByYear, getYearZhiByYear, getYearGanZhi,
  // 纳音
  getNayinWuxing, calcNayin, getNayinElement,
  // 空亡
  getKongwang, calcKongwang,
  // 藏干
  getCangGan,
  // 十二长生
  getShengWang,
  // 遁法
  getWuShuDun, getFullWuShuDun, getWuHuDun, getFullWuHuDun,
  // 生肖
  getShengXiao, getShengXiaoByYear,
  // 五行
  getGanWuxing, getZhiWuxing, getGanYinYang, isGanYang, getZhiYinYang, isZhiYang,
  // 十神
  getShiShen, getShiShenJianCheng, getZhiShiShen, getShiShenByWuxing, getShiShenSummary,
  // 天干五合
  getGanWuHe, getGanHePartner,
  // 地支关系
  getZhiLiuHe, getZhiHePartner, getZhiLiuChong, getZhiChongPartner,
  getZhiSanHe, getZhiSanHui, getZhiLiuHai, getZhiXing, getZhiPo,
  // 五行局
  getWuxingJu, getWuxingRelation,
  // 节气
  getJieQiDate, getNearestJieQi, getCurrentJieQi, getJieQiByName, getJieQiIndex,
  getJieQiInfo, isJie, isQi, getJieQiNameByIndex,
  // 日期工具
  daysBetween, addDaysToDate,
  // 真太阳时
  calcTrueSolarTime, getTrueSolarHourIndex,
} from '../common';

// ============================================================================
// 一、干支换算测试
// ============================================================================

describe('干支换算', () => {
  test('天干索引换算', () => {
    expect(getGanIndex('甲')).toBe(0);
    expect(getGanIndex('癸')).toBe(9);
    expect(getGanByIndex(0)).toBe('甲');
    expect(getGanByIndex(9)).toBe('癸');
    expect(getGanByIndex(-1)).toBe('癸'); // 负数循环
    expect(getGanByIndex(10)).toBe('甲'); // 溢出循环
  });

  test('地支索引换算', () => {
    expect(getZhiIndex('子')).toBe(0);
    expect(getZhiIndex('亥')).toBe(11);
    expect(getZhiByIndex(0)).toBe('子');
    expect(getZhiByIndex(11)).toBe('亥');
    expect(getZhiByIndex(-1)).toBe('亥'); // 负数循环
    expect(getZhiByIndex(12)).toBe('子'); // 溢出循环
  });

  test('六十甲子查表', () => {
    expect(getJiaziName(0)).toBe('甲子');
    expect(getJiaziName(59)).toBe('癸亥');
    expect(getJiaziIndex('甲子')).toBe(0);
    expect(getJiaziIndex('癸亥')).toBe(59);
  });

  test('干支拆分', () => {
    const result = splitGanZhi('甲子');
    expect(result).not.toBeNull();
    expect(result![0]).toBe('甲');
    expect(result![1]).toBe('子');
    expect(splitGanZhi('')).toBeNull();
    expect(splitGanZhi('甲')).toBeNull();
  });

  test('年份干支计算', () => {
    // 2024年是甲辰年
    expect(getYearGanByYear(2024)).toBe('甲');
    expect(getYearZhiByYear(2024)).toBe('辰');
  });
});

// ============================================================================
// 二、纳音五行测试
// ============================================================================

describe('纳音五行', () => {
  test('纳音查表', () => {
    expect(getNayinWuxing('甲子')).toBe('海中金');
    expect(getNayinWuxing('乙丑')).toBe('海中金');
    expect(getNayinWuxing('丙寅')).toBe('炉中火');
    expect(getNayinWuxing('癸亥')).toBe('大海水');
  });

  test('纳音计算', () => {
    const result = calcNayin('甲子');
    expect(result).toBeTruthy();
    expect(result.element).toBeTruthy();
  });

  test('纳音元素提取', () => {
    expect(getNayinElement('甲子')).toBe('金');
    expect(getNayinElement('丙寅')).toBe('火');
    expect(getNayinElement('庚午')).toBe('土');
  });
});

// ============================================================================
// 三、空亡测试
// ============================================================================

describe('空亡计算', () => {
  test('旬空规则', () => {
    expect(getKongwang('甲子')).toBe('戌亥');  // 甲子旬空戌亥
    expect(getKongwang('甲戌')).toBe('申酉');  // 甲戌旬空申酉
    expect(getKongwang('甲申')).toBe('午未');  // 甲申旬空午未
    expect(getKongwang('甲午')).toBe('辰巳');  // 甲午旬空辰巳
    expect(getKongwang('甲辰')).toBe('寅卯');  // 甲辰旬空寅卯
    expect(getKongwang('甲寅')).toBe('子丑');  // 甲寅旬空子丑
  });

  test('空亡计算（含旬首）', () => {
    const result = calcKongwang('甲子');
    expect(result.kongwang).toBe('戌亥');
    expect(result.xunShou).toBe('甲子');
  });
});

// ============================================================================
// 四、地支藏干测试
// ============================================================================

describe('地支藏干', () => {
  test('藏干查表', () => {
    expect(getCangGan('子')).toEqual(['癸']);
    expect(getCangGan('丑')).toEqual(['己', '癸', '辛']);
    expect(getCangGan('寅')).toEqual(['甲', '丙', '戊']);
    expect(getCangGan('午')).toEqual(['丁', '己']);
    expect(getCangGan('亥')).toEqual(['壬', '甲']);
  });
});

// ============================================================================
// 五、十二长生测试
// ============================================================================

describe('十二长生', () => {
  test('生旺死绝表', () => {
    expect(getShengWang('甲', '亥')).toBe('长生');
    expect(getShengWang('甲', '卯')).toBe('帝旺');
    expect(getShengWang('甲', '未')).toBe('墓');
    expect(getShengWang('乙', '午')).toBe('长生');
    expect(getShengWang('庚', '巳')).toBe('长生');
  });
});

// ============================================================================
// 六、五鼠遁/五虎遁测试
// ============================================================================

describe('遁法推算', () => {
  test('五鼠遁（时柱天干）', () => {
    // 甲己日，子时为甲子
    expect(getWuShuDun('甲', '子')).toBe('甲');
    expect(getWuShuDun('己', '子')).toBe('甲');
    // 乙庚日，子时为丙子
    expect(getWuShuDun('乙', '子')).toBe('丙');
    expect(getWuShuDun('庚', '子')).toBe('丙');
  });

  test('五虎遁（月柱天干）', () => {
    // 甲己年，寅月天干为丙
    expect(getWuHuDun('甲', '寅')).toBe('丙');
    expect(getWuHuDun('己', '寅')).toBe('丙');
    // 乙庚年，寅月天干为戊
    expect(getWuHuDun('乙', '寅')).toBe('戊');
    expect(getWuHuDun('庚', '寅')).toBe('戊');
  });

  test('完整五鼠遁表', () => {
    const table = getFullWuShuDun('甲');
    expect(table).toBeTruthy();
    expect(table['子']).toBe('甲');
    expect(table['午']).toBe('庚');
  });

  test('完整五虎遁表', () => {
    const table = getFullWuHuDun('甲');
    expect(table).toBeTruthy();
    expect(table['寅']).toBe('丙');
    expect(table['子']).toBe('甲');
  });
});

// ============================================================================
// 七、五行生克测试
// ============================================================================

describe('五行生克', () => {
  test('天干五行', () => {
    expect(getGanWuxing('甲')).toBe('木');
    expect(getGanWuxing('丙')).toBe('火');
    expect(getGanWuxing('庚')).toBe('金');
    expect(getGanWuxing('壬')).toBe('水');
    expect(getGanWuxing('戊')).toBe('土');
  });

  test('天干阴阳', () => {
    expect(getGanYinYang('甲')).toBe('阳');
    expect(getGanYinYang('乙')).toBe('阴');
    expect(isGanYang('甲')).toBe(true);
    expect(isGanYang('乙')).toBe(false);
  });

  test('地支阴阳', () => {
    expect(getZhiYinYang('子')).toBe('阳');
    expect(getZhiYinYang('丑')).toBe('阴');
    expect(isZhiYang('子')).toBe(true);
    expect(isZhiYang('丑')).toBe(false);
  });

  test('五行生克关系', () => {
    expect(getWuxingRelation('金', '水')).toBe('我生');
    expect(getWuxingRelation('水', '金')).toBe('生我');
    expect(getWuxingRelation('金', '木')).toBe('我克');
    expect(getWuxingRelation('木', '金')).toBe('克我');
    expect(getWuxingRelation('金', '金')).toBe('同我');
  });
});

// ============================================================================
// 八、十神测试
// ============================================================================

describe('十神计算', () => {
  test('十神查表', () => {
    // 日干甲
    expect(getShiShen('甲', '甲')).toBe('比肩');
    expect(getShiShen('甲', '乙')).toBe('劫财');
    expect(getShiShen('甲', '丙')).toBe('食神');
    expect(getShiShen('甲', '辛')).toBe('正官');
    expect(getShiShen('甲', '庚')).toBe('七杀');
    expect(getShiShen('甲', '癸')).toBe('正印');
    expect(getShiShen('甲', '壬')).toBe('偏印');
    expect(getShiShen('甲', '戊')).toBe('偏财');
    expect(getShiShen('甲', '己')).toBe('正财');
    expect(getShiShen('甲', '丁')).toBe('伤官');
  });

  test('十神简称', () => {
    expect(getShiShenJianCheng('比肩')).toBe('比');
    expect(getShiShenJianCheng('劫财')).toBe('劫');
    expect(getShiShenJianCheng('正官')).toBe('官');
    expect(getShiShenJianCheng('七杀')).toBe('杀');
  });

  test('地支十神', () => {
    // 日干甲，地支寅藏甲丙戊
    const result = getZhiShiShen('甲', '寅');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('五行十神关系', () => {
    expect(getShiShenByWuxing('木', '木')).toBe('比肩');
    expect(getShiShenByWuxing('木', '火')).toBe('食神');
    expect(getShiShenByWuxing('木', '金')).toBe('七杀');
  });
});

// ============================================================================
// 九、地支关系测试
// ============================================================================

describe('地支关系', () => {
  test('天干五合', () => {
    // 甲己合土
    const result = getGanWuHe('甲', '己');
    expect(result).not.toBeNull();
    expect(result!.hua).toBe('土');
    // 乙庚合金
    const result2 = getGanWuHe('乙', '庚');
    expect(result2).not.toBeNull();
    expect(result2!.hua).toBe('金');
  });

  test('天干合伴', () => {
    expect(getGanHePartner('甲')).toBe('己');
    expect(getGanHePartner('乙')).toBe('庚');
  });

  test('地支六合', () => {
    // 子丑合土
    const result = getZhiLiuHe('子', '丑');
    expect(result).not.toBeNull();
    expect(result!.hua).toBe('土');
    expect(getZhiHePartner('子')).toBe('丑');
  });

  test('地支六冲', () => {
    const result = getZhiLiuChong('子', '午');
    expect(result).not.toBeNull();
    expect(result!.description).toBeTruthy();
    expect(getZhiChongPartner('子')).toBe('午');
  });

  test('地支三合', () => {
    const result = getZhiSanHe(['申', '子', '辰']);
    expect(result).not.toBeNull();
    expect(result!.wuxing).toBe('水');
    expect(result!.name).toBe('申子辰水局');
  });

  test('地支三会', () => {
    const result = getZhiSanHui(['寅', '卯', '辰']);
    expect(result).not.toBeNull();
    expect(result!.wuxing).toBe('木');
    expect(result!.name).toBe('寅卯辰东方木');
  });

  test('地支六害', () => {
    const result = getZhiLiuHai('子', '未');
    expect(result).not.toBeNull();
    expect(result!.name).toBeTruthy();
  });

  test('地支相刑', () => {
    const result = getZhiXing(['子', '卯']);
    expect(result).toBe('无礼之刑');
  });

  test('地支六破', () => {
    const result = getZhiPo('子', '酉');
    expect(result).not.toBeNull();
  });
});

// ============================================================================
// 十、生肖测试
// ============================================================================

describe('生肖计算', () => {
  test('地支生肖', () => {
    expect(getShengXiao('子')).toBe('鼠');
    expect(getShengXiao('丑')).toBe('牛');
    expect(getShengXiao('寅')).toBe('虎');
    expect(getShengXiao('亥')).toBe('猪');
  });

  test('年份生肖', () => {
    expect(getShengXiaoByYear(2024)).toBe('龙'); // 2024年辰龙
    expect(getShengXiaoByYear(2025)).toBe('蛇'); // 2025年巳蛇
  });
});

// ============================================================================
// 十一、节气测试
// ============================================================================

describe('节气计算', () => {
  test('节气信息查询', () => {
    const info = getJieQiInfo('立春');
    expect(info).not.toBeNull();
    expect(info!.index).toBe(0);
    expect(info!.isJie).toBe(true);
    expect(info!.monthIndex).toBe(0); // 寅月
  });

  test('节气序号查询', () => {
    expect(getJieQiIndex('立春')).toBe(0);
    expect(getJieQiIndex('大寒')).toBe(23);
  });

  test('节气名称反查', () => {
    expect(getJieQiNameByIndex(0)).toBe('立春');
    expect(getJieQiNameByIndex(23)).toBe('大寒');
  });

  test('节/气判断', () => {
    expect(isJie('立春')).toBe(true);
    expect(isJie('雨水')).toBe(false);
    expect(isQi('雨水')).toBe(true);
    expect(isQi('立春')).toBe(false);
  });

  test('节气日期计算', () => {
    const result = getJieQiDate(2024, '立春');
    expect(result).not.toBeNull();
    expect(result!.month).toBe(2);
    expect(result!.day).toBe(4);
  });

  test('节气名称检索', () => {
    const result = getJieQiByName('立春');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('立春');
  });

  test('最近节气', () => {
    const result = getNearestJieQi(2024, 7, 15);
    expect(result).not.toBeNull();
    expect(result.prevJie).toBeTruthy();
    expect(result.nextJie).toBeTruthy();
  });

  test('当前节气', () => {
    const result = getCurrentJieQi(2024, 7, 15);
    expect(result).toBe('小暑');
  });
});

// ============================================================================
// 十二、日期工具测试
// ============================================================================

describe('日期工具', () => {
  test('天数差计算', () => {
    const diff = daysBetween(2024, 1, 1, 2024, 1, 10);
    expect(diff).toBe(9);
  });

  test('日期加减', () => {
    const result = addDaysToDate(2024, 1, 1, 5);
    expect(result).toBe('2024-01-06');
  });
});

// ============================================================================
// 十三、真太阳时测试
// ============================================================================

describe('真太阳时', () => {
  test('真太阳时校正', () => {
    const date = new Date(2024, 5, 15, 12, 0, 0); // 2024-06-15 12:00
    const result = calcTrueSolarTime(date, 116.4); // 北京经度
    expect(result).toBeTruthy();
    expect(result.longitude).toBe(116.4);
    expect(typeof result.totalOffset).toBe('number');
  });

  test('真太阳时时辰', () => {
    const date = new Date(2024, 5, 15, 12, 0, 0);
    const result = calcTrueSolarTime(date, 116.4);
    const hourIndex = getTrueSolarHourIndex(result.trueSolarTime);
    expect(typeof hourIndex).toBe('number');
    expect(hourIndex).toBeGreaterThanOrEqual(0);
    expect(hourIndex).toBeLessThan(24);
  });
});