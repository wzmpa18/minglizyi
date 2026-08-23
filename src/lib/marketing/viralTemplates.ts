// ============================================================================
// v25.0.47_22 (MARKETING-POSTER-V2-AI) 邀请裂变海报体系 V2
// 3套社交裂变模板（朋友圈种草版/社群引流版/学习进阶版）
// + 分场景分享文案库（3套：朋友圈种草/社群引流/私聊好友）
// 营销底层逻辑：社交货币（像用户自发分享，非官方硬广）
//   价值前置（结果型卖点，3秒抓住注意力）
//   行动召唤（明确扫码理由，突出免费/免下载/即用即走）
//   分层适配（三套模板对应三类传播场景）
// AI赋能：aiCopy.ts 生成3风格动态文案，本文件固定文案做保底
// 渲染复用 posterEngine（Canvas 全元素绘制，导出完整海报 ≥750×1334）
// ============================================================================

import type {
  AudienceId,
  ChannelId,
  CopySet,
  PosterRatio,
  PosterRequest,
  ProductId,
  TemplateVariant,
} from "./types";
import { renderPoster, type RenderCheck } from "./posterEngine";
import { getChannel } from "./channels";
import type { RecommendationItem } from "./recommend";

export type ViralTemplateId = "VIRAL_MOMENTS" | "VIRAL_GROUP" | "VIRAL_LEARN";

export interface ViralTemplate {
  id: ViralTemplateId;
  name: string;
  shortName: string;
  desc: string;
  variant: TemplateVariant;
  copy: CopySet;
}

// ---------------------------------------------------------------------------
// 分场景分享文案库（v25.0.47_22：三场景一键复制即用，配合海报传播）
// ---------------------------------------------------------------------------

export interface ShareCopyItem {
  id: string;
  title: string;
  scene: string;
  text: string;
}

export const SHARE_COPY_LIBRARY: ShareCopyItem[] = [
  {
    id: "SC-MOMENTS",
    title: "朋友圈种草文案",
    scene: "长文案，有代入感",
    text: "最近挖到一个很良心的传统文化工具，没有乱七八糟的广告和套路。\n紫微八字这些排盘都很专业，还有完整的中医典籍库可以查，平时既能当趣味工具玩玩，也能静下心学点东西。\n分享给你们，扫码就能免费体验👇",
  },
  {
    id: "SC-GROUP",
    title: "社群引流文案",
    scene: "短平快，讲功能",
    text: "推荐一个免费的国学工具平台，14款排盘工具+中医典籍查询+智能问诊参考，功能挺全的，扫码直接用，不用下载APP。\n（附海报）",
  },
  {
    id: "SC-FRIEND",
    title: "私聊好友文案",
    scene: "信任感强，带福利",
    text: "我最近在用这个国学工具，排盘挺准的，还有中医学习的内容，没事看看挺有意思的。\n你扫码注册试试，咱们都有免费解析次数奖励。",
  },
];

/** 系统分享默认文案（朋友圈种草调性） */
export const DEFAULT_SHARE_TEXT = SHARE_COPY_LIBRARY[0].text;

// ---------------------------------------------------------------------------
// 3套裂变海报模板（视觉 + 文案）
// 统一视觉规范：3:4/9:16竖版 · 米色国风简约 · 信息层级
// 主标题(最大醒目)→价值副标题→核心卖点区→二维码行动区→底部合规小字(最弱化)
// ---------------------------------------------------------------------------

const MOMENTS_VARIANT: TemplateVariant = {
  id: "VIRAL-MOMENTS-02",
  family: "T01",
  name: "朋友圈种草版",
  palette: {
    bg: ["#F8F3E6", "#EFE2C6"],
    accent: "#9C5B33",
    text: "#38301F",
    subText: "#867554",
    cardBg: "#FFFDF5",
  },
  ratios: ["R9_16", "R3_4", "SQUARE", "LONG"],
  decorative: "paper",
  pointIcon: "check",
};

const GROUP_VARIANT: TemplateVariant = {
  id: "VIRAL-GROUP-02",
  family: "T03",
  name: "社群引流版",
  palette: {
    bg: ["#2E1D4E", "#5B2D91"],
    accent: "#F5C542",
    text: "#FFFFFF",
    subText: "#D9CDF2",
    cardBg: "rgba(255,255,255,0.12)",
  },
  ratios: ["R9_16", "R3_4", "SQUARE", "LONG"],
  decorative: "stars",
  pointIcon: "square",
};

const LEARN_VARIANT: TemplateVariant = {
  id: "VIRAL-LEARN-02",
  family: "T05",
  name: "学习进阶版",
  palette: {
    bg: ["#F0F6F2", "#DDEBE3"],
    accent: "#0F8A7E",
    text: "#1B382E",
    subText: "#5B7F73",
    cardBg: "#FFFFFF",
  },
  ratios: ["R9_16", "R3_4", "SQUARE", "LONG"],
  decorative: "grid",
  pointIcon: "check",
};

// 模板一：朋友圈种草版（默认模板，主打社交裂变，朋友私藏分享调性）
const MOMENTS_COPY: CopySet = {
  copyId: "VC-MOMENTS-02",
  version: "v22.0.0",
  audience: "ANY",
  product: "P14",
  channel: "ANY",
  title: "私藏很久的国学宝藏工具，终于舍得分享了",
  subtitle: "命理排盘 · 中医养生 · 典籍查询\n手机里就能用的传统文化百宝箱",
  sellingPoints: [
    "14款专业排盘工具，新手也能一眼看懂",
    "中医智能问诊+千年典籍库，随身参考",
    "无冗余广告，纯工具纯内容，干净省心",
    "不用下载APP，扫码直接免费使用",
  ],
  cta: "扫码立即体验",
  benefitLine: "🎁 扫码注册即得免费AI解析次数\n每日签到还能领积分兑权益",
  momentsCopy: SHARE_COPY_LIBRARY[0].text,
  groupCopy: SHARE_COPY_LIBRARY[1].text,
  privateCopies: [{ tone: "真诚推荐", text: SHARE_COPY_LIBRARY[2].text }],
  disclaimer: "general",
  status: "ACTIVE",
};

// 模板二：社群引流版（主打精准兴趣群转化，功能直接列清，信息密度高）
const GROUP_COPY: CopySet = {
  copyId: "VC-GROUP-02",
  version: "v22.0.0",
  audience: "ANY",
  product: "P14",
  channel: "ANY",
  title: "免费！专业级国学工具平台",
  subtitle: "一次解锁 · 命理排盘 + 中医学习 两大板块",
  sellingPoints: [
    "紫微/八字/六爻/奇门 14款排盘",
    "手机号/车牌/姓名 深度解析",
    "批量解读，支持导出完整报告",
    "历代典籍全文检索，注解齐全",
    "智能问诊参考，名家医案对照",
    "题库模拟考试，备考学习利器",
  ],
  pointGroups: [
    {
      title: "易学工具",
      items: [
        "紫微/八字/六爻/奇门 14款排盘",
        "手机号/车牌/姓名 深度解析",
        "批量解读，支持导出完整报告",
      ],
    },
    {
      title: "中医学习",
      items: [
        "历代典籍全文检索，注解齐全",
        "智能问诊参考，名家医案对照",
        "题库模拟考试，备考学习利器",
      ],
    },
  ],
  cta: "长按识别二维码，免费使用",
  qrNote: "永久免费基础功能 · 无强制广告",
  momentsCopy: SHARE_COPY_LIBRARY[0].text,
  groupCopy: SHARE_COPY_LIBRARY[1].text,
  privateCopies: [{ tone: "直接高效", text: SHARE_COPY_LIBRARY[1].text }],
  disclaimer: "general",
  status: "ACTIVE",
};

// 模板三：学习进阶版（主打学习者/备考人群，突出学习价值与工具属性）
const LEARN_COPY: CopySet = {
  copyId: "VC-LEARN-02",
  version: "v22.0.0",
  audience: "ANY",
  product: "P14",
  channel: "ANY",
  title: "你的随身国学学习助手",
  subtitle: "从排盘工具到中医典籍，系统化学习更高效",
  sellingPoints: [
    "📚 历代中医典籍全文检索，注解齐全",
    "🎯 专业排盘工具，支持多维度深度解读",
    "📝 配套题库模拟考，学习效果实时检验",
    "💡 名家医案拆解，拆解辨证逻辑思路",
  ],
  cta: "扫码开启系统化学习",
  qrNote: "适合爱好者/从业者/学生党",
  momentsCopy: SHARE_COPY_LIBRARY[0].text,
  groupCopy: SHARE_COPY_LIBRARY[1].text,
  privateCopies: [{ tone: "学习搭子", text: SHARE_COPY_LIBRARY[2].text }],
  disclaimer: "general",
  status: "ACTIVE",
};

export const VIRAL_TEMPLATES: ViralTemplate[] = [
  {
    id: "VIRAL_MOMENTS",
    name: "朋友圈种草版",
    shortName: "种草版",
    desc: "朋友私藏分享调性 · 主打社交裂变，发朋友圈不违和",
    variant: MOMENTS_VARIANT,
    copy: MOMENTS_COPY,
  },
  {
    id: "VIRAL_GROUP",
    name: "社群引流版",
    shortName: "引流版",
    desc: "信息密度高 · 功能一目了然，适合国学群/中医群/兴趣社群",
    variant: GROUP_VARIANT,
    copy: GROUP_COPY,
  },
  {
    id: "VIRAL_LEARN",
    name: "学习进阶版",
    shortName: "学习版",
    desc: "清雅书卷气 · 主打学习者人群，典籍/题库/深度解读",
    variant: LEARN_VARIANT,
    copy: LEARN_COPY,
  },
];

export function getViralTemplate(id: ViralTemplateId): ViralTemplate {
  return VIRAL_TEMPLATES.find((t) => t.id === id) ?? VIRAL_TEMPLATES[0];
}

/** 「换一个风格」：循环切换3套模板 */
export function cycleViralTemplate(currentVariantId: string): ViralTemplate {
  const idx = VIRAL_TEMPLATES.findIndex((t) => t.variant.id === currentVariantId);
  return VIRAL_TEMPLATES[(idx + 1 + VIRAL_TEMPLATES.length) % VIRAL_TEMPLATES.length];
}

/** AI推广助手第4步推荐集：固定返回3套裂变模板（模板一默认） */
export function buildViralRecs(): RecommendationItem[] {
  return VIRAL_TEMPLATES.map((t) => ({
    variant: t.variant,
    copy: t.copy,
    ratio: "R9_16" as PosterRatio,
    reason: t.desc,
  }));
}

/** AI文案应用到模板：生成一份替换了主标题/副标题/卖点的 CopySet（CTA/合规字段保留模板默认） */
export function applyAiCopyToCopySet(base: CopySet, ai: {
  title: string;
  subtitle: string;
  sellingPoints: string[];
  momentsText?: string;
  groupText?: string;
}, seq = 0): CopySet {
  return {
    ...base,
    copyId: `${base.copyId}-AI-${seq}-${Date.now().toString(36)}`,
    title: ai.title,
    subtitle: ai.subtitle,
    sellingPoints: ai.sellingPoints.slice(0, 4),
    // AI文案应用后分组两栏布局关闭，回落到常规卖点卡片（AI卖点条数不定，两栏需固定6条）
    pointGroups: undefined,
    momentsCopy: ai.momentsText || base.momentsCopy,
    groupCopy: ai.groupText || base.groupCopy,
  };
}

// ---------------------------------------------------------------------------
// 渲染入口：完整海报（背景+主/副标题+卖点+二维码+邀请码+合规底栏）
// ---------------------------------------------------------------------------

export interface ViralRenderOptions {
  qrDataUrl: string;
  inviteCode?: string;
  userNickname?: string;
  userAvatarUrl?: string | null;
  showNickname?: boolean;
  showAvatar?: boolean;
  /** v25.0.47_22：AI生成文案覆盖（不传则用模板固定文案） */
  copyOverride?: CopySet;
}

export interface ViralRenderResult {
  dataUrl: string;
  checks: RenderCheck;
  complianceBlocked: boolean;
}

export async function renderViralPoster(
  templateId: ViralTemplateId,
  opts: ViralRenderOptions
): Promise<ViralRenderResult> {
  const t = getViralTemplate(templateId);
  const req: PosterRequest = {
    audience: "A03" as AudienceId,
    product: "P14" as ProductId,
    channel: "C01" as ChannelId,
    ratio: "R9_16",
    variant: t.variant,
    copy: opts.copyOverride ?? t.copy,
    qrDataUrl: opts.qrDataUrl,
    inviteCode: opts.inviteCode,
    userNickname: opts.userNickname,
    userAvatarUrl: opts.userAvatarUrl ?? null,
    showNickname: opts.showNickname ?? false,
    showAvatar: opts.showAvatar ?? false,
    price: null,
  };
  return renderPoster(req, getChannel("C01" as ChannelId));
}
