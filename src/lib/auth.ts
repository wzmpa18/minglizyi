"use client";

/**
 * 客户端用户身份管理（v18.5 登录态持久化 + 会话级登录）
 * 
 * 核心原则：
 * - 登录凭证（Token / 用户标识）存入 localStorage，永久保持
 * - 用户不主动退出、不清理缓存、账号未被吊销，登录状态永不丢失
 * - 刷新页面、关闭浏览器重开、切换底部导航、多标签页，均不得掉线
 * - v18.5 新增：支持 sessionStorage 会话级登录（关闭浏览器后退出）
 * 
 * 存储键名规范（总纲命名规范）：
 * - yandao_user_token  : 登录凭证（Token）
 * - yandao_user_profile: 用户资料（昵称、头像、会员等级等）
 * - yandao_user_id     : 匿名用户ID（游客模式，兼容旧版）
 * 
 * 后续可无缝切换为手机号/微信登录系统
 */

// ==================== 键名规范 ====================
const USER_TOKEN_KEY = "yandao_user_token";
const USER_PROFILE_KEY = "yandao_user_profile";
const USER_ID_KEY = "yandao_user_id"; // 游客模式匿名ID

// ==================== 类型定义 ====================
export interface UserProfile {
  userId: string;
  nickname: string;
  avatar?: string;
  memberLevel: "guest" | "basic" | "premium" | "monthly" | "quarterly" | "yearly" | "lifetime";
  memberTier?: string;
  membershipExpiry?: string | null;
  phone?: string;
  email?: string;
  numberId?: string; // v20.1: 数字ID（6-8位纯数字），用于登录和加好友
  loginTime: number;
  gender?: "male" | "female" | "secret";
  birthday?: string;
  bio?: string;
  tags?: string[];
  inviteCode?: string; // v21.2: 邀请码
  // v20.2: 双轨制 - 星级与积分完全独立
  starRating?: number;    // 星级（1.0-5.0），仅师父账号拥有，用户评价算术平均分
  starRatingCount?: number; // 有效评价数量
  points?: number;       // 积分，所有注册用户通用，活跃贡献累计
  pointsLevel?: number;  // 积分等级（1-10），对应不同头像框、专属标识、功能权限
  isMaster?: boolean;    // 是否为师父账号
}

export interface LoginState {
  isLoggedIn: boolean;
  token: string | null;
  profile: UserProfile | null;
}

// ==================== 内部工具函数 ====================
function generateUserId(): string {
  return "u_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 12);
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// localStorage 工具函数
function safeGetItem(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  if (!isBrowser()) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key: string): boolean {
  if (!isBrowser()) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// sessionStorage 工具函数（v18.5 新增，用于会话级登录）
function safeGetSessionItem(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetSessionItem(key: string, value: string): boolean {
  if (!isBrowser()) return false;
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveSessionItem(key: string): boolean {
  if (!isBrowser()) return false;
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// ==================== 游客模式：匿名用户ID ====================

export function getClientUserId(): string {
  if (!isBrowser()) return "u_ssr_fallback";
  try {
    let userId = safeGetItem(USER_ID_KEY);
    if (!userId || userId.length < 4) {
      userId = generateUserId();
      safeSetItem(USER_ID_KEY, userId);
    }
    return userId;
  } catch {
    return generateUserId();
  }
}

// ==================== 登录态管理（v18.3 新增，v18.5 增强） ====================

export function getLoginState(): LoginState {
  let token = safeGetItem(USER_TOKEN_KEY);
  let profileStr = safeGetItem(USER_PROFILE_KEY);

  // 回退到 sessionStorage（会话级登录）
  if (!token) {
    token = safeGetSessionItem(USER_TOKEN_KEY);
  }
  if (!profileStr) {
    profileStr = safeGetSessionItem(USER_PROFILE_KEY);
  }

  let profile: UserProfile | null = null;

  if (profileStr) {
    try {
      profile = normalizeLegacyProfile(JSON.parse(profileStr));
    } catch {
      safeRemoveItem(USER_PROFILE_KEY);
      safeRemoveSessionItem(USER_PROFILE_KEY);
    }
  }

  return {
    isLoggedIn: !!token && !!profile,
    token,
    profile,
  };
}

// v25.0.47_21: 旧版登录态 userId 存的是数字，后端支付/订单接口只认字符串——
// 读取时统一规范化，一处修复所有消费方（支付下单/云同步/邀请分佣等）
function normalizeLegacyProfile(p: UserProfile | null): UserProfile | null {
  if (p && typeof p.userId === "number") {
    return { ...p, userId: String(p.userId) };
  }
  return p;
}

export function getUserToken(): string | null {
  return safeGetItem(USER_TOKEN_KEY) || safeGetSessionItem(USER_TOKEN_KEY);
}

export function getUserProfile(): UserProfile | null {
  let profileStr = safeGetItem(USER_PROFILE_KEY);
  if (!profileStr) profileStr = safeGetSessionItem(USER_PROFILE_KEY);
  if (!profileStr) return null;
  try {
    return normalizeLegacyProfile(JSON.parse(profileStr));
  } catch {
    safeRemoveItem(USER_PROFILE_KEY);
    safeRemoveSessionItem(USER_PROFILE_KEY);
    return null;
  }
}

export function setLoginState(token: string, profile: UserProfile): boolean {
  if (!isBrowser()) return false;
  try {
    safeSetItem(USER_TOKEN_KEY, token);
    safeSetItem(USER_PROFILE_KEY, JSON.stringify({
      ...profile,
      loginTime: Date.now(),
    }));

    // 同步会员状态到 yandao_membership_status（AI 权限系统读这个 key）
    // 根因：后端改了 member_level 但前端 AI 从 yandao_membership_status 读，
    // 该 key 仅支付成功时写入，导致后台补开会员后 AI 仍不可用
    //
    // v25.0.60 AUDIT-20260826 P1-6 修复：V31 版本存在两个漏洞——
    // ① memberTier 缺失且 level=premium 时不写入（旧后端响应路径下会员同步失效）；
    // ② 档位为 basic/guest 时不清写，后台撤销会员后本地残留旧付费状态。
    // 现统一为单一权威逻辑：以服务端 profile 为准，付费写真实档位，非付费清写 basic。
    const msKey = "yandao_membership_status";
    const rawTier = profile.memberTier || profile.memberLevel || "basic";
    // premium 是后端对旧 APK 的统一映射档，memberTier 缺失时按月度权益处理（v25.0.60 补漏）
    const tier = rawTier === "premium" ? "monthly" : rawTier;
    const PAID: Array<"monthly" | "quarterly" | "yearly" | "lifetime"> = ["monthly", "quarterly", "yearly", "lifetime"];
    const now = Date.now();
    const expMs = profile.membershipExpiry ? new Date(profile.membershipExpiry).getTime() : Infinity;
    const isValidPaid = (PAID as string[]).includes(tier) && (expMs === Infinity || expMs > now);
    if (isValidPaid) {
      localStorage.setItem(msKey, JSON.stringify({
        level: tier,
        startTime: new Date().toISOString(),
        expireTime: profile.membershipExpiry || null,
        isActive: true,
        daysRemaining: expMs === Infinity ? Infinity : Math.ceil((expMs - now) / 86400000),
      }));
    } else {
      // 服务端明确为 basic/已过期/已撤销：清写 basic，防止本地残留付费状态
      localStorage.setItem(msKey, JSON.stringify({
        level: "basic",
        startTime: new Date().toISOString(),
        expireTime: null,
        isActive: false,
        daysRemaining: 0,
      }));
    }

    broadcastLoginState("login", token, profile);
    return true;
  } catch {
    return false;
  }
}

/**
 * 将登录态从 localStorage 迁移到 sessionStorage（v18.5 新增）
 * 用于「不记住登录状态」场景：关闭浏览器后自动退出
 */
export function moveLoginStateToSession(): boolean {
  if (!isBrowser()) return false;
  try {
    const token = safeGetItem(USER_TOKEN_KEY);
    const profileStr = safeGetItem(USER_PROFILE_KEY);
    if (token) {
      safeSetSessionItem(USER_TOKEN_KEY, token);
      safeRemoveItem(USER_TOKEN_KEY);
    }
    if (profileStr) {
      safeSetSessionItem(USER_PROFILE_KEY, profileStr);
      safeRemoveItem(USER_PROFILE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export function updateUserProfile(partial: Partial<UserProfile>): boolean {
  if (!isBrowser()) return false;
  try {
    const current = getUserProfile();
    if (!current) return false;
    const updated = { ...current, ...partial };
    const profileStr = JSON.stringify(updated);
    // 写入当前登录态所在的存储
    if (safeGetSessionItem(USER_PROFILE_KEY)) {
      safeSetSessionItem(USER_PROFILE_KEY, profileStr);
    } else {
      safeSetItem(USER_PROFILE_KEY, profileStr);
    }
    broadcastLoginState("profileUpdate", null, updated);
    return true;
  } catch {
    return false;
  }
}

export function clearLoginState(): boolean {
  if (!isBrowser()) return false;
  try {
    safeRemoveItem(USER_TOKEN_KEY);
    safeRemoveItem(USER_PROFILE_KEY);
    safeRemoveSessionItem(USER_TOKEN_KEY);
    safeRemoveSessionItem(USER_PROFILE_KEY);
    broadcastLoginState("logout", null, null);
    return true;
  } catch {
    return false;
  }
}

export function isTokenExpired(): boolean {
  return false;
}

export function refreshTokenIfNeeded(): void {
  // 预留后续实现
}

// ==================== 多标签页状态同步 ====================

type LoginEventType = "login" | "logout" | "profileUpdate";

interface LoginBroadcastMessage {
  type: "yandao_login_state_change";
  event: LoginEventType;
  token: string | null;
  profile: UserProfile | null;
  timestamp: number;
}

function broadcastLoginState(
  event: LoginEventType,
  token: string | null,
  profile: UserProfile | null
): void {
  if (!isBrowser()) return;
  try {
    const message: LoginBroadcastMessage = {
      type: "yandao_login_state_change",
      event,
      token,
      profile,
      timestamp: Date.now(),
    };
    localStorage.setItem("yandao_login_broadcast", JSON.stringify(message));
    localStorage.removeItem("yandao_login_broadcast");
  } catch {
    // 广播失败不影响主流程
  }
}

export type LoginStateChangeHandler = (state: LoginState) => void;

export function listenLoginStateChange(
  onStateChange: LoginStateChangeHandler
): () => void {
  if (!isBrowser()) return () => {};

  const handler = (e: StorageEvent) => {
    if (e.key === "yandao_login_broadcast" && e.newValue) {
      try {
        const message: LoginBroadcastMessage = JSON.parse(e.newValue);
        if (message.type === "yandao_login_state_change") {
          onStateChange(getLoginState());
        }
      } catch {
        // 忽略
      }
    }
    if (e.key === USER_TOKEN_KEY || e.key === USER_PROFILE_KEY) {
      onStateChange(getLoginState());
    }
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function initLoginState(): LoginState {
  const state = getLoginState();
  if (state.isLoggedIn && isTokenExpired()) {
    clearLoginState();
    return { isLoggedIn: false, token: null, profile: null };
  }
  return state;
}

// 兼容旧版导出
export { getClientUserId as getUserId };
export { getClientUserId as getCurrentUserId };
