/**
 * 奇门遁甲经典解读数据库
 * 引经据典，来源：《烟波钓叟歌》《奇门遁甲统宗》《御定奇门宝鉴》等
 * 用于九宫格点击解读功能
 */

export interface QimenStarInterpretation {
  star: string;
  title: string;
  summary: string;
  details: string[];
  source: string;
}

export const JIUXING_INTERPRETATIONS: Record<string, QimenStarInterpretation> = {
  "天蓬": {
    star: "天蓬",
    title: "天蓬星 · 贪狼星",
    summary: "天蓬星属水，为贪狼星，主盗贼、阴谋、破财，亦主大智大勇。",
    details: [
      "天蓬为坎宫之星，水性至阴，宜守不宜攻。",
      "宜安葬、修造、迁移，不宜出行、争讼、嫁娶。",
      "天蓬值符，利涉大川，水战尤佳。",
      "天蓬遇壬癸日时，水势太旺，需防破财。"
    ],
    source: "《烟波钓叟歌》"
  },
  "天芮": {
    star: "天芮",
    title: "天芮星 · 巨门星",
    summary: "天芮星属土，为巨门星，主疾病、灾祸、学生、求道。",
    details: [
      "天芮为坤宫之星，土性厚重，主疾病灾殃。",
      "宜求医问药、修学修道，不宜嫁娶、出行、征战。",
      "天芮星临值符，宜修德禳灾，不宜兴兵动众。",
      "天芮遇天禽星同宫，土气过旺，需防肠胃之疾。"
    ],
    source: "《奇门遁甲统宗·星门论》"
  },
  "天冲": {
    star: "天冲",
    title: "天冲星 · 禄存星",
    summary: "天冲星属木，为禄存星，主征战、出行、武事、报信。",
    details: [
      "天冲为震宫之星，木性刚直，有冲锋陷阵之势。",
      "宜出战、报捷、竞争，不宜嫁娶、修造、安葬。",
      "天冲星值符，宜发兵征战，出师必胜。",
      "天冲遇甲木日时，木气旺盛，适宜竞争进取。"
    ],
    source: "《御定奇门宝鉴》"
  },
  "天辅": {
    star: "天辅",
    title: "天辅星 · 文曲星",
    summary: "天辅星属木，为文曲星，主文化、教育、考试、辅佐。",
    details: [
      "天辅为巽宫之星，木性柔顺，有文采风流之象。",
      "宜考试、求学、上书、修造，不宜征战、争讼。",
      "天辅星值符，宜设教兴学，百事皆吉。",
      "天辅遇乙木日时，文星高照，利于科考。"
    ],
    source: "《奇门遁甲统宗·星门论》"
  },
  "天禽": {
    star: "天禽",
    title: "天禽星 · 廉贞星",
    summary: "天禽星属土，为廉贞星，居中宫而统四方，主公正、廉洁、统帅。",
    details: [
      "天禽为中宫之星，土性中和，有统御之德。",
      "宜祭祀、祈福、上任、修造，百事皆吉。",
      "天禽星不单独居宫，寄于坤二宫，与天芮同宫。",
      "天禽值符，大吉大利，尤利官方事务。"
    ],
    source: "《烟波钓叟歌》"
  },
  "天心": {
    star: "天心",
    title: "天心星 · 武曲星",
    summary: "天心星属金，为武曲星，主军事、决策、医疗、谋划。",
    details: [
      "天心为乾宫之星，金性刚健，有决断之才。",
      "宜征战、求医、合药、谋划，不宜营建、嫁娶。",
      "天心星值符，宜出兵征讨，战无不克。",
      "天心遇庚辛日时，金气刚锐，利于决断大事。"
    ],
    source: "《御定奇门宝鉴》"
  },
  "天柱": {
    star: "天柱",
    title: "天柱星 · 破军星",
    summary: "天柱星属金，为破军星，主破败、毁伤、口舌、诉讼。",
    details: [
      "天柱为兑宫之星，金性锐利，有破坏之象。",
      "宜修造、祭祀，不宜出行、征战、嫁娶。",
      "天柱星值符，宜隐忍退守，不宜强行出头。",
      "天柱遇庚辛日时，金气太盛，需防口舌是非。"
    ],
    source: "《奇门遁甲统宗·星门论》"
  },
  "天任": {
    star: "天任",
    title: "天任星 · 左辅星",
    summary: "天任星属土，为左辅星，主贵人、辅佐、安泰、农耕。",
    details: [
      "天任为艮宫之星，土性稳重，有贵人相助之象。",
      "宜求财、嫁娶、上任、安葬，百事皆吉。",
      "天任星值符，宜安邦治国，百事顺利。",
      "天任遇戊己日时，土气敦厚，贵人相助。"
    ],
    source: "《烟波钓叟歌》"
  },
  "天英": {
    star: "天英",
    title: "天英星 · 右弼星",
    summary: "天英星属火，为右弼星，主文书、信息、火灾、血光。",
    details: [
      "天英为离宫之星，火性炎上，有光明炫耀之象。",
      "宜上书、献策、宴乐，不宜征战、嫁娶、移徙。",
      "天英星值符，宜文书奏对，不宜行兵。",
      "天英遇丙丁日时，火气太旺，需防火灾血光。"
    ],
    source: "《御定奇门宝鉴》"
  },
  "芮禽": {
    star: "芮禽",
    title: "天芮·天禽 · 寄宫合星",
    summary: "天芮星与天禽星同宫于坤二，合称芮禽。天芮主疾病，天禽主中正。",
    details: [
      "天芮星主疾病灾殃，天禽星主中正平和。",
      "二星同宫，顺逆参半，以天芮为主，以天禽为辅。",
      "宜求医、修道、祭祀，不宜征战、嫁娶。",
      "天禽星寄于坤二宫，故坤宫为后天八卦之至重。"
    ],
    source: "《奇门遁甲统宗·寄宫论》"
  },
};

export interface QimenDoorInterpretation {
  door: string;
  title: string;
  summary: string;
  details: string[];
  source: string;
}

export const BAMEN_INTERPRETATIONS: Record<string, QimenDoorInterpretation> = {
  "休门": {
    door: "休门",
    title: "休门 · 吉门 · 水",
    summary: "休门属水，为三吉门之首，主休养、婚姻、求财、谒贵。",
    details: [
      "休门为坎宫之门，水性润下，宜休养生息。",
      "宜求财、嫁娶、谒贵、上任，百事皆宜。",
      "休门临值符，大吉大利，利见大人。",
      "休门遇壬癸日时，水气流通，利于钱财交易。"
    ],
    source: "《烟波钓叟歌》"
  },
  "生门": {
    door: "生门",
    title: "生门 · 吉门 · 土",
    summary: "生门属土，为三吉门之一，主生育、求财、产业、生机。",
    details: [
      "生门为艮宫之门，土性生发，万物生长。",
      "宜求财、种植、修造、嫁娶，大吉大利。",
      "生门临值符，宜置产立业，财源广进。",
      "生门遇戊己日时，土气旺盛，利于田产交易。"
    ],
    source: "《奇门遁甲统宗·八门论》"
  },
  "伤门": {
    door: "伤门",
    title: "伤门 · 凶门 · 木",
    summary: "伤门属木，为凶门，主伤害、疾病、刑伤、捕猎。",
    details: [
      "伤门为震宫之门，木性刚烈，有伤害之象。",
      "宜捕猎、讨债、竞争，不宜嫁娶、出行、求财。",
      "伤门临值符，宜讨捕盗贼，不宜其他。",
      "伤门遇甲乙日时，木气过旺，需防意外伤害。"
    ],
    source: "《御定奇门宝鉴》"
  },
  "杜门": {
    door: "杜门",
    title: "杜门 · 凶门 · 木",
    summary: "杜门属木，为凶门，主闭塞、隐藏、不通、阻隔。",
    details: [
      "杜门为巽宫之门，木性郁结，有闭塞不通之象。",
      "宜隐匿、躲藏、修道，不宜出行、嫁娶、求财。",
      "杜门临值符，宜隐避藏形，不宜公开行事。",
      "杜门遇甲乙日时，木气郁结，需防口舌阻隔。"
    ],
    source: "《奇门遁甲统宗·八门论》"
  },
  "景门": {
    door: "景门",
    title: "景门 · 中平门 · 火",
    summary: "景门属火，为中平门，主文书、信息、宴乐、血光。",
    details: [
      "景门为离宫之门，火性光明，有文书信息之象。",
      "宜上书、献策、宴乐、考试，不宜征战、嫁娶。",
      "景门临值符，利于文书奏对，但需防火灾。",
      "景门遇丙丁日时，火气旺盛，利于文书但不耐久。"
    ],
    source: "《烟波钓叟歌》"
  },
  "死门": {
    door: "死门",
    title: "死门 · 凶门 · 土",
    summary: "死门属土，为凶门，主死亡、终结、刑戮、狩猎。",
    details: [
      "死门为坤宫之门，土性归藏，有终结之象。",
      "宜狩猎、行刑、送葬，不宜出行、嫁娶、求财。",
      "死门临值符，百事不利，宜退守待时。",
      "死门遇戊己日时，土气太重，需防事业终结。"
    ],
    source: "《御定奇门宝鉴》"
  },
  "惊门": {
    door: "惊门",
    title: "惊门 · 凶门 · 金",
    summary: "惊门属金，为凶门，主惊恐、官司、口舌、盗贼。",
    details: [
      "惊门为兑宫之门，金性肃杀，有惊扰之象。",
      "宜捕盗、诉讼、竞争，不宜嫁娶、出行、求财。",
      "惊门临值符，宜缉捕逃犯，不宜其他。",
      "惊门遇庚辛日时，金气锐利，需防口舌官司。"
    ],
    source: "《奇门遁甲统宗·八门论》"
  },
  "开门": {
    door: "开门",
    title: "开门 · 吉门 · 金",
    summary: "开门属金，为三吉门之一，主开创、出行、求官、经商。",
    details: [
      "开门为乾宫之门，金性刚健，有开创之象。",
      "宜出行、上任、求财、嫁娶、征战，百事皆宜。",
      "开门临值符，大吉大利，万事亨通。",
      "开门遇庚辛日时，金气旺盛，利于开创事业。"
    ],
    source: "《烟波钓叟歌》"
  },
};

export interface QimenShenInterpretation {
  shen: string;
  title: string;
  summary: string;
  details: string[];
  source: string;
}

export const TIANSHEN_INTERPRETATIONS: Record<string, QimenShenInterpretation> = {
  "值符": {
    shen: "值符",
    title: "值符 · 天乙贵人",
    summary: "值符为八神之首，乃天乙贵人，主领袖、尊贵、权威、吉祥。",
    details: [
      "值符为天乙之神，所临之处百恶消散，诸事皆宜。",
      "值符临宫，宜谒贵、上任、求财、出行，大吉大利。",
      "值符为值符星之所在，即旬首之宫，最为尊贵。",
      "凡百事遇值符，皆主有贵人相助，逢凶化吉。"
    ],
    source: "《烟波钓叟歌》"
  },
  "螣蛇": {
    shen: "螣蛇",
    title: "螣蛇 · 虚诈之神",
    summary: "螣蛇为虚诈之神，主惊恐、怪异、虚妄、变化无常。",
    details: [
      "螣蛇为火土之神，其性虚诈多变，不可深信。",
      "螣蛇临宫，宜守不宜攻，宜静不宜动。",
      "螣蛇主口舌是非、虚惊怪异之事。",
      "螣蛇临值符宫，防小人暗算、虚诈之事。"
    ],
    source: "《奇门遁甲统宗·八神论》"
  },
  "太阴": {
    shen: "太阴",
    title: "太阴 · 阴佑之神",
    summary: "太阴为阴佑之神，主隐匿、谋划、暗中相助、密谋。",
    details: [
      "太阴为金水之神，其性阴柔，有暗中庇护之德。",
      "太阴临宫，宜密谋、隐匿、暗中行事。",
      "太阴主女性贵人、暗中相助之人。",
      "太阴临值符，宜私下谋划，不宜公开张扬。"
    ],
    source: "《御定奇门宝鉴》"
  },
  "六合": {
    shen: "六合",
    title: "六合 · 护卫之神",
    summary: "六合为护卫之神，主婚姻、交易、合作、和合之事。",
    details: [
      "六合为木神，其性和合，有撮合庇护之德。",
      "六合临宫，宜嫁娶、交易、合作、谈判，百事和谐。",
      "六合主婚姻喜事、商业合作、人际交往。",
      "六合临值符，宜结盟合作，不宜单独行动。"
    ],
    source: "《奇门遁甲统宗·八神论》"
  },
  "白虎": {
    shen: "白虎",
    title: "白虎 · 凶煞之神",
    summary: "白虎为凶煞之神，主杀伤、疾病、血光、争斗。",
    details: [
      "白虎为金神，其性刚猛，主杀伐征战之事。",
      "白虎临宫，宜征战、捕猎、行刑，不宜嫁娶、求财。",
      "白虎主血光之灾、意外伤害、手术之事。",
      "白虎临值符，宜以武制敌，不宜文事。"
    ],
    source: "《烟波钓叟歌》"
  },
  "玄武": {
    shen: "玄武",
    title: "玄武 · 盗贼之神",
    summary: "玄武为盗贼之神，主偷盗、遗失、阴谋、奸邪。",
    details: [
      "玄武为水神，其性阴险，主盗贼奸邪之事。",
      "玄武临宫，宜守不宜攻，宜防不宜进。",
      "玄武主丢失财物、被盗、受骗之事。",
      "玄武临值符，防小人暗害、财物丢失。"
    ],
    source: "《御定奇门宝鉴》"
  },
  "九地": {
    shen: "九地",
    title: "九地 · 坚牢之神",
    summary: "九地为坚牢之神，主稳固、长久、屯守、农耕。",
    details: [
      "九地为土神，其性厚重，有坚牢稳固之德。",
      "九地临宫，宜屯守、农耕、修造、安葬，不宜出行征战。",
      "九地主长久之事，慢而有成，不宜急躁。",
      "九地临值符，宜守不宜攻，宜静不宜动。"
    ],
    source: "《奇门遁甲统宗·八神论》"
  },
  "九天": {
    shen: "九天",
    title: "九天 · 威悍之神",
    summary: "九天为威悍之神，主扬兵、出征、远行、高远。",
    details: [
      "九天为金神，其性刚扬，有高远威武之象。",
      "九天临宫，宜征战、出行、远行，不宜嫁娶、安葬。",
      "九天主远大之事，利于扬名立万、开疆拓土。",
      "九天临值符，宜扬兵出征，不宜守成不变。"
    ],
    source: "《烟波钓叟歌》"
  },
};

export interface QimenPalaceInterpretation {
  palace: string;
  title: string;
  summary: string;
  details: string[];
  source: string;
}

export const JIUGONG_INTERPRETATIONS: Record<string, QimenPalaceInterpretation> = {
  "坎": {
    palace: "坎",
    title: "坎一宫 · 水 · 休门",
    summary: "坎宫属水，位居正北，为休门之本宫，主智慧、险陷、流动。",
    details: [
      "坎为水，万物之所归也，主智谋、险陷、润下。",
      "坎宫为休门本位，主休养生息、婚姻交易。",
      "坎宫天蓬星居之，水性至阴，宜守不宜攻。",
      "坎宫在人体主肾、膀胱、耳，在事主盗贼、阴谋。"
    ],
    source: "《易经·说卦传》"
  },
  "坤": {
    palace: "坤",
    title: "坤二宫 · 土 · 死门",
    summary: "坤宫属土，位居西南，为死门之本宫，主包容、承载、终结。",
    details: [
      "坤为地，万物皆致养焉，主柔顺、包容、承载。",
      "坤宫为死门本位，主终结、归藏、刑戮。",
      "坤宫天芮星居之，主疾病灾殃，又为中宫寄宫。",
      "坤宫在人体主脾、胃、腹，在事主土地、房产。"
    ],
    source: "《易经·说卦传》"
  },
  "震": {
    palace: "震",
    title: "震三宫 · 木 · 伤门",
    summary: "震宫属木，位居正东，为伤门之本宫，主震动、行动、伤害。",
    details: [
      "震为雷，万物出乎震，主动作、奋起、惊动。",
      "震宫为伤门本位，主伤害、刑伤、竞争。",
      "震宫天冲星居之，木性刚直，有冲锋之势。",
      "震宫在人体主肝、胆、足，在事主出行、征战。"
    ],
    source: "《易经·说卦传》"
  },
  "巽": {
    palace: "巽",
    title: "巽四宫 · 木 · 杜门",
    summary: "巽宫属木，位居东南，为杜门之本宫，主入、风、教化。",
    details: [
      "巽为风，万物之洁齐也，主入、顺、教化。",
      "巽宫为杜门本位，主闭塞、隐藏、不通。",
      "巽宫天辅星居之，木性柔顺，有文采之象。",
      "巽宫在人体主胆、股、气，在事主文书、教育。"
    ],
    source: "《易经·说卦传》"
  },
  "中": {
    palace: "中",
    title: "中五宫 · 土 · 天禽星",
    summary: "中宫属土，位居中央，为天禽星之本位，统御八方，中和万物。",
    details: [
      "中宫为太极之位，土德中和，统御四方。",
      "中宫天禽星居之，主公正廉洁，为统帅之星。",
      "中宫不单独排盘，寄于坤二宫，与天芮同宫。",
      "中宫无门，寄死门于坤宫，故中宫属性寓于坤宫。"
    ],
    source: "《奇门遁甲统宗·九宫论》"
  },
  "乾": {
    palace: "乾",
    title: "乾六宫 · 金 · 开门",
    summary: "乾宫属金，位居西北，为开门之本宫，主君、父、开创。",
    details: [
      "乾为天，万物之所始也，主刚健、君父、开创。",
      "乾宫为开门本位，主出行、上任、求财，大吉。",
      "乾宫天心星居之，金性刚健，有决断之才。",
      "乾宫在人体主头、肺、骨，在事主官贵、事业。"
    ],
    source: "《易经·说卦传》"
  },
  "兑": {
    palace: "兑",
    title: "兑七宫 · 金 · 惊门",
    summary: "兑宫属金，位居正西，为惊门之本宫，主口舌、毁折、喜悦。",
    details: [
      "兑为泽，万物之所说也，主口舌、喜悦、毁折。",
      "兑宫为惊门本位，主惊恐、官司、诉讼。",
      "兑宫天柱星居之，金性锐利，有破坏之象。",
      "兑宫在人体主肺、口、舌，在事主口舌是非。"
    ],
    source: "《易经·说卦传》"
  },
  "艮": {
    palace: "艮",
    title: "艮八宫 · 土 · 生门",
    summary: "艮宫属土，位居东北，为生门之本宫，主止、山、生机。",
    details: [
      "艮为山，万物之所终而所成始也，主止、静、生机。",
      "艮宫为生门本位，主生育、求财、产业，大吉。",
      "艮宫天任星居之，土性稳重，有贵人相助。",
      "艮宫在人体主胃、手、背，在事主田产、房产。"
    ],
    source: "《易经·说卦传》"
  },
  "离": {
    palace: "离",
    title: "离九宫 · 火 · 景门",
    summary: "离宫属火，位居正南，为景门之本宫，主光明、文明、文书。",
    details: [
      "离为火，万物皆相见也，主光明、文明、美丽。",
      "离宫为景门本位，主文书、信息、宴乐。",
      "离宫天英星居之，火性炎上，有光明之象。",
      "离宫在人体主心、目、血，在事主文书、文化。"
    ],
    source: "《易经·说卦传》"
  },
};

export interface QimenGanYingInterpretation {
  tianGan: string;
  diGan: string;
  meaning: string;
  source: string;
}

export const GANYING_INTERPRETATIONS: Record<string, QimenGanYingInterpretation> = {
  "戊+戊": { tianGan: "戊", diGan: "戊", meaning: "青龙伏吟，凡事闭塞，静守为吉，不宜动作。", source: "《御定奇门宝鉴》" },
  "戊+乙": { tianGan: "戊", diGan: "乙", meaning: "青龙合灵，门吉事吉，门凶事凶，宜求财合伙。", source: "《御定奇门宝鉴》" },
  "戊+丙": { tianGan: "戊", diGan: "丙", meaning: "青龙返首，为事所谋，大吉大利，百事皆宜。", source: "《烟波钓叟歌》" },
  "戊+丁": { tianGan: "戊", diGan: "丁", meaning: "青龙耀明，宜见贵人，求官求名，文书喜庆。", source: "《御定奇门宝鉴》" },
  "戊+己": { tianGan: "戊", diGan: "己", meaning: "贵人入狱，公私皆不利，宜退守待时。", source: "《御定奇门宝鉴》" },
  "戊+庚": { tianGan: "戊", diGan: "庚", meaning: "值符飞宫，吉事不吉，凶事更凶，宜换地移居。", source: "《烟波钓叟歌》" },
  "戊+辛": { tianGan: "戊", diGan: "辛", meaning: "青龙折足，主招灾失财，宜退守不宜进取。", source: "《御定奇门宝鉴》" },
  "戊+壬": { tianGan: "戊", diGan: "壬", meaning: "青龙入天牢，凡阴阳事皆不吉，宜静守。", source: "《御定奇门宝鉴》" },
  "戊+癸": { tianGan: "戊", diGan: "癸", meaning: "青龙华盖，门吉招福，门凶招祸，宜守不宜攻。", source: "《御定奇门宝鉴》" },
  "乙+戊": { tianGan: "乙", diGan: "戊", meaning: "阴害阳门，宜暗中行事，不可公开，宜退不宜进。", source: "《御定奇门宝鉴》" },
  "乙+乙": { tianGan: "乙", diGan: "乙", meaning: "日奇伏吟，不宜谒贵求名，只宜安分守己。", source: "《御定奇门宝鉴》" },
  "乙+丙": { tianGan: "乙", diGan: "丙", meaning: "奇仪顺遂，吉星加临，方可谋为，宜文书之事。", source: "《御定奇门宝鉴》" },
  "乙+丁": { tianGan: "乙", diGan: "丁", meaning: "奇仪相佐，文书吉利，宜上书献策，百事可为。", source: "《烟波钓叟歌》" },
  "乙+己": { tianGan: "乙", diGan: "己", meaning: "日奇入墓，门凶事必凶，宜退守隐遁。", source: "《御定奇门宝鉴》" },
  "乙+庚": { tianGan: "乙", diGan: "庚", meaning: "日奇被刑，争讼财产，夫妻怀私，宜和解。", source: "《御定奇门宝鉴》" },
  "乙+辛": { tianGan: "乙", diGan: "辛", meaning: "青龙逃走，人亡财破，宜退避三舍，不宜争。", source: "《烟波钓叟歌》" },
  "乙+壬": { tianGan: "乙", diGan: "壬", meaning: "日奇入地，尊卑悖乱，官讼是非，宜和解。", source: "《御定奇门宝鉴》" },
  "乙+癸": { tianGan: "乙", diGan: "癸", meaning: "日奇入天网，宜退不宜进，宜隐不宜显。", source: "《御定奇门宝鉴》" },
  "丙+戊": { tianGan: "丙", diGan: "戊", meaning: "飞鸟跌穴，百事洞彻，大吉大利，宜进取。", source: "《烟波钓叟歌》" },
  "丙+乙": { tianGan: "丙", diGan: "乙", meaning: "日月并行，公私谋为皆吉，宜合作共事。", source: "《御定奇门宝鉴》" },
  "丙+丙": { tianGan: "丙", diGan: "丙", meaning: "月奇悖师，文书逼迫，破耗遗失，宜谨慎。", source: "《御定奇门宝鉴》" },
  "丙+丁": { tianGan: "丙", diGan: "丁", meaning: "星奇朱雀，贵人文书吉利，常人平静，宜文书。", source: "《御定奇门宝鉴》" },
  "丙+己": { tianGan: "丙", diGan: "己", meaning: "火悖入刑，囚人刑杖，文书不行，宜退守。", source: "《御定奇门宝鉴》" },
  "丙+庚": { tianGan: "丙", diGan: "庚", meaning: "荧惑入太白，门户破败，盗贼必来，宜防。", source: "《烟波钓叟歌》" },
  "丙+辛": { tianGan: "丙", diGan: "辛", meaning: "日月相会，谋事成就，病人不凶，宜合作。", source: "《御定奇门宝鉴》" },
  "丙+壬": { tianGan: "丙", diGan: "壬", meaning: "火入天罗，为客不利，是非颇多，宜退守。", source: "《御定奇门宝鉴》" },
  "丙+癸": { tianGan: "丙", diGan: "癸", meaning: "月奇入地网，阴人害事，灾祸频生，宜防。", source: "《御定奇门宝鉴》" },
  "丁+戊": { tianGan: "丁", diGan: "戊", meaning: "青龙转光，官人升迁，常人威昌，宜进取。", source: "《御定奇门宝鉴》" },
  "丁+乙": { tianGan: "丁", diGan: "乙", meaning: "人遁吉格，贵人加官进爵，常人婚姻财喜。", source: "《御定奇门宝鉴》" },
  "丁+丙": { tianGan: "丁", diGan: "丙", meaning: "星随月转，贵人越级高升，常人乐极生悲。", source: "《御定奇门宝鉴》" },
  "丁+丁": { tianGan: "丁", diGan: "丁", meaning: "星奇伏吟，文书证照即至，喜事重重。", source: "《御定奇门宝鉴》" },
  "丁+己": { tianGan: "丁", diGan: "己", meaning: "火入勾陈，奸私仇冤，事因女人，宜防小人。", source: "《御定奇门宝鉴》" },
  "丁+庚": { tianGan: "丁", diGan: "庚", meaning: "星奇受阻，文书阻隔，行人必归，宜等待。", source: "《御定奇门宝鉴》" },
  "丁+辛": { tianGan: "丁", diGan: "辛", meaning: "朱雀入狱，罪人释囚，官人失位，宜退守。", source: "《御定奇门宝鉴》" },
  "丁+壬": { tianGan: "丁", diGan: "壬", meaning: "五神互合，贵人恩诏，讼狱公平，百事和合。", source: "《御定奇门宝鉴》" },
  "丁+癸": { tianGan: "丁", diGan: "癸", meaning: "朱雀投江，文书口舌，音信沉溺，宜静守。", source: "《烟波钓叟歌》" },
  "己+戊": { tianGan: "己", diGan: "戊", meaning: "犬遇青龙，门吉谋望遂意，门凶枉费心机。", source: "《御定奇门宝鉴》" },
  "己+乙": { tianGan: "己", diGan: "乙", meaning: "墓神不明，地户逢星，宜遁迹隐形，不宜为。", source: "《御定奇门宝鉴》" },
  "己+丙": { tianGan: "己", diGan: "丙", meaning: "火悖地户，阳人冤冤相害，阴人必致污辱。", source: "《御定奇门宝鉴》" },
  "己+丁": { tianGan: "己", diGan: "丁", meaning: "朱雀入墓，文书词讼，先曲后直，宜谨慎。", source: "《御定奇门宝鉴》" },
  "己+己": { tianGan: "己", diGan: "己", meaning: "地户逢鬼，病者必死，百事不遂，宜退守。", source: "《御定奇门宝鉴》" },
  "己+庚": { tianGan: "己", diGan: "庚", meaning: "刑格返名，词讼先动者不利，宜守不宜攻。", source: "《烟波钓叟歌》" },
  "己+辛": { tianGan: "己", diGan: "辛", meaning: "游魂入墓，阴人鬼魅作祟，宜禳灾祈福。", source: "《御定奇门宝鉴》" },
  "己+壬": { tianGan: "己", diGan: "壬", meaning: "地网高张，狡童佚女，奸情伤杀，宜防。", source: "《御定奇门宝鉴》" },
  "己+癸": { tianGan: "己", diGan: "癸", meaning: "地刑玄武，男女疾病垂危，词讼有囚狱之灾。", source: "《御定奇门宝鉴》" },
  "庚+戊": { tianGan: "庚", diGan: "戊", meaning: "天乙伏宫，百事不可谋为，大凶，宜退守。", source: "《御定奇门宝鉴》" },
  "庚+乙": { tianGan: "庚", diGan: "乙", meaning: "太白逢星，退吉进凶，宜退不宜进。", source: "《御定奇门宝鉴》" },
  "庚+丙": { tianGan: "庚", diGan: "丙", meaning: "太白入荧惑，贼必来，为客进利，为主破财。", source: "《烟波钓叟歌》" },
  "庚+丁": { tianGan: "庚", diGan: "丁", meaning: "亭亭之格，因私匿起官司，门吉有救。", source: "《御定奇门宝鉴》" },
  "庚+己": { tianGan: "庚", diGan: "己", meaning: "刑格，官司被重刑，宜退守不宜进攻。", source: "《御定奇门宝鉴》" },
  "庚+庚": { tianGan: "庚", diGan: "庚", meaning: "太白同宫，战必自败，官灾横祸，宜退守。", source: "《烟波钓叟歌》" },
  "庚+辛": { tianGan: "庚", diGan: "辛", meaning: "白虎干格，远行必凶，车折马死，宜止。", source: "《御定奇门宝鉴》" },
  "庚+壬": { tianGan: "庚", diGan: "壬", meaning: "小格，移营失散，远行迷失道路，宜守。", source: "《烟波钓叟歌》" },
  "庚+癸": { tianGan: "庚", diGan: "癸", meaning: "大格，行人失伴，百事不宜，宜退守。", source: "《烟波钓叟歌》" },
  "辛+戊": { tianGan: "辛", diGan: "戊", meaning: "困龙被伤，官司破败屈抑，宜守分安命。", source: "《御定奇门宝鉴》" },
  "辛+乙": { tianGan: "辛", diGan: "乙", meaning: "白虎猖狂，家败人亡，远行多殃，宜退避。", source: "《烟波钓叟歌》" },
  "辛+丙": { tianGan: "辛", diGan: "丙", meaning: "干合悖师，荧惑出现，占雨无，占晴旱。", source: "《御定奇门宝鉴》" },
  "辛+丁": { tianGan: "辛", diGan: "丁", meaning: "狱神得奇，经商获倍利，囚人逢赦宥。", source: "《御定奇门宝鉴》" },
  "辛+己": { tianGan: "辛", diGan: "己", meaning: "入狱自刑，奴仆背主，讼难伸，宜守。", source: "《御定奇门宝鉴》" },
  "辛+庚": { tianGan: "辛", diGan: "庚", meaning: "白虎出力，主客相残，强进血溅衣衫。", source: "《御定奇门宝鉴》" },
  "辛+辛": { tianGan: "辛", diGan: "辛", meaning: "伏吟天庭，公废私就，讼狱自罹罪名。", source: "《御定奇门宝鉴》" },
  "辛+壬": { tianGan: "辛", diGan: "壬", meaning: "凶蛇入狱，两男争女，讼不息，宜和解。", source: "《御定奇门宝鉴》" },
  "辛+癸": { tianGan: "辛", diGan: "癸", meaning: "天牢华盖，日月失明，误入天网，宜退。", source: "《御定奇门宝鉴》" },
  "壬+戊": { tianGan: "壬", diGan: "戊", meaning: "小蛇化龙，男人发达，女产婴孩，宜进取。", source: "《御定奇门宝鉴》" },
  "壬+乙": { tianGan: "壬", diGan: "乙", meaning: "小蛇得势，女子柔顺，男人嗟叹，宜守。", source: "《御定奇门宝鉴》" },
  "壬+丙": { tianGan: "壬", diGan: "丙", meaning: "水蛇入火，官灾刑禁，络绎不绝，宜防。", source: "《御定奇门宝鉴》" },
  "壬+丁": { tianGan: "壬", diGan: "丁", meaning: "干合蛇刑，文书牵连，贵人匆匆，宜谨慎。", source: "《御定奇门宝鉴》" },
  "壬+己": { tianGan: "壬", diGan: "己", meaning: "凶蛇入狱，大祸将至，顺守斯吉，词讼理屈。", source: "《御定奇门宝鉴》" },
  "壬+庚": { tianGan: "壬", diGan: "庚", meaning: "太白擒蛇，刑狱公平，立剖邪正，宜公断。", source: "《御定奇门宝鉴》" },
  "壬+辛": { tianGan: "壬", diGan: "辛", meaning: "螣蛇相缠，纵得吉门，亦不能安，宜守。", source: "《御定奇门宝鉴》" },
  "壬+壬": { tianGan: "壬", diGan: "壬", meaning: "蛇入地罗，外人缠绕，内事索索，宜静守。", source: "《御定奇门宝鉴》" },
  "壬+癸": { tianGan: "壬", diGan: "癸", meaning: "幼女奸淫，家有丑声，门吉星凶，反福为祸。", source: "《御定奇门宝鉴》" },
  "癸+戊": { tianGan: "癸", diGan: "戊", meaning: "天乙会合，吉格，财喜婚姻，贵人相助。", source: "《御定奇门宝鉴》" },
  "癸+乙": { tianGan: "癸", diGan: "乙", meaning: "华盖逢星，贵人禄位，常人平安，宜守成。", source: "《御定奇门宝鉴》" },
  "癸+丙": { tianGan: "癸", diGan: "丙", meaning: "华盖悖师，贵贱逢之，上人见喜，宜低调。", source: "《御定奇门宝鉴》" },
  "癸+丁": { tianGan: "癸", diGan: "丁", meaning: "螣蛇夭矫，文书口舌，火焚莫逃，宜防。", source: "《烟波钓叟歌》" },
  "癸+己": { tianGan: "癸", diGan: "己", meaning: "华盖地户，偏宜避灾，音信隔阻，宜守。", source: "《御定奇门宝鉴》" },
  "癸+庚": { tianGan: "癸", diGan: "庚", meaning: "天网四张，太白入网，顽暴不化，宜退。", source: "《御定奇门宝鉴》" },
  "癸+辛": { tianGan: "癸", diGan: "辛", meaning: "网盖天牢，占病占讼，死罪莫逃，宜禳。", source: "《御定奇门宝鉴》" },
  "癸+壬": { tianGan: "癸", diGan: "壬", meaning: "复见螣蛇，嫁娶重婚，后嫁无子，宜慎。", source: "《御定奇门宝鉴》" },
  "癸+癸": { tianGan: "癸", diGan: "癸", meaning: "天网四张，行人失伴，病讼皆伤，宜退守。", source: "《烟波钓叟歌》" },
};

// ============================================================================
// 辅助函数：组装宫位解读
// ============================================================================

export interface QimenInterpretItem {
  type: "gong" | "xing" | "men" | "shen" | "ganying";
  title: string;
  content: string;
  source: string;
}

export function getQimenPalaceInterpretation(
  palaceName: string,
  star: string,
  door: string,
  tianShen: string,
  tianPanGan: string,
  diPanGan: string,
): { palaceLabel: string; items: QimenInterpretItem[] } {
  const items: QimenInterpretItem[] = [];

  // 九宫解读
  const gongInfo = JIUGONG_INTERPRETATIONS[palaceName];
  if (gongInfo) {
    items.push({
      type: "gong",
      title: gongInfo.title,
      content: gongInfo.summary + "\n" + gongInfo.details.join("\n"),
      source: gongInfo.source,
    });
  }

  // 九星解读
  const xingInfo = JIUXING_INTERPRETATIONS[star];
  if (xingInfo) {
    items.push({
      type: "xing",
      title: xingInfo.title,
      content: xingInfo.summary + "\n" + xingInfo.details.join("\n"),
      source: xingInfo.source,
    });
  }

  // 八门解读
  const menInfo = BAMEN_INTERPRETATIONS[door];
  if (menInfo) {
    items.push({
      type: "men",
      title: menInfo.title,
      content: menInfo.summary + "\n" + menInfo.details.join("\n"),
      source: menInfo.source,
    });
  }

  // 天八神解读
  const shenInfo = TIANSHEN_INTERPRETATIONS[tianShen];
  if (shenInfo) {
    items.push({
      type: "shen",
      title: shenInfo.title,
      content: shenInfo.summary + "\n" + shenInfo.details.join("\n"),
      source: shenInfo.source,
    });
  }

  // 十干克应解读
  const key = tianPanGan + "+" + diPanGan;
  const ganYingInfo = GANYING_INTERPRETATIONS[key];
  if (ganYingInfo) {
    items.push({
      type: "ganying",
      title: "十干克应 · " + key,
      content: ganYingInfo.meaning,
      source: ganYingInfo.source,
    });
  }

  return { palaceLabel: palaceName + "宫解读", items };
}