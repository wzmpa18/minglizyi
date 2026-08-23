// ============================================================================
// v25.0.47_14 (FIX-V14-PAY-MARKETING-VIRAL) 邀请裂变海报体系
// 3套病毒式传播模板（朋友圈种草版/社群引流版/专业学习版）
// + 全场景分享文案库（4套：朋友圈/群聊/兴趣群/私发好友）
// 设计原则：弱化生硬推广感，强化「朋友分享、宝藏工具、实用价值」社交货币属性
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
// 全场景分享文案库（每套一键复制即用，适配不同传播渠道）
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
    title: "朋友圈图文长文案",
    scene: "种草感，像真实用户分享",
    text: "最近挖到一个很良心的传统文化App，没有乱七八糟的广告和套路。\n里面紫微、八字、六爻这些排盘工具都很专业，还有完整的中医典籍库和智能问诊可以参考，平时既能当趣味工具玩玩，也能静下心学点传统知识。\n分享给你们，扫码就能免费体验👇",
  },
  {
    id: "SC-GROUP",
    title: "群聊/私聊短文案",
    scene: "直接高效，降低决策成本",
    text: "给你分享个国学工具App，排盘、中医问诊都有，挺实用的，扫码就能用：\n（配海报）",
  },
  {
    id: "SC-INTEREST",
    title: "精准兴趣群文案",
    scene: "主打功能价值，吸引精准用户",
    text: "推荐一个免费的国学工具，14款排盘工具+中医典籍查询，还有手机号、车牌趣味解析，功能挺全的，扫码直接用，不用下载。",
  },
  {
    id: "SC-FRIEND",
    title: "私发好友话术",
    scene: "信任感强，转化率高",
    text: "我最近在用这个国学工具，排盘挺准的，还有中医学习的内容，没事看看挺有意思的，你扫码试试，注册了我们都有奖励。",
  },
];

/** 系统分享默认文案（模板一种草调性） */
export const DEFAULT_SHARE_TEXT = SHARE_COPY_LIBRARY[0].text;

// ---------------------------------------------------------------------------
// 3套裂变海报模板（视觉 + 文案）
// ---------------------------------------------------------------------------

const MOMENTS_VARIANT: TemplateVariant = {
  id: "VIRAL-MOMENTS-01",
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
  id: "VIRAL-GROUP-01",
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
  id: "VIRAL-LEARN-01",
  family: "T05",
  name: "专业学习版",
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

const MOMENTS_COPY: CopySet = {
  copyId: "VC-MOMENTS-01",
  version: "v14.0.0",
  audience: "ANY",
  product: "P14",
  channel: "ANY",
  title: "藏在手机里的国学宝藏工具",
  subtitle: "命理排盘 · 中医养生 · 典籍查询 一站式搞定",
  sellingPoints: [
    "14款专业排盘工具，上手即用，新手也能看懂",
    "中医智能问诊+千年典籍库，随身学习参考",
    "无冗余广告，纯工具纯内容，干净省心",
  ],
  cta: "扫码立即体验",
  momentsCopy: SHARE_COPY_LIBRARY[0].text,
  groupCopy: SHARE_COPY_LIBRARY[1].text,
  privateCopies: [{ tone: "真诚推荐", text: SHARE_COPY_LIBRARY[3].text }],
  disclaimer: "general",
  status: "ACTIVE",
};

const GROUP_COPY: CopySet = {
  copyId: "VC-GROUP-01",
  version: "v14.0.0",
  audience: "ANY",
  product: "P14",
  channel: "ANY",
  title: "免费！专业级国学工具App",
  subtitle: "一次解锁 命理+中医两大板块",
  sellingPoints: [
    "紫微/八字/六爻/奇门 14款排盘工具",
    "手机号/车牌/姓名 趣味深度解析",
    "中医典籍查询+智能问诊参考",
    "模拟考试+题库，中医备考利器",
  ],
  cta: "长按识别 免费使用",
  momentsCopy: SHARE_COPY_LIBRARY[2].text,
  groupCopy: SHARE_COPY_LIBRARY[1].text,
  privateCopies: [{ tone: "直接高效", text: SHARE_COPY_LIBRARY[1].text }],
  disclaimer: "general",
  status: "ACTIVE",
};

const LEARN_COPY: CopySet = {
  copyId: "VC-LEARN-01",
  version: "v14.0.0",
  audience: "ANY",
  product: "P14",
  channel: "ANY",
  title: "你的随身国学学习助手",
  subtitle: "从排盘工具到中医典籍，系统化学习",
  sellingPoints: [
    "📚 历代中医典籍全文检索，注解齐全",
    "🎯 专业排盘工具，支持多维度深度解读",
    "📝 配套题库模拟考，学习效果实时检验",
  ],
  cta: "扫码立即体验",
  momentsCopy: SHARE_COPY_LIBRARY[0].text,
  groupCopy: SHARE_COPY_LIBRARY[2].text,
  privateCopies: [{ tone: "学习搭子", text: SHARE_COPY_LIBRARY[3].text }],
  disclaimer: "general",
  status: "ACTIVE",
};

export const VIRAL_TEMPLATES: ViralTemplate[] = [
  {
    id: "VIRAL_MOMENTS",
    name: "朋友圈种草版",
    shortName: "种草版",
    desc: "米色简约国风 · 主打社交传播，发朋友圈不违和",
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
    name: "专业学习版",
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
    copy: t.copy,
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
