"use client";

// ============================================================================
// v25.0.60 AUDIT-20260826 P0-2 修复：AI 配额查询服务层
// 原实现调用 /api/ai-quota/* —— 该组接口后端从未实现（恒 404），
// 导致「AI 额度」恒显 "--"。现改调后端真实存在的 GET /api/ai/quota（JWT 鉴权）。
//
// 服务端返回（middleware/auth.js getAIQuotaFromDB）：
//   { dailyUsed, dailyLimit, remaining, level, source }
//   remaining = -1 表示无限（yearly/lifetime）
// ============================================================================

import { getUserProfile, getUserToken } from "./auth";

// --- 类型定义 ---

export interface AIQuotaInfo {
  userId: string;
  membershipLevel: string;
  dailyUsed: number;
  dailyLimit: number;
  /** -1 = 无限 */
  dailyRemaining: number;
  source: string;
}

/**
 * 获取AI配额信息（真实服务端数据，需登录）
 * 未登录或接口异常返回 null（调用方按 "--" 显示）
 */
export async function getAIQuotaInfo(): Promise<AIQuotaInfo | null> {
  if (typeof window === "undefined") return null;
  const token = getUserToken();
  const profile = getUserProfile();
  if (!token || !profile?.userId) return null;
  try {
    const res = await fetch("/api/ai/quota", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    const q = json.data;
    return {
      userId: profile.userId,
      membershipLevel: q.level ?? "basic",
      dailyUsed: q.dailyUsed ?? 0,
      dailyLimit: q.dailyLimit ?? 0,
      dailyRemaining: q.remaining ?? 0,
      source: q.source ?? "database",
    };
  } catch {
    return null;
  }
}
