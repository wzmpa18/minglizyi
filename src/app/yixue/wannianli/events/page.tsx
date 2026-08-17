"use client";

// ============================================================================
// 万年历·记事提醒管理页 - P6-TOOL-04 Phase 1
// 事件类型：生日/纪念日/节日/待办/自定义；公历/农历双轨；
// 重复规则（每年/每月/每周/自定义间隔）；多档位多次提醒；
// 新增/编辑/删除/暂停；提醒历史查询；导出与彻底删除（隐私合规）。
// ============================================================================

import { useState, useMemo, useEffect, useCallback } from "react";
import { BrandHeader, SolarDatePicker, SegBtn, ToggleSwitch } from "@/components/shared";
import {
  listEvents,
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

  const emptyForm: FormState = useMemo(
    () => ({
      type: "birthday",
      title: "",
      relatedName: "",
      note: "",
      dateMode: "solar",
      dateStr: fmtYMD(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
      repeat: "yearly",
      customInterval: "1",
      customUnit: "month",
      reminders: [1440],
    }),
    []
  );
  const [form, setForm] = useState<FormState>(emptyForm);

  const refresh = useCallback(() => {
    setEvents(listEvents());
    setUpcoming(getUpcomingEvents(60).filter((o) => o.daysAway >= 0));
    setLogs(getReminderLog().slice().reverse());
  }, []);

  useEffect(() => {
    refresh();
    // 推送权限状态
    try {
      if (typeof Notification === "undefined") setPushStatus("当前环境不支持系统推送，提醒将以站内消息送达");
      else if (Notification.permission === "granted") setPushStatus("系统推送已开启");
      else if (Notification.permission === "denied") setPushStatus("系统推送已被拒绝，可在浏览器设置中重新开启");
      else setPushStatus("系统推送未开启");
    } catch {
      setPushStatus("");
    }
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
    setShowForm(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setForm({
      id: ev.id,
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
    setShowForm(true);
  };

  const toggleReminder = (offset: number) => {
    setForm((f) => ({
      ...f,
      reminders: f.reminders.includes(offset) ? f.reminders.filter((x) => x !== offset) : [...f.reminders, offset].sort((a, b) => b - a),
    }));
  };

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
    if (form.reminders.length === 0) {
      showTip("请至少选择一个提醒档位");
      return;
    }
    const reminders: ReminderOffset[] = form.reminders.map((o) => ({ offsetMinutes: o }));
    if (form.id) {
      const r = updateEvent(form.id, {
        type: form.type,
        title: form.title,
        relatedName: form.relatedName,
        note: form.note,
        dateMode: form.dateMode,
        year: y,
        month: m,
        day: d,
        repeat: form.repeat,
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
        title: form.title,
        relatedName: form.relatedName,
        note: form.note,
        dateMode: form.dateMode,
        year: y,
        month: m,
        day: d,
        repeat: form.repeat,
        customInterval: form.repeat === "custom" ? Math.max(1, Number(form.customInterval) || 1) : undefined,
        customUnit: form.repeat === "custom" ? form.customUnit : undefined,
        reminders,
      });
      if (!r.success) {
        showTip(r.error || "创建失败");
        return;
      }
      showTip("已创建，将按设置提醒");
    }
    setShowForm(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm("确定删除该记事？删除后提醒同时取消。")) return;
    deleteEvent(id);
    refresh();
    showTip("已删除");
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

  const handleDeleteAll = () => {
    if (!confirm("确定彻底删除全部记事与提醒历史？此操作不可恢复。")) return;
    deleteAllEvents();
    refresh();
    showTip("已彻底删除全部记事数据");
  };

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
                <button onClick={enablePush} className="rounded-full px-2.5 py-1 text-[11px] font-medium text-white" style={{ backgroundColor: BRAND }}>
                  开启推送
                </button>
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
                  <div className="mt-1 text-xs text-gray-400">添加生日、纪念日、待办，到点自动提醒</div>
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
                          {ev.paused && <span className="rounded bg-gray-100 px-1.5 text-[10px] text-gray-400">已暂停</span>}
                        </div>
                        <div className="mt-1 text-[11px] text-gray-500">
                          {ev.relatedName ? `${ev.relatedName} · ` : ""}
                          {fmtYMD(ev.year, ev.month, ev.day)}
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
                        {ev.note && <div className="mt-1 line-clamp-2 text-[11px] text-gray-400">{ev.note}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <ToggleSwitch checked={!ev.paused} onChange={() => { setEventPaused(ev.id, !ev.paused); refresh(); }} size="sm" />
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(ev)} className="text-[11px] font-medium" style={{ color: BRAND }}>
                            编辑
                          </button>
                          <button onClick={() => handleDelete(ev.id)} className="text-[11px] text-red-400">
                            删除
                          </button>
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
                  记事数据仅本人可见，纯文本永久留存。支持导出备份与彻底删除，遵循最小收集与隐私合规要求。
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowExport(true)} className="flex-1 rounded-lg border border-purple-200 py-2 text-xs font-medium" style={{ color: BRAND }}>
                    导出数据
                  </button>
                  <button onClick={handleDeleteAll} className="flex-1 rounded-lg border border-red-100 bg-red-50 py-2 text-xs font-medium text-red-500">
                    彻底删除全部
                  </button>
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
          <button
            onClick={openCreate}
            className="pointer-events-auto w-full rounded-xl py-3 text-sm font-bold text-white shadow-lg active:opacity-80"
            style={{ backgroundColor: BRAND, pointerEvents: "auto" }}
          >
            ＋ 新建记事
          </button>
        </div>

        {/* ===== 上限提示 ===== */}
        {limitReached && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-6" onClick={() => setLimitReached(false)}>
            <div className="w-full max-w-[300px] rounded-xl bg-white p-4 text-center" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 text-sm font-bold text-gray-800">已达记事上限</div>
              <div className="mb-3 text-xs text-gray-500">当前上限 {reminderCfg.maxEventsPerUser} 条，可删除不需要的记事后继续添加。</div>
              <button onClick={() => setLimitReached(false)} className="w-full rounded-lg py-2 text-sm text-white" style={{ backgroundColor: BRAND }}>
                知道了
              </button>
            </div>
          </div>
        )}

        {/* ===== 新建/编辑弹窗（统一规范：maxHeight 85vh + 内容区滚动 + 安全区） ===== */}
        {showForm && (
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40"
            onClick={() => setShowForm(false)}
            style={{ display: "flex" }}
          >
            <div
              className="w-full rounded-t-2xl bg-white"
              style={{ maxWidth: "500px", maxHeight: "85vh", display: "flex", flexDirection: "column", paddingBottom: "env(safe-area-inset-bottom)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-base font-bold text-gray-800">{form.id ? "编辑记事" : "新建记事"}</span>
                <button onClick={() => setShowForm(false)} className="h-7 w-7 rounded-full bg-gray-100 text-gray-500">
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {/* 事件类型 */}
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">事件类型</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EVENT_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setForm((f) => ({ ...f, type: t }))}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${form.type === t ? "text-white" : "bg-gray-100 text-gray-600"}`}
                        style={form.type === t ? { backgroundColor: BRAND } : undefined}
                      >
                        {EVENT_TYPE_META[t].icon} {EVENT_TYPE_META[t].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 标题 */}
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">标题 *</label>
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
                  <label className="mb-1 block text-xs font-medium text-gray-600">关联对象（可选）</label>
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
                  <label className="mb-1 block text-xs font-medium text-gray-600">历法</label>
                  <SegBtn
                    options={[
                      { value: "solar", label: "公历", active: form.dateMode === "solar" },
                      { value: "lunar", label: "农历", active: form.dateMode === "lunar" },
                    ]}
                    onClick={(v) => setForm((f) => ({ ...f, dateMode: v as DateMode }))}
                  />
                  {form.dateMode === "lunar" && (
                    <div className="mt-1 text-[11px] text-gray-400">选择农历时，按所选公历日换算农历月日，每年按农历推算提醒</div>
                  )}
                </div>

                {/* 日期 */}
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">日期 *</label>
                  <SolarDatePicker value={form.dateStr} onChange={(v) => setForm((f) => ({ ...f, dateStr: v }))} />
                  {form.dateMode === "lunar" && formLunarHint && (
                    <div className="mt-1 text-[11px]" style={{ color: BRAND }}>
                      对应 {formLunarHint}
                    </div>
                  )}
                </div>

                {/* 重复规则 */}
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">重复</label>
                  <div className="flex flex-wrap gap-1.5">
                    {REPEAT_OPTIONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setForm((f) => ({ ...f, repeat: r }))}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${form.repeat === r ? "text-white" : "bg-gray-100 text-gray-600"}`}
                        style={form.repeat === r ? { backgroundColor: BRAND } : undefined}
                      >
                        {REPEAT_LABELS[r]}
                      </button>
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
                          <option key={u.v} value={u.v}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-gray-500">重复一次</span>
                    </div>
                  )}
                </div>

                {/* 提醒档位（多选） */}
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">提醒时间（可多选） *</label>
                  <div className="flex flex-wrap gap-1.5">
                    {offsetOptions.map((o) => (
                      <button
                        key={o.offsetMinutes}
                        onClick={() => toggleReminder(o.offsetMinutes)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                          form.reminders.includes(o.offsetMinutes) ? "text-white" : "bg-gray-100 text-gray-600"
                        }`}
                        style={form.reminders.includes(o.offsetMinutes) ? { backgroundColor: BRAND } : undefined}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 备注 */}
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">备注（可选）</label>
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
                <button onClick={submitForm} className="w-full rounded-xl py-3 text-sm font-bold text-white active:opacity-80" style={{ backgroundColor: BRAND }}>
                  {form.id ? "保存修改" : "创建记事"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== 导出确认弹窗 ===== */}
        {showExport && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6" onClick={() => setShowExport(false)}>
            <div className="w-full max-w-[300px] rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 text-sm font-bold text-gray-800">导出记事数据</div>
              <div className="mb-3 text-xs leading-relaxed text-gray-500">
                将导出全部记事与提醒历史为 JSON 文件，包含事件内容与提醒记录，请妥善保管。
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowExport(false)} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-500">
                  取消
                </button>
                <button onClick={handleExport} className="flex-1 rounded-lg py-2 text-sm text-white" style={{ backgroundColor: BRAND }}>
                  导出
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 全局提示 */}
        {tip && (
          <div className="fixed left-1/2 top-16 z-[90] -translate-x-1/2 rounded-full bg-black/75 px-4 py-2 text-xs text-white">{tip}</div>
        )}
    </div>
  );
}
