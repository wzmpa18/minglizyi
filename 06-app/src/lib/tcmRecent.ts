/**
 * 中医模块共享工具 - 最近浏览
 * 用于各模块（中药/方剂/经络/典籍）统一管理最近浏览记录
 */

export type TcmRecentType = "herb" | "formula" | "meridian" | "classic";

export interface TcmRecentItem {
  type: TcmRecentType;
  id: string;
  name: string;
  category?: string;
  time: string;
}

const RECENT_KEY = "zhongyi_recent_items";

export function getRecentItems(): TcmRecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentItem(item: Omit<TcmRecentItem, "time">) {
  if (typeof window === "undefined") return;
  try {
    let items = getRecentItems();
    items = items.filter((i) => !(i.type === item.type && i.id === item.id));
    items.unshift({ ...item, time: new Date().toISOString() });
    items = items.slice(0, 20);
    localStorage.setItem(RECENT_KEY, JSON.stringify(items));
    // 触发自定义事件通知其他组件
    window.dispatchEvent(new CustomEvent("zhongyi-recent-update"));
  } catch {
    // ignore
  }
}

export function clearRecentItems() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_KEY);
  window.dispatchEvent(new CustomEvent("zhongyi-recent-update"));
}
