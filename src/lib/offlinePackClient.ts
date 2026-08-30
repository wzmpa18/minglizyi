"use client";

// ============================================================================
// OfflinePackClient — 离线内容包客户端（FINAL-MASTER-05 第五十九~六十二章）
//
// 流程：
//   1. 拉取服务端 manifest（GET /api/offline/manifest）
//   2. 与本地已装索引（SYSTEM_DATA 分区）比较版本
//   3. 下载：写入 OFFLINE_PACK 分区 `.part` 临时键
//      → SHA256 校验（Web Crypto，与服务端 manifest 一致才启用，第六十章）
//      → 校验通过原子替换到正式键并更新索引（第六十一章）
//      → 失败清理 .part（可续传：保留已收字节，下次从断点 Range 续传）
//   4. 移动网络 + 大包（>10MB）先提示用户确认（第六十二章）
//
// 红线：校验失败的包绝不启用；已启用包只有新版本校验通过后才被替换。
// ============================================================================

import { get, put, remove, listMeta } from "./storageManager";

export interface ManifestPack {
  packId: string;
  contentType: string;
  name: string;
  version: string;
  size: number;
  sha256: string;
  minAppVersion: string;
  downloadUrl: string;
  required: boolean;
  largePack: boolean;
  description: string;
  updatedAt: string;
  status: string;
}

export interface OfflineManifest {
  manifestVersion: string;
  totalPacks: number;
  largePackBytes: number;
  packs: ManifestPack[];
}

const INSTALLED_INDEX_KEY = "installed_packs_index";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

interface InstalledPackRecord {
  packId: string;
  version: string;
  sha256: string;
  installedAt: number;
}

// ==================== manifest 与版本比较（第五十九章） ====================

export async function fetchManifest(): Promise<OfflineManifest | null> {
  try {
    const res = await fetch(`${API_BASE}/api/offline/manifest`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? (json.data as OfflineManifest) : null;
  } catch {
    return null;   // 离线时返回 null（由调用方决定用本地包）
  }
}

async function getInstalledIndex(): Promise<Record<string, InstalledPackRecord>> {
  return (await get<Record<string, InstalledPackRecord>>("SYSTEM_DATA", INSTALLED_INDEX_KEY)) || {};
}

export async function getInstalledPacks(): Promise<InstalledPackRecord[]> {
  return Object.values(await getInstalledIndex());
}

/** 版本比较（语义化 x.y.z）：返回 1/0/-1 */
export function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

/** APP 版本比较 minAppVersion：本地低于要求时该包不可用 */
export function meetsMinAppVersion(minAppVersion: string, appVersion: string): boolean {
  return compareVersion(appVersion, minAppVersion) >= 0;
}

export interface PackUpdatePlan {
  packId: string;
  action: "INSTALL" | "UPDATE" | "UP_TO_DATE" | "INCOMPATIBLE";
  manifestPack: ManifestPack;
  installed?: InstalledPackRecord;
}

export async function checkUpdates(appVersion: string, manifest: OfflineManifest): Promise<PackUpdatePlan[]> {
  const installed = await getInstalledIndex();
  return manifest.packs.map(p => {
    const rec = installed[p.packId];
    if (!meetsMinAppVersion(p.minAppVersion, appVersion)) {
      return { packId: p.packId, action: "INCOMPATIBLE" as const, manifestPack: p };
    }
    if (!rec) return { packId: p.packId, action: "INSTALL" as const, manifestPack: p };
    const cmp = compareVersion(p.version, rec.version);
    return {
      packId: p.packId,
      action: cmp > 0 ? ("UPDATE" as const) : ("UP_TO_DATE" as const),
      manifestPack: p,
      installed: rec,
    };
  });
}

// ==================== 网络策略（第六十二章） ====================

export function isCellularNetwork(): boolean {
  try {
    const conn = (navigator as Navigator & { connection?: { type?: string; effectiveType?: string } }).connection;
    if (!conn) return false;      // 信息不可得时保守视为非蜂窝（不猜测）
    return conn.type === "cellular" || /2g|3g|4g|5g/.test(conn.effectiveType || "");
  } catch {
    return false;
  }
}

/** 大包 + 移动网络 → 需要用户确认（由 UI 弹层调用） */
export function needsUserConfirmation(pack: ManifestPack): boolean {
  return pack.largePack && isCellularNetwork();
}

// ==================== 下载 + 校验 + 原子启用（第六十~六十一章） ====================

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function partKey(packId: string, version: string) { return `${packId}@${version}.part`; }
function finalKey(packId: string, version: string) { return `${packId}@${version}`; }

export type DownloadProgress = (receivedBytes: number, totalBytes: number) => void;

export interface DownloadResult {
  ok: boolean;
  packId: string;
  version: string;
  error?: string;
  sha256Verified?: boolean;
  resumedFrom?: number;
}

/**
 * 下载 pack。带断点续传：OFFLINE_PACK 分区中已有 .part 时用 Range 从断点继续。
 * SHA256 校验失败：清理 .part 残片并返回 error（绝不启用，第六十章）。
 */
export async function downloadPack(pack: ManifestPack, onProgress?: DownloadProgress): Promise<DownloadResult> {
  const pKey = partKey(pack.packId, pack.version);
  const existingPart = await get<ArrayBuffer>("OFFLINE_PACK", pKey);
  const startByte = existingPart ? existingPart.byteLength : 0;

  if (startByte >= pack.size) {
    // 已收满但未启用（上次校验失败或中断）：丢弃重来，避免坏字节死循环
    await remove("OFFLINE_PACK", pKey);
  }

  try {
    const headers: Record<string, string> = {};
    if (startByte > 0 && startByte < pack.size) headers["Range"] = `bytes=${startByte}-`;
    const res = await fetch(`${API_BASE}${pack.downloadUrl}`, { headers });

    if (!(res.status === 200 || res.status === 206)) {
      return { ok: false, packId: pack.packId, version: pack.version, error: `下载失败 HTTP ${res.status}` };
    }

    // 服务端 sha256 头核对（第六十章：双重校验）
    const serverSha = res.headers.get("X-Pack-Sha256");
    if (serverSha && serverSha !== pack.sha256) {
      return { ok: false, packId: pack.packId, version: pack.version, error: "manifest 与文件 sha256 不一致，中止" };
    }

    const chunk = await res.arrayBuffer();
    // 拼接断点（206 场景）
    let full: ArrayBuffer;
    if (res.status === 206 && existingPart && startByte > 0) {
      full = new ArrayBuffer(startByte + chunk.byteLength);
      new Uint8Array(full).set(new Uint8Array(existingPart), 0);
      new Uint8Array(full).set(new Uint8Array(chunk), startByte);
    } else {
      full = chunk;
    }

    if (full.byteLength !== pack.size) {
      // 尺寸不符：保留 .part 供续传，返回失败
      await put("OFFLINE_PACK", pKey, full, { version: pack.version });
      return { ok: false, packId: pack.packId, version: pack.version, error: `尺寸不符（期望 ${pack.size} 实收 ${full.byteLength}），已保留断点` };
    }

    // SHA256 校验（第六十章：失败不能启用）
    const sha = await sha256Hex(full);
    if (sha !== pack.sha256) {
      await remove("OFFLINE_PACK", pKey);   // 校验失败清残片（字节已坏，续传无意义）
      return { ok: false, packId: pack.packId, version: pack.version, error: "SHA256 校验失败，包已废弃" };
    }

    // 原子启用（第六十一章）：写正式键 → 更新索引 → 清 .part
    await put("OFFLINE_PACK", finalKey(pack.packId, pack.version), full, { version: pack.version });
    const idx = await getInstalledIndex();
    idx[pack.packId] = { packId: pack.packId, version: pack.version, sha256: sha, installedAt: Date.now() };
    await put("SYSTEM_DATA", INSTALLED_INDEX_KEY, idx);
    await remove("OFFLINE_PACK", pKey);
    onProgress?.(pack.size, pack.size);
    return { ok: true, packId: pack.packId, version: pack.version, sha256Verified: true, resumedFrom: startByte };
  } catch (e) {
    return { ok: false, packId: pack.packId, version: pack.version, error: (e as Error).message };
  }
}

/** 读取已启用 pack 内容（离线学习入口，第六十三章） */
export async function loadPackContent(packId: string): Promise<ArrayBuffer | null> {
  const idx = await getInstalledIndex();
  const rec = idx[packId];
  if (!rec) return null;
  return get<ArrayBuffer>("OFFLINE_PACK", finalKey(packId, rec.version));
}

/** 清理失败 .part 残片（appAutoClean 每日维护调用） */
export async function cleanStaleParts(maxAgeMs = 24 * 3600 * 1000): Promise<number> {
  const metas = await listMeta("OFFLINE_PACK");
  const now = Date.now();
  let removed = 0;
  for (const m of metas) {
    if (m.key.endsWith(".part") && now - m.createdAt > maxAgeMs) {
      await remove("OFFLINE_PACK", m.key);
      removed++;
    }
  }
  return removed;
}
