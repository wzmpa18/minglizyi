"use client";

// ============================================================================
// 动态标签体系 - P1 收敛专项
// 一级标签清单（11 个），动态广场筛选、发布关联、工具结果一键发动态共用。
// ============================================================================

export const FEED_TAGS = [
  "八字", "奇门", "六爻", "紫微", "风水",
  "中医", "感情", "事业", "历法文化", "生活", "国学杂谈",
] as const;

export type FeedTag = (typeof FEED_TAGS)[number];

/** 工具名 → 默认标签（发布动态时自动匹配） */
export const TOOL_TAG_MAP: Record<string, FeedTag> = {
  "八字": "八字",
  "八字合婚": "八字",
  "梅花易数": "六爻",
  "六爻": "六爻",
  "小六壬": "六爻",
  "大六壬": "六爻",
  "紫微斗数": "紫微",
  "奇门遁甲": "奇门",
  "达摩一掌经": "六爻",
  "太乙三式": "奇门",
  "玄空飞星": "风水",
  "择吉择日": "风水",
  "老黄历": "风水",
  "万年历": "风水",
  "二十四节气": "生活",
  "姓名解析": "生活",
  "智能起名": "生活",
  "手机号码解析": "生活",
  "车牌号民俗解读": "生活",
  "周公解梦": "生活",
  "神煞": "八字",
  "干支": "八字",
  "空亡": "八字",
  "纳音": "八字",
  "五行": "八字",
  "称骨": "八字",
};

/** 校验并返回合法一级标签（未知标签丢弃） */
export function sanitizeTags(tags: (string | undefined)[] | undefined): FeedTag[] {
  if (!tags) return [];
  const valid = new Set<string>(FEED_TAGS);
  const out: FeedTag[] = [];
  for (const t of tags) {
    if (t && valid.has(t) && !out.includes(t as FeedTag)) out.push(t as FeedTag);
  }
  return out;
}

/** 按工具名取默认标签 */
export function defaultTagForTool(toolName: string): FeedTag | null {
  return TOOL_TAG_MAP[toolName] || null;
}

/** 标签颜色（筛选栏/动态卡片统一配色） */
export const TAG_COLORS: Record<string, { bg: string; fg: string }> = {
  "八字": { bg: "#fde8e8", fg: "#c0392b" },
  "奇门": { bg: "#e8ecfd", fg: "#3f51b5" },
  "六爻": { bg: "#e8f8f0", fg: "#1e8e5a" },
  "紫微": { bg: "#f3e8fd", fg: "#7b2fbe" },
  "风水": { bg: "#fdf3e0", fg: "#b9770e" },
  "中医": { bg: "#e8f4fd", fg: "#2471a3" },
  "感情": { bg: "#fde8f1", fg: "#c2185b" },
  "事业": { bg: "#eaf7e8", fg: "#2e7d32" },
  "财运": { bg: "#fdf6e0", fg: "#9a7d0a" },
  "历法文化": { bg: "#fdf6e0", fg: "#9a7d0a" },
  "生活": { bg: "#eef1f4", fg: "#566573" },
  "国学杂谈": { bg: "#f0ebe4", fg: "#7d6608" },
};
