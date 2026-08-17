// ============================================================================
// 古典占星规则库（公版典籍整理版）- P6-补03 第四阶段
// 数据依据：托勒密《四书》(Tetrabiblos) 等已进入公版的古典占星典籍所载
// 必然尊贵/落陷传统框架（庙旺陷弱），知识点为传统通行规则，非任何现代作者原创，
// 断语文案由项目方独立书面化撰写。LOC 后台可按 dataVersion 调整。
// ============================================================================

export const CLASSICAL_ASTRO_VERSION = "classical-astro-cc0-v1";

/** 星座序号：0白羊 1金牛 2双子 3巨蟹 4狮子 5处女 6天秤 7天蝎 8射手 9摩羯 10水瓶 11双鱼 */
export interface PlanetDignity {
  /** 入庙星座（守护） */
  domicile: number[];
  /** 入旺星座（擢升） */
  exaltation: number[];
  /** 落陷星座（对宫失守护） */
  detriment: number[];
  /** 入弱星座（失势） */
  fall: number[];
}

/** 古典七政尊贵落陷表（现代三王星无传统尊贵属性，不入表） */
export const ESSENTIAL_DIGNITIES: Record<string, PlanetDignity> = {
  太阳: { domicile: [4], exaltation: [0], detriment: [10], fall: [6] },
  月亮: { domicile: [3], exaltation: [1], detriment: [9], fall: [7] },
  水星: { domicile: [2, 5], exaltation: [5], detriment: [8, 11], fall: [11] },
  金星: { domicile: [1, 6], exaltation: [11], detriment: [7, 0], fall: [5] },
  火星: { domicile: [0, 7], exaltation: [9], detriment: [6, 1], fall: [3] },
  木星: { domicile: [8, 11], exaltation: [3], detriment: [2, 5], fall: [9] },
  土星: { domicile: [9, 10], exaltation: [6], detriment: [3, 4], fall: [0] },
};

export type DignityKind = "domicile" | "exaltation" | "detriment" | "fall" | null;

export interface DignityResult {
  kind: DignityKind;
  label: string; // 入庙/入旺/落陷/入弱/无
  note: string; // 书面化断语
}

/** 判断某行星在某星座的尊贵状态（仅古典七政有判定） */
export function getDignity(planetName: string, signIndex: number): DignityResult {
  const d = ESSENTIAL_DIGNITIES[planetName];
  if (!d) return { kind: null, label: "—", note: "现代行星，古典体系不判尊贵" };
  if (d.domicile.includes(signIndex)) {
    return { kind: "domicile", label: "入庙", note: "行星居本位，其性得地而彰，所主之事从容自主，力量得宜。" };
  }
  if (d.exaltation.includes(signIndex)) {
    return { kind: "exaltation", label: "入旺", note: "行星处显扬之地，声望与表现皆有提振，然盛极宜防虚浮。" };
  }
  if (d.detriment.includes(signIndex)) {
    return { kind: "detriment", label: "落陷", note: "行星失其本位，力量受制，所主之事多经磨合方见其成。" };
  }
  if (d.fall.includes(signIndex)) {
    return { kind: "fall", label: "入弱", note: "行星处困顿之地，性难舒展，宜借他星之力、以时势补不足。" };
  }
  return { kind: null, label: "平", note: "不居庙旺，亦无陷弱，行星处平常之位，吉凶随相位与宫位而定。" };
}

/** 尊贵体系说明（术语科普，后台可替换文案） */
export const DIGNITY_NOTES: Array<{ term: string; note: string }> = [
  { term: "入庙", note: "行星居于自己守护的星座，如太阳居狮子座。其性得地，力量最为纯粹。" },
  { term: "入旺", note: "行星居于传统擢升的星座，如月亮居金牛座。声望提振，表现外显。" },
  { term: "落陷", note: "行星居于所守护星座的对宫，如太阳落水瓶座。力量受制，事宜多磨。" },
  { term: "入弱", note: "行星居于擢升星座的对宫，如土星居白羊座。性难舒展，宜借外力。" },
  { term: "古典七政", note: "日、月、水、金、火、木、土七曜为古典占星体系所本；天海冥三王星为近代发现，古典典籍未载其尊贵。" },
];

/** 古典判断通则（公版典籍通行框架，文案自研书面化） */
export const CLASSICAL_JUDGEMENT_RULES: string[] = [
  "观星先察庙旺：行星入庙入旺者，其所主宫位之事得力；落陷入弱者，其事多经反复而后成。",
  "顺逆有别：行星顺行，其事循常而进；行星逆行，多主内省、延迟、旧事重提，非凶，乃势之回环。",
  "相位定交涉：吉相位（六合、拱）主助力流通，紧张相位（刑、冲）主砥砺磨合；无绝对之吉凶，惟强弱与向背。",
  "宫位定领域：行星所落宫位，为其力量施展之领域；宫主星飞入何宫，其事之因由系于彼处。",
  "命主为纲：上升星座之守护星为命主星，命主之庙旺落陷与所居宫位，为通盘判断之纲领。",
];
