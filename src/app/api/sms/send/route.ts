// ============================================================================
// POST /api/sms/send - 发送短信验证码
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { sendSms } from "@/lib/smsService";
import { setCode, canResend, generateCode } from "@/lib/verificationStore";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    // 手机号格式校验
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: "请输入正确的手机号" },
        { status: 400 }
      );
    }

    // 频率限制：60秒内不能重复发送
    if (!canResend(`sms:${phone}`)) {
      return NextResponse.json(
        { success: false, message: "发送过于频繁，请60秒后再试" },
        { status: 429 }
      );
    }

    // 生成6位验证码
    const code = generateCode();

    // 调用腾讯云短信发送
    const result = await sendSms(phone, code);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    // 存储验证码到服务端（5分钟有效）
    setCode(`sms:${phone}`, code, 300000);

    return NextResponse.json({
      success: true,
      message: "验证码已发送",
    });
  } catch (error) {
    console.error("[API /sms/send] error:", error);
    return NextResponse.json(
      { success: false, message: "服务异常，请稍后重试" },
      { status: 500 }
    );
  }
}