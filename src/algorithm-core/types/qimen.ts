/**
 * ============================================================================
 * 奇门遁甲类型定义
 * ============================================================================
 * 协议：MIT License
 * 净室声明：基于公开传统奇门遁甲经典（《奇门遁甲统宗》《烟波钓叟歌》等）独立定义，
 *           未复制任何 AGPL 源码的数据结构。
 * 九宫编号：坎1 坤2 震3 巽4 中5 乾6 兑7 艮8 离9（后天八卦洛书方位）
 * ============================================================================
 */

/** 排盘方法 */
export type PanMethod = 'chaibu' | 'zhirun' | 'maoshan';

/** 暗干排法 */
export type AnganType = 'zhishi' | 'men';

/** 阴阳遁 */
export type YinYangDun = '阳遁' | '阴遁';

/** 三元 */
export type SanYuan = '上元' | '中元' | '下元';

/** 八宫名称（不含中宫） */
export type BaGuaName = '坎' | '坤' | '震' | '巽' | '乾' | '兑' | '艮' | '离';

/** 九宫名称（含中宫） */
export type JiuGongName = BaGuaName | '中';

/** 天干 */
export type TianGan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';

/** 地支 */
export type DiZhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

/** 九星名称 */
export type JiuXingName = '天蓬' | '天芮' | '天冲' | '天辅' | '天禽' | '天心' | '天柱' | '天任' | '天英' | '芮禽';

/** 八门名称 */
export type BaMenName = '休门' | '生门' | '伤门' | '杜门' | '景门' | '死门' | '惊门' | '开门';

/** 天八神名称 */
export type TianBaShenName = '值符' | '螣蛇' | '太阴' | '六合' | '白虎' | '玄武' | '九地' | '九天';

/** 地八神简称 */
export type DiBaShenName = '符' | '蛇' | '阴' | '六' | '白' | '玄' | '九' | '天';

/** 奇门12长生状态（奇门特有的合并状态） */
export type QiMenChangSheng = '养生' | '沐' | '冠临' | '旺' | '衰病' | '死' | '墓绝' | '胎' | '生' | '临' | '绝';

/** 击刑/入墓/门迫标记 */
export type MarkType = 'jixing' | 'rumu' | 'menpo';

/**
 * 单个宫位信息（九宫每宫的数据）
 */
export interface QimenPalace {
  /** 洛书宫位编号 1-9 */
  position: number;
  /** 宫位名称（坎/坤/震/巽/中/乾/兑/艮/离） */
  palaceName: JiuGongName;
  /** 天盘九星 */
  star: JiuXingName | '';
  /** 人盘八门 */
  door: BaMenName | '';
  /** 天八神 */
  tianShen: TianBaShenName | '';
  /** 地八神 */
  diShen: DiBaShenName | '';
  /** 天盘天干 */
  tianPanGan: TianGan | '';
  /** 地盘天干 */
  diPanGan: TianGan | '';
  /** 暗干 */
  anGan: TianGan | '';
  /** 中宫寄到坤宫的地盘天干（仅坤宫有值） */
  zhongGongDiPan?: TianGan;
  /** 中宫寄到坤宫的天盘天干（仅坤宫有值） */
  zhongGongTianPan?: TianGan;
  /** 是否空亡 */
  kongwang: boolean;
  /** 是否有马星（驿马） */
  ma: boolean;
  /** 天盘干击刑标记 */
  tianPanJiXing?: boolean;
  /** 地盘干击刑标记 */
  diPanJiXing?: boolean;
  /** 中宫寄干击刑标记（坤宫） */
  zhongGongJiXing?: boolean;
  /** 天盘干入墓标记 */
  tianPanRuMu?: boolean;
  /** 地盘干入墓标记 */
  diPanRuMu?: boolean;
  /** 中宫寄干入墓标记（坤宫） */
  zhongGongRuMu?: boolean;
  /** 门迫标记 */
  menPo?: boolean;
  /** 聚合击刑标记（天盘/地盘/中宫任一击刑即为true） */
  jixing?: boolean;
  /** 聚合入墓标记（天盘/地盘/中宫任一入墓即为true） */
  rumu?: boolean;
  /** 门迫标记（别名，同 menPo） */
  menpo?: boolean;
  /** 天盘干12长生状态 */
  tianPan12ZhangSheng?: string;
  /** 地盘干12长生状态 */
  diPan12ZhangSheng?: string;
  /** 中宫寄干12长生状态（坤宫） */
  zhongGong12ZhangSheng?: string;
  // === 向后兼容字段 ===
  /** 天八神（旧版字段名，同 tianShen） */
  deity?: TianBaShenName | '';
  /** 门是否吉门（休/生/开为吉） */
  isAuspicious?: boolean;
  /** 是否中宫寄宫 */
  isJigong?: boolean;
  /** 寄宫目标宫位编号 */
  jigongTarget?: number;
}

/**
 * 四柱信息
 */
export interface SiZhu {
  /** 年柱 */
  year: string;
  /** 月柱 */
  month: string;
  /** 日柱 */
  day: string;
  /** 时柱 */
  hour: string;
}

/**
 * 值符值使信息
 */
export interface ZhiFuZhiShi {
  /** 值符天干（旬首六甲+遁干，如"甲子戊"） */
  zhiFuTianGan: [string, TianGan];
  /** 值符星及落宫 [星名, 宫名] */
  zhiFuXingGong: [JiuXingName, JiuGongName];
  /** 值使门及落宫 [门名, 宫名] */
  zhiShiMenGong: [BaMenName, JiuGongName];
}

/**
 * 马星信息
 */
export interface MaXing {
  /** 驿马（地支名） */
  yiMa: DiZhi;
  /** 天马（地支名） */
  tianMa: DiZhi;
  /** 丁马（地支名） */
  dingMa: DiZhi;
}

/**
 * 奇门遁甲排盘输入参数
 */
export interface QimenInput {
  /** 公历年 */
  year: number;
  /** 公历月 1-12 */
  month: number;
  /** 公历日 1-31 */
  day: number;
  /** 时 0-23 */
  hour: number;
  /** 分 0-59，默认0 */
  minute?: number;
  /** 排盘方法，默认拆补法 */
  panMethod?: PanMethod;
  /** 暗干排法，默认值使飞布法 */
  anganType?: AnganType;
}

/**
 * 奇门遁甲完整排盘结果
 */
export interface QimenResult {
  /** 排盘方法 */
  panMethod: PanMethod;
  /** 暗干排法 */
  anganType: AnganType;
  /** 日期描述字符串 */
  dateStr: string;
  /** 阴阳遁 */
  yinYangDun: YinYangDun;
  /** 局数 1-9 */
  juNumber: number;
  /** 局名全称（如"阳遁一局上元"） */
  juName: string;
  /** 三元 */
  sanYuan: SanYuan;
  /** 当前节气信息 */
  jieqi: string;
  /** 四柱 */
  siZhu: SiZhu;
  /** 旬首（如"甲子戊"） */
  xunShou: string;
  /** 旬空（如"戌亥"） */
  xunKong: string;
  /** 日空 */
  riKong: string;
  /** 时空 */
  shiKong: string;
  /** 值符值使 */
  zhiFuZhiShi: ZhiFuZhiShi;
  /** 马星 */
  maXing: MaXing;
  /** 九宫排盘数据（以宫位编号1-9索引） */
  palaces: QimenPalace[];
  /** 以宫名为键的排盘数据（方便查询） */
  palaceByGua: Record<JiuGongName, QimenPalace>;
  // === 向后兼容字段 ===
  /** 阴阳遁（旧版字段名，同 yinYangDun） */
  juType?: YinYangDun;
  /** 三元（旧版字段名，同 sanYuan） */
  yuan?: string;
  /** 吉门方位 */
  auspiciousDirections?: string[];
  /** 凶门方位 */
  inauspiciousDirections?: string[];
}
