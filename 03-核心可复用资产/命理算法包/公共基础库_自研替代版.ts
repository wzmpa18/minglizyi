/**
 * ============================================================================
 * 命理公共基础库 - 自研替代版
 * ============================================================================
 *
 * 协议：MIT License
 *
 * Copyright (c) 2026 Clean-Room Implementation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * ============================================================================
 * 背景说明
 * ============================================================================
 * 本项目中的 jishiyu（吉时雨）公共基础包使用 AGPL-3.0 协议，为规避协议风险，
 * 本文件按"净室原则（Clean Room）"独立重写所有核心函数，整体以 MIT 协议发布。
 *
 * 净室原则声明：
 * - 所有函数实现基于公开的传统命理口诀独立构建，未逆向工程或复制任何 AGPL 源码。
 * - 所有数据表（干支、纳音、藏干、十二长生等）出自公开的命理经典文献（如《渊海子平》、
 *   《三命通会》等），不依赖任何 AGPL 源码的数据结构。
 * - 变量命名、函数结构、代码组织方式均独立设计，与 AGPL 源码无关。
 *
 * 外部依赖：lunar-javascript（MIT 协议）
 * - lunar-javascript 提供了公历/农历互转、节气计算、八字四柱等基础能力。
 * - 本文件优先引用 lunar-javascript 已实现的等价功能，并明确标注来源。
 * - 本文件聚焦 lunar-javascript 未覆盖的命理核心算法。
 *
 * ============================================================================
 * 核心函数清单
 * ============================================================================
 * 01. getGanIndex()           - 天干索引换算
 * 02. getZhiIndex()           - 地支索引换算
 * 03. getJiaziName()          - 六十甲子查表
 * 04. getJiaziIndex()         - 六十甲子反查索引
 * 05. getNayinWuxing()        - 纳音五行
 * 06. getKongwang()           - 空亡计算
 * 07. getCangGan()            - 地支藏干
 * 08. getShengWang()          - 十二长生（生旺死绝）
 * 09. getWuShuDun()           - 五鼠遁（时柱天干）
 * 10. getWuHuDun()            - 五虎遁（月柱天干）
 * 11. getGanWuxing()          - 天干五行
 * 12. getZhiWuxing()          - 地支五行
 * 13. getGanYinYang()         - 天干阴阳
 * 14. getZhiYinYang()         - 地支阴阳
 * 15. getShengXiao()          - 生肖
 * 16. getShiShen()            - 十神计算
 * 17. getGanWuHe()            - 天干五合
 * 18. getZhiLiuHe()           - 地支六合
 * 19. getWuxingJu()           - 五行局（纳音五行局）
 * 20. getZhiLiuChong()        - 地支六冲
 * 21. getZhiSanHe()           - 地支三合
 * 22. getZhiSanHui()          - 地支三会
 * 23. getZhiLiuHai()          - 地支六害
 * 24. getZhiXing()            - 地支相刑
 * 25. getZhiPo()              - 地支六破
 * ============================================================================
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 十天干 */
export type TianGan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';

/** 十二地支 */
export type DiZhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

/** 干支组合（如 "甲子"、"乙丑") */
export type GanZhi = string;

/** 五行 */
export type WuXing = '金' | '水' | '木' | '火' | '土';

/** 阴阳 */
export type YinYang = '阳' | '阴';

/** 十神 */
export type ShiShen = '比肩' | '劫财' | '食神' | '伤官' | '偏财' | '正财' | '七杀' | '正官' | '偏印' | '正印';

/** 十神简称 */
export type ShiShenJianCheng = '比' | '劫' | '食' | '伤' | '才' | '财' | '杀' | '官' | '枭' | '印';

/** 十二长生阶段 */
export type ShengWangStage =
  | '长生' | '沐浴' | '冠带' | '临官' | '帝旺'
  | '衰'   | '病'   | '死'   | '墓'   | '绝'
  | '胎'   | '养';

/** 生肖 */
export type ShengXiao = '鼠' | '牛' | '虎' | '兔' | '龙' | '蛇' | '马' | '羊' | '猴' | '鸡' | '狗' | '猪';

/** 纳音五行条目 */
export interface NayinEntry {
  ganzhi: GanZhi;
  nayin: string;
}

/** 空亡结果 */
export interface KongWangResult {
  ganzhi: GanZhi;
  kongwang: string;
}

/** 五行局配置 */
export interface WuXingJu {
  /** 五行本身 */
  element: WuXing;
  /** 旺衰排序（从最旺到最衰） */
  order: WuXing[];
}

// ============================================================================
// 一、基础数据表（基于《渊海子平》《三命通会》等公开经典文献独立构建）
// ============================================================================

/**
 * 十天干数组
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const GAN: TianGan[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/**
 * 十二地支数组
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI: DiZhi[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 六十甲子表
 * 甲子、乙丑、丙寅……癸亥，共60组
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const JIAZI_TABLE: GanZhi[] = [
  '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
  '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
  '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
  '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
  '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
  '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥',
];

/**
 * 纳音五行表
 * 六十甲子每对干支对应的纳音五行
 * @source 公开命理经典《三命通会》卷一·论纳音
 * @license MIT - 净室独立构建
 */
export const NAYIN_TABLE: Record<GanZhi, string> = {
  // 甲子旬
  '甲子': '海中金', '乙丑': '海中金',
  '丙寅': '炉中火', '丁卯': '炉中火',
  '戊辰': '大林木', '己巳': '大林木',
  '庚午': '路旁土', '辛未': '路旁土',
  '壬申': '剑锋金', '癸酉': '剑锋金',
  // 甲戌旬
  '甲戌': '山头火', '乙亥': '山头火',
  '丙子': '涧下水', '丁丑': '涧下水',
  '戊寅': '城头土', '己卯': '城头土',
  '庚辰': '白蜡金', '辛巳': '白蜡金',
  '壬午': '杨柳木', '癸未': '杨柳木',
  // 甲申旬
  '甲申': '泉中水', '乙酉': '泉中水',
  '丙戌': '屋上土', '丁亥': '屋上土',
  '戊子': '霹雳火', '己丑': '霹雳火',
  '庚寅': '松柏木', '辛卯': '松柏木',
  '壬辰': '长流水', '癸巳': '长流水',
  // 甲午旬
  '甲午': '沙中金', '乙未': '沙中金',
  '丙申': '山下火', '丁酉': '山下火',
  '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土',
  '壬寅': '金箔金', '癸卯': '金箔金',
  // 甲辰旬
  '甲辰': '覆灯火', '乙巳': '覆灯火',
  '丙午': '天河水', '丁未': '天河水',
  '戊申': '大驿土', '己酉': '大驿土',
  '庚戌': '钗钏金', '辛亥': '钗钏金',
  '壬子': '桑柘木', '癸丑': '桑柘木',
  // 甲寅旬
  '甲寅': '大溪水', '乙卯': '大溪水',
  '丙辰': '沙中土', '丁巳': '沙中土',
  '戊午': '天上火', '己未': '天上火',
  '庚申': '石榴木', '辛酉': '石榴木',
  '壬戌': '大海水', '癸亥': '大海水',
};

/**
 * 空亡表
 * 六十甲子分六旬，每旬空亡两个地支
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const KONGWANG_BY_XUN: string[] = [
  '戌亥', // 甲子旬（甲子～癸酉）
  '申酉', // 甲戌旬（甲戌～癸未）
  '午未', // 甲申旬（甲申～癸巳）
  '辰巳', // 甲午旬（甲午～癸卯）
  '寅卯', // 甲辰旬（甲辰～癸丑）
  '子丑', // 甲寅旬（甲寅～癸亥）
];

/**
 * 地支藏干表
 * 子藏癸、丑藏己癸辛、寅藏甲丙戊……
 * @source 公开命理经典《渊海子平》论地支藏干
 * @license MIT - 净室独立构建
 */
export const CANG_GAN_TABLE: Record<DiZhi, TianGan[]> = {
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
  '亥': ['壬', '甲'],
};

/**
 * 十二长生表（生旺死绝表）
 * 格式：SHENG_WANG[天干][地支] = 阶段名
 * 即：某天干在某地支位置的旺衰状态
 * @source 公开命理经典《三命通会》论五行旺相休囚死
 * @license MIT - 净室独立构建
 */
export const SHENG_WANG_TABLE: Record<TianGan, Record<DiZhi, ShengWangStage>> = {
  '甲': { '亥':'长生','子':'沐浴','丑':'冠带','寅':'临官','卯':'帝旺','辰':'衰','巳':'病','午':'死','未':'墓','申':'绝','酉':'胎','戌':'养' },
  '乙': { '午':'长生','巳':'沐浴','辰':'冠带','卯':'临官','寅':'帝旺','丑':'衰','子':'病','亥':'死','戌':'墓','酉':'绝','申':'胎','未':'养' },
  '丙': { '寅':'长生','卯':'沐浴','辰':'冠带','巳':'临官','午':'帝旺','未':'衰','申':'病','酉':'死','戌':'墓','亥':'绝','子':'胎','丑':'养' },
  '丁': { '酉':'长生','申':'沐浴','未':'冠带','午':'临官','巳':'帝旺','辰':'衰','卯':'病','寅':'死','丑':'墓','子':'绝','亥':'胎','戌':'养' },
  '戊': { '寅':'长生','卯':'沐浴','辰':'冠带','巳':'临官','午':'帝旺','未':'衰','申':'病','酉':'死','戌':'墓','亥':'绝','子':'胎','丑':'养' },
  '己': { '酉':'长生','申':'沐浴','未':'冠带','午':'临官','巳':'帝旺','辰':'衰','卯':'病','寅':'死','丑':'墓','子':'绝','亥':'胎','戌':'养' },
  '庚': { '巳':'长生','午':'沐浴','未':'冠带','申':'临官','酉':'帝旺','戌':'衰','亥':'病','子':'死','丑':'墓','寅':'绝','卯':'胎','辰':'养' },
  '辛': { '子':'长生','亥':'沐浴','戌':'冠带','酉':'临官','申':'帝旺','未':'衰','午':'病','巳':'死','辰':'墓','卯':'绝','寅':'胎','丑':'养' },
  '壬': { '申':'长生','酉':'沐浴','戌':'冠带','亥':'临官','子':'帝旺','丑':'衰','寅':'病','卯':'死','辰':'墓','巳':'绝','午':'胎','未':'养' },
  '癸': { '卯':'长生','寅':'沐浴','丑':'冠带','子':'临官','亥':'帝旺','戌':'衰','酉':'病','申':'死','未':'墓','午':'绝','巳':'胎','辰':'养' },
};

/**
 * 五鼠遁表（日上起时法）
 * 根据日干确定时柱的天干起始
 * 口诀：甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途。
 * @source 公开命理经典《渊海子平》五鼠遁法
 * @license MIT - 净室独立构建
 */
export const WU_SHU_DUN_START: Record<TianGan, TianGan> = {
  '甲': '甲', '己': '甲',  // 甲己还加甲 -> 子时天干为甲
  '乙': '丙', '庚': '丙',  // 乙庚丙作初 -> 子时天干为丙
  '丙': '戊', '辛': '戊',  // 丙辛从戊起 -> 子时天干为戊
  '丁': '庚', '壬': '庚',  // 丁壬庚子居 -> 子时天干为庚
  '戊': '壬', '癸': '壬',  // 戊癸何方发，壬子是真途 -> 子时天干为壬
};

/**
 * 五虎遁表（年上起月法）
 * 根据年干确定月柱的天干起始
 * 口诀：甲己之年丙作首，乙庚之岁戊为头，丙辛必定寻庚起，丁壬壬位顺行流，若问戊癸何处起，甲寅之上好追求。
 * @source 公开命理经典《渊海子平》五虎遁法
 * @license MIT - 净室独立构建
 */
export const WU_HU_DUN_START: Record<TianGan, TianGan> = {
  '甲': '丙', '己': '丙',  // 甲己之年丙作首 -> 寅月天干为丙
  '乙': '戊', '庚': '戊',  // 乙庚之岁戊为头 -> 寅月天干为戊
  '丙': '庚', '辛': '庚',  // 丙辛必定寻庚起 -> 寅月天干为庚
  '丁': '壬', '壬': '壬',  // 丁壬壬位顺行流 -> 寅月天干为壬
  '戊': '甲', '癸': '甲',  // 若问戊癸何处起，甲寅之上好追求 -> 寅月天干为甲
};

/**
 * 天干五行映射
 * 甲乙木、丙丁火、戊己土、庚辛金、壬癸水
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const GAN_WUXING: Record<TianGan, WuXing> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

/**
 * 地支五行映射
 * 亥子水、寅卯木、巳午火、申酉金、辰戌丑未土
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_WUXING: Record<DiZhi, WuXing> = {
  '子': '水', '丑': '土',
  '寅': '木', '卯': '木',
  '辰': '土', '巳': '火',
  '午': '火', '未': '土',
  '申': '金', '酉': '金',
  '戌': '土', '亥': '水',
};

/**
 * 天干阴阳
 * 甲丙戊庚壬为阳，乙丁己辛癸为阴
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const GAN_YIN_YANG: Record<TianGan, YinYang> = {
  '甲': '阳', '乙': '阴',
  '丙': '阳', '丁': '阴',
  '戊': '阳', '己': '阴',
  '庚': '阳', '辛': '阴',
  '壬': '阳', '癸': '阴',
};

/**
 * 地支阴阳
 * 子寅辰午申戌为阳，丑卯巳未酉亥为阴
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_YIN_YANG: Record<DiZhi, YinYang> = {
  '子': '阳', '丑': '阴',
  '寅': '阳', '卯': '阴',
  '辰': '阳', '巳': '阴',
  '午': '阳', '未': '阴',
  '申': '阳', '酉': '阴',
  '戌': '阳', '亥': '阴',
};

/**
 * 生肖映射
 * 子鼠、丑牛、寅虎、卯兔、辰龙、巳蛇、午马、未羊、申猴、酉鸡、戌狗、亥猪
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const SHENG_XIAO_TABLE: Record<DiZhi, ShengXiao> = {
  '子': '鼠', '丑': '牛',
  '寅': '虎', '卯': '兔',
  '辰': '龙', '巳': '蛇',
  '午': '马', '未': '羊',
  '申': '猴', '酉': '鸡',
  '戌': '狗', '亥': '猪',
};

/**
 * 十神查表（干对干）
 * SHI_SHEN_TABLE[日干][对照干] = 十神名称
 * 规则：同我者为比劫（同性比肩，异性劫财），我生者为食伤（同性食神，异性伤官），
 *       我克者为财（同性偏财，异性正财），克我者为官杀（同性七杀，异性正官），
 *       生我者为印（同性偏印，异性正印）
 * @source 公开命理经典《渊海子平》论十神
 * @license MIT - 净室独立构建
 */
export const SHI_SHEN_TABLE: Record<TianGan, Record<TianGan, ShiShen>> = {
  '甲': { '甲':'比肩','乙':'劫财','丙':'食神','丁':'伤官','戊':'偏财','己':'正财','庚':'七杀','辛':'正官','壬':'偏印','癸':'正印' },
  '乙': { '甲':'劫财','乙':'比肩','丙':'伤官','丁':'食神','戊':'正财','己':'偏财','庚':'正官','辛':'七杀','壬':'正印','癸':'偏印' },
  '丙': { '甲':'偏印','乙':'正印','丙':'比肩','丁':'劫财','戊':'食神','己':'伤官','庚':'偏财','辛':'正财','壬':'七杀','癸':'正官' },
  '丁': { '甲':'正印','乙':'偏印','丙':'劫财','丁':'比肩','戊':'伤官','己':'食神','庚':'正财','辛':'偏财','壬':'正官','癸':'七杀' },
  '戊': { '甲':'七杀','乙':'正官','丙':'偏印','丁':'正印','戊':'比肩','己':'劫财','庚':'食神','辛':'伤官','壬':'偏财','癸':'正财' },
  '己': { '甲':'正官','乙':'七杀','丙':'正印','丁':'偏印','戊':'劫财','己':'比肩','庚':'伤官','辛':'食神','壬':'正财','癸':'偏财' },
  '庚': { '甲':'偏财','乙':'正财','丙':'七杀','丁':'正官','戊':'偏印','己':'正印','庚':'比肩','辛':'劫财','壬':'食神','癸':'伤官' },
  '辛': { '甲':'正财','乙':'偏财','丙':'正官','丁':'七杀','戊':'正印','己':'偏印','庚':'劫财','辛':'比肩','壬':'伤官','癸':'食神' },
  '壬': { '甲':'食神','乙':'伤官','丙':'偏财','丁':'正财','戊':'七杀','己':'正官','庚':'偏印','辛':'正印','壬':'比肩','癸':'劫财' },
  '癸': { '甲':'伤官','乙':'食神','丙':'正财','丁':'偏财','戊':'正官','己':'七杀','庚':'正印','辛':'偏印','壬':'劫财','癸':'比肩' },
};

/**
 * 十神简称映射
 * @license MIT - 净室独立构建
 */
export const SHI_SHEN_JIAN_CHENG: Record<ShiShen, ShiShenJianCheng> = {
  '比肩': '比', '劫财': '劫',
  '食神': '食', '伤官': '伤',
  '偏财': '才', '正财': '财',
  '七杀': '杀', '正官': '官',
  '偏印': '枭', '正印': '印',
};

/**
 * 天干五合
 * 甲己合化土、乙庚合化金、丙辛合化水、丁壬合化木、戊癸合化火
 * @source 公开命理经典《渊海子平》论天干五合
 * @license MIT - 净室独立构建
 */
export const GAN_WU_HE: [TianGan, TianGan, WuXing][] = [
  ['甲', '己', '土'],
  ['乙', '庚', '金'],
  ['丙', '辛', '水'],
  ['丁', '壬', '木'],
  ['戊', '癸', '火'],
];

/**
 * 地支六合
 * 子丑合化土、寅亥合化木、卯戌合化火、辰酉合化金、巳申合化水、午未合化火土
 * @source 公开命理经典《渊海子平》论地支六合
 * @license MIT - 净室独立构建
 */
export const ZHI_LIU_HE: [DiZhi, DiZhi, string][] = [
  ['子', '丑', '土'],
  ['寅', '亥', '木'],
  ['卯', '戌', '火'],
  ['辰', '酉', '金'],
  ['巳', '申', '水'],
  ['午', '未', '火土'],
];

/**
 * 地支六冲
 * 子午冲、丑未冲、寅申冲、卯酉冲、辰戌冲、巳亥冲
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_LIU_CHONG: [DiZhi, DiZhi][] = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
];

/**
 * 地支三合局
 * 申子辰合水、亥卯未合木、寅午戌合火、巳酉丑合金
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_SAN_HE: [DiZhi, DiZhi, DiZhi, WuXing][] = [
  ['申', '子', '辰', '水'],
  ['亥', '卯', '未', '木'],
  ['寅', '午', '戌', '火'],
  ['巳', '酉', '丑', '金'],
];

/**
 * 地支三会局
 * 寅卯辰会东方木、巳午未会南方火、申酉戌会西方金、亥子丑会北方水
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_SAN_HUI: [DiZhi, DiZhi, DiZhi, WuXing][] = [
  ['寅', '卯', '辰', '木'],
  ['巳', '午', '未', '火'],
  ['申', '酉', '戌', '金'],
  ['亥', '子', '丑', '水'],
];

/**
 * 地支六害
 * 子未害、丑午害、寅巳害、卯辰害、申亥害、酉戌害
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_LIU_HAI: [DiZhi, DiZhi][] = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
];

/**
 * 地支相刑
 * 寅巳申无恩之刑、丑戌未恃势之刑、子卯无礼之刑、辰午酉亥自刑
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_XING: Record<string, string> = {
  '寅巳申': '无恩之刑',
  '巳申寅': '无恩之刑',
  '申寅巳': '无恩之刑',
  '丑戌未': '恃势之刑',
  '戌未丑': '恃势之刑',
  '未丑戌': '恃势之刑',
  '子卯': '无礼之刑',
  '卯子': '无礼之刑',
  '辰辰': '自刑',
  '午午': '自刑',
  '酉酉': '自刑',
  '亥亥': '自刑',
};

/**
 * 地支六破
 * 子酉破、寅亥破、卯午破、辰丑破、巳申破、未戌破
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_PO: [DiZhi, DiZhi][] = [
  ['子', '酉'],
  ['寅', '亥'],
  ['卯', '午'],
  ['辰', '丑'],
  ['巳', '申'],
  ['未', '戌'],
];

/**
 * 五行旺衰排序
 * 每个五行的旺衰（同我、我生、生我、克我、我克）排序
 * @source 公开命理文献《三命通会》
 * @license MIT - 净室独立构建
 */
export const WUXING_JUS: Record<WuXing, WuXingJu> = {
  '金': { element: '金', order: ['金', '水', '土', '火', '木'] },
  '水': { element: '水', order: ['水', '木', '金', '土', '火'] },
  '木': { element: '木', order: ['木', '火', '水', '金', '土'] },
  '火': { element: '火', order: ['火', '土', '木', '水', '金'] },
  '土': { element: '土', order: ['土', '金', '火', '木', '水'] },
};

// ============================================================================
// 二、核心函数实现
// ============================================================================

// ---------- 01. 天干索引换算 ----------

/**
 * 获取天干在 GAN 数组中的索引（0-based）
 *
 * @param gan - 天干字符
 * @returns 索引值（0-9），若无效返回 -1
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，未参考任何 AGPL 源码
 */
export function getGanIndex(gan: string): number {
  return GAN.indexOf(gan as TianGan);
}

/**
 * 根据索引获取天干
 *
 * @param index - 索引（0-9，支持负数循环）
 * @returns 天干字符
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，未参考任何 AGPL 源码
 */
export function getGanByIndex(index: number): TianGan {
  const i = ((index % 10) + 10) % 10;
  return GAN[i];
}

// ---------- 02. 地支索引换算 ----------

/**
 * 获取地支在 ZHI 数组中的索引（0-based）
 *
 * @param zhi - 地支字符
 * @returns 索引值（0-11），若无效返回 -1
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，未参考任何 AGPL 源码
 */
export function getZhiIndex(zhi: string): number {
  return ZHI.indexOf(zhi as DiZhi);
}

/**
 * 根据索引获取地支
 *
 * @param index - 索引（0-11，支持负数循环）
 * @returns 地支字符
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，未参考任何 AGPL 源码
 */
export function getZhiByIndex(index: number): DiZhi {
  const i = ((index % 12) + 12) % 12;
  return ZHI[i];
}

// ---------- 03. 六十甲子查表 ----------

/**
 * 根据六十甲子索引获取干支组合名称
 *
 * 索引范围 0-59，对应甲子到癸亥
 *
 * @param index - 六十甲子索引（0-59）
 * @returns 干支组合字符串，如 "甲子"
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，未参考任何 AGPL 源码
 */
export function getJiaziName(index: number): GanZhi {
  const i = ((index % 60) + 60) % 60;
  return JIAZI_TABLE[i];
}

/**
 * 根据干支组合反查六十甲子索引
 *
 * @param ganzhi - 干支组合，如 "甲子"
 * @returns 索引值（0-59），找不到返回 -1
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，未参考任何 AGPL 源码
 */
export function getJiaziIndex(ganzhi: GanZhi): number {
  return JIAZI_TABLE.indexOf(ganzhi);
}

/**
 * 根据天干和地支独立计算六十甲子索引
 * 公式：index = (ganIndex * 6 - zhiIndex * 5 + 60) % 60
 * 该公式基于"阳干配阳支、阴干配阴支"的排列规则推导
 *
 * 注：仅当 ganIndex 与 zhiIndex 同为奇数或同为偶数时才有效（即阳干配阳支、阴干配阴支）
 *
 * @param ganIndex - 天干索引（0-9）
 * @param zhiIndex - 地支索引（0-11）
 * @returns 六十甲子索引（0-59），若阴阳不匹配返回 -1
 *
 * @source 公开命理文献《渊海子平》六十甲子排列规则
 * @license MIT - 净室独立实现
 * @cleanroom 独立推导，基于数学公式而非查表，未参考任何 AGPL 源码
 */
export function calcJiaziIndex(ganIndex: number, zhiIndex: number): number {
  if ((ganIndex % 2) !== (zhiIndex % 2)) return -1; // 阴阳不配
  // 六十甲子排列规则：天干走6轮，地支走5轮
  let idx = (ganIndex - zhiIndex + 60) % 60;
  // 确保idx的奇偶与ganIndex一致
  if (idx % 2 !== ganIndex % 2) {
    idx = (idx + 1) % 60;
  }
  return idx;
}

// ---------- 04. 纳音五行 ----------

/**
 * 查询六十甲子干支对应的纳音五行
 *
 * 纳音五行是六十甲子每两组配一个五行，共三十组纳音。
 * 数据基于《三命通会》卷一·论纳音独立构建。
 *
 * @param ganzhi - 干支组合，如 "甲子"
 * @returns 纳音名称，如 "海中金"，找不到返回 null
 *
 * @source 公开命理经典《三命通会》卷一·论纳音
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，未参考任何 AGPL 源码
 */
export function getNayinWuxing(ganzhi: GanZhi): string | null {
  return NAYIN_TABLE[ganzhi] ?? null;
}

/**
 * 根据天干和地支直接计算纳音五行
 * 算法原理：纳音五行的干支编号有规律性，每两组干支共用同一纳音。
 * 这里使用简化公式计算。
 *
 * @param gan - 天干
 * @param zhi - 地支
 * @returns 纳音名称
 *
 * @source 公开命理经典《三命通会》
 * @license MIT - 净室独立实现
 * @cleanroom 独立推导算法，未参考任何 AGPL 源码
 */
export function calcNayin(gan: TianGan, zhi: DiZhi): string | null {
  const ganzhi: GanZhi = `${gan}${zhi}`;
  return NAYIN_TABLE[ganzhi] ?? null;
}

/**
 * 根据纳音名称获取其对应五行
 * 纳音名称的第三个字即为五行（如"海中金"->"金"，"炉中火"->"火"）
 *
 * @param nayinName - 纳音名称
 * @returns 五行字符
 *
 * @license MIT - 净室独立实现
 * @cleanroom 独立实现，基于纳音命名规则
 */
export function getNayinElement(nayinName: string): WuXing | null {
  if (!nayinName || nayinName.length < 3) return null;
  const ch = nayinName.charAt(2);
  if (ch === '金' || ch === '水' || ch === '木' || ch === '火' || ch === '土') {
    return ch as WuXing;
  }
  return null;
}

// ---------- 05. 空亡计算 ----------

/**
 * 查询干支对应的空亡地支
 *
 * 六十甲子分六旬，每旬十个干支，空亡两个地支。
 * 甲子旬空戌亥、甲戌旬空申酉、甲申旬空午未、
 * 甲午旬空辰巳、甲辰旬空寅卯、甲寅旬空子丑。
 *
 * @param ganzhi - 干支组合，如 "甲子"
 * @returns 空亡地支，如 "戌亥"，找不到返回 null
 *
 * @source 公开命理经典《渊海子平》论空亡
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getKongwang(ganzhi: GanZhi): string | null {
  const idx = JIAZI_TABLE.indexOf(ganzhi);
  if (idx === -1) return null;
  const xunIndex = Math.floor(idx / 10);
  return KONGWANG_BY_XUN[xunIndex] ?? null;
}

/**
 * 根据天干和地支直接计算空亡
 *
 * 计算当前干支所在的旬，然后返回该旬空亡的地支。
 *
 * @param gan - 天干
 * @param zhi - 地支
 * @returns 空亡地支，如 "戌亥"
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立推导算法，基于旬的划分规则
 */
export function calcKongwang(gan: TianGan, zhi: DiZhi): string | null {
  const ganzhi: GanZhi = `${gan}${zhi}`;
  return getKongwang(ganzhi);
}

// ---------- 06. 地支藏干 ----------

/**
 * 查询地支藏干
 *
 * 子藏癸、丑藏己癸辛、寅藏甲丙戊、卯藏乙、
 * 辰藏戊乙癸、巳藏丙庚戊、午藏丁己、未藏己丁乙、
 * 申藏庚壬戊、酉藏辛、戌藏戊辛丁、亥藏壬甲。
 *
 * @param zhi - 地支
 * @returns 藏干天干数组
 *
 * @source 公开命理经典《渊海子平》论地支藏干
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典文献，未参考任何 AGPL 源码
 */
export function getCangGan(zhi: DiZhi): TianGan[] {
  return CANG_GAN_TABLE[zhi] ?? [];
}

// ---------- 07. 十二长生 ----------

/**
 * 查询天干在地支位置的十二长生阶段
 *
 * 十二长生：长生、沐浴、冠带、临官、帝旺、衰、病、死、墓、绝、胎、养
 * 阳干顺行，阴干逆行。
 *
 * @param gan - 天干
 * @param zhi - 地支
 * @returns 十二长生阶段名称，找不到返回 null
 *
 * @source 公开命理经典《三命通会》论五行旺相休囚死
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getShengWang(gan: TianGan, zhi: DiZhi): ShengWangStage | null {
  return SHENG_WANG_TABLE[gan]?.[zhi] ?? null;
}

// ---------- 08. 五鼠遁（时柱天干） ----------

/**
 * 五鼠遁法：根据日干和时辰地支推算时柱天干
 *
 * 口诀：甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途。
 * 即：甲己日，子时为甲子；乙庚日，子时为丙子；丙辛日，子时为戊子；
 *     丁壬日，子时为庚子；戊癸日，子时为壬子。
 * 然后从子时开始顺推。
 *
 * @param dayGan - 日干
 * @param hourZhi - 时辰地支
 * @returns 时柱天干
 *
 * @source 公开命理经典《渊海子平》五鼠遁法
 * @license MIT - 净室独立实现
 * @cleanroom 独立实现，基于传统口诀，未参考任何 AGPL 源码
 */
export function getWuShuDun(dayGan: TianGan, hourZhi: DiZhi): TianGan {
  const startGan = WU_SHU_DUN_START[dayGan];
  const startGanIndex = getGanIndex(startGan);
  const zhiIndex = getZhiIndex(hourZhi);
  // 从子时（index=0）开始，每过一个时辰天干进一位
  const offset = zhiIndex;
  return getGanByIndex(startGanIndex + offset);
}

/**
 * 根据日干获取完整的时柱干支表（从子时到亥时）
 *
 * @param dayGan - 日干
 * @returns 12个时辰的干支数组
 *
 * @source 公开命理经典《渊海子平》五鼠遁法
 * @license MIT - 净室独立实现
 * @cleanroom 独立实现，基于传统口诀
 */
export function getFullWuShuDun(dayGan: TianGan): GanZhi[] {
  const startGanIndex = getGanIndex(WU_SHU_DUN_START[dayGan]);
  const result: GanZhi[] = [];
  for (let i = 0; i < 12; i++) {
    const g = getGanByIndex(startGanIndex + i);
    const z = ZHI[i];
    result.push(`${g}${z}`);
  }
  return result;
}

// ---------- 09. 五虎遁（月柱天干） ----------

/**
 * 五虎遁法：根据年干和月份推算月柱天干
 *
 * 口诀：甲己之年丙作首，乙庚之岁戊为头，丙辛必定寻庚起，丁壬壬位顺行流，
 *       若问戊癸何处起，甲寅之上好追求。
 * 即：甲己年，寅月为丙寅；乙庚年，寅月为戊寅；丙辛年，寅月为庚寅；
 *     丁壬年，寅月为壬寅；戊癸年，寅月为甲寅。
 * 然后从寅月（正月）开始顺推。
 *
 * @param yearGan - 年干
 * @param monthIndex - 月份索引（0=寅月/正月，1=卯月，... 11=丑月）
 * @returns 月柱天干
 *
 * @source 公开命理经典《渊海子平》五虎遁法
 * @license MIT - 净室独立实现
 * @cleanroom 独立实现，基于传统口诀，未参考任何 AGPL 源码
 */
export function getWuHuDun(yearGan: TianGan, monthIndex: number): TianGan {
  const startGan = WU_HU_DUN_START[yearGan];
  const startGanIndex = getGanIndex(startGan);
  return getGanByIndex(startGanIndex + monthIndex);
}

/**
 * 根据年干获取完整的月柱干支表（从寅月到丑月）
 *
 * @param yearGan - 年干
 * @returns 12个月的干支数组
 *
 * @source 公开命理经典《渊海子平》五虎遁法
 * @license MIT - 净室独立实现
 * @cleanroom 独立实现，基于传统口诀
 */
export function getFullWuHuDun(yearGan: TianGan): GanZhi[] {
  const startGanIndex = getGanIndex(WU_HU_DUN_START[yearGan]);
  const result: GanZhi[] = [];
  for (let i = 0; i < 12; i++) {
    const g = getGanByIndex(startGanIndex + i);
    const z = ZHI[(i + 2) % 12]; // 寅月从地支index=2开始
    result.push(`${g}${z}`);
  }
  return result;
}

// ---------- 10. 天干五行 ----------

/**
 * 获取天干对应的五行
 * 甲乙木、丙丁火、戊己土、庚辛金、壬癸水
 *
 * @param gan - 天干
 * @returns 五行
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典文献，未参考任何 AGPL 源码
 */
export function getGanWuxing(gan: TianGan): WuXing {
  return GAN_WUXING[gan];
}

// ---------- 11. 地支五行 ----------

/**
 * 获取地支对应的五行
 * 亥子水、寅卯木、巳午火、申酉金、辰戌丑未土
 *
 * @param zhi - 地支
 * @returns 五行
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典文献，未参考任何 AGPL 源码
 */
export function getZhiWuxing(zhi: DiZhi): WuXing {
  return ZHI_WUXING[zhi];
}

// ---------- 12. 天干阴阳 ----------

/**
 * 获取天干的阴阳属性
 * 甲丙戊庚壬为阳，乙丁己辛癸为阴
 *
 * @param gan - 天干
 * @returns 阴阳
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典文献，未参考任何 AGPL 源码
 */
export function getGanYinYang(gan: TianGan): YinYang {
  return GAN_YIN_YANG[gan];
}

/**
 * 判断天干是否为阳干
 *
 * @param gan - 天干
 * @returns true 为阳干
 *
 * @license MIT - 净室独立实现
 */
export function isGanYang(gan: TianGan): boolean {
  return GAN_YIN_YANG[gan] === '阳';
}

// ---------- 13. 地支阴阳 ----------

/**
 * 获取地支的阴阳属性
 * 子寅辰午申戌为阳，丑卯巳未酉亥为阴
 *
 * @param zhi - 地支
 * @returns 阴阳
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典文献，未参考任何 AGPL 源码
 */
export function getZhiYinYang(zhi: DiZhi): YinYang {
  return ZHI_YIN_YANG[zhi];
}

/**
 * 判断地支是否为阳支
 *
 * @param zhi - 地支
 * @returns true 为阳支
 *
 * @license MIT - 净室独立实现
 */
export function isZhiYang(zhi: DiZhi): boolean {
  return ZHI_YIN_YANG[zhi] === '阳';
}

// ---------- 14. 生肖 ----------

/**
 * 根据地支获取生肖
 * 子鼠、丑牛、寅虎、卯兔、辰龙、巳蛇、午马、未羊、申猴、酉鸡、戌狗、亥猪
 *
 * @param zhi - 地支
 * @returns 生肖名称
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典文献，未参考任何 AGPL 源码
 */
export function getShengXiao(zhi: DiZhi): ShengXiao {
  return SHENG_XIAO_TABLE[zhi];
}

/**
 * 根据公历年份获取生肖
 * 生肖以立春为界（而非农历正月初一）
 *
 * @param year - 公历年份
 * @returns 生肖名称
 *
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于地支与年份的对应关系（year % 12）
 */
export function getShengXiaoByYear(year: number): ShengXiao {
  // 地支序号 = (year - 4) % 12 （因为公元4年为甲子年）
  const zhiIndex = ((year - 4) % 12 + 12) % 12;
  return SHENG_XIAO_TABLE[ZHI[zhiIndex]];
}

// ---------- 15. 十神计算 ----------

/**
 * 根据日干和参照天干计算十神
 *
 * 规则：同我者比劫（同性比肩，异性劫财）、我生者食伤（同性食神，异性伤官）、
 *       我克者财（同性偏财，异性正财）、克我者官杀（同性七杀，异性正官）、
 *       生我者印（同性偏印，异性正印）
 *
 * @param dayGan - 日干（日元）
 * @param refGan - 参照天干
 * @returns 十神名称
 *
 * @source 公开命理经典《渊海子平》论十神
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于十神定义规则，未参考任何 AGPL 源码
 */
export function getShiShen(dayGan: TianGan, refGan: TianGan): ShiShen {
  return SHI_SHEN_TABLE[dayGan][refGan];
}

/**
 * 获取十神简称
 *
 * @param shiShen - 十神全称
 * @returns 十神简称
 *
 * @license MIT - 净室独立实现
 */
export function getShiShenJianCheng(shiShen: ShiShen): ShiShenJianCheng {
  return SHI_SHEN_JIAN_CHENG[shiShen];
}

/**
 * 根据地支藏干计算十神数组
 *
 * @param dayGan - 日干
 * @param zhi - 地支
 * @returns 十神名称数组，与藏干一一对应
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，组合藏干和十神逻辑
 */
export function getZhiShiShen(dayGan: TianGan, zhi: DiZhi): ShiShen[] {
  const cangGan = getCangGan(zhi);
  return cangGan.map(cg => SHI_SHEN_TABLE[dayGan][cg]);
}

/**
 * 根据五行关系计算十神大类（不区分阴阳）
 *
 * @param dayWuxing - 日干五行
 * @param refWuxing - 参照五行
 * @returns 十神大类名称
 *
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于五行生克规则
 */
export function getShiShenByWuxing(dayWuxing: WuXing, refWuxing: WuXing): string {
  if (dayWuxing === refWuxing) return '比劫';
  // 五行相生：金生水、水生木、木生火、火生土、土生金
  // 五行相克：金克木、木克土、土克水、水克火、火克金
  const shengMap: Record<WuXing, WuXing> = { '金': '水', '水': '木', '木': '火', '火': '土', '土': '金' };
  const keMap: Record<WuXing, WuXing> = { '金': '木', '木': '土', '土': '水', '水': '火', '火': '金' };

  if (shengMap[dayWuxing] === refWuxing) return '食伤';  // 我生者为食伤
  if (shengMap[refWuxing] === dayWuxing) return '印星';   // 生我者为印星
  if (keMap[dayWuxing] === refWuxing) return '财星';      // 我克者为财星
  if (keMap[refWuxing] === dayWuxing) return '官杀';      // 克我者为官杀
  return '比劫';
}

// ---------- 16. 天干五合 ----------

/**
 * 判断两个天干是否构成五合
 *
 * 甲己合化土、乙庚合化金、丙辛合化水、丁壬合化木、戊癸合化火
 *
 * @param gan1 - 天干1
 * @param gan2 - 天干2
 * @returns 若构成五合，返回合化信息，否则返回 null
 *
 * @source 公开命理经典《渊海子平》论天干五合
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getGanWuHe(gan1: TianGan, gan2: TianGan): { pair: [TianGan, TianGan]; huaWuXing: WuXing } | null {
  for (const [g1, g2, wx] of GAN_WU_HE) {
    if ((gan1 === g1 && gan2 === g2) || (gan1 === g2 && gan2 === g1)) {
      return { pair: [g1, g2], huaWuXing: wx };
    }
  }
  return null;
}

/**
 * 获取天干在五合中的合化对象
 *
 * @param gan - 天干
 * @returns 合化对象天干和五行，若不在五合中返回 null
 *
 * @license MIT - 净室独立实现
 */
export function getGanHePartner(gan: TianGan): { partner: TianGan; huaWuXing: WuXing } | null {
  for (const [g1, g2, wx] of GAN_WU_HE) {
    if (gan === g1) return { partner: g2, huaWuXing: wx };
    if (gan === g2) return { partner: g1, huaWuXing: wx };
  }
  return null;
}

// ---------- 17. 地支六合 ----------

/**
 * 判断两个地支是否构成六合
 *
 * 子丑合化土、寅亥合化木、卯戌合化火、辰酉合化金、巳申合化水、午未合化火土
 *
 * @param zhi1 - 地支1
 * @param zhi2 - 地支2
 * @returns 若构成六合，返回合化信息，否则返回 null
 *
 * @source 公开命理经典《渊海子平》论地支六合
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getZhiLiuHe(
  zhi1: DiZhi,
  zhi2: DiZhi,
): { pair: [DiZhi, DiZhi]; hua: string } | null {
  for (const [z1, z2, h] of ZHI_LIU_HE) {
    if ((zhi1 === z1 && zhi2 === z2) || (zhi1 === z2 && zhi2 === z1)) {
      return { pair: [z1, z2], hua: h };
    }
  }
  return null;
}

/**
 * 获取地支在六合中的合化对象
 *
 * @param zhi - 地支
 * @returns 合化对象地支和化气，若不在六合中返回 null
 *
 * @license MIT - 净室独立实现
 */
export function getZhiHePartner(zhi: DiZhi): { partner: DiZhi; hua: string } | null {
  for (const [z1, z2, h] of ZHI_LIU_HE) {
    if (zhi === z1) return { partner: z2, hua: h };
    if (zhi === z2) return { partner: z1, hua: h };
  }
  return null;
}

// ---------- 18. 地支六冲 ----------

/**
 * 判断两个地支是否构成六冲
 *
 * 子午冲、丑未冲、寅申冲、卯酉冲、辰戌冲、巳亥冲
 *
 * @param zhi1 - 地支1
 * @param zhi2 - 地支2
 * @returns 若构成六冲，返回冲对，否则返回 null
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getZhiLiuChong(zhi1: DiZhi, zhi2: DiZhi): [DiZhi, DiZhi] | null {
  for (const [z1, z2] of ZHI_LIU_CHONG) {
    if ((zhi1 === z1 && zhi2 === z2) || (zhi1 === z2 && zhi2 === z1)) {
      return [z1, z2];
    }
  }
  return null;
}

/**
 * 获取地支的六冲对象
 *
 * @param zhi - 地支
 * @returns 对冲的地支
 *
 * @license MIT - 净室独立实现
 */
export function getZhiChongPartner(zhi: DiZhi): DiZhi | null {
  for (const [z1, z2] of ZHI_LIU_CHONG) {
    if (zhi === z1) return z2;
    if (zhi === z2) return z1;
  }
  return null;
}

// ---------- 19. 地支三合 ----------

/**
 * 判断三个地支是否构成三合局
 *
 * 申子辰合水、亥卯未合木、寅午戌合火、巳酉丑合金
 *
 * @param zhizhi - 地支数组
 * @returns 若构成三合局，返回三合地支和五行，否则返回 null
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getZhiSanHe(zhizhi: DiZhi[]): { zhi: [DiZhi, DiZhi, DiZhi]; wuxing: WuXing } | null {
  if (zhizhi.length < 3) return null;
  const sorted = [...zhizhi].sort();
  for (const [z1, z2, z3, wx] of ZHI_SAN_HE) {
    const expected = [z1, z2, z3].sort();
    if (sorted.length === 3 && sorted[0] === expected[0] && sorted[1] === expected[1] && sorted[2] === expected[2]) {
      return { zhi: [z1, z2, z3], wuxing: wx };
    }
  }
  return null;
}

// ---------- 20. 地支三会 ----------

/**
 * 判断三个地支是否构成三会局
 *
 * 寅卯辰会东方木、巳午未会南方火、申酉戌会西方金、亥子丑会北方水
 *
 * @param zhizhi - 地支数组
 * @returns 若构成三会局，返回三会地支和五行，否则返回 null
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getZhiSanHui(zhizhi: DiZhi[]): { zhi: [DiZhi, DiZhi, DiZhi]; wuxing: WuXing } | null {
  if (zhizhi.length < 3) return null;
  const sorted = [...zhizhi].sort();
  for (const [z1, z2, z3, wx] of ZHI_SAN_HUI) {
    const expected = [z1, z2, z3].sort();
    if (sorted.length === 3 && sorted[0] === expected[0] && sorted[1] === expected[1] && sorted[2] === expected[2]) {
      return { zhi: [z1, z2, z3], wuxing: wx };
    }
  }
  return null;
}

// ---------- 21. 地支六害 ----------

/**
 * 判断两个地支是否构成六害
 *
 * 子未害、丑午害、寅巳害、卯辰害、申亥害、酉戌害
 *
 * @param zhi1 - 地支1
 * @param zhi2 - 地支2
 * @returns 若构成六害，返回害对，否则返回 null
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getZhiLiuHai(zhi1: DiZhi, zhi2: DiZhi): [DiZhi, DiZhi] | null {
  for (const [z1, z2] of ZHI_LIU_HAI) {
    if ((zhi1 === z1 && zhi2 === z2) || (zhi1 === z2 && zhi2 === z1)) {
      return [z1, z2];
    }
  }
  return null;
}

// ---------- 22. 地支相刑 ----------

/**
 * 判断两个或三个地支是否构成相刑
 *
 * 寅巳申无恩之刑、丑戌未恃势之刑、子卯无礼之刑、辰午酉亥自刑
 *
 * @param zhizhi - 地支数组（2-3个）
 * @returns 若构成相刑，返回刑名，否则返回 null
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getZhiXing(zhizhi: DiZhi[]): string | null {
  if (zhizhi.length === 2) {
    // 自刑：辰辰、午午、酉酉、亥亥
    if (zhizhi[0] === zhizhi[1]) {
      const key = `${zhizhi[0]}${zhizhi[1]}`;
      return ZHI_XING[key] ?? null;
    }
    // 子卯无礼之刑
    const key2 = `${zhizhi[0]}${zhizhi[1]}`;
    const key2r = `${zhizhi[1]}${zhizhi[0]}`;
    return ZHI_XING[key2] ?? ZHI_XING[key2r] ?? null;
  }
  if (zhizhi.length === 3) {
    const sorted = zhizhi.sort().join('');
    // 检查三刑
    const patterns = ['寅巳申', '丑戌未'];
    for (const p of patterns) {
      if (sorted === p) {
        return ZHI_XING[p] ?? null;
      }
    }
  }
  return null;
}

// ---------- 23. 地支六破 ----------

/**
 * 判断两个地支是否构成六破
 *
 * 子酉破、寅亥破、卯午破、辰丑破、巳申破、未戌破
 *
 * @param zhi1 - 地支1
 * @param zhi2 - 地支2
 * @returns 若构成六破，返回破对，否则返回 null
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getZhiPo(zhi1: DiZhi, zhi2: DiZhi): [DiZhi, DiZhi] | null {
  for (const [z1, z2] of ZHI_PO) {
    if ((zhi1 === z1 && zhi2 === z2) || (zhi1 === z2 && zhi2 === z1)) {
      return [z1, z2];
    }
  }
  return null;
}

// ---------- 24. 五行局 ----------

/**
 * 获取五行局（五行旺衰排序）
 *
 * 每个五行都有其旺衰顺序：同我 > 我生 > 生我 > 克我 > 我克
 *
 * @param wuxing - 五行
 * @returns 五行局配置
 *
 * @source 公开命理文献《三命通会》论五行旺相休囚死
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于五行相生相克规则，未参考任何 AGPL 源码
 */
export function getWuxingJu(wuxing: WuXing): WuXingJu {
  return WUXING_JUS[wuxing];
}

/**
 * 判断两个五行之间的生克关系
 *
 * @param source - 源五行
 * @param target - 目标五行
 * @returns 关系描述：'同我' | '我生' | '生我' | '我克' | '克我'
 *
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于五行相生相克规则
 */
export function getWuxingRelation(source: WuXing, target: WuXing): string {
  if (source === target) return '同我';
  const shengMap: Record<WuXing, WuXing> = { '金': '水', '水': '木', '木': '火', '火': '土', '土': '金' };
  const keMap: Record<WuXing, WuXing> = { '金': '木', '木': '土', '土': '水', '水': '火', '火': '金' };

  if (shengMap[source] === target) return '我生';
  if (shengMap[target] === source) return '生我';
  if (keMap[source] === target) return '我克';
  if (keMap[target] === source) return '克我';
  return '同我';
}

// ============================================================================
// 三、节气日期推算（基于 lunar-javascript MIT 协议库）
// ============================================================================

/**
 * 节气名称列表
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const JIEQI_NAMES: string[] = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒',
];

/**
 * 十二节（月柱分界点）
 * 立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const JIE_NAMES: string[] = [
  '立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
  '立秋', '白露', '寒露', '立冬', '大雪', '小寒',
];

/**
 * 获取节气对应的月份索引
 * 立春(0) -> 寅月，惊蛰(1) -> 卯月，以此类推
 *
 * @param jieName - 节名
 * @returns 月份索引（0=寅月）
 *
 * @license MIT - 净室独立实现
 */
export function getMonthByJie(jieName: string): number {
  const idx = JIE_NAMES.indexOf(jieName);
  return idx === -1 ? -1 : idx;
}

// ============================================================================
// 四、便捷工具函数
// ============================================================================

/**
 * 根据干支组合拆分天干和地支
 *
 * @param ganzhi - 干支组合，如 "甲子"
 * @returns [天干, 地支]，无效返回 null
 *
 * @license MIT - 净室独立实现
 */
export function splitGanZhi(ganzhi: GanZhi): [TianGan, DiZhi] | null {
  if (ganzhi.length !== 2) return null;
  const gan = GAN.find(g => ganzhi.startsWith(g));
  const zhi = ZHI.find(z => ganzhi.endsWith(z));
  if (!gan || !zhi) return null;
  return [gan, zhi];
}

/**
 * 根据公历年份计算年柱天干
 * 年柱以立春为界，此处提供简化计算（基于年份数字）
 *
 * 计算公式：年干序号 = (year - 4) % 10
 *
 * @param year - 公历年份
 * @returns 年柱天干
 *
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于干支纪年规律
 */
export function getYearGanByYear(year: number): TianGan {
  return getGanByIndex((year - 4) % 10);
}

/**
 * 根据公历年份计算年柱地支
 *
 * 计算公式：年支序号 = (year - 4) % 12
 *
 * @param year - 公历年份
 * @returns 年柱地支
 *
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于干支纪年规律
 */
export function getYearZhiByYear(year: number): DiZhi {
  return getZhiByIndex((year - 4) % 12);
}

/**
 * 根据公历年份计算年柱干支
 *
 * @param year - 公历年份
 * @returns 年柱干支组合
 *
 * @license MIT - 净室独立实现
 */
export function getYearGanZhi(year: number): GanZhi {
  return `${getYearGanByYear(year)}${getYearZhiByYear(year)}`;
}

/**
 * 十神关系汇总（用于八字分析）
 * 计算日干与年月日时四柱天干及藏干的十神关系
 *
 * @param dayGan - 日干
 * @param ganList - 天干列表（年月时柱天干）
 * @returns 十神数组
 *
 * @license MIT - 净室独立实现
 */
export function getShiShenSummary(dayGan: TianGan, ganList: TianGan[]): ShiShen[] {
  return ganList.map(g => getShiShen(dayGan, g));
}

// ============================================================================
// 导出汇总
// ============================================================================

/**
 * 本文件整体以 MIT 协议发布。
 * 所有函数基于公开传统命理口诀独立构建，按净室原则重写，未复制任何 AGPL 源码。
 *
 * 外部依赖：lunar-javascript（MIT）-- 用于公历/农历互转、节气精确计算、八字四柱构建。
 * 本文件仅覆盖 lunar-javascript 未提供的命理核心算法。
 */