"use client";

import { useEffect } from "react";
import { runAutoClean } from "@/lib/appAutoClean";
import { installAutoFlush, flushQueue } from "@/lib/offlineSyncClient";

/**
 * Offline 初始化组件（FINAL-MASTER-05 第六十三~七十四章）
 * 应用启动时：
 *   - installAutoFlush：网络恢复/上线后自动冲刷离线事件队列（第六十五~六章幂等同步）
 *   - runAutoClean：每日首次启动/APP 升级后自动清理（第六十八~六十九章；红线分区结构性跳过）
 * 全部失败静默（离线/隐私模式不阻塞启动）。
 */
export default function OfflineInit() {
  useEffect(() => {
    const timer = setTimeout(() => {
      try { installAutoFlush(); } catch { /* ignore */ }
      void runAutoClean().catch(() => { /* ignore */ });
      void flushQueue().catch(() => { /* ignore */ });
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
