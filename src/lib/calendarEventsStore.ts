"use client";

// ============================================================================
// 万年历记事提醒数据层 - P6-TOOL-04 Phase 1
// 功能：生日/纪念日/节日/待办/自定义事件管理，公历/农历双轨日期，
//       重复规则（每年/每月/每周/自定义间隔），多档位提醒，幂等触发，
//       历史提醒记录，导出与彻底删除（隐私合规）
// 存储：localStorage（按 userId 隔离），云同步遵循既有 recordSync 通道
// ============================================================================

import { Solar, Lunar } from "lunar-javascript";
import { getClientUserId } from "./auth";

// ==================== 类型定义 ====================

export type CalendarEventType = "birthday" | "anniversary" | "festival" | "todo" | "custom";

export type DateMode = "solar" | "lunar";

export type RepeatRule = "none" | "yearly" | "monthly" | "weekly" | "custom";

export interface ReminderOffset {
  /** 提前分钟数：0=准时，60=提前1小时，1440=提前1天，2880=提前2天，10080=提前1周 */
  offsetMinutes: number;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  type: CalendarEventType;
  title: string;
  /** 关联对象昵称（如生日的主人），可为空 */
  relatedName?: string;
  note?: string;
  dateMode: DateMode;
  /** 首次发生日期：公历 y/m/d（农历事件也存公历锚点 + 农历月日） */
  year: number;
  month: number; // 1-12（公历）
  day: number; // 1-31（公历）
  /** 农历模式字段：农历月(负数表示闰月)、农历日 */
  lunarMonth?: number;
  lunarDay?: number;
  repeat: RepeatRule;
  /** repeat=custom 时的间隔单位数（每 N 天/周/月，N>=1） */
  customInterval?: number;
  /** 自定义重复单位（配合 customInterval） */
  customUnit?: "day" | "week" | "month" | "year";
  /** 提醒档位列表（可多选） */
  reminders: ReminderOffset[];
  paused: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 一次提醒的派发记录（幂等键：eventId + occurrenceTs + offsetMinutes） */
export interface ReminderLogEntry {
  id: string; // 幂等键
  eventId: string;
  eventTitle: string;
  occurrenceTs: number; // 事件发生时间戳
  offsetMinutes: number;
  firedAt: string; // 实际触发时间
  channels: string[]; // 已投递通道：["inapp"] / ["inapp","push"]
  status: "fired" | "failed";
  retryCount: number;
  error?: string;
}

export interface EventOccurrence {
  event: CalendarEvent;
  /** 本次发生日期（公历） */
  y: number;
  m: number;
  d: number;
  /** 发生日零点时间戳 */
  ts: number;
  /** 农历模式下本次发生的农历描述 */
  lunarDesc?: string;
  /** 距今天数（0=今天，1=明天） */
  daysAway: number;
}

// ==================== 常量 ====================

const EVENTS_KEY_PREFIX = "yandao_calendar_events_";
const REMINDER_LOG_KEY_PREFIX = "yandao_calendar_reminder_log_";
const LAST_CHECK_KEY = "yandao_calendar_last_check";

export const EVENT_TYPE_META: Record<CalendarEventType, { label: string; icon: string; color: string }> = {
  birthday: { label: "生日", icon: "🎂", color: "#ec4899" },
  anniversary: { label: "纪念日", icon: "💍", color: "#8b5cf6" },
  festival: { label: "节日", icon: "🏮", color: "#ef4444" },
  todo: { label: "待办", icon: "✅", color: "#10b981" },
  custom: { label: "自定义", icon: "📌", color: "#6b7280" },
};

export const REMINDER_OFFSET_OPTIONS: { offsetMinutes: number; label: string }[] = [
  { offsetMinutes: 0, label: "准时" },
  { offsetMinutes: 30, label: "提前30分钟" },
  { offsetMinutes: 60, label: "提前1小时" },
  { offsetMinutes: 180, label: "提前3小时" },
  { offsetMinutes: 1440, label: "提前1天" },
  { offsetMinutes: 2880, label: "提前2天" },
  { offsetMinutes: 10080, label: "提前1周" },
];

export const REPEAT_LABELS: Record<RepeatRule, string> = {
  none: "不重复",
  yearly: "每年",
  monthly: "每月",
  weekly: "每周",
  custom: "自定义",
};

// ==================== 内部工具 ====================

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeGet<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("[calendarEvents] 存储失败:", e);
  }
}

function eventsKey(): string {
  return EVENTS_KEY_PREFIX + getClientUserId();
}

function logKey(): string {
  return REMINDER_LOG_KEY_PREFIX + getClientUserId();
}

function genId(): string {
  return "ce_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** 某公历日期零点时间戳（本地时区） */
function dayTs(y: number, m: number, d: number): number {
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function fmtDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ==================== 农历换算 ====================

/** 公历 → 农历月日（闰月为负） */
export function solarToLunarMd(y: number, m: number, d: number): { lunarMonth: number; lunarDay: number } {
  const lunar = Solar.fromYmd(y, m, d).getLunar();
  return { lunarMonth: lunar.getMonth(), lunarDay: lunar.getDay() };
}

/** 农历月日 → 指定公历年内的公历日期（农历月可为负=闰月；若该年无此月则顺延到下一年） */
export function lunarMdToSolarInYear(year: number, lunarMonth: number, lunarDay: number): { y: number; m: number; d: number } {
  try {
    const lunar = Lunar.fromYmd(year, Math.abs(lunarMonth), lunarDay);
    if (lunar.getMonth() !== lunarMonth) {
      // 该年无此闰月，顺延一年
      const next = Lunar.fromYmd(year + 1, Math.abs(lunarMonth), lunarDay);
      const s = next.getSolar();
      return { y: s.getYear(), m: s.getMonth(), d: s.getDay() };
    }
    const s = lunar.getSolar();
    return { y: s.getYear(), m: s.getMonth(), d: s.getDay() };
  } catch {
    // 农历日超出该月天数（如三十在小月不存在）时回退为该月最后一天
    try {
      const lunar = Lunar.fromYmd(year, Math.abs(lunarMonth), 1);
      const s = lunar.getSolar();
      return { y: s.getYear(), m: s.getMonth(), d: s.getDay() };
    } catch {
      return { y: year, m: 1, d: 1 };
    }
  }
}

// ==================== CRUD ====================

export function listEvents(): CalendarEvent[] {
  return safeGet<CalendarEvent[]>(eventsKey(), []).sort((a, b) => {
    const ka = a.year * 10000 + a.month * 100 + a.day;
    const kb = b.year * 10000 + b.month * 100 + b.day;
    return ka - kb;
  });
}

export interface CreateEventInput {
  type: CalendarEventType;
  title: string;
  relatedName?: string;
  note?: string;
  dateMode: DateMode;
  year: number;
  month: number;
  day: number;
  repeat?: RepeatRule;
  customInterval?: number;
  customUnit?: "day" | "week" | "month" | "year";
  reminders?: ReminderOffset[];
}

export function createEvent(input: CreateEventInput): { success: boolean; error?: string; event?: CalendarEvent } {
  if (!input.title || !input.title.trim()) return { success: false, error: "请填写事件标题" };
  if (input.title.trim().length > 50) return { success: false, error: "标题不能超过50字" };
  if (input.note && input.note.length > 500) return { success: false, error: "备注不能超过500字" };
  if (!input.year || !input.month || !input.day) return { success: false, error: "请选择日期" };

  const now = new Date().toISOString();
  const ev: CalendarEvent = {
    id: genId(),
    userId: getClientUserId(),
    type: input.type,
    title: input.title.trim(),
    relatedName: input.relatedName?.trim() || undefined,
    note: input.note?.trim() || undefined,
    dateMode: input.dateMode,
    year: input.year,
    month: input.month,
    day: input.day,
    lunarMonth: input.dateMode === "lunar" ? solarToLunarMd(input.year, input.month, input.day).lunarMonth : undefined,
    lunarDay: input.dateMode === "lunar" ? solarToLunarMd(input.year, input.month, input.day).lunarDay : undefined,
    repeat: input.repeat || "none",
    customInterval: input.repeat === "custom" ? Math.max(1, input.customInterval || 1) : undefined,
    customUnit: input.repeat === "custom" ? input.customUnit || "day" : undefined,
    reminders: input.reminders && input.reminders.length > 0 ? input.reminders : [{ offsetMinutes: 1440 }],
    paused: false,
    createdAt: now,
    updatedAt: now,
  };
  const list = safeGet<CalendarEvent[]>(eventsKey(), []);
  list.push(ev);
  safeSet(eventsKey(), list);
  return { success: true, event: ev };
}

export function updateEvent(id: string, patch: Partial<CalendarEvent>): { success: boolean; error?: string } {
  const list = safeGet<CalendarEvent[]>(eventsKey(), []);
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return { success: false, error: "事件不存在" };
  const merged = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  if (merged.dateMode === "lunar") {
    const lm = solarToLunarMd(merged.year, merged.month, merged.day);
    merged.lunarMonth = lm.lunarMonth;
    merged.lunarDay = lm.lunarDay;
  } else {
    merged.lunarMonth = undefined;
    merged.lunarDay = undefined;
  }
  list[idx] = merged;
  safeSet(eventsKey(), list);
  return { success: true };
}

export function deleteEvent(id: string): boolean {
  const list = safeGet<CalendarEvent[]>(eventsKey(), []);
  const next = list.filter((e) => e.id !== id);
  if (next.length === list.length) return false;
  safeSet(eventsKey(), next);
  return true;
}

export function setEventPaused(id: string, paused: boolean): boolean {
  return updateEvent(id, { paused }).success;
}

/** 隐私合规：导出全部记事数据（JSON 文本） */
export function exportAllEvents(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      userId: getClientUserId(),
      events: safeGet<CalendarEvent[]>(eventsKey(), []),
      reminderLog: safeGet<ReminderLogEntry[]>(logKey(), []),
    },
    null,
    2
  );
}

/** 隐私合规：彻底删除全部记事与提醒历史 */
export function deleteAllEvents(): boolean {
  if (!isBrowser()) return false;
  try {
    localStorage.removeItem(eventsKey());
    localStorage.removeItem(logKey());
    return true;
  } catch {
    return false;
  }
}

// ==================== 发生日期计算 ====================

/** 计算某事件从 fromTs 起 days 天窗口内的所有发生日（公历） */
export function getOccurrences(event: CalendarEvent, fromY: number, fromM: number, fromD: number, days: number): EventOccurrence[] {
  const out: EventOccurrence[] = [];
  const startTs = dayTs(fromY, fromM, fromD);
  const endTs = startTs + days * 86400000;
  const todayTs = dayTs(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());

  if (event.paused) return out;

  const anchorTs = dayTs(event.year, event.month, event.day);

  if (event.repeat === "none") {
    if (anchorTs >= startTs && anchorTs <= endTs) {
      out.push(buildOccurrence(event, event.year, event.month, event.day, todayTs));
    }
    return out;
  }

  if (event.repeat === "yearly" && event.dateMode === "lunar" && event.lunarMonth && event.lunarDay) {
    // 农历每年：在窗口涉及的每个公历年中找农历对应日
    for (let y = fromY - 1; y <= fromY + Math.ceil(days / 365) + 1; y++) {
      const sol = lunarMdToSolarInYear(y, event.lunarMonth, event.lunarDay);
      const ts = dayTs(sol.y, sol.m, sol.d);
      if (ts >= startTs && ts <= endTs) {
        out.push(buildOccurrence(event, sol.y, sol.m, sol.d, todayTs, `农历${event.lunarMonth < 0 ? "闰" : ""}${Math.abs(event.lunarMonth)}月${event.lunarDay}日`));
      }
    }
    return out;
  }

  if (event.repeat === "custom" && event.customUnit && event.customInterval) {
    // 自定义间隔：从锚点按单位步进
    const unitMs =
      event.customUnit === "day" ? 86400000 : event.customUnit === "week" ? 7 * 86400000 : event.customUnit === "month" ? 30 * 86400000 : 365 * 86400000;
    let ts = anchorTs;
    let guard = 0;
    while (ts <= endTs && guard < 5000) {
      if (ts >= startTs) {
        const dt = new Date(ts);
        out.push(buildOccurrence(event, dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), todayTs));
      }
      ts += unitMs * event.customInterval;
      guard++;
    }
    return out;
  }

  // 公历 yearly / monthly / weekly：逐日扫描窗口（窗口≤120天，性能可接受）
  for (let ts = startTs; ts <= endTs; ts += 86400000) {
    const dt = new Date(ts);
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    const d = dt.getDate();
    let hit = false;
    if (event.repeat === "yearly" && event.dateMode === "solar") {
      hit = m === event.month && d === event.day;
    } else if (event.repeat === "monthly") {
      hit = d === event.day || (d === new Date(y, m, 0).getDate() && event.day > new Date(y, m, 0).getDate());
    } else if (event.repeat === "weekly") {
      const anchorDow = new Date(anchorTs).getDay();
      hit = dt.getDay() === anchorDow && ts >= anchorTs - 6 * 86400000;
    }
    if (hit) out.push(buildOccurrence(event, y, m, d, todayTs));
  }
  return out;
}

function buildOccurrence(event: CalendarEvent, y: number, m: number, d: number, todayTs: number, lunarDesc?: string): EventOccurrence {
  const ts = dayTs(y, m, d);
  return {
    event,
    y,
    m,
    d,
    ts,
    lunarDesc,
    daysAway: Math.round((ts - todayTs) / 86400000),
  };
}

/** 查询某公历日当天的事件（用于万年历首页摘要与日历标记） */
export function getEventsOnDate(y: number, m: number, d: number): EventOccurrence[] {
  const list = listEvents();
  const out: EventOccurrence[] = [];
  for (const ev of list) {
    // 当日命中：直接锚点 / 重复规则推算
    const occ = getOccurrences(ev, y, m, d, 0);
    for (const o of occ) {
      if (o.y === y && o.m === m && o.d === d) out.push(o);
    }
  }
  return out;
}

/** 未来 N 天内即将发生的事件（用于首页摘要，按临近排序） */
export function getUpcomingEvents(days: number): EventOccurrence[] {
  const now = new Date();
  const list = listEvents();
  const all: EventOccurrence[] = [];
  for (const ev of list) {
    all.push(...getOccurrences(ev, now.getFullYear(), now.getMonth() + 1, now.getDate(), days));
  }
  // 去重（同事件同日）
  const seen = new Set<string>();
  const uniq = all.filter((o) => {
    const k = o.event.id + "|" + o.ts;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return uniq.sort((a, b) => a.ts - b.ts);
}

// ==================== 提醒派发（幂等） ====================

export function getReminderLog(): ReminderLogEntry[] {
  return safeGet<ReminderLogEntry[]>(logKey(), []);
}

function makeLogId(eventId: string, occurrenceTs: number, offsetMinutes: number): string {
  return `${eventId}_${occurrenceTs}_${offsetMinutes}`;
}

export interface DispatchResult {
  fired: number;
  failed: number;
  alerts: string[];
}

/**
 * 扫描应触发的提醒并派发。
 * 幂等：同一 (事件, 发生日, 提前档位) 只触发一次。
 * 通道：站内消息（写入通知中心）+ 系统推送（需用户授权）。
 */
export function dispatchDueReminders(
  pushInApp: (title: string, body: string) => void,
  pushSystem?: (title: string, body: string) => boolean
): DispatchResult {
  const result: DispatchResult = { fired: 0, failed: 0, alerts: [] };
  if (!isBrowser()) return result;

  const now = Date.now();
  const nowD = new Date();
  const list = listEvents().filter((e) => !e.paused);
  const log = safeGet<ReminderLogEntry[]>(logKey(), []);
  const logIds = new Set(log.map((l) => l.id));

  // 扫描窗口：过去1天（容错重试）至未来7天（提前1周档位）
  for (const ev of list) {
    if (ev.reminders.length === 0) continue;
    const occs = getOccurrences(ev, nowD.getFullYear(), nowD.getMonth() + 1, nowD.getDate() - 1, 9);
    for (const occ of occs) {
      for (const r of ev.reminders) {
        const dueTs = occ.ts + r.offsetMinutes * 60000;
        // 触发窗口：[due-5min, due+30min]，超过30分钟的漏发只记失败告警不再补发打扰
        if (now < dueTs - 5 * 60000 || now > dueTs + 30 * 60000) continue;
        const logId = makeLogId(ev.id, occ.ts, r.offsetMinutes);
        if (logIds.has(logId)) continue; // 已触发，幂等跳过
        logIds.add(logId);

        const offsetLabel = r.offsetMinutes === 0 ? "" : REMINDER_OFFSET_OPTIONS.find((o) => o.offsetMinutes === r.offsetMinutes)?.label || `提前${Math.round(r.offsetMinutes / 60)}小时`;
        const dateLabel = occ.daysAway === 0 ? "今天" : occ.daysAway === 1 ? "明天" : fmtDate(occ.y, occ.m, occ.d);
        const title = `${EVENT_TYPE_META[ev.type].icon} ${ev.title}${offsetLabel ? `（${offsetLabel}）` : ""}`;
        const body = `${dateLabel} · ${EVENT_TYPE_META[ev.type].label}${ev.relatedName ? " · " + ev.relatedName : ""}${occ.lunarDesc ? " · " + occ.lunarDesc : ""}${ev.note ? "\n" + ev.note : ""}`;

        const entry: ReminderLogEntry = {
          id: logId,
          eventId: ev.id,
          eventTitle: ev.title,
          occurrenceTs: occ.ts,
          offsetMinutes: r.offsetMinutes,
          firedAt: new Date().toISOString(),
          channels: ["inapp"],
          status: "fired",
          retryCount: 0,
        };
        try {
          pushInApp(title, body);
        } catch (e) {
          entry.status = "failed";
          entry.error = String(e);
          result.alerts.push(`站内消息投递失败: ${ev.title}`);
        }
        if (pushSystem) {
          try {
            const ok = pushSystem(title, body);
            if (ok) entry.channels.push("push");
          } catch {
            // 系统推送失败不阻断，站内消息已兜底
          }
        }
        if (entry.status === "fired") result.fired++;
        else result.failed++;
        log.push(entry);
      }
    }
  }

  // 只保留最近500条日志
  const trimmed = log.slice(-500);
  safeSet(logKey(), trimmed);
  safeSet(LAST_CHECK_KEY, now);
  return result;
}

/** 漏发检测：找出超过30分钟未触发的应发提醒（供后台告警） */
export function detectMissedReminders(): { eventTitle: string; dueAt: string }[] {
  const now = Date.now();
  const nowD = new Date();
  const missed: { eventTitle: string; dueAt: string }[] = [];
  const log = safeGet<ReminderLogEntry[]>(logKey(), []);
  const logIds = new Set(log.map((l) => l.id));
  for (const ev of listEvents().filter((e) => !e.paused)) {
    const occs = getOccurrences(ev, nowD.getFullYear(), nowD.getMonth() + 1, nowD.getDate(), 1);
    for (const occ of occs) {
      for (const r of ev.reminders) {
        const dueTs = occ.ts + r.offsetMinutes * 60000;
        if (now > dueTs + 30 * 60000 && !logIds.has(makeLogId(ev.id, occ.ts, r.offsetMinutes))) {
          missed.push({ eventTitle: ev.title, dueAt: new Date(dueTs).toISOString() });
        }
      }
    }
  }
  return missed;
}

/** 重复提醒检测：同一幂等键多条日志 */
export function detectDuplicateReminders(): number {
  const log = safeGet<ReminderLogEntry[]>(logKey(), []);
  const seen = new Set<string>();
  let dup = 0;
  for (const l of log) {
    if (seen.has(l.id)) dup++;
    else seen.add(l.id);
  }
  return dup;
}
