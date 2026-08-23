"use client";

import { useEffect, useState } from "react";
import { reloadWithCachePurge } from "@/lib/cachePurge";

const RUNNING_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
const AUTO_RELOAD_KEY = "yandao_auto_reloaded";

function canAutoReload(): boolean {
  if (typeof document === "undefined") return false;
  if (document.body.classList.contains("modal-open")) return false;
  const ae = document.activeElement as HTMLElement | null;
  if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) return false;
  return true;
}

export default function VersionChecker() {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alreadyReloaded = false;
    try {
      alreadyReloaded = sessionStorage.getItem(AUTO_RELOAD_KEY) === "1";
    } catch { /* 隐私模式 */ }

    let stopped = false;

    const check = async (fromTimer: boolean) => {
      if (stopped) return;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const remote = data.buildId as string | undefined;
        if (!remote || remote === RUNNING_BUILD_ID) return;

        if (!alreadyReloaded && canAutoReload()) {
          try { sessionStorage.setItem(AUTO_RELOAD_KEY, "1"); } catch { /* ignore */ }
          void reloadWithCachePurge();
          return;
        }
        if (fromTimer) return;
        setNewVersion(remote);
      } catch { /* 网络失败静默 */ }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check(true);
    };

    const firstCheck = setTimeout(() => void check(false), 2500);
    const interval = setInterval(() => void check(true), 60000);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearTimeout(firstCheck);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!newVersion || dismissed) return null;

  const shortVer = newVersion.split("_")[0];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        padding: "8px 12px",
        paddingTop: "calc(8px + env(safe-area-inset-top, 0px))",
        background: "linear-gradient(90deg, #7B2FBE, #9C27B0)",
        color: "#fff",
        fontSize: "13px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      <span>新版本 {shortVer} 已发布</span>
      <button
        onClick={() => void reloadWithCachePurge()}
        style={{
          border: "none",
          borderRadius: "14px",
          background: "#fff",
          color: "#7B2FBE",
          fontWeight: 600,
          fontSize: "12px",
          padding: "4px 12px",
          cursor: "pointer",
        }}
      >
        立即更新
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{
          border: "1px solid rgba(255,255,255,0.6)",
          borderRadius: "14px",
          background: "transparent",
          color: "#fff",
          fontSize: "12px",
          padding: "4px 10px",
          cursor: "pointer",
        }}
      >
        稍后
      </button>
    </div>
  );
}
