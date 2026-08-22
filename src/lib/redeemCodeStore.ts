"use client";

// ============================================================================
// 会员兑换码 Store - v25.0.26（P6-TOOL-04-补02 配套运营发放渠道）
// 架构原则：兑换码仅是「权益发放渠道」，权益核销 100% 复用统一会员引擎
// （membershipStore.activateMembership）与统一积分引擎（pointsStore.grantPoints），
// 不新建平行权益体系；开关/阈值统一在 LOC 后台 toolConfigStore.redeem 配置。
// 幂等：同一用户对同一码仅可兑换一次（redemption 记录 userId+code 唯一）。
// 防爆破：连续失败超过阈值自动告警（复用 alertService）。
// ============================================================================

import { activateMembership, type MemberLevel } from "./membershipStore";
import { grantPoints } from "./pointsStore";
import { getToolConfig } from "./toolConfigStore";
import { getClientUserId } from "./auth";
import { raiseAlert } from "./alertService";

export type RedeemRewardType =
  | "membership" // 会员（monthly/yearly/lifetime）
  | "points"; // 积分

export interface RedeemCode {
  code: string;
  rewardType: RedeemRewardType;
  /** membership: 会员档位；points: 无 */
  level?: MemberLevel;
  /** points: 积分数额；membership: 无 */
  points?: number;
  note: string;
  maxUses: number; // 最大可兑换人次（0=不限）
  usedCount: number;
  expiresAt: string | null; // ISO，null=永久
  status: "active" | "disabled";
  createdAt: string;
  createdBy: string;
}

export interface RedemptionRecord {
  id: string;
  code: string;
  userId: string;
  rewardType: RedeemRewardType;
  rewardDetail: string;
  redeemedAt: string;
}

export interface RedeemAuditEntry {
  id: string;
  action: "generate" | "redeem" | "redeem_fail" | "disable" | "enable";
  code?: string;
  detail: string;
  operator: string;
  createdAt: string;
}

const CODES_KEY = "yandao_redeem_codes";
const RECORDS_KEY = "yandao_redeem_records";
const AUDIT_KEY = "yandao_redeem_audit";
const FAIL_KEY = "yandao_redeem_fail_count";

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

// 去除易混淆字符（0/O、1/I/L）的码表
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomBlock(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

function writeAudit(action: RedeemAuditEntry["action"], detail: string, operator: string, code?: string): void {
  const list = safeGet<RedeemAuditEntry[]>(AUDIT_KEY, []);
  list.push({
    id: `ra_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action,
    code,
    detail,
    operator,
    createdAt: new Date().toISOString(),
  });
  safeSet(AUDIT_KEY, list.slice(-500));
}

export function listCodes(): RedeemCode[] {
  return safeGet<RedeemCode[]>(CODES_KEY, []);
}

export function listRedemptions(): RedemptionRecord[] {
  return safeGet<RedemptionRecord[]>(RECORDS_KEY, []);
}

export function listRedeemAudit(): RedeemAuditEntry[] {
  return safeGet<RedeemAuditEntry[]>(AUDIT_KEY, []).slice().reverse();
}

export function getCodeStats() {
  const codes = listCodes();
  const records = listRedemptions();
  return {
    total: codes.length,
    active: codes.filter((c) => c.status === "active").length,
    redeemed: records.length,
  };
}

/** 批量生成兑换码（LOC 后台专用） */
export function generateCodes(params: {
  count: number;
  rewardType: RedeemRewardType;
  level?: MemberLevel;
  points?: number;
  maxUses: number;
  validDays: number; // 0=永久
  note: string;
  createdBy?: string;
}): { success: boolean; message: string; codes: string[] } {
  const count = Math.floor(params.count);
  if (!Number.isFinite(count) || count < 1 || count > 500) {
    return { success: false, message: "单批生成数量需在 1-500 之间", codes: [] };
  }
  if (params.rewardType === "membership" && !params.level) {
    return { success: false, message: "会员兑换码需选择会员档位", codes: [] };
  }
  if (params.rewardType === "points" && (!params.points || params.points < 1 || params.points > 100000)) {
    return { success: false, message: "积分数额需在 1-100000 之间", codes: [] };
  }
  const codes = listCodes();
  const existing = new Set(codes.map((c) => c.code));
  const fresh: string[] = [];
  const expiresAt = params.validDays > 0
    ? new Date(Date.now() + params.validDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  let guard = 0;
  while (fresh.length < count && guard < count * 20) {
    guard++;
    const code = `YD-${randomBlock(4)}-${randomBlock(4)}`;
    if (existing.has(code)) continue;
    existing.add(code);
    fresh.push(code);
    codes.push({
      code,
      rewardType: params.rewardType,
      level: params.rewardType === "membership" ? params.level : undefined,
      points: params.rewardType === "points" ? Math.floor(params.points!) : undefined,
      note: params.note.slice(0, 100),
      maxUses: Math.max(0, Math.floor(params.maxUses)),
      usedCount: 0,
      expiresAt,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy || "admin",
    });
  }
  safeSet(CODES_KEY, codes);
  writeAudit(
    "generate",
    `批量生成 ${fresh.length} 个兑换码（${params.rewardType === "membership" ? `会员-${params.level}` : `积分-${params.points}`}，每人限兑/码：${params.maxUses || "不限"}，有效期：${params.validDays > 0 ? params.validDays + "天" : "永久"}）`,
    params.createdBy || "admin"
  );
  return { success: true, message: `已生成 ${fresh.length} 个兑换码`, codes: fresh };
}

/** 停用/启用兑换码（LOC 后台专用） */
export function setCodeStatus(code: string, status: "active" | "disabled", operator = "admin"): { success: boolean; message: string } {
  const codes = listCodes();
  const c = codes.find((x) => x.code === code);
  if (!c) return { success: false, message: "兑换码不存在" };
  c.status = status;
  safeSet(CODES_KEY, codes);
  writeAudit(status === "disabled" ? "disable" : "enable", `兑换码 ${code} 已${status === "disabled" ? "停用" : "启用"}`, operator, code);
  return { success: true, message: status === "disabled" ? "已停用" : "已启用" };
}

export interface RedeemResult {
  success: boolean;
  message: string;
  rewardDetail?: string;
}

/** 用户兑换（幂等：同用户同码仅一次；核销复用统一会员/积分引擎） */
export function redeemCode(rawCode: string): RedeemResult {
  const cfg = getToolConfig().redeem;
  if (!cfg.enabled) {
    return { success: false, message: "兑换功能暂未开放" };
  }
  const code = rawCode.trim().toUpperCase();
  if (!/^YD-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/.test(code)) {
    return { success: false, message: "兑换码格式不正确" };
  }
  const userId = getClientUserId();
  if (!userId) {
    return { success: false, message: "请先登录后再兑换" };
  }

  // 防爆破：失败计数超阈值即告警并临时拦截
  const fails = safeGet<{ count: number; date: string }>(FAIL_KEY, { count: 0, date: "" });
  const today = new Date().toISOString().slice(0, 10);
  const todayFails = fails.date === today ? fails.count : 0;
  if (todayFails >= cfg.maxFailAttempts) {
    return { success: false, message: "今日失败次数过多，兑换已暂时锁定，请明日再试或联系客服" };
  }

  const codes = listCodes();
  const c = codes.find((x) => x.code === code);

  const recordFail = (msg: string): RedeemResult => {
    safeSet(FAIL_KEY, { count: todayFails + 1, date: today });
    writeAudit("redeem_fail", `用户 ${userId} 兑换 ${code} 失败：${msg}`, userId, code);
    if (todayFails + 1 >= cfg.maxFailAttempts) {
      raiseAlert("ANTIFRAUD_BLOCK", "warning", `兑换码防爆破：用户 ${userId} 当日连续失败 ${todayFails + 1} 次，已临时锁定兑换`, code);
    }
    return { success: false, message: msg };
  };

  if (!c) return recordFail("兑换码不存在");
  if (c.status === "disabled") return recordFail("兑换码已被停用");
  if (c.expiresAt && Date.now() >= new Date(c.expiresAt).getTime()) return recordFail("兑换码已过期");
  if (c.maxUses > 0 && c.usedCount >= c.maxUses) return recordFail("兑换码兑换名额已用完");

  const records = listRedemptions();
  if (records.some((r) => r.code === code && r.userId === userId)) {
    return { success: false, message: "您已兑换过该兑换码，请勿重复兑换" };
  }
  if (cfg.maxRedeemPerUser > 0) {
    const mine = records.filter((r) => r.userId === userId).length;
    if (mine >= cfg.maxRedeemPerUser) {
      return { success: false, message: `每位用户最多兑换 ${cfg.maxRedeemPerUser} 次` };
    }
  }

  // 核销：复用统一引擎
  let rewardDetail = "";
  if (c.rewardType === "membership" && c.level) {
    activateMembership(c.level);
    const levelName: Record<MemberLevel, string> = {
      basic: "普通会员",
      monthly: "月度会员（30天）",
      quarterly: "季度会员（90天）",
      yearly: "年度会员（365天）",
      lifetime: "终身会员",
    };
    rewardDetail = levelName[c.level];
  } else if (c.rewardType === "points" && c.points) {
    const res = grantPoints(c.points, `兑换码 ${code} 奖励`);
    if (!res.success) return recordFail("积分发放失败，请稍后重试");
    rewardDetail = `${c.points} 积分`;
  } else {
    return recordFail("兑换码权益配置异常");
  }

  c.usedCount += 1;
  safeSet(CODES_KEY, codes);
  records.push({
    id: `rr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    code,
    userId,
    rewardType: c.rewardType,
    rewardDetail,
    redeemedAt: new Date().toISOString(),
  });
  safeSet(RECORDS_KEY, records);
  writeAudit("redeem", `用户 ${userId} 兑换 ${code} 成功：${rewardDetail}`, userId, code);
  return { success: true, message: `兑换成功：${rewardDetail}`, rewardDetail };
}

/** 我的兑换记录（当前用户） */
export function getMyRedemptions(): RedemptionRecord[] {
  const userId = getClientUserId();
  if (!userId) return [];
  return listRedemptions().filter((r) => r.userId === userId).reverse();
}

/** 导出兑换码清单（CSV，LOC 后台审计用） */
export function exportCodesCsv(): string {
  const rows = [
    ["兑换码", "权益类型", "权益内容", "备注", "最大次数", "已兑换", "有效期", "状态", "创建时间", "创建人"],
    ...listCodes().map((c) => [
      c.code,
      c.rewardType === "membership" ? "会员" : "积分",
      c.rewardType === "membership" ? c.level || "" : String(c.points || ""),
      c.note,
      String(c.maxUses || "不限"),
      String(c.usedCount),
      c.expiresAt ? c.expiresAt.slice(0, 10) : "永久",
      c.status === "active" ? "启用" : "停用",
      c.createdAt.slice(0, 19).replace("T", " "),
      c.createdBy,
    ]),
  ];
  return "\uFEFF" + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\r\n");
}
