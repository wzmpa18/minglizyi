/**
 * ============================================================================
 * mystilight-8char 八字核心算法包
 * ============================================================================
 * 来源: mystilight-8char (https://www.npmjs.com/package/@mystilight/8char)
 * 原始协议: ISC License (基于 lunar-javascript 构建)
 *
 * 提取说明: 从 mystilight-8char 项目中提取八字四柱核心计算逻辑，
 * 去除所有 UI 依赖、DOM 操作和样式代码。底层依赖 lunar-javascript 库
 * 提供农历转换和节气计算，本包专注于纯八字排盘算法。
 *
 * 复用评级: 需修改（底层依赖 lunar-javascript 的农历/节气计算，
 * 若需独立运行需替换为自定义农历转换模块）
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

/** 地支藏干 */
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
// 二、空亡数据
// ============================================================================

/** 六甲旬空亡表（按旬首分组） */
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
  // 日干=甲
  ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'],
  // 日干=乙
  ['劫财', '比肩', '伤官', '食神', '正财', '偏财', '正官', '七杀', '正印', '偏印'],
  // 日干=丙
  ['偏印', '正印', '比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官'],
  // 日干=丁
  ['正印', '偏印', '劫财', '比肩', '伤官', '食神', '正财', '偏财', '正官', '七杀'],
  // 日干=戊
  ['七杀', '正官', '偏印', '正印', '比肩', '劫财', '食神', '伤官', '偏财', '正财'],
  // 日干=己
  ['正官', '七杀', '正印', '偏印', '劫财', '比肩', '伤官', '食神', '正财', '偏财'],
  // 日干=庚
  ['偏财', '正财', '七杀', '正官', '偏印', '正印', '比肩', '劫财', '食神', '伤官'],
  // 日干=辛
  ['正财', '偏财', '正官', '七杀', '正印', '偏印', '劫财', '比肩', '伤官', '食神'],
  // 日干=壬
  ['食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印', '比肩', '劫财'],
  // 日干=癸
  ['伤官', '食神', '正财', '偏财', '正官', '七杀', '正印', '偏印', '劫财', '比肩']
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

/** 天干生旺死绝表参考位置（以地支为列） */
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

/**
 * 神煞映射表
 * 返回格式: { 神煞名: [查找基准, 查找方法, 数据映射] }
 */
const SHENSHA_DATA = {
  // 1. 天乙贵人（以日干/年干查）
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
  // 2. 文昌贵人（以日干查）
  '文昌贵人': {
    type: 'gan',
    data: {
      '甲': ['巳'], '乙': ['午'], '丙': ['申'], '丁': ['酉'],
      '戊': ['申'], '己': ['酉'], '庚': ['亥'], '辛': ['子'],
      '壬': ['寅'], '癸': ['卯']
    }
  },
  // 3. 禄神（以日干查）
  '禄神': {
    type: 'gan',
    data: {
      '甲': ['寅'], '乙': ['卯'], '丙': ['巳'], '丁': ['午'],
      '戊': ['巳'], '己': ['午'], '庚': ['申'], '辛': ['酉'],
      '壬': ['亥'], '癸': ['子']
    }
  },
  // 4. 羊刃（以日干查）
  '羊刃': {
    type: 'gan',
    data: {
      '甲': ['卯'], '乙': ['寅'], '丙': ['午'], '丁': ['巳'],
      '戊': ['午'], '己': ['巳'], '庚': ['酉'], '辛': ['申'],
      '壬': ['子'], '癸': ['亥']
    }
  },
  // 5. 驿马（以年支/日支查）
  '驿马': {
    type: 'zhi_sanhe',
    data: {
      '申': '寅', '子': '寅', '辰': '寅',
      '寅': '申', '午': '申', '戌': '申',
      '亥': '巳', '卯': '巳', '未': '巳',
      '巳': '亥', '酉': '亥', '丑': '亥'
    }
  },
  // 6. 华盖
  '华盖': {
    type: 'zhi_sanhe',
    data: {
      '申': '辰', '子': '辰', '辰': '辰',
      '寅': '戌', '午': '戌', '戌': '戌',
      '亥': '未', '卯': '未', '未': '未',
      '巳': '丑', '酉': '丑', '丑': '丑'
    }
  },
  // 7. 桃花（咸池）
  '桃花': {
    type: 'zhi_sanhe',
    data: {
      '申': '酉', '子': '酉', '辰': '酉',
      '寅': '卯', '午': '卯', '戌': '卯',
      '亥': '子', '卯': '子', '未': '子',
      '巳': '午', '酉': '午', '丑': '午'
    }
  },
  // 8. 将星
  '将星': {
    type: 'zhi_sanhe',
    data: {
      '申': '子', '子': '子', '辰': '子',
      '寅': '午', '午': '午', '戌': '午',
      '亥': '卯', '卯': '卯', '未': '卯',
      '巳': '酉', '酉': '酉', '丑': '酉'
    }
  },
  // 9. 天德贵人（以月支查）
  '天德': {
    type: 'month_zhi',
    data: {
      '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
      '午': '亥', '未': '甲', '申': '癸', '酉': '寅',
      '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚'
    }
  },
  // 10. 月德贵人（以月支查）
  '月德': {
    type: 'month_zhi',
    data: {
      '寅': '丙', '卯': '甲', '辰': '壬', '巳': '庚',
      '午': '丙', '未': '甲', '申': '壬', '酉': '庚',
      '戌': '丙', '亥': '甲', '子': '壬', '丑': '庚'
    }
  },
  // 11. 天赦
  '天赦': {
    type: 'season',
    data: {
      '春': '戊寅', '夏': '甲午', '秋': '戊申', '冬': '甲子'
    }
  },
  // 12. 三奇贵人
  '三奇': {
    type: 'gan_combination',
    patterns: [
      ['甲', '戊', '庚'], // 天上三奇
      ['乙', '丙', '丁'], // 地上三奇
      ['壬', '癸', '辛']  // 人中三奇
    ]
  },
  // 13. 金舆（以日干查）
  '金舆': {
    type: 'gan',
    data: {
      '甲': ['辰'], '乙': ['巳'], '丙': ['未'], '丁': ['申'],
      '戊': ['未'], '己': ['申'], '庚': ['戌'], '辛': ['亥'],
      '壬': ['丑'], '癸': ['寅']
    }
  },
  // 14. 学堂（以日干查）
  '学堂': {
    type: 'gan',
    data: {
      '甲': ['亥'], '乙': ['午'], '丙': ['寅'], '丁': ['酉'],
      '戊': ['寅'], '己': ['酉'], '庚': ['巳'], '辛': ['子'],
      '壬': ['申'], '癸': ['卯']
    }
  },
  // 15. 孤辰
  '孤辰': {
    type: 'zhi_sanhe',
    data: {
      '申': '亥', '子': '亥', '辰': '亥',
      '寅': '巳', '午': '巳', '戌': '巳',
      '亥': '寅', '卯': '寅', '未': '寅',
      '巳': '申', '酉': '申', '丑': '申'
    }
  },
  // 16. 寡宿
  '寡宿': {
    type: 'zhi_sanhe',
    data: {
      '申': '丑', '子': '丑', '辰': '丑',
      '寅': '未', '午': '未', '戌': '未',
      '亥': '辰', '卯': '辰', '未': '辰',
      '巳': '戌', '酉': '戌', '丑': '戌'
    }
  },
  // 17. 劫煞
  '劫煞': {
    type: 'zhi_sanhe',
    data: {
      '申': '巳', '子': '巳', '辰': '巳',
      '寅': '亥', '午': '亥', '戌': '亥',
      '亥': '申', '卯': '申', '未': '申',
      '巳': '寅', '酉': '寅', '丑': '寅'
    }
  },
  // 18. 灾煞
  '灾煞': {
    type: 'zhi_sanhe',
    data: {
      '申': '午', '子': '午', '辰': '午',
      '寅': '子', '午': '子', '戌': '子',
      '亥': '酉', '卯': '酉', '未': '酉',
      '巳': '卯', '酉': '卯', '丑': '卯'
    }
  },
  // 19. 天罗地网
  '天罗': { type: 'fixed', data: { 'zhi': ['戌', '亥'], 'limit': '夏至后' } },
  '地网': { type: 'fixed', data: { 'zhi': ['辰', '巳'], 'limit': '冬至后' } },
  // 20. 魁罡
  '魁罡': {
    type: 'ganzhi',
    data: ['庚辰', '庚戌', '壬辰', '戊戌']
  },
  // 21. 国印贵人（以日干查）
  '国印': {
    type: 'gan',
    data: {
      '甲': ['戌'], '乙': ['亥'], '丙': ['丑'], '丁': ['寅'],
      '戊': ['丑'], '己': ['寅'], '庚': ['辰'], '辛': ['巳'],
      '壬': ['未'], '癸': ['申']
    }
  },
  // 22. 太极贵人（以日干查）
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
  // 23. 福星贵人（以日干查）
  '福星': {
    type: 'gan',
    data: {
      '甲': ['寅', '子'], '乙': ['卯', '丑'], '丙': ['子', '寅'],
      '丁': ['酉'], '戊': ['申'], '己': ['未'],
      '庚': ['午'], '辛': ['巳'], '壬': ['辰'], '癸': ['丑', '卯']
    }
  },
  // 24. 红鸾
  '红鸾': {
    type: 'zhi',
    data: {
      '子': '卯', '丑': '寅', '寅': '丑', '卯': '子',
      '辰': '亥', '巳': '戌', '午': '酉', '未': '申',
      '申': '未', '酉': '午', '戌': '巳', '亥': '辰'
    }
  },
  // 25. 天喜
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
// 九、核心工具函数
// ============================================================================

/**
 * 获取天干索引
 * @param {string} gan - 天干字符
 * @returns {number} 索引 (0-9)
 */
function ganIndex(gan) {
  return GAN.indexOf(gan);
}

/**
 * 获取地支索引
 * @param {string} zhi - 地支字符
 * @returns {number} 索引 (0-11)
 */
function zhiIndex(zhi) {
  return ZHI.indexOf(zhi);
}

/**
 * 获取六十甲子索引
 * @param {string} ganzhi - 干支字符串
 * @returns {number} 索引 (0-59)
 */
function jiaziIndex(ganzhi) {
  return JIAZI.indexOf(ganzhi);
}

/**
 * 循环索引修正
 * @param {number} index - 当前索引
 * @param {number} max - 最大循环数
 * @returns {number}
 */
function fixIndex(index, max) {
  max = max || 12;
  while (index < 0) index += max;
  while (index >= max) index -= max;
  return index;
}

// ============================================================================
// 十、空亡计算
// ============================================================================

/**
 * 根据干支获取空亡地支
 *
 * 算法：六十甲子分六旬，每旬10组干支，各旬空亡如下：
 * - 甲子旬(0-9) 空戌亥
 * - 甲戌旬(10-19) 空申酉
 * - 甲申旬(20-29) 空午未
 * - 甲午旬(30-39) 空辰巳
 * - 甲辰旬(40-49) 空寅卯
 * - 甲寅旬(50-59) 空子丑
 *
 * @param {string} ganzhi - 干支字符串 (如 '甲子')
 * @returns {string} 空亡地支 (如 '戌亥')
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
// 十一、纳音计算
// ============================================================================

/**
 * 根据干支获取纳音五行
 * @param {string} ganzhi - 干支
 * @returns {string} 纳音名称
 */
function getNaYin(ganzhi) {
  return NAYIN[ganzhi] || '';
}

// ============================================================================
// 十二、十神计算
// ============================================================================

/**
 * 根据日干和目标天干获取十神名称
 * @param {string} dayGan - 日干 (如 '甲')
 * @param {string} targetGan - 目标天干
 * @returns {string} 十神名称
 */
function getShiShen(dayGan, targetGan) {
  var row = ganIndex(dayGan);
  var col = ganIndex(targetGan);
  if (row < 0 || col < 0) return '';
  return SHISHEN_TABLE[row][col];
}

/**
 * 获取十神简称
 * @param {string} shiShen - 十神全称
 * @returns {string} 简称
 */
function getShiShenShort(shiShen) {
  return SHISHEN_SHORT[shiShen] || '';
}

// ============================================================================
// 十三、十二长生（生旺死绝）计算
// ============================================================================

/**
 * 获取天干在地支的十二长生状态
 * @param {string} gan - 天干
 * @param {string} zhi - 地支
 * @returns {string} 十二长生名称
 */
function getChangSheng(gan, zhi) {
  var table = SHENGWANG_TABLE[gan];
  if (!table) return '';
  return table[zhi] || '';
}

// ============================================================================
// 十四、月柱天干计算（五虎遁）
// ============================================================================

/**
 * 根据年干和月支计算月干
 *
 * 五虎遁年起月口诀：
 * 甲己之年丙作首，乙庚之岁戊为头，
 * 丙辛必定寻庚起，丁壬壬位顺行流，
 * 若问戊癸何方发，甲寅之上好追求。
 *
 * @param {string} yearGan - 年干
 * @param {string} monthZhi - 月支 (寅=正月, 卯=二月, ...)
 * @returns {string} 月干
 */
function getMonthGan(yearGan, monthZhi) {
  var startGan = WUHU_DUN[yearGan];
  if (!startGan) return '';
  var monthOrder = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  var offset = monthOrder.indexOf(monthZhi);
  if (offset < 0) return '';
  return GAN[fixIndex(ganIndex(startGan) + offset, 10)];
}

/**
 * 获取节气对应的月支
 * 立春->寅, 惊蛰->卯, 清明->辰, 立夏->巳, 芒种->午, 小暑->未,
 * 立秋->申, 白露->酉, 寒露->戌, 立冬->亥, 大雪->子, 小寒->丑
 */
const JIE_DIZHI = {
  '立春': '寅', '惊蛰': '卯', '清明': '辰', '立夏': '巳',
  '芒种': '午', '小暑': '未', '立秋': '申', '白露': '酉',
  '寒露': '戌', '立冬': '亥', '大雪': '子', '小寒': '丑'
};

// ============================================================================
// 十五、时柱天干计算（五鼠遁）
// ============================================================================

/**
 * 根据日干和时支计算时干
 *
 * 五鼠遁日起时口诀：
 * 甲己还加甲，乙庚丙作初，
 * 丙辛从戊起，丁壬庚子居，
 * 戊癸何方发，壬子是真途。
 *
 * @param {string} dayGan - 日干
 * @param {string} hourZhi - 时支
 * @returns {string} 时干
 */
function getHourGan(dayGan, hourZhi) {
  var startGan = WUSHU_DUN[dayGan];
  if (!startGan) return '';
  var offset = zhiIndex(hourZhi);
  if (offset < 0) return '';
  return GAN[fixIndex(ganIndex(startGan) + offset, 10)];
}

// ============================================================================
// 十六、时辰转地支
// ============================================================================

/**
 * 将小时转换为时支
 * @param {number} hour - 小时 (0-23)
 * @returns {string} 时支
 */
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
// 十七、大运计算
// ============================================================================

/**
 * 计算大运起运信息
 *
 * 规则：
 * - 阳年男命、阴年女命 → 顺排大运（从月柱顺推）
 * - 阴年男命、阳年女命 → 逆排大运（从月柱逆推）
 * - 起运年龄 = 出生日到顺/逆方向下一个节气天数 ÷ 3
 *
 * 出参：
 * {
 *   forward: boolean,        // 顺排(true)还是逆排(false)
 *   startAge: number,        // 起运岁数
 *   startYear: number,       // 起运年份
 *   dayunList: Array<{       // 大运列表
 *     ganzhi: string,        // 大运干支
 *     startAge: number,      // 该大运起始年龄
 *     startYear: number      // 该大运起始年份
 *   }>
 * }
 *
 * @param {Object} params
 * @param {string} params.yearGan - 年干
 * @param {string} params.yearZhi - 年支
 * @param {string} params.monthGanZhi - 月柱干支
 * @param {string} params.gender - 性别 'male'/'female'
 * @param {number} params.birthYear - 出生年份
 * @param {number} params.daysToNextJie - 距下一节气天数
 * @param {number} params.daysToPrevJie - 距上一节气天数
 * @returns {Object}
 */
function calculateDayun(params) {
  var yearGan = params.yearGan;
  var gender = params.gender;
  var monthGanZhi = params.monthGanZhi;
  var birthYear = params.birthYear;

  var ganYang = GAN_YINYANG[yearGan] === '阳';
  var isMale = gender === 'male';

  // 阳男阴女顺排，阴男阳女逆排
  var forward = (ganYang && isMale) || (!ganYang && !isMale);

  // 起运天数
  var days = forward ? params.daysToNextJie : params.daysToPrevJie;

  // 起运年龄 = 天数 ÷ 3 (取整)
  var startAge = Math.floor(days / 3);
  if (startAge < 1) startAge = 1;

  var startYear = birthYear + startAge;

  // 生成大运列表（10年一运，共8运）
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
      startAge: startAge + i * 10,
      startYear: startYear + i * 10
    });
  }

  return {
    forward: forward,
    startAge: startAge,
    startYear: startYear,
    dayunList: dayunList
  };
}

// ============================================================================
// 十八、格局判定
// ============================================================================

/**
 * 格局判定
 *
 * 普通格局（正八格）：
 * - 以月支藏干透出天干的十神来定格局
 * - 正官格、七杀格、正印格、偏印格、正财格、偏财格、食神格、伤官格
 *
 * 特殊格局：
 * - 建禄格（月支为日干禄位）
 * - 月刃格（月支为日干羊刃）
 * - 从格（从财、从杀、从儿）
 *
 * @param {Object} params
 * @param {string} params.dayGan - 日干
 * @param {string} params.monthZhi - 月支
 * @param {Array<string>} params.allGan - 所有天干 (年/月/日/时，共8个)
 * @param {Array<string>} params.allZhi - 所有地支
 * @returns {Array<string>} 格局列表
 */
function determinePattern(params) {
  var dayGan = params.dayGan;
  var monthZhi = params.monthZhi;
  var allGan = params.allGan || [];
  var allZhi = params.allZhi || [];

  var patterns = [];

  // 1. 检查月支藏干是否透出在天干
  var cangGanList = CANGGAN[monthZhi] || [];
  for (var i = 0; i < cangGanList.length; i++) {
    var cg = cangGanList[i];
    if (allGan.indexOf(cg) >= 0) {
      var shiShen = getShiShen(dayGan, cg);
      // 正官、七杀、正印、偏印、正财、偏财、食神、伤官 → 正八格
      var validPatterns = ['正官', '七杀', '正印', '偏印', '正财', '偏财', '食神', '伤官'];
      if (validPatterns.indexOf(shiShen) >= 0) {
        if (patterns.indexOf(shiShen + '格') < 0) {
          patterns.push(shiShen + '格');
        }
      }
    }
  }

  // 2. 检查特殊格局 - 建禄格 (月支为日干禄神)
  var luShen = SHENSHA_DATA['禄神'].data[dayGan];
  if (luShen && luShen.indexOf(monthZhi) >= 0) {
    patterns.push('建禄格');
  }

  // 3. 检查特殊格局 - 月刃格 (月支为日干羊刃)
  var yangRen = SHENSHA_DATA['羊刃'].data[dayGan];
  if (yangRen && yangRen.indexOf(monthZhi) >= 0) {
    patterns.push('月刃格');
  }

  // 如果没有匹配到正八格，默认取月支本气十神
  if (patterns.length === 0) {
    var mainQi = cangGanList[0];
    if (mainQi) {
      var defaultShiShen = getShiShen(dayGan, mainQi);
      patterns.push(defaultShiShen + '格');
    }
  }

  return patterns;
}

// ============================================================================
// 十九、神煞计算
// ============================================================================

/**
 * 计算指定干支的神煞（25项核心神煞）
 *
 * 入参:
 * @param {Object} params
 * @param {string} params.dayGan - 日干
 * @param {string} params.yearGan - 年干
 * @param {string} params.yearZhi - 年支
 * @param {string} params.monthZhi - 月支
 * @param {string} params.dayZhi - 日支
 * @param {Array<string>} params.allGanZhi - 所有干支 (年柱/月柱/日柱/时柱)
 *
 * 出参:
 * @returns {Object} { 神煞名: [所在柱位列表] }
 */
function calculateShenSha(params) {
  var dayGan = params.dayGan;
  var yearGan = params.yearGan;
  var yearZhi = params.yearZhi;
  var monthZhi = params.monthZhi;
  var dayZhi = params.dayZhi;
  var allGanZhi = params.allGanZhi || []; // [年柱, 月柱, 日柱, 时柱]

  var result = {};

  /**
   * 生成神煞查找辅助函数
   */
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

  // 以日干为基准的神煞
  var ganShenShas = ['天乙贵人', '文昌贵人', '禄神', '羊刃', '金舆', '学堂', '太极贵人', '福星', '国印'];
  for (var g = 0; g < ganShenShas.length; g++) {
    checkGanShenSha(ganShenShas[g], dayGan);
  }

  // 以年支为基准的神煞
  var zhiShenShas = ['驿马', '华盖', '桃花', '将星', '孤辰', '寡宿', '劫煞', '灾煞', '红鸾', '天喜'];
  for (var z = 0; z < zhiShenShas.length; z++) {
    checkZhiShenSha(zhiShenShas[z], yearZhi);
  }

  // 以干支组合为基准的神煞
  checkGanZhiShenSha('魁罡');

  return result;
}

// ============================================================================
// 二十、完整四柱组装
// ============================================================================

/**
 * 组装完整的四柱八字数据
 *
 * 入参:
 * @param {Object} params
 * @param {string} params.yearGan - 年干
 * @param {string} params.yearZhi - 年支
 * @param {string} params.monthGan - 月干
 * @param {string} params.monthZhi - 月支
 * @param {string} params.dayGan - 日干
 * @param {string} params.dayZhi - 日支
 * @param {string} params.hourGan - 时干
 * @param {string} params.hourZhi - 时支
 * @param {string} params.gender - 性别
 * @param {number} params.daysToNextJie - 距下一节气天数
 * @param {number} params.daysToPrevJie - 距上一节气天数
 * @param {number} params.birthYear - 出生年份
 *
 * 出参:
 * @returns {Object}
 * {
 *   pillars: [{gan, zhi, ganzhi, wuxing, nayin, canggan, shishen, changsheng, xunkong}],
 *   dayGan: string,
 *   dayun: Object,
 *   patterns: Array<string>,
 *   shensha: Object
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

  // 计算大运
  var dayun = calculateDayun({
    yearGan: yearGan,
    yearZhi: yearZhi,
    monthGanZhi: monthGan + monthZhi,
    gender: params.gender,
    birthYear: params.birthYear,
    daysToNextJie: params.daysToNextJie || 0,
    daysToPrevJie: params.daysToPrevJie || 0
  });

  // 格局判定
  var allGan = [yearGan, monthGan, dayGan, hourGan];
  var allZhi = [yearZhi, monthZhi, dayZhi, hourZhi];
  var patterns = determinePattern({
    dayGan: dayGan,
    monthZhi: monthZhi,
    allGan: allGan,
    allZhi: allZhi
  });

  // 神煞
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
    patterns: patterns,
    shensha: shensha
  };
}

// ============================================================================
// 调用示例
// ============================================================================

/**
 * 示例1: 完整八字排盘
 *
 * // 假设已知四柱（需依赖农历库计算年柱/月柱/日柱/时柱）
 * var bazi = buildBazi({
 *   yearGan: '甲', yearZhi: '子',
 *   monthGan: '丙', monthZhi: '寅',
 *   dayGan: '戊', dayZhi: '午',
 *   hourGan: '壬', hourZhi: '子',
 *   gender: 'male',
 *   daysToNextJie: 15,   // 距下一节气天数
 *   daysToPrevJie: 12,   // 距上一节气天数
 *   birthYear: 2024
 * });
 *
 * console.log('四柱:', bazi.pillars);
 * console.log('日主:', bazi.dayGan);
 * console.log('大运:', bazi.dayun);
 * console.log('格局:', bazi.patterns);
 * console.log('神煞:', bazi.shensha);
 */

/**
 * 示例2: 单独计算十神
 *
 * var shiShen = getShiShen('甲', '庚');
 * // 返回: '七杀'
 */

/**
 * 示例3: 单独计算空亡
 *
 * var kong = getXunKong('甲子');
 * // 返回: '戌亥'
 */

/**
 * 示例4: 单独计算纳音
 *
 * var nayin = getNaYin('甲子');
 * // 返回: '海中金'
 */

/**
 * 示例5: 单独计算十二长生
 *
 * var cs = getChangSheng('甲', '亥');
 * // 返回: '长生'
 */

// ============================================================================
// 导出
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
    SHENSHA_DATA,

    // 关系数据
    LIUHE, SANHE, LIUCHONG, LIUHAI, SANHUI,

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
    calculateDayun,
    determinePattern,
    calculateShenSha,
    buildBazi
  };
}