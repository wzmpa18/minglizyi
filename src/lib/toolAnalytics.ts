"use client";

// ============================================================================
// 统一工具埋点层 - NICHE-TOOLS-08 §88-89 v25.0.68
// ============================================================================
// 事件口径（§88）：tool_open / tool_calculate / tool_complete / tool_save /
//   tool_share / tool_export / tool_error
// 专项口径（§89）：罗盘 sensor_available / sensor_accuracy / true_north_enabled /
//   manual_mode；立极尺 image_import / center_set / overlay_locked / export；
//   七政 chart_generated / profile_used。
// 存储本地（localStorage），按天分桶保留 90 天；后续后台 30 天报表由此口径回灌。
// 红线：仅记录事件计数与匿名维度值，不含任何用户身份与户型图数据（§72 隐私）。
// ============================================================================

export type ToolEvent =
  | "tool_open"
  | "tool_calculate"
  | "tool_complete"
  | "tool_save"
  | "tool_share"
  | "tool_export"
  | "tool_error"
  | "sensor_available"
  | "sensor_accuracy"
  | "true_north_enabled"
  | "manual_mode"
  | "image_import"
  | "center_set"
  | "overlay_locked"
  | "profile_switch"
  | "ring_toggle"
  | "dial_zoom"
  | "chart_generated"
  | "profile_used";

export const TOOL_ANALYTICS_VERSION = "tool-analytics-v1.0.0";

const STORE_KEY = "yandao_tool_analytics_v1";
const MAX_DAYS = 90;

interface DayBucket { [day: string]: number }
interface EventBucket { total: number; daily: DayBucket; lastAt: string }
interface ToolBucket { [event: string]: EventBucket }
interface AnalyticsStore { version: string; tools: { [tool: string]: ToolBucket } }

function emptyStore(): AnalyticsStore {
  return { version: TOOL_ANALYTICS_VERSION, tools: {} };
}

function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function loadStore(): AnalyticsStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    const s = JSON.parse(raw) as AnalyticsStore;
    if (!s || typeof s !== "object" || !s.tools) return emptyStore();
    return s;
  } catch {
    return emptyStore();
  }
}

function pruneDaily(bucket: EventBucket): void {
  const days = Object.keys(bucket.daily).sort();
  while (days.length > MAX_DAYS) {
    delete bucket.daily[days.shift()!];
  }
}

function persist(store: AnalyticsStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch { /* 配额满：丢弃最新一次写入，不影响功能主流程 */ }
}

/**
 * 记录一次工具事件。
 * @param tool 工具标识：compass / liji / luban / qizheng …
 * @param event 事件名（统一+专项）
 * @param dimensions 可选匿名维度（如 { level: "high" }），仅合并进 lastDetail 供排查
 */
export function trackToolEvent(
  tool: string,
  event: ToolEvent,
  dimensions?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;
  const store = loadStore();
  const toolBucket = (store.tools[tool] ||= {});
  const evt = (toolBucket[event] ||= { total: 0, daily: {}, lastAt: "" });
  const day = todayKey();
  evt.total += 1;
  evt.daily[day] = (evt.daily[day] || 0) + 1;
  evt.lastAt = new Date().toISOString();
  if (dimensions && Object.keys(dimensions).length > 0) {
    // 仅保留最近一次维度快照（匿名、不含图纸/身份），用于传感器状态等排查
    (evt as EventBucket & { lastDetail?: Record<string, unknown> }).lastDetail = { ...dimensions };
  }
  pruneDaily(evt);
  persist(store);
}

/** 最近 n 天汇总（默认 30，供后台/运营报表） */
export interface ToolAnalyticsSummary {
  tool: string;
  events: Array<{ event: string; total: number; last30: number; lastAt: string }>;
}

export function getToolAnalyticsSummary(days = 30): ToolAnalyticsSummary[] {
  const store = loadStore();
  const now = Date.now();
  const cutoff = now - days * 86400000;
  return Object.entries(store.tools).map(([tool, bucket]) => ({
    tool,
    events: Object.entries(bucket).map(([event, evt]) => {
      let last30 = 0;
      for (const [day, count] of Object.entries(evt.daily)) {
        if (new Date(`${day}T00:00:00`).getTime() >= cutoff) last30 += count;
      }
      return { event, total: evt.total, last30, lastAt: evt.lastAt };
    }),
  }));
}

/** 工具打开计数（简易读取） */
export function getToolOpenCount(tool: string): number {
  const store = loadStore();
  return store.tools[tool]?.tool_open?.total ?? 0;
}
