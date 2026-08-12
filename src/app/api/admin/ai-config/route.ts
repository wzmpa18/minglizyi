// ============================================================================
// 言道国学 - AI 功能管控 API
// GET    /api/admin/ai-config          获取 AI 配置（需鉴权）
// PUT    /api/admin/ai-config          整体保存 AI 配置
// PATCH  /api/admin/ai-config          局部更新（开关/工具/配额/增量包）
// 所有接口均需 Bearer Token 鉴权（ADMIN_API_KEY）
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse, safeParseBody } from "@/lib/admin/auth";
import {
  getAIConfig,
  saveAIConfig,
  updateAIConfig,
} from "@/lib/admin/configStore";
import type { AIConfig, AIToolConfig, IncrementalPackageConfig, AIQuotaConfig } from "@/lib/admin/types";

/**
 * GET - 获取当前 AI 配置
 */
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return unauthorizedResponse();
  }
  try {
    const config = await getAIConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    console.error("[AIConfig GET] error:", error);
    return NextResponse.json(
      { success: false, error: `获取AI配置失败: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * PUT - 整体保存 AI 配置
 */
export async function PUT(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return unauthorizedResponse();
  }
  try {
    const body = await safeParseBody<AIConfig>(request);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "请求体格式错误" },
        { status: 400 }
      );
    }
    await saveAIConfig(body);
    return NextResponse.json({
      success: true,
      data: body,
      message: "AI 配置已保存",
    });
  } catch (error: any) {
    console.error("[AIConfig PUT] error:", error);
    return NextResponse.json(
      { success: false, error: `保存AI配置失败: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * PATCH - 局部更新 AI 配置
 * 支持以下操作（请求体字段）：
 *   { globalEnabled: boolean }                        更新全局开关
 *   { toolId: string, toggleTool: true }              切换工具开关
 *   { toolId: string, toolPatch: Partial<AIToolConfig> } 更新单个工具
 *   { quotas: AIQuotaConfig }                         更新会员配额
 *   { packageId: string, packagePatch: Partial<IncrementalPackageConfig> } 更新增量包
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

    const current = await getAIConfig();
    let updated = current;
    let message = "AI 配置已更新";

    // 1. 全局开关
    if (typeof body.globalEnabled === "boolean") {
      updated = await updateAIConfig({ globalEnabled: body.globalEnabled });
      message = `AI 全局功能已${body.globalEnabled ? "开启" : "关闭"}`;
    }

    // 2. 切换工具开关
    if (body.toolId && body.toggleTool) {
      const tools = updated.tools.map((t) =>
        t.id === body.toolId ? { ...t, enabled: !t.enabled } : t
      );
      updated = await updateAIConfig({ tools });
      const tool = tools.find((t) => t.id === body.toolId);
      message = `工具「${tool?.name || body.toolId}」已${tool?.enabled ? "开启" : "关闭"}`;
    }

    // 3. 更新单个工具配置
    if (body.toolId && body.toolPatch && typeof body.toolPatch === "object") {
      const tools = updated.tools.map((t) =>
        t.id === body.toolId
          ? { ...t, ...body.toolPatch as Partial<AIToolConfig> }
          : t
      );
      updated = await updateAIConfig({ tools });
      message = `工具「${body.toolId}」配置已更新`;
    }

    // 4. 更新会员配额
    if (body.quotas && typeof body.quotas === "object") {
      const quotas = { ...updated.quotas, ...(body.quotas as AIQuotaConfig) };
      updated = await updateAIConfig({ quotas });
      message = "AI 会员配额已更新";
    }

    // 5. 更新增量包
    if (body.packageId && body.packagePatch && typeof body.packagePatch === "object") {
      const packages = updated.packages.map((p) =>
        p.id === body.packageId
          ? { ...p, ...body.packagePatch as Partial<IncrementalPackageConfig> }
          : p
      );
      updated = await updateAIConfig({ packages });
      message = `增量包「${body.packageId}」配置已更新`;
    }

    return NextResponse.json({ success: true, data: updated, message });
  } catch (error: any) {
    console.error("[AIConfig PATCH] error:", error);
    return NextResponse.json(
      { success: false, error: `更新AI配置失败: ${error.message}` },
      { status: 500 }
    );
  }
}
