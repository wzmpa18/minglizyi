/**
 * v20.1 智能问诊（学习）体系数据
 * 7大门类：北派/南派/杂家/民族医学/针灸/按摩正骨/祝由
 * 每个门类包含多个名家/流派，每个名家有核心著作和AI输出侧重
 */

export interface Master {
  id: string;
  name: string;
  books: string[];
  focus: string; // AI输出侧重
  dynasty?: string; // 朝代
}

export interface Category {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  masters: Master[];
  defaultSelected?: string[]; // 默认选中的名家ID
  complianceNote?: string; // 专项合规提示
}

export const WENZHEN_CATEGORIES: Category[] = [
  {
    id: "beipai",
    name: "北派",
    subtitle: "倪海厦经方体系",
    description: "以张仲景《伤寒论》《金匮要略》为根基，经明清至近代诸家传承，至倪海厦集大成的完整经方临床体系。",
    defaultSelected: ["nihaisha", "zhangzhongjing"],
    masters: [
      {
        id: "nihaisha",
        name: "倪海厦",
        books: ["《人纪》", "《天纪》", "《地纪》"],
        focus: "经方北派集大成，方证对应+临床经验解读，语言直白",
        dynasty: "近代",
      },
      {
        id: "zhangzhongjing",
        name: "张仲景",
        books: ["《伤寒论》", "《金匮要略》"],
        focus: "医圣经方原方，严格方证对应，引用伤寒论原文",
        dynasty: "东汉",
      },
      {
        id: "huangyuanyu",
        name: "黄元御",
        books: ["《四圣心源》", "《长沙药解》"],
        focus: "一气周流、五行升降，善用黄芽汤、下气汤等",
        dynasty: "清代",
      },
      {
        id: "chenshiduo",
        name: "陈士铎",
        books: ["《辨证录》", "《石室秘录》"],
        focus: "傅青主一脉，奇方妙法，辨证角度独特",
        dynasty: "清代",
      },
      {
        id: "tangrongchuan",
        name: "唐容川",
        books: ["《血证论》", "《中西汇通医经精义》"],
        focus: "血证体系，止血消瘀宁血补血四法，气血水火辨证",
        dynasty: "清代",
      },
      {
        id: "huxishu",
        name: "胡希恕",
        books: ["《胡希恕伤寒论讲座》"],
        focus: "近代经方大家，方证对应，善用合方",
        dynasty: "近代",
      },
      {
        id: "liuduzhou",
        name: "刘渡舟",
        books: ["《伤寒论讲稿》"],
        focus: "近代经方大家，水证论，经方条文解读",
        dynasty: "近代",
      },
      {
        id: "caoyingfu",
        name: "曹颖甫",
        books: ["《经方实验录》"],
        focus: "近代经方实践派，经方临床验案",
        dynasty: "近代",
      },
      {
        id: "dangdai",
        name: "当代传承",
        books: ["倪海厦弟子传承体系"],
        focus: "倪师学术传承临床思路",
        dynasty: "当代",
      },
    ],
  },
  {
    id: "nanpai",
    name: "南派",
    subtitle: "温病学派",
    description: "卫气营血、三焦辨证体系，擅长外感温热病。",
    masters: [
      {
        id: "yetianshi",
        name: "叶天士",
        books: ["《温热论》", "《临证指南医案》"],
        focus: "温病奠基人，卫气营血辨证，轻清透邪",
        dynasty: "清代",
      },
      {
        id: "wujutong",
        name: "吴鞠通",
        books: ["《温病条辨》"],
        focus: "三焦辨证，温病集大成，清热养阴",
        dynasty: "清代",
      },
      {
        id: "xuexue",
        name: "薛雪",
        books: ["《湿热病篇》"],
        focus: "湿热病专门论治",
        dynasty: "清代",
      },
      {
        id: "wangmengying",
        name: "王孟英",
        books: ["《温热经纬》", "《霍乱论》"],
        focus: "温病集大成，瘟疫论治",
        dynasty: "清代",
      },
      {
        id: "wuyouke",
        name: "吴又可",
        books: ["《温疫论》"],
        focus: "温疫学说开创，戾气致病",
        dynasty: "明代",
      },
      {
        id: "yushiyu",
        name: "余师愚",
        books: ["《疫疹一得》"],
        focus: "疫疹专病论治",
        dynasty: "清代",
      },
    ],
  },
  {
    id: "zajia",
    name: "杂家",
    subtitle: "主流学派",
    description: "除经方、温病外的重要主流学派。",
    masters: [
      {
        id: "zhengqinan",
        name: "郑钦安（火神派）",
        books: ["《医理真传》", "《医法圆通》"],
        focus: "阴阳为纲，善用姜桂附，扶阳回逆",
        dynasty: "清代",
      },
      {
        id: "lidongyuan",
        name: "李东垣（补土派）",
        books: ["《脾胃论》", "《内外伤辨惑论》"],
        focus: "脾胃升降，补中益气，升阳举陷",
        dynasty: "金元",
      },
      {
        id: "zhangjingyue",
        name: "张景岳（温补派）",
        books: ["《景岳全书》", "《类经》"],
        focus: "命门水火，阴阳双补，善用温补",
        dynasty: "明代",
      },
      {
        id: "zhudanxi",
        name: "朱丹溪（滋阴派）",
        books: ["《格致余论》", "《丹溪心法》"],
        focus: "阳常有余阴常不足，滋阴降火",
        dynasty: "金元",
      },
      {
        id: "lishizhen",
        name: "李时珍",
        books: ["《本草纲目》"],
        focus: "本草药物参考，药性解析",
        dynasty: "明代",
      },
      {
        id: "fuqingzhu",
        name: "傅青主",
        books: ["《傅青主女科》"],
        focus: "女科专科论治",
        dynasty: "清代",
      },
    ],
  },
  {
    id: "minzu",
    name: "民族医学",
    subtitle: "少数民族传统医学",
    description: "各少数民族传统医学体系。",
    masters: [
      {
        id: "yaoyi",
        name: "瑶医",
        books: ["瑶山草药志"],
        focus: "痧症辨证、瑶药浴、瑶山草药，盈亏平衡理论",
      },
      {
        id: "miaoyi",
        name: "苗医",
        books: ["苗药集成"],
        focus: "毒亏伤积辨证，苗药、挑筋外敷",
      },
      {
        id: "mengyi",
        name: "蒙医",
        books: ["蒙医经典"],
        focus: "赫依希拉巴达干辨证，蒙药、放血、灸疗、药浴",
      },
      {
        id: "zangyi",
        name: "藏医",
        books: ["四部医典"],
        focus: "隆赤巴培根辨证，藏药、酥油灸、放血",
      },
      {
        id: "zhuangyi",
        name: "壮医",
        books: ["壮医学"],
        focus: "毒虚致病理论，壮药、药线点灸",
      },
    ],
  },
  {
    id: "zhenjiu",
    name: "针灸",
    subtitle: "经络辨证体系",
    description: "独立治疗体系，以经络辨证为核心。",
    masters: [
      {
        id: "chuantong_zhenjiu",
        name: "传统针灸",
        books: ["《黄帝内经》针法", "《针灸大成》"],
        focus: "经络辨证、五输穴、子母补泻、传统配穴",
      },
      {
        id: "dongshi",
        name: "董氏奇穴",
        books: ["董景昌奇穴", "杨维杰著作"],
        focus: "董氏奇穴取穴、倒马针法、动气针法，汤药仅作辅助",
      },
      {
        id: "gejia_zhenjiu",
        name: "各家针灸",
        books: ["承淡安", "贺普仁", "石学敏"],
        focus: "贺氏三通法、醒脑开窍针法等",
      },
      {
        id: "minjian_zhenfa",
        name: "民间针法",
        books: ["灵龟八法", "飞腾八法", "平衡针法"],
        focus: "时间针法、现代平衡针法",
      },
    ],
  },
  {
    id: "anmo",
    name: "按摩正骨",
    subtitle: "外治手法体系",
    description: "外治手法体系，含推拿、正骨、伤科。",
    masters: [
      {
        id: "tuina",
        name: "推拿",
        books: ["一指禅推拿", "滚法推拿"],
        focus: "手法操作、适应症、禁忌",
      },
      {
        id: "zhenggu",
        name: "正骨",
        books: ["罗氏正骨", "龙层花正骨", "林氏正骨"],
        focus: "正骨手法思路、操作步骤、注意事项",
      },
      {
        id: "shangke",
        name: "伤科",
        books: ["石氏伤科"],
        focus: "伤科论治、内外兼治",
      },
    ],
  },
  {
    id: "zhuyou",
    name: "祝由",
    subtitle: "历史文化学习",
    description: "中国传统文化与民俗医学的历史记载展示，仅用于学术研究、历史文化学习。",
    complianceNote: "⚠️ 本板块内容为中国传统文化与民俗医学的历史记载展示，仅用于学术研究、历史文化学习，不构成任何医疗诊断、治疗建议、操作指导。所有内容均为典籍记载和学术文献整理，请勿自行操作。身体不适请前往正规医疗机构就诊。",
    masters: [
      {
        id: "zhuyou_13ke",
        name: "祝由十三科",
        books: ["《轩辕黄帝祝由科》"],
        focus: "仅输出典籍原文、历史背景、文化研究",
      },
      {
        id: "minjian_fuzhou",
        name: "民间符咒疗法",
        books: ["典籍记载整理"],
        focus: "仅做民俗学资料展示，不输出操作方法",
      },
      {
        id: "jiulong_huagu",
        name: "九龙化骨水等民间疗法",
        books: ["民俗学资料"],
        focus: "仅输出历史记载与文化研究，不输出操作步骤",
      },
      {
        id: "minsu_yixue",
        name: "民俗医学研究",
        books: ["人类学", "学术论文资料"],
        focus: "仅输出学术研究结论与文献引用",
      },
    ],
  },
];

/**
 * 构建AI系统提示词 - 根据用户选择的门类和名医动态生成
 */
export function buildWenzhenSystemPrompt(
  categoryId: string,
  selectedMasterIds: string[],
  supplementText: string
): string {
  const category = WENZHEN_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return "你是中医AI助手。";

  const masters = category.masters.filter((m) => selectedMasterIds.includes(m.id));

  const parts: string[] = [];

  parts.push(`你是「智能问诊·学习」系统的AI辨证助手。`);
  parts.push(`当前问诊门类：${category.name}（${category.subtitle}）`);
  parts.push(`门类定位：${category.description}`);

  if (masters.length > 0) {
    parts.push(`\n用户选择的医家/流派：`);
    for (const m of masters) {
      parts.push(`- ${m.name}：著作${m.books.join("、")}；AI输出侧重：${m.focus}`);
    }
    parts.push(`\n请严格遵循上述医家的学术思想、用药习惯、辨证思路，输出差异化的辨证方案，禁止所有流派输出内容同质化。`);
  }

  if (category.id === "zhuyou") {
    parts.push(`\n⚠️ 祝由板块专项合规要求：`);
    parts.push(`本板块仅用于历史文化学习，AI输出仅限于典籍原文、历史背景、文化研究内容。`);
    parts.push(`严禁输出任何具体的操作方法、治疗步骤、符咒内容。`);
    parts.push(`所有内容必须标注典籍出处。`);
  }

  if (supplementText) {
    parts.push(`\n用户补充说明：${supplementText}`);
    parts.push(`请将上述信息作为辨证参考依据。`);
  }

  parts.push(`\n输出格式要求：`);
  parts.push(`1. 病机分析（结合所选医家学术思想）`);
  parts.push(`2. 辨证结论（明确证型）`);
  parts.push(`3. 治法思路（体现所选流派特点）`);
  parts.push(`4. 方药建议或取穴经验参考（引用原著原文）`);
  parts.push(`5. 注意事项与禁忌`);
  parts.push(`\n⚠️ 免责声明：以上内容由AI生成，仅供传统文化学习参考，不构成医疗诊断或治疗建议。如有身体不适，请前往正规医疗机构就诊。`);

  return parts.join("\n");
}
