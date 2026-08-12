// ============================================================================
// 言道国学 - 会员收费板块管理 API
// GET    /api/admin/membership-config          获取会员配置（需鉴权）
// PUT    /api/admin/membership-config          整体保存会员配置
// PATCH  /api/admin/membership-config          局部更新（套餐/上下架/合规口径）
// 所有接口均需 Bearer Token 鉴权（ADMIN_API_KEY）
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse, safeParseBody } from "@/lib/admin/auth";
import {
  getMembershipConfig,
  saveMembershipConfig,
  updateMembershipPlan,
  toggleMembershipPlan,
} from "@/lib/admin/configStore";
import type { MembershipConfig, MembershipPlanConfig, MemberLevel } from "@/lib/admin/types";

/**
 * GET - 获取当前会员配置
 */
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return unauthorizedResponse();
  }
  try {
    const config = await getMembershipConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    console.error("[MembershipConfig GET] error:", error);
    return NextResponse.json(
      { success: false, error: `获取会员配置失败: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * PUT - 整体保存会员配置
 */
export async function PUT(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return unauthorizedResponse();
  }
  try {
    const body = await safeParseBody<MembershipConfig>(request);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "请求体格式错误" },
        { status: 400 }
      );
    }
    await saveMembershipConfig(body);
    return NextResponse.json({
      success: true,
      data: body,
      message: "会员配置已保存",
    });
  } catch (error: any) {
    console.error("[MembershipConfig PUT] error:", error);
    return NextResponse.json(
      { success: false, error: `保存会员配置失败: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * PATCH - 局部更新会员配置
 * 支持以下操作（请求体字段）：
 *   { level: MemberLevel, togglePlan: true }                  切换套餐上下架
 *   { level: MemberLevel, planPatch: Partial<MembershipPlanConfig> } 更新单个套餐
 *   { complianceLabel: string }                                更新合规口径
 */
export async function PATCH(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return unauthorizedResponse();
  }
  try {
    const body = await safeParseBody<Record<string, any>>(request);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "请求体格式错误" },
        { status: 400 }
      );
    }

    let config: MembershipConfig;
    let message = "会员配置已更新";

    // 1. 切换套餐上下架
    if (body.level && body.togglePlan) {
      config = await toggleMembershipPlan(body.level as MemberLevel);
      const plan = config.plans.find((p) => p.level === body.level);
      message = `套餐「${plan?.name || body.level}」已${plan?.enabled ? "上架" : "下架"}`;
    }
    // 2. 更新单个套餐
    else if (body.level && body.planPatch && typeof body.planPatch === "object") {
      config = await updateMembershipPlan(
        body.level as MemberLevel,
        body.planPatch as Partial<MembershipPlanConfig>
      );
      message = `套餐「${body.level}」配置已更新`;
    }
    // 3. 更新合规口径
    else if (typeof body.complianceLabel === "string") {
      const current = await getMembershipConfig();
      current.complianceLabel = body.complianceLabel;
      await saveMembershipConfig(current);
      config = current;
      message = "合规口径已更新";
    } else {
      return NextResponse.json(
        { success: false, error: "未识别的更新操作" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: config, message });
  } catch (error: any) {
    console.error("[MembershipConfig PATCH] error:", error);
    return NextResponse.json(
      { success: false, error: `更新会员配置失败: ${error.message}` },
      { status: 500 }
    );
  }
}
