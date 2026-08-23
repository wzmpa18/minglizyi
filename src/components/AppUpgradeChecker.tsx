"use client";

import { useEffect, useState } from "react";

/**
 * APP 原生升级检测（v25.0.48 FIX-V16-UPGRADE-NOTICE）
 *
 * 背景：APK 为内置资源模式，旧版 APP 无法通过网页 reload 获得修复，
 * 用户会一直停留在旧功能上。本组件让旧版 APP 在启动/回到前台时检测到新版本，
 * 引导用户下载新版 APK。
 *
 * 工作方式：
 * 1. fetch("/app-native.json") —— 仅原生壳内置资源中存在（构建 APK 时生成），
 *    网页版 404 → 静默退出（网页版刷新提示由 VersionChecker 负责）；
 *    原生壳内此请求走本地资源（native-api-patch 只改写 /api/ 前缀）。
 * 2. fetch("/api/public/app-version") —— 原生壳内被 native-api-patch 改写到线上
 *    服务器，返回最新 APP 版本（versionCode 递增）。
 * 3. 服务器 versionCode > 本地 versionCode → 弹升级提示。
 *    - 「立即升级」→ 新开窗口直达 APK 下载落地页（/friend，含微信引导与自动下载兜底）
 *    - 「稍后再说」→ 本次会话不再提醒（sessionStorage）
 *    - forceUpdate 时无「稍后」按钮（强制更新）
 */

const DISMISS_KEY = "yandao_upgrade_dismissed_for";
// v25.0.47_18: 网页版版本基准（会话内记录首次加载时的 version.json，部署新版后自动刷新）
const WEB_VERSION_KEY = "yandao_web_version_baseline";

interface AppNativeInfo {
  versionName: string;
  versionCode: number;
  platform: string;
}

interface AppReleaseInfo {
  latestVersion: string;
  latestVersionCode: number;
  downloadUrl: string;
  downloadPage: string;
  releaseNotes: string[];
  forceUpdate: boolean;
  publishedAt: string;
}

export default function AppUpgradeChecker() {
  const [native, setNative] = useState<AppNativeInfo | null>(null);
  const [release, setRelease] = useState<AppReleaseInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let stopped = false;

    const check = async () => {
      if (stopped) return;
      // 1. 探测本地 APP 版本（仅原生壳内置资源里有）
      let info: AppNativeInfo | null = null;
      try {
        const res = await fetch(`/app-native.json?t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          info = (await res.json()) as AppNativeInfo;
        }
      } catch { /* 静默 */ }
      if (stopped || !info || typeof info.versionCode !== "number") {
        // 网页版（app-native.json 不存在）：会话内基准版本 + 轮询检测新部署 → 自动刷新
        // 解决"旧标签页停留在旧版"问题（用户不刷新也能拿到最新功能）
        void checkWebVersion();
        return;
      }
      setNative(info);

      // 2. 拉取服务器最新版本（原生壳内自动改写到线上 API）
      try {
        const res = await fetch(`/api/public/app-version?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (stopped || !json || !json.data) return;
        const rel = json.data as AppReleaseInfo;
        if (typeof rel.latestVersionCode !== "number") return;

        // 本次会话已对该版本点过「稍后」→ 不再弹
        try {
          if (sessionStorage.getItem(DISMISS_KEY) === String(rel.latestVersionCode)) return;
        } catch { /* 隐私模式 */ }
        setRelease(rel);
      } catch { /* 网络失败静默，下次回到前台再查 */ }
    };

    const checkWebVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (stopped || !res.ok) return;
        const data = await res.json();
        const ver = data && data.version;
        if (typeof ver !== "string") return;
        let baseline: string | null = null;
        try { baseline = sessionStorage.getItem(WEB_VERSION_KEY); } catch { /* 隐私模式 */ }
        if (!baseline) {
          try { sessionStorage.setItem(WEB_VERSION_KEY, ver); } catch { /* ignore */ }
          return;
        }
        if (baseline !== ver) {
          // 服务器已部署新版本 → 先更新基准再刷新（避免刷新后循环）
          try { sessionStorage.setItem(WEB_VERSION_KEY, ver); } catch { /* ignore */ }
          window.location.reload();
        }
      } catch { /* 网络失败静默，下轮再查 */ }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    const timer = setTimeout(() => void check(), 3000);
    // 网页版每 60 秒轮询版本（部署新版后 ≤60s 内旧标签页自动刷新）
    const poll = setInterval(() => void checkWebVersion(), 60000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const needsUpgrade = !!native && !!release && release.latestVersionCode > native.versionCode;
  if (!needsUpgrade || dismissed) return null;

  const handleUpgrade = () => {
    const url = release!.downloadPage || release!.downloadUrl;
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = url;
    }
  };

  const handleLater = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, String(release!.latestVersionCode));
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
          v{native!.versionName} → v{release!.latestVersion}
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
