"use client";

// ============================================================================
// 会员体系 Store - v25.0.47_12
// 5档会员：普通(免费) / 月度(37元) / 季度(99元) / 年度(374元) / 终身(3600元)
// 工具分级：A类基础排盘 / 通用AI解读 / B类高价值付费工具 / C类学习内容库
// B类工具统一零售价 9.9元/次（会员超出免费额度后同价结算，v12 取消阶梯折扣）
// ============================================================================

import { getUserProfile } from "./auth";
import { getToolConfig } from "./toolConfigStore";

export type MemberLevel = "basic" | "monthly" | "quarterly" | "yearly" | "lifetime";

// ==================== B类高价值工具定义 ====================

export type BToolType = "name_analysis" | "phone_number" | "license_plate";

export interface BToolConfig {
  type: BToolType;
  name: string;
  price: number;          // 原价（元/次）
  description: string;
}

/** B类高价值工具清单 */
export const B_TOOLS: Record<BToolType, BToolConfig> = {
  name_analysis: {
    type: "name_analysis",
    name: "姓名深度解析",
    price: 9.9,
    description: "基于姓名学典籍的深度文化解读",
  },
  phone_number: {
    type: "phone_number",
    name: "手机号吉凶解读",
    price: 9.9,
    description: "基于数字能量学的手机号码分析",
  },
  license_plate: {
    type: "license_plate",
    name: "车牌合号分析",
    price: 9.9,
    description: "基于数理的车牌号码文化参考",
  },
};

// ==================== 会员权益配置 ====================

export interface MembershipStatus {
  level: MemberLevel;
  startTime: string;
  expireTime: string | null; // null = never expires (lifetime)
  isActive: boolean;
  daysRemaining: number;
}

export interface MembershipPlan {
  level: MemberLevel;
  name: string;
  price: number;
  originalPrice: number;
  duration: string;
  features: string[];
  highlighted: boolean;
  badge: string;
}

export interface OrderRecord {
  id: string;
  level: MemberLevel;
  planName: string;
  amount: number;
  paymentMethod: "wechat" | "alipay";
  status: "pending" | "paid" | "failed" | "refunded";
  createdAt: string;
  paidAt: string | null;
  /** B类工具购买记录 */
  bToolType?: BToolType;
  /** 订单类型：会员开通 / B类工具单次购买 */
  orderCategory: "membership" | "btool_single";
}

// ==================== 会员套餐定价（v20.4 校准） ====================

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
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
    highlighted: false,
    badge: "",
  },
  {
    level: "monthly",
    name: "月度会员",
    price: 37,
    originalPrice: 59,
    duration: "30天",
    features: [
      "全部14款排盘工具",
      "每日50次通用AI问答",
      "B类工具月赠3次，超出按¥9.9/次",
      "批量解读享95折",
      "中医学习库全部开放",
      "模拟考试全等级开放",
      "签到积分2倍 · 无广告体验",
      "专属标识/头像框 · 导出排盘报告",
    ],
    highlighted: false,
    badge: "热门",
  },
  {
    level: "quarterly",
    name: "季度会员",
    price: 99,
    originalPrice: 117,
    duration: "90天",
    features: [
      "全部14款排盘工具",
      "每日50次通用AI问答",
      "B类工具月赠8次，超出按¥9.9/次",
      "批量解读享85折",
      "中医学习库全部开放",
      "模拟考试全等级开放",
      "签到积分2倍 · 无广告体验",
      "专属标识/头像框 · 导出排盘报告",
    ],
    highlighted: false,
    badge: "",
  },
  {
    level: "yearly",
    name: "年度会员",
    price: 374,
    originalPrice: 458,
    duration: "365天",
    features: [
      "全部14款排盘工具",
      "通用AI问答无限次",
      "B类工具月赠15次，超出按¥9.9/次",
      "批量解读享8折",
      "中医学习库全部开放",
      "模拟考试全等级开放",
      "签到积分3倍 · 无广告体验",
      "专属标识/头像框 · 导出排盘报告",
      "专属客服支持",
    ],
    highlighted: true,
    badge: "推荐",
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
      "批量解读免费使用",
      "中医学习库全部开放",
      "模拟考试全等级开放",
      "签到积分5倍 · 无广告体验",
      "专属标识/头像框 · 导出排盘报告",
      "专属客服支持 · 新功能优先体验",
    ],
    highlighted: false,
    badge: "尊享",
  },
];

// ==================== 通用AI次数配置 ====================

export const AI_QUOTA_CONFIG: Record<MemberLevel, { daily: number; label: string }> = {
  basic: { daily: 3, label: "每日3次" },
  monthly: { daily: 50, label: "每日50次" },
  quarterly: { daily: 50, label: "每日50次" },
  yearly: { daily: Infinity, label: "无限次" },
  lifetime: { daily: Infinity, label: "无限次" },
};

// ==================== B类工具权益配置 ====================

export interface BToolBenefit {
  /** 每月赠送次数（Infinity = 无限） */
  monthlyFree: number;
  /** 超出赠送后的折扣（1 = 原价，0.8 = 8折）；v12 起统一按零售价结算，discount 恒为 1 */
  discount: number;
  /** 是否无限免费 */
  unlimitedFree: boolean;
}

export const B_TOOL_BENEFITS: Record<MemberLevel, BToolBenefit> = {
  basic: { monthlyFree: 0, discount: 1, unlimitedFree: false },
  monthly: { monthlyFree: 3, discount: 1, unlimitedFree: false },
  quarterly: { monthlyFree: 8, discount: 1, unlimitedFree: false },
  yearly: { monthlyFree: 15, discount: 1, unlimitedFree: false },
  lifetime: { monthlyFree: Infinity, discount: 0, unlimitedFree: true },
};

// ==================== 批量解读服务定价（仅手机号/车牌号，v12）====================

/** 各档位批量解读折扣（1 = 原价）；终身免费 */
export const BATCH_INTERPRET_DISCOUNTS: Record<MemberLevel, number> = {
  basic: 1,
  monthly: 0.95,
  quarterly: 0.85,
  yearly: 0.8,
  lifetime: 0,
};

/** 批量解读零售价（元/次，最多100条号码） */
export const BATCH_INTERPRET_BASE_PRICE = 200;

// ==================== 签到积分倍率 ====================

export const SIGNIN_MULTIPLIER: Record<MemberLevel, number> = {
  basic: 1,
  monthly: 2,
  quarterly: 2,
  yearly: 3,
  lifetime: 5,
};

// ==================== 合规口径 ====================

export const COMPLIANCE_PAYMENT_LABEL = "传统文化学习服务";

// ==================== 存储 Key ====================

const STATUS_KEY = "yandao_membership_status";
const ORDERS_KEY = "yandao_membership_orders";
const AI_USAGE_KEY = "yandao_ai_daily_usage";
const BTOOL_USAGE_KEY = "yandao_btool_monthly_usage";
const BTOOL_UNLOCKED_KEY = "yandao_btool_unlocked_records";

// ==================== safeGet/safeSet ====================

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

// ==================== 会员状态管理 ====================

/**
 * 全权限账户判定（P6-TOOL-04-补02：LOC 后台白名单，精确或 134* 前缀匹配）。
 * 白名单账户在统一会员引擎内直接视为终身会员，下游 AI 配额/B类工具/广告/导出权益自动生效。
 */
export function isSuperAccount(): boolean {
  if (typeof window === "undefined") return false;
  let phone = "";
  let superPhones: string[] = [];
  try {
    phone = getUserProfile()?.phone || "";
    superPhones = getToolConfig().account.superPhones || [];
  } catch {
    return false;
  }
  if (!phone) return false;
  return superPhones.some((p) => {
    const rule = p.trim();
    if (!rule) return false;
    return rule.endsWith("*") ? phone.startsWith(rule.slice(0, -1)) : phone === rule;
  });
}

/** 获取当前会员状态 */
export function getMembershipStatus(): MembershipStatus {
  if (isSuperAccount()) {
    return {
      level: "lifetime",
      startTime: new Date().toISOString(),
      expireTime: null,
      isActive: true,
      daysRemaining: Infinity,
    };
  }
  const status = safeGet<MembershipStatus | null>(STATUS_KEY, null);
  if (!status) {
    return {
      level: "basic",
      startTime: new Date().toISOString(),
      expireTime: null,
      isActive: true,
      daysRemaining: Infinity,
    };
  }
  // Check if expired (except lifetime)
  if (status.level !== "lifetime" && status.expireTime) {
    const now = Date.now();
    const expire = new Date(status.expireTime).getTime();
    if (now >= expire) {
      // Expired, downgrade to basic
      const expired: MembershipStatus = {
        level: "basic",
        startTime: new Date().toISOString(),
        expireTime: null,
        isActive: true,
        daysRemaining: Infinity,
      };
      safeSet(STATUS_KEY, expired);
      return expired;
    }
    status.isActive = true;
    status.daysRemaining = Math.ceil((expire - now) / (24 * 60 * 60 * 1000));
  } else {
    status.isActive = true;
    status.daysRemaining = Infinity;
  }
  return status;
}

/** 激活会员 */
export function activateMembership(level: MemberLevel): MembershipStatus {
  const now = new Date();
  let expireTime: string | null = null;

  if (level === "monthly") {
    const exp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    expireTime = exp.toISOString();
  } else if (level === "quarterly") {
    const exp = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    expireTime = exp.toISOString();
  } else if (level === "yearly") {
    const exp = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    expireTime = exp.toISOString();
  }
  // lifetime: expireTime stays null

  const status: MembershipStatus = {
    level,
    startTime: now.toISOString(),
    expireTime,
    isActive: true,
    daysRemaining:
      level === "lifetime"
        ? Infinity
        : level === "monthly"
        ? 30
        : level === "quarterly"
        ? 90
        : level === "yearly"
        ? 365
        : Infinity,
  };

  safeSet(STATUS_KEY, status);
  return status;
}

// ==================== 通用AI次数管理 ====================

interface AIUsage {
  date: string;
  used: number;
}

/** 获取今日已用AI次数 */
export function getAIUsageToday(): number {
  const usage = safeGet<AIUsage>(AI_USAGE_KEY, { date: "", used: 0 });
  if (usage.date !== getToday()) return 0;
  return usage.used;
}

/** 获取今日剩余AI次数 */
export function getAIRemainingToday(): number {
  const status = getMembershipStatus();
  const quota = AI_QUOTA_CONFIG[status.level].daily;
  if (quota === Infinity) return Infinity;
  const used = getAIUsageToday();
  return Math.max(0, quota - used);
}

/** 消耗一次AI问答次数 */
export function consumeAIQuota(): { success: boolean; remaining: number; message: string } {
  const status = getMembershipStatus();
  const quota = AI_QUOTA_CONFIG[status.level].daily;
  if (quota === Infinity) {
    return { success: true, remaining: Infinity, message: "无限次" };
  }
  const used = getAIUsageToday();
  if (used >= quota) {
    return {
      success: false,
      remaining: 0,
      message: `今日AI问答已用完（${quota}次/天），升级会员可获更多次数`,
    };
  }
  const newUsed = used + 1;
  safeSet(AI_USAGE_KEY, { date: getToday(), used: newUsed });
  return {
    success: true,
    remaining: quota - newUsed,
    message: `今日剩余${quota - newUsed}次`,
  };
}

// ==================== B类工具次数管理 ====================

interface BToolUsage {
  month: string;
  counts: Record<string, number>; // btoolType -> count
}

/** 获取本月某B类工具已用次数 */
export function getBToolUsageThisMonth(btoolType: BToolType): number {
  const usage = safeGet<BToolUsage>(BTOOL_USAGE_KEY, { month: "", counts: {} });
  if (usage.month !== getMonthKey()) return 0;
  return usage.counts[btoolType] || 0;
}

/** 获取本月所有B类工具总已用次数 */
export function getAllBToolUsageThisMonth(): number {
  const usage = safeGet<BToolUsage>(BTOOL_USAGE_KEY, { month: "", counts: {} });
  if (usage.month !== getMonthKey()) return 0;
  return Object.values(usage.counts).reduce((sum, c) => sum + c, 0);
}

/** 获取本月B类工具剩余免费次数 */
export function getBToolFreeRemaining(): number {
  const status = getMembershipStatus();
  const benefit = B_TOOL_BENEFITS[status.level];
  if (benefit.unlimitedFree) return Infinity;
  const used = getAllBToolUsageThisMonth();
  return Math.max(0, benefit.monthlyFree - used);
}

/**
 * 检查B类工具使用权限
 * 返回：可直接使用 / 需付费 / 无权限
 */
export function checkBToolAccess(btoolType: BToolType): {
  canUse: boolean;
  needPayment: boolean;
  price: number;
  remaining: number;
  message: string;
} {
  const status = getMembershipStatus();
  const benefit = B_TOOL_BENEFITS[status.level];
  const tool = B_TOOLS[btoolType];

  // 终身会员：无限免费
  if (benefit.unlimitedFree) {
    return {
      canUse: true,
      needPayment: false,
      price: 0,
      remaining: Infinity,
      message: "终身会员无限免费使用",
    };
  }

  const freeRemaining = getBToolFreeRemaining();

  // 还有免费次数
  if (freeRemaining > 0) {
    return {
      canUse: true,
      needPayment: false,
      price: 0,
      remaining: freeRemaining,
      message: `本月剩余${freeRemaining}次免费额度`,
    };
  }

  // 免费次数用完，需要付费（折扣价）
  const discountPrice = Math.round(tool.price * benefit.discount * 100) / 100;
  return {
    canUse: true,
    needPayment: true,
    price: discountPrice,
    remaining: 0,
    message: `本月免费次数已用完，本次需付费¥${discountPrice}（会员${benefit.discount === 1 ? "原价" : (benefit.discount * 10) + "折"}）`,
  };
}

/** 消耗B类工具免费次数（使用后调用） */
export function consumeBToolFreeQuota(btoolType: BToolType): void {
  const usage = safeGet<BToolUsage>(BTOOL_USAGE_KEY, { month: "", counts: {} });
  if (usage.month !== getMonthKey()) {
    usage.month = getMonthKey();
    usage.counts = {};
  }
  usage.counts[btoolType] = (usage.counts[btoolType] || 0) + 1;
  safeSet(BTOOL_USAGE_KEY, usage);
}

/** 记录B类工具付费购买（单次解锁） */
export function recordBToolPurchase(
  btoolType: BToolType,
  amount: number,
  paymentMethod: "wechat" | "alipay"
): OrderRecord {
  const tool = B_TOOLS[btoolType];
  const order: OrderRecord = {
    id: `BTOOL${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    level: getMembershipStatus().level,
    planName: `${tool.name}（单次）`,
    amount,
    paymentMethod,
    status: "paid",
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    bToolType: btoolType,
    orderCategory: "btool_single",
  };

  const orders = getOrders();
  orders.unshift(order);
  safeSet(ORDERS_KEY, orders);

  // 记录已解锁内容（永久查看）
  const unlocked = safeGet<Array<{ btoolType: BToolType; orderId: string; date: string }>>(
    BTOOL_UNLOCKED_KEY,
    []
  );
  unlocked.push({ btoolType, orderId: order.id, date: new Date().toISOString() });
  safeSet(BTOOL_UNLOCKED_KEY, unlocked);

  return order;
}

/** 获取已解锁的B类工具记录 */
export function getUnlockedBToolRecords(): Array<{ btoolType: BToolType; orderId: string; date: string }> {
  return safeGet(BTOOL_UNLOCKED_KEY, []);
}

// ==================== 订单管理 ====================

/** 创建会员开通订单 */
export function createOrder(
  level: MemberLevel,
  paymentMethod: "wechat" | "alipay"
): OrderRecord {
  const plan = MEMBERSHIP_PLANS.find((p) => p.level === level);
  const order: OrderRecord = {
    id: `ORD${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    level,
    planName: plan?.name || level,
    amount: plan?.price || 0,
    paymentMethod,
    status: "pending",
    createdAt: new Date().toISOString(),
    paidAt: null,
    orderCategory: "membership",
  };

  const orders = getOrders();
  orders.unshift(order);
  safeSet(ORDERS_KEY, orders);
  return order;
}

/** 完成订单支付并激活会员 */
export function completeOrder(orderId: string): {
  success: boolean;
  message: string;
  status?: MembershipStatus;
} {
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return { success: false, message: "订单不存在" };
  if (order.status === "paid") return { success: false, message: "订单已支付" };

  order.status = "paid";
  order.paidAt = new Date().toISOString();
  safeSet(ORDERS_KEY, orders);

  // 会员开通订单 → 激活会员
  if (order.orderCategory === "membership") {
    const status = activateMembership(order.level);
    return { success: true, message: "支付成功，会员已激活", status };
  }

  // B类工具单次购买 → 记录已解锁
  if (order.orderCategory === "btool_single" && order.bToolType) {
    return { success: true, message: "支付成功，内容已解锁" };
  }

  return { success: true, message: "支付成功" };
}

/** 获取所有订单 */
export function getOrders(): OrderRecord[] {
  return safeGet<OrderRecord[]>(ORDERS_KEY, []);
}

// ==================== 显示工具函数 ====================

export function getLevelName(level: MemberLevel): string {
  const plan = MEMBERSHIP_PLANS.find((p) => p.level === level);
  return plan?.name || "普通会员";
}

export function getLevelColor(level: MemberLevel): string {
  switch (level) {
    case "lifetime":
      return "#FFD700";
    case "yearly":
      return "#7B2FBE";
    case "monthly":
      return "#3498db";
    default:
      return "#999";
  }
}

/** 检查是否有广告（会员及以上无广告） */
export function shouldShowAds(): boolean {
  return getMembershipStatus().level === "basic";
}

/** 检查是否可导出排盘报告 */
export function canExportReport(): boolean {
  const level = getMembershipStatus().level;
  return level === "monthly" || level === "yearly" || level === "lifetime";
}

/** 检查是否有专属客服 */
export function hasPrioritySupport(): boolean {
  const level = getMembershipStatus().level;
  return level === "yearly" || level === "lifetime";
}
