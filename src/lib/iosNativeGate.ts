"use client";

// ============================================================================
// iOS 原生壳 UI 门禁 hook - v25.0.77 (IOS-APPSTORE-FINAL-RELEASE-SEAL-11)
//
// 用途：iOS 壳内隐藏会造成 App Store 审核风险的原生不适用入口——
//   1. 微信快捷登录（Apple 要求第三方登录需同时提供 Sign in with Apple，首版未接入）
//   2. Android APK 下载/更新引导（Guideline 2.5.2：不得引导安装其他平台应用）
//
// 实现：静态导出（SSG）页面在服务端/构建期预渲染，window 不可用；
// 直接条件渲染会导致水合不一致（hydration mismatch）。故首帧按 false 渲染
// （与浏览器一致），useEffect 后置判定再隐藏，与 membership 页既有模式相同。
// 平台判定复用 platformGate 的 isIOSNative（Capacitor 原生桥 + UA 兜底）。
// ============================================================================

import { useEffect, useState } from "react";
import { isIOSNative } from "./platformGate";

export function useIOSNativeShell(): boolean {
  const [iosNative, setIosNative] = useState(false);
  useEffect(() => {
    setIosNative(isIOSNative());
  }, []);
  return iosNative;
}