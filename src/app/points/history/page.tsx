"use client";

import { useState, useEffect, useCallback } from "react";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import { getPointsRecords } from "@/lib/pointsStore";

const BRAND = "#7B2FBE";

interface PointsRecord {
  id: string;
  source: string;
  amount: number;
  type: "earn" | "spend";
  balance: number;
  createdAt: string;
  description: string;
}

type FilterType = "all" | "earn" | "spend";

export default function PointsHistoryPage() {
  const { goBack } = useToolBack();

  const [records, setRecords] = useState<PointsRecord[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const loadData = useCallback(() => {
    setLoading(true);
    try {
      const data = getPointsRecords();
      setRecords(data);
      setPage(1);
    } catch (e) {
      console.error("加载积分记录失败:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return `今天 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
      }
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return `昨天 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
      }
      return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    } catch {
      return timeStr;
    }
  };

  const filteredRecords = filter === "all"
    ? records
    : records.filter((r) => r.type === filter);

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#ededed", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="积分明细" showBack color={BRAND} onBack={goBack} />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {/* 筛选栏 */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          {([
            { key: "all", label: "全部" },
            { key: "earn", label: "获得" },
            { key: "spend", label: "消耗" },
          ] as { key: FilterType; label: string }[]).map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: "8px",
                backgroundColor: filter === item.key ? BRAND : "#fff",
                color: filter === item.key ? "#fff" : "#666",
                border: filter === item.key ? "none" : "1px solid #e0e0e0",
                fontSize: "14px",
                fontWeight: filter === item.key ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 记录列表 */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden" }}>
          {loading && records.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
              加载中...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: "14px" }}>
              {filter === "earn" ? "暂无获得记录" : filter === "spend" ? "暂无消耗记录" : "暂无积分记录"}
            </div>
          ) : (
            <>
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "14px 16px",
                    borderBottom: "1px solid #f5f5f5",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "#333", marginBottom: "4px" }}>
                      {record.description || record.source}
                    </div>
                    <div style={{ fontSize: "12px", color: "#bbb" }}>
                      {formatTime(record.createdAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        color: record.type === "earn" ? "#27ae60" : "#e74c3c",
                      }}
                    >
                      {record.type === "earn" ? "+" : "-"}{Math.abs(record.amount)}
                    </div>
                    <div style={{ fontSize: "11px", color: "#bbb" }}>
                      余额: {record.balance}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* 底部免责声明 */}
      <div style={{ padding: "12px 16px", textAlign: "center", fontSize: "11px", color: "#bbb", backgroundColor: "#ededed" }}>
        积分记录仅供参考，如有疑问请联系客服
      </div>
    </div>
  );
}
