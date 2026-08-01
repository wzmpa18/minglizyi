/**
 * ============================================================================
 * 神煞模块净室重写版 —— 51种神煞完整计算
 * ============================================================================
 * 净室重写，参考自传统神煞口诀与公开文献，无源码复制
 *
 * 参考来源:
 *   1. 传统神煞口诀（公开文献，如《三命通会》《渊海子平》等古籍）
 *   2. lunar-javascript (MIT协议) 的神煞计算思路
 *   3. V3.1 手册神煞标准
 *
 * 实现方式:
 *   - 所有数据表基于公开的传统口诀独立构建
 *   - 计算逻辑从零编写，不参考任何AGPL协议代码
 *   - 每一组查表数据均有对应的口诀注释
 *
 * 实现日期: 2026-07-26
 * ============================================================================
 */

// ============================================================================
// 一、基础常量（独立定义，不依赖外部模块）
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

/** 三合局（地支三合） */
const SANHE_JU = {
  '申子辰': '水局', '亥卯未': '木局',
  '寅午戌': '火局', '巳酉丑': '金局'
};

/** 三合局归属（地支→三合局名） */
const SANHE_GROUP = {
  '申': '水', '子': '水', '辰': '水',
  '亥': '木', '卯': '木', '未': '木',
  '寅': '火', '午': '火', '戌': '火',
  '巳': '金', '酉': '金', '丑': '金'
};

/** 三合局长生位（地支→长生支） */
const SANHE_CHANGSHENG = {
  '申': '巳', '子': '申', '辰': '申',  // 水局长生在申
  '亥': '申', '卯': '亥', '未': '亥',  // 木局长生在亥
  '寅': '亥', '午': '寅', '戌': '寅',  // 火局长生在寅
  '巳': '寅', '酉': '巳', '丑': '巳'   // 金局长生在巳
};

/** 六冲 */
const LIUCHONG = {
  '子': '午', '午': '子', '丑': '未', '未': '丑',
  '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳'
};

/** 六合 */
const LIUHE = {
  '子': '丑', '丑': '子', '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳', '午': '未', '未': '午'
};

// ============================================================================
// 二、辅助工具函数
// ============================================================================

/**
 * 获取天干索引
 */
function ganIndex(gan) {
  return GAN.indexOf(gan);
}

/**
 * 获取地支索引
 */
function zhiIndex(zhi) {
  return ZHI.indexOf(zhi);
}

/**
 * 获取六十甲子索引
 */
function jiaziIndex(ganzhi) {
  return JIAZI.indexOf(ganzhi);
}

/**
 * 循环索引修正
 */
function fixIndex(index, max) {
  max = max || 12;
  while (index < 0) index += max;
  while (index >= max) index -= max;
  return index;
}

/**
 * 获取季节（根据月支）
 * 寅卯辰→春, 巳午未→夏, 申酉戌→秋, 亥子丑→冬
 */
function getSeason(monthZhi) {
  var seasonMap = {
    '寅': '春', '卯': '春', '辰': '春',
    '巳': '夏', '午': '夏', '未': '夏',
    '申': '秋', '酉': '秋', '戌': '秋',
    '亥': '冬', '子': '冬', '丑': '冬'
  };
  return seasonMap[monthZhi] || '';
}

// ============================================================================
// 三、51种神煞查表数据
// ============================================================================

/**
 * 所有神煞的分类定义
 * 每个神煞包含: name, category, type, data, description
 *
 * type 类型说明:
 *   'gan'         - 以天干为基准查地支（如天乙贵人）
 *   'zhi'         - 以地支为基准查地支（如红鸾天喜）
 *   'zhi_sanhe'   - 以地支为基准，按三合局查（如驿马、华盖）
 *   'month_zhi'   - 以月支为基准查天干/地支（如天德、月德）
 *   'ganzhi'      - 以干支组合为基准（如魁罡、十恶大败）
 *   'season'      - 以季节为基准查干支（如天赦、四废）
 *   'fixed'       - 固定条件（如天罗地网）
 *   'pattern'     - 组合模式匹配（如三奇、伏吟、返吟）
 *   'gan_comb'    - 天干组合（如三奇贵人）
 *   'calculated'  - 需要计算逻辑（如元辰）
 */

const SHENSHA_DEFINITIONS = {

  // ============================================================
  // A. 吉神类（22种）
  // ============================================================

  /**
   * 天乙贵人
   * 口诀: 甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢虎马
   */
  '天乙贵人': {
    category: '吉',
    type: 'gan',
    description: '天乙贵人，命中逢之主聪明智慧，近贵得助',
    data: {
      '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
      '乙': ['子', '申'], '己': ['子', '申'],
      '丙': ['亥', '酉'], '丁': ['亥', '酉'],
      '壬': ['卯', '巳'], '癸': ['卯', '巳'],
      '辛': ['寅', '午']
    }
  },

  /**
   * 天德贵人
   * 口诀: 正丁二申三壬四辛五亥六甲，七癸八寅九丙十乙子巳丑庚
   * 以月支查
   */
  '天德贵人': {
    category: '吉',
    type: 'month_zhi',
    description: '天德贵人，月德为助，能逢凶化吉',
    data: {
      '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
      '午': '亥', '未': '甲', '申': '癸', '酉': '寅',
      '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚'
    }
  },

  /**
   * 月德贵人
   * 口诀: 寅午戌月丙，申子辰月壬，亥卯未月甲，巳酉丑月庚
   * 以月支查
   */
  '月德贵人': {
    category: '吉',
    type: 'month_zhi',
    description: '月德贵人，主逢凶化吉，福分深厚',
    data: {
      '寅': '丙', '午': '丙', '戌': '丙',
      '申': '壬', '子': '壬', '辰': '壬',
      '亥': '甲', '卯': '甲', '未': '甲',
      '巳': '庚', '酉': '庚', '丑': '庚'
    }
  },

  /**
   * 文昌贵人
   * 口诀: 甲巳乙午丙戊申，丁己酉位庚亥寻，辛子壬寅癸卯位
   * （以日干查）
   */
  '文昌贵人': {
    category: '吉',
    type: 'gan',
    description: '文昌贵人，主聪明好学，文采出众',
    data: {
      '甲': ['巳'], '乙': ['午'], '丙': ['申'], '丁': ['酉'],
      '戊': ['申'], '己': ['酉'], '庚': ['亥'], '辛': ['子'],
      '壬': ['寅'], '癸': ['卯']
    }
  },

  /**
   * 学堂
   * 口诀: 以日干查长生位
   * 甲亥乙午丙寅丁酉戊寅己酉庚巳辛子壬申癸卯
   */
  '学堂': {
    category: '吉',
    type: 'gan',
    description: '学堂，主学业有成，聪明俊秀',
    data: {
      '甲': ['亥'], '乙': ['午'], '丙': ['寅'], '丁': ['酉'],
      '戊': ['寅'], '己': ['酉'], '庚': ['巳'], '辛': ['子'],
      '壬': ['申'], '癸': ['卯']
    }
  },

  /**
   * 词馆
   * 口诀: 以日干查，学堂对宫（即禄前一位的地支）
   * 甲见庚寅、乙见辛卯、丙见乙巳、丁见戊午、戊见丁巳、
   * 己见庚午、庚见壬申、辛见癸酉、壬见癸亥、癸见壬子
   * 简化: 词馆 = 学馆对宫，即干禄对冲位
   */
  '词馆': {
    category: '吉',
    type: 'gan',
    description: '词馆，主文章秀美，言辞出众',
    data: {
      '甲': ['庚寅', '寅'], '乙': ['辛卯', '卯'], '丙': ['乙巳', '巳'],
      '丁': ['戊午', '午'], '戊': ['丁巳', '巳'], '己': ['庚午', '午'],
      '庚': ['壬申', '申'], '辛': ['癸酉', '酉'], '壬': ['癸亥', '亥'],
      '癸': ['壬子', '子']
    }
  },

  /**
   * 将星
   * 口诀: 以年支/日支查三合局帝旺位
   * 申子辰见子，寅午戌见午，亥卯未见卯，巳酉丑见酉
   */
  '将星': {
    category: '吉',
    type: 'zhi_sanhe',
    description: '将星，主威权显赫，有领导才能',
    data: {
      '申': '子', '子': '子', '辰': '子',
      '寅': '午', '午': '午', '戌': '午',
      '亥': '卯', '卯': '卯', '未': '卯',
      '巳': '酉', '酉': '酉', '丑': '酉'
    }
  },

  /**
   * 华盖
   * 口诀: 以年支/日支查三合局墓库位
   * 申子辰见辰，寅午戌见戌，亥卯未见未，巳酉丑见丑
   */
  '华盖': {
    category: '吉',
    type: 'zhi_sanhe',
    description: '华盖，主孤独清高，有艺术才华',
    data: {
      '申': '辰', '子': '辰', '辰': '辰',
      '寅': '戌', '午': '戌', '戌': '戌',
      '亥': '未', '卯': '未', '未': '未',
      '巳': '丑', '酉': '丑', '丑': '丑'
    }
  },

  /**
   * 驿马
   * 口诀: 以年支/日支查三合局长生位之对冲
   * 申子辰见寅，寅午戌见申，亥卯未见巳，巳酉丑见亥
   */
  '驿马': {
    category: '吉',
    type: 'zhi_sanhe',
    description: '驿马，主奔波流动，走动多，利出行',
    data: {
      '申': '寅', '子': '寅', '辰': '寅',
      '寅': '申', '午': '申', '戌': '申',
      '亥': '巳', '卯': '巳', '未': '巳',
      '巳': '亥', '酉': '亥', '丑': '亥'
    }
  },

  /**
   * 天医
   * 口诀: 以月支查，正月生见丑，二月见寅，三月见卯，依次顺推
   * 即月支前一位
   */
  '天医': {
    category: '吉',
    type: 'month_zhi_shift',
    description: '天医，主身体健康，易得医药之助',
    data: {
      '寅': '丑', '卯': '寅', '辰': '卯', '巳': '辰',
      '午': '巳', '未': '午', '申': '未', '酉': '申',
      '戌': '酉', '亥': '戌', '子': '亥', '丑': '子'
    }
  },

  /**
   * 天赦
   * 口诀: 春戊寅，夏甲午，秋戊申，冬甲子
   * 以季节查日柱干支
   */
  '天赦': {
    category: '吉',
    type: 'season',
    description: '天赦，逢凶化吉，赦免罪过',
    data: {
      '春': '戊寅', '夏': '甲午', '秋': '戊申', '冬': '甲子'
    }
  },

  /**
   * 三奇贵人
   * 口诀: 天上三奇甲戊庚，地上三奇乙丙丁，人中三奇壬癸辛
   * 以天干组合查
   */
  '三奇贵人': {
    category: '吉',
    type: 'gan_combination',
    description: '三奇贵人，主异常之贵，格局清奇',
    patterns: [
      ['甲', '戊', '庚'],  // 天上三奇
      ['乙', '丙', '丁'],  // 地上三奇
      ['壬', '癸', '辛']   // 人中三奇
    ]
  },

  /**
   * 太极贵人
   * 口诀: 甲乙子午，丙丁卯酉，戊己辰戌丑未，庚辛寅亥，壬癸巳申
   * 以日干/年干查
   */
  '太极贵人': {
    category: '吉',
    type: 'gan',
    description: '太极贵人，主聪慧灵秀，好学深思',
    data: {
      '甲': ['子', '午'], '乙': ['子', '午'],
      '丙': ['卯', '酉'], '丁': ['卯', '酉'],
      '戊': ['辰', '戌', '丑', '未'], '己': ['辰', '戌', '丑', '未'],
      '庚': ['寅', '亥'], '辛': ['寅', '亥'],
      '壬': ['巳', '申'], '癸': ['巳', '申']
    }
  },

  /**
   * 福星贵人
   * 口诀: 甲丙寅子，乙癸卯丑，戊申，己未，庚午，辛巳，壬辰，丁酉
   * 以日干查
   */
  '福星贵人': {
    category: '吉',
    type: 'gan',
    description: '福星贵人，主福寿安康，一生少灾',
    data: {
      '甲': ['寅', '子'], '乙': ['卯', '丑'], '丙': ['子', '寅'],
      '丁': ['酉'], '戊': ['申'], '己': ['未'],
      '庚': ['午'], '辛': ['巳'], '壬': ['辰'], '癸': ['丑', '卯']
    }
  },

  /**
   * 禄神
   * 口诀: 甲禄在寅，乙禄在卯，丙戊禄在巳，丁己禄在午，
   *       庚禄在申，辛禄在酉，壬禄在亥，癸禄在子
   * 以日干查
   */
  '禄神': {
    category: '吉',
    type: 'gan',
    description: '禄神，主衣食丰足，事业稳定',
    data: {
      '甲': ['寅'], '乙': ['卯'], '丙': ['巳'], '丁': ['午'],
      '戊': ['巳'], '己': ['午'], '庚': ['申'], '辛': ['酉'],
      '壬': ['亥'], '癸': ['子']
    }
  },

  /**
   * 金舆
   * 口诀: 甲辰乙巳丙戊未，丁己申庚戌辛亥，壬丑癸寅
   * 以日干查
   */
  '金舆': {
    category: '吉',
    type: 'gan',
    description: '金舆，主富贵，得车马之利',
    data: {
      '甲': ['辰'], '乙': ['巳'], '丙': ['未'], '丁': ['申'],
      '戊': ['未'], '己': ['申'], '庚': ['戌'], '辛': ['亥'],
      '壬': ['丑'], '癸': ['寅']
    }
  },

  /**
   * 金神（吉神类）
   * 口诀: 金神入火乡，富贵天下响
   * 日柱为乙丑、己巳、癸酉即为金神
   * 注: 金神同时出现在吉神类和中性类，因其吉凶取决于月令
   */
  '金神': {
    category: '吉',
    type: 'ganzhi',
    description: '金神，遇火则贵，主刚毅果断',
    data: ['乙丑', '己巳', '癸酉']
  },

  /**
   * 国印贵人
   * 口诀: 甲戌乙亥丙戊丑，丁己寅庚辰辛巳，壬未癸申
   * 以日干查
   */
  '国印贵人': {
    category: '吉',
    type: 'gan',
    description: '国印贵人，主掌权印，有官职权柄',
    data: {
      '甲': ['戌'], '乙': ['亥'], '丙': ['丑'], '丁': ['寅'],
      '戊': ['丑'], '己': ['寅'], '庚': ['辰'], '辛': ['巳'],
      '壬': ['未'], '癸': ['申']
    }
  },

  /**
   * 天厨贵人
   * 口诀: 甲见巳乙见午，丙见子丁见巳，戊见午己见申，
   *       庚见寅辛见午，壬见酉癸见亥
   * 以日干查
   */
  '天厨贵人': {
    category: '吉',
    type: 'gan',
    description: '天厨贵人，主食禄丰厚，生活优渥',
    data: {
      '甲': ['巳'], '乙': ['午'], '丙': ['子'], '丁': ['巳'],
      '戊': ['午'], '己': ['申'], '庚': ['寅'], '辛': ['午'],
      '壬': ['酉'], '癸': ['亥']
    }
  },

  /**
   * 红鸾
   * 口诀: 以年支查，子见卯、丑见寅、寅见丑、卯见子、
   *       辰见亥、巳见戌、午见酉、未见申、
   *       申见未、酉见午、戌见巳、亥见辰
   */
  '红鸾': {
    category: '吉',
    type: 'zhi',
    description: '红鸾，主姻缘喜庆，婚姻美满',
    data: {
      '子': '卯', '丑': '寅', '寅': '丑', '卯': '子',
      '辰': '亥', '巳': '戌', '午': '酉', '未': '申',
      '申': '未', '酉': '午', '戌': '巳', '亥': '辰'
    }
  },

  /**
   * 天喜
   * 口诀: 以年支查，红鸾之对冲
   * 子见酉、丑见申、寅见未、卯见午、
   * 辰见巳、巳见辰、午见卯、未见寅、
   * 申见亥、酉见戌、戌见酉、亥见申
   */
  '天喜': {
    category: '吉',
    type: 'zhi',
    description: '天喜，主喜庆之事，婚恋添丁',
    data: {
      '子': '酉', '丑': '申', '寅': '未', '卯': '午',
      '辰': '巳', '巳': '辰', '午': '卯', '未': '寅',
      '申': '亥', '酉': '戌', '戌': '酉', '亥': '申'
    }
  },

  /**
   * 八座
   * 口诀: 以年支查，三合局帝旺位之对冲
   * 子年见酉、丑年见戌、寅年见亥、卯年见子、
   * 辰年见丑、巳年见寅、午年见卯、未年见辰、
   * 申年见巳、酉年见午、戌年见未、亥年见申
   * 简化: 年支后两位（六合后一位）
   */
  '八座': {
    category: '吉',
    type: 'zhi',
    description: '八座，主地位尊崇，受人敬重',
    data: {
      '子': '酉', '丑': '戌', '寅': '亥', '卯': '子',
      '辰': '丑', '巳': '寅', '午': '卯', '未': '辰',
      '申': '巳', '酉': '午', '戌': '未', '亥': '申'
    }
  },

  // ============================================================
  // B. 凶煞类（18种）
  // ============================================================

  /**
   * 羊刃
   * 口诀: 甲刃在卯，乙刃在寅，丙戊刃在午，丁己刃在巳，
   *       庚刃在酉，辛刃在申，壬刃在子，癸刃在亥
   * 禄前一位为羊刃（阳干），禄后一位为羊刃（阴干）
   */
  '羊刃': {
    category: '凶',
    type: 'gan',
    description: '羊刃，主刚烈急躁，易有血光之灾',
    data: {
      '甲': ['卯'], '乙': ['寅'], '丙': ['午'], '丁': ['巳'],
      '戊': ['午'], '己': ['巳'], '庚': ['酉'], '辛': ['申'],
      '壬': ['子'], '癸': ['亥']
    }
  },

  /**
   * 劫煞
   * 口诀: 以年支/日支查，三合局绝位
   * 申子辰见巳，寅午戌见亥，亥卯未见申，巳酉丑见寅
   */
  '劫煞': {
    category: '凶',
    type: 'zhi_sanhe',
    description: '劫煞，主破财争斗，意外灾祸',
    data: {
      '申': '巳', '子': '巳', '辰': '巳',
      '寅': '亥', '午': '亥', '戌': '亥',
      '亥': '申', '卯': '申', '未': '申',
      '巳': '寅', '酉': '寅', '丑': '寅'
    }
  },

  /**
   * 灾煞
   * 口诀: 以年支/日支查，三合局胎位
   * 申子辰见午，寅午戌见子，亥卯未见酉，巳酉丑见卯
   */
  '灾煞': {
    category: '凶',
    type: 'zhi_sanhe',
    description: '灾煞，主灾祸横生，多有磨难',
    data: {
      '申': '午', '子': '午', '辰': '午',
      '寅': '子', '午': '子', '戌': '子',
      '亥': '酉', '卯': '酉', '未': '酉',
      '巳': '卯', '酉': '卯', '丑': '卯'
    }
  },

  /**
   * 孤辰
   * 口诀: 以年支查，三合局前一位
   * 申子辰见亥，寅午戌见巳，亥卯未见寅，巳酉丑见申
   */
  '孤辰': {
    category: '凶',
    type: 'zhi_sanhe',
    description: '孤辰，主孤独寡合，性格孤僻',
    data: {
      '申': '亥', '子': '亥', '辰': '亥',
      '寅': '巳', '午': '巳', '戌': '巳',
      '亥': '寅', '卯': '寅', '未': '寅',
      '巳': '申', '酉': '申', '丑': '申'
    }
  },

  /**
   * 寡宿
   * 口诀: 以年支查，三合局后一位
   * 申子辰见丑，寅午戌见未，亥卯未见辰，巳酉丑见戌
   */
  '寡宿': {
    category: '凶',
    type: 'zhi_sanhe',
    description: '寡宿，主孤独寂寞，婚姻不顺',
    data: {
      '申': '丑', '子': '丑', '辰': '丑',
      '寅': '未', '午': '未', '戌': '未',
      '亥': '辰', '卯': '辰', '未': '辰',
      '巳': '戌', '酉': '戌', '丑': '戌'
    }
  },

  /**
   * 元辰（大耗）
   * 口诀: 阳男阴女，冲前一位；阴男阳女，冲后一位
   * 以年支查，需要性别和年干阴阳配合
   * 阳男阴女: 子→未, 丑→申, 寅→酉, 卯→戌, 辰→亥, 巳→子, 午→丑, 未→寅, 申→卯, 酉→辰, 戌→巳, 亥→午
   * 阴男阳女: 子→巳, 丑→午, 寅→未, 卯→申, 辰→酉, 巳→戌, 午→亥, 未→子, 申→丑, 酉→寅, 戌→卯, 亥→辰
   */
  '元辰': {
    category: '凶',
    type: 'calculated',
    description: '元辰（大耗），主损耗破败，运势低迷',
    // 阳男阴女（冲前一位=六冲地支+1位）
    yang: {
      '子': '未', '丑': '申', '寅': '酉', '卯': '戌',
      '辰': '亥', '巳': '子', '午': '丑', '未': '寅',
      '申': '卯', '酉': '辰', '戌': '巳', '亥': '午'
    },
    // 阴男阳女（冲后一位=六冲地支-1位）
    yin: {
      '子': '巳', '丑': '午', '寅': '未', '卯': '申',
      '辰': '酉', '巳': '戌', '午': '亥', '未': '子',
      '申': '丑', '酉': '寅', '戌': '卯', '亥': '辰'
    }
  },

  /**
   * 亡神
   * 口诀: 以年支/日支查，三合局临官位
   * 申子辰见亥，寅午戌见巳，亥卯未见寅，巳酉丑见申
   */
  '亡神': {
    category: '凶',
    type: 'zhi_sanhe',
    description: '亡神，主心神不宁，多意外之灾',
    data: {
      '申': '亥', '子': '亥', '辰': '亥',
      '寅': '巳', '午': '巳', '戌': '巳',
      '亥': '寅', '卯': '寅', '未': '寅',
      '巳': '申', '酉': '申', '丑': '申'
    }
  },

  /**
   * 咸池（桃花）
   * 口诀: 以年支/日支查，三合局沐浴位
   * 申子辰见酉，寅午戌见卯，亥卯未见子，巳酉丑见午
   */
  '咸池': {
    category: '凶',
    type: 'zhi_sanhe',
    description: '咸池（桃花），主风流多情，易惹桃花劫',
    data: {
      '申': '酉', '子': '酉', '辰': '酉',
      '寅': '卯', '午': '卯', '戌': '卯',
      '亥': '子', '卯': '子', '未': '子',
      '巳': '午', '酉': '午', '丑': '午'
    }
  },

  /**
   * 空亡
   * 口诀: 六甲旬空
   * 甲子旬空戌亥，甲戌旬空申酉，甲申旬空午未，
   * 甲午旬空辰巳，甲辰旬空寅卯，甲寅旬空子丑
   * 以日柱干支查
   */
  '空亡': {
    category: '凶',
    type: 'calculated',
    description: '空亡，主虚而不实，劳而无功',
    // 旬首 → 空亡地支
    xunKongTable: ['戌亥', '申酉', '午未', '辰巳', '寅卯', '子丑']
  },

/**
   * 丧门
   * 口诀: 以年支查，岁前二辰
   * 子见寅、丑见卯、寅见辰、卯见巳、辰见午、巳见未、
   * 午见申、未见酉、申见戌、酉见亥、戌见子、亥见丑
   */
  '丧门': {
    category: '凶',
    type: 'zhi',
    description: '丧门，主孝服丧事，家运不宁',
    data: {
      '子': '寅', '丑': '卯', '寅': '辰', '卯': '巳',
      '辰': '午', '巳': '未', '午': '申', '未': '酉',
      '申': '戌', '酉': '亥', '戌': '子', '亥': '丑'
    }
  },

  /**
   * 吊客
   * 口诀: 以年支查，岁后二辰（丧门之对冲）
   * 子见戌、丑见亥、寅见子、卯见丑、辰见寅、巳见卯、
   * 午见辰、未见巳、申见午、酉见未、戌见申、亥见酉
   */
  '吊客': {
    category: '凶',
    type: 'zhi',
    description: '吊客，主吊唁之事，亲友离散',
    data: {
      '子': '戌', '丑': '亥', '寅': '子', '卯': '丑',
      '辰': '寅', '巳': '卯', '午': '辰', '未': '巳',
      '申': '午', '酉': '未', '戌': '申', '亥': '酉'
    }
  },

  /**
   * 勾绞
   * 口诀: 以年支查，阳年男命取对冲，阴年男命取本位前后
   * 简化: 三合局沐浴位之对冲
   * 申子辰见卯，寅午戌见酉，亥卯未见午，巳酉丑见子
   */
  '勾绞': {
    category: '凶',
    type: 'zhi_sanhe',
    description: '勾绞，主口舌是非，官司缠身',
    data: {
      '申': '卯', '子': '卯', '辰': '卯',
      '寅': '酉', '午': '酉', '戌': '酉',
      '亥': '午', '卯': '午', '未': '午',
      '巳': '子', '酉': '子', '丑': '子'
    }
  },

  /**
   * 披麻
   * 口诀: 以年支查，年支后两位
   * 子见酉、丑见戌、寅见亥、卯见子、辰见丑、巳见寅、
   * 午见卯、未见辰、申见巳、酉见午、戌见未、亥见申
   */
  '披麻': {
    category: '凶',
    type: 'zhi',
    description: '披麻，主孝服，家庭变故',
    data: {
      '子': '酉', '丑': '戌', '寅': '亥', '卯': '子',
      '辰': '丑', '巳': '寅', '午': '卯', '未': '辰',
      '申': '巳', '酉': '午', '戌': '未', '亥': '申'
    }
  },

  /**
   * 天罗
   * 口诀: 男怕天罗，女怕地网
   * 天罗: 戌亥为天罗
   * 以年支/日支查，男命见戌亥
   */
  '天罗': {
    category: '凶',
    type: 'fixed',
    description: '天罗，男主官司刑罚，运途困顿',
    data: { 'zhi': ['戌', '亥'] }
  },

  /**
   * 地网
   * 口诀: 女怕地网
   * 地网: 辰巳为地网
   * 以年支/日支查，女命见辰巳
   */
  '地网': {
    category: '凶',
    type: 'fixed',
    description: '地网，女主困厄，运途多阻',
    data: { 'zhi': ['辰', '巳'] }
  },

  /**
   * 十恶大败
   * 口诀: 甲辰乙巳与壬申，丙申丁亥及庚辰，
   *       戊戌癸亥加辛巳，己丑都来十位神
   * 以日柱干支查
   */
  '十恶大败': {
    category: '凶',
    type: 'ganzhi',
    description: '十恶大败，主破财败家，仓库空虚',
    data: ['甲辰', '乙巳', '壬申', '丙申', '丁亥', '庚辰', '戊戌', '癸亥', '辛巳', '己丑']
  },

  /**
   * 血刃
   * 口诀: 以月支查，正月丑、二月未、三月寅、四月申、
   *       五月卯、六月酉、七月辰、八月戌、九月巳、十月亥、
   *       十一月午、十二月子
   */
  '血刃': {
    category: '凶',
    type: 'month_zhi',
    description: '血刃，主血光之灾，手术外伤',
    data: {
      '寅': '丑', '卯': '未', '辰': '寅', '巳': '申',
      '午': '卯', '未': '酉', '申': '辰', '酉': '戌',
      '戌': '巳', '亥': '亥', '子': '午', '丑': '子'
    }
  },

  /**
   * 白虎
   * 口诀: 以年支查，申子辰见申，寅午戌见寅，亥卯未见亥，巳酉丑见巳
   * 即年支三合局的长生位
   */
  '白虎': {
    category: '凶',
    type: 'zhi_sanhe',
    description: '白虎，主血光横祸，凶灾突至',
    data: {
      '申': '申', '子': '申', '辰': '申',
      '寅': '寅', '午': '寅', '戌': '寅',
      '亥': '亥', '卯': '亥', '未': '亥',
      '巳': '巳', '酉': '巳', '丑': '巳'
    }
  },

  // ============================================================
  // C. 中性类（11种）
  // ============================================================

  /**
   * 魁罡
   * 口诀: 壬辰庚戌与庚辰，戊戌魁罡四座神
   * 以日柱干支查
   */
  '魁罡': {
    category: '中性',
    type: 'ganzhi',
    description: '魁罡，主性格刚强，聪明果断，但易刚愎自用',
    data: ['庚辰', '庚戌', '壬辰', '戊戌']
  },

  /**
   * 金神（中性类）
   * 与吉神类中的金神是同一神煞，此处按中性类也列出
   * 金神之吉凶，取决于月令是否见火
   * 日柱为乙丑、己巳、癸酉
   */
  '金神_中性': {
    category: '中性',
    type: 'ganzhi',
    description: '金神（中性），遇火则贵，遇水则困',
    data: ['乙丑', '己巳', '癸酉']
  },

  /**
   * 阴阳差错
   * 口诀: 丙子丁丑戊寅辛卯壬辰癸巳，
   *       丙午丁未戊申辛酉壬戌癸亥
   * 以日柱干支查
   */
  '阴阳差错': {
    category: '中性',
    type: 'ganzhi',
    description: '阴阳差错，主婚姻不顺，家庭不睦',
    data: ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳',
           '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥']
  },

  /**
   * 四废
   * 口诀: 春庚申辛酉，夏壬子癸亥，秋甲寅乙卯，冬丙午丁巳
   * 以季节查日柱干支
   */
  '四废': {
    category: '中性',
    type: 'season',
    description: '四废，主因循苟且，百事难成',
    data: {
      '春': ['庚申', '辛酉'],
      '夏': ['壬子', '癸亥'],
      '秋': ['甲寅', '乙卯'],
      '冬': ['丙午', '丁巳']
    }
  },

  /**
   * 六厄
   * 口诀: 以年支查，三合局死位
   * 申子辰见卯，寅午戌见酉，亥卯未见午，巳酉丑见子
   */
  '六厄': {
    category: '中性',
    type: 'zhi_sanhe',
    description: '六厄，主困顿不顺，多遭磨难',
    data: {
      '申': '卯', '子': '卯', '辰': '卯',
      '寅': '酉', '午': '酉', '戌': '酉',
      '亥': '午', '卯': '午', '未': '午',
      '巳': '子', '酉': '子', '丑': '子'
    }
  },

  /**
   * 天罗地网（综合）
   * 男命戌亥为天罗，女命辰巳为地网
   * 以年支/日支查，需要性别配合
   */
  '天罗地网': {
    category: '中性',
    type: 'fixed',
    description: '天罗地网，主运途困顿，有志难伸',
    data: {
      'male': { 'type': '天罗', 'zhi': ['戌', '亥'] },
      'female': { 'type': '地网', 'zhi': ['辰', '巳'] }
    }
  },

  /**
   * 伏吟
   * 口诀: 四柱中有相同干支出现
   * 检查年柱、月柱、日柱、时柱中是否有相同的干支
   */
  '伏吟': {
    category: '中性',
    type: 'pattern',
    description: '伏吟，主反复不宁，事多阻滞',
    lookup: 'same_ganzhi'
  },

  /**
   * 返吟
   * 口诀: 四柱中有对冲的干支
   * 检查年柱、月柱、日柱、时柱中是否有六冲的干支
   */
  '返吟': {
    category: '中性',
    type: 'pattern',
    description: '返吟，主动荡不安，多有变动',
    lookup: 'chong_ganzhi'
  },

  /**
   * 截路
   * 口诀: 以日干查，甲申乙酉丙亥丁子戊寅己卯庚巳辛午壬戌癸未
   * 即截路空亡，以日干查
   */
  '截路': {
    category: '中性',
    type: 'gan',
    description: '截路空亡，主凡事受阻，中途而废',
    data: {
      '甲': ['申'], '乙': ['酉'], '丙': ['亥'], '丁': ['子'],
      '戊': ['寅'], '己': ['卯'], '庚': ['巳'], '辛': ['午'],
      '壬': ['戌'], '癸': ['未']
    }
  },

  /**
   * 四正
   * 口诀: 子午卯酉为四正
   * 检查四柱地支是否在子午卯酉之中
   */
  '四正': {
    category: '中性',
    type: 'pattern',
    description: '四正，主性格刚直，气纯而专',
    lookup: 'four_zheng',
    data: ['子', '午', '卯', '酉']
  },

  /**
   * 四生
   * 口诀: 寅申巳亥为四生（四长生）
   * 检查四柱地支是否在寅申巳亥之中
   */
  '四生': {
    category: '中性',
    type: 'pattern',
    description: '四生，主动荡变化，驿马奔波',
    lookup: 'four_sheng',
    data: ['寅', '申', '巳', '亥']
  }
};

// ============================================================================
// 四、神煞计算核心函数
// ============================================================================

/**
 * 神煞结果项
 * @typedef {Object} ShenShaResult
 * @property {string} name        - 神煞名称
 * @property {string} category    - 类别 (吉/凶/中性)
 * @property {string[]} pillars   - 所在柱 (年柱/月柱/日柱/时柱)
 * @property {string} description - 说明
 */

/**
 * 内部辅助: 检查基于天干的神煞
 * @param {string} name - 神煞名称
 * @param {Object} def - 神煞定义
 * @param {string} refGan - 参考天干（日干或年干）
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkGanShenSha(name, def, refGan, allGanZhi) {
  if (!def || !def.data) return [];
  var targetZhi = def.data[refGan];
  if (!targetZhi) return [];
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    var zhi = allGanZhi[i].charAt(1);
    if (targetZhi.indexOf(zhi) >= 0) {
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    }
  }
  return found;
}

/**
 * 内部辅助: 检查基于地支（一对一）的神煞
 * @param {string} name - 神煞名称
 * @param {Object} def - 神煞定义
 * @param {string} refZhi - 参考地支
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkZhiShenSha(name, def, refZhi, allGanZhi) {
  if (!def || !def.data) return [];
  var targetZhi = def.data[refZhi];
  if (!targetZhi) return [];
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    var zhi = allGanZhi[i].charAt(1);
    if (zhi === targetZhi) {
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    }
  }
  return found;
}

/**
 * 内部辅助: 检查基于三合局的神煞
 * @param {string} name - 神煞名称
 * @param {Object} def - 神煞定义
 * @param {string} refZhi - 参考地支
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkZhiSanHeShenSha(name, def, refZhi, allGanZhi) {
  if (!def || !def.data) return [];
  var targetZhi = def.data[refZhi];
  if (!targetZhi) return [];
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    var zhi = allGanZhi[i].charAt(1);
    if (zhi === targetZhi) {
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    }
  }
  return found;
}

/**
 * 内部辅助: 检查基于干支组合的神煞
 * @param {string} name - 神煞名称
 * @param {Object} def - 神煞定义
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkGanZhiShenSha(name, def, allGanZhi) {
  if (!def || !def.data) return [];
  var targets = def.data;
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    if (targets.indexOf(allGanZhi[i]) >= 0) {
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    }
  }
  return found;
}

/**
 * 内部辅助: 检查基于季节的神煞（单值）
 * @param {string} name - 神煞名称
 * @param {Object} def - 神煞定义
 * @param {string} season - 季节
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkSeasonShenSha(name, def, season, allGanZhi) {
  if (!def || !def.data) return [];
  var target = def.data[season];
  if (!target) return [];
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    if (allGanZhi[i] === target) {
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    }
  }
  return found;
}

/**
 * 内部辅助: 检查基于季节的神煞（多值数组）
 * @param {string} name - 神煞名称
 * @param {Object} def - 神煞定义
 * @param {string} season - 季节
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkSeasonMultiShenSha(name, def, season, allGanZhi) {
  if (!def || !def.data) return [];
  var targets = def.data[season];
  if (!targets) return [];
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    if (targets.indexOf(allGanZhi[i]) >= 0) {
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    }
  }
  return found;
}

/**
 * 内部辅助: 检查基于月支的神煞（查天干）
 * @param {string} name - 神煞名称
 * @param {Object} def - 神煞定义
 * @param {string} monthZhi - 月支
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkMonthZhiShenSha(name, def, monthZhi, allGanZhi) {
  if (!def || !def.data) return [];
  var targetGan = def.data[monthZhi];
  if (!targetGan) return [];
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    var gan = allGanZhi[i].charAt(0);
    if (gan === targetGan) {
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    }
  }
  return found;
}

/**
 * 内部辅助: 检查基于月支的神煞（查地支，一对一）
 * @param {string} name - 神煞名称
 * @param {Object} def - 神煞定义
 * @param {string} monthZhi - 月支
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkMonthZhiShiftShenSha(name, def, monthZhi, allGanZhi) {
  if (!def || !def.data) return [];
  var targetZhi = def.data[monthZhi];
  if (!targetZhi) return [];
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    var zhi = allGanZhi[i].charAt(1);
    if (zhi === targetZhi) {
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    }
  }
  return found;
}

/**
 * 内部辅助: 检查三奇贵人（天干组合匹配）
 * @param {string[]} allGan - 四柱天干数组
 * @returns {string[]} 所在柱位列表
 */
function _checkSanQi(allGan) {
  var patterns = [
    ['甲', '戊', '庚'],
    ['乙', '丙', '丁'],
    ['壬', '癸', '辛']
  ];
  // 检查四柱天干是否包含某一组完整的三奇
  for (var p = 0; p < patterns.length; p++) {
    var pattern = patterns[p];
    var allMatch = true;
    for (var g = 0; g < pattern.length; g++) {
      if (allGan.indexOf(pattern[g]) < 0) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      return ['年柱', '月柱', '日柱', '时柱']; // 三奇贯穿四柱
    }
  }
  return [];
}

/**
 * 内部辅助: 检查元辰（大耗）
 * 需要年干阴阳和性别
 * @param {string} yearGan - 年干
 * @param {string} yearZhi - 年支
 * @param {string} gender - 性别 'male'/'female'
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkYuanChen(yearGan, yearZhi, gender, allGanZhi) {
  var def = SHENSHA_DEFINITIONS['元辰'];
  if (!def) return [];
  var isYang = GAN_YINYANG[yearGan] === '阳';
  var isMale = gender === 'male';
  // 阳男阴女用yang表，阴男阳女用yin表
  var useYang = (isYang && isMale) || (!isYang && !isMale);
  var table = useYang ? def.yang : def.yin;
  var targetZhi = table[yearZhi];
  if (!targetZhi) return [];
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    var zhi = allGanZhi[i].charAt(1);
    if (zhi === targetZhi) {
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    }
  }
  return found;
}

/**
 * 内部辅助: 检查空亡
 * @param {string} dayGanZhi - 日柱干支
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkKongWang(dayGanZhi, allGanZhi) {
  var xunKongTable = ['戌亥', '申酉', '午未', '辰巳', '寅卯', '子丑'];
  var idx = jiaziIndex(dayGanZhi);
  if (idx < 0) return [];
  var kongStr = xunKongTable[Math.floor(idx / 10)];
  var kongZhi = [kongStr.charAt(0), kongStr.charAt(1)];
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    var zhi = allGanZhi[i].charAt(1);
    if (kongZhi.indexOf(zhi) >= 0) {
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    }
  }
  return found;
}

/**
 * 内部辅助: 检查固定神煞（天罗/地网/天罗地网）
 * @param {Object} def - 神煞定义
 * @param {string} gender - 性别
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkFixedShenSha(def, gender, allGanZhi) {
  if (!def || !def.data) return [];
  var data = def.data;
  var targetZhi;
  if (data.male && data.female) {
    // 区分性别（如天罗地网综合）
    targetZhi = gender === 'male' ? data.male.zhi : data.female.zhi;
  } else {
    targetZhi = data.zhi;
  }
  if (!targetZhi) return [];
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    var zhi = allGanZhi[i].charAt(1);
    if (targetZhi.indexOf(zhi) >= 0) {
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    }
  }
  return found;
}

/**
 * 内部辅助: 检查伏吟
 * 四柱中有相同干支出现
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkFuYin(allGanZhi) {
  var found = [];
  var seen = {};
  for (var i = 0; i < allGanZhi.length; i++) {
    var gz = allGanZhi[i];
    if (seen[gz] !== undefined) {
      if (found.indexOf(['年柱', '月柱', '日柱', '时柱'][seen[gz]]) < 0) {
        found.push(['年柱', '月柱', '日柱', '时柱'][seen[gz]]);
      }
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    } else {
      seen[gz] = i;
    }
  }
  return found;
}

/**
 * 内部辅助: 检查返吟
 * 四柱中有六冲的干支
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkFanYin(allGanZhi) {
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    for (var j = i + 1; j < allGanZhi.length; j++) {
      var zi = allGanZhi[i].charAt(1);
      var zj = allGanZhi[j].charAt(1);
      if (LIUCHONG[zi] === zj) {
        if (found.indexOf(['年柱', '月柱', '日柱', '时柱'][i]) < 0) {
          found.push(['年柱', '月柱', '日柱', '时柱'][i]);
        }
        if (found.indexOf(['年柱', '月柱', '日柱', '时柱'][j]) < 0) {
          found.push(['年柱', '月柱', '日柱', '时柱'][j]);
        }
      }
    }
  }
  return found;
}

/**
 * 内部辅助: 检查四正（子午卯酉）
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkSiZheng(allGanZhi) {
  var fourZheng = ['子', '午', '卯', '酉'];
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    var zhi = allGanZhi[i].charAt(1);
    if (fourZheng.indexOf(zhi) >= 0) {
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    }
  }
  return found;
}

/**
 * 内部辅助: 检查四生（寅申巳亥）
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkSiSheng(allGanZhi) {
  var fourSheng = ['寅', '申', '巳', '亥'];
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    var zhi = allGanZhi[i].charAt(1);
    if (fourSheng.indexOf(zhi) >= 0) {
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    }
  }
  return found;
}

/**
 * 内部辅助: 检查词馆（特殊处理）
 * 词馆检查需同时满足天干和地支两个条件
 * @param {string} dayGan - 日干
 * @param {string[]} allGanZhi - 四柱干支数组
 * @returns {string[]} 所在柱位列表
 */
function _checkCiGuan(dayGan, allGanZhi) {
  var def = SHENSHA_DEFINITIONS['词馆'];
  if (!def || !def.data) return [];
  var targetData = def.data[dayGan];
  if (!targetData) return [];
  // 词馆需要干支同时匹配（如甲日干见庚寅）
  var targetGanZhi = targetData[0]; // 完整干支
  var targetZhi = targetData[1];    // 分支（宽松匹配）
  var found = [];
  for (var i = 0; i < allGanZhi.length; i++) {
    // 严格匹配: 干支全匹配
    if (allGanZhi[i] === targetGanZhi) {
      found.push(['年柱', '月柱', '日柱', '时柱'][i]);
    }
  }
  // 若无严格匹配，宽松匹配（仅地支）
  if (found.length === 0) {
    for (var j = 0; j < allGanZhi.length; j++) {
      var zhi = allGanZhi[j].charAt(1);
      if (zhi === targetZhi) {
        found.push(['年柱', '月柱', '日柱', '时柱'][j]);
      }
    }
  }
  return found;
}

// ============================================================================
// 五、主计算函数: calculateAllShenSha
// ============================================================================

/**
 * 计算八字中所有51种神煞
 *
 * 入参:
 * @param {Object} bazi - 八字对象
 * @param {string} bazi.yearGan   - 年干
 * @param {string} bazi.yearZhi   - 年支
 * @param {string} bazi.monthGan  - 月干
 * @param {string} bazi.monthZhi  - 月支
 * @param {string} bazi.dayGan    - 日干
 * @param {string} bazi.dayZhi    - 日支
 * @param {string} bazi.hourGan   - 时干
 * @param {string} bazi.hourZhi   - 时支
 * @param {string} [bazi.gender]  - 性别 'male'/'female'（默认'male'）
 *
 * 出参:
 * @returns {Object}
 * {
 *   summary: { 吉: number, 凶: number, 中性: number, total: number },
 *   categories: {
 *     吉: Array<ShenShaResult>,
 *     凶: Array<ShenShaResult>,
 *     中性: Array<ShenShaResult>
 *   },
 *   all: Array<ShenShaResult>,       // 所有神煞（按名称排序）
 *   byPillar: {                      // 按柱位分组
 *     年柱: Array<ShenShaResult>,
 *     月柱: Array<ShenShaResult>,
 *     日柱: Array<ShenShaResult>,
 *     时柱: Array<ShenShaResult>
 *   }
 * }
 */
function calculateAllShenSha(bazi) {
  var yearGan = bazi.yearGan;
  var yearZhi = bazi.yearZhi;
  var monthGan = bazi.monthGan;
  var monthZhi = bazi.monthZhi;
  var dayGan = bazi.dayGan;
  var dayZhi = bazi.dayZhi;
  var hourGan = bazi.hourGan;
  var hourZhi = bazi.hourZhi;
  var gender = bazi.gender || 'male';

  var allGanZhi = [
    yearGan + yearZhi,
    monthGan + monthZhi,
    dayGan + dayZhi,
    hourGan + hourZhi
  ];
  var allGan = [yearGan, monthGan, dayGan, hourGan];
  var season = getSeason(monthZhi);

  var results = {
    '吉': [],
    '凶': [],
    '中性': []
  };

  var defs = SHENSHA_DEFINITIONS;
  var shenShaNames = Object.keys(defs);

  for (var n = 0; n < shenShaNames.length; n++) {
    var name = shenShaNames[n];
    var def = defs[name];
    var pillars = [];

    switch (def.type) {
      // ---- 天干为基准 ----
      case 'gan':
        pillars = _checkGanShenSha(name, def, dayGan, allGanZhi);
        break;

      // ---- 地支为基准（一对一） ----
      case 'zhi':
        pillars = _checkZhiShenSha(name, def, yearZhi, allGanZhi);
        break;

      // ---- 三合局为基准 ----
      case 'zhi_sanhe':
        pillars = _checkZhiSanHeShenSha(name, def, yearZhi, allGanZhi);
        break;

      // ---- 干支组合为基准 ----
      case 'ganzhi':
        pillars = _checkGanZhiShenSha(name, def, allGanZhi);
        break;

      // ---- 季节为基准（单值） ----
      case 'season':
        if (def.data && typeof def.data[season] === 'string') {
          pillars = _checkSeasonShenSha(name, def, season, allGanZhi);
        } else {
          pillars = _checkSeasonMultiShenSha(name, def, season, allGanZhi);
        }
        break;

      // ---- 月支为基准（查天干） ----
      case 'month_zhi':
        pillars = _checkMonthZhiShenSha(name, def, monthZhi, allGanZhi);
        break;

      // ---- 月支为基准（查地支） ----
      case 'month_zhi_shift':
        pillars = _checkMonthZhiShiftShenSha(name, def, monthZhi, allGanZhi);
        break;

      // ---- 天干组合 ----
      case 'gan_combination':
        pillars = _checkSanQi(allGan);
        break;

      // ---- 固定条件 ----
      case 'fixed':
        pillars = _checkFixedShenSha(def, gender, allGanZhi);
        break;

      // ---- 需要计算 ----
      case 'calculated':
        if (name === '元辰') {
          pillars = _checkYuanChen(yearGan, yearZhi, gender, allGanZhi);
        } else if (name === '空亡') {
          // 空亡: 以日柱为基准
          pillars = _checkKongWang(dayGan + dayZhi, allGanZhi);
        }
        break;

      // ---- 模式匹配 ----
      case 'pattern':
        if (def.lookup === 'same_ganzhi') {
          pillars = _checkFuYin(allGanZhi);
        } else if (def.lookup === 'chong_ganzhi') {
          pillars = _checkFanYin(allGanZhi);
        } else if (def.lookup === 'four_zheng') {
          pillars = _checkSiZheng(allGanZhi);
        } else if (def.lookup === 'four_sheng') {
          pillars = _checkSiSheng(allGanZhi);
        }
        break;
    }

    if (pillars.length > 0) {
      // 特殊处理：金神同时出现在吉神和中性类
      var category = def.category;
      if (name === '金神_中性') {
        // 金神_中性 与 金神 是同一神煞，避免重复
        // 金神作为吉神已经处理过了，这里只做中性类记录
        category = '中性';
        // 如果金神（吉神类）已经匹配到了，就不重复添加
        var alreadyHasJinShen = results['吉'].some(function(r) { return r.name === '金神'; });
        if (alreadyHasJinShen) {
          continue;
        }
      }

      results[category].push({
        name: name.replace('_中性', ''),
        category: category,
        pillars: pillars,
        description: def.description || ''
      });
    }
  }

  // 构建汇总
  var allResults = [];
  for (var cat in results) {
    if (results.hasOwnProperty(cat)) {
      allResults = allResults.concat(results[cat]);
    }
  }

  // 按名称排序
  allResults.sort(function(a, b) {
    return a.name.localeCompare(b.name, 'zh');
  });

  // 按柱位分组
  var byPillar = {
    '年柱': [],
    '月柱': [],
    '日柱': [],
    '时柱': []
  };

  allResults.forEach(function(shensha) {
    shensha.pillars.forEach(function(pillar) {
      byPillar[pillar].push({
        name: shensha.name,
        category: shensha.category,
        description: shensha.description
      });
    });
  });

  return {
    summary: {
      '吉': results['吉'].length,
      '凶': results['凶'].length,
      '中性': results['中性'].length,
      total: allResults.length
    },
    categories: {
      '吉': results['吉'],
      '凶': results['凶'],
      '中性': results['中性']
    },
    all: allResults,
    byPillar: byPillar
  };
}

// ============================================================================
// 六、便捷查询函数
// ============================================================================

/**
 * 查询指定柱位的神煞
 * @param {Object} bazi - 八字对象
 * @param {string} pillarName - 柱位名称 '年柱'/'月柱'/'日柱'/'时柱'
 * @returns {Array} 该柱位的神煞列表
 */
function getShenShaByPillar(bazi, pillarName) {
  var result = calculateAllShenSha(bazi);
  return result.byPillar[pillarName] || [];
}

/**
 * 查询指定类别的神煞
 * @param {Object} bazi - 八字对象
 * @param {string} category - 类别 '吉'/'凶'/'中性'
 * @returns {Array} 该类别的神煞列表
 */
function getShenShaByCategory(bazi, category) {
  var result = calculateAllShenSha(bazi);
  return result.categories[category] || [];
}

/**
 * 检查是否存在指定神煞
 * @param {Object} bazi - 八字对象
 * @param {string} name - 神煞名称
 * @returns {boolean}
 */
function hasShenSha(bazi, name) {
  var result = calculateAllShenSha(bazi);
  return result.all.some(function(s) { return s.name === name; });
}

// ============================================================================
// 七、神煞简要清单（固定分类）
// ============================================================================

/**
 * 51种神煞分类清单（用于展示和校验）
 */
const SHENSHA_CATEGORY_LIST = {
  '吉': [
    '天乙贵人', '天德贵人', '月德贵人', '文昌贵人', '学堂', '词馆',
    '将星', '华盖', '驿马', '天医', '天赦', '三奇贵人',
    '太极贵人', '福星贵人', '禄神', '金舆', '金神', '国印贵人',
    '天厨贵人', '红鸾', '天喜', '八座'
  ],
  '凶': [
    '羊刃', '劫煞', '灾煞', '孤辰', '寡宿', '元辰',
    '亡神', '咸池', '空亡', '丧门', '吊客', '勾绞',
    '披麻', '天罗', '地网', '十恶大败', '血刃', '白虎'
  ],
  '中性': [
    '魁罡', '金神', '阴阳差错', '四废', '六厄', '天罗地网',
    '伏吟', '返吟', '截路', '四正', '四生'
  ]
};

// ============================================================================
// 八、导出
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // 常量
    GAN, ZHI, JIAZI,
    GAN_WUXING, ZHI_WUXING, GAN_YINYANG,
    SANHE_JU, SANHE_GROUP, LIUCHONG, LIUHE,

    // 神煞定义
    SHENSHA_DEFINITIONS,
    SHENSHA_CATEGORY_LIST,

    // 核心函数
    calculateAllShenSha,
    getShenShaByPillar,
    getShenShaByCategory,
    hasShenSha,

    // 辅助函数
    ganIndex, zhiIndex, jiaziIndex, fixIndex,
    getSeason
  };
}

// ============================================================================
// 九、测试用例
// ============================================================================

if (typeof require !== 'undefined' && require.main === module) {
  console.log('='.repeat(60));
  console.log('  神煞模块净室重写版 - 51种神煞测试');
  console.log('='.repeat(60));
  console.log('');

  // 测试八字: 甲子年 丙寅月 戊午日 壬子时 男
  var testBazi = {
    yearGan: '甲', yearZhi: '子',
    monthGan: '丙', monthZhi: '寅',
    dayGan: '戊', dayZhi: '午',
    hourGan: '壬', hourZhi: '子',
    gender: 'male'
  };

  console.log('【测试八字】');
  console.log('  年柱: ' + testBazi.yearGan + testBazi.yearZhi);
  console.log('  月柱: ' + testBazi.monthGan + testBazi.monthZhi);
  console.log('  日柱: ' + testBazi.dayGan + testBazi.dayZhi);
  console.log('  时柱: ' + testBazi.hourGan + testBazi.hourZhi);
  console.log('  性别: 男');
  console.log('');

  var result = calculateAllShenSha(testBazi);

  console.log('【汇总】');
  console.log('  吉神: ' + result.summary['吉'] + ' 种');
  console.log('  凶煞: ' + result.summary['凶'] + ' 种');
  console.log('  中性: ' + result.summary['中性'] + ' 种');
  console.log('  总计: ' + result.summary.total + ' 种');
  console.log('');

  console.log('【吉神列表】');
  result.categories['吉'].forEach(function(s) {
    console.log('  ' + s.name + ' → ' + s.pillars.join(', ') + ' | ' + s.description);
  });
  console.log('');
  console.log('【凶煞列表】');
  result.categories['凶'].forEach(function(s) {
    console.log('  ' + s.name + ' → ' + s.pillars.join(', ') + ' | ' + s.description);
  });
  console.log('');
  console.log('【中性列表】');
  result.categories['中性'].forEach(function(s) {
    console.log('  ' + s.name + ' → ' + s.pillars.join(', ') + ' | ' + s.description);
  });
  console.log('');

  console.log('【按柱位分组】');
  for (var pillar in result.byPillar) {
    if (result.byPillar.hasOwnProperty(pillar)) {
      console.log('  ' + pillar + ': ' + result.byPillar[pillar].map(function(s) { return s.name; }).join(', '));
    }
  }
  console.log('');

  // 测试2: 女命
  console.log('='.repeat(60));
  console.log('  测试女命（甲子年 丙寅月 戊午日 壬子时 女）');
  console.log('='.repeat(60));
  console.log('');

  var testBazi2 = {
    yearGan: '甲', yearZhi: '子',
    monthGan: '丙', monthZhi: '寅',
    dayGan: '戊', dayZhi: '午',
    hourGan: '壬', hourZhi: '子',
    gender: 'female'
  };

  var result2 = calculateAllShenSha(testBazi2);
  console.log('  元辰: ' + (result2.all.filter(function(s) { return s.name === '元辰'; }).map(function(s) { return s.pillars.join(','); }).join('或') || '无'));
  console.log('  天罗地网: ' + (result2.all.filter(function(s) { return s.name === '天罗地网'; }).map(function(s) { return s.pillars.join(','); }).join('或') || '无'));
  console.log('');

  // 测试3: 十恶大败日柱
  console.log('='.repeat(60));
  console.log('  测试十恶大败日柱（庚辰日柱）');
  console.log('='.repeat(60));
  console.log('');

  var testBazi3 = {
    yearGan: '甲', yearZhi: '子',
    monthGan: '丙', monthZhi: '寅',
    dayGan: '庚', dayZhi: '辰',
    hourGan: '壬', hourZhi: '子',
    gender: 'male'
  };

  var result3 = calculateAllShenSha(testBazi3);
  console.log('  十恶大败: ' + (result3.all.filter(function(s) { return s.name === '十恶大败'; }).map(function(s) { return s.pillars.join(','); }).join('或') || '无'));
  console.log('  魁罡: ' + (result3.all.filter(function(s) { return s.name === '魁罡'; }).map(function(s) { return s.pillars.join(','); }).join('或') || '无'));
  console.log('');

  console.log('='.repeat(60));
  console.log('  测试完成');
  console.log('='.repeat(60));
}