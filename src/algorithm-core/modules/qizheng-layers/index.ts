// ============================================================================
// 七政四余盘面图层引擎 —— 12 项感应图层（GAP E1/H5）
// ============================================================================
// 依据：FINAL-15 效果图对照（docx 感应方式章节：宫的守冲钓、宿度同经、
// 顶度同络、夹引从朝）+《七政四余标准化知识库 v1.0》。
// 12 项图层（每项 RULE_ID 可追溯）：
//   宫位感应（相对命宫）：守（同宫）/ 冲（对宫+6）/ 三方（三合+4/+8）/
//     拱（对宫左右邻+5/+7）/ 夹（前后邻宫±1）
//   度数感应（相对命度）：同经（黄经差<1°）/ 同络（同宿）/ 顶星（黄经差<0.5°钓）/
//     顶度（同宿且宿度差<0.3°）
//   断语层：神煞（命/身坐煞宫，引自断语引擎神煞节）/ 化曜（年干化曜守命身，
//     引自断语引擎化曜节）
//   限流层：大限（当前查询虚岁的行限宫与限度）
// 纪律：只做盘面几何与断语引擎已有规则的图层化呈现，不新增判则；
//   吉凶分级一律继承断语引擎输出，几何感应层为中性提示。
// ============================================================================

import type { QizhengResult, StarPosition } from "../qizheng";
import type { QizhengDuanyuResult, DuanyuItem } from "../qizheng-duanyu";

export type LayerKey =
  | "shou" | "chong" | "sanfang" | "gong" | "jia"
  | "tongjing" | "tongluo" | "dingxing" | "dingdu"
  | "shensha" | "huayao" | "daxian";

export interface LayerLine {
  /** 规则 ID（QZ-LY-*，可追溯） */
  ruleId: string;
  starKey: string;
  starName: string;
  /** 连线目标 */
  target: "mingGong" | "shenGong" | "mingDu";
  targetLabel: string;
  /** 连线说明（如「木星守命宫」） */
  label: string;
  /** 出处 */
  source: string;
  level: "ji" | "xiong" | "zhong";
  /** 渲染锚点黄经 */
  fromLon: number;
  toLon: number;
}

export interface QizhengLayersResult {
  engineVersion: string;
  layers: Array<{ key: LayerKey; lines: LayerLine[] }>;
}

export const LAYERS_ENGINE_VERSION = "七政图层引擎 v1.0.0";

/** 12 项图层定义（key/名称/分组/出处），供开关面板与测试共用 */
export const LAYER_DEFS: Array<{
  key: LayerKey; name: string; group: "宫位感应" | "度数感应" | "断语层" | "限流层";
  desc: string; source: string;
}> = [
  { key: "shou", name: "守", group: "宫位感应", desc: "星在命宫同守", source: "知识库卷七§7.3（docx 感应方式·宫的守）" },
  { key: "chong", name: "冲", group: "宫位感应", desc: "星在命宫对宫", source: "docx 感应方式·宫的冲" },
  { key: "sanfang", name: "三方", group: "宫位感应", desc: "星在命宫三合宫（+4/+8）", source: "docx 感应方式·三方四正" },
  { key: "gong", name: "拱", group: "宫位感应", desc: "星在对宫左右邻宫（+5/+7）拱卫", source: "知识库卷六格局·拱照（docx 感应方式）" },
  { key: "jia", name: "夹", group: "宫位感应", desc: "星在命宫前后邻宫夹辅", source: "知识库卷六格局·日月夹命（docx 感应方式·夹引从朝）" },
  { key: "tongjing", name: "同经", group: "度数感应", desc: "星与命度黄经差＜1°", source: "docx 感应方式·宿度同经" },
  { key: "tongluo", name: "同络", group: "度数感应", desc: "星与命度同宿", source: "docx 感应方式·顶度同络" },
  { key: "dingxing", name: "顶星", group: "度数感应", desc: "星与命度黄经差＜0.5°（钓）", source: "docx 感应方式·宫的守冲钓" },
  { key: "dingdu", name: "顶度", group: "度数感应", desc: "星与命度同宿且宿度差＜0.3°", source: "docx 感应方式·顶度同络" },
  { key: "shensha", name: "神煞", group: "断语层", desc: "命宫/身宫坐煞警示（断语引擎神煞节）", source: "知识库卷四（断语引擎 shensha 节）" },
  { key: "huayao", name: "化曜", group: "断语层", desc: "年干化曜守命身（断语引擎化曜节）", source: "知识库卷一§1.6（断语引擎 huayao 节）" },
  { key: "daxian", name: "大限", group: "限流层", desc: "当前查询虚岁行限宫与限度", source: "知识库卷五·洞微大限（引擎主模块）" },
];

/** 宫支字符 → 支序（子0…亥11） */
const ZHI_INDEX: Record<string, number> = {
  子: 0, 丑: 1, 寅: 2, 卯: 3, 辰: 4, 巳: 5, 午: 6, 未: 7, 申: 8, 酉: 9, 戌: 10, 亥: 11,
};

/** 度数感应容差（古法度分近似，标注于引擎内） */
const TONGJING_TOL = 1.0; // 同经：黄经差 < 1°
const DINGXING_TOL = 0.5; // 顶星：黄经差 < 0.5°
const DINGDU_TOL = 0.3; // 顶度：同宿宿度差 < 0.3°

/** 黄经归一化到 [0,360)（宫起点近 360 时中心锚点会越界） */
const norm360 = (x: number): number => ((x % 360) + 360) % 360;

/** 宫中心黄经锚点（已归一化） */
const gongCenter = (p: { startLon: number; width: number }): number => norm360(p.startLon + p.width / 2);

function starLines(
  res: QizhengResult,
  stars: StarPosition[],
  target: "mingGong" | "shenGong",
  targetLabel: string,
  ruleId: string,
  source: string,
  labelOf: (s: StarPosition) => string,
): LayerLine[] {
  const t = target === "mingGong" ? res.mingGong : res.palaces[res.shenGong.branchIndex];
  return stars.map((s) => ({
    ruleId,
    starKey: s.key,
    starName: s.name,
    target,
    targetLabel,
    label: labelOf(s),
    source,
    level: "zhong" as const,
    fromLon: norm360(s.lon),
    toLon: gongCenter(t),
  }));
}

/** 从断语 item id 提取星 key（hua_jupiter / tehua_文星_venus → 星 key） */
function starKeyFromDuanyuId(id: string): string | null {
  const parts = id.split("_");
  if (parts.length < 2) return null;
  const key = parts[parts.length - 1];
  return /^[a-z]+$/.test(key) ? key : null;
}

/**
 * 计算 12 项图层连线。
 * @param res 排盘结果（必需）
 * @param duanyu 断语引擎结果（神煞/化曜层依赖；null 时两层为空）
 * @param xian 洞微大限行限查询结果（大限层依赖；null 时该层为空）
 */
export function computeQizhengLayers(
  res: QizhengResult,
  duanyu: QizhengDuanyuResult | null,
  xian: { row: { palaceBranch: string; renshiGong: string; startLon: number; width: number }; lon: number; xiuFullName: string; xiuDegree: number } | null,
): QizhengLayersResult {
  const mingBranch = res.mingGong.branchIndex;
  const shenBranch = res.shenGong.branchIndex;

  // —— 宫位感应（相对命宫支序差 mod 12）——
  const rel = (s: StarPosition): number => ((s.palaceBranch ? ZHI_INDEX[s.palaceBranch] - mingBranch : NaN) + 12) % 12;
  const byRel = (deltas: number[]): StarPosition[] =>
    res.stars.filter((s) => deltas.includes(rel(s)));

  const shouLines = starLines(res, byRel([0]), "mingGong", "命宫", "QZ-LY-SHOU",
    LAYER_DEFS[0].source, (s) => `${s.name}守命宫（${s.palaceBranch}宫）`);
  const chongLines = starLines(res, byRel([6]), "mingGong", "命宫", "QZ-LY-CHONG",
    LAYER_DEFS[1].source, (s) => `${s.name}冲命宫（${s.palaceBranch}宫对冲）`);
  const sanfangLines = starLines(res, byRel([4, 8]), "mingGong", "命宫", "QZ-LY-SANFANG",
    LAYER_DEFS[2].source, (s) => `${s.name}三方会命（${s.palaceBranch}宫三合）`);
  const gongLines = starLines(res, byRel([5, 7]), "mingGong", "命宫", "QZ-LY-GONG",
    LAYER_DEFS[3].source, (s) => `${s.name}拱照命宫（${s.palaceBranch}宫）`);
  const jiaLines = starLines(res, byRel([1, 11]), "mingGong", "命宫", "QZ-LY-JIA",
    LAYER_DEFS[4].source, (s) => `${s.name}夹辅命宫（${s.palaceBranch}宫贴命）`);

  // —— 度数感应（相对命度）——
  const mingLon = norm360(res.mingDu.lon);
  const lonDiff = (s: StarPosition): number => {
    let d = Math.abs(norm360(s.lon) - mingLon);
    if (d > 360 - d) d = 360 - d; // 环形最短差
    return d;
  };
  const tongjingStars = res.stars.filter((s) => lonDiff(s) < TONGJING_TOL && lonDiff(s) > 0);
  const tongjingLines: LayerLine[] = tongjingStars.map((s) => ({
    ruleId: "QZ-LY-TONGJING",
    starKey: s.key, starName: s.name,
    target: "mingDu", targetLabel: "命度",
    label: `${s.name}与命度同经（差${lonDiff(s).toFixed(2)}°）`,
    source: LAYER_DEFS[5].source, level: "zhong",
    fromLon: norm360(s.lon), toLon: mingLon,
  }));

  const tongluoStars = res.stars.filter((s) => s.xiuName === res.mingDu.xiuName && lonDiff(s) > DINGXING_TOL);
  const tongluoLines: LayerLine[] = tongluoStars.map((s) => ({
    ruleId: "QZ-LY-TONGLUO",
    starKey: s.key, starName: s.name,
    target: "mingDu", targetLabel: "命度",
    label: `${s.name}与命度同络（同踞${res.mingDu.xiuName}宿）`,
    source: LAYER_DEFS[6].source, level: "zhong",
    fromLon: norm360(s.lon), toLon: mingLon,
  }));

  const dingxingStars = res.stars.filter((s) => lonDiff(s) > 0 && lonDiff(s) < DINGXING_TOL);
  const dingxingLines: LayerLine[] = dingxingStars.map((s) => ({
    ruleId: "QZ-LY-DINGXING",
    starKey: s.key, starName: s.name,
    target: "mingDu", targetLabel: "命度",
    label: `${s.name}钓命度（差${lonDiff(s).toFixed(2)}°）`,
    source: LAYER_DEFS[7].source, level: "zhong",
    fromLon: norm360(s.lon), toLon: mingLon,
  }));

  const dingduStars = res.stars.filter(
    (s) => s.xiuName === res.mingDu.xiuName && Math.abs(s.xiuDegree - res.mingDu.xiuDegree) < DINGDU_TOL && lonDiff(s) > 0,
  );
  const dingduLines: LayerLine[] = dingduStars.map((s) => ({
    ruleId: "QZ-LY-DINGDU",
    starKey: s.key, starName: s.name,
    target: "mingDu", targetLabel: "命度",
    label: `${s.name}顶命度（${s.xiuName}宿${s.xiuDegree.toFixed(1)}°）`,
    source: LAYER_DEFS[8].source, level: "zhong",
    fromLon: norm360(s.lon), toLon: mingLon,
  }));

  // —— 神煞层（断语引擎神煞节：命/身坐煞宫 → 命宫警示连线）——
  const shenshaLines: LayerLine[] = [];
  if (duanyu) {
    const shaSection = duanyu.sections.find((sec) => sec.key === "shensha");
    if (shaSection) {
      for (const item of shaSection.items as DuanyuItem[]) {
        const m = item.title.match(/在(.+?)宫/);
        if (!m) continue;
        const branch = m[1];
        const bi = ZHI_INDEX[branch];
        if (bi == null) continue;
        const pal = res.palaces[bi];
        const onShen = item.title.includes("身宫坐煞");
        shenshaLines.push({
          ruleId: `QZ-LY-SHENSHA:${item.id}`,
          starKey: "",
          starName: item.title.split("（")[0],
          target: onShen ? "shenGong" : "mingGong",
          targetLabel: onShen ? "身宫" : "命宫",
          label: `${item.title.split("（")[0]}在${branch}宫（${onShen ? "身" : "命"}坐煞）`,
          source: item.source,
          level: item.level,
          fromLon: gongCenter(pal),
          toLon: onShen ? gongCenter(res.palaces[shenBranch]) : gongCenter(res.mingGong),
        });
      }
    }
  }

  // —— 化曜层（断语引擎化曜节：化曜星守命/身 → 连线）——
  const huayaoLines: LayerLine[] = [];
  if (duanyu) {
    const huaSection = duanyu.sections.find((sec) => sec.key === "huayao");
    if (huaSection) {
      for (const item of huaSection.items as DuanyuItem[]) {
        const key = starKeyFromDuanyuId(item.id);
        if (!key) continue;
        const s = res.stars.find((st) => st.key === key);
        if (!s) continue;
        const onShen = item.title.includes("守身宫");
        const t = onShen ? res.palaces[shenBranch] : res.mingGong;
        huayaoLines.push({
          ruleId: `QZ-LY-HUAYAO:${item.id}`,
          starKey: s.key,
          starName: s.name,
          target: onShen ? "shenGong" : "mingGong",
          targetLabel: onShen ? "身宫" : "命宫",
          label: item.title,
          source: item.source,
          level: item.level,
          fromLon: norm360(s.lon),
          toLon: gongCenter(t),
        });
      }
    }
  }

  // —— 大限层（行限查询：行限宫 → 命宫 + 限度锚点）——
  const daxianLines: LayerLine[] = [];
  if (xian) {
    const pal = res.palaces.find((p) => p.branch === xian.row.palaceBranch);
    if (pal) {
      daxianLines.push({
        ruleId: "QZ-LY-DAXIAN",
        starKey: "",
        starName: `行限${xian.row.renshiGong}`,
        target: "mingDu",
        targetLabel: `限度${xian.xiuFullName}${xian.xiuDegree.toFixed(1)}°`,
        label: `洞微行限：${xian.row.renshiGong}（${xian.row.palaceBranch}宫）· 限度${xian.xiuFullName}${xian.xiuDegree.toFixed(1)}°`,
        source: LAYER_DEFS[11].source,
        level: "zhong",
        fromLon: gongCenter(pal),
        toLon: norm360(xian.lon),
      });
    }
  }

  return {
    engineVersion: LAYERS_ENGINE_VERSION,
    layers: [
      { key: "shou", lines: shouLines },
      { key: "chong", lines: chongLines },
      { key: "sanfang", lines: sanfangLines },
      { key: "gong", lines: gongLines },
      { key: "jia", lines: jiaLines },
      { key: "tongjing", lines: tongjingLines },
      { key: "tongluo", lines: tongluoLines },
      { key: "dingxing", lines: dingxingLines },
      { key: "dingdu", lines: dingduLines },
      { key: "shensha", lines: shenshaLines },
      { key: "huayao", lines: huayaoLines },
      { key: "daxian", lines: daxianLines },
    ],
  };
}
