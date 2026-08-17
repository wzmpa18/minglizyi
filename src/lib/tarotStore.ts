"use client";

// ============================================================================
// 塔罗占卜记录存储层 - P6-补03 第四阶段
// 隐私合规：
// - 占卜问题与结果为敏感偏好数据，默认私有（isPrivate 强制 true）
// - 支持彻底删除（deleteReading / deleteAllReadings 物理移除，不留副本）
// ============================================================================

import type { DrawnCard } from "@/lib/tarotData";

export interface SavedReading {
  id: string;
  title: string;
  question: string;
  spreadId: string;
  spreadName: string;
  cards: DrawnCard[];
  /** 默认私有；塔罗记录不提供公开分享，仅本地留存 */
  isPrivate: boolean;
  createdAt: string;
}

const KEY = "yandao_tarot_readings";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeGet(): SavedReading[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedReading[]) : [];
  } catch {
    return [];
  }
}

function safeSet(list: SavedReading[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    console.error("[tarotStore] 存储失败:", e);
  }
}

function genId(): string {
  return "tr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function listReadings(): SavedReading[] {
  return safeGet().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export interface SaveReadingResult {
  success: boolean;
  error?: string;
  reading?: SavedReading;
}

export function saveReading(
  title: string,
  question: string,
  spreadId: string,
  spreadName: string,
  cards: DrawnCard[],
  maxSaved: number
): SaveReadingResult {
  if (!title.trim()) return { success: false, error: "请填写记录名称" };
  if (title.trim().length > 30) return { success: false, error: "名称不能超过30字" };
  const list = safeGet();
  if (list.length >= maxSaved) {
    return { success: false, error: `最多保存 ${maxSaved} 条记录，请先删除不需要的记录` };
  }
  const item: SavedReading = {
    id: genId(),
    title: title.trim(),
    question: question.trim(),
    spreadId,
    spreadName,
    cards,
    // 隐私红线：新存记录一律默认私有，禁止默认公开
    isPrivate: true,
    createdAt: new Date().toISOString(),
  };
  list.push(item);
  safeSet(list);
  return { success: true, reading: item };
}

export function deleteReading(id: string): boolean {
  safeSet(safeGet().filter((r) => r.id !== id));
  return true;
}

/** 彻底删除全部塔罗记录（隐私合规：可删除） */
export function deleteAllReadings(): boolean {
  if (!isBrowser()) return false;
  try {
    localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
