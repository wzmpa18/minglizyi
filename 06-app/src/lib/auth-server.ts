/**
 * 服务端用户身份管理（v18.3 登录态持久化整改）
 * 
 * 服务端从 cookie 获取 userId，用于数据隔离
 * 此文件仅供 Server Components 和 API Routes 使用
 * 
 * 注意：服务端 cookie 存储的是匿名 userId（游客模式），
 * 真实登录的 Token 仅在客户端 localStorage 存储，
 * 服务端不做身份校验（核心权限校验由后端 API 完成）
 */

import { cookies } from "next/headers";

const USER_ID_COOKIE = "yandao_user_id";

function generateUserId(): string {
  return "u_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 12);
}

export async function getServerUserId(): Promise<string> {
  try {
    const cookieStore = await cookies();
    let userId = cookieStore.get(USER_ID_COOKIE)?.value;
    if (!userId || userId.length < 4) {
      userId = generateUserId();
      cookieStore.set(USER_ID_COOKIE, userId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365 * 10, // 10年
        path: "/",
      });
    }
    return userId;
  } catch (e) {
    return "u_fallback_" + Date.now().toString(36);
  }
}