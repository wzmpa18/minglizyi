"use client";

/**
 * 公开功能开关镜像读取 - v25.0.71
 * 数据源：GET /api/public/feature-flags（featureControlRoutes.js 公开只读接口）
 * 后台 SUPER_ADMIN 修改开关后，前端按此镜像过滤渲染（如七政断语六节）。
 * 拉取失败按全开处理（开关服务故障不阻断排盘功能，fail-open）。
 */

let cache: { at: number; flags: Record<string, string> } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function fetchFeatureFlags(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.flags;
  try {
    const res = await fetch("/api/public/feature-flags", { cache: "no-store" });
    const j = await res.json();
    if (j?.success && j?.data?.flags && typeof j.data.flags === "object") {
      cache = { at: Date.now(), flags: j.data.flags as Record<string, string> };
      return cache.flags;
    }
  } catch { /* 网络失败 → 全开兜底 */ }
  return cache?.flags ?? {};
}

/** 判断开关是否放行（无记录=ON；OFF/MAINTENANCE 拦截） */
export function flagOn(flags: Record<string, string> | null | undefined, key: string): boolean {
  if (!flags) return true;
  const v = flags[key];
  return v !== "OFF" && v !== "MAINTENANCE";
}
