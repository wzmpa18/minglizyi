// ============================================================================
// 统一支付路由器 - v20.4
// 根据传入的 channel 参数（"wechat" | "alipay"）路由到对应支付通道
// 对外接口统一，内部自动处理渠道差异
// ============================================================================

import {
  Order,
  PaymentChannel,
  PaymentResult,
  PaymentQueryResult,
  PaymentCloseResult,
  CallbackVerifyResult,
  CallbackData,
} from "./paymentTypes";
import { wechatPay } from "./wechatPay";
import { alipay } from "./alipay";

// ==================== 渠道配置扩展参数 ====================

/**
 * 微信支付下单附加参数
 */
export interface WechatPayOptions {
  /** JSAPI 支付所需的用户 openid */
  openid?: string;
  /** 支付回调地址 */
  notifyUrl?: string;
}

/**
 * 支付宝下单附加参数
 */
export interface AlipayOptions {
  /** 支付宝异步回调地址 */
  notifyUrl?: string;
  /** 支付宝同步跳转地址 */
  returnUrl?: string;
  /** 是否手机网站支付 */
  wap?: boolean;
}

/**
 * 统一下单附加参数（按渠道区分）
 */
export interface CreatePaymentOptions {
  wechat?: WechatPayOptions;
  alipay?: AlipayOptions;
}

// ==================== 路由器实现 ====================

/**
 * 统一创建支付
 * 根据 channel 路由到微信支付或支付宝
 *
 * @param channel 支付渠道
 * @param order   统一订单对象
 * @param options 渠道附加参数
 * @returns 支付结果
 */
export async function createPayment(
  channel: PaymentChannel,
  order: Order,
  options?: CreatePaymentOptions
): Promise<PaymentResult> {
  switch (channel) {
    case "wechat":
      return wechatPay.createPayment(
        order,
        options?.wechat?.openid,
        options?.wechat?.notifyUrl
      );

    case "alipay":
      return alipay.createPayment(
        order,
        options?.alipay?.notifyUrl,
        options?.alipay?.returnUrl,
        options?.alipay?.wap ?? false
      );

    default:
      return {
        success: false,
        error: `不支持的支付渠道: ${channel}`,
      };
  }
}

/**
 * 统一查询支付状态
 * 根据 channel 路由到微信支付或支付宝
 *
 * @param channel 支付渠道
 * @param orderId 商户订单号
 * @returns 查询结果
 */
export async function queryPayment(
  channel: PaymentChannel,
  orderId: string
): Promise<PaymentQueryResult> {
  switch (channel) {
    case "wechat":
      return wechatPay.queryPayment(orderId);

    case "alipay":
      return alipay.queryPayment(orderId);

    default:
      return {
        success: false,
        status: null,
        error: `不支持的支付渠道: ${channel}`,
      };
  }
}

/**
 * 统一关闭支付
 * 根据 channel 路由到微信支付或支付宝
 *
 * @param channel 支付渠道
 * @param orderId 商户订单号
 * @returns 关闭结果
 */
export async function closePayment(
  channel: PaymentChannel,
  orderId: string
): Promise<PaymentCloseResult> {
  switch (channel) {
    case "wechat":
      return wechatPay.closePayment(orderId);

    case "alipay":
      return alipay.closePayment(orderId);

    default:
      return {
        success: false,
        error: `不支持的支付渠道: ${channel}`,
      };
  }
}

/**
 * 统一处理回调
 * 根据 channel 路由到微信支付或支付宝进行验签
 *
 * @param channel 支付渠道
 * @param data    回调原始数据（headers + body）
 * @returns 验签结果
 */
export async function handleCallback(
  channel: PaymentChannel,
  data: CallbackData
): Promise<CallbackVerifyResult> {
  switch (channel) {
    case "wechat":
      return wechatPay.handleCallback(data);

    case "alipay":
      return alipay.handleCallback(data);

    default:
      return {
        success: false,
        error: `不支持的支付渠道: ${channel}`,
      };
  }
}

// ==================== 渠道可用性检查 ====================

/**
 * 检查指定渠道是否已配置
 */
export function isChannelConfigured(channel: PaymentChannel): boolean {
  switch (channel) {
    case "wechat":
      return wechatPay.isConfigured();
    case "alipay":
      return alipay.isConfigured();
    default:
      return false;
  }
}

/**
 * 获取所有渠道的配置状态
 */
export function getChannelStatus(): Record<PaymentChannel, boolean> {
  return {
    wechat: wechatPay.isConfigured(),
    alipay: alipay.isConfigured(),
  };
}

// ==================== 导出 ====================

export const paymentRouter = {
  createPayment,
  queryPayment,
  closePayment,
  handleCallback,
  isChannelConfigured,
  getChannelStatus,
};
