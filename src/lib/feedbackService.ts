/**
 * ============================================================================
 * 用户反馈服务 - v20.4
 * ============================================================================
 *
 * 用户反馈APP问题的提交与查询服务
 * 反馈数据保存到服务器 /data/feedback/ 目录
 *
 * 创建日期：2026-08-11
 * ============================================================================
 */

"use client";

// ==================== 类型定义 ====================

export type FeedbackType =
  | "bug"          // 功能bug
  | "crash"       // 闪退/崩溃
  | "suggestion"  // 功能建议
  | "complaint"   // 投诉
  | "other";      // 其他

export type FeedbackStatus = "pending" | "processing" | "resolved" | "closed";

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  type: FeedbackType;
  title: string;
  description: string;
  contact?: string;
  deviceInfo?: string;
  appVersion?: string;
  screenshots?: string[]; // base64 截图数组
  status: FeedbackStatus;
  createdAt: string;
  adminReply?: string;
  repliedAt?: string;
}

// ==================== 类型标签配置 ====================

export const FEEDBACK_TYPES: Array<{
  value: FeedbackType;
  label: string;
  icon: string;
  color: string;
}> = [
  { value: "bug", label: "功能异常", icon: "\u{1F41B}", color: "#e74c3c" },
  { value: "crash", label: "闪退/崩溃", icon: "\u{1F4A5}", color: "#e67e22" },
  { value: "suggestion", label: "功能建议", icon: "\u{1F4A1}", color: "#3498db" },
  { value: "complaint", label: "内容投诉", icon: "\u{26A0}\u{FE0F}", color: "#f39c12" },
  { value: "other", label: "其他问题", icon: "\u{1F4AC}", color: "#95a5a6" },
];

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: "待处理",
  processing: "处理中",
  resolved: "已解决",
  closed: "已关闭",
};

// ==================== 存储键 ====================

const LOCAL_HISTORY_KEY = "yandao_feedback_history";

// ==================== 前端接口 ====================

/**
 * 提交反馈（前端调用）
 */
export async function submitFeedback(
  feedback: Omit<Feedback, "id" | "status" | "createdAt">
): Promise<{ success: boolean; message: string; feedbackId?: string }> {
  try {
    const response = await fetch("/api/feedback/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedback),
    });

    const data = await response.json();

    if (data.success) {
      // 保存到本地历史
      saveLocalHistory({
        ...feedback,
        id: data.feedbackId,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        message: "反馈已提交，我们会尽快处理",
        feedbackId: data.feedbackId,
      };
    }

    // 网络失败时保存到本地待重试
    saveLocalHistory({
      ...feedback,
      id: `local_${Date.now()}`,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return { success: false, message: data.error || "提交失败，已保存到本地" };
  } catch (error: any) {
    // 网络错误，保存到本地
    saveLocalHistory({
      ...feedback,
      id: `local_${Date.now()}`,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return { success: false, message: "网络异常，反馈已保存到本地，稍后可重试" };
  }
}

/**
 * 获取用户反馈历史（前端）
 */
export async function getUserFeedbacks(userId: string): Promise<Feedback[]> {
  try {
    const response = await fetch(`/api/feedback/list?userId=${userId}`);
    const data = await response.json();
    if (data.success && data.feedbacks) {
      return data.feedbacks;
    }
  } catch {}
  // 降级到本地存储
  return getLocalHistory();
}

// ==================== 本地存储 ====================

function saveLocalHistory(feedback: Feedback): void {
  if (typeof window === "undefined") return;
  try {
    const history = getLocalHistory();
    history.unshift(feedback);
    // 只保留最近50条
    const trimmed = history.slice(0, 50);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}

function getLocalHistory(): Feedback[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 获取设备信息
 */
export function getDeviceInfo(): string {
  if (typeof window === "undefined") return "";
  const ua = navigator.userAgent;
  let browser = "未知浏览器";
  let os = "未知系统";

  if (ua.includes("MicroMessenger")) browser = "微信内置浏览器";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";

  if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";

  const screenWidth = window.screen?.width || 0;
  const screenHeight = window.screen?.height || 0;

  return `${os} / ${browser} / ${screenWidth}x${screenHeight}`;
}

/**
 * 获取APP版本
 */
export function getAppVersion(): string {
  if (typeof window === "undefined") return "";
  const capacitor = (window as any).capacitor;
  if (capacitor?.getInfo) {
    return "APP v1.1.0";
  }
  return "Web版";
}
