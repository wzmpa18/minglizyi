"use client";

// ============================================================================
// v20.0 聊天记录管理与云端备份 - 前端服务层
// 功能：保存/列表/详情/删除/导出/备份/恢复
// ============================================================================

import { getUserProfile } from "./auth";

// --- 类型定义 ---

export interface ChatHistoryItem {
  id: string;
  toolName: string;
  messageCount: number;
  createdAt: string;
  lastUpdated: string;
  preview: string;
}

export interface ChatHistoryDetail {
  id: string;
  userId: string;
  sessionId: string;
  toolName: string;
  messages: Array<{
    role?: string;
    content?: string;
    timestamp?: string;
  }>;
  messageCount: number;
  createdAt: string;
  lastUpdated: string;
  synced: boolean;
}

export interface ChatHistoryListResult {
  histories: ChatHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface BackupInfo {
  backupId: string;
  historyCount: number;
  totalMessages: number;
  backupSize: number;
}

// --- 配置常量 ---

export const CHAT_HISTORY_CONFIG = {
  MAX_FREE_HISTORY: 100,
  MAX_VIP_HISTORY: 10000,
  EXPORT_FORMATS: ["json", "txt", "csv"] as const,
};

// --- 工具函数 ---

function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  const profile = getUserProfile();
  return profile?.userId || null;
}

/**
 * 保存聊天记录
 */
export async function saveChatHistory(
  sessionId: string,
  messages: Array<{ role?: string; content?: string; timestamp?: string }>,
  toolName?: string
): Promise<{ success: boolean; historyId?: string; error?: string }> {
  const userId = getCurrentUserId();
  if (!userId) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/chat-history/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, sessionId, messages, toolName }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 获取聊天记录列表
 */
export async function getChatHistoryList(
  page: number = 1,
  limit: number = 20,
  toolName?: string
): Promise<ChatHistoryListResult | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    let url = `/api/chat-history/list?userId=${encodeURIComponent(userId)}&page=${page}&limit=${limit}`;
    if (toolName) url += `&toolName=${encodeURIComponent(toolName)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 获取聊天记录详情
 */
export async function getChatHistoryDetail(historyId: string): Promise<ChatHistoryDetail | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch(
      `/api/chat-history/detail?historyId=${encodeURIComponent(historyId)}&userId=${encodeURIComponent(userId)}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 删除聊天记录
 */
export async function deleteChatHistory(historyId: string): Promise<{ success: boolean; error?: string }> {
  const userId = getCurrentUserId();
  if (!userId) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/chat-history/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyId, userId }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * v20.1 批量删除聊天记录
 */
export async function batchDeleteChatHistories(
  historyIds: string[]
): Promise<{ success: boolean; deletedCount: number; failedIds: string[] }> {
  const userId = getCurrentUserId();
  if (!userId) return { success: false, deletedCount: 0, failedIds: historyIds };
  if (!historyIds || historyIds.length === 0) {
    return { success: true, deletedCount: 0, failedIds: [] };
  }
  let deletedCount = 0;
  const failedIds: string[] = [];
  // 逐条删除，避免一次性请求过大
  for (const id of historyIds) {
    const result = await deleteChatHistory(id);
    if (result.success) {
      deletedCount++;
    } else {
      failedIds.push(id);
    }
  }
  return { success: failedIds.length === 0, deletedCount, failedIds };
}

/**
 * v20.1 清空全部聊天记录
 */
export async function clearAllChatHistories(): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  const userId = getCurrentUserId();
  if (!userId) return { success: false, deletedCount: 0, error: "请先登录" };
  try {
    // 先获取全部记录（每次50条，循环获取）
    let allIds: string[] = [];
    let page = 1;
    const limit = 50;
    while (true) {
      const result = await getChatHistoryList(page, limit);
      if (!result || !result.histories || result.histories.length === 0) break;
      allIds = allIds.concat(result.histories.map(h => h.id));
      if (result.histories.length < limit) break;
      page++;
      // 安全限制：最多循环100页
      if (page > 100) break;
    }
    if (allIds.length === 0) {
      return { success: true, deletedCount: 0 };
    }
    const batchResult = await batchDeleteChatHistories(allIds);
    return {
      success: batchResult.success,
      deletedCount: batchResult.deletedCount,
      error: batchResult.failedIds.length > 0 ? `${batchResult.failedIds.length} 条删除失败` : undefined,
    };
  } catch {
    return { success: false, deletedCount: 0, error: "网络异常，请稍后重试" };
  }
}

/**
 * 导出聊天记录
 */
export async function exportChatHistory(
  historyId: string,
  format: "json" | "txt" | "csv" = "json"
): Promise<{ format: string; content: string; fileName: string } | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch("/api/chat-history/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyId, userId, format }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 云端备份所有聊天记录
 */
export async function backupUserChats(): Promise<BackupInfo | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch("/api/chat-history/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 恢复云端备份
 */
export async function restoreBackup(backupId: string): Promise<{ success: boolean; restoredCount?: number; error?: string }> {
  const userId = getCurrentUserId();
  if (!userId) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/chat-history/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupId, userId }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 格式化时间
 */
export function formatHistoryTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    return date.toLocaleDateString("zh-CN");
  } catch {
    return "";
  }
}
