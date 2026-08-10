"use client";

// ============================================================================
// v19.9 后台运营管控 - 前端服务层
// 功能：管理员登录、广告位管理、培训招生、违规管控、敏感词管理
// ============================================================================

// --- 类型定义 ---

export interface AdInfo {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  enabled: boolean;
  impressions: number;
  clicks: number;
  updatedAt: string;
}

export interface AdPositionConfig {
  name: string;
  description: string;
}

export interface AdStatsItem {
  name: string;
  enabled: boolean;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface TrainingItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  teacherId: string;
  commissionRate: number;
  status: "pending" | "approved" | "rejected" | "offline";
  createdAt: string;
  enrollCount: number;
  rejectReason?: string;
}

export interface ReportItem {
  id: string;
  targetType: "reply" | "rating" | "help";
  targetId: string;
  reason: string;
  reporterId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  handledAt: string | null;
  handleNote: string;
}

export interface ActiveAd {
  title: string;
  imageUrl: string;
  linkUrl: string;
}

// --- 管理员Token管理 ---

const ADMIN_TOKEN_KEY = "yandao_admin_token";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {}
}

export function clearAdminToken(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {}
}

export function isAdminLoggedIn(): boolean {
  return !!getAdminToken();
}

// --- 管理员登录 ---

export async function adminLogin(
  username: string,
  password: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json();
    if (json.success && json.token) {
      setAdminToken(json.token);
    }
    return json;
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

// --- 广告管理（前端公共接口，无需鉴权） ---

/**
 * 获取启用的广告（前端展示用）
 */
export async function getActiveAds(): Promise<Record<string, ActiveAd>> {
  try {
    const res = await fetch("/api/admin/ad/active");
    if (!res.ok) return {};
    const json = await res.json();
    return json.success ? json.data.ads : {};
  } catch {
    return {};
  }
}

/**
 * 记录广告曝光
 */
export async function recordAdImpression(position: string): Promise<void> {
  try {
    await fetch("/api/admin/ad/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position }),
    });
  } catch {}
}

/**
 * 记录广告点击
 */
export async function recordAdClick(position: string): Promise<void> {
  try {
    await fetch("/api/admin/ad/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position }),
    });
  } catch {}
}

// --- 广告管理（管理员接口） ---

/**
 * 获取广告列表
 */
export async function getAds(
  token: string
): Promise<{ ads: Record<string, AdInfo>; positions: Record<string, AdPositionConfig> } | null> {
  try {
    const res = await fetch("/api/admin/ad/list", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 更新广告
 */
export async function updateAd(
  token: string,
  position: string,
  data: { title: string; imageUrl: string; linkUrl: string; enabled: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/ad/update", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ position, ...data }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

/**
 * 切换广告启停
 */
export async function toggleAd(
  token: string,
  position: string
): Promise<{ success: boolean; enabled?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/ad/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ position }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

/**
 * 获取广告统计
 */
export async function getAdStats(
  token: string
): Promise<Record<string, AdStatsItem> | null> {
  try {
    const res = await fetch("/api/admin/ad/stats", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data.stats : null;
  } catch {
    return null;
  }
}

// --- 培训招生管理 ---

/**
 * 获取培训列表
 */
export async function listTraining(
  token: string,
  status = "all",
  page = 1,
  limit = 20
): Promise<{ training: TrainingItem[]; total: number; page: number; limit: number } | null> {
  try {
    const res = await fetch(`/api/admin/training/list?status=${status}&page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 创建培训
 */
export async function createTraining(
  token: string,
  data: {
    title: string;
    description: string;
    imageUrl: string;
    price: number;
    teacherId: string;
    commissionRate: number;
  }
): Promise<{ success: boolean; trainingId?: string; error?: string }> {
  try {
    const res = await fetch("/api/admin/training/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

/**
 * 审批培训
 */
export async function approveTraining(
  token: string,
  trainingId: string,
  commissionRate?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/training/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ trainingId, commissionRate }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

/**
 * 拒绝培训
 */
export async function rejectTraining(
  token: string,
  trainingId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/training/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ trainingId, reason }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

/**
 * 设置分成比例
 */
export async function setTrainingCommission(
  token: string,
  trainingId: string,
  commissionRate: number
): Promise<{ success: boolean; commissionRate?: number; error?: string }> {
  try {
    const res = await fetch("/api/admin/training/commission", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ trainingId, commissionRate }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

// --- 举报管理 ---

/**
 * 获取举报列表
 */
export async function listReports(
  token: string,
  status = "all",
  page = 1,
  limit = 20
): Promise<{ reports: ReportItem[]; total: number; page: number; limit: number } | null> {
  try {
    const res = await fetch(`/api/admin/report/list?status=${status}&page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 处理举报
 */
export async function handleReport(
  token: string,
  reportId: string,
  action: "approved" | "rejected",
  note: string,
  violationPoints?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/report/handle", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reportId, action, note, violationPoints }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

// --- 用户封禁 ---

/**
 * 封禁用户
 */
export async function banUser(
  token: string,
  userId: string,
  reason: string,
  duration = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/user/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, reason, duration }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

/**
 * 解封用户
 */
export async function unbanUser(
  token: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/user/unban", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

// --- 敏感词管理 ---

/**
 * 获取敏感词列表
 */
export async function listSensitiveWords(
  token: string
): Promise<string[]> {
  try {
    const res = await fetch("/api/admin/sensitive/list", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.success ? json.data.words : [];
  } catch {
    return [];
  }
}

/**
 * 添加敏感词
 */
export async function addSensitiveWord(
  token: string,
  word: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/sensitive/add", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ word }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

/**
 * 删除敏感词
 */
export async function removeSensitiveWord(
  token: string,
  word: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/sensitive/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ word }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

// --- 管理员：师父置顶/违规扣分 ---

/**
 * 管理员：置顶/取消置顶师父
 */
export async function togglePinMaster(
  token: string,
  userId: string
): Promise<{ success: boolean; pinned?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/master/admin/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

/**
 * 管理员：违规扣分
 */
export async function applyViolation(
  token: string,
  userId: string,
  points: number,
  reason: string
): Promise<{ success: boolean; deductedPoints?: number; error?: string }> {
  try {
    const res = await fetch("/api/master/admin/violation", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, points, reason }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}
