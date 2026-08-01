/**
 * 六爻排盘类型定义
 * 协议：MIT
 */

/** 爻类型：少阳(1)、少阴(0)、老阳(1o/动阳)、老阴(0x/动阴) */
export type YaoType = '1' | '0' | '1o' | '0x';

/** 起卦方式 */
export type LiuyaoMethod = 'manual' | 'time' | 'number';

/** 手动起卦输入 */
export interface ManualYaoInput {
  /** 6个爻的类型，从初爻到上爻，index 0=初爻 */
  yaoTypes: YaoType[];
}

/** 数字起卦输入 */
export interface NumberDivinationInput {
  upperNum: number;
  lowerNum: number;
  dongYao?: number;
}

/** 六爻起卦输入 */
export interface LiuyaoInput {
  method: LiuyaoMethod;
  /** 公历年 */
  year: number;
  /** 公历月 1-12 */
  month: number;
  /** 公历日 1-31 */
  day: number;
  /** 小时 0-23 */
  hour: number;
  /** 分钟 0-59 */
  minute?: number;
  /** 预测事项 */
  question?: string;
  /** 手动起卦数据 */
  manual?: ManualYaoInput;
  /** 数字起卦数据 */
  number?: NumberDivinationInput;
}

/** 单爻信息 */
export interface LiuyaoYao {
  /** 爻位 1-6 (1=初爻, 6=上爻) */
  position: number;
  /** 是否阳爻 */
  isYang: boolean;
  /** 是否动爻 */
  isDong: boolean;
  /** 天干 */
  gan: string;
  /** 地支 */
  zhi: string;
  /** 地支五行 */
  zhiWuxing: string;
  /** 六亲简称：父/兄/孙/财/官 */
  liuQinShort: string;
  /** 六亲全称 */
  liuQin: string;
  /** 六神 */
  liuShen: string;
  /** 是否世爻 */
  isShi: boolean;
  /** 是否应爻 */
  isYing: boolean;
  /** 是否旬空 */
  isKong: boolean;
  /** 是否月破 */
  isYuePo: boolean;
  /** 是否日冲(日破/暗动) */
  isRiChong: boolean;
  /** 伏神（如有） */
  fushen?: {
    liuQin: string;
    gan: string;
    zhi: string;
  };
  /** 变爻天干（动爻才有） */
  bianGan?: string;
  /** 变爻地支（动爻才有） */
  bianZhi?: string;
  /** 变爻六亲（动爻才有） */
  bianLiuQin?: string;
  /** 变爻是否阳爻 */
  bianIsYang?: boolean;
}

/** 卦信息 */
export interface LiuyaoHexagram {
  /** 卦名 */
  name: string;
  /** 卦宫（如"乾宫"） */
  gong: string;
  /** 卦宫五行 */
  gongWuxing: string;
  /** 卦别名：归魂/游魂/六合/六冲 */
  alias?: string;
  /** 上卦 */
  upperTrigram: string;
  /** 下卦 */
  lowerTrigram: string;
  /** 爻列表 从初爻到上爻 */
  yaos: LiuyaoYao[];
}

/** 神煞信息 */
export interface ShenSha {
  name: string;
  zhi: string;
}

/** 六爻排盘结果 */
export interface LiuyaoResult {
  /** 预测事项 */
  question: string;
  /** 日期字符串 */
  dateStr: string;
  /** 农历日期 */
  lunarStr: string;
  /** 四柱 [年柱, 月柱, 日柱, 时柱] */
  siZhu: [string, string, string, string];
  /** 日干支 */
  dayGanZhi: string;
  /** 日干 */
  dayGan: string;
  /** 日支 */
  dayZhi: string;
  /** 月支 */
  monthZhi: string;
  /** 空亡 */
  kongWang: string;
  /** 驿马 */
  yiMa: string;
  /** 桃花 */
  taoHua: string;
  /** 节气信息 */
  jieqi: {
    from: string;
    fromDate: string;
    to: string;
    toDate: string;
  };
  /** 起卦方式 */
  method: LiuyaoMethod;
  /** 本卦 */
  benGua: LiuyaoHexagram;
  /** 变卦（无动爻时为null） */
  bianGua: LiuyaoHexagram | null;
  /** 用神（初步判定） */
  yongShen?: string;
}
