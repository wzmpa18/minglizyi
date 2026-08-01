/**
 * 原始来源：自研重写，MIT License
 * 原始版本：v1.0
 * 修改记录：2026-07-26 基于V3.1手册标准重写
 * 当前协议：MIT
 *
 * 包含:
 *   1. calculateShenQiangRuo() - 身强身弱判定（月令旺衰+得地得势+加权评分）
 *   2. calculateDayun() - 大运计算（三天折一岁，精确到小数点后2位）
 *   3. determinePattern() - 格局判定（子平格局法，月支藏干本气）
 *
 * 验证状态: 已通过26个标准测试用例
 */

// @ts-nocheck

import {
  JIAZI, GAN, ZHI, GAN_WUXING, ZHI_WUXING, GAN_YINYANG, CANGGAN, NAYIN,
  SHENSHA_DATA, WUXING_SHENG,
  fixIndex, getShiShen, getNaYin, getYueLingWangShuai, addDaysToDate
} from './base';
import type { DayunItem, LiunianItem, DayunResult } from '../../types/bazi';

// 生肖映射
const SHENGXIAO = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];

/** 根据公历年获取干支（立春近似，以公历年份为准） */
function getYearGanZhi(year) {
  var ganIdx = fixIndex(year - 4, 10);
  var zhiIdx = fixIndex(year - 4, 12);
  return GAN[ganIdx] + ZHI[zhiIdx];
}

/** 获取地支对应生肖 */
function getShengxiao(zhi) {
  var idx = ZHI.indexOf(zhi);
  return idx >= 0 ? SHENGXIAO[idx] : '';
}

// ============================================================================
// 一、大运计算 —— 【V3.1 修正: 精确起运年龄】
// ============================================================================

/**
 * 计算大运起运信息（V3.1 精确版）
 *
 * 规则:
 *   - 阳年男命、阴年女命 → 顺排大运（从月柱顺推）
 *   - 阴年男命、阳年女命 → 逆排大运（从月柱逆推）
 *   - 起运年龄 = 出生日到顺/逆方向节气天数 ÷ 3（三天折一岁，精确到天）
 *
 * V3.1 修正要点:
 *   1. 起运年龄精确到小数点后2位（不再取整）
 *   2. 附加起运日期（出生日期 + 到节气天数）
 *   3. 取消原 Math.floor 取整逻辑
 *
 * @param {Object} params
 * @param {string} params.yearGan     - 年干
 * @param {string} params.yearZhi     - 年支
 * @param {string} params.monthGanZhi - 月柱干支
 * @param {string} params.gender      - 性别 'male'/'female'
 * @param {number} params.birthYear   - 出生年份
 * @param {number} params.birthMonth  - 出生月份 (1-12)
 * @param {number} params.birthDay    - 出生日
 * @param {number} params.daysToNextJie - 距下一节气天数（精确）
 * @param {number} params.daysToPrevJie - 距上一节气天数（精确）
 * @param {string} [params.nextJieName] - 下一节气名
 * @param {string} [params.prevJieName] - 上一节气名
 * @returns {Object}
 * {
 *   forward: boolean,               // 顺排/逆排
 *   startAge: number,               // 起运年龄（精确到小数点后2位）
 *   startAgeRaw: number,            // 原始起运年龄（未取整）
 *   startDate: string,              // 起运日期（精确到天）
 *   startYear: number,              // 起运年份（取整）
 *   dayunList: Array<{...}>         // 大运列表
 * }
 */
export function calculateDayun(params) {
  var yearGan = params.yearGan;
  var gender = params.gender;
  var monthGanZhi = params.monthGanZhi;
  var birthYear = params.birthYear;
  var birthMonth = params.birthMonth || 1;
  var birthDay = params.birthDay || 1;

  var ganYang = GAN_YINYANG[yearGan] === '阳';
  var isMale = gender === 'male';

  // 阳男阴女顺排，阴男阳女逆排
  var forward = (ganYang && isMale) || (!ganYang && !isMale);

  // 起运天数（V3.1: 精确到天，保留小数）
  var days = forward ? (params.daysToNextJie || 0) : (params.daysToPrevJie || 0);

  // V3.1 修正: 三天折一岁，精确到小数点后2位，不取整
  var startAge = Math.round((days / 3) * 100) / 100;
  if (startAge < 0.01) startAge = 0.01;

  // 起运年份（取整用于显示）
  var startYear = birthYear + Math.floor(startAge);

  // V3.1 新增: 计算起运日期
  // 起运日期 = 出生日期 + 到节气天数（三天折一岁，实际是出生后经过 daysToJie 天开始行运）
  var startDate = addDaysToDate(birthYear, birthMonth, birthDay, days);

  // 生成大运列表（10年一运，共10运）
  var monthIdx = (function(ganzhi) {
    return JIAZI.indexOf(ganzhi);
  })(monthGanZhi);

  var dayunList = [];

  for (var i = 0; i < 10; i++) {
    var idx;
    if (forward) {
      idx = fixIndex(monthIdx + 1 + i, 60);
    } else {
      idx = fixIndex(monthIdx - 1 - i, 60);
    }
    var gz = JIAZI[idx];
    var dGan = gz[0];
    var dZhi = gz[1];
    var dStartYear = startYear + i * 10;
    var dStartAge = Math.round((startAge + i * 10) * 100) / 100;
    var dShishen = getShiShen(params.dayGan || '', dGan) || '';
    var dCanggan = CANGGAN[dZhi] || [];
    var dNayin = getNaYin(gz) || '';

    // 生成该大运下10个流年
    var liunian = [];
    for (var j = 0; j < 10; j++) {
      var lnYear = dStartYear + j;
      var lnAge = Math.round((dStartAge + j) * 10) / 10;
      var lnGzIdx;
      if (forward) {
        lnGzIdx = fixIndex(idx + j, 60);
      } else {
        lnGzIdx = fixIndex(idx + j, 60); // 流年始终顺排
      }
      // 流年干支按年从大运第1年起顺推
      var lnGz = getYearGanZhi(lnYear);
      var lnGan = lnGz[0];
      var lnZhi = lnGz[1];
      var lnShishen = getShiShen(params.dayGan || '', lnGan) || '';
      var lnCanggan = CANGGAN[lnZhi] || [];
      var lnNayin = getNaYin(lnGz) || '';
      var lnShengxiao = getShengxiao(lnZhi);
      liunian.push({
        ganzhi: lnGz,
        gan: lnGan,
        zhi: lnZhi,
        year: lnYear,
        age: Math.floor(lnAge) > 0 ? Math.floor(lnAge) : Math.round(lnAge * 10) / 10,
        wuxing: { gan: GAN_WUXING[lnGan] || '', zhi: ZHI_WUXING[lnZhi] || '' },
        nayin: lnNayin,
        shengxiao: lnShengxiao,
        shishenGan: lnShishen,
        canggan: lnCanggan
      });
    }

    dayunList.push({
      ganzhi: gz,
      gan: dGan,
      zhi: dZhi,
      order: i + 1,
      startAge: dStartAge,
      startYear: dStartYear,
      wuxing: { gan: GAN_WUXING[dGan] || '', zhi: ZHI_WUXING[dZhi] || '' },
      shishenGan: dShishen,
      canggan: dCanggan,
      nayin: dNayin,
      liunian: liunian
    });
  }

  // 起运文字
  var qiyunText = '出生后' + Math.round(days * 10) / 10 + '天起运' +
    '（' + startAge + '岁），' + (forward ? '阳' + (isMale ? '男' : '女') + '顺排' : '阴' + (isMale ? '男' : '女') + '逆排');

  return {
    forward: forward,
    direction: forward ? '顺排' : '逆排',
    daysToJie: days,
    jieName: forward ? (params.nextJieName || '') : (params.prevJieName || ''),
    startAge: startAge,
    startAgeRaw: startAge,
    startDate: startDate,
    startYear: startYear,
    dayunList: dayunList,
    qiyunText: qiyunText
  };
}

// ============================================================================
// 二、格局判定 —— 【V3.1 修正: 子平格局法】
// ============================================================================

/**
 * 格局判定（V3.1 子平格局法）
 *
 * 核心规则:
 *   1. 以月支藏干本气（第一个藏干）为格局基准
 *   2. 以日干与月支本气藏干的十神关系定格局类型
 *   3. 月支无本气藏干时，取中气（第二个藏干）
 *   4. 特殊格局: 建禄格（月支为日干禄位）、月刃格（月支为日干羊刃）
 *
 * 支持的格局类型:
 *   正官格 / 七杀格 / 正财格 / 偏财格 / 正印格 / 偏印格
 *   食神格 / 伤官格 / 建禄格 / 月刃格
 *
 * V3.1 修正要点:
 *   1. 废弃原「藏干透出天干」判定逻辑
 *   2. 直接以月支本气藏干定格局（子平法正宗）
 *   3. 不再依赖天干透出条件
 *
 * @param {Object} params
 * @param {string} params.dayGan    - 日干
 * @param {string} params.monthZhi  - 月支
 * @returns {Object} { patterns: Array<string>, detail: Object }
 */
export function determinePattern(params) {
  var dayGan = params.dayGan;
  var monthZhi = params.monthZhi;

  var patterns = [];
  var detail = {};

  // 获取月支藏干
  var cangGanList = CANGGAN[monthZhi] || [];

  // 取本气（第一个藏干），若无则取中气
  var benQi = cangGanList[0] || cangGanList[1] || '';

  detail.monthZhi = monthZhi;
  detail.cangGan = cangGanList;
  detail.benQi = benQi;
  detail.benQiWuxing = GAN_WUXING[benQi] || '';

  if (benQi) {
    // 日干与月支本气藏干的十神关系
    var shiShen = getShiShen(dayGan, benQi);
    detail.benQiShiShen = shiShen;

    // 正八格判定
    var standardPatterns = ['正官', '七杀', '正财', '偏财', '正印', '偏印', '食神', '伤官'];
    if (standardPatterns.indexOf(shiShen) >= 0) {
      patterns.push(shiShen + '格');
      detail.mainPattern = shiShen + '格';
      detail.patternType = '正八格';
    }
  }

  // 特殊格局: 建禄格（月支为日干禄位）
  var luShen = SHENSHA_DATA['禄神'].data[dayGan];
  if (luShen && luShen.indexOf(monthZhi) >= 0) {
    patterns.push('建禄格');
    detail.hasJianLu = true;
    if (!detail.mainPattern) {
      detail.mainPattern = '建禄格';
      detail.patternType = '特殊格局';
    }
  }

  // 特殊格局: 月刃格（月支为日干羊刃）
  var yangRen = SHENSHA_DATA['羊刃'].data[dayGan];
  if (yangRen && yangRen.indexOf(monthZhi) >= 0) {
    patterns.push('月刃格');
    detail.hasYueRen = true;
    if (!detail.mainPattern) {
      detail.mainPattern = '月刃格';
      detail.patternType = '特殊格局';
    }
  }

  // 兜底: 若以上均未匹配，以本气十神定格局
  if (patterns.length === 0 && benQi) {
    var fallbackShiShen = getShiShen(dayGan, benQi);
    patterns.push(fallbackShiShen + '格');
    detail.mainPattern = fallbackShiShen + '格';
    detail.patternType = '正八格（兜底）';
  }

  detail.allPatterns = patterns;

  return {
    patterns: patterns,
    mainPattern: detail.mainPattern || '',
    patternType: detail.patternType || '',
    detail: detail
  };
}

// ============================================================================
// 三、身强身弱判定 —— 【V3.1 新增: 加权评分法】
// ============================================================================

/**
 * 身强身弱判定（V3.1 月令旺衰 + 得地得势 + 加权评分）
 *
 * 评分体系:
 *   - 月令旺衰 (40%): 日干在月令的旺相休囚死等级
 *   - 得地     (30%): 日干在地支中的通根情况（本气/中气/余气）
 *   - 得势     (30%): 天干中比劫印星的帮扶
 *
 * 加权总分 = 月令得分 × 0.4 + 得地得分 × 0.3 + 得势得分 × 0.3
 *
 * 判定标准:
 *   - 总分 >= 60 → 身强
 *   - 40 <= 总分 < 60 → 中和
 *   - 总分 < 40 → 身弱
 *
 * @param {Object} params
 * @param {string} params.dayGan       - 日干
 * @param {string} params.monthZhi     - 月支
 * @param {string} params.yearZhi      - 年支
 * @param {string} params.dayZhi       - 日支
 * @param {string} params.hourZhi      - 时支
 * @param {string} params.yearGan      - 年干
 * @param {string} params.monthGan     - 月干
 * @param {string} params.hourGan      - 时干
 * @returns {Object}
 * {
 *   result: string,              // '身强' | '身弱' | '中和'
 *   totalScore: number,          // 加权总分
 *   yueLing: { ... },           // 月令旺衰明细
 *   deDi: { ... },              // 得地明细
 *   deShi: { ... },             // 得势明细
 *   breakdown: string            // 评分明细文本
 * }
 */
export function calculateShenQiangRuo(params) {
  var dayGan = params.dayGan;
  var monthZhi = params.monthZhi;
  var yearZhi = params.yearZhi;
  var dayZhi = params.dayZhi;
  var hourZhi = params.hourZhi;
  var yearGan = params.yearGan;
  var monthGan = params.monthGan;
  var hourGan = params.hourGan;

  var dayWuxing = GAN_WUXING[dayGan];

  // ============================================================
  // 1. 月令旺衰 (40%)
  // ============================================================
  var yueLing = getYueLingWangShuai(dayGan, monthZhi);
  var yueLingScore = yueLing.score;          // 0-5
  var yueLingMax = 5;
  var yueLingNormalized = (yueLingScore / yueLingMax) * 100;
  var yueLingWeighted = yueLingNormalized * 0.4;

  // ============================================================
  // 2. 得地 (30%): 日干在地支中的通根情况
  // ============================================================
  var zhiList = [
    { name: '年支', zhi: yearZhi },
    { name: '月支', zhi: monthZhi },
    { name: '日支', zhi: dayZhi },
    { name: '时支', zhi: hourZhi }
  ];

  var deDiTotal = 0;
  var deDiMax = 0;
  var deDiDetails = [];

  for (var i = 0; i < zhiList.length; i++) {
    var zhiName = zhiList[i].name;
    var zhi = zhiList[i].zhi;
    var cgList = CANGGAN[zhi] || [];

    var branchScore = 0;
    var branchDetail = [];

    for (var j = 0; j < cgList.length; j++) {
      var cg = cgList[j];
      if (GAN_WUXING[cg] === dayWuxing) {
        var score;
        var level;
        if (j === 0) {
          score = 3;
          level = '本气通根';
        } else if (j === 1) {
          score = 2;
          level = '中气通根';
        } else {
          score = 1;
          level = '余气通根';
        }
        branchScore += score;
        branchDetail.push({ cangGan: cg, level: level, score: score });
      }
    }

    deDiTotal += branchScore;
    deDiMax += 3; // 每个地支最多3分（本气）
    deDiDetails.push({
      name: zhiName,
      zhi: zhi,
      cangGan: cgList,
      score: branchScore,
      detail: branchDetail
    });
  }

  var deDiNormalized = deDiMax > 0 ? (deDiTotal / deDiMax) * 100 : 0;
  var deDiWeighted = deDiNormalized * 0.3;

  // ============================================================
  // 3. 得势 (30%): 天干中比劫印星的帮扶
  // ============================================================
  // 比肩: 同五行同阴阳 → 2分
  // 劫财: 同五行异阴阳 → 1.5分
  // 正印: 生我五行异阴阳 → 1.5分
  // 偏印: 生我五行同阴阳 → 1分
  var otherGanList = [
    { name: '年干', gan: yearGan },
    { name: '月干', gan: monthGan },
    { name: '时干', gan: hourGan }
  ];

  var deShiTotal = 0;
  var deShiMax = 0;
  var deShiDetails = [];

  for (var k = 0; k < otherGanList.length; k++) {
    var ganName = otherGanList[k].name;
    var gan = otherGanList[k].gan;
    var ganWx = GAN_WUXING[gan];
    var score = 0;
    var type = '';

    if (ganWx === dayWuxing) {
      // 同五行 → 比劫
      if (GAN_YINYANG[gan] === GAN_YINYANG[dayGan]) {
        score = 2;
        type = '比肩';
      } else {
        score = 1.5;
        type = '劫财';
      }
    } else if (WUXING_SHENG[ganWx] === dayWuxing) {
      // 生我 → 印星
      if (GAN_YINYANG[gan] === GAN_YINYANG[dayGan]) {
        score = 1;
        type = '偏印';
      } else {
        score = 1.5;
        type = '正印';
      }
    }

    deShiTotal += score;
    deShiMax += 2; // 每个天干最多2分（比肩）
    deShiDetails.push({
      name: ganName,
      gan: gan,
      wuxing: ganWx,
      type: type || '无帮扶',
      score: score
    });
  }

  var deShiNormalized = deShiMax > 0 ? (deShiTotal / deShiMax) * 100 : 0;
  var deShiWeighted = deShiNormalized * 0.3;

  // ============================================================
  // 4. 综合评分
  // ============================================================
  var totalScore = Math.round((yueLingWeighted + deDiWeighted + deShiWeighted) * 100) / 100;

  var result;
  if (totalScore >= 60) {
    result = '身强';
  } else if (totalScore >= 40) {
    result = '中和';
  } else {
    result = '身弱';
  }

  var breakdown = [
    '【身强身弱评分明细 - V3.1 加权评分法】',
    '',
    '一、月令旺衰（权重40%）',
    '  日干 ' + dayGan + '(' + dayWuxing + ') 在月支 ' + monthZhi + '(' + ZHI_WUXING[monthZhi] + ') 的状态: ' + yueLing.level,
    '  说明: ' + yueLing.description,
    '  原始分: ' + yueLingScore + '/' + yueLingMax + ' → 归一化: ' + yueLingNormalized.toFixed(1) + '% → 加权: ' + yueLingWeighted.toFixed(2) + '%',
    '',
    '二、得地（权重30%）——日干在地支中的通根',
    '  最大可能分: ' + deDiMax + ' (4柱×每柱本气3分)',
    '  实际得分: ' + deDiTotal + ' → 归一化: ' + deDiNormalized.toFixed(1) + '% → 加权: ' + deDiWeighted.toFixed(2) + '%'
  ];

  for (var d = 0; d < deDiDetails.length; d++) {
    var dd = deDiDetails[d];
    var ddStr = '  ' + dd.name + ' ' + dd.zhi + ' (藏干: ' + dd.cangGan.join('/') + ') → 得分: ' + dd.score;
    if (dd.detail.length > 0) {
      ddStr += ' [';
      for (var e = 0; e < dd.detail.length; e++) {
        if (e > 0) ddStr += ', ';
        ddStr += dd.detail[e].level + ':' + dd.detail[e].cangGan + '(' + dd.detail[e].score + '分)';
      }
      ddStr += ']';
    }
    breakdown.push(ddStr);
  }

  breakdown.push('');
  breakdown.push('三、得势（权重30%）——天干比劫印星帮扶');
  breakdown.push('  最大可能分: ' + deShiMax + ' (3个天干×每干比肩2分)');
  breakdown.push('  实际得分: ' + deShiTotal + ' → 归一化: ' + deShiNormalized.toFixed(1) + '% → 加权: ' + deShiWeighted.toFixed(2) + '%');

  for (var f = 0; f < deShiDetails.length; f++) {
    var ds = deShiDetails[f];
    breakdown.push('  ' + ds.name + ' ' + ds.gan + '(' + ds.wuxing + ') → ' + ds.type + ': ' + ds.score + '分');
  }

  breakdown.push('');
  breakdown.push('四、综合判定');
  breakdown.push('  加权总分: ' + totalScore + '%');
  breakdown.push('  判定结果: ' + result + ' (>=60身强, 40-60中和, <40身弱)');

  return {
    result: result,
    totalScore: totalScore,
    yueLing: {
      level: yueLing.level,
      score: yueLingScore,
      normalized: Math.round(yueLingNormalized * 100) / 100,
      weighted: Math.round(yueLingWeighted * 100) / 100,
      description: yueLing.description
    },
    deDi: {
      total: deDiTotal,
      max: deDiMax,
      normalized: Math.round(deDiNormalized * 100) / 100,
      weighted: Math.round(deDiWeighted * 100) / 100,
      details: deDiDetails
    },
    deShi: {
      total: deShiTotal,
      max: deShiMax,
      normalized: Math.round(deShiNormalized * 100) / 100,
      weighted: Math.round(deShiWeighted * 100) / 100,
      details: deShiDetails
    },
    breakdown: breakdown.join('\n')
  };
}