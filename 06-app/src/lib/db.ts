/**
 * 数据访问层
 * P1.5整改：实现云端持久化存储
 * 当前使用JSON文件存储（开发/轻量部署），接口设计预留PostgreSQL切换能力
 * 所有操作强制userId隔离，跨用户不可见不可访问
 */

import fs from "fs";
import path from "path";

// ==================== 类型定义 ====================
export interface DBClient {
  id: string;
  userId: string;
  name: string;
  gender: "male" | "female" | "";
  birthday: string;
  phone: string;
  tags: string[];
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBRecord {
  id: string;
  userId: string;
  clientId: string;
  type: string;
  data: any;
  note: string;
  status: "pending" | "communicated" | "closed";
  createdAt: string;
  updatedAt: string;
}

interface DBShape {
  clients: DBClient[];
  records: DBRecord[];
  migrations: { version: number; appliedAt: string }[];
}

// ==================== 存储配置 ====================
const DB_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DB_DIR, "app-db.json");

function ensureDB(): DBShape {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial: DBShape = { clients: [], records: [], migrations: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw) as DBShape;
  } catch (e) {
    console.error("DB init error:", e);
    return { clients: [], records: [], migrations: [] };
  }
}

function saveDB(db: DBShape): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("DB save error:", e);
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ==================== 数据隔离校验 ====================
function assertUserId(userId: string): void {
  if (!userId || typeof userId !== "string" || userId.length < 4) {
    throw new Error("INVALID_USER_ID: 用户标识无效，无法访问数据");
  }
}

// ==================== Client CRUD ====================

export function getClients(userId: string): DBClient[] {
  assertUserId(userId);
  const db = ensureDB();
  return db.clients
    .filter((c) => c.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getClient(userId: string, id: string): DBClient | null {
  assertUserId(userId);
  const db = ensureDB();
  const c = db.clients.find((c) => c.id === id && c.userId === userId);
  return c || null;
}

export function createClient(
  userId: string,
  data: Omit<DBClient, "id" | "userId" | "createdAt" | "updatedAt">
): DBClient {
  assertUserId(userId);
  const db = ensureDB();
  const now = new Date().toISOString();
  const client: DBClient = {
    id: generateId(),
    userId,
    name: data.name || "",
    gender: data.gender || "",
    birthday: data.birthday || "",
    phone: data.phone || "",
    tags: data.tags || [],
    note: data.note || "",
    createdAt: now,
    updatedAt: now,
  };
  db.clients.push(client);
  saveDB(db);
  return client;
}

export function updateClient(
  userId: string,
  id: string,
  data: Partial<Omit<DBClient, "id" | "userId" | "createdAt">>
): DBClient | null {
  assertUserId(userId);
  const db = ensureDB();
  const idx = db.clients.findIndex((c) => c.id === id && c.userId === userId);
  if (idx < 0) return null;
  db.clients[idx] = {
    ...db.clients[idx],
    ...data,
    id: db.clients[idx].id,
    userId: db.clients[idx].userId,
    createdAt: db.clients[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  saveDB(db);
  return db.clients[idx];
}

export function deleteClient(userId: string, id: string): boolean {
  assertUserId(userId);
  const db = ensureDB();
  const before = db.clients.length;
  db.clients = db.clients.filter((c) => !(c.id === id && c.userId === userId));
  // 级联删除该用户的相关记录
  db.records = db.records.filter((r) => !(r.clientId === id && r.userId === userId));
  const after = db.clients.length;
  saveDB(db);
  return before > after;
}

// ==================== Record CRUD ====================

export function getRecords(userId: string, clientId?: string, type?: string): DBRecord[] {
  assertUserId(userId);
  const db = ensureDB();
  let records = db.records.filter((r) => r.userId === userId);
  if (clientId) records = records.filter((r) => r.clientId === clientId);
  if (type) records = records.filter((r) => r.type === type);
  return records.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getRecord(userId: string, id: string): DBRecord | null {
  assertUserId(userId);
  const db = ensureDB();
  const r = db.records.find((r) => r.id === id && r.userId === userId);
  return r || null;
}

export function createRecord(
  userId: string,
  data: Omit<DBRecord, "id" | "userId" | "createdAt" | "updatedAt">
): DBRecord {
  assertUserId(userId);
  const db = ensureDB();
  const now = new Date().toISOString();
  const record: DBRecord = {
    id: generateId(),
    userId,
    clientId: data.clientId,
    type: data.type,
    data: data.data,
    note: data.note || "",
    status: data.status || "pending",
    createdAt: now,
    updatedAt: now,
  };
  db.records.push(record);
  // 更新客户updatedAt
  const cIdx = db.clients.findIndex((c) => c.id === data.clientId && c.userId === userId);
  if (cIdx >= 0) {
    db.clients[cIdx].updatedAt = now;
  }
  saveDB(db);
  return record;
}

export function updateRecord(
  userId: string,
  id: string,
  data: Partial<Omit<DBRecord, "id" | "userId" | "clientId" | "createdAt">>
): DBRecord | null {
  assertUserId(userId);
  const db = ensureDB();
  const idx = db.records.findIndex((r) => r.id === id && r.userId === userId);
  if (idx < 0) return null;
  db.records[idx] = {
    ...db.records[idx],
    ...data,
    id: db.records[idx].id,
    userId: db.records[idx].userId,
    clientId: db.records[idx].clientId,
    createdAt: db.records[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  saveDB(db);
  return db.records[idx];
}

export function deleteRecord(userId: string, id: string): boolean {
  assertUserId(userId);
  const db = ensureDB();
  const before = db.records.length;
  db.records = db.records.filter((r) => !(r.id === id && r.userId === userId));
  const after = db.records.length;
  saveDB(db);
  return before > after;
}

// ==================== 批量导入（用于本地数据迁移） ====================
export function bulkImport(
  userId: string,
  clients: Omit<DBClient, "userId">[],
  records: Omit<DBRecord, "userId">[]
): { importedClients: number; importedRecords: number } {
  assertUserId(userId);
  const db = ensureDB();
  let ic = 0, ir = 0;

  for (const c of clients) {
    if (!c.id || db.clients.some((x) => x.id === c.id && x.userId === userId)) continue;
    db.clients.push({ ...c, userId });
    ic++;
  }
  for (const r of records) {
    if (!r.id || db.records.some((x) => x.id === r.id && x.userId === userId)) continue;
    db.records.push({ ...r, userId });
    ir++;
  }
  saveDB(db);
  return { importedClients: ic, importedRecords: ir };
}
