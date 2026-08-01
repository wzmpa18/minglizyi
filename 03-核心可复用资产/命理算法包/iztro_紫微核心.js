/**
 * ============================================================================
 * iztro 紫微核心算法包
 * ============================================================================
 * 来源: iztro (https://github.com/SylarLong/iztro)
 * 原始协议: MIT License
 * Copyright (c) 2023-present SylarLong
 *
 * 提取说明: 从 iztro 项目中提取紫微斗数核心计算逻辑，去除所有 UI 依赖、
 * i18n 翻译层、DOM 操作和样式代码。所有函数均为纯计算函数。
 *
 * 复用评级: 直接复用（核心算法逻辑独立，无外部依赖的数据结构）
 * ============================================================================
 */

// ============================================================================
// 一、基础常量 (来源于 iztro/src/data/)
// ============================================================================

/** 十天干 */
const HEAVENLY_STEMS = [
  'jiaHeavenly', 'yiHeavenly', 'bingHeavenly', 'dingHeavenly',
  'wuHeavenly', 'jiHeavenly', 'gengHeavenly', 'xinHeavenly',
  'renHeavenly', 'guiHeavenly'
];

/** 十二地支 */
const EARTHLY_BRANCHES = [
  'ziEarthly', 'chouEarthly', 'yinEarthly', 'maoEarthly',
  'chenEarthly', 'siEarthly', 'wuEarthly', 'weiEarthly',
  'shenEarthly', 'youEarthly', 'xuEarthly', 'haiEarthly'
];

/** 十二宫名 */
const PALACES = [
  'soul', 'parents', 'spirit', 'property',
  'career', 'friends', 'health', 'children',
  'wealth', 'spouse', 'siblings', 'life'
];

/** 天干中文名映射 */
const HEAVENLY_STEM_NAMES = {
  jiaHeavenly: '甲', yiHeavenly: '乙', bingHeavenly: '丙', dingHeavenly: '丁',
  wuHeavenly: '戊', jiHeavenly: '己', gengHeavenly: '庚', xinHeavenly: '辛',
  renHeavenly: '壬', guiHeavenly: '癸'
};

/** 地支中文名映射 */
const EARTHLY_BRANCH_NAMES = {
  ziEarthly: '子', chouEarthly: '丑', yinEarthly: '寅', maoEarthly: '卯',
  chenEarthly: '辰', siEarthly: '巳', wuEarthly: '午', weiEarthly: '未',
  shenEarthly: '申', youEarthly: '酉', xuEarthly: '戌', haiEarthly: '亥'
};

/** 宫名中文 */
const PALACE_NAMES = {
  soul: '命宫', parents: '父母', spirit: '福德', property: '田宅',
  career: '官禄', friends: '交友', health: '疾厄', children: '子女',
  wealth: '财帛', spouse: '夫妻', siblings: '兄弟', life: '迁移'
};

/** 五虎遁（年上起月） */
const TIGER_RULE = {
  jiaHeavenly: 'bingHeavenly',
  yiHeavenly: 'wuHeavenly',
  bingHeavenly: 'gengHeavenly',
  dingHeavenly: 'renHeavenly',
  wuHeavenly: 'jiaHeavenly',
  jiHeavenly: 'bingHeavenly',
  gengHeavenly: 'wuHeavenly',
  xinHeavenly: 'gengHeavenly',
  renHeavenly: 'renHeavenly',
  guiHeavenly: 'jiaHeavenly'
};

/** 五行局映射 */
const FIVE_ELEMENTS_CLASS = {
  water2nd: 2,  // 水二局
  wood3rd: 3,   // 木三局
  metal4th: 4,  // 金四局
  earth5th: 5,  // 土五局
  fire6th: 6    // 火六局
};

/** 地支阴阳属性 */
const EARTHLY_BRANCH_YIN_YANG = {
  ziEarthly: '阳', chouEarthly: '阴', yinEarthly: '阳', maoEarthly: '阴',
  chenEarthly: '阳', siEarthly: '阴', wuEarthly: '阳', weiEarthly: '阴',
  shenEarthly: '阳', youEarthly: '阴', xuEarthly: '阳', haiEarthly: '阴'
};

/** 性别阴阳组合 */
const GENDER = {
  male: '阳',
  female: '阴'
};

/** 四化名称 */
const MUTAGEN = ['lucun', 'quan', 'ke', 'ji'];

/** 时辰对照表 (0=早子时, 12=晚子时) */
const CHINESE_TIME = [
  '早子时', '丑时', '寅时', '卯时', '辰时', '巳时',
  '午时', '未时', '申时', '酉时', '戌时', '亥时', '晚子时'
];

// ============================================================================
// 二、天干四化数据 (来源于 iztro/src/data/heavenlyStems.ts)
// ============================================================================

/**
 * 十天干四化映射
 * 顺序: [化禄, 化权, 化科, 化忌]
 */
const HEAVENLY_STEM_MUTAGEN = {
  jiaHeavenly: ['lianzhenMaj', 'pojunMaj', 'wuquMaj', 'taiyangMaj'],
  yiHeavenly: ['tianjiMaj', 'tianliangMaj', 'ziweiMaj', 'taiyinMaj'],
  bingHeavenly: ['tiantongMaj', 'tianjiMaj', 'wenchangMin', 'lianzhenMaj'],
  dingHeavenly: ['taiyinMaj', 'tiantongMaj', 'tianjiMaj', 'jumenMaj'],
  wuHeavenly: ['tanlangMaj', 'taiyinMaj', 'youbiMin', 'tianjiMaj'],
  jiHeavenly: ['wuquMaj', 'tanlangMaj', 'tianliangMaj', 'wenquMin'],
  gengHeavenly: ['taiyangMaj', 'wuquMaj', 'taiyinMaj', 'tiantongMaj'],
  xinHeavenly: ['jumenMaj', 'taiyangMaj', 'wenquMin', 'wenchangMin'],
  renHeavenly: ['tianliangMaj', 'ziweiMaj', 'zuofuMin', 'wuquMaj'],
  guiHeavenly: ['pojunMaj', 'jumenMaj', 'taiyinMaj', 'tanlangMaj']
};

// ============================================================================
// 三、星耀亮度数据 (庙旺利陷) (来源于 iztro/src/data/stars.ts)
// ============================================================================

/**
 * 14主星在各宫位的亮度
 * 索引对应宫位: 寅(0) 卯(1) 辰(2) 巳(3) 午(4) 未(5) 申(6) 酉(7) 戌(8) 亥(9) 子(10) 丑(11)
 */
const STAR_BRIGHTNESS = {
  ziweiMaj:    ['庙', '旺', '得', '旺', '庙', '得', '旺', '旺', '得', '庙', '庙', '庙'],
  tianjiMaj:   ['得', '庙', '利', '旺', '陷', '陷', '得', '旺', '利', '陷', '庙', '陷'],
  taiyangMaj:  ['旺', '庙', '旺', '旺', '庙', '得', '得', '平', '陷', '陷', '陷', '陷'],
  wuquMaj:     ['得', '庙', '庙', '旺', '旺', '得', '得', '庙', '庙', '得', '得', '庙'],
  tiantongMaj: ['利', '旺', '平', '庙', '陷', '得', '利', '平', '平', '庙', '旺', '陷'],
  lianzhenMaj: ['庙', '得', '庙', '陷', '旺', '得', '得', '陷', '庙', '陷', '得', '陷'],
  tianfuMaj:   ['庙', '得', '庙', '旺', '庙', '庙', '得', '旺', '庙', '得', '庙', '庙'],
  taiyinMaj:   ['陷', '陷', '陷', '陷', '陷', '得', '旺', '庙', '旺', '庙', '庙', '旺'],
  tanlangMaj:  ['旺', '庙', '得', '陷', '旺', '得', '得', '旺', '庙', '得', '旺', '得'],
  jumenMaj:    ['庙', '庙', '旺', '旺', '旺', '得', '得', '旺', '得', '庙', '旺', '旺'],
  tianxiangMaj:['庙', '旺', '得', '得', '庙', '得', '得', '旺', '得', '得', '庙', '庙'],
  tianliangMaj:['得', '旺', '庙', '得', '旺', '庙', '得', '旺', '庙', '陷', '得', '庙'],
  qishaMaj:    ['庙', '旺', '得', '得', '旺', '得', '庙', '旺', '庙', '得', '旺', '得'],
  pojunMaj:    ['得', '旺', '旺', '陷', '得', '旺', '得', '庙', '旺', '得', '得', '旺']
};

// ============================================================================
// 四、核心工具函数 (来源于 iztro/src/utils/index.ts)
// ============================================================================

/**
 * 循环索引修正，将索引锁定在 0~max-1 范围内
 * @param {number} index - 当前索引
 * @param {number} max - 最大循环数，默认12
 * @returns {number} 处理后的索引
 */
function fixIndex(index, max) {
  max = max || 12;
  if (index < 0) return fixIndex(index + max, max);
  if (index > max - 1) return fixIndex(index - max, max);
  return (1 / index === -Infinity) ? 0 : index;
}

/**
 * 获取天干在地支中的索引
 * @param {string} heavenlyStemKey - 天干key
 * @returns {number}
 */
function getHeavenlyStemIndex(heavenlyStemKey) {
  return HEAVENLY_STEMS.indexOf(heavenlyStemKey);
}

/**
 * 获取地支的索引
 * @param {string} earthlyBranchKey - 地支key
 * @returns {number}
 */
function getEarthlyBranchIndex(earthlyBranchKey) {
  return EARTHLY_BRANCHES.indexOf(earthlyBranchKey);
}

// ============================================================================
// 五、五行局计算 (来源于 iztro/src/astro/palace.ts)
// ============================================================================

/**
 * 定五行局法（以命宫天干地支而定）
 *
 * 纳音五行计算取数巧记口诀：
 * - 甲乙丙丁一到五，子丑午未一来数，
 * - 寅卯申酉二上走，辰巳戌亥三为足。
 * - 干支相加多减五，五行木金水火土。
 *
 * 五行取数：木1 金2 水3 火4 土5
 *
 * 天干取数：
 * - 甲乙 -> 1, 丙丁 -> 2, 戊己 -> 3, 庚辛 -> 4, 壬癸 -> 5
 *
 * 地支取数：
 * - 子午丑未 -> 1, 寅申卯酉 -> 2, 辰戌巳亥 -> 3
 *
 * @param {string} heavenlyStemKey - 天干key
 * @param {string} earthlyBranchKey - 地支key
 * @returns {Object} { name: '水二局', value: 2 }
 */
function getFiveElementsClass(heavenlyStemKey, earthlyBranchKey) {
  const fiveElementsTable = ['wood3rd', 'metal4th', 'water2nd', 'fire6th', 'earth5th'];
  const fiveElementsNames = {
    wood3rd: '木三局', metal4th: '金四局', water2nd: '水二局',
    fire6th: '火六局', earth5th: '土五局'
  };

  const hsIndex = getHeavenlyStemIndex(heavenlyStemKey);
  const ebIndex = getEarthlyBranchIndex(earthlyBranchKey);

  const heavenlyStemNumber = Math.floor(hsIndex / 2) + 1;
  const earthlyBranchNumber = Math.floor(fixIndex(ebIndex, 6) / 2) + 1;
  let index = heavenlyStemNumber + earthlyBranchNumber;

  while (index > 5) { index -= 5; }

  const key = fiveElementsTable[index - 1];
  return {
    key: key,
    name: fiveElementsNames[key],
    value: FIVE_ELEMENTS_CLASS[key]
  };
}

// ============================================================================
// 六、命宫身宫计算 (来源于 iztro/src/astro/palace.ts)
// ============================================================================

/**
 * 获取命宫以及身宫数据
 *
 * 1. 定寅首（五虎遁）
 * - 甲己年生起丙寅，乙庚年生起戊寅，
 * - 丙辛年生起庚寅，丁壬年生起壬寅，
 * - 戊癸年生起甲寅。
 *
 * 2. 安命身宫诀
 * - 寅起正月，顺数至生月，逆数生时为命宫。
 * - 寅起正月，顺数至生月，顺数生时为身宫。
 *
 * @param {Object} param
 * @param {number} param.lunarMonth - 农历月份(1-12)
 * @param {number} param.timeIndex - 时辰索引(0-12)，0=早子时, 12=晚子时
 * @param {string} param.heavenlyStemOfYear - 年干key
 * @param {string} [param.heavenlyStemOfSoulOverride] - 命宫天干覆盖(重排盘时用)
 * @param {string} [param.earthlyBranchOfSoulOverride] - 命宫地支覆盖(重排盘时用)
 * @returns {Object} { soulIndex, bodyIndex, heavenlyStemOfSoul, earthlyBranchOfSoul }
 */
function getSoulAndBody(param) {
  const { lunarMonth, timeIndex, heavenlyStemOfYear } = param;

  // 寅宫为第一个宫位
  const yinIndex = EARTHLY_BRANCHES.indexOf('yinEarthly');
  const timeBranchIndex = getEarthlyBranchIndex(
    EARTHLY_BRANCHES[timeIndex >= 12 ? 0 : timeIndex] // 晚子时按子时算
  );

  // 月份索引（以寅为0）
  // 正月(1) -> 寅(0), 二月(2) -> 卯(1), ...
  const monthIndex = fixIndex(lunarMonth - 1 - yinIndex);

  // 命宫索引：以寅宫为0，顺时针数到生月，再逆时针数到生时
  let soulIndex = fixIndex(monthIndex - timeBranchIndex);

  // 身宫索引：以寅宫为0，顺时针数到生月，再顺时针数到生时
  let bodyIndex = fixIndex(monthIndex + timeBranchIndex);

  // 重排盘支持
  if (param.earthlyBranchOfSoulOverride) {
    soulIndex = fixIndex(getEarthlyBranchIndex(param.earthlyBranchOfSoulOverride) - yinIndex);
    const bodyOffset = [0, 2, 4, 6, 8, 10, 0, 2, 4, 6, 8, 10, 0];
    bodyIndex = fixIndex(bodyOffset[timeIndex] + soulIndex);
  }

  // 用五虎遁取得寅宫的天干
  const startHeavenlyStem = TIGER_RULE[heavenlyStemOfYear];

  // 命宫天干索引
  const heavenlyStemOfSoulIndex = fixIndex(
    getHeavenlyStemIndex(startHeavenlyStem) + soulIndex, 10
  );

  const heavenlyStemOfSoul = param.heavenlyStemOfSoulOverride ||
    HEAVENLY_STEMS[heavenlyStemOfSoulIndex];

  // 命宫地支
  const earthlyBranchOfSoul = param.earthlyBranchOfSoulOverride ||
    EARTHLY_BRANCHES[fixIndex(soulIndex + yinIndex)];

  return {
    soulIndex: soulIndex,
    bodyIndex: bodyIndex,
    heavenlyStemOfSoul: heavenlyStemOfSoul,
    earthlyBranchOfSoul: earthlyBranchOfSoul
  };
}

// ============================================================================
// 七、安星算法 - 起紫微星诀 (来源于 iztro/src/star/location.ts)
// ============================================================================

/**
 * 起紫微星诀算法
 *
 * 口诀：
 * - 六五四三二，酉午亥辰丑，
 * - 局数除日数，商数宫前走；
 * - 若见数无余，便要起虎口，
 * - 日数小於局，还直宫中守。
 *
 * @param {Object} param
 * @param {number} param.lunarDay - 农历日(1-30)
 * @param {number} param.fiveElementsValue - 五行局数值(2,3,4,5,6)
 * @returns {Object} { ziweiIndex, tianfuIndex }
 */
function getZiweiStartIndex(param) {
  const { lunarDay, fiveElementsValue } = param;

  let remainder = -1;
  let quotient;
  let offset = -1;

  // 循环直到整除
  do {
    offset++;
    const divisor = lunarDay + offset;
    quotient = Math.floor(divisor / fiveElementsValue);
    remainder = divisor % fiveElementsValue;
  } while (remainder !== 0);

  quotient %= 12;
  let ziweiIndex = quotient - 1;

  if (offset % 2 === 0) {
    ziweiIndex += offset;
  } else {
    ziweiIndex -= offset;
  }

  ziweiIndex = fixIndex(ziweiIndex);
  const tianfuIndex = fixIndex(12 - ziweiIndex);

  return { ziweiIndex, tianfuIndex };
}

// ============================================================================
// 八、安星算法 - 14主星落宫 (来源于 iztro/src/star/majorStar.ts)
// ============================================================================

/**
 * 安主星，寅宫下标为0
 *
 * 安紫微诸星诀（紫微星系，从紫微宫逆时针排）：
 * - 紫微逆去天机星，隔一太阳武曲辰，
 * - 连接天同空二宫，廉贞居处方是真。
 *
 * 安天府诸星诀（天府星系，从天府宫顺时针排）：
 * - 天府顺行有太阴，贪狼而后巨门临，
 * - 随来天相天梁继，七杀空三是破军。
 *
 * @param {Object} param
 * @param {number} param.ziweiIndex - 紫微星宫位索引(0-11)
 * @param {number} param.tianfuIndex - 天府星宫位索引(0-11)
 * @param {string} param.heavenlyStemOfYear - 年干key (用于四化)
 * @returns {Array<Array<Object>>} 12个宫位的星耀数组，索引0=寅宫
 */
function getMajorStars(param) {
  const { ziweiIndex, tianfuIndex, heavenlyStemOfYear } = param;

  // 初始化12个空宫位
  const stars = Array.from({ length: 12 }, () => []);

  // 紫微星系：从紫微宫逆时针排列
  const ziweiGroup = [
    'ziweiMaj',      // 紫微
    'tianjiMaj',     // 天机 (逆1)
    null,             // 空1格
    'taiyangMaj',    // 太阳 (逆3)
    'wuquMaj',       // 武曲 (逆4)
    'tiantongMaj',   // 天同 (逆5)
    null,             // 空2格
    null,             // 空3格
    'lianzhenMaj'    // 廉贞 (逆8)
  ];

  // 天府星系：从天府宫顺时针排列
  const tianfuGroup = [
    'tianfuMaj',     // 天府
    'taiyinMaj',     // 太阴 (顺1)
    'tanlangMaj',    // 贪狼 (顺2)
    'jumenMaj',      // 巨门 (顺3)
    'tianxiangMaj',  // 天相 (顺4)
    'tianliangMaj',  // 天梁 (顺5)
    'qishaMaj',      // 七杀 (顺6)
    null,             // 空
    null,             // 空
    null,             // 空
    'pojunMaj'       // 破军 (顺10)
  ];

  // 安紫微星系
  ziweiGroup.forEach((starKey, i) => {
    if (starKey) {
      const palaceIndex = fixIndex(ziweiIndex - i);
      stars[palaceIndex].push({
        name: starKey,
        type: 'major',
        brightness: getStarBrightness(starKey, palaceIndex),
        mutagen: getStarMutagen(starKey, heavenlyStemOfYear)
      });
    }
  });

  // 安天府星系
  tianfuGroup.forEach((starKey, i) => {
    if (starKey) {
      const palaceIndex = fixIndex(tianfuIndex + i);
      stars[palaceIndex].push({
        name: starKey,
        type: 'major',
        brightness: getStarBrightness(starKey, palaceIndex),
        mutagen: getStarMutagen(starKey, heavenlyStemOfYear)
      });
    }
  });

  return stars;
}

// ============================================================================
// 九、四化飞星计算 (来源于 iztro/src/utils/index.ts)
// ============================================================================

/**
 * 获取星耀的四化属性
 *
 * @param {string} starKey - 星耀key
 * @param {string} heavenlyStemKey - 天干key
 * @returns {string|null} 四化类型: '化禄'|'化权'|'化科'|'化忌' 或 null
 */
function getStarMutagen(starKey, heavenlyStemKey) {
  const targetStars = HEAVENLY_STEM_MUTAGEN[heavenlyStemKey];
  if (!targetStars) return null;

  const idx = targetStars.indexOf(starKey);
  if (idx < 0) return null;

  const mutagenNames = ['化禄', '化权', '化科', '化忌'];
  return mutagenNames[idx];
}

/**
 * 获取指定天干的四化星耀列表
 *
 * @param {string} heavenlyStemKey - 天干key
 * @returns {Array<{starKey: string, mutagen: string}>}
 */
function getMutagensByHeavenlyStem(heavenlyStemKey) {
  const targetStars = HEAVENLY_STEM_MUTAGEN[heavenlyStemKey] || [];
  const mutagenNames = ['化禄', '化权', '化科', '化忌'];

  return targetStars.map((starKey, i) => ({
    starKey: starKey,
    mutagen: mutagenNames[i]
  }));
}

// ============================================================================
// 十、庙旺计算 (来源于 iztro/src/utils/index.ts)
// ============================================================================

/**
 * 获取星耀在指定宫位的亮度
 *
 * @param {string} starKey - 星耀key
 * @param {number} palaceIndex - 宫位索引(0-11, 0=寅宫)
 * @returns {string} 亮度: '庙'|'旺'|'得'|'利'|'平'|'陷'|''
 */
function getStarBrightness(starKey, palaceIndex) {
  const brightnessArray = STAR_BRIGHTNESS[starKey];
  if (!brightnessArray) return '';
  return brightnessArray[fixIndex(palaceIndex)] || '';
}

/**
 * 获取14主星在各宫的完整亮度表
 *
 * @returns {Object} 星耀亮度映射表
 */
function getFullBrightnessTable() {
  return STAR_BRIGHTNESS;
}

// ============================================================================
// 十一、大限流年计算 (来源于 iztro/src/astro/palace.ts)
// ============================================================================

/**
 * 起大限
 *
 * 规则：
 * - 大限由命宫起，阳男阴女顺行；
 * - 阴男阳女逆行，每十年过一宫限。
 *
 * @param {Object} param
 * @param {number} param.soulIndex - 命宫索引(0-11)
 * @param {string} param.gender - 性别 'male'|'female'
 * @param {string} param.heavenlyStemOfYear - 年干key
 * @param {string} param.earthlyBranchOfYear - 年支key
 * @param {number} param.fiveElementsValue - 五行局数值(2,3,4,5,6)
 * @returns {Object} { decadals, ages }
 */
function getHoroscope(param) {
  const {
    soulIndex, gender, heavenlyStemOfYear,
    earthlyBranchOfYear, fiveElementsValue
  } = param;

  const decadals = [];
  const genderKey = gender;
  const yearBranchYinYang = EARTHLY_BRANCH_YIN_YANG[earthlyBranchOfYear];

  // 判断顺逆: 阳男阴女顺行，阴男阳女逆行
  const isForward = GENDER[genderKey] === yearBranchYinYang;

  // 五虎遁获取起始天干
  const startHeavenlyStem = TIGER_RULE[heavenlyStemOfYear];

  for (let i = 0; i < 12; i++) {
    const idx = isForward
      ? fixIndex(soulIndex + i)
      : fixIndex(soulIndex - i);

    const start = fiveElementsValue + 10 * i;
    const heavenlyStemIdx = fixIndex(
      getHeavenlyStemIndex(startHeavenlyStem) + idx, 10
    );
    const earthlyBranchIdx = fixIndex(
      EARTHLY_BRANCHES.indexOf('yinEarthly') + idx
    );

    decadals[idx] = {
      range: [start, start + 9],
      heavenlyStem: HEAVENLY_STEMS[heavenlyStemIdx],
      earthlyBranch: EARTHLY_BRANCHES[earthlyBranchIdx]
    };
  }

  // 小限起法
  const ageIdx = getAgeIndex(earthlyBranchOfYear);
  const ages = [];

  for (let i = 0; i < 12; i++) {
    const age = [];
    for (let j = 0; j < 10; j++) {
      age.push(12 * j + i + 1);
    }
    const idx = genderKey === 'male'
      ? fixIndex(ageIdx + i)
      : fixIndex(ageIdx - i);
    ages[idx] = age;
  }

  return { decadals, ages };
}

/**
 * 起小限
 *
 * 口诀：
 * - 小限一年一度逢，男顺女逆不相同，
 * - 寅午戌人辰上起，申子辰人自戌宫，
 * - 巳酉丑人未宫始，亥卯未人起丑宫。
 *
 * @param {string} earthlyBranchKey - 年支key
 * @returns {number} 小限开始的宫位索引(0-11)
 */
function getAgeIndex(earthlyBranchKey) {
  const yinIdx = EARTHLY_BRANCHES.indexOf('yinEarthly');

  if (['yinEarthly', 'wuEarthly', 'xuEarthly'].includes(earthlyBranchKey)) {
    return fixIndex(EARTHLY_BRANCHES.indexOf('chenEarthly') - yinIdx);
  } else if (['shenEarthly', 'ziEarthly', 'chenEarthly'].includes(earthlyBranchKey)) {
    return fixIndex(EARTHLY_BRANCHES.indexOf('xuEarthly') - yinIdx);
  } else if (['siEarthly', 'youEarthly', 'chouEarthly'].includes(earthlyBranchKey)) {
    return fixIndex(EARTHLY_BRANCHES.indexOf('weiEarthly') - yinIdx);
  } else if (['haiEarthly', 'maoEarthly', 'weiEarthly'].includes(earthlyBranchKey)) {
    return fixIndex(EARTHLY_BRANCHES.indexOf('chouEarthly') - yinIdx);
  }
  return -1;
}

// ============================================================================
// 十二、宫名计算 (来源于 iztro/src/astro/palace.ts)
// ============================================================================

/**
 * 获取从寅宫开始的各个宫名
 *
 * @param {number} soulIndex - 命宫索引(0-11)
 * @returns {Array<string>} 从寅宫开始的12个宫名
 */
function getPalaceNames(soulIndex) {
  const names = [];
  for (let i = 0; i < PALACES.length; i++) {
    const idx = fixIndex(i - soulIndex);
    names[i] = PALACES[idx];
  }
  return names;
}

// ============================================================================
// 十三、高层封装 - 完整紫微星盘计算
// ============================================================================

/**
 * 计算完整紫微斗数星盘（核心数据）
 *
 * 入参:
 * @param {Object} params
 * @param {number} params.lunarMonth - 农历月份(1-12)
 * @param {number} params.lunarDay - 农历日(1-30)
 * @param {number} params.timeIndex - 时辰索引(0-12)
 * @param {string} params.gender - 性别 'male'|'female'
 * @param {string} params.heavenlyStemOfYear - 年干key
 * @param {string} params.earthlyBranchOfYear - 年支key
 *
 * 出参:
 * @returns {Object}
 * {
 *   soulIndex: number,           // 命宫索引(0-11)
 *   bodyIndex: number,            // 身宫索引(0-11)
 *   fiveElementsClass: Object,    // 五行局
 *   palaceNames: Array<string>,   // 12宫名
 *   majorStars: Array<Array>,     // 14主星落宫
 *   mutagens: Array,              // 四化星耀
 *   decadals: Array,              // 大限
 *   ages: Array<Array>,           // 小限年龄
 *   palaces: Array                // 12宫完整数据
 * }
 */
function calculateZiweiChart(params) {
  const {
    lunarMonth, lunarDay, timeIndex, gender,
    heavenlyStemOfYear, earthlyBranchOfYear
  } = params;

  // 1. 计算命宫身宫
  const soulBody = getSoulAndBody({
    lunarMonth: lunarMonth,
    timeIndex: timeIndex,
    heavenlyStemOfYear: heavenlyStemOfYear
  });

  // 2. 计算五行局
  const fiveElements = getFiveElementsClass(
    soulBody.heavenlyStemOfSoul,
    soulBody.earthlyBranchOfSoul
  );

  // 3. 计算紫微星位置
  const ziweiStart = getZiweiStartIndex({
    lunarDay: lunarDay,
    fiveElementsValue: fiveElements.value
  });

  // 4. 安14主星
  const majorStars = getMajorStars({
    ziweiIndex: ziweiStart.ziweiIndex,
    tianfuIndex: ziweiStart.tianfuIndex,
    heavenlyStemOfYear: heavenlyStemOfYear
  });

  // 5. 获取四化
  const mutagens = getMutagensByHeavenlyStem(heavenlyStemOfYear);

  // 6. 计算大限
  const horoscope = getHoroscope({
    soulIndex: soulBody.soulIndex,
    gender: gender,
    heavenlyStemOfYear: heavenlyStemOfYear,
    earthlyBranchOfYear: earthlyBranchOfYear,
    fiveElementsValue: fiveElements.value
  });

  // 7. 获取宫名
  const palaceNames = getPalaceNames(soulBody.soulIndex);

  // 8. 组装完整宫位数据
  const palaces = [];
  for (let i = 0; i < 12; i++) {
    const earthlyBranchKey = EARTHLY_BRANCHES[fixIndex(2 + i)]; // 寅宫索引2
    const heavenlyStemIdx = fixIndex(
      getHeavenlyStemIndex(soulBody.heavenlyStemOfSoul) - soulBody.soulIndex + i, 10
    );
    const heavenlyStemKey = HEAVENLY_STEMS[heavenlyStemIdx];

    palaces.push({
      index: i,
      name: palaceNames[i],
      earthlyBranch: earthlyBranchKey,
      heavenlyStem: heavenlyStemKey,
      isBodyPalace: soulBody.bodyIndex === i,
      majorStars: majorStars[i],
      decadal: horoscope.decadals[i],
      ages: horoscope.ages[i]
    });
  }

  return {
    soulIndex: soulBody.soulIndex,
    bodyIndex: soulBody.bodyIndex,
    heavenlyStemOfSoul: soulBody.heavenlyStemOfSoul,
    earthlyBranchOfSoul: soulBody.earthlyBranchOfSoul,
    fiveElementsClass: fiveElements,
    fiveElementsValue: fiveElements.value,
    ziweiIndex: ziweiStart.ziweiIndex,
    tianfuIndex: ziweiStart.tianfuIndex,
    palaceNames: palaceNames,
    majorStars: majorStars,
    mutagens: mutagens,
    decadals: horoscope.decadals,
    ages: horoscope.ages,
    palaces: palaces
  };
}

// ============================================================================
// 调用示例
// ============================================================================

/**
 * 示例1: 计算完整紫微星盘
 *
 * const chart = calculateZiweiChart({
 *   lunarMonth: 5,              // 农历五月
 *   lunarDay: 18,               // 农历十八
 *   timeIndex: 5,               // 辰时 (5: 7-9点)
 *   gender: 'male',             // 男性
 *   heavenlyStemOfYear: 'jiaHeavenly',  // 甲年
 *   earthlyBranchOfYear: 'ziEarthly'    // 子年
 * });
 *
 * console.log('命宫:', chart.palaceNames[chart.soulIndex]);
 * console.log('五行局:', chart.fiveElementsClass.name);
 * console.log('紫微落宫:', chart.ziweiIndex);
 * console.log('四化:', chart.mutagens);
 */

/**
 * 示例2: 单独计算大限
 *
 * const horoscope = getHoroscope({
 *   soulIndex: 5,
 *   gender: 'male',
 *   heavenlyStemOfYear: 'jiaHeavenly',
 *   earthlyBranchOfYear: 'ziEarthly',
 *   fiveElementsValue: 2  // 水二局
 * });
 *
 * console.log('大限:', horoscope.decadals);
 */

/**
 * 示例3: 单独计算四化
 *
 * const mutagens = getMutagensByHeavenlyStem('jiaHeavenly');
 * // 结果: [{starKey:'lianzhenMaj', mutagen:'化禄'}, ...]
 */

// ============================================================================
// 导出
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // 常量
    HEAVENLY_STEMS,
    EARTHLY_BRANCHES,
    PALACES,
    HEAVENLY_STEM_NAMES,
    EARTHLY_BRANCH_NAMES,
    PALACE_NAMES,
    FIVE_ELEMENTS_CLASS,
    TIGER_RULE,
    HEAVENLY_STEM_MUTAGEN,
    STAR_BRIGHTNESS,

    // 核心函数
    fixIndex,
    getFiveElementsClass,
    getSoulAndBody,
    getZiweiStartIndex,
    getMajorStars,
    getStarMutagen,
    getMutagensByHeavenlyStem,
    getStarBrightness,
    getHoroscope,
    getAgeIndex,
    getPalaceNames,
    calculateZiweiChart
  };
}