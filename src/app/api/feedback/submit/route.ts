/**
 * ============================================================================
 * 用户反馈提交 API - v20.4
 * ============================================================================
 *
 * POST /api/feedback/submit  - 提交用户反馈
 * GET  /api/feedback/list     - 获取用户反馈列表
 *
 * 反馈数据保存到服务器 /data/feedback/ 目录
 *
 * 创建日期：2026-08-11
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const FEEDBACK_DIR = path.join(process.cwd(), "data", "feedback");
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, "feedbacks.json");

/** 确保目录和文件存在 */
async function ensureStorage(): Promise<void> {
  await fs.mkdir(FEEDBACK_DIR, { recursive: true });
  try {
    await fs.access(FEEDBACK_FILE);
  } catch {
    await fs.writeFile(FEEDBACK_FILE, "[]", "utf-8");
  }
}

/** 读取所有反馈 */
async function readAllFeedbacks(): Promise<any[]> {
  await ensureStorage();
  try {
    const content = await fs.readFile(FEEDBACK_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/** 写入所有反馈 */
async function writeAllFeedbacks(feedbacks: any[]): Promise<void> {
  await ensureStorage();
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2), "utf-8");
}

/**
 * POST - 提交反馈
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.type || !body.title || !body.description) {
      return NextResponse.json(
        { success: false, error: "请填写反馈类型、标题和描述" },
        { status: 400 }
      );
    }

    if (body.description.length < 5) {
      return NextResponse.json(
        { success: false, error: "请至少描述5个字" },
        { status: 400 }
      );
    }

    // 限制描述长度
    if (body.description.length > 2000) {
      return NextResponse.json(
        { success: false, error: "描述内容不能超过2000字" },
        { status: 400 }
      );
    }

    // 限制截图数量
    if (body.screenshots && body.screenshots.length > 3) {
      body.screenshots = body.screenshots.slice(0, 3);
    }

    const feedback = {
      id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: body.userId || "anonymous",
      userName: body.userName || "匿名用户",
      type: body.type,
      title: body.title.slice(0, 100),
      description: body.description.slice(0, 2000),
      contact: body.contact?.slice(0, 100) || "",
      deviceInfo: body.deviceInfo || "",
      appVersion: body.appVersion || "",
      screenshots: body.screenshots || [],
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // 保存到服务器
    const feedbacks = await readAllFeedbacks();
    feedbacks.unshift(feedback);

    // 限制总反馈数量为5000条
    const trimmed = feedbacks.slice(0, 5000);
    await writeAllFeedbacks(trimmed);

    console.log(`[Feedback] New feedback: ${feedback.id} - ${feedback.title}`);

    return NextResponse.json({
      success: true,
      message: "反馈已提交，我们会尽快处理",
      feedbackId: feedback.id,
    });
  } catch (error: any) {
    console.error("[Feedback] submit error:", error);
    return NextResponse.json(
      { success: false, error: "提交失败，请稍后重试" },
      { status: 500 }
    );
  }
}

/**
 * GET - 获取用户反馈列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const feedbacks = await readAllFeedbacks();

    // 按用户过滤
    const filtered = userId
      ? feedbacks.filter((f) => f.userId === userId)
      : feedbacks;

    return NextResponse.json({
      success: true,
      feedbacks: filtered,
      total: filtered.length,
    });
  } catch (error: any) {
    console.error("[Feedback] list error:", error);
    return NextResponse.json(
      { success: false, error: "获取反馈列表失败" },
      { status: 500 }
    );
  }
}
