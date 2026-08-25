"use client";

/**
 * 原生壳统一探测（v25.0.47_28 FIX-V28-LEGACY-SHELL-RESCUE）
 *
 * 背景：历史上存在两代 APK 壳——
 *  ① server.url 老壳（v25.0.47_3 及更早，versionCode ≤2047）：WebView 直载线上页面，
 *     本地无 app-native.json。这类壳页面内容跟随线上更新，但 APK 本体永远停在老版本，
 *     且 /app-native.json 在线上 404 → 升级检测全部失效 → 永远误报「已是最新」。
 *  ② 内置资源壳（v25.0.48 起，versionCode ≥2048）：本地 app-native.json 可探测精确版本。
 *
 * 探测策略：
 *  ① fetch /app-native.json 成功且含 versionCode → 内置资源壳（精确版本）
 *  ② 404 但 window.Capacitor.isNativePlatform() 为 true → server.url 老壳
 *     （Capacitor 桥在任何时代的壳内都注入，浏览器中必不存在——这是唯一可靠的判据）
 *  ③ 两者皆无 → 纯浏览器
 */

export interface NativeShellInfo {
  /** 是否运行在 Capacitor 原生壳内（任意时代 APK） */
  isShell: boolean;
  /** 内置资源壳的精确 versionCode；老壳/浏览器为 null */
  versionCode: number | null;
  versionName: string | null;
  /** asset=内置资源壳 legacy=server.url 老壳 browser=浏览器 */
  source: "asset" | "legacy" | "browser";
}

/** server.url 老壳的 versionCode 上限（v25.0.47_3 = 2047；v25.0.48 起为内置资源壳） */
export const LEGACY_SHELL_MAX_CODE = 2047;

/** 同步判断当前是否在原生壳内（任意时代 APK），浏览器恒 false */
export function isNativeShellSync(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
}

/**
 * https 直链 → Android intent:// URI。
 * 原生壳 WebView 无法直接下载文件（无 DownloadListener 的壳 location.href 赋值 apk
 * 地址会被静默吞掉——「正在下载」Toast 永远不动的根因）；intent:// 会被 WebView 的
 * shouldOverrideUrlLoading 交给系统按 ACTION_VIEW 解析，拉起系统浏览器完成下载。
 */
export function buildAndroidIntentUrl(httpsUrl: string): string {
  try {
    const u = new URL(httpsUrl);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
  } catch {
    return httpsUrl;
  }
}

export async function detectNativeShell(): Promise<NativeShellInfo> {
  if (typeof window === "undefined") {
    return { isShell: false, versionCode: null, versionName: null, source: "browser" };
  }
  try {
    const res = await fetch(`/app-native.json?t=${Date.now()}`, { cache: "no-store" });
    if (res.ok) {
      const j = await res.json();
      if (j && typeof j.versionCode === "number") {
        return {
          isShell: true,
          versionCode: j.versionCode,
          versionName: typeof j.versionName === "string" ? j.versionName : "",
          source: "asset",
        };
      }
    }
  } catch { /* ignore */ }
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  const isShell = !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
  if (isShell) {
    return { isShell: true, versionCode: null, versionName: null, source: "legacy" };
  }
  return { isShell: false, versionCode: null, versionName: null, source: "browser" };
}

export interface AppReleaseInfo {
  latestVersion: string;
  latestVersionCode: number;
  downloadUrl: string;
  downloadPage: string;
  releaseNotes: string[];
  forceUpdate: boolean;
  publishedAt: string;
}

/** 拉取服务器最新 APP 版本（原生壳内经 native-api-patch 自动改写到线上） */
export async function fetchLatestRelease(): Promise<AppReleaseInfo | null> {
  const res = await fetch(`/api/public/app-version?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return json && json.data && typeof json.data.latestVersionCode === "number" ? (json.data as AppReleaseInfo) : null;
}
