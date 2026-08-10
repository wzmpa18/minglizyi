"use client";

// ============================================================================
// v19.9 钱包分账体系 - 前端服务层
// 功能：钱包信息、交易流水、提现管理、收款码设置
// 平台抽成8%，师父收入92%，分销返佣从平台抽成支出
// ============================================================================

import { getUserProfile } from "./auth";

// --- 类型定义 ---

export interface WalletInfo {
  userId: string;
  totalIncome: number;
  pendingSettlement: number;
  availableBalance: number;
  frozenBalance: number;
  withdrawnTotal: number;
  paymentQRCode: string;
  alipayAccount: string;
  wechatAccount: string;
  bankInfo: string;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: "income" | "platform_commission" | "distributor_l1" | "distributor_l2" | "withdraw" | "withdraw_reject";
  amount: number;
  description: string;
  relatedOrderId: string;
  timestamp: string;
}

export interface WithdrawalRecord {
  id: string;
  userId: string;
  amount: number;
  method: "alipay" | "wechat" | "bank";
  accountInfo: string;
  status: "pending" | "approved" | "rejected" | "completed";
  requestedAt: string;
  processedAt: string | null;
  adminNote: string;
}

export interface WalletData {
  wallet: WalletInfo;
  recentTransactions: WalletTransaction[];
  recentWithdrawals: WithdrawalRecord[];
  config: {
    minWithdrawal: number;
    settlementDays: number;
    platformCommission: number;
  };
}

// --- 钱包配置常量 ---

export const WALLET_CONFIG = {
  PLATFORM_COMMISSION: 0.08,
  DISTRIBUTOR_L1_RATE: 0.15,
  DISTRIBUTOR_L2_RATE: 0.08,
  MIN_WITHDRAWAL: 100,
  SETTLEMENT_DAYS: 1,
};

// 交易类型显示映射
export const TX_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  income: { label: "服务收入", color: "#27ae60" },
  platform_commission: { label: "平台抽成", color: "#e74c3c" },
  distributor_l1: { label: "一级分销", color: "#3498db" },
  distributor_l2: { label: "二级分销", color: "#2ecc71" },
  withdraw: { label: "提现申请", color: "#f39c12" },
  withdraw_reject: { label: "提现退回", color: "#9b59b6" },
};

// 提现状态映射
export const WITHDRAWAL_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "待审核", color: "#f39c12" },
  approved: { label: "已通过", color: "#27ae60" },
  rejected: { label: "已拒绝", color: "#e74c3c" },
  completed: { label: "已完成", color: "#27ae60" },
};

// --- 工具函数 ---

function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  const profile = getUserProfile();
  return profile?.userId || null;
}

/** 格式化金额 */
export function formatAmount(amount: number): string {
  return "¥" + amount.toFixed(2);
}

/** 格式化时间 */
export function formatWalletTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// --- API 调用函数 ---

/**
 * 获取钱包信息
 */
export async function getWalletInfo(userId?: string): Promise<WalletData | null> {
  const uid = userId || getCurrentUserId();
  if (!uid) return null;
  try {
    const res = await fetch(`/api/wallet/info?userId=${encodeURIComponent(uid)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 获取交易流水
 */
export async function getTransactions(
  userId?: string,
  page = 1,
  limit = 20
): Promise<{ transactions: WalletTransaction[]; total: number; page: number; limit: number }> {
  const uid = userId || getCurrentUserId();
  if (!uid) return { transactions: [], total: 0, page, limit };
  try {
    const res = await fetch(`/api/wallet/transactions?userId=${encodeURIComponent(uid)}&page=${page}&limit=${limit}`);
    if (!res.ok) return { transactions: [], total: 0, page, limit };
    const json = await res.json();
    return json.success ? json.data : { transactions: [], total: 0, page, limit };
  } catch {
    return { transactions: [], total: 0, page, limit };
  }
}

/**
 * 获取提现记录
 */
export async function getWithdrawals(
  userId?: string,
  page = 1,
  limit = 20
): Promise<{ withdrawals: WithdrawalRecord[]; total: number; page: number; limit: number }> {
  const uid = userId || getCurrentUserId();
  if (!uid) return { withdrawals: [], total: 0, page, limit };
  try {
    const res = await fetch(`/api/wallet/withdrawals?userId=${encodeURIComponent(uid)}&page=${page}&limit=${limit}`);
    if (!res.ok) return { withdrawals: [], total: 0, page, limit };
    const json = await res.json();
    return json.success ? json.data : { withdrawals: [], total: 0, page, limit };
  } catch {
    return { withdrawals: [], total: 0, page, limit };
  }
}

/**
 * 提现申请
 */
export async function requestWithdrawal(
  amount: number,
  method: "alipay" | "wechat" | "bank",
  accountInfo: string
): Promise<{ success: boolean; withdrawalId?: string; error?: string }> {
  const uid = getCurrentUserId();
  if (!uid) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid, amount, method, accountInfo }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 设置收款信息
 */
export async function setPaymentInfo(options: {
  qrcode?: string;
  alipay?: string;
  wechat?: string;
  bank?: string;
}): Promise<{ success: boolean; error?: string }> {
  const uid = getCurrentUserId();
  if (!uid) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/wallet/payment-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid, ...options }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

// --- 管理员 API ---

/**
 * 管理员：获取钱包列表
 */
export async function adminListWallets(
  token: string,
  page = 1,
  limit = 20
): Promise<{ wallets: WalletInfo[]; total: number; page: number; limit: number } | null> {
  try {
    const res = await fetch(`/api/wallet/admin/list?page=${page}&limit=${limit}`, {
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
 * 管理员：审批提现
 */
export async function adminApproveWithdrawal(
  token: string,
  withdrawalId: string,
  adminNote?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/wallet/admin/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ withdrawalId, adminNote }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

/**
 * 管理员：拒绝提现
 */
export async function adminRejectWithdrawal(
  token: string,
  withdrawalId: string,
  adminNote?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/wallet/admin/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ withdrawalId, adminNote }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

/**
 * 管理员：导出流水（返回CSV下载URL）
 */
export function getExportUrl(token: string, userId?: string, startDate?: string, endDate?: string): string {
  const params = new URLSearchParams();
  if (userId) params.set("userId", userId);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  return `/api/wallet/admin/export?${params.toString()}`;
}
