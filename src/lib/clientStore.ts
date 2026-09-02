"use client";

/**
 * 客户档案存储层（云端同步版）
 * P1.5整改：
 * - 保留localStorage作为离线缓存，优先读取本地
 * - 所有写操作：同步更新本地缓存（立即返回），异步同步云端（后台）
 * - 首次启动自动迁移本地历史数据到云端
 * - 无网络时暂存本地，联网后自动增量同步
 * - 强制userId数据隔离
 * - 保持原有同步API签名，现有调用无需修改
 */

import { getClientUserId } from "./auth";
import { syncRecordToBackend, canCloudSyncRecords } from "./recordSync";

// ==================== 类型定义 ====================
export interface Client {
  id: string;
  name: string;
  gender: "male" | "female" | "";
  birthday: string;
  phone: string;
  tags: string[];
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRecord {
  id: string;
  clientId: string;
  type: string;
  data: any;
  note: string;
  status: "pending" | "communicated" | "closed";
  createdAt: string;
  updatedAt: string;
}

// 离线操作队列
interface PendingOp {
  id: string;
  op: "createClient" | "updateClient" | "deleteClient" | "createRecord" | "updateRecord" | "deleteRecord";
  payload: any;
  timestamp: string;
}

// ==================== 常量 ====================
const CLIENTS_KEY = "yandao_clients";
const RECORDS_KEY = "yandao_records";
const RECENT_CLIENTS_KEY = "yandao_recent_clients";
const PENDING_OPS_KEY = "yandao_pending_ops";
const MIGRATION_DONE_KEY = "yandao_cloud_migrated_v1";
const SYNC_STATUS_KEY = "yandao_sync_status";

// ==================== 工具函数 ====================
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function safeGet<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function safeSet(key: string, value: any): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("localStorage write failed:", e);
  }
}

function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

// ==================== 离线队列管理 ====================
function getPendingOps(): PendingOp[] {
  return safeGet<PendingOp[]>(PENDING_OPS_KEY, []);
}

function addPendingOp(op: PendingOp["op"], payload: any): void {
  const ops = getPendingOps();
  ops.push({ id: generateId(), op, payload, timestamp: new Date().toISOString() });
  safeSet(PENDING_OPS_KEY, ops);
  setSyncStatus("pending");
}

function setSyncStatus(status: "synced" | "pending" | "syncing" | "error"): void {
  safeSet(SYNC_STATUS_KEY, status);
}

export function getSyncStatus(): string {
  return safeGet<string>(SYNC_STATUS_KEY, "synced");
}

/**
 * v25.0.74: 手动触发离线队列补传（含排盘记录）。
 * initCloudSync 有模块级 promise 缓存——APP 启动时未登录则空跑一次，登录后再调
 * 直接返回缓存 promise 不会重放队列；登录成功路径改调本函数确保补传。
 */
export function flushPendingRecordSync(): void {
  if (typeof window === "undefined") return;
  replayPendingOps().catch(() => {});
}

// ==================== 云端API封装 ====================
async function apiFetch<T = any>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    });
    if (!res.ok) {
      console.error(`API ${url} failed:`, res.status);
      return null;
    }
    const json = await res.json();
    if (!json.success) {
      console.error(`API ${url} error:`, json.error);
      return null;
    }
    return json.data as T;
  } catch (e) {
    console.error(`API ${url} network error:`, e);
    return null;
  }
}

// ==================== 后台云端同步（不阻塞UI）====================

function asyncSyncCreateClient(client: Client): void {
  if (isOnline()) {
    apiFetch("/api/clients", {
      method: "POST",
      body: JSON.stringify({
        name: client.name, gender: client.gender, birthday: client.birthday,
        phone: client.phone, tags: client.tags, note: client.note,
      }),
    }).catch(() => addPendingOp("createClient", client));
  } else {
    addPendingOp("createClient", client);
  }
}

function asyncSyncUpdateClient(client: Client): void {
  if (isOnline()) {
    apiFetch(`/api/clients/${client.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: client.name, gender: client.gender, birthday: client.birthday,
        phone: client.phone, tags: client.tags, note: client.note,
      }),
    }).catch(() => addPendingOp("updateClient", { id: client.id, data: { name: client.name, gender: client.gender, birthday: client.birthday, phone: client.phone, tags: client.tags, note: client.note } }));
  } else {
    addPendingOp("updateClient", { id: client.id, data: { name: client.name, gender: client.gender, birthday: client.birthday, phone: client.phone, tags: client.tags, note: client.note } });
  }
}

function asyncSyncDeleteClient(id: string): void {
  if (isOnline()) {
    apiFetch(`/api/clients/${id}`, { method: "DELETE" })
      .catch(() => addPendingOp("deleteClient", { id }));
  } else {
    addPendingOp("deleteClient", { id });
  }
}

/** 后端 /records/save 单条上限 500KB；超限时降级为精简 payload，防离线队列永久积压 */
function makeBackendPayload(record: ServiceRecord): unknown {
  try {
    const s = JSON.stringify(record.data);
    if (s != null && s.length > 480000) {
      const d = record.data as Record<string, unknown> | null;
      return { _truncated: true, inputParams: d && typeof d === "object" ? d.inputParams ?? null : null };
    }
    return record.data;
  } catch {
    return { _error: "unserializable" };
  }
}

function asyncSyncCreateRecord(record: ServiceRecord): void {
  // v25.0.74: 修复云端保存死路径——原 POST /api/records 在后端从未挂载（真实路径
  // /api/auth/records/save 且需 JWT 鉴权），Web 端打到静态 nginx 404、安卓端经
  // native-api-patch 改写后同样 404，排盘记录只落 localStorage，/records 页读后端永远为空。
  // 改走 recordSync.syncRecordToBackend（name/qiming 已验证可用的正式链路）；
  // 未登录/离线/失败时入离线队列，登录后由 flushPendingRecordSync 补传。
  // v25.0.77: 非会员仅本地保存——syncRecordToBackend 会员门禁返回 false，
  // 记录入离线队列，升级会员后登录自动补传上云。
  if (!isOnline()) {
    addPendingOp("createRecord", record);
    return;
  }
  const payload = makeBackendPayload(record);
  syncRecordToBackend(record.type, payload, record.note)
    .then((ok) => {
      if (!ok) addPendingOp("createRecord", record);
    })
    .catch(() => addPendingOp("createRecord", record));
}

function asyncSyncUpdateRecord(id: string, data: Partial<ServiceRecord>): void {
  // v25.0.77: 非会员不发起云端更新（记录状态仅本地生效）
  if (!canCloudSyncRecords()) return;
  if (isOnline()) {
    apiFetch(`/api/records/${id}`, { method: "PUT", body: JSON.stringify(data) })
      .catch(() => addPendingOp("updateRecord", { id, data }));
  } else {
    addPendingOp("updateRecord", { id, data });
  }
}

function asyncSyncDeleteRecord(id: string): void {
  // v25.0.77: 非会员不发起云端删除（仅本地删除 + 队列清理）
  if (!canCloudSyncRecords()) return;
  if (isOnline()) {
    apiFetch(`/api/records/${id}`, { method: "DELETE" })
      .catch(() => addPendingOp("deleteRecord", { id }));
  } else {
    addPendingOp("deleteRecord", { id });
  }
}

// ==================== 初始化与数据迁移 ====================
let initPromise: Promise<void> | null = null;

/**
 * 初始化云端同步（后台执行，不阻塞UI）
 * - 首次启动：迁移本地数据到云端，拉取云端全量数据合并
 * - 后续启动：拉取云端数据合并本地
 * - 重放离线队列
 */
export function initCloudSync(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (typeof window === "undefined") return;
    const userId = getClientUserId();
    if (!userId) return;

    try {
      setSyncStatus("syncing");

      // 1. 检查是否需要首次迁移
      const migrated = safeGet<boolean>(MIGRATION_DONE_KEY, false);
      if (!migrated) {
        const localClients = safeGet<Client[]>(CLIENTS_KEY, []);
        const localRecords = safeGet<ServiceRecord[]>(RECORDS_KEY, []);
        if (localClients.length > 0 || localRecords.length > 0) {
          await apiFetch("/api/sync", {
            method: "POST",
            body: JSON.stringify({ clients: localClients, records: localRecords }),
          });
        }
        safeSet(MIGRATION_DONE_KEY, true);
      }

      // 2. 拉取云端全量数据
      const cloudData = await apiFetch<{ clients: Client[]; records: ServiceRecord[] }>("/api/sync");
      if (cloudData) {
        safeSet(CLIENTS_KEY, cloudData.clients || []);
        safeSet(RECORDS_KEY, cloudData.records || []);
      }

      // 3. 重放离线操作队列
      await replayPendingOps();

      setSyncStatus("synced");
    } catch (e) {
      console.error("Cloud sync init failed:", e);
      setSyncStatus("error");
    }
  })();

  return initPromise;
}

async function replayPendingOps(): Promise<void> {
  const ops = getPendingOps();
  if (ops.length === 0) return;
  if (!isOnline()) return;

  const remaining: PendingOp[] = [];
  for (const op of ops) {
    let success = false;
    try {
      switch (op.op) {
        case "createClient": {
          const r = await apiFetch<Client>("/api/clients", {
            method: "POST",
            body: JSON.stringify({
              name: op.payload.name, gender: op.payload.gender, birthday: op.payload.birthday,
              phone: op.payload.phone, tags: op.payload.tags, note: op.payload.note,
            }),
          });
          success = !!r;
          break;
        }
        case "updateClient": {
          const r = await apiFetch<Client>(`/api/clients/${op.payload.id}`, {
            method: "PUT",
            body: JSON.stringify(op.payload.data),
          });
          success = !!r;
          break;
        }
        case "deleteClient": {
          const r = await apiFetch(`/api/clients/${op.payload.id}`, { method: "DELETE" });
          success = r !== null;
          break;
        }
        case "createRecord": {
          // v25.0.74: 与 asyncSyncCreateRecord 同口径走正式后端链路（原 /api/records 死路径）
          const ok = await syncRecordToBackend(op.payload.type, makeBackendPayload(op.payload), op.payload.note);
          success = ok === true;
          break;
        }
        case "updateRecord": {
          const r = await apiFetch<ServiceRecord>(`/api/records/${op.payload.id}`, {
            method: "PUT",
            body: JSON.stringify(op.payload.data),
          });
          success = !!r;
          break;
        }
        case "deleteRecord": {
          const r = await apiFetch(`/api/records/${op.payload.id}`, { method: "DELETE" });
          success = r !== null;
          break;
        }
      }
    } catch {
      success = false;
    }
    if (!success) remaining.push(op);
  }
  safeSet(PENDING_OPS_KEY, remaining);
}

// ==================== Client 操作（同步本地 + 异步云端）====================

export function getClients(): Client[] {
  return safeGet<Client[]>(CLIENTS_KEY, []);
}

export function getClient(id: string): Client | null {
  const clients = getClients();
  return clients.find((c) => c.id === id) || null;
}

export function saveClient(
  clientData: Omit<Client, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Client {
  const clients = getClients();
  const now = new Date().toISOString();
  let result: Client;

  if (clientData.id) {
    const idx = clients.findIndex((c) => c.id === clientData.id);
    if (idx >= 0) {
      // 更新
      clients[idx] = { ...clients[idx], ...clientData, updatedAt: now } as Client;
      result = clients[idx];
      asyncSyncUpdateClient(result);
    } else {
      // ID不存在，新建
      const newClient: Client = {
        id: generateId(),
        name: clientData.name,
        gender: clientData.gender || "",
        birthday: clientData.birthday || "",
        phone: clientData.phone || "",
        tags: clientData.tags || [],
        note: clientData.note || "",
        createdAt: now,
        updatedAt: now,
      };
      clients.unshift(newClient);
      result = newClient;
      asyncSyncCreateClient(result);
    }
  } else {
    // 新增
    const newClient: Client = {
      id: generateId(),
      name: clientData.name,
      gender: clientData.gender || "",
      birthday: clientData.birthday || "",
      phone: clientData.phone || "",
      tags: clientData.tags || [],
      note: clientData.note || "",
      createdAt: now,
      updatedAt: now,
    };
    clients.unshift(newClient);
    result = newClient;
    asyncSyncCreateClient(result);
  }

  safeSet(CLIENTS_KEY, clients);
  touchRecentClient(result.id);
  return result;
}

export function deleteClient(id: string): void {
  const clients = getClients().filter((c) => c.id !== id);
  safeSet(CLIENTS_KEY, clients);
  const records = getRecords().filter((r) => r.clientId !== id);
  safeSet(RECORDS_KEY, records);
  const recent = getRecentClientIds().filter((rid) => rid !== id);
  safeSet(RECENT_CLIENTS_KEY, recent);
  asyncSyncDeleteClient(id);
}

export function searchClients(keyword: string): Client[] {
  const clients = getClients();
  if (!keyword.trim()) return clients;
  const kw = keyword.toLowerCase();
  return clients.filter(
    (c) =>
      c.name.toLowerCase().includes(kw) ||
      c.phone.includes(kw) ||
      c.tags.some((t) => t.toLowerCase().includes(kw)) ||
      c.note.toLowerCase().includes(kw)
  );
}

export function getRecentClients(limit: number = 5): Client[] {
  const recentIds = getRecentClientIds();
  const clients = getClients();
  const result: Client[] = [];
  for (const id of recentIds) {
    const c = clients.find((cl) => cl.id === id);
    if (c) {
      result.push(c);
      if (result.length >= limit) break;
    }
  }
  return result;
}

function getRecentClientIds(): string[] {
  return safeGet<string[]>(RECENT_CLIENTS_KEY, []);
}

function touchRecentClient(id: string): void {
  let recent = getRecentClientIds().filter((rid) => rid !== id);
  recent.unshift(id);
  recent = recent.slice(0, 10);
  safeSet(RECENT_CLIENTS_KEY, recent);
}

// ==================== Record 操作（同步本地 + 异步云端）====================

export function getRecords(clientId?: string, type?: string): ServiceRecord[] {
  let records = safeGet<ServiceRecord[]>(RECORDS_KEY, []);
  if (clientId) records = records.filter((r) => r.clientId === clientId);
  if (type) records = records.filter((r) => r.type === type);
  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return records;
}

export function getRecord(id: string): ServiceRecord | null {
  const records = getRecords();
  return records.find((r) => r.id === id) || null;
}

/** v25.0.77: 仍在离线队列（未上云）的本地记录——会员视图与云端记录合并展示用 */
export function getUnsyncedLocalRecords(type?: string): ServiceRecord[] {
  const pendingIds = new Set(
    getPendingOps()
      .filter((o) => o.op === "createRecord" && o.payload?.id)
      .map((o) => o.payload.id as string)
  );
  if (pendingIds.size === 0) return [];
  return getRecords(undefined, type).filter((r) => pendingIds.has(r.id));
}

/** v25.0.77: 本地删除时清理队列中对应的待同步记录，防升级会员后已删记录"复活"上云 */
function removePendingCreateRecord(recordId: string): void {
  const ops = getPendingOps().filter(
    (o) => !(o.op === "createRecord" && o.payload?.id === recordId)
  );
  safeSet(PENDING_OPS_KEY, ops);
}

export function saveRecord(
  recordData: Omit<ServiceRecord, "id" | "createdAt" | "updatedAt">
): ServiceRecord {
  const records = safeGet<ServiceRecord[]>(RECORDS_KEY, []);
  const now = new Date().toISOString();
  const newRecord: ServiceRecord = {
    id: generateId(),
    clientId: recordData.clientId,
    type: recordData.type,
    data: recordData.data,
    note: recordData.note || "",
    status: recordData.status || "pending",
    createdAt: now,
    updatedAt: now,
  };
  records.unshift(newRecord);
  safeSet(RECORDS_KEY, records);
  touchRecentClient(recordData.clientId);

  const clients = getClients();
  const cIdx = clients.findIndex((c) => c.id === recordData.clientId);
  if (cIdx >= 0) {
    clients[cIdx].updatedAt = now;
    safeSet(CLIENTS_KEY, clients);
  }

  asyncSyncCreateRecord(newRecord);
  return newRecord;
}

export function updateRecordNote(id: string, note: string): void {
  const records = safeGet<ServiceRecord[]>(RECORDS_KEY, []);
  const idx = records.findIndex((r) => r.id === id);
  if (idx >= 0) {
    records[idx].note = note;
    records[idx].updatedAt = new Date().toISOString();
    safeSet(RECORDS_KEY, records);
    asyncSyncUpdateRecord(id, { note });
  }
}

export function updateRecordStatus(
  id: string,
  status: "pending" | "communicated" | "closed"
): void {
  const records = safeGet<ServiceRecord[]>(RECORDS_KEY, []);
  const idx = records.findIndex((r) => r.id === id);
  if (idx >= 0) {
    records[idx].status = status;
    records[idx].updatedAt = new Date().toISOString();
    safeSet(RECORDS_KEY, records);
    asyncSyncUpdateRecord(id, { status });
  }
}

export function deleteRecord(id: string): void {
  const records = safeGet<ServiceRecord[]>(RECORDS_KEY, []).filter((r) => r.id !== id);
  safeSet(RECORDS_KEY, records);
  removePendingCreateRecord(id);
  asyncSyncDeleteRecord(id);
}

// ==================== 工具类型映射 ====================
export const TOOL_TYPE_MAP: Record<string, { name: string; color: string; path: string }> = {
  bazi: { name: "八字", color: "#7B2FBE", path: "/yixue/bazi" },
  ziwei: { name: "紫微斗数", color: "#E91E63", path: "/yixue/ziwei" },
  qimen: { name: "奇门遁甲", color: "#FF9800", path: "/yixue/qimen" },
  daliuren: { name: "大六壬", color: "#4CAF50", path: "/yixue/daliuren" },
  liuyao: { name: "六爻", color: "#2196F3", path: "/yixue/liuyao" },
  meihua: { name: "梅花易数", color: "#9C27B0", path: "/yixue/meihua" },
  xiaoliuren: { name: "小六壬", color: "#00BCD4", path: "/yixue/xiaoliuren" },
  hehun: { name: "合婚", color: "#F44336", path: "/yixue/hehun" },
  huangli: { name: "黄历", color: "#795548", path: "/yixue/huangli" },
  wannianli: { name: "万年历", color: "#607D8B", path: "/yixue/wannianli" },
  "taiyi-sanshi": { name: "太乙三式", color: "#673AB7", path: "/yixue/taiyi-sanshi" },
  "xuankong-feixing": { name: "玄空飞星", color: "#3F51B5", path: "/yixue/xuankong-feixing" },
  compass: { name: "专业罗盘", color: "#B8860B", path: "/yixue/compass" },
  qizheng: { name: "七政四余", color: "#8d6708", path: "/yixue/qizheng" },
  liji: { name: "立极尺", color: "#2f7bd4", path: "/yixue/liji" },
  luban: { name: "鲁班尺/丁兰尺", color: "#a0522d", path: "/yixue/luban" },
  phone: { name: "手机号码解析", color: "#009688", path: "/yixue/phone" },
  carplate: { name: "车牌号民俗解读", color: "#FF5722", path: "/yixue/carplate" },
  zeri: { name: "择日", color: "#8BC34A", path: "/yixue/zeri" },
  astro: { name: "占星术", color: "#5C6BC0", path: "/yixue/astro" },
  jiemeng: { name: "解梦", color: "#E040FB", path: "/yixue/jiemeng" },
  // P2-3 中医服务类型（医考学习数据暂不接入客户档案）
  "tcm-constitution": { name: "中医体质测评", color: "#7B2FBE", path: "/zhongyi/constitution" },
};

export function getToolMeta(type: string) {
  return TOOL_TYPE_MAP[type] || { name: type, color: "#999", path: "/yixue" };
}

// ==================== 回填数据存储 ====================
const PREFILL_KEY_PREFIX = "yandao_prefill_";

export function setPrefillData(toolType: string, data: any): void {
  if (typeof window === "undefined") return;
  safeSet(PREFILL_KEY_PREFIX + toolType, data);
}

export function getPrefillData(toolType: string): any | null {
  if (typeof window === "undefined") return null;
  return safeGet<any | null>(PREFILL_KEY_PREFIX + toolType, null);
}

export function clearPrefillData(toolType: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PREFILL_KEY_PREFIX + toolType);
}

// ==================== 手机号脱敏 ====================
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || "";
  return phone.substr(0, 3) + "****" + phone.substr(-4);
}

// ==================== 网络状态监听：联网时自动同步 ====================
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    replayPendingOps().then(() => {
      apiFetch<{ clients: Client[]; records: ServiceRecord[] }>("/api/sync").then((data) => {
        if (data) {
          safeSet(CLIENTS_KEY, data.clients || []);
          safeSet(RECORDS_KEY, data.records || []);
          setSyncStatus("synced");
        }
      });
    });
  });
}
