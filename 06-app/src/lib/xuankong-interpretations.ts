/**
 * 玄空飞星经典解读数据库
 * 引经据典，来源：《沈氏玄空学》《玄空秘旨》《天玉经》《青囊奥语》
 * 用于玄空飞星宫位点击解读功能
 */

export interface XuankongInterpretItem {
  type: "palace" | "star" | "zuhe" | "yun";
  title: string;
  content: string;
  source: string;
}

// ============================================================================
// 九宫方位解读
// ============================================================================

export const GONG_DETAILS: Record<number, { bagua: string; wuxing: string; direction: string; summary: string; details: string[] }> = {
  1: {
    bagua: "坎", wuxing: "水", direction: "北",
    summary: "坎宫属水，为中男之位，主北方。坎宫为水之源，关乎智慧、事业、财运。",
    details: [
      "坎为水，主智，代表中男、耳、肾。",
      "坎宫飞星吉则事业顺利、财运亨通。",
      "坎宫飞星凶则需防水患、耳疾、肾疾。",
      "宜布置水元素，忌土克水。"
    ]
  },
  2: {
    bagua: "坤", wuxing: "土", direction: "西南",
    summary: "坤宫属土，为母之位，主西南方。坤宫关乎家庭、健康、稳定。",
    details: [
      "坤为地，主母，代表脾胃、腹部。",
      "坤宫飞星吉则家庭和睦、健康平安。",
      "坤宫飞星凶则需防脾胃疾病、家庭不和。",
      "宜布置土元素，忌木克土。"
    ]
  },
  3: {
    bagua: "震", wuxing: "木", direction: "东",
    summary: "震宫属木，为长男之位，主东方。震宫关乎事业、名声、进取。",
    details: [
      "震为雷，主长男，代表肝胆、足。",
      "震宫飞星吉则事业上升、名声远播。",
      "震宫飞星凶则需防肝胆疾病、事业受阻。",
      "宜布置木元素，忌金克木。"
    ]
  },
  4: {
    bagua: "巽", wuxing: "木", direction: "东南",
    summary: "巽宫属木，为长女之位，主东南方。巽宫关乎文昌、学业、人际。",
    details: [
      "巽为风，主长女，代表肝胆、股。",
      "巽宫飞星吉则文昌兴旺、学业有成。",
      "巽宫飞星凶则需防学业受阻、人际纠纷。",
      "宜布置木元素，旺文昌。"
    ]
  },
  5: {
    bagua: "中", wuxing: "土", direction: "中宫",
    summary: "中宫属土，为太极之位，主中央。中宫为枢纽，关乎全局运势。",
    details: [
      "中宫为中央枢纽，统摄八方。",
      "中宫飞星吉则全局顺遂、万事调和。",
      "中宫飞星凶则全局受阻，需特别注意。",
      "五黄入中宫需特别化解。"
    ]
  },
  6: {
    bagua: "乾", wuxing: "金", direction: "西北",
    summary: "乾宫属金，为父之位，主西北方。乾宫关乎权威、贵人、官运。",
    details: [
      "乾为天，主父，代表头、肺。",
      "乾宫飞星吉则贵人相助、官运亨通。",
      "乾宫飞星凶则需防头疾、肺疾、权威受损。",
      "宜布置金元素，忌火克金。"
    ]
  },
  7: {
    bagua: "兑", wuxing: "金", direction: "西",
    summary: "兑宫属金，为少女之位，主西方。兑宫关乎口舌、交际、财运。",
    details: [
      "兑为泽，主少女，代表口、肺。",
      "兑宫飞星吉则口才出众、交际顺利。",
      "兑宫飞星凶则需防口舌是非、呼吸道疾病。",
      "宜布置金元素，忌火克金。"
    ]
  },
  8: {
    bagua: "艮", wuxing: "土", direction: "东北",
    summary: "艮宫属土，为少男之位，主东北方。艮宫关乎子孙、健康、稳定。",
    details: [
      "艮为山，主少男，代表手、脾胃。",
      "艮宫飞星吉则子孙昌盛、健康稳定。",
      "艮宫飞星凶则需防子孙不宁、手部疾病。",
      "宜布置土元素，忌木克土。"
    ]
  },
  9: {
    bagua: "离", wuxing: "火", direction: "南",
    summary: "离宫属火，为中女之位，主南方。离宫关乎名声、财运、光明。",
    details: [
      "离为火，主中女，代表目、心。",
      "离宫飞星吉则名声显赫、财运亨通。",
      "离宫飞星凶则需防目疾、心疾、火灾。",
      "宜布置火元素，忌水克火。"
    ]
  },
};

// ============================================================================
// 九星解读
// ============================================================================

export const STAR_DETAILS: Record<number, { name: string; fullName: string; wuxing: string; jixiong: string; summary: string; details: string[] }> = {
  1: {
    name: "一白", fullName: "一白贪狼", wuxing: "水", jixiong: "吉",
    summary: "一白贪狼星，五行属水，为吉星。主官运、财运、桃花、人缘。当令时主旺财旺丁，失令时主桃花劫。",
    details: [
      "一白为贪狼星，又名文昌星，主文贵、官运。",
      "吉则：财运亨通、事业顺利、人缘佳。",
      "凶则：桃花劫、水厄、肾疾。",
      "宜用水元素化解或增强。"
    ]
  },
  2: {
    name: "二黑", fullName: "二黑巨门", wuxing: "土", jixiong: "凶",
    summary: "二黑巨门星，五行属土，为病符星。主疾病、伤痛、是非。当令时主旺丁，失令时主疾病缠身。",
    details: [
      "二黑为巨门星，又名病符星，主疾病灾祸。",
      "吉则：旺丁添口、家宅平安。",
      "凶则：疾病缠身、脾胃不适、是非不断。",
      "宜用金属物品化解，金泄土气。"
    ]
  },
  3: {
    name: "三碧", fullName: "三碧禄存", wuxing: "木", jixiong: "凶",
    summary: "三碧禄存星，五行属木，为是非星。主口舌、官司、争斗。当令时主口才出众，失令时主是非缠身。",
    details: [
      "三碧为禄存星，又名蚩尤星，主口舌是非。",
      "吉则：口才出众、交际广泛。",
      "凶则：口舌官司、争斗不断、肝胆疾病。",
      "宜用火元素化解，火泄木气。"
    ]
  },
  4: {
    name: "四绿", fullName: "四绿文曲", wuxing: "木", jixiong: "吉",
    summary: "四绿文曲星，五行属木，为文昌星。主学业、文采、功名。当令时主文昌兴旺，失令时主桃花劫。",
    details: [
      "四绿为文曲星，主文昌、学业、功名。",
      "吉则：学业有成、文采斐然、功名显达。",
      "凶则：桃花劫、学业受阻、精神不宁。",
      "宜用水元素滋养，水生木旺文昌。"
    ]
  },
  5: {
    name: "五黄", fullName: "五黄廉贞", wuxing: "土", jixiong: "大凶",
    summary: "五黄廉贞星，五行属土，为最凶之星。主灾祸、疾病、破财。无论当令与否，皆需化解。",
    details: [
      "五黄为廉贞星，又名正关煞，为九星中最凶者。",
      "主意外灾祸、重大疾病、破财破产。",
      "无论当令与否，皆需化解。",
      "宜用金属物品强力化解，不可用火生土。",
      "五黄所在方位忌动土、装修。"
    ]
  },
  6: {
    name: "六白", fullName: "六白武曲", wuxing: "金", jixiong: "吉",
    summary: "六白武曲星，五行属金，为偏财星。主武职、偏财、权威。当令时主权威显赫，失令时主破财。",
    details: [
      "六白为武曲星，主武职、偏财、权威。",
      "吉则：权威显赫、偏财旺盛、贵人相助。",
      "凶则：破财败业、权威受损、头部疾病。",
      "宜用土元素生金。"
    ]
  },
  7: {
    name: "七赤", fullName: "七赤破军", wuxing: "金", jixiong: "凶",
    summary: "七赤破军星，五行属金，为破败星。主口舌、破财、盗贼。当令时主口才出众，失令时主破财不断。",
    details: [
      "七赤为破军星，主破败、口舌、盗贼。",
      "吉则：口才极佳、交际广泛。",
      "凶则：破财不断、口舌是非、肺部疾病。",
      "宜用水元素泄金气。"
    ]
  },
  8: {
    name: "八白", fullName: "八白左辅", wuxing: "土", jixiong: "大吉",
    summary: "八白左辅星，五行属土，为当运财星。主财运、事业、旺丁。当令时主财运亨通，为最旺之财星。",
    details: [
      "八白为左辅星，为当运旺星，主财运事业。",
      "吉则：财运亨通、事业兴旺、旺丁旺财。",
      "凶则：财运受阻、脾胃不适。",
      "宜用火土元素增强，忌木克土。"
    ]
  },
  9: {
    name: "九紫", fullName: "九紫右弼", wuxing: "火", jixiong: "吉",
    summary: "九紫右弼星，五行属火，为喜庆星。主喜事、桃花、财运。当令时主喜事临门，失令时主火灾。",
    details: [
      "九紫为右弼星，主喜庆、桃花、财运。",
      "吉则：喜事临门、桃花旺盛、财运亨通。",
      "凶则：火灾、目疾、心疾、桃花劫。",
      "宜用木元素生火，忌水克火。"
    ]
  },
};

// ============================================================================
// 九运解读
// ============================================================================

export const YUN_DETAILS: Record<number, { name: string; summary: string; details: string[] }> = {
  1: { name: "上元一运", summary: "一白水运（1864-1883），水运当令，宜水利、航运等业。", details: ["一运为水运，水利、航运、渔业等行业兴旺。", "北方坎宫当旺，宜关注北方发展。"] },
  2: { name: "上元二运", summary: "二黑土运（1884-1903），土运当令，宜地产、农业等业。", details: ["二运为土运，地产、农业、建筑等行业兴旺。", "西南坤宫当旺，宜关注西南发展。"] },
  3: { name: "上元三运", summary: "三碧木运（1904-1923），木运当令，宜文化、教育等业。", details: ["三运为木运，文化、教育、出版等行业兴旺。", "东方震宫当旺，宜关注东方发展。"] },
  4: { name: "中元四运", summary: "四绿木运（1924-1943），木运当令，宜文化、教育等业。", details: ["四运为木运，文化、教育、艺术等行业兴旺。", "东南巽宫当旺，宜关注东南发展。"] },
  5: { name: "中元五运", summary: "五黄土运（1944-1963），土运当令，需注意灾祸。", details: ["五运为土运，但五黄为凶星，需注意灾祸。", "宜以金化解，忌动土。"] },
  6: { name: "中元六运", summary: "六白金运（1964-1983），金运当令，宜金融、科技等业。", details: ["六运为金运，金融、科技、制造等行业兴旺。", "西北乾宫当旺，宜关注西北发展。"] },
  7: { name: "下元七运", summary: "七赤金运（1984-2003），金运当令，宜金融、科技等业。", details: ["七运为金运，金融、科技、通信等行业兴旺。", "西方兑宫当旺，宜关注西方发展。"] },
  8: { name: "下元八运", summary: "八白土运（2004-2023），土运当令，宜地产、建设等业。", details: ["八运为土运，地产、建设、能源等行业兴旺。", "东北艮宫当旺，宜关注东北发展。"] },
  9: { name: "下元九运", summary: "九紫火运（2024-2043），火运当令，宜科技、文化等业。", details: ["九运为火运，科技、文化、娱乐等行业兴旺。", "南方离宫当旺，宜关注南方发展。"] },
};

// ============================================================================
// 辅助函数
// ============================================================================

/** 获取宫位解读 */
export function getXuankongGongInterpretation(gong: number): { title: string; items: XuankongInterpretItem[] } | null {
  const info = GONG_DETAILS[gong];
  if (!info) return null;

  return {
    title: `第${gong}宫 · ${info.bagua}宫 · ${info.direction}`,
    items: [{
      type: "palace",
      title: `${info.bagua}宫（${info.wuxing}）解读`,
      content: info.summary + "\n" + info.details.join("\n"),
      source: "《沈氏玄空学》",
    }],
  };
}

/** 获取飞星解读 */
export function getXuankongStarInterpretation(star: number): { title: string; items: XuankongInterpretItem[] } | null {
  const info = STAR_DETAILS[star];
  if (!info) return null;

  return {
    title: info.fullName + " · " + info.jixiong,
    items: [{
      type: "star",
      title: info.name + " " + info.fullName,
      content: info.summary + "\n" + info.details.join("\n"),
      source: "《玄空秘旨》",
    }],
  };
}

/** 获取元运解读 */
export function getXuankongYunInterpretation(yun: number): { title: string; items: XuankongInterpretItem[] } | null {
  const info = YUN_DETAILS[yun];
  if (!info) return null;

  return {
    title: info.name,
    items: [{
      type: "yun",
      title: info.name + "解读",
      content: info.summary + "\n" + info.details.join("\n"),
      source: "《天玉经》",
    }],
  };
}