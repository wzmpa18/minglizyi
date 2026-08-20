// ============================================================================
// P7-MKT-POSTER-02 Approved Copy Library（第二十三/五十一至五十六条）
// AI只能重组已批准文案，不得自由创作；正式官方文案按第五十一条规定替换豆包原稿
// 文案版本管理（第二十六条）：copyId/version/status
// ============================================================================

import type { CopySet, DisclaimerKind, ProductId, AudienceId } from "./types";

export const DISCLAIMERS: Record<DisclaimerKind, string> = {
  yixue: "相关内容用于传统民俗与文化研习参考，请结合实际情况独立判断。",
  zhongyi: "内容用于传统中医理论与知识学习，不提供医疗诊断或治疗建议。",
  ai_learning: "AI生成学习内容可能存在误差，请结合原始资料核对。",
  general: "内容仅供传统文化学习参考。",
};

/** 活动权益统一表述（第十五/四十九条），禁止“多推多得”类表述 */
export const CAMPAIGN_RULES_COPY = "邀请朋友一起使用，符合活动规则可获得平台活动权益。";

function copy(
  id: string,
  product: ProductId,
  audience: AudienceId | "ANY",
  title: string,
  subtitle: string,
  points: string[],
  cta: string,
  moments: string,
  group: string,
  privates: { tone: string; text: string }[],
  disclaimer: DisclaimerKind
): CopySet {
  return {
    copyId: id,
    version: "v1.0.0",
    audience,
    product,
    channel: "ANY",
    title,
    subtitle,
    sellingPoints: points,
    cta,
    momentsCopy: moments,
    groupCopy: group,
    privateCopies: privates,
    disclaimer,
    status: "ACTIVE",
  };
}

const friendTones = (body: string) => [
  { tone: "朋友口吻", text: `我最近在用这个，${body}你有兴趣可以看看。` },
  { tone: "同学口吻", text: `同学给你安利一个，${body}挺实用的。` },
  { tone: "长辈口吻", text: `给你推荐个学习工具，${body}你有空可以试试。` },
  { tone: "同好口吻", text: `发现一个不错的传统文化工具，${body}感兴趣可以体验下。` },
];

export const COPY_LIBRARY: CopySet[] = [
  // P52 国风综合版
  copy(
    "CP-GUOFENG-01", "P14", "ANY",
    "传统文化与经典学习，一处慢慢研习",
    "国学工具｜传统文化｜中医经典学习",
    ["常用国学工具集中使用", "经典知识与题库配套学习", "支持记录、练习与持续复习"],
    "扫码了解言道国学",
    "最近在用言道国学，把常用的国学工具和经典学习放在了一起，排版舒服，查起来方便。有传统文化的朋友可以看看，扫码就能了解。",
    "国学常用工具，一处集合，扫码即可了解。",
    friendTones("里面有国学工具、经典学习和AI题库等功能，"),
    "general"
  ),
  // P53 中医版
  copy(
    "CP-ZHONGYI-01", "P09", "A05",
    "经典 × 知识点 × 题库",
    "把中医学习从阅读变成练习",
    ["经典内容结构化整理", "知识点配套练习", "错题持续复习"],
    "扫码进入学习专区",
    "在用言道国学的中医学习区，把经典做了结构化整理，知识点配了练习题，错题还能持续复习。学中医的朋友可以看看这个学习方式。",
    "中医经典学习工具：经典、知识点、题库一套学习，扫码了解。",
    [
      { tone: "朋友口吻", text: "我在用言道国学的中医学习区，经典整理成知识点还配了题库，学起来系统一些，你有兴趣可以看看。" },
      { tone: "同学口吻", text: "备考的同学看下这个，中医经典+知识点+题库一体的学习工具，练习挺方便。" },
      { tone: "长辈口吻", text: "给您推荐个中医经典学习工具，能看经典也能做题，慢慢学挺合适。" },
      { tone: "同好口吻", text: "同好分享：一个把中医经典变成知识点和题库的学习工具，研习起来更系统。" },
    ],
    "zhongyi"
  ),
  // P54 年轻文化版
  copy(
    "CP-YOUNG-01", "P01", "A01",
    "给生活多一个观察角度",
    "星象符号 × 数字文化 × 趣味体验",
    ["轻量文化体验", "朋友互动", "兴趣探索"],
    "扫码看看",
    "发现一个挺有意思的传统文化App，星象符号、东方数理这些都有，当个兴趣工具玩玩不错，多一个观察自己的角度，分享给你们。",
    "一个传统文化的趣味工具App，扫码看看。",
    friendTones("里面星象符号、数理文化这些小工具挺好玩的，"),
    "general"
  ),
  // P55 AI学习版
  copy(
    "CP-AILEARN-01", "P11", "A08",
    "一份资料，变成一套题库",
    "上传资料，AI帮你整理知识点与练习题",
    ["资料整理", "知识提取", "练习题", "错题复习"],
    "扫码体验AI学习",
    "复习资料太厚看不完？试试AI资料变题库：上传PDF或笔记，AI自动整理知识点、生成练习题，还能错题复习。学习党可以试试这个方法。",
    "上传学习资料，AI自动整理知识点生成练习题，扫码体验。",
    [
      { tone: "朋友口吻", text: "最近复习用上了AI资料变题库，上传资料自动出题和整理知识点，效率高不少，你可以试试。" },
      { tone: "同学口吻", text: "备考神器安利：资料传上去AI帮你整理重点生成题库，刷题方便多了。" },
      { tone: "长辈口吻", text: "给孩子找个学习工具，能把学习资料变成练习题，复习方便。" },
      { tone: "同好口吻", text: "学习类工具分享：AI资料变题库，知识点提取+自动出题，很实用。" },
    ],
    "ai_learning"
  ),
  // P56 个人推荐版
  copy(
    "CP-PERSONAL-01", "P14", "ANY",
    "我在用，也分享给你看看",
    "国学工具、经典学习与AI题库",
    ["我在用的学习工具", "功能丰富不臃肿", "可以自己体验"],
    "扫码了解",
    "我自己在用的一个App，里面有国学工具、经典学习和AI题库，有兴趣可以自己体验，不打扰，看到就看看。",
    "我在用的一个学习工具，扫码了解。",
    friendTones("里面有国学工具、经典学习和AI题库等功能，"),
    "general"
  ),
  // 易学工具版（第二十条：术数工具定位）
  copy(
    "CP-YIXUE-01", "P02", "A06",
    "传统术数工具，一处集合",
    "排盘、研习、记录，一个工具箱",
    ["常用排盘工具集中使用", "支持记录与研究", "随时查看"],
    "扫码查看工具箱",
    "给同好们分享一个术数工具箱：紫微、八字、六爻这些排盘工具集中在一起，结果可以记录研究，用起来省事，分享给需要的朋友。",
    "常用术数排盘工具，一处集合，扫码查看。",
    friendTones("里面紫微、八字、六爻这些排盘工具都齐了，"),
    "yixue"
  ),
  // 医考题库版
  copy(
    "CP-YIKAO-01", "P10", "A05",
    "题库练习 + 模拟 + 错题复习",
    "把刷题变成有反馈的循环",
    ["题库练习", "模拟练习", "错题持续复习"],
    "扫码进入题库",
    "在用言道国学的医考题库区，练习、模拟、错题复习一体，刷完能看统计。备考的朋友可以试试这个刷题方式。",
    "医考刷题工具：题库+模拟+错题，扫码进入。",
    [
      { tone: "朋友口吻", text: "备考用这个题库工具，练习加模拟加错题本，反馈挺清楚的，你也试试？" },
      { tone: "同学口吻", text: "一起刷题吗？这个工具题库模拟错题都有，挺顺手。" },
      { tone: "长辈口吻", text: "给孩子找的刷题工具，有题库有模拟，学习方便。" },
      { tone: "同好口吻", text: "备考同好看下：题库+模拟+错题复习一体的工具。" },
    ],
    "zhongyi"
  ),
  // 学习空间版
  copy(
    "CP-SPACE-01", "P12", "A08",
    "资料共享 + 题库 + 学习进度",
    "把一群人变成一个学习空间",
    ["资料库与题库共享", "学习任务与进度", "成员练习与排行"],
    "扫码了解学习空间",
    "我们学习群在用言道国学的学习空间：资料和题库共享，任务进度都能看，成员一起练习还有排行，团队学习方便多了。",
    "团队学习工具：资料+题库+进度共享，扫码了解。",
    friendTones("我们群用它共享学习资料和题库，进度都能看到，"),
    "general"
  ),
  // 中老年版（A04：大字清晰、经典学习）
  copy(
    "CP-SENIOR-01", "P13", "A04",
    "经典随身读，知识慢慢学",
    "中医经典与国学知识，一处学习",
    ["经典阅读，字体清晰", "知识慢慢学不着急", "随时翻阅"],
    "扫码开始学习",
    "给亲戚朋友推荐一个传统文化学习工具：中医经典、国学知识都能看，字体大看着清楚，空闲时翻一翻，慢慢学。",
    "传统文化学习工具，经典阅读，扫码即可使用。",
    [
      { tone: "朋友口吻", text: "给你推荐个学习工具，中医经典和国学知识都能看，字体大清楚，空闲看看挺好。" },
      { tone: "同学口吻", text: "分享个学习App，经典内容多，看着也舒服。" },
      { tone: "长辈口吻", text: "这个工具里中医经典、国学知识都有，字大清楚，您可以慢慢看。" },
      { tone: "同好口吻", text: "传统文化学习工具分享，经典阅读方便。" },
    ],
    "zhongyi"
  ),
];

/** 按 product+audience 匹配文案：先精确匹配产品，再按受众偏好，最后通用兜底 */
export function selectCopy(product: ProductId, audience: AudienceId): CopySet {
  const active = COPY_LIBRARY.filter((c) => c.status === "ACTIVE");
  const exact = active.find((c) => c.product === product && c.audience === audience);
  if (exact) return exact;
  const byProduct = active.find((c) => c.product === product);
  if (byProduct) return byProduct;
  const byAudience = active.find((c) => c.audience === audience);
  if (byAudience) return byAudience;
  return active.find((c) => c.product === "P14") ?? active[0];
}

export function getDisclaimer(kind: DisclaimerKind): string {
  return DISCLAIMERS[kind] ?? DISCLAIMERS.general;
}
