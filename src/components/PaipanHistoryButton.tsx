"use client";

import { useRouter } from "next/navigation";
import { profileFromRecord, TOOL_NAMES } from "@/lib/paipanProfiles";
import { afterPopupClose } from "@/lib/popupTransition";
import { useState, useCallback, useEffect } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";
import {
  listPaipanRecords,
  deletePaipanRecord,
  formatRecordTime,
  updatePaipanRecordMeta,
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
  const [gated, setGated] = useState(true);
  useEffect(() => {
    const refresh = () => setGated(getUserPermissionLevel() === "visitor");
    refresh(); window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  const router = useRouter();
  const [scope, setScope] = useState<"current" | "all">("all");
  const [query, setQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [records, setRecords] = useState<PaipanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editNote, setEditNote] = useState("");

  useBodyScrollLock(showHistory);
  usePopupBackHandler(() => setShowHistory(false), showHistory);

  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRecords(await listPaipanRecords(scope === "all" ? undefined : toolKey));
    } catch {
      flashToast("记录读取失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [toolKey, scope]);

  useEffect(() => {
    if (showHistory) refresh();
  }, [showHistory, refresh]);

  const handleRestore = useCallback((record: PaipanRecord) => {
    setShowHistory(false);
    if (record.tool === toolKey) onRestore(record);
    else {
      sessionStorage.setItem("paipan_pending_restore", JSON.stringify(record));
      window.__skipPopupCleanup = true;
      router.push(`/yixue/${record.tool}/`);
    }
  }, [onRestore, toolKey, router]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deletePaipanRecord(id);
      setRecords((rs) => rs.filter((r) => r.id !== id));
    } catch {
      flashToast("删除失败");
    }
  }, [flashToast]);

  const beginEdit = useCallback((record: PaipanRecord) => {
    setEditingId(record.id);
    setEditName(String(record.input.name || ""));
    setEditNote(record.note || "");
  }, []);

  const saveEdit = useCallback(async () => {
    if (editingId == null) return;
    try {
      await updatePaipanRecordMeta(editingId, editName, editNote);
      setEditingId(null);
      await refresh();
      flashToast("名称和备注已更新");
    } catch {
      flashToast("修改失败，请重试");
    }
  }, [editingId, editName, editNote, refresh, flashToast]);

  useEffect(() => {
    const raw = sessionStorage.getItem("paipan_pending_restore");
    if (!raw) return;
    try { const record = JSON.parse(raw) as PaipanRecord;
      if (record.tool === toolKey) { sessionStorage.removeItem("paipan_pending_restore"); onRestore(record); }
    } catch { sessionStorage.removeItem("paipan_pending_restore"); }
  }, [toolKey, onRestore]);
  if (gated) return null;

  return (
    <div className="inline-flex">
      <button
        onClick={() => setShowHistory(true)}
        className="rounded-lg border px-3 py-1.5 text-xs font-medium"
        style={{ borderColor: BRAND + "55", color: BRAND }}
      >
        排盘记录
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
        <div className="fixed inset-0 z-[60] flex items-stretch justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowHistory(false)} />
          <div className="relative z-10 h-full w-[92%] max-w-md overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-base font-bold text-gray-800">排盘记录</span>
              <button onClick={() => setShowHistory(false)} className="px-1 text-2xl leading-none text-gray-400">
                ×
              </button>
            </div>
            <div className="flex gap-2 p-3">
              <button onClick={() => setScope("all")} className={`flex-1 rounded-lg p-2 text-sm ${scope === "all" ? "bg-purple-100 text-purple-800" : "bg-gray-100"}`}>全部工具</button>
              <button onClick={() => setScope("current")} className={`flex-1 rounded-lg p-2 text-sm ${scope === "current" ? "bg-purple-100 text-purple-800" : "bg-gray-100"}`}>当前工具</button>
            </div>
            <div className="px-3"><input aria-label="搜索排盘记录" value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索姓名、日期或工具" className="w-full rounded-lg border p-2 text-sm" /></div>
            <div className="overflow-y-auto p-3">
              {loading ? (
                <div className="py-10 text-center text-sm text-gray-400">加载中…</div>
              ) : records.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">
                  暂无记录，排盘后自动保存到本机
                </div>
              ) : (
                <div className="space-y-2">
                  {records.filter(r => `${r.title} ${r.input.name || ""} ${r.note || ""} ${TOOL_NAMES[r.tool] || r.tool}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map((r) => (
                    <div key={r.id} className="rounded-xl bg-gray-50 p-3">
                      {editingId === r.id ? <div className="space-y-2">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={60} placeholder="姓名或记录名称" className="w-full rounded-lg border bg-white p-2 text-sm" />
                        <input value={editNote} onChange={(e) => setEditNote(e.target.value)} maxLength={300} placeholder="备注（可选）" className="w-full rounded-lg border bg-white p-2 text-sm" />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingId(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600">取消</button>
                          <button onClick={saveEdit} className="rounded-lg px-3 py-1.5 text-xs text-white" style={{ backgroundColor: BRAND }}>保存修改</button>
                        </div>
                      </div> : <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1" onClick={() => handleRestore(r)}>
                        <div className="truncate text-sm font-medium text-gray-800">{TOOL_NAMES[r.tool] || r.tool} · {r.title || "未命名排盘"}</div>
                        {(r.input.name || r.note) && <div className="mt-0.5 truncate text-xs text-gray-600">{r.input.name ? `姓名：${String(r.input.name)}` : ""}{r.note ? ` · 备注：${r.note}` : ""}</div>}
                        <div className="mt-0.5 text-[11px] text-gray-400">{formatRecordTime(r.createdAt)}</div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5">
                        {["bazi", "ziwei", "qizheng", "chenggu"].includes(toolKey) && r.tool !== toolKey && profileFromRecord(r) && <button
                          onClick={() => { const p = profileFromRecord(r); if (!p) return;
                            afterPopupClose(() => window.dispatchEvent(new CustomEvent("paipan-import-profile", { detail:p })));
                            setShowHistory(false);
                          }} className="rounded-lg bg-purple-100 px-2.5 py-1 text-[11px] text-purple-800">导入个人信息</button>}
                        <button
                          onClick={() => handleRestore(r)}
                          className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-white"
                          style={{ backgroundColor: BRAND }}
                        >
                          {r.tool === toolKey ? "恢复" : "查看原盘"}
                        </button>
                        <button onClick={() => beginEdit(r)} className="rounded-lg border border-purple-200 px-2.5 py-1 text-[11px] text-purple-700">编辑名称/备注</button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500"
                        >
                          删除
                        </button>
                      </div>
                    </div>}
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
