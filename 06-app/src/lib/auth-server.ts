/**
 * 服务端用户身份管理
 * P1.5整改：服务端从cookie获取userId，用于数据隔离
 * 此文件仅供Server Components和API Routes使用
 */

import { cookies } from "next/headers";

const USER_ID_COOKIE = "yandao_user_id";

function generateUserId(): string {
  return "u_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 12);
}

/**
 * 服务端：从cookie获取userId，如无则生成新的
 */
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
