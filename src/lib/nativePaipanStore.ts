"use client";

// ============================================================================
// 排盘记录 + 命主档案 统一存储桥（v25.0.88）
//
// 双通道同构实现：
//   - 原生壳（Android）：Capacitor 插件 PaipanStore → APP 私有 SQLite
//     （paipan_store.db，清 WebView 缓存不丢、卸载才移除、完全不联网）
//   - web/iOS 壳：localStorage 回退（paipan_records_v1 / mingzhu_profiles_v1），
//     与原生接口同构，页面代码零感知。
//
// 所有方法 SSR 安全（构建期 window 不可用时返回空数据）；
// 原生插件调用异常（如 iOS 壳未注册该插件）自动降级 localStorage。
// ============================================================================

import { Capacitor, registerPlugin } from "@capacitor/core";
import { getUserPermissionLevel } from "@/lib/aiService";

// ==================== 数据类型 ====================

export interface MingzhuProfile {
  id: string;
  name: string;
  /** "男" | "女" */
  gender?: string | null;
  /** 公历生日，如 1990-05-20 */
  birthDate?: string | null;
  /** 出生时间，如 14:30 / 未知 */
  birthTime?: string | null;
  birthPlace?: string | null;
  /** 工具特有补充字段（如八字需存历法类型等） */
  extra?: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
}

export interface PaipanRecord {
  id: number;
  tool: string;
  profileId?: string | null;
  title: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  note?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SaveRecordOptions {
  tool: string;
  title: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  note?: string;
  profileId?: string | null;
  /** 传入则更新已有记录 */
  id?: number;
}

// ==================== 原生插件类型（与 PaipanStorePlugin.java 参数一一对应） ====================

interface PaipanStoreNative {
  saveProfile(options: {
    id?: string;
    name: string;
    gender?: string;
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    extra?: Record<string, unknown>;
  }): Promise<{ profile: MingzhuProfile }>;
  listProfiles(options: { query?: string }): Promise<{ profiles: MingzhuProfile[] }>;
  deleteProfile(options: { id: string }): Promise<{ success: boolean }>;
  saveRecord(options: {
    tool: string;
    id?: number;
    profileId?: string;
    title?: string;
    input?: Record<string, unknown>;
    result?: Record<string, unknown>;
    note?: string;
  }): Promise<{ id: number; savedAt: number }>;
  listRecords(options: { tool?: string; limit?: number }): Promise<{ records: PaipanRecord[] }>;
  getRecord(options: { id: number }): Promise<{ record: PaipanRecord | null }>;
  deleteRecord(options: { id: number }): Promise<{ success: boolean }>;
  clearAll(): Promise<{ success: boolean }>;
  clearRecords(options: { tool: string }): Promise<{ success: boolean }>;
}

const PaipanStore = registerPlugin<PaipanStoreNative>("PaipanStore");

// ==================== localStorage 通道（web 回退，同构实现） ====================

const RECORDS_KEY = "paipan_records_v1";
const PROFILES_KEY = "mingzhu_profiles_v1";
/** 单工具在 localStorage 中的保留上限（防爆 5MB 配额） */
const WEB_MAX_PER_TOOL = 100;

function readLS<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeLS<T>(key: string, rows: T[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    // 配额满等异常：静默失败（历史记录非关键数据）
  }
}

let webIdCounter = 0;
function nextWebId(): number {
  return Date.now() * 1000 + (webIdCounter = (webIdCounter + 1) % 1000);
}

// ==================== 通道判定 ====================

export function isNativeStoreAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

// ==================== 排盘记录 API ====================

/** 保存/更新排盘记录（原生优先，web 回退），返回记录 id。
 *  自动去重：与该工具最近一条 input 完全相同时原位更新（避免反复排盘刷屏）。
 *  游客门控（v25.0.88 合规边界）：游客不落新记录，注册登录后完整可用（与八字页 v25.0.87 边界一致）。 */
export async function savePaipanRecord(opts: SaveRecordOptions): Promise<number> {
  if (typeof window !== "undefined" && getUserPermissionLevel() === "visitor") {
    return -1;
  }
  // 同参数去重：最近一条 input 相同则更新原记录
  const recent = (await listPaipanRecords(opts.tool)).find((r) => r.tool === opts.tool);
  if (
    recent &&
    safeEq(recent.input, opts.input) &&
    !opts.id // 调用方显式指定 id 更新时跳过去重
  ) {
    await updatePaipanRecord(recent.id, opts);
    return recent.id;
  }
  return insertPaipanRecord(opts);
}

/** 无条件新增一条记录 */
export async function insertPaipanRecord(opts: SaveRecordOptions): Promise<number> {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      const ret = await PaipanStore.saveRecord({
        tool: opts.tool,
        id: opts.id,
        profileId: opts.profileId ?? undefined,
        title: opts.title,
        input: opts.input,
        result: opts.result ?? {},
        note: opts.note,
      });
      return ret.id;
    } catch {
      // iOS 壳等未注册插件场景 → 降级 localStorage
    }
  }
  const rows = readLS<PaipanRecord>(RECORDS_KEY);
  const now = Date.now();
  if (opts.id && rows.some((r) => r.id === opts.id)) {
    const idx = rows.findIndex((r) => r.id === opts.id);
    rows[idx] = { ...rows[idx], ...opts, id: opts.id, updatedAt: now } as PaipanRecord;
    writeLS(RECORDS_KEY, rows);
    return opts.id;
  }
  const record: PaipanRecord = {
    id: nextWebId(),
    tool: opts.tool,
    profileId: opts.profileId ?? null,
    title: opts.title,
    input: opts.input,
    result: opts.result ?? {},
    note: opts.note ?? null,
    createdAt: now,
    updatedAt: now,
  };
  rows.unshift(record);
  // 每工具只保留最近 N 条
  const kept: PaipanRecord[] = [];
  const perTool = new Map<string, number>();
  for (const r of rows) {
    const n = (perTool.get(r.tool) || 0) + 1;
    if (n <= WEB_MAX_PER_TOOL) {
      perTool.set(r.tool, n);
      kept.push(r);
    }
  }
  writeLS(RECORDS_KEY, kept);
  return record.id;
}

/** 查询排盘记录（新→旧）。tool 缺省返回全部工具的记录 */
export async function listPaipanRecords(tool?: string): Promise<PaipanRecord[]> {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      const ret = await PaipanStore.listRecords({ tool, limit: 200 });
      return (ret.records || []).map(normalizeRecord);
    } catch {
      // 降级 localStorage
    }
  }
  const rows = readLS<PaipanRecord>(RECORDS_KEY);
  return rows
    .filter((r) => !tool || r.tool === tool)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 200);
}

/** 读取单条排盘记录 */
export async function getPaipanRecord(id: number): Promise<PaipanRecord | null> {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      const ret = await PaipanStore.getRecord({ id });
      return ret.record ? normalizeRecord(ret.record) : null;
    } catch {
      // 降级 localStorage
    }
  }
  return readLS<PaipanRecord>(RECORDS_KEY).find((r) => r.id === id) || null;
}

/** 删除单条排盘记录 */
export async function deletePaipanRecord(id: number): Promise<void> {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      await PaipanStore.deleteRecord({ id });
      return;
    } catch {
      // 降级 localStorage
    }
  }
  writeLS(RECORDS_KEY, readLS<PaipanRecord>(RECORDS_KEY).filter((r) => r.id !== id));
}

/** 原位更新已有记录（title/result/note/profileId 刷新，createdAt 不变） */
async function updatePaipanRecord(id: number, opts: SaveRecordOptions): Promise<void> {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      await PaipanStore.saveRecord({
        tool: opts.tool,
        id,
        profileId: opts.profileId ?? undefined,
        title: opts.title,
        input: opts.input,
        result: opts.result ?? {},
        note: opts.note,
      });
      return;
    } catch {
      // 降级 localStorage
    }
  }
  const rows = readLS<PaipanRecord>(RECORDS_KEY);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return;
  rows[idx] = {
    ...rows[idx],
    title: opts.title,
    input: opts.input,
    result: opts.result ?? rows[idx].result,
    note: opts.note ?? rows[idx].note,
    profileId: opts.profileId ?? rows[idx].profileId,
    updatedAt: Date.now(),
  };
  writeLS(RECORDS_KEY, rows);
}

/** 清空全部排盘记录（危险操作，仅设置页使用） */
export async function clearAllPaipanRecords(): Promise<void> {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      await PaipanStore.clearAll();
    } catch {
      // 降级 localStorage
    }
  }
  writeLS(RECORDS_KEY, []);
}

/** 清空指定工具的排盘记录（不影响其他工具与命主档案） */
export async function clearPaipanRecordsByTool(tool: string): Promise<void> {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      await PaipanStore.clearRecords({ tool });
    } catch {
      // 降级 localStorage
    }
  }
  writeLS(RECORDS_KEY, readLS<PaipanRecord>(RECORDS_KEY).filter((r) => r.tool !== tool));
}

// ==================== 命主档案库 API（跨工具共享） ====================

export interface ProfileDraft {
  id?: string;
  name: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  extra?: Record<string, unknown>;
}

/** 保存/更新命主档案，返回完整档案 */
export async function saveMingzhuProfile(draft: ProfileDraft): Promise<MingzhuProfile> {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      const ret = await PaipanStore.saveProfile({ ...draft });
      return ret.profile;
    } catch {
      // 降级 localStorage
    }
  }
  const rows = readLS<MingzhuProfile>(PROFILES_KEY);
  const now = Date.now();
  const id = draft.id || genUuid();
  const existing = rows.find((p) => p.id === id);
  const profile: MingzhuProfile = {
    id,
    name: draft.name,
    gender: draft.gender ?? existing?.gender ?? null,
    birthDate: draft.birthDate ?? existing?.birthDate ?? null,
    birthTime: draft.birthTime ?? existing?.birthTime ?? null,
    birthPlace: draft.birthPlace ?? existing?.birthPlace ?? null,
    extra: draft.extra ?? existing?.extra ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const others = rows.filter((p) => p.id !== id);
  writeLS(PROFILES_KEY, [profile, ...others]);
  return profile;
}

/** 命主档案列表（最近更新优先），可按姓名搜索 */
export async function listMingzhuProfiles(query?: string): Promise<MingzhuProfile[]> {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      const ret = await PaipanStore.listProfiles({ query });
      return ret.profiles || [];
    } catch {
      // 降级 localStorage
    }
  }
  const rows = readLS<MingzhuProfile>(PROFILES_KEY);
  return rows
    .filter((p) => !query || p.name.includes(query.trim()))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** 删除命主档案 */
export async function deleteMingzhuProfile(id: string): Promise<void> {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      await PaipanStore.deleteProfile({ id });
      return;
    } catch {
      // 降级 localStorage
    }
  }
  writeLS(PROFILES_KEY, readLS<MingzhuProfile>(PROFILES_KEY).filter((p) => p.id !== id));
}

// ==================== 工具函数 ====================

/** 排盘输入参数深度比较（键序不敏感），用于自动保存去重 */
function safeEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  try {
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    if (ka.join(",") !== kb.join(",")) return false;
    return ka.every((k) =>
      safeEq((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    );
  } catch {
    return false;
  }
}

/** 原生返回的 input/result 可能是 null（JSON null），统一归一为对象 */
function normalizeRecord(r: PaipanRecord): PaipanRecord {
  return {
    ...r,
    input: (r.input && typeof r.input === "object" ? r.input : {}) as Record<string, unknown>,
    result: (r.result && typeof r.result === "object" ? r.result : {}) as Record<string, unknown>,
  };
}

function genUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "p-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export function formatRecordTime(ts: number): string {
  try {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}
