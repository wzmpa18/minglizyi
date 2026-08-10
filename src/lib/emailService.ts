// ============================================================================
// 邮件服务 - v20.2 修复版
// v20.2起：直接调用后端 ai-proxy-server.js 的 /api/auth/send-code 接口
// 不再走 Next.js API Route（output:"export" 静态导出下 API Route 不执行）
// 不再存在循环依赖问题
// ============================================================================

/** 后端 API 基础地址 */
const API_BASE_URL = "https://yandaoguoxue.vip";

export interface EmailResult {
  success: boolean;
  message: string;
}

/**
 * 发送邮件验证码（直接调用后端 /api/auth/send-code）
 * 后端负责验证码生成、频率限制、AWS SES 邮件发送
 *
 * @param email 收件人邮箱
 * @param code  验证码（保留参数，实际由后端生成，仅为接口兼容）
 * @returns 发送结果
 */
export async function sendEmail(
  email: string,
  code?: string
): Promise<EmailResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/send-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    return {
      success: data.success,
      message: data.message || "发送失败",
    };
  } catch (error) {
    console.error("[EMAIL] 请求后端失败:", error);
    return { success: false, message: "邮件服务异常，请稍后重试" };
  }
}
