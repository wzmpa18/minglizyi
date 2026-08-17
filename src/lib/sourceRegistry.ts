"use client";

// ============================================================================
// 来源注册库 Source Registry - v25.0.26（P6-TOOL-04-补02）
// 三条原则：开发隔离 + 来源可溯 + 分级标注。
// - 内部溯源：全量留存，每条第三方资源绑定 source_id，记录来源/许可证/版本/商用权限/地址/导入信息，
//   后台 100% 可追溯，禁止「孤儿数据」。
// - 前端分级：PublicDomain 不强制外露（后台留存即可）；MIT/CC BY 按协议署名（页面合规区）；
//   AI 生成内容标注「AI生成，仅供文化娱乐参考」。
// - 风险处置：一键下架/冻结（status→suspended）+ 争议标记（disputed）+ 全程审计留痕，复用 alertService 告警。
// ============================================================================

import { raiseAlert } from "./alertService";

export type SourceLicense =
  | "PublicDomain" // 公共领域（古籍原文等）
  | "MIT"
  | "CC0"
  | "CC-BY-4.0"
  | "Authorized"; // 项目方书面授权素材（编者整理知识库）

export type SourceStatus = "active" | "suspended" | "disputed";

export interface SourceRecord {
  sourceId: string;
  name: string; // 来源名称
  license: SourceLicense;
  version: string; // 版本号
  commercialUse: boolean; // 商用权限
  url: string; // 原始地址
  scope: string; // 使用范围/模块（如 占星引擎/农历计算/紫微知识库）
  importedAt: string; // 导入时间
  importedBy: string; // 导入人
  status: SourceStatus;
  note: string;
}

export interface SourceAuditEntry {
  id: string;
  action: "create" | "update" | "takedown" | "restore" | "dispute";
  sourceId: string;
  detail: string;
  operator: string;
  createdAt: string;
}

const KEY = "yandao_source_registry";
const AUDIT_KEY = "yandao_source_registry_audit";

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const LICENSE_LABELS: Record<SourceLicense, string> = {
  PublicDomain: "公共领域（Public Domain）",
  MIT: "MIT",
  CC0: "CC0",
  "CC-BY-4.0": "CC BY 4.0",
  Authorized: "项目方授权素材",
};

// ==================== 种子数据（净室合规基线，LOC 后台可增删改） ====================

const SEED_SOURCES: SourceRecord[] = [
  {
    sourceId: "SRC-LUNAR-JS",
    name: "lunar-javascript（农历/黄历/干支历法库）",
    license: "MIT",
    version: "1.7.x",
    commercialUse: true,
    url: "https://github.com/6tail/lunar-javascript",
    scope: "万年历/黄历宜忌/择日引擎/八字干支计算",
    importedAt: "2026-08-15T00:00:00.000Z",
    importedBy: "platform",
    status: "active",
    note: "仅经标准 API 调用，未修改其源码闭源分发",
  },
  {
    sourceId: "SRC-IZTRO",
    name: "iztro（紫微斗数开源排盘库）",
    license: "MIT",
    version: "2.x",
    commercialUse: true,
    url: "https://github.com/SylarLong/iztro",
    scope: "紫微斗数基础排盘（星曜安宫）；叠宫/断语为平台净室自研引擎（ZW-OVERLAY，372 项对拍）",
    importedAt: "2026-08-17T00:00:00.000Z",
    importedBy: "platform",
    status: "active",
    note: "GPL 无关；MIT 允许商用。自研部分与开源调用物理分层",
  },
  {
    sourceId: "SRC-ASTRO-ENGINE",
    name: "astronomy-engine（天文历算引擎）",
    license: "MIT",
    version: "2.x",
    commercialUse: true,
    url: "https://github.com/cosinekitty/astronomy-engine",
    scope: "占星工具行星位置/相位计算",
    importedAt: "2026-08-17T00:00:00.000Z",
    importedBy: "platform",
    status: "active",
    note: "数据资产清单见 docs/compliance/占星工具第三方数据资产清单.md",
  },
  {
    sourceId: "SRC-CLASSICS-PD",
    name: "传统典籍公版原文（《紫微斗数全书》《神农本草经》《伤寒论》等）",
    license: "PublicDomain",
    version: "公版整理本",
    commercialUse: true,
    url: "-",
    scope: "知识库基础文本/断语溯源/中医学习库",
    importedAt: "2026-08-10T00:00:00.000Z",
    importedBy: "platform",
    status: "active",
    note: "公版内容；平台AI解读为衍生生成内容，与原文分层存储并标注AI生成",
  },
  {
    sourceId: "SRC-ZW-KB-YITING",
    name: "紫微斗数知识库（编者整理）",
    license: "Authorized",
    version: "v2（项目方授权素材）",
    commercialUse: true,
    url: "-",
    scope: "紫微断语/叠宫技法/十二宫格局释义",
    importedAt: "2026-08-17T00:00:00.000Z",
    importedBy: "platform",
    status: "active",
    note: "项目方书面授权素材（用户上传），仅限本平台使用；未授权付费素材严禁入库",
  },
];

function ensureSeed(): SourceRecord[] {
  const list = safeGet<SourceRecord[] | null>(KEY, null);
  if (list && Array.isArray(list) && list.length > 0) return list;
  safeSet(KEY, SEED_SOURCES);
  return SEED_SOURCES;
}

function writeAudit(action: SourceAuditEntry["action"], sourceId: string, detail: string, operator: string): void {
  const list = safeGet<SourceAuditEntry[]>(AUDIT_KEY, []);
  list.push({
    id: `sa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action,
    sourceId,
    detail,
    operator,
    createdAt: new Date().toISOString(),
  });
  safeSet(AUDIT_KEY, list.slice(-500));
}

// ==================== 查询 ====================

export function listSources(): SourceRecord[] {
  return ensureSeed();
}

export function getSource(sourceId: string): SourceRecord | null {
  return listSources().find((s) => s.sourceId === sourceId) || null;
}

export function listSourceAudit(): SourceAuditEntry[] {
  return safeGet<SourceAuditEntry[]>(AUDIT_KEY, []).slice().reverse();
}

/** 前端需署名展示的资源（仅 MIT / CC BY，按补02 分级标注规则） */
export function getAttributionRequired(): SourceRecord[] {
  return listSources().filter((s) => s.status === "active" && (s.license === "MIT" || s.license === "CC-BY-4.0"));
}

/** 合规校验：许可证不在四类合规白名单（PublicDomain/MIT/CC0/CC BY）且非书面授权的资源 */
export function getNonCompliantSources(): SourceRecord[] {
  return listSources().filter((s) => !s.commercialUse || (s.license === "Authorized" && s.note.indexOf("书面授权") < 0));
}

// ==================== 管理（LOC 后台） ====================

export function upsertSource(rec: Omit<SourceRecord, "status"> & { status?: SourceStatus }, operator = "admin"): { success: boolean; message: string } {
  if (!rec.sourceId || !rec.name) return { success: false, message: "source_id 与名称必填" };
  if (!/^(PublicDomain|MIT|CC0|CC-BY-4\.0|Authorized)$/.test(rec.license)) {
    return { success: false, message: "许可证必须为 PublicDomain/MIT/CC0/CC BY 4.0/书面授权 五类之一" };
  }
  const list = ensureSeed();
  const idx = list.findIndex((s) => s.sourceId === rec.sourceId);
  const full: SourceRecord = { ...rec, status: rec.status || "active" };
  if (idx >= 0) {
    list[idx] = full;
    writeAudit("update", rec.sourceId, `更新来源记录（${rec.name}，${rec.license}，v${rec.version}）`, operator);
  } else {
    list.push(full);
    writeAudit("create", rec.sourceId, `新增来源记录（${rec.name}，${rec.license}，v${rec.version}）`, operator);
  }
  safeSet(KEY, list);
  return { success: true, message: idx >= 0 ? "已更新" : "已新增" };
}

/** 一键下架/恢复（争议处置：下架冻结关联内容，溯源记录保留用于举证） */
export function takedownSource(sourceId: string, reason: string, operator = "admin"): { success: boolean; message: string } {
  const list = ensureSeed();
  const s = list.find((x) => x.sourceId === sourceId);
  if (!s) return { success: false, message: "来源不存在" };
  s.status = "suspended";
  safeSet(KEY, list);
  writeAudit("takedown", sourceId, `下架原因：${reason}（关联内容冻结，溯源记录保留举证）`, operator);
  raiseAlert("RULE_PUBLISH_FAIL", "warning", `来源合规处置：${s.name}（${sourceId}）已被下架，原因：${reason}`, sourceId);
  return { success: true, message: "已下架并冻结，溯源记录保留" };
}

export function restoreSource(sourceId: string, operator = "admin"): { success: boolean; message: string } {
  const list = ensureSeed();
  const s = list.find((x) => x.sourceId === sourceId);
  if (!s) return { success: false, message: "来源不存在" };
  s.status = "active";
  safeSet(KEY, list);
  writeAudit("restore", sourceId, "恢复上架", operator);
  return { success: true, message: "已恢复" };
}

/** 标记争议（收到投诉时先标记，再决定下架/申诉） */
export function disputeSource(sourceId: string, detail: string, operator = "admin"): { success: boolean; message: string } {
  const list = ensureSeed();
  const s = list.find((x) => x.sourceId === sourceId);
  if (!s) return { success: false, message: "来源不存在" };
  s.status = "disputed";
  safeSet(KEY, list);
  writeAudit("dispute", sourceId, `争议详情：${detail}`, operator);
  raiseAlert("COMPLAINT_SURGE", "error", `来源争议：${s.name}（${sourceId}）进入争议处理流程，请核查授权状态`, sourceId);
  return { success: true, message: "已标记争议" };
}

/** 导出第三方资源清单（CSV：来源/许可证/版本/商用权限等，验收第1项） */
export function exportSourcesCsv(): string {
  const rows = [
    ["source_id", "来源名称", "许可证", "版本", "商用权限", "原始地址", "使用范围", "导入时间", "导入人", "状态", "备注"],
    ...listSources().map((s) => [
      s.sourceId,
      s.name,
      LICENSE_LABELS[s.license],
      s.version,
      s.commercialUse ? "允许" : "不允许",
      s.url,
      s.scope,
      s.importedAt.slice(0, 10),
      s.importedBy,
      s.status === "active" ? "在用" : s.status === "suspended" ? "已下架" : "争议中",
      s.note,
    ]),
  ];
  return "\uFEFF" + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

/** 数据完整性自检：无来源孤儿数据/许可证合规/状态合法 */
export function runSourceIntegrityCheck(): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  const list = ensureSeed();
  const seen = new Set<string>();
  for (const s of list) {
    if (!s.sourceId || !s.name || !s.version || !s.scope) issues.push(`${s.sourceId || "(无ID)"}：必填字段缺失`);
    if (seen.has(s.sourceId)) issues.push(`${s.sourceId}：source_id 重复`);
    seen.add(s.sourceId);
    if (!["PublicDomain", "MIT", "CC0", "CC-BY-4.0", "Authorized"].includes(s.license)) {
      issues.push(`${s.sourceId}：许可证不在合规白名单`);
    }
    if (s.license === "Authorized" && s.note.indexOf("授权") < 0) {
      issues.push(`${s.sourceId}：授权类素材缺少授权说明`);
    }
  }
  return { passed: issues.length === 0, issues };
}
