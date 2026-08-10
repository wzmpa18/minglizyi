"use client";

// ============================================================================
// v20.2 双轨制服务层 - 星级与积分完全独立体系
//
// 核心原则：
// - 星级（★）：师父的用户交流口碑评价，1.0~5.0，保留1位小数
// - 积分（分）：全用户的平台活跃贡献度，永久有效，不设上限
// - 两套体系计算逻辑、适用范围、用途完全拆分，禁止混为一谈
//
// 合规定位：传统文化学术交流与学习分享平台
// ============================================================================

import { getUserProfile } from "./auth";

// ==================== 一、星级体系 ====================

/** 星级评价维度（三维度） */
export interface StarRatingDimensions {
  communication: number; // 交流体验 1-5
  responsiveness: number; // 响应效率 1-5
  attitude: number; // 沟通态度 1-5
}

/** 星级评价记录 */
export interface StarRatingRecord {
  id: string;
  masterUserId: string;
  raterUserId: string;
  raterNickname: string;
  rating: StarRatingDimensions;
  avgRating: number; // 三维度算术平均，保留1位小数
  comment: string;
  isAnonymous: boolean;
  isValid: boolean; // 无效评价标记
  invalidReason?: string; // 无效原因
  hasStars: boolean; // 是否有星级打分（无星级纯文字评价为false）
  createdAt: string;
}

/** 师父星级信息 */
export interface MasterStarInfo {
  masterUserId: string;
  starRating: number; // 最终星级 1.0-5.0
  totalRatings: number; // 有效评价总数
  dimensionsAvg: {
    communication: number;
    responsiveness: number;
    attitude: number;
  };
  isNewProtected: boolean; // 是否在新入驻保护期（<5条评价）
  recentRatings: StarRatingRecord[];
}

/** 星级说明弹窗合规文案（强制使用此版本） */
export const STAR_RATING_EXPLANATION = {
  title: "星级说明",
  body: `星级仅为用户间传统文化学习交流的主观体验评价，满分 5.0 星，保留 1 位小数。

评价围绕交流体验、响应效率、沟通态度三个维度，由用户自主打分后取平均值生成。

经平台核实的刷分、恶意评价、违规内容会被剔除，不计入统计。`,
  importantTitle: "重要提示",
  importantBody: `本平台为传统文化学术交流与学习分享平台，所有用户间的交流均为个人学习探讨，不代表任何医疗、命理、法律、财务等专业资质与执业能力。

星级仅反映用户主观交流感受，平台不对评价真实性、交流内容准确性做任何担保与背书。

所有交流内容仅供传统文化学习参考，不构成任何人生决策、健康判断、投资选择的建议，请理性看待，自行甄别。

严禁利用平台从事任何违法违规活动，违者将依据平台规则严肃处理并保留追究法律责任的权利。`,
};

/** 新入驻保护阈值 */
export const NEW_MASTER_PROTECTION_THRESHOLD = 5;

// ==================== 二、积分体系 ====================

/** 积分记录类型 */
export type PointsActionType =
  | "invite_register" // 邀请好友注册成功
  | "invite_paid" // 邀请好友首次付费≥1元
  | "invite_review" // 邀请好友首次发布≥50字有效评价
  | "invite_active_7d" // 邀请好友连续活跃7天
  | "daily_login" // 每日登录打卡
  | "daily_group_active" // 每日3个不同群各发言≥5条
  | "content_featured" // 发布内容被平台加精
  | "bad_review_2star" // 收到2星差评（仅师父）
  | "bad_review_1star" // 收到1星差评（仅师父）
  | "malicious_bad_review" // 无星级恶意差评（核实有效）
  | "violation_minor" // 轻微违规
  | "violation_general" // 一般违规
  | "violation_severe" // 严重违规
  | "violation_fraud" // 恶意刷分、刷评价、批量注册
  | "admin_adjust"; // 管理员调整

/** 积分记录 */
export interface PointsTransaction {
  id: string;
  userId: string;
  amount: number; // 正为获取，负为扣除
  action: PointsActionType;
  reason: string;
  relatedId?: string; // 关联ID（如被邀请用户ID、评价ID等）
  balanceAfter: number;
  createdAt: string;
}

/** 积分获取规则 */
export const POINTS_EARN_RULES: Array<{
  action: PointsActionType;
  amount: number;
  desc: string;
  dailyLimit?: number;
  perInviteeLimit?: number;
  note: string;
}> = [
  {
    action: "invite_register",
    amount: 0.5,
    desc: "邀请好友注册成功",
    perInviteeLimit: 2,
    note: "同一位被邀请人最多为邀请人贡献2分",
  },
  {
    action: "invite_paid",
    amount: 0.5,
    desc: "邀请好友首次付费≥1元",
    perInviteeLimit: 2,
    note: "同上，单人累计不超2分上限",
  },
  {
    action: "invite_review",
    amount: 0.5,
    desc: "邀请好友首次发布≥50字有效评价",
    perInviteeLimit: 2,
    note: "同上",
  },
  {
    action: "invite_active_7d",
    amount: 0.5,
    desc: "邀请好友连续活跃7天",
    perInviteeLimit: 2,
    note: "同上，单人4项合计最高2分",
  },
  {
    action: "daily_login",
    amount: 0.5,
    desc: "每日登录打卡",
    dailyLimit: 1,
    note: "每日仅计1次",
  },
  {
    action: "daily_group_active",
    amount: 0.5,
    desc: "每日在3个不同群各发言≥5条",
    dailyLimit: 1,
    note: "每日仅计1次，灌水、违规无效发言不计入",
  },
  {
    action: "content_featured",
    amount: 5,
    desc: "发布内容被平台加精",
    note: "优质内容官方推荐",
  },
];

/** 积分扣除规则 */
export const POINTS_DEDUCT_RULES: Array<{
  action: PointsActionType;
  amount: number;
  amountRange?: [number, number];
  desc: string;
  scope: "master" | "all";
  note: string;
}> = [
  {
    action: "bad_review_2star",
    amount: -0.5,
    desc: "收到用户2星差评",
    scope: "master",
    note: "仅师父账号扣除",
  },
  {
    action: "bad_review_1star",
    amount: -1,
    desc: "收到用户1星差评",
    scope: "master",
    note: "仅师父账号扣除",
  },
  {
    action: "malicious_bad_review",
    amount: -5,
    amountRange: [-20, -5],
    desc: "无星级恶意差评（核实有效）",
    scope: "master",
    note: "按内容恶劣程度梯度扣分，同时折算对应星级计入平均分",
  },
  {
    action: "violation_minor",
    amount: -5,
    desc: "轻微违规（广告、灌水、首次违规）",
    scope: "all",
    note: "全用户适用，同步删除内容",
  },
  {
    action: "violation_general",
    amount: -7,
    amountRange: [-10, -5],
    desc: "一般违规（人身攻击、低俗、造谣）",
    scope: "all",
    note: "全用户适用，同步禁言3-7天",
  },
  {
    action: "violation_severe",
    amount: -15,
    amountRange: [-20, -10],
    desc: "严重违规（违法内容、恶意引战）",
    scope: "all",
    note: "全用户适用，同步禁言7-30天",
  },
  {
    action: "violation_fraud",
    amount: -20,
    desc: "恶意刷分、刷评价、批量注册",
    scope: "all",
    note: "-20分起+清零违规所得，情节严重永久封号",
  },
];

/** 积分等级配置（对应头像框、专属标识、功能权限） */
export const POINTS_LEVELS = [
  { level: 1, title: "初识同好", minPoints: 0, icon: "🌱", color: "#95a5a6" },
  { level: 2, title: "渐入门径", minPoints: 10, icon: "📖", color: "#3498db" },
  { level: 3, title: "勤学不辍", minPoints: 30, icon: "✏️", color: "#2ecc71" },
  { level: 4, title: "小有所成", minPoints: 60, icon: "📝", color: "#e67e22" },
  { level: 5, title: "博学多闻", minPoints: 100, icon: "📚", color: "#9b59b6" },
  { level: 6, title: "学富五车", minPoints: 200, icon: "🎓", color: "#1abc9c" },
  { level: 7, title: "融会贯通", minPoints: 500, icon: "🏆", color: "#f39c12" },
  { level: 8, title: "登堂入室", minPoints: 1000, icon: "👑", color: "#e74c3c" },
  { level: 9, title: "泰斗之姿", minPoints: 2000, icon: "⭐", color: "#8e44ad" },
  { level: 10, title: "国学宗师", minPoints: 5000, icon: "🌟", color: "#FFD700" },
];

/** 积分说明弹窗文案 */
export const POINTS_EXPLANATION = {
  title: "积分规则说明",
  body: `积分是平台对用户活跃贡献的奖励，所有注册用户均可获取，永久有效、不设上限。

可通过邀请好友、每日打卡、群内互动、发布优质内容等方式获取。

收到差评、发布违规内容会扣除对应积分，情节严重追加账号处罚。

积分可用于排行榜排序、解锁等级权益、兑换平台福利。`,
};

/** 邀请人单人贡献上限 */
export const PER_INVITEE_POINTS_LIMIT = 2;

// ==================== 三、申诉与大众评委系统 ====================

/** 申诉状态 */
export type AppealStatus = "pending" | "voting" | "resolved";

/** 申诉类型 */
export type AppealType = "rating" | "points_deduction";

/** 申诉记录 */
export interface AppealRecord {
  id: string;
  appellantUserId: string; // 申诉发起人
  appellantNickname: string;
  type: AppealType;
  targetId: string; // 评价ID或扣分记录ID
  reason: string; // 申诉理由
  evidenceImages: string[]; // 举证图片URL列表
  status: AppealStatus;
  createdAt: string;
  // 评委信息
  juryUserIds: string[];
  votesForAppeal: number; // 支持申诉票数
  votesAgainstAppeal: number; // 反对申诉票数
  totalVotes: number;
  result: "upheld" | "rejected" | null; // upheld=支持申诉（撤销处罚），rejected=维持原处罚
  resolvedAt?: string;
}

/** 大众评委信息 */
export interface JuryMember {
  userId: string;
  nickname: string;
  avatar: string;
  level: number;
  voted: boolean;
  vote?: boolean; // true=支持申诉，false=反对
  votedAt?: string;
}

/** 评委准入条件 */
export const JURY_QUALIFICATIONS = {
  activeDays: 30, // 近30天活跃
  noViolations: true, // 无违规记录
  minLevel: 3, // 等级≥3级
  noConflictOfInterest: true, // 与申诉双方无利益关联
  totalJuryCount: 9, // 评委团人数
  majorityVotes: 5, // 多数票阈值（≥5票）
};

/** 申诉有效期限（天） */
export const APPEAL_DEADLINE_DAYS = 7;

/** 同一评价/处罚仅可申诉次数 */
export const APPEAL_MAX_TIMES = 1;

// ==================== 四、合规文案 ====================

/** 师父个人主页合规提示 */
export const MASTER_PROFILE_COMPLIANCE_TIP =
  "本平台为传统文化学习交流平台，所有交流仅供学术探讨参考，不构成任何专业建议。";

/** 评价提交页合规提示 */
export const RATING_SUBMIT_COMPLIANCE_TIP =
  "评价仅代表个人学习交流体验，请客观理性评价；平台严禁发布违法违规、人身攻击、封建迷信类内容。";

/** 同道排行榜合规提示 */
export const RANKING_COMPLIANCE_TIP =
  "排名结合交流星级、积分综合排序，仅供学习交流参考，不代表任何专业资质认证。";

/** 统一合规声明 */
export const COMPLIANCE_DISCLAIMER =
  "本平台为传统文化学术交流与学习分享平台，所有交流内容仅供学习参考，不构成任何专业建议。";

/** 禁用表述替换映射 */
export const COMPLIANCE_WORD_REPLACEMENTS: Array<{ from: string; to: string }> = [
  { from: "诊疗", to: "学习交流" },
  { from: "治病", to: "学术探讨" },
  { from: "处方", to: "经验分享" },
  { from: "算命", to: "文化研究" },
  { from: "改运", to: "传统文化参考" },
  { from: "化解", to: "学习交流" },
  { from: "预测", to: "学术探讨" },
  { from: "执业", to: "学习交流" },
  { from: "医师", to: "学习同好" },
  { from: "大师", to: "学习同好" },
];

// ==================== 工具函数 ====================

/**
 * 获取当前用户信息
 */
function getCurrentUserInfo(): { userId: string; nickname: string } | null {
  if (typeof window === "undefined") return null;
  const profile = getUserProfile();
  if (!profile) return null;
  return {
    userId: profile.userId,
    nickname: profile.nickname,
  };
}

/**
 * 渲染星级显示（★★★★☆ 4.8 格式）
 */
export function formatStarDisplay(rating: number, count?: number): string {
  // 防御性处理：确保 rating 为有效数字并限制在 0~5 范围内
  const safeRating = typeof rating === "number" && !isNaN(rating) ? Math.max(0, Math.min(5, rating)) : 0;
  const full = Math.floor(safeRating);
  const half = safeRating - full >= 0.5;
  const stars = "★".repeat(full) + (half ? "☆" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
  const num = safeRating.toFixed(1);
  return count !== undefined ? `${stars} ${num} (${count}条评价)` : `${stars} ${num}`;
}

/**
 * 渲染纯星级符号
 */
export function renderStarSymbols(rating: number): string {
  // 防御性处理：确保 rating 为有效数字并限制在 0~5 范围内
  const safeRating = typeof rating === "number" && !isNaN(rating) ? Math.max(0, Math.min(5, rating)) : 0;
  const full = Math.floor(safeRating);
  const half = safeRating - full >= 0.5;
  return "★".repeat(full) + (half ? "☆" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
}

/**
 * 根据积分获取等级
 */
export function getPointsLevel(points: number) {
  // 防御性处理：确保 points 为有效数字
  const safePoints = typeof points === "number" && !isNaN(points) ? points : 0;
  let result = POINTS_LEVELS[0];
  for (const lv of POINTS_LEVELS) {
    if (safePoints >= lv.minPoints) result = lv;
  }
  return result;
}

/**
 * 计算星级（三维度算术平均，保留1位小数）
 */
export function calculateStarRating(rating: StarRatingDimensions): number {
  const avg = (rating.communication + rating.responsiveness + rating.attitude) / 3;
  return Math.round(avg * 10) / 10; // 保留1位小数
}

/**
 * 检查是否在新入驻保护期
 */
export function isNewMasterProtected(ratingCount: number): boolean {
  return ratingCount < NEW_MASTER_PROTECTION_THRESHOLD;
}

/**
 * 合规文案替换
 */
export function sanitizeComplianceText(text: string): string {
  let result = text;
  for (const { from, to } of COMPLIANCE_WORD_REPLACEMENTS) {
    result = result.replace(new RegExp(from, "g"), to);
  }
  return result;
}

// ==================== API 调用函数 ====================

/**
 * 获取师父星级信息
 */
export async function getMasterStarInfo(
  masterUserId: string
): Promise<MasterStarInfo | null> {
  try {
    const res = await fetch("/api/master/star-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ masterUserId }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 提交星级评价
 */
export async function submitStarRating(
  masterUserId: string,
  rating: StarRatingDimensions,
  comment: string,
  isAnonymous: boolean
): Promise<{ success: boolean; error?: string }> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) {
    return { success: false, error: "请先登录" };
  }
  try {
    const res = await fetch("/api/master/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userInfo.userId,
        raterNickname: userInfo.nickname,
        masterUserId,
        rating,
        comment,
        isAnonymous,
      }),
    });
    if (res.status === 429) {
      return { success: false, error: "请求过于频繁，请稍后再试" };
    }
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 获取用户积分信息
 */
export async function getUserPoints(
  userId: string
): Promise<{ points: number; level: number; levelInfo: typeof POINTS_LEVELS[0] } | null> {
  try {
    const res = await fetch(`/api/points/info?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    const levelInfo = getPointsLevel(json.data.points);
    return {
      points: json.data.points,
      level: levelInfo.level,
      levelInfo,
    };
  } catch {
    return null;
  }
}

/**
 * 获取积分流水（支持筛选收入/支出）
 */
export async function getPointsHistory(
  userId: string,
  page = 1,
  limit = 20,
  filter?: "all" | "income" | "expense"
): Promise<{
  history: PointsTransaction[];
  total: number;
  page: number;
  limit: number;
}> {
  try {
    const params = new URLSearchParams({
      userId,
      page: String(page),
      limit: String(limit),
    });
    if (filter && filter !== "all") params.set("filter", filter);
    const res = await fetch(`/api/points/history?${params.toString()}`);
    if (!res.ok) return { history: [], total: 0, page, limit };
    const json = await res.json();
    return json.success ? json.data : { history: [], total: 0, page, limit };
  } catch {
    return { history: [], total: 0, page, limit };
  }
}

/**
 * 发起申诉
 */
export async function createAppeal(
  type: AppealType,
  targetId: string,
  reason: string,
  evidenceImages: string[]
): Promise<{ success: boolean; appealId?: string; error?: string }> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) {
    return { success: false, error: "请先登录" };
  }
  try {
    const res = await fetch("/api/appeal/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appellantUserId: userInfo.userId,
        appellantNickname: userInfo.nickname,
        type,
        targetId,
        reason,
        evidenceImages,
      }),
    });
    if (res.status === 429) {
      return { success: false, error: "请求过于频繁，请稍后再试" };
    }
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 获取申诉详情（含评委投票情况）
 */
export async function getAppealDetail(
  appealId: string
): Promise<{ appeal: AppealRecord; jury: JuryMember[] } | null> {
  try {
    const res = await fetch(`/api/appeal/detail?id=${encodeURIComponent(appealId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 获取用户发起的申诉列表
 */
export async function getMyAppeals(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ appeals: AppealRecord[]; total: number; page: number; limit: number }> {
  try {
    const res = await fetch(
      `/api/appeal/my?userId=${encodeURIComponent(userId)}&page=${page}&limit=${limit}`
    );
    if (!res.ok) return { appeals: [], total: 0, page, limit };
    const json = await res.json();
    return json.success ? json.data : { appeals: [], total: 0, page, limit };
  } catch {
    return { appeals: [], total: 0, page, limit };
  }
}

/**
 * 评委投票
 */
export async function submitJuryVote(
  appealId: string,
  vote: boolean
): Promise<{ success: boolean; error?: string }> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) {
    return { success: false, error: "请先登录" };
  }
  try {
    const res = await fetch("/api/appeal/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appealId,
        juryUserId: userInfo.userId,
        vote,
      }),
    });
    if (res.status === 429) {
      return { success: false, error: "请求过于频繁，请稍后再试" };
    }
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 获取双轨制排行榜（星级优先，积分其次）
 */
export async function getDualTrackRanking(
  tool?: string,
  page = 1,
  limit = 20
): Promise<{
  ranking: Array<{
    userId: string;
    nickname: string;
    avatar: string;
    expertise: string[];
    starRating: number;
    starRatingCount: number;
    points: number;
    pointsLevel: number;
    pointsLevelInfo: typeof POINTS_LEVELS[0];
    bio: string;
    isPinned: boolean;
  }>;
  total: number;
  page: number;
  limit: number;
  disclaimer: string;
}> {
  try {
    const params = new URLSearchParams();
    if (tool) params.set("tool", tool);
    params.set("page", String(page));
    params.set("limit", String(limit));
    const res = await fetch(`/api/master/ranking?${params.toString()}`);
    if (!res.ok) return { ranking: [], total: 0, page, limit, disclaimer: RANKING_COMPLIANCE_TIP };
    const json = await res.json();
    if (!json.success) return { ranking: [], total: 0, page, limit, disclaimer: RANKING_COMPLIANCE_TIP };
    // 归一化：确保 data 和 ranking 字段安全访问
    const data = json.data ?? {};
    // 客户端排序：星级优先，积分其次
    const ranking = (Array.isArray(data.ranking) ? data.ranking : []).map((item: any) => ({
      ...item,
      pointsLevelInfo: getPointsLevel(Number(item.points) || 0),
    }));
    ranking.sort((a: any, b: any) => {
      const starA = Number(a.starRating) || 0;
      const starB = Number(b.starRating) || 0;
      if (starB !== starA) return starB - starA;
      return (Number(b.points) || 0) - (Number(a.points) || 0);
    });
    return {
      ranking,
      total: typeof data.total === "number" ? data.total : 0,
      page,
      limit,
      disclaimer: RANKING_COMPLIANCE_TIP,
    };
  } catch {
    return { ranking: [], total: 0, page, limit, disclaimer: RANKING_COMPLIANCE_TIP };
  }
}

/**
 * 每日登录打卡积分
 */
export async function dailyLoginPoints(
  userId: string
): Promise<{ success: boolean; amount?: number; error?: string }> {
  try {
    const res = await fetch("/api/points/daily-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.status === 429) {
      return { success: false, error: "请求过于频繁" };
    }
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}

/**
 * 群活跃积分
 */
export async function groupActivePoints(
  userId: string
): Promise<{ success: boolean; amount?: number; error?: string }> {
  try {
    const res = await fetch("/api/points/group-active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.status === 429) {
      return { success: false, error: "请求过于频繁" };
    }
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}
