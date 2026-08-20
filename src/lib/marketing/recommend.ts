// ============================================================================
// P7-MKT-POSTER-02 推荐引擎（第四十五/三十五条）
// 初始阶段规则推荐；提供"换一个风格/使用通用版/关闭个性化"选项
// 不得把个性化营销设为唯一选择
// ============================================================================

import type { AudienceId, ChannelId, PosterRatio, ProductId, TemplateVariant, CopySet } from "./types";
import { getAudience } from "./audiences";
import { getProduct } from "./products";
import { getChannel } from "./channels";
import { TEMPLATE_FAMILIES, RATIOS, getVariantsByFamily } from "./templates";
import { selectCopy } from "./copyLibrary";

export interface RecommendationItem {
  variant: TemplateVariant;
  copy: CopySet;
  ratio: PosterRatio;
  reason: string;
}

/** 第四十五条规则映射：product+audience → 模板家族优先级（ANY=任意圈层兜底） */
const RULE_MATRIX: Record<ProductId, Partial<Record<AudienceId | "ANY", string[]>>> = {
  P09: { A04: ["T02", "T01"], A05: ["T02", "T05"], ANY: ["T02", "T01"] },
  P10: { A05: ["T02", "T05"], ANY: ["T02", "T05"] },
  P02: { A06: ["T01", "T04"], A01: ["T03", "T04"], ANY: ["T01", "T04"] },
  P03: { A06: ["T01", "T04"], ANY: ["T01", "T04"] },
  P04: { A06: ["T01", "T04"], ANY: ["T01", "T04"] },
  P05: { A06: ["T01", "T04"], ANY: ["T01", "T04"] },
  P06: { A01: ["T03", "T04"], A07: ["T03", "T04"], ANY: ["T03", "T04"] },
  P07: { A01: ["T03", "T04"], A07: ["T03", "T04"], ANY: ["T03", "T04"] },
  P08: { A01: ["T03", "T04"], ANY: ["T03", "T04"] },
  P11: { A08: ["T05", "T04"], ANY: ["T05", "T04"] },
  P12: { A08: ["T05", "T04"], ANY: ["T05", "T04"] },
  P14: { A01: ["T03", "T04"], A04: ["T01", "T02"], ANY: ["T01", "T04"] },
  P01: { ANY: ["T01", "T04"] },
  P13: { ANY: ["T01", "T02"] },
};

/** 渠道适配首选比例 */
const CHANNEL_RATIO: Partial<Record<ChannelId, PosterRatio>> = {
  C01: "R3_4",
  C03: "SQUARE",
  C05: "SQUARE",
  C06: "R3_4",
  C09: "SQUARE",
};

function pickRatio(channel: ChannelId, variant: TemplateVariant): PosterRatio {
  const preferred = CHANNEL_RATIO[channel] ?? "R9_16";
  return variant.ratios.includes(preferred) ? preferred : variant.ratios[0];
}

/** 推荐3套（第五十七条）：基于规则矩阵 + 受众偏好，确保视觉多样 */
export function recommend(
  product: ProductId,
  audience: AudienceId,
  channel: ChannelId,
  personalized: boolean
): RecommendationItem[] {
  const copy = selectCopy(product, audience);
  const aud = getAudience(audience);
  const famOrder: string[] = personalized
    ? [...(RULE_MATRIX[product]?.[audience] ?? []), ...(RULE_MATRIX[product]?.ANY ?? []), ...aud.preferredTemplates, "T04"]
    : ["T01", "T04", "T05"];

  const seen = new Set<string>();
  const fams: string[] = [];
  for (const f of famOrder) {
    if (!seen.has(f)) {
      seen.add(f);
      fams.push(f);
    }
  }

  const items: RecommendationItem[] = [];
  for (const fam of fams.slice(0, 3)) {
    const family = TEMPLATE_FAMILIES[fam as keyof typeof TEMPLATE_FAMILIES];
    if (!family) continue;
    const variant = getVariantsByFamily(family.id)[0];
    items.push({
      variant,
      copy,
      ratio: pickRatio(channel, variant),
      reason: `根据「${aud.name} · ${getProduct(product).name} · ${getChannel(channel).name}」推荐${family.name}版`,
    });
  }
  while (items.length < 3) {
    const fallbackFam = ["T04", "T01", "T05"][items.length] as keyof typeof TEMPLATE_FAMILIES;
    const variant = getVariantsByFamily(fallbackFam)[0];
    items.push({
      variant,
      copy,
      ratio: pickRatio(channel, variant),
      reason: "通用风格",
    });
  }
  return items;
}

/** “换一个风格”：同家族下一变体或跨家族 */
export function switchStyle(current: RecommendationItem, direction: 1 | -1): RecommendationItem {
  const siblings = getVariantsByFamily(current.variant.family);
  const idx = siblings.findIndex((v) => v.id === current.variant.id);
  const next = siblings[(idx + direction + siblings.length) % siblings.length];
  return { ...current, variant: next, reason: `${current.reason}（已切换变体）` };
}

export function getRatio(ratio: PosterRatio) {
  return RATIOS[ratio];
}
