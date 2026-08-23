// ============================================================================
// P8-DISTRIBUTION-COMMISSION-AUTO 用户端佣金服务（第一阶段）
//
// 对应后端 /api/commission：
//   GET  /my/summary      — 三余额（可提现/待解冻/累计总收益）
//   GET  /my/records      — 佣金明细
//   GET  /my/withdrawals  — 提现记录
//   POST /my/withdraw     — 提现申请
//   GET  /config          — 公开配置（最低提现额/解冻天数/税务提示）
//
// 合规：仅一级分销表述；金额单位元、两位小数；税务提示必展示
// ============================================================================

import { getUserToken, getUserProfile } from "./auth";

const API_BASE = "/api/commission";

// ==================== 类型定义 ====================

/** 三余额概览 */
export interface CommissionSummary {
  /** 可提现余额（元） */
  withdrawableYuan: string;
  /** 待解冻金额（元） */
  frozenYuan: string;
  /** 累计总收益（元） */
  totalEarningsYuan: string;
}

/** 佣金明细记录 */
export interface CommissionRecord {
  orderNo: string;
  payerUserId: string;
  ratioPercent: number;
  baseAmountYuan: string;
  commissionYuan: string;
  status: string;
  createdAt: string;
  unfreezeAt: string | null;
  unfrozenAt: string | null;
  note: string;
}

/** 提现记录 */
export interface CommissionWithdrawal {
  withdrawNo: string;
  amountYuan: string;
  status: string;
  failReason: string;
  createdAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
}

/** 公开配置 */
export interface CommissionPublicConfig {
  enabled: boolean;
  withdrawEnabled?: boolean; // v25.0.47_10: false = 提现暂未开放
  minWithdrawYuan: number;
  dailyWithdrawLimit: number;
  unfreezeDays: number;
  unfreezeEnabled: boolean;
  // v25.0.47_12: 月度结算/提现窗口（每月30号结算、15号后可提现）
  monthlySettleEnabled?: boolean;
  settleDay?: number | null;
  withdrawOpenDay?: number | null;
  taxNotice: string;
  withdrawTip: string;
}

/** 当前日期是否处于月度提现窗口（每月 withdrawOpenDay 号以后；本地兜底，服务端强制为准） */
export function isCommissionWithdrawWindowOpen(cfg: CommissionPublicConfig | null): boolean {
  if (!cfg || cfg.monthlySettleEnabled === false) return true;
  const openDay = Number(cfg.withdrawOpenDay ?? 15);
  if (!isFinite(openDay) || openDay <= 0 || openDay >= 28) return true;
  return new Date().getDate() > openDay;
}

// ==================== 内部工具 ====================

function authHeaders(): Record<string, string> {
  const token = getUserToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** 是否已登录 */
export function isCommissionAuthed(): boolean {
  return !!getUserToken() && !!getUserProfile();
}

// ==================== 接口封装 ====================

/** 查询三余额概览 */
export async function getCommissionSummary(): Promise<CommissionSummary | null> {
  try {
    const res = await fetch(`${API_BASE}/my/summary`, { headers: authHeaders() });
    const json = await res.json();
    if (json.success && json.data) return json.data as CommissionSummary;
    return null;
  } catch {
    return null;
  }
}

/** 查询佣金明细（最近N条） */
export async function getCommissionRecords(limit = 50): Promise<CommissionRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/my/records?limit=${limit}`, {
      headers: authHeaders(),
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data as CommissionRecord[];
    return [];
  } catch {
    return [];
  }
}

/** 查询提现记录 */
export async function getCommissionWithdrawals(limit = 50): Promise<CommissionWithdrawal[]> {
  try {
    const res = await fetch(`${API_BASE}/my/withdrawals?limit=${limit}`, {
      headers: authHeaders(),
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data as CommissionWithdrawal[];
    return [];
  } catch {
    return [];
  }
}

/** 提交提现申请（金额单位元；openid 为微信零钱收款账号） */
export async function applyCommissionWithdraw(
  amountYuan: number,
  openid?: string | null
): Promise<{ success: boolean; error?: string; withdrawNo?: string }> {
  try {
    const res = await fetch(`${API_BASE}/my/withdraw`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ amount: amountYuan, openid: openid || undefined }),
    });
    const json = await res.json();
    if (json.success) {
      return { success: true, withdrawNo: json.data?.withdrawNo };
    }
    return { success: false, error: json.error || "申请失败，请稍后重试" };
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/** 获取公开配置（未登录可用） */
export async function getCommissionConfig(): Promise<CommissionPublicConfig | null> {
  try {
    const res = await fetch(`${API_BASE}/config`);
    const json = await res.json();
    if (json.success && json.data) return json.data as CommissionPublicConfig;
    return null;
  } catch {
    return null;
  }
}

// ==================== 展示辅助 ====================

/** 佣金记录状态 → 中文文案 */
export const COMMISSION_STATUS_LABELS: Record<string, string> = {
  FROZEN: "待解冻",
  UNFROZEN: "可提现",
  AVAILABLE: "已到账",
  REVERSED: "已冲正",
  PENDING_REVIEW: "待审核",
};

/** 提现状态 → 中文文案 */
export const WITHDRAW_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "待审核",
  TRANSFERING: "转账中",
  PROCESSING: "处理中",
  PAID: "已到账",
  FAILED: "失败",
  REJECTED: "已驳回",
};

/** 时间格式化：今天/昨天/完整日期 */
export function formatCommissionTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (date.toDateString() === now.toDateString()) {
      return `今天 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  } catch {
    return timeStr;
  }
}
