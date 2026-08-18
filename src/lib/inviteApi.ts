"use client";

// ============================================================================
// P9-推广中心 API 客户端
// 服务端统一口径：签名邀请链接 / 单层奖励 / 归因防作弊 / 积分明细
// 后端：register_routes.js（/api/auth/invite/*、/api/auth/points/transactions、/api/auth/login-code）
// ============================================================================

import { getUserToken } from "./auth";

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

export interface InviteLinkData {
  userId: number;
  inviteCode: string;
  inviteLink: string;
  inviteRef: string;
  inviteTs: string;
  inviteSig: string;
  rewardRules: { register: number; firstPay: number };
}

export interface InviteOverview {
  stats: {
    totalInvites: number;
    todayInvites: number;
    monthInvites: number;
    totalRewardPoints: number;
    pointsBalance: number;
  };
  invitees: { inviteeId: number; name: string; invitedAt: string }[];
  rewards: { id: number; inviteeId: number; type: string; points: number; status: string; grantedAt: string }[];
}

export interface PointsTransactions {
  balance: number;
  transactions: {
    id: number;
    type: string;
    typeLabel: string;
    amount: number;
    balanceAfter: number;
    note: string;
    createdAt: string;
  }[];
}

function tokenHeader(): Record<string, string> {
  const token = getUserToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function authGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...tokenHeader() },
  });
  if (res.status === 401) {
    return { unauthorized: true } as unknown as T;
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// 设备指纹：首次生成持久化 localStorage（配合服务端同设备批量注册/关联账号检测）
// ---------------------------------------------------------------------------
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("yandao_device_id");
    if (!id) {
      const rand = Math.random().toString(36).slice(2, 10);
      const stamp = Date.now().toString(36);
      id = `dev-${stamp}-${rand}`;
      localStorage.setItem("yandao_device_id", id);
    }
    return id;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// 邀请上下文：落地页（register/任意带参页面）捕获后持久化，注册/登录时统一带上
// 来源优先级：签名链接(ref/ts/sig) > 邀请码(code)
// ---------------------------------------------------------------------------
export interface InviteContext {
  ref: string;
  ts: string;
  sig: string;
  code: string;
  capturedAt: number;
}

const INVITE_CTX_KEY = "yandao_invite_ctx";
const INVITE_CTX_TTL = 30 * 24 * 60 * 60 * 1000; // 30天

export function captureInviteContext(params: URLSearchParams): InviteContext | null {
  if (typeof window === "undefined") return null;
  const ref = params.get("ref") || "";
  const ts = params.get("ts") || "";
  const sig = params.get("sig") || "";
  const code = params.get("code") || "";
  if (!ref && !code) return null;
  const ctx: InviteContext = { ref, ts, sig, code, capturedAt: Date.now() };
  try {
    localStorage.setItem(INVITE_CTX_KEY, JSON.stringify(ctx));
  } catch {}
  return ctx;
}

export function getInviteContext(): InviteContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(INVITE_CTX_KEY);
    if (!raw) return null;
    const ctx = JSON.parse(raw) as InviteContext;
    if (!ctx || (!ctx.ref && !ctx.code)) return null;
    if (Date.now() - (ctx.capturedAt || 0) > INVITE_CTX_TTL) {
      localStorage.removeItem(INVITE_CTX_KEY);
      return null;
    }
    return ctx;
  } catch {
    return null;
  }
}

export function clearInviteContext() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(INVITE_CTX_KEY);
  } catch {}
}

// ---------------------------------------------------------------------------
// API：签名邀请链接（推广页二维码/分享统一数据源）
// ---------------------------------------------------------------------------
const LINK_CACHE_KEY = "yandao_invite_link_cache";
const LINK_CACHE_TTL = 24 * 60 * 60 * 1000; // 签名永久有效，缓存1天减少请求

export async function getInviteLink(forceRefresh = false): Promise<InviteLinkData | null> {
  if (typeof window === "undefined") return null;
  if (!forceRefresh) {
    try {
      const raw = localStorage.getItem(LINK_CACHE_KEY);
      if (raw) {
        const c = JSON.parse(raw);
        if (c && c.data && Date.now() - c.at < LINK_CACHE_TTL) return c.data as InviteLinkData;
      }
    } catch {}
  }
  try {
    const res = await fetch(`${API_BASE}/api/auth/invite/link`, {
      headers: { "Content-Type": "application/json", ...tokenHeader() },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.success || !data.data || !data.data.inviteLink) return null;
    try {
      localStorage.setItem(LINK_CACHE_KEY, JSON.stringify({ at: Date.now(), data: data.data }));
    } catch {}
    return data.data as InviteLinkData;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// API：推广中心总览（单层统计 + 被邀请人明细 + 奖励明细）
// ---------------------------------------------------------------------------
export async function getInviteOverview(): Promise<InviteOverview | null> {
  try {
    const data = await authGet<any>("/api/auth/invite/overview");
    if (!data || !data.success || !data.data) return null;
    return data.data as InviteOverview;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// API：积分明细
// ---------------------------------------------------------------------------
export async function getPointsTransactions(limit = 50): Promise<PointsTransactions | null> {
  try {
    const data = await authGet<any>(`/api/auth/points/transactions?limit=${limit}`);
    if (!data || !data.success || !data.data) return null;
    return data.data as PointsTransactions;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 验证码登录（服务端自动注册 + 邀请归因）
// ---------------------------------------------------------------------------
export async function loginWithCodeServer(params: {
  phone?: string;
  email?: string;
  code: string;
}): Promise<{ success: boolean; message: string; isNewUser?: boolean; accessToken?: string; user?: any }> {
  const inviteCtx = getInviteContext();
  const body: Record<string, unknown> = {
    phone: params.phone || null,
    email: params.email || null,
    code: params.code,
    deviceId: getDeviceId(),
  };
  if (inviteCtx) {
    if (inviteCtx.ref) {
      body.inviteRef = inviteCtx.ref;
      body.inviteTs = inviteCtx.ts;
      body.inviteSig = inviteCtx.sig;
    }
    if (inviteCtx.code) body.inviteCode = inviteCtx.code;
  }
  try {
    const res = await fetch(`${API_BASE}/api/auth/login-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data && data.success && data.data) {
      clearInviteContext();
      return {
        success: true,
        message: data.message || "登录成功",
        isNewUser: !!data.data.isNewUser,
        accessToken: data.data.accessToken,
        user: data.data.user,
      };
    }
    return { success: false, message: (data && data.message) || "登录失败" };
  } catch {
    return { success: false, message: "网络异常，请稍后重试" };
  }
}
