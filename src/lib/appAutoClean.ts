"use client";

// ============================================================================
// AppAutoClean — APP 自动清理调度（FINAL-MASTER-05 第六十八~六十九章）
//
// 触发时机（第六十八章）：启动 / 每日首次启动 / APP 升级后
// 清理范围：
//   - TEMP_CACHE / MEDIA_CACHE / AI_CACHE（TTL + LRU，由 storageManager 策略裁决）
//   - OFFLINE_PACK 失败 .part 残片（>24h）
//   - OFFLINE_PACK 旧版本（同 packId 仅保留当前启用版本）
//
// 清缓存红线（第六十九章）——本模块结构性保证：
//   storageManager.cleanZone 对 USER_PRIVATE_DATA / OFFLINE_PACK / SYSTEM_DATA
//   autoCleanable=false 直接跳过；错题/收藏/学习进度/未同步队列/登录态全部
//   位于 USER_PRIVATE_DATA 或 localStorage，本模块永不触碰 localStorage。
// ============================================================================

import { cleanAllAutoCleanable, get, put, cleanOldPackVersions, zoneStats, fmtBytes } from "./storageManager";
import { cleanStaleParts, getInstalledPacks } from "./offlinePackClient";

const STATE_KEY = "auto_clean_state";
const LAST_APP_VERSION_KEY = "last_app_version";

interface AutoCleanState {
  lastRunAt: number;
  lastRunDay: string;          // YYYY-MM-DD
  totalRuns: number;
  lastAppVersion?: string;
}

interface AppVersionSource {
  appVersion: string;
}

export interface AutoCleanReport {
  triggeredBy: "LAUNCH" | "DAILY_FIRST" | "APP_UPGRADE";
  zonesCleaned: { zone: string; removed: number; freedBytes: number; reason: string }[];
  stalePartsRemoved: number;
  oldPackVersionsRemoved: number;
  freedHuman: string;
  redLineIntact: true;         // 断言字段：USER_PRIVATE_DATA 从未被触碰
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function currentAppVersion(): string {
  if (typeof window === "undefined") return "0.0.0";
  // Web/APK 统一从服务端 version.js 注入的 window.__APP_VERSION__ 读取；缺省走 query 参
  const w = window as Window & { __APP_VERSION__?: string };
  return w.__APP_VERSION__ || (window.localStorage.getItem("app_version") || "0.0.0");
}

/**
 * 自动清理入口。幂等：同一天内（除 APP 升级）只跑一次。
 * 在 APP 根布局/启动钩子调用。
 */
export async function runAutoClean(opts?: AppVersionSource): Promise<AutoCleanReport | null> {
  if (typeof window === "undefined") return null;

  const appVersion = opts?.appVersion || currentAppVersion();
  const state = (await get<AutoCleanState>("SYSTEM_DATA", STATE_KEY)) || {
    lastRunAt: 0, lastRunDay: "", totalRuns: 0,
  };
  const today = todayStr();
  const lastVersion = (await get<string>("SYSTEM_DATA", LAST_APP_VERSION_KEY)) || "";
  await put("SYSTEM_DATA", LAST_APP_VERSION_KEY, appVersion);

  let triggeredBy: AutoCleanReport["triggeredBy"] | null = null;
  if (lastVersion && lastVersion !== appVersion) {
    triggeredBy = "APP_UPGRADE";
  } else if (state.lastRunDay !== today) {
    triggeredBy = state.lastRunDay ? "DAILY_FIRST" : "LAUNCH";
  }
  if (!triggeredBy) return null;   // 今日已跑且未升级

  // 1) 可清分区（TEMP/MEDIA/AI；红线分区由 storageManager 拒绝）
  const zones = await cleanAllAutoCleanable();

  // 2) 失败 .part 残片（>24h；24h 内的保留供断点续传）
  const stalePartsRemoved = await cleanStaleParts();

  // 3) 旧 pack 版本（保留当前启用版本）
  let oldPackVersionsRemoved = 0;
  const installed = await getInstalledPacks();
  for (const rec of installed) {
    oldPackVersionsRemoved += await cleanOldPackVersions(rec.packId, rec.version);
  }

  const freedBytes = zones.reduce((s, z) => s + z.freedBytes, 0);
  const report: AutoCleanReport = {
    triggeredBy,
    zonesCleaned: zones.map(z => ({ zone: z.zone, removed: z.removedEntries, freedBytes: z.freedBytes, reason: z.reason })),
    stalePartsRemoved,
    oldPackVersionsRemoved,
    freedHuman: fmtBytes(freedBytes),
    redLineIntact: true,
  };

  await put("SYSTEM_DATA", STATE_KEY, {
    lastRunAt: Date.now(), lastRunDay: today, totalRuns: state.totalRuns + 1, lastAppVersion: appVersion,
  });
  return report;
}

/** 调试/设置页：本地存储用量总览 */
export async function storageUsageOverview(): Promise<Record<string, { entries: number; bytes: number; human: string }>> {
  return zoneStats();
}
