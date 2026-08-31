// ============================================================================
// 七政四余断语引擎 —— 基于项目方《七政四余标准化知识库 v1.0（去重整理版）》
// ============================================================================
// 知识库结构：八卷制（总论→排盘→垣殿→化曜神煞→限度→格局→观星要诀→歌赋）
// 本引擎实现其中「可由盘面数据直接推演」的断语六节：
//   1. yuandian  垣殿得地（卷三）——入垣/升殿/庙旺乐喜/忌躔，逐星得地与否
//   2. huayao   十干化曜（卷一§1.6/卷四§4.1）——年干推天禄…天权十化曜+文魁官印
//               催禄喜科名，化曜星守照身命之断
//   3. shensha  神煞吉凶（卷四）——年支煞（阳刃飞刃/的煞/咸池/劫亡/驿马将星
//               华盖攀鞍/孤辰寡宿/空亡）+月煞/值难星，命身坐煞之断
//   4. geju     身命格局（卷六/卷七）——三主强弱/日月夹命/金水辅日/孤月独明/
//               五残星/昼夜向背/四时得令
//   5. gongduan 十二宫断（卷七§7.3）——逐人事宫所守星曜断语（财帛/田宅/男女/
//               官禄/福德/相貌/奴仆/夫妻等）
//   6. gefu     歌赋引用（卷八）——本盘命宫/身宫星曜对应之玉衡经性情断语
//
// 纪律（知识库卷首+指令06最高纪律）：
//   - 每条断语标注 source（卷节+古籍页码），可追溯、可核对
//   - 只做盘面可推演之断，不虚构规则；同一星多处得地并列不合并
//   - 断语分级：吉/凶/中性（提示），不做绝对祸福断言
//   - 限度流年断（卷五倒限论）涉及生死断言，按项目纪律不自动生成，仅保留
//     限度数据（引擎主模块已有洞微大限），本引擎不出倒限断语
// ============================================================================

import type { QizhengResult, StarPosition } from "../qizheng";

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export type DuanyuLevel = "ji" | "xiong" | "zhong";

export type DuanyuSectionKey =
  | "yuandian"
  | "huayao"
  | "shensha"
  | "geju"
  | "gongduan"
  | "gefu";

export interface DuanyuItem {
  /** 唯一 ID（同盘内稳定，供前端 key 与测试断言） */
  id: string;
  /** 吉 / 凶 / 中性 */
  level: DuanyuLevel;
  /** 断语标题（如「木星入垣」） */
  title: string;
  /** 断语正文 */
  text: string;
  /** 出处（知识库卷节 + 古籍页码） */
  source: string;
  /** 歌赋原文引用（可选） */
  verse?: string;
}

export interface DuanyuSection {
  key: DuanyuSectionKey;
  name: string;
  desc: string;
  items: DuanyuItem[];
}

export interface QizhengDuanyuResult {
  engineVersion: string;
  /** 年干支（立春分界） */
  yearGanzhi: { gan: string; zhi: string };
  sections: DuanyuSection[];
  summary: { ji: number; xiong: number; zhong: number; total: number };
}

export const DUANYU_ENGINE_VERSION = "七政断语引擎 v1.0.0（知识库 v1.0）";

// ---------------------------------------------------------------------------
// 基础常量（均出自知识库，标注卷节）
// ---------------------------------------------------------------------------

const GANS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const ZHIS = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

/** 星 key → 名称（与主引擎 11 曜一致） */
const STAR_NAMES: Record<string, string> = {
  sun: "太阳", moon: "太阴", jupiter: "木星", mars: "火星", saturn: "土星",
  venus: "金星", mercury: "水星", qi: "紫炁", luo: "罗睺", ji: "计都", bei: "月孛",
};

/** 化曜表用短名 → star key（卷一§1.6.2 表） */
const SHORT_KEY: Record<string, string> = {
  日: "sun", 月: "moon", 木: "jupiter", 火: "mars", 土: "saturn",
  金: "venus", 水: "mercury", 气: "qi", 罗: "luo", 计: "ji", 孛: "bei",
};

// —— 卷三§3.3.2 十一曜庙旺乐喜例表（古今占星学 p5-10）——
const MIAO_WANG_LE_XI: Record<string, { miao: string; wang: string; le: string; xi: string }> = {
  sun: { miao: "午", wang: "卯", le: "未", xi: "亥" },
  moon: { miao: "未", wang: "酉", le: "亥", xi: "子" },
  jupiter: { miao: "亥", wang: "寅", le: "未", xi: "巳" },
  mars: { miao: "卯", wang: "寅", le: "戌", xi: "酉" },
  saturn: { miao: "子", wang: "申", le: "辰", xi: "丑" },
  venus: { miao: "酉", wang: "辰", le: "亥", xi: "丑" },
  mercury: { miao: "巳", wang: "申", le: "亥", xi: "寅" },
  qi: { miao: "丑", wang: "寅", le: "午", xi: "亥" },
  bei: { miao: "亥", wang: "戌", le: "寅", xi: "申" },
  luo: { miao: "戌", wang: "寅", le: "午", xi: "巳" },
  ji: { miao: "酉", wang: "巳", le: "申", xi: "丑" },
};

// —— 卷三§3.4.1 五星四余忌躔歌（张果星宗 p81）——
const JI_CHAN: Record<string, string[]> = {
  jupiter: ["辰", "酉"],
  mars: ["申", "巳"],
  saturn: ["寅", "亥"],
  venus: ["卯", "戌"],
  mercury: ["辰", "未"],
  ji: ["寅", "亥", "卯"],
  qi: ["酉"],
  bei: ["戌"],
  luo: ["酉", "亥"],
  sun: ["卯", "酉"],
  moon: ["卯", "酉"],
};

const JI_CHAN_VERSE =
  "木调天秤与金牛，火怕申乡巳亦忌，土走双鱼人马位，金销天蝎白羊州。水漂羊角流巨蟹，计虎猪儿兔亦愁，紫气亦嫌鸡唱晓，孛逢戌上是三般。罗睺酉亥君须忌，日月无光卯酉头。";

// —— 卷一§1.6.2 天禄等十曜（年干甲起，每干顺移一位）——
/** 化曜序：禄暗福耗（磨）贵刑印囚权，星序按行循环 */
const HUAYAO_SEQ = ["天禄", "天暗", "天福", "天耗", "天磨", "天贵", "天刑", "天印", "天囚", "天权"];
const HUAYAO_STAR_SEQ = ["火", "孛", "木", "金", "土", "月", "水", "气", "计", "罗"];
/** 曜之所辖（管库星）：禄管官禄，暗隔相貌，福隔财帛福德迁移，耗属兄弟，贵属男女，刑属奴仆，印属田宅，囚属疾厄，权属命宫（卷一§1.6.2） */
const HUAYAO_GONG: Record<string, string[]> = {
  天禄: ["官禄"],
  天暗: ["相貌"],
  天福: ["财帛", "福德", "迁移"],
  天耗: ["兄弟"],
  天贵: ["男女"],
  天刑: ["奴仆"],
  天印: ["田宅"],
  天囚: ["疾厄"],
  天权: ["命宫"],
};

/** 十干化曜表：gan → {化曜名: 星短名}（由循环序列生成，与知识库 p21-22 表逐格核对） */
function buildHuayaoTable(): Record<string, Record<string, string>> {
  const table: Record<string, Record<string, string>> = {};
  GANS.forEach((gan, gi) => {
    const row: Record<string, string> = {};
    HUAYAO_SEQ.forEach((name, ni) => {
      row[name] = HUAYAO_STAR_SEQ[(ni + gi) % 10];
    });
    table[gan] = row;
  });
  return table;
}
const HUAYAO_TABLE = buildHuayaoTable();

// —— 卷一§1.6.3 文星魁星官星印星催官禄神喜神（张果星宗 p11-13）——
const TEHUA_TABLE: Record<string, Record<string, string[]>> = {
  文星: { 甲: ["罗"], 乙: ["计"], 丙: ["金"], 丁: ["火"], 戊: ["金"], 己: ["气"], 庚: ["木"], 辛: ["土"], 壬: ["日"], 癸: ["月"] },
  魁星: { 甲: ["月"], 乙: ["日"], 丙: ["罗"], 丁: ["计"], 戊: ["火"], 己: ["金"], 庚: ["木"], 辛: ["水"], 壬: ["气"], 癸: ["水"] },
  官星: { 甲: ["气"], 乙: ["水"], 丙: ["罗"], 丁: ["计"], 戊: ["孛"], 己: ["火"], 庚: ["金"], 辛: ["木"], 壬: ["月"], 癸: ["土"] },
  印星: { 甲: ["木"], 乙: ["日"], 丙: ["火"], 丁: ["月"], 戊: ["土"], 己: ["罗"], 庚: ["金"], 辛: ["计"], 壬: ["水"], 癸: ["孛"] },
  催官: { 甲: ["金"], 乙: ["水"], 丙: ["日"], 丁: ["罗"], 戊: ["木"], 己: ["气"], 庚: ["孛"], 辛: ["土"], 壬: ["月"], 癸: ["计"] },
  禄神: { 甲: ["木", "孛"], 乙: ["水"], 丙: ["计"], 丁: ["罗"], 戊: ["土"], 己: ["火"], 庚: ["金"], 辛: ["气"], 壬: ["日"], 癸: ["月"] },
  喜神: { 甲: ["罗"], 乙: ["计"], 丙: ["气"], 丁: ["水"], 戊: ["月"], 己: ["土"], 庚: ["金"], 辛: ["木"], 壬: ["孛"], 癸: ["火"] },
};
const TEHUA_DESC: Record<string, string> = {
  文星: "主能文", 魁星: "主夺魁", 官星: "主官职", 印星: "主掌印",
  催官: "主迁官进职", 禄神: "主食禄", 喜神: "主婚姻财喜",
};

// —— 卷四§4.2.1 阳刃/飞刃（年干）——
const YANG_REN: Record<string, string> = {
  甲: "卯", 乙: "辰", 丙: "午", 丁: "未", 戊: "午", 己: "未",
  庚: "酉", 辛: "戌", 壬: "子", 癸: "丑",
};

// —— 卷四§4.5 地支神煞（年支三合局取）——
type SanheMap = Record<string, { deshao: string; xianchi: string; jie: string; wang: string; ma: string; jiang: string; huagai: string }>;
const SANHE: SanheMap = {
  申: { deshao: "酉", xianchi: "酉", jie: "巳", wang: "亥", ma: "寅", jiang: "子", huagai: "辰" },
  子: { deshao: "酉", xianchi: "酉", jie: "巳", wang: "亥", ma: "寅", jiang: "子", huagai: "辰" },
  辰: { deshao: "酉", xianchi: "酉", jie: "巳", wang: "亥", ma: "寅", jiang: "子", huagai: "辰" },
  寅: { deshao: "卯", xianchi: "卯", jie: "亥", wang: "巳", ma: "申", jiang: "午", huagai: "戌" },
  午: { deshao: "卯", xianchi: "卯", jie: "亥", wang: "巳", ma: "申", jiang: "午", huagai: "戌" },
  戌: { deshao: "卯", xianchi: "卯", jie: "亥", wang: "巳", ma: "申", jiang: "午", huagai: "戌" },
  巳: { deshao: "午", xianchi: "午", jie: "寅", wang: "申", ma: "亥", jiang: "酉", huagai: "丑" },
  酉: { deshao: "午", xianchi: "午", jie: "寅", wang: "申", ma: "亥", jiang: "酉", huagai: "丑" },
  丑: { deshao: "午", xianchi: "午", jie: "寅", wang: "申", ma: "亥", jiang: "酉", huagai: "丑" },
  亥: { deshao: "子", xianchi: "子", jie: "申", wang: "寅", ma: "巳", jiang: "卯", huagai: "未" },
  卯: { deshao: "子", xianchi: "子", jie: "申", wang: "寅", ma: "巳", jiang: "卯", huagai: "未" },
  未: { deshao: "子", xianchi: "子", jie: "申", wang: "寅", ma: "巳", jiang: "卯", huagai: "未" },
};

// —— 卷四§4.5.5 孤辰寡宿（年支三会局取）——
const GU_CHEN: Record<string, { gu: string; gua: string }> = {
  寅: { gu: "巳", gua: "丑" }, 卯: { gu: "巳", gua: "丑" }, 辰: { gu: "巳", gua: "丑" },
  巳: { gu: "申", gua: "辰" }, 午: { gu: "申", gua: "辰" }, 未: { gu: "申", gua: "辰" },
  申: { gu: "亥", gua: "未" }, 酉: { gu: "亥", gua: "未" }, 戌: { gu: "亥", gua: "未" },
  亥: { gu: "寅", gua: "戌" }, 子: { gu: "寅", gua: "戌" }, 丑: { gu: "寅", gua: "戌" },
};

// —— 卷四§4.5.7 六甲空亡（年干支所在旬）——
const XUN_KONG: Array<{ start: number; kong: [string, string] }> = [
  { start: 0, kong: ["戌", "亥"] },   // 甲子旬
  { start: 10, kong: ["申", "酉"] },  // 甲戌旬
  { start: 20, kong: ["午", "未"] },  // 甲申旬
  { start: 30, kong: ["辰", "巳"] },  // 甲午旬
  { start: 40, kong: ["寅", "卯"] },  // 甲辰旬
  { start: 50, kong: ["子", "丑"] },  // 甲寅旬
];

// —— 卷四§4.4.3 值难星（生月取）——
const ZHI_NAN: Array<{ months: number[]; stars: string[]; label: string }> = [
  { months: [1, 2], stars: ["sun"], label: "太阳" },
  { months: [3, 4], stars: ["moon"], label: "太阴" },
  { months: [5, 6], stars: ["mars", "luo"], label: "火罗" },
  { months: [7, 8], stars: ["mercury", "bei"], label: "水孛" },
  { months: [9, 10], stars: ["jupiter", "qi"], label: "木气" },
  { months: [11, 12], stars: ["venus"], label: "金星" },
];

// —— 卷四§4.4.2 月煞（生月取宫）——
const YUE_SHA: Record<number, string> = {
  1: "戌", 2: "巳", 3: "午", 4: "未", 5: "寅", 6: "卯",
  7: "辰", 8: "亥", 9: "子", 10: "丑", 11: "申", 12: "酉",
};

// —— 卷一§1.2.3 昼夜阴阳星 ——
const YANG_STARS = ["sun", "jupiter", "saturn", "mercury", "qi", "ji", "bei"];
const YIN_STARS = ["moon", "mars", "venus", "luo"];

// —— 卷一§1.5.2 四时令星 ——
function lingXing(month: number): { star: string; name: string; season: string } {
  if (month >= 1 && month <= 3) return { star: "jupiter", name: "木星", season: "春" };
  if (month >= 4 && month <= 6) return { star: "mars", name: "火星", season: "夏" };
  if (month >= 7 && month <= 9) return { star: "venus", name: "金星", season: "秋" };
  if (month >= 10 && month <= 12) return { star: "mercury", name: "水星", season: "冬" };
  return { star: "saturn", name: "土星", season: "四季" };
}

// —— 卷一§1.2.2 玉衡经各曜性情断语（歌赋引用节用）——
const YUHENG_XINGQING: Record<string, { text: string }> = {
  sun: { text: "日为众曜之尊、君父之象；日生人以太阳为重，喜升入东南向明得地。" },
  moon: { text: "月乃一身之主、后母之象；夜生以月为重，太阴居西北得火罗辅卫为贵。" },
  venus: { text: "金星：本性最无情，见木刚柔须相济；主清白、好色、刚方、嗜欲。" },
  jupiter: { text: "木星：主仁，为文章秘府之星，主人才富足、见识超卓；逢金则受制。" },
  mercury: { text: "水星：漂流无定，巧计千般；水主智，逢计都则奸狡。" },
  mars: { text: "火星：性躁暴不常；火主血光，主刑伤官讼。" },
  saturn: { text: "土星：厚重，主敦厚沉潜、性迟而信。" },
  ji: { text: "计都：能算能谋、机巧多端、阴柔。" },
  bei: { text: "月孛：性猛机变威权，主谗毁、淫毒，好居黄道正位。" },
  luo: { text: "罗睺：爽快贪饕、刚暴。" },
  qi: { text: "紫炁：清高孤介、慈祥，主僧道。" },
};

// ---------------------------------------------------------------------------
// 干支工具
// ---------------------------------------------------------------------------

/** 年干支（立春分界：2月4日前属上一年；立春实际在2月3-5日间，±1日误差属传统口径） */
export function yearGanzhi(year: number, month: number, day: number): { gan: string; zhi: string } {
  let y = year;
  if (month < 2 || (month === 2 && day < 4)) y = year - 1;
  const gi = ((y - 4) % 10 + 10) % 10;
  const zi = ((y - 4) % 12 + 12) % 12;
  return { gan: GANS[gi], zhi: ZHIS[zi] };
}

/** 六甲旬空亡（按年干支） */
function xunKong(gan: string, zhi: string): [string, string] {
  const gi = GANS.indexOf(gan as (typeof GANS)[number]);
  const zi = ZHIS.indexOf(zhi as (typeof ZHIS)[number]);
  // 干支序号（甲子=0）：支序 + n*12，使干序匹配
  let seq = -1;
  for (let n = 0; n < 6; n++) {
    const cand = zi + n * 12;
    if (cand % 10 === gi) { seq = cand; break; }
  }
  if (seq < 0) return ["戌", "亥"];
  for (const x of XUN_KONG) {
    if (seq >= x.start && seq < x.start + 10) return x.kong;
  }
  return ["戌", "亥"];
}

/** 对冲宫 */
function chong(branch: string): string {
  return ZHIS[(ZHIS.indexOf(branch as (typeof ZHIS)[number]) + 6) % 12];
}

/** 马前一位（攀鞍） */
function maQian(branch: string): string {
  return ZHIS[(ZHIS.indexOf(branch as (typeof ZHIS)[number]) + 1) % 12];
}

// ---------------------------------------------------------------------------
// 断语引擎主体
// ---------------------------------------------------------------------------

export function calcQizhengDuanyu(result: QizhengResult): QizhengDuanyuResult {
  const { input } = result;
  const gz = yearGanzhi(input.year, input.month, input.day);
  const stars = result.stars;
  const starByKey = new Map<string, StarPosition>(stars.map((s) => [s.key, s]));
  const mingBranch = result.mingGong.branch;
  const shenBranch = result.shenGong.branch;

  // 宫地支 → 人事宫名 映射（result.palaces 每宫已带 renshiGong）
  const gongByBranch = new Map(result.palaces.map((p) => [p.branch, p.renshiGong]));
  const starsInBranch = (branch: string): StarPosition[] =>
    stars.filter((s) => s.palaceBranch === branch);

  // 强弱宫（卷一§1.4.2）：强=命/官禄/田宅/妻妾；次强=男女/福德/财帛；弱=兄弟/奴仆/疾厄/相貌/迁移
  const STRONG = ["命宫", "官禄", "田宅", "妻妾"];
  const MID = ["男女", "福德", "财帛"];
  const WEAK = ["兄弟", "奴仆", "疾厄", "相貌", "迁移"];
  const gongStrength = (gong: string): "强" | "次强" | "弱" =>
    STRONG.includes(gong) ? "强" : MID.includes(gong) ? "次强" : "弱";

  // ---------------------------------------------------------------------------
  // 节1 垣殿得地（卷三）
  // ---------------------------------------------------------------------------
  const yuandianItems: DuanyuItem[] = [];
  for (const s of stars) {
    const nm = s.name;
    if (s.inYuan) {
      yuandianItems.push({
        id: `yuan_${s.key}`,
        level: "ji",
        title: `${nm}入垣（${s.palaceBranch}宫）`,
        text: `入垣主得位当权，诸事亨通；${s.kind === "yu" ? "四余入垣与七政同论得地，惟四余性恶，入垣得地反主威权显达" : "七政入垣而身命居之，主大贵"}。`,
        source: "知识库卷三§3.1（张果星宗 p69）",
        verse: "入垣歌：日居狮子月巨蟹、木入寅亥火卯戌、土居子丑金辰酉、水到巳申是入垣。",
      });
    }
    if (s.shengDian) {
      yuandianItems.push({
        id: `dian_${s.key}`,
        level: "ji",
        title: `${nm}升殿（躔${s.xiuFullName}）`,
        text: "升殿者光明显赫，为得地之最贵。",
        source: "知识库卷三§3.2（张果星宗 p56-57）",
        verse: "升殿歌：日行房虚昴星度，月行心危毕张度，木行角斗奎井度，火行尾室觜翼度，土行氐女胃柳度，金行亢牛娄鬼度，水行箕壁参轸度。",
      });
    }
    const mwlx = MIAO_WANG_LE_XI[s.key];
    if (mwlx) {
      const hits: string[] = [];
      if (s.palaceBranch === mwlx.miao) hits.push("庙");
      if (s.palaceBranch === mwlx.wang) hits.push("旺");
      if (s.palaceBranch === mwlx.le) hits.push("乐");
      if (s.palaceBranch === mwlx.xi) hits.push("喜");
      if (hits.length > 0) {
        yuandianItems.push({
          id: `mwlx_${s.key}`,
          level: "ji",
          title: `${nm}居${hits.join("·")}之地（${s.palaceBranch}宫）`,
          text: "星入庙旺乐喜之地，其力倍增；临用则吉力厚，临凶则威力增。",
          source: "知识库卷三§3.3.2（古今占星学 p5-10）",
        });
      }
    }
    const jichan = JI_CHAN[s.key];
    if (jichan && jichan.includes(s.palaceBranch)) {
      yuandianItems.push({
        id: `jichan_${s.key}`,
        level: "xiong",
        title: `${nm}忌躔（在${s.palaceBranch}宫）`,
        text: `忌躔之地主人晦昧反复，行限值之大凶；宜参看有无恩星解救。`,
        source: "知识库卷三§3.4.1（张果星宗 p81）",
        verse: JI_CHAN_VERSE,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 节2 十干化曜（卷一§1.6 / 卷四§4.1）
  // ---------------------------------------------------------------------------
  const huayaoItems: DuanyuItem[] = [];
  const hyTable = HUAYAO_TABLE[gz.gan];
  // 化曜星 → 化曜名集合（一星可兼多化曜）
  const huaByStar = new Map<string, string[]>();
  for (const [name, short] of Object.entries(hyTable)) {
    const key = SHORT_KEY[short];
    if (!key) continue;
    huaByStar.set(key, [...(huaByStar.get(key) ?? []), name]);
  }
  for (const s of stars) {
    const huaNames = huaByStar.get(s.key);
    if (!huaNames || huaNames.length === 0) continue;
    const isMing = s.palaceBranch === mingBranch;
    const isShen = s.palaceBranch === shenBranch;
    if (!isMing && !isShen) continue;
    const guanKu = huaNames
      .map((n) => (HUAYAO_GONG[n] ? `${n}管${HUAYAO_GONG[n].join("、")}` : n))
      .join("，");
    const ji = huaNames.includes("天禄") || huaNames.includes("天福") || huaNames.includes("天贵") ||
      huaNames.includes("天印") || huaNames.includes("天权");
    const xiong = huaNames.includes("天刑") || huaNames.includes("天囚") || huaNames.includes("天暗") ||
      huaNames.includes("天耗") || huaNames.includes("天磨");
    huayaoItems.push({
      id: `hua_${s.key}`,
      level: ji ? "ji" : xiong ? "xiong" : "zhong",
      title: `${s.name}化${huaNames.join("·")}（守${isMing ? "命宫" : "身宫"}）`,
      text: `${gz.gan}年生人，${s.name}为${huaNames.join("、")}；${guanKu}。化吉曜守命主福，化刑囚暗耗守命主劳滞，宜参宫度得地与否。`,
      source: "知识库卷一§1.6.2（张果星宗 p21-22）",
      verse: "次序歌：禄暗福耗贵，刑印囚权罗（甲起）。",
    });
  }
  // 特化吉星（文魁官印催禄喜）守命身
  for (const [teName, table] of Object.entries(TEHUA_TABLE)) {
    const shorts = table[gz.gan];
    for (const short of shorts) {
      const key = SHORT_KEY[short];
      const s = key ? starByKey.get(key) : undefined;
      if (!s) continue;
      if (s.palaceBranch !== mingBranch && s.palaceBranch !== shenBranch) continue;
      huayaoItems.push({
        id: `tehua_${teName}_${key}`,
        level: "ji",
        title: `${teName}（${s.name}）守${s.palaceBranch === mingBranch ? "命" : "身"}`,
        text: `${gz.gan}年生人${teName}为${s.name}，${TEHUA_DESC[teName]}；守命身之地，其用愈显。`,
        source: "知识库卷一§1.6.3（张果星宗 p11-13）",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 节3 神煞吉凶（卷四）
  // ---------------------------------------------------------------------------
  const shenshaItems: DuanyuItem[] = [];
  const checkShaOnMingShen = (
    id: string, name: string, branch: string, level: DuanyuLevel, text: string, source: string, verse?: string,
  ) => {
    const hitMing = mingBranch === branch;
    const hitShen = shenBranch === branch;
    if (!hitMing && !hitShen) return;
    shenshaItems.push({
      id,
      level,
      title: `${name}在${branch}宫（${hitMing ? "命宫坐煞" : "身宫坐煞"}）`,
      text,
      source,
      verse,
    });
  };

  // 阳刃/飞刃（年干）
  const yr = YANG_REN[gz.gan];
  checkShaOnMingShen(
    `sha_yangren`, "阳刃", yr, "xiong",
    "刃为刀刃，最忌身命坐刃、限行刃地；金掌刃愈烈，火罗加刃主血光。",
    "知识库卷四§4.2.1（张果星宗 p16、p65）",
  );
  checkShaOnMingShen(
    `sha_feiren`, "飞刃（唐符）", chong(yr), "xiong",
    "飞刃为阳刃对冲之宫；唐符即飞刃，忌身命坐之。",
    "知识库卷四§4.2.1（张果星宗 p16、p88-89）",
  );
  // 的煞/咸池/劫煞/亡神/驿马/将星/华盖/攀鞍（年支三合）
  const sanhe = SANHE[gz.zhi];
  if (sanhe) {
    checkShaOnMingShen(`sha_de`, "的煞（破碎）", sanhe.deshao, "xiong",
      "的煞即破碎，忌身命坐之、限行犯之，主破财官非。",
      "知识库卷四§4.5.1（张果星宗 p18、p61）",
      "的煞歌：人命如逢破碎煞，破财恰似汤浇雪，行年运限更加临，官事连绵无休歇。");
    checkShaOnMingShen(`sha_xianchi`, "咸池（桃花）", sanhe.xianchi, "xiong",
      "身命坐咸池，或咸池星入身命，更会金水孛者，主风流；桃花带马主背夫远逃。",
      "知识库卷四§4.5.2（张果星宗 p18、p95）");
    checkShaOnMingShen(`sha_jie`, "劫煞", sanhe.jie, "xiong",
      "劫煞主盗贼、横祸；劫亡合命值限加凶星，主遭刑犯罪。",
      "知识库卷四§4.5.3（张果星宗 p16、p83）");
    checkShaOnMingShen(`sha_wang`, "亡神", sanhe.wang, "xiong",
      "亡神主销铄、官非；与劫煞同看。",
      "知识库卷四§4.5.3（张果星宗 p16、p83）");
    checkShaOnMingShen(`sha_ma`, "驿马", sanhe.ma, "zhong",
      "马星主迁移流动，马入身命主奔走四方；有马须用鞍（马前一位），方为有用。",
      "知识库卷四§4.5.4（张果星宗 p16、p65）");
    checkShaOnMingShen(`sha_jiang`, "将星", sanhe.jiang, "ji",
      "将星入命，主掌权柄威望。",
      "知识库卷四§4.5.4（张果星宗 p16）");
    checkShaOnMingShen(`sha_huagai`, "华盖", sanhe.huagai, "zhong",
      "华盖守身命清贵孤高，守男女宫则子嗣缘薄；日月居之主僧道。",
      "知识库卷四§4.5.4/§4.5.6（张果星宗 p16、p76）");
    checkShaOnMingShen(`sha_pan`, "攀鞍", maQian(sanhe.ma), "zhong",
      "攀鞍在马前一位，与驿马相辅主贵显。",
      "知识库卷四§4.5.4（张果星宗 p16）");
  }
  // 孤辰寡宿
  const guchen = GU_CHEN[gz.zhi];
  if (guchen) {
    checkShaOnMingShen(`sha_gu`, "孤辰", guchen.gu, "xiong",
      "孤辰寡宿守身命及妻妾宫，主人孤寡；男女宫逢之主子嗣少缘。",
      "知识库卷四§4.5.5（张果星宗 p16、p61）");
    checkShaOnMingShen(`sha_gua`, "寡宿", guchen.gua, "xiong",
      "孤辰寡宿守身命，主人孤寡；参看妻妾宫有无吉星解救。",
      "知识库卷四§4.5.5（张果星宗 p16、p61）");
  }
  // 空亡（年干支旬空）
  const [kong1, kong2] = xunKong(gz.gan, gz.zhi);
  checkShaOnMingShen(`sha_kong1`, "空亡", kong1, "xiong",
    `命坐空亡及主星起坐空，主成败反复；忌限行空亡。（${gz.gan}${gz.zhi}旬中${kong1}${kong2}空）`,
    "知识库卷四§4.5.7（张果星宗 p16、p88）");
  checkShaOnMingShen(`sha_kong2`, "空亡", kong2, "xiong",
    `同旬空亡；身命坐之主成败反复。（${gz.gan}${gz.zhi}旬中${kong1}${kong2}空）`,
    "知识库卷四§4.5.7（张果星宗 p16、p88）");
  // 月煞
  const yuesha = YUE_SHA[input.month];
  if (yuesha) {
    checkShaOnMingShen(`sha_yue`, "月煞", yuesha, "xiong",
      `${input.month}月月煞在${yuesha}；此煞以月廉同断，忌身命限度。`,
      "知识库卷四§4.4.2（张果星宗 p17-18）",
      "月煞歌：正戌二巳七居辰，三午四未位相迎，五寅六卯八亥位，九子十丑十一申，十二月中居酉上，若犯此煞最刑。");
  }
  // 值难星（生月取星，忌入身命宫度）
  const zhinan = ZHI_NAN.find((z) => z.months.includes(input.month));
  if (zhinan) {
    for (const key of zhinan.stars) {
      const s = starByKey.get(key);
      if (s && (s.palaceBranch === mingBranch || s.palaceBranch === shenBranch)) {
        shenshaItems.push({
          id: `sha_zhinan_${key}`,
          level: "xiong",
          title: `值难星${s.name}犯${s.palaceBranch === mingBranch ? "命宫" : "身宫"}`,
          text: `${input.month}月生人以${zhinan.label}为值难；值难星忌入身命宫度，为祸最烈（即疾厄宫之凶煞）。`,
          source: "知识库卷四§4.4.3（张果星宗 p18、p82）",
          verse: "值难歌：正二太阳三四月，五六火罗君莫说，七八水孛更为殃，九十木气为雄哲，十一十二怕金星，此是神仙真口诀。",
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 节4 身命格局（卷六/卷七）
  // ---------------------------------------------------------------------------
  const gejuItems: DuanyuItem[] = [];

  // 三主：命主（命宫宫主）、命度主（命度宿主）、身主（身度宿主）
  const mingGongInfo = result.palaces.find((p) => p.branch === mingBranch);
  const shenGongInfo = result.palaces.find((p) => p.branch === shenBranch);
  const mingZhu = mingGongInfo?.owner ?? "";
  const shenZhu = result.shenDuZhu;
  const duZhu = result.mingDuZhu;
  const mk = mingGongInfo?.ownerKey ? starByKey.get(mingGongInfo.ownerKey) : undefined;

  // 三主高强断（卷七§7.1.1）
  const zhuStars: Array<{ label: string; star?: StarPosition; name: string }> = [
    { label: "命主", star: mk, name: mingZhu },
    { label: "命度主", star: duZhu ? starByKey.get(starNameToKey(duZhu) ?? "") : undefined, name: duZhu },
    { label: "身主", star: shenZhu ? starByKey.get(starNameToKey(shenZhu) ?? "") : undefined, name: shenZhu },
  ];
  for (const z of zhuStars) {
    if (!z.star) continue;
    const strength = gongStrength(z.star.renshiGong);
    const deDi = z.star.inYuan || z.star.shengDian;
    gejuItems.push({
      id: `zhu_${z.label}`,
      level: strength === "弱" ? "xiong" : deDi ? "ji" : "zhong",
      title: `${z.label}${z.name}居${z.star.renshiGong}（${strength}宫${deDi ? "·得地" : ""}）`,
      text:
        strength === "弱"
          ? `${z.label}入六弱之地，主辛劳奔波${z.label === "命主" ? "，为人作奴" : ""}；宜参有无恩星解救。`
          : deDi
            ? `三主高强福寿昌：${z.label}居${strength}宫又得地（入垣升殿），主富贵始终。`
            : `${z.label}居${strength}宫而不失次，平顺之象；得局与否参看恩难仇用。`,
      source: "知识库卷七§7.1.1/卷三§3.6（张果星宗 p79、p63-66）",
      verse: "观星要诀歌：宫身度主喜朝阳，三主高强福寿昌。",
    });
  }

  // 日月夹命（卷六§6.2.2）
  const mingIdx = ZHIS.indexOf(mingBranch as (typeof ZHIS)[number]);
  const prevBranch = ZHIS[(mingIdx + 11) % 12];
  const nextBranch = ZHIS[(mingIdx + 1) % 12];
  const sunB = starByKey.get("sun")?.palaceBranch;
  const moonB = starByKey.get("moon")?.palaceBranch;
  if (sunB && moonB) {
    const pair = [sunB, moonB].sort().join(",");
    const target = [prevBranch, nextBranch].sort().join(",");
    if (pair === target) {
      gejuItems.push({
        id: "geju_riyuejiaming",
        level: "ji",
        title: `日月夹命垣（${prevBranch}/${nextBranch}夹${mingBranch}）`,
        text: "命宫得日月在两傍夹之，又值玉堂禄勋之位尤妙；主贵显。",
        source: "知识库卷六§6.2.2（张果星宗 p62-63）",
      });
    }
  }

  // 金水辅日（卷六§6.2.2）
  if (sunB) {
    const sunIdx = ZHIS.indexOf(sunB as (typeof ZHIS)[number]);
    const vB = starByKey.get("venus")?.palaceBranch;
    const mB = starByKey.get("mercury")?.palaceBranch;
    const adjSun: Set<string> = new Set([ZHIS[(sunIdx + 11) % 12], ZHIS[(sunIdx + 1) % 12]]);
    if (vB && mB && adjSun.has(vB) && adjSun.has(mB)) {
      gejuItems.push({
        id: "geju_jinshuifuri",
        level: "ji",
        title: "金水辅日",
        text: "金水辅太阳，分明不杂、不破为佳；主聪明文贵。",
        source: "知识库卷六§6.2.2（张果星宗 p62-63）",
      });
    }
  }

  // 孤月独明（卷六§6.2.2）
  const moonStar = starByKey.get("moon");
  if (moonStar && !result.dayNight.isDay) {
    const alone = starsInBranch(moonStar.palaceBranch).length === 1;
    if (alone) {
      gejuItems.push({
        id: "geju_guyue",
        level: "ji",
        title: `孤月独明（太阴独居${moonStar.palaceBranch}宫）`,
        text: "太阴独明于黄道，一世享康福（夜生尤验）。",
        source: "知识库卷六§6.2.2（张果星宗 p62-63）",
      });
    }
  }

  // 五残星（卷七§7.1.3）：昼生火金孛月罗照命，夜生土木日气照命
  const wucan = result.dayNight.isDay
    ? ["mars", "venus", "bei", "moon", "luo"]
    : ["saturn", "jupiter", "sun", "qi"];
  const wucanHits = wucan.filter((k) => {
    const s = starByKey.get(k);
    return s && (s.palaceBranch === mingBranch || s.palaceBranch === chong(mingBranch));
  });
  if (wucanHits.length > 0) {
    gejuItems.push({
      id: "geju_wucan",
      level: "xiong",
      title: `五残星照命（${wucanHits.map((k) => STAR_NAMES[k]).join("、")}）`,
      text: `${result.dayNight.isDay ? "昼" : "夜"}生人${result.dayNight.isDay ? "火金孛月罗" : "土木日气"}照命，名曰五残星，主贫贱；须参格局高低与恩星解救。`,
      source: "知识库卷七§7.1.3（张果星宗 p80、p93）",
    });
  }

  // 昼夜向背（卷一§1.2.3/卷七§7.1.3）
  const yangGong = new Set(["子", "丑", "寅", "卯", "辰", "巳"]);
  const dayHits: string[] = [];
  const nightHits: string[] = [];
  for (const k of result.dayNight.isDay ? YANG_STARS : YIN_STARS) {
    const s = starByKey.get(k);
    if (!s) continue;
    const inYang = yangGong.has(s.palaceBranch);
    if (result.dayNight.isDay && inYang) dayHits.push(s.name);
    if (!result.dayNight.isDay && !inYang) nightHits.push(s.name);
  }
  const hits = result.dayNight.isDay ? dayHits : nightHits;
  if (hits.length > 0) {
    gejuItems.push({
      id: "geju_zhouye",
      level: "ji",
      title: `${result.dayNight.isDay ? "昼生阳星居阳宫" : "夜生阴星居阴宫"}（${hits.join("、")}）`,
      text: `${result.dayNight.isDay ? "昼生喜阳星在阳宫阳度" : "夜生爱阴星在阴宫阴度"}；合此者福禄崇高，反背为晦为孤。`,
      source: "知识库卷一§1.2.3（张果星宗 p3-5、p80）",
    });
  }

  // 四时得令（卷一§1.5.2）
  const ling = lingXing(input.month);
  const lingStar = starByKey.get(ling.star);
  if (lingStar) {
    const strength = gongStrength(lingStar.renshiGong);
    gejuItems.push({
      id: "geju_lingxing",
      level: strength === "弱" ? "zhong" : "ji",
      title: `当令星${ling.name}居${lingStar.renshiGong}（${strength}宫）`,
      text: `${ling.season}季${ling.name}当令（令星）；${strength === "弱" ? "令星陷弱宫，得令而不得地，福力减半" : "令星得地得宫，万物非时不生，观星非时不验"}。`,
      source: "知识库卷一§1.5.2（张果星宗 p24、p28-30）",
    });
  }

  // 身命二主宫位互参（卷二§2.5.3）：女命重身
  if (input.gender === "female" && shenGongInfo) {
    const shenStrength = gongStrength(shenGongInfo.renshiGong);
    gejuItems.push({
      id: "geju_nvshen",
      level: shenStrength === "弱" ? "xiong" : "zhong",
      title: `女命身宫居${shenGongInfo.renshiGong}（${shenStrength}宫）`,
      text: `女命重身，以身度为主；身宫${shenStrength === "弱" ? "居弱地，受用须参财福有无破" : "不失其所，参太阴有无拱夹吉凶"}。`,
      source: "知识库卷二§2.5.3（张果星宗 p4、p69）",
    });
  }

  // ---------------------------------------------------------------------------
  // 节5 十二宫断（卷七§7.3 十二宫所守拱照活看法）
  // ---------------------------------------------------------------------------
  const gongduanItems: DuanyuItem[] = [];
  // 化曜星集合（刑囚暗耗四凶化曜星 key）
  const xiongHuaKeys = new Set<string>();
  for (const [name, short] of Object.entries(hyTable)) {
    if (name === "天刑" || name === "天囚" || name === "天暗" || name === "天耗") {
      const k = SHORT_KEY[short];
      if (k) xiongHuaKeys.add(k);
    }
  }
  const jiHuaKeys = new Set<string>();
  for (const [name, short] of Object.entries(hyTable)) {
    if (name === "天禄" || name === "天福" || name === "天贵" || name === "天印") {
      const k = SHORT_KEY[short];
      if (k) jiHuaKeys.add(k);
    }
  }

  for (const p of result.palaces) {
    const gong = p.renshiGong;
    const inStars = p.stars.map((k) => starByKey.get(k)).filter((s): s is StarPosition => !!s);
    if (inStars.length === 0) continue;
    const names = inStars.map((s) => s.name).join("、");
    const has = (k: string) => p.stars.includes(k);
    const hasAny = (keys: string[]) => keys.some((k) => p.stars.includes(k));

    if (gong === "财帛") {
      const jiCai = hasAny(["sun", "moon"]) || hasAny([...jiHuaKeys]);
      const xiongCai = hasAny([...xiongHuaKeys]);
      gongduanItems.push({
        id: `gong_caibo`,
        level: xiongCai ? "xiong" : jiCai ? "ji" : "zhong",
        title: `财帛宫（${p.branch}）守${names}`,
        text: xiongCai
          ? `刑囚暗耗照财，是无受用之人；财帛宫忌天地耗、劫亡。`
          : jiCai
            ? `日月照财帛、禄福临财，皆是有财之人；参财星逢生旺得令与否。`
            : `${names}守财帛，参星曜生克向背定财之厚薄。`,
        source: "知识库卷七§7.3（张果星宗 p91-98）",
      });
    } else if (gong === "田宅") {
      const hasSaturn = has("saturn");
      const xiongTian = hasAny([...xiongHuaKeys]);
      gongduanItems.push({
        id: `gong_tianzhai`,
        level: xiongTian ? "xiong" : hasSaturn ? "ji" : "zhong",
        title: `田宅宫（${p.branch}）守${names}`,
        text: xiongTian
          ? "刑囚暗耗坐田宅主破财、外家冷落。"
          : hasSaturn
            ? "此宫惟喜土星居之，则安稳丰腴。"
            : `${names}守田宅，参田主得地与否。`,
        source: "知识库卷七§7.3（张果星宗 p91-98）",
      });
    } else if (gong === "男女") {
      const ziShu: Record<string, number> = { mercury: 1, mars: 2, jupiter: 3, venus: 4, saturn: 5 };
      const zi = inStars.map((s) => ziShu[s.key]).filter((n) => n > 0);
      const wucanZi = hasAny(["mars", "luo", "ji", "bei"]);
      gongduanItems.push({
        id: `gong_nannv`,
        level: wucanZi ? "xiong" : "zhong",
        title: `男女宫（${p.branch}）守${names}`,
        text: `水数一、火二、木三、金四、土五，加吉星则足其数，加凶星刑克必孤${zi.length > 0 ? `（本宫子星数约${zi.join("、")}）` : ""}${wucanZi ? "；火罗计孛入男女宫，主多子而不得力" : ""}。`,
        source: "知识库卷七§7.3（张果星宗 p91-98）",
      });
    } else if (gong === "官禄") {
      const wenKui = hasAny([...jiHuaKeys]);
      const caiXing = hasAny(["venus"]) && hasAny([...xiongHuaKeys]);
      gongduanItems.push({
        id: `gong_guanlu`,
        level: caiXing ? "xiong" : wenKui ? "ji" : "zhong",
        title: `官禄宫（${p.branch}）守${names}`,
        text: caiXing
          ? "官禄不宜财星生旺守照，主贪财坏名；忌天雄阳刃诸煞。"
          : wenKui
            ? "官禄宫宜文魁印星禄神守照，主官贵有声。"
            : `${names}守官禄；官星只宜文魁印星禄神守照，参得时得令。`,
        source: "知识库卷七§7.3（张果星宗 p91-98）",
      });
    } else if (gong === "福德") {
      const fuJi = hasAny(["sun", "moon", "mercury", "venus"]);
      const fuXiong = hasAny([...xiongHuaKeys]);
      gongduanItems.push({
        id: `gong_fude`,
        level: fuXiong ? "xiong" : fuJi ? "ji" : "zhong",
        title: `福德宫（${p.branch}）守${names}`,
        text: fuXiong
          ? "刑囚暗耗诸煞居福，必是刻薄凶狠之人，未见其福。"
          : fuJi
            ? "水日金月各居官福皆是有福之人；人生赖福德以安荣。"
            : `${names}守福德，参吉凶向背。`,
        source: "知识库卷七§7.3（张果星宗 p91-98）",
      });
    } else if (gong === "相貌") {
      const xiangMap: Record<string, string> = {
        venus: "金星独行相貌清秀",
        jupiter: "木瘦长清爽",
        mercury: "水眼目俊秀",
        mars: "火日生削面紫黑",
        saturn: "土肥白长大",
      };
      const xiang = inStars.map((s) => xiangMap[s.key]).filter(Boolean);
      if (xiang.length > 0) {
        gongduanItems.push({
          id: `gong_xiangmao`,
          level: "zhong",
          title: `相貌宫（${p.branch}）守${names}`,
          text: `${xiang.join("；")}。相貌宫乃性情之所钟。`,
          source: "知识库卷七§7.3（张果星宗 p91-98）",
        });
      }
    } else if (gong === "奴仆") {
      const zhuInNu = zhuStars.filter((z) => z.star?.renshiGong === "奴仆");
      if (zhuInNu.length > 0) {
        gongduanItems.push({
          id: `gong_nupu`,
          level: "xiong",
          title: `奴仆宫（${p.branch}）守${names}（${zhuInNu.map((z) => z.label).join("、")}入）`,
          text: `${zhuInNu.map((z) => z.label).join("、")}入奴仆，主辛劳奔波、为人作奴；若奴宫原是禄马贵人长生帝旺之地则不忌。`,
          source: "知识库卷七§7.3（张果星宗 p91-98）",
        });
      }
    } else if (gong === "妻妾") {
      const qiJi = hasAny([...jiHuaKeys]) || hasAny(["sun", "moon"]);
      const qiXiong = hasAny([...xiongHuaKeys]);
      gongduanItems.push({
        id: `gong_qiqie`,
        level: qiXiong ? "xiong" : qiJi ? "ji" : "zhong",
        title: `妻妾宫（${p.branch}）守${names}`,
        text: qiXiong
          ? "死绝的煞劫煞之宫不得好妻，会孤寡恶宿主无妻。"
          : qiJi
            ? "妻宫坐禄贵，主好妻美貌。"
            : `${names}守妻妾宫，参妻星得地与否。`,
        source: "知识库卷七§7.3（张果星宗 p91-98）",
      });
    } else if (gong === "疾厄") {
      const jiXiong = hasAny(["mars", "luo", "ji", "bei"]) || hasAny([...xiongHuaKeys]);
      const jiZhu = zhuStars.filter((z) => z.star?.renshiGong === "疾厄");
      gongduanItems.push({
        id: `gong_jie`,
        level: jiXiong ? "xiong" : "zhong",
        title: `疾厄宫（${p.branch}）守${names}`,
        text: `${jiXiong ? "火罗计孛刑囚暗耗会疾厄主重疾；" : ""}八煞之宫非特主疾厄，亦主一生操权${jiZhu.length > 0 ? `；${jiZhu.map((z) => z.label).join("、")}登八煞，得令得时诸星扶之为贵格（身命登八煞，科名须早发）` : ""}。`,
        source: "知识库卷七§7.3（张果星宗 p91-98）",
      });
    } else if (gong === "迁移") {
      const hasMa = hasAny(["mercury"]) || hasAny([...jiHuaKeys]);
      gongduanItems.push({
        id: `gong_qianyi`,
        level: "zhong",
        title: `迁移宫（${p.branch}）守${names}`,
        text: `迁移主星守命主远居；坐长生马者有四方之志${hasMa ? "；有马必用鞍（马前一位）、用鞭（马后一位），方为有用" : ""}。`,
        source: "知识库卷七§7.3（张果星宗 p91-98）",
      });
    } else if (gong === "兄弟") {
      gongduanItems.push({
        id: `gong_xiongdi`,
        level: hasAny([...xiongHuaKeys]) ? "xiong" : "zhong",
        title: `兄弟宫（${p.branch}）守${names}`,
        text: hasAny([...xiongHuaKeys])
          ? "官符居兄弟宫必官讼；参孤寡之星。"
          : "吉星入兄弟宫主兄弟豪富；参星性向背。",
        source: "知识库卷七§7.3（张果星宗 p91-98）",
      });
    } else if (gong === "命宫") {
      gongduanItems.push({
        id: `gong_ming`,
        level: hasAny([...xiongHuaKeys]) ? "xiong" : hasAny([...jiHuaKeys]) ? "ji" : "zhong",
        title: `命宫（${p.branch}）守${names}`,
        text: `立命以宫为轻、度主为重；最怕外来星犯命度。${hasAny([...jiHuaKeys]) ? "吉化曜守命，主富贵之基。" : ""}${hasAny([...xiongHuaKeys]) ? "刑囚暗耗守命，主劳滞；宜参恩星解救。" : ""}`,
        source: "知识库卷七§7.3（张果星宗 p91-98）",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 节6 歌赋引用（卷八）——命宫/身宫星曜之玉衡经性情断语
  // ---------------------------------------------------------------------------
  const gefuItems: DuanyuItem[] = [];
  const mingStars = starsInBranch(mingBranch);
  for (const s of mingStars) {
    const q = YUHENG_XINGQING[s.key];
    if (!q) continue;
    gefuItems.push({
      id: `gefu_ming_${s.key}`,
      level: "zhong",
      title: `玉衡经·${s.name}守命`,
      text: q.text,
      source: "知识库卷一§1.2.2/卷八§8.2（张果星宗 p67-68、p72-78）",
      verse: `玉衡经云：${q.text}`,
    });
  }
  const shenStars = starsInBranch(shenBranch);
  for (const s of shenStars) {
    if (s.palaceBranch === mingBranch) continue; // 命身同宫不重复
    const q = YUHENG_XINGQING[s.key];
    if (!q) continue;
    gefuItems.push({
      id: `gefu_shen_${s.key}`,
      level: "zhong",
      title: `玉衡经·${s.name}守身`,
      text: `身宫为太阴所寄、自身所安；${q.text}`,
      source: "知识库卷一§1.2.2/卷八§8.2（张果星宗 p67-68、p72-78）",
      verse: `玉衡经云：${q.text}`,
    });
  }
  // 断命总纲提示（卷八§8.5）
  gefuItems.push({
    id: "gefu_zonggang",
    level: "zhong",
    title: "断命总纲（果老要旨）",
    text: "先定身命，次看格局，再看化曜神煞，次论行限，末断人事。五星六曜，资我者吉、伤我者凶，亦随岁而变；星家断命以通变为主，不可执一途而拘。",
    source: "知识库卷八§8.5（张果星宗 p70-101）",
  });

  // ---------------------------------------------------------------------------
  // 汇总
  // ---------------------------------------------------------------------------
  const sections: DuanyuSection[] = [
    {
      key: "yuandian",
      name: "垣殿得地",
      desc: "卷三：入垣/升殿/庙旺乐喜/忌躔，逐星得地与否",
      items: yuandianItems,
    },
    {
      key: "huayao",
      name: "十干化曜",
      desc: "卷一§1.6/卷四：年干推化曜十星与文魁官印诸吉，守命身之断",
      items: huayaoItems,
    },
    {
      key: "shensha",
      name: "神煞吉凶",
      desc: "卷四：阳刃/的煞/咸池/劫亡/驿马将星华盖/孤寡/空亡/月煞/值难，命身坐煞之断",
      items: shenshaItems,
    },
    {
      key: "geju",
      name: "身命格局",
      desc: "卷六/卷七：三主强弱/日月夹命/金水辅日/孤月独明/五残星/昼夜向背/四时得令",
      items: gejuItems,
    },
    {
      key: "gongduan",
      name: "十二宫断",
      desc: "卷七§7.3：逐人事宫所守星曜断语（财帛/田宅/官禄/福德等）",
      items: gongduanItems,
    },
    {
      key: "gefu",
      name: "歌赋引用",
      desc: "卷八：命身宫星曜对应之玉衡经性情断语与断命总纲",
      items: gefuItems,
    },
  ];

  const all = sections.flatMap((s) => s.items);
  return {
    engineVersion: DUANYU_ENGINE_VERSION,
    yearGanzhi: gz,
    sections,
    summary: {
      ji: all.filter((i) => i.level === "ji").length,
      xiong: all.filter((i) => i.level === "xiong").length,
      zhong: all.filter((i) => i.level === "zhong").length,
      total: all.length,
    },
  };
}

/** 星名 → key（主引擎星名映射） */
function starNameToKey(name: string): string | undefined {
  const entry = Object.entries(STAR_NAMES).find(([, n]) => n === name);
  return entry?.[0];
}
