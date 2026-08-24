/**
 * 合伙人V2 管理端服务（DEV-V22-PARTNER-V2）
 * 后端挂载：/api/admin/partner（密钥鉴权，adminRoles 强校验）
 */

import { getAdminKey } from "./client";

const API_BASE = "/api/admin/partner";

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: string }> {
  const key = getAdminKey();
  if (!key) return { success: false, error: "未登录，请先输入管理员密钥" };
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...(options.headers || {}) },
    });
    const json = await res.json();
    return json.success ? { success: true, data: json.data as T } : { success: false, error: json.error || `请求失败(${res.status})` };
  } catch {
    return { success: false, error: "网络异常" };
  }
}

export interface AdminPartnerRow {
  userId: string;
  nickname: string;
  realName: string;
  contact: string;
  phone: string;
  email: string;
  level: string;
  status: string;
  referrerUserId: string;
  referrerName: string;
  appliedAt: string;
  reviewedAt: string;
  rejectReason: string;
  channelUserCount: number;
  channelGrossYuan: string;
  commissionTotalYuan: string;
}

export interface AdminPartnerUsers {
  total: number;
  page: number;
  size: number;
  users: {
    userId: string; nickname: string; phone: string; email: string;
    registeredAt: string; lastLoginAt: string; isPaid: boolean; consumeYuan: string;
  }[];
}

export interface AdminChannelRow {
  partnerUserId: string;
  nickname: string;
  registered: number;
  paid: number;
  grossYuan: string;
  grossShare: string;
}

export interface AdminTreeNode {
  userId: string;
  nickname: string;
  isPartner?: boolean;
  partnerLevel?: string | null;
  phone?: string;
  createdAt?: string;
  children?: AdminTreeNode[];
}

export interface AdminSettlementRow {
  id: number;
  partnerId: string;
  nickname: string;
  period: string;
  grossYuan: string;
  feeCostYuan: string;
  aiCostYuan: string;
  netYuan: string;
  baseCommissionYuan: string;
  nurtureReceivedYuan: string;
  nurturePaidOutYuan?: string;
  adjustYuan: string;
  status: string;
  createdAt: string;
  reviewedAt: string;
  reviewedBy: string;
  rejectReason: string;
}

// ==================== 合伙人管理 ====================

export const fetchPartners = (page = 1, size = 20, status = "", q = "") => {
  const p = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) p.set("status", status);
  if (q) p.set("q", q);
  return adminFetch<{ total: number; page: number; size: number; partners: AdminPartnerRow[] }>(`/partners?${p.toString()}`);
};

export const partnerAction = (userId: string, action: string, extra: { level?: string; reason?: string } = {}) =>
  adminFetch(`/partners/${userId}/action`, { method: "POST", body: JSON.stringify({ action, ...extra }) });

export const partnerSetReferrer = (userId: string, referrerUserId: string, reason: string) =>
  adminFetch(`/partners/${userId}/referrer`, { method: "POST", body: JSON.stringify({ referrerUserId, reason }) });

export const fetchPartnerUsers = (userId: string, page = 1, size = 50, q = "") => {
  const p = new URLSearchParams({ page: String(page), size: String(size) });
  if (q) p.set("q", q);
  return adminFetch<AdminPartnerUsers>(`/partners/${userId}/users?${p.toString()}`);
};

// ==================== 传播链路 ====================

export const fetchChannelOverview = () =>
  adminFetch<{ partners: AdminChannelRow[]; totalGrossYuan: string }>("/channel-overview");

export const fetchUserTree = (userId: string) =>
  adminFetch<{ user: { userId: string; nickname: string; phone: string; createdAt: string }; upline: AdminTreeNode[]; downline: AdminTreeNode[] }>(`/user-tree?userId=${encodeURIComponent(userId)}`);

export const fetchPartnerTree = () => adminFetch<{ roots: AdminTreeNode[] }>("/partner-tree");

// ==================== 结算管理 ====================

export const fetchSettlements = (page = 1, size = 20, period = "", status = "") => {
  const p = new URLSearchParams({ page: String(page), size: String(size) });
  if (period) p.set("period", period);
  if (status) p.set("status", status);
  return adminFetch<{ total: number; page: number; size: number; settlements: AdminSettlementRow[] }>(`/settlements?${p.toString()}`);
};

export const generateSettlements = (period: string) =>
  adminFetch<{ period: string; created: number; total: number }>("/settlements/generate", { method: "POST", body: JSON.stringify({ period }) });

export const approveSettlement = (id: number) =>
  adminFetch<{ movedCents: number }>(`/settlements/${id}/approve`, { method: "POST", body: "{}" });

export const rejectSettlement = (id: number, reason: string) =>
  adminFetch(`/settlements/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });

export const adjustSettlement = (id: number, deltaYuan: number, reason: string) =>
  adminFetch<{ deltaCents: number }>(`/settlements/${id}/adjust`, { method: "POST", body: JSON.stringify({ deltaYuan, reason }) });

// ==================== 风控 ====================

export const markOrderInvalid = (orderNo: string, reason: string) =>
  adminFetch<{ reversed: number }>("/risk/order-invalid", { method: "POST", body: JSON.stringify({ orderNo, reason }) });
