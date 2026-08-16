"use client";

// ============================================================================
// 团队/分销 API 客户端 - v21.2
// 从后端获取真实的邀请关系数据，替代 localStorage 模拟
// v21.2: 修复 token 读取键错误 - 使用 getUserToken() 统一读取
// ============================================================================

import { getUserToken } from "./auth";

const API_BASE_URL = typeof window !== "undefined"
  ? window.location.origin
  : "https://yandaoguoxue.yandao.vip";

export interface TeamMember {
  relation_id: number;
  invitee_id: number;
  level: 1 | 2;
  invite_time: string;
  accumulated_points: number;
  nickname: string;
  avatar: string;
  member_level: string;
  user_created_at: string;
}

export interface TeamStats {
  totalInvites: number;
  level1Count: number;
  level2Count: number;
  totalRewards: number;
}

function getAccessToken(): string | null {
  return getUserToken();
}

/**
 * 带 JWT 鉴权的 API 请求
 */
async function authFetch(path: string, options?: RequestInit): Promise<any> {
  const token = getAccessToken();
  if (!token) {
    return { success: false, message: "未登录，请先登录" };
  }
  
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options?.headers || {}),
    },
    credentials: "include",
  });
  
  return res.json();
}

/**
 * 获取我的团队列表（v25.0.19：映射后端扁平响应为页面契约）
 */
export async function getTeamMembers(): Promise<{ success: boolean; data?: { members: TeamMember[] }; message?: string }> {
  const r = await authFetch("/api/auth/team/members");
  if (r && r.success && Array.isArray(r.members)) {
    return {
      success: true,
      data: {
        members: r.members.map((m: any, idx: number) => ({
          relation_id: m.relationId ?? (idx + 1),
          invitee_id: m.userId ?? "",
          level: (m.level === 2 ? 2 : 1) as 1 | 2,
          invite_time: m.joinedAt || "",
          accumulated_points: m.accumulatedPoints || 0,
          nickname: m.nickname || "",
          avatar: m.avatar || "",
          member_level: m.memberLevel || "basic",
          user_created_at: m.joinedAt || "",
        })),
      },
    };
  }
  return { success: false, message: (r && (r.error || r.message)) || "获取团队失败" };
}

/**
 * 获取团队统计（v25.0.19：映射后端 stats 为页面契约）
 */
export async function getTeamStats(): Promise<{ success: boolean; data?: TeamStats; message?: string }> {
  const r = await authFetch("/api/auth/team/stats");
  if (r && r.success && r.stats) {
    return {
      success: true,
      data: {
        totalInvites: r.stats.teamTotal ?? 0,
        level1Count: r.stats.level1Count ?? 0,
        level2Count: r.stats.level2Count ?? 0,
        totalRewards: r.stats.totalRewards ?? 0,
      },
    };
  }
  return { success: false, message: (r && (r.error || r.message)) || "获取统计失败" };
}

/**
 * 获取当前用户的邀请码（v25.0.19：映射后端扁平响应）
 */
export async function getMyInviteCode(): Promise<{ success: boolean; data?: { inviteCode: string }; message?: string }> {
  const r = await authFetch("/api/auth/invite-code");
  if (r && r.success && r.inviteCode !== undefined) {
    return { success: true, data: { inviteCode: r.inviteCode } };
  }
  return { success: false, message: (r && (r.error || r.message)) || "获取邀请码失败" };
}