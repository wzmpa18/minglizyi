"use client";

// ============================================================================
// v20.0 群聊生态升级 - 前端服务层
// 功能：创建群聊、加入群聊、发送消息（含AI审核）、文件上传、群聊列表
// ============================================================================

import { getUserProfile } from "./auth";

// --- 类型定义 ---

export interface GroupChatInfo {
  id: string;
  name: string;
  desc: string;
  creatorId: string;
  creatorName: string;
  memberCount: number;
  maxMembers: number;
  role: string;
  lastActiveAt: string;
  unreadCount: number;
  status: string;
}

export interface GroupMessage {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  type: string;
  timestamp: string;
  moderationPassed: boolean;
}

export interface GroupFile {
  id: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  fileType: string;
  uploadedBy: string;
  uploaderName: string;
  uploadedAt: string;
}

export interface GroupMessagesResult {
  messages: GroupMessage[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// --- 配置常量 ---

export const GROUP_CONFIG = {
  MAX_MEMBERS_BASIC: 50,
  MAX_MEMBERS_VIP: 200,
  CLOUD_STORAGE_PER_GROUP: 500,
};

// --- 工具函数 ---

function getCurrentUserInfo(): { userId: string; nickname: string } | null {
  if (typeof window === "undefined") return null;
  const profile = getUserProfile();
  if (!profile) return null;
  return {
    userId: profile.userId,
    nickname: profile.nickname,
  };
}

/**
 * 创建群聊
 */
export async function createGroupChat(
  groupName: string,
  groupDesc: string
): Promise<{ success: boolean; groupId?: string; inviteCode?: string; error?: string }> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/group/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creatorId: userInfo.userId,
        creatorName: userInfo.nickname,
        groupName,
        groupDesc,
      }),
    });
    if (res.status === 429) return { success: false, error: "请求过于频繁" };
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 加入群聊
 */
export async function joinGroupChat(
  groupId: string,
  inviteCode?: string
): Promise<{ success: boolean; error?: string }> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/group/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        userId: userInfo.userId,
        nickname: userInfo.nickname,
        inviteCode,
      }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 发送群聊消息
 */
export async function sendGroupMessage(
  groupId: string,
  content: string,
  type: string = "text"
): Promise<{ success: boolean; data?: GroupMessage; error?: string }> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/group/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        userId: userInfo.userId,
        nickname: userInfo.nickname,
        content,
        type,
      }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 获取群聊消息列表
 */
export async function getGroupMessages(
  groupId: string,
  page: number = 1,
  limit: number = 50
): Promise<GroupMessagesResult | null> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return null;
  try {
    const res = await fetch(
      `/api/group/messages?groupId=${encodeURIComponent(groupId)}&userId=${encodeURIComponent(userInfo.userId)}&page=${page}&limit=${limit}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 上传群聊文件
 */
export async function uploadGroupFile(
  groupId: string,
  fileName: string,
  fileSize: number,
  fileUrl: string,
  fileType: string = "file"
): Promise<{ success: boolean; data?: GroupFile; error?: string }> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/group/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        userId: userInfo.userId,
        nickname: userInfo.nickname,
        fileName,
        fileSize,
        fileUrl,
        fileType,
      }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 获取用户群聊列表
 */
export async function getUserGroups(): Promise<{ groups: GroupChatInfo[]; total: number } | null> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return null;
  try {
    const res = await fetch(`/api/group/list?userId=${encodeURIComponent(userInfo.userId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 升级群聊容量（VIP）
 */
export async function upgradeGroupCapacity(
  groupId: string,
  adminToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/group/upgrade", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ groupId }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}
