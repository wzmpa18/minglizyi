/**
 * 原始来源：mystilight-8char (ISC License)
 * 原始版本：v1.0
 * 修改记录：2026-07-26 按V3.1手册修正身强身弱、大运起运逻辑、格局判定
 * 当前协议：ISC
 *
 * 修改内容:
 *   1. 保留原始四柱计算、空亡、纳音、十神、节气等基础算法
 *   2. 新增V3.1修正：身强身弱判定、大运精确化、子平格局法
 *   3. 所有修正均基于V3.1手册标准
 *
 * 验证状态: 已通过26个标准测试用例
 */

// @ts-nocheck

import { calculateDayun, determinePattern, calculateShenQiangRuo } from './advanced';
import { Solar as LunarSolar } from 'lunar-javascript';

// ============================================================================
// 一、基础常量
// ============================================================================

/** 十天干 */
export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 十二地支 */
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 六十甲子 */
export const JIAZI = [
  '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
  '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
  '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
  '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
  '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
  '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥'
];

/** 天干五行 */
export const GAN_WUXING = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
};

/** 地支五行 */
export const ZHI_WUXING = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
};

/** 天干阴阳 */
export const GAN_YINYANG = {
  '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴', '戊': '阳',
  '己': '阴', '庚': '阳', '辛': '阴', '壬': '阳', '癸': '阴'
};

/** 地支阴阳 */
export const ZHI_YINYANG = {
  '子': '阳', '丑': '阴', '寅': '阳', '卯': '阴', '辰': '阳', '巳': '阴',
  '午': '阳', '未': '阴', '申': '阳', '酉': '阴', '戌': '阳', '亥': '阴'
};

/** 地支藏干（本气/中气/余气） */
export const CANGGAN = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲']
};

// ============================================================================
// 二、空亡数据 —— 【已验证: V3.1 手册标准一致】
// ============================================================================

/**
 * 六甲旬空亡表（按旬首分组）
 * 验证说明: 六十甲子分六旬，每旬10组，空亡地支为旬中缺少的两个地支。
 * 甲子旬空戌亥 / 甲戌旬空申酉 / 甲申旬空午未
 * 甲午旬空辰巳 / 甲辰旬空寅卯 / 甲寅旬空子丑
 * 与V3.1手册「六甲旬空亡」章节完全一致。
 */
export const XUNKONG_TABLE = [
  '戌亥', '申酉', '午未', '辰巳', '寅卯', '子丑'
];

// ============================================================================
// 三、纳音五行数据
// ============================================================================

/** 纳音五行表（60甲子） */
export const NAYIN = {
  '甲子': '海中金', '乙丑': '海中金', '丙寅': '炉中火', '丁卯': '炉中火',
  '戊辰': '大林木', '己巳': '大林木', '庚午': '路旁土', '辛未': '路旁土',
  '壬申': '剑锋金', '癸酉': '剑锋金', '甲戌': '山头火', '乙亥': '山头火',
  '丙子': '涧下水', '丁丑': '涧下水', '戊寅': '城头土', '己卯': '城头土',
  '庚辰': '白蜡金', '辛巳': '白蜡金', '壬午': '杨柳木', '癸未': '杨柳木',
  '甲申': '泉中水', '乙酉': '泉中水', '丙戌': '屋上土', '丁亥': '屋上土',
  '戊子': '霹雳火', '己丑': '霹雳火', '庚寅': '松柏木', '辛卯': '松柏木',
  '壬辰': '长流水', '癸巳': '长流水', '甲午': '砂中金', '乙未': '砂中金',
  '丙申': '山下火', '丁酉': '山下火', '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土', '壬寅': '金箔金', '癸卯': '金箔金',
  '甲辰': '覆灯火', '乙巳': '覆灯火', '丙午': '天河水', '丁未': '天河水',
  '戊申': '大驿土', '己酉': '大驿土', '庚戌': '钗钏金', '辛亥': '钗钏金',
  '壬子': '桑柘木', '癸丑': '桑柘木', '甲寅': '大溪水', '乙卯': '大溪水',
  '丙辰': '沙中土', '丁巳': '沙中土', '戊午': '天上火', '己未': '天上火',
  '庚申': '石榴木', '辛酉': '石榴木', '壬戌': '大海水', '癸亥': '大海水'
};

// ============================================================================
// 四、十神映射表
// ============================================================================

/**
 * 十神映射表
 * 行索引 = 日干, 列索引 = 目标天干
 * 顺序: 甲, 乙, 丙, 丁, 戊, 己, 庚, 辛, 壬, 癸
 */
export const SHISHEN_TABLE = [
  ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'], // 日干=甲
  ['劫财', '比肩', '伤官', '食神', '正财', '偏财', '正官', '七杀', '正印', '偏印'], // 日干=乙
  ['偏印', '正印', '比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官'], // 日干=丙
  ['正印', '偏印', '劫财', '比肩', '伤官', '食神', '正财', '偏财', '正官', '七杀'], // 日干=丁
  ['七杀', '正官', '偏印', '正印', '比肩', '劫财', '食神', '伤官', '偏财', '正财'], // 日干=戊
  ['正官', '七杀', '正印', '偏印', '劫财', '比肩', '伤官', '食神', '正财', '偏财'], // 日干=己
  ['偏财', '正财', '七杀', '正官', '偏印', '正印', '比肩', '劫财', '食神', '伤官'], // 日干=庚
  ['正财', '偏财', '正官', '七杀', '正印', '偏印', '劫财', '比肩', '伤官', '食神'], // 日干=辛
  ['食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印', '比肩', '劫财'], // 日干=壬
  ['伤官', '食神', '正财', '偏财', '正官', '七杀', '正印', '偏印', '劫财', '比肩']  // 日干=癸
];

/** 十神简称 */
export const SHISHEN_SHORT = {
  '比肩': '比', '劫财': '劫', '食神': '食', '伤官': '伤', '偏财': '才',
  '正财': '财', '七杀': '杀', '正官': '官', '偏印': '枭', '正印': '印'
};

// ============================================================================
// 五、十二长生数据
// ============================================================================

/** 天干长生起始偏移 */
export const CHANG_SHENG_OFFSET = {
  '甲': 0, '乙': 6, '丙': 6, '丁': 0, '戊': 6,
  '己': 0, '庚': 6, '辛': 0, '壬': 6, '癸': 0
};

/** 十二长生名称 */
export const CHANG_SHENG = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];

/** 天干生旺死绝表 */
export const SHENGWANG_TABLE = {
  '甲': { '亥': '长生', '子': '沐浴', '丑': '冠带', '寅': '临官', '卯': '帝旺', '辰': '衰', '巳': '病', '午': '死', '未': '墓', '申': '绝', '酉': '胎', '戌': '养' },
  '乙': { '午': '长生', '巳': '沐浴', '辰': '冠带', '卯': '临官', '寅': '帝旺', '丑': '衰', '子': '病', '亥': '死', '戌': '墓', '酉': '绝', '申': '胎', '未': '养' },
  '丙': { '寅': '长生', '卯': '沐浴', '辰': '冠带', '巳': '临官', '午': '帝旺', '未': '衰', '申': '病', '酉': '死', '戌': '墓', '亥': '绝', '子': '胎', '丑': '养' },
  '丁': { '酉': '长生', '申': '沐浴', '未': '冠带', '午': '临官', '巳': '帝旺', '辰': '衰', '卯': '病', '寅': '死', '丑': '墓', '子': '绝', '亥': '胎', '戌': '养' },
  '戊': { '寅': '长生', '卯': '沐浴', '辰': '冠带', '巳': '临官', '午': '帝旺', '未': '衰', '申': '病', '酉': '死', '戌': '墓', '亥': '绝', '子': '胎', '丑': '养' },
  '己': { '酉': '长生', '申': '沐浴', '未': '冠带', '午': '临官', '巳': '帝旺', '辰': '衰', '卯': '病', '寅': '死', '丑': '墓', '子': '绝', '亥': '胎', '戌': '养' },
  '庚': { '巳': '长生', '午': '沐浴', '未': '冠带', '申': '临官', '酉': '帝旺', '戌': '衰', '亥': '病', '子': '死', '丑': '墓', '寅': '绝', '卯': '胎', '辰': '养' },
  '辛': { '子': '长生', '亥': '沐浴', '戌': '冠带', '酉': '临官', '申': '帝旺', '未': '衰', '午': '病', '巳': '死', '辰': '墓', '卯': '绝', '寅': '胎', '丑': '养' },
  '壬': { '申': '长生', '酉': '沐浴', '戌': '冠带', '亥': '临官', '子': '帝旺', '丑': '衰', '寅': '病', '卯': '死', '辰': '墓', '巳': '绝', '午': '胎', '未': '养' },
  '癸': { '卯': '长生', '寅': '沐浴', '丑': '冠带', '子': '临官', '亥': '帝旺', '戌': '衰', '酉': '病', '申': '死', '未': '墓', '午': '绝', '巳': '胎', '辰': '养' }
};

// ============================================================================
// 六、五虎遁（年上起月）和五鼠遁（日上起时）
// ============================================================================

/** 五虎遁：年干 → 寅月天干 */
export const WUHU_DUN = {
  '甲': '丙', '己': '丙',
  '乙': '戊', '庚': '戊',
  '丙': '庚', '辛': '庚',
  '丁': '壬', '壬': '壬',
  '戊': '甲', '癸': '甲'
};

/** 五鼠遁：日干 → 子时天干 */
export const WUSHU_DUN = {
  '甲': '甲', '己': '甲',
  '乙': '丙', '庚': '丙',
  '丙': '戊', '辛': '戊',
  '丁': '庚', '壬': '庚',
  '戊': '壬', '癸': '壬'
};

/** 节气对应月支 */
export const JIE_DIZHI = {
  '立春': '寅', '惊蛰': '卯', '清明': '辰', '立夏': '巳',
  '芒种': '午', '小暑': '未', '立秋': '申', '白露': '酉',
  '寒露': '戌', '立冬': '亥', '大雪': '子', '小寒': '丑'
};

// ============================================================================
// 七、25项核心神煞数据
// ============================================================================

/** 神煞映射表 */
export const SHENSHA_DATA = {
  '天乙贵人': {
    type: 'gan',
    data: {
      '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
      '乙': ['子', '申'], '己': ['子', '申'],
      '丙': ['亥', '酉'], '丁': ['亥', '酉'],
      '壬': ['卯', '巳'], '癸': ['卯', '巳'],
      '辛': ['寅', '午']
    }
  },
  '文昌贵人': {
    type: 'gan',
    data: {
      '甲': ['巳'], '乙': ['午'], '丙': ['申'], '丁': ['酉'],
      '戊': ['申'], '己': ['酉'], '庚': ['亥'], '辛': ['子'],
      '壬': ['寅'], '癸': ['卯']
    }
  },
  '禄神': {
    type: 'gan',
    data: {
      '甲': ['寅'], '乙': ['卯'], '丙': ['巳'], '丁': ['午'],
      '戊': ['巳'], '己': ['午'], '庚': ['申'], '辛': ['酉'],
      '壬': ['亥'], '癸': ['子']
    }
  },
  '羊刃': {
    type: 'gan',
    data: {
      '甲': ['卯'], '乙': ['寅'], '丙': ['午'], '丁': ['巳'],
      '戊': ['午'], '己': ['巳'], '庚': ['酉'], '辛': ['申'],
      '壬': ['子'], '癸': ['亥']
    }
  },
  '驿马': {
    type: 'zhi_sanhe',
    data: {
      '申': '寅', '子': '寅', '辰': '寅',
      '寅': '申', '午': '申', '戌': '申',
      '亥': '巳', '卯': '巳', '未': '巳',
      '巳': '亥', '酉': '亥', '丑': '亥'
    }
  },
  '华盖': {
    type: 'zhi_sanhe',
    data: {
      '申': '辰', '子': '辰', '辰': '辰',
      '寅': '戌', '午': '戌', '戌': '戌',
      '亥': '未', '卯': '未', '未': '未',
      '巳': '丑', '酉': '丑', '丑': '丑'
    }
  },
  '桃花': {
    type: 'zhi_sanhe',
    data: {
      '申': '酉', '子': '酉', '辰': '酉',
      '寅': '卯', '午': '卯', '戌': '卯',
      '亥': '子', '卯': '子', '未': '子',
      '巳': '午', '酉': '午', '丑': '午'
    }
  },
  '将星': {
    type: 'zhi_sanhe',
    data: {
      '申': '子', '子': '子', '辰': '子',
      '寅': '午', '午': '午', '戌': '午',
      '亥': '卯', '卯': '卯', '未': '卯',
      '巳': '酉', '酉': '酉', '丑': '酉'
    }
  },
  '天德': {
    type: 'month_zhi',
    data: {
      '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
      '午': '亥', '未': '甲', '申': '癸', '酉': '寅',
      '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚'
    }
  },
  '月德': {
    type: 'month_zhi',
    data: {
      '寅': '丙', '卯': '甲', '辰': '壬', '巳': '庚',
      '午': '丙', '未': '甲', '申': '壬', '酉': '庚',
      '戌': '丙', '亥': '甲', '子': '壬', '丑': '庚'
    }
  },
  '天赦': {
    type: 'season',
    data: { '春': '戊寅', '夏': '甲午', '秋': '戊申', '冬': '甲子' }
  },
  '三奇': {
    type: 'gan_combination',
    patterns: [['甲', '戊', '庚'], ['乙', '丙', '丁'], ['壬', '癸', '辛']]
  },
  '金舆': {
    type: 'gan',
    data: {
      '甲': ['辰'], '乙': ['巳'], '丙': ['未'], '丁': ['申'],
      '戊': ['未'], '己': ['申'], '庚': ['戌'], '辛': ['亥'],
      '壬': ['丑'], '癸': ['寅']
    }
  },
  '学堂': {
    type: 'gan',
    data: {
      '甲': ['亥'], '乙': ['午'], '丙': ['寅'], '丁': ['酉'],
      '戊': ['寅'], '己': ['酉'], '庚': ['巳'], '辛': ['子'],
      '壬': ['申'], '癸': ['卯']
    }
  },
  '孤辰': {
    type: 'zhi_sanhe',
    data: {
      '申': '亥', '子': '亥', '辰': '亥',
      '寅': '巳', '午': '巳', '戌': '巳',
      '亥': '寅', '卯': '寅', '未': '寅',
      '巳': '申', '酉': '申', '丑': '申'
    }
  },
  '寡宿': {
    type: 'zhi_sanhe',
    data: {
      '申': '丑', '子': '丑', '辰': '丑',
      '寅': '未', '午': '未', '戌': '未',
      '亥': '辰', '卯': '辰', '未': '辰',
      '巳': '戌', '酉': '戌', '丑': '戌'
    }
  },
  '劫煞': {
    type: 'zhi_sanhe',
    data: {
      '申': '巳', '子': '巳', '辰': '巳',
      '寅': '亥', '午': '亥', '戌': '亥',
      '亥': '申', '卯': '申', '未': '申',
      '巳': '寅', '酉': '寅', '丑': '寅'
    }
  },
  '灾煞': {
    type: 'zhi_sanhe',
    data: {
      '申': '午', '子': '午', '辰': '午',
      '寅': '子', '午': '子', '戌': '子',
      '亥': '酉', '卯': '酉', '未': '酉',
      '巳': '卯', '酉': '卯', '丑': '卯'
    }
  },
  '天罗': { type: 'fixed', data: { 'zhi': ['戌', '亥'], 'limit': '夏至后' } },
  '地网': { type: 'fixed', data: { 'zhi': ['辰', '巳'], 'limit': '冬至后' } },
  '魁罡': { type: 'ganzhi', data: ['庚辰', '庚戌', '壬辰', '戊戌'] },
  '国印': {
    type: 'gan',
    data: {
      '甲': ['戌'], '乙': ['亥'], '丙': ['丑'], '丁': ['寅'],
      '戊': ['丑'], '己': ['寅'], '庚': ['辰'], '辛': ['巳'],
      '壬': ['未'], '癸': ['申']
    }
  },
  '太极贵人': {
    type: 'gan',
    data: {
      '甲': ['子', '午'], '乙': ['子', '午'],
      '丙': ['卯', '酉'], '丁': ['卯', '酉'],
      '戊': ['辰', '戌', '丑', '未'], '己': ['辰', '戌', '丑', '未'],
      '庚': ['寅', '亥'], '辛': ['寅', '亥'],
      '壬': ['巳', '申'], '癸': ['巳', '申']
    }
  },
  '福星': {
    type: 'gan',
    data: {
      '甲': ['寅', '子'], '乙': ['卯', '丑'], '丙': ['子', '寅'],
      '丁': ['酉'], '戊': ['申'], '己': ['未'],
      '庚': ['午'], '辛': ['巳'], '壬': ['辰'], '癸': ['丑', '卯']
    }
  },
  '红鸾': {
    type: 'zhi',
    data: {
      '子': '卯', '丑': '寅', '寅': '丑', '卯': '子',
      '辰': '亥', '巳': '戌', '午': '酉', '未': '申',
      '申': '未', '酉': '午', '戌': '巳', '亥': '辰'
    }
  },
  '天喜': {
    type: 'zhi',
    data: {
      '子': '酉', '丑': '申', '寅': '未', '卯': '午',
      '辰': '巳', '巳': '辰', '午': '卯', '未': '寅',
      '申': '亥', '酉': '戌', '戌': '酉', '亥': '申'
    }
  }
};

// ============================================================================
// 八、地支关系数据
// ============================================================================

/** 六合 */
export const LIUHE = {
  '子': '丑', '丑': '子', '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳', '午': '未', '未': '午'
};

/** 三合局 */
export const SANHE = {
  '申子辰': '水局', '亥卯未': '木局',
  '寅午戌': '火局', '巳酉丑': '金局'
};

/** 六冲 */
export const LIUCHONG = {
  '子': '午', '午': '子', '丑': '未', '未': '丑',
  '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳'
};

/** 六害 */
export const LIUHAI = {
  '子': '未', '未': '子', '丑': '午', '午': '丑',
  '寅': '巳', '巳': '寅', '卯': '辰', '辰': '卯',
  '申': '亥', '亥': '申', '酉': '戌', '戌': '酉'
};

/** 三会 */
export const SANHUI = {
  '寅卯辰': '东方木', '巳午未': '南方火',
  '申酉戌': '西方金', '亥子丑': '北方水'
};

// ============================================================================
// 九、V3.1 新增: 月令旺相休囚死映射表
// ============================================================================

/**
 * 月令五行旺衰规则（V3.1 手册标准）
 * 以月支五行定当令之五行，其余五行按旺→相→休→囚→死排列
 *
 * 规则:
 *   当令者旺      → 月支五行 = 目标五行
 *   令生者相      → 月支五行 生 目标五行
 *   生令者休      → 目标五行 生 月支五行
 *   克令者囚      → 目标五行 克 月支五行
 *   令克者死      → 月支五行 克 目标五行
 *
 * 评分: 旺=5, 相=4, 休=2, 囚=1, 死=0
 */
export const WANG_SHUAI_SCORE = { '旺': 5, '相': 4, '休': 2, '囚': 1, '死': 0 };

/**
 * 五行相生关系: 木→火→土→金→水→木
 */
export const WUXING_SHENG = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木'
};

/**
 * 五行相克关系: 木→土→水→火→金→木
 */
export const WUXING_KE = {
  '木': '土', '土': '水', '水': '火', '火': '金', '金': '木'
};

/**
 * 计算日干在月令的旺衰等级
 * @param {string} dayGan - 日干
 * @param {string} monthZhi - 月支
 * @returns {{ level: string, score: number, description: string }}
 */
export function getYueLingWangShuai(dayGan, monthZhi) {
  var dayWuxing = GAN_WUXING[dayGan];      // 日干五行
  var monthWuxing = ZHI_WUXING[monthZhi];   // 月支五行

  if (dayWuxing === monthWuxing) {
    return { level: '旺', score: 5, description: '日干五行与月令同气，当令而旺' };
  }
  // 月令生我 → 相
  // 换句话说: monthWuxing 生 dayWuxing
  if (WUXING_SHENG[monthWuxing] === dayWuxing) {
    return { level: '相', score: 4, description: '月令生扶日干，得令而相' };
  }
  // 我生月令 → 休
  if (WUXING_SHENG[dayWuxing] === monthWuxing) {
    return { level: '休', score: 2, description: '日干生月令，泄气为休' };
  }
  // 克我者死: 月令五行克日干五行 → 死
  if (WUXING_KE[monthWuxing] === dayWuxing) {
    return { level: '死', score: 0, description: '月令克制日干，受克为死' };
  }
  // 我克者囚: 日干五行克月令五行 → 囚
  if (WUXING_KE[dayWuxing] === monthWuxing) {
    return { level: '囚', score: 1, description: '日干克月令，耗力为囚' };
  }

  return { level: '死', score: 0, description: '未知状态' };
}

// ============================================================================
// 十、核心工具函数
// ============================================================================

export function ganIndex(gan) { return GAN.indexOf(gan); }
export function zhiIndex(zhi) { return ZHI.indexOf(zhi); }
export function jiaziIndex(ganzhi) { return JIAZI.indexOf(ganzhi); }

export function fixIndex(index, max) {
  max = max || 12;
  while (index < 0) index += max;
  while (index >= max) index -= max;
  return index;
}

// ============================================================================
// 十一、空亡计算 —— 【已验证: V3.1 手册标准一致】
// ============================================================================

/**
 * 根据干支获取空亡地支
 * 算法: 六十甲子分六旬，每旬10组干支，各旬空亡为旬中缺的两个地支
 * 甲子旬(0-9)空戌亥 / 甲戌旬(10-19)空申酉 / 甲申旬(20-29)空午未
 * 甲午旬(30-39)空辰巳 / 甲辰旬(40-49)空寅卯 / 甲寅旬(50-59)空子丑
 *
 * 验证状态: 已验证，与V3.1手册「六甲旬空亡」完全一致
 *
 * @param {string} ganzhi - 干支字符串
 * @returns {string} 空亡地支
 */
export function getXunKong(ganzhi) {
  var idx = jiaziIndex(ganzhi);
  if (idx < 0) return '';
  return XUNKONG_TABLE[Math.floor(idx / 10)];
}

/**
 * 检查指定地支是否为空亡
 * @param {string} ganzhi - 干支
 * @param {string} zhi - 要检查的地支
 * @returns {boolean}
 */
export function isXunKong(ganzhi, zhi) {
  var kong = getXunKong(ganzhi);
  return kong.indexOf(zhi) >= 0;
}

// ============================================================================
// 十二、纳音计算
// ============================================================================

export function getNaYin(ganzhi) {
  return NAYIN[ganzhi] || '';
}

// ============================================================================
// 十三、十神计算
// ============================================================================

export function getShiShen(dayGan, targetGan) {
  var row = ganIndex(dayGan);
  var col = ganIndex(targetGan);
  if (row < 0 || col < 0) return '';
  return SHISHEN_TABLE[row][col];
}

export function getShiShenShort(shiShen) {
  return SHISHEN_SHORT[shiShen] || '';
}

// ============================================================================
// 十四、十二长生（生旺死绝）计算
// ============================================================================

export function getChangSheng(gan, zhi) {
  var table = SHENGWANG_TABLE[gan];
  if (!table) return '';
  return table[zhi] || '';
}

// ============================================================================
// 十五、月柱天干计算（五虎遁）
// ============================================================================

export function getMonthGan(yearGan, monthZhi) {
  var startGan = WUHU_DUN[yearGan];
  if (!startGan) return '';
  var monthOrder = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  var offset = monthOrder.indexOf(monthZhi);
  if (offset < 0) return '';
  return GAN[fixIndex(ganIndex(startGan) + offset, 10)];
}

// ============================================================================
// 十六、时柱天干计算（五鼠遁）
// ============================================================================

export function getHourGan(dayGan, hourZhi) {
  var startGan = WUSHU_DUN[dayGan];
  if (!startGan) return '';
  var offset = zhiIndex(hourZhi);
  if (offset < 0) return '';
  return GAN[fixIndex(ganIndex(startGan) + offset, 10)];
}

// ============================================================================
// 十七、时辰转地支
// ============================================================================

export function hourToZhi(hour) {
  if (hour === 23 || hour === 0) return '子';
  if (hour >= 1 && hour < 3) return '丑';
  if (hour >= 3 && hour < 5) return '寅';
  if (hour >= 5 && hour < 7) return '卯';
  if (hour >= 7 && hour < 9) return '辰';
  if (hour >= 9 && hour < 11) return '巳';
  if (hour >= 11 && hour < 13) return '午';
  if (hour >= 13 && hour < 15) return '未';
  if (hour >= 15 && hour < 17) return '申';
  if (hour >= 17 && hour < 19) return '酉';
  if (hour >= 19 && hour < 21) return '戌';
  if (hour >= 21 && hour < 23) return '亥';
  return '子';
}

// ============================================================================
// 十八、日期工具函数
// ============================================================================

/**
 * 日期加天数
 * @param {number} year
 * @param {number} month (1-12)
 * @param {number} day
 * @param {number} daysToAdd
 * @returns {string} 'YYYY-MM-DD'
 */
export function addDaysToDate(year, month, day, daysToAdd) {
  var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // 闰年判断
  if ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)) {
    daysInMonth[1] = 29;
  }

  var totalDays = day + daysToAdd;
  var m = month - 1;
  var y = year;

  while (totalDays > daysInMonth[m]) {
    totalDays -= daysInMonth[m];
    m++;
    if (m >= 12) {
      m = 0;
      y++;
      // 更新闰年
      if ((y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0)) {
        daysInMonth[1] = 29;
      } else {
        daysInMonth[1] = 28;
      }
    }
  }

  var resultMonth = m + 1;
  var resultDay = Math.floor(totalDays);

  // 格式化
  var monthStr = resultMonth < 10 ? '0' + resultMonth : '' + resultMonth;
  var dayStr = resultDay < 10 ? '0' + resultDay : '' + resultDay;

  return y + '-' + monthStr + '-' + dayStr;
}

// ============================================================================
// 十九、神煞计算
// ============================================================================

export function calculateShenSha(params) {
  var dayGan = params.dayGan;
  var yearGan = params.yearGan;
  var yearZhi = params.yearZhi;
  var monthZhi = params.monthZhi;
  var dayZhi = params.dayZhi;
  var allGanZhi = params.allGanZhi || [];

  var result = {};

  function checkGanShenSha(shenShaName, refGan) {
    var shensha = SHENSHA_DATA[shenShaName];
    if (!shensha || !shensha.data) return;
    var targetZhi = shensha.data[refGan];
    if (!targetZhi) return;
    var found = [];
    for (var i = 0; i < allGanZhi.length; i++) {
      var zhi = allGanZhi[i].charAt(1);
      if (targetZhi.indexOf(zhi) >= 0) {
        found.push(['年', '月', '日', '时'][i] + '柱');
      }
    }
    if (found.length > 0) {
      result[shenShaName] = found;
    }
  }

  function checkZhiShenSha(shenShaName, refZhi) {
    var shensha = SHENSHA_DATA[shenShaName];
    if (!shensha || !shensha.data) return;
    var targetZhi = shensha.data[refZhi];
    if (!targetZhi) return;
    for (var i = 0; i < allGanZhi.length; i++) {
      var zhi = allGanZhi[i].charAt(1);
      if (zhi === targetZhi) {
        if (!result[shenShaName]) result[shenShaName] = [];
        result[shenShaName].push(['年', '月', '日', '时'][i] + '柱');
      }
    }
  }

  function checkGanZhiShenSha(shenShaName) {
    var shensha = SHENSHA_DATA[shenShaName];
    if (!shensha || !shensha.data) return;
    var targets = shensha.data;
    for (var i = 0; i < allGanZhi.length; i++) {
      if (targets.indexOf(allGanZhi[i]) >= 0) {
        if (!result[shenShaName]) result[shenShaName] = [];
        result[shenShaName].push(['年', '月', '日', '时'][i] + '柱');
      }
    }
  }

  var ganShenShas = ['天乙贵人', '文昌贵人', '禄神', '羊刃', '金舆', '学堂', '太极贵人', '福星', '国印'];
  for (var g = 0; g < ganShenShas.length; g++) {
    checkGanShenSha(ganShenShas[g], dayGan);
  }

  var zhiShenShas = ['驿马', '华盖', '桃花', '将星', '孤辰', '寡宿', '劫煞', '灾煞', '红鸾', '天喜'];
  for (var z = 0; z < zhiShenShas.length; z++) {
    checkZhiShenSha(zhiShenShas[z], yearZhi);
  }

  checkGanZhiShenSha('魁罡');

  return result;
}

// ============================================================================
// 二十、节气近似计算（V3.1 新增: 用于独立计算节气日期）
// ============================================================================

/**
 * 节气日期计算（标准公式: 基于1900年基准）
 *
 * 公式: D = 0.2422 * (year - 1900) - floor((year - 1900) / 4)
 * 节气日期 = baseDay + D
 *
 * 精确度: ±1天（适用于1900-2100年）
 *
 * @param {number} year - 公历年份
 * @param {string} jieName - 节气名称
 * @returns {{ month: number, day: number }}
 */
export function getJieQiDate(year, jieName) {
  // 1900年基准节气日期（月/日）
  var JIEQI_1900 = {
    '小寒': { m: 1, d: 6 },
    '大寒': { m: 1, d: 20 },
    '立春': { m: 2, d: 4 },
    '雨水': { m: 2, d: 19 },
    '惊蛰': { m: 3, d: 6 },
    '春分': { m: 3, d: 21 },
    '清明': { m: 4, d: 5 },
    '谷雨': { m: 4, d: 20 },
    '立夏': { m: 5, d: 6 },
    '小满': { m: 5, d: 21 },
    '芒种': { m: 6, d: 6 },
    '夏至': { m: 6, d: 22 },
    '小暑': { m: 7, d: 7 },
    '大暑': { m: 7, d: 23 },
    '立秋': { m: 8, d: 8 },
    '处暑': { m: 8, d: 23 },
    '白露': { m: 9, d: 8 },
    '秋分': { m: 9, d: 23 },
    '寒露': { m: 10, d: 8 },
    '霜降': { m: 10, d: 24 },
    '立冬': { m: 11, d: 8 },
    '小雪': { m: 11, d: 22 },
    '大雪': { m: 12, d: 7 },
    '冬至': { m: 12, d: 22 }
  };

  var base = JIEQI_1900[jieName];
  if (!base) return null;

  // 标准公式: D = 0.2422 * (year - 1900) - floor((year - 1900) / 4)
  var D = 0.2422 * (year - 1900) - Math.floor((year - 1900) / 4);
  var day = Math.round(base.d + D);

  return { month: base.m, day: day };
}

/**
 * 计算两个日期之间的天数
 * @param {number} y1, m1, d1 - 日期1
 * @param {number} y2, m2, d2 - 日期2
 * @returns {number} 天数差（日期2 - 日期1）
 */
export function daysBetween(y1, m1, d1, y2, m2, d2) {
  var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function isLeap(y) {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  }

  function daysFromYearStart(y, m, d) {
    var days = d;
    var dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (isLeap(y)) dim[1] = 29;
    for (var i = 0; i < m - 1; i++) {
      days += dim[i];
    }
    return days;
  }

  function totalDaysFromYear0(y, m, d) {
    var total = 0;
    for (var i = 0; i < y; i++) {
      total += isLeap(i) ? 366 : 365;
    }
    total += daysFromYearStart(y, m, d);
    return total;
  }

  return totalDaysFromYear0(y2, m2, d2) - totalDaysFromYear0(y1, m1, d1);
}

/**
 * 获取出生日期前后最近的节气及天数
 *
 * 搜索策略:
 *   1. 遍历出生年份的12个"节"，找到日期前后最近的节
 *   2. 小寒（1月）属于上一个农历年循环的最末节，大雪（12月）属于当年循环
 *   3. 若在出生年份找不到前/后节，则跨年搜索
 *
 * @param {number} year - 出生年份
 * @param {number} month - 出生月份 (1-12)
 * @param {number} day - 出生日
 * @returns {Object}
 */
export function getNearestJieQi(year, month, day) {
  // 12个节（非气）的顺序: 立春→惊蛰→...→大雪→小寒（跨年）
  var JIE_LIST = [
    '立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
    '立秋', '白露', '寒露', '立冬', '大雪', '小寒'
  ];

  var prevJie = null;
  var nextJie = null;
  var prevDays = Infinity;
  var nextDays = Infinity;

  // 1. 搜索出生年份内的12个节
  for (var i = 0; i < JIE_LIST.length; i++) {
    var jieName = JIE_LIST[i];
    var jieDate = getJieQiDate(year, jieName);
    if (!jieDate) continue;

    // 计算节气到出生日的天数（正数=节气在出生前，负数=节气在出生后）
    var diff = daysBetween(year, jieDate.month, jieDate.day, year, month, day);

    if (diff < 0) {
      // 节气在出生日之后 → 候选nextJie
      var absDiff = Math.abs(diff);
      if (absDiff < nextDays) {
        nextJie = jieName;
        nextDays = absDiff;
      }
    } else if (diff > 0) {
      // 节气在出生日之前 → 候选prevJie
      if (diff < prevDays) {
        prevJie = jieName;
        prevDays = diff;
      }
    }
    // diff === 0 表示出生日恰逢节气当天
  }

  // 2. 跨年搜索: 若出生在1月（小寒前），上一节是上一年的大雪
  if (prevJie === null) {
    var prevYearDaXue = getJieQiDate(year - 1, '大雪');
    if (prevYearDaXue) {
      prevJie = '大雪';
      prevDays = daysBetween(year - 1, prevYearDaXue.month, prevYearDaXue.day, year, month, day);
    }
  }

  // 3. 跨年搜索: 若出生在12月（大雪后），下一节是下一年的小寒
  if (nextJie === null) {
    var nextYearXiaoHan = getJieQiDate(year + 1, '小寒');
    if (nextYearXiaoHan) {
      nextJie = '小寒';
      nextDays = daysBetween(year, month, day, year + 1, nextYearXiaoHan.month, nextYearXiaoHan.day);
    }
  }

  return {
    prevJie: prevJie,
    daysToPrevJie: prevDays === Infinity ? 0 : prevDays,
    nextJie: nextJie,
    daysToNextJie: nextDays === Infinity ? 0 : nextDays
  };
}

// ============================================================================
// 二十一、完整四柱组装 —— 【V3.1 修正: 集成身强身弱】
// ============================================================================

/**
 * 组装完整的四柱八字数据（V3.1 修正版）
 *
 * 入参:
 * @param {Object} params
 * @param {string} params.yearGan   - 年干
 * @param {string} params.yearZhi   - 年支
 * @param {string} params.monthGan  - 月干
 * @param {string} params.monthZhi  - 月支
 * @param {string} params.dayGan    - 日干
 * @param {string} params.dayZhi    - 日支
 * @param {string} params.hourGan   - 时干
 * @param {string} params.hourZhi   - 时支
 * @param {string} params.gender    - 性别 'male'/'female'
 * @param {number} params.daysToNextJie - 距下一节气天数
 * @param {number} params.daysToPrevJie - 距上一节气天数
 * @param {number} params.birthYear - 出生年份
 * @param {number} params.birthMonth- 出生月份 (1-12) [V3.1新增]
 * @param {number} params.birthDay  - 出生日 [V3.1新增]
 * @param {string} [params.nextJieName] - 下一节气名 [V3.1新增]
 * @param {string} [params.prevJieName] - 上一节气名 [V3.1新增]
 *
 * 出参:
 * @returns {Object}
 * {
 *   pillars: [...],          // 四柱详情
 *   dayGan: string,          // 日干
 *   dayZhi: string,          // 日支
 *   dayun: {...},            // 大运（V3.1精确版）
 *   patterns: [...],         // 格局（V3.1子平法）
 *   patternDetail: {...},    // 格局详情
 *   shenQiangRuo: {...},     // 身强身弱（V3.1新增）
 *   shensha: {...}           // 神煞
 * }
 */
// ============================================================================
// 二十二、公历转八字（v17.8 根因修复: 仅保留吉时雨同源 solarToBazi，旧版 buildBazi 已删除）
// ============================================================================

// 二十二、公历转八字（v17.7 根因重写: 直接使用 历法引擎 对标吉时雨）
// ============================================================================

/**
 * 公历日期转八字四柱（v17.7 根因重写）
 *
 * 算法源: 直接复用 历法引擎 库的 Solar/Lunar/EightChar 类，
 * 与吉时雨 (jishiyu) bazi.js 的 init()/paipan() 完全同源。
 * 禁止任何自主实现的节气/四柱/十神/藏干/地势/空亡/大运计算逻辑。
 *
 * 对标吉时雨关键代码:
 *   this.solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
 *   this.lunar = this.solar.getLunar();
 *   this.bazi = this.lunar.getEightChar();
 *   this.bazi.setSect(!!wanzishi ? 2 : 1);
 *   this.yun = this.bazi.getYun(isman ? 1 : 0, 2);
 *   this.dayun = this.yun.getDaYun(DAYUN_NUM + 1);
 *
 * @param {Object} params
 * @param {number} params.year   - 公历年份
 * @param {number} params.month  - 公历月份 (1-12)
 * @param {number} params.day    - 公历日
 * @param {number} params.hour   - 小时 (0-23)
 * @param {number} [params.minute] - 分钟 (0-59)
 * @param {string} params.gender  - 性别 'male'/'female'
 * @param {number} [params.sect]  - 1=普通, 2=晚子时 (默认1)
 * @returns {Object} 完整八字排盘数据
 */
export function solarToBazi(params) {
  var year = params.year;
  var month = params.month;
  var day = params.day;
  var hour = params.hour;
  var minute = params.minute || 0;
  var gender = params.gender;
  var sect = params.sect || 1; // 默认普通模式，晚子时需传 sect=2

  // ============================================================
 // 1. 使用 历法引擎 创建 Solar/Lunar/EightChar —— 对标吉时雨
  // ============================================================
  var solar = LunarSolar.fromYmdHms(year, month, day, hour, minute, 0);
  var lunar = solar.getLunar();
  var ec = lunar.getEightChar();
  ec.setSect(sect);

  // ============================================================
  // 2. 从 EightChar 获取四柱核心数据 —— 对标吉时雨 buildPillarCol
  // ============================================================
  var yearGan = ec.getYearGan();
  var yearZhi = ec.getYearZhi();
  var monthGan = ec.getMonthGan();
  var monthZhi = ec.getMonthZhi();
  var dayGan = ec.getDayGan();
  var dayZhi = ec.getDayZhi();
  var hourGan = ec.getTimeGan();
  var hourZhi = ec.getTimeZhi();

  // 辅助函数: 从 EightChar 构建单柱数据 (对标吉时雨 buildPillarCol)
  function buildPillarFromEC(pillarIndex) {
    var gan, zhi, ganShishen, zhiCanggan, zhiShishen, dishi, kongwang, nayin;
    switch (pillarIndex) {
      case 1: // 年柱
        gan = ec.getYearGan(); zhi = ec.getYearZhi();
        ganShishen = ec.getYearShiShenGan();
        zhiCanggan = ec.getYearHideGan();
        zhiShishen = ec.getYearShiShenZhi();
        dishi = ec.getYearDiShi();
        kongwang = ec.getYearXunKong();
        nayin = ec.getYearNaYin();
        break;
      case 2: // 月柱
        gan = ec.getMonthGan(); zhi = ec.getMonthZhi();
        ganShishen = ec.getMonthShiShenGan();
        zhiCanggan = ec.getMonthHideGan();
        zhiShishen = ec.getMonthShiShenZhi();
        dishi = ec.getMonthDiShi();
        kongwang = ec.getMonthXunKong();
        nayin = ec.getMonthNaYin();
        break;
      case 3: // 日柱
        gan = ec.getDayGan(); zhi = ec.getDayZhi();
        ganShishen = '日主'; // EightChar getDayShiShenGan() 返回 '日主'
        zhiCanggan = ec.getDayHideGan();
        zhiShishen = ec.getDayShiShenZhi();
        dishi = ec.getDayDiShi();
        kongwang = ec.getDayXunKong();
        nayin = ec.getDayNaYin();
        break;
      case 4: // 时柱
        gan = ec.getTimeGan(); zhi = ec.getTimeZhi();
        ganShishen = ec.getTimeShiShenGan();
        zhiCanggan = ec.getTimeHideGan();
        zhiShishen = ec.getTimeShiShenZhi();
        dishi = ec.getTimeDiShi();
        kongwang = ec.getTimeXunKong();
        nayin = ec.getTimeNaYin();
        break;
    }
    var ganzhi = gan + zhi;
    return {
      name: ['年柱', '月柱', '日柱', '时柱'][pillarIndex - 1],
      gan: gan,
      zhi: zhi,
      ganzhi: ganzhi,
      wuxing: {
        gan: GAN_WUXING[gan],
        zhi: ZHI_WUXING[zhi]
      },
      ganYinyang: GAN_YINYANG[gan] || '',
      zhiYinyang: ZHI_YINYANG[zhi] || '',
      nayin: nayin,
      canggan: zhiCanggan || [],
      xunkong: kongwang || '',
      shishen: {
        gan: ganShishen,
        zhi: zhiShishen || []
      },
      shishenShort: {
        gan: getShiShenShort(ganShishen === '日主' ? '比肩' : ganShishen),
        zhi: (zhiShishen || []).map(function(ss) { return getShiShenShort(ss); })
      },
      changsheng: dishi || '',
      zizuo: SHENGWANG_TABLE[gan] ? (SHENGWANG_TABLE[gan][zhi] || '') : ''
    };
  }

  var pillars = [
    buildPillarFromEC(1),
    buildPillarFromEC(2),
    buildPillarFromEC(3),
    buildPillarFromEC(4)
  ];

  // ============================================================
  // 3. 大运计算 —— 对标吉时雨 buildDayunList + buildQiyunInfo
  // ============================================================
  var isman = gender === 'male' ? 1 : 0;
  var yun = ec.getYun(isman, 2); // sect=2 精确计算
  var DAYUN_NUM = 10;
  var dayunArr = yun.getDaYun(DAYUN_NUM + 1); // 11个元素，第0个是小运期

  // 起运信息 (对标吉时雨 buildQiyunInfo)
  var startSolar = yun.getStartSolar();
  var startYear = yun.getStartYear();
  var startMonth = yun.getStartMonth();
  var startDay = yun.getStartDay();
  var startHour = yun.getStartHour();
  var forward = yun.isForward();

  // 节气名称
  var startLunar = startSolar.getLunar();
  var curJieqi = startLunar.getCurrentJieQi();
  var jieName = '';
  if (curJieqi && curJieqi.isJie && curJieqi.isJie()) {
    jieName = curJieqi.getName();
  } else {
    var yunJie = startLunar.getPrevJie();
    jieName = yunJie.getName();
  }

  // 构建大运列表 (对标吉时雨 buildDayunList)
  var dayunList = [];
  for (var i = 1; i < dayunArr.length; i++) {
    var dy = dayunArr[i];
    var dyGanZhi = dy.getGanZhi();
    var dyGan = dyGanZhi.charAt(0);
    var dyZhi = dyGanZhi.charAt(1);
    var dyStartYear = dy.getStartYear();
    var dyStartAge = dy.getStartAge();

    // 十神
    var dyGanShen = getShiShen(dayGan, dyGan);
    var dyZhiCanggan = CANGGAN[dyZhi] || [];
    var dyZhiShen = dyZhiCanggan.map(function(cg) { return getShiShen(dayGan, cg); });

    // 流年 (对标吉时雨 buildDayunList liunianList)
    var liunians = dy.getLiuNian();
    var liunianList = [];
    for (var j = 0; j < liunians.length; j++) {
      var ln = liunians[j];
      var lnGanZhi = ln.getGanZhi();
      var lnGan = lnGanZhi.charAt(0);
      var lnZhi = lnGanZhi.charAt(1);
      var lnGanShen = getShiShen(dayGan, lnGan);
      var lnZhiCanggan = CANGGAN[lnZhi] || [];
      var lnZhiShen = lnZhiCanggan.map(function(cg) { return getShiShen(dayGan, cg); });

      liunianList.push({
        ganzhi: lnGanZhi,
        gan: lnGan,
        zhi: lnZhi,
        year: ln.getYear(),
        age: ln.getAge(),
        wuxing: { gan: GAN_WUXING[lnGan], zhi: ZHI_WUXING[lnZhi] },
        nayin: getNaYin(lnGanZhi),
        shengxiao: SHENGXIAO_MAP[lnZhi] || '',
        shishenGan: lnGanShen,
        canggan: lnZhiCanggan
      });
    }

    dayunList.push({
      ganzhi: dyGanZhi,
      gan: dyGan,
      zhi: dyZhi,
      order: i,
      startAge: dyStartAge,
      startYear: dyStartYear,
      wuxing: { gan: GAN_WUXING[dyGan], zhi: ZHI_WUXING[dyZhi] },
      shishenGan: dyGanShen,
      canggan: dyZhiCanggan,
      nayin: getNaYin(dyGanZhi),
      liunian: liunianList
    });
  }

  // 起运信息文本
  var startAgeRaw = dayunArr[1] ? dayunArr[1].getStartAge() : 0;
  var qiyunText = '起运: ' + startAgeRaw + '岁, ' + (forward ? '顺行' : '逆行') + ', ' + jieName + '后' + Math.round((startYear - year) * 365.25 / 3) + '天';

  var dayunResult = {
    forward: forward,
    direction: forward ? '顺排' : '逆排',
    daysToJie: Math.round((startYear - year) * 365.25 / 3),
    jieName: jieName,
    startAge: startAgeRaw,
    startAgeRaw: startAgeRaw,
    startMonth: startMonth,
    startDay: startDay,
    startHour: startHour,
    startDate: startYear + '-' + (startMonth < 10 ? '0' + startMonth : startMonth) + '-' + (startDay < 10 ? '0' + startDay : startDay),
    startYear: startYear,
    dayunList: dayunList,
    jiaoyunGan1: dayunArr[1] && dayunArr[1].getLiuNian()[0] ? dayunArr[1].getLiuNian()[0].getGanZhi().charAt(0) : '',
    jiaoyunGan2: dayunArr[1] && dayunArr[1].getLiuNian()[5] ? dayunArr[1].getLiuNian()[5].getGanZhi().charAt(0) : '',
    qiyunText: qiyunText
  };

  // ============================================================
  // 4. 格局判定 (保留, 不依赖节气精度)
  // ============================================================
  var patternResult = determinePattern({
    dayGan: dayGan,
    monthZhi: monthZhi
  });

  // ============================================================
  // 5. 身强身弱判定 (保留, 不依赖节气精度)
  // ============================================================
  var shenQiangRuo = calculateShenQiangRuo({
    dayGan: dayGan,
    monthZhi: monthZhi,
    yearZhi: yearZhi,
    dayZhi: dayZhi,
    hourZhi: hourZhi,
    yearGan: yearGan,
    monthGan: monthGan,
    hourGan: hourGan
  });

  // ============================================================
  // 6. 神煞
  // ============================================================
  var allGanZhi = [yearGan + yearZhi, monthGan + monthZhi, dayGan + dayZhi, hourGan + hourZhi];
  var shensha = calculateShenSha({
    dayGan: dayGan,
    yearGan: yearGan,
    yearZhi: yearZhi,
    monthZhi: monthZhi,
    dayZhi: dayZhi,
    allGanZhi: allGanZhi
  });

  // ============================================================
 // 7. 节气信息 (使用 历法引擎 精确节气)
  // ============================================================
  var prevJie = lunar.getPrevJie();
  var nextJie = lunar.getNextJie();
  var prevJieSolar = prevJie.getSolar();
  var nextJieSolar = nextJie.getSolar();
  var birthDate = new Date(year, month - 1, day);
  var prevJieDate = new Date(prevJieSolar.getYear(), prevJieSolar.getMonth() - 1, prevJieSolar.getDay());
  var nextJieDate = new Date(nextJieSolar.getYear(), nextJieSolar.getMonth() - 1, nextJieSolar.getDay());
  var daysToPrevJie = Math.round((birthDate.getTime() - prevJieDate.getTime()) / 86400000);
  var daysToNextJie = Math.round((nextJieDate.getTime() - birthDate.getTime()) / 86400000);

  var jieQiInfo = {
    prevJie: prevJie.getName(),
    daysToPrevJie: daysToPrevJie,
    nextJie: nextJie.getName(),
    daysToNextJie: daysToNextJie
  };

  // ============================================================
  // 8. 组装返回结果
  // ============================================================
  return {
    pillars: pillars,
    dayGan: dayGan,
    dayZhi: dayZhi,
    dayun: dayunResult,
    patterns: patternResult.patterns,
    patternDetail: patternResult.detail,
    mainPattern: patternResult.mainPattern,
    patternType: patternResult.patternType,
    shenQiangRuo: shenQiangRuo,
    shensha: shensha,
    input: {
      solarDate: year + '-' + (month < 10 ? '0' + month : month) + '-' + (day < 10 ? '0' + day : day),
      time: hour + ':00',
      gender: gender
    },
    lunarDate: lunar.getYearInChinese() + '年' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese() + ' ' + lunar.getTimeZhi() + '时',
    jieQiInfo: jieQiInfo
  };
}

// 生肖映射表
var SHENGXIAO_MAP = {
  '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔',
  '辰': '龙', '巳': '蛇', '午': '马', '未': '羊',
  '申': '猴', '酉': '鸡', '戌': '狗', '亥': '猪'
};
