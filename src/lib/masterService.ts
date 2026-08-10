"use client";

// ============================================================================
// 同道师父互评体系 - 前端服务层 v19.8
// 功能：师父列表、发起求助、提交解答、评分评价、师父主页、举报
// 合规定位：传统文化学习交流，非专业命理/医疗服务
// ============================================================================

import { getUserProfile } from "./auth";

// --- 类型定义 ---

export interface MasterInfo {
  userId: string;
  nickname: string;
  avatar: string;
  maskedAccount: string;
  expertise: string[];
  level: number;       // 1-5
  levelTitle: string;  // 入门同好 / 进阶学人 / 资深讲师 / 国学名师 / 泰斗宗师
  levelIcon: string;
  replyCount: number;
  avgRating: number;
  bio: string;
  joinedAt: string;
  toolReplyCount?: number;
  points?: number;     // v20.2: 积分字段（接口可选返回）
  starRating?: number; // v20.2: 星级字段（兼容双轨制接口返回）
}

export interface HelpRequest {
  id: string;
  userId: string;
  nickname: string;
  tool: string;
  title: string;
  content: string;
  isPaid: boolean;
  reward: number;
  status: "open" | "answered" | "closed";
  createdAt: string;
  replyCount: number;
  replies?: ReplyInfo[];
}

export interface ReplyInfo {
  id: string;
  masterUserId: string;
  masterNickname: string;
  content: string;
  isPaid: boolean;
  createdAt: string;
  rated: boolean;
  rating?: {
    professional: number;
    patience: number;
    accuracy: number;
  } | null;
}

export interface RatingInfo {
  id: string;
  rating: {
    professional: number;
    patience: number;
    accuracy: number;
  };
  comment: string;
  isAnonymous: boolean;
  raterNickname: string;
  createdAt: string;
}

export interface MasterProfile {
  success: boolean;
  master: MasterInfo;
  replies: Array<{
    id: string;
    helpTitle: string;
    tool: string;
    content: string;
    isPaid: boolean;
    createdAt: string;
    rated: boolean;
    rating: {
      professional: number;
      patience: number;
      accuracy: number;
      comment: string;
      isAnonymous: boolean;
      raterNickname: string;
    } | null;
  }>;
  ratings: RatingInfo[];
  disclaimer: string;
}

export interface MasterListResult {
  masters: MasterInfo[];
  total: number;
  page: number;
  limit: number;
  disclaimer: string;
}

export interface HelpListResult {
  success: boolean;
  requests: HelpRequest[];
  total: number;
  page: number;
  limit: number;
  disclaimer: string;
}

// --- 等级配置 ---

export const MASTER_LEVELS = [
  { level: 1, title: "入门同好", icon: "🌱", minReplies: 0, minRating: 0, color: "#95a5a6" },
  { level: 2, title: "进阶学人", icon: "✏️", minReplies: 10, minRating: 3.5, color: "#3498db" },
  { level: 3, title: "资深讲师", icon: "📚", minReplies: 50, minRating: 4.0, color: "#9b59b6" },
  { level: 4, title: "国学名师", icon: "🎓", minReplies: 200, minRating: 4.3, color: "#e67e22" },
  { level: 5, title: "泰斗宗师", icon: "👑", minReplies: 500, minRating: 4.5, color: "#e74c3c" },
];

export const DISCLAIMER_TEXT = "本板块仅为同好学习交流，内容仅代表用户个人观点，不构成任何人生决策建议";

// --- API 调用函数 ---

/**
 * 获取当前用户信息（用于API调用）
 */
function getCurrentUserInfo(): { userId: string; nickname: string; phone: string } | null {
  if (typeof window === "undefined") return null;
  const profile = getUserProfile();
  if (!profile) return null;
  return {
    userId: profile.userId,
    nickname: profile.nickname,
    phone: profile.phone || "",
  };
}

/**
 * 获取推荐师父列表
 */
export async function getMasterList(tool: string, page = 1, limit = 20): Promise<MasterListResult> {
  try {
    const res = await fetch("/api/master/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool, page, limit }),
    });
    if (res.status === 429) {
      return { masters: [], total: 0, page, limit, disclaimer: DISCLAIMER_TEXT };
    }
    const json = await res.json();
    // 归一化：兼容 { masters: [...] } 和 { success: true, data: { masters: [...] } } 两种响应格式
    const data = json?.data ?? json;
    return {
      masters: Array.isArray(data?.masters) ? data.masters : [],
      total: typeof data?.total === "number" ? data.total : 0,
      page: typeof data?.page === "number" ? data.page : page,
      limit: typeof data?.limit === "number" ? data.limit : limit,
      disclaimer: data?.disclaimer ?? DISCLAIMER_TEXT,
    };
  } catch {
    return { masters: [], total: 0, page, limit, disclaimer: DISCLAIMER_TEXT };
  }
}

/**
 * 发起求助
 */
export async function createHelp(
  tool: string,
  title: string,
  content: string,
  isPaid = false,
  reward = 0
): Promise<{ success: boolean; helpId?: string; error?: string }> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) {
    return { success: false, error: "请先登录" };
  }
  try {
    const res = await fetch("/api/master/help", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...userInfo,
        tool,
        title,
        content,
        isPaid,
        reward,
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
 * 提交解答
 */
export async function createReply(
  helpId: string,
  content: string
): Promise<{ success: boolean; replyId?: string; error?: string }> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) {
    return { success: false, error: "请先登录" };
  }
  try {
    const res = await fetch("/api/master/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...userInfo,
        helpId,
        content,
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
 * 提交评分评价
 */
export async function submitRating(
  replyId: string,
  rating: { professional: number; patience: number; accuracy: number },
  comment = "",
  isAnonymous = false
): Promise<{ success: boolean; ratingId?: string; error?: string }> {
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
        replyId,
        rating,
        comment,
        isAnonymous,
      }),
    });
    if (res.status === 429) {
      return { success: false, error: "请求过于频繁，请稍后重试" };
    }
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 获取师父主页数据
 */
export async function getMasterProfile(masterUserId: string): Promise<MasterProfile | null> {
  try {
    const res = await fetch("/api/master/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ masterUserId }),
    });
    if (res.status === 429) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * 获取求助列表
 */
export async function getHelpList(
  tool?: string,
  status: "open" | "answered" | "closed" | "all" = "open",
  page = 1,
  limit = 20
): Promise<HelpListResult> {
  try {
    const res = await fetch("/api/master/help-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool, status, page, limit }),
    });
    if (res.status === 429) {
      return { success: false, requests: [], total: 0, page, limit, disclaimer: DISCLAIMER_TEXT };
    }
    const json = await res.json();
    // 归一化：兼容 { requests: [...] } 和 { success: true, data: { requests: [...] } } 两种响应格式
    const data = json?.data ?? json;
    return {
      success: json?.success !== false,
      requests: Array.isArray(data?.requests) ? data.requests : [],
      total: typeof data?.total === "number" ? data.total : 0,
      page: typeof data?.page === "number" ? data.page : page,
      limit: typeof data?.limit === "number" ? data.limit : limit,
      disclaimer: data?.disclaimer ?? DISCLAIMER_TEXT,
    };
  } catch {
    return { success: false, requests: [], total: 0, page, limit, disclaimer: DISCLAIMER_TEXT };
  }
}

/**
 * 举报内容
 */
export async function reportContent(
  targetType: "reply" | "rating" | "help",
  targetId: string,
  reason: string
): Promise<{ success: boolean; reportId?: string; message?: string; error?: string }> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) {
    return { success: false, error: "请先登录" };
  }
  try {
    const res = await fetch("/api/master/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userInfo.userId,
        targetType,
        targetId,
        reason,
      }),
    });
    if (res.status === 429) {
      return { success: false, error: "请求过于频繁，请稍后重试" };
    }
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 更新师父个人资料
 */
export async function updateMasterProfile(
  nickname?: string,
  expertise?: string[],
  bio?: string,
  avatar?: string
): Promise<{ success: boolean; error?: string }> {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) {
    return { success: false, error: "请先登录" };
  }
  try {
    const res = await fetch("/api/master/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userInfo.userId,
        nickname,
        phone: userInfo.phone,
        avatar,
        expertise,
        bio,
      }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

// --- 工具函数 ---

/**
 * 格式化时间
 */
export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    return date.toLocaleDateString("zh-CN");
  } catch {
    return "";
  }
}

/**
 * 获取等级配置
 */
export function getLevelConfig(level: number) {
  return MASTER_LEVELS.find(l => l.level === level) || MASTER_LEVELS[0];
}

/**
 * 渲染星级
 */
export function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return "★".repeat(full) + (half ? "☆" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
}

// ============================================================================
// v19.9: 积分体系深化 - 类型定义与API函数
// ============================================================================

/** 积分明细 */
export interface PointsBreakdown {
  inviteCount: number;
  paidGoodReviews: number;
  freeGoodReviewsText: number;
  freeGoodReviewsStar: number;
  paidBadReviews: number;
  freeBadReviews: number;
  violations: number;
  violationPoints: number;
}

/** 星级信息（双维度） */
export interface StarLevelInfo {
  level: number;
  title: string;
  icon: string;
  color: string;
  totalPoints: number;
  replyCount: number;
  avgRating: number;
  badRatingRate: number;
  pointsBreakdown: PointsBreakdown;
  nextLevel: { level: number; title: string; icon: string; minPoints: number; minReplies: number; color: string } | null;
}

/** 积分历史记录 */
export interface PointsHistoryItem {
  id: string;
  userId: string;
  points: number;
  reason: string;
  relatedId: string;
  timestamp: string;
  balanceAfter: number;
}

/** 排行榜项 */
export interface RankingItem {
  userId: string;
  nickname: string;
  avatar: string;
  maskedAccount: string;
  expertise: string[];
  level: number;
  levelTitle: string;
  levelIcon: string;
  levelColor: string;
  totalPoints: number;
  replyCount: number;
  toolReplyCount: number;
  avgRating: number;
  bio: string;
  isPinned: boolean;
}

/** 积分规则 */
export const POINTS_RULES_DESC = [
  { action: "直邀有效注册下级", points: "+2分/人", note: "仅一级直邀计分" },
  { action: "付费服务好评(≥4星)", points: "+2分/条", note: "含文字评价默认生效" },
  { action: "免费好评(≥4星+≥50字)", points: "+1.5分/条", note: "文字需与服务内容相关" },
  { action: "免费好评(纯星级/不足50字)", points: "+0.5分/条", note: "无实质内容的纯星级" },
  { action: "付费服务差评(≤2星)", points: "-3分/条", note: "申诉核实无责可撤销" },
  { action: "免费服务差评(≤2星)", points: "-1分/条", note: "申诉核实无责可撤销" },
  { action: "违规内容举报核实", points: "-5~-20分/次", note: "情节严重直接降星、封禁" },
];

/** 星级双维度规则 */
export const STAR_LEVELS_DESC = [
  { level: 1, title: "入门同好", icon: "🌱", minPoints: 0, minReplies: 0, color: "#95a5a6" },
  { level: 2, title: "进阶学人", icon: "✏️", minPoints: 100, minReplies: 10, color: "#3498db" },
  { level: 3, title: "资深讲师", icon: "📚", minPoints: 300, minReplies: 50, color: "#9b59b6" },
  { level: 4, title: "国学名师", icon: "🎓", minPoints: 600, minReplies: 200, color: "#e67e22" },
  { level: 5, title: "泰斗宗师", icon: "👑", minPoints: 1200, minReplies: 500, color: "#e74c3c" },
];

/**
 * v19.9: 获取用户积分与星级信息
 */
export async function getPointsInfo(userId: string): Promise<StarLevelInfo | null> {
  try {
    const res = await fetch(`/api/master/points?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * v19.9: 获取积分历史
 */
export async function getPointsHistory(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ history: PointsHistoryItem[]; total: number; page: number; limit: number }> {
  try {
    const res = await fetch(`/api/master/points/history?userId=${encodeURIComponent(userId)}&page=${page}&limit=${limit}`);
    if (!res.ok) return { history: [], total: 0, page, limit };
    const json = await res.json();
    return json.success ? json.data : { history: [], total: 0, page, limit };
  } catch {
    return { history: [], total: 0, page, limit };
  }
}

/**
 * v19.9: 获取师父排行榜
 */
export async function getRanking(
  tool?: string,
  page = 1,
  limit = 20
): Promise<{ ranking: RankingItem[]; total: number; page: number; limit: number; disclaimer: string }> {
  try {
    const params = new URLSearchParams();
    if (tool) params.set("tool", tool);
    params.set("page", String(page));
    params.set("limit", String(limit));
    const res = await fetch(`/api/master/ranking?${params.toString()}`);
    if (!res.ok) return { ranking: [], total: 0, page, limit, disclaimer: DISCLAIMER_TEXT };
    const json = await res.json();
    if (!json.success) return { ranking: [], total: 0, page, limit, disclaimer: DISCLAIMER_TEXT };
    // 归一化：确保 ranking 始终为数组，total 始终为数字
    const data = json.data ?? {};
    return {
      ranking: Array.isArray(data.ranking) ? data.ranking : [],
      total: typeof data.total === "number" ? data.total : 0,
      page: typeof data.page === "number" ? data.page : page,
      limit: typeof data.limit === "number" ? data.limit : limit,
      disclaimer: data.disclaimer ?? DISCLAIMER_TEXT,
    };
  } catch {
    return { ranking: [], total: 0, page, limit, disclaimer: DISCLAIMER_TEXT };
  }
}

/**
 * v19.9: 直邀下级加分
 */
export async function addInvitePoints(
  userId: string,
  invitedUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/master/points/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, invitedUserId }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "网络异常" };
  }
}
