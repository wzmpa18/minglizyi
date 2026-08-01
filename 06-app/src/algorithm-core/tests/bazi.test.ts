/**
 * ============================================================================
 * 测试用例集 —— 八字模块测试
 * ============================================================================
 * 协议：MIT License
 * 创建日期：2026-07-26
 * 版本：v1.0.0
 *
 * 基准来源：mystilight-8char (ISC) + V3.1 手册修正
 * 测试范围：
 *   - 四柱排盘（solarToBazi / buildBazi）
 *   - 空亡计算（getXunKong / isXunKong）
 *   - 纳音计算（getNaYin）
 *   - 十神计算（getShiShen）
 *   - 十二长生（getChangSheng）
 *   - 月柱天干（getMonthGan）
 *   - 时柱天干（getHourGan）
 *   - 身强身弱判定（calculateShenQiangRuo）
 *   - 大运计算（calculateDayun）
 *   - 格局判定（determinePattern）
 *   - 神煞计算（calculateShenSha）
 * ============================================================================
 */

import {
  solarToBazi,
  buildBazi,
  getXunKong,
  isXunKong,
  getNaYin,
  getShiShen,
  getChangSheng,
  getMonthGan,
  getHourGan,
  calculateShenSha,
} from '../modules/bazi/base';

import {
  calculateShenQiangRuo,
  calculateDayun,
  determinePattern,
} from '../modules/bazi/advanced';

// ============================================================================
// 标准测试用例
// ============================================================================

/** 测试用例 1: 公历 1984-02-04 08:00 (甲子年丙寅月戊辰日丙辰时) */
const TC1 = { year: 1984, month: 2, day: 4, hour: 8, gender: 'male' as const };

/** 测试用例 2: 公历 2000-01-01 12:00 */
const TC2 = { year: 2000, month: 1, day: 1, hour: 12, gender: 'female' as const };

/** 测试用例 3: 公历 2024-03-15 06:00 */
const TC3 = { year: 2024, month: 3, day: 15, hour: 6, gender: 'male' as const };

// ============================================================================
// 一、八字基础函数测试
// ============================================================================

describe('八字基础函数', () => {
  test('纳音查表', () => {
    expect(getNaYin('甲子')).toBe('海中金');
    expect(getNaYin('乙丑')).toBe('海中金');
    expect(getNaYin('丙寅')).toBe('炉中火');
    expect(getNaYin('癸亥')).toBe('大海水');
  });

  test('空亡计算', () => {
    expect(getXunKong('甲子')).toBe('戌亥');
    expect(getXunKong('甲戌')).toBe('申酉');
    expect(getXunKong('甲申')).toBe('午未');
    expect(getXunKong('甲午')).toBe('辰巳');
    expect(getXunKong('甲辰')).toBe('寅卯');
    expect(getXunKong('甲寅')).toBe('子丑');
  });

  test('空亡判断', () => {
    // 甲子旬空戌亥，所以地支戌在甲子旬为空亡
    expect(isXunKong('甲子', '戌')).toBe(true);
    expect(isXunKong('甲子', '亥')).toBe(true);
    expect(isXunKong('甲子', '子')).toBe(false);
  });

  test('十神计算', () => {
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

  test('十二长生', () => {
    expect(getChangSheng('甲', '亥')).toBe('长生');
    expect(getChangSheng('甲', '卯')).toBe('帝旺');
    expect(getChangSheng('甲', '未')).toBe('墓');
    expect(getChangSheng('乙', '午')).toBe('长生');
    expect(getChangSheng('庚', '巳')).toBe('长生');
  });

  test('月柱天干（五虎遁）', () => {
    // 甲己年，寅月天干为丙
    expect(getMonthGan('甲', '寅')).toBe('丙');
    expect(getMonthGan('己', '寅')).toBe('丙');
    // 乙庚年，寅月天干为戊
    expect(getMonthGan('乙', '寅')).toBe('戊');
    expect(getMonthGan('庚', '寅')).toBe('戊');
  });

  test('时柱天干（五鼠遁）', () => {
    // 甲己日，子时天干为甲
    expect(getHourGan('甲', '子')).toBe('甲');
    expect(getHourGan('己', '子')).toBe('甲');
    // 乙庚日，子时天干为丙
    expect(getHourGan('乙', '子')).toBe('丙');
    expect(getHourGan('庚', '子')).toBe('丙');
  });
});

// ============================================================================
// 二、四柱排盘测试
// ============================================================================

describe('八字四柱排盘', () => {
  test('solarToBazi 测试用例1: 1984-02-04 08:00', () => {
    const result = solarToBazi(TC1);
    expect(result).toBeTruthy();
    expect(result.pillars).toBeTruthy();
    expect(result.pillars.length).toBe(4);
    expect(result.dayGan).toBeTruthy();
    expect(result.dayZhi).toBeTruthy();
  });

  test('solarToBazi 测试用例2: 2000-01-01 12:00', () => {
    const result = solarToBazi(TC2);
    expect(result).toBeTruthy();
    expect(result.pillars).toBeTruthy();
    expect(result.pillars.length).toBe(4);
  });

  test('solarToBazi 测试用例3: 2024-03-15 06:00', () => {
    const result = solarToBazi(TC3);
    expect(result).toBeTruthy();
    expect(result.pillars).toBeTruthy();
    expect(result.pillars.length).toBe(4);
  });

  test('四柱信息完整性', () => {
    const result = solarToBazi(TC1);

    // 每柱字段完整
    result.pillars.forEach((pillar) => {
      expect(pillar.name).toBeTruthy();
      expect(pillar.gan).toBeTruthy();
      expect(pillar.zhi).toBeTruthy();
      expect(pillar.ganzhi).toBeTruthy();
      expect(pillar.wuxing).toBeTruthy();
      expect(pillar.wuxing.gan).toBeTruthy();
      expect(pillar.wuxing.zhi).toBeTruthy();
      expect(pillar.nayin).toBeTruthy();
      expect(pillar.canggan).toBeTruthy();
      expect(pillar.xunkong).toBeTruthy();
      expect(pillar.shishen).toBeTruthy();
      expect(pillar.changsheng).toBeTruthy();
    });
  });

  test('buildBazi 直接调用', () => {
    const bazi = buildBazi({
      yearGan: '甲', yearZhi: '子',
      monthGan: '丙', monthZhi: '寅',
      dayGan: '戊', dayZhi: '辰',
      hourGan: '丙', hourZhi: '辰',
      gender: 'male',
      birthYear: 1984, birthMonth: 2, birthDay: 4,
      daysToNextJie: 15, daysToPrevJie: 15,
    });

    expect(bazi).toBeTruthy();
    expect(bazi.pillars).toBeTruthy();
    expect(bazi.pillars.length).toBe(4);
    expect(bazi.dayGan).toBe('戊');
    expect(bazi.dayZhi).toBe('辰');
    expect(bazi.shenQiangRuo).toBeTruthy();
    expect(bazi.dayun).toBeTruthy();
    expect(bazi.shensha).toBeTruthy();
  });

  test('输入信息记录', () => {
    const result = solarToBazi(TC1);
    expect(result.input).toBeTruthy();
    expect(result.input.solarDate).toBeTruthy();
    expect(result.input.gender).toBe('male');
  });

  test('节气信息记录', () => {
    const result = solarToBazi(TC1);
    expect(result.jieQiInfo).toBeTruthy();
    expect(result.jieQiInfo.prevJie).toBeTruthy();
    expect(result.jieQiInfo.nextJie).toBeTruthy();
  });
});

// ============================================================================
// 三、身强身弱测试（V3.1 加权评分法）
// ============================================================================

describe('身强身弱判定', () => {
  test('身强身弱计算', () => {
    const result = solarToBazi(TC1);
    const sqr = calculateShenQiangRuo({
      dayGan: result.dayGan,
      monthZhi: result.pillars[1].zhi,
      yearZhi: result.pillars[0].zhi,
      dayZhi: result.pillars[2].zhi,
      hourZhi: result.pillars[3].zhi,
      yearGan: result.pillars[0].gan,
      monthGan: result.pillars[1].gan,
      hourGan: result.pillars[3].gan,
    });
    expect(sqr).toBeTruthy();
    expect(sqr.result).toBeTruthy(); // '身强' | '身弱' | '中和'
    expect(typeof sqr.totalScore).toBe('number');
    expect(sqr.totalScore).toBeGreaterThanOrEqual(0);
    expect(sqr.totalScore).toBeLessThanOrEqual(100);
  });

  test('V3.1 加权评分结构', () => {
    const result = solarToBazi(TC1);
    const sqr = calculateShenQiangRuo({
      dayGan: result.dayGan,
      monthZhi: result.pillars[1].zhi,
      yearZhi: result.pillars[0].zhi,
      dayZhi: result.pillars[2].zhi,
      hourZhi: result.pillars[3].zhi,
      yearGan: result.pillars[0].gan,
      monthGan: result.pillars[1].gan,
      hourGan: result.pillars[3].gan,
    });
    // 月令旺衰 (40%)
    expect(sqr.yueLing).toBeTruthy();
    expect(sqr.yueLing.level).toBeTruthy();
    expect(typeof sqr.yueLing.score).toBe('number');
    // 得地 (30%)
    expect(sqr.deDi).toBeTruthy();
    expect(sqr.deDi.details).toBeTruthy();
    expect(sqr.deDi.details.length).toBe(4); // 年月日时四柱
    // 得势 (30%)
    expect(sqr.deShi).toBeTruthy();
    expect(sqr.deShi.details).toBeTruthy();
    expect(sqr.deShi.details.length).toBe(3); // 年干月干时干
    // 评分明细
    expect(sqr.breakdown).toBeTruthy();
  });

  test('buildBazi 自动集成身强身弱', () => {
    const result = solarToBazi(TC1);
    expect(result.shenQiangRuo).toBeTruthy();
    expect(result.shenQiangRuo.result).toBeTruthy();
  });
});

// ============================================================================
// 四、大运测试（V3.1 精确版）
// ============================================================================

describe('大运计算', () => {
  test('大运起运计算', () => {
    const result = solarToBazi(TC1);
    const dayun = calculateDayun({
      yearGan: result.pillars[0].gan,
      yearZhi: result.pillars[0].zhi,
      monthGanZhi: result.pillars[1].ganzhi,
      gender: 'male',
      birthYear: 1984,
      birthMonth: 2,
      birthDay: 4,
      daysToNextJie: result.jieQiInfo.daysToNextJie,
      daysToPrevJie: result.jieQiInfo.daysToPrevJie,
      nextJieName: result.jieQiInfo.nextJie,
      prevJieName: result.jieQiInfo.prevJie,
    });
    expect(dayun).toBeTruthy();
    expect(dayun.startAge).toBeGreaterThan(0);
    expect(dayun.dayunList).toBeTruthy();
    expect(dayun.dayunList.length).toBe(10); // 10运
    expect(dayun.direction).toBeTruthy(); // '顺排' | '逆排'
    expect(dayun.startDate).toBeTruthy();
  });

  test('三天折一岁（精确到小数点后2位）', () => {
    const result = solarToBazi(TC1);
    const dayun = calculateDayun({
      yearGan: result.pillars[0].gan,
      yearZhi: result.pillars[0].zhi,
      monthGanZhi: result.pillars[1].ganzhi,
      gender: 'male',
      birthYear: 1984,
      birthMonth: 2,
      birthDay: 4,
      daysToNextJie: result.jieQiInfo.daysToNextJie,
      daysToPrevJie: result.jieQiInfo.daysToPrevJie,
      nextJieName: result.jieQiInfo.nextJie,
      prevJieName: result.jieQiInfo.prevJie,
    });
    expect(dayun.startAge).toBeGreaterThan(0);
    expect(Number.isFinite(dayun.startAge)).toBe(true);
    // 验证精确到小数点后2位
    const startAgeStr = dayun.startAge.toString();
    const decimalPart = startAgeStr.includes('.') ? startAgeStr.split('.')[1] : '';
    expect(decimalPart.length).toBeLessThanOrEqual(2);
  });

  test('大运列表每运间隔10年', () => {
    const result = solarToBazi(TC1);
    const dayun = calculateDayun({
      yearGan: result.pillars[0].gan,
      yearZhi: result.pillars[0].zhi,
      monthGanZhi: result.pillars[1].ganzhi,
      gender: 'male',
      birthYear: 1984,
      birthMonth: 2,
      birthDay: 4,
      daysToNextJie: result.jieQiInfo.daysToNextJie,
      daysToPrevJie: result.jieQiInfo.daysToPrevJie,
      nextJieName: result.jieQiInfo.nextJie,
      prevJieName: result.jieQiInfo.prevJie,
    });
    for (let i = 1; i < dayun.dayunList.length; i++) {
      const diff = dayun.dayunList[i].startAge - dayun.dayunList[i - 1].startAge;
      expect(Math.abs(diff - 10)).toBeLessThan(0.1); // 约10年
    }
  });

  test('buildBazi 自动集成大运', () => {
    const result = solarToBazi(TC1);
    expect(result.dayun).toBeTruthy();
    expect(result.dayun.dayunList).toBeTruthy();
    expect(result.dayun.dayunList.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 五、格局测试（V3.1 子平格局法）
// ============================================================================

describe('格局判定', () => {
  test('子平格局法', () => {
    const result = solarToBazi(TC1);
    const pattern = determinePattern({
      dayGan: result.dayGan,
      monthZhi: result.pillars[1].zhi,
    });
    expect(pattern).toBeTruthy();
    expect(pattern.mainPattern).toBeTruthy();
    expect(pattern.patternType).toBeTruthy();
    expect(pattern.patterns).toBeTruthy();
    expect(pattern.patterns.length).toBeGreaterThan(0);
    expect(pattern.detail).toBeTruthy();
    expect(pattern.detail.monthZhi).toBeTruthy();
    expect(pattern.detail.cangGan).toBeTruthy();
    expect(pattern.detail.benQi).toBeTruthy();
  });

  test('buildBazi 自动集成格局', () => {
    const result = solarToBazi(TC1);
    expect(result.patterns).toBeTruthy();
    expect(result.mainPattern).toBeTruthy();
    expect(result.patternType).toBeTruthy();
  });
});

// ============================================================================
// 六、神煞测试
// ============================================================================

describe('八字神煞计算', () => {
  test('神煞计算', () => {
    const result = solarToBazi(TC1);
    const shensha = calculateShenSha({
      dayGan: result.dayGan,
      yearGan: result.pillars[0].gan,
      yearZhi: result.pillars[0].zhi,
      monthZhi: result.pillars[1].zhi,
      dayZhi: result.pillars[2].zhi,
      allGanZhi: result.pillars.map((p) => p.ganzhi),
    });
    expect(shensha).toBeTruthy();
    expect(typeof shensha).toBe('object');
  });

  test('buildBazi 自动集成神煞', () => {
    const result = solarToBazi(TC1);
    expect(result.shensha).toBeTruthy();
    expect(typeof result.shensha).toBe('object');
  });
});