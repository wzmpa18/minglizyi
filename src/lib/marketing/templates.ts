// ============================================================================
// P7-MKT-POSTER-02 模板体系（第十三/三十八条 T01-T06，每类3套变体=18个）
// 共用 Template Engine 渲染，不是18张死图片
// 比例（第十二条）：9:16 / 3:4 / SQUARE / LONG
// ============================================================================

import type { TemplateFamily, TemplateFamilyId, TemplateVariant, RatioSpec, PosterRatio } from "./types";

export const RATIOS: Record<PosterRatio, RatioSpec> = {
  R9_16: { id: "R9_16", width: 1080, height: 1920, label: "9:16", desc: "故事型/全屏保存" },
  R3_4: { id: "R3_4", width: 1080, height: 1440, label: "3:4", desc: "社交内容平台" },
  SQUARE: { id: "SQUARE", width: 1080, height: 1080, label: "1:1", desc: "群分享/朋友圈图组" },
  LONG: { id: "LONG", width: 1080, height: 1620, label: "2:3", desc: "产品介绍" },
};

export const RATIO_LIST = Object.values(RATIOS);

function variant(
  family: TemplateFamilyId,
  idx: number,
  name: string,
  bg: [string, string],
  accent: string,
  text: string,
  subText: string,
  cardBg: string,
  decorative: TemplateVariant["decorative"],
  ratios: PosterRatio[]
): TemplateVariant {
  return {
    id: `${family}-V${idx}`,
    family,
    name,
    palette: { bg, accent, text, subText, cardBg },
    ratios,
    decorative,
  };
}

export const TEMPLATE_FAMILIES: Record<TemplateFamilyId, TemplateFamily> = {
  T01: {
    id: "T01",
    name: "国风经典",
    desc: "米白/暖金/墨色/山水/留白",
    variants: [
      variant("T01", 1, "宣纸暖金", ["#F7F1E3", "#EFE4CB"], "#8C6A2F", "#3A2E1E", "#7A6A4F", "#FFFDF6", "mountain", ["R9_16", "R3_4", "SQUARE", "LONG"]),
      variant("T01", 2, "墨色留白", ["#FAFAF7", "#EDEDE6"], "#4A4A44", "#2B2B26", "#6B6B60", "#FFFFFF", "paper", ["R3_4", "SQUARE", "LONG"]),
      variant("T01", 3, "暖金纹样", ["#F5EBD8", "#E8D5AE"], "#A07830", "#33280F", "#77683F", "#FFFBEF", "paper", ["R9_16", "R3_4", "LONG"]),
    ],
  },
  T02: {
    id: "T02",
    name: "中医学习",
    desc: "古籍/纸张/药柜书册抽象元素（禁白大褂/治疗图）",
    variants: [
      variant("T02", 1, "古籍纸卷", ["#F9F4E8", "#EFE6D2"], "#7A5C28", "#3B2F1A", "#75653F", "#FFFCF4", "paper", ["R9_16", "R3_4", "SQUARE", "LONG"]),
      variant("T02", 2, "青囊书册", ["#F2F5EC", "#E2EAD5"], "#4E6B3A", "#2A3620", "#5F6F4E", "#FBFDF7", "paper", ["R3_4", "SQUARE", "LONG"]),
      variant("T02", 3, "杏林暖棕", ["#F7EFE2", "#EBDCC4"], "#8A5A2B", "#3C2C16", "#73614A", "#FFFAF2", "grid", ["R9_16", "R3_4", "LONG"]),
    ],
  },
  T03: {
    id: "T03",
    name: "年轻文化",
    desc: "深蓝/紫/星点/轻玻璃",
    variants: [
      variant("T03", 1, "星空紫", ["#2B2350", "#4A3A80"], "#B9A5F0", "#FFFFFF", "#CFC6EE", "rgba(255,255,255,0.10)", "stars", ["R9_16", "R3_4", "SQUARE", "LONG"]),
      variant("T03", 2, "深蓝渐变", ["#1D2A4A", "#33477C"], "#8FB4F0", "#FFFFFF", "#C4D4F2", "rgba(255,255,255,0.10)", "stars", ["R9_16", "R3_4", "SQUARE"]),
      variant("T03", 3, "轻玻璃卡片", ["#EDEBF6", "#DCD7F0"], "#6B5CB8", "#2D2648", "#6F6790", "#FFFFFF", "stars", ["R3_4", "SQUARE", "LONG"]),
    ],
  },
  T04: {
    id: "T04",
    name: "极简功能",
    desc: "白/浅灰/大标题/3功能点/超大二维码",
    variants: [
      variant("T04", 1, "纯白极简", ["#FFFFFF", "#F4F4F6"], "#7B2FBE", "#1F1B26", "#6E6879", "#FAF8FD", "grid", ["R9_16", "R3_4", "SQUARE", "LONG"]),
      variant("T04", 2, "浅灰专业", ["#F6F6F8", "#E9E9EE"], "#5A5F6E", "#26282E", "#6B6E78", "#FFFFFF", "grid", ["R3_4", "SQUARE", "LONG"]),
      variant("T04", 3, "品牌紫简", ["#FBF9FE", "#F0EAF9"], "#7B2FBE", "#2A2038", "#6F6580", "#FFFFFF", "grid", ["R9_16", "R3_4", "SQUARE"]),
    ],
  },
  T05: {
    id: "T05",
    name: "AI学习",
    desc: "科技蓝/卡片/资料→知识→题库视觉流程",
    variants: [
      variant("T05", 1, "科技蓝卡", ["#EDF4FC", "#DCE9F8"], "#2563C9", "#16283E", "#5C7290", "#FFFFFF", "flow", ["R9_16", "R3_4", "SQUARE", "LONG"]),
      variant("T05", 2, "深空科技", ["#101C30", "#1E3450"], "#5EA0F5", "#FFFFFF", "#B9CBE5", "rgba(255,255,255,0.10)", "flow", ["R9_16", "R3_4", "SQUARE"]),
      variant("T05", 3, "清新蓝绿", ["#EDF8F6", "#D9F0EC"], "#0F8A7E", "#153329", "#557E72", "#FFFFFF", "flow", ["R3_4", "SQUARE", "LONG"]),
    ],
  },
  T06: {
    id: "T06",
    name: "个人推荐",
    desc: "推荐人信息/品牌/一句推荐/二维码",
    variants: [
      variant("T06", 1, "温暖推荐", ["#FFF9F0", "#F6E9D8"], "#C07830", "#3A2C18", "#7D6B4C", "#FFFDF8", "avatar", ["R9_16", "R3_4", "SQUARE", "LONG"]),
      variant("T06", 2, "紫调推荐", ["#FAF7FE", "#EFE7FA"], "#7B2FBE", "#2B2135", "#71638A", "#FFFFFF", "avatar", ["R9_16", "R3_4", "SQUARE"]),
      variant("T06", 3, "墨白推荐", ["#FAFAF8", "#ECECE8"], "#3E3E3A", "#232320", "#63635B", "#FFFFFF", "avatar", ["R3_4", "SQUARE", "LONG"]),
    ],
  },
};

export const TEMPLATE_FAMILY_LIST = Object.values(TEMPLATE_FAMILIES);

export function getVariantsByFamily(family: TemplateFamilyId): TemplateVariant[] {
  return TEMPLATE_FAMILIES[family]?.variants ?? TEMPLATE_FAMILIES.T04.variants;
}

export function findVariant(id: string): TemplateVariant | null {
  for (const f of TEMPLATE_FAMILY_LIST) {
    const v = f.variants.find((x) => x.id === id);
    if (v) return v;
  }
  return null;
}

export const TOTAL_VARIANT_COUNT = TEMPLATE_FAMILY_LIST.reduce((n, f) => n + f.variants.length, 0);
