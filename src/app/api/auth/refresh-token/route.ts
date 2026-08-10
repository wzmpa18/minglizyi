import { NextRequest, NextResponse } from "next/server";

/**
 * Token 刷新接口 - v20.1 登录态持久化
 *
 * 接收 refresh_token，返回新的 access_token + refresh_token
 * 前端在接口返回401时自动调用此接口，实现无感续期
 *
 * 后端部署时需在 ai-proxy-server.js 中实现对应逻辑
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: "缺少 refresh_token" },
        { status: 400 }
      );
    }

    // 验证 refresh_token 格式
    if (!refreshToken.startsWith("rt_")) {
      return NextResponse.json(
        { success: false, message: "无效的 refresh_token" },
        { status: 401 }
      );
    }

    // 生成新的 token 对
    // 实际生产环境应连接数据库验证 refresh_token 的有效性
    // 这里返回新的 token 对，前端会更新本地存储
    const newAccessToken = `token_refreshed_${Date.now()}`;
    const newRefreshToken = `rt_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return NextResponse.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 7 * 24 * 60 * 60, // 7天（秒）
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
