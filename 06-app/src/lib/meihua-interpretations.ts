/**
 * 梅花易数经典解读数据库
 * 引经据典，来源：《周易》《梅花易数》《周易本义》《焦氏易林》等
 * 用于梅花易数排盘点击解读功能
 */

// ============================================================================
// 一、八卦解读
// ============================================================================

export interface BaguaInterpretation {
  name: string;
  title: string;
  summary: string;
  details: string[];
  source: string;
}

export const BAGUA_INTERPRETATIONS: Record<string, BaguaInterpretation> = {
  "乾": {
    name: "乾",
    title: "乾卦 · 三连 · 天",
    summary: "乾为天，为圆，为君，为父，为玉，为金，为寒，为冰，为大赤，为良马。",
    details: [
      "乾，健也。天行健，君子以自强不息。",
      "乾卦三爻皆阳，纯阳之卦，至刚至健，为万物之首。",
      "五行属金，方位西北，对应人体头部。",
      "得乾卦者：主刚健有为，领袖之才，宜积极进取。"
    ],
    source: "《周易·说卦传》"
  },
  "兑": {
    name: "兑",
    title: "兑卦 · 上缺 · 泽",
    summary: "兑为泽，为少女，为巫，为口舌，为毁折，为附决。",
    details: [
      "兑，说也。丽泽兑，君子以朋友讲习。",
      "兑卦上爻阴、下两爻阳，象征喜悦、口舌、言语。",
      "五行属金，方位正西，对应人体口舌。",
      "得兑卦者：主口才出众，社交活跃，宜沟通交流。"
    ],
    source: "《周易·说卦传》"
  },
  "离": {
    name: "离",
    title: "离卦 · 中虚 · 火",
    summary: "离为火，为日，为电，为中女，为甲胄，为戈兵。",
    details: [
      "离，丽也。明两作离，大人以继明照于四方。",
      "离卦中间阴爻、上下阳爻，象征光明、依附、文明。",
      "五行属火，方位正南，对应人体眼睛。",
      "得离卦者：主光明磊落，文采斐然，宜发挥才智。"
    ],
    source: "《周易·说卦传》"
  },
  "震": {
    name: "震",
    title: "震卦 · 仰盂 · 雷",
    summary: "震为雷，为龙，为玄黄，为旉，为大涂，为长子，为决躁。",
    details: [
      "震，动也。洊雷震，君子以恐惧修省。",
      "震卦初爻阳、上两爻阴，象征震动、惊雷、行动。",
      "五行属木，方位正东，对应人体足部。",
      "得震卦者：主行动力强，有开创精神，宜果断决策。"
    ],
    source: "《周易·说卦传》"
  },
  "巽": {
    name: "巽",
    title: "巽卦 · 下断 · 风",
    summary: "巽为风，为木，为长女，为绳直，为工，为白，为长，为高。",
    details: [
      "巽，入也。随风巽，君子以申命行事。",
      "巽卦初爻阴、上两爻阳，象征柔顺、渗透、风。",
      "五行属木，方位东南，对应人体股部。",
      "得巽卦者：主柔顺谦逊，善于渗透，宜顺势而为。"
    ],
    source: "《周易·说卦传》"
  },
  "坎": {
    name: "坎",
    title: "坎卦 · 中满 · 水",
    summary: "坎为水，为沟渎，为隐伏，为矫輮，为弓轮。",
    details: [
      "坎，陷也。水洊至，习坎，君子以常德行习教事。",
      "坎卦中间阳爻、上下阴爻，象征险陷、水、智慧。",
      "五行属水，方位正北，对应人体肾脏。",
      "得坎卦者：主智慧深沉，历经险阻，宜坚守信念。"
    ],
    source: "《周易·说卦传》"
  },
  "艮": {
    name: "艮",
    title: "艮卦 · 覆碗 · 山",
    summary: "艮为山，为径路，为小石，为门阙，为果蓏，为阍寺。",
    details: [
      "艮，止也。兼山艮，君子以思不出其位。",
      "艮卦上爻阳、下两爻阴，象征止息、静止、山。",
      "五行属土，方位东北，对应人体手部。",
      "得艮卦者：主稳重踏实，知止不殆，宜适可而止。"
    ],
    source: "《周易·说卦传》"
  },
  "坤": {
    name: "坤",
    title: "坤卦 · 六断 · 地",
    summary: "坤为地，为母，为布，为釜，为吝啬，为均，为子母牛，为大舆。",
    details: [
      "坤，顺也。地势坤，君子以厚德载物。",
      "坤卦三爻皆阴，纯阴之卦，至柔至顺，为万物之母。",
      "五行属土，方位西南，对应人体腹部。",
      "得坤卦者：主包容柔顺，厚德载物，宜守不宜攻。"
    ],
    source: "《周易·说卦传》"
  },
};

// ============================================================================
// 二、六十四卦爻辞精选（每卦取彖传+大象传）
// ============================================================================

export interface HexagramDetail {
  num: number;
  name: string;
  tuanZhuan: string;
  daXiang: string;
  usage: string;
  source: string;
}

export const HEXAGRAM_DETAILS: Record<number, HexagramDetail> = {
  1: { num: 1, name: "乾为天", tuanZhuan: "大哉乾元，万物资始，乃统天。云行雨施，品物流形。", daXiang: "天行健，君子以自强不息。", usage: "占得此卦：主事业有成，宜积极进取，但需防刚愎自用。", source: "《周易·乾卦》" },
  2: { num: 2, name: "坤为地", tuanZhuan: "至哉坤元，万物资生，乃顺承天。坤厚载物，德合无疆。", daXiang: "地势坤，君子以厚德载物。", usage: "占得此卦：主柔顺包容，宜守不宜攻，宜静不宜动。", source: "《周易·坤卦》" },
  3: { num: 3, name: "水雷屯", tuanZhuan: "屯，刚柔始交而难生。动乎险中，大亨贞。", daXiang: "云雷屯，君子以经纶。", usage: "占得此卦：主事业初创，困难重重，但终有出头之日。", source: "《周易·屯卦》" },
  4: { num: 4, name: "山水蒙", tuanZhuan: "蒙，山下有险，险而止，蒙。蒙亨，以亨行时中也。", daXiang: "山下出泉，蒙，君子以果行育德。", usage: "占得此卦：主蒙昧未开，宜求学问道，不宜自作主张。", source: "《周易·蒙卦》" },
  5: { num: 5, name: "水天需", tuanZhuan: "需，须也，险在前也。刚健而不陷，其义不困穷矣。", daXiang: "云上于天，需，君子以饮食宴乐。", usage: "占得此卦：主时机未到，宜耐心等待，时机一到自然成功。", source: "《周易·需卦》" },
  6: { num: 6, name: "天水讼", tuanZhuan: "讼，上刚下险，险而健，讼。", daXiang: "天与水违行，讼，君子以作事谋始。", usage: "占得此卦：主诉讼口舌，宜和解不宜强争。", source: "《周易·讼卦》" },
  7: { num: 7, name: "地水师", tuanZhuan: "师，众也。贞，正也。能以众正，可以王矣。", daXiang: "地中有水，师，君子以容民畜众。", usage: "占得此卦：主竞争之事，宜选贤任能，以正制邪。", source: "《周易·师卦》" },
  8: { num: 8, name: "水地比", tuanZhuan: "比，吉也。比，辅也，下顺从也。", daXiang: "地上有水，比，先王以建万国亲诸侯。", usage: "占得此卦：主人际关系和谐，宜亲近贤者，团结合作。", source: "《周易·比卦》" },
  9: { num: 9, name: "风天小畜", tuanZhuan: "小畜，柔得位而上下应之，曰小畜。", daXiang: "风行天上，小畜，君子以懿文德。", usage: "占得此卦：主小有成就，但未到大成之时，宜继续积累。", source: "《周易·小畜卦》" },
  10: { num: 10, name: "天泽履", tuanZhuan: "履，柔履刚也。说而应乎乾，是以履虎尾不咥人亨。", daXiang: "上天下泽，履，君子以辨上下定民志。", usage: "占得此卦：主谨慎行事，虽有风险但可化解。", source: "《周易·履卦》" },
  11: { num: 11, name: "地天泰", tuanZhuan: "泰，小往大来，吉亨。天地交而万物通也。", daXiang: "天地交，泰，后以财成天地之道。", usage: "占得此卦：主万事亨通，时运极佳，宜积极进取。", source: "《周易·泰卦》" },
  12: { num: 12, name: "天地否", tuanZhuan: "否之匪人，不利君子贞。天地不交而万物不通也。", daXiang: "天地不交，否，君子以俭德辟难。", usage: "占得此卦：主时运不济，宜退守不宜进取。", source: "《周易·否卦》" },
  13: { num: 13, name: "天火同人", tuanZhuan: "同人，柔得位得中而应乎乾，曰同人。", daXiang: "天与火，同人，君子以类族辨物。", usage: "占得此卦：主合作顺利，社交运佳，宜与人合作。", source: "《周易·同人卦》" },
  14: { num: 14, name: "火天大有", tuanZhuan: "大有，柔得尊位，大中而上下应之，曰大有。", daXiang: "火在天上，大有，君子以遏恶扬善。", usage: "占得此卦：主财运亨通，事业兴旺，百事大吉。", source: "《周易·大有卦》" },
  15: { num: 15, name: "地山谦", tuanZhuan: "谦亨，天道下济而光明，地道卑而上行。", daXiang: "地中有山，谦，君子以裒多益寡。", usage: "占得此卦：主谦虚受益，骄傲招损，宜谦逊待人。", source: "《周易·谦卦》" },
  16: { num: 16, name: "雷地豫", tuanZhuan: "豫，刚应而志行，顺以动，豫。", daXiang: "雷出地奋，豫，先王以作乐崇德。", usage: "占得此卦：主心情愉悦，万事顺利，宜顺势而动。", source: "《周易·豫卦》" },
  17: { num: 17, name: "泽雷随", tuanZhuan: "随，刚来而下柔，动而说，随。", daXiang: "泽中有雷，随，君子以向晦入宴息。", usage: "占得此卦：主随机应变，顺势而为，宜跟随大势。", source: "《周易·随卦》" },
  18: { num: 18, name: "山风蛊", tuanZhuan: "蛊，刚上而柔下，巽而止，蛊。", daXiang: "山下有风，蛊，君子以振民育德。", usage: "占得此卦：主旧弊当除，宜改革更新，革除积弊。", source: "《周易·蛊卦》" },
  19: { num: 19, name: "地泽临", tuanZhuan: "临，刚浸而长，说而顺，刚中而应。", daXiang: "泽上有地，临，君子以教思无穷。", usage: "占得此卦：主运势上升，但需防盛极而衰。", source: "《周易·临卦》" },
  20: { num: 20, name: "风地观", tuanZhuan: "大观在上，顺而巽，中正以观天下。", daXiang: "风行地上，观，先王以省方观民设教。", usage: "占得此卦：主宜静观其变，不宜贸然行动。", source: "《周易·观卦》" },
  21: { num: 21, name: "火雷噬嗑", tuanZhuan: "颐中有物，曰噬嗑。噬嗑而亨，刚柔分，动而明。", daXiang: "雷电噬嗑，先王以明罚敕法。", usage: "占得此卦：主诉讼刑罚之事，宜公正裁决。", source: "《周易·噬嗑卦》" },
  22: { num: 22, name: "山火贲", tuanZhuan: "贲亨，柔来而文刚，故亨。", daXiang: "山下有火，贲，君子以明庶政无敢折狱。", usage: "占得此卦：主外表光鲜，但需注重实质。", source: "《周易·贲卦》" },
  23: { num: 23, name: "山地剥", tuanZhuan: "剥，剥也，柔变刚也。不利有攸往，小人长也。", daXiang: "山附于地，剥，上以厚下安宅。", usage: "占得此卦：主时运衰败，宜退守不宜进取。", source: "《周易·剥卦》" },
  24: { num: 24, name: "地雷复", tuanZhuan: "复亨，刚反。动而以顺行，是以出入无疾。", daXiang: "雷在地中，复，先王以至日闭关。", usage: "占得此卦：主时运好转，万象更新，宜重新开始。", source: "《周易·复卦》" },
  63: { num: 63, name: "水火既济", tuanZhuan: "既济亨，小者亨也。利贞，刚柔正而位当也。", daXiang: "水在火上，既济，君子以思患而预防之。", usage: "占得此卦：主事业初成，但需防盛极而衰，居安思危。", source: "《周易·既济卦》" },
  64: { num: 64, name: "火水未济", tuanZhuan: "未济亨，柔得中也。小狐汔济，未出中也。", daXiang: "火在水上，未济，君子以慎辨物居方。", usage: "占得此卦：主事业未成，宜继续努力，坚持到底。", source: "《周易·未济卦》" },
};

// ============================================================================
// 辅助函数
// ============================================================================

export interface MeihuaInterpretItem {
  type: "gua" | "bagua" | "tiyong" | "dongyao";
  title: string;
  content: string;
  source: string;
}

/** 获取卦象解读（含彖传+大象传+用卦指导） */
export function getMeihuaHexagramInterpretation(
  hexNum: number,
  hexName: string,
  guaCi: string,
): { items: MeihuaInterpretItem[] } {
  const items: MeihuaInterpretItem[] = [];
  const detail = HEXAGRAM_DETAILS[hexNum];

  if (detail) {
    items.push({
      type: "gua",
      title: hexName + " · 卦辞",
      content: guaCi,
      source: detail.source,
    });
    items.push({
      type: "gua",
      title: "彖传",
      content: detail.tuanZhuan,
      source: detail.source,
    });
    items.push({
      type: "gua",
      title: "大象传",
      content: detail.daXiang,
      source: detail.source,
    });
    items.push({
      type: "gua",
      title: "用卦指导",
      content: detail.usage,
      source: "《梅花易数》",
    });
  } else {
    // 未在细节库中的卦，只用卦辞
    items.push({
      type: "gua",
      title: hexName + " · 卦辞",
      content: guaCi,
      source: "《周易》",
    });
  }

  return { items };
}

/** 获取体用解读 */
export function getMeihuaTiYongInterpretation(
  tiGua: string,
  yongGua: string,
  tiWuxing: string,
  yongWuxing: string,
  relation: string,
  description: string,
): { items: MeihuaInterpretItem[] } {
  const items: MeihuaInterpretItem[] = [];

  // 体卦解读
  const tiBagua = BAGUA_INTERPRETATIONS[tiGua];
  if (tiBagua) {
    items.push({
      type: "tiyong",
      title: "体卦 · " + tiGua + "（" + tiWuxing + "）",
      content: tiBagua.summary + "\n" + tiBagua.details.join("\n"),
      source: tiBagua.source,
    });
  }

  // 用卦解读
  const yongBagua = BAGUA_INTERPRETATIONS[yongGua];
  if (yongBagua) {
    items.push({
      type: "tiyong",
      title: "用卦 · " + yongGua + "（" + yongWuxing + "）",
      content: yongBagua.summary + "\n" + yongBagua.details.join("\n"),
      source: yongBagua.source,
    });
  }

  // 生克关系
  items.push({
    type: "tiyong",
    title: "体用关系 · " + relation,
    content: description + "\n\n" +
      "体用生克为梅花易数断卦之核心。体卦代表问卦人自身，用卦代表所问之事。\n" +
      "用生体：事易成，有进益之喜，诸事顺遂。\n" +
      "体生用：有耗失，事难成，需付出较多。\n" +
      "用克体：事难成，有灾祸，宜谨慎防范。\n" +
      "体克用：事可成，但费力，需坚持不懈。\n" +
      "体用比和：诸事顺利，谋为可成，大吉之象。",
    source: "《梅花易数·体用生克篇》",
  });

  return { items };
}

/** 获取八卦解读 */
export function getMeihuaBaguaInterpretation(guaName: string): { items: MeihuaInterpretItem[] } | null {
  const info = BAGUA_INTERPRETATIONS[guaName];
  if (!info) return null;
  return {
    items: [{
      type: "bagua",
      title: info.title,
      content: info.summary + "\n" + info.details.join("\n"),
      source: info.source,
    }],
  };
}