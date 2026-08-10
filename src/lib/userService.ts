"use client";

// ============================================================================
// v20.0 用户分类体系 - 前端服务层
// 功能：用户分类查询、自动分类、管理员手动分类、分类统计
// ============================================================================

import { getUserProfile } from "./auth";

// --- 类型定义 ---

export interface UserClassification {
  category: string;
  subcategory: string;
  autoAssigned: boolean;
  assignedAt: string;
}

export interface ClassificationInfo {
  userId: string;
  classifications: UserClassification[];
  primaryCategory: string | null;
  manuallySet: boolean;
  lastUpdated: string | null;
}

export interface CategoryConfig {
  name: string;
  icon: string;
  color: string;
  subcategories: Record<string, {
    name: string;
    icon: string;
    [key: string]: any;
  }>;
}

export interface ClassificationStats {
  [category: string]: {
    name: string;
    icon: string;
    total: number;
    subcategories: Record<string, {
      name: string;
      count: number;
    }>;
  };
}

// --- 用户分类配置常量 ---

export const USER_CATEGORIES: Record<string, CategoryConfig> = {
  enthusiast: {
    name: "国学爱好者",
    icon: "📚",
    color: "#7B2FBE",
    subcategories: {
      beginner: { name: "初学者", icon: "🌱", minTools: 0, minDays: 0 },
      intermediate: { name: "进阶者", icon: "📖", minTools: 5, minDays: 30 },
      advanced: { name: "资深者", icon: "🎓", minTools: 15, minDays: 90 },
    },
  },
  professional: {
    name: "专业从业者",
    icon: "⚖️",
    color: "#e67e22",
    subcategories: {
      apprentice: { name: "学徒期", icon: "📝", certRequired: false },
      licensed: { name: "执业期", icon: "📜", certRequired: true },
      master: { name: "大师级", icon: "👑", certRequired: true, minYears: 10 },
    },
  },
  contributor: {
    name: "社区贡献者",
    icon: "🤝",
    color: "#27ae60",
    subcategories: {
      helper: { name: "热心解答", icon: "💬", minReplies: 10 },
      moderator: { name: "社区版主", icon: "🛡️", minReplies: 100, adminAppointed: true },
      educator: { name: "知识传播者", icon: "📢", minArticles: 5 },
    },
  },
  vip: {
    name: "付费会员",
    icon: "💎",
    color: "#f39c12",
    subcategories: {
      monthly: { name: "月度会员", icon: "🔵", duration: 30 },
      yearly: { name: "年度会员", icon: "🟡", duration: 365 },
      lifetime: { name: "终身会员", icon: "🔴", duration: -1 },
    },
  },
  partner: {
    name: "合作伙伴",
    icon: "🏢",
    color: "#3498db",
    subcategories: {
      distributor: { name: "分销商", icon: "📊", commissionRate: 0.15 },
      instructor: { name: "合作讲师", icon: "🎤", revenueShare: 0.7 },
      institution: { name: "合作机构", icon: "🏛️", customAgreement: true },
    },
  },
};

// --- 工具函数 ---

function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  const profile = getUserProfile();
  return profile?.userId || null;
}

/**
 * 获取用户分类信息
 */
export async function getUserClassification(userId?: string): Promise<ClassificationInfo | null> {
  const uid = userId || getCurrentUserId();
  if (!uid) return null;
  try {
    const res = await fetch(`/api/user/classification?userId=${encodeURIComponent(uid)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 管理员设置用户分类
 */
export async function setUserClassification(
  userId: string,
  category: string,
  subcategory: string,
  adminToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/user/classification/set", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ userId, category, subcategory }),
    });
    const json = await res.json();
    return json;
  } catch {
    return { success: false, error: "网络异常，请稍后重试" };
  }
}

/**
 * 自动分类用户
 */
export async function autoClassifyUser(
  userId: string,
  userData: Record<string, any>
): Promise<UserClassification[] | null> {
  try {
    const res = await fetch("/api/user/classification/auto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, userData }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data.classifications : null;
  } catch {
    return null;
  }
}

/**
 * 获取分类统计
 */
export async function getClassificationStats(
  adminToken: string
): Promise<ClassificationStats | null> {
  try {
    const res = await fetch("/api/user/classification/stats", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 获取分类配置
 */
export async function getCategoryConfig(): Promise<Record<string, CategoryConfig> | null> {
  try {
    const res = await fetch("/api/user/classification/config");
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/**
 * 获取分类显示信息
 */
export function getCategoryDisplay(category: string, subcategory: string) {
  const cat = USER_CATEGORIES[category];
  if (!cat) return { categoryName: "未知", categoryIcon: "❓", subcategoryName: "未知", subcategoryIcon: "❓", color: "#999" };
  const sub = cat.subcategories[subcategory];
  if (!sub) return { categoryName: cat.name, categoryIcon: cat.icon, subcategoryName: "未知", subcategoryIcon: "❓", color: cat.color };
  return {
    categoryName: cat.name,
    categoryIcon: cat.icon,
    subcategoryName: sub.name,
    subcategoryIcon: sub.icon,
    color: cat.color,
  };
}
