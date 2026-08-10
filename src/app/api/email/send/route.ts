// ============================================================================
// POST /api/email/send - 发送邮件验证码
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/emailService";
import { setCode, canResend, generateCode } from "@/lib/verificationStore";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // 邮箱格式校验
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "请输入正确的邮箱地址" },
        { status: 400 }
      );
    }

    // 频率限制
    if (!canResend(`email:${email}`)) {
      return NextResponse.json(
        { success: false, message: "发送过于频繁，请60秒后再试" },
        { status: 429 }
      );
    }

    // 生成6位验证码
    const code = generateCode();

    // 发送邮件
    const result = await sendEmail(email, code);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    // 存储验证码（5分钟有效）
    setCode(`email:${email}`, code, 300000);

    return NextResponse.json({
      success: true,
      message: "验证码已发送",
    });
  } catch (error) {
    console.error("[API /email/send] error:", error);
    return NextResponse.json(
      { success: false, message: "服务异常，请稍后重试" },
      { status: 500 }
    );
  }
}