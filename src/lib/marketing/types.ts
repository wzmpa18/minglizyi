// ============================================================================
// P7-MKT-POSTER-02 营销引擎类型定义
// AI分圈层智能营销海报：Audience × Product × Channel 三维度
// ============================================================================

export type PosterRatio = "R9_16" | "R3_4" | "SQUARE" | "LONG";

export interface RatioSpec {
  id: PosterRatio;
  width: number;
  height: number;
  label: string;
  desc: string;
}

export type TemplateFamilyId = "T01" | "T02" | "T03" | "T04" | "T05" | "T06";

export type AudienceId =
  | "A01" | "A02" | "A03" | "A04" | "A05" | "A06" | "A07" | "A08";

export type ProductId =
  | "P01" | "P02" | "P03" | "P04" | "P05" | "P06" | "P07"
  | "P08" | "P09" | "P10" | "P11" | "P12" | "P13" | "P14";

export type ChannelId =
  | "C01" | "C02" | "C03" | "C04" | "C05"
  | "C06" | "C07" | "C08" | "C09" | "C10";

export interface Audience {
  id: AudienceId;
  name: string;
  desc: string;
  themes: string[];
  visual: string[];
  titlePool: string[];
  forbiddenThemes: string[];
  preferredTemplates: TemplateFamilyId[];
}

export interface Product {
  id: ProductId;
  name: string;
  desc: string;
  enabled: boolean;
  approvedClaims: string[];
  forbiddenClaims: string[];
  sellingPoints: string[];
  defaultDisclaimer: DisclaimerKind;
  allowedAudiences: AudienceId[];
  allowedChannels: ChannelId[];
  priceKey?: string;
}

export type DisclaimerKind = "yixue" | "zhongyi" | "ai_learning" | "general";

/** 渠道政策（第二十三条 PosterChannelPolicy） */
export interface ChannelPolicy {
  id: ChannelId;
  name: string;
  icon: string;
  qrAllowed: boolean;
  externalLinkAllowed: boolean;
  referralCopyAllowed: boolean;
  priceAllowed: boolean;
  maxCopyLength: number;
  requiredDisclaimer: boolean;
  copyFormat: "moments" | "group" | "private" | "generic" | "none";
  desc: string;
}

export interface TemplateVariant {
  id: string;
  family: TemplateFamilyId;
  name: string;
  palette: {
    bg: [string, string];
    accent: string;
    text: string;
    subText: string;
    cardBg: string;
  };
  ratios: PosterRatio[];
  decorative: "mountain" | "paper" | "stars" | "grid" | "flow" | "avatar";
  /** v25.0.47_14 裂变模板卖点图标样式：check=✅角标 square=▪方块 缺省=圆点 */
  pointIcon?: "check" | "square";
}

export interface TemplateFamily {
  id: TemplateFamilyId;
  name: string;
  desc: string;
  variants: TemplateVariant[];
}

export interface CopySet {
  copyId: string;
  version: string;
  audience: AudienceId | "ANY";
  product: ProductId;
  channel: ChannelId | "ANY";
  title: string;
  subtitle: string;
  sellingPoints: string[];
  cta: string;
  momentsCopy: string;
  groupCopy: string;
  privateCopies: { tone: string; text: string }[];
  disclaimer: DisclaimerKind;
  status: "ACTIVE" | "DRAFT" | "DISABLED";
}

export interface ComplianceResult {
  passed: boolean;
  violations: { word: string; category: string; hint: string }[];
}

export interface PosterRequest {
  audience: AudienceId;
  product: ProductId;
  channel: ChannelId;
  ratio: PosterRatio;
  variant: TemplateVariant;
  copy: CopySet;
  qrDataUrl: string;
  inviteCode?: string;
  userNickname?: string;
  userAvatarUrl?: string | null;
  showNickname: boolean;
  showAvatar: boolean;
  price?: string | null;
}

export type MarketingEventType =
  | "poster_generated"
  | "poster_saved"
  | "copy_copied"
  | "system_share_started"
  | "style_switched"
  | "qr_selftest_failed";

export interface MarketingEventPayload {
  event: MarketingEventType;
  audience?: AudienceId;
  product?: ProductId;
  channel?: ChannelId;
  template?: string;
  ratio?: PosterRatio;
  copyId?: string;
}
