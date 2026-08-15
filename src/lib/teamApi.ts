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
 * 获取我的团队列表
 */
export async function getTeamMembers(): Promise<{ success: boolean; data?: { members: TeamMember[] }; message?: string }> {
  return authFetch("/api/auth/team/members");
}

/**
 * 获取团队统计
 */
export async function getTeamStats(): Promise<{ success: boolean; data?: TeamStats; message?: string }> {
  return authFetch("/api/auth/team/stats");
}

/**
 * 获取当前用户的邀请码
 */
export async function getMyInviteCode(): Promise<{ success: boolean; data?: { inviteCode: string }; message?: string }> {
  return authFetch("/api/auth/invite-code");
}