/**
 * 合伙人渠道分销体系 V2 前端服务（DEV-V22-PARTNER-V2）
 * 后端：/api/partner（用户端 JWT）与 /api/admin/partner（管理端密钥）
 */

const API_BASE = "/api/partner";

function tokenHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const token = localStorage.getItem("yandao_user_token") || sessionStorage.getItem("yandao_user_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: tokenHeader() });
    const json = await res.json();
    return json.success ? (json.data as T) : null;
  } catch {
    return null;
  }
}

async function post<T>(path: string, body: unknown): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...tokenHeader() },
      body: JSON.stringify(body || {}),
    });
    const json = await res.json();
    return json.success ? { ok: true, data: json.data as T } : { ok: false, error: json.error || "请求失败" };
  } catch {
    return { ok: false, error: "网络异常，请稍后重试" };
  }
}

// ==================== 类型 ====================

export type PartnerStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED" | "DISABLED";

export interface PartnerMyStatus {
  status: PartnerStatus;
  level?: string;
  appliedAt?: string;
  reviewedAt?: string;
  rejectReason?: string;
  userId?: string;
  systemEnabled: boolean;
  ratios: { commissionPercent: number; nurturePercent: number };
}

export interface PartnerOverview {
  partnerLevel: string;
  channelRegistered: number;
  channelPaidUsers: number;
  channelGrossYuan: string;
  baseCommissionYuan: string;
  nurtureTotalYuan: string;
  settledTotalYuan: string;
  pendingSettleYuan: string;
  withdrawableYuan: string;
  subPartnerCount: number;
  ratios: { commissionPercent: number; nurturePercent: number; platformFloorPercent: number };
}

export interface PartnerTrendPoint {
  date: string;
  registered: number;
  paid: number;
  commissionCents: number;
}

export interface PartnerUserRow {
  userIdMasked: string;
  phoneMasked: string;
  registeredAt: string;
  isPaid: boolean;
  consumeYuan: string;
}

export interface PartnerUsersPage {
  total: number;
  page: number;
  size: number;
  users: PartnerUserRow[];
}

export interface PartnerSubRow {
  partnerUserId: string;
  nickname: string;
  level: string;
  joinedAt: string;
  channelUserCount: number;
  channelFlowYuan: string;
  nurtureFromYuan: string;
}

export interface PartnerSubMonthly {
  partnerUserId: string;
  channelFlowYuan: string;
  monthly: { period: string; flowYuan: string; nurtureYuan: string }[];
}

export interface PartnerRecordRow {
  orderNo?: string;
  withdrawNo?: string;
  payerMasked?: string;
  payerName?: string;
  ratioPercent?: number;
  netYuan?: string;
  amountYuan: string;
  status: string;
  createdAt?: string;
  note?: string;
  failReason?: string;
  paidAt?: string;
  transferNo?: string;
}

// ==================== 用户端 API ====================

export const getMyPartnerStatus = () => get<PartnerMyStatus>("/my/status");

export const getPartnerOverview = () => get<PartnerOverview>("/my/overview");

export const getPartnerTrends = (days: number) => get<PartnerTrendPoint[]>(`/my/trends?days=${days}`);

export const getPartnerUsers = (page: number, size: number, sort: "registered" | "consume", paid?: "0" | "1") => {
  const p = new URLSearchParams({ page: String(page), size: String(size), sort });
  if (paid) p.set("paid", paid);
  return get<PartnerUsersPage>(`/my/users?${p.toString()}`);
};

export const getPartnerSubs = () => get<PartnerSubRow[]>("/my/sub-partners");

export const getPartnerSubMonthly = (subId: string) => get<PartnerSubMonthly>(`/my/sub-partners/${subId}/monthly`);

export const getPartnerRecords = (type: "base" | "nurture" | "withdrawal") =>
  get<PartnerRecordRow[]>(`/my/records?type=${type}`);

export const applyPartner = (payload: {
  realName: string;
  contact: string;
  resources: string;
  expectedScale: string;
  refCode?: string;
}) => post<{ submitted: boolean }>("/apply", payload);
