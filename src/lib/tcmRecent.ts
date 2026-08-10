/**
 * 中医模块共享工具 - 最近浏览 & 内容缓存 v2.0
 * 用于各模块（中药/方剂/经络/穴位/典籍）统一管理最近浏览记录
 * v2.0: 新增穴位类型、高频内容缓存机制（带TTL）、问诊结果缓存
 */

export type TcmRecentType = "herb" | "formula" | "meridian" | "classic" | "acupoint" | "diagnosis";

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

// ==================== 高频内容缓存机制 ====================
// 缓存穴位、方剂、典籍等高频访问内容，减少重复计算/请求
// 带TTL过期机制，默认7天

const CONTENT_CACHE_KEY = "zhongyi_content_cache";
const DEFAULT_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7天

interface CachedContent<T> {
  data: T;
  cachedAt: number;
  ttl: number;
}

type ContentCacheStore = Record<string, CachedContent<unknown>>;

function getContentCache(): ContentCacheStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CONTENT_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveContentCache(cache: ContentCacheStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // 存储空间不足时清理过期条目后重试
    try {
      const cleaned = cleanExpiredContentCache();
      if (cleaned > 0) {
        localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(getContentCache()));
      }
    } catch {
      // ignore
    }
  }
}

/** 生成缓存键：类型 + ID */
function cacheKey(type: TcmRecentType, id: string): string {
  return `${type}::${id}`;
}

/**
 * 从缓存获取高频内容
 * @param type 内容类型
 * @param id 内容ID
 * @returns 缓存的数据，未命中或已过期返回 null
 */
export function getCachedContent<T>(type: TcmRecentType, id: string): T | null {
  if (typeof window === "undefined") return null;
  const cache = getContentCache();
  const key = cacheKey(type, id);
  const entry = cache[key];
  if (!entry) return null;
  // 检查是否过期
  if (Date.now() - entry.cachedAt > entry.ttl) {
    delete cache[key];
    saveContentCache(cache);
    return null;
  }
  return entry.data as T;
}

/**
 * 将高频内容写入缓存
 * @param type 内容类型
 * @param id 内容ID
 * @param data 要缓存的数据
 * @param ttl 缓存有效期（毫秒），默认7天
 */
export function setCachedContent<T>(
  type: TcmRecentType,
  id: string,
  data: T,
  ttl: number = DEFAULT_CACHE_TTL
): void {
  if (typeof window === "undefined") return;
  const cache = getContentCache();
  const key = cacheKey(type, id);
  cache[key] = { data, cachedAt: Date.now(), ttl };
  saveContentCache(cache);
}

/**
 * 获取缓存内容，如果未命中则执行 fetchFn 获取并缓存
 * @param type 内容类型
 * @param id 内容ID
 * @param fetchFn 未命中时的获取函数
 * @param ttl 缓存有效期（毫秒），默认7天
 */
export async function getOrFetchContent<T>(
  type: TcmRecentType,
  id: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_CACHE_TTL
): Promise<T> {
  // 先查缓存
  const cached = getCachedContent<T>(type, id);
  if (cached !== null) return cached;
  // 缓存未命中，执行获取
  const data = await fetchFn();
  setCachedContent(type, id, data, ttl);
  return data;
}

/**
 * 同步版本：获取缓存内容，如果未命中则执行 fetchFn 获取并缓存
 */
export function getOrFetchContentSync<T>(
  type: TcmRecentType,
  id: string,
  fetchFn: () => T,
  ttl: number = DEFAULT_CACHE_TTL
): T {
  const cached = getCachedContent<T>(type, id);
  if (cached !== null) return cached;
  const data = fetchFn();
  setCachedContent(type, id, data, ttl);
  return data;
}

/** 清除指定内容的缓存 */
export function removeCachedContent(type: TcmRecentType, id: string): void {
  if (typeof window === "undefined") return;
  const cache = getContentCache();
  const key = cacheKey(type, id);
  if (cache[key]) {
    delete cache[key];
    saveContentCache(cache);
  }
}

/** 清除所有过期的内容缓存条目 */
export function cleanExpiredContentCache(): number {
  if (typeof window === "undefined") return 0;
  const cache = getContentCache();
  let cleaned = 0;
  for (const key of Object.keys(cache)) {
    const entry = cache[key];
    if (Date.now() - entry.cachedAt > entry.ttl) {
      delete cache[key];
      cleaned++;
    }
  }
  if (cleaned > 0) {
    saveContentCache(cache);
  }
  return cleaned;
}

/** 清除全部内容缓存 */
export function clearAllContentCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONTENT_CACHE_KEY);
}

/** 获取缓存统计信息 */
export function getCacheStats(): { total: number; expired: number } {
  if (typeof window === "undefined") return { total: 0, expired: 0 };
  const cache = getContentCache();
  let expired = 0;
  for (const key of Object.keys(cache)) {
    if (Date.now() - cache[key].cachedAt > cache[key].ttl) {
      expired++;
    }
  }
  return { total: Object.keys(cache).length, expired };
}
