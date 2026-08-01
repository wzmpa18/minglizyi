"use client";

/**
 * 客户端用户身份管理
 * P1.5整改：生成并管理匿名userId，用于数据隔离
 * 后续可无缝切换为登录系统（手机号/微信等）
 */

const USER_ID_KEY = "yandao_user_id"; // localStorage key (client-side)

function generateUserId(): string {
  return "u_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 12);
}

/**
 * 客户端：从localStorage获取/生成userId
 */
export function getClientUserId(): string {
  if (typeof window === "undefined") return "u_ssr_fallback";
  try {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId || userId.length < 4) {
      userId = generateUserId();
      localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  } catch {
    return generateUserId();
  }
}
