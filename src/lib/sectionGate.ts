"use client";

// ============================================================================
// 工具/知识板块开放程度门控 - v25.0.47_12（中医板块知识开放程度控制）
// 数据源：服务端工具矩阵 SSOT（GET /api/public/tool-matrix，后台「工具管理中心」实时可调）
//   status: ON 开放 / OFF 关闭 / MAINTENANCE 维护
//   payMode+memberLevel: FREE 全员 / MEMBERSHIP 会员档位专享
// 断网/接口异常时放行（fail-open），矩阵正常返回时强制生效
// ============================================================================

import { useEffect, useState } from "react";
import { getMembershipStatus } from "./membershipStore";

export interface ToolMatrixEntry {
  name: string;
  status: "ON" | "OFF" | "MAINTENANCE" | string;
  payMode: "FREE" | "MEMBERSHIP" | "ONE_TIME" | "AI_CREDIT" | "DISABLED" | string;
  price: number;
  memberLevel: string;
  aiEnabled?: boolean;
  dailyLimit?: number;
  shareEnabled?: boolean;
}

export type ToolMatrixMap = Record<string, ToolMatrixEntry>;

export interface SectionGateInfo {
  /** 矩阵加载中（显示加载态，不渲染内容） */
  loading: boolean;
  /** 是否允许访问 */
  allowed: boolean;
  status: string;
  payMode: string;
  memberLevel: string;
  /** 需要的会员档位中文名（会员专享时） */
  needLevelName: string | null;
  /** 拦截原因（面向用户展示） */
  reason: string;
}

const CACHE_KEY = "yandao_tool_matrix_cache";
const CACHE_TTL_MS = 2 * 60 * 1000;

const LEVEL_ORDER: Record<string, number> = {
  basic: 0,
  monthly: 1,
  quarterly: 2,
  yearly: 3,
  lifetime: 4,
};

const LEVEL_NAMES: Record<string, string> = {
  basic: "普通用户",
  monthly: "月度会员",
  quarterly: "季度会员",
  yearly: "年度会员",
  lifetime: "终身会员",
};

const ALLOWED_DEFAULT: SectionGateInfo = {
  loading: false,
  allowed: true,
  status: "ON",
  payMode: "FREE",
  memberLevel: "basic",
  needLevelName: null,
  reason: "",
};

function readCache(): { tools: ToolMatrixMap; ts: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.tools && Date.now() - (data.ts || 0) < CACHE_TTL_MS) return data;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(tools: ToolMatrixMap) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ tools, ts: Date.now() }));
  } catch {
    /* ignore */
  }
}

let inflight: Promise<ToolMatrixMap | null> | null = null;

/** 拉取公开工具矩阵（带会话级缓存与并发去重） */
export function fetchToolMatrixPublic(): Promise<ToolMatrixMap | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const cached = readCache();
  if (cached) return Promise.resolve(cached.tools);
  if (inflight) return inflight;
  inflight = fetch("/api/public/tool-matrix")
    .then((r) => r.json())
    .then((json) => {
      const tools = json && json.success && json.data && json.data.tools ? json.data.tools : null;
      if (tools) writeCache(tools);
      return tools;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** 判定单个板块的开放程度 */
export function evaluateSectionGate(entry: ToolMatrixEntry | undefined): SectionGateInfo {
  if (!entry) return { ...ALLOWED_DEFAULT };
  const status = entry.status || "ON";
  if (status === "OFF") {
    return { ...ALLOWED_DEFAULT, allowed: false, status, reason: "该板块内容暂已下线，敬请期待后续更新" };
  }
  if (status === "MAINTENANCE") {
    return { ...ALLOWED_DEFAULT, allowed: false, status, reason: "该板块正在升级维护中，稍后即可恢复访问" };
  }
  const payMode = entry.payMode || "FREE";
  const needLevel = entry.memberLevel || "basic";
  if ((payMode === "MEMBERSHIP" || payMode === "AI_CREDIT" || payMode === "ONE_TIME") && (LEVEL_ORDER[needLevel] || 0) > 0) {
    const userLevel = getMembershipStatus().level;
    if ((LEVEL_ORDER[userLevel] || 0) < (LEVEL_ORDER[needLevel] || 0)) {
      return {
        ...ALLOWED_DEFAULT,
        allowed: false,
        status,
        payMode,
        memberLevel: needLevel,
        needLevelName: LEVEL_NAMES[needLevel] || needLevel,
        reason: `该内容为${LEVEL_NAMES[needLevel] || needLevel}专享，开通会员即可解锁全部中医学习内容`,
      };
    }
  }
  return { ...ALLOWED_DEFAULT, status, payMode, memberLevel: needLevel };
}

/** 页面级门控钩子：按矩阵条目判定当前用户能否访问 */
export function useSectionGate(toolId: string): SectionGateInfo {
  const [info, setInfo] = useState<SectionGateInfo>({ ...ALLOWED_DEFAULT, loading: true });

  useEffect(() => {
    let mounted = true;
    fetchToolMatrixPublic().then((tools) => {
      if (!mounted) return;
      if (!tools) {
        // 接口不可用（离线/后端异常）：放行，不阻断正常使用
        setInfo({ ...ALLOWED_DEFAULT });
        return;
      }
      setInfo(evaluateSectionGate(tools[toolId]));
    });
    return () => {
      mounted = false;
    };
  }, [toolId]);

  return info;
}

/** 整表矩阵钩子（中医主页等需要一次判多个板块的页面用） */
export function useToolMatrix(): { loading: boolean; tools: ToolMatrixMap } {
  const [state, setState] = useState<{ loading: boolean; tools: ToolMatrixMap }>({ loading: true, tools: {} });
  useEffect(() => {
    let mounted = true;
    fetchToolMatrixPublic().then((tools) => {
      if (mounted) setState({ loading: false, tools: tools || {} });
    });
    return () => {
      mounted = false;
    };
  }, []);
  return state;
}
