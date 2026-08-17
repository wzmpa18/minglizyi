"use client";

// ============================================================================
// 积分激励系统 - v20.4
// 与师父体系100%统一，普通用户与师父账号完全通用
// 积分仅作为活跃奖励，绝对不允许冲击核心付费体系
// 禁止兑换：AI次数、会员时长、B类工具、现金/余额
// ============================================================================

import { getMembershipStatus, SIGNIN_MULTIPLIER } from "./membershipStore";

// ==================== 类型定义 ====================

export type PointsSource =
  | "invite_register"   // 邀请好友注册成功
  | "invite_pay"         // 邀请好友首次付费
  | "invite_review"      // 邀请好友首次发布有效评价
  | "invite_active_7d"   // 邀请好友连续活跃7天
  | "daily_signin"       // 每日登录打卡
  | "daily_group_active" // 每日3群发言
  | "content_featured"   // 内容被加精
  | "deduct_bad_review_2" // 师父收到2星差评
  | "deduct_bad_review_1" // 师父收到1星差评
  | "deduct_malicious"    // 恶意差评/刷分
  | "deduct_violation"    // 违规内容
  | "exchange"            // 兑换消耗
  | "redeem_code"         // 兑换码奖励（P6-TOOL-04-补02 运营发放渠道）
  | "admin_adjust";       // 管理员调整
// v20.5: 已移除 daily_share 积分获取渠道（易造假刷分）

export interface PointsRecord {
  id: string;
  type: "earn" | "spend";
  source: PointsSource;
  amount: number;          // 正数=获取，负数=扣除
  balance: number;         // 操作后余额
  description: string;
  /** 关联用户ID（邀请场景的被邀请人等） */
  relatedUserId?: string;
  createdAt: string;
}

export interface PointsBalance {
  total: number;
  todayEarned: number;
}

// ==================== 积分获取规则 ====================

export interface EarnRule {
  amount: number;
  dailyLimit: number;    // 每日上限（次），Infinity = 无限
  desc: string;
  /** 单人累计上限（邀请场景） */
  perPersonLimit?: number;
}

export const POINTS_RULES: Record<string, EarnRule> = {
  invite_register: { amount: 0.5, dailyLimit: Infinity, desc: "邀请好友注册成功", perPersonLimit: 2 },
  invite_pay: { amount: 0.5, dailyLimit: Infinity, desc: "邀请好友首次付费", perPersonLimit: 2 },
  invite_review: { amount: 0.5, dailyLimit: Infinity, desc: "邀请好友发布有效评价", perPersonLimit: 2 },
  invite_active_7d: { amount: 0.5, dailyLimit: Infinity, desc: "邀请好友连续活跃7天", perPersonLimit: 2 },
  daily_signin: { amount: 0.5, dailyLimit: 1, desc: "每日登录打卡" },
  daily_group_active: { amount: 0.5, dailyLimit: 1, desc: "每日3群发言活跃" },
  content_featured: { amount: 5, dailyLimit: Infinity, desc: "内容被平台加精" },
  // v20.5: daily_share 已移除（易造假刷分，不再作为积分获取渠道）
};

// ==================== 积分扣除规则 ====================

export interface DeductRule {
  minAmount: number;
  maxAmount: number;
  desc: string;
  applyTo: "master_only" | "all_users";
}

export const DEDUCT_RULES: Record<string, DeductRule> = {
  deduct_bad_review_2: { minAmount: 0.5, maxAmount: 0.5, desc: "师父收到2星差评", applyTo: "master_only" },
  deduct_bad_review_1: { minAmount: 1, maxAmount: 1, desc: "师父收到1星差评", applyTo: "master_only" },
  deduct_malicious: { minAmount: 5, maxAmount: 20, desc: "恶意差评/刷分核实", applyTo: "all_users" },
  deduct_violation: { minAmount: 5, maxAmount: 20, desc: "违规内容被处理", applyTo: "all_users" },
};

// ==================== 每日积分上限 ====================

export const DAILY_EARN_CAP = 50;

// ==================== 积分兑换池 ====================

export interface ExchangeItem {
  id: string;
  name: string;
  cost: number;
  category: "decor" | "material" | "exam" | "privilege" | "tool";
  categoryName: string;
  icon: string;
  /** 是否有库存限制 */
  stock: number;
  /** 每人限兑次数 */
  perUserLimit: number;
  description: string;
}

/**
 * 兑换池 - 全部为零边际成本权益
 * 禁止兑换：AI次数、会员时长、B类工具、现金/余额
 */
export const EXCHANGE_ITEMS: ExchangeItem[] = [
  // 装扮类（100~300积分）
  { id: "theme_gold", name: "鎏金主题皮肤", cost: 200, category: "decor", categoryName: "装扮类", icon: "🎨", stock: 999, perUserLimit: 1, description: "全站鎏金色彩主题" },
  { id: "theme_jade", name: "翡翠主题皮肤", cost: 200, category: "decor", categoryName: "装扮类", icon: "💎", stock: 999, perUserLimit: 1, description: "清新翡翠色彩主题" },
  { id: "avatar_frame_gold", name: "专属鎏金头像框", cost: 300, category: "decor", categoryName: "装扮类", icon: "👑", stock: 500, perUserLimit: 1, description: "评论区/个人主页专属展示" },
  { id: "comment_badge", name: "评论区专属标识", cost: 100, category: "decor", categoryName: "装扮类", icon: "🏷️", stock: 999, perUserLimit: 1, description: "专属认证标识" },

  // 资料类（150~300积分）
  { id: "ebook_yijing", name: "易学典籍电子版合集", cost: 300, category: "material", categoryName: "资料类", icon: "📚", stock: 999, perUserLimit: 1, description: "含周易、梅花易数等经典典籍电子书" },
  { id: "tcm_notes", name: "中医注解合集", cost: 250, category: "material", categoryName: "资料类", icon: "📖", stock: 999, perUserLimit: 1, description: "伤寒论、金匮要略等名家注解" },
  { id: "study_docs", name: "学习文档包", cost: 150, category: "material", categoryName: "资料类", icon: "📄", stock: 999, perUserLimit: 1, description: "系统化学习资料整理包" },

  // 题库类（200积分）
  { id: "exam_advanced", name: "模拟考试高级题库解锁包", cost: 200, category: "exam", categoryName: "题库类", icon: "📝", stock: 999, perUserLimit: 1, description: "解锁高级难度模拟考试题库" },
  { id: "exam_special_yixue", name: "易学专项真题集", cost: 200, category: "exam", categoryName: "题库类", icon: "🔖", stock: 999, perUserLimit: 1, description: "易学专项练习真题集" },
  { id: "exam_special_zhongyi", name: "中医专项真题集", cost: 200, category: "exam", categoryName: "题库类", icon: "🔖", stock: 999, perUserLimit: 1, description: "中医专项练习真题集" },

  // 特权类（150~800积分）
  { id: "no_watermark", name: "无水印分享海报", cost: 150, category: "privilege", categoryName: "特权类", icon: "🖼️", stock: 999, perUserLimit: 1, description: "分享海报去除水印" },
  { id: "ranking_boost", name: "排行榜曝光加速", cost: 300, category: "privilege", categoryName: "特权类", icon: "🚀", stock: 100, perUserLimit: 5, description: "同道排行榜曝光提升7天" },
  { id: "early_access", name: "新功能优先体验", cost: 800, category: "privilege", categoryName: "特权类", icon: "✨", stock: 50, perUserLimit: 1, description: "新功能上线前优先体验资格" },

  // 工具类（100积分）
  { id: "hd_chart_export", name: "高清排盘图导出", cost: 100, category: "tool", categoryName: "工具类", icon: "📊", stock: 999, perUserLimit: 1, description: "排盘结果高清导出功能" },
  { id: "custom_signature", name: "自定义排盘落款", cost: 100, category: "tool", categoryName: "工具类", icon: "✍️", stock: 999, perUserLimit: 1, description: "排盘图自定义落款文字" },
];

// ==================== 存储 Key ====================

const STORAGE_KEY = "yandao_points_records";
const BALANCE_KEY = "yandao_points_balance";
const DAILY_KEY = "yandao_points_daily";
const DAILY_SHARE_KEY = "yandao_daily_share_count";
const INVITE_CONTRIB_KEY = "yandao_invite_contributions"; // 邀请人贡献追踪
const EXCHANGE_RECORD_KEY = "yandao_exchange_records";

// ==================== safeGet/safeSet ====================

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

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// ==================== 积分记录管理 ====================

/** 获取所有积分流水记录 */
export function getPointsRecords(): PointsRecord[] {
  return safeGet<PointsRecord[]>(STORAGE_KEY, []);
}

/** 获取积分余额 */
export function getPointsBalance(): PointsBalance {
  const records = getPointsRecords();
  const total = records.reduce((sum, r) => sum + r.amount, 0);
  const today = getToday();
  const todayRecords = records.filter((r) => r.createdAt.startsWith(today));
  const todayEarned = todayRecords
    .filter((r) => r.type === "earn")
    .reduce((sum, r) => sum + r.amount, 0);
  return {
    total: Math.round(total * 10) / 10,
    todayEarned: Math.round(todayEarned * 10) / 10,
  };
}

// ==================== 每日限制管理 ====================

interface DailyCounts {
  date: string;
  counts: Record<string, number>;
  totalEarned: number;
}

function getDailyCounts(): DailyCounts {
  return safeGet<DailyCounts>(DAILY_KEY, { date: "", counts: {}, totalEarned: 0 });
}

function saveDailyCounts(counts: DailyCounts): void {
  safeSet(DAILY_KEY, counts);
}

function incrementDailyCount(source: string, amount: number): void {
  const daily = getDailyCounts();
  if (daily.date !== getToday()) {
    daily.date = getToday();
    daily.counts = {};
    daily.totalEarned = 0;
  }
  daily.counts[source] = (daily.counts[source] || 0) + 1;
  daily.totalEarned = Math.round((daily.totalEarned + amount) * 10) / 10;
  saveDailyCounts(daily);
}

/** 检查今日某来源已达上限 */
function isDailyLimitReached(source: string): boolean {
  const rule = POINTS_RULES[source];
  if (!rule) return false;
  if (rule.dailyLimit === Infinity) return false;
  const daily = getDailyCounts();
  if (daily.date !== getToday()) return false;
  return (daily.counts[source] || 0) >= rule.dailyLimit;
}

/** 检查今日积分总获取已达上限 */
function isDailyCapReached(): boolean {
  const daily = getDailyCounts();
  if (daily.date !== getToday()) return false;
  return daily.totalEarned >= DAILY_EARN_CAP;
}

// ==================== 分享次数管理 ====================

// v20.5: daily_share 积分渠道已移除，分享不再获得积分
// 分享次数仍可追踪（用于运营数据），但不发放积分
function getDailyShareCount(): number {
  const data = safeGet<{ date: string; count: number }>(DAILY_SHARE_KEY, { date: "", count: 0 });
  return data.date === getToday() ? data.count : 0;
}

export function incrementDailyShareCount(): void {
  const count = getDailyShareCount() + 1;
  safeSet(DAILY_SHARE_KEY, { date: getToday(), count });
}

// ==================== 邀请人贡献追踪 ====================

interface InviteContribution {
  inviteeId: string;
  totalContributed: number; // 累计贡献积分
  milestones: {
    registered: boolean;
    paid: boolean;
    reviewed: boolean;
    active7d: boolean;
  };
}

function getInviteContributions(): Record<string, InviteContribution> {
  return safeGet<Record<string, InviteContribution>>(INVITE_CONTRIB_KEY, {});
}

function saveInviteContributions(data: Record<string, InviteContribution>): void {
  safeSet(INVITE_CONTRIB_KEY, data);
}

/** 检查单个被邀请人贡献是否已达上限 */
function isInviteCapReached(inviteeId: string): boolean {
  const contribs = getInviteContributions();
  const contrib = contribs[inviteeId];
  if (!contrib) return false;
  return contrib.totalContributed >= 2;
}

/** 更新邀请人贡献记录 */
function updateInviteContribution(inviteeId: string, amount: number, milestone: keyof InviteContribution["milestones"]): void {
  const contribs = getInviteContributions();
  if (!contribs[inviteeId]) {
    contribs[inviteeId] = {
      inviteeId,
      totalContributed: 0,
      milestones: { registered: false, paid: false, reviewed: false, active7d: false },
    };
  }
  contribs[inviteeId].totalContributed = Math.round((contribs[inviteeId].totalContributed + amount) * 10) / 10;
  contribs[inviteeId].milestones[milestone] = true;
  saveInviteContributions(contribs);
}

// ==================== 核心操作 ====================

/** 写入积分记录 */
function writeRecord(
  type: "earn" | "spend",
  source: PointsSource,
  amount: number,
  description: string,
  relatedUserId?: string
): PointsRecord {
  const records = getPointsRecords();
  const balance = records.reduce((sum, r) => sum + r.amount, 0);
  const record: PointsRecord = {
    id: `pts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    source,
    amount,
    balance: Math.round((balance + amount) * 10) / 10,
    description,
    relatedUserId,
    createdAt: new Date().toISOString(),
  };
  records.push(record);
  safeSet(STORAGE_KEY, records);
  return record;
}

/**
 * 获取积分（通用入口）
 * 自动检查每日上限、每日次数限制、邀请人贡献上限
 */
export function earnPoints(
  source: keyof typeof POINTS_RULES,
  description: string,
  inviteeId?: string
): { success: boolean; amount: number; message: string } {
  const rule = POINTS_RULES[source];
  if (!rule) {
    return { success: false, amount: 0, message: "未知积分来源" };
  }

  // 检查每日次数限制
  if (isDailyLimitReached(source)) {
    return { success: false, amount: 0, message: `今日${rule.desc}已达上限` };
  }

  // 检查每日积分总上限
  if (isDailyCapReached()) {
    return { success: false, amount: 0, message: `今日积分获取已达上限（${DAILY_EARN_CAP}分）` };
  }

  // 邀请场景：检查单人贡献上限
  if (inviteeId && rule.perPersonLimit) {
    if (isInviteCapReached(inviteeId)) {
      return { success: false, amount: 0, message: `该好友贡献积分已达上限（${rule.perPersonLimit}分）` };
    }
  }

  // 签到场景：会员倍率翻倍
  let actualAmount = rule.amount;
  if (source === "daily_signin") {
    const membership = getMembershipStatus();
    const multiplier = SIGNIN_MULTIPLIER[membership.level] || 1;
    actualAmount = Math.round(rule.amount * multiplier * 10) / 10;
  }

  writeRecord("earn", source as PointsSource, actualAmount, description, inviteeId);
  incrementDailyCount(source, actualAmount);

  // 邀请场景：更新贡献记录
  if (inviteeId) {
    const milestoneMap: Record<string, keyof InviteContribution["milestones"]> = {
      invite_register: "registered",
      invite_pay: "paid",
      invite_review: "reviewed",
      invite_active_7d: "active7d",
    };
    const milestone = milestoneMap[source];
    if (milestone) {
      updateInviteContribution(inviteeId, actualAmount, milestone);
    }
  }

  return { success: true, amount: actualAmount, message: `获得${actualAmount}积分（${rule.desc}）` };
}

/**
 * 扣除积分（差评/违规等场景）
 */
export function deductPoints(
  source: keyof typeof DEDUCT_RULES,
  description: string,
  customAmount?: number
): { success: boolean; amount: number; message: string } {
  const rule = DEDUCT_RULES[source];
  if (!rule) {
    return { success: false, amount: 0, message: "未知扣分来源" };
  }

  const amount = -(customAmount || rule.minAmount);
  writeRecord("spend", source as PointsSource, amount, description);

  return {
    success: true,
    amount: Math.abs(amount),
    message: `扣除${Math.abs(amount)}积分（${rule.desc}）`,
  };
}

/**
 * 消耗积分（兑换场景）
 */
export function spendPoints(amount: number, description: string): { success: boolean; message: string } {
  const balance = getPointsBalance().total;
  if (balance < amount) {
    return { success: false, message: "积分不足" };
  }
  writeRecord("spend", "exchange", -amount, description);
  return { success: true, message: `消耗${amount}积分` };
}

/**
 * 运营发放积分（兑换码/后台补偿等渠道，正数入账，不占每日上限）
 */
export function grantPoints(amount: number, description: string): { success: boolean; message: string } {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, message: "积分数额无效" };
  }
  writeRecord("earn", "redeem_code", amount, description);
  return { success: true, message: `获得${amount}积分` };
}

// ==================== 便捷方法 ====================

/** 每日签到 */
export function dailySignin(): { success: boolean; amount: number; message: string } {
  const membership = getMembershipStatus();
  const multiplier = SIGNIN_MULTIPLIER[membership.level] || 1;
  const baseAmount = POINTS_RULES.daily_signin.amount;
  const actualAmount = Math.round(baseAmount * multiplier * 10) / 10;

  const result = earnPoints("daily_signin", "每日登录打卡");
  if (result.success && multiplier > 1) {
    return {
      ...result,
      message: `签到成功+${actualAmount}积分（会员${multiplier}倍奖励）`,
    };
  }
  return result;
}

/** 邀请好友注册成功 */
export function inviteRegisterReward(inviteeId: string): ReturnType<typeof earnPoints> {
  return earnPoints("invite_register", `邀请好友注册成功`, inviteeId);
}

/** 邀请好友首次付费 */
export function invitePayReward(inviteeId: string): ReturnType<typeof earnPoints> {
  return earnPoints("invite_pay", `邀请好友首次付费`, inviteeId);
}

/** 邀请好友发布评价 */
export function inviteReviewReward(inviteeId: string): ReturnType<typeof earnPoints> {
  return earnPoints("invite_review", `邀请好友发布有效评价`, inviteeId);
}

/** 邀请好友连续活跃7天 */
export function inviteActive7dReward(inviteeId: string): ReturnType<typeof earnPoints> {
  return earnPoints("invite_active_7d", `邀请好友连续活跃7天`, inviteeId);
}

/** 每日群活跃奖励 */
export function dailyGroupActiveReward(): ReturnType<typeof earnPoints> {
  return earnPoints("daily_group_active", "每日3群发言活跃");
}

/** 内容被加精 */
export function contentFeaturedReward(): ReturnType<typeof earnPoints> {
  return earnPoints("content_featured", "发布内容被平台加精");
}

/** v20.5: 每日分享不再获得积分（已移除此积分渠道） */
export function dailyShareReward(): { success: boolean; amount: 0; message: string } {
  incrementDailyShareCount();
  return { success: true, amount: 0, message: "分享成功（分享不再获得积分）" };
}

// ==================== 兑换管理 ====================

interface ExchangeRecord {
  itemId: string;
  userId: string;
  cost: number;
  date: string;
}

function getExchangeRecords(): ExchangeRecord[] {
  return safeGet<ExchangeRecord[]>(EXCHANGE_RECORD_KEY, []);
}

/** 获取用户对某商品的已兑换次数 */
export function getUserExchangeCount(itemId: string, userId: string): number {
  const records = getExchangeRecords();
  return records.filter((r) => r.itemId === itemId && r.userId === userId).length;
}

/** 兑换商品 */
export function exchangeItem(
  itemId: string,
  userId: string
): { success: boolean; message: string } {
  const item = EXCHANGE_ITEMS.find((i) => i.id === itemId);
  if (!item) return { success: false, message: "商品不存在" };

  // 检查库存
  if (item.stock <= 0) {
    return { success: false, message: "库存不足" };
  }

  // 检查每人限兑
  const userExchanged = getUserExchangeCount(itemId, userId);
  if (userExchanged >= item.perUserLimit) {
    return { success: false, message: `每人限兑${item.perUserLimit}次` };
  }

  // 扣减积分
  const result = spendPoints(item.cost, `兑换：${item.name}`);
  if (!result.success) return result;

  // 记录兑换
  const records = getExchangeRecords();
  records.push({ itemId, userId, cost: item.cost, date: new Date().toISOString() });
  safeSet(EXCHANGE_RECORD_KEY, records);

  return { success: true, message: `兑换成功：${item.name}` };
}

// ==================== 兼容旧版接口（渐进迁移） ====================

/** @deprecated 使用 dailySignin 代替 */
export function studyCheckin(): ReturnType<typeof earnPoints> {
  return earnPoints("daily_group_active", "学习打卡");
}

/** @deprecated 使用 dailyShareReward 代替 */
export function shareReward(): { success: boolean; amount: number; message: string } {
  return dailyShareReward();
}

/** @deprecated 使用 inviteRegisterReward 代替 */
export function inviteReward(inviteeName: string): ReturnType<typeof earnPoints> {
  return earnPoints("invite_register", `成功邀请 ${inviteeName}`);
}

/** @deprecated 使用 dailyGroupActiveReward 代替 */
export function communityActivity(desc: string): ReturnType<typeof earnPoints> {
  return earnPoints("daily_group_active", desc);
}
