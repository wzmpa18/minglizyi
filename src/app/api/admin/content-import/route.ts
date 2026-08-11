/**
 * ============================================================================
 * 混元AI内容导入 API - v20.4
 * ============================================================================
 *
 * 管理员通过此API调用混元AI自动生成中医/易学内容并保存到服务器
 *
 * 接口：
 *   POST /api/admin/content-import
 *   Body: { type: "tcm_classic" | "yixue_exam" | "zhongyi_exam", params: {...} }
 *
 * 安全：需要管理员密钥验证
 *
 * 创建日期：2026-08-11
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateTCMClassic,
  generateYixueQuestions,
  generateZhongyiQuestions,
  isHunyuanConfigured,
  getHunyuanStatus,
} from "@/lib/hunyuanAI";
import { saveImportedContent } from "@/lib/contentImportService";

export const dynamic = "force-dynamic";

const ADMIN_KEY = process.env.ADMIN_API_KEY || "WUzhimin123";

/** 验证管理员权限 */
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === ADMIN_KEY;
}

/**
 * GET - 获取混元AI配置状态
 */
export async function GET(request: NextRequest) {
  const status = getHunyuanStatus();
  return NextResponse.json({
    success: true,
    data: {
      hunyuan: status,
      adminVerified: verifyAdmin(request),
    },
  });
}

/**
 * POST - 执行内容导入
 */
export async function POST(request: NextRequest) {
  // 验证管理员权限
  if (!verifyAdmin(request)) {
    return NextResponse.json(
      { success: false, error: "未授权访问" },
      { status: 401 }
    );
  }

  // 检查混元AI是否配置
  if (!isHunyuanConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: "混元AI密钥未配置，请在服务器环境变量中设置 HUNYUAN_API_KEY",
      },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { type, params } = body;

    let result;

    switch (type) {
      case "tcm_classic": {
        // 生成中医典籍
        result = await generateTCMClassic(params?.classicName);
        if (result.success && result.data) {
          const saved = await saveImportedContent("tcm_classic", result.data);
          return NextResponse.json({
            success: true,
            message: `典籍《${result.data.title}》已生成并保存`,
            data: { classic: result.data, saved },
          });
        }
        break;
      }

      case "yixue_exam": {
        // 生成易学题目（古籍经典类，不涉及排盘算法）
        result = await generateYixueQuestions(
          params?.difficulty || "intermediate",
          params?.count || 10
        );
        if (result.success && result.data) {
          const saved = await saveImportedContent("yixue_exam", result.data);
          return NextResponse.json({
            success: true,
            message: `已生成${result.data.length}道易学题目并保存`,
            data: { questions: result.data, saved },
          });
        }
        break;
      }

      case "zhongyi_exam": {
        // 生成中医题目
        result = await generateZhongyiQuestions(
          params?.difficulty || "intermediate",
          params?.count || 10
        );
        if (result.success && result.data) {
          const saved = await saveImportedContent("zhongyi_exam", result.data);
          return NextResponse.json({
            success: true,
            message: `已生成${result.data.length}道中医题目并保存`,
            data: { questions: result.data, saved },
          });
        }
        break;
      }

      case "batch_import": {
        // 批量导入：一次生成多种内容
        const results: any[] = [];

        // 1. 生成一部典籍
        const classicResult = await generateTCMClassic(params?.classicName);
        if (classicResult.success && classicResult.data) {
          const saved = await saveImportedContent("tcm_classic", classicResult.data);
          results.push({
            type: "tcm_classic",
            title: classicResult.data.title,
            saved,
          });
        }

        // 2. 生成易学题目
        const yixueResult = await generateYixueQuestions("intermediate", 10);
        if (yixueResult.success && yixueResult.data) {
          const saved = await saveImportedContent("yixue_exam", yixueResult.data);
          results.push({
            type: "yixue_exam",
            count: yixueResult.data.length,
            saved,
          });
        }

        // 3. 生成中医题目
        const zhongyiResult = await generateZhongyiQuestions("intermediate", 10);
        if (zhongyiResult.success && zhongyiResult.data) {
          const saved = await saveImportedContent("zhongyi_exam", zhongyiResult.data);
          results.push({
            type: "zhongyi_exam",
            count: zhongyiResult.data.length,
            saved,
          });
        }

        return NextResponse.json({
          success: true,
          message: `批量导入完成，共生成${results.length}类内容`,
          data: { results },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `未知导入类型: ${type}` },
          { status: 400 }
        );
    }

    // 如果执行到这里，说明生成失败
    return NextResponse.json(
      { success: false, error: result?.error || "内容生成失败" },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("[ContentImport] error:", error);
    return NextResponse.json(
      { success: false, error: `导入失败: ${error.message}` },
      { status: 500 }
    );
  }
}
