"use client";

// ============================================================================
// 系统通知列表页 - P6-TOOL-04
// 统一消息中心（站内通知）：记事提醒 / 订单 / AI 报告 / 审核 / 奖励 / 系统
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { BrandHeader, SegBtn } from "@/components/shared";
import {
  listNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  clearAllNotifications,
  CATEGORY_META,
  type SystemNotification,
  type NotificationCategory,
} from "@/lib/notificationCenter";

const BRAND = "#7B2FBE";

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "reminder", label: "提醒" },
  { value: "order", label: "订单" },
  { value: "ai_report", label: "AI报告" },
  { value: "growth", label: "奖励" },
];

export default function SystemNotificationsPage() {
  const [items, setItems] = useState<SystemNotification[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const refresh = useCallback(() => {
    setItems(listNotifications());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = filter === "all" ? items : items.filter((n) => n.category === filter);
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="flex min-h-screen flex-col bg-[#ededed]" style={{ maxWidth: "500px", margin: "0 auto", paddingBottom: "calc(72px + env(safe-area-inset-bottom))" }}>
      <BrandHeader title="系统通知" showBack backUrl="/messages" />

      <div className="bg-white px-3 py-2">
        <SegBtn
          options={FILTERS.map((f) => ({
            value: f.value,
            label: f.value === "all" && unread > 0 ? `${f.label} (${unread})` : f.label,
            active: filter === f.value,
          }))}
          onClick={(v) => setFilter(v)}
        />
      </div>

      <div className="flex-1 px-3 py-2">
        {filtered.length === 0 && (
          <div className="rounded-[10px] bg-white p-8 text-center shadow-sm">
            <div className="mb-2 text-3xl">📭</div>
            <div className="text-sm text-gray-500">暂无系统通知</div>
            <div className="mt-1 text-xs text-gray-400">记事提醒、订单进展、AI 报告结果会在这里通知你</div>
          </div>
        )}

        {filtered.map((n) => {
          const meta = CATEGORY_META[n.category];
          return (
            <div
              key={n.id}
              className={`mb-2 rounded-[10px] bg-white p-3 shadow-sm ${n.read ? "" : "border-l-[3px]"}`}
              style={n.read ? undefined : { borderLeftColor: BRAND }}
              onClick={() => {
                if (!n.read) {
                  markRead(n.id);
                  refresh();
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span>{meta.icon}</span>
                    <span className="text-sm font-bold text-gray-800">{n.title}</span>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BRAND }} />}
                  </div>
                  <div className="mt-1 whitespace-pre-line text-xs leading-relaxed text-gray-600">{n.body}</div>
                  <div className="mt-1 text-[10px] text-gray-400">
                    {meta.label} · {new Date(n.createdAt).toLocaleString("zh-CN")}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(n.id);
                    refresh();
                  }}
                  className="ml-2 shrink-0 text-[11px] text-gray-300"
                >
                  删除
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 0 && (
        <div className="px-3 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => {
                markAllRead();
                refresh();
              }}
              className="flex-1 rounded-lg border border-purple-200 bg-white py-2 text-xs font-medium"
              style={{ color: BRAND }}
            >
              全部已读
            </button>
            <button
              onClick={() => {
                if (confirm("确定清空全部系统通知？")) {
                  clearAllNotifications();
                  refresh();
                }
              }}
              className="flex-1 rounded-lg border border-red-100 bg-white py-2 text-xs font-medium text-red-400"
            >
              清空通知
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
