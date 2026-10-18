"use client";

// ============================================================================
// 万年历·记事提醒管理页 - P6-TOOL-04 Phase 1
// 事件类型：生日/纪念日/节日/待办/自定义；公历/农历双轨；
// 重复规则（每年/每月/每周/自定义间隔）；多档位多次提醒；
// 新增/编辑/删除/暂停；提醒历史查询；导出与彻底删除（隐私合规）。
// ============================================================================

import {hasNativeCalendar,LocalCalendar} from "@/lib/nativeCalendar";
import {Solar} from "lunar-javascript";
import {lunarBirthdayInYear} from "@/lib/calendarRecurrence";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InterfaceButton, InterfaceLabel, InterfaceOption } from "@/components/InterfaceControls";
import { interfaceText as ui, useInterfaceLocale } from "@/lib/interfaceLocale";
import { useState, useMemo, useEffect, useCallback } from "react";
import { BrandHeader, SolarDatePicker, SegBtn, ToggleSwitch } from "@/components/shared";
import {
  listEvents,
  hasUnassignedCalendar,
  claimUnassignedCalendar,
  completeNextEventOccurrence,
  undoEventCompletion,
  snoozeNextEventOccurrence,
  createEvent,
  updateEvent,
  deleteEvent,
  setEventPaused,
  exportAllEvents,
  deleteAllEvents,
  getUpcomingEvents,
  getReminderLog,
  EVENT_TYPE_META,
  REPEAT_LABELS,
  REMINDER_OFFSET_OPTIONS,
  solarToLunarMd,
  type CalendarEvent,
  type CalendarEventType,
  type DateMode,
  type RepeatRule,
  type ReminderOffset,
  type BirthdayRules,
} from "@/lib/calendarEventsStore";
import { getToolConfig } from "@/lib/toolConfigStore";
import { requestPushPermission } from "@/components/ReminderSchedulerInit";

const BRAND = "#7B2FBE";

type EventTypeKey = CalendarEventType;
const EVENT_TYPES: EventTypeKey[] = ["birthday", "anniversary", "festival", "todo", "custom"];
const REPEAT_OPTIONS: RepeatRule[] = ["none", "yearly", "monthly", "weekly", "custom"];
const CUSTOM_UNITS: { v: "day" | "week" | "month" | "year"; label: string }[] = [
  { v: "day", label: "天" },
  { v: "week", label: "周" },
  { v: "month", label: "月" },
  { v: "year", label: "年" },
];

function fmtYMD(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

interface FormState {
  birthYearKnown: boolean;
  birthdayYear: number;
  lunarMonth: number;
  lunarDay: number;
  birthdayRules: BirthdayRules;
  eventTime: string;
  timeZone: string;
  id?: string;
  type: CalendarEventType;
  title: string;
  relatedName: string;
  note: string;
  dateMode: DateMode;
  dateStr: string;
  repeat: RepeatRule;
  customInterval: string;
  customUnit: "day" | "week" | "month" | "year";
  reminders: number[];
}

export default function CalendarEventsPage() {
  useInterfaceLocale();
  const [claiming,setClaiming]=useState(false);
  const [deleting,setDeleting]=useState<string|null>(null);
  const [unassigned,setUnassigned]=useState(false);
  const [tab, setTab] = useState<"list" | "upcoming" | "history">("list");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [upcoming, setUpcoming] = useState<ReturnType<typeof getUpcomingEvents>>([]);
  const [logs, setLogs] = useState<ReturnType<typeof getReminderLog>>([]);
  const [showForm, setShowForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [tip, setTip] = useState("");
  const [pushStatus, setPushStatus] = useState<string>("");
  const [limitReached, setLimitReached] = useState(false);

  const reminderCfg = useMemo(() => getToolConfig().reminder, []);
  const offsetOptions = useMemo(
    () => REMINDER_OFFSET_OPTIONS.filter((o) => reminderCfg.offsetWhitelist.includes(o.offsetMinutes)),
    [reminderCfg]
  );

  // P7-补05：生日/纪念日默认「每年农历重复」，用户可手动修改
  const emptyForm: FormState = useMemo(
    () => ({
      type: "birthday",
      birthYearKnown: false,
      birthdayYear: new Date().getFullYear(),
      lunarMonth: solarToLunarMd(new Date().getFullYear(),new Date().getMonth()+1,new Date().getDate()).lunarMonth,
      lunarDay: solarToLunarMd(new Date().getFullYear(),new Date().getMonth()+1,new Date().getDate()).lunarDay,
      birthdayRules: {leapMonth:"skip",missingLunarDay:"skip",feb29:"skip"},
      eventTime: "09:00",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      title: "",
      relatedName: "",
      note: "",
      dateMode: "lunar",
      dateStr: fmtYMD(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
      repeat: "yearly",
      customInterval: "1",
      customUnit: "month",
      reminders: [1440],
    }),
    []
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  // 用户是否手动调整过历法/重复（未调整时切换生日/纪念日自动应用每年农历默认）
  const [calendarTouched, setCalendarTouched] = useState(false);
  // P7-补05：提交前重复规则确认弹窗
  const [confirming, setConfirming] = useState(false);

  const refresh = useCallback(() => {
    setEvents(listEvents());
    setUnassigned(hasUnassignedCalendar());
    setUpcoming(getUpcomingEvents(60).filter((o) => o.daysAway >= 0));
    setLogs(getReminderLog().slice().reverse());
  }, []);

  useEffect(() => {
    refresh();
    // 推送权限状态
    try {
      if(hasNativeCalendar())void LocalCalendar.status().then(status=>setPushStatus(status.notifications?"系统通知已开启；请留意系统权限与省电限制":"系统通知尚未授权，可点击下方开启")).catch(()=>setPushStatus("系统通知状态暂时不可用，请稍后重试"));
      else if (typeof Notification === "undefined") setPushStatus("当前环境不支持系统推送，提醒将以站内消息送达");
      else if (Notification.permission === "granted") setPushStatus("系统推送已开启");
      else if (Notification.permission === "denied") setPushStatus("系统推送已被拒绝，可在浏览器设置中重新开启");
      else setPushStatus("系统推送未开启");
    } catch {
      setPushStatus("");
    }
    const changed=()=>{refresh();setShowForm(false);};
    window.addEventListener("yandao-auth-change",changed);
    return()=>window.removeEventListener("yandao-auth-change",changed);
  }, [refresh]);

  const showTip = (msg: string) => {
    setTip(msg);
    setTimeout(() => setTip(""), 2200);
  };

  const openCreate = () => {
    if (events.length >= reminderCfg.maxEventsPerUser) {
      setLimitReached(true);
      return;
    }
    setForm(emptyForm);
    setCalendarTouched(false);
    setShowForm(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setForm({
      id: ev.id,
      birthYearKnown: ev.birthYearKnown!==false,
      birthdayYear:ev.dateMode==="lunar"?Solar.fromYmd(ev.year,ev.month,ev.day).getLunar().getYear():ev.year,
      lunarMonth:ev.lunarMonth||1,
      lunarDay:ev.lunarDay||1,
      birthdayRules: ev.birthdayRules || {leapMonth:"skip",missingLunarDay:"skip",feb29:"skip"},
      eventTime: ev.eventTime || "00:00",
      timeZone: ev.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      type: ev.type,
      title: ev.title,
      relatedName: ev.relatedName || "",
      note: ev.note || "",
      dateMode: ev.dateMode,
      dateStr: fmtYMD(ev.year, ev.month, ev.day),
      repeat: ev.repeat,
      customInterval: String(ev.customInterval || 1),
      customUnit: ev.customUnit || "month",
      reminders: ev.reminders.map((r) => r.offsetMinutes),
    });
    setCalendarTouched(true);
    setShowForm(true);
  };

  const toggleReminder = (offset: number) => {
    setForm((f) => ({
      ...f,
      reminders: f.reminders.includes(offset) ? f.reminders.filter((x) => x !== offset) : [...f.reminders, offset].sort((a, b) => b - a),
    }));
  };

  // P7-补05：重复规则摘要文案（用于提交前确认）
  const repeatSummary = useMemo(() => {
    if (form.repeat === "none") return "不重复（仅发生当天提醒一次）";
    if (form.repeat === "yearly") return form.dateMode === "lunar" ? "每年重复 · 按农历推算" : "每年重复 · 按公历推算";
    if (form.repeat === "monthly") return form.dateMode === "lunar" ? "每月重复 · 按公历日" : "每月重复";
    if (form.repeat === "weekly") return "每周重复";
    const n = Math.max(1, Number(form.customInterval) || 1);
    const unit = CUSTOM_UNITS.find((u) => u.v === form.customUnit)?.label || "天";
    return `自定义：每 ${n} ${unit}重复一次`;
  }, [form.repeat, form.dateMode, form.customInterval, form.customUnit]);

  // 提交：先校验，再弹窗确认重复规则，避免漏选
  const submitForm = () => {
    const [y, m, d] = form.dateStr.split("-").map(Number);
    if (!form.title.trim()) {
      showTip("请填写事件标题");
      return;
    }
    if (!y || !m || !d) {
      showTip("请选择日期");
      return;
    }
    setConfirming(true);
  };

  const doSaveForm = () => {
    setConfirming(false);
    let [y, m, d] = form.dateStr.split("-").map(Number);
    if(form.type==="birthday"){
      y=form.birthYearKnown?form.birthdayYear:2000;
      if(form.dateMode==="lunar"){
        if(form.birthYearKnown){const converted=lunarBirthdayInYear(form.birthdayYear,form.lunarMonth,form.lunarDay);if(!converted){showTip("该出生年没有所选农历日期，请核对闰月和大小月");return;}y=converted.y;m=converted.m;d=converted.d;}
        else {m=1;d=1;} // An explicit calendar anchor, never a claimed birth year.
      }
    }
    const reminders: ReminderOffset[] = form.reminders.map((o) => ({ offsetMinutes: o }));
    if (form.id) {
      const r = updateEvent(form.id, {
        type: form.type,
        birthYearKnown:form.type==="birthday"?form.birthYearKnown:undefined,
        lunarMonth:form.type==="birthday"&&form.dateMode==="lunar"?form.lunarMonth:undefined,
        lunarDay:form.type==="birthday"&&form.dateMode==="lunar"?form.lunarDay:undefined,
        birthdayRules: form.birthdayRules,
        eventTime: form.eventTime,
        timeZone: form.timeZone,
        title: form.title,
        relatedName: form.relatedName,
        note: form.note,
        dateMode: form.dateMode,
        year: y,
        month: m,
        day: d,
        repeat:form.type==="birthday"&&!form.birthYearKnown?"yearly":form.repeat,
        customInterval: form.repeat === "custom" ? Math.max(1, Number(form.customInterval) || 1) : undefined,
        customUnit: form.repeat === "custom" ? form.customUnit : undefined,
        reminders,
      });
      if (!r.success) {
        showTip(r.error || "保存失败");
        return;
      }
      showTip("已保存修改");
    } else {
      const r = createEvent({
        type: form.type,
        birthYearKnown:form.type==="birthday"?form.birthYearKnown:undefined,
        lunarMonth:form.type==="birthday"&&form.dateMode==="lunar"?form.lunarMonth:undefined,
        lunarDay:form.type==="birthday"&&form.dateMode==="lunar"?form.lunarDay:undefined,
        birthdayRules: form.birthdayRules,
        eventTime: form.eventTime,
        timeZone: form.timeZone,
        title: form.title,
        relatedName: form.relatedName,
        note: form.note,
        dateMode: form.dateMode,
        year: y,
        month: m,
        day: d,
        repeat:form.type==="birthday"&&!form.birthYearKnown?"yearly":form.repeat,
        customInterval: form.repeat === "custom" ? Math.max(1, Number(form.customInterval) || 1) : undefined,
        customUnit: form.repeat === "custom" ? form.customUnit : undefined,
        reminders,
      });
      if (!r.success) {
        showTip(r.error || "创建失败");
        return;
      }
      showTip("已创建；系统提醒能力和授权状态请查看下方说明");
    }
    setShowForm(false);
    refresh();
  };

  const handleDelete = (id: string) => setDeleting(id);
  const confirmDeletion=()=>{
    const ok=deleting==="all"?deleteAllEvents():deleting?deleteEvent(deleting):false;
    setDeleting(null);refresh();showTip(ok?"已删除，相应系统提醒将同步取消":"删除未成功，原记录保留，请重试");
  };

  const handleExport = () => {
    try {
      const data = exportAllEvents();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yandao_calendar_events_${fmtYMD(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExport(false);
      showTip("已导出 JSON 文件");
    } catch {
      showTip("导出失败");
    }
  };

  const handleDeleteAll = () => setDeleting("all");

  const enablePush = async () => {
    const ok = await requestPushPermission();
    setPushStatus(ok ? "系统推送已开启" : "未获授权，提醒将以站内消息送达");
  };

  const lunarDescOf = (ev: CalendarEvent): string => {
    if (ev.dateMode !== "lunar" || !ev.lunarMonth || !ev.lunarDay) return "";
    return `农历${ev.lunarMonth < 0 ? "闰" : ""}${Math.abs(ev.lunarMonth)}月${ev.lunarDay}日`;
  };

  // 表单选农历时显示当前选中日期的农历对照
  const formLunarHint = useMemo(() => {
    const [y, m, d] = form.dateStr.split("-").map(Number);
    if (!y || !m || !d) return "";
    const lm = solarToLunarMd(y, m, d);
    return `农历${lm.lunarMonth < 0 ? "闰" : ""}${Math.abs(lm.lunarMonth)}月${lm.lunarDay}日`;
  }, [form.dateStr]);

  return (
    <div className="flex min-h-screen flex-col bg-[#ededed]" style={{ maxWidth: "500px", margin: "0 auto", paddingBottom: "calc(72px + env(safe-area-inset-bottom))" }}>
      <BrandHeader title="记事提醒" showBack backUrl="/yixue/wannianli" />

      <p className="m-3 rounded-lg bg-white p-3 text-xs leading-6 text-gray-600">本机离线记事。网页站内提醒需要应用保持打开；系统通知需授权。强行停止、关机或系统限制会影响送达，不能保证所有状态准点。锁屏默认仅显示“有一项安排”。</p>
      <ConfirmDialog open={deleting!==null} title={deleting==="all"?"删除全部本机记事":"删除记事"} message={deleting==="all"?"彻底删除当前账号／游客空间的全部记事和提醒历史，同步取消相应系统提醒；不可恢复。":"删除这条记事，并取消相应系统提醒。"} onCancel={()=>setDeleting(null)} onConfirm={confirmDeletion}/>
      {unassigned&&<section className="m-3 rounded-xl border bg-white p-4 text-sm text-gray-800"><p>检测到旧版或游客本机记事，归属尚未确认，未自动导入当前空间。请先确认是本人资料再认领。原记录仍保留。</p><InterfaceButton className="mt-2 rounded border p-2" onClick={()=>setClaiming(true)}>本人核对后认领本机记事</InterfaceButton></section>}
      <ConfirmDialog open={claiming} title="确认本机记事归属" message="仅在确认这些旧版或游客记录都属于你本人时，才迁移到当前账号／游客空间。保存核对成功后移除旧存储入口；不会上传到同辰库。" onCancel={()=>setClaiming(false)} onConfirm={()=>{setClaiming(false);const result=claimUnassignedCalendar(true);showTip(result.success?"已迁移本人本机记事":result.error||"未迁移");refresh();}}/>
      {/* Tab 切换 */}
      <div className="bg-white px-3 py-2">
        <SegBtn
          options={[
            { value: "list", label: `全部 (${events.length})`, active: tab === "list" },
            { value: "upcoming", label: "即将到来", active: tab === "upcoming" },
            { value: "history", label: "提醒历史", active: tab === "history" },
          ]}
          onClick={(v) => setTab(v as typeof tab)}
        />
      </div>

        <div className="flex-1 px-3 py-2">
          {/* 推送状态条 */}
          {reminderCfg.pushEnabled && pushStatus && (
            <div className="mb-2 flex items-center justify-between rounded-lg border border-purple-100 bg-white px-3 py-2">
              <span className="text-[11px] text-gray-500">{pushStatus}</span>
              {pushStatus.includes("未开启") && (
                <InterfaceButton onClick={enablePush} className="rounded-full px-2.5 py-1 text-[11px] font-medium text-white" style={{ backgroundColor: BRAND }}>
                  开启推送
                </InterfaceButton>
              )}
            </div>
          )}

          {/* ===== 全部列表 ===== */}
          {tab === "list" && (
            <>
              {events.length === 0 && (
                <div className="rounded-[10px] bg-white p-8 text-center shadow-sm">
                  <div className="mb-2 text-3xl">⏰</div>
                  <div className="text-sm text-gray-500">暂无记事</div>
                  <div className="mt-1 text-xs text-gray-400">添加生日、纪念日、学习任务与待办</div>
                </div>
              )}
              {events.map((ev) => {
                const meta = EVENT_TYPE_META[ev.type];
                return (
                  <div key={ev.id} className={`mb-2 rounded-[10px] bg-white p-3 shadow-sm ${ev.paused ? "opacity-55" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span>{meta.icon}</span>
                          <span className="text-sm font-bold text-gray-800">{ev.title}</span>
                          {(ev.completed||ev.completedDates?.length)&&<span className="text-xs text-green-800">已标记完成</span>}
                          {ev.paused && <span className="rounded bg-gray-100 px-1.5 text-[10px] text-gray-400">已暂停</span>}
                        </div>
                        <div className="mt-1 text-[11px] text-gray-500">
                          {ev.relatedName ? `${ev.relatedName} · ` : ""}
                          {ev.type==="birthday"&&ev.birthYearKnown===false?(ev.dateMode==="lunar"?"出生年份未记录":`${ev.month}月${ev.day}日（出生年份未记录）`):fmtYMD(ev.year, ev.month, ev.day)}
                          {lunarDescOf(ev) && `（${lunarDescOf(ev)}）`} · {REPEAT_LABELS[ev.repeat]}
                          {ev.repeat === "custom" ? `每${ev.customInterval}${CUSTOM_UNITS.find((u) => u.v === ev.customUnit)?.label || "天"}` : ""}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {ev.reminders.map((r, i) => (
                            <span key={i} className="rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px]" style={{ color: BRAND }}>
                              {REMINDER_OFFSET_OPTIONS.find((o) => o.offsetMinutes === r.offsetMinutes)?.label || `提前${r.offsetMinutes}分钟`}
                            </span>
                          ))}
                        </div>
                        <div className="my-2 flex flex-wrap gap-3 text-xs">
                          <InterfaceButton onClick={()=>{const result=completeNextEventOccurrence(ev.id);showTip(result.success?"已完成本次，后续重复仍保留":result.error||"未完成");refresh();}}>完成本次</InterfaceButton>
                          {(ev.completed||!!ev.completedDates?.length)&&<InterfaceButton onClick={()=>{const result=undoEventCompletion(ev.id);showTip(result.success?"已撤销最近一次完成标记":result.error||"未恢复");refresh();}}>撤销完成</InterfaceButton>}
                          <InterfaceButton onClick={()=>{const result=snoozeNextEventOccurrence(ev.id,15);showTip(result.success?"已改为15分钟后提醒，原本次提醒已替换":result.error||"未设置");refresh();}}>稍后15分钟提醒</InterfaceButton>
                        </div>
                        {ev.note && <div className="mt-1 line-clamp-2 text-[11px] text-gray-400">{ev.note}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <ToggleSwitch checked={!ev.paused} onChange={() => { setEventPaused(ev.id, !ev.paused); refresh(); }} size="sm" />
                        <div className="flex gap-2">
                          <InterfaceButton onClick={() => openEdit(ev)} className="text-[11px] font-medium" style={{ color: BRAND }}>
                            编辑
                          </InterfaceButton>
                          <InterfaceButton onClick={() => handleDelete(ev.id)} className="text-[11px] text-red-400">
                            删除
                          </InterfaceButton>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* 数据管理 */}
              <div className="mb-2 rounded-[10px] bg-white p-3 shadow-sm">
                <div className="mb-1.5 text-xs font-semibold text-gray-600">数据管理</div>
                <div className="mb-2 text-[11px] leading-relaxed text-gray-400">
                  记事保存在当前设备的账号／游客空间中；请自行导出备份，清理浏览器或卸载可能丢失。支持导出备份与彻底删除，遵循最小收集与隐私合规要求。
                </div>
                <div className="flex gap-2">
                  <InterfaceButton onClick={() => setShowExport(true)} className="flex-1 rounded-lg border border-purple-200 py-2 text-xs font-medium" style={{ color: BRAND }}>
                    导出数据
                  </InterfaceButton>
                  <InterfaceButton onClick={handleDeleteAll} className="flex-1 rounded-lg border border-red-100 bg-red-50 py-2 text-xs font-medium text-red-500">
                    彻底删除全部
                  </InterfaceButton>
                </div>
              </div>
            </>
          )}

          {/* ===== 即将到来 ===== */}
          {tab === "upcoming" && (
            <>
              {upcoming.length === 0 && (
                <div className="rounded-[10px] bg-white p-8 text-center shadow-sm">
                  <div className="text-sm text-gray-500">未来60天暂无即将到来的记事</div>
                </div>
              )}
              {upcoming.map((o, i) => (
                <div key={i} className="mb-2 flex items-center justify-between rounded-[10px] bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EVENT_TYPE_META[o.event.type].icon}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {o.event.title}
                        {o.event.relatedName ? " · " + o.event.relatedName : ""}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {fmtYMD(o.y, o.m, o.d)}
                        {o.lunarDesc ? `（${o.lunarDesc}）` : ""}
                      </div>
                    </div>
                  </div>
                  <span
                    className="rounded-full px-2 py-1 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: o.daysAway === 0 ? "#dc2626" : o.daysAway <= 3 ? "#d97706" : BRAND }}
                  >
                    {o.daysAway === 0 ? "今天" : o.daysAway === 1 ? "明天" : `${o.daysAway}天后`}
                  </span>
                </div>
              ))}
            </>
          )}

          {/* ===== 提醒历史 ===== */}
          {tab === "history" && (
            <>
              {logs.length === 0 && (
                <div className="rounded-[10px] bg-white p-8 text-center shadow-sm">
                  <div className="text-sm text-gray-500">暂无提醒记录</div>
                  <div className="mt-1 text-xs text-gray-400">到点触发后会在此记录，同一事件同一次数只触发一次</div>
                </div>
              )}
              {logs.map((l) => (
                <div key={l.id} className="mb-2 rounded-[10px] bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">{l.eventTitle}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${l.status === "fired" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                      {l.status === "fired" ? "已送达" : "失败"}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-400">
                    事件日 {new Date(l.occurrenceTs).toLocaleDateString("zh-CN")} ·{" "}
                    {REMINDER_OFFSET_OPTIONS.find((o) => o.offsetMinutes === l.offsetMinutes)?.label || `提前${l.offsetMinutes}分钟`} · 触发于{" "}
                    {new Date(l.firedAt).toLocaleString("zh-CN")}
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-400">通道：{l.channels.join(" + ") || "-"}</div>
                  {l.error && <div className="mt-1 text-[10px] text-red-400">失败原因：{l.error}</div>}
                </div>
              ))}
            </>
          )}
        </div>

        {/* ===== 新建按钮 ===== */}
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(76px + env(safe-area-inset-bottom))] pt-2" style={{ maxWidth: "500px", margin: "0 auto", pointerEvents: "none" }}>
          <InterfaceButton
            onClick={openCreate}
            className="pointer-events-auto w-full rounded-xl py-3 text-sm font-bold text-white shadow-lg active:opacity-80"
            style={{ backgroundColor: BRAND, pointerEvents: "auto" }}
          >
            ＋ 新建记事
          </InterfaceButton>
        </div>

        {/* ===== 上限提示 ===== */}
        {limitReached && (
          <div
            className="fixed inset-0 z-[70] flex justify-center bg-black/40 px-6"
            style={{ paddingTop: "max(8vh, 48px)", alignItems: "flex-start" }}
            onClick={() => setLimitReached(false)}
          >
            <div className="w-full max-w-[340px] rounded-2xl bg-white p-4 text-center" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 text-sm font-bold text-gray-800">已达记事上限</div>
              <div className="mb-3 text-xs text-gray-500">当前上限 {reminderCfg.maxEventsPerUser} 条，可删除不需要的记事后继续添加。</div>
              <InterfaceButton onClick={() => setLimitReached(false)} className="w-full rounded-lg py-2 text-sm text-white" style={{ backgroundColor: BRAND }}>
                知道了
              </InterfaceButton>
            </div>
          </div>
        )}

        {/* ===== 新建/编辑弹窗（P7-补05 统一规范：居中偏上 + 最大80vh + 内部滚动 + 蒙层/右上角双关闭） ===== */}
        {showForm && (
          <div
            className="fixed inset-0 z-[60] flex justify-center bg-black/40"
            style={{ paddingTop: "max(8vh, 48px)", alignItems: "flex-start", paddingBottom: "12vh" }}
            onClick={() => setShowForm(false)}
          >
            <div
              className="w-full rounded-2xl bg-white"
              style={{ maxWidth: "380px", maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b px-4 py-3 flex-shrink-0">
                <span className="text-base font-bold text-gray-800">{form.id ? "编辑记事" : "新建记事"}</span>
                <InterfaceButton onClick={() => setShowForm(false)} className="h-11 w-11 rounded-full bg-gray-100 text-gray-500" aria-label="关闭记事弹窗">
                  ✕
                </InterfaceButton>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {/* 事件类型 */}
                <div className="mb-3">
                  <InterfaceLabel className="mb-1 block text-xs font-medium text-gray-600">事件类型</InterfaceLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {EVENT_TYPES.map((t) => (
                      <InterfaceButton
                        key={t}
                        onClick={() =>
                          setForm((f) => {
                            const nf = { ...f, type: t };
                            // 新建且用户未手动调整过：生日/纪念日默认每年农历重复
                            if (!f.id && (t === "birthday" || t === "anniversary") && !calendarTouched) {
                              nf.repeat = "yearly";
                              nf.dateMode = "lunar";
                            }
                            return nf;
                          })
                        }
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${form.type === t ? "text-white" : "bg-gray-100 text-gray-600"}`}
                        style={form.type === t ? { backgroundColor: BRAND } : undefined}
                      >
                        {EVENT_TYPE_META[t].icon} {EVENT_TYPE_META[t].label}
                      </InterfaceButton>
                    ))}
                  </div>
                </div>

                {/* 标题 */}
                <div className="mb-3">
                  <InterfaceLabel className="mb-1 block text-xs font-medium text-gray-600">标题 *</InterfaceLabel>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    maxLength={50}
                    placeholder={form.type === "birthday" ? "如：妈妈的生日" : "如：领证纪念日"}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-400"
                  />
                </div>

                {/* 关联对象 */}
                <div className="mb-3">
                  <InterfaceLabel className="mb-1 block text-xs font-medium text-gray-600">关联对象（可选）</InterfaceLabel>
                  <input
                    value={form.relatedName}
                    onChange={(e) => setForm((f) => ({ ...f, relatedName: e.target.value }))}
                    maxLength={20}
                    placeholder="如：妈妈、老婆、公司"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-400"
                  />
                </div>

                {/* 历法模式 */}
                <div className="mb-3">
                  <InterfaceLabel className="mb-1 block text-xs font-medium text-gray-600">{ui("历法")}</InterfaceLabel>
                  <SegBtn
                    options={[
                      { value: "solar", label: "公历", active: form.dateMode === "solar" },
                      { value: "lunar", label: "农历", active: form.dateMode === "lunar" },
                    ]}
                    onClick={(v) => {
                      setCalendarTouched(true);
                      setForm((f) => ({ ...f, dateMode: v as DateMode }));
                    }}
                  />
                  {form.dateMode === "lunar" && (
                    <div className="mt-1 text-[11px] text-gray-400">生日可直接选择农历月日；其他记事按所选公历日换算。闰月和缺日按下方保存的规则处理</div>
                  )}
                </div>

                {/* Birthday month/day may be stored without collecting a birth year. */}
                <div className="mb-3 space-y-2">
                  {form.type==="birthday"?<>
                    <InterfaceLabel className="block text-sm"><input type="checkbox" checked={form.birthYearKnown} onChange={e=>setForm(f=>({...f,birthYearKnown:e.target.checked,repeat:e.target.checked?f.repeat:"yearly"}))}/> 记录出生年份（选填）</InterfaceLabel>
                    {form.birthYearKnown&&<InterfaceLabel className="block text-sm">{form.dateMode==="lunar"?"农历出生年":"公历出生年"}<input aria-label="生日出生年份" type="number" min={1} max={3000} value={form.birthdayYear} onChange={e=>setForm(f=>({...f,birthdayYear:Number(e.target.value)}))} className="m-2 rounded border p-2"/></InterfaceLabel>}
                    {form.dateMode==="lunar"?<div className="flex flex-wrap gap-2 text-sm">
                      <InterfaceLabel>农历月<select aria-label="生日农历月" value={Math.abs(form.lunarMonth)} onChange={e=>setForm(f=>({...f,lunarMonth:(f.lunarMonth<0?-1:1)*Number(e.target.value)}))} className="m-1 rounded border p-2">{Array.from({length:12},(_,i)=><InterfaceOption key={i+1} value={i+1}>{i+1}月</InterfaceOption>)}</select></InterfaceLabel>
                      <InterfaceLabel>农历日<select aria-label="生日农历日" value={form.lunarDay} onChange={e=>setForm(f=>({...f,lunarDay:Number(e.target.value)}))} className="m-1 rounded border p-2">{Array.from({length:30},(_,i)=><InterfaceOption key={i+1} value={i+1}>{i+1}日</InterfaceOption>)}</select></InterfaceLabel>
                      <InterfaceLabel><input type="checkbox" checked={form.lunarMonth<0} onChange={e=>setForm(f=>({...f,lunarMonth:(e.target.checked?-1:1)*Math.abs(f.lunarMonth)}))}/> 闰月</InterfaceLabel>
                    </div>:<div className="flex flex-wrap gap-2 text-sm">
                      <InterfaceLabel>公历月<select aria-label="生日公历月" value={Number(form.dateStr.split('-')[1])} onChange={e=>setForm(f=>{const month=Number(e.target.value),day=Math.min(Number(f.dateStr.split('-')[2]),new Date(2000,month,0).getDate());return {...f,dateStr:fmtYMD(2000,month,day)};})} className="m-1 rounded border p-2">{Array.from({length:12},(_,i)=><InterfaceOption key={i+1} value={i+1}>{i+1}月</InterfaceOption>)}</select></InterfaceLabel>
                      <InterfaceLabel>公历日<select aria-label="生日公历日" value={Number(form.dateStr.split('-')[2])} onChange={e=>setForm(f=>({...f,dateStr:fmtYMD(2000,Number(f.dateStr.split('-')[1]),Number(e.target.value))}))} className="m-1 rounded border p-2">{Array.from({length:new Date(2000,Number(form.dateStr.split('-')[1]),0).getDate()},(_,i)=><InterfaceOption key={i+1} value={i+1}>{i+1}日</InterfaceOption>)}</select></InterfaceLabel>
                    </div>}
                    <p className="text-xs text-gray-500">未记录出生年份时只按月日逐年提醒，内部日历锚点不是出生年份。不读取通讯录，也不会用于同辰搜索。</p>
                  </>:<><InterfaceLabel className="block text-xs">日期</InterfaceLabel><SolarDatePicker value={form.dateStr} onChange={v=>setForm(f=>({...f,dateStr:v}))}/>{form.dateMode==="lunar"&&<p className="text-xs">对应 {formLunarHint}</p>}</>}
                </div>

                <div className="mb-4 space-y-2 text-sm text-gray-800">
                  <InterfaceLabel className="block">事件钟点 <input aria-label="事件钟点" type="time" value={form.eventTime} onChange={e=>setForm(f=>({...f,eventTime:e.target.value}))}/></InterfaceLabel>
                  <InterfaceLabel className="block">事件时区 <input aria-label="事件时区" className="w-full border rounded p-2" value={form.timeZone} onChange={e=>setForm(f=>({...f,timeZone:e.target.value}))}/></InterfaceLabel>
                  <InterfaceLabel className="block">无同名闰月的年份 <select value={form.birthdayRules.leapMonth} onChange={e=>setForm(f=>({...f,birthdayRules:{...f.birthdayRules,leapMonth:e.target.value as BirthdayRules["leapMonth"]}}))}><InterfaceOption value="skip">该年不提醒</InterfaceOption><InterfaceOption value="regular">按同名普通月提醒</InterfaceOption></select></InterfaceLabel>
                  <InterfaceLabel className="block">农历小月没有三十 <select value={form.birthdayRules.missingLunarDay} onChange={e=>setForm(f=>({...f,birthdayRules:{...f.birthdayRules,missingLunarDay:e.target.value as BirthdayRules["missingLunarDay"]}}))}><InterfaceOption value="skip">该年不提醒</InterfaceOption><InterfaceOption value="last-day">按该月最后一天提醒</InterfaceOption></select></InterfaceLabel>
                  <InterfaceLabel className="block">公历平年没有2月29日 <select value={form.birthdayRules.feb29} onChange={e=>setForm(f=>({...f,birthdayRules:{...f.birthdayRules,feb29:e.target.value as BirthdayRules["feb29"]}}))}><InterfaceOption value="skip">该年不提醒</InterfaceOption><InterfaceOption value="feb28">2月28日提醒</InterfaceOption><InterfaceOption value="mar1">3月1日提醒</InterfaceOption></select></InterfaceLabel>
                  <p className="text-xs text-gray-500">记事默认私有，不读取通讯录，不加入同辰搜索。重复的夏令时时刻按第一次执行，不存在的时刻跳过。</p>
                </div>
                {/* 重复规则 */}
                <div className="mb-3">
                  <InterfaceLabel className="mb-1 block text-xs font-medium text-gray-600">重复</InterfaceLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {REPEAT_OPTIONS.filter(r=>form.type!=="birthday"||form.birthYearKnown||r==="yearly").map((r) => (
                      <InterfaceButton
                        key={r}
                        onClick={() => {
                          setCalendarTouched(true);
                          setForm((f) => ({ ...f, repeat: r }));
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${form.repeat === r ? "text-white" : "bg-gray-100 text-gray-600"}`}
                        style={form.repeat === r ? { backgroundColor: BRAND } : undefined}
                      >
                        {REPEAT_LABELS[r]}
                      </InterfaceButton>
                    ))}
                  </div>
                  {form.repeat === "custom" && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-500">每</span>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={form.customInterval}
                        onChange={(e) => setForm((f) => ({ ...f, customInterval: e.target.value }))}
                        className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-center text-sm outline-none focus:border-purple-400"
                      />
                      <select
                        value={form.customUnit}
                        onChange={(e) => setForm((f) => ({ ...f, customUnit: e.target.value as typeof f.customUnit }))}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none"
                      >
                        {CUSTOM_UNITS.map((u) => (
                          <InterfaceOption key={u.v} value={u.v}>
                            {u.label}
                          </InterfaceOption>
                        ))}
                      </select>
                      <span className="text-xs text-gray-500">重复一次</span>
                    </div>
                  )}
                </div>

                {/* 提醒档位（多选） */}
                <div className="mb-3">
                  <InterfaceLabel className="mb-1 block text-xs font-medium text-gray-600">提醒时间（可多选） *</InterfaceLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {offsetOptions.map((o) => (
                      <InterfaceButton
                        key={o.offsetMinutes}
                        onClick={() => toggleReminder(o.offsetMinutes)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                          form.reminders.includes(o.offsetMinutes) ? "text-white" : "bg-gray-100 text-gray-600"
                        }`}
                        style={form.reminders.includes(o.offsetMinutes) ? { backgroundColor: BRAND } : undefined}
                      >
                        {o.label}
                      </InterfaceButton>
                    ))}
                  </div>
                </div>

                {/* 备注 */}
                <div className="mb-3">
                  <InterfaceLabel className="mb-1 block text-xs font-medium text-gray-600">备注（可选）</InterfaceLabel>
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    maxLength={500}
                    rows={3}
                    placeholder="补充说明，纯文本永久留存"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-400"
                  />
                </div>

                <div className="mb-2 rounded-lg bg-gray-50 p-2.5 text-[11px] leading-relaxed text-gray-400">
                  提醒将通过站内消息送达；如开启系统推送授权，将同步系统通知。数据仅本人可见，可随时导出或删除。
                </div>
              </div>
              <div className="border-t px-4 py-3" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
                <InterfaceButton onClick={submitForm} className="w-full rounded-xl py-3 text-sm font-bold text-white active:opacity-80" style={{ backgroundColor: BRAND }}>
                  {form.id ? "保存修改" : "创建记事"}
                </InterfaceButton>
              </div>
            </div>
          </div>
        )}

        {/* ===== P7-补05：提交前重复规则确认弹窗（居中偏上） ===== */}
        {confirming && (
          <div
            className="fixed inset-0 z-[80] flex justify-center bg-black/50"
            style={{ paddingTop: "max(8vh, 48px)", alignItems: "flex-start" }}
            onClick={() => setConfirming(false)}
          >
            <div
              className="w-full rounded-2xl bg-white p-4"
              style={{ maxWidth: "340px", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-800">请确认提醒规则</span>
                <InterfaceButton onClick={() => setConfirming(false)} className="h-9 w-9 rounded-full bg-gray-100 text-gray-500" aria-label="关闭确认弹窗">
                  ✕
                </InterfaceButton>
              </div>
              <div className="mb-3 space-y-1.5 rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
                <div>
                  事件：<span className="font-semibold text-gray-800">{EVENT_TYPE_META[form.type].icon} {form.title}</span>
                  {form.relatedName ? ` · ${form.relatedName}` : ""}
                </div>
                <div>
                  日期：{form.dateStr}
                  {form.dateMode === "lunar" && formLunarHint ? `（${formLunarHint}）` : ""} · {form.dateMode === "lunar" ? "农历" : "公历"}
                </div>
                <div>
                  重复规则：<span className="font-semibold" style={{ color: BRAND }}>{repeatSummary}</span>
                </div>
                <div>
                  提醒档位：
                  {form.reminders
                    .map((o) => REMINDER_OFFSET_OPTIONS.find((x) => x.offsetMinutes === o)?.label || `提前${o}分钟`)
                    .join("、")}
                </div>
              </div>
              <div className="mb-3 text-[11px] text-gray-400">确认后按上述规则推算并触发提醒；如需调整请返回修改。</div>
              <div className="flex gap-2">
                <InterfaceButton onClick={() => setConfirming(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-500">
                  返回修改
                </InterfaceButton>
                <InterfaceButton onClick={doSaveForm} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white active:opacity-80" style={{ backgroundColor: BRAND }}>
                  确认提交
                </InterfaceButton>
              </div>
            </div>
          </div>
        )}

        {/* ===== 导出确认弹窗 ===== */}
        {showExport && (
          <div
            className="fixed inset-0 z-[60] flex justify-center bg-black/40 px-6"
            style={{ paddingTop: "max(8vh, 48px)", alignItems: "flex-start" }}
            onClick={() => setShowExport(false)}
          >
            <div className="w-full max-w-[340px] rounded-2xl bg-white p-4" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 text-sm font-bold text-gray-800">导出记事数据</div>
              <div className="mb-3 text-xs leading-relaxed text-gray-500">
                将导出全部记事与提醒历史为 JSON 文件，包含事件内容与提醒记录，请妥善保管。
              </div>
              <div className="flex gap-2">
                <InterfaceButton onClick={() => setShowExport(false)} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-500">
                  取消
                </InterfaceButton>
                <InterfaceButton onClick={handleExport} className="flex-1 rounded-lg py-2 text-sm text-white" style={{ backgroundColor: BRAND }}>
                  导出
                </InterfaceButton>
              </div>
            </div>
          </div>
        )}

        {/* 全局提示 */}
        {tip && (
          <div className="fixed left-1/2 top-16 z-[90] -translate-x-1/2 rounded-full bg-black/75 px-4 py-2 text-xs text-white">{tip}</div>
        )}

        {/* 统一免责声明 */}
        <div className="py-2.5 text-center text-[10px] text-gray-400">内容仅供文化娱乐参考，不构成任何专业建议</div>
    </div>
  );
}
