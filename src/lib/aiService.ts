/**
 * 客户端 AI 服务层 v18.2 安全整改
 * 所有 AI 调用通过本地 /api/ai/chat 服务端代理转发
 * 前端代码零密钥、零第三方 API 地址暴露
 * 双层缓存机制（localStorage + 服务端文件）+ 降级机制保持不变
 */
"use client";

// ==================== 类型定义 ====================
export interface AIRequest {
  systemPrompt?: string;
  userPrompt: string;
  cacheKey?: string;
  forceRefresh?: boolean;
}

export interface AIResponse {
  success: boolean;
  content: string;
  cached: boolean;
  usage?: { promptTokens: number; completionTokens: number };
  error?: string;
}

// ==================== localStorage 缓存 ====================
const LOCAL_CACHE_PREFIX = "yandao_ai_cache_";

function getLocalCacheKey(key: string): string {
  return LOCAL_CACHE_PREFIX + key.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, "_").slice(0, 80);
}

function getLocalCache(key: string): string | null {
  try {
    const fullKey = getLocalCacheKey(key);
    const raw = localStorage.getItem(fullKey);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > 604800000) {
      localStorage.removeItem(fullKey);
      return null;
    }
    return entry.content;
  } catch {
    return null;
  }
}

function setLocalCache(key: string, content: string): void {
  try {
    const fullKey = getLocalCacheKey(key);
    const entry = { content, timestamp: Date.now() };
    localStorage.setItem(fullKey, JSON.stringify(entry));
    const keys = Object.keys(localStorage).filter(k => k.startsWith(LOCAL_CACHE_PREFIX));
    if (keys.length > 100) {
      const sorted = keys
        .map(k => ({ k, t: JSON.parse(localStorage.getItem(k) || "{}").timestamp || 0 }))
        .sort((a, b) => a.t - b.t);
      for (let i = 0; i < sorted.length - 100; i++) {
        localStorage.removeItem(sorted[i].k);
      }
    }
  } catch { /* ignore */ }
}

// ==================== 降级内容 ====================
const FALLBACK_MESSAGES: Record<string, string> = {
  yixue: "AI解读服务暂时不可用，请稍后重试。您可先查看经典解读内容。",
  zhongyi: "AI内容生成服务暂时不可用，已展示现有经典资料。",
  exam: "AI解析服务暂时不可用，已展示标准答案与解析。",
  default: "AI服务暂时不可用，请稍后重试。",
};

// ==================== 核心调用 ====================
// 所有请求通过本地 /api/ai/chat 服务端代理转发，密钥仅存服务端环境变量
export async function callAI(request: AIRequest): Promise<AIResponse> {
  const { systemPrompt, userPrompt, cacheKey, forceRefresh } = request;
  const key = cacheKey || `${systemPrompt?.slice(0, 50) || ""}_${userPrompt.slice(0, 50)}`;

  // 1. 检查本地缓存
  if (!forceRefresh) {
    const localCached = getLocalCache(key);
    if (localCached) {
      return { success: true, content: localCached, cached: true };
    }
  }

  // 2. 调用本地服务端代理（服务端持有密钥，安全转发到第三方 AI）
  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemPrompt, userPrompt, cacheKey: key, forceRefresh }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.success) {
      setLocalCache(key, data.content);
      return { success: true, content: data.content, cached: data.cached, usage: data.usage };
    }

    throw new Error(data.error || "AI返回失败");
  } catch (error: any) {
    console.warn("AI call failed:", error.message);
    const category = cacheKey?.includes("zhongyi") ? "zhongyi"
      : cacheKey?.includes("exam") ? "exam"
      : cacheKey?.includes("yixue") ? "yixue"
      : "default";
    return {
      success: false,
      content: FALLBACK_MESSAGES[category] || FALLBACK_MESSAGES.default,
      cached: false,
      error: error.message,
    };
  }
}

// ==================== v19.6: 会员配额与付费解读 ====================

const AI_QUOTA_KEY = "yandao_ai_quota";
const AI_PAID_KEY = "yandao_ai_paid";

export interface AIQuotaStatus {
  dailyUsed: number;
  dailyLimit: number;
  remaining: number;
  level: "basic" | "monthly" | "yearly" | "lifetime";
  canUse: boolean;
  needPayment: boolean;
  message: string;
}

// 付费套餐配置（号码/车牌等专项工具）
export interface PaidPlan {
  key: string;
  name: string;
  price: number;
  duration: string;
  desc: string;
}

export const AI_PAID_PLANS: PaidPlan[] = [
  { key: "single", name: "单次解读", price: 2.9, duration: "1次", desc: "单次AI深度解读" },
  { key: "daily", name: "日卡", price: 9.9, duration: "24小时", desc: "当日无限次解读" },
  { key: "monthly", name: "月卡", price: 39.9, duration: "30天", desc: "全工具月度畅享" },
  { key: "quarterly", name: "季卡", price: 99.9, duration: "90天", desc: "季度无限解读" },
  { key: "yearly", name: "年卡", price: 199, duration: "365天", desc: "全年无限解读" },
];

// 检查用户AI配额
export function checkAIQuota(): AIQuotaStatus {
  if (typeof window === "undefined") {
    return { dailyUsed: 0, dailyLimit: 0, remaining: 0, level: "basic", canUse: false, needPayment: true, message: "" };
  }

  try {
    // 获取会员状态
    const membershipRaw = localStorage.getItem("yandao_membership_status");
    let level: "basic" | "monthly" | "yearly" | "lifetime" = "basic";
    if (membershipRaw) {
      const ms = JSON.parse(membershipRaw);
      if (ms.level === "lifetime") level = "lifetime";
      else if (ms.level === "yearly" && ms.expireTime && new Date(ms.expireTime) > new Date()) level = "yearly";
      else if (ms.level === "monthly" && ms.expireTime && new Date(ms.expireTime) > new Date()) level = "monthly";
    }

    // 检查付费套餐
    const paidRaw = localStorage.getItem(AI_PAID_KEY);
    let hasPaidPlan = false;
    if (paidRaw) {
      const paid = JSON.parse(paidRaw);
      if (paid.expireTime && new Date(paid.expireTime) > new Date()) {
        hasPaidPlan = true;
      }
    }

    // 配额限制（v20.5: 免费用户零AI门槛，必须付费或开通会员）
    const limits: Record<string, number> = {
      basic: 0,
      monthly: 50,
      yearly: Infinity,
      lifetime: Infinity,
    };

    const dailyLimit = level === "lifetime" || level === "yearly" || hasPaidPlan ? Infinity : limits[level];

    // 获取今日使用次数
    const today = new Date().toDateString();
    const quotaRaw = localStorage.getItem(AI_QUOTA_KEY);
    let dailyUsed = 0;
    if (quotaRaw) {
      const quota = JSON.parse(quotaRaw);
      if (quota.date === today) {
        dailyUsed = quota.count || 0;
      }
    }

    const remaining = dailyLimit === Infinity ? Infinity : Math.max(0, dailyLimit - dailyUsed);
    const canUse = remaining > 0;
    const needPayment = !canUse && level === "basic";

    let message = "";
    if (level === "lifetime" || level === "yearly") {
      message = "会员特权：无限AI解读";
    } else if (hasPaidPlan) {
      message = "付费套餐有效中：无限解读";
    } else if (level === "monthly") {
      message = `今日剩余${remaining}次AI解读机会`;
    } else if (!canUse) {
      message = "AI解读需单次付费或开通会员后使用";
    }

    return { dailyUsed, dailyLimit, remaining, level, canUse, needPayment, message };
  } catch {
    return { dailyUsed: 0, dailyLimit: 0, remaining: 0, level: "basic", canUse: false, needPayment: true, message: "" };
  }
}

// 增加AI使用次数
export function incrementAIUsage(): void {
  if (typeof window === "undefined") return;
  try {
    const today = new Date().toDateString();
    const quotaRaw = localStorage.getItem(AI_QUOTA_KEY);
    let quota = { date: today, count: 0 };
    if (quotaRaw) {
      const parsed = JSON.parse(quotaRaw);
      if (parsed.date === today) quota = parsed;
    }
    quota.count += 1;
    localStorage.setItem(AI_QUOTA_KEY, JSON.stringify(quota));
  } catch { /* ignore */ }
}

// 激活付费套餐
export function activatePaidPlan(planKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const plan = AI_PAID_PLANS.find(p => p.key === planKey);
    if (!plan) return false;

    const now = new Date();
    let expireTime: string;
    if (planKey === "single") {
      // 单次：24小时有效
      expireTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    } else if (planKey === "daily") {
      expireTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    } else if (planKey === "monthly") {
      expireTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (planKey === "quarterly") {
      expireTime = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      expireTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    localStorage.setItem(AI_PAID_KEY, JSON.stringify({ plan: planKey, expireTime, activatedAt: now.toISOString() }));
    return true;
  } catch {
    return false;
  }
}

// 检查付费套餐状态
export function getPaidPlanStatus(): { active: boolean; plan: string | null; expireTime: string | null } {
  if (typeof window === "undefined") return { active: false, plan: null, expireTime: null };
  try {
    const raw = localStorage.getItem(AI_PAID_KEY);
    if (!raw) return { active: false, plan: null, expireTime: null };
    const data = JSON.parse(raw);
    if (data.expireTime && new Date(data.expireTime) > new Date()) {
      return { active: true, plan: data.plan, expireTime: data.expireTime };
    }
    return { active: false, plan: null, expireTime: null };
  } catch {
    return { active: false, plan: null, expireTime: null };
  }
}

// ==================== v20.1: 三级权限体系 ====================

export type PermissionLevel = "visitor" | "free" | "member";

export interface PermissionStatus {
  level: PermissionLevel;
  isLoggedIn: boolean;
  isMember: boolean;
  canUseAI: boolean;
  needLogin: boolean;
  needPayment: boolean;
  message: string;
}

// 单次解锁价格
export const SINGLE_UNLOCK_PRICE = 9.9;

// 单次解锁记录 key（按工具+排盘内容区分）
const SINGLE_UNLOCK_KEY = "yandao_single_unlocks";

/**
 * 获取用户当前权限等级
 * visitor: 未登录游客
 * free: 已登录免费用户
 * member: 付费会员（月卡/年卡/终身卡）
 */
export function getUserPermissionLevel(): PermissionLevel {
  if (typeof window === "undefined") return "visitor";
  try {
    // 检查是否登录
    const token = localStorage.getItem("yandao_user_token");
    if (!token) return "visitor";

    // 检查会员状态
    const membershipRaw = localStorage.getItem("yandao_membership_status");
    if (membershipRaw) {
      const ms = JSON.parse(membershipRaw);
      if (ms.level === "lifetime") return "member";
      if (ms.level === "yearly" && ms.expireTime && new Date(ms.expireTime) > new Date()) return "member";
      if (ms.level === "monthly" && ms.expireTime && new Date(ms.expireTime) > new Date()) return "member";
    }

    // 检查付费套餐
    const paidRaw = localStorage.getItem(AI_PAID_KEY);
    if (paidRaw) {
      const paid = JSON.parse(paidRaw);
      if (paid.expireTime && new Date(paid.expireTime) > new Date()) return "member";
    }

    return "free";
  } catch {
    return "visitor";
  }
}

/**
 * 获取完整权限状态
 */
export function getPermissionStatus(): PermissionStatus {
  const level = getUserPermissionLevel();

  if (level === "visitor") {
    return {
      level: "visitor",
      isLoggedIn: false,
      isMember: false,
      canUseAI: false,
      needLogin: true,
      needPayment: false,
      message: "登录后可使用AI解读（需单次付费或开通会员）",
    };
  }

  if (level === "free") {
    const quota = checkAIQuota();
    return {
      level: "free",
      isLoggedIn: true,
      isMember: false,
      canUseAI: quota.canUse,
      needLogin: false,
      needPayment: !quota.canUse,
      message: quota.canUse ? quota.message : "AI解读需单次付费或开通会员后使用",
    };
  }

  // member
  return {
    level: "member",
    isLoggedIn: true,
    isMember: true,
    canUseAI: true,
    needLogin: false,
    needPayment: false,
    message: "会员特权：所有AI内容完全开放",
  };
}

/**
 * 检查某个内容是否已通过单次付费解锁
 * @param contentKey 工具名+排盘内容的唯一标识
 */
export function isSingleUnlocked(contentKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(SINGLE_UNLOCK_KEY);
    if (!raw) return false;
    const unlocks = JSON.parse(raw);
    const entry = unlocks[contentKey];
    if (!entry) return false;
    // 单次解锁24小时有效
    return Date.now() - entry.timestamp < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * 激活单次付费解锁
 * @param contentKey 工具名+排盘内容的唯一标识
 */
export function activateSingleUnlock(contentKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(SINGLE_UNLOCK_KEY);
    let unlocks: Record<string, { timestamp: number }> = {};
    if (raw) unlocks = JSON.parse(raw);
    unlocks[contentKey] = { timestamp: Date.now() };
    localStorage.setItem(SINGLE_UNLOCK_KEY, JSON.stringify(unlocks));
    return true;
  } catch {
    return false;
  }
}

/**
 * 截取AI内容，仅展示前40%-50%给免费用户
 * @param fullContent 完整AI解读内容
 * @returns { preview: 截取后的预览内容, hiddenLength: 隐藏的字数 }
 */
export function truncateContentForFreeUser(fullContent: string): { preview: string; hiddenLength: number } {
  if (!fullContent) return { preview: "", hiddenLength: 0 };

  // 按段落分割
  const paragraphs = fullContent.split("\n").filter((p) => p.trim());

  // 计算展示前45%的内容
  const totalLength = fullContent.length;
  const previewLength = Math.floor(totalLength * 0.45);
  let currentLength = 0;
  const previewParagraphs: string[] = [];

  for (const para of paragraphs) {
    if (currentLength + para.length > previewLength) {
      // 截取部分内容
      const remaining = previewLength - currentLength;
      if (remaining > 20) {
        previewParagraphs.push(para.slice(0, remaining) + "...");
      }
      break;
    }
    previewParagraphs.push(para);
    currentLength += para.length + 1; // +1 for \n
  }

  const preview = previewParagraphs.join("\n");
  const hiddenLength = totalLength - preview.length;

  return { preview, hiddenLength };
}

/**
 * 生成内容锁定标识 key
 * @param toolName 工具名
 * @param context 排盘内容
 */
export function generateContentKey(toolName: string, context: string): string {
  return `${toolName}_${context.slice(0, 100).replace(/\s/g, "")}`;
}

// ==================== 事情断法（事件AI解读） ====================

export async function getEventDivination(
  toolName: string,
  chartContext: string,
  userQuestion: string
): Promise<string> {
  const systemPrompt = `你是资深易学断事专家，精通${toolName}等传统术数。用户将基于排盘结果提出具体问题（如投资、健康、感情、事业等），请结合排盘数据进行针对性分析。

要求：
1. 先简要分析排盘数据中与问题相关的要素
2. 针对用户的问题给出专业断事分析
3. 给出吉凶趋势判断和注意事项
4. 语言客观中肯，避免绝对化表述
5. 不涉及医疗诊断、投资建议等违规内容
6. 结尾必须标注：「以上内容仅供传统文化学习参考，不构成人生决策建议」`;

  const userPrompt = `【${toolName}排盘数据】\n${chartContext}\n\n【用户提问】\n${userQuestion}\n\n请结合排盘数据，针对用户的问题进行断事分析。`;

  const result = await callAI({
    systemPrompt,
    userPrompt,
    cacheKey: `event_${toolName}_${userQuestion.slice(0, 60)}`,
  });

  incrementAIUsage();
  return result.content;
}

// ==================== 号码/车牌AI解读 ====================

export async function getPhoneAIInterpretation(
  phoneNumber: string,
  analysisData: string
): Promise<string> {
  const systemPrompt = `你是数字能量学专家，精通八星数字能量、五行数理、81数理等数字文化研究。请基于号码分析结果，给出深度AI解读。

要求：
1. 综合分析号码的数字能量格局
2. 解读八星组合的能量特征和对使用者的影响
3. 五行平衡分析及调和建议
4. 号码与使用者运势的关联解读
5. 给出使用建议
6. 结尾必须标注：「以上内容仅供传统文化学习参考，不构成人生决策建议」`;

  const userPrompt = `手机号码：${phoneNumber}\n分析数据：\n${analysisData}\n\n请给出深度AI解读。`;

  const result = await callAI({
    systemPrompt,
    userPrompt,
    cacheKey: `phone_ai_${phoneNumber}`,
  });

  incrementAIUsage();
  return result.content;
}

export async function getCarplateAIInterpretation(
  plateNumber: string,
  analysisData: string
): Promise<string> {
  const systemPrompt = `你是车牌数理专家，精通五行数理、81数理、数字能量等传统文化研究。请基于车牌分析结果，给出深度AI解读。

要求：
1. 综合分析车牌的数理格局
2. 解读五行分布及平衡状况
3. 吉祥/不利组合的能量影响分析
4. 对行车平安的传统文化解读
5. 给出使用建议
6. 结尾必须标注：「以上内容仅供传统文化学习参考，不构成人生决策建议」`;

  const userPrompt = `车牌号码：${plateNumber}\n分析数据：\n${analysisData}\n\n请给出深度AI解读。`;

  const result = await callAI({
    systemPrompt,
    userPrompt,
    cacheKey: `carplate_ai_${plateNumber}`,
  });

  incrementAIUsage();
  return result.content;
}

// ==================== 便捷方法 ====================

export async function getYixueInterpretation(
  toolName: string,
  context: string,
  existingClassic?: string
): Promise<string> {
  const systemPrompt = `你是传统文化研究同好，精通八字、紫微斗数、奇门遁甲、六爻、梅花易数、大六壬、小六壬、太乙三式、玄空飞星等传统术数。请用中文回答，内容结构清晰，包含：1.经典原文出处 2.基础释义 3.吉凶定性 4.使用说明。如已有经典解读内容，请在此基础上补充完善，不要重复已有内容。补充内容标注「AI 参考」。`;
  const userPrompt = `工具：${toolName}\n上下文：${context}\n${existingClassic ? `已有经典解读：${existingClassic}\n请在以上基础上补充完善。` : "请提供完整解读。"}`;
  const result = await callAI({
    systemPrompt,
    userPrompt,
    cacheKey: `yixue_${toolName}_${context.slice(0, 60)}`,
  });
  return result.content;
}

export async function getAcupointAIDetail(
  acupointName: string,
  meridian: string,
  existingData?: string
): Promise<{ detail: string; needling: string; clinical: string }> {
  const systemPrompt = `你是专业中医针灸专家，精通经络腧穴学。请提供以下穴位的补充信息，格式为JSON：{"detail":"精准定位描述","needling":"进针方法与注意事项","clinical":"临床应用提示"}。内容专业准确，符合国家标准。`;
  const userPrompt = `穴位：${acupointName}（${meridian}）\n${existingData ? `已有信息：${existingData}` : ""}`;
  const result = await callAI({
    systemPrompt,
    userPrompt,
    cacheKey: `zhongyi_acupoint_${acupointName}`,
  });

  try {
    const json = JSON.parse(result.content);
    return {
      detail: json.detail || result.content,
      needling: json.needling || "",
      clinical: json.clinical || "",
    };
  } catch {
    return { detail: result.content, needling: "", clinical: "" };
  }
}

export async function getExamAIExplanation(
  question: string,
  answer: string,
  existingExplanation?: string
): Promise<string> {
  const systemPrompt = `你是传统文化学习辅导同好。请针对以下考题提供详细解析，包括：1.考点说明 2.解题思路 3.易错点提示。内容简洁专业。`;
  const userPrompt = `题目：${question}\n答案：${answer}\n${existingExplanation ? `已有解析：${existingExplanation}\n请在以上基础上补充完善。` : ""}`;
  const result = await callAI({
    systemPrompt,
    userPrompt,
    cacheKey: `exam_${question.slice(0, 60)}`,
  });
  return result.content;
}

export async function getHerbFormulaAIDetail(
  name: string,
  type: "herb" | "formula",
  existingData?: string
): Promise<string> {
  const systemPrompt = `你是专业中医药专家。请补充以下${type === "herb" ? "中药" : "方剂"}的详细信息，包括性味归经、方义解析、使用禁忌等。标注「AI 参考」。`;
  const userPrompt = `${type === "herb" ? "中药" : "方剂"}：${name}\n${existingData ? `已有信息：${existingData}` : ""}`;
  const result = await callAI({
    systemPrompt,
    userPrompt,
    cacheKey: `zhongyi_${type}_${name}`,
  });
  return result.content;
}

export function clearAllLocalCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(LOCAL_CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

export function getCacheStats(): { localCount: number; localSize: number } {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(LOCAL_CACHE_PREFIX));
    let size = 0;
    keys.forEach(k => { size += (localStorage.getItem(k) || "").length; });
    return { localCount: keys.length, localSize: size };
  } catch {
    return { localCount: 0, localSize: 0 };
  }
}
// ==================== AI 鍔╂墜鑱婂ぉ璁板綍涓庝綅缃寔涔呭寲 ====================
const LS_KEY_CHAT = "ai_assistant_chat";
const LS_KEY_POS = "ai_assistant_pos";

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  time: string;
  screenshot?: string;
}

export function loadAssistantChat(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY_CHAT);
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch { /* ignore */ }
  return [];
}

export function saveAssistantChat(msgs: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY_CHAT, JSON.stringify(msgs));
  } catch { /* ignore */ }
}

export function loadAssistantPos(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  try {
    const raw = localStorage.getItem(LS_KEY_POS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { x: 0, y: 0 };
}

export function saveAssistantPos(pos: { x: number; y: number }): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY_POS, JSON.stringify(pos));
  } catch { /* ignore */ }
}
