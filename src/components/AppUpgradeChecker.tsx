"use client";

import { useEffect, useState } from "react";
import {
  detectNativeShell,
  fetchLatestRelease,
  isNativeShellSync,
  LEGACY_SHELL_MAX_CODE,
  type AppReleaseInfo,
} from "@/lib/nativeDetect";

/**
 * APP 原生升级检测（v25.0.47_28 FIX-V28-LEGACY-SHELL-RESCUE）
 *
 * 背景：APK 为内置资源模式，旧版 APP 无法通过网页 reload 获得修复，
 * 用户会一直停留在旧功能上。本组件让旧版 APP 在启动/回到前台时检测到新版本，
 * 引导用户下载新版 APK。
 *
 * 工作方式（v25.0.47_28 三通道，探测统一收敛到 src/lib/nativeDetect.ts）：
 * 1. detectNativeShell()：
 *    - 内置资源壳（versionCode ≥2048）：fetch("/app-native.json") 拿本地精确版本；
 *    - server.url 老壳（≤2047，直载线上页面、本地无 app-native.json）：
 *      由 window.Capacitor.isNativePlatform() 识别——该类壳旧检测永远失效（误报已是最新），
 *      本次补上强制升级引导；
 *    - 浏览器：app-native.json 404 且无 Capacitor 桥 → 走网页版轮询刷新。
 * 2. fetchLatestRelease()：服务器最新版本（壳内经 native-api-patch 改写到线上）。
 * 3. 服务器 versionCode > 本地 versionCode（老壳用 LEGACY_SHELL_MAX_CODE 判定）→ 弹升级提示。
 *    - 「立即升级」→ 直达 APK 下载落地页（/friend，单一分发源 latest.apk）
 *    - 「稍后再说」→ 本次会话不再提醒（sessionStorage）
 *    - forceUpdate 时无「稍后」按钮（强制更新）
 */

const DISMISS_KEY = "yandao_upgrade_dismissed_for";

export default function AppUpgradeChecker() {
  const [native, setNative] = useState<{ versionCode: number | null; versionName: string | null } | null>(null);
  const [release, setRelease] = useState<AppReleaseInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let stopped = false;

    const check = async () => {
      if (stopped) return;
      const shell = await detectNativeShell();
      if (stopped) return;
      if (!shell.isShell) {
        return;
      }
      setNative({ versionCode: shell.versionCode, versionName: shell.versionName });

      try {
        const rel = await fetchLatestRelease();
        if (stopped || !rel) return;
        const outdated = shell.versionCode === null
          ? rel.latestVersionCode > LEGACY_SHELL_MAX_CODE
          : rel.latestVersionCode > shell.versionCode;
        if (!outdated) return;

        try {
          if (localStorage.getItem(DISMISS_KEY) === String(rel.latestVersionCode)) return;
        } catch { /* 隐私模式 */ }
        setRelease(rel);
      } catch { /* 网络失败静默，下次回到前台再查 */ }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    const timer = setTimeout(() => void check(), 3000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const needsUpgrade = !!native && !!release && (
    native.versionCode === null
      ? release.latestVersionCode > LEGACY_SHELL_MAX_CODE
      : release.latestVersionCode > native.versionCode
  );
  if (!needsUpgrade || dismissed) return null;

  const handleUpgrade = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(release!.latestVersionCode));
    } catch { /* 隐私模式 */ }
    setDismissed(true);
    const url = release!.downloadPage || release!.downloadUrl;
    if (isNativeShellSync()) {
      window.location.href = url;
      return;
    }
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = url;
    }
  };

  const handleLater = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(release!.latestVersionCode));
    } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        backgroundColor: "rgba(15,10,25,0.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={(e) => {
        if (!release!.forceUpdate && e.target === e.currentTarget) handleLater();
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 18,
          padding: "26px 22px 20px",
          maxWidth: 330,
          width: "100%",
          boxShadow: "0 18px 50px rgba(45,26,62,0.35)",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            margin: "0 auto 12px",
            background: "linear-gradient(135deg, #7B2FBE, #9C27B0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
          }}
        >
          ⬆️
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#2D1A3E", marginBottom: 4 }}>
          发现新版本
        </div>
        <div style={{ fontSize: 13, color: "#8B7B9E", marginBottom: 14 }}>
          {native!.versionName ? `v${native!.versionName} → v${release!.latestVersion}` : `检测到旧版 APP，最新版本 v${release!.latestVersion}`}
        </div>

        <div
          style={{
            backgroundColor: "#F8F4FC",
            borderRadius: 12,
            padding: "12px 14px",
            textAlign: "left",
            marginBottom: 18,
          }}
        >
          {(release!.releaseNotes || []).slice(0, 5).map((note, i) => (
            <div
              key={i}
              style={{
                fontSize: 12.5,
                color: "#5B4A73",
                lineHeight: 1.7,
                display: "flex",
                gap: 6,
              }}
            >
              <span style={{ color: "#7B2FBE", flexShrink: 0 }}>·</span>
              <span>{note}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleUpgrade}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 12,
            background: "linear-gradient(135deg, #7B2FBE, #9C27B0)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            padding: "12px 0",
            cursor: "pointer",
            boxShadow: "0 6px 16px rgba(123,47,190,0.35)",
          }}
        >
          立即升级
        </button>

        {!release!.forceUpdate && (
          <button
            onClick={handleLater}
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              color: "#A99BC0",
              fontSize: 13,
              padding: "10px 0 0",
              cursor: "pointer",
            }}
          >
            稍后再说
          </button>
        )}
      </div>
    </div>
  );
}
