"use client";

// ============================================================================
// OfflineSyncClient — 离线事件队列（FINAL-MASTER-05 第六十三~六十五章）
//
// 设计：
//   - 每个事件生成 eventId（crypto.randomUUID）+ clientCreatedAt
//   - 断网/未登录时入队（存 USER_PRIVATE_DATA 分区——第六十九章红线：
//     未同步队列绝对禁止自动清理）
//   - 联网时批量冲刷 POST /api/offline/sync
//   - 服务端 event_id UNIQUE 幂等：重复提交只处理一次（第六十五章），
//     客户端收到 ALREADY_PROCESSED 同样视为成功并出队
//   - 网络恢复（window online）自动冲刷
//
// 用途：离线做题（错题/成绩）、学习打卡、进度、收藏变更。
// ============================================================================

import { get, put } from "./storageManager";

export type SyncEventType =
  | "ACADEMY_CHECKIN"
  | "ACADEMY_PROGRESS"
  | "EXAM_SUBMIT"
  | "FAVORITE_TOGGLE"
  | "WRONG_ANSWER_MARK"
  | "NOTE_EDIT";

export interface QueuedEvent {
  eventId: string;
  eventType: SyncEventType;
  payload: Record<string, unknown>;
  clientCreatedAt: string;    // ISO
  enqueueAt: number;
  attempts: number;
}

const QUEUE_KEY = "offline_sync_queue";
const MAX_QUEUE = 500;
const MAX_ATTEMPTS = 5;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const FLUSH_LOCK_KEY = "offline_sync_flush_lock";

function genEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "evt-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }
}

async function loadQueue(): Promise<QueuedEvent[]> {
  return (await get<QueuedEvent[]>("USER_PRIVATE_DATA", QUEUE_KEY)) || [];
}

async function saveQueue(q: QueuedEvent[]): Promise<void> {
  await put("USER_PRIVATE_DATA", QUEUE_KEY, q);
}

/** 生成一个待同步事件（立即尝试冲刷，失败自动留在队列） */
export async function emitEvent(eventType: SyncEventType, payload: Record<string, unknown>): Promise<QueuedEvent> {
  const ev: QueuedEvent = {
    eventId: genEventId(),
    eventType,
    payload,
    clientCreatedAt: new Date().toISOString(),
    enqueueAt: Date.now(),
    attempts: 0,
  };
  const q = await loadQueue();
  q.push(ev);
  // 队列上限保护：最老的先淘汰（避免无限膨胀；已同步的正常出队不会触发）
  if (q.length > MAX_QUEUE) q.splice(0, q.length - MAX_QUEUE);
  await saveQueue(q);
  void flushQueue().catch(() => { /* 冲刷失败留在队列 */ });
  return ev;
}

export async function queueSize(): Promise<number> {
  return (await loadQueue()).length;
}

export interface FlushResult {
  flushed: number;
  remained: number;
  error?: string;
}

/**
 * 冲刷队列（登录态 + 联网时调用）。
 * 服务端幂等保证：即使重复提交，同一 eventId 也只入账一次。
 */
export async function flushQueue(): Promise<FlushResult> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("access_token") : "";
  if (!token) return { flushed: 0, remained: await queueSize(), error: "未登录" };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { flushed: 0, remained: await queueSize(), error: "离线" };
  }

  // 简单并发锁：避免 online 事件与业务调用双触发
  const lock = await get<number>("TEMP_CACHE", FLUSH_LOCK_KEY);
  if (lock && Date.now() - lock < 30000) return { flushed: 0, remained: await queueSize(), error: "上次冲刷进行中" };
  await put("TEMP_CACHE", FLUSH_LOCK_KEY, Date.now(), { ttlMs: 60000 });

  try {
    const q = await loadQueue();
    if (!q.length) return { flushed: 0, remained: 0 };

    const batch = q.slice(0, 100);
    const res = await fetch(`${API_BASE}/api/offline/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        events: batch.map(e => ({
          eventId: e.eventId, eventType: e.eventType, payload: e.payload, clientCreatedAt: e.clientCreatedAt,
        })),
      }),
    });
    if (!res.ok) return { flushed: 0, remained: q.length, error: `HTTP ${res.status}` };
    const json = await res.json();
    if (!json?.success) return { flushed: 0, remained: q.length, error: json?.error };

    // 成功（含 ALREADY_PROCESSED 幂等确认）→ 出队；超限失败次数的丢弃防死循环
    const confirmedIds = new Set<string>((json.data?.results || []).map((r: { eventId: string; status: string }) =>
      r.status === "PROCESSED" || r.status === "ALREADY_PROCESSED" ? r.eventId : null).filter(Boolean));
    const rest: QueuedEvent[] = [];
    for (const e of q) {
      if (confirmedIds.has(e.eventId)) continue;
      e.attempts++;
      if (e.attempts < MAX_ATTEMPTS) rest.push(e);   // 服务端标 INVALID 的会在第 MAX_ATTEMPTS 次后丢弃
    }
    await saveQueue(rest);
    return { flushed: confirmedIds.size, remained: rest.length };
  } catch (e) {
    return { flushed: 0, remained: await queueSize(), error: (e as Error).message };
  } finally {
    await put("TEMP_CACHE", FLUSH_LOCK_KEY, Date.now() - 60000, { ttlMs: 1000 });  // 释放锁
  }
}

/** 网络恢复自动冲刷（在 APP 入口调用一次） */
export function installAutoFlush(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => { void flushQueue().catch(() => {}); });
  // 启动后延迟冲刷一次（避免与启动关键路径竞争）
  setTimeout(() => { void flushQueue().catch(() => {}); }, 5000);
}
