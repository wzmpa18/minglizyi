"use client";

import { useState, useCallback, useEffect } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";
import {
  saveMingzhuProfile,
  listPaipanRecords,
  type PaipanRecord,
  listMingzhuProfiles,
  deleteMingzhuProfile,
  type MingzhuProfile,
  type ProfileDraft,
} from "@/lib/nativePaipanStore";
import { getUserPermissionLevel } from "@/lib/aiService";

import { profileFromRecord, TOOL_NAMES } from "@/lib/paipanProfiles";
import { afterPopupClose } from "@/lib/popupTransition";

const BRAND = "#7B2FBE";

interface MingzhuProfilePickerProps {
  /** 当前选中的命主档案（null 表示未选择） */
  value: MingzhuProfile | null;
  /** 选中/清除命主时回调（页面负责把基础信息回填到表单） */
  onChange: (p: MingzhuProfile | null) => void;
  /** 从当前表单构造档案草稿——「存为档案」按钮用，把当前排盘的命主信息沉淀到档案库 */
  buildDraft: () => ProfileDraft;
}

/**
 * v25.0.88 命主档案选择器：跨工具共享的统一命主档案库。
 * 选择已有档案 → 基础信息回填当前工具；「存为档案」→ 当前命主信息沉淀进档案库，
 * 下次其他工具可直接导入。
 * 游客模式不渲染（命主档案库属注册用户核心功能，与排盘历史入口同一边界）。
 */
export function MingzhuProfilePicker({ value, onChange, buildDraft }: MingzhuProfilePickerProps) {
  // v25.0.88: 游客隐藏入口（注册后完整可用）
  const [gated, setGated] = useState(true);
  useEffect(() => {
    const refresh = () => setGated(getUserPermissionLevel() === "visitor");
    refresh(); window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  const [show, setShow] = useState(false);
  const [profiles, setProfiles] = useState<MingzhuProfile[]>([]);
  const [records, setRecords] = useState<PaipanRecord[]>([]);
  const [tab, setTab] = useState<"profiles" | "records">("records");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useBodyScrollLock(show);
  usePopupBackHandler(() => setShow(false), show);

  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }, []);

  const refresh = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const [ps, rs] = await Promise.all([listMingzhuProfiles(q), listPaipanRecords()]);
      setProfiles(ps);
      setRecords(rs.filter(r => !q || `${r.title} ${r.input.name || ""}`.includes(q)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (show) refresh();
  }, [show, refresh]);

  const handlePick = useCallback((p: MingzhuProfile) => {
    afterPopupClose(() => onChange(p));
    setShow(false);
  }, [onChange]);

  /** 把当前表单命主信息存为新档案（或更新已有档案） */
  const handleSaveDraft = useCallback(async () => {
    try {
      const draft = buildDraft();
      if (!draft || !draft.name || !draft.name.trim()) {
        flashToast("请先填写命主姓名");
        return;
      }
      const saved = await saveMingzhuProfile({ ...draft, id: value?.id });
      setProfiles((ps) => [saved, ...ps.filter((p) => p.id !== saved.id)]);
      afterPopupClose(() => onChange(saved));
      setShow(false);
      flashToast("已存入命主档案库");
    } catch {
      flashToast("保存失败，请重试");
    }
  }, [buildDraft, value, onChange, flashToast]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteMingzhuProfile(id);
      setProfiles((ps) => ps.filter((p) => p.id !== id));
      if (value?.id === id) onChange(null);
    } catch {
      flashToast("删除失败");
    }
  }, [value, onChange, flashToast]);

  useEffect(() => {
    const receive = (event: Event) => { const p = (event as CustomEvent<MingzhuProfile>).detail; onChange(p); };
    window.addEventListener("paipan-import-profile", receive);
    return () => window.removeEventListener("paipan-import-profile", receive);
  }, [onChange]);

  if (gated) return null;

  return (
    <div>
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium"
        style={{ borderColor: BRAND + "55", color: BRAND }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {value ? `命主：${value.name}` : "档案 / 跨工具导入"}
      </button>

      {toast && (
        <div
          className="fixed left-1/2 z-[70] -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white"
          style={{ bottom: 90 }}
        >
          {toast}
        </div>
      )}

      {show && (
        <div className="fixed inset-0 z-[60] flex items-stretch justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShow(false)} />
          <div className="relative z-10 h-full w-[92%] max-w-md overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-base font-bold text-gray-800">命主档案与跨工具记录</span>
              <button onClick={() => setShow(false)} className="px-1 text-2xl leading-none text-gray-400">
                ×
              </button>
            </div>

            <div className="flex gap-2 px-3 pt-3">
              <button onClick={() => setTab("records")} className={`flex-1 rounded-lg p-2 text-sm ${tab === "records" ? "bg-purple-100 text-purple-800" : "bg-gray-100"}`}>所有工具记录</button>
              <button onClick={() => setTab("profiles")} className={`flex-1 rounded-lg p-2 text-sm ${tab === "profiles" ? "bg-purple-100 text-purple-800" : "bg-gray-100"}`}>命主档案</button>
            </div>
            <div className="p-3">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  refresh(e.target.value || undefined);
                }}
                placeholder="按姓名搜索"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
              />
              <button
                onClick={handleSaveDraft}
                className="mt-2 w-full rounded-lg py-2 text-xs font-semibold text-white"
                style={{ backgroundColor: BRAND }}
              >
                将当前命主信息存为档案（各工具共用）
              </button>
            </div>

            <div className="max-h-[45vh] overflow-y-auto px-3 pb-3">
              {loading ? (
                <div className="py-10 text-center text-sm text-gray-400">加载中…</div>
              ) : tab === "records" ? (
                <div className="space-y-2">
                  {records.length === 0 && <p className="py-8 text-center text-sm text-gray-400">暂无排盘记录，排盘成功后会自动保存</p>}
                  {records.map(r => { const p = profileFromRecord(r); return (
                    <div key={r.id} className="rounded-xl bg-gray-50 p-3">
                      <div className="text-xs text-purple-700">{TOOL_NAMES[r.tool] || r.tool}</div>
                      <div className="my-1 text-sm text-gray-800">{r.title}</div>
                      {p ? <><div className="text-xs text-gray-500">{p.gender} {p.birthDate} {p.birthTime} {p.birthPlace}</div>
                      <button onClick={() => handlePick(p)} className="mt-2 rounded-lg bg-purple-700 px-3 py-2 text-xs text-white">导入出生与个人信息</button></>
                      : <p className="text-xs text-gray-400">此记录没有完整出生信息，不能作为生日导入</p>}
                    </div>
                  ); })}
                </div>
              ) : profiles.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">
                  档案库为空，排盘后点击上方按钮存入命主档案
                </div>
              ) : (
                <div className="space-y-2">
                  {profiles.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 p-3">
                      <div className="min-w-0 flex-1" onClick={() => handlePick(p)}>
                        <div className="truncate text-sm font-medium text-gray-800">
                          {p.name}
                          {p.gender ? <span className="ml-1 text-gray-400">（{p.gender}）</span> : null}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-gray-400">
                          {[p.birthDate, p.birthTime].filter(Boolean).join(" ") || "生日信息未填写"}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          onClick={() => handlePick(p)}
                          className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-white"
                          style={{ backgroundColor: BRAND }}
                        >
                          选择
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
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
              档案仅保存在本机，各排盘工具可直接导入姓名、性别、生日等基础信息
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
