// ============================================================================
// v25.0.47_22 (MARKETING-POSTER-V2-AI) AI智能海报文案生成
// 「✨ AI换文案」：一键生成3套不同风格的海报文案+配套朋友圈/社群文案
// 通道：复用现有 /api/ai/chat 服务端代理（不新增密钥）
// 合规：生成结果逐套过 validateCopySet 敏感词过滤，不合规直接丢弃；
//       AI不可用/全部不合规时回落内置3套兜底文案（保底方案）
// ============================================================================

import { validateCopySet } from "./compliance";

export type AiCopyStyleId = "casual" | "pro" | "direct";

export interface AiPosterCopy {
  styleId: AiCopyStyleId;
  styleName: string;
  styleDesc: string;
  title: string;
  subtitle: string;
  sellingPoints: string[];
  momentsText: string;
  groupText: string;
}

export interface AiCopyResult {
  sets: AiPosterCopy[];
  usedFallback: boolean;
  error?: string;
}

const STYLE_DEFS: { id: AiCopyStyleId; name: string; desc: string }[] = [
  { id: "casual", name: "朋友种草风", desc: "口语化、生活化，像真实用户分享，适合朋友圈" },
  { id: "pro", name: "专业干货风", desc: "突出功能价值与专业性，适合行业群、学习群" },
  { id: "direct", name: "简洁直接风", desc: "短平快，一句话讲清价值，适合私聊转发、群聊快速引流" },
];

const SYSTEM_PROMPT =
  "角色：你是资深国学领域营销文案专家，擅长写社交裂变型分享文案，文案自然不生硬，像真实用户自发分享，无硬广感。只输出要求的格式内容，不输出任何解释。";

function buildUserPrompt(styleName: string, styleDesc: string, seq: number): string {
  return `要求：
1. 为言道国学 APP 生成分享海报文案和配套朋友圈 / 社群文案；
2. 核心卖点：14 款专业排盘工具、中医典籍查询 + 智能问诊、无广告、扫码即用、免费基础功能；
3. 风格：${styleName}（${styleDesc}），字数控制合理，适合海报排版；
4. 合规要求：禁止封建迷信表述，定位为传统文化学习参考工具，不涉及医疗诊断承诺；禁止「最」「第一」「包准」「转运」等绝对化与迷信用语；
5. 输出格式（严格按以下五行输出，不要输出其他内容，不要加序号和markdown）：
海报主标题：（12字以内，醒目有力，讲结果不讲功能）
海报副标题：（20字以内，一行补充价值）
核心卖点：（3条，用中文分号；分隔，每条12-18字，短平快讲结果）
朋友圈配文：（90字以内，像真实用户分享）
社群转发配文：（50字以内，直接高效）

（本组序号：${seq}，请换一种全新表达，不要套用常见模板腔）`;
}

// ---------------------------------------------------------------------------
// AI 调用（复用 /api/ai/chat 代理，密钥仅存服务端）
// ---------------------------------------------------------------------------

async function callAiOnce(styleName: string, styleDesc: string, seq: number): Promise<string | null> {
  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(styleName, styleDesc, seq),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (data && data.success && typeof data.content === "string" && data.content.trim()) {
      return data.content;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 解析：行式字段提取（中英文冒号兼容，容忍markdown残留）
// ---------------------------------------------------------------------------

function pickField(text: string, label: string): string {
  const re = new RegExp(`${label}\\s*[:：]\\s*(.+)`);
  const m = text.match(re);
  if (!m) return "";
  return m[1]
    .replace(/^[#*\s-]+/, "")
    .replace(/[#*]+$/, "")
    .trim();
}

function parseAiCopy(raw: string, styleId: AiCopyStyleId, styleName: string, styleDesc: string): AiPosterCopy | null {
  // 截取到输出格式区，去掉AI可能的解释性前后缀
  const start = raw.indexOf("海报主标题");
  if (start < 0) return null;
  const body = raw.slice(start);
  const title = pickField(body, "海报主标题");
  const subtitle = pickField(body, "海报副标题");
  const pointsRaw = pickField(body, "核心卖点");
  const momentsText = pickField(body, "朋友圈配文");
  const groupText = pickField(body, "社群转发配文");
  const sellingPoints = pointsRaw
    .split(/[;；]|(?<![（(])、/)
    .map((s) => s.replace(/^[\d①②③④⑤.、\s-]+/, "").trim())
    .filter((s) => s.length >= 4)
    .slice(0, 4);
  if (!title || title.length > 20 || !subtitle || sellingPoints.length < 2) return null;
  return {
    styleId,
    styleName,
    styleDesc,
    title,
    subtitle,
    sellingPoints,
    momentsText: momentsText || "",
    groupText: groupText || "",
  };
}

/** 敏感词过滤：整套文案过合规校验（标题/副标题/卖点/配文） */
function isCompliant(set: AiPosterCopy): boolean {
  const r = validateCopySet([
    set.title,
    set.subtitle,
    ...set.sellingPoints,
    set.momentsText,
    set.groupText,
  ]);
  return r.passed;
}

// ---------------------------------------------------------------------------
// 内置兜底文案（AI不可用/全部不合规时的保底，与固定模板文案不同，保持新鲜感）
// ---------------------------------------------------------------------------

const FALLBACK_SETS: AiPosterCopy[] = [
  {
    styleId: "casual",
    styleName: "朋友种草风",
    styleDesc: "口语化、生活化，像真实用户分享，适合朋友圈",
    title: "挖到宝了，这个国学工具真好用",
    subtitle: "排盘 · 典籍 · 问诊，一个工具全搞定",
    sellingPoints: [
      "14款排盘工具，零基础也能轻松上手",
      "中医典籍随身查，学习参考两不误",
      "没有广告打扰，扫码就能免费用",
    ],
    momentsText:
      "最近手机里常驻的一个小工具：排盘、查典籍都在里面，界面清爽没广告，闲下来翻翻挺涨知识的。扫码就能用，分享给你们～",
    groupText: "分享个免费国学工具：14款排盘+中医典籍查询，扫码即用不用下载，挺干净的。",
  },
  {
    styleId: "pro",
    styleName: "专业干货风",
    styleDesc: "突出功能价值与专业性，适合行业群、学习群",
    title: "一站式传统文化学习工具",
    subtitle: "排盘 · 典籍 · 题库，系统化学习路径",
    sellingPoints: [
      "紫微八字六爻等14款专业排盘",
      "历代中医典籍全文检索+注解",
      "题库模拟考，学习效果可检验",
    ],
    momentsText:
      "整理学习资料时发现的平台：排盘工具专业，中医典籍能全文检索，还有配套题库检验学习效果，适合系统化学习传统文化的朋友，扫码即用。",
    groupText: "推荐：14款专业排盘+中医典籍库+题库模拟，免费基础功能，扫码直接用。",
  },
  {
    styleId: "direct",
    styleName: "简洁直接风",
    styleDesc: "短平快，一句话讲清价值，适合私聊转发、群聊快速引流",
    title: "免费国学工具，扫码就能用",
    subtitle: "排盘 · 典籍 · 题库，不用下载APP",
    sellingPoints: [
      "14款排盘工具即开即用",
      "中医典籍智能问诊随身查",
      "免费基础功能，无强制广告",
    ],
    momentsText: "一个能免费用的国学工具，排盘查典籍都方便，扫码即用，不用下载APP。感兴趣试试～",
    groupText: "免费国学工具：排盘+典籍+题库，扫码即用，无需下载。",
  },
];

// ---------------------------------------------------------------------------
// 对外入口：生成3套风格文案（并行3路AI，失败套自动丢弃，全失败回落兜底）
// ---------------------------------------------------------------------------

export async function generateAiPosterCopies(seq = 1): Promise<AiCopyResult> {
  const results = await Promise.all(
    STYLE_DEFS.map((s) => callAiOnce(s.name, s.desc, seq))
  );
  const seenTitles = new Set<string>();
  const sets: AiPosterCopy[] = [];
  results.forEach((raw, i) => {
    if (!raw) return;
    const parsed = parseAiCopy(raw, STYLE_DEFS[i].id, STYLE_DEFS[i].name, STYLE_DEFS[i].desc);
    if (!parsed) return;
    if (!isCompliant(parsed)) return;
    if (seenTitles.has(parsed.title)) return;
    seenTitles.add(parsed.title);
    sets.push(parsed);
  });

  if (sets.length === 0) {
    return { sets: FALLBACK_SETS, usedFallback: true, error: "AI文案生成暂不可用，已为你准备内置精选文案" };
  }
  return { sets, usedFallback: false };
}
