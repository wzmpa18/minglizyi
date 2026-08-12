// ============================================================================
// 言道国学 - 后台数据看板统计 API
// GET /api/admin/stats  获取完整数据看板统计（需 Bearer Token 鉴权）
// 支持查询参数 ?section=user|invite|pageViews|membership|aiUsage 获取单维度
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin/auth";
import { getDashboardStats } from "@/lib/admin/statsService";

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section");

    const stats = await getDashboardStats();

    // 支持按维度筛选，便于页面按需加载
    if (section && section in stats) {
      return NextResponse.json({
        success: true,
        data: { [section]: stats[section as keyof typeof stats] },
        generatedAt: stats.generatedAt,
      });
    }

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("[AdminStats] error:", error);
    return NextResponse.json(
      { success: false, error: `统计数据获取失败: ${error.message}` },
      { status: 500 }
    );
  }
}
