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
 * P6-TOOL-04 §5.2 反作弊加固：
 *  - 归因冲突：已有确认绑定（first 优先级）时拒绝后到链接，记录冲突事件
 *  - 自我邀请拦截
 *  - 邀请链接有效期校验（growth.inviteValidDays，按首次落地时间）
 *  - 邀请人当日频次校验（growth.maxInvitesPerDay，超限奖励冻结）
 *  - 被邀请人设备风险（growth.maxRegistersPerDevice，超限奖励冻结）
 */
export function addInviteRelation(relation: InviteRelation): { success: boolean; message: string } {
  const relations = getInviteRelations();

  // === 1. 归因冲突：已确认绑定不可被后到链接覆盖（attributionPriority 强制 first） ===
  const existing = relations.find(r => r.inviteeId === relation.inviteeId);
  if (existing) {
    try {
      const { recordRiskEvent } = require('./antiCheatStore');
      recordRiskEvent({
        type: 'ATTRIBUTION_CONFLICT',
        level: 'warning',
        userId: relation.inviterId,
        inviteeId: relation.inviteeId,
        detail: `归因冲突：用户 ${relation.inviteeId} 已于 ${existing.createdAt} 绑定邀请人 ${existing.inviterId}，后到链接（邀请人 ${relation.inviterId}）已按规则拒绝`,
      });
    } catch (e) {
      console.error('[inviteStore] conflict record error:', e);
    }
    return { success: false, message: '该用户已有邀请人，邀请关系不可重复绑定' };
  }

  // === 2. 自我邀请拦截 ===
  if (relation.inviterId === relation.inviteeId) {
    try {
      const { recordRiskEvent } = require('./antiCheatStore');
      recordRiskEvent({
        type: 'SELF_INVITE',
        level: 'error',
        userId: relation.inviterId,
        inviteeId: relation.inviteeId,
        detail: `自我邀请拦截：用户 ${relation.inviterId} 尝试绑定自己的邀请码`,
      });
    } catch { /* ignore */ }
    return { success: false, message: '不能使用自己的邀请码' };
  }

  // === 3. 邀请链接有效期校验 ===
  let linkExpired = false;
  try {
    const antiCheat = require('./antiCheatStore');
    const linkCheck = antiCheat.checkInviteLinkValid();
    if (!linkCheck.valid) {
      linkExpired = true;
      antiCheat.recordRiskEvent({
        type: 'INVITE_LINK_EXPIRED',
        level: 'warning',
        userId: relation.inviterId,
        inviteeId: relation.inviteeId,
        detail: `邀请链接已过期（首次落地 ${linkCheck.clickedAt}），绑定被拒绝`,
      });
      antiCheat.clearInviteLanding();
    }
  } catch { /* ignore */ }
  if (linkExpired) {
    return { success: false, message: '邀请链接已过期，无法绑定邀请关系' };
  }

  // === 4. 邀请人当日频次 & 被邀请人设备风险（命中则奖励冻结，延迟发奖） ===
  let freezeRewardFlag = false;
  let freezeReasonText = '';
  let freezeReasonType: 'INVITE_RATE_EXCEED' | 'DEVICE_OVER_REGISTER' = 'INVITE_RATE_EXCEED';
  try {
    const antiCheat = require('./antiCheatStore');
    const rate = antiCheat.checkInviteRateLimit(relation.inviterId);
    if (!rate.allowed) {
      freezeRewardFlag = true;
      freezeReasonType = 'INVITE_RATE_EXCEED';
      freezeReasonText = `邀请人当日邀请 ${rate.todayCount} 次已达上限 ${rate.limit}`;
      antiCheat.recordRiskEvent({
        type: 'INVITE_RATE_EXCEED',
        level: 'warning',
        userId: relation.inviterId,
        inviteeId: relation.inviteeId,
        detail: `用户 ${relation.inviterId} 当日邀请次数达上限 ${rate.limit}（疑似刷奖励），本次奖励冻结`,
      });
    } else {
      const guard = antiCheat.checkRegistrationGuard();
      if (guard.riskLevel === 'high' && guard.reason) {
        freezeRewardFlag = true;
        freezeReasonType = 'DEVICE_OVER_REGISTER';
        freezeReasonText = guard.reason;
      }
    }
  } catch (e) {
    console.error('[inviteStore] anti-cheat check error:', e);
  }

  const rewardAmount = relation.level === 1 ? 50 : 20;
  const nowIso = new Date().toISOString();
  const newRelation: InviteRelation = {
    ...relation,
    createdAt: relation.createdAt || nowIso,
    boundAt: nowIso,
    rewardClaimed: !freezeRewardFlag,
    rewardAmount,
    rewardFrozen: freezeRewardFlag || undefined,
    frozenReason: freezeRewardFlag ? freezeReasonText : undefined,
  };
  relations.push(newRelation);
  safeSet(STORAGE_KEY, relations);

  if (freezeRewardFlag) {
    // 冻结路径：写入冻结台账，观察期满自动解冻发放
    try {
      const antiCheat = require('./antiCheatStore');
      antiCheat.freezeReward({
        userId: relation.inviterId,
        relationId: newRelation.id,
        inviteeId: relation.inviteeId,
        inviteeName: relation.inviteeName || '新用户',
        level: relation.level,
        amount: rewardAmount,
        reason: freezeReasonType,
        reasonText: freezeReasonText,
      });
      antiCheat.clearInviteLanding();
    } catch (e) {
      console.error('[inviteStore] freeze reward error:', e);
    }
    return { success: true, message: `邀请关系已绑定，奖励${rewardAmount}积分进入冻结观察期` };
  }

  try {
    const { inviteReward } = require('./pointsStore');
    inviteReward(relation.inviteeName || '新用户');
  } catch (e) {
    console.error('[inviteStore] auto reward error:', e);
  }
  try {
    const antiCheat = require('./antiCheatStore');
    antiCheat.clearInviteLanding();
  } catch { /* ignore */ }

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
          const l2Frozen = !!newRelation.rewardFrozen;
          const level2Relation: InviteRelation = {
            id: `inv_${Date.now()}_l2_${Math.random().toString(36).slice(2, 6)}`,
            inviterId: uplineRel.inviterId,        // A
            inviterName: uplineRel.inviterName || '',
            inviteeId: relation.inviteeId,         // C
            inviteeName: relation.inviteeName,
            level: 2,
            createdAt: new Date().toISOString(),
            boundAt: new Date().toISOString(),
            rewardClaimed: !l2Frozen,
            rewardAmount: 20,
            rewardFrozen: l2Frozen || undefined,
            frozenReason: l2Frozen ? newRelation.frozenReason : undefined,
          };
          latest.push(level2Relation);
          safeSet(STORAGE_KEY, latest);

          if (l2Frozen) {
            // 一级被冻结时二级分成同步冻结，观察期满一并解冻
            try {
              const antiCheat = require('./antiCheatStore');
              antiCheat.freezeReward({
                userId: uplineRel.inviterId,
                relationId: level2Relation.id,
                inviteeId: relation.inviteeId,
                inviteeName: relation.inviteeName || '新用户',
                level: 2,
                amount: 20,
                reason: 'INVITE_RATE_EXCEED',
                reasonText: `随一级奖励同步冻结：${newRelation.frozenReason || ''}`,
              });
            } catch { /* ignore */ }
          } else {
            // 二级邀请奖励发放（与现有 level=2 发放逻辑保持一致）
            try {
              const { earnPoints } = require('./pointsStore');
              earnPoints('invite', `二级邀请奖励：${relation.inviteeName}`);
            } catch (e) {
              console.error('[inviteStore] auto level2 reward error:', e);
            }
          }
        }
      }
    } catch (e) {
      console.error('[inviteStore] auto level2 relation error:', e);
    }
  }

  return { success: true, message: `邀请关系已绑定，奖励${rewardAmount}积分已发放` };
}

/**
 * 页面加载时调用：解冻观察期满的冻结奖励（P6-TOOL-04 §5.2 延迟发奖）
 */
export function releaseMaturedFrozenRewards(userId?: string): number {
  try {
    const antiCheat = require('./antiCheatStore');
    return antiCheat.releaseDueFrozenRewards(userId);
  } catch {
    return 0;
  }
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
    status: r.rewardFrozen ? '冻结观察中' : (r.rewardClaimed ? '已发放' : '待领取'),
    description: r.frozenReason,
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
