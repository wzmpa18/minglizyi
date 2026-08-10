// ============================================================================
// POST /api/sms/verify - 校验短信验证码
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyCode } from "@/lib/verificationStore";

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, message: "参数不完整" },
        { status: 400 }
      );
    }

    const valid = verifyCode(`sms:${phone}`, code);

    if (!valid) {
      return NextResponse.json(
        { success: false, message: "验证码错误或已过期" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "验证通过" });
  } catch (error) {
    console.error("[API /sms/verify] error:", error);
    return NextResponse.json(
      { success: false, message: "服务异常" },
      { status: 500 }
    );
  }
}