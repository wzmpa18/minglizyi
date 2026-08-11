/**
 * ============================================================================
 * 混元AI 服务模块 - v20.4
 * ============================================================================
 *
 * 对接腾讯混元大模型 API，用于自动生成中医/易学内容并保存到服务器。
 * 密钥仅存于服务端环境变量，前端零暴露。
 *
 * 环境变量配置（.env.local）：
 *   HUNYUAN_API_KEY=你的混元API密钥
 *   HUNYUAN_API_URL=https://tokenhub.tencentmaas.com/v1/chat/completions
 *   HUNYUAN_MODEL=hy3
 *
 * 创建日期：2026-08-11
 * ============================================================================
 */

// ==================== 类型定义 ====================

export interface HunyuanMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface HunyuanChatRequest {
  messages: HunyuanMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface HunyuanChatResponse {
  success: boolean;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

// ==================== 配置 ====================

const HUNYUAN_API_URL =
  process.env.HUNYUAN_API_URL ||
  "https://tokenhub.tencentmaas.com/v1/chat/completions";

const HUNYUAN_API_KEY = process.env.HUNYUAN_API_KEY || "";

const HUNYUAN_MODEL = process.env.HUNYUAN_MODEL || "hy3";

// ==================== 核心调用 ====================

/**
 * 调用混元AI对话接口
 * @param request 对话请求参数
 * @returns 对话响应
 */
export async function chat(request: HunyuanChatRequest): Promise<HunyuanChatResponse> {
  if (!HUNYUAN_API_KEY) {
    return {
      success: false,
      content: "",
      error: "混元AI密钥未配置，请设置 HUNYUAN_API_KEY 环境变量",
    };
  }

  try {
    const body = {
      model: request.model || HUNYUAN_MODEL,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
      stream: false,
    };

    const response = await fetch(HUNYUAN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HUNYUAN_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[HunyuanAI] API error:", response.status, errText);
      return {
        success: false,
        content: "",
        error: `混元AI接口返回错误: HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        content: "",
        error: "混元AI返回空结果",
      };
    }

    return {
      success: true,
      content: data.choices[0].message?.content || "",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error: any) {
    console.error("[HunyuanAI] call failed:", error);
    return {
      success: false,
      content: "",
      error: `混元AI调用失败: ${error.message || "未知错误"}`,
    };
  }
}

// ==================== 内容生成提示词 ====================

/** 中医典籍生成提示词 */
const TCM_CLASSIC_PROMPT = `你是一位中医文献研究专家。请严格按照以下JSON格式生成一部中医典籍的内容，要求原文准确、注解专业。

请生成以下JSON结构（不要包含其他文字，直接输出JSON）：
{
  "id": "拼音简写id",
  "title": "书名",
  "author": "作者",
  "dynasty": "朝代",
  "category": "经典|方剂|药学|诊断",
  "summary": "200字以内简介",
  "isFreeContent": true,
  "chapters": [
    {
      "title": "章节标题",
      "content": "典籍原文（100-500字）",
      "annotation": "白话注解（100-300字）"
    }
  ]
}

要求：
1. 原文必须选自公共领域古籍，确保准确性
2. 注解为现代白话释义，便于学习理解
3. 每部典籍包含2-3个章节
4. 所有文字使用简体中文
5. 内容仅供传统文化学习研究，不构成诊疗指导`;

/** 易学题库生成提示词 */
const YIXUE_EXAM_PROMPT = `你是一位易学教育专家。请严格按照以下JSON格式生成10道易学（易经/周易）考试题目。

请生成以下JSON结构（不要包含其他文字，直接输出JSON数组）：
[
  {
    "id": "yx_x001",
    "category": "yixue",
    "difficulty": "basic|intermediate|advanced",
    "question": "题目内容",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "correctAnswer": 0,
    "explanation": "答案解析（50-200字）",
    "source": "出处"
  }
]

要求：
1. 题目涵盖易经基础、八卦、五行、天干地支等知识点
2. 每题4个选项，correctAnswer为正确选项索引（0-3）
3. 解析需说明答案依据
4. 所有文字使用简体中文
5. 内容仅供传统文化学习研究`;

/** 中医题库生成提示词 */
const ZHONGYI_EXAM_PROMPT = `你是一位中医教育专家。请严格按照以下JSON格式生成10道中医考试题目。

请生成以下JSON结构（不要包含其他文字，直接输出JSON数组）：
[
  {
    "id": "zy_x001",
    "category": "zhongyi",
    "difficulty": "basic|intermediate|advanced",
    "question": "题目内容",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "correctAnswer": 0,
    "explanation": "答案解析（50-200字）",
    "source": "出处"
  }
]

要求：
1. 题目涵盖中医基础理论、中药、方剂、诊断等知识点
2. 每题4个选项，correctAnswer为正确选项索引（0-3）
3. 解析需说明答案依据
4. 所有文字使用简体中文
5. 内容仅供传统文化学习研究，不涉及诊疗指导`;

// ==================== 内容生成接口 ====================

/**
 * 生成一部中医典籍
 * @param classicName 典籍名称（可选，留空则自动选择）
 */
export async function generateTCMClassic(classicName?: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const userPrompt = classicName
    ? `请生成《${classicName}》的典籍内容。`
    : "请从以下典籍中选择一部生成内容：《神农本草经》《中藏经》《脉经》《针灸甲乙经》《诸病源候论》《千金翼方》《脾胃论》《格致余论》《景岳全书》《傅青主女科》《温热论》《医宗金鉴》《血证论》《医学心悟》《三因极一病证方论》。";

  const result = await chat({
    messages: [
      { role: "system", content: TCM_CLASSIC_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
    maxTokens: 4096,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // 尝试解析JSON
  try {
    const jsonStr = extractJSON(result.content);
    if (!jsonStr) {
      return { success: false, error: "AI返回内容无法解析为JSON" };
    }
    const data = JSON.parse(jsonStr);
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: `JSON解析失败: ${e.message}` };
  }
}

/**
 * 生成易学考试题目
 * @param difficulty 难度级别
 * @param count 生成数量
 */
export async function generateYixueQuestions(
  difficulty: "basic" | "intermediate" | "advanced" = "intermediate",
  count: number = 10
): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  const diffLabel = { basic: "初级", intermediate: "中级", advanced: "高级" }[difficulty];
  const userPrompt = `请生成${count}道${diffLabel}难度的易学考试题目。难度要求：${
    difficulty === "basic" ? "基础概念和常识" : difficulty === "intermediate" ? "中等难度，需要一定理解" : "高级难度，涉及深层理论和应用"
  }。`;

  const result = await chat({
    messages: [
      { role: "system", content: YIXUE_EXAM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.6,
    maxTokens: 4096,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  try {
    const jsonStr = extractJSON(result.content);
    if (!jsonStr) {
      return { success: false, error: "AI返回内容无法解析为JSON" };
    }
    const data = JSON.parse(jsonStr);
    return { success: true, data: Array.isArray(data) ? data : [data] };
  } catch (e: any) {
    return { success: false, error: `JSON解析失败: ${e.message}` };
  }
}

/**
 * 生成中医考试题目
 * @param difficulty 难度级别
 * @param count 生成数量
 */
export async function generateZhongyiQuestions(
  difficulty: "basic" | "intermediate" | "advanced" = "intermediate",
  count: number = 10
): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  const diffLabel = { basic: "初级", intermediate: "中级", advanced: "高级" }[difficulty];
  const userPrompt = `请生成${count}道${diffLabel}难度的中医考试题目。难度要求：${
    difficulty === "basic" ? "基础概念和常识" : difficulty === "intermediate" ? "中等难度，需要一定理解" : "高级难度，涉及方剂和临床理论"
  }。`;

  const result = await chat({
    messages: [
      { role: "system", content: ZHONGYI_EXAM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.6,
    maxTokens: 4096,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  try {
    const jsonStr = extractJSON(result.content);
    if (!jsonStr) {
      return { success: false, error: "AI返回内容无法解析为JSON" };
    }
    const data = JSON.parse(jsonStr);
    return { success: true, data: Array.isArray(data) ? data : [data] };
  } catch (e: any) {
    return { success: false, error: `JSON解析失败: ${e.message}` };
  }
}

// ==================== 工具函数 ====================

/**
 * 从AI返回文本中提取JSON字符串
 */
function extractJSON(text: string): string | null {
  // 尝试直接解析
  try {
    JSON.parse(text);
    return text;
  } catch {
    // 尝试提取代码块中的JSON
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        JSON.parse(codeBlockMatch[1]);
        return codeBlockMatch[1];
      } catch {}
    }

    // 尝试提取花括号或方括号内的JSON
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        JSON.parse(objMatch[0]);
        return objMatch[0];
      } catch {}
    }

    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        JSON.parse(arrMatch[0]);
        return arrMatch[0];
      } catch {}
    }
  }
  return null;
}

/**
 * 检查混元AI是否配置就绪
 */
export function isHunyuanConfigured(): boolean {
  return !!HUNYUAN_API_KEY;
}

/**
 * 获取混元AI配置状态
 */
export function getHunyuanStatus(): { configured: boolean; model: string; hasApiKey: boolean } {
  return {
    configured: !!HUNYUAN_API_KEY,
    model: HUNYUAN_MODEL,
    hasApiKey: !!HUNYUAN_API_KEY,
  };
}
