"use client";

// ============================================================================
// v20.0 中医诊断系统增强 - 前端服务层
// 功能：保存诊断记录、查询历史、诊断详情、专业学习同好审核、辨证配置
// 合规定位：AI辅助辨证，仅供传统文化学习参考，不构成医疗建议
// ============================================================================

import { getUserProfile } from "./auth";

// --- 类型定义 ---

export interface TCMRecord {
  id: string;
  userId: string;
  nickname: string;
  gender: string;
  age: number;
  mainSymptoms: string[];
  accompanyingSymptoms: string[];
  inspection: Record<string, any>;
  auscultation: Record<string, any>;
  inquiry: Record<string, any>;
  palpation: Record<string, any>;
  tongue: {
    body?: string;
    coating?: string;
    shape?: string;
  };
  pulse: string[];
  syndromeType: string;
  syndromeAnalysis: string;
  suggestedPrinciples: string;
  aiGenerated: boolean;
  practitionerReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  adjustedSyndrome?: string;
  adjustedPrinciples?: string;
  createdAt: string;
  disclaimer: string;
}

export interface TCMConfig {
  syndromeTypes: Record<string, { name: string; items: string[] }>;
  pulseTypes: string[];
  tongueTypes: {
    body: string[];
    coating: string[];
    shape: string[];
  };
  disclaimer: string;
}

// --- 常量 ---

export const TCM_DISCLAIMER = "以上中医辨证分析由AI辅助生成，仅供传统文化学习参考，不能替代专业学习同好面诊，不构成医疗建议";

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
 * 保存中医诊断记录
 */
export async function saveTCMRecord(
  diagnosisData: Partial<TCMRecord>
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return { success: false, error: "请先登录" };
  try {
    const res = await fetch("/api/tcm/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userInfo.userId,
        nickname: userInfo.nickname,
        diagnosisData,
      }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 获取中医诊断历史
 */
export async function getTCMHistory(
  page: number = 1,
  limit: number = 10
): Promise<{ records: TCMRecord[]; total: number; disclaimer: string } | null> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return null;
  try {
    const res = await fetch(
      `/api/tcm/history?userId=${encodeURIComponent(userInfo.userId)}&page=${page}&limit=${limit}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 获取诊断详情
 */
export async function getTCMDetail(recordId: string): Promise<TCMRecord | null> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return null;
  try {
    const res = await fetch(
      `/api/tcm/detail?recordId=${encodeURIComponent(recordId)}&userId=${encodeURIComponent(userInfo.userId)}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 专业学习同好审核诊断记录
 */
export async function reviewTCMRecord(
  recordId: string,
  reviewerId: string,
  reviewNotes: string,
  adjustments?: { syndrome?: string; principles?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/tcm/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId, reviewerId, reviewNotes, adjustments }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 获取中医辨证配置
 */
export async function getTCMConfig(): Promise<TCMConfig | null> {
  try {
    const res = await fetch("/api/tcm/config");
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 格式化时间
 */
export function formatTCMTime(isoString: string): string {
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
