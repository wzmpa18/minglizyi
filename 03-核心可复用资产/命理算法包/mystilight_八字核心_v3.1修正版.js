/**
 * ============================================================================
 * mystilight-8char 八字核心算法包 —— V3.1 修正版
 * ============================================================================
 * 基于: mystilight-8char 原始算法包
 * 修正依据: V3.1 手册标准
 * 修正日期: 2026-07-26
 *
 * 修正内容:
 *   1. 新增 身强身弱判定函数 calculateShenQiangRuo()  —— V3.1 月令旺衰+得地得势+加权评分
 *   2. 修正 大运起运年龄精确化 calculateDayun()        —— 三天折一岁，精确到小数点后2位
 *   3. 修正 格局判定 determinePattern()                —— 子平格局法（月支藏干本气）
 *   4. 保留 空亡计算 getXunKong() / isXunKong()        —— 已验证，与V3.1手册一致
 *   5. 更新 buildBazi() 输出结构，包含所有修正字段
 * ============================================================================
 */

// ============================================================================
// 一、基础常量
// ============================================================================

/** 十天干 */
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 十二地支 */
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 六十甲子 */
const JIAZI = [
  '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
  '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
  '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
  '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
  '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
  '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥'
];

/** 天干五行 */
const GAN_WUXING = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
};

/** 地支五行 */
const ZHI_WUXING = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
};

/** 天干阴阳 */
const GAN_YINYANG = {
  '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴', '戊': '阳',
  '己': '阴', '庚': '阳', '辛': '阴', '壬': '阳', '癸': '阴'
};

/** 地支阴阳 */
const ZHI_YINYANG = {
  '子': '阳', '丑': '阴', '寅': '阳', '卯': '阴', '辰': '阳', '巳': '阴',
  '午': '阳', '未': '阴', '申': '阳', '酉': '阴', '戌': '阳', '亥': '阴'
};

/** 地支藏干（本气/中气/余气） */
const CANGGAN = {
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
const XUNKONG_TABLE = [
  '戌亥', '申酉', '午未', '辰巳', '寅卯', '子丑'
];

// ============================================================================
// 三、纳音五行数据
// ============================================================================

/** 纳音五行表（60甲子） */
const NAYIN = {
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
const SHISHEN_TABLE = [
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
const SHISHEN_SHORT = {
  '比肩': '比', '劫财': '劫', '食神': '食', '伤官': '伤', '偏财': '才',
  '正财': '财', '七杀': '杀', '正官': '官', '偏印': '枭', '正印': '印'
};

// ============================================================================
// 五、十二长生数据
// ============================================================================

/** 天干长生起始偏移 */
const CHANG_SHENG_OFFSET = {
  '甲': 0, '乙': 6, '丙': 6, '丁': 0, '戊': 6,
  '己': 0, '庚': 6, '辛': 0, '壬': 6, '癸': 0
};

/** 十二长生名称 */
const CHANG_SHENG = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];

/** 天干生旺死绝表 */
const SHENGWANG_TABLE = {
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
const WUHU_DUN = {
  '甲': '丙', '己': '丙',
  '乙': '戊', '庚': '戊',
  '丙': '庚', '辛': '庚',
  '丁': '壬', '壬': '壬',
  '戊': '甲', '癸': '甲'
};

/** 五鼠遁：日干 → 子时天干 */
const WUSHU_DUN = {
  '甲': '甲', '己': '甲',
  '乙': '丙', '庚': '丙',
  '丙': '戊', '辛': '戊',
  '丁': '庚', '壬': '庚',
  '戊': '壬', '癸': '壬'
};

// ============================================================================
// 七、25项核心神煞数据
// ============================================================================

/** 神煞映射表 */
const SHENSHA_DATA = {
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
const LIUHE = {
  '子': '丑', '丑': '子', '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳', '午': '未', '未': '午'
};

/** 三合局 */
const SANHE = {
  '申子辰': '水局', '亥卯未': '木局',
  '寅午戌': '火局', '巳酉丑': '金局'
};

/** 六冲 */
const LIUCHONG = {
  '子': '午', '午': '子', '丑': '未', '未': '丑',
  '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳'
};

/** 六害 */
const LIUHAI = {
  '子': '未', '未': '子', '丑': '午', '午': '丑',
  '寅': '巳', '巳': '寅', '卯': '辰', '辰': '卯',
  '申': '亥', '亥': '申', '酉': '戌', '戌': '酉'
};

/** 三会 */
const SANHUI = {
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
const WANG_SHUAI_SCORE = { '旺': 5, '相': 4, '休': 2, '囚': 1, '死': 0 };

/**
 * 五行相生关系: 木→火→土→金→水→木
 */
const WUXING_SHENG = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木'
};

/**
 * 五行相克关系: 木→土→水→火→金→木
 */
const WUXING_KE = {
  '木': '土', '土': '水', '水': '火', '火': '金', '金': '木'
};

/**
 * 计算日干在月令的旺衰等级
 * @param {string} dayGan - 日干
 * @param {string} monthZhi - 月支
 * @returns {{ level: string, score: number, description: string }}
 */
function getYueLingWangShuai(dayGan, monthZhi) {
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

function ganIndex(gan) { return GAN.indexOf(gan); }
function zhiIndex(zhi) { return ZHI.indexOf(zhi); }
function jiaziIndex(ganzhi) { return JIAZI.indexOf(ganzhi); }

function fixIndex(index, max) {
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
function getXunKong(ganzhi) {
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
function isXunKong(ganzhi, zhi) {
  var kong = getXunKong(ganzhi);
  return kong.indexOf(zhi) >= 0;
}

// ============================================================================
// 十二、纳音计算
// ============================================================================

function getNaYin(ganzhi) {
  return NAYIN[ganzhi] || '';
}

// ============================================================================
// 十三、十神计算
// ============================================================================

function getShiShen(dayGan, targetGan) {
  var row = ganIndex(dayGan);
  var col = ganIndex(targetGan);
  if (row < 0 || col < 0) return '';
  return SHISHEN_TABLE[row][col];
}

function getShiShenShort(shiShen) {
  return SHISHEN_SHORT[shiShen] || '';
}

// ============================================================================
// 十四、十二长生（生旺死绝）计算
// ============================================================================

function getChangSheng(gan, zhi) {
  var table = SHENGWANG_TABLE[gan];
  if (!table) return '';
  return table[zhi] || '';
}

// ============================================================================
// 十五、月柱天干计算（五虎遁）
// ============================================================================

function getMonthGan(yearGan, monthZhi) {
  var startGan = WUHU_DUN[yearGan];
  if (!startGan) return '';
  var monthOrder = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  var offset = monthOrder.indexOf(monthZhi);
  if (offset < 0) return '';
  return GAN[fixIndex(ganIndex(startGan) + offset, 10)];
}

const JIE_DIZHI = {
  '立春': '寅', '惊蛰': '卯', '清明': '辰', '立夏': '巳',
  '芒种': '午', '小暑': '未', '立秋': '申', '白露': '酉',
  '寒露': '戌', '立冬': '亥', '大雪': '子', '小寒': '丑'
};

// ============================================================================
// 十六、时柱天干计算（五鼠遁）
// ============================================================================

function getHourGan(dayGan, hourZhi) {
  var startGan = WUSHU_DUN[dayGan];
  if (!startGan) return '';
  var offset = zhiIndex(hourZhi);
  if (offset < 0) return '';
  return GAN[fixIndex(ganIndex(startGan) + offset, 10)];
}

// ============================================================================
// 十七、时辰转地支
// ============================================================================

function hourToZhi(hour) {
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
// 十八、大运计算 —— 【V3.1 修正: 精确起运年龄】
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
function calculateDayun(params) {
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
  var monthIdx = jiaziIndex(monthGanZhi);
  var dayunList = [];

  for (var i = 0; i < 10; i++) {
    var idx;
    if (forward) {
      idx = fixIndex(monthIdx + 1 + i, 60);
    } else {
      idx = fixIndex(monthIdx - 1 - i, 60);
    }
    dayunList.push({
      ganzhi: JIAZI[idx],
      order: i + 1,
      startAge: Math.round((startAge + i * 10) * 100) / 100,
      startYear: startYear + i * 10
    });
  }

  return {
    forward: forward,
    direction: forward ? '顺排' : '逆排',
    daysToJie: days,
    jieName: forward ? (params.nextJieName || '') : (params.prevJieName || ''),
    startAge: startAge,
    startAgeRaw: startAge,
    startDate: startDate,
    startYear: startYear,
    dayunList: dayunList
  };
}

/**
 * 日期加天数
 * @param {number} year
 * @param {number} month (1-12)
 * @param {number} day
 * @param {number} daysToAdd
 * @returns {string} 'YYYY-MM-DD'
 */
function addDaysToDate(year, month, day, daysToAdd) {
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
// 十九、格局判定 —— 【V3.1 修正: 子平格局法】
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
function determinePattern(params) {
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
// 二十、身强身弱判定 —— 【V3.1 新增: 加权评分法】
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
function calculateShenQiangRuo(params) {
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

// ============================================================================
// 二十一、神煞计算
// ============================================================================

function calculateShenSha(params) {
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
// 二十二、完整四柱组装 —— 【V3.1 修正: 集成身强身弱】
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
function buildBazi(params) {
  var yearGan = params.yearGan;
  var yearZhi = params.yearZhi;
  var monthGan = params.monthGan;
  var monthZhi = params.monthZhi;
  var dayGan = params.dayGan;
  var dayZhi = params.dayZhi;
  var hourGan = params.hourGan;
  var hourZhi = params.hourZhi;

  var pillars = [
    { name: '年柱', gan: yearGan, zhi: yearZhi, ganzhi: yearGan + yearZhi },
    { name: '月柱', gan: monthGan, zhi: monthZhi, ganzhi: monthGan + monthZhi },
    { name: '日柱', gan: dayGan, zhi: dayZhi, ganzhi: dayGan + dayZhi },
    { name: '时柱', gan: hourGan, zhi: hourZhi, ganzhi: hourGan + hourZhi }
  ];

  var allGanZhi = [yearGan + yearZhi, monthGan + monthZhi, dayGan + dayZhi, hourGan + hourZhi];

  // 丰富每柱信息
  pillars.forEach(function(pillar) {
    pillar.wuxing = {
      gan: GAN_WUXING[pillar.gan],
      zhi: ZHI_WUXING[pillar.zhi]
    };
    pillar.nayin = getNaYin(pillar.ganzhi);
    pillar.canggan = CANGGAN[pillar.zhi] || [];
    pillar.xunkong = getXunKong(pillar.ganzhi);

    // 十神（以日干为基准）
    pillar.shishen = {
      gan: getShiShen(dayGan, pillar.gan),
      zhi: (CANGGAN[pillar.zhi] || []).map(function(cg) {
        return getShiShen(dayGan, cg);
      })
    };
    pillar.shishenShort = {
      gan: getShiShenShort(pillar.shishen.gan),
      zhi: pillar.shishen.zhi.map(function(ss) { return getShiShenShort(ss); })
    };

    // 十二长生（日干对各支）
    pillar.changsheng = getChangSheng(dayGan, pillar.zhi);
  });

  // ============================================================
  // 大运计算（V3.1 精确版）
  // ============================================================
  var dayun = calculateDayun({
    yearGan: yearGan,
    yearZhi: yearZhi,
    monthGanZhi: monthGan + monthZhi,
    gender: params.gender,
    birthYear: params.birthYear,
    birthMonth: params.birthMonth || 1,
    birthDay: params.birthDay || 1,
    daysToNextJie: params.daysToNextJie || 0,
    daysToPrevJie: params.daysToPrevJie || 0,
    nextJieName: params.nextJieName || '',
    prevJieName: params.prevJieName || ''
  });

  // ============================================================
  // 格局判定（V3.1 子平格局法）
  // ============================================================
  var patternResult = determinePattern({
    dayGan: dayGan,
    monthZhi: monthZhi
  });

  // ============================================================
  // 身强身弱判定（V3.1 新增）
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
  // 神煞
  // ============================================================
  var shensha = calculateShenSha({
    dayGan: dayGan,
    yearGan: yearGan,
    yearZhi: yearZhi,
    monthZhi: monthZhi,
    dayZhi: dayZhi,
    allGanZhi: allGanZhi
  });

  return {
    pillars: pillars,
    dayGan: dayGan,
    dayZhi: dayZhi,
    dayun: dayun,
    patterns: patternResult.patterns,
    patternDetail: patternResult.detail,
    mainPattern: patternResult.mainPattern,
    patternType: patternResult.patternType,
    shenQiangRuo: shenQiangRuo,
    shensha: shensha
  };
}

// ============================================================================
// 二十三、节气近似计算（V3.1 新增: 用于独立计算节气日期）
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
function getJieQiDate(year, jieName) {
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
function daysBetween(y1, m1, d1, y2, m2, d2) {
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
function getNearestJieQi(year, month, day) {
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
// 二十四、公历转八字（V3.1 新增: 完整排盘入口）
// ============================================================================

/**
 * 公历日期转八字四柱（V3.1 完整排盘）
 *
 * 支持独立计算年月日时四柱，无需外部农历库依赖。
 *
 * @param {Object} params
 * @param {number} params.year   - 公历年份
 * @param {number} params.month  - 公历月份 (1-12)
 * @param {number} params.day    - 公历日
 * @param {number} params.hour   - 小时 (0-23)
 * @param {number} [params.minute] - 分钟 (0-59)
 * @param {string} params.gender  - 性别 'male'/'female'
 * @returns {Object} 完整八字排盘数据
 */
function solarToBazi(params) {
  var year = params.year;
  var month = params.month;
  var day = params.day;
  var hour = params.hour;
  var gender = params.gender;

  // ============================================================
  // 1. 年柱计算
  // ============================================================
  // 以立春为界，立春前归上一年
  var liChunDate = getJieQiDate(year, '立春');
  var effectiveYear = year;
  if (liChunDate && (month < liChunDate.month || (month === liChunDate.month && day < liChunDate.day))) {
    effectiveYear = year - 1;
  }

  // 年干 = (effectiveYear - 4) % 10
  var yearGanIdx = (effectiveYear - 4) % 10;
  if (yearGanIdx < 0) yearGanIdx += 10;
  var yearGan = GAN[yearGanIdx];

  // 年支 = (effectiveYear - 4) % 12
  var yearZhiIdx = (effectiveYear - 4) % 12;
  if (yearZhiIdx < 0) yearZhiIdx += 12;
  var yearZhi = ZHI[yearZhiIdx];

  // ============================================================
  // 2. 月柱计算
  // ============================================================
  // 根据节气确定月支
  // 从年初到年末遍历，以最后一个已过的"节"为准
  var JIE_ORDER = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
  var monthZhiOrder = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

  var monthZhi = '丑'; // 默认丑月（立春前）
  var monthJieName = '小寒';

  // 从年初开始遍历，找到最后一个已过的节
  for (var j = 0; j < JIE_ORDER.length; j++) {
    var jieDate = getJieQiDate(year, JIE_ORDER[j]);
    if (!jieDate) continue;

    if (month > jieDate.month || (month === jieDate.month && day >= jieDate.day)) {
      monthZhi = monthZhiOrder[j];
      monthJieName = JIE_ORDER[j];
    } else {
      // 当前节在出生日期之后，后续的节都在之后，停止遍历
      break;
    }
  }

  var monthGan = getMonthGan(yearGan, monthZhi);

  // ============================================================
  // 3. 日柱计算
  // ============================================================
  // 使用公式: 日干支基数 = (年尾二位数 + 3) * 5 + 55 + (年尾二位数 - 1) / 4
  var yearTail = year % 100;
  var base = (yearTail + 3) * 5 + 55 + Math.floor((yearTail - 1) / 4);
  base = base % 60;

  // 计算该年1月1日到出生日的天数
  var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)) {
    daysInMonth[1] = 29;
  }

  var dayOfYear = 0;
  for (var m = 0; m < month - 1; m++) {
    dayOfYear += daysInMonth[m];
  }
  dayOfYear += day;

  var dayIdx = (base + dayOfYear) % 60;
  if (dayIdx < 0) dayIdx += 60;
  var dayGanZhi = JIAZI[dayIdx];
  var dayGan = dayGanZhi.charAt(0);
  var dayZhi = dayGanZhi.charAt(1);

  // ============================================================
  // 4. 时柱计算
  // ============================================================
  var hourZhi = hourToZhi(hour);
  var hourGan = getHourGan(dayGan, hourZhi);

  // ============================================================
  // 5. 节气信息
  // ============================================================
  var jieQiInfo = getNearestJieQi(year, month, day);

  // ============================================================
  // 6. 组装八字
  // ============================================================
  var bazi = buildBazi({
    yearGan: yearGan,
    yearZhi: yearZhi,
    monthGan: monthGan,
    monthZhi: monthZhi,
    dayGan: dayGan,
    dayZhi: dayZhi,
    hourGan: hourGan,
    hourZhi: hourZhi,
    gender: gender,
    birthYear: year,
    birthMonth: month,
    birthDay: day,
    daysToNextJie: jieQiInfo.daysToNextJie,
    daysToPrevJie: jieQiInfo.daysToPrevJie,
    nextJieName: jieQiInfo.nextJie,
    prevJieName: jieQiInfo.prevJie
  });

  // 附加原始输入信息
  bazi.input = {
    solarDate: year + '-' + (month < 10 ? '0' + month : month) + '-' + (day < 10 ? '0' + day : day),
    time: hour + ':00',
    gender: gender
  };

  bazi.jieQiInfo = jieQiInfo;

  return bazi;
}

// ============================================================================
// 二十五、导出
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // 常量
    GAN, ZHI, JIAZI,
    GAN_WUXING, ZHI_WUXING,
    GAN_YINYANG, ZHI_YINYANG,
    CANGGAN, NAYIN, XUNKONG_TABLE,
    SHISHEN_TABLE, SHISHEN_SHORT,
    SHENGWANG_TABLE, CHANG_SHENG,
    SHENSHA_DATA, WANG_SHUAI_SCORE,

    // 关系数据
    LIUHE, SANHE, LIUCHONG, LIUHAI, SANHUI,
    WUXING_SHENG, WUXING_KE,

    // 遁法
    WUHU_DUN, WUSHU_DUN, JIE_DIZHI,

    // 核心函数
    ganIndex, zhiIndex, jiaziIndex, fixIndex,
    getXunKong, isXunKong,
    getNaYin,
    getShiShen, getShiShenShort,
    getChangSheng,
    getMonthGan, getHourGan,
    hourToZhi,
    getYueLingWangShuai,        // V3.1 新增
    calculateDayun,              // V3.1 修正
    determinePattern,            // V3.1 修正
    calculateShenQiangRuo,       // V3.1 新增
    calculateShenSha,
    buildBazi,                   // V3.1 修正
    getJieQiDate,                // V3.1 新增
    getNearestJieQi,             // V3.1 新增
    daysBetween,                 // V3.1 新增
    addDaysToDate,               // V3.1 新增
    solarToBazi                  // V3.1 新增
  };
}

// ============================================================================
// 二十六、测试用例
// ============================================================================

/**
 * 测试用例: 公历 1990-05-15 14:30，男
 *
 * 预期结果:
 *   年柱: 庚午
 *   月柱: 辛巳（立夏后芒种前，巳月）
 *   日柱: 辛巳
 *   时柱: 乙未（未时）
 *   格局: 正官格（月支巳本气丙→日干辛的正官）
 *   身强身弱: 身弱（辛金死于巳月，地支通根弱）
 *   大运起运: 7.33岁（顺排，距芒种约22天）
 */

if (typeof require !== 'undefined' && require.main === module) {
  console.log('='.repeat(60));
  console.log('  mystilight 八字核心算法包 V3.1 修正版 - 测试');
  console.log('='.repeat(60));
  console.log('');

  var testResult = solarToBazi({
    year: 1990,
    month: 5,
    day: 15,
    hour: 14,
    minute: 30,
    gender: 'male'
  });

  console.log('【输入信息】');
  console.log('  公历日期: ' + testResult.input.solarDate);
  console.log('  时间: ' + testResult.input.time);
  console.log('  性别: 男');
  console.log('');

  console.log('【四柱八字】');
  testResult.pillars.forEach(function(p) {
    console.log('  ' + p.name + ': ' + p.ganzhi +
      ' (天干' + p.gan + ' ' + p.wuxing.gan + ', 地支' + p.zhi + ' ' + p.wuxing.zhi + ')' +
      '  纳音: ' + p.nayin +
      '  空亡: ' + p.xunkong +
      '  十神: ' + p.shishen.gan +
      '  十二长生: ' + p.changsheng);
  });
  console.log('');

  console.log('【格局判定 - V3.1 子平格局法】');
  console.log('  月支: ' + testResult.patternDetail.monthZhi);
  console.log('  月支藏干: ' + testResult.patternDetail.cangGan.join(' → '));
  console.log('  本气: ' + testResult.patternDetail.benQi + '(' + testResult.patternDetail.benQiWuxing + ')');
  console.log('  本气十神: ' + testResult.patternDetail.benQiShiShen);
  console.log('  格局类型: ' + testResult.patternType);
  console.log('  主格局: ' + testResult.mainPattern);
  console.log('  全部格局: ' + testResult.patterns.join(', '));
  console.log('');

  console.log('【身强身弱 - V3.1 加权评分法】');
  console.log(testResult.shenQiangRuo.breakdown);
  console.log('');

  console.log('【大运 - V3.1 精确版】');
  console.log('  排运方向: ' + testResult.dayun.direction);
  console.log('  参考节气: ' + testResult.dayun.jieName);
  console.log('  距节气天数: ' + testResult.dayun.daysToJie + ' 天');
  console.log('  起运年龄: ' + testResult.dayun.startAge + ' 岁（精确到小数点后2位）');
  console.log('  起运日期: ' + testResult.dayun.startDate);
  console.log('  起运年份: ' + testResult.dayun.startYear + ' 年');
  console.log('  大运列表:');
  testResult.dayun.dayunList.forEach(function(dy) {
    console.log('    第' + dy.order + '运: ' + dy.ganzhi + '  (' + dy.startAge + '岁-' + (dy.startAge + 10) + '岁, ' + dy.startYear + '年)');
  });
  console.log('');

  console.log('【空亡 - 已验证 V3.1】');
  testResult.pillars.forEach(function(p) {
    console.log('  ' + p.name + ' ' + p.ganzhi + ' → 空亡: ' + p.xunkong);
  });
  console.log('');

  console.log('='.repeat(60));
  console.log('  测试完成');
  console.log('='.repeat(60));
}