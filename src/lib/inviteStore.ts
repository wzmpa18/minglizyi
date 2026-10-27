"use client";

// ============================================================================
// 邀请分销系统 - v18.6
// 兼容历史邀请记录；仅缓存直接学习来源，不在本机发放奖励
// 本机数据不可作为结算依据，历史积分与关系保留
// ============================================================================

export interface InviteRelation {
  id: string;
  inviterId: string;       // 邀请人的 userId
  inviterName: string;
  inviteeId: string;       // 被邀请人的 userId
  inviteeName: string;
  level: 1 | 2;            // 一级/二级邀请
  createdAt: string;
  rewardClaimed: boolean;
  rewardAmount?: number;   // 奖励积分数（由addInviteRelation自动设置）
  /** P6-TOOL-04 §5.2：奖励被冻结（延迟发奖观察期），解冻后 rewardClaimed 置 true */
  rewardFrozen?: boolean;
  frozenReason?: string;
  /** 归因绑定时间（用于归因优先级与有效期追溯） */
  boundAt?: string;
}

export interface InviteStats {
  totalInvites: number;
  level1Count: number;
  level2Count: number;
  totalRewards: number;
  todayInvites: number;
}


const STORAGE_KEY = 'yandao_invite_relations';
const INVITE_CODE_PREFIX = 'yandao_invite_code_'; // 按用户独立存储
const INVITE_CODE_INDEX = 'yandao_invite_code_index'; // code -> userId 映射表

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ==================== 邀请码管理 ====================

/**
 * 获取用户专属邀请码（按用户独立存储，修复v18.4单键bug）
 */
export function getInviteCode(userId: string): string {
  if (!userId) return '';
  const key = `${INVITE_CODE_PREFIX}${userId}`;
  let code = safeGet<string>(key, '');
  if (!code) {
    code = generateCodeFromUserId(userId);
    safeSet(key, code);
    const index = safeGet<Record<string, string>>(INVITE_CODE_INDEX, {});
    index[code] = userId;
    safeSet(INVITE_CODE_INDEX, index);
  }
  return code;
}

/**
 * 根据邀请码反查 userId
 */
export function getUserIdByInviteCode(code: string): string | null {
  if (!code) return null;
  const index = safeGet<Record<string, string>>(INVITE_CODE_INDEX, {});
  return index[code] || null;
}

/**
 * 从 userId 生成6位邀请码
 */
function generateCodeFromUserId(userId: string): string {
  const digits = userId.replace(/\D/g, '');
  if (digits.length >= 6) return digits.slice(0, 6);
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = digits.padEnd(6, '0');
  if (digits.length < 6) {
    const pad = letters[Math.floor(Math.random() * letters.length)];
    code = digits + pad + String(Math.floor(Math.random() * 10)) + letters[Math.floor(Math.random() * letters.length)];
    code = code.slice(0, 6);
  }
  return code;
}

// ==================== 邀请关系管理 ====================

export function getInviteRelations(): InviteRelation[] {
  return safeGet<InviteRelation[]>(STORAGE_KEY, []);
}

/** Cache a direct learning share attribution; the server owns rewards and cash. */
export function addInviteRelation(relation: InviteRelation): { success: boolean; message: string } {
  if (relation.level !== 1) return {success:false, message:'仅记录本人直接邀请来源'};
  if (!relation.inviterId || !relation.inviteeId || relation.inviterId === relation.inviteeId) return {success:false,message:'邀请来源无效'};
  const relations = getInviteRelations();
  if (relations.some(row => row.inviteeId === relation.inviteeId)) return {success:false,message:'已有邀请来源记录'};
  const seen = new Set<string>(); let cursor = relation.inviterId;
  while (cursor && !seen.has(cursor)) {
    if (cursor === relation.inviteeId) return {success:false,message:'邀请来源不能形成循环'};
    seen.add(cursor); cursor = relations.find(row => row.level === 1 && row.inviteeId === cursor)?.inviterId || '';
  }
  // Local attribution is only a cache. Rewards/earnings require the server;
  // never mint points, infer a second level or overwrite historical records.
  const now = new Date().toISOString();
  relations.push({...relation, createdAt:relation.createdAt || now, boundAt:now, rewardClaimed:false, rewardAmount:0, rewardFrozen:undefined, frozenReason:undefined});
  safeSet(STORAGE_KEY, relations);
  return {success:true,message:'已保存学习邀请来源，不在本机发放奖励'};
}

/**
 * 页面加载时调用：解冻观察期满的冻结奖励（P6-TOOL-04 §5.2 延迟发奖）
 */
export function releaseMaturedFrozenRewards(_userId?: string): number {
  // Historical frozen rows remain readable; clients cannot settle rewards.
  return 0;
}

export function getInviteStats(userId: string): InviteStats {
  const relations = getInviteRelations().filter(r => r.inviterId === userId);
  const today = new Date().toISOString().slice(0, 10);
  return {
    totalInvites: relations.length,
    level1Count: relations.filter(r => r.level === 1).length,
    level2Count: relations.filter(r => r.level === 2).length,
    totalRewards: relations.reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
    todayInvites: relations.filter(r => r.createdAt.startsWith(today)).length,
  };
}

export function getInvitees(userId: string): InviteRelation[] {
  return getInviteRelations()
    .filter(r => r.inviterId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * 手动领取奖励（保留兼容，v18.6默认自动发放）
 */
export function claimReward(relationId: string): { success: boolean; message: string } {
  const relations = getInviteRelations();
  const target = relations.find(r => r.id === relationId);
  if (!target) return { success: false, message: '邀请记录不存在' };
  if (target.rewardClaimed) return { success: false, message: '奖励已发放' };

  const updated = relations.map(r =>
    r.id === relationId ? { ...r, rewardClaimed: true } : r
  );
  safeSet(STORAGE_KEY, updated);

  try {
    const { inviteReward } = require('./pointsStore');
    inviteReward(target.inviteeName);
  } catch (e) {
    console.error('[inviteStore] inviteReward error:', e);
  }

  return { success: true, message: '奖励领取成功，+50积分' };
}
