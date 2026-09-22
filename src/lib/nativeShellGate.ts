"use client";

// ============================================================================
// 原生壳（iOS + Android）UI 门禁 hook - v25.0.88
//
// 用途：APP 原生壳内隐藏仅网页版有意义的入口——
//   1. 「下载言道国学APP」按钮（APP 端属冗余入口，用户 v25.0.88 指令明令移除）
//
// 实现：静态导出（SSG）页面在构建期预渲染，window 不可用；
// 直接条件渲染会导致水合不一致（hydration mismatch）。故首帧按 false 渲染
// （与浏览器一致），useEffect 后置判定再隐藏，与 iosNativeGate 既有模式相同。
// 平台判定复用 platformGate.getRuntimePlatform（Capacitor 原生桥 + UA 兜底：
// YandaoGuoxueIOS / YandaoGuoxueAndroid）。
// ============================================================================

import { useEffect, useState } from "react";
import { getRuntimePlatform } from "./platformGate";

export function useNativeShell(): boolean {
  const [nativeShell, setNativeShell] = useState(false);
  useEffect(() => {
    const p = getRuntimePlatform();
    setNativeShell(p === "ios" || p === "android");
  }, []);
  return nativeShell;
}
