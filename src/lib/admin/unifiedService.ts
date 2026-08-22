"use client";

// ============================================================================
// 统一运营管理中心前端服务（FINAL-PRODUCTION-SEAL-03 + P8）
// 对应后端 /api/admin/unified/*，认证复用 admin/client.ts 的密钥体系
// ============================================================================

import { getAdminKey } from "./client";

const API_BASE = "/api/admin/unified";

// ==================== 类型定义 ====================

export interface AdminIdentity {
  key: string;
  role: string;
  name: string;
}

export interface UnifiedOverview {
  users: { total?: number; newToday?: number; active7d?: number };
  membership: { paid?: number };
  orders: { total?: number; paid?: number; pending?: number; revenueYuan?: string };
  ai: { totalCalls?: number; enabled?: boolean };
  social: { groups?: number; posts?: number; comments?: number };
  moderation: {
    reportsPending?: number;
    reportsTotal?: number;
    postsHidden?: number;
    groupsClosed?: number;
    usersBanned?: number;
  };
  commission?: { records?: number; totalYuan?: string; withdrawalsPending?: number };
  server: { uptimeHours?: string; memoryMB?: string; nodeVersion?: string; pid?: number };
  version: string;
  generatedAt: string;
}

export interface AuditEntry {
  id: string;
  operator: string;
  operatorRole: string;
  time: string;
  action: string;
  target: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  ip: string;
  ua: string;
}

export interface AdminKeyInfo {
  role: string;
  name: string;
  createdAt: string;
  masked: string;
  lastUsedAt?: string | null;
}

export interface PaymentStatus {
  wechat: {
    configured: boolean;
    missing: string[];
    oauthConfigured: boolean;
    status: string;
  };
  alipay?: { configured: boolean; missing: string[]; status: string };
  commission?: { enabled: boolean; status: string };
  generatedAt: string;
}

export interface ModerationUser {
  user_id: number;
  nickname: string;
  phone?: string;
  status: string;
  muted_until?: string | null;
  member_level?: string;
  created_at?: string;
  last_login_at?: string | null;
}

export interface ModerationPost {
  post_id: string;
  user_id: number;
  nickname: string;
  content?: string;
  title?: string;
  status: string;
  created_at: string;
}

export interface ModerationReport {
  id: number;
  target_type: string;
  target_id: string;
  reporter_id?: number;
  reason?: string;
  status: string;
  created_at: string;
}

export interface ModerationGroup {
  id: string;
  name: string;
  owner_id: number;
  owner_name: string;
  status: string;
  member_count: number;
  created_at: string;
}

export interface AdminOrder {
  order_no: string;
  user_id: number;
  nickname?: string | null;
  amount: number;
  order_type: string;
  status: string;
  payment_method?: string;
  created_at: string;
  paid_at?: string | null;
  rebateStatus?: string | null;
}

export interface CommissionConfig {
  enabled: boolean;
  ratios: Record<string, number>;
  unfreezeEnabled: boolean;
  unfreezeDays: number;
  minWithdrawYuan: number;
  dailyWithdrawLimit: number;
  transferNote: string;
  taxNotice: string;
  riskControl: Record<string, boolean | number>;
}

export interface AdminCommissionRecord {
  id: number;
  order_no: string;
  record_type: string;
  payer_user_id: number;
  inviter_user_id: number;
  ratio_percent: number;
  base_amount_cents: number;
  commission_cents: number;
  status: string;
  created_at: string;
  unfreeze_at?: string | null;
  unfrozen_at?: string | null;
  note?: string;
}

export interface AdminWithdrawal {
  id: number;
  withdraw_no: string;
  user_id: number;
  amount_cents: number;
  status: string;
  openid?: string;
  fail_reason?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  paid_at?: string | null;
  wechat_transfer_no?: string | null;
}

// ==================== 请求封装 ====================

async function unifiedFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const key = getAdminKey();
  if (!key) return { success: false, error: "未登录，请先输入管理员密钥" };
  try {
    const res = await fetch(`${API_BASE}${path}`, {
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `网络异常：${msg}` };
  }
}

// ==================== 身份 / 总览 / 审计 ====================

export async function fetchWhoami(): Promise<AdminIdentity | null> {
  const res = await unifiedFetch<AdminIdentity>("/whoami");
  return res.success ? res.data! : null;
}

export async function fetchUnifiedOverview(): Promise<UnifiedOverview | null> {
  const res = await unifiedFetch<UnifiedOverview>("/overview");
  return res.success ? res.data! : null;
}

export async function fetchAuditLogs(
  limit = 50,
  action?: string
): Promise<AuditEntry[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (action) params.set("action", action);
  const res = await unifiedFetch<{ logs: AuditEntry[] }>(`/audit?${params.toString()}`);
  return res.success && res.data ? res.data.logs || [] : [];
}

export async function fetchAdminKeys(): Promise<AdminKeyInfo[]> {
  const res = await unifiedFetch<{ keys: AdminKeyInfo[] }>("/keys");
  return res.success && res.data ? res.data.keys || [] : [];
}

export async function createAdminKey(
  role: string,
  name: string,
  reason: string
): Promise<{ ok: boolean; key?: string; error?: string }> {
  const res = await unifiedFetch<{ key: string }>("/keys", {
    method: "POST",
    body: JSON.stringify({ role, name, reason }),
  });
  return { ok: !!res.success, key: res.data?.key, error: res.error };
}

export async function revokeAdminKey(masked: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const res = await unifiedFetch(`/keys/${encodeURIComponent(masked)}`, {
    method: "DELETE",
    body: JSON.stringify({ reason }),
  });
  return { ok: !!res.success, error: res.error };
}

// ==================== 支付状态 ====================

export async function fetchPaymentStatus(): Promise<PaymentStatus | null> {
  const res = await unifiedFetch<PaymentStatus>("/payment-status");
  return res.success ? res.data! : null;
}

// ==================== 内容审核 ====================

export async function fetchModerationUsers(
  query = "",
  page = 1
): Promise<{ users: ModerationUser[]; total: number } | null> {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("query", query);
  const res = await unifiedFetch<{ users: ModerationUser[]; total: number }>(
    `/moderation/users?${params.toString()}`
  );
  return res.success ? res.data! : null;
}

export async function userAction(
  userId: number,
  action: string,
  hours?: number,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await unifiedFetch(`/moderation/users/${userId}/action`, {
    method: "POST",
    body: JSON.stringify({ action, hours, reason }),
  });
  return { ok: !!res.success, error: res.error };
}

export async function fetchModerationPosts(
  status = "",
  page = 1
): Promise<{ posts: ModerationPost[]; total: number } | null> {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  const res = await unifiedFetch<{ posts: ModerationPost[]; total: number }>(
    `/moderation/posts?${params.toString()}`
  );
  return res.success ? res.data! : null;
}

export async function postAction(
  postId: string,
  action: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await unifiedFetch(`/moderation/posts/${encodeURIComponent(postId)}/action`, {
    method: "POST",
    body: JSON.stringify({ action, reason }),
  });
  return { ok: !!res.success, error: res.error };
}

export async function fetchModerationReports(
  status = "",
  page = 1
): Promise<{ reports: ModerationReport[]; total: number } | null> {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  const res = await unifiedFetch<{ reports: ModerationReport[]; total: number }>(
    `/moderation/reports?${params.toString()}`
  );
  return res.success ? res.data! : null;
}

export async function reportAction(
  id: number,
  action: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await unifiedFetch(`/moderation/reports/${id}/action`, {
    method: "POST",
    body: JSON.stringify({ action, reason }),
  });
  return { ok: !!res.success, error: res.error };
}

export async function fetchModerationGroups(
  page = 1
): Promise<{ groups: ModerationGroup[]; total: number } | null> {
  const res = await unifiedFetch<{ groups: ModerationGroup[]; total: number }>(
    `/moderation/groups?page=${page}`
  );
  return res.success ? res.data! : null;
}

export async function groupAction(
  id: string,
  action: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await unifiedFetch(`/moderation/groups/${encodeURIComponent(id)}/action`, {
    method: "POST",
    body: JSON.stringify({ action, reason }),
  });
  return { ok: !!res.success, error: res.error };
}

// ==================== 订单管理 ====================

export async function fetchAdminOrders(
  status = "",
  page = 1,
  size = 20
): Promise<{ orders: AdminOrder[]; total: number; page: number } | null> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set("status", status);
  const res = await unifiedFetch<{ orders: AdminOrder[]; total: number; page: number }>(
    `/orders?${params.toString()}`
  );
  return res.success ? res.data! : null;
}

export async function manualConfirmOrder(
  orderId: string,
  reason: string,
  channel?: string
): Promise<{ ok: boolean; error?: string; status?: string }> {
  const res = await unifiedFetch<{ orderId: string; status: string }>(
    `/orders/${encodeURIComponent(orderId)}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({ confirm: true, reason, channel }),
    }
  );
  return { ok: !!res.success, error: res.error, status: res.data?.status };
}

// ==================== 分佣管理（P8） ====================

export async function fetchCommissionConfig(): Promise<CommissionConfig | null> {
  const res = await unifiedFetch<CommissionConfig>("/commission/config");
  return res.success ? res.data! : null;
}

export async function updateCommissionConfig(
  patch: Partial<CommissionConfig> & { __reason?: string }
): Promise<{ ok: boolean; error?: string }> {
  const res = await unifiedFetch("/commission/config", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return { ok: !!res.success, error: res.error };
}

export async function fetchCommissionRecords(
  page = 1,
  filters: { inviter?: string; status?: string; orderNo?: string } = {}
): Promise<{ records: AdminCommissionRecord[]; total: number } | null> {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.inviter) params.set("inviter", filters.inviter);
  if (filters.status) params.set("status", filters.status);
  if (filters.orderNo) params.set("orderNo", filters.orderNo);
  const res = await unifiedFetch<{ records: AdminCommissionRecord[]; total: number }>(
    `/commission/records?${params.toString()}`
  );
  return res.success ? res.data! : null;
}

export async function fetchWithdrawals(
  status = "",
  page = 1
): Promise<{ withdrawals: AdminWithdrawal[]; total: number } | null> {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  const res = await unifiedFetch<{ withdrawals: AdminWithdrawal[]; total: number }>(
    `/commission/withdrawals?${params.toString()}`
  );
  return res.success ? res.data! : null;
}

export async function approveWithdrawal(
  id: number,
  reason?: string
): Promise<{ ok: boolean; error?: string; status?: string }> {
  const res = await unifiedFetch<{ withdrawNo: string; status: string }>(
    `/commission/withdrawals/${id}/approve`,
    { method: "POST", body: JSON.stringify({ reason }) }
  );
  return { ok: !!res.success, error: res.error, status: res.data?.status };
}

export async function rejectWithdrawal(
  id: number,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await unifiedFetch(`/commission/withdrawals/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return { ok: !!res.success, error: res.error };
}

export async function runUnfreezeScan(): Promise<{ ok: boolean; unfrozen?: number; error?: string }> {
  const res = await unifiedFetch<{ unfrozen: number }>("/commission/run-unfreeze", {
    method: "POST",
  });
  return { ok: !!res.success, unfrozen: res.data?.unfrozen, error: res.error };
}
