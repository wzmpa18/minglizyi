/**
 * 专业罗盘门派圈层引擎（LUOPAN_PROFILE_ENGINE）- NICHE-TOOLS-08 v25.0.69
 * ============================================================================
 * 来源与协议（净室声明）：
 *   本模块为数据+几何层，不输出吉凶断语（吉凶标记仅输出通行口径的
 *   "旺相/孤虚/空亡"分类名，释义文案由页面配置）。
 *   各圈层数据来源（SOURCE）、排布规则（RULE）、验证方法（TEST）逐圈标注，
 *   全部基于公开通行文献口径独立实现，未逆向工程或复制任何 AGPL 源码：
 *   - 三针体系（地盘正针/人盘中针/天盘缝针）：地盘立向格龙、人盘消砂（赖公，
 *     相对地盘逆时针偏移 7.5°）、天盘纳水（相对地盘顺时针偏移 7.5°），
 *     通行罗经口径（《罗经透解》以降的制式）。
 *   - 二十八宿开禧宿度：南宋开禧历实测宿度（风水界通用"开禧盘"），
 *     周天 365.25 古度；地盘正针子山正中为虚宿/危宿分界（开禧盘定位标志）；
 *     宿序沿罗盘逆时针排布（黄经减序）。时宪盘（清）虚危分界已西移约 11°，
 *     本引擎从通行主流口径用开禧盘。
 *   - 穿山七十二龙：每龙 5°，分支系法排布——每地支的五组干支（阳支甲丙戊庚壬、
 *     阴支乙丁己辛癸）中，首干支居前一干维山之末龙，中间三干支居本支山三龙，
 *     末干支居后一干山之首龙；八干四维山正中一龙为空亡（罗盘上或标本干维字）。
 *     甲子起壬山之末 [347.5°,352.5°]。
 *   - 透地六十龙：每龙 6°，双山体系（壬子/癸丑/艮寅/甲卯/乙辰/巽巳/丙午/丁未/
 *     坤申/庚酉/辛戌/乾亥十二组，每组两山五龙），甲子起壬初 337.5°。
 *   - 一百二十分金：每分金 3°，每山 5 格；地支山配本支五组干支（自靠前山边界
 *     顺排），干维山借用前一位地支山的分金；丙丁庚辛为旺相（48 格可用），
 *     甲壬阳孤、乙癸阴虚、戊己龟甲空亡（《协纪辨方书》通行口径，源于八卦纳甲）。
 *   - 二十四节气（太阳到山盘）：立春起壬山逆时针排列，冬至到丑山
 *     （《协纪辨方书》太阳到山定局通行口径）。
 *   - 赖公拨砂五行：子午卯酉太阳火、甲庚丙壬太阴火、乾坤艮巽木、
 *     乙辛丁癸土、辰戌丑未金、寅申巳亥水（赖公《催官篇》拨砂诀）。
 *   - 玄空阴阳/三元：与本工程玄空飞星模块（xuankong-feixing）SHAN_LONG 表
 *     同源对齐（顺=阳、逆=阴），六十四卦圈因排布口径需另行考证，按
 *     "仅verified圈层"原则暂不纳入（见 EXCLUDED_RINGS 说明）。
 * 日期：2026-08-31 创建（v25.0.69）
 * ============================================================================
 */

import { JIAZI_TABLE, GAN, ZHI, NAYIN_TABLE } from "../../common/ganzhi";

/** 引擎数据版本（合规可追溯标识） */
export const LUOPAN_PROFILE_ENGINE_VERSION =
  "罗盘门派圈层引擎 v25.0.70（三合/三元/玄空 Profile；开禧宿度/穿山透地/分金/节气/拨砂全圈层）";

// ============================================================================
// 一、类型定义
// ============================================================================

/** 门派 */
export type LuopanSchool = "sanhe" | "sanyuan" | "xuankong";

/** 圈层类别 */
export type RingKind =
  | "degree"      // 度数刻度
  | "shan24"      // 二十四山（可带三针偏移）
  | "fenjin120"   // 一百二十分金
  | "long72"      // 穿山七十二龙
  | "long60"      // 透地六十龙
  | "xiu28"       // 二十八宿
  | "jieqi24"     // 二十四节气（太阳到山）
  | "bagua8"      // 八卦
  | "bowuxing24"; // 二十四山拨砂五行

/** 分金吉凶分类（通行口径名称，非断语） */
export type FenjinGrade = "旺相" | "阳孤" | "阴虚" | "龟甲空亡";

/** 圈层扇区 */
export interface RingSector {
  /** 主标签（干支/山名/宿名/节气/卦名等） */
  label: string;
  /** 起始角（度，0=正北顺时针，含） */
  start: number;
  /** 结束角（度，不含；允许 >360 表跨零） */
  end: number;
  /** 次级标签（纳音/五行/度数等） */
  sub?: string;
  /** 色调分类：旺相/空亡/普通 */
  tone?: "wang" | "blank" | "normal";
}

/** 圈层定义 */
export interface LuopanRing {
  id: string;
  name: string;
  kind: RingKind;
  /** SOURCE：数据来源 */
  source: string;
  /** RULE：排布规则 */
  rule: string;
  /** TEST：验证方法 */
  test: string;
  /** 扇区列表（自正北顺时针） */
  sectors: RingSector[];
  /** 渲染建议：标签字号级数（越小字越大） */
  labelScale?: number;
}

/** 门派 Profile */
export interface LuopanProfile {
  id: LuopanSchool;
  name: string;
  desc: string;
  /** 圈层列表（自外向内） */
  rings: LuopanRing[];
}

/** 圈层读数 */
export interface RingReading {
  ringId: string;
  ringName: string;
  kind: RingKind;
  /** 命中扇区标签 */
  label: string;
  /** 次级信息 */
  sub?: string;
  /** 附加说明（如穿山空亡、分金吉凶、入宿度） */
  note?: string;
}

// ============================================================================
// 二、基础几何工具
// ============================================================================

/** 角度归一化到 [0,360) */
function norm360(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/** 角度是否落在 [start,end) 扇区内（支持跨零扇区） */
function inSector(heading: number, s: RingSector): boolean {
  const h = norm360(heading);
  let st = norm360(s.start);
  let en = norm360(s.end);
  if (en <= st) en += 360; // 跨零
  let hh = h;
  if (hh < st) hh += 360;
  return hh >= st && hh < en;
}

// ============================================================================
// 三、基础数据表（SOURCE 均为通行公开口径）
// ============================================================================

/** 二十四山名（自正北顺时针，子=0°起） */
export const SHAN_NAMES = [
  "子", "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳", "丙",
  "午", "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥", "壬",
] as const;

/** 山中心角（度）：子=0，每山15° */
export function shanCenter(name: string): number {
  const i = SHAN_NAMES.indexOf(name as (typeof SHAN_NAMES)[number]);
  if (i < 0) throw new Error(`未知山名: ${name}`);
  return i * 15;
}

/**
 * 开禧宿度表（二十八宿，古度）
 * SOURCE: 南宋《开禧历》实测宿度（风水通用"开禧盘"）
 * RULE: 周天365.25古度；虚宿/危宿分界锚定地盘子山正中（0°），宿序逆时针
 * TEST: 各宿宽度求和=365.25；虚|危分界=0°；角宿应落114°~126°区间
 */
export const XIU_28: Array<{
  name: string;      // 宿名
  animal: string;    // 动物（角木蛟）
  width: number;     // 开禧宿度（古度）
  boWuXing: string;  // 拨砂五行（日月宿属火）
}> = [
  { name: "角", animal: "角木蛟", width: 12.75, boWuXing: "木" },
  { name: "亢", animal: "亢金龙", width: 9.75, boWuXing: "金" },
  { name: "氐", animal: "氐土貉", width: 16.25, boWuXing: "土" },
  { name: "房", animal: "房日兔", width: 5.75, boWuXing: "火" },
  { name: "心", animal: "心月狐", width: 6.0, boWuXing: "火" },
  { name: "尾", animal: "尾火虎", width: 18.0, boWuXing: "火" },
  { name: "箕", animal: "箕水豹", width: 9.5, boWuXing: "水" },
  { name: "斗", animal: "斗木獬", width: 22.75, boWuXing: "木" },
  { name: "牛", animal: "牛金牛", width: 7.0, boWuXing: "金" },
  { name: "女", animal: "女土蝠", width: 11.0, boWuXing: "土" },
  { name: "虚", animal: "虚日鼠", width: 9.25, boWuXing: "火" },
  { name: "危", animal: "危月燕", width: 16.0, boWuXing: "火" },
  { name: "室", animal: "室火猪", width: 18.25, boWuXing: "火" },
  { name: "壁", animal: "壁水貐", width: 9.75, boWuXing: "水" },
  { name: "奎", animal: "奎木狼", width: 18.0, boWuXing: "木" },
  { name: "娄", animal: "娄金狗", width: 12.75, boWuXing: "金" },
  { name: "胃", animal: "胃土雉", width: 15.25, boWuXing: "土" },
  { name: "昴", animal: "昴日鸡", width: 11.0, boWuXing: "火" },
  { name: "毕", animal: "毕月乌", width: 16.5, boWuXing: "火" },
  { name: "觜", animal: "觜火猴", width: 0.5, boWuXing: "火" },
  { name: "参", animal: "参水猿", width: 9.5, boWuXing: "水" },
  { name: "井", animal: "井木犴", width: 30.25, boWuXing: "木" },
  { name: "鬼", animal: "鬼金羊", width: 2.5, boWuXing: "金" },
  { name: "柳", animal: "柳土獐", width: 13.5, boWuXing: "土" },
  { name: "星", animal: "星日马", width: 6.75, boWuXing: "火" },
  { name: "张", animal: "张月鹿", width: 17.75, boWuXing: "火" },
  { name: "翼", animal: "翼火蛇", width: 20.25, boWuXing: "火" },
  { name: "轸", animal: "轸水蚓", width: 18.75, boWuXing: "水" },
];

/** 开禧宿度总和（365.25 古度） */
export const XIU_28_TOTAL = XIU_28.reduce((s, x) => s + x.width, 0);

/** 古度→现代度换算系数 */
const GU2MOD = 360 / 365.25;

/**
 * 二十四节气太阳到山表（自立春起，逆时针）
 * SOURCE: 《协纪辨方书》太阳到山定局（罗盘通行"太阳到山盘"）
 * RULE: 立春起壬山（中心345°），节气逆时针排列，每节气一山（15°），冬至到丑
 * TEST: 立春中心=345°、冬至中心=30°、夏至中心=210°（未山）
 */
export const JIEQI_SUN_SHAN: Array<{ jieqi: string; shan: string }> = [
  { jieqi: "立春", shan: "壬" }, { jieqi: "雨水", shan: "亥" }, { jieqi: "惊蛰", shan: "乾" },
  { jieqi: "春分", shan: "戌" }, { jieqi: "清明", shan: "辛" }, { jieqi: "谷雨", shan: "酉" },
  { jieqi: "立夏", shan: "庚" }, { jieqi: "小满", shan: "申" }, { jieqi: "芒种", shan: "坤" },
  { jieqi: "夏至", shan: "未" }, { jieqi: "小暑", shan: "丁" }, { jieqi: "大暑", shan: "午" },
  { jieqi: "立秋", shan: "丙" }, { jieqi: "处暑", shan: "巳" }, { jieqi: "白露", shan: "巽" },
  { jieqi: "秋分", shan: "辰" }, { jieqi: "寒露", shan: "乙" }, { jieqi: "霜降", shan: "卯" },
  { jieqi: "立冬", shan: "甲" }, { jieqi: "小雪", shan: "寅" }, { jieqi: "大雪", shan: "艮" },
  { jieqi: "冬至", shan: "丑" }, { jieqi: "小寒", shan: "癸" }, { jieqi: "大寒", shan: "子" },
];

/**
 * 赖公拨砂五行（二十四山）
 * SOURCE: 赖公《催官篇》拨砂诀（人盘消砂用）
 * RULE: 子午卯酉太阳火、甲庚丙壬太阴火、乾坤艮巽本属木、乙辛丁癸便属土、
 *       辰戌丑未即是金、寅申巳亥皆属水
 * TEST: 逐山对拍口诀；火8山、木4山、土4山、金4山、水4山
 */
export const BO_WUXING_SHAN: Record<string, { wuxing: string; note: string }> = {
  "子": { wuxing: "火", note: "太阳火" }, "午": { wuxing: "火", note: "太阳火" },
  "卯": { wuxing: "火", note: "太阳火" }, "酉": { wuxing: "火", note: "太阳火" },
  "甲": { wuxing: "火", note: "太阴火" }, "庚": { wuxing: "火", note: "太阴火" },
  "丙": { wuxing: "火", note: "太阴火" }, "壬": { wuxing: "火", note: "太阴火" },
  "乾": { wuxing: "木", note: "" }, "坤": { wuxing: "木", note: "" },
  "艮": { wuxing: "木", note: "" }, "巽": { wuxing: "木", note: "" },
  "乙": { wuxing: "土", note: "" }, "辛": { wuxing: "土", note: "" },
  "丁": { wuxing: "土", note: "" }, "癸": { wuxing: "土", note: "" },
  "辰": { wuxing: "金", note: "" }, "戌": { wuxing: "金", note: "" },
  "丑": { wuxing: "金", note: "" }, "未": { wuxing: "金", note: "" },
  "寅": { wuxing: "水", note: "" }, "申": { wuxing: "水", note: "" },
  "巳": { wuxing: "水", note: "" }, "亥": { wuxing: "水", note: "" },
};

/** 阳支（子寅辰午申戌）/阴支（丑卯巳未酉亥） */
const YANG_ZHI = ["子", "寅", "辰", "午", "申", "戌"];
const YIN_ZHI = ["丑", "卯", "巳", "未", "酉", "亥"];

/** 八干四维山（正中一龙为空亡） */
const GAN_WEI_SHAN = ["甲", "乙", "丙", "丁", "庚", "辛", "壬", "癸", "乾", "坤", "艮", "巽"];

/** 分金天干 → 吉凶分类（纳甲原理：乾纳甲壬孤阳、坤纳乙癸阴虚、坎戊离己空亡、震庚巽辛艮丙兑丁旺相） */
export function fenjinGrade(ganzhi: string): FenjinGrade {
  const gan = ganzhi[0];
  switch (gan) {
    case "丙": case "丁": case "庚": case "辛": return "旺相";
    case "甲": case "壬": return "阳孤";
    case "乙": case "癸": return "阴虚";
    case "戊": case "己": return "龟甲空亡";
    default: return "龟甲空亡";
  }
}

// ============================================================================
// 四、圈层构建
// ============================================================================

/**
 * 圈层1：360°度数刻度圈
 */
function buildDegreeRing(): LuopanRing {
  return {
    id: "degree",
    name: "度数刻度圈",
    kind: "degree",
    source: "通行公制刻度（现代罗盘外圈标准配置）",
    rule: "周天360°，每2°一刻度、每10°一长刻度、每30°标数字",
    test: "刻度总数180格；0°/90°/180°/270°分别对子/卯/午/酉山正中",
    sectors: [],
  };
}

/**
 * 圈层：二十四山（可指定三针偏移）
 * @param offsetDeg 0=地盘正针；-7.5=人盘中针（逆时针）；+7.5=天盘缝针（顺时针）
 */
function buildShan24Ring(
  id: string,
  name: string,
  offsetDeg: number,
  source: string,
  rule: string,
  test: string,
): LuopanRing {
  const sectors: RingSector[] = SHAN_NAMES.map((n) => {
    const c = shanCenter(n) + offsetDeg;
    return { label: n, start: norm360(c - 7.5), end: norm360(c - 7.5) + 15, tone: "normal" as const };
  });
  return { id, name, kind: "shan24", source, rule, test, sectors };
}

/**
 * 圈层：赖公拨砂五行（人盘系，-7.5°）
 */
function buildBoWuXingRing(): LuopanRing {
  const sectors: RingSector[] = SHAN_NAMES.map((n) => {
    const c = shanCenter(n) - 7.5; // 人盘系
    const b = BO_WUXING_SHAN[n];
    return {
      label: n,
      sub: b.wuxing,
      start: norm360(c - 7.5),
      end: norm360(c - 7.5) + 15,
      tone: "normal" as const,
    };
  });
  return {
    id: "renpan-bowuxing",
    name: "赖公拨砂五行",
    kind: "bowuxing24",
    source: "赖公《催官篇》拨砂诀（人盘消砂专用）",
    rule: "子午卯酉太阳火、甲庚丙壬太阴火、乾坤艮巽属木、乙辛丁癸属土、辰戌丑未属金、寅申巳亥属水；随人盘中针（-7.5°）排布",
    test: "火8山/木4/土4/金4/水4；逐山对拍拨砂诀",
    sectors,
    labelScale: 2,
  };
}

/**
 * 圈层：二十八宿（开禧宿度）
 * RULE: 虚|危分界锚定0°（子山正中），宿序逆时针（黄经减序），365.25古度线性映射360°
 */
function buildXiu28Ring(): LuopanRing {
  const sectors: RingSector[] = [];
  // 逆时针排布：从虚|危分界（0°）起，顺时针方向依次为 虚、女、牛、斗…（宿序之逆）
  // 即：虚 [0, w虚]，女 [w虚, w虚+w女]，……危 收尾于 360°
  // 宿序（角→轸）为逆时针，故顺时针展开顺序为：虚 女 牛 斗 箕 尾 心 房 氐 亢 角 轸 翼 张 星 柳 鬼 井 参 觜 毕 昴 胃 娄 奎 壁 室 危
  const cwOrder = [
    "虚", "女", "牛", "斗", "箕", "尾", "心", "房", "氐", "亢", "角",
    "轸", "翼", "张", "星", "柳", "鬼", "井", "参", "觜", "毕", "昴",
    "胃", "娄", "奎", "壁", "室", "危",
  ];
  let acc = 0; // 现代度累计（自0°顺时针）
  for (const nm of cwOrder) {
    const x = XIU_28.find((v) => v.name === nm)!;
    const w = x.width * GU2MOD;
    sectors.push({
      label: x.animal,
      sub: `${x.width}度`,
      start: acc,
      end: acc + w,
      tone: "normal",
    });
    acc += w;
  }
  return {
    id: "xiu28",
    name: "二十八宿（开禧宿度）",
    kind: "xiu28",
    source: "南宋《开禧历》实测宿度（风水通用开禧盘，总365.25古度）",
    rule: "虚宿/危宿分界锚定地盘子山正中（0°），宿序逆时针排布（黄经减序），365.25古度线性映射360°现代度",
    test: "各宿宽度求和=365.25古度；虚|危分界=0°；角宿落114°~126°区间（对拍市面360°天星盘）",
    sectors,
    labelScale: 2,
  };
}

/**
 * 圈层：二十四节气（太阳到山盘）
 */
function buildJieqi24Ring(): LuopanRing {
  const sectors: RingSector[] = JIEQI_SUN_SHAN.map((t) => {
    const c = shanCenter(t.shan); // 节气中心=山中心
    return { label: t.jieqi, start: norm360(c - 7.5), end: norm360(c - 7.5) + 15, tone: "normal" as const };
  });
  return {
    id: "jieqi24",
    name: "二十四节气（太阳到山）",
    kind: "jieqi24",
    source: "《协纪辨方书》太阳到山定局（罗盘通行太阳到山盘）",
    rule: "立春起壬山，节气逆时针排列，每节气一山（15°）；冬至到丑、夏至到未",
    test: "立春中心=345°、冬至中心=30°、夏至中心=210°；全圈24节气无重复",
    sectors,
    labelScale: 2,
  };
}

/**
 * 圈层：一百二十分金
 * @param offsetDeg 0=地盘系；+7.5=天盘系
 * RULE: 每山5格×3°；地支山配本支五组干支（自靠前山边界顺排）；
 *       干维山借用前一位地支山的分金排法；丙丁庚辛旺相（标红可用）
 */
function buildFenjin120Ring(id: string, name: string, offsetDeg: number, sourceNote: string): LuopanRing {
  const sectors: RingSector[] = [];
  // 前一位地支山的支系（用于干维山借排）：干维山X ← 逆时针方向最近的支山
  const prevZhiOf: Record<string, string> = {};
  for (let i = 0; i < 24; i++) {
    // 找每个山之前一位（逆时针邻山）
    const prev = SHAN_NAMES[(i + 23) % 24];
    if (YANG_ZHI.includes(prev) || YIN_ZHI.includes(prev)) {
      // 当前山为干维山时，其前一位若为支山则记录；若前一位也是干维，需继续回溯
      let p = prev;
      let k = 1;
      while (!(YANG_ZHI.includes(p) || YIN_ZHI.includes(p))) {
        k++;
        p = SHAN_NAMES[(i + 24 - k) % 24];
      }
      prevZhiOf[SHAN_NAMES[i]] = p;
    }
  }
  for (let i = 0; i < 24; i++) {
    const shan = SHAN_NAMES[i];
    // 本山分金所用支系：支山用本支；干维山用前一位支山
    const zhi = YANG_ZHI.includes(shan) || YIN_ZHI.includes(shan)
      ? shan
      : prevZhiOf[shan];
    // 该支的五组干支（阳支甲丙戊庚壬/阴支乙丁己辛癸）
    const stems = YANG_ZHI.includes(zhi)
      ? ["甲", "丙", "戊", "庚", "壬"]
      : ["乙", "丁", "己", "辛", "癸"];
    const base = norm360(i * 15 - 7.5 + offsetDeg); // 本山靠前山边界
    for (let j = 0; j < 5; j++) {
      const gz = `${stems[j]}${zhi}`;
      const grade = fenjinGrade(gz);
      sectors.push({
        label: gz,
        sub: NAYIN_TABLE[gz] ?? "",
        start: base + j * 3,
        end: base + j * 3 + 3,
        tone: grade === "旺相" ? "wang" : "blank",
      });
    }
  }
  return {
    id,
    name,
    kind: "fenjin120",
    source: `通行罗经分金体系（源于八卦纳甲：乾纳甲壬、坤纳乙癸、坎纳戊、离纳己、震纳庚、巽纳辛、艮纳丙、兑纳丁）${sourceNote}`,
    rule: "每山5格、每格3°共120分金；地支山配本支五组干支（自靠前山边界顺时针排），干维山借用前一位地支山分金；丙丁庚辛为旺相分金（48格），甲壬阳孤、乙癸阴虚、戊己龟甲空亡",
    test: "120格×3°=360°；子山=甲子/丙子/戊子/庚子/壬子（壬子边界→癸山边界）；旺相格数=48",
    sectors,
    labelScale: 3,
  };
}

/**
 * 圈层：穿山七十二龙
 * RULE: 每龙5°；分支系法——每支五组干支：首干支居前一干维山末龙，
 *       中三干支居本支山三龙，末干支居后一干山首龙；干维山正中为空亡
 */
function buildLong72Ring(): LuopanRing {
  const sectors: RingSector[] = [];
  // 槽位序号0..71，每槽5°；槽k起始角=norm360(347.5+5k)，即甲子锚定壬山之末[347.5°,352.5°]
  // 山i（中心15i°）占槽 (3i+1)%72、(3i+2)%72、(3i+3)%72（自靠前山边界起三槽）
  // 分支系法排干支：对每个支山系列（如子：甲丙戊庚壬），甲子置于壬山末槽，
  // 丙戊庚居子山三槽，壬子居癸山首槽
  const zhiStems: Record<string, string[]> = {};
  for (const z of YANG_ZHI) zhiStems[z] = ["甲", "丙", "戊", "庚", "壬"];
  for (const z of YIN_ZHI) zhiStems[z] = ["乙", "丁", "己", "辛", "癸"];

  // 初始化72槽
  const slots: Array<{ label: string; tone: "normal" | "blank"; sub?: string }> = [];
  for (let k = 0; k < 72; k++) slots.push({ label: "", tone: "normal" });

  // 山索引→槽位：山i的三槽为 (3i+1)%72 起连续三槽（pos=0靠前山边界）
  const slotOf = (shanIdx: number, pos: 0 | 1 | 2) => (3 * shanIdx + 1 + pos) % 72;

  for (let i = 0; i < 24; i++) {
    const shan = SHAN_NAMES[i];
    if (YANG_ZHI.includes(shan) || YIN_ZHI.includes(shan)) {
      // 支山：本山三槽放中三干支
      const stems = zhiStems[shan];
      for (let j = 1; j <= 3; j++) {
        const gz = `${stems[j]}${shan}`;
        slots[slotOf(i, (j - 1) as 0 | 1 | 2)] = {
          label: gz,
          tone: "normal",
          sub: NAYIN_TABLE[gz] ?? "",
        };
      }
      // 首干支 → 前一干维山末槽（山i-1的槽2）
      const first = `${stems[0]}${shan}`;
      slots[slotOf((i + 23) % 24, 2)] = { label: first, tone: "normal", sub: NAYIN_TABLE[first] ?? "" };
      // 末干支 → 后一干山首槽（山i+1的槽0）
      const last = `${stems[4]}${shan}`;
      slots[slotOf((i + 1) % 24, 0)] = { label: last, tone: "normal", sub: NAYIN_TABLE[last] ?? "" };
    }
  }
  // 干维山正中槽设空亡（未被干支占用的即是；显式覆盖保证）
  for (let i = 0; i < 24; i++) {
    const shan = SHAN_NAMES[i];
    if (GAN_WEI_SHAN.includes(shan)) {
      slots[slotOf(i, 1)] = { label: shan, tone: "blank", sub: "空亡" };
    }
  }

  for (let k = 0; k < 72; k++) {
    const s = slots[k];
    const start = norm360(347.5 + 5 * k);
    sectors.push({ label: s.label, sub: s.sub, start, end: start + 5, tone: s.tone });
  }
  return {
    id: "chuanshan72",
    name: "穿山七十二龙",
    kind: "long72",
    source: "通行罗经穿山虎体系（杨公《宝镜》一系口诀）",
    rule: "每龙5°共72龙；分支系法：每地支五组干支（阳支甲丙戊庚壬/阴支乙丁己辛癸），首干支居前一干维山末龙、中三干支居本支山、末干支居后一干山首龙；八干四维山正中一龙为空亡；甲子起壬山之末[347.5°,352.5°]",
    test: "72×5°=360°；甲子=[347.5,352.5]；子山三龙=丙子/戊子/庚子；壬山三龙=癸亥/空亡/甲子；60甲子各现一次+12空亡",
    sectors,
    labelScale: 3,
  };
}

/**
 * 圈层：透地六十龙
 * RULE: 每龙6°；双山体系（壬子/癸丑/艮寅/…/乾亥十二组，每组两山五龙）；
 *       甲子起壬初337.5°，每组配本支五组干支顺排
 */
function buildLong60Ring(): LuopanRing {
  const sectors: RingSector[] = [];
  // 双山组（自壬初起顺时针）：[壬子][癸丑][艮寅][甲卯][乙辰][巽巳][丙午][丁未][坤申][庚酉][辛戌][乾亥]
  const groups: Array<{ shanA: string; shanB: string; zhi: string }> = [
    { shanA: "壬", shanB: "子", zhi: "子" },
    { shanA: "癸", shanB: "丑", zhi: "丑" },
    { shanA: "艮", shanB: "寅", zhi: "寅" },
    { shanA: "甲", shanB: "卯", zhi: "卯" },
    { shanA: "乙", shanB: "辰", zhi: "辰" },
    { shanA: "巽", shanB: "巳", zhi: "巳" },
    { shanA: "丙", shanB: "午", zhi: "午" },
    { shanA: "丁", shanB: "未", zhi: "未" },
    { shanA: "坤", shanB: "申", zhi: "申" },
    { shanA: "庚", shanB: "酉", zhi: "酉" },
    { shanA: "辛", shanB: "戌", zhi: "戌" },
    { shanA: "乾", shanB: "亥", zhi: "亥" },
  ];
  let acc = 337.5; // 甲子起壬初
  for (const g of groups) {
    const stems = YANG_ZHI.includes(g.zhi)
      ? ["甲", "丙", "戊", "庚", "壬"]
      : ["乙", "丁", "己", "辛", "癸"];
    for (let j = 0; j < 5; j++) {
      const gz = `${stems[j]}${g.zhi}`;
      sectors.push({
        label: gz,
        sub: NAYIN_TABLE[gz] ?? "",
        start: acc,
        end: acc + 6,
        tone: "normal",
      });
      acc += 6;
    }
  }
  return {
    id: "toudi60",
    name: "透地六十龙",
    kind: "long60",
    source: "通行罗经天纪透地体系（双山五行一系）",
    rule: "每龙6°共60龙；十二双山组（壬子/癸丑/艮寅/甲卯/乙辰/巽巳/丙午/丁未/坤申/庚酉/辛戌/乾亥）每组两山五龙，配本支五组干支顺排；甲子起壬山之初（337.5°）",
    test: "60×6°=360°；甲子=[337.5,343.5]；戊子跨壬|子边界（352.5°）半布壬山半居子山；60甲子各现一次",
    sectors,
    labelScale: 3,
  };
}

/**
 * 圈层：后天八卦（八方位45°）
 */
function buildBagua8Ring(): LuopanRing {
  const gua = [
    { name: "坎", center: 0 }, { name: "艮", center: 45 }, { name: "震", center: 90 },
    { name: "巽", center: 135 }, { name: "离", center: 180 }, { name: "坤", center: 225 },
    { name: "兑", center: 270 }, { name: "乾", center: 315 },
  ];
  const sectors: RingSector[] = gua.map((g) => ({
    label: g.name,
    start: norm360(g.center - 22.5),
    end: norm360(g.center - 22.5) + 45,
    tone: "normal" as const,
  }));
  return {
    id: "bagua8",
    name: "后天八卦",
    kind: "bagua8",
    source: "《周易·说卦》后天八卦方位（通行罗盘内圈）",
    rule: "坎北0°、艮东北45°、震东90°、巽东南135°、离南180°、坤西南225°、兑西270°、乾西北315°，每卦45°",
    test: "坎中心=0°、离中心=180°；八卦方位对拍《说卦》",
    sectors,
    labelScale: 1,
  };
}

/**
 * 圈层：玄空三元阴阳（二十四山挨星阴阳，与玄空飞星模块同源）
 * RULE: 阳顺阴逆；取 xuankong-feixing 模块 SHAN_LONG 同源口径
 */
function buildXuankongYinYangRing(): LuopanRing {
  // 与 src/algorithm-core/modules/xuankong-feixing SHAN_LONG 同源（顺=阳、逆=阴）
  const yinYang: Record<string, "阳" | "阴"> = {
    "壬": "阳", "子": "阳", "癸": "阴", "丑": "阴", "艮": "阳", "寅": "阳",
    "甲": "阳", "卯": "阴", "乙": "阴", "辰": "阳", "巽": "阴", "巳": "阴",
    "丙": "阳", "午": "阳", "丁": "阴", "未": "阴", "坤": "阳", "申": "阳",
    "庚": "阳", "酉": "阴", "辛": "阴", "戌": "阳", "乾": "阳", "亥": "阴",
  };
  const yuanLong: Record<string, string> = {
    "壬": "地", "子": "天", "癸": "人", "丑": "地", "艮": "天", "寅": "人",
    "甲": "地", "卯": "天", "乙": "人", "辰": "地", "巽": "天", "巳": "人",
    "丙": "地", "午": "天", "丁": "人", "未": "地", "坤": "天", "申": "人",
    "庚": "地", "酉": "天", "辛": "人", "戌": "地", "乾": "天", "亥": "人",
  };
  const sectors: RingSector[] = SHAN_NAMES.map((n) => {
    const c = shanCenter(n);
    return {
      label: n,
      sub: yinYang[n],
      start: norm360(c - 7.5),
      end: norm360(c - 7.5) + 15,
      tone: "normal" as const,
    };
  });
  return {
    id: "xuankong-yinyang",
    name: "玄空阴阳（元龙）",
    kind: "shan24",
    source: "本工程玄空飞星模块 SHAN_LONG 表同源（《沈氏玄空学》三元挨星阴阳）",
    rule: "二十四山分天地人元龙；阳顺飞阴逆飞（子艮寅甲辰丙午坤申庚戌乾壬为阳，癸卯乙巽巳丁未酉辛亥为阴——与飞星下卦顺逆一致）",
    test: "与 xuankong-feixing 模块 SHAN_LONG 表逐山对拍（顺=阳、逆=阴）",
    sectors,
    labelScale: 2,
  };
}

// ============================================================================
// 五、门派 Profile 组装
// ============================================================================

/** 因排布口径未完成权威考证而排除的圈层（仅verified原则） */
export const EXCLUDED_RINGS: Array<{ name: string; reason: string }> = [
  {
    name: "先天六十四卦圆图圈（三元易盘）",
    reason: "邵雍先天六十四卦圆图各卦在360°上的精确锚点存在多种制式口径，未经权威文献逐卦考证前不纳入（仅verified圈层原则）",
  },
  {
    name: "时宪盘（清代）二十八宿",
    reason: "时宪宿度虚危分界较开禧盘西移约11°，与开禧盘二选一；本引擎从风水界主流开禧盘口径",
  },
];

/** 三合盘 Profile（12圈层+天池） */
export function buildSanheProfile(): LuopanProfile {
  return {
    id: "sanhe",
    name: "三合盘（杨公三合）",
    desc: "地盘立向格龙、人盘消砂、天盘纳水；穿山透地分金齐备，共12圈层",
    rings: [
      buildDegreeRing(),
      buildXiu28Ring(),
      buildJieqi24Ring(),
      buildShan24Ring(
        "tianpan24", "天盘缝针二十四山", 7.5,
        "通行罗经三针体系（天盘缝针，杨公创制用于纳水）",
        "相对地盘正针顺时针偏移7.5°（半山），子山正中在7.5°",
        "天盘子山=[0°,15°]（中心7.5°）；与地盘差+7.5°、与人盘差15°",
      ),
      buildFenjin120Ring("tianpan-fenjin120", "天盘一百二十分金", 7.5, "；随天盘缝针（+7.5°）排布"),
      buildShan24Ring(
        "renpan24", "人盘中针二十四山", -7.5,
        "通行罗经三针体系（人盘中针，赖公创制用于消砂）",
        "相对地盘正针逆时针偏移7.5°（半山），子山正中在352.5°",
        "人盘子山=[345°,360°]（中心352.5°）；与地盘差-7.5°",
      ),
      buildBoWuXingRing(),
      buildShan24Ring(
        "dipan24", "地盘正针二十四山", 0,
        "通行罗经三针体系基准（地盘正针，立向格龙）",
        "子=0°（磁北），每山15°，二十四山顺时针排布",
        "子山=[352.5°,7.5°]（中心0°）；与玄空飞星模块二十四山表同源对齐",
      ),
      buildFenjin120Ring("dipan-fenjin120", "地盘一百二十分金", 0, ""),
      buildLong72Ring(),
      buildLong60Ring(),
      buildBagua8Ring(),
    ],
  };
}

/** 三元盘 Profile（仅verified圈层） */
export function buildSanyuanProfile(): LuopanProfile {
  return {
    id: "sanyuan",
    name: "三元盘（蒋盘系）",
    desc: "以地盘正针与分金、玄空阴阳为骨架；六十四卦圈待权威考证后纳入（仅verified圈层）",
    rings: [
      buildDegreeRing(),
      buildShan24Ring(
        "dipan24", "地盘正针二十四山", 0,
        "通行罗经三针体系基准（地盘正针，三元盘立向基准）",
        "子=0°（磁北），每山15°",
        "子山=[352.5°,7.5°]",
      ),
      buildXuankongYinYangRing(),
      buildFenjin120Ring("dipan-fenjin120", "地盘一百二十分金", 0, ""),
      buildBagua8Ring(),
    ],
  };
}

/** 玄空盘 Profile（仅verified圈层，与飞星模块联动） */
export function buildXuankongProfile(): LuopanProfile {
  return {
    id: "xuankong",
    name: "玄空飞星盘",
    desc: "地盘正针+玄空阴阳+分金；坐向读数直接对接玄空飞星排盘（xuankong-feixing模块）",
    rings: [
      buildDegreeRing(),
      buildShan24Ring(
        "dipan24", "地盘正针二十四山", 0,
        "通行罗经三针体系基准（玄空以地盘正针定坐向）",
        "子=0°（磁北），每山15°",
        "子山=[352.5°,7.5°]；与飞星模块ER_SHI_SI_SHAN同源",
      ),
      buildXuankongYinYangRing(),
      buildFenjin120Ring("dipan-fenjin120", "地盘一百二十分金", 0, ""),
      buildBagua8Ring(),
    ],
  };
}

/** Profile 缓存 */
const PROFILE_CACHE: Partial<Record<LuopanSchool, LuopanProfile>> = {};

/** 获取门派 Profile（带缓存） */
export function getProfile(school: LuopanSchool): LuopanProfile {
  if (!PROFILE_CACHE[school]) {
    PROFILE_CACHE[school] =
      school === "sanhe" ? buildSanheProfile()
        : school === "sanyuan" ? buildSanyuanProfile()
          : buildXuankongProfile();
  }
  return PROFILE_CACHE[school]!;
}

/** 门派清单（UI选择用） */
export const SCHOOL_OPTIONS: Array<{ id: LuopanSchool; name: string; desc: string }> = [
  { id: "sanhe", name: "三合盘", desc: "12圈层：三针+分金+穿山透地+宿度+节气+拨砂" },
  { id: "sanyuan", name: "三元盘", desc: "5圈层：正针+玄空阴阳+分金+八卦（六十四卦待考证）" },
  { id: "xuankong", name: "玄空盘", desc: "5圈层：正针+玄空阴阳+分金+八卦，对接飞星排盘" },
];

// ============================================================================
// 六、圈层读数
// ============================================================================

/** 按角度查找圈层命中扇区（渲染层高亮用；标签在同圈层内可能重复，须按角度定位） */
export function findSector(ring: LuopanRing, heading: number): RingSector | null {
  if (ring.sectors.length === 0) return null;
  return ring.sectors.find((s) => inSector(heading, s)) ?? null;
}

/** 在单圈层上读数 */
export function readRing(ring: LuopanRing, heading: number): RingReading {
  const base: RingReading = { ringId: ring.id, ringName: ring.name, kind: ring.kind, label: "" };
  if (ring.kind === "degree") {
    const h = norm360(heading);
    return { ...base, label: `${Math.round(h * 10) / 10}°`, note: `周天 ${Math.round(h)}°（每山15°）` };
  }
  const sec = ring.sectors.find((s) => inSector(heading, s));
  if (!sec) return { ...base, label: "—", note: "未命中" };

  let note = "";
  switch (ring.kind) {
    case "fenjin120": {
      const grade = fenjinGrade(sec.label);
      note = `${grade}${sec.sub ? `（纳音${sec.sub}）` : ""}`;
      break;
    }
    case "long72": {
      note = sec.tone === "blank" ? "空亡龙（八干四维正中）" : `纳音${sec.sub}`;
      break;
    }
    case "long60": {
      note = `纳音${sec.sub}`;
      break;
    }
    case "xiu28": {
      // 入宿度（古度，含太半少刻：1/4=少、1/2=半、3/4=太）
      const w = sec.end - sec.start;
      const h = norm360(heading);
      let off = h - norm360(sec.start);
      if (off < 0) off += 360;
      const guDu = (off / w) * parseFloat(sec.sub ?? "0");
      const whole = Math.floor(guDu);
      const frac = guDu - whole;
      const mark = frac < 0.125 ? "" : frac < 0.375 ? "少" : frac < 0.625 ? "半" : frac < 0.875 ? "太" : "";
      note = `入宿 ${whole}${mark} 度（宿宽${sec.sub}，拨砂五行${XIU_28.find((x) => x.animal === sec.label)?.boWuXing ?? ""}）`;
      break;
    }
    case "jieqi24": {
      note = `太阳到山（${sec.label}居${sec.label === "立春" ? "壬" : JIEQI_SUN_SHAN.find((t) => t.jieqi === sec.label)?.shan ?? ""}山）`;
      break;
    }
    case "bowuxing24": {
      const b = BO_WUXING_SHAN[sec.label];
      note = `${b.wuxing}${b.note ? `（${b.note}）` : ""}`;
      break;
    }
    case "shan24": {
      note = sec.sub ? `阴阳：${sec.sub}` : "";
      break;
    }
    default:
      break;
  }
  return { ...base, label: sec.label, sub: sec.sub, note: note || undefined };
}

/** 全 Profile 读数（用于专业模式读数面板） */
export function readProfile(school: LuopanSchool, heading: number): RingReading[] {
  const p = getProfile(school);
  return p.rings.map((r) => readRing(r, heading));
}

// ============================================================================
// 七、二十八宿附加查算（拨砂/中针宿度读数）
// ============================================================================

/** 人盘中针宿度读数：取人盘山（-7.5°）对应宿（拨砂用） */
export function xiuForRenpanShan(shanName: string): { animal: string; boWuXing: string } | null {
  const c = shanCenter(shanName) - 7.5; // 人盘山中心
  const ring = getProfile("sanhe").rings.find((r) => r.id === "xiu28")!;
  const sec = ring.sectors.find((s) => inSector(c, s));
  if (!sec) return null;
  const x = XIU_28.find((v) => v.animal === sec.label);
  return x ? { animal: x.animal, boWuXing: x.boWuXing } : null;
}
