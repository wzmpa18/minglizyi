"use client";

// ============================================================================
// v20.0 AI配额体系与增量包 - 前端服务层
// 功能：配额查询、配额消耗、增量包购买、会员等级更新
// ============================================================================

import { getUserProfile } from "./auth";
import { isPaymentsBlocked, IOS_PAYMENT_DISABLED_TIP, clientPlatformHeaders } from "./platformGate";

// --- 类型定义 ---

export interface AIQuotaInfo {
  userId: string;
  membershipLevel: string;
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  monthlyUsed: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  incrementalRemaining: number;
  totalRemaining: number | string;
  packages: IncrementalPackage[];
}

export interface IncrementalPackage {
  packageId: string;
  packageName: string;
  count: number;
  remaining: number;
  price: number;
  validity: number;
  purchasedAt: string;
  paymentId: string;
}

export interface IncrementalPackageInfo {
  id: string;
  name: string;
  count: number;
  price: number;
  validity: number;
}

// --- 配置常量 ---

export const AI_QUOTA_CONFIG = {
  FREE_DAILY_LIMIT: 3,
  FREE_MONTHLY_LIMIT: 50,
  MONTHLY_DAILY_LIMIT: 50,
  MONTHLY_MONTHLY_LIMIT: 500,
  INCREMENTAL_PACKAGES: [
    { id: "pack_10", name: "10次增量包", count: 10, price: 9.9, validity: 30 },
    { id: "pack_50", name: "50次增量包", count: 50, price: 39.9, validity: 90 },
    { id: "pack_100", name: "100次增量包", count: 100, price: 69.9, validity: 180 },
    { id: "pack_500", name: "500次增量包", count: 500, price: 299, validity: 365 },
  ] as IncrementalPackageInfo[],
};

// --- 会员等级映射 ---

export const MEMBERSHIP_LEVELS = {
  basic: { name: "免费用户", icon: "🆓", color: "#95a5a6", daily: 3, monthly: 50 },
  monthly: { name: "月度会员", icon: "🔵", color: "#3498db", daily: 50, monthly: 500 },
  yearly: { name: "年度会员", icon: "🟡", color: "#f39c12", daily: -1, monthly: -1 },
  lifetime: { name: "终身会员", icon: "🔴", color: "#e74c3c", daily: -1, monthly: -1 },
};

// --- 工具函数 ---

function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  const profile = getUserProfile();
  return profile?.userId || null;
}

/**
 * 获取AI配额信息
 */
export async function getAIQuotaInfo(): Promise<AIQuotaInfo | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch(`/api/ai-quota/info?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 消耗AI配额
 */
export async function consumeAIQuota(): Promise<{
  success: boolean;
  data?: { source: string; remaining?: number; dailyRemaining?: number; monthlyRemaining?: number };
  error?: string;
}> {
  const userId = getCurrentUserId();
  if (!userId) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/ai-quota/consume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 购买增量包
 */
export async function purchaseIncrementalPackage(
  packageId: string,
  paymentData?: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  // FINAL-RC-02: 平台付费关闭（iOS 本期不开放任何付费），请求层直接拦截
  if (isPaymentsBlocked()) {
    return { success: false, error: IOS_PAYMENT_DISABLED_TIP };
  }
  const userId = getCurrentUserId();
  if (!userId) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/ai-quota/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientPlatformHeaders() },
      body: JSON.stringify({ userId, packageId, paymentData }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 获取增量包列表
 */
export async function getIncrementalPackages(): Promise<{
  packages: IncrementalPackageInfo[];
  disclaimer: string;
} | null> {
  try {
    const res = await fetch("/api/ai-quota/packages");
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 更新会员等级
 */
export async function updateMembershipLevel(
  level: string
): Promise<{ success: boolean; error?: string }> {
  const userId = getCurrentUserId();
  if (!userId) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/ai-quota/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, level }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 检查是否有配额可用
 */
export async function checkQuotaAvailable(): Promise<{
  canUse: boolean;
  remaining: number | string;
  message: string;
  needPurchase: boolean;
}> {
  const info = await getAIQuotaInfo();
  if (!info) {
    return { canUse: false, remaining: 0, message: "请先登录", needPurchase: false };
  }

  const dailyOk = info.dailyRemaining === -1 || info.dailyRemaining > 0;
  const monthlyOk = info.monthlyRemaining === -1 || info.monthlyRemaining > 0;
  const incrementalOk = info.incrementalRemaining > 0;

  if (dailyOk && monthlyOk) {
    const remaining = info.dailyRemaining === -1 ? "无限" : info.dailyRemaining;
    return {
      canUse: true,
      remaining,
      message: `今日剩余${info.dailyRemaining === -1 ? "无限" : info.dailyRemaining}次`,
      needPurchase: false,
    };
  }

  if (incrementalOk) {
    return {
      canUse: true,
      remaining: info.incrementalRemaining,
      message: `增量包剩余${info.incrementalRemaining}次`,
      needPurchase: false,
    };
  }

  return {
    canUse: false,
    remaining: 0,
    message: "AI配额已用完，请购买增量包或升级会员",
    needPurchase: true,
  };
}

/**
 * 获取会员等级显示信息
 */
export function getMembershipDisplay(level: string) {
  const info = MEMBERSHIP_LEVELS[level as keyof typeof MEMBERSHIP_LEVELS] || MEMBERSHIP_LEVELS.basic;
  return {
    name: info.name,
    icon: info.icon,
    color: info.color,
    dailyLimit: info.daily === -1 ? "无限" : info.daily,
    monthlyLimit: info.monthly === -1 ? "无限" : info.monthly,
  };
}
