// ============================================================================
// 言道国学 - 后台管理服务端鉴权工具
// 所有 /api/admin/* 路由统一调用 verifyAdmin 进行 Bearer Token 校验
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

/** 管理员密钥：从环境变量读取，回退到项目默认值 */
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

/**
 * 校验请求是否携带合法的管理员 Bearer Token
 * @returns 校验通过返回 true，否则 false
 */
export function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  return token === ADMIN_KEY;
}

/**
 * 返回标准 401 未授权响应
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: "未授权访问，请提供有效的管理员密钥" },
    { status: 401 }
  );
}

/**
 * 从请求体中安全解析 JSON，解析失败返回 null
 */
export async function safeParseBody<T = unknown>(
  request: NextRequest
): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
