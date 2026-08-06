"use client";

/**
 * 客户端用户身份管理（v18.3 登录态持久化整改）
 * 
 * 核心原则：
 * - 登录凭证（Token / 用户标识）存入 localStorage，永久保持
 * - 用户不主动退出、不清理缓存、账号未被吊销，登录状态永不丢失
 * - 刷新页面、关闭浏览器重开、切换底部导航、多标签页，均不得掉线
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
  memberLevel: "guest" | "basic" | "premium";
  phone?: string;
  loginTime: number;
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

// ==================== 登录态管理（v18.3 新增） ====================

export function getLoginState(): LoginState {
  const token = safeGetItem(USER_TOKEN_KEY);
  const profileStr = safeGetItem(USER_PROFILE_KEY);
  let profile: UserProfile | null = null;

  if (profileStr) {
    try {
      profile = JSON.parse(profileStr);
    } catch {
      safeRemoveItem(USER_PROFILE_KEY);
    }
  }

  return {
    isLoggedIn: !!token && !!profile,
    token,
    profile,
  };
}

export function getUserToken(): string | null {
  return safeGetItem(USER_TOKEN_KEY);
}

export function getUserProfile(): UserProfile | null {
  const profileStr = safeGetItem(USER_PROFILE_KEY);
  if (!profileStr) return null;
  try {
    return JSON.parse(profileStr);
  } catch {
    safeRemoveItem(USER_PROFILE_KEY);
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
    broadcastLoginState("login", token, profile);
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
    safeSetItem(USER_PROFILE_KEY, JSON.stringify(updated));
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