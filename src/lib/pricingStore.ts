"use client";

// ============================================================================
// 言道国学 - 价格 SSOT 前端消费层（FINAL-ADMIN-COMMERCIAL-SEAL-02 第七章）
// 用户看到的价格优先来自服务端 /api/public/pricing（后台改价实时生效），
// 本地 MEMBERSHIP_PLANS / AI_PAID_PLANS 仅作 fallback（服务端不可达时兜底展示）。
// 正式订单金额一律以服务端返回为准。
// ============================================================================

import { useEffect, useState } from "react";

export interface ServerMembershipPlan {
  level: string;
  name: string;
  price: number;
  originalPrice: number;
  duration: string;
  features: string[];
  badge: string;
  highlighted: boolean;
}

export interface ServerAIPricing {
  singleUnlockPrice: number;
  packages: { id: string; name: string; count: number; price: number; validity: number; enabled: boolean }[];
  timePlans: { key: string; name: string; price: number; duration: string; desc?: string }[];
  tools: { id: string; name: string; enabled: boolean; price: number; category?: string }[];
}

export interface ServerPricing {
  source: string;
  membershipPlans: ServerMembershipPlan[] | null;
  ai: ServerAIPricing | null;
  complianceLabel: string;
  generatedAt: string;
}

// ==================== 内存缓存（COMMERCIAL-CLEANUP-03: 延长TTL到5分钟 + localStorage持久化） ====================

const CACHE_TTL_MS = 5 * 60 * 1000;
const LOCAL_CACHE_KEY = "yandao_pricing_cache";
let cache: { at: number; data: ServerPricing } | null = null;
let inflight: Promise<ServerPricing | null> | null = null;

function getLocalCache(): ServerPricing | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.at && parsed.data && Date.now() - parsed.at < CACHE_TTL_MS) return parsed.data;
    return null;
  } catch { return null; }
}

function setLocalCache(data: ServerPricing): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch { /* ignore */ }
}

export function getCachedPricing(): ServerPricing | null {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
  return getLocalCache();
}

/** 拉取服务端价格 SSOT（带内存缓存；失败返回 null，调用方走本地 fallback） */
export async function fetchServerPricing(force = false): Promise<ServerPricing | null> {
  if (!force) {
    const hit = getCachedPricing();
    if (hit) return hit;
    if (inflight) return inflight;
  }
  inflight = (async () => {
    try {
      const res = await fetch("/api/public/pricing", { headers: { Accept: "application/json" } });
      if (!res.ok) return null;
      const json = await res.json();
      if (json && json.success && json.data) {
        cache = { at: Date.now(), data: json.data as ServerPricing };
        setLocalCache(cache.data);
        return cache.data;
      }
      return null;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// ==================== React Hook ====================

/**
 * 服务端价格 hook：返回 { plans, ai, ready }
 * - plans：服务端会员套餐（无服务端数据时为 null → 调用方用本地 MEMBERSHIP_PLANS）
 * - ai：服务端 AI 价格配置
 */
export function useServerPricing(): {
  plans: ServerMembershipPlan[] | null;
  ai: ServerAIPricing | null;
  ready: boolean;
} {
  const [data, setData] = useState<ServerPricing | null>(() => getCachedPricing());
  const [ready, setReady] = useState(!!getCachedPricing());

  useEffect(() => {
    let alive = true;
    fetchServerPricing().then((d) => {
      if (!alive) return;
      setData(d);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return {
    plans: data?.membershipPlans && data.membershipPlans.length > 0 ? data.membershipPlans : null,
    ai: data?.ai || null,
    ready,
  };
}

/**
 * 合并服务端价格到本地套餐（COMMERCIAL-CLEANUP-03: 优先使用缓存，不无声使用硬编码价格）
 * 用于展示与下单：服务端有该等级就用服务端价格，否则用本地常量。
 * 如果服务端价格不可用且无缓存，返回 null——调用方应显示"价格加载中/请重试"
 */
export function mergePlansWithServer<T extends { level: string; price: number; originalPrice?: number }>(
  localPlans: T[],
  serverPlans: ServerMembershipPlan[] | null
): T[] | null {
  // 优先使用服务端实时数据
  if (serverPlans && serverPlans.length > 0) {
    const serverMap = new Map(serverPlans.map((p) => [p.level, p]));
    return localPlans.map((lp) => {
      const sp = serverMap.get(lp.level);
      if (!sp) return lp;
      return { ...lp, price: sp.price, originalPrice: sp.originalPrice ?? lp.originalPrice };
    });
  }
  // 服务端不可达时使用本地缓存（5分钟TTL + localStorage持久化）
  const cached = getCachedPricing();
  if (cached?.membershipPlans && cached.membershipPlans.length > 0) {
    const serverMap = new Map(cached.membershipPlans.map((p) => [p.level, p]));
    return localPlans.map((lp) => {
      const sp = serverMap.get(lp.level);
      if (!sp) return lp;
      return { ...lp, price: sp.price, originalPrice: sp.originalPrice ?? lp.originalPrice };
    });
  }
  // 无任何价格数据——返回 null，调用方显示"价格加载中/请重试"
  return null;
}

/** 单等级价格查询（服务端优先） */
export function getServerPlanPrice(level: string, fallbackPrice: number): number {
  const cached = getCachedPricing();
  const sp = cached?.membershipPlans?.find((p) => p.level === level);
  return sp ? sp.price : fallbackPrice;
}

/**
 * AI 价格 hook：单次解锁价 + 时卡套餐（服务端优先，调用方传本地常量兜底）
 * 用于 AIInterpretButton / EventDivinationPanel / InterpretationDrawer 等 Paywall 组件
 */
export function useAiPricing(): {
  singleUnlockPrice: number | null;
  timePlans: { key: string; name: string; price: number; duration: string; desc?: string }[] | null;
} {
  const { ai } = useServerPricing();
  return {
    singleUnlockPrice: ai && typeof ai.singleUnlockPrice === "number" && ai.singleUnlockPrice > 0
      ? ai.singleUnlockPrice
      : null,
    timePlans: ai && Array.isArray(ai.timePlans) && ai.timePlans.length > 0 ? ai.timePlans : null,
  };
}
