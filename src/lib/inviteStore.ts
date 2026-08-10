"use client";

// ============================================================================
// 邀请分销系统 - v18.6
// 专属邀请码生成、二级邀请关系绑定、邀请奖励自动发放
// 修复：邀请码按用户独立存储、邀请关系用userId绑定、奖励自动发放
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
}

export interface InviteStats {
  totalInvites: number;
  level1Count: number;
  level2Count: number;
  totalRewards: number;
  todayInvites: number;
}

// 消费返佣记录（二级分销）
export interface ConsumptionRebateRecord {
  id: string;
  type: 'consumption';
  userId: string;          // 返佣接收人（一级邀请人A 或 二级邀请人B）的 userId
  consumerId: string;      // 消费用户的 userId
  consumerName?: string;   // 消费用户昵称（可选，便于展示）
  amount: number;          // 消费金额（元）
  rewardAmount: number;    // 返佣积分（发给接收人）
  level: 1 | 2;            // 1=一级返佣（A），2=二级分成（B）
  createdAt: string;
}

// 消费返佣处理结果
export interface ConsumptionRebateResult {
  success: boolean;
  firstLevelReward: number;   // 一级返佣积分（发给A）
  secondLevelReward: number;  // 二级分成积分（发给B）
}

const STORAGE_KEY = 'yandao_invite_relations';
const INVITE_CODE_PREFIX = 'yandao_invite_code_'; // 按用户独立存储
const INVITE_CODE_INDEX = 'yandao_invite_code_index'; // code -> userId 映射表
const CONSUMPTION_REBATE_KEY = 'yandao_consumption_rebates'; // 消费返佣台账（按接收人 userId 检索）

// 消费返佣比例（v19.7_final 统一标准：全产品一级15%、二级8%）
const REBATE_RATE_LEVEL1 = 0.15; // 一级返佣：消费金额的 15% 换算积分
const REBATE_RATE_LEVEL2 = 0.08; // 二级返佣：消费金额的 8% 换算积分

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

/**
 * 添加邀请关系并自动发放奖励
 */
export function addInviteRelation(relation: InviteRelation): { success: boolean; message: string } {
  const relations = getInviteRelations();

  const existing = relations.find(r => r.inviteeId === relation.inviteeId);
  if (existing) {
    return { success: false, message: '该用户已有邀请人' };
  }

  const rewardAmount = relation.level === 1 ? 50 : 20;
  const newRelation: InviteRelation = {
    ...relation,
    rewardClaimed: true,
    rewardAmount,
  };
  relations.push(newRelation);
  safeSet(STORAGE_KEY, relations);

  try {
    const { inviteReward } = require('./pointsStore');
    inviteReward(relation.inviteeName || '新用户');
  } catch (e) {
    console.error('[inviteStore] auto reward error:', e);
  }

  if (relation.level === 2) {
    try {
      const { earnPoints } = require('./pointsStore');
      earnPoints('invite', `二级邀请奖励：${relation.inviteeName}`);
    } catch (e) {
      console.error('[inviteStore] level2 reward error:', e);
    }
  }

  // === 二级邀请关系自动建立 ===
  // 场景：B 邀请 C 注册（level=1，inviterId=B，inviteeId=C）
  // 检查 B 是否有邀请人 A；若有，自动建立 A→C 的二级邀请关系（level=2）
  // 这样消费返佣链路 C → A(一级) → B(二级) 才能完整成立
  if (relation.level === 1) {
    try {
      const latest = getInviteRelations(); // 已包含上面写入的一级关系
      const uplineRel = latest.find(r => r.inviteeId === relation.inviterId && r.level === 1);
      if (uplineRel && uplineRel.inviterId !== relation.inviteeId) {
        // 避免重复建立二级关系
        const hasLevel2 = latest.some(
          r => r.inviteeId === relation.inviteeId &&
               r.inviterId === uplineRel.inviterId &&
               r.level === 2
        );
        if (!hasLevel2) {
          const level2Relation: InviteRelation = {
            id: `inv_${Date.now()}_l2_${Math.random().toString(36).slice(2, 6)}`,
            inviterId: uplineRel.inviterId,        // A
            inviterName: uplineRel.inviterName || '',
            inviteeId: relation.inviteeId,         // C
            inviteeName: relation.inviteeName,
            level: 2,
            createdAt: new Date().toISOString(),
            rewardClaimed: true,
            rewardAmount: 20,
          };
          latest.push(level2Relation);
          safeSet(STORAGE_KEY, latest);

          // 二级邀请奖励发放（与现有 level=2 发放逻辑保持一致）
          try {
            const { earnPoints } = require('./pointsStore');
            earnPoints('invite', `二级邀请奖励：${relation.inviteeName}`);
          } catch (e) {
            console.error('[inviteStore] auto level2 reward error:', e);
          }
        }
      }
    } catch (e) {
      console.error('[inviteStore] auto level2 relation error:', e);
    }
  }

  return { success: true, message: `邀请关系已绑定，奖励${rewardAmount}积分已发放` };
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

// ==================== 消费返佣（二级分销 30% 分成） ====================

/**
 * 读取全部消费返佣记录
 */
export function getAllConsumptionRebates(): ConsumptionRebateRecord[] {
  return safeGet<ConsumptionRebateRecord[]>(CONSUMPTION_REBATE_KEY, []);
}

/**
 * 获取某用户（接收人）的消费返佣记录，按时间倒序
 */
export function getConsumptionRebates(userId: string): ConsumptionRebateRecord[] {
  if (!userId) return [];
  return getAllConsumptionRebates()
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * 获取某用户的消费返佣汇总
 */
export function getConsumptionRebateStats(userId: string): {
  totalRebate: number;
  level1Rebate: number;
  level2Rebate: number;
  count: number;
} {
  const rebates = getConsumptionRebates(userId);
  return {
    totalRebate: rebates.reduce((sum, r) => sum + r.rewardAmount, 0),
    level1Rebate: rebates.filter(r => r.level === 1).reduce((sum, r) => sum + r.rewardAmount, 0),
    level2Rebate: rebates.filter(r => r.level === 2).reduce((sum, r) => sum + r.rewardAmount, 0),
    count: rebates.length,
  };
}

/**
 * 添加消费返佣记录（写入奖励明细台账）
 * 在 processConsumptionRebate 内部调用
 */
export function addConsumptionRebate(record: ConsumptionRebateRecord): void {
  const rebates = getAllConsumptionRebates();
  rebates.push(record);
  safeSet(CONSUMPTION_REBATE_KEY, rebates);
}

/**
 * 消费返佣主流程：二级分销统一返佣（v19.7_final 统一标准）
 *
 * 链路：消费用户 C → 一级邀请人 A → 二级邀请人 B
 *  - 一级返佣：给 A 发放消费金额 15% 的积分（如消费100元 → 15积分）
 *  - 二级返佣：给 B 发放消费金额 8% 的积分（如消费100元 → 8积分）
 *
 * 说明：返佣积分按接收人 userId 记录在专属台账中（pointsStore 为全局单用户存储，
 * 无法直接给非当前用户发积分），可通过 getRewardDetails / getConsumptionRebateStats 查看。
 *
 * @param userId  消费用户的 userId
 * @param amount  消费金额（元）
 */
export function processConsumptionRebate(
  userId: string,
  amount: number
): ConsumptionRebateResult {
  let firstLevelReward = 0;
  let secondLevelReward = 0;

  if (!userId || amount <= 0) {
    return { success: false, firstLevelReward, secondLevelReward };
  }

  // v19.7_final: 统一返佣比例，全产品一级15%、二级8%，无特殊比例
  const rateLevel1 = REBATE_RATE_LEVEL1;
  const rateLevel2 = REBATE_RATE_LEVEL2;

  const relations = getInviteRelations();

  // a. 查找消费用户的一级邀请人 A
  const level1Rel = relations.find(r => r.inviteeId === userId && r.level === 1);
  if (!level1Rel) {
    // 没有邀请人，无需返佣
    return { success: true, firstLevelReward: 0, secondLevelReward: 0 };
  }
  const inviterA = level1Rel.inviterId;

  // b. 给 A 发放消费返佣积分
  firstLevelReward = Math.round(amount * rateLevel1);
  if (firstLevelReward > 0) {
    addConsumptionRebate({
      id: `reb_${Date.now()}_1_${Math.random().toString(36).slice(2, 8)}`,
      type: 'consumption',
      userId: inviterA,
      consumerId: userId,
      consumerName: level1Rel.inviteeName || '',
      amount,
      rewardAmount: firstLevelReward,
      level: 1,
      createdAt: new Date().toISOString(),
    });
  }

  // c. 查找 A 的邀请人 B（A 的上线，即二级邀请人）
  const level2Rel = relations.find(r => r.inviteeId === inviterA && r.level === 1);
  if (level2Rel) {
    const inviterB = level2Rel.inviterId;
    // d. 给 B 发放二级返佣（v19.7_final: 统一按消费金额8%计算）
    secondLevelReward = Math.round(amount * rateLevel2);
    if (secondLevelReward > 0) {
      addConsumptionRebate({
        id: `reb_${Date.now()}_2_${Math.random().toString(36).slice(2, 8)}`,
        type: 'consumption',
        userId: inviterB,
        consumerId: userId,
        consumerName: level1Rel.inviteeName || '',
        amount,
        rewardAmount: secondLevelReward,
        level: 2,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return { success: true, firstLevelReward, secondLevelReward };
}

/**
 * 获取邀请奖励明细记录
 */
export function getRewardDetails(userId: string): Array<{
  id: string;
  type: 'invite' | 'consumption';
  inviteeName: string;
  level: number;
  rewardAmount: number;
  amount?: number;          // 消费返佣时的消费金额（元）
  description?: string;     // 消费返佣描述
  createdAt: string;
  status: string;
}> {
  // 1. 邀请奖励明细
  const inviteRewards = getInvitees(userId).map(r => ({
    id: r.id,
    type: 'invite' as const,
    inviteeName: r.inviteeName,
    level: r.level,
    rewardAmount: r.rewardAmount || (r.level === 1 ? 50 : 20),
    createdAt: r.createdAt,
    status: r.rewardClaimed ? '已发放' : '待领取',
  }));

  // 2. 消费返佣明细（二级分销）
  const consumptionRewards = getConsumptionRebates(userId).map(r => ({
    id: r.id,
    type: 'consumption' as const,
    inviteeName: r.consumerName || '消费返佣',
    level: r.level,
    rewardAmount: r.rewardAmount,
    amount: r.amount,
    description: r.level === 1 ? '一级消费返佣' : '二级消费分成',
    createdAt: r.createdAt,
    status: '已发放',
  }));

  // 合并并按时间倒序
  return [...inviteRewards, ...consumptionRewards]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
