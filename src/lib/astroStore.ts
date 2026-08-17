"use client";

// ============================================================================
// 占星星盘存储层 - P6-TOOL-04 §4.2
// 隐私合规：
// - 出生时间/地点为敏感偏好数据，默认私有（isPrivate 强制 true）
// - 分享前必须经用户确认（页面调用前调用 confirmShare）
// - 支持彻底删除（deleteChart / deleteAllCharts 物理移除，不留副本）
// ============================================================================

import type { NatalChartResult } from "@/algorithm-core";

export interface SavedChart {
  id: string;
  title: string;
  /** 默认私有，分享需用户主动确认后临时生成分享快照 */
  isPrivate: boolean;
  chart: NatalChartResult;
  createdAt: string;
  updatedAt: string;
}

const KEY = "yandao_astro_charts";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeGet(): SavedChart[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedChart[]) : [];
  } catch {
    return [];
  }
}

function safeSet(list: SavedChart[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    console.error("[astroStore] 存储失败:", e);
  }
}

function genId(): string {
  return "ac_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function listCharts(): SavedChart[] {
  return safeGet().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export interface SaveChartResult {
  success: boolean;
  error?: string;
  chart?: SavedChart;
}

export function saveChart(title: string, chart: NatalChartResult, maxSaved: number): SaveChartResult {
  if (!title.trim()) return { success: false, error: "请填写星盘名称" };
  if (title.trim().length > 30) return { success: false, error: "名称不能超过30字" };
  const list = safeGet();
  if (list.length >= maxSaved) {
    return { success: false, error: `最多保存 ${maxSaved} 个星盘，请先删除不需要的记录` };
  }
  const now = new Date().toISOString();
  const item: SavedChart = {
    id: genId(),
    title: title.trim(),
    // 隐私红线：新存星盘一律默认私有，禁止默认公开
    isPrivate: true,
    chart,
    createdAt: now,
    updatedAt: now,
  };
  list.push(item);
  safeSet(list);
  return { success: true, chart: item };
}

export function deleteChart(id: string): boolean {
  const list = safeGet().filter((c) => c.id !== id);
  safeSet(list);
  return true;
}

/** 彻底删除全部星盘数据（隐私合规：可删除） */
export function deleteAllCharts(): boolean {
  if (!isBrowser()) return false;
  try {
    localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

/** 分享前用户确认：确认后返回脱敏数据（不携带精确坐标，仅城市名） */
export function buildShareSnapshot(chart: SavedChart): string {
  const c = chart.chart;
  const lines: string[] = [];
  lines.push(`【${chart.title}】本命星盘`);
  lines.push(
    `${c.input.year}-${String(c.input.month).padStart(2, "0")}-${String(c.input.day).padStart(2, "0")} ${
      String(c.input.hour).padStart(2, "0")}:${String(c.input.minute).padStart(2, "0")} · ${c.input.placeName || "出生地未标注"}`
  );
  lines.push(`上升 ${c.ascSignName} · 天顶 ${c.mcSignName}`);
  lines.push(
    c.planets
      .slice(0, 7)
      .map((p) => `${p.name}${p.signName}${Math.floor(p.signDegree)}°`)
      .join(" ")
  );
  if (c.aspects.length > 0) {
    lines.push(`主要相位: ${c.aspects.slice(0, 4).map((a) => `${a.planetA}${a.symbol}${a.planetB}`).join(" ")}`);
  }
  lines.push("—— 内容仅面向文化兴趣娱乐，不构成任何专业建议");
  return lines.join("\n");
}

export function exportAllCharts(): string {
  return JSON.stringify(safeGet(), null, 2);
}
