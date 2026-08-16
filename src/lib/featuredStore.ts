"use client";

// ============================================================================
// 言道精选（原国学橱窗）- 内容架构数据层
// 定位：全品类内容变现与服务入口，覆盖实体/数字/服务/课程四大类
// 第一版仅完成分类展示与跳转框架，支付下单链路后续迭代
// ============================================================================

export type FeaturedCategoryKey = "physical" | "digital" | "consult" | "course";

export interface FeaturedCategory {
  key: FeaturedCategoryKey;
  name: string;
  subtitle: string;
  description: string;
  emoji: string;
  gradient: string;
}

export interface FeaturedItem {
  id: string;
  category: FeaturedCategoryKey;
  title: string;
  summary: string;
  price: string;
  originalPrice?: string;
  tag?: string;
  highlights: string[];
  detail: string[];
  /** 预约/咨询类联系方式说明 */
  contactNote?: string;
}

export const FEATURED_CATEGORIES: FeaturedCategory[] = [
  {
    key: "physical",
    name: "实体商品",
    subtitle: "易学典籍 · 风水摆件 · 国学周边 · 开运物",
    description: "精选传统文化实体好物，从典籍善本到开运摆件，件件有讲究",
    emoji: "📕",
    gradient: "linear-gradient(135deg, #7B2FBE 0%, #9B59B6 100%)",
  },
  {
    key: "digital",
    name: "数字产品",
    subtitle: "AI 深度报告 · 终身会员 · 专项命理全解 · 永久档案",
    description: "即买即用的数字权益，AI 深度解读与专属档案服务",
    emoji: "💎",
    gradient: "linear-gradient(135deg, #2471A3 0%, #5DADE2 100%)",
  },
  {
    key: "consult",
    name: "咨询服务",
    subtitle: "真人命理咨询 · 命理师预约 · 风水服务",
    description: "签约命理师一对一服务，排盘解惑更有人情味",
    emoji: "🕯️",
    gradient: "linear-gradient(135deg, #B9770E 0%, #F5B041 100%)",
  },
  {
    key: "course",
    name: "课程专栏",
    subtitle: "八字入门 · 奇门进阶 · 六爻教学 · 中医养生",
    description: "体系化课程专栏，从零基础到进阶研习的完整路径",
    emoji: "🎓",
    gradient: "linear-gradient(135deg, #1E8E5A 0%, #58D68D 100%)",
  },
];

export const FEATURED_ITEMS: FeaturedItem[] = [
  // ===== 实体商品 =====
  {
    id: "ph-001",
    category: "physical",
    title: "《易经》原文注译精装本",
    summary: "权威底本勘校，白话注释，初学者友好",
    price: "¥68",
    originalPrice: "¥98",
    tag: "典籍",
    highlights: ["权威底本勘校", "白话全文注释", "精装烫金封面"],
    detail: [
      "以《周易正义》为底本，参校多个传世版本勘定原文",
      "每卦配备白话译文与象数释义，兼顾义理与象数两派",
      "附录包含《系辞传》《说卦传》全文注译，一体通读",
    ],
  },
  {
    id: "ph-002",
    category: "physical",
    title: "天然葫芦风水摆件",
    summary: "开光工艺，福禄谐音，家居镇宅常用",
    price: "¥128",
    tag: "开运物",
    highlights: ["天然成年葫芦", "传统开光工艺", "附摆放方位说明"],
    detail: [
      "选用天然成熟葫芦，个体形态端正、皮质细腻",
      "按传统工艺开光，附方位摆放与养护说明册",
      "适合玄关、书房、客厅等多种家居场景",
    ],
  },
  {
    id: "ph-003",
    category: "physical",
    title: "二十四节气国风文创礼盒",
    summary: "节气知识卡 + 国潮手账 + 书签套装",
    price: "¥89",
    tag: "周边",
    highlights: ["24 节气知识卡", "国潮手账一本", "烫金书签四枚"],
    detail: [
      "知识卡正面节气插画，背面物候、农事、养生要点",
      "手账内置节气专题页与干支纪年速查表",
      "礼盒包装，自用送礼两相宜",
    ],
  },
  {
    id: "ph-004",
    category: "physical",
    title: "天然水晶五行手串",
    summary: "按个人五行喜用定制，多材质可选",
    price: "¥199",
    tag: "开运物",
    highlights: ["天然水晶材质", "可按八字五行定制", "附鉴定证书"],
    detail: [
      "提供生辰八字五行分析后推荐主材搭配",
      "黑曜石、白水晶、紫水晶、绿幽灵等多种材质可选",
      "每条附材质鉴定证书与佩戴建议卡",
    ],
  },
  // ===== 数字产品 =====
  {
    id: "dg-001",
    category: "digital",
    title: "AI 深度解读报告（单次）",
    summary: "大模型逐项拆解命盘，万字深度报告",
    price: "¥29.9",
    tag: "热门",
    highlights: ["万字深度报告", "事业/感情/财运全覆盖", "支持导出留存"],
    detail: [
      "基于排盘数据由 AI 生成万字级深度解读",
      "覆盖性格底色、事业方向、感情模式、财富格局四大板块",
      "报告支持导出图片与永久回看",
    ],
  },
  {
    id: "dg-002",
    category: "digital",
    title: "高级终身会员",
    summary: "全部工具不限次 + AI 解读终身畅用",
    price: "¥899",
    originalPrice: "¥1299",
    tag: "超值",
    highlights: ["全部工具不限次数", "AI 深度解读畅用", "终身有效"],
    detail: [
      "站内全部排盘工具不限次使用",
      "AI 深度解读终身畅用，不占每日额度",
      "终身有效，一次买断无续费",
    ],
  },
  {
    id: "dg-003",
    category: "digital",
    title: "专项命理全解（八字/紫微/奇门 任选）",
    summary: "单科专项深度全解，含 12 项专题报告",
    price: "¥199",
    highlights: ["单科 12 项专题", "逐项 AI 深度拆解", "一年内不限次回看"],
    detail: [
      "可选八字、紫微斗数或奇门遁甲任一专项",
      "含格局、大运、流年等 12 项专题深度报告",
      "购买后一年内不限次回看与更新",
    ],
  },
  {
    id: "dg-004",
    category: "digital",
    title: "永久命理档案服务",
    summary: "云端永久存档，全家命盘统一管理",
    price: "¥99/年",
    highlights: ["云端永久存档", "多档案管理", "历史记录全量留存"],
    detail: [
      "排盘记录云端永久存档，换机不丢失",
      "支持家人、客户多档案分组管理",
      "历史测算记录全量留存，随时回溯对比",
    ],
  },
  // ===== 咨询服务 =====
  {
    id: "cs-001",
    category: "consult",
    title: "真人命理师一对一咨询（60 分钟）",
    summary: "签约命理师在线一对一，排盘详解答疑",
    price: "¥388",
    tag: "推荐",
    highlights: ["签约命理师", "一对一在线详解", "会后附文字纪要"],
    contactNote: "下单后 24 小时内客服将与您约定咨询时间",
    detail: [
      "平台签约命理师，从业年限与擅长领域公开可查",
      "支持语音/视频一对一沟通，时长 60 分钟",
      "咨询结束后附赠文字版纪要与建议清单",
    ],
  },
  {
    id: "cs-002",
    category: "consult",
    title: "命理师预约（指定师傅）",
    summary: "按师傅档期预约，先约后排",
    price: "¥588 起",
    highlights: ["指定师傅档期", "支持改期一次", "一对一沟通"],
    contactNote: "提交预约意向后，客服将协调师傅档期",
    detail: [
      "可查看师傅简介、擅长方向与用户评价后预约",
      "按档期锁定时间，支持改期一次",
      "咨询前请提前准备出生信息与想问的问题",
    ],
  },
  {
    id: "cs-003",
    category: "consult",
    title: "家居风水上门勘测服务",
    summary: "勘测 + 布局建议报告，限部分城市",
    price: "¥1688 起",
    highlights: ["实地勘测", "布局建议报告", "附图示说明"],
    contactNote: "限开通城市，下单前请与客服确认服务范围",
    detail: [
      "实地勘测户型朝向、采光动线与格局分布",
      "出具布局调整建议报告（含图示）",
      "目前限部分城市，下单前请确认服务范围",
    ],
  },
  // ===== 课程专栏 =====
  {
    id: "cr-001",
    category: "course",
    title: "八字命理入门 21 讲",
    summary: "零基础到独立看盘的完整路径",
    price: "¥99",
    tag: "入门",
    highlights: ["21 节体系课", "零基础友好", "配套练习排盘"],
    detail: [
      "从天干地支、五行生克讲起，循序渐进",
      "每讲配套课后练习与实盘演示",
      "学完可独立完成基础命盘分析",
    ],
  },
  {
    id: "cr-002",
    category: "course",
    title: "奇门遁甲进阶实战 16 讲",
    summary: "格局判断与实际案例精讲",
    price: "¥299",
    tag: "进阶",
    highlights: ["16 节进阶课", "真实案例精讲", "附课件资料"],
    detail: [
      "十干克应、八门九星格局判断体系精讲",
      "婚姻、事业、求财等真实案例复盘",
      "附全套课件与速查手册",
    ],
  },
  {
    id: "cr-003",
    category: "course",
    title: "六爻预测从入门到精通",
    summary: "装卦、断卦到实战应用全流程",
    price: "¥199",
    highlights: ["全流程教学", "实卦演练", "答疑社群"],
    detail: [
      "从摇卦装卦到用神选取完整教学",
      "每章配实卦演练与讲解",
      "购买后可加入学员答疑社群",
    ],
  },
  {
    id: "cr-004",
    category: "course",
    title: "中医养生基础 30 讲",
    summary: "顺应四时的日常养生方法论",
    price: "¥129",
    highlights: ["30 节养生课", "顺时而养体系", "实操性强"],
    detail: [
      "以四气调神为纲，讲透春夏秋冬顺时养生",
      "涵盖饮食、起居、情志调摄的日常方法",
      "内容仅供传统文化学习参考，不构成医疗建议",
    ],
  },
];

export function getCategory(key: string): FeaturedCategory | undefined {
  return FEATURED_CATEGORIES.find((c) => c.key === key);
}

export function getItemsByCategory(key: FeaturedCategoryKey): FeaturedItem[] {
  return FEATURED_ITEMS.filter((i) => i.category === key);
}

export function getItem(category: string, id: string): FeaturedItem | undefined {
  return FEATURED_ITEMS.find((i) => i.category === category && i.id === id);
}

export const CATEGORY_NAMES: Record<FeaturedCategoryKey, string> = {
  physical: "实体商品",
  digital: "数字产品",
  consult: "咨询服务",
  course: "课程专栏",
};
