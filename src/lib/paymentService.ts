"use client";

// ============================================================================
// 前端支付服务层 - v20.4
// 功能：发起支付、选择支付渠道、支付状态轮询、支付成功后刷新用户权益
// 当前为预留实现，支付通道开放后可直接对接
// ============================================================================

import { getUserProfile } from "./auth";
import { isPaymentsBlocked, IOS_PAYMENT_DISABLED_TIP, clientPlatformHeaders } from "./platformGate";

// ==================== 类型定义 ====================

/**
 * 支付场景类型（与后端 OrderType 保持一致）
 */
export type PaymentScenario =
  | "SINGLE_UNLOCK"
  | "MEMBERSHIP"
  | "POINTS_RECHARGE"
  | "CONSULT_SERVICE";

/**
 * 支付渠道
 */
export type PaymentChannel = "wechat" | "alipay";

/**
 * 发起支付的请求参数
 */
export interface CallPaymentParams {
  /** 支付场景 */
  type: PaymentScenario;
  /** 金额（元） */
  amount: number;
  /** 订单标题（不传使用合规口径默认标题） */
  title?: string;
  /** 支付渠道（默认让用户选择） */
  channel?: PaymentChannel;
  /** 业务扩展参数 */
  extra?: {
    unlockTargetId?: string;
    membershipLevel?: string;
    membershipDays?: number;
    pointsAmount?: number;
    /** CONSULT_SERVICE: 咨询服务ID / 服务者ID / 需求描述 */
    consultServiceId?: string;
    consultProviderId?: string;
    consultRequirement?: string;
    openid?: string;
    returnUrl?: string;
  };
}

/**
 * 发起支付的返回结果
 */
export interface CallPaymentResult {
  success: boolean;
  orderId?: string;
  channel?: PaymentChannel;
  payUrl?: string;
  prepayId?: string;
  jsapiParams?: Record<string, string>;
  message?: string;
  error?: string;
}

/**
 * 支付状态轮询结果
 */
export interface PaymentStatusResult {
  success: boolean;
  status: "PENDING" | "PAID" | "CLOSED" | "REFUNDED" | "UNKNOWN";
  orderId: string;
  paidAt?: string | null;
  error?: string;
}

/**
 * 支付渠道可用性
 */
export interface ChannelAvailability {
  wechat: boolean;
  alipay: boolean;
  anyEnabled: boolean;
}

// ==================== 合规口径常量（前端镜像） ====================

/**
 * 合规口径标题（与后端 paymentTypes.ts 保持一致）
 */
export const COMPLIANCE_TITLES: Record<PaymentScenario, string> = {
  SINGLE_UNLOCK: "传统文化学习资料深度解读（单次）",
  MEMBERSHIP: "传统文化学习平台会员服务",
  POINTS_RECHARGE: "传统文化学习平台积分充值",
  CONSULT_SERVICE: "传统文化学习顾问咨询服务",
};

// ==================== 配置常量 ====================

/**
 * 轮询配置
 */
const POLL_CONFIG = {
  /** 轮询间隔（毫秒） */
  interval: 2000,
  /** 最大轮询次数 */
  maxAttempts: 60,
  /** 总超时时间（毫秒） */
  timeout: 120000,
};

/**
 * API 基础路径
 */
const API_BASE = "/api/payment";

// ==================== 内部工具函数 ====================

function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  const profile = getUserProfile();
  return profile?.userId || null;
}

// ==================== 核心接口 ====================

/**
 * 发起支付
 *
 * 流程：
 * 1. 调用后端 /api/payment/create 创建订单并获取支付参数
 * 2. 根据渠道调起微信/支付宝支付
 * 3. 支付完成后轮询订单状态
 * 4. 支付成功后刷新用户权益
 *
 * @param params 支付参数
 * @returns 支付发起结果
 */
export async function callPayment(
  params: CallPaymentParams
): Promise<CallPaymentResult> {
  // FINAL-RC-02: 平台付费关闭（iOS 本期不开放任何付费），请求层直接拦截
  if (isPaymentsBlocked()) {
    return {
      success: false,
      error: IOS_PAYMENT_DISABLED_TIP,
      message: IOS_PAYMENT_DISABLED_TIP,
    };
  }

  const userId = getCurrentUserId();
  if (!userId) {
    return {
      success: false,
      error: "请先登录",
    };
  }

  const { type, amount, title, channel, extra } = params;

  // 参数校验
  if (!type) {
    return { success: false, error: "缺少支付场景类型" };
  }
  if (typeof amount !== "number" || amount <= 0) {
    return { success: false, error: "金额必须大于 0" };
  }

  try {
    // 1. 创建订单
    const res = await fetch(`${API_BASE}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientPlatformHeaders() },
      body: JSON.stringify({
        userId,
        type,
        amount,
        title: title || COMPLIANCE_TITLES[type],
        channel,
        extra,
      }),
    });

    const json = await res.json();

    if (!json.success) {
      return {
        success: false,
        message: json.message || "支付通道即将开放",
        error: json.message || "创建订单失败",
      };
    }

    const data = json.data || {};

    // 2. 根据渠道调起支付
    const resultChannel = data.channel || channel;
    if (resultChannel === "wechat" && data.jsapiParams) {
      // 调起微信 JSAPI 支付
      await invokeWechatPay(data.jsapiParams);
    } else if (resultChannel === "alipay" && data.payUrl) {
      // 跳转支付宝支付页面
      window.location.href = data.payUrl;
    }

    return {
      success: true,
      orderId: data.orderId,
      channel: resultChannel,
      payUrl: data.payUrl,
      prepayId: data.prepayId,
      jsapiParams: data.jsapiParams,
      message: "订单创建成功",
    };
  } catch {
    return {
      success: false,
      error: "网络异常，请稍后重试",
    };
  }
}

/**
 * 调起微信 JSAPI 支付
 * 通过 WeixinJSBridge 调起微信支付
 */
async function invokeWechatPay(
  jsapiParams: Record<string, string>
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("非浏览器环境"));
      return;
    }

    const wx = (window as unknown as { WeixinJSBridge?: { invoke: Function } });

    if (typeof wx.WeixinJSBridge === "undefined") {
      reject(new Error("微信 JSAPI 环境不可用"));
      return;
    }

    wx.WeixinJSBridge!.invoke(
      "getBrandWCPayRequest",
      {
        appId: jsapiParams.appId,
        timeStamp: jsapiParams.timeStamp,
        nonceStr: jsapiParams.nonceStr,
        package: jsapiParams.package,
        signType: jsapiParams.signType,
        paySign: jsapiParams.paySign,
      },
      (response: { err_msg: string }) => {
        if (response.err_msg === "get_brand_wcpay_request:ok") {
          resolve();
        } else {
          reject(new Error(`微信支付失败: ${response.err_msg}`));
        }
      }
    );
  });
}

// ==================== 支付状态轮询 ====================

/**
 * 轮询支付状态
 *
 * 定期查询订单状态，直到支付成功或超时
 *
 * @param orderId    订单号
 * @param onProgress 状态变化回调（可选）
 * @returns 最终支付状态
 */
export async function pollPaymentStatus(
  orderId: string,
  onProgress?: (result: PaymentStatusResult) => void
): Promise<PaymentStatusResult> {
  if (!orderId) {
    return {
      success: false,
      status: "UNKNOWN",
      orderId: "",
      error: "缺少订单号",
    };
  }

  const startTime = Date.now();
  let attempts = 0;

  return new Promise<PaymentStatusResult>((resolve) => {
    const timer = setInterval(async () => {
      attempts++;

      // 超时检查
      if (Date.now() - startTime > POLL_CONFIG.timeout) {
        clearInterval(timer);
        resolve({
          success: false,
          status: "UNKNOWN",
          orderId,
          error: "支付超时，请稍后查询订单状态",
        });
        return;
      }

      // 最大轮询次数检查
      if (attempts > POLL_CONFIG.maxAttempts) {
        clearInterval(timer);
        resolve({
          success: false,
          status: "UNKNOWN",
          orderId,
          error: "轮询超时，请稍后查询订单状态",
        });
        return;
      }

      try {
        const result = await queryPaymentStatus(orderId);

        // 回调通知进度
        if (onProgress) {
          onProgress(result);
        }

        // 支付成功
        if (result.status === "PAID") {
          clearInterval(timer);
          // 刷新用户权益
          await refreshUserBenefits();
          resolve(result);
          return;
        }

        // 订单已关闭或已退款，终止轮询
        if (result.status === "CLOSED" || result.status === "REFUNDED") {
          clearInterval(timer);
          resolve(result);
          return;
        }
      } catch {
        // 单次查询失败不中断轮询
      }
    }, POLL_CONFIG.interval);
  });
}

/**
 * 查询单次支付状态
 */
export async function queryPaymentStatus(
  orderId: string
): Promise<PaymentStatusResult> {
  try {
    const res = await fetch(`${API_BASE}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });

    const json = await res.json();

    if (!json.success) {
      return {
        success: false,
        status: "UNKNOWN",
        orderId,
        error: json.message || "查询失败",
      };
    }

    const data = json.data || {};
    return {
      success: true,
      status: data.status || "PENDING",
      orderId,
      paidAt: data.paidAt || null,
    };
  } catch {
    return {
      success: false,
      status: "UNKNOWN",
      orderId,
      error: "网络异常",
    };
  }
}

// ==================== 关闭订单 ====================

/**
 * 关闭未支付订单
 */
export async function closePayment(
  orderId: string,
  channel?: PaymentChannel
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, channel }),
    });
    const json = await res.json();
    return {
      success: json.success,
      message: json.message,
      error: json.success ? undefined : json.message,
    };
  } catch {
    return { success: false, error: "网络异常" };
  }
}

// ==================== 支付渠道可用性查询 ====================

/**
 * 查询支付渠道可用性
 * 返回各渠道是否已配置
 */
export async function getChannelAvailability(): Promise<ChannelAvailability> {
  try {
    // 通过创建一个测试请求来探测渠道状态
    // 后端在通道未启用时会返回 channels 状态
    const res = await fetch(`${API_BASE}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "probe",
        type: "MEMBERSHIP",
        amount: 0.01,
      }),
    });
    const json = await res.json();

    if (json.data && json.data.channels) {
      return {
        wechat: !!json.data.channels.wechat,
        alipay: !!json.data.channels.alipay,
        anyEnabled: !!json.data.enabled,
      };
    }

    return {
      wechat: false,
      alipay: false,
      anyEnabled: false,
    };
  } catch {
    return {
      wechat: false,
      alipay: false,
      anyEnabled: false,
    };
  }
}

// ==================== 支付成功后刷新权益 ====================

/**
 * 支付成功后刷新用户权益
 *
 * 根据支付场景刷新对应的权益数据：
 * - SINGLE_UNLOCK: 刷新解锁状态
 * - MEMBERSHIP: 刷新会员状态
 * - POINTS_RECHARGE: 刷新积分余额
 */
export async function refreshUserBenefits(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // 动态导入相关 store，避免循环依赖
    // 刷新会员状态
    try {
      const { getMembershipStatus } = await import("./membershipStore");
      getMembershipStatus();
    } catch {
      // 忽略
    }

    // 刷新积分余额
    try {
      const { getPointsBalance } = await import("./pointsStore");
      getPointsBalance();
    } catch {
      // 忽略
    }

    // 刷新钱包信息
    try {
      // 触发 storage 事件通知其他组件刷新
      window.dispatchEvent(new Event("storage"));
    } catch {
      // 忽略
    }

    // 刷新用户 profile（可能包含会员等级变化）
    window.dispatchEvent(
      new CustomEvent("payment-success", { detail: { timestamp: Date.now() } })
    );
  } catch {
    // 忽略刷新失败
  }
}

// ==================== 便捷方法 ====================

/**
 * 发起单次解锁支付
 */
export async function payForUnlock(
  targetId: string,
  amount: number
): Promise<CallPaymentResult> {
  return callPayment({
    type: "SINGLE_UNLOCK",
    amount,
    extra: { unlockTargetId: targetId },
  });
}

/**
 * 发起会员开通支付
 */
export async function payForMembership(
  level: string,
  amount: number,
  days: number
): Promise<CallPaymentResult> {
  return callPayment({
    type: "MEMBERSHIP",
    amount,
    extra: { membershipLevel: level, membershipDays: days },
  });
}

/**
 * 发起积分充值支付
 */
export async function payForPointsRecharge(
  amount: number,
  pointsAmount: number
): Promise<CallPaymentResult> {
  return callPayment({
    type: "POINTS_RECHARGE",
    amount,
    extra: { pointsAmount },
  });
}

/**
 * 发起真人咨询服务预约支付（P6-TOOL-04 §3.3）
 * 订单走统一 CONSULT_SERVICE 场景；支付成功后由调用方
 * 以返回的 orderId 登记 consultServiceStore 履约台账。
 */
export async function payForConsultService(
  serviceId: string,
  providerId: string,
  amount: number,
  requirement: string
): Promise<CallPaymentResult> {
  return callPayment({
    type: "CONSULT_SERVICE",
    amount,
    extra: {
      consultServiceId: serviceId,
      consultProviderId: providerId,
      consultRequirement: requirement.slice(0, 500),
    },
  });
}

/**
 * 发起支付并自动轮询直到完成
 */
export async function callPaymentAndWait(
  params: CallPaymentParams,
  onProgress?: (result: PaymentStatusResult) => void
): Promise<{ payment: CallPaymentResult; status: PaymentStatusResult | null }> {
  const payment = await callPayment(params);

  if (!payment.success || !payment.orderId) {
    return { payment, status: null };
  }

  const status = await pollPaymentStatus(payment.orderId, onProgress);
  return { payment, status };
}
