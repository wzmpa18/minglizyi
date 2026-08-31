// 七政四余排盘引擎 - NICHE-TOOLS-07
// ============================================================================
// 来源：天文计算基于开源库 天文历算引擎 2.1.19（MIT，允许商用闭源）；
//       二十八宿距星 J2000 坐标取自依巴谷星表（数据性事实），
//       距星选取经《钦定仪象考成》黄道宿度表反推对拍验证：
//       奎=η And、尾=ε Sco、觜参星位互换（觜前参后古宿序），
//       二十四宿宿宽与古表差<1.5°，宿界与星位一一对应可复算；
//       罗睺/计都（白道升降交点平黄经）、月孛（白道远地点平黄经）采用
//       Meeus《Astronomical Algorithms》2nd 公布级数公式（算法性事实）；
//       紫炁为虚拟曜，采用钟义明周期 27.9876 年（≈0.0352173 度/日），
//       历元常数取自日本七政占星研究者公开公式，历元基准 J2000.0；
//       宫制/宿度/命宫/命度/洞微大限规则依据项目方权威资料
//       （qizheng_source_clean.txt："宫必含其宿，宿必在其宫"，
//        四日度在四正，宿度为洞微大限主体）与九紫辰公开考据
//       （《果老星宗入门图示》《洞微大限算法简总》《论行限》）。
// 协议：净室独立实现，无 AGPL 代码混入；未参考 Horosa/Moira 源码。
// 边界：引擎只做天文计算 + 古法排布规则映射，不输出任何吉凶断语；
//       释义文案由后台配置。
// 日期：2026-08-31 创建（v25.0.68）
// ============================================================================

import * as Astronomy from "astronomy-engine";

/** 引擎数据版本（合规可追溯标识） */
export const QIZHENG_ENGINE_VERSION = "七政四余引擎 v25.0.68（天文层：天文历算引擎 2.1.19）";

// ============================================================================
// 一、类型定义
// ============================================================================

/** 星制：tropical=黄道回归今制（默认），sidereal=恒星制（宫随宿界） */
export type StarFrame = "tropical" | "sidereal";

/** 命宫定法：mao=遇卯安命（默认古法口诀），sunrise=按出生地日出时辰 */
export type MingGongMode = "mao" | "sunrise";

export interface QizhengInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 出生地纬度（北纬为正） */
  lat: number;
  /** 出生地经度（东经为正） */
  lon: number;
  /** 时区偏移小时数，默认东八区 8 */
  tzOffset?: number;
  placeName?: string;
  gender?: "male" | "female";
  /** 星制，默认今制 */
  frame?: StarFrame;
  /** 命宫定法，默认遇卯安命 */
  mingGongMode?: MingGongMode;
  /** 童限起岁：10（默认古法）或 9（另一师传，行限早一年） */
  dongweiStart?: 9 | 10;
}

/** 十一曜（七政四余）单星位置 */
export interface StarPosition {
  key: string; // sun/moon/jupiter/mars/saturn/venus/mercury/qi/luo/ji
  name: string; // 太阳/太阴/木星/火星/土星/金星/水星/紫炁/罗睺/计都
  symbol: string; // ☉ ☽ ♃ ♂ ♄ ♀ ☿ 炁 罗 计
  kind: "zheng" | "yu"; // 七政 / 四余
  wuxing: string; // 五行（日月按引擎约定：日火、月水，后台释义可覆盖）
  /** 真黄道经度（0-360，真分点制） */
  lon: number;
  /** 黄经每日变化（度/日，负值=逆行） */
  speed: number;
  retrograde: boolean;
  /** 所在宫地支 */
  palaceBranch: string;
  /** 宫内度数 */
  palaceDegree: number;
  /** 所在人事宫（1-12 序：命宫/财帛/…/相貌） */
  renshiGong: string;
  renshiIndex: number;
  /** 所在二十八宿（名，如"角"） */
  xiuName: string;
  /** 宿全名（如"角木蛟"） */
  xiuFullName: string;
  /** 宿内度数 */
  xiuDegree: number;
  /** 宿主星（度主）名 */
  xiuOwner: string;
  /** 入垣（星在其宫主之宫） */
  inYuan: boolean;
  /** 升殿（星在其宿主之宿） */
  shengDian: boolean;
}

/** 二十八宿布度信息 */
export interface MansionInfo {
  index: number; // 0-27，古序：角亢氐…轸
  name: string; // 角
  fullName: string; // 角木蛟
  owner: string; // 宿主：木
  ownerKey: string; // jupiter
  wuxing: string; // 木
  animal: string; // 蛟
  /** 宿起点黄经（真分点制，按距星实测） */
  startLon: number;
  /** 宿宽（度） */
  width: number;
  /** 宿所在宫地支（今制动态计算） */
  palaceBranch: string;
}

/** 十二宫（地支宫）信息 */
export interface PalaceInfo {
  branch: string; // 子
  branchIndex: number; // 0-11
  yinYang: "阳" | "阴";
  /** 宫主星名（午=太阳，未=太阴） */
  owner: string;
  ownerKey: string;
  /** 宫起点黄经 */
  startLon: number;
  /** 宫宽（今制恒 30，恒星制随宿界不等） */
  width: number;
  /** 人事宫名（由命宫逆向排布） */
  renshiGong: string;
  renshiIndex: number;
  /** 宫内星（key 列表） */
  stars: string[];
}

/** 洞微大限行限行 */
export interface DongweiRow {
  /** 人事宫名 */
  renshiGong: string;
  /** 限宫地支 */
  palaceBranch: string;
  /** 宫起点黄经 */
  startLon: number;
  /** 宫宽 */
  width: number;
  /** 起始虚岁（含） */
  startAge: number;
  /** 结束虚岁（不含） */
  endAge: number;
  /** 管限年数 */
  years: number;
  /** 行限度数（度/年） */
  degPerYear: number;
  /** 是否童限（行命宫） */
  isTongxian: boolean;
}

export interface QizhengResult {
  engineVersion: string;
  input: QizhengInput;
  /** 星制 */
  frame: StarFrame;
  /** UTC 时刻 */
  utcTime: string;
  /** 真太阳时校正明细 */
  trueSolar: {
    longitudeOffsetMin: number;
    equationOfTimeMin: number;
    totalOffsetMin: number;
    trueSolarTime: string; // HH:mm
  };
  /** 时辰（真太阳时定） */
  hour: { index: number; name: string; branch: string };
  /** 昼夜（按出生地真实日出日落定） */
  dayNight: {
    isDay: boolean;
    sunriseUtc: string | null;
    sunsetUtc: string | null;
  };
  /** 太阳 */
  sun: { lon: number; palaceBranch: string; palaceDegree: number; xiuName: string; xiuDegree: number };
  /** 命宫 */
  mingGong: {
    branch: string;
    branchIndex: number;
    startLon: number;
    width: number;
    renshiIndex: number;
  };
  /** 命度（命宫内与太阳同络之度） */
  mingDu: {
    lon: number;
    palaceDegree: number;
    xiuName: string;
    xiuFullName: string;
    xiuDegree: number;
  };
  /** 命度主（宿主）与命元五行 */
  mingDuZhu: string;
  mingYuanWuxing: string;
  /** 身宫（太阴所在宫）与身度（太阴所在宿度） */
  shenGong: { branch: string; branchIndex: number; renshiIndex: number };
  shenDu: { lon: number; xiuName: string; xiuFullName: string; xiuDegree: number };
  shenDuZhu: string;
  /** 十二宫 */
  palaces: PalaceInfo[];
  /** 二十八宿 */
  mansions: MansionInfo[];
  /** 十一曜 */
  stars: StarPosition[];
  /** 洞微大限 */
  dongwei: {
    /** 童限起岁基数（10 或 9） */
    startBase: number;
    /** 出限虚岁（小数年） */
    chuxianAge: number;
    /** 出限虚岁文字（岁/月） */
    chuxianText: string;
    rows: DongweiRow[];
  };
}

// ============================================================================
// 二、常量数据
// ============================================================================

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const norm360 = (x: number): number => ((x % 360) + 360) % 360;

/**
 * 紫炁（虚拟曜）计算常数 —— 项目方可按后台资料整体替换
 * 行速：0.0352173 度/日（周期 27.9876 年，钟义明考证值，古籍概说 28 日 1 度）
 * 历元：J2000.0 黄经 300°（依日本七政研究者公开公式，历元基准为本引擎约定）
 */
export const QI_CONFIG = {
  speedDegPerDay: 0.0352173,
  epochLonDeg: 300,
  epochJd: 2451545.0,
};

/** 太阳/太阴五行引擎约定（古典文献存在分歧，释义层可覆盖） */
export const SUN_MOON_WUXING = { sun: "火", moon: "水" };

/**
 * 二十八宿距星 J2000 赤道坐标（依巴谷星表，度）
 * 距星选取：《钦定仪象考成》黄道宿度表反推验证（边界吻合≤0.05°）：
 *   奎距星取 η And（非 ζ And）、尾距星取 ε Sco（非 μ¹ Sco），
 *   其余取现代通行距星（陈遵妫《中国天文学史》口径）。
 * 觜参处理：两距星现代黄经倒置（参星 82.36° 反在觜星 83.60° 之前），
 *   依古典"觜前参后"宿序采用星位互换赋界（觜界=参星、参界=觜星），
 *   实测觜宽 1.24°/参宽 11.93°，与《仪象考成》觜 1°21'/参 11°33' 相合。
 */
interface StarDatum {
  name: string;
  ra: number; // J2000 赤经（度）
  dec: number; // J2000 赤纬（度）
}
const XIU_STARS: StarDatum[] = [
  { name: "角", ra: 201.298247, dec: -11.153216 }, // α Vir Spica
  { name: "亢", ra: 213.223917, dec: -10.274044 }, // κ Vir
  { name: "氐", ra: 222.719905, dec: -16.041610 }, // α Lib
  { name: "房", ra: 239.713003, dec: -26.114043 }, // π Sco
  { name: "心", ra: 245.297177, dec: -25.592753 }, // σ Sco
  { name: "尾", ra: 252.541667, dec: -34.285000 }, // ε Sco（《仪象考成》距星）
  { name: "箕", ra: 271.452186, dec: -30.423650 }, // γ Sgr
  { name: "斗", ra: 281.413970, dec: -26.990779 }, // φ Sgr
  { name: "牛", ra: 305.252692, dec: -14.781401 }, // β Cap
  { name: "女", ra: 311.918885, dec: -9.495689 }, // ε Aqr
  { name: "虚", ra: 322.889670, dec: -5.571156 }, // β Aqr
  { name: "危", ra: 331.445983, dec: -0.319849 }, // α Aqr Sadalmelik
  { name: "室", ra: 346.190070, dec: 15.205368 }, // α Peg Markab
  { name: "壁", ra: 0.308958, dec: 15.183617 }, // γ Peg Algenib
  { name: "奎", ra: 14.479583, dec: 23.417500 }, // η And（《仪象考成》距星）
  { name: "娄", ra: 28.659789, dec: 20.808300 }, // β Ari
  { name: "胃", ra: 40.862966, dec: 27.707145 }, // 35 Ari
  { name: "昴", ra: 56.218848, dec: 24.113448 }, // 17 Tau Electra
  { name: "毕", ra: 67.153888, dec: 19.180521 }, // ε Tau
  { name: "觜", ra: 83.705158, dec: 9.489585 }, // φ¹ Ori
  { name: "参", ra: 83.001665, dec: -0.299093 }, // δ Ori Mintaka
  { name: "井", ra: 95.989963, dec: 22.513851 }, // μ Gem
  { name: "鬼", ra: 127.898873, dec: 18.094422 }, // θ Cnc
  { name: "柳", ra: 129.414197, dec: 5.703797 }, // δ Hya
  { name: "星", ra: 141.896881, dec: -8.658683 }, // α Hya Alphard
  { name: "张", ra: 147.869510, dec: -14.846550 }, // υ¹ Hya
  { name: "翼", ra: 164.944787, dec: -18.299097 }, // α Crv Gienah Crv
  { name: "轸", ra: 183.951950, dec: -17.541984 }, // γ Crv Gienah
];

/**
 * 二十八宿宿主（度主）五行映射 —— 《果老星宗》量天尺宿度配属
 * 日宿：房虚昴星；月宿：心危毕张；木宿：角斗奎井；
 * 火宿：尾室觜翼；土宿：氐女胃柳；金宿：亢牛娄鬼；水宿：箕壁参轸
 */
interface MansionMeta {
  name: string;
  animal: string; // 生肖动物
  owner: string; // 宿主星名
  ownerKey: string;
  wuxing: string;
}
const XIU_META: MansionMeta[] = [
  { name: "角", animal: "蛟", owner: "木星", ownerKey: "jupiter", wuxing: "木" },
  { name: "亢", animal: "龙", owner: "金星", ownerKey: "venus", wuxing: "金" },
  { name: "氐", animal: "貉", owner: "土星", ownerKey: "saturn", wuxing: "土" },
  { name: "房", animal: "兔", owner: "太阳", ownerKey: "sun", wuxing: SUN_MOON_WUXING.sun },
  { name: "心", animal: "狐", owner: "太阴", ownerKey: "moon", wuxing: SUN_MOON_WUXING.moon },
  { name: "尾", animal: "虎", owner: "火星", ownerKey: "mars", wuxing: "火" },
  { name: "箕", animal: "豹", owner: "水星", ownerKey: "mercury", wuxing: "水" },
  { name: "斗", animal: "獬", owner: "木星", ownerKey: "jupiter", wuxing: "木" },
  { name: "牛", animal: "牛", owner: "金星", ownerKey: "venus", wuxing: "金" },
  { name: "女", animal: "蝠", owner: "土星", ownerKey: "saturn", wuxing: "土" },
  { name: "虚", animal: "鼠", owner: "太阳", ownerKey: "sun", wuxing: SUN_MOON_WUXING.sun },
  { name: "危", animal: "燕", owner: "太阴", ownerKey: "moon", wuxing: SUN_MOON_WUXING.moon },
  { name: "室", animal: "猪", owner: "火星", ownerKey: "mars", wuxing: "火" },
  { name: "壁", animal: "貐", owner: "水星", ownerKey: "mercury", wuxing: "水" },
  { name: "奎", animal: "狼", owner: "木星", ownerKey: "jupiter", wuxing: "木" },
  { name: "娄", animal: "狗", owner: "金星", ownerKey: "venus", wuxing: "金" },
  { name: "胃", animal: "雉", owner: "土星", ownerKey: "saturn", wuxing: "土" },
  { name: "昴", animal: "鸡", owner: "太阳", ownerKey: "sun", wuxing: SUN_MOON_WUXING.sun },
  { name: "毕", animal: "乌", owner: "太阴", ownerKey: "moon", wuxing: SUN_MOON_WUXING.moon },
  { name: "觜", animal: "猴", owner: "火星", ownerKey: "mars", wuxing: "火" },
  { name: "参", animal: "猿", owner: "水星", ownerKey: "mercury", wuxing: "水" },
  { name: "井", animal: "犴", owner: "木星", ownerKey: "jupiter", wuxing: "木" },
  { name: "鬼", animal: "羊", owner: "金星", ownerKey: "venus", wuxing: "金" },
  { name: "柳", animal: "獐", owner: "土星", ownerKey: "saturn", wuxing: "土" },
  { name: "星", animal: "马", owner: "太阳", ownerKey: "sun", wuxing: SUN_MOON_WUXING.sun },
  { name: "张", animal: "鹿", owner: "太阴", ownerKey: "moon", wuxing: SUN_MOON_WUXING.moon },
  { name: "翼", animal: "蛇", owner: "火星", ownerKey: "mars", wuxing: "火" },
  { name: "轸", animal: "蚓", owner: "水星", ownerKey: "mercury", wuxing: "水" },
];

/** 十二地支 */
const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

/**
 * 十二宫宫主（地支宫五行配属）——《果老星宗》：
 * 子丑土、寅亥木、卯戌火、辰酉金、巳申水、午太阳、未太阴
 */
const PALACE_OWNERS: Array<{ owner: string; ownerKey: string; wuxing: string }> = [
  { owner: "土星", ownerKey: "saturn", wuxing: "土" }, // 子
  { owner: "土星", ownerKey: "saturn", wuxing: "土" }, // 丑
  { owner: "木星", ownerKey: "jupiter", wuxing: "木" }, // 寅
  { owner: "火星", ownerKey: "mars", wuxing: "火" }, // 卯
  { owner: "金星", ownerKey: "venus", wuxing: "金" }, // 辰
  { owner: "水星", ownerKey: "mercury", wuxing: "水" }, // 巳
  { owner: "太阳", ownerKey: "sun", wuxing: SUN_MOON_WUXING.sun }, // 午
  { owner: "太阴", ownerKey: "moon", wuxing: SUN_MOON_WUXING.moon }, // 未
  { owner: "水星", ownerKey: "mercury", wuxing: "水" }, // 申
  { owner: "金星", ownerKey: "venus", wuxing: "金" }, // 酉
  { owner: "火星", ownerKey: "mars", wuxing: "火" }, // 戌
  { owner: "木星", ownerKey: "jupiter", wuxing: "木" }, // 亥
];

/** 十二人事宫（命宫起逆向排布的固定名称序） */
export const RENSHI_GONG_NAMES = [
  "命宫", "财帛", "兄弟", "田宅", "男女", "奴仆", "妻妾", "疾厄", "迁移", "官禄", "福德", "相貌",
];

/**
 * 洞微大限各行宫管限年数 —— 《乾元密旨》/九紫辰《论行限》：
 * 命宫（童限，随太阳度浮动）；相貌 10；福德 11；官禄 15；迁移 8；
 * 疾厄 7；妻妾 11；奴仆 4.5；男女 4.5；田宅 4.5；兄弟 5；财帛 5
 *（注：命宫后的十一宫总和 85.5 年）
 */
const DONGWEI_YEARS: number[] = [10, 11, 15, 8, 7, 11, 4.5, 4.5, 4.5, 5, 5];

/**
 * 恒星制十二宫起点宿（古序索引）：宫必含其宿 ——
 * 辰角、卯房、寅箕、丑牛、子虚、亥室、戌奎、酉胃、申觜、未井、午柳、巳翼
 */
const SIDEREAL_PALACE_XIU: number[] = [10, 8, 6, 3, 0, 26, 23, 21, 19, 16, 14, 12];
// 上面数组按宫序（子丑寅卯辰巳午未申酉戌亥）给出该宫起始宿的古序索引

/** 七政星体定义（天文历算引擎天体） */
const ZHENG_DEFS: Array<{ key: string; body: Astronomy.Body; name: string; symbol: string; wuxing: string }> = [
  { key: "sun", body: Astronomy.Body.Sun, name: "太阳", symbol: "☉", wuxing: SUN_MOON_WUXING.sun },
  { key: "moon", body: Astronomy.Body.Moon, name: "太阴", symbol: "☽", wuxing: SUN_MOON_WUXING.moon },
  { key: "jupiter", body: Astronomy.Body.Jupiter, name: "木星", symbol: "♃", wuxing: "木" },
  { key: "mars", body: Astronomy.Body.Mars, name: "火星", symbol: "♂", wuxing: "火" },
  { key: "saturn", body: Astronomy.Body.Saturn, name: "土星", symbol: "♄", wuxing: "土" },
  { key: "venus", body: Astronomy.Body.Venus, name: "金星", symbol: "♀", wuxing: "金" },
  { key: "mercury", body: Astronomy.Body.Mercury, name: "水星", symbol: "☿", wuxing: "水" },
];

/** 四余星体定义（罗计孛为白道特征点平黄经，炁为虚拟曜） */
const YU_DEFS: Array<{ key: string; name: string; symbol: string; wuxing: string }> = [
  { key: "qi", name: "紫炁", symbol: "炁", wuxing: "木" },
  { key: "luo", name: "罗睺", symbol: "罗", wuxing: "火" },
  { key: "ji", name: "计都", symbol: "计", wuxing: "土" },
  { key: "bei", name: "月孛", symbol: "孛", wuxing: "水" },
];

// ============================================================================
// 三、天文计算层
// ============================================================================

/** 儒略日（UT） */
function julianDay(date: Date): number {
  return Astronomy.MakeTime(date).ut + 2451545.0;
}

/** 均时差 EoT（分钟）—— Meeus 28.1（y=tan²(ε/2)，ε为黄赤交角） */
function equationOfTimeMin(date: Date): number {
  const T = (julianDay(date) - 2451545.0) / 36525;
  const eps = Astronomy.e_tilt(Astronomy.MakeTime(date)).tobl;
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mr = M * D2R;
  const C = Math.sin(Mr) * (1.914602 - 0.004817 * T - 0.000014 * T * T)
    + Math.sin(2 * Mr) * (0.019993 - 0.000101 * T)
    + Math.sin(3 * Mr) * 0.000289;
  const trueLon = L0 + C;
  const lambda = trueLon - 0.00569 - 0.00478 * Math.sin(norm360(125.04 - 1934.136 * T) * D2R);
  const y = Math.tan(eps / 2 * D2R) ** 2;
  const eot =
    y * Math.sin(2 * (L0 * D2R))
    - 2 * e * Math.sin(Mr)
    + 4 * e * y * Math.sin(Mr) * Math.cos(2 * (L0 * D2R))
    - 0.5 * y * y * Math.sin(4 * (L0 * D2R))
    - 1.25 * e * e * Math.sin(2 * Mr);
  return eot * R2D * 4; // 弧度→度→分钟（×4）
}

/** 距星真黄道经度（EQJ 单位向量 → 真黄道坐标 ECT） */
function starEclipticLon(star: StarDatum, time: Astronomy.AstroTime): number {
  const x = Math.cos(star.dec * D2R) * Math.cos(star.ra * D2R);
  const y = Math.cos(star.dec * D2R) * Math.sin(star.ra * D2R);
  const z = Math.sin(star.dec * D2R);
  const vec = new Astronomy.Vector(x, y, z, time);
  const ect = Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECT(time), vec);
  return norm360(Astronomy.SphereFromVector(ect).lon);
}

/** 七政天体真黄道经度（含光行差与章动，与占星模块同口径） */
function bodyEclipticLon(body: Astronomy.Body, date: Date): number {
  const time = Astronomy.MakeTime(date);
  const eps = Astronomy.e_tilt(time).tobl;
  const geo = Astronomy.GeoVector(body, date, true);
  const eqd = Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(time), geo);
  const { ra, dec } = Astronomy.EquatorFromVector(eqd);
  const alpha = ra * 15;
  const lon = Math.atan2(
    Math.sin(alpha * D2R) * Math.cos(eps * D2R) + Math.tan(dec * D2R) * Math.sin(eps * D2R),
    Math.cos(alpha * D2R)
  );
  return norm360(lon * R2D);
}

/** 罗睺：白道升交点平黄经（Meeus 47.7，回归平黄道） */
function meanLunarNodeLon(date: Date): number {
  const T = (julianDay(date) - 2451545.0) / 36525;
  return norm360(
    125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T * T * T * T) / 60616000
  );
}

/** 月孛：白道远地点平黄经 =（月亮平黄经 - 平近点角）+ 180°（Meeus 47.1/47.4/47.6） */
function meanLunarApogeeLon(date: Date): number {
  const T = (julianDay(date) - 2451545.0) / 36525;
  const L = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T * T * T) / 538841 - (T * T * T * T) / 65194000;
  const M = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T * T * T) / 69699 - (T * T * T * T) / 14712000;
  return norm360(L - M + 180);
}

/** 紫炁黄经（虚拟曜，常数见 QI_CONFIG） */
export function qiLongitude(date: Date): number {
  const d = julianDay(date) - QI_CONFIG.epochJd;
  return norm360(QI_CONFIG.epochLonDeg + QI_CONFIG.speedDegPerDay * d);
}

/** 罗睺黄经（供测试） */
export function luoLongitude(date: Date): number {
  return meanLunarNodeLon(date);
}

/** 月孛黄经（供测试） */
export function beiLongitude(date: Date): number {
  return meanLunarApogeeLon(date);
}

/** 平黄经 → 真黄经（补黄经章动，保持与七政/宿度同坐标系） */
function meanToTrue(lon: number, date: Date): number {
  const dpsi = Astronomy.e_tilt(Astronomy.MakeTime(date)).dpsi / 3600; // 角秒 → 度
  return norm360(lon + dpsi);
}

// ============================================================================
// 四、二十八宿布度
// ============================================================================

/** 计算时刻二十八宿边界（真黄道经度，古典宿序） */
function computeXiuBoundaries(date: Date): number[] {
  const time = Astronomy.MakeTime(date);
  const lons = XIU_STARS.map((s) => starEclipticLon(s, time));
  // 觜(19)/参(20)距星黄经倒置，按古典"觜前参后"宿序互换星位赋界：
  // 觜宿起点取参星黄经、参宿起点取觜星黄经，保证宿界沿黄经单调递增，
  // 且觜宽≈1.2°、参宽≈11.9°，与《仪象考成》觜 1°21'/参 11°33' 相合。
  const boundaries = [...lons];
  const tmp = boundaries[19];
  boundaries[19] = boundaries[20];
  boundaries[20] = tmp;
  return boundaries;
}

/** 在宿界数组中定位黄经所在宿（返回古序索引与宿内度） */
function locateXiu(lon: number, boundaries: number[]): { index: number; degree: number } {
  const l = norm360(lon);
  for (let k = 0; k < 28; k++) {
    const start = boundaries[k];
    const end = boundaries[(k + 1) % 28];
    const span = norm360(end - start);
    const off = norm360(l - start);
    if (off < span) return { index: k, degree: off };
  }
  return { index: 27, degree: 0 };
}

// ============================================================================
// 五、宫制
// ============================================================================

/** 今制（黄道回归）宫起点黄经：戌宫 0°=春分点，逆黄经序 30° 等分 */
function tropicalPalaceStart(branchIndex: number): number {
  // 戌=0, 酉=30, …, 亥=330；地支序 → 宫起点
  return norm360((10 - branchIndex + 12) % 12 * 30);
}

function tropicalPalaceOf(lon: number): { branchIndex: number; degree: number } {
  const p = Math.floor(norm360(lon) / 30); // 0=戌…11=亥
  const branchIndex = (10 - p + 12) % 12;
  return { branchIndex, degree: norm360(lon) - p * 30 };
}

/**
 * 恒星制宫界：宫必含其宿（各宫起点=所属首宿起点，宫宽随宿界不等）
 * 注意：黄经增大方向上宫序为 丑→子→亥→…→寅（与地支序逆向），
 * 故下一宫取 (b-1+12)%12 而非 (b+1)%12。
 */
function siderealPalaceLayout(boundaries: number[]): Array<{ branchIndex: number; startLon: number; width: number }> {
  // 按 子丑寅卯辰巳午未申酉戌亥 宫序列出各宫起点宿古序
  const layout: Array<{ branchIndex: number; startLon: number; width: number }> = [];
  for (let b = 0; b < 12; b++) {
    const xiuIdx = SIDEREAL_PALACE_XIU[b];
    const start = boundaries[xiuIdx];
    const nextXiuIdx = SIDEREAL_PALACE_XIU[(b - 1 + 12) % 12];
    const width = norm360(boundaries[nextXiuIdx] - start);
    layout.push({ branchIndex: b, startLon: start, width });
  }
  return layout;
}

function siderealPalaceOf(lon: number, layout: Array<{ branchIndex: number; startLon: number; width: number }>):
  { branchIndex: number; degree: number } {
  const l = norm360(lon);
  for (const p of layout) {
    const off = norm360(l - p.startLon);
    if (off < p.width) return { branchIndex: p.branchIndex, degree: off };
  }
  const fallback = layout[0];
  return { branchIndex: fallback.branchIndex, degree: 0 };
}

// ============================================================================
// 六、命宫 / 命度 / 洞微大限
// ============================================================================

/**
 * 命宫定法（古法口诀）：从太阳所在宫起生时（真太阳时时辰），
 * 顺数至卯安命。日出时辰法为变体（以出生地实际日出时辰代卯）。
 */
function calcMingGong(
  sunBranchIndex: number,
  hourBranchIndex: number,
  targetBranchIndex: number
): number {
  const offset = (targetBranchIndex - hourBranchIndex + 12) % 12;
  return (sunBranchIndex + offset) % 12;
}

/** 出生月序（节气月，太阳黄经定位）：寅月=0 … 丑月=11 */
function monthOrdinalAfterLiChun(sunLon: number): number {
  return Math.floor(norm360(sunLon - 315) / 30);
}

// ============================================================================
// 七、主入口：七政四余排盘
// ============================================================================

export function calcQizhengChart(input: QizhengInput): QizhengResult {
  const { year, month, day, hour, minute, lat, lon } = input;
  const tz = input.tzOffset ?? 8;
  const frame: StarFrame = input.frame ?? "tropical";
  const mingGongMode: MingGongMode = input.mingGongMode ?? "mao";
  const startBase: 9 | 10 = input.dongweiStart ?? 10;

  if (lat < -89.5 || lat > 89.5) {
    throw new Error("出生地纬度超出可计算范围（±89.5°），请检查出生地坐标");
  }

  // 出生地本地时间 → UTC
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0) - tz * 3600 * 1000;
  const date = new Date(utcMs);

  // ---- 真太阳时与时辰 ----
  const tzBaseLon = tz * 15;
  const longitudeOffsetMin = (lon - tzBaseLon) * 4;
  const eotMin = equationOfTimeMin(date);
  const totalOffsetMin = longitudeOffsetMin + eotMin;
  // 真太阳时按"本地钟面分钟 + 总校正"计算（日期边界取模回绕，时辰随之定）
  const localMinutes = hour * 60 + minute;
  const tsTotal = ((localMinutes + totalOffsetMin) % 1440 + 1440) % 1440;
  const tsHour = Math.floor(tsTotal / 60);
  const tsMin = Math.floor(tsTotal % 60);
  const trueSolarTimeStr = `${String(tsHour).padStart(2, "0")}:${String(tsMin).padStart(2, "0")}`;
  const hourBranchIndex = Math.floor(((tsHour + 1) % 24) / 2); // 23-1 → 子(0)

  // ---- 昼夜（太阳地平高度法，极圈内同样有效）----
  const observer = new Astronomy.Observer(lat, lon, 0);
  let isDay: boolean;
  try {
    const time = Astronomy.MakeTime(date);
    const geo = Astronomy.GeoVector(Astronomy.Body.Sun, date, true);
    const eqdSun = Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(time), geo);
    const { ra: raS, dec: decS } = Astronomy.EquatorFromVector(eqdSun);
    const gast = Astronomy.SiderealTime(date) * 15;
    const H = norm360(gast + lon - raS * 15);
    const sinAlt =
      Math.sin(lat * D2R) * Math.sin(decS * D2R) +
      Math.cos(lat * D2R) * Math.cos(decS * D2R) * Math.cos(H * D2R);
    isDay = Math.asin(Math.max(-1, Math.min(1, sinAlt))) > 0;
  } catch {
    isDay = hourBranchIndex >= 3 && hourBranchIndex <= 8; // 传感器级异常回退：寅酉之间作昼
  }
  // 日出日落数据（出生时刻所在白昼区段，供展示；搜索失败不影响判昼）
  let sunriseUtc: Date | null = null;
  let sunsetUtc: Date | null = null;
  try {
    // 出生前最近一次日出（25小时回溯窗保证取到当日/前日日出）
    const rise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, 1, new Date(utcMs - 25 * 3600 * 1000), 2);
    if (rise) {
      sunriseUtc = rise.date;
      const set = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, rise.date, 2);
      if (set) sunsetUtc = set.date;
    }
  } catch {
    // 极昼极夜无日出日落，仅展示为空
  }

  // ---- 二十八宿布度 ----
  const boundaries = computeXiuBoundaries(date);

  // ---- 宫制布局 ----
  const palaceLayout =
    frame === "tropical"
      ? ZHI.map((_, b) => ({ branchIndex: b, startLon: tropicalPalaceStart(b), width: 30 }))
      : siderealPalaceLayout(boundaries);
  const palaceOf = (l: number) =>
    frame === "tropical"
      ? tropicalPalaceOf(l)
      : siderealPalaceOf(l, palaceLayout as Array<{ branchIndex: number; startLon: number; width: number }>);

  // ---- 十一曜位置与速度 ----
  interface StarRaw {
    key: string; name: string; symbol: string; kind: "zheng" | "yu"; wuxing: string;
    lon: number; speed: number;
  }
  const rawStars: StarRaw[] = [];

  for (const def of ZHENG_DEFS) {
    const lonNow = bodyEclipticLon(def.body, date);
    const dtDay = def.key === "moon" ? 0.25 : 1; // 月亮差分步长缩短防相位跳变
    const lonPlus = bodyEclipticLon(def.body, new Date(utcMs + dtDay * 86400000));
    const lonMinus = bodyEclipticLon(def.body, new Date(utcMs - dtDay * 86400000));
    let diff = lonPlus - lonMinus;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    rawStars.push({ key: def.key, name: def.name, symbol: def.symbol, kind: "zheng", wuxing: def.wuxing, lon: lonNow, speed: diff / (2 * dtDay) });
  }

  const yuLonOf = (key: string, d: Date): number => {
    if (key === "qi") return qiLongitude(d);
    if (key === "luo") return meanToTrue(meanLunarNodeLon(d), d);
    if (key === "ji") return meanToTrue(norm360(meanLunarNodeLon(d) + 180), d);
    return meanToTrue(meanLunarApogeeLon(d), d); // bei
  };
  for (const def of YU_DEFS) {
    const lonNow = yuLonOf(def.key, date);
    const lonPlus = yuLonOf(def.key, new Date(utcMs + 86400000));
    const lonMinus = yuLonOf(def.key, new Date(utcMs - 86400000));
    let diff = lonPlus - lonMinus;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    rawStars.push({ key: def.key, name: def.name, symbol: def.symbol, kind: "yu", wuxing: def.wuxing, lon: lonNow, speed: diff / 2 });
  }

  // ---- 命宫 ----
  const sunRaw = rawStars.find((s) => s.key === "sun")!;
  const sunPalace = palaceOf(sunRaw.lon);
  let targetBranch = 3; // 卯
  if (mingGongMode === "sunrise" && sunriseUtc) {
    // 日出时辰法：日出真太阳时时辰（寅/卯/辰三种可能）
    const sunriseTrueMs = sunriseUtc.getTime() + totalOffsetMin * 60000;
    const srHours = ((Math.floor(sunriseTrueMs / 3600000) % 24) + 24) % 24;
    targetBranch = Math.floor(((srHours + 1) % 24) / 2);
    if (targetBranch < 2 || targetBranch > 4) targetBranch = 3; // 异常回退遇卯
  }
  const mingGongBranch = calcMingGong(sunPalace.branchIndex, hourBranchIndex, targetBranch);
  const mingGongLayout = palaceLayout[mingGongBranch];
  const mingGongStartLon = mingGongLayout.startLon;
  const mingGongWidth = mingGongLayout.width;

  // ---- 命度：命宫内与太阳同络（同宫内度数） ----
  const mingDuLon = norm360(mingGongStartLon + sunPalace.degree);
  const mingDuXiu = locateXiu(mingDuLon, boundaries);
  const mingDuMeta = XIU_META[mingDuXiu.index];

  // ---- 身宫 / 身度（太阴） ----
  const moonRaw = rawStars.find((s) => s.key === "moon")!;
  const moonPalace = palaceOf(moonRaw.lon);
  const shenDuXiu = locateXiu(moonRaw.lon, boundaries);
  const shenDuMeta = XIU_META[shenDuXiu.index];

  // ---- 人事宫（命宫起逆向排布） ----
  const renshiIndexOf = (branchIndex: number): number => {
    // 人事宫 k 在 (命宫 - (k-1)) mod 12 → k = (命宫 - branch) mod 12 + 1
    return ((mingGongBranch - branchIndex + 12) % 12) + 1;
  };

  // ---- 星位完整信息 ----
  const stars: StarPosition[] = rawStars.map((s) => {
    const pal = palaceOf(s.lon);
    const xiu = locateXiu(s.lon, boundaries);
    const xiuMeta = XIU_META[xiu.index];
    const palOwner = PALACE_OWNERS[pal.branchIndex];
    return {
      key: s.key,
      name: s.name,
      symbol: s.symbol,
      kind: s.kind,
      wuxing: s.wuxing,
      lon: s.lon,
      speed: s.speed,
      retrograde: s.speed < 0,
      palaceBranch: ZHI[pal.branchIndex],
      palaceDegree: pal.degree,
      renshiGong: RENSHI_GONG_NAMES[renshiIndexOf(pal.branchIndex) - 1],
      renshiIndex: renshiIndexOf(pal.branchIndex),
      xiuName: xiuMeta.name,
      xiuFullName: `${xiuMeta.name}${xiuMeta.wuxing}${xiuMeta.animal}`,
      xiuDegree: xiu.degree,
      xiuOwner: xiuMeta.owner,
      inYuan: palOwner.ownerKey === s.key,
      shengDian: xiuMeta.ownerKey === s.key,
    };
  });

  // ---- 十二宫信息 ----
  const palaces: PalaceInfo[] = palaceLayout.map((p) => {
    const starsIn = stars.filter((s) => s.palaceBranch === ZHI[p.branchIndex]).map((s) => s.key);
    const idx = renshiIndexOf(p.branchIndex);
    return {
      branch: ZHI[p.branchIndex],
      branchIndex: p.branchIndex,
      yinYang: p.branchIndex % 2 === 0 ? "阳" : "阴",
      owner: PALACE_OWNERS[p.branchIndex].owner,
      ownerKey: PALACE_OWNERS[p.branchIndex].ownerKey,
      startLon: p.startLon,
      width: p.width,
      renshiGong: RENSHI_GONG_NAMES[idx - 1],
      renshiIndex: idx,
      stars: starsIn,
    };
  });

  // ---- 二十八宿信息 ----
  const mansions: MansionInfo[] = XIU_META.map((meta, k) => {
    const start = boundaries[k];
    const width = norm360(boundaries[(k + 1) % 28] - start);
    const mid = norm360(start + width / 2);
    const pal = palaceOf(mid);
    return {
      index: k,
      name: meta.name,
      fullName: `${meta.name}${meta.wuxing}${meta.animal}`,
      owner: meta.owner,
      ownerKey: meta.ownerKey,
      wuxing: meta.wuxing,
      animal: meta.animal,
      startLon: start,
      width,
      palaceBranch: ZHI[pal.branchIndex],
    };
  });

  // ---- 洞微大限 ----
  // 出限虚岁 = 起岁基数 + 太阳宫内度占宫宽比例 × 10 + 节气月序/12
  //（九紫辰《洞微大限算法简总》：10 + 太阳度/3 + 月份；今制宫宽 30° 时即
  //  10 + 太阳度/3，月序按其规则注"寅月不加一、卯月才加一"取立春后整月数）
  const sunFrac = sunPalace.degree / palaceLayout[sunPalace.branchIndex].width;
  const monthOrd = monthOrdinalAfterLiChun(sunRaw.lon);
  const chuxianAge = startBase + sunFrac * 10 + monthOrd / 12;
  const chuxianYears = Math.floor(chuxianAge);
  const chuxianMonths = Math.round((chuxianAge - chuxianYears) * 12);

  const rows: DongweiRow[] = [];
  // 童限行命宫（出生 → 出限）
  rows.push({
    renshiGong: "命宫",
    palaceBranch: ZHI[mingGongBranch],
    startLon: mingGongStartLon,
    width: mingGongWidth,
    startAge: 1,
    endAge: chuxianAge,
    years: chuxianAge - 1,
    degPerYear: mingGongWidth / (chuxianAge - 1),
    isTongxian: true,
  });
  // 相貌→财帛诸宫（顺行，古法年数表）
  let cursorAge = chuxianAge;
  const DONGWEI_RENSHI = ["相貌", "福德", "官禄", "迁移", "疾厄", "妻妾", "奴仆", "男女", "田宅", "兄弟", "财帛"];
  for (let k = 0; k < DONGWEI_RENSHI.length; k++) {
    const branch = (mingGongBranch + 1 + k) % 12;
    const p = palaceLayout[branch];
    const years = DONGWEI_YEARS[k];
    rows.push({
      renshiGong: DONGWEI_RENSHI[k],
      palaceBranch: ZHI[branch],
      startLon: p.startLon,
      width: p.width,
      startAge: cursorAge,
      endAge: cursorAge + years,
      years,
      degPerYear: p.width / years,
      isTongxian: false,
    });
    cursorAge += years;
  }

  return {
    engineVersion: QIZHENG_ENGINE_VERSION,
    input: { ...input, tzOffset: tz, frame, mingGongMode, dongweiStart: startBase },
    frame,
    utcTime: date.toISOString().replace("T", " ").slice(0, 16) + " UTC",
    trueSolar: {
      longitudeOffsetMin: Math.round(longitudeOffsetMin * 100) / 100,
      equationOfTimeMin: Math.round(eotMin * 100) / 100,
      totalOffsetMin: Math.round(totalOffsetMin * 100) / 100,
      trueSolarTime: trueSolarTimeStr,
    },
    hour: { index: hourBranchIndex, name: `${ZHI[hourBranchIndex]}时`, branch: ZHI[hourBranchIndex] },
    dayNight: {
      isDay,
      sunriseUtc: sunriseUtc ? sunriseUtc.toISOString().replace("T", " ").slice(0, 16) : null,
      sunsetUtc: sunsetUtc ? sunsetUtc.toISOString().replace("T", " ").slice(0, 16) : null,
    },
    sun: {
      lon: sunRaw.lon,
      palaceBranch: ZHI[sunPalace.branchIndex],
      palaceDegree: sunPalace.degree,
      xiuName: stars.find((s) => s.key === "sun")!.xiuName,
      xiuDegree: stars.find((s) => s.key === "sun")!.xiuDegree,
    },
    mingGong: {
      branch: ZHI[mingGongBranch],
      branchIndex: mingGongBranch,
      startLon: mingGongStartLon,
      width: mingGongWidth,
      renshiIndex: 1,
    },
    mingDu: {
      lon: mingDuLon,
      palaceDegree: sunPalace.degree,
      xiuName: mingDuMeta.name,
      xiuFullName: `${mingDuMeta.name}${mingDuMeta.wuxing}${mingDuMeta.animal}`,
      xiuDegree: mingDuXiu.degree,
    },
    mingDuZhu: mingDuMeta.owner,
    mingYuanWuxing: mingDuMeta.wuxing,
    shenGong: {
      branch: ZHI[moonPalace.branchIndex],
      branchIndex: moonPalace.branchIndex,
      renshiIndex: renshiIndexOf(moonPalace.branchIndex),
    },
    shenDu: {
      lon: moonRaw.lon,
      xiuName: shenDuMeta.name,
      xiuFullName: `${shenDuMeta.name}${shenDuMeta.wuxing}${shenDuMeta.animal}`,
      xiuDegree: shenDuXiu.degree,
    },
    shenDuZhu: shenDuMeta.owner,
    palaces,
    mansions,
    stars,
    dongwei: {
      startBase,
      chuxianAge,
      chuxianText: `${chuxianYears}岁${chuxianMonths > 0 ? `${chuxianMonths}个月` : ""}`,
      rows,
    },
  };
}

// ============================================================================
// 八、行限查询工具
// ============================================================================

/** 查询某虚岁所在大限行（返回行与限度黄经、宿度） */
export function xianDuAtAge(
  result: QizhengResult,
  age: number
): { row: DongweiRow; lon: number; xiuName: string; xiuFullName: string; xiuDegree: number } | null {
  const row = result.dongwei.rows.find((r) => age >= r.startAge && age < r.endAge);
  if (!row) return null;
  const elapsed = age - row.startAge;
  const lon = norm360(row.startLon + row.degPerYear * elapsed);
  const boundaries = result.mansions.map((m) => m.startLon);
  const xiu = locateXiu(lon, boundaries);
  const meta = XIU_META[xiu.index];
  return { row, lon, xiuName: meta.name, xiuFullName: `${meta.name}${meta.wuxing}${meta.animal}`, xiuDegree: xiu.degree };
}

/** 常用城市经纬度预设（与占星模块一致，供前端选择器） */
export const QIZHENG_CITIES: Array<{ name: string; lat: number; lon: number; tz: number }> = [
  { name: "北京", lat: 39.9042, lon: 116.4074, tz: 8 },
  { name: "上海", lat: 31.2304, lon: 121.4737, tz: 8 },
  { name: "广州", lat: 23.1291, lon: 113.2644, tz: 8 },
  { name: "深圳", lat: 22.5431, lon: 114.0579, tz: 8 },
  { name: "杭州", lat: 30.2741, lon: 120.1551, tz: 8 },
  { name: "成都", lat: 30.5728, lon: 104.0668, tz: 8 },
  { name: "重庆", lat: 29.563, lon: 106.5516, tz: 8 },
  { name: "武汉", lat: 30.5928, lon: 114.3055, tz: 8 },
  { name: "西安", lat: 34.3416, lon: 108.9398, tz: 8 },
  { name: "南京", lat: 32.0603, lon: 118.7969, tz: 8 },
  { name: "天津", lat: 39.3434, lon: 117.3616, tz: 8 },
  { name: "长沙", lat: 28.2282, lon: 112.9388, tz: 8 },
  { name: "郑州", lat: 34.7466, lon: 113.6254, tz: 8 },
  { name: "福州", lat: 26.0745, lon: 119.2965, tz: 8 },
  { name: "厦门", lat: 24.4798, lon: 118.0894, tz: 8 },
  { name: "昆明", lat: 25.0389, lon: 102.7183, tz: 8 },
  { name: "贵阳", lat: 26.6477, lon: 106.6302, tz: 8 },
  { name: "南宁", lat: 22.817, lon: 108.3665, tz: 8 },
  { name: "哈尔滨", lat: 45.8038, lon: 126.5349, tz: 8 },
  { name: "沈阳", lat: 41.8057, lon: 123.4315, tz: 8 },
  { name: "济南", lat: 36.6512, lon: 117.1201, tz: 8 },
  { name: "青岛", lat: 36.0671, lon: 120.3826, tz: 8 },
  { name: "苏州", lat: 31.2989, lon: 120.5853, tz: 8 },
  { name: "合肥", lat: 31.8206, lon: 117.2272, tz: 8 },
  { name: "南昌", lat: 28.682, lon: 115.8579, tz: 8 },
  { name: "太原", lat: 37.8706, lon: 112.5486, tz: 8 },
  { name: "兰州", lat: 36.0611, lon: 103.8343, tz: 8 },
  { name: "乌鲁木齐", lat: 43.8256, lon: 87.6168, tz: 8 },
  { name: "拉萨", lat: 29.65, lon: 91.1, tz: 8 },
  { name: "海口", lat: 20.0444, lon: 110.1999, tz: 8 },
  { name: "长春", lat: 43.8171, lon: 125.3235, tz: 8 },
  { name: "石家庄", lat: 38.0428, lon: 114.5149, tz: 8 },
];
