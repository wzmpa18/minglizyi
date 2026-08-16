"use client";

// ============================================================================
// 统一收藏存储 - P1 收敛专项
// 个人中心「我的收藏」统一收纳：排盘 / 解读 / 动态（localStorage 持久化）
// ============================================================================

export type FavoriteType = "paipan" | "interpret" | "moment" | "video" | "other";

export interface FavoriteItem {
  /** 去重键：来源前缀 + 来源 ID，如 "paipan:bazi:1691234567890" */
  id: string;
  type: FavoriteType;
  title: string;
  summary?: string;
  /** 来源工具名（八字/奇门/紫微...） */
  tool?: string;
  /** 点击跳转链接 */
  href?: string;
  tags?: string[];
  createdAt: string;
}

const KEY = "yandao_favorites";

function safeGet(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
  } catch {
    return [];
  }
}

function safeSet(items: FavoriteItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

export function getFavorites(type?: FavoriteType): FavoriteItem[] {
  const items = safeGet();
  const sorted = items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return type ? sorted.filter((i) => i.type === type) : sorted;
}

/** 收藏成功返回 true；已收藏返回 false */
export function addFavorite(item: Omit<FavoriteItem, "createdAt">): boolean {
  const items = safeGet();
  if (items.some((i) => i.id === item.id)) return false;
  items.push({ ...item, createdAt: new Date().toISOString() });
  safeSet(items);
  return true;
}

export function removeFavorite(id: string): void {
  safeSet(safeGet().filter((i) => i.id !== id));
}

export function isFavorited(id: string): boolean {
  return safeGet().some((i) => i.id === id);
}
