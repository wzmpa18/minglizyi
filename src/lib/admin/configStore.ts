// ============================================================================
// 言道国学 - 后台配置持久化存储（服务端文件存储）
// 在项目 data 目录下以 JSON 文件持久化 AI / 会员配置，保证管理操作跨会话生效
// ============================================================================

import { promises as fs } from "fs";
import path from "path";
import type {
  AIConfig,
  MembershipConfig,
  AIToolConfig,
  IncrementalPackageConfig,
  MembershipPlanConfig,
  MemberLevel,
} from "./types";

/** 配置文件所在目录 */
const CONFIG_DIR = path.join(process.cwd(), "data");
const AI_CONFIG_FILE = path.join(CONFIG_DIR, "admin-ai-config.json");
const MEMBERSHIP_CONFIG_FILE = path.join(CONFIG_DIR, "admin-membership-config.json");

// ==================== 默认 AI 配置 ====================

/** 默认 AI 工具清单（与项目实际工具对齐） */
const DEFAULT_AI_TOOLS: AIToolConfig[] = [
  // 通用 AI 解读工具
  { id: "ai_general", name: "通用AI解读", category: "general_ai", enabled: true, price: 0, description: "排盘结果的通用AI文化解读" },
  { id: "ai_bazi", name: "八字AI解读", category: "general_ai", enabled: true, price: 0, description: "八字命盘AI深度解读" },
  { id: "ai_ziwei", name: "紫微AI解读", category: "general_ai", enabled: true, price: 0, description: "紫微斗数AI解读" },
  { id: "ai_qimen", name: "奇门AI解读", category: "general_ai", enabled: true, price: 0, description: "奇门遁甲AI解读" },
  { id: "ai_liuyao", name: "六爻AI解读", category: "general_ai", enabled: true, price: 0, description: "六爻预测AI解读" },
  { id: "ai_meihua", name: "梅花AI解读", category: "general_ai", enabled: true, price: 0, description: "梅花易数AI解读" },
  { id: "ai_hehun", name: "合婚AI解读", category: "general_ai", enabled: true, price: 0, description: "合婚分析AI解读" },
  { id: "ai_tcm", name: "中医AI问诊", category: "general_ai", enabled: true, price: 0, description: "中医智能问诊辅助" },
  // B 类高价值付费工具
  { id: "name_analysis", name: "姓名深度解析", category: "b_tool", enabled: true, price: 9.9, description: "基于姓名学典籍的深度文化解读" },
  { id: "phone_number", name: "手机号吉凶解读", category: "b_tool", enabled: true, price: 18, description: "基于数字能量学的手机号码分析" },
  { id: "license_plate", name: "车牌合号分析", category: "b_tool", enabled: true, price: 18, description: "基于数理的车牌号码文化参考" },
];

const DEFAULT_AI_QUOTAS: AIConfig["quotas"] = {
  basic: { daily: 3, monthly: 50 },
  monthly: { daily: 50, monthly: 500 },
  yearly: { daily: -1, monthly: -1 },
  lifetime: { daily: -1, monthly: -1 },
};

const DEFAULT_PACKAGES: IncrementalPackageConfig[] = [
  { id: "pack_10", name: "10次增量包", count: 10, price: 9.9, validity: 30, enabled: true },
  { id: "pack_50", name: "50次增量包", count: 50, price: 39.9, validity: 90, enabled: true },
  { id: "pack_100", name: "100次增量包", count: 100, price: 69.9, validity: 180, enabled: true },
  { id: "pack_500", name: "500次增量包", count: 500, price: 299, validity: 365, enabled: true },
];

const DEFAULT_AI_CONFIG: AIConfig = {
  globalEnabled: true,
  tools: DEFAULT_AI_TOOLS,
  quotas: DEFAULT_AI_QUOTAS,
  packages: DEFAULT_PACKAGES,
  updatedAt: new Date().toISOString(),
};

// ==================== 默认会员配置 ====================

const DEFAULT_PLANS: MembershipPlanConfig[] = [
  {
    level: "basic",
    name: "普通会员",
    price: 0,
    originalPrice: 0,
    duration: "永久免费",
    features: [
      "全部14款排盘工具（基础排盘）",
      "每日3次通用AI问答",
      "中医基础内容查询",
      "模拟考试初级题库",
      "社区浏览发帖 · 签到积分",
    ],
    badge: "",
    highlighted: false,
    enabled: true,
    sortOrder: 0,
  },
  {
    level: "monthly",
    name: "月度会员",
    price: 39,
    originalPrice: 59,
    duration: "30天",
    features: [
      "全部14款排盘工具",
      "每日50次通用AI问答",
      "B类工具月赠3次，超出享8折",
      "中医学习库全部开放",
      "模拟考试全等级开放",
      "签到积分2倍 · 无广告体验",
      "专属标识/头像框 · 导出排盘报告",
    ],
    badge: "热门",
    highlighted: false,
    enabled: true,
    sortOrder: 1,
  },
  {
    level: "yearly",
    name: "年度会员",
    price: 366,
    originalPrice: 458,
    duration: "365天",
    features: [
      "全部14款排盘工具",
      "通用AI问答无限次",
      "B类工具月赠15次，超出享7折",
      "中医学习库全部开放",
      "模拟考试全等级开放",
      "签到积分3倍 · 无广告体验",
      "专属标识/头像框 · 导出排盘报告",
      "专属客服支持",
    ],
    badge: "推荐",
    highlighted: true,
    enabled: true,
    sortOrder: 2,
  },
  {
    level: "lifetime",
    name: "终身会员",
    price: 3600,
    originalPrice: 4500,
    duration: "永久有效",
    features: [
      "全部14款排盘工具",
      "通用AI问答无限次",
      "B类工具无限次免费使用",
      "中医学习库全部开放",
      "模拟考试全等级开放",
      "签到积分5倍 · 无广告体验",
      "专属标识/头像框 · 导出排盘报告",
      "专属客服支持 · 新功能优先体验",
    ],
    badge: "尊享",
    highlighted: false,
    enabled: true,
    sortOrder: 3,
  },
];

const DEFAULT_MEMBERSHIP_CONFIG: MembershipConfig = {
  plans: DEFAULT_PLANS,
  complianceLabel: "传统文化学习服务",
  updatedAt: new Date().toISOString(),
};

// ==================== 文件读写工具 ====================

async function ensureDir(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch {
    // 目录可能已存在，忽略错误
  }
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await ensureDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ==================== AI 配置存取 ====================

export async function getAIConfig(): Promise<AIConfig> {
  const config = await readJson<AIConfig | null>(AI_CONFIG_FILE, null);
  if (!config) {
    await writeJson(AI_CONFIG_FILE, DEFAULT_AI_CONFIG);
    return DEFAULT_AI_CONFIG;
  }
  // 合并默认值，保证新增字段存在
  return {
    ...DEFAULT_AI_CONFIG,
    ...config,
    tools: config.tools?.length ? config.tools : DEFAULT_AI_TOOLS,
    quotas: { ...DEFAULT_AI_QUOTAS, ...(config.quotas || {}) },
    packages: config.packages?.length ? config.packages : DEFAULT_PACKAGES,
  };
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  config.updatedAt = new Date().toISOString();
  await writeJson(AI_CONFIG_FILE, config);
}

/** 局部更新 AI 配置 */
export async function updateAIConfig(
  patch: Partial<AIConfig>
): Promise<AIConfig> {
  const current = await getAIConfig();
  const merged: AIConfig = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await saveAIConfig(merged);
  return merged;
}

// ==================== 会员配置存取 ====================

export async function getMembershipConfig(): Promise<MembershipConfig> {
  const config = await readJson<MembershipConfig | null>(MEMBERSHIP_CONFIG_FILE, null);
  if (!config) {
    await writeJson(MEMBERSHIP_CONFIG_FILE, DEFAULT_MEMBERSHIP_CONFIG);
    return DEFAULT_MEMBERSHIP_CONFIG;
  }
  return {
    ...DEFAULT_MEMBERSHIP_CONFIG,
    ...config,
    plans: config.plans?.length ? config.plans : DEFAULT_PLANS,
  };
}

export async function saveMembershipConfig(config: MembershipConfig): Promise<void> {
  config.updatedAt = new Date().toISOString();
  await writeJson(MEMBERSHIP_CONFIG_FILE, config);
}

/** 更新单个会员套餐（按 level 匹配） */
export async function updateMembershipPlan(
  level: MemberLevel,
  patch: Partial<MembershipPlanConfig>
): Promise<MembershipConfig> {
  const config = await getMembershipConfig();
  config.plans = config.plans.map((p) =>
    p.level === level ? { ...p, ...patch } : p
  );
  await saveMembershipConfig(config);
  return config;
}

/** 切换会员套餐上下架 */
export async function toggleMembershipPlan(
  level: MemberLevel
): Promise<MembershipConfig> {
  const config = await getMembershipConfig();
  config.plans = config.plans.map((p) =>
    p.level === level ? { ...p, enabled: !p.enabled } : p
  );
  await saveMembershipConfig(config);
  return config;
}
