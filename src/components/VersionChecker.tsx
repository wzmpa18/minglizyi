"use client";

import { useEffect, useState } from "react";
import { reloadWithCachePurge } from "@/lib/cachePurge";

// v25.0.47_21 缓存机制升级：
//   · 每 30 秒轮询 version.json（另加页面重新可见时立即检查）
//   · 检测到新版本（无论首次还是轮询中发现）弹出悬浮提示
//   · 用户点击「立即更新」→ 清空 CacheStorage + 注销旧 Service Worker + 强制刷新，一步完成
const RUNNING_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
const POLL_INTERVAL_MS = 30000;
const FIRST_CHECK_MS = 2500;
/** 更新完成后的一次性提示标记（检查更新/悬浮提示点击更新前写入，刷新后展示「已更新至最新版本」） */
const UPDATED_TO_KEY = "yandao_updated_to";

export default function VersionChecker() {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [updatedTo, setUpdatedTo] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = sessionStorage.getItem(UPDATED_TO_KEY);
      if (v) {
        sessionStorage.removeItem(UPDATED_TO_KEY);
        setUpdatedTo(v);
      }
    } catch { /* 隐私模式 */ }
  }, []);

  useEffect(() => {
    if (!updatedTo) return;
    const t = setTimeout(() => setUpdatedTo(null), 4000);
    return () => clearTimeout(t);
  }, [updatedTo]);

  useEffect(() => {
    let stopped = false;

    const check = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const remote = data.buildId as string | undefined;
        if (!remote || remote === RUNNING_BUILD_ID) return;
        if (stopped) return;
        setNewVersion((data.version as string) || remote.split("_")[0]);
        setDismissed(false);
      } catch { /* 网络失败静默，下轮重试 */ }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    const firstCheck = setTimeout(() => void check(), FIRST_CHECK_MS);
    const interval = setInterval(() => void check(), POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearTimeout(firstCheck);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!newVersion || dismissed) {
    return updatedTo ? <UpdatedToast version={updatedTo} /> : null;
  }

  const shortVer = newVersion.split("_")[0];

  const handleUpdateNow = () => {
    try { sessionStorage.setItem(UPDATED_TO_KEY, newVersion); } catch { /* ignore */ }
    void reloadWithCachePurge();
  };

  return (
    <>
      <style>{`
        @keyframes yandaoVCSlideUp {
          from { transform: translate(-50%, 24px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @media (max-width: 480px) {
          .yandao-vc-card { width: calc(100vw - 32px) !important; }
        }
      `}</style>
      <div
        className="yandao-vc-card"
        style={{
          position: "fixed",
          bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99999,
          width: 340,
          maxWidth: "calc(100vw - 32px)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 16px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, #7B2FBE, #9C27B0)",
          color: "#fff",
          boxShadow: "0 8px 24px rgba(123, 47, 190, 0.4)",
          fontSize: "13px",
          animation: "yandaoVCSlideUp 0.35s ease-out",
        }}
        role="alert"
      >
        <div
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>发现新版本 {shortVer}</div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
            点击立即更新，一步完成（清理缓存并刷新）
          </div>
        </div>
        <button
          onClick={handleUpdateNow}
          style={{
            flexShrink: 0,
            border: "none",
            borderRadius: "18px",
            background: "#fff",
            color: "#7B2FBE",
            fontWeight: 700,
            fontSize: "12px",
            padding: "8px 14px",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
        >
          立即更新
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="稍后更新"
          style={{
            flexShrink: 0,
            border: "none",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            fontSize: "12px",
            width: 24,
            height: 24,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
      {updatedTo && <UpdatedToast version={updatedTo} />}
    </>
  );
}

/** 更新完成提示（绿色胶囊，4秒自动消失） */
function UpdatedToast({ version }: { version: string }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "calc(16px + env(safe-area-inset-top, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 18px",
        borderRadius: "22px",
        background: "#27ae60",
        color: "#fff",
        fontSize: "13px",
        fontWeight: 600,
        boxShadow: "0 4px 14px rgba(39, 174, 96, 0.45)",
        maxWidth: "calc(100vw - 32px)",
      }}
      role="status"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      已更新至最新版本 {version.split("_")[0]}
    </div>
  );
}
