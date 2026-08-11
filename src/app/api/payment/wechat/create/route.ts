// ============================================================================
// 微信支付 JSAPI 下单接口
// POST /api/payment/wechat/create
//
// 流程：
//   1. 接收前端支付请求（userId, type, amount, title, extra）
//   2. 在系统中创建订单记录（PENDING 状态）
//   3. 调用微信支付 v3 统一下单接口获取 prepay_id
//   4. 组装并返回 JSAPI 调起参数（appId, timeStamp, nonceStr, package, signType, paySign）
//
// 所有支付金额商品描述统一标注「传统文化学习服务」以确保合规
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import {
  createOrder as createWechatOrder,
  isConfigured as isWechatConfigured,
  type JsapiParams,
} from "@/lib/wechatPay";
import {
  createOrder as createOrderRecord,
} from "@/lib/payment/orderService";
import {
  OrderType,
  OrderStatus,
  PaymentChannel,
  getComplianceTitle,
  getComplianceDescription,
  MEMBERSHIP_DURATION,
  PAYMENT_COMPLIANCE_TEXT,
  type OrderExtra,
} from "@/lib/payment/paymentTypes";

// 使用 Node.js 运行时（需要 crypto / fs 模块）
export const runtime = "nodejs";

// ==================== 类型定义 ====================

interface CreateOrderRequest {
  userId: string;
  type: string;
  amount: number;
  title?: string;
  extra?: {
    /** SINGLE_UNLOCK: 解锁内容 ID */
    unlockTargetId?: string;
    /** MEMBERSHIP: 会员等级 monthly | quarterly | yearly | lifetime */
    membershipLevel?: string;
    /** MEMBERSHIP: 会员时长（天） */
    membershipDays?: number;
    /** POINTS_RECHARGE: 充值积分数量 */
    pointsAmount?: number;
    /** 微信用户 openid（JSAPI 支付必填） */
    openid?: string;
    /** 支付完成后跳转地址 */
    returnUrl?: string;
  };
}

// ==================== 参数校验 ====================

/**
 * 校验下单参数合法性
 *
 * @returns 错误消息，null 表示校验通过
 */
function validateRequest(
  body: CreateOrderRequest
): string | null {
  // userId 校验
  if (!body.userId || typeof body.userId !== "string" || body.userId.length < 4) {
    return "用户ID无效";
  }

  // 订单类型校验
  const validTypes = Object.values(OrderType) as string[];
  if (!body.type || !validTypes.includes(body.type)) {
    return `订单类型无效，支持: ${validTypes.join(", ")}`;
  }

  // 金额校验
  if (
    typeof body.amount !== "number" ||
    isNaN(body.amount) ||
    body.amount <= 0
  ) {
    return "金额必须为大于 0 的数字";
  }

  // 金额最多两位小数
  const rounded = Math.round(body.amount * 100) / 100;
  if (rounded !== body.amount) {
    return "金额最多保留两位小数";
  }

  // openid 校验（JSAPI 支付必填）
  if (!body.extra?.openid) {
    return "微信 JSAPI 支付需要提供用户 openid（extra.openid）";
  }

  // 会员订单：校验会员等级
  if (body.type === OrderType.MEMBERSHIP) {
    const level = body.extra?.membershipLevel;
    if (level && !Object.prototype.hasOwnProperty.call(MEMBERSHIP_DURATION, level)) {
      return `会员等级无效: ${level}，支持: ${Object.keys(MEMBERSHIP_DURATION).join(", ")}`;
    }
  }

  // 单次解锁：校验解锁目标
  if (body.type === OrderType.SINGLE_UNLOCK) {
    if (!body.extra?.unlockTargetId) {
      return "单次解锁订单需要提供解锁目标 ID（extra.unlockTargetId）";
    }
  }

  return null;
}

// ==================== 主处理函数 ====================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. 解析请求体
    let body: CreateOrderRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "请求体格式错误，应为 JSON" },
        { status: 400 }
      );
    }

    const { userId, type, amount, title, extra } = body;

    console.log(
      `[payment/wechat/create] 收到下单请求 — userId=${userId}, type=${type}, amount=${amount}`
    );

    // 2. 参数校验
    const validationError = validateRequest(body);
    if (validationError) {
      console.warn(`[payment/wechat/create] 参数校验失败: ${validationError}`);
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 }
      );
    }

    // 3. 检查微信支付是否已配置
    if (!isWechatConfigured()) {
      console.warn("[payment/wechat/create] 微信支付通道未配置");
      return NextResponse.json(
        {
          success: false,
          message: "微信支付通道尚未配置，请检查环境变量",
          data: {
            enabled: false,
            channels: { wechat: false },
          },
        },
        { status: 503 }
      );
    }

    // 4. 构建订单扩展字段
    const orderType = type as OrderType;
    const complianceTitle = title || getComplianceTitle(orderType);
    const complianceDesc = getComplianceDescription(orderType);

    const orderExtra: OrderExtra = {};
    if (extra) {
      if (extra.unlockTargetId) orderExtra.unlockTargetId = extra.unlockTargetId;
      if (extra.membershipLevel) orderExtra.membershipLevel = extra.membershipLevel;
      if (extra.membershipDays) orderExtra.membershipDays = extra.membershipDays;
      if (extra.pointsAmount) orderExtra.pointsAmount = extra.pointsAmount;
    }

    // 会员订单：根据等级自动补充天数
    if (orderType === OrderType.MEMBERSHIP && extra?.membershipLevel) {
      const level = extra.membershipLevel;
      if (!orderExtra.membershipDays && MEMBERSHIP_DURATION[level] !== undefined) {
        orderExtra.membershipDays = MEMBERSHIP_DURATION[level];
      }
    }

    // 5. 在系统中创建订单记录（PENDING 状态）
    let order;
    try {
      order = createOrderRecord(
        userId,
        orderType,
        amount,
        complianceTitle,
        orderExtra
      );
    } catch (e) {
      console.error("[payment/wechat/create] 创建订单记录失败:", e);
      return NextResponse.json(
        {
          success: false,
          message: "创建订单失败",
          error: e instanceof Error ? e.message : "未知错误",
        },
        { status: 500 }
      );
    }

    console.log(
      `[payment/wechat/create] 订单已创建 — orderId=${order.orderId}, title=${complianceTitle}`
    );

    // 6. 调用微信支付 v3 统一下单接口
    const wechatResult = await createWechatOrder({
      outTradeNo: order.orderId,
      description: PAYMENT_COMPLIANCE_TEXT.SERVICE_NAME,
      amount: order.amount,
      openid: extra!.openid!,
      notifyUrl: undefined, // 使用环境变量中配置的 WECHAT_NOTIFY_URL
    });

    if (!wechatResult.success || !wechatResult.jsapiParams) {
      console.error(
        `[payment/wechat/create] 微信下单失败 — orderId=${order.orderId}, error=${wechatResult.error}`
      );

      // 下单失败时关闭订单，避免悬挂订单
      // orderService.closeOrder 只能关闭 PENDING 状态订单
      try {
        const { closeOrder } = await import("@/lib/payment/orderService");
        closeOrder(order.orderId);
        console.log(
          `[payment/wechat/create] 已关闭失败订单 — orderId=${order.orderId}`
        );
      } catch {
        // 关闭失败不影响错误返回
      }

      return NextResponse.json(
        {
          success: false,
          message: wechatResult.error || "微信下单失败",
          error: wechatResult.error,
        },
        { status: 502 }
      );
    }

    // 7. 返回 JSAPI 调起参数（匹配前端 paymentService.ts 接口）
    const jsapiParams: JsapiParams = wechatResult.jsapiParams;
    const elapsed = Date.now() - startTime;

    console.log(
      `[payment/wechat/create] 下单完成 — orderId=${order.orderId}, prepayId=${wechatResult.prepayId}, 耗时=${elapsed}ms`
    );

    return NextResponse.json({
      success: true,
      message: "订单创建成功",
      data: {
        orderId: order.orderId,
        channel: "wechat" as PaymentChannel,
        prepayId: wechatResult.prepayId,
        jsapiParams: {
          appId: jsapiParams.appId,
          timeStamp: jsapiParams.timeStamp,
          nonceStr: jsapiParams.nonceStr,
          package: jsapiParams.package,
          signType: jsapiParams.signType,
          paySign: jsapiParams.paySign,
        },
        order: {
          orderId: order.orderId,
          type: order.type,
          amount: order.amount,
          title: order.title,
          description: complianceDesc,
          status: OrderStatus.PENDING,
          createdAt: order.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("[payment/wechat/create] 服务器异常:", error);
    return NextResponse.json(
      {
        success: false,
        message: "服务异常，请稍后重试",
        error: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
