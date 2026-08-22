"use client";

// ============================================================================
// 言道国学 - 后台管理客户端请求封装
// 管理管理员密钥的本地存储，并提供类型化的 fetch 调用
// 所有后台页面通过本模块调用 /api/admin/* 接口
// ============================================================================

import type {
  AIConfig,
  MembershipConfig,
  DashboardStats,
  AIToolConfig,
  IncrementalPackageConfig,
  MembershipPlanConfig,
  MemberLevel,
  AIQuotaConfig,
  NewsAdminItem,
  NewsAdminListData,
} from "./types";

// ==================== 管理员密钥管理 ====================

const ADMIN_KEY_STORAGE = "yandao_console_admin_key";

/** 获取本地存储的管理员密钥 */
export function getAdminKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ADMIN_KEY_STORAGE);
  } catch {
    return null;
  }
}

/** 保存管理员密钥 */
export function setAdminKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_KEY_STORAGE, key);
  } catch {
    /* ignore */
  }
}

/** 清除管理员密钥 */
export function clearAdminKey(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
  } catch {
    /* ignore */
  }
}

/** 判断是否已登录（持有密钥） */
export function isAdminAuthed(): boolean {
  return !!getAdminKey();
}

// ==================== 通用请求封装 ====================

interface FetchOptions extends RequestInit {
  /** 是否解析为 JSON */
  json?: boolean;
}

async function adminFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<{ success: boolean; data?: T; error?: string; message?: string }> {
  const key = getAdminKey();
  if (!key) {
    return { success: false, error: "未登录，请先输入管理员密钥" };
  }
  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        ...(options.headers || {}),
      },
    });
    const json = await res.json();
    if (!res.ok && !json.success) {
      return { success: false, error: json.error || `请求失败 (${res.status})` };
    }
    return json;
  } catch (e: any) {
    return { success: false, error: `网络异常：${e.message || e}` };
  }
}

// ==================== 统计数据 API ====================

/** 获取数据看板统计 */
export async function fetchDashboardStats(): Promise<DashboardStats | null> {
  const res = await adminFetch<DashboardStats>("/api/admin/stats");
  return res.success ? res.data! : null;
}

// ==================== AI 配置 API ====================

/** 获取 AI 配置 */
export async function fetchAIConfig(): Promise<AIConfig | null> {
  const res = await adminFetch<AIConfig>("/api/admin/ai-config");
  return res.success ? res.data! : null;
}

/** 更新 AI 全局开关 */
export async function updateAIGlobalEnabled(
  globalEnabled: boolean
): Promise<AIConfig | null> {
  const res = await adminFetch<AIConfig>("/api/admin/ai-config", {
    method: "PATCH",
    body: JSON.stringify({ globalEnabled }),
  });
  return res.success ? res.data! : null;
}

/** 更新单个 AI 工具配置 */
export async function updateAITool(
  toolId: string,
  patch: Partial<AIToolConfig>
): Promise<AIConfig | null> {
  const res = await adminFetch<AIConfig>("/api/admin/ai-config", {
    method: "PATCH",
    body: JSON.stringify({ toolId, toolPatch: patch }),
  });
  return res.success ? res.data! : null;
}

/** 切换 AI 工具开关 */
export async function toggleAITool(
  toolId: string
): Promise<AIConfig | null> {
  const res = await adminFetch<AIConfig>("/api/admin/ai-config", {
    method: "PATCH",
    body: JSON.stringify({ toolId, toggleTool: true }),
  });
  return res.success ? res.data! : null;
}

/** 更新会员 AI 配额 */
export async function updateAIQuotas(
  quotas: AIQuotaConfig
): Promise<AIConfig | null> {
  const res = await adminFetch<AIConfig>("/api/admin/ai-config", {
    method: "PATCH",
    body: JSON.stringify({ quotas }),
  });
  return res.success ? res.data! : null;
}

/** 更新增量包配置 */
export async function updateAIPackage(
  packageId: string,
  patch: Partial<IncrementalPackageConfig>
): Promise<AIConfig | null> {
  const res = await adminFetch<AIConfig>("/api/admin/ai-config", {
    method: "PATCH",
    body: JSON.stringify({ packageId, packagePatch: patch }),
  });
  return res.success ? res.data! : null;
}

/** 整体保存 AI 配置 */
export async function saveAIConfig(
  config: AIConfig
): Promise<AIConfig | null> {
  const res = await adminFetch<AIConfig>("/api/admin/ai-config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
  return res.success ? res.data! : null;
}

// ==================== 会员配置 API ====================

/** 获取会员配置 */
export async function fetchMembershipConfig(): Promise<MembershipConfig | null> {
  const res = await adminFetch<MembershipConfig>("/api/admin/membership-config");
  return res.success ? res.data! : null;
}

/** 更新单个会员套餐 */
export async function updateMembershipPlan(
  level: MemberLevel,
  patch: Partial<MembershipPlanConfig>
): Promise<MembershipConfig | null> {
  const res = await adminFetch<MembershipConfig>("/api/admin/membership-config", {
    method: "PATCH",
    body: JSON.stringify({ level, planPatch: patch }),
  });
  return res.success ? res.data! : null;
}

/** 切换会员套餐上下架 */
export async function toggleMembershipPlan(
  level: MemberLevel
): Promise<MembershipConfig | null> {
  const res = await adminFetch<MembershipConfig>("/api/admin/membership-config", {
    method: "PATCH",
    body: JSON.stringify({ level, togglePlan: true }),
  });
  return res.success ? res.data! : null;
}

/** 整体保存会员配置 */
export async function saveMembershipConfig(
  config: MembershipConfig
): Promise<MembershipConfig | null> {
  const res = await adminFetch<MembershipConfig>("/api/admin/membership-config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
  return res.success ? res.data! : null;
}

// ==================== 行业资讯内容源 API ====================

/** 获取全部资讯列表 */
export async function fetchNewsItems(): Promise<NewsAdminListData | null> {
  const res = await adminFetch<NewsAdminListData>("/api/admin/news");
  return res.success ? res.data! : null;
}

/** 新增资讯（后端做合规校验，失败时返回错误消息） */
export async function createNewsItem(
  item: Omit<NewsAdminItem, "id">
): Promise<{ ok: boolean; error?: string }> {
  const res = await adminFetch<NewsAdminItem>("/api/admin/news", {
    method: "POST",
    body: JSON.stringify(item),
  });
  return { ok: !!res.success, error: res.error };
}

/** 更新资讯 */
export async function updateNewsItem(
  id: string,
  item: Omit<NewsAdminItem, "id">
): Promise<{ ok: boolean; error?: string }> {
  const res = await adminFetch<NewsAdminItem>(`/api/admin/news/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(item),
  });
  return { ok: !!res.success, error: res.error };
}

/** 删除资讯 */
export async function deleteNewsItem(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await adminFetch(`/api/admin/news/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return { ok: !!res.success, error: res.error };
}

/** 恢复默认资讯库 */
export async function resetNewsItems(): Promise<{ ok: boolean; error?: string }> {
  const res = await adminFetch("/api/admin/news/reset", {
    method: "POST",
  });
  return { ok: !!res.success, error: res.error };
}

// ==================== 统一驾驶舱 overview API（v25.0.47_10） ====================

export interface AdminOverviewData {
  version: string;
  gitCommit: string;
  generatedAt?: string;
  server?: { uptimeHours?: string | number; memoryMB?: string | number; nodeVersion?: string; pid?: number };
  users?: { total?: number; newToday?: number; active7d?: number };
  membership?: { currentMembers?: number; [k: string]: unknown };
  orders?: {
    total?: number; paid?: number; pending?: number; revenueYuan?: string | number;
    today?: number; todayRevenueYuan?: string | number; pendingToday?: number; lastPaidAt?: string | null;
  };
  ai?: {
    enabled?: boolean; callsToday?: number; successToday?: number; failToday?: number;
    successRate?: number | string; lastSuccessAt?: string | null; lastFailAt?: string | null;
    lastError?: string; provider?: string; model?: string; avgLatencyMs?: number | string;
  };
  social?: { groups?: number; posts?: number; postsToday?: number; comments?: number };
  moderation?: { pendingReports?: number; [k: string]: unknown };
  commission?: {
    records?: number; totalYuan?: string; todayYuan?: string; frozenYuan?: string;
    withdrawalsPending?: number; withdrawTransfer?: string;
  };
  payment?: {
    nativeReady?: boolean; jsapiReady?: boolean; mode?: string; mchId?: string;
    appIdConfigured?: boolean; appSecretConfigured?: boolean; lastPaidAt?: string | null;
    lastCallbackAt?: string | null; lastRefundAt?: string | null; lastReconcileAt?: string | null;
    todaySuccessRate?: number | string;
  };
  health?: Record<string, string>;
  [k: string]: unknown;
}

/** 获取老板驾驶舱总览数据（20 项指标 + 三色状态） */
export async function fetchAdminOverview(): Promise<AdminOverviewData | null> {
  const res = await adminFetch<AdminOverviewData>("/api/admin/unified/overview");
  return res.success ? res.data! : null;
}

// ==================== 系统功能开关 API（v25.0.47_10） ====================

export type FeatureFlagStatus = "ON" | "OFF" | "MAINTENANCE";

export interface FeatureFlagItem {
  name: string;
  status: FeatureFlagStatus;
  desc?: string;
  enforcePaths?: string[];
}

export interface FeatureFlagsData {
  flags: Record<string, FeatureFlagItem>;
  updatedAt?: string | null;
}

/** 获取全部功能开关 */
export async function fetchFeatureFlags(): Promise<FeatureFlagsData | null> {
  const res = await adminFetch<FeatureFlagsData>("/api/admin/feature-flags");
  return res.success ? res.data! : null;
}

/** 更新单个功能开关（SUPER_ADMIN，写审计日志） */
export async function updateFeatureFlag(
  flagKey: string,
  status: FeatureFlagStatus,
  reason?: string
): Promise<{ ok: boolean; error?: string; data?: FeatureFlagsData; message?: string }> {
  const res = await adminFetch<FeatureFlagsData>("/api/admin/feature-flags", {
    method: "PUT",
    body: JSON.stringify({ flagKey, status, reason }),
  });
  return { ok: !!res.success, error: res.error, data: res.data, message: res.message };
}

// ==================== 工具管理矩阵 API（v25.0.47_10） ====================

export interface ToolMatrixItem {
  name: string;
  status: "ON" | "OFF" | "MAINTENANCE";
  payMode: "FREE" | "MEMBERSHIP" | "ONE_TIME" | "AI_CREDIT" | "DISABLED";
  price: number;
  memberLevel?: string;
  aiEnabled?: boolean;
  aiCreditCost?: number;
  dailyLimit?: number;
  shareEnabled?: boolean;
  web?: boolean;
  android?: boolean;
  ios?: boolean;
  wechatMp?: boolean;
  qqMp?: boolean;
}

export interface ToolMatrixData {
  tools: Record<string, ToolMatrixItem>;
  updatedAt?: string | null;
}

/** 获取工具矩阵 */
export async function fetchToolMatrix(): Promise<ToolMatrixData | null> {
  const res = await adminFetch<ToolMatrixData>("/api/admin/tool-matrix");
  return res.success ? res.data! : null;
}

/** 更新单个工具配置 */
export async function updateToolMatrixItem(
  toolId: string,
  patch: Partial<ToolMatrixItem>
): Promise<{ ok: boolean; error?: string; data?: ToolMatrixData }> {
  const res = await adminFetch<ToolMatrixData>("/api/admin/tool-matrix", {
    method: "PUT",
    body: JSON.stringify({ toolId, patch }),
  });
  return { ok: !!res.success, error: res.error, data: res.data };
}

// ==================== 订单详情 / 权益重试发放 API（v25.0.47_10） ====================

export interface AdminOrderDetail {
  orderId: string;
  userId?: string;
  productType?: string;
  productName?: string;
  amountYuan?: string | number;
  channel?: string;
  status?: string;
  createdAt?: string;
  paidAt?: string | null;
  transactionId?: string | null;
  benefitDelivered?: number | boolean;
  benefitType?: string | null;
  benefitDeliveredAt?: string | null;
  commissionStatus?: string;
  [k: string]: unknown;
}

/** 订单详情（含权益交付状态/微信交易号） */
export async function fetchOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
  const res = await adminFetch<AdminOrderDetail>(
    `/api/payment/admin/orders/${encodeURIComponent(orderId)}`
  );
  return res.success ? res.data! : null;
}

/** 重试权益发放（幂等，SUPER_ADMIN） */
export async function retryBenefitDelivery(orderId: string): Promise<{ ok: boolean; error?: string; message?: string }> {
  const res = await adminFetch<{ message?: string }>(
    `/api/payment/admin/orders/${encodeURIComponent(orderId)}/retry-delivery`,
    { method: "POST" }
  );
  return { ok: !!res.success, error: res.error, message: (res.data as any)?.message || res.message };
}

// ==================== 营销海报 / 分享配置 API（v25.0.47_10） ====================

/** 获取海报配置 */
export async function fetchPosterConfig(): Promise<Record<string, unknown> | null> {
  const res = await adminFetch<Record<string, unknown>>("/api/admin/poster-config/poster/config");
  return res.success ? res.data! : null;
}

/** 保存海报配置 */
export async function savePosterConfig(
  config: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const res = await adminFetch("/api/admin/poster-config/poster/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
  return { ok: !!res.success, error: res.error };
}

/** 获取分享配置 */
export async function fetchShareConfig(): Promise<Record<string, unknown> | null> {
  const res = await adminFetch<Record<string, unknown>>("/api/admin/share-config/share/config");
  return res.success ? res.data! : null;
}

/** 保存分享配置 */
export async function saveShareConfig(
  config: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const res = await adminFetch("/api/admin/share-config/share/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
  return { ok: !!res.success, error: res.error };
}
