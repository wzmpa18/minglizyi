"use client";

// ============================================================================
// v20.0 补丁功能 - 前端服务层
// 涵盖：2000人超级群、三档云存储、COS对象存储、AI群管增强、
//       中医五大流派+名家典籍、舌象AI分析、聊天高级筛选、付费备份、
//       用户分类注册引导/标签/搜索
// ============================================================================

import { getUserProfile } from "./auth";

// --- 工具函数 ---
function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  const profile = getUserProfile();
  return profile?.userId || null;
}

// ==================== 2000人超级群 ====================

export interface GroupTier {
  id: string;
  name: string;
  maxMembers: number;
  storageMB: number;
  price: number;
  duration: number;
}

export async function getGroupTiers(): Promise<{ tiers: GroupTier[] } | null> {
  try {
    const res = await fetch("/api/group/tiers");
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function upgradeGroupToSuper(
  groupId: string,
  tierId: string,
  paymentData?: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch("/api/group/upgrade-super", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, tierId, paymentData }),
    });
    return await res.json();
  } catch { return { success: false, error: "网络异常" }; }
}

// ==================== 三档云存储 ====================

export interface StoragePackage {
  id: string;
  name: string;
  capacity: string;
  price: number;
  duration: number;
  features: string[];
}

export async function getStoragePackages(): Promise<{ packages: StoragePackage[] } | null> {
  try {
    const res = await fetch("/api/storage/packages");
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function purchaseStoragePackage(
  groupId: string,
  packageId: string,
  paymentData?: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const userId = getCurrentUserId();
  if (!userId) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/storage/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, groupId, packageId, paymentData }),
    });
    return await res.json();
  } catch { return { success: false, error: "网络异常" }; }
}

export async function getGroupStorageInfo(groupId: string): Promise<any | null> {
  try {
    const res = await fetch(`/api/storage/info?groupId=${encodeURIComponent(groupId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

// ==================== COS对象存储 ====================

export interface COSUploadConfig {
  bucket: string;
  region: string;
  objectKey: string;
  cdnUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  expires: number;
}

export async function getCOSUploadConfig(
  fileName: string,
  fileType: string,
  fileSize: number
): Promise<COSUploadConfig | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch("/api/cos/upload-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, fileName, fileType, fileSize }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function confirmCOSUpload(
  objectKey: string,
  cdnUrl: string,
  fileName: string,
  fileSize: number,
  fileType: string
): Promise<{ success: boolean; error?: string }> {
  const userId = getCurrentUserId();
  if (!userId) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/cos/confirm-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, objectKey, cdnUrl, fileName, fileSize, fileType }),
    });
    return await res.json();
  } catch { return { success: false, error: "网络异常" }; }
}

// ==================== AI群管增强 ====================

export interface ViolationRecord {
  id: string;
  groupId: string;
  messageId: string;
  userId: string;
  nickname: string;
  reason: string;
  timestamp: string;
  action: string;
}

export async function getGroupViolations(
  groupId: string,
  userId?: string
): Promise<{ violations: ViolationRecord[]; violationCount: number; isMuted: boolean } | null> {
  try {
    let url = `/api/group/moderation/violations?groupId=${encodeURIComponent(groupId)}`;
    if (userId) url += `&userId=${encodeURIComponent(userId)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function checkUserMuted(
  groupId: string
): Promise<{ muted: boolean; expiresAt: string | null; reason: string } | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch(`/api/group/moderation/check-mute?groupId=${encodeURIComponent(groupId)}&userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

// ==================== 中医五大流派 ====================

export interface TCMSchool {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  priority: number;
  masters: Array<{
    id: string;
    name: string;
    icon: string;
    dynasty: string;
    classics: string[];
    bio: string;
  }>;
}

export async function getTCMSchools(): Promise<{ schools: TCMSchool[] } | null> {
  try {
    const res = await fetch("/api/tcm/schools");
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function getTCMSchoolDetail(schoolId: string): Promise<TCMSchool | null> {
  try {
    const res = await fetch(`/api/tcm/schools/detail?schoolId=${encodeURIComponent(schoolId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function saveTCMSchoolPreference(
  schoolId: string,
  selectedMasters: string[],
  selectedClassics: string[],
  customNotes: string
): Promise<{ success: boolean; error?: string }> {
  const userId = getCurrentUserId();
  if (!userId) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/tcm/schools/preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, schoolId, selectedMasters, selectedClassics, customNotes }),
    });
    return await res.json();
  } catch { return { success: false, error: "网络异常" }; }
}

export async function getTCMSchoolPreference(): Promise<any | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch(`/api/tcm/schools/preference?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

// ==================== 舌象AI分析 ====================

export async function analyzeTongueImage(
  imageUrl: string,
  symptoms: string
): Promise<{ analysisId: string; status: string; disclaimer: string } | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch("/api/tcm/tongue/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, imageUrl, symptoms }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function getTongueAnalysisResult(analysisId: string): Promise<any | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch(`/api/tcm/tongue/result?analysisId=${encodeURIComponent(analysisId)}&userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function getTongueAnalysisHistory(page: number = 1, limit: number = 10): Promise<any | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch(`/api/tcm/tongue/history?userId=${encodeURIComponent(userId)}&page=${page}&limit=${limit}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

// ==================== 聊天记录高级筛选 ====================

export interface ChatHistoryFilter {
  toolName?: string;
  source?: string; // all, ai, group, master
  startDate?: string;
  endDate?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}

export async function getFilteredChatHistory(
  filters: ChatHistoryFilter
): Promise<any | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch("/api/chat-history/filter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, filters }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function batchDeleteChatHistory(
  historyIds: string[]
): Promise<{ deletedCount: number } | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch("/api/chat-history/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, historyIds }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function batchDeleteByFilter(
  filters: ChatHistoryFilter
): Promise<{ deletedCount: number } | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch("/api/chat-history/batch-delete-filter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, filters }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

// ==================== 付费备份 ====================

export async function paidBackupUserChats(
  paymentData?: Record<string, any>
): Promise<any | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch("/api/chat-history/paid-backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, paymentData }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function getBackupList(): Promise<any | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const res = await fetch(`/api/chat-history/backup-list?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function getBackupConfig(): Promise<any | null> {
  try {
    const res = await fetch("/api/chat-history/backup-config");
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

// ==================== 用户分类注册引导 ====================

export async function setRegistrationCategory(
  category: string,
  subcategory: string
): Promise<{ success: boolean; error?: string }> {
  const userId = getCurrentUserId();
  if (!userId) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/user/registration-category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, category, subcategory }),
    });
    return await res.json();
  } catch { return { success: false, error: "网络异常" }; }
}

export async function getUserTags(userId?: string): Promise<any | null> {
  const uid = userId || getCurrentUserId();
  if (!uid) return null;
  try {
    const res = await fetch(`/api/user/tags?userId=${encodeURIComponent(uid)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

export async function searchUsersByCategory(
  category: string,
  subcategory?: string,
  page: number = 1,
  limit: number = 20
): Promise<any | null> {
  try {
    let url = `/api/user/search-by-category?category=${encodeURIComponent(category)}&page=${page}&limit=${limit}`;
    if (subcategory) url += `&subcategory=${encodeURIComponent(subcategory)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}
