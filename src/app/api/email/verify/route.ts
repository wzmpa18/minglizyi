// ============================================================================
// POST /api/email/verify - 校验邮件验证码
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyCode } from "@/lib/verificationStore";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: "参数不完整" },
        { status: 400 }
      );
    }

    const valid = verifyCode(`email:${email}`, code);

    if (!valid) {
      return NextResponse.json(
        { success: false, message: "验证码错误或已过期" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "验证通过" });
  } catch (error) {
    console.error("[API /email/verify] error:", error);
    return NextResponse.json(
      { success: false, message: "服务异常" },
      { status: 500 }
    );
  }
}