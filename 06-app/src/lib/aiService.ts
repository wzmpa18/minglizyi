/**
 * 客户端 AI 服务层 v18.2
 * 统一入口，所有AI调用通过此模块
 * 集成 localStorage 双层缓存机制
 * 降级机制：API失败时自动返回降级内容，保证基础功能100%可用
 * 
 * 注意：本项目为静态导出（output:export），AI密钥通过构建时环境变量注入。
 * 生产环境建议通过 Nginx 反向代理或独立后端服务保护密钥。
 * TokenHub API 已配置 IP 白名单（82.156.228.87），需确保白名单包含实际调用来源 IP。
 */

// ==================== 配置 ====================
// 注：静态导出模式下密钥内置于构建产物，生产环境应通过服务端代理保护
const AI_API_URL = "https://tokenhub.tencentmaas.com/v1/chat/completions";
const AI_API_KEY = "sk-sl6H1ymXeRmQ6yYsTaIftAN358vCfMfK162evzXLmef7V1vG";
const AI_MODEL = "hy3";

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
const LOCAL_CACHE_PREFIX = "ai_cache_";

function getLocalCacheKey(key: string): string {
  return LOCAL_CACHE_PREFIX + key.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, "_").slice(0, 80);
}

function getLocalCache(key: string): string | null {
  try {
    const fullKey = getLocalCacheKey(key);
    const raw = localStorage.getItem(fullKey);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > 86400000) {
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
export async function callAI(request: AIRequest): Promise<AIResponse> {
  const { systemPrompt, userPrompt, cacheKey, forceRefresh } = request;
  const key = cacheKey || `${systemPrompt?.slice(0, 30) || ""}_${userPrompt.slice(0, 50)}`;

  if (!forceRefresh) {
    const localCached = getLocalCache(key);
    if (localCached) {
      return { success: true, content: localCached, cached: true };
    }
  }

  try {
    const res = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt || "你是一个专业的中医/易学助手，请用中文回答，内容准确、专业、简洁。" },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`AI API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || "";
    const usage = {
      promptTokens: json.usage?.prompt_tokens || 0,
      completionTokens: json.usage?.completion_tokens || 0,
    };

    setLocalCache(key, content);
    return { success: true, content, cached: false, usage };
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

// ==================== 便捷方法 ====================

export async function getYixueInterpretation(
  toolName: string,
  context: string,
  existingClassic?: string
): Promise<string> {
  const systemPrompt = `你是专业易学大师，精通八字、紫微斗数、奇门遁甲、六爻、梅花易数、大六壬、小六壬、太乙三式、玄空飞星等传统术数。请用中文回答，内容结构清晰，包含：1.经典原文出处 2.基础释义 3.吉凶定性 4.使用说明。如已有经典解读内容，请在此基础上补充完善，不要重复已有内容。补充内容标注「AI 参考」。`;
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
  const systemPrompt = `你是中医执业医师考试辅导专家。请针对以下考题提供详细解析，包括：1.考点说明 2.解题思路 3.易错点提示。内容简洁专业。`;
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