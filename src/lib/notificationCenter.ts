"use client";

// ============================================================================
// 统一系统通知中心 - P6-TOOL-04
// 平台统一站内消息底层：所有模块（记事提醒、订单、AI报告、审核、告警）
// 的站内通知一律写入本中心，禁止各模块私建消息通道。
// 存储：localStorage（按 userId 隔离）
// ============================================================================

import { getClientUserId } from "./auth";

// ==================== 类型定义 ====================

export type NotificationCategory =
  | "reminder" // 记事提醒
  | "order" // 订单/支付
  | "ai_report" // AI 报告生成结果
  | "audit" // 审核/治理
  | "growth" // 奖励/邀请
  | "system"; // 系统公告

export interface SystemNotification {
  id: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** 可选跳转链接（站内路由） */
  linkTo?: string;
  /** 业务幂等键：同键重复写入自动去重 */
  idempotentKey?: string;
  read: boolean;
  createdAt: string;
}

export const CATEGORY_META: Record<NotificationCategory, { label: string; icon: string; color: string }> = {
  reminder: { label: "记事提醒", icon: "⏰", color: "#7B2FBE" },
  order: { label: "订单", icon: "🧾", color: "#0284c7" },
  ai_report: { label: "AI 报告", icon: "✨", color: "#d97706" },
  audit: { label: "审核", icon: "🛡️", color: "#10b981" },
  growth: { label: "奖励", icon: "🎁", color: "#ec4899" },
  system: { label: "系统", icon: "📢", color: "#6b7280" },
};

// ==================== 存储 ====================

const KEY_PREFIX = "yandao_notifications_";
const MAX_KEEP = 300;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function key(): string {
  return KEY_PREFIX + getClientUserId();
}

function safeGet(): SystemNotification[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(key());
    return raw ? (JSON.parse(raw) as SystemNotification[]) : [];
  } catch {
    return [];
  }
}

function safeSet(list: SystemNotification[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key(), JSON.stringify(list.slice(-MAX_KEEP)));
  } catch (e) {
    console.error("[notificationCenter] 存储失败:", e);
  }
}

function genId(): string {
  return "nt_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ==================== API ====================

export interface AddNotificationInput {
  category: NotificationCategory;
  title: string;
  body: string;
  linkTo?: string;
  idempotentKey?: string;
}

/** 写入一条系统通知（幂等：同 idempotentKey 已存在则跳过并返回 false） */
export function addNotification(input: AddNotificationInput): { success: boolean; deduped?: boolean; notification?: SystemNotification } {
  if (!input.title || !input.body) return { success: false };
  const list = safeGet();
  if (input.idempotentKey && list.some((n) => n.idempotentKey === input.idempotentKey)) {
    return { success: true, deduped: true };
  }
  const n: SystemNotification = {
    id: genId(),
    userId: getClientUserId(),
    category: input.category,
    title: input.title,
    body: input.body,
    linkTo: input.linkTo,
    idempotentKey: input.idempotentKey,
    read: false,
    createdAt: new Date().toISOString(),
  };
  list.push(n);
  safeSet(list);
  return { success: true, notification: n };
}

export function listNotifications(): SystemNotification[] {
  return safeGet().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getUnreadCount(): number {
  return safeGet().filter((n) => !n.read).length;
}

export function markRead(id: string): void {
  const list = safeGet();
  const n = list.find((x) => x.id === id);
  if (n) {
    n.read = true;
    safeSet(list);
  }
}

export function markAllRead(): void {
  const list = safeGet();
  for (const n of list) n.read = true;
  safeSet(list);
}

export function deleteNotification(id: string): void {
  safeSet(safeGet().filter((n) => n.id !== id));
}

export function clearAllNotifications(): void {
  safeSet([]);
}

/** 订阅变更（简易事件，供角标实时刷新） */
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribeNotifications(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// 原始写操作后广播（简单实现：包装 safeSet 调用点后手动触发）
function notifyChanged(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

export function addNotificationAndNotify(input: AddNotificationInput): void {
  addNotification(input);
  notifyChanged();
}

export function notifyNotificationChanged(): void {
  notifyChanged();
}
