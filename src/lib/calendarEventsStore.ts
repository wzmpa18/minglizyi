"use client";

// ============================================================================
// 万年历记事提醒数据层 - P6-TOOL-04 Phase 1
// 功能：生日/纪念日/节日/待办/自定义事件管理，公历/农历双轨日期，
//       重复规则（每年/每月/每周/自定义间隔），多档位提醒，幂等触发，
//       历史提醒记录，导出与彻底删除（隐私合规）
// 存储：localStorage（按真实账号／游客隔离），本模块不自动上传。
// ============================================================================

import {learningReminderEvents} from "./calendarLearning";
import { Solar, Lunar } from "lunar-javascript";
import { getClientUserId,getUserProfile,getUserToken } from "./auth";
import { lunarBirthdayInYear, solarBirthdayInYear, civilTimeEpoch, reminderDueAt, DEFAULT_BIRTHDAY_RULES, validCivilDate, type BirthdayRules } from "./calendarRecurrence";
export { type BirthdayRules } from "./calendarRecurrence";

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
  birthYearKnown?: boolean;
  completedDates?: string[];
  snoozedReminder?: {date:string;at:number};
  birthdayRules?: BirthdayRules;
  eventTime?: string;
  timeZone?: string;
  /** Opaque local source only; never a note, birthday, medical text or cloud upload. */
  sourceRef?: string;
  sourceRuleId?: string;
  endDate?: string;
  completed?: boolean;
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

function safeSet(key: string, value: unknown): boolean {
  if (!isBrowser()) return false;
  try {
    const serialized=JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return localStorage.getItem(key)===serialized;
  } catch (e) {
    return false;
  }
}

export function calendarStorageOwner():string {
  const id=getUserToken()?getUserProfile()?.userId:null;
  return id?`account:${id}`:`guest:${getClientUserId()}`;
}

function eventsKey(): string {
  return EVENTS_KEY_PREFIX + calendarStorageOwner();
}

function logKey(): string {
  return REMINDER_LOG_KEY_PREFIX + calendarStorageOwner();
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

/** Missing/leap days follow the user's saved rule; no invented fallback dates. */
export const lunarMdToSolarInYear = lunarBirthdayInYear;

// ==================== CRUD ====================

export function listEvents(): CalendarEvent[] {
  return safeGet<CalendarEvent[]>(eventsKey(), []).sort((a, b) => {
    const ka = a.year * 10000 + a.month * 100 + a.day;
    const kb = b.year * 10000 + b.month * 100 + b.day;
    return ka - kb;
  });
}

export interface CreateEventInput {
  sourceRef?: string;
  sourceRuleId?: string;
  endDate?: string;
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
  birthYearKnown?: boolean;
  lunarMonth?: number;
  lunarDay?: number;
  birthdayRules?: BirthdayRules;
  eventTime?: string;
  timeZone?: string;
}

export function createEvent(input: CreateEventInput): { success: boolean; error?: string; event?: CalendarEvent } {
  if (!input.title || !input.title.trim()) return { success: false, error: "请填写事件标题" };
  if (input.title.trim().length > 50) return { success: false, error: "标题不能超过50字" };
  if (input.note && input.note.length > 500) return { success: false, error: "备注不能超过500字" };
  if (!validCivilDate(input.year,input.month,input.day)) return { success: false, error: "请选择有效日期" };
  if(input.endDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)||!validCivilDate(...(input.endDate.split('-').map(Number) as [number,number,number]))||input.endDate<fmtDate(input.year,input.month,input.day)))return {success:false,error:"结束/复核日期无效"};
  if(input.sourceRuleId&&!/^[-a-zA-Z0-9]{8,80}$/.test(input.sourceRuleId))return {success:false,error:"本地提醒标识无效"};
  if(input.sourceRef&&!/^life:[\w-]{8,80}:[\w-]{8,80}$/.test(input.sourceRef))return {success:false,error:"本地来源编号无效"};
  if (input.eventTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.eventTime)) return {success:false,error:"事件钟点无效"};
  try{new Intl.DateTimeFormat("en",{timeZone:input.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone});}catch{return {success:false,error:"请输入有效的IANA时区，如Asia/Shanghai"};}

  if(input.dateMode==="lunar"&&((input.lunarMonth!==undefined&&(!Number.isInteger(input.lunarMonth)||!input.lunarMonth||Math.abs(input.lunarMonth)>12))||(input.lunarDay!==undefined&&(!Number.isInteger(input.lunarDay)||input.lunarDay<1||input.lunarDay>30))))return {success:false,error:"农历月日无效"};
  const now = new Date().toISOString();
  const ev: CalendarEvent = {
    sourceRef:input.sourceRef,
    sourceRuleId:input.sourceRuleId,
    endDate:input.endDate,
    id: genId(),
    userId: calendarStorageOwner(),
    type: input.type,
    title: input.title.trim(),
    relatedName: input.relatedName?.trim() || undefined,
    note: input.note?.trim() || undefined,
    dateMode: input.dateMode,
    year: input.year,
    month: input.month,
    day: input.day,
    lunarMonth: input.dateMode === "lunar" ? input.lunarMonth ?? solarToLunarMd(input.year, input.month, input.day).lunarMonth : undefined,
    lunarDay: input.dateMode === "lunar" ? input.lunarDay ?? solarToLunarMd(input.year, input.month, input.day).lunarDay : undefined,
    repeat: input.repeat || "none",
    customInterval: input.repeat === "custom" ? Math.max(1, input.customInterval || 1) : undefined,
    customUnit: input.repeat === "custom" ? input.customUnit || "day" : undefined,
    reminders: input.reminders !== undefined ? input.reminders : [{ offsetMinutes: 1440 }],
    birthYearKnown: input.type==="birthday" ? input.birthYearKnown!==false : undefined,
    birthdayRules: input.birthdayRules || { ...DEFAULT_BIRTHDAY_RULES },
    eventTime: input.eventTime || "09:00",
    timeZone: input.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    paused: false,
    createdAt: now,
    updatedAt: now,
  };
  const list = safeGet<CalendarEvent[]>(eventsKey(), []);
  if(ev.sourceRuleId&&list.some(old=>old.sourceRuleId===ev.sourceRuleId))return {success:false,error:"此原提醒已存在，请先取消旧档案的安排或修改原事件，避免恢复后重复通知"};
  list.push(ev);
  if(!safeSet(eventsKey(), list))return {success:false,error:"本机存储未成功，请检查可用空间后重试；尚未保存"};
  if(isBrowser())window.dispatchEvent(new Event("yandao-calendar-changed"));
  return { success: true, event: ev };
}

export function updateEvent(id: string, patch: Partial<CalendarEvent>): { success: boolean; error?: string } {
  const list = safeGet<CalendarEvent[]>(eventsKey(), []);
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return { success: false, error: "事件不存在" };
  const merged = { ...list[idx], ...patch, id: list[idx].id, userId: list[idx].userId, updatedAt: new Date().toISOString() };
  if (!validCivilDate(merged.year,merged.month,merged.day))return {success:false,error:"日期无效"};
  if(merged.sourceRuleId&&(!/^[-a-zA-Z0-9]{8,80}$/.test(merged.sourceRuleId)||list.some((e,i)=>i!==idx&&e.sourceRuleId===merged.sourceRuleId)))return {success:false,error:"本地提醒标识无效或已重复"};
  if(merged.endDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(merged.endDate)||!validCivilDate(...(merged.endDate.split("-").map(Number) as [number,number,number]))||merged.endDate<fmtDate(merged.year,merged.month,merged.day)))return {success:false,error:"结束/复核日期无效"};
  if(merged.eventTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(merged.eventTime))return {success:false,error:"事件钟点无效"};
  try{new Intl.DateTimeFormat("en",{timeZone:merged.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone});}catch{return {success:false,error:"事件时区无效"};}
  if (merged.dateMode === "lunar") {
    const dateChanged=patch.dateMode!==undefined||patch.year!==undefined||patch.month!==undefined||patch.day!==undefined;
    const lm = solarToLunarMd(merged.year, merged.month, merged.day);
    merged.lunarMonth = patch.lunarMonth ?? (dateChanged?lm.lunarMonth:merged.lunarMonth??lm.lunarMonth);
    merged.lunarDay = patch.lunarDay ?? (dateChanged?lm.lunarDay:merged.lunarDay??lm.lunarDay);
    if(!Number.isInteger(merged.lunarMonth)||!merged.lunarMonth||Math.abs(merged.lunarMonth)>12||!Number.isInteger(merged.lunarDay)||merged.lunarDay<1||merged.lunarDay>30)return {success:false,error:"农历月日无效"};
  } else {
    merged.lunarMonth = undefined;
    merged.lunarDay = undefined;
  }
  list[idx] = merged;
  if(!safeSet(eventsKey(), list))return {success:false,error:"本机存储未成功，请检查可用空间后重试；尚未保存"};
  if(isBrowser())window.dispatchEvent(new Event("yandao-calendar-changed"));
  return { success: true };
}

export function deleteEvent(id: string): boolean {
  const list = safeGet<CalendarEvent[]>(eventsKey(), []);
  const next = list.filter((e) => e.id !== id);
  if (next.length === list.length) return false;
  if(!safeSet(eventsKey(), next))return false;
  if(isBrowser())window.dispatchEvent(new Event("yandao-calendar-changed"));
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
      userId: calendarStorageOwner(),
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
    window.dispatchEvent(new Event("yandao-calendar-changed"));
    return true;
  } catch {
    return false;
  }
}

/** Legacy device-only records have no provable account owner. Never auto-import. */
export function hasUnassignedCalendar():boolean {
  if(!isBrowser())return false;
  const legacy=EVENTS_KEY_PREFIX+getClientUserId();
  const guest=EVENTS_KEY_PREFIX+`guest:${getClientUserId()}`;
  return [legacy,...(getUserToken()?[guest]:[])].some(key=>{const value=safeGet<unknown>(key,[]);return key!==eventsKey()&&Array.isArray(value)&&value.length>0;});
}
export function claimUnassignedCalendar(confirmed:boolean):{success:boolean;error?:string}{
  if(!confirmed||!isBrowser())return {success:false,error:"请先核对这些本机记录确为本人所有"};
  const keys=[EVENTS_KEY_PREFIX+getClientUserId(),...(getUserToken()?[EVENTS_KEY_PREFIX+`guest:${getClientUserId()}`]:[])].filter(key=>key!==eventsKey());
  const current=listEvents(),ids=new Set(current.map(event=>event.id));
  for(const key of keys){
    const source=safeGet<unknown>(key,[]);if(!Array.isArray(source))return {success:false,error:"旧记录格式不受支持，原数据保留"};
    for(const event of source){
      if(!event||typeof event.id!=="string"||typeof event.title!=="string"||!validCivilDate(event.year,event.month,event.day)||!Array.isArray(event.reminders))return {success:false,error:"旧记录中有待核对项，原数据保留，未迁移"};
      if(ids.has(event.id)){const existing=current.find(item=>item.id===event.id);if(JSON.stringify({...existing,userId:calendarStorageOwner()})===JSON.stringify({...event,userId:calendarStorageOwner()}))continue;return {success:false,error:"旧记录编号有冲突，原数据保留，请先导出并核对"};}
      ids.add(event.id);current.push({...event,userId:calendarStorageOwner()});
    }
  }
  if(!safeSet(eventsKey(),current))return {success:false,error:"迁移未保存成功，原数据保留"};
  try{for(const key of keys)localStorage.removeItem(key);}catch{return {success:false,error:"新记录已保存，但旧数据尚未移除，请保留现场并联系客服"};}
  window.dispatchEvent(new Event("yandao-calendar-changed"));return {success:true};
}

// ==================== 发生日期计算 ====================

/** 计算某事件从 fromTs 起 days 天窗口内的所有发生日（公历） */
export function getOccurrences(event: CalendarEvent, fromY: number, fromM: number, fromD: number, days: number): EventOccurrence[] {
  if (event.paused || event.completed || !Number.isInteger(days) || days < 0 || days > 1096) return [];
  const start = new Date(fromY, fromM-1, fromD, 12), end = new Date(start);
  end.setDate(end.getDate()+days);
  const today=eventCivilToday(event),todayTs=Date.UTC(today.y,today.m-1,today.d);
  const rules = event.birthdayRules || DEFAULT_BIRTHDAY_RULES;
  const annual = new Set<string>();
  if (event.repeat === "yearly") {
    for (let year=start.getFullYear()-1; year<=end.getFullYear()+1; year++) {
      const date = event.dateMode === "lunar" && event.lunarMonth && event.lunarDay
        ? lunarBirthdayInYear(year,event.lunarMonth,event.lunarDay,rules)
        : solarBirthdayInYear(year,event.month,event.day,rules.feb29);
      if (date) annual.add(fmtDate(date.y,date.m,date.d));
    }
  }
  const result: EventOccurrence[] = [];
  const anchorOrdinal = Date.UTC(event.year,event.month-1,event.day)/86400000;
  for (const cursor = new Date(start); cursor<=end; cursor.setDate(cursor.getDate()+1)) {
    const y=cursor.getFullYear(),m=cursor.getMonth()+1,d=cursor.getDate();
    if(event.endDate&&fmtDate(y,m,d)>event.endDate)continue;
    const ordinal=Date.UTC(y,m-1,d)/86400000, diff=ordinal-anchorOrdinal;
    if (diff<0) continue;
    let hit=false;
    if (event.repeat==="none") hit=diff===0;
    else if (event.repeat==="yearly") hit=annual.has(fmtDate(y,m,d));
    else if (event.repeat==="weekly") hit=diff%7===0;
    else if (event.repeat==="monthly") hit=d===Math.min(event.day,new Date(y,m,0).getDate());
    else if (event.repeat==="custom" && Number.isSafeInteger(event.customInterval) && event.customInterval!>0) {
      const n=event.customInterval!;
      const monthDiff=(y-event.year)*12+m-event.month;
      if(event.customUnit==="day") hit=diff%n===0;
      if(event.customUnit==="week") hit=diff%(n*7)===0;
      if(event.customUnit==="month") hit=monthDiff%n===0 && d===Math.min(event.day,new Date(y,m,0).getDate());
      if(event.customUnit==="year") {
        const date=solarBirthdayInYear(y,event.month,event.day,rules.feb29);
        hit=(y-event.year)%n===0 && !!date && date.m===m && date.d===d;
      }
    }
    if(hit && !event.completedDates?.includes(fmtDate(y,m,d))) {
      const occurrence=buildOccurrence(event,y,m,d,todayTs,event.dateMode==="lunar"?`农历${event.lunarMonth!<0?"闰":""}${Math.abs(event.lunarMonth!)}月${event.lunarDay}日`:undefined);
      if(Number.isFinite(occurrence.ts)) result.push(occurrence);
    }
  }
  return result;
}

function buildOccurrence(event: CalendarEvent, y: number, m: number, d: number, todayTs: number, lunarDesc?: string): EventOccurrence {
  const [hour,minute]=(event.eventTime||"00:00").split(":").map(Number);
  const ts = civilTimeEpoch(y,m,d,hour,minute,event.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone) ?? NaN;
  return {
    event,
    y,
    m,
    d,
    ts,
    lunarDesc,
    daysAway: Math.round((Date.UTC(y,m-1,d) - todayTs) / 86400000),
  };
}

function eventCivilToday(event:CalendarEvent){
  const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:event.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(Date.now()).map(x=>[x.type,x.value]));
  return {y:+p.year,m:+p.month,d:+p.day};
}
export function getOccurrenceReminders(occurrence:EventOccurrence):{at:number;offsetMinutes:number;snoozed?:boolean}[]{
  const snooze=occurrence.event.snoozedReminder;
  if(snooze&&occurrence.event.endDate){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:occurrence.event.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(snooze.at);const d=Object.fromEntries(parts.map(p=>[p.type,p.value]));if(`${d.year}-${d.month}-${d.day}`>occurrence.event.endDate)return [];}
  if(snooze?.date===fmtDate(occurrence.y,occurrence.m,occurrence.d)&&Number.isFinite(snooze.at))return [{at:snooze.at,offsetMinutes:(occurrence.ts-snooze.at)/60000,snoozed:true}];
  return occurrence.event.reminders.map(r=>({at:reminderDueAt(occurrence.ts,r.offsetMinutes),offsetMinutes:r.offsetMinutes}));
}
export function getPendingReminderOccurrences(days=30):EventOccurrence[]{
  const result=getUpcomingEvents(days);
  for(const event of learningReminderEvents(calendarStorageOwner())){const current=eventCivilToday(event);result.push(...getOccurrences(event,current.y,current.m,current.d,days));}
  for(const event of listEvents()){
    const snooze=event.snoozedReminder;if(!snooze||snooze.at<Date.now()-1800000)continue;
    const [y,m,d]=snooze.date.split("-").map(Number);
    for(const occurrence of getOccurrences(event,y,m,d,0))if(!result.some(item=>item.event.id===event.id&&item.ts===occurrence.ts))result.push(occurrence);
  }
  return result;
}
export function completeNextEventOccurrence(id:string):{success:boolean;error?:string}{
  const event=listEvents().find(item=>item.id===id);if(!event)return {success:false,error:"记事不存在"};
  if(event.repeat==="none")return updateEvent(id,{completed:true});
  const next=getUpcomingEvents(366).find(item=>item.event.id===id);if(!next)return {success:false,error:"未来一年暂无可标记的发生日"};
  return updateEvent(id,{completedDates:[...new Set([...(event.completedDates||[]),fmtDate(next.y,next.m,next.d)])].slice(-400),snoozedReminder:undefined});
}
export function undoEventCompletion(id:string):{success:boolean;error?:string}{
  const event=listEvents().find(item=>item.id===id);if(!event)return {success:false,error:"记事不存在"};
  return updateEvent(id,{completed:false,completedDates:(event.completedDates||[]).slice(0,-1)});
}
export function snoozeNextEventOccurrence(id:string,minutes=15):{success:boolean;error?:string}{
  if(!Number.isInteger(minutes)||minutes<1||minutes>1440)return {success:false,error:"稍后提醒需为1至1440分钟"};
  const next=getUpcomingEvents(366).find(item=>item.event.id===id);if(!next)return {success:false,error:"请先恢复未完成且有发生日的记事"};
  return updateEvent(id,{snoozedReminder:{date:fmtDate(next.y,next.m,next.d),at:Date.now()+minutes*60000}});
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
  const list = listEvents();
  const all: EventOccurrence[] = [];
  for (const ev of list) {
    const current=eventCivilToday(ev);
    all.push(...getOccurrences(ev,current.y,current.m,current.d,days));
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
  const list = [...listEvents(),...learningReminderEvents(calendarStorageOwner())].filter((e) => !e.paused);
  const log = safeGet<ReminderLogEntry[]>(logKey(), []);
  const logIds = new Set(log.map((l) => l.id));

  // 扫描窗口：过去1天（容错重试）至未来7天（提前1周档位）
  for (const ev of list) {
    if (ev.reminders.length === 0&&!ev.snoozedReminder) continue;
    const localToday=eventCivilToday(ev);
    const occs = getOccurrences(ev,localToday.y,localToday.m,localToday.d-1,10);
    for (const occ of occs) {
      for (const r of getOccurrenceReminders(occ)) {
        const dueTs = r.at;
        // 触发窗口：[due, due+30min]，超过30分钟的漏发只记失败告警不再补发打扰
        if (now < dueTs || now > dueTs + 30 * 60000) continue;
        const logId = makeLogId(ev.id, occ.ts, r.offsetMinutes);
        if (logIds.has(logId)) continue; // 已触发，幂等跳过
        logIds.add(logId);

        const offsetLabel = r.snoozed ? "稍后提醒" : r.offsetMinutes === 0 ? "" : REMINDER_OFFSET_OPTIONS.find((o) => o.offsetMinutes === r.offsetMinutes)?.label || `提前${Math.round(r.offsetMinutes / 60)}小时`;
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
            const ok = pushSystem("言道日历", "有一项安排，请打开应用查看");
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
  const missed: { eventTitle: string; dueAt: string }[] = [];
  const log = safeGet<ReminderLogEntry[]>(logKey(), []);
  const logIds = new Set(log.map((l) => l.id));
  for (const ev of [...listEvents(),...learningReminderEvents(calendarStorageOwner())].filter((e) => !e.paused)) {
    const localToday=eventCivilToday(ev);
    const occs = getOccurrences(ev,localToday.y,localToday.m,localToday.d-1,10);
    for (const occ of occs) {
      for (const r of getOccurrenceReminders(occ)) {
        const dueTs = r.at;
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
