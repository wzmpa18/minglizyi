"use client";

// ============================================================================
// 言道国学 - 首页官方公告栏（永久功能）
// v25.0.47_19
//   · 从 /api/announcements/public 拉取生效中公告（未登录可访问）
//   · 顶部横向公告条：喇叭图标 + 最新公告标题轮播（横向滚动动画）
//   · 点击打开公告列表弹窗（级别配色：普通/重要/紧急）
//   · 用途：版本升级通知 / 维护公告——即使旧版本 APP、长期未登录，
//     打开首页即可看到最新公告，避免用户错过升级信息
//
// ⚠️ 永久功能约束（项目方明确要求）：本组件为首页永久入口，
//    任何后续版本迭代均不得移除，避免用户长期不登录导致无法获知升级信息。
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { getRuntimePlatform } from "@/lib/platformGate";

const BRAND = "#7B2FBE";

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  level: "info" | "important" | "urgent";
  platform?: string;
  pinned: boolean;
  publishAt: string;
  link: string | null;
}

const LEVEL_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  info: { label: "通知", bg: "#EEF2FF", color: "#4F46E5" },
  important: { label: "重要", bg: "#FFF7E6", color: "#D46B08" },
  urgent: { label: "紧急", bg: "#FFF1F0", color: "#CF1322" },
};

export default function AnnouncementBar() {
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      // v25.0.80: 携带平台标识（参数 + 请求头双通道），服务端按平台过滤公告，
      // iOS 壳不再看到安卓升级提示；旧版 APP 壳靠 UA 标记兜底过滤
      const platform = getRuntimePlatform();
      const res = await fetch(`/api/announcements/public?limit=20&platform=${platform}&t=${Date.now()}`, {
        cache: "no-store",
        headers: { "X-Client-Platform": platform },
      });
      const json = await res.json();
      if (json && json.success && Array.isArray(json.announcements) && json.announcements.length > 0) {
        setItems(json.announcements);
        setVisible(true);
      }
    } catch {
      // 公告加载失败时静默隐藏，不影响首页其他功能
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 最新公告标题轮播（每5秒切换）
  useEffect(() => {
    if (items.length <= 1 || open) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setIdx(i => (i + 1) % items.length);
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items.length, open]);

  if (!visible || items.length === 0) return null;

  const current = items[idx] || items[0];
  const lv = LEVEL_STYLE[current.level] || LEVEL_STYLE.info;

  return (
    <>
      {/* 公告条 */}
      <button
        onClick={() => setOpen(true)}
        className="mx-3 mt-3 flex w-[calc(100%-24px)] items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm active:opacity-90"
        style={{ border: "1px solid #F0E6FA" }}
        aria-label="官方公告"
      >
        <span
          className="flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[10px] font-bold"
          style={{ backgroundColor: "#F5EEFC", color: BRAND }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l18-5v12L3 13v-2z" />
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
          </svg>
          公告
        </span>
        <span
          key={current.id}
          className="flex-1 truncate text-left text-xs text-gray-700"
          style={{ animation: "yandao-ann-in 0.45s ease" }}
        >
          {current.pinned && <span style={{ color: "#D46B08", fontWeight: 700 }}>[置顶] </span>}
          {current.title}
        </span>
        <span className="shrink-0 text-[10px] text-gray-400">{items.length > 1 ? `${idx + 1}/${items.length}` : ""}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B9B3C6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* 公告列表弹窗 */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[75vh] w-full max-w-[360px] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm" style={{ backgroundColor: "#F5EEFC", color: BRAND }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11l18-5v12L3 13v-2z" />
                    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                  </svg>
                </span>
                <span className="text-base font-bold" style={{ color: BRAND }}>官方公告</span>
              </div>
              <button onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100" aria-label="关闭">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.4" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {items.map(item => {
                const l = LEVEL_STYLE[item.level] || LEVEL_STYLE.info;
                return (
                  <div key={item.id} className="rounded-xl border border-gray-100 p-3" style={{ backgroundColor: "#FAF8FD" }}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: l.bg, color: l.color }}>
                        {l.label}
                      </span>
                      {item.pinned && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "#FFF7E6", color: "#D46B08" }}>
                          置顶
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-gray-400">
                        {item.publishAt ? item.publishAt.slice(0, 10) : ""}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-gray-800">{item.title}</div>
                    <div className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-gray-600">{item.content}</div>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs font-medium underline"
                        style={{ color: BRAND }}
                      >
                        查看详情 →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes yandao-ann-in {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
