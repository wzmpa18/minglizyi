// ============================================================================
// 言道国学 - 后台管理共享类型定义
// 被 API 路由、配置存储、统计服务、前端页面共同引用
// ============================================================================

/** 会员等级标识 */
export type MemberLevel = "basic" | "monthly" | "quarterly" | "yearly" | "lifetime";

/** AI 工具分类 */
export type AIToolCategory = "general_ai" | "b_tool" | "incremental";

// ==================== AI 配置类型 ====================

/** 单个 AI 工具的管控配置 */
export interface AIToolConfig {
  id: string;
  name: string;
  category: AIToolCategory;
  enabled: boolean;
  price: number;
  description: string;
}

/** 各会员等级的 AI 配额 */
export interface AIQuotaByLevel {
  daily: number;   // -1 表示无限
  monthly: number; // -1 表示无限
}

export type AIQuotaConfig = Record<MemberLevel, AIQuotaByLevel>;

/** 增量包配置 */
export interface IncrementalPackageConfig {
  id: string;
  name: string;
  count: number;
  price: number;
  validity: number; // 有效期天数
  enabled: boolean;
}

/** 完整 AI 配置 */
export interface AIConfig {
  globalEnabled: boolean;
  tools: AIToolConfig[];
  quotas: AIQuotaConfig;
  packages: IncrementalPackageConfig[];
  updatedAt: string;
}

// ==================== 会员配置类型 ====================

/** 会员套餐配置（含上下架） */
export interface MembershipPlanConfig {
  level: MemberLevel;
  name: string;
  price: number;
  originalPrice: number;
  duration: string;
  features: string[];
  badge: string;
  highlighted: boolean;
  enabled: boolean;
  sortOrder: number;
}

/** 完整会员配置 */
export interface MembershipConfig {
  plans: MembershipPlanConfig[];
  complianceLabel: string;
  updatedAt: string;
}

// ==================== 统计数据类型 ====================

/** 用户活跃度统计 */
export interface UserActivityStats {
  dau: number;
  wau: number;
  mau: number;
  newUsersToday: number;
  totalUsers: number;
  trend: { date: string; dau: number; newUsers: number }[];
}

/** 邀请数据统计 */
export interface InviteStats {
  totalInvites: number;
  level1Count: number;
  level2Count: number;
  conversionRate: number;
  todayInvites: number;
  totalRewards: number;
  trend: { date: string; invites: number }[];
}

/** 页面浏览热度 */
export interface PageViewStats {
  totalViews: number;
  totalUniqueVisitors: number;
  pages: {
    path: string;
    title: string;
    views: number;
    uniqueVisitors: number;
    avgDuration: number;
  }[];
}

/** 会员数据统计 */
export interface MembershipStats {
  totalMembers: number;
  paidMembers: number;
  revenueTotal: number;
  revenueThisMonth: number;
  conversionRate: number;
  byLevel: {
    level: MemberLevel;
    name: string;
    count: number;
    revenue: number;
  }[];
  revenueTrend: { month: string; revenue: number }[];
}

/** AI 使用统计 */
export interface AIUsageStats {
  totalCalls: number;
  callsToday: number;
  successRate: number;
  topTools: { toolId: string; name: string; calls: number; share: number }[];
  callsTrend: { date: string; calls: number }[];
}

/** 完整统计看板数据 */
export interface DashboardStats {
  generatedAt: string;
  userActivity: UserActivityStats;
  invite: InviteStats;
  pageViews: PageViewStats;
  membership: MembershipStats;
  aiUsage: AIUsageStats;
}

// ==================== 行业资讯内容源类型 ====================

/** 资讯分类 */
export type NewsAdminCategory = "zhongyi" | "yixue";

/** 单条行业资讯（后台管理用） */
export interface NewsAdminItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  category: NewsAdminCategory;
}

/** 资讯列表响应 */
export interface NewsAdminListData {
  items: NewsAdminItem[];
  total: number;
}

// ==================== 公告栏类型 ====================

/** 公告级别 */
export type AnnouncementLevel = "info" | "important" | "urgent";

/** 单条公告（后台管理用） */
export interface AnnouncementAdminItem {
  id: string;
  title: string;
  content: string;
  level: AnnouncementLevel;
  /** 展示平台：all | ios | android | web 或逗号分隔组合（v25.0.80） */
  platform?: string;
  pinned: boolean;
  published: boolean;
  publishAt: string;
  expiresAt: string | null;
  link: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 公告列表响应 */
export interface AnnouncementAdminListData {
  announcements: AnnouncementAdminItem[];
}

// ==================== API 响应类型 ====================

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
}
