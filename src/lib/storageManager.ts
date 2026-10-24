"use client";

import { compareVersion } from "./offlineVersions";

// ============================================================================
// StorageManager — 唯一统一本地存储管理器（FINAL-MASTER-05 第六十六~六十七章）
//
// 六分区（第六十六章）：
//   TEMP_CACHE        TTL + LRU（可随时清理）
//   MEDIA_CACHE       容量上限 + LRU（缩略图/媒体缓存）
//   AI_CACHE          TTL（AI 会话临时缓存）
//   OFFLINE_PACK      用户明确下载的离线内容包——长期保存，禁止自动清
//   USER_PRIVATE_DATA 用户私有数据——绝对禁止自动清（第六十九章红线）
//   SYSTEM_DATA       系统状态（版本/清单/已装包索引），按版本升级管理
//
// 铁律（第六十九章清缓存红线）：
//   自动清理（appAutoClean）只允许触碰 TEMP_CACHE / MEDIA_CACHE / AI_CACHE
//   以及 OFFLINE_PACK 的旧版本；USER_PRIVATE_DATA 与未同步队列永远不动。
//   业务代码禁止绕过本模块直接往 IndexedDB 写数据。
// ============================================================================

export type StorageZone =
  | "TEMP_CACHE"
  | "MEDIA_CACHE"
  | "AI_CACHE"
  | "OFFLINE_PACK"
  | "USER_PRIVATE_DATA"
  | "SYSTEM_DATA";

export interface StorageEntryMeta {
  zone: StorageZone;
  key: string;
  size: number;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt?: number;       // TEMP/AI 分区 TTL
  version?: string;         // SYSTEM/OFFLINE_PACK 版本标记
  protectedFromAutoClean?: boolean;
}

export interface ZonePolicy {
  autoCleanable: boolean;
  ttlMs?: number;           // 过期清理
  maxBytes?: number;        // 容量上限（LRU 淘汰）
}

export const ZONE_POLICIES: Record<StorageZone, ZonePolicy> = {
  // 第六十七章：不同数据不同策略
  TEMP_CACHE: { autoCleanable: true, ttlMs: 24 * 3600 * 1000, maxBytes: 50 * 1024 * 1024 },
  MEDIA_CACHE: { autoCleanable: true, maxBytes: 200 * 1024 * 1024 },
  AI_CACHE: { autoCleanable: true, ttlMs: 2 * 3600 * 1000 },
  OFFLINE_PACK: { autoCleanable: false },          // 用户明确下载后长期保存
  USER_PRIVATE_DATA: { autoCleanable: false },     // 禁止自动清（红线）
  SYSTEM_DATA: { autoCleanable: false },           // 版本升级管理（旧版本由升级逻辑清）
};

const DB_NAME = "yandao_storage_manager";
const DB_VERSION = 1;
const STORE_DATA = "zone_data";       // key: `${zone}:${key}` → value
const STORE_META = "zone_meta";       // key: `${zone}:${key}` → StorageEntryMeta

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB 不可用"));
  }
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DATA)) db.createObjectStore(STORE_DATA);
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      _dbPromise = null;
      reject(req.error || new Error("IndexedDB 打开失败"));
    };
  });
  return _dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(db => new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function sk(zone: StorageZone, key: string) { return `${zone}:${key}`; }

/** Commit the verified bytes, installed index and metadata together. A failed
 * transaction keeps the previous active pack; concurrent downloads cannot lose
 * another pack's index entry or activate an older version after a newer one. */
export async function activateOfflinePack(packId: string, version: string, sha256: string, bytes: ArrayBuffer): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction([STORE_DATA, STORE_META], "readwrite");
    let failure: Error | undefined;
    t.oncomplete = () => resolve();
    t.onabort = () => reject(failure || t.error || new Error("资料未保存，原有效包仍保留"));
    t.onerror = () => { /* onabort reports the final transaction result */ };
    const data = t.objectStore(STORE_DATA), meta = t.objectStore(STORE_META);
    const indexKey = sk("SYSTEM_DATA", "installed_packs_index");
    const query = data.get(indexKey);
    query.onsuccess = () => {
      try {
        const index = query.result || {};
        const previous = index[packId];
        if (previous && (compareVersion(version, previous.version) < 0 ||
          (compareVersion(version, previous.version) === 0 && previous.sha256 !== sha256))) {
          throw new Error("资料版本已变化，请刷新列表；原有效包仍保留");
        }
        const now = Date.now(), key = `${packId}@${version}`;
        index[packId] = { packId, version, sha256, installedAt: now };
        data.put(bytes, sk("OFFLINE_PACK", key));
        data.put(index, indexKey);
        for (const [zone, entryKey, value] of [
          ["OFFLINE_PACK", key, bytes], ["SYSTEM_DATA", "installed_packs_index", index],
        ] as const) {
          meta.put({ zone, key: entryKey, size: sizeOf(value), createdAt: now,
            lastAccessedAt: now, protectedFromAutoClean: true, ...(zone === "OFFLINE_PACK" ? { version } : {}) }, sk(zone, entryKey));
        }
        data.delete(sk("OFFLINE_PACK", `${key}.part`));
        meta.delete(sk("OFFLINE_PACK", `${key}.part`));
      } catch (error) {
        failure = error instanceof Error ? error : new Error(String(error));
        t.abort();
      }
    };
  });
}

/** Durable private writes resolve on transaction completion, never on request success.
 * Vault ciphertext belongs to USER_PRIVATE_DATA and is excluded from every cache collector. */
export async function privateAtomic(rows: {key:string; value:unknown}[],check?:{key:string;etag:string|null;deletePrefix?:string}): Promise<void> {
  const db=await openDb();
  await new Promise<void>((resolve,reject)=>{
    const t=db.transaction([STORE_DATA,STORE_META],"readwrite"), now=Date.now();
    const write=()=>{if(check?.deletePrefix){if(!/^life:[\w-]{8,80}:$/.test(check.deletePrefix)){t.abort();return;}const start=sk("USER_PRIVATE_DATA",check.deletePrefix),q=t.objectStore(STORE_DATA).openCursor(IDBKeyRange.bound(start,start+"\uffff"));q.onsuccess=()=>{const c=q.result;if(c){t.objectStore(STORE_META).delete(c.key);c.delete();c.continue();}};}
    for(const row of rows){if(row.value===null){t.objectStore(STORE_DATA).delete(sk("USER_PRIVATE_DATA",row.key));t.objectStore(STORE_META).delete(sk("USER_PRIVATE_DATA",row.key));continue;}
      t.objectStore(STORE_DATA).put(row.value,sk("USER_PRIVATE_DATA",row.key));
      t.objectStore(STORE_META).put({zone:"USER_PRIVATE_DATA",key:row.key,size:sizeOf(row.value),createdAt:now,lastAccessedAt:now,protectedFromAutoClean:true},sk("USER_PRIVATE_DATA",row.key));
    }};
    if(check){const q=t.objectStore(STORE_DATA).get(sk("USER_PRIVATE_DATA",check.key));q.onsuccess=()=>{if((q.result?.etag??null)!==check.etag)t.abort();else write();};}else write();
    t.oncomplete=()=>resolve();t.onabort=()=>reject(t.error||new Error("私人记录未写入，原数据保留"));t.onerror=()=>reject(t.error);
  });
}
export async function privateRead<T>(key:string):Promise<T|undefined>{
  return tx(STORE_DATA,"readonly",s=>s.get(sk("USER_PRIVATE_DATA",key)) as IDBRequest<T|undefined>);
}
export async function privatePage(prefix:string,after="",limit=100):Promise<{key:string;value:unknown}[]>{
  const db=await openDb(),start=sk("USER_PRIVATE_DATA",prefix);
  return new Promise((resolve,reject)=>{
    const out:{key:string;value:unknown}[]=[],t=db.transaction(STORE_DATA,"readonly");
    const q=t.objectStore(STORE_DATA).openCursor(IDBKeyRange.bound(after?sk("USER_PRIVATE_DATA",after):start,start+"\uffff",!!after,false));
    q.onsuccess=()=>{const c=q.result;if(c&&out.length<limit){out.push({key:String(c.key).slice("USER_PRIVATE_DATA:".length),value:c.value});c.continue();}};
    t.oncomplete=()=>resolve(out);t.onabort=()=>reject(t.error);t.onerror=()=>reject(t.error);
  });
}

function sizeOf(value: unknown): number {
  if (value instanceof ArrayBuffer) return value.byteLength;
  if (typeof Blob !== "undefined" && value instanceof Blob) return value.size;
  return new Blob([JSON.stringify(value ?? null)]).size;
}

// ==================== 读写 API ====================

export async function put(zone: StorageZone, key: string, value: unknown, opts?: { ttlMs?: number; version?: string }): Promise<void> {
  const now = Date.now();
  const policy = ZONE_POLICIES[zone];
  const ttl = opts?.ttlMs ?? policy.ttlMs;
  const meta: StorageEntryMeta = {
    zone, key, size: sizeOf(value), createdAt: now, lastAccessedAt: now,
    expiresAt: ttl ? now + ttl : undefined,
    version: opts?.version,
    protectedFromAutoClean: !policy.autoCleanable,
  };
  await tx(STORE_DATA, "readwrite", s => s.put(value, sk(zone, key)) as IDBRequest<IDBValidKey>);
  await tx(STORE_META, "readwrite", s => s.put(meta, sk(zone, key)) as IDBRequest<IDBValidKey>);
}

export async function get<T = unknown>(zone: StorageZone, key: string): Promise<T | null> {
  try {
    const v = await tx(STORE_DATA, "readonly", s => s.get(sk(zone, key)) as IDBRequest<T | undefined>);
    // LRU：读取刷新 lastAccessedAt
    tx(STORE_META, "readwrite", s => {
      const m = s.get(sk(zone, key)) as IDBRequest<StorageEntryMeta | undefined>;
      m.onsuccess = () => { if (m.result) { m.result.lastAccessedAt = Date.now(); s.put(m.result, sk(zone, key)); } };
      return m;
    }).catch(() => { /* 元数据刷新失败不影响读取 */ });
    return (v ?? null) as T | null;
  } catch {
    return null;
  }
}

export async function remove(zone: StorageZone, key: string): Promise<void> {
  await tx(STORE_DATA, "readwrite", s => s.delete(sk(zone, key)) as unknown as IDBRequest<undefined>);
  await tx(STORE_META, "readwrite", s => s.delete(sk(zone, key)) as unknown as IDBRequest<undefined>);
}

export async function listMeta(zone?: StorageZone): Promise<StorageEntryMeta[]> {
  const all = await tx(STORE_META, "readonly", s => s.getAll() as IDBRequest<StorageEntryMeta[]>);
  return zone ? all.filter(m => m.zone === zone) : all;
}

export async function zoneStats(): Promise<Record<StorageZone, { entries: number; bytes: number; human: string }>> {
  const metas = await listMeta();
  const out: Record<string, { entries: number; bytes: number; human: string }> = {};
  for (const m of metas) {
    if (!out[m.zone]) out[m.zone] = { entries: 0, bytes: 0, human: "" };
    out[m.zone].entries++;
    out[m.zone].bytes += m.size;
  }
  for (const z of Object.keys(out)) out[z].human = fmtBytes(out[z].bytes);
  return out as Record<StorageZone, { entries: number; bytes: number; human: string }>;
}

export function fmtBytes(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + " GB";
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}

// ==================== 自动清理（仅可清分区；红线保护内置） ====================

export interface CleanResult {
  zone: StorageZone;
  removedEntries: number;
  freedBytes: number;
  reason: "EXPIRED" | "LRU_OVERFLOW" | "NONE";
}

/**
 * 清理单个分区：先按 TTL 过期，再按容量上限 LRU 淘汰。
 * USER_PRIVATE_DATA / OFFLINE_PACK / SYSTEM_DATA 的 autoCleanable=false，直接跳过（红线）。
 */
export async function cleanZone(zone: StorageZone): Promise<CleanResult> {
  const policy = ZONE_POLICIES[zone];
  const base: CleanResult = { zone, removedEntries: 0, freedBytes: 0, reason: "NONE" };
  if (!policy.autoCleanable) return base;   // 第六十九章红线

  const metas = await listMeta(zone);
  const now = Date.now();
  let freed = 0, removed = 0;

  // 1) TTL 过期
  const expired = metas.filter(m => m.expiresAt && m.expiresAt < now);
  for (const m of expired) {
    await remove(zone, m.key);
    freed += m.size; removed++;
  }
  if (removed) return { ...base, removedEntries: removed, freedBytes: freed, reason: "EXPIRED" };

  // 2) 容量上限 + LRU 淘汰
  if (policy.maxBytes) {
    const total = metas.reduce((s, m) => s + m.size, 0);
    if (total > policy.maxBytes) {
      const byLru = [...metas].sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
      let cur = total;
      for (const m of byLru) {
        if (cur <= policy.maxBytes) break;
        await remove(zone, m.key);
        cur -= m.size; freed += m.size; removed++;
      }
      return { ...base, removedEntries: removed, freedBytes: freed, reason: "LRU_OVERFLOW" };
    }
  }
  return base;
}

/** 清理全部可清分区（TEMP/MEDIA/AI）——供 appAutoClean 调用 */
export async function cleanAllAutoCleanable(): Promise<CleanResult[]> {
  const zones: StorageZone[] = ["TEMP_CACHE", "MEDIA_CACHE", "AI_CACHE"];
  const results: CleanResult[] = [];
  for (const z of zones) {
    try { results.push(await cleanZone(z)); } catch { /* 单分区失败继续 */ }
  }
  return results;
}

/**
 * OFFLINE_PACK 旧版本清理（升级逻辑专用）：
 * 保留每个 packId 最新 version，删除旧版本。用户明确保留的（protected 标记）不动。
 */
export async function cleanOldPackVersions(packId: string, keepVersion: string): Promise<number> {
  const metas = await listMeta("OFFLINE_PACK");
  let removed = 0;
  for (const m of metas) {
    if (m.key.startsWith(packId + "@") && m.version && m.version !== keepVersion && !m.protectedFromAutoClean) {
      await remove("OFFLINE_PACK", m.key);
      removed++;
    }
  }
  return removed;
}
