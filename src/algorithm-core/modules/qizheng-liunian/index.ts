// ============================================================================
// 七政四余流年模式引擎（P1-2 / GAP E2+E3+F4）
// ============================================================================
// 依据：FINAL-15 指令（流年模式：年份选择、原流相并、太岁、流年神煞/流年化曜）
//   × docx《七政四余入门学习心得》流年看法（顶星/太岁/流年神煞/流年化曜/
//     流年星辰/原流相并）×《七政四余标准化知识库 v1.0》。
// 实现范围（有明确知识库依据的部分）：
//   1. 流年天象盘：流年立春当日午正（出生地经纬、与本命同星制）十一曜，
//      落本命盘十二宫与二十八宿 → 「原流相并」同盘对照；
//   2. 太岁：流年支落本命宫（坐命/冲命/冲身判断）；
//   3. 流年神煞：流年干支起，复用断语引擎卷四神煞表（nianZhiShensha）；
//   4. 流年化曜：流年干起，复用断语引擎卷一§1.6 十干化曜表（huayaoStarKeysForGan）；
//   5. 流年顶星：流年星与本命命度黄经差＜0.5°（钓）。
// 挂起待源（不造假）：小限/划度/月限——docx 仅列名目，知识库无算法表，
//   待 Owner 供源后实现（GAP MATRIX 同口径）。
// 纪律：立春时刻取公共 jieqi 模块寿星历通用公式（日精度，非时刻精度），
//   引擎版本随主引擎冻结口径；断语分级仅作提示，不做绝对祸福断言。
// ============================================================================

import {
  calcQizhengChart,
  type QizhengInput,
  type QizhengResult,
} from "../qizheng";
import { nianZhiShensha, huayaoStarKeysForGan, ganzhiOfYear } from "../qizheng-duanyu";
import { getJieQiDate } from "../../common/jieqi";

const ZHI_INDEX: Record<string, number> = {
  子: 0, 丑: 1, 寅: 2, 卯: 3, 辰: 4, 巳: 5, 午: 6, 未: 7, 申: 8, 酉: 9, 戌: 10, 亥: 11,
};

export const LIUNIAN_ENGINE_VERSION =
  "七政流年引擎 v1.0.0（立春寿星历日精度；神煞/化曜复用断语引擎卷四/卷一表）";

/** 顶星容差：流年星与本命命度黄经差 < 0.5°（与图层引擎顶星同口径） */
const DINGXING_TOL = 0.5;

export interface LiunianStar {
  key: string;
  name: string;
  wuxing: string;
  /** 流年黄经（归一化 [0,360)） */
  lon: number;
  /** 落本命盘宫 */
  palaceBranch: string;
  palaceDegree: number;
  renshiGong: string;
  /** 落本命盘宿度 */
  xiuName: string;
  xiuFullName: string;
  xiuDegree: number;
  /** 原流相并：本命盘同星所在宫 */
  benmingPalaceBranch: string;
  /** 原流相并：本命盘同星宿度 */
  benmingXiu: string;
  /** 流年顶命度（黄经差<0.5°） */
  dingMingDu: boolean;
  /** 与本命同星黄经差（环形最短，度） */
  moveDeg: number;
}

export interface LiunianShensha {
  id: string;
  name: string;
  /** 煞落宫支 */
  branch: string;
  renshiGong: string;
  level: "ji" | "xiong" | "zhong";
  text: string;
  source: string;
  /** 落命宫 */
  onMing: boolean;
  /** 落身宫 */
  onShen: boolean;
  /** 冲命宫 */
  chongMing: boolean;
}

export interface LiunianHuayaoItem {
  huaName: string;
  starKey: string;
  starName: string;
  palaceBranch: string;
  renshiGong: string;
  level: "ji" | "xiong" | "zhong";
  onMing: boolean;
  onShen: boolean;
  source: string;
}

export interface QizhengLiunianResult {
  engineVersion: string;
  /** 流年公历年 */
  year: number;
  /** 立春日期（寿星历日精度） */
  lichun: { month: number; day: number; text: string };
  /** 流年干支（立春分界年） */
  ganzhi: { gan: string; zhi: string };
  /** 流年天象盘十一曜（落本命盘宫宿，原流相并） */
  stars: LiunianStar[];
  /** 太岁 */
  taiSui: {
    branch: string;
    renshiGong: string;
    zuoMing: boolean;
    chongMing: boolean;
    chongShen: boolean;
    text: string;
    source: string;
  };
  /** 流年神煞（流年干支起，卷四表） */
  shensha: LiunianShensha[];
  /** 流年化曜（流年干起，卷一§1.6 表） */
  huayao: LiunianHuayaoItem[];
  /** 流年顶命度星 */
  dingXing: Array<{ starName: string; diffDeg: number; source: string }>;
}

const norm360 = (x: number): number => ((x % 360) + 360) % 360;

/** 环形区间包含：lon ∈ [start, start+width)（mod 360，处理跨 0° 宫/宿） */
function inSpan(lon: number, start: number, width: number): boolean {
  const d = ((lon - start) % 360 + 360) % 360;
  return d < width;
}

const HUAYAO_JI = ["天禄", "天福", "天贵", "天印", "天权"];
const HUAYAO_XIONG = ["天刑", "天囚", "天暗", "天耗", "天磨"];

/**
 * 计算流年盘（原流相并）。
 * @param base 本命盘结果（宫界/宿界/命度等以本命盘为准）
 * @param liunianYear 流年公历年（立春分界）
 */
export function computeQizhengLiunian(
  base: QizhengResult,
  liunianYear: number,
): QizhengLiunianResult {
  // —— 立春（公共节气模块，寿星历日精度）——
  const lichun = getJieQiDate(liunianYear, 0); // 0 = 立春
  const lichunY = lichun.getFullYear();
  const lichunM = lichun.getMonth() + 1;
  const lichunD = lichun.getDate();

  // —— 流年干支（立春分界年直取：流年 Y 自立春 Y 起，公历 Y 年干支即流年干支；
  //    不经 yearGanzhi 再判边界——立春落在 2月3日 时会被误判上一年）——
  const gz = ganzhiOfYear(liunianYear);

  // —— 流年天象盘（立春当日午正，出生地，同星制同 Profile）——
  const lnInput: QizhengInput = {
    year: lichunY, month: lichunM, day: lichunD,
    hour: 12, minute: 0,
    lat: base.input.lat, lon: base.input.lon,
    tzOffset: 8, placeName: base.input.placeName,
    gender: base.input.gender,
    frame: base.frame,
    mingGongMode: base.input.mingGongMode,
    dongweiStart: base.dongwei.startBase === 9 ? 9 : 10,
  };
  const lnChart = calcQizhengChart(lnInput);

  const mingBranchIdx = base.mingGong.branchIndex;
  const shenBranchIdx = base.shenGong.branchIndex;
  const mingLon = norm360(base.mingDu.lon);

  const locatePalace = (lon: number) => {
    const p = base.palaces.find((pal) => inSpan(lon, pal.startLon, pal.width)) ?? base.palaces[0];
    const d = ((lon - p.startLon) % 360 + 360) % 360;
    return { branch: p.branch, degree: d, renshiGong: p.renshiGong };
  };
  const locateXiu = (lon: number) => {
    const m = base.mansions.find((man) => inSpan(lon, man.startLon, man.width)) ?? base.mansions[0];
    const d = ((lon - m.startLon) % 360 + 360) % 360;
    return { xiuName: m.name, xiuFullName: m.fullName, xiuDegree: d };
  };

  // —— 流年十一曜（原流相并）——
  const stars: LiunianStar[] = lnChart.stars.map((s) => {
    const lon = norm360(s.lon);
    const pal = locatePalace(lon);
    const xiu = locateXiu(lon);
    const bm = base.stars.find((b) => b.key === s.key);
    let moveDeg = 0;
    if (bm) {
      let d = Math.abs(lon - norm360(bm.lon));
      if (d > 360 - d) d = 360 - d;
      moveDeg = d;
    }
    return {
      key: s.key,
      name: s.name,
      wuxing: s.wuxing,
      lon,
      palaceBranch: pal.branch,
      palaceDegree: pal.degree,
      renshiGong: pal.renshiGong,
      xiuName: xiu.xiuName,
      xiuFullName: xiu.xiuFullName,
      xiuDegree: xiu.xiuDegree,
      benmingPalaceBranch: bm ? bm.palaceBranch : "",
      benmingXiu: bm ? `${bm.xiuFullName}${bm.xiuDegree.toFixed(1)}°` : "",
      dingMingDu: (() => {
        let d = Math.abs(lon - mingLon);
        if (d > 360 - d) d = 360 - d;
        return d > 0 && d < DINGXING_TOL;
      })(),
      moveDeg,
    };
  });

  // —— 太岁（流年支落本命宫）——
  const tsBranch = gz.zhi;
  const tsPal = base.palaces.find((p) => p.branch === tsBranch)!;
  const tsRelMing = ((ZHI_INDEX[tsBranch] - mingBranchIdx) + 12) % 12;
  const tsRelShen = ((ZHI_INDEX[tsBranch] - shenBranchIdx) + 12) % 12;
  const taiSui = {
    branch: tsBranch,
    renshiGong: tsPal.renshiGong,
    zuoMing: tsRelMing === 0,
    chongMing: tsRelMing === 6,
    chongShen: tsRelShen === 6,
    text:
      tsRelMing === 0
        ? `太岁坐命宫（${tsBranch}宫立命）：岁驾临命，主变动之年，宜静不宜动。`
        : tsRelMing === 6
          ? `太岁冲命宫（流年${tsBranch}冲${base.mingGong.branch}宫）：岁破对冲，主动荡反复，忌仓促决断。`
          : `太岁入${tsPal.renshiGong}（${tsBranch}宫）：该宫人事当年受岁君催动。`,
    source: "《七政四余入门学习心得》流年看法·太岁（docx）",
  };

  // —— 流年神煞（流年干支起，卷四表；落宫相对本命盘）——
  const shensha: LiunianShensha[] = nianZhiShensha(gz.gan, gz.zhi).map((it) => {
    const pal = base.palaces.find((p) => p.branch === it.branch);
    const relMing = pal ? (((ZHI_INDEX[it.branch] - mingBranchIdx) + 12) % 12) : -1;
    return {
      id: `ln_${it.id}`,
      name: it.name,
      branch: it.branch,
      renshiGong: pal?.renshiGong ?? "",
      level: it.level,
      text: it.text,
      source: it.source,
      onMing: relMing === 0,
      onShen: pal ? (((ZHI_INDEX[it.branch] - shenBranchIdx) + 12) % 12) === 0 : false,
      chongMing: relMing === 6,
    };
  });

  // —— 流年化曜（流年干起，卷一§1.6 十化曜；守命身判断）——
  const huayao: LiunianHuayaoItem[] = huayaoStarKeysForGan(gz.gan)
    .filter((h) => h.starKey)
    .map((h) => {
      const lnStar = stars.find((s) => s.key === h.starKey)!;
      const level: "ji" | "xiong" | "zhong" = HUAYAO_JI.includes(h.huaName)
        ? "ji"
        : HUAYAO_XIONG.includes(h.huaName)
          ? "xiong"
          : "zhong";
      return {
        huaName: h.huaName,
        starKey: h.starKey,
        starName: lnStar.name,
        palaceBranch: lnStar.palaceBranch,
        renshiGong: lnStar.renshiGong,
        level,
        onMing: ZHI_INDEX[lnStar.palaceBranch] === mingBranchIdx,
        onShen: ZHI_INDEX[lnStar.palaceBranch] === shenBranchIdx,
        source: "知识库卷一§1.6.2（张果星宗 p21-22）",
      };
    });

  // —— 流年顶星（流年星钓本命命度）——
  const dingXing = stars
    .filter((s) => s.dingMingDu)
    .map((s) => {
      let d = Math.abs(s.lon - mingLon);
      if (d > 360 - d) d = 360 - d;
      return {
        starName: s.name,
        diffDeg: d,
        source: "《七政四余入门学习心得》感应方式·宫的守冲钓（docx）",
      };
    });

  return {
    engineVersion: LIUNIAN_ENGINE_VERSION,
    year: liunianYear,
    lichun: { month: lichunM, day: lichunD, text: `${lichunY}年${lichunM}月${lichunD}日` },
    ganzhi: gz,
    stars,
    taiSui,
    shensha,
    huayao,
    dingXing,
  };
}
