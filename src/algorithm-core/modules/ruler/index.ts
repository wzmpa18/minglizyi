/**
 * ============================================================================
 * 鲁班尺（门公尺）/ 丁兰尺（阴尺）引擎 —— RULER_PROFILE 配置驱动
 * ============================================================================
 *
 * 来源与协议：
 *   - 字序/分位/吉凶口径：公开传统匠作通行排布（《鲁班经》《鲁班营造正式》传承体系）
 *     · 鲁班尺八字：财、病、离、义、官、劫、害、本（吉），每字四小字合三十二分位
 *     · 丁兰尺十字：丁、害、旺、苦、义、官、死、兴、失、财，每字四小字合四十分位
 *     · 明清古法丁兰尺从「财」字起量（字序与现代通用版互为反向）
 *   - 尺长多制式（RULER_PROFILE 可配置）：现代通用 42.9cm / 明清正宗 46.08cm /
 *     民间大尺 50.4cm；丁兰尺 38.8cm / 38.78cm
 *   - 古籍换算锚点（《鲁班经》门例）：2尺1寸→义、2尺8寸→吉、5尺6寸6分→吉、
 *     4尺3寸1分→本、4尺3寸8分→财（营造尺口径，1门光寸=1.8营造寸）
 *   - 曲尺紫白（压白法）：营造尺寸尾逢一、六、八为白星吉，九为紫星次吉
 *   - 本模块为净室实现，无第三方代码引入；数据口径可按项目后台资料整体替换
 *
 * 边界口径：分位区间为 [起点, 终点)，即 5.76cm 恰落在「病」而非「财」末位；
 *   周期整数倍长度（如 46.08cm）落回「财·财德」（新循环首格）。
 *
 * 版本：RULER_ENGINE_VERSION
 * ============================================================================
 */

/** 引擎版本 */
export const RULER_ENGINE_VERSION = "ruler-engine-v1.0.0（鲁班尺/丁兰尺·RULER_PROFILE制式驱动）";

/** 吉凶等级 */
export type RulerLuck = "大吉" | "吉" | "次吉" | "凶" | "大凶";

export interface RulerSection {
  /** 主字（八字/十字之一） */
  char: string;
  /** 吉凶等级 */
  luck: RulerLuck;
  /** 释义 */
  meaning: string;
  /** 四小字（分位名） */
  subs: [string, string, string, string];
}

export interface RulerProfile {
  id: string;
  name: string;
  /** 全尺长度（厘米） */
  lengthCm: number;
  /** 尺制说明 */
  note: string;
  /** 配套营造尺长度（厘米）＝全尺长 ÷ 折算比（鲁班1.44 / 丁兰自有口径） */
  chiCm: number;
  sections: RulerSection[];
}

// ============================================================================
// 一、鲁班尺（门公尺）八字三十二分位 —— 匠作通行排布
// ============================================================================
export const LUBAN_SECTIONS: RulerSection[] = [
  { char: "财", luck: "大吉", meaning: "钱财、财运、财富", subs: ["财德", "宝库", "六合", "迎福"] },
  { char: "病", luck: "大凶", meaning: "疾病、灾祸、不适", subs: ["退财", "公事", "牢执", "孤寡"] },
  { char: "离", luck: "凶", meaning: "分离、离别、离散", subs: ["长库", "劫财", "官鬼", "失脱"] },
  { char: "义", luck: "吉", meaning: "正义、情义、辅佐", subs: ["添丁", "益利", "贵子", "大吉"] },
  { char: "官", luck: "吉", meaning: "官运、事业、功名", subs: ["顺科", "横财", "进益", "富贵"] },
  { char: "劫", luck: "大凶", meaning: "劫难、破财、灾害", subs: ["死别", "退口", "离乡", "财失"] },
  { char: "害", luck: "凶", meaning: "伤害、祸害、损害", subs: ["灾至", "死绝", "病临", "口舌"] },
  { char: "本", luck: "吉", meaning: "根本、本业、本位", subs: ["财至", "登科", "进宝", "兴旺"] },
];

/** 鲁班尺口诀校验用字序 */
export const LUBAN_ORDER = "财病离义官劫害本";

// ============================================================================
// 二、丁兰尺（阴尺）十六/四十分位 —— 现代通用「丁」起量 / 明清古法「财」起量
// ============================================================================
/** 现代通用版字序（从尺首 0cm 起量）：丁害旺苦义官死兴失财 */
export const DINGLAN_SECTIONS_DING: RulerSection[] = [
  { char: "丁", luck: "吉", meaning: "人丁、子孙、传承", subs: ["福星", "及第", "财旺", "登科"] },
  { char: "害", luck: "凶", meaning: "伤害、破害、灾祸", subs: ["口舌", "病临", "死绝", "灾至"] },
  { char: "旺", luck: "吉", meaning: "旺盛、发达、壮大", subs: ["天德", "喜事", "进宝", "纳福"] },
  { char: "苦", luck: "凶", meaning: "辛苦、苦难、劳苦", subs: ["失脱", "官鬼", "劫财", "无嗣"] },
  { char: "义", luck: "吉", meaning: "情义、善良、公正", subs: ["大吉", "财旺", "益利", "天库"] },
  { char: "官", luck: "吉", meaning: "官运、事业、地位", subs: ["富贵", "进宝", "横财", "顺科"] },
  { char: "死", luck: "大凶", meaning: "死亡、终结（必须避免）", subs: ["离乡", "死别", "退丁", "失财"] },
  { char: "兴", luck: "吉", meaning: "兴盛、兴旺、发达", subs: ["登科", "贵子", "添丁", "兴旺"] },
  { char: "失", luck: "凶", meaning: "损失、失败、破财", subs: ["孤寡", "牢执", "公事", "退财"] },
  { char: "财", luck: "吉", meaning: "财富、财运、丰盈", subs: ["迎福", "六合", "进宝", "财德"] },
];

/** 丁兰尺现代版字序校验串 */
export const DINGLAN_ORDER_DING = "丁害旺苦义官死兴失财";
/** 明清古法字序（与通用版互为反向，从「财」起量） */
export const DINGLAN_ORDER_CAI = "财失兴死官义苦旺害丁";

/** 明清古法版：主字顺序反向、各主字四小字随字走 */
export const DINGLAN_SECTIONS_CAI: RulerSection[] = DINGLAN_ORDER_CAI
  .split("")
  .map((c) => {
    const s = DINGLAN_SECTIONS_DING.find((x) => x.char === c);
    if (!s) throw new Error(`丁兰尺明清字序含未知字：${c}`);
    return s;
  });

// ============================================================================
// 三、RULER_PROFILE 制式注册表（项目方可按后台资料增删/改注）
// ============================================================================
export const LUBAN_PROFILES: RulerProfile[] = [
  {
    id: "luban-modern",
    name: "现代通用版",
    lengthCm: 42.9,
    note: "匹配市面通行卷尺鲁班尺（营造尺约29.79cm×1.44）",
    chiCm: 42.9 / 1.44,
    sections: LUBAN_SECTIONS,
  },
  {
    id: "luban-mingqing",
    name: "明清正宗版",
    lengthCm: 46.08,
    note: "明清营造尺32cm×1尺4寸4分，古建修复/明清官式建筑口径",
    chiCm: 32,
    sections: LUBAN_SECTIONS,
  },
  {
    id: "luban-minjian",
    name: "民间大尺版",
    lengthCm: 50.4,
    note: "部分地区民间流传制式（营造尺35cm×1.44）",
    chiCm: 50.4 / 1.44,
    sections: LUBAN_SECTIONS,
  },
];

export const DINGLAN_PROFILES: RulerProfile[] = [
  {
    id: "dinglan-modern",
    name: "现代通用版",
    lengthCm: 38.8,
    note: "「丁」字起量，市面通行丁兰尺",
    chiCm: 3.88,
    sections: DINGLAN_SECTIONS_DING,
  },
  {
    id: "dinglan-mingqing",
    name: "明清古法版",
    lengthCm: 38.78,
    note: "「财」字起量（字序与通用版互为反向）",
    chiCm: 3.878,
    sections: DINGLAN_SECTIONS_CAI,
  },
];

export function getLubanProfile(id: string): RulerProfile {
  return LUBAN_PROFILES.find((p) => p.id === id) || LUBAN_PROFILES[0];
}
export function getDinglanProfile(id: string): RulerProfile {
  return DINGLAN_PROFILES.find((p) => p.id === id) || DINGLAN_PROFILES[0];
}

// ============================================================================
// 四、核心解算
// ============================================================================

export interface RulerReading {
  /** 尺别 */
  rulerName: string;
  profile: RulerProfile;
  /** 输入长度（厘米） */
  lengthCm: number;
  /** 周期数（第几尺，1 起） */
  cycle: number;
  /** 周期内位置（厘米） */
  inCycleCm: number;
  sectionIndex: number;
  section: RulerSection;
  /** 小字序（0-3） */
  subIndex: number;
  subChar: string;
  /** 是否吉位 */
  isLucky: boolean;
  /** 本尺营造尺读数文字（如「2尺1寸」） */
  chiText: string;
  /** 本尺自身寸读数（鲁班寸/丁兰寸，如「2寸3」） */
  cunInCycle: number;
}

/** 分位区间 [start, end)：整数倍周期落回首格；epsilon 下取整抵御浮点噪声 */
export function readRuler(rulerName: string, profile: RulerProfile, lengthCm: number): RulerReading {
  const len = profile.lengthCm;
  const n = profile.sections.length;
  const subPer = 4;
  const total = n * subPer;
  const EPS = 1e-9;

  const safeLen = Math.max(0, lengthCm);
  const cycle = Math.floor(safeLen / len + EPS);
  const inCycle = safeLen - cycle * len;
  const pos = Math.floor((inCycle / len) * total + EPS);
  const clampPos = Math.min(total - 1, Math.max(0, pos));
  const sectionIndex = Math.floor(clampPos / subPer);
  const subIndex = clampPos % subPer;
  const section = profile.sections[sectionIndex];
  const isLucky = section.luck === "大吉" || section.luck === "吉" || section.luck === "次吉";

  return {
    rulerName,
    profile,
    lengthCm: safeLen,
    cycle: cycle + 1,
    inCycleCm: inCycle,
    sectionIndex,
    section,
    subIndex,
    subChar: section.subs[subIndex],
    isLucky,
    chiText: cmToChiText(safeLen, profile.chiCm),
    cunInCycle: Math.round(((inCycle / len) * n) * 100) / 100,
  };
}

/** 营造尺读数文字（尺/寸/分，1尺=10寸=100分） */
export function cmToChiText(lengthCm: number, chiCm: number): string {
  const fen = Math.round((lengthCm / chiCm) * 100);
  const chi = Math.floor(fen / 100);
  const cun = Math.floor((fen % 100) / 10);
  const fenR = fen % 10;
  const parts: string[] = [];
  if (chi > 0) parts.push(`${chi}尺`);
  if (cun > 0 || chi > 0) parts.push(`${cun}寸`);
  parts.push(`${fenR}分`);
  return parts.join("");
}

// ============================================================================
// 五、曲尺紫白（压白法）—— 营造尺寸尾起星
// ============================================================================
export interface ZibaiReading {
  /** 营造尺总寸数（整数） */
  totalCun: number;
  /** 寸尾数（0-9；0=满尺） */
  cunTail: number;
  /** 星名 */
  star: string;
  /** 吉凶 */
  lucky: boolean | null;
  /** 说明 */
  note: string;
}

const ZIBAI_STARS: Record<number, { star: string; lucky: boolean | null; note: string }> = {
  1: { star: "一白", lucky: true, note: "贪狼星，吉" },
  2: { star: "二黑", lucky: false, note: "巨门星，病符，避用" },
  3: { star: "三碧", lucky: false, note: "禄存星，是非，避用" },
  4: { star: "四绿", lucky: false, note: "文曲星，平，不作白星论" },
  5: { star: "五黄", lucky: false, note: "廉贞星，大凶，必须避开" },
  6: { star: "六白", lucky: true, note: "武曲星，吉" },
  7: { star: "七赤", lucky: false, note: "破军星，口舌，避用" },
  8: { star: "八白", lucky: true, note: "左辅星，吉" },
  9: { star: "九紫", lucky: true, note: "右弼星，次吉（紫星）" },
  0: { star: "满尺", lucky: null, note: "寸位满十进尺，白星复位，以分位细论" },
};

/** 曲尺压白：营造尺整数寸尾数定紫白星（一六八白吉、九紫次吉） */
export function quchiZibai(lengthCm: number, chiCm: number): ZibaiReading {
  const totalCun = Math.floor((lengthCm / chiCm) * 10 + 1e-9);
  const tail = ((totalCun % 10) + 10) % 10;
  const z = ZIBAI_STARS[tail];
  return { totalCun, cunTail: tail, star: z.star, lucky: z.lucky, note: z.note };
}

// ============================================================================
// 六、双尺合参 + 吉尺寸查询
// ============================================================================
export interface DualRulerReading {
  luban: RulerReading;
  dinglan: RulerReading;
  /** 阳尺吉位判定 */
  lubanLucky: boolean;
  /** 阴尺无大凶判定（丁兰尺大凶=死字） */
  dinglanSafe: boolean;
  /** 双尺皆宜 */
  bothLucky: boolean;
}

export function dualRulerRead(
  lubanProfile: RulerProfile,
  dinglanProfile: RulerProfile,
  lengthCm: number,
): DualRulerReading {
  const luban = readRuler("鲁班尺（门公尺·阳尺）", lubanProfile, lengthCm);
  const dinglan = readRuler("丁兰尺（阴尺）", dinglanProfile, lengthCm);
  return {
    luban,
    dinglan,
    lubanLucky: luban.isLucky,
    dinglanSafe: dinglan.section.luck !== "大凶",
    bothLucky: luban.isLucky && dinglan.section.luck !== "大凶",
  };
}

export interface LuckySuggestion {
  lengthCm: number;
  reading: RulerReading;
  deltaCm: number;
}

/**
 * 最近吉尺寸查询：给定目标长度，在 ±maxDeltaCm 范围内找落在吉位（含次吉）小字
 * 中点的建议尺寸。传入 companionProfile 时，额外剔除对尺落「大凶」位的建议
 * （双尺合参口径）。
 */
export function nearestLuckyLengths(
  rulerName: string,
  profile: RulerProfile,
  targetCm: number,
  maxDeltaCm = 10,
  count = 6,
  companionProfile?: RulerProfile,
): LuckySuggestion[] {
  const len = profile.lengthCm;
  const n = profile.sections.length;
  const results: LuckySuggestion[] = [];
  const baseCycle = Math.floor(targetCm / len);

  for (let c = baseCycle - 1; c <= baseCycle + 2; c++) {
    if (c < 0) continue;
    for (let s = 0; s < n; s++) {
      const sec = profile.sections[s];
      if (!(sec.luck === "大吉" || sec.luck === "吉" || sec.luck === "次吉")) continue;
      for (let k = 0; k < 4; k++) {
        const subStart = c * len + (s * 4 + k) * (len / (n * 4));
        const mid = subStart + len / (n * 4) / 2;
        const delta = mid - targetCm;
        if (Math.abs(delta) > maxDeltaCm) continue;
        const rounded = Math.round(mid * 10) / 10;
        const reading = readRuler(rulerName, profile, rounded);
        if (!reading.isLucky) continue;
        if (companionProfile && readRuler("对尺", companionProfile, rounded).section.luck === "大凶") {
          continue;
        }
        results.push({ lengthCm: rounded, reading, deltaCm: Math.round(delta * 10) / 10 });
      }
    }
  }
  results.sort((a, b) => Math.abs(a.deltaCm) - Math.abs(b.deltaCm));
  return results.slice(0, count);
}

// ============================================================================
// 七、单位换算
// ============================================================================
/** 厘米 → 营造尺（1尺=10寸） */
export function cmToChi(lengthCm: number, chiCm: number): number {
  return lengthCm / chiCm;
}
/** 营造尺 → 厘米 */
export function chiToCm(chi: number, chiCm: number): number {
  return chi * chiCm;
}
/** 鲁班尺数（每尺=profile.lengthCm） */
export function cmToRulerChi(lengthCm: number, profile: RulerProfile): number {
  return lengthCm / profile.lengthCm;
}
