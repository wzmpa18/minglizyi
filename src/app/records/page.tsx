"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import { fetchRecordsFromBackend, deleteRecordFromBackend, isLoggedIn } from "@/lib/recordSync";
import { useRouter } from "next/navigation";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

interface BackendRecord {
  id: number;
  record_type: string;
  record_data: any;
  note: string;
  status: string;
  created_at: string;
}

const RECORD_TYPE_MAP: Record<string, { label: string; icon: string; color: string }> = {
  name: { label: "姓名解析", icon: "姓", color: "#7B2FBE" },
  qiming: { label: "智能起名", icon: "起", color: "#2E8B57" },
  bazi: { label: "八字排盘", icon: "八", color: "#D4A017" },
  ziwei: { label: "紫微斗数", icon: "紫", color: "#1E6FBF" },
  liuren: { label: "大六壬", icon: "壬", color: "#D94040" },
  liuyao: { label: "六爻排盘", icon: "爻", color: "#A0522D" },
  meihua: { label: "梅花易数", icon: "梅", color: "#9B59B6" },
  qimen: { label: "奇门遁甲", icon: "奇", color: "#E67E22" },
};

export default function RecordsPage() {
  const { goBack } = useToolBack();
  const router = useRouter();
  const [records, setRecords] = useState<BackendRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("");
  const [loggedIn, setLoggedIn] = useState(true);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    if (!isLoggedIn()) {
      setLoggedIn(false);
      setLoading(false);
      return;
    }
    setLoggedIn(true);
    const data = await fetchRecordsFromBackend(filterType || undefined);
    setRecords(data);
    setLoading(false);
  }, [filterType]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这条记录吗？")) return;
    const success = await deleteRecordFromBackend(id);
    if (success) {
      setRecords(records.filter((r) => r.id !== id));
    } else {
      alert("删除失败，请稍后重试");
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return timeStr;
    }
  };

  const getRecordSummary = (record: BackendRecord): string => {
    try {
      const data = record.record_data;
      if (record.record_type === "name" && data?.fullName) {
        return `姓名：${data.fullName}`;
      }
      if (record.record_type === "qiming" && data?.surname) {
        return `${data.surname}姓${data.gender === "male" ? "男" : "女"}宝起名`;
      }
      if (data?.note) return data.note;
      return record.note || "点击查看详情";
    } catch {
      return "记录详情";
    }
  };

  const types = Object.keys(RECORD_TYPE_MAP);

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", flexDirection: "column" }}>
  <PageLoginGuard />
      <BrandHeader title="我的排盘记录" showBack />

      {/* 筛选标签 */}
      <div className="bg-white px-3 py-2 border-b border-gray-100">
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterType("")}
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all"
            style={{
              backgroundColor: !filterType ? BRAND : "#f5f0fa",
              color: !filterType ? "#fff" : "#888",
            }}
          >
            全部
          </button>
          {types.map((t) => {
            const info = RECORD_TYPE_MAP[t];
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all"
                style={{
                  backgroundColor: filterType === t ? info.color : "#f5f0fa",
                  color: filterType === t ? "#fff" : "#888",
                }}
              >
                {info.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="inline-block w-8 h-8 border-3 border-gray-200 border-t-purple-500 rounded-full animate-spin mb-3" style={{ borderTopColor: BRAND }} />
            <div className="text-sm">加载中...</div>
          </div>
        ) : !loggedIn ? (
          <div className="text-center py-20">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="text-sm text-gray-500 mb-2">请先登录查看排盘记录</div>
            <button
              onClick={() => router.push("/login")}
              className="rounded-full px-6 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: BRAND }}
            >
              去登录
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <div className="text-sm">暂无排盘记录</div>
            <div className="text-xs mt-1 text-gray-300">使用易学工具后排盘记录会自动保存</div>
          </div>
        ) : (
          <>
            <div className="mb-2 text-xs text-gray-400 px-1">
              共 {records.length} 条记录{filterType ? `（${RECORD_TYPE_MAP[filterType]?.label || filterType}）` : ""}
            </div>
            {records.map((record) => {
              const info = RECORD_TYPE_MAP[record.record_type] || { label: record.record_type, icon: "记", color: "#888" };
              return (
                <div
                  key={record.id}
                  className="bg-white rounded-xl p-3 mb-2.5 shadow-sm"
                  style={{ borderLeft: `3px solid ${info.color}` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: info.color }}
                      >
                        {info.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-700">{info.label}</span>
                          <span className="text-[10px] text-gray-400">{formatTime(record.created_at)}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          {getRecordSummary(record)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="shrink-0 ml-2 p-1 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
