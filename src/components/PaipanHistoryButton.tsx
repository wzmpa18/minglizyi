"use client";

import { useState, useCallback, useEffect } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";
import {
  listPaipanRecords,
  deletePaipanRecord,
  formatRecordTime,
  type PaipanRecord,
} from "@/lib/nativePaipanStore";
import { getUserPermissionLevel } from "@/lib/aiService";

const BRAND = "#7B2FBE";

interface PaipanHistoryButtonProps {
  /** 工具标识（与存储 tool 字段一致） */
  toolKey: string;
  /** 从历史记录恢复到页面表单（页面负责把 input 回填表单、result 回显结果） */
  onRestore: (record: PaipanRecord) => void;
}

/**
 * v25.0.88 排盘历史入口组件。
 * 排盘成功时页面调用 savePaipanRecord 自动落库（同参数原位去重），
 * 本组件只负责「历史」弹窗：查看 / 恢复 / 删除。
 * 原生壳内为 APP 私有 SQLite（清缓存不丢），web 走 localStorage。
 * 游客模式不渲染（排盘记录保存与查看属注册用户核心功能，与八字页 v25.0.87 合规边界一致）。
 */
export function PaipanHistoryButton({ toolKey, onRestore }: PaipanHistoryButtonProps) {
  // v25.0.88: 游客隐藏入口（注册后完整可用）
  const [gated] = useState(() => typeof window !== "undefined" && getUserPermissionLevel() === "visitor");
  const [showHistory, setShowHistory] = useState(false);
  const [records, setRecords] = useState<PaipanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useBodyScrollLock(showHistory);
  usePopupBackHandler(() => setShowHistory(false), showHistory);
  if (gated) return null;

  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRecords(await listPaipanRecords(toolKey));
    } finally {
      setLoading(false);
    }
  }, [toolKey]);

  useEffect(() => {
    if (showHistory) refresh();
  }, [showHistory, refresh]);

  const handleRestore = useCallback((record: PaipanRecord) => {
    setShowHistory(false);
    onRestore(record);
  }, [onRestore]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deletePaipanRecord(id);
      setRecords((rs) => rs.filter((r) => r.id !== id));
    } catch {
      flashToast("删除失败");
    }
  }, [flashToast]);

  return (
    <div className="inline-flex">
      <button
        onClick={() => setShowHistory(true)}
        className="rounded-lg border px-3 py-1.5 text-xs font-medium"
        style={{ borderColor: BRAND + "55", color: BRAND }}
      >
        历史
      </button>

      {toast && (
        <div
          className="fixed left-1/2 z-[70] -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white"
          style={{ bottom: 90 }}
        >
          {toast}
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowHistory(false)} />
          <div className="relative z-10 max-h-[75vh] w-full max-w-md overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-base font-bold text-gray-800">排盘记录</span>
              <button onClick={() => setShowHistory(false)} className="px-1 text-2xl leading-none text-gray-400">
                ×
              </button>
            </div>
            <div className="max-h-[58vh] overflow-y-auto p-3">
              {loading ? (
                <div className="py-10 text-center text-sm text-gray-400">加载中…</div>
              ) : records.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">
                  暂无记录，排盘后自动保存到本机
                </div>
              ) : (
                <div className="space-y-2">
                  {records.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 p-3">
                      <div className="min-w-0 flex-1" onClick={() => handleRestore(r)}>
                        <div className="truncate text-sm font-medium text-gray-800">{r.title || "未命名排盘"}</div>
                        <div className="mt-0.5 text-[11px] text-gray-400">{formatRecordTime(r.createdAt)}</div>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          onClick={() => handleRestore(r)}
                          className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-white"
                          style={{ backgroundColor: BRAND }}
                        >
                          恢复
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 px-4 py-3 text-center text-[10px] leading-relaxed text-gray-400">
              排盘后自动保存到本机（APP 内为内置数据库，清缓存不丢失，卸载应用才会移除）
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
