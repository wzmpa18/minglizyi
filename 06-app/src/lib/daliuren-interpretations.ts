/**
 * 大六壬经典解读数据库
 * 引经据典，来源：《大六壬大全》《大六壬指南》《大六壬心镜》《大六壬断案》等
 * 用于三传、四课、天地盘点击解读功能
 */

// ============================================================================
// 一、九宗门课体解读
// ============================================================================

export interface KeTiInterpretation {
  name: string;
  title: string;
  summary: string;
  details: string[];
  source: string;
}

export const KETI_INTERPRETATIONS: Record<string, KeTiInterpretation> = {
  "贼克": {
    name: "贼克",
    title: "贼克法 · 元首/重审",
    summary: "贼克法为九宗门之首，以一课之中上下相克取用。上克下曰元首，下克上曰重审。",
    details: [
      "元首课：上克下，主君临臣位，正大光明，事发由己。",
      "重审课：下克上，主臣谏君过，事多反复，需再三斟酌。",
      "贼克法取初传：取克贼之神为初传，初传之上神为中传，中传之上神为末传。",
      "贼克法为吉课，主事情有头绪，可循序渐进。"
    ],
    source: "《大六壬大全·卷二·九宗门》"
  },
  "比用": {
    name: "比用",
    title: "比用法 · 知一",
    summary: "比用法为二课以上有克贼，择与日干阴阳相比者取用。",
    details: [
      "知一课：多克择一，主事情复杂，但终有出路。",
      "比用者取与日干同阴阳者，阳日取阳，阴日取阴。",
      "比用法取初传后，初传之上神为中传，中传之上神为末传。",
      "知一课主须分辨是非，择善而从。"
    ],
    source: "《大六壬大全·卷二·九宗门》"
  },
  "涉害": {
    name: "涉害",
    title: "涉害法 · 见机/察微",
    summary: "涉害法为多克贼同阴阳时，择克之深者为用。涉害深者为见机，浅者为察微。",
    details: [
      "见机课：克害深者，主事有隐情，需深入调查。",
      "察微课：克害浅者，主事态初显，需及时把握。",
      "涉害法克害深浅以所临地盘之十二长生决定。",
      "涉害课主事情多阻碍，需多方考虑，不可轻举妄动。"
    ],
    source: "《大六壬大全·卷二·九宗门》"
  },
  "遥克": {
    name: "遥克",
    title: "遥克法 · 蒿矢/弹射",
    summary: "遥克法为四课无上下克贼，以日干与四课上神遥克取用。",
    details: [
      "蒿矢课：日干遥克上神，主动由己出，但力量不足，如射蒿箭。",
      "弹射课：上神遥克日干，主动由外来，事出突然，防不胜防。",
      "遥克课主事情远而不实，需谨慎对待，不可轻信。",
      "蒿矢弹射皆为远克，力量较弱，事虽成亦费力。"
    ],
    source: "《大六壬大全·卷二·九宗门》"
  },
  "昴星": {
    name: "昴星",
    title: "昴星法 · 虎视/冬蛇",
    summary: "昴星法为四课全无克贼且无遥克，取昴星（酉）为用。",
    details: [
      "虎视课：阳日昴星，取酉上神为初传，主动而难成。",
      "冬蛇课：阴日昴星，取酉下神为初传，主伏而不动。",
      "昴星课为不备课，主事情无头绪，需等待时机。",
      "虎视眈眈而难下手，冬蛇蛰伏而难行动，皆主迟滞。"
    ],
    source: "《大六壬大全·卷二·九宗门》"
  },
  "别责": {
    name: "别责",
    title: "别责法",
    summary: "别责法为四课不全（有二课相同）且无克贼遥克时，别择一神为用。",
    details: [
      "别责课主事情不完整，信息不全，需另寻他法。",
      "阳日别责取干合上神，阴日别责取支合上神。",
      "别责为无奈之课，主事情勉强为之，结果不可预期。",
      "别责课宜守不宜攻，静待时机为佳。"
    ],
    source: "《大六壬大全·卷二·九宗门》"
  },
  "八专": {
    name: "八专",
    title: "八专法",
    summary: "八专法为干支同位（日干寄宫等于日支），四课中仅有两课不同。",
    details: [
      "八专课主事情集中，专一不二，但视野狭窄。",
      "阳日八专取干上神后第三神，阴日取支后第三神。",
      "八专课为独断之课，主事情由一人主导，他人难以插手。",
      "八专课宜专注一事，不宜分心。"
    ],
    source: "《大六壬大全·卷二·九宗门》"
  },
  "伏吟": {
    name: "伏吟",
    title: "伏吟法",
    summary: "伏吟法为天地盘重合，月将等于占时，一切不动。",
    details: [
      "伏吟课主事情停滞，欲动不动，进退两难。",
      "伏吟有克取克，无克取日干上神为初传。",
      "伏吟课为自任之课，主事情由自身决定，外界无干扰。",
      "伏吟宜静不宜动，强行则凶。"
    ],
    source: "《大六壬大全·卷二·九宗门》"
  },
  "反吟": {
    name: "反吟",
    title: "反吟法",
    summary: "反吟法为天地盘相冲，月将冲占时，一切变动。",
    details: [
      "反吟课主事情反复，变动无常，计划赶不上变化。",
      "反吟有克取克，无克取驿马为初传。",
      "反吟课为动荡之课，主事情反复多变，需灵活应对。",
      "反吟宜动不宜静，顺势而为则吉。"
    ],
    source: "《大六壬大全·卷二·九宗门》"
  }
};

// ============================================================================
// 二、十二天将解读
// ============================================================================

export interface TianJiangInterpretation {
  name: string;
  fullName: string;
  summary: string;
  details: string[];
  source: string;
}

export const TIANJIANG_INTERPRETATIONS: Record<string, TianJiangInterpretation> = {
  "贵": {
    name: "贵",
    fullName: "天乙贵人",
    summary: "天乙贵人为十二天将之首，主贵人相助、逢凶化吉、尊贵威严。",
    details: [
      "贵人临课，主有贵人相助，事情顺利。",
      "贵人顺治：贵人顺行，主事情顺畅，贵人得力。",
      "贵人逆治：贵人逆行，主贵人乏力，需自力更生。",
      "贵人为吉将，临任何宫位皆主有助，但逆治则减力。"
    ],
    source: "《大六壬大全·卷三·十二天将》"
  },
  "蛇": {
    name: "蛇",
    fullName: "螣蛇",
    summary: "螣蛇为火神，主惊恐、虚诈、怪异、火光之灾。",
    details: [
      "螣蛇临课，主有惊吓之事，或遇虚诈之人。",
      "螣蛇为凶将，主口舌是非，需防小人暗算。",
      "螣蛇在初传：事发突然，令人惊恐。",
      "螣蛇在末传：结局虚惊一场，有惊无险。"
    ],
    source: "《大六壬大全·卷三·十二天将》"
  },
  "朱": {
    name: "朱",
    fullName: "朱雀",
    summary: "朱雀为火神，主口舌、文书、信息、是非。",
    details: [
      "朱雀临课，主有文书消息，或口舌是非。",
      "朱雀为凶将，主信息纷扰，需分辨真伪。",
      "朱雀在初传：消息传来，需注意内容。",
      "朱雀在末传：口舌之争，终有定论。"
    ],
    source: "《大六壬大全·卷三·十二天将》"
  },
  "合": {
    name: "合",
    fullName: "六合",
    summary: "六合为木神，主婚姻、中介、合作、交易。",
    details: [
      "六合临课，主有合作之事，或婚姻喜庆。",
      "六合为吉将，主事情能合，合作顺利。",
      "六合在初传：合伙之事，可以成功。",
      "六合在末传：合作结果，双方满意。"
    ],
    source: "《大六壬大全·卷三·十二天将》"
  },
  "勾": {
    name: "勾",
    fullName: "勾陈",
    summary: "勾陈为土神，主争斗、诉讼、拖延、田土之事。",
    details: [
      "勾陈临课，主有争斗或诉讼之事。",
      "勾陈为凶将，主事情拖延，难以速决。",
      "勾陈在初传：事起争端，需据理力争。",
      "勾陈在末传：事需拖延，急不得。"
    ],
    source: "《大六壬大全·卷三·十二天将》"
  },
  "龙": {
    name: "龙",
    fullName: "青龙",
    summary: "青龙为木神，主喜庆、财帛、升迁、贵人。",
    details: [
      "青龙临课，主有喜庆之事，或财运亨通。",
      "青龙为吉将之首，主万事顺遂，有贵人相助。",
      "青龙在初传：喜事临门，开门见喜。",
      "青龙在末传：结局圆满，皆大欢喜。"
    ],
    source: "《大六壬大全·卷三·十二天将》"
  },
  "空": {
    name: "空",
    fullName: "天空",
    summary: "天空为土神，主虚诈、不实、落空、欺骗。",
    details: [
      "天空临课，主事情落空，或信息不实。",
      "天空为凶将，主虚而不实，需防欺骗。",
      "天空在初传：所谋之事，恐难实现。",
      "天空在末传：结果虚无，一场空欢喜。"
    ],
    source: "《大六壬大全·卷三·十二天将》"
  },
  "虎": {
    name: "虎",
    fullName: "白虎",
    summary: "白虎为金神，主血光、丧事、疾病、刑伤。",
    details: [
      "白虎临课，主有血光之灾，或疾病丧事。",
      "白虎为凶将之最，主事情凶险，需格外小心。",
      "白虎在初传：事发突然，凶来迅速。",
      "白虎在末传：凶事已过，但需善后。"
    ],
    source: "《大六壬大全·卷三·十二天将》"
  },
  "常": {
    name: "常",
    fullName: "太常",
    summary: "太常为土神，主宴饮、服饰、礼仪、文化。",
    details: [
      "太常临课，主有宴饮应酬，或与文化礼仪相关之事。",
      "太常为吉将，主事情得体，有礼有节。",
      "太常在初传：以礼待人，事情顺利。",
      "太常在末传：结局圆满，皆大欢喜。"
    ],
    source: "《大六壬大全·卷三·十二天将》"
  },
  "玄": {
    name: "玄",
    fullName: "玄武",
    summary: "玄武为水神，主盗贼、阴谋、暗昧、隐私之事。",
    details: [
      "玄武临课，主有暗昧之事，或遇盗贼诈骗。",
      "玄武为凶将，主事情不透明，需防阴谋。",
      "玄武在初传：事涉暗昧，需谨慎行事。",
      "玄武在末传：隐情暴露，真相大白。"
    ],
    source: "《大六壬大全·卷三·十二天将》"
  },
  "阴": {
    name: "阴",
    fullName: "太阴",
    summary: "太阴为金神，主隐私、女性、暗中谋划、密事。",
    details: [
      "太阴临课，主有隐私之事，或与女性相关。",
      "太阴为吉将，主暗中得助，事情可成。",
      "太阴在初传：暗中谋划，不宜声张。",
      "太阴在末传：暗中得利，无需张扬。"
    ],
    source: "《大六壬大全·卷三·十二天将》"
  },
  "后": {
    name: "后",
    fullName: "天后",
    summary: "天后为水神，主女性、婚姻、恩泽、庇护。",
    details: [
      "天后临课，主有女性贵人相助，或婚姻之事。",
      "天后为吉将，主事情有庇护，得人恩惠。",
      "天后在初传：贵人相助，开门见喜。",
      "天后在末传：结局得恩，感恩戴德。"
    ],
    source: "《大六壬大全·卷三·十二天将》"
  }
};

// ============================================================================
// 三、十二地支解读（大六壬视角）
// ============================================================================

export interface ZhiDlrInterpretation {
  zhi: string;
  title: string;
  summary: string;
  details: string[];
  source: string;
}

export const ZHI_DLR_INTERPRETATIONS: Record<string, ZhiDlrInterpretation> = {
  "子": {
    zhi: "子",
    title: "子 · 神后",
    summary: "神后为水神，主暗昧、隐私、智慧、淫佚。在天为雨，在地为池。",
    details: [
      "神后临课，主有暗昧之事，或涉及隐私。",
      "子为水之帝旺，智慧深远，但易多疑。",
      "子为桃花星，主异性缘，也为暗昧之事。",
      "子加辰：水入水库，主智慧内敛。"
    ],
    source: "《大六壬大全·卷四·十二神将》"
  },
  "丑": {
    zhi: "丑",
    title: "丑 · 大吉",
    summary: "大吉为土神，主田宅、积蓄、稳重、缓慢。",
    details: [
      "大吉临课，主有田宅之事，或事情缓慢但稳定。",
      "丑为金库，主积蓄，有收藏之能。",
      "丑加子：水土相合，主稳定和谐。",
      "丑为贵人本家，主有贵人暗中相助。"
    ],
    source: "《大六壬大全·卷四·十二神将》"
  },
  "寅": {
    zhi: "寅",
    title: "寅 · 功曹",
    summary: "功曹为木神，主文书、官吏、事业、信息。",
    details: [
      "功曹临课，主有文书消息，或与事业相关。",
      "寅为木之禄地，主生气勃勃，事业向上。",
      "寅加巳：木火相生，主事业兴旺。",
      "寅为青龙本家，主喜庆之事。"
    ],
    source: "《大六壬大全·卷四·十二神将》"
  },
  "卯": {
    zhi: "卯",
    title: "卯 · 太冲",
    summary: "太冲为木神，主车辆、出行、门户、交易。",
    details: [
      "太冲临课，主有出行之事，或与门户相关。",
      "卯为木之帝旺，主生机勃发，行动力强。",
      "卯加戌：木土相合，主门户变动。",
      "卯为六合本家，主合作交易之事。"
    ],
    source: "《大六壬大全·卷四·十二神将》"
  },
  "辰": {
    zhi: "辰",
    title: "辰 · 天罡",
    summary: "天罡为土神，主争斗、诉讼、牢狱、死丧。",
    details: [
      "天罡临课，主有争斗之事，或涉及诉讼。",
      "辰为水库，主智慧，但也主暗昧。",
      "辰加酉：水土相合，主合约之事。",
      "辰为勾陈本家，主拖延争斗。"
    ],
    source: "《大六壬大全·卷四·十二神将》"
  },
  "巳": {
    zhi: "巳",
    title: "巳 · 太乙",
    summary: "太乙为火神，主文书、信息、口舌、炉灶。",
    details: [
      "太乙临课，主有文书信息，或口舌是非。",
      "巳为火之禄地，主热情积极，但易急躁。",
      "巳加申：火金相合，主变革之事。",
      "巳为螣蛇本家，主惊恐虚诈。"
    ],
    source: "《大六壬大全·卷四·十二神将》"
  },
  "午": {
    zhi: "午",
    title: "午 · 胜光",
    summary: "胜光为火神，主光明、文书、信息、宴饮。",
    details: [
      "胜光临课，主有光明之事，或文书信息。",
      "午为火之帝旺，主热情奔放，积极向上。",
      "午加未：火土相合，主稳定和谐。",
      "午为朱雀本家，主口舌是非。"
    ],
    source: "《大六壬大全·卷四·十二神将》"
  },
  "未": {
    zhi: "未",
    title: "未 · 小吉",
    summary: "小吉为土神，主饮食、宴席、医药、酒食。",
    details: [
      "小吉临课，主有宴饮之事，或与医药相关。",
      "未为木库，主积蓄，有收藏之能。",
      "未加午：土火相生，主喜庆宴饮。",
      "未为太常本家，主礼仪文化。"
    ],
    source: "《大六壬大全·卷四·十二神将》"
  },
  "申": {
    zhi: "申",
    title: "申 · 传送",
    summary: "传送为金神，主道路、信息、交通、变化。",
    details: [
      "传送临课，主有出行之事，或信息传递。",
      "申为金之禄地，主刚毅果断，有决断力。",
      "申加亥：金水相生，主智慧通达。",
      "申为白虎本家，主血光刑伤。"
    ],
    source: "《大六壬大全·卷四·十二神将》"
  },
  "酉": {
    zhi: "酉",
    title: "酉 · 从魁",
    summary: "从魁为金神，主妇女、阴私、金银、口舌。",
    details: [
      "从魁临课，主有妇女之事，或涉及金银。",
      "酉为金之帝旺，主精致秀美，有审美力。",
      "酉加寅：金木相克，主口舌是非。",
      "酉为太阴本家，主隐私密事。"
    ],
    source: "《大六壬大全·卷四·十二神将》"
  },
  "戌": {
    zhi: "戌",
    title: "戌 · 河魁",
    summary: "河魁为土神，主欺诈、印信、牢狱、鬼神。",
    details: [
      "河魁临课，主有欺诈之事，或涉及印信。",
      "戌为火库，主热情忠诚，但也主冲动。",
      "戌加卯：土金相合，主合约之事。",
      "戌为天空本家，主虚诈不实。"
    ],
    source: "《大六壬大全·卷四·十二神将》"
  },
  "亥": {
    zhi: "亥",
    title: "亥 · 登明",
    summary: "登明为水神，主文书、信息、恩泽、赏赐。",
    details: [
      "登明临课，主有文书恩泽，或信息传达。",
      "亥为水之禄地，主智慧通达，善于学习。",
      "亥加寅：水木相生，主智慧与行动结合。",
      "亥为玄武本家，主盗贼阴谋。"
    ],
    source: "《大六壬大全·卷四·十二神将》"
  }
};

// ============================================================================
// 四、六亲解读（大六壬角度）
// ============================================================================

export function getLiuqinInterpretation(liuqin: string): string {
  const map: Record<string, string> = {
    "父": "父母爻：主文书、长辈、庇护之事。父母爻动，主有文书信息或长辈之事。",
    "母": "父母爻：主文书、长辈、庇护之事。父母爻动，主有文书信息或长辈之事。",
    "兄": "兄弟爻：主朋友、同事、竞争之事。兄弟爻动，主有朋友之事或竞争。",
    "弟": "兄弟爻：主朋友、同事、竞争之事。兄弟爻动，主有朋友之事或竞争。",
    "子": "子孙爻：主子女、晚辈、娱乐、福气之事。子孙爻动，主有喜庆之象。",
    "孙": "子孙爻：主子女、晚辈、娱乐、福气之事。子孙爻动，主有喜庆之象。",
    "财": "妻财爻：主财运、妻子、物质之事。妻财爻动，主有财运或妻子之事。",
    "妻": "妻财爻：主财运、妻子、物质之事。妻财爻动，主有财运或妻子之事。",
    "官": "官鬼爻：主事业、官非、丈夫之事。官鬼爻动，主有事业或官非之事。",
    "鬼": "官鬼爻：主事业、官非、丈夫之事。官鬼爻动，主有事业或官非之事。",
    "我": "本命爻：主自身之事，一切以自身为中心。",
    "比": "比肩爻：主朋友、同事、竞争伙伴之事。",
    "生": "相生：主助力、扶持、顺利之事。",
    "克": "相克：主阻力、竞争、克制之事。",
  };
  return map[liuqin] || `六亲：${liuqin}，主与此相关之事。`;
}

// ============================================================================
// 五、三传解读
// ============================================================================

export interface SanChuanInterpretation {
  position: string;
  items: Array<{ type: string; title: string; content: string; source: string }>;
}

export function getSanChuanInterpretation(
  position: string,
  zhi: string,
  liuqin: string,
  tianJiang: string,
  dunGan: string
): SanChuanInterpretation {
  const items: Array<{ type: string; title: string; content: string; source: string }> = [];

  // 三传位置解读
  const posMap: Record<string, { title: string; desc: string }> = {
    "初": { title: "初传 · 事发之始", desc: "初传为事情之开端，主事发之由。初传吉则开局顺利，凶则开始不顺。" },
    "中": { title: "中传 · 事中之变", desc: "中传为事情之发展过程，主事情中间的变化。中传吉则过程顺利，凶则中途遇阻。" },
    "末": { title: "末传 · 事终之果", desc: "末传为事情之结局，主最终结果。末传吉则结局圆满，凶则结果不佳。" },
  };

  const posInfo = posMap[position];
  if (posInfo) {
    items.push({
      type: "position",
      title: posInfo.title,
      content: posInfo.desc,
      source: "《大六壬指南·三传论》"
    });
  }

  // 地支解读
  const zhiInfo = ZHI_DLR_INTERPRETATIONS[zhi];
  if (zhiInfo) {
    items.push({
      type: "zhi",
      title: `${zhi}（${zhiInfo.title}）`,
      content: zhiInfo.summary + "\n" + zhiInfo.details.slice(0, 2).join("\n"),
      source: zhiInfo.source
    });
  }

  // 六亲解读
  const liuqinDesc = getLiuqinInterpretation(liuqin);
  items.push({
    type: "liuqin",
    title: `六亲：${liuqin}`,
    content: liuqinDesc,
    source: "《大六壬大全·卷五·六亲论》"
  });

  // 天将解读
  const tianJiangInfo = TIANJIANG_INTERPRETATIONS[tianJiang];
  if (tianJiangInfo) {
    items.push({
      type: "shen",
      title: `${tianJiangInfo.fullName}（${tianJiang}）`,
      content: tianJiangInfo.summary + "\n" + tianJiangInfo.details.slice(0, 2).join("\n"),
      source: tianJiangInfo.source
    });
  }

  // 遁干解读
  if (dunGan && dunGan !== "〇") {
    const ganNames: Record<string, string> = {
      "甲": "甲木", "乙": "乙木", "丙": "丙火", "丁": "丁火",
      "戊": "戊土", "己": "己土", "庚": "庚金", "辛": "辛金",
      "壬": "壬水", "癸": "癸水"
    };
    items.push({
      type: "dungan",
      title: `遁干：${dunGan}（${ganNames[dunGan] || dunGan}）`,
      content: `旬遁天干为${dunGan}，主此宫隐藏之天干信息。遁干为隐，地支为显，遁干揭示事物之本质。`,
      source: "《大六壬大全·卷六·遁干论》"
    });
  }

  return { position, items };
}

// ============================================================================
// 六、四课解读
// ============================================================================

export function getSiKeInterpretation(
  label: string,
  shangShen: string,
  xiaShen: string,
  tianJiang: string,
  dunGan: string
): { label: string; items: Array<{ type: string; title: string; content: string; source: string }> } {
  const items: Array<{ type: string; title: string; content: string; source: string }> = [];

  // 四课位置解读
  const keLabelMap: Record<string, string> = {
    "一": "第一课（日干课）：主自身之事，为事情之主体。",
    "二": "第二课（日干阳课）：主自身之外部环境，为事情之辅助。",
    "三": "第三课（日支课）：主对方之事，为事情之客体。",
    "四": "第四课（日支阴课）：主对方之外部环境，为事情之辅助。",
  };

  const keDesc = keLabelMap[label];
  if (keDesc) {
    items.push({
      type: "position",
      title: `第${label}课`,
      content: keDesc,
      source: "《大六壬指南·四课论》"
    });
  }

  // 上神解读
  const shangInfo = ZHI_DLR_INTERPRETATIONS[shangShen];
  if (shangInfo) {
    items.push({
      type: "shangshen",
      title: `上神：${shangShen}（${shangInfo.title}）`,
      content: shangInfo.summary,
      source: shangInfo.source
    });
  }

  // 下神解读
  const xiaInfo = ZHI_DLR_INTERPRETATIONS[xiaShen];
  if (xiaInfo) {
    items.push({
      type: "xiashen",
      title: `下神：${xiaShen}（${xiaInfo.title}）`,
      content: xiaInfo.summary,
      source: xiaInfo.source
    });
  }

  // 天将解读
  const tianJiangInfo = TIANJIANG_INTERPRETATIONS[tianJiang];
  if (tianJiangInfo) {
    items.push({
      type: "shen",
      title: `${tianJiangInfo.fullName}`,
      content: tianJiangInfo.summary,
      source: tianJiangInfo.source
    });
  }

  return { label, items };
}

// ============================================================================
// 七、课体/中宫解读
// ============================================================================

export function getKeTiInterpretation(keTiName: string): KeTiInterpretation | null {
  // 尝试精确匹配
  if (KETI_INTERPRETATIONS[keTiName]) return KETI_INTERPRETATIONS[keTiName];
  // 尝试模糊匹配
  for (const key of Object.keys(KETI_INTERPRETATIONS)) {
    if (keTiName.includes(key)) return KETI_INTERPRETATIONS[key];
  }
  return null;
}