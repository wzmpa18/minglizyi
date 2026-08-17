"use client";

// ============================================================================
// 反作弊与申诉数据层 - P6-TOOL-04 §5.2
// 覆盖：设备注册风控、邀请频次限制、归因冲突记录、邀请链接有效期、
//       奖励冻结/延迟发奖/撤销、用户申诉与处理、风险事件台账。
// 全部阈值读取 toolConfigStore.growth（LOC 后台可配），禁止硬编码。
// 告警接入 alertService（ABNORMAL_REGISTER / ANTIFRAUD_BLOCK / REWARD_DUPLICATE）。
// ============================================================================

import { getToolConfig } from "./toolConfigStore";

// ==================== 类型定义 ====================

export type RiskLevel = "low" | "medium" | "high";

export interface DeviceProfile {
  fingerprint: string;
  firstSeenAt: string;
  /** 本设备累计注册账号数 */
  registerCount: number;
  lastRegisterAt?: string;
  /** 该设备注册过的账号 userId 列表（用于设备农场识别） */
  registeredUserIds: string[];
  riskLevel: RiskLevel;
  blocked: boolean;
}

export type RiskEventType =
  | "DEVICE_OVER_REGISTER" // 同设备注册数超限（设备农场特征）
  | "DEVICE_RAPID_REGISTER" // 短时间内连续注册
  | "INVITE_RATE_EXCEED" // 单用户日邀请超限（刷奖励特征）
  | "ATTRIBUTION_CONFLICT" // 归因冲突（后到链接试图覆盖已确认绑定）
  | "INVITE_LINK_EXPIRED" // 过期邀请链接尝试绑定
  | "SELF_INVITE" // 自我邀请
  | "REWARD_FROZEN" // 奖励冻结（延迟发奖观察期）
  | "RELATION_REVOKED"; // 异常关系撤销

export interface RiskEvent {
  id: string;
  type: RiskEventType;
  level: "warning" | "error";
  userId?: string; // 触发用户（通常为邀请人）
  inviteeId?: string; // 被邀请人
  deviceId?: string;
  detail: string;
  createdAt: string;
  handled: boolean;
  handledAt?: string;
}

export type FrozenRewardStatus =
  | "frozen" // 冻结观察中
  | "released" // 观察期满/申诉通过，已发放
  | "revoked" // 确认作弊或申诉驳回，已撤销
  | "appealing"; // 用户已提交申诉，待处理

export interface FrozenReward {
  id: string;
  userId: string; // 奖励接收人（邀请人）userId
  relationId: string; // 关联邀请关系 id
  inviteeId: string;
  inviteeName: string;
  level: 1 | 2;
  amount: number; // 应发积分
  reason: RiskEventType;
  reasonText: string;
  frozenAt: string;
  /** 观察期结束时间 = frozenAt + rewardFreezeHours */
  releaseAt: string;
  status: FrozenRewardStatus;
  releasedAt?: string;
}

export interface AppealRecord {
  id: string;
  userId: string; // 申诉人
  targetId: string; // FrozenReward.id 或 RiskEvent.id
  targetType: "reward_freeze" | "risk_event";
  reason: string; // 用户申诉说明
  contact?: string; // 联系方式（可选）
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  processedAt?: string;
  adminNote?: string;
}

// ==================== 存储键 ====================

const DEVICE_KEY = "yandao_anticheat_device";
const DEVICES_KEY = "yandao_anticheat_devices";
const RISKS_KEY = "yandao_anticheat_risks";
const FROZEN_KEY = "yandao_anticheat_frozen";
const APPEALS_KEY = "yandao_anticheat_appeals";
/** 邀请链接首次点击时间（register/friend 落地时写入，用于有效期校验） */
export const INVITE_CLICK_AT_KEY = "yandao_invite_click_at";

const MAX_RISKS = 500;
const MAX_APPEALS = 300;
const MAX_FROZEN = 500;

// ==================== 基础工具 ====================

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeGet<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("[antiCheat] 存储失败:", e);
  }
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** FNV-1a 哈希（设备指纹用） */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** 非侵入式设备指纹：UA + 屏幕 + 时区 + 语言 + 画布渲染特征（不含任何个人身份信息） */
function computeFingerprint(): string {
  if (!isBrowser()) return "server";
  const parts: string[] = [navigator.userAgent, String(screen.width), String(screen.height), String(screen.colorDepth), String(new Date().getTimezoneOffset()), navigator.language];
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.fillStyle = "#7B2FBE";
      ctx.fillRect(10, 5, 80, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("yandao-fp", 4, 8);
      parts.push(canvas.toDataURL().slice(-64));
    }
  } catch {
    /* canvas 不可用时跳过 */
  }
  return fnv1a(parts.join("|"));
}

// ==================== 风险事件 ====================

export function recordRiskEvent(event: Omit<RiskEvent, "id" | "createdAt" | "handled">): RiskEvent {
  const rec: RiskEvent = {
    ...event,
    id: genId("risk"),
    createdAt: new Date().toISOString(),
    handled: false,
  };
  const list = safeGet<RiskEvent[]>(RISKS_KEY, []);
  list.push(rec);
  safeSet(RISKS_KEY, list.slice(-MAX_RISKS));
  // 同步触发后台告警，禁止静默
  try {
    import("./alertService").then(({ raiseAlert }) => {
      const map: Record<RiskEventType, "ABNORMAL_REGISTER" | "ANTIFRAUD_BLOCK" | "INVITE_BIND_ERROR"> = {
        DEVICE_OVER_REGISTER: "ABNORMAL_REGISTER",
        DEVICE_RAPID_REGISTER: "ABNORMAL_REGISTER",
        INVITE_RATE_EXCEED: "ANTIFRAUD_BLOCK",
        ATTRIBUTION_CONFLICT: "INVITE_BIND_ERROR",
        INVITE_LINK_EXPIRED: "INVITE_BIND_ERROR",
        SELF_INVITE: "ANTIFRAUD_BLOCK",
        REWARD_FROZEN: "ANTIFRAUD_BLOCK",
        RELATION_REVOKED: "ANTIFRAUD_BLOCK",
      };
      raiseAlert(map[event.type], event.level === "error" ? "error" : "warning", `[反作弊] ${event.detail}`, event.userId || event.deviceId);
    }).catch(() => {});
  } catch {
    /* ignore */
  }
  return rec;
}

export function listRiskEvents(filter?: { type?: RiskEventType; userId?: string; unhandledOnly?: boolean }): RiskEvent[] {
  let list = safeGet<RiskEvent[]>(RISKS_KEY, []).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (filter?.type) list = list.filter((r) => r.type === filter.type);
  if (filter?.userId) list = list.filter((r) => r.userId === filter.userId);
  if (filter?.unhandledOnly) list = list.filter((r) => !r.handled);
  return list;
}

export function markRiskHandled(id: string): void {
  const list = safeGet<RiskEvent[]>(RISKS_KEY, []);
  const rec = list.find((r) => r.id === id);
  if (rec) {
    rec.handled = true;
    rec.handledAt = new Date().toISOString();
    safeSet(RISKS_KEY, list);
  }
}

// ==================== 设备注册风控 ====================

/** 获取（或初始化）当前设备档案 */
export function getDeviceProfile(): DeviceProfile {
  const existing = safeGet<DeviceProfile | null>(DEVICE_KEY, null);
  if (existing) return existing;
  const profile: DeviceProfile = {
    fingerprint: computeFingerprint(),
    firstSeenAt: new Date().toISOString(),
    registerCount: 0,
    registeredUserIds: [],
    riskLevel: "low",
    blocked: false,
  };
  safeSet(DEVICE_KEY, profile);
  return profile;
}

function saveDeviceProfile(profile: DeviceProfile): void {
  safeSet(DEVICE_KEY, profile);
  const all = safeGet<DeviceProfile[]>(DEVICES_KEY, []);
  const idx = all.findIndex((d) => d.fingerprint === profile.fingerprint);
  if (idx >= 0) all[idx] = profile;
  else all.push(profile);
  safeSet(DEVICES_KEY, all.slice(-100));
}

export interface RegistrationGuardResult {
  allowed: boolean;
  reason?: string;
  riskLevel: RiskLevel;
  deviceId: string;
}

/**
 * 注册前风控检查（在注册流程创建账号前调用）。
 * 依据 growth.maxRegistersPerDevice 判定设备注册数是否超限。
 * 注意：即使超限也允许注册（避免误伤家庭共用设备），但相关邀请奖励将被冻结。
 */
export function checkRegistrationGuard(): RegistrationGuardResult {
  const cfg = getToolConfig().growth;
  const profile = getDeviceProfile();
  let riskLevel: RiskLevel = "low";
  let reason: string | undefined;

  if (profile.registerCount >= cfg.maxRegistersPerDevice) {
    riskLevel = "high";
    reason = `该设备已注册 ${profile.registerCount} 个账号（上限 ${cfg.maxRegistersPerDevice}），本次注册关联奖励将进入冻结观察期`;
  } else if (profile.registerCount >= Math.max(1, cfg.maxRegistersPerDevice - 1)) {
    riskLevel = "medium";
  }

  // 短时连注识别：10 分钟内 ≥2 次注册
  if (profile.lastRegisterAt) {
    const gapMs = Date.now() - new Date(profile.lastRegisterAt).getTime();
    if (gapMs < 10 * 60 * 1000 && profile.registerCount >= 1) {
      riskLevel = "high";
      reason = "短时间内连续注册，疑似批量注册行为，相关奖励将冻结审查";
    }
  }

  return { allowed: true, reason, riskLevel, deviceId: profile.fingerprint };
}

/** 注册成功后登记（写入设备档案并按需记录风险事件） */
export function recordRegistration(userId: string): void {
  const profile = getDeviceProfile();
  profile.registerCount += 1;
  profile.lastRegisterAt = new Date().toISOString();
  if (!profile.registeredUserIds.includes(userId)) {
    profile.registeredUserIds.push(userId);
  }
  const cfg = getToolConfig().growth;
  if (profile.registerCount > cfg.maxRegistersPerDevice) {
    profile.riskLevel = "high";
    recordRiskEvent({
      type: "DEVICE_OVER_REGISTER",
      level: "error",
      userId,
      deviceId: profile.fingerprint,
      detail: `设备 ${profile.fingerprint.slice(0, 8)}… 累计注册 ${profile.registerCount} 个账号，超出上限 ${cfg.maxRegistersPerDevice}（设备农场特征）`,
    });
  } else if (profile.lastRegisterAt) {
    const gapMs = Date.now() - new Date(profile.lastRegisterAt).getTime();
    if (gapMs < 10 * 60 * 1000) {
      profile.riskLevel = "high";
      recordRiskEvent({
        type: "DEVICE_RAPID_REGISTER",
        level: "warning",
        userId,
        deviceId: profile.fingerprint,
        detail: `设备 ${profile.fingerprint.slice(0, 8)}… 10分钟内连续注册第 ${profile.registerCount} 个账号`,
      });
    }
  }
  if (profile.riskLevel === "low" && profile.registerCount >= Math.max(1, cfg.maxRegistersPerDevice - 1)) {
    profile.riskLevel = "medium";
  }
  saveDeviceProfile(profile);
}

// ==================== 邀请频次限制 ====================

/** 校验邀请人当日邀请次数是否超限（超限则返回 false，由调用方冻结奖励） */
export function checkInviteRateLimit(inviterId: string): { allowed: boolean; todayCount: number; limit: number } {
  const cfg = getToolConfig().growth;
  // 今日该邀请人的绑定记录数由 inviteStore 统计（避免跨模块重复存储）
  // 此处通过风险事件台账之外的关系统计实现，见 inviteStore.getInviteStats
  let todayCount = 0;
  try {
    const relations = JSON.parse(localStorage.getItem("yandao_invite_relations") || "[]") as Array<{ inviterId: string; createdAt: string }>;
    const today = new Date().toISOString().slice(0, 10);
    todayCount = relations.filter((r) => r.inviterId === inviterId && r.createdAt.startsWith(today)).length;
  } catch {
    /* ignore */
  }
  return { allowed: todayCount < cfg.maxInvitesPerDay, todayCount, limit: cfg.maxInvitesPerDay };
}

// ==================== 邀请链接有效期 ====================

/** 落地页记录邀请链接首次点击时间（先到先得，不覆盖） */
export function recordInviteLanding(): void {
  if (!isBrowser()) return;
  if (!localStorage.getItem(INVITE_CLICK_AT_KEY)) {
    localStorage.setItem(INVITE_CLICK_AT_KEY, new Date().toISOString());
  }
}

/** 校验邀请链接是否在有效期内（growth.inviteValidDays） */
export function checkInviteLinkValid(): { valid: boolean; clickedAt?: string } {
  const clickedAt = safeGet<string | null>(INVITE_CLICK_AT_KEY, null) || (isBrowser() ? localStorage.getItem(INVITE_CLICK_AT_KEY) : null);
  if (!clickedAt) return { valid: true }; // 无点击记录（如手动输入邀请码）不拦截
  const cfg = getToolConfig().growth;
  const ageMs = Date.now() - new Date(clickedAt).getTime();
  return { valid: ageMs <= cfg.inviteValidDays * 86400 * 1000, clickedAt };
}

/** 绑定完成后清理点击记录，避免影响下一次邀请 */
export function clearInviteLanding(): void {
  if (isBrowser()) localStorage.removeItem(INVITE_CLICK_AT_KEY);
}

// ==================== 奖励冻结 / 释放 / 撤销 ====================

export function freezeReward(input: {
  userId: string;
  relationId: string;
  inviteeId: string;
  inviteeName: string;
  level: 1 | 2;
  amount: number;
  reason: RiskEventType;
  reasonText: string;
}): FrozenReward {
  const cfg = getToolConfig().growth;
  const now = new Date();
  const rec: FrozenReward = {
    id: genId("fz"),
    userId: input.userId,
    relationId: input.relationId,
    inviteeId: input.inviteeId,
    inviteeName: input.inviteeName,
    level: input.level,
    amount: input.amount,
    reason: input.reason,
    reasonText: input.reasonText,
    frozenAt: now.toISOString(),
    releaseAt: new Date(now.getTime() + cfg.rewardFreezeHours * 3600 * 1000).toISOString(),
    status: "frozen",
  };
  const list = safeGet<FrozenReward[]>(FROZEN_KEY, []);
  list.push(rec);
  safeSet(FROZEN_KEY, list.slice(-MAX_FROZEN));
  recordRiskEvent({
    type: "REWARD_FROZEN",
    level: "warning",
    userId: input.userId,
    inviteeId: input.inviteeId,
    detail: `邀请奖励 ${input.amount} 积分已冻结（${input.reasonText}），观察期 ${cfg.rewardFreezeHours} 小时`,
  });
  return rec;
}

export function listFrozenRewards(filter?: { userId?: string; status?: FrozenRewardStatus }): FrozenReward[] {
  let list = safeGet<FrozenReward[]>(FROZEN_KEY, []).sort((a, b) => (a.frozenAt < b.frozenAt ? 1 : -1));
  if (filter?.userId) list = list.filter((r) => r.userId === filter.userId);
  if (filter?.status) list = list.filter((r) => r.status === filter.status);
  return list;
}

/** 发放一笔冻结奖励（观察期满或申诉通过时调用），返回发放的积分数 */
function releaseFrozenReward(rec: FrozenReward): number {
  rec.status = "released";
  rec.releasedAt = new Date().toISOString();
  const list = safeGet<FrozenReward[]>(FROZEN_KEY, []);
  const idx = list.findIndex((r) => r.id === rec.id);
  if (idx >= 0) {
    list[idx] = rec;
    safeSet(FROZEN_KEY, list);
  }
  try {
    const { earnPoints } = require("./pointsStore");
    earnPoints("invite", `冻结奖励解冻发放：邀请 ${rec.inviteeName || rec.inviteeId}`);
  } catch (e) {
    console.error("[antiCheat] 解冻发放失败:", e);
  }
  return rec.amount;
}

/** 扫描并释放观察期满的冻结奖励（页面加载时调用），返回释放笔数 */
export function releaseDueFrozenRewards(userId?: string): number {
  const now = Date.now();
  let released = 0;
  const list = safeGet<FrozenReward[]>(FROZEN_KEY, []);
  for (const rec of list) {
    if (rec.status !== "frozen") continue;
    if (userId && rec.userId !== userId) continue;
    if (new Date(rec.releaseAt).getTime() <= now) {
      releaseFrozenReward(rec);
      // 同步标记邀请关系已发放
      try {
        const relations = JSON.parse(localStorage.getItem("yandao_invite_relations") || "[]") as Array<{ id: string; rewardClaimed: boolean }>;
        const rel = relations.find((r) => r.id === rec.relationId);
        if (rel) {
          rel.rewardClaimed = true;
          localStorage.setItem("yandao_invite_relations", JSON.stringify(relations));
        }
      } catch {
        /* ignore */
      }
      released += 1;
    }
  }
  return released;
}

/** 撤销冻结奖励（确认作弊），返回是否成功 */
export function revokeFrozenReward(id: string, note: string): boolean {
  const list = safeGet<FrozenReward[]>(FROZEN_KEY, []);
  const rec = list.find((r) => r.id === id);
  if (!rec) return false;
  rec.status = "revoked";
  const idx = list.findIndex((r) => r.id === id);
  list[idx] = rec;
  safeSet(FROZEN_KEY, list);
  recordRiskEvent({
    type: "RELATION_REVOKED",
    level: "error",
    userId: rec.userId,
    inviteeId: rec.inviteeId,
    detail: `冻结奖励 ${rec.amount} 积分已撤销：${note}`,
  });
  return true;
}

/** 管理端强制解冻（申诉通过等场景） */
export function forceReleaseFrozenReward(id: string): boolean {
  const list = safeGet<FrozenReward[]>(FROZEN_KEY, []);
  const rec = list.find((r) => r.id === id);
  if (!rec || rec.status === "released" || rec.status === "revoked") return false;
  releaseFrozenReward(rec);
  return true;
}

// ==================== 撤销异常邀请关系 ====================

/** 撤销邀请关系（确认作弊后调用），关系从台账移除并记录风险事件 */
export function revokeInviteRelation(relationId: string, reason: string): boolean {
  try {
    const relations = JSON.parse(localStorage.getItem("yandao_invite_relations") || "[]") as Array<{ id: string; inviterId?: string; inviteeId?: string; inviteeName?: string }>;
    const idx = relations.findIndex((r) => r.id === relationId);
    if (idx < 0) return false;
    const [removed] = relations.splice(idx, 1);
    localStorage.setItem("yandao_invite_relations", JSON.stringify(relations));
    recordRiskEvent({
      type: "RELATION_REVOKED",
      level: "error",
      userId: removed.inviterId,
      inviteeId: removed.inviteeId,
      detail: `已撤销邀请关系 ${relationId}（${removed.inviteeName || removed.inviteeId}）：${reason}`,
    });
    return true;
  } catch {
    return false;
  }
}

// ==================== 用户申诉 ====================

export function submitAppeal(input: { userId: string; targetId: string; targetType: AppealRecord["targetType"]; reason: string; contact?: string }): { success: boolean; message: string } {
  const cfg = getToolConfig().growth;
  if (!cfg.appealEnabled) return { success: false, message: "申诉通道当前未开放" };
  if (!input.reason || input.reason.trim().length < 10) {
    return { success: false, message: "请填写至少10个字的申诉说明" };
  }
  if (input.reason.trim().length > 500) {
    return { success: false, message: "申诉说明不能超过500字" };
  }
  const pending = safeGet<AppealRecord[]>(APPEALS_KEY, []).filter(
    (a) => a.targetId === input.targetId && a.status === "pending"
  );
  if (pending.length > 0) {
    return { success: false, message: "该记录已有申诉在处理中，请耐心等待" };
  }
  const rec: AppealRecord = {
    id: genId("ap"),
    userId: input.userId,
    targetId: input.targetId,
    targetType: input.targetType,
    reason: input.reason.trim(),
    contact: input.contact?.trim() || undefined,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  const list = safeGet<AppealRecord[]>(APPEALS_KEY, []);
  list.push(rec);
  safeSet(APPEALS_KEY, list.slice(-MAX_APPEALS));
  // 冻结奖励进入申诉中状态
  if (input.targetType === "reward_freeze") {
    const frozen = safeGet<FrozenReward[]>(FROZEN_KEY, []);
    const fr = frozen.find((r) => r.id === input.targetId);
    if (fr && fr.status === "frozen") {
      fr.status = "appealing";
      safeSet(FROZEN_KEY, frozen);
    }
  }
  // 站内通知申诉人
  try {
    import("./notificationCenter").then(({ addNotification }) => {
      addNotification({
        category: "audit",
        title: "申诉已提交",
        body: "您的申诉已提交，平台将在1-3个工作日内处理，结果将通过站内消息通知您。",
        linkTo: "/profile/promote",
        idempotentKey: `appeal_submitted_${rec.id}`,
      });
    }).catch(() => {});
  } catch {
    /* ignore */
  }
  return { success: true, message: "申诉已提交，请等待处理结果" };
}

export function listAppeals(filter?: { userId?: string; status?: AppealRecord["status"] }): AppealRecord[] {
  let list = safeGet<AppealRecord[]>(APPEALS_KEY, []).sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  if (filter?.userId) list = list.filter((a) => a.userId === filter.userId);
  if (filter?.status) list = list.filter((a) => a.status === filter.status);
  return list;
}

/** 管理端处理申诉：通过 → 立即解冻奖励；驳回 → 撤销奖励 */
export function processAppeal(id: string, approved: boolean, adminNote: string): { success: boolean; message: string } {
  const list = safeGet<AppealRecord[]>(APPEALS_KEY, []);
  const rec = list.find((a) => a.id === id);
  if (!rec) return { success: false, message: "申诉记录不存在" };
  if (rec.status !== "pending") return { success: false, message: "该申诉已处理" };
  rec.status = approved ? "approved" : "rejected";
  rec.processedAt = new Date().toISOString();
  rec.adminNote = adminNote;
  safeSet(APPEALS_KEY, list);

  let message: string;
  if (rec.targetType === "reward_freeze") {
    if (approved) {
      forceReleaseFrozenReward(rec.targetId);
      message = "申诉通过，冻结奖励已发放";
    } else {
      revokeFrozenReward(rec.targetId, `申诉驳回：${adminNote}`);
      message = "申诉驳回，冻结奖励已撤销";
    }
  } else {
    if (approved) {
      markRiskHandled(rec.targetId);
      message = "申诉通过，风险事件已标记处理";
    } else {
      message = "申诉驳回";
    }
  }

  // 通知申诉人处理结果
  try {
    import("./notificationCenter").then(({ addNotification }) => {
      addNotification({
        category: "audit",
        title: approved ? "申诉处理结果：已通过" : "申诉处理结果：未通过",
        body: `${message}。${adminNote ? `处理意见：${adminNote}` : ""}`,
        linkTo: "/profile/promote",
        idempotentKey: `appeal_result_${rec.id}`,
      });
    }).catch(() => {});
  } catch {
    /* ignore */
  }
  return { success: true, message };
}

// ==================== 管理端统计（供 LOC 后台展示） ====================

export function getAntiCheatStats(): {
  riskTotal: number;
  riskUnhandled: number;
  frozenActive: number;
  frozenReleased: number;
  frozenRevoked: number;
  appealsPending: number;
  deviceRiskHigh: number;
} {
  const risks = safeGet<RiskEvent[]>(RISKS_KEY, []);
  const frozen = safeGet<FrozenReward[]>(FROZEN_KEY, []);
  const appeals = safeGet<AppealRecord[]>(APPEALS_KEY, []);
  const devices = safeGet<DeviceProfile[]>(DEVICES_KEY, []);
  return {
    riskTotal: risks.length,
    riskUnhandled: risks.filter((r) => !r.handled).length,
    frozenActive: frozen.filter((r) => r.status === "frozen" || r.status === "appealing").length,
    frozenReleased: frozen.filter((r) => r.status === "released").length,
    frozenRevoked: frozen.filter((r) => r.status === "revoked").length,
    appealsPending: appeals.filter((a) => a.status === "pending").length,
    deviceRiskHigh: devices.filter((d) => d.riskLevel === "high").length,
  };
}
