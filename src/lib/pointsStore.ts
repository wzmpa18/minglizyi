"use client";

// ============================================================================
// 积分激励系统 - v18.4
// 获取途径：每日签到、学习打卡、分享邀请、社群活跃、内容共建
// 消耗途径：兑换AI额度、兑换会员时长、兑换专属主题
// ============================================================================

export interface PointsRecord {
  id: string;
  type: 'earn' | 'spend';
  source: 'signin' | 'study' | 'share' | 'invite' | 'community' | 'content' | 'exchange' | 'admin';
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

export interface PointsBalance {
  total: number;
  todayEarned: number;
  todayShareCount: number;
}

const STORAGE_KEY = 'yandao_points_records';
const BALANCE_KEY = 'yandao_points_balance';
const DAILY_KEY = 'yandao_points_daily';
const DAILY_SHARE_KEY = 'yandao_daily_share_count';

// 积分规则
export const POINTS_RULES = {
  signin: { amount: 5, daily: 1, desc: '每日签到' },
  study: { amount: 10, daily: 3, desc: '学习打卡' },
  share: { amount: 15, daily: 3, desc: '分享邀请' },
  invite: { amount: 50, daily: 10, desc: '成功邀请好友' },
  community: { amount: 5, daily: 5, desc: '社群活跃（发帖/评论）' },
  content: { amount: 20, daily: 2, desc: '优质内容被加精' },
} as const;

// 兑换规则
export const EXCHANGE_ITEMS = [
  { id: 'ai_10', name: 'AI对话额度×10次', cost: 50, type: 'ai' },
  { id: 'ai_50', name: 'AI对话额度×50次', cost: 200, type: 'ai' },
  { id: 'vip_7', name: '会员体验7天', cost: 300, type: 'vip' },
  { id: 'vip_30', name: '会员月卡', cost: 1000, type: 'vip' },
  { id: 'theme_gold', name: '鎏金主题', cost: 150, type: 'theme' },
  { id: 'theme_jade', name: '翡翠主题', cost: 150, type: 'theme' },
  { id: 'coupon_10', name: '商城10元优惠券', cost: 100, type: 'coupon' },
] as const;

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

// 获取今日日期
function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// --- 积分记录 ---
export function getPointsRecords(): PointsRecord[] {
  return safeGet<PointsRecord[]>(STORAGE_KEY, []);
}

export function getPointsBalance(): PointsBalance {
  const records = getPointsRecords();
  const total = records.reduce((sum, r) => sum + r.amount, 0);
  const today = getToday();
  const todayRecords = records.filter(r => r.createdAt.startsWith(today));
  const todayEarned = todayRecords.filter(r => r.type === 'earn').reduce((sum, r) => sum + r.amount, 0);
  return { total, todayEarned, todayShareCount: getDailyShareCount() };
}

// --- 每日限制 ---
function getDailyCounts(): Record<string, number> {
  const daily = safeGet<{ date: string; counts: Record<string, number> }>(DAILY_KEY, { date: '', counts: {} });
  if (daily.date !== getToday()) {
    return {};
  }
  return daily.counts;
}

function incrementDailyCount(source: string): void {
  const counts = getDailyCounts();
  counts[source] = (counts[source] || 0) + 1;
  safeSet(DAILY_KEY, { date: getToday(), counts });
}

function getDailyShareCount(): number {
  return safeGet<{ date: string; count: number }>(DAILY_SHARE_KEY, { date: '', count: 0 }).date === getToday()
    ? safeGet<{ date: string; count: number }>(DAILY_SHARE_KEY, { date: '', count: 0 }).count : 0;
}

function incrementDailyShareCount(): void {
  const count = getDailyShareCount() + 1;
  safeSet(DAILY_SHARE_KEY, { date: getToday(), count });
}

// --- 核心操作 ---
export function earnPoints(source: keyof typeof POINTS_RULES, description: string): { success: boolean; amount: number; message: string } {
  const rule = POINTS_RULES[source];
  const dailyCounts = getDailyCounts();
  const todayCount = dailyCounts[source] || 0;

  if (todayCount >= rule.daily) {
    return { success: false, amount: 0, message: `今日${rule.desc}已达上限(${rule.daily}次)` };
  }

  const records = getPointsRecords();
  const balance = records.reduce((sum, r) => sum + r.amount, 0);
  const record: PointsRecord = {
    id: `pts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'earn',
    source,
    amount: rule.amount,
    balance: balance + rule.amount,
    description,
    createdAt: new Date().toISOString(),
  };
  records.push(record);
  safeSet(STORAGE_KEY, records);
  incrementDailyCount(source);

  return { success: true, amount: rule.amount, message: `获得${rule.amount}积分（${rule.desc}）` };
}

export function spendPoints(amount: number, description: string): { success: boolean; message: string } {
  const records = getPointsRecords();
  const balance = records.reduce((sum, r) => sum + r.amount, 0);
  if (balance < amount) {
    return { success: false, message: '积分不足' };
  }
  const record: PointsRecord = {
    id: `pts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'spend',
    source: 'exchange',
    amount: -amount,
    balance: balance - amount,
    description,
    createdAt: new Date().toISOString(),
  };
  records.push(record);
  safeSet(STORAGE_KEY, records);
  return { success: true, message: `消耗${amount}积分` };
}

// --- 每日签到 ---
export function dailySignin(): { success: boolean; amount: number; message: string } {
  const today = getToday();
  const records = getPointsRecords();
  const todaySigned = records.some(r => r.source === 'signin' && r.createdAt.startsWith(today));
  if (todaySigned) {
    return { success: false, amount: 0, message: '今日已签到' };
  }
  
  // 会员积分倍率
  let multiplier = 1;
  try {
    const { getMembershipStatus } = require('./membershipStore');
    const membership = getMembershipStatus();
    if (membership.isActive) {
      if (membership.level === 'monthly') multiplier = 2;
      else if (membership.level === 'yearly') multiplier = 3;
      else if (membership.level === 'lifetime') multiplier = 5;
    }
  } catch {}
  
  const baseResult = earnPoints('signin', '每日签到');
  if (baseResult.success && multiplier > 1) {
    // 额外发放倍率积分
    const bonus = baseResult.amount * (multiplier - 1);
    if (bonus > 0) {
      earnPoints('signin', `会员${multiplier}倍签到奖励`);
    }
    return { 
      success: true, 
      amount: baseResult.amount * multiplier, 
      message: `签到成功+${baseResult.amount * multiplier}积分（会员${multiplier}倍奖励）` 
    };
  }
  return baseResult;
}

// --- 学习打卡 ---
export function studyCheckin(): ReturnType<typeof earnPoints> {
  return earnPoints('study', '学习打卡');
}

// --- 分享奖励 ---
export function shareReward(): { success: boolean; amount: number; message: string } {
  incrementDailyShareCount();
  return earnPoints('share', '分享奖励');
}

// --- 邀请奖励 ---
export function inviteReward(inviteeName: string): ReturnType<typeof earnPoints> {
  return earnPoints('invite', `成功邀请 ${inviteeName}`);
}

// --- 社群活跃 ---
export function communityActivity(desc: string): ReturnType<typeof earnPoints> {
  return earnPoints('community', desc);
}

// --- 兑换 ---
export function exchangeItem(itemId: string): { success: boolean; message: string } {
  const item = EXCHANGE_ITEMS.find(i => i.id === itemId);
  if (!item) return { success: false, message: '商品不存在' };
  const result = spendPoints(item.cost, `兑换：${item.name}`);
  if (!result.success) return result;
  
  // 交付权益
  if (item.type === 'vip') {
    try {
      const { activateMembership } = require('./membershipStore');
      if (itemId === 'vip_7') {
        activateMembership('monthly'); // 7天体验按月卡处理（短期）
      } else if (itemId === 'vip_30') {
        activateMembership('monthly');
      }
    } catch (e) {
      console.error('[pointsStore] activateMembership error:', e);
    }
  }
  // AI额度、主题、优惠券等权益可在此扩展
  
  return { success: true, message: `兑换成功：${item.name}` };
}