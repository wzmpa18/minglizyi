// ============================================================================
// P7-MKT-POSTER-02 Audience 圈层定义（第五条 A01-A08）
// 用户主动选择 + AI建议；禁止AI分析私聊/健康数据/好友聊天推断圈层
// ============================================================================

import type { Audience, AudienceId } from "./types";

export const AUDIENCES: Record<AudienceId, Audience> = {
  A01: {
    id: "A01",
    name: "年轻朋友",
    desc: "18-24岁 年轻文化兴趣圈",
    themes: ["自我探索", "趣味体验", "朋友互动", "文化兴趣", "个性化工具"],
    visual: ["现代", "轻国潮", "星空", "渐变", "玻璃感", "卡片感"],
    titlePool: [
      "多一种看自己的方式",
      "传统文化，也可以很好玩",
      "东方数理 × 星象符号",
      "给日常多一个观察角度",
    ],
    forbiddenThemes: ["命运决定", "婚姻结果", "财富预测", "疾病", "焦虑恐吓", "治愈迷茫", "治愈内耗"],
    preferredTemplates: ["T03", "T04"],
  },
  A02: {
    id: "A02",
    name: "职场朋友",
    desc: "25-35岁 职场成长圈",
    themes: ["传统文化工具", "自我观察", "知识学习", "效率", "生活兴趣"],
    visual: ["高级灰", "低饱和", "简洁", "专业"],
    titlePool: [
      "忙里，也给自己一点观察时间",
      "一个App，装下我的国学工具",
      "传统文化工具，也可以简单好用",
    ],
    forbiddenThemes: ["财富预测", "事业运势承诺"],
    preferredTemplates: ["T04", "T01"],
  },
  A03: {
    id: "A03",
    name: "家庭传统文化圈",
    desc: "35-50岁 家庭/传统文化圈",
    themes: ["经典", "传统文化", "系统学习", "家文化", "中医经典学习"],
    visual: ["宣纸", "墨色", "暖金", "传统纹样"],
    titlePool: [
      "读经典，学传统，知其所以然",
      "把传统文化装进口袋",
      "国学与中医经典，一处慢慢学",
    ],
    forbiddenThemes: ["子女运势", "家庭吉凶"],
    preferredTemplates: ["T01", "T02"],
  },
  A04: {
    id: "A04",
    name: "中老年朋友",
    desc: "50+岁 中老年传统学习圈",
    themes: ["经典阅读", "中医理论学习", "传统文化学习", "方便使用", "大字清晰"],
    visual: ["字体大", "信息少", "高对比", "国风暖色"],
    titlePool: [
      "经典随身读，知识慢慢学",
      "传统文化学习工具箱",
      "中医经典与国学知识，一处学习",
    ],
    forbiddenThemes: ["疾病焦虑", "延年益寿承诺", "治疗效果", "养生功效保证"],
    preferredTemplates: ["T01", "T02"],
  },
  A05: {
    id: "A05",
    name: "中医学习群",
    desc: "中医经典学习圈",
    themes: ["中医经典", "知识点", "题库", "学习路线", "错题", "考试训练"],
    visual: ["古籍", "纸张", "书册"],
    titlePool: [
      "把中医知识真正学进去",
      "经典、知识点、题库，一套学习",
      "从阅读到练习，中医学习更系统",
    ],
    forbiddenThemes: ["治疗", "疗效", "调理疾病", "颐养延年", "改善症状"],
    preferredTemplates: ["T02", "T01"],
  },
  A06: {
    id: "A06",
    name: "国学易学同好",
    desc: "国学易学兴趣圈",
    themes: ["术数工具", "文化研习", "排盘工具", "传统文化研究"],
    visual: ["墨色", "国风", "工具感"],
    titlePool: [
      "常用国学工具，一处集合",
      "从排盘到研习，一个工具箱",
      "传统术数工具，随时查看",
    ],
    forbiddenThemes: ["预测吉凶", "改命转运", "消灾破解"],
    preferredTemplates: ["T01", "T04"],
  },
  A07: {
    id: "A07",
    name: "星座塔罗兴趣圈",
    desc: "星座塔罗年轻兴趣圈",
    themes: ["符号文化", "兴趣体验", "自我观察", "朋友互动"],
    visual: ["深蓝", "星点", "现代"],
    titlePool: [
      "星牌与符号，也是一种观察方式",
      "给生活一个不同的观察角度",
      "东方数理 × 西方星牌",
    ],
    forbiddenThemes: ["治愈疾病", "治愈焦虑", "解决迷茫", "预测未来"],
    preferredTemplates: ["T03", "T04"],
  },
  A08: {
    id: "A08",
    name: "学习/考试群",
    desc: "学习考试圈（最安全、最广泛传播）",
    themes: ["AI资料变题库", "上传资料", "自动整理", "刷题", "错题"],
    visual: ["科技蓝", "卡片", "学习流程"],
    titlePool: [
      "一份资料，变成一套题库",
      "上传资料，AI帮你整理成练习",
      "看资料太慢？让AI先整理重点",
    ],
    forbiddenThemes: ["包过", "必中", "考试保过"],
    preferredTemplates: ["T05", "T04"],
  },
};

export const AUDIENCE_LIST = Object.values(AUDIENCES);

export function getAudience(id: AudienceId): Audience {
  return AUDIENCES[id] ?? AUDIENCES.A01;
}
