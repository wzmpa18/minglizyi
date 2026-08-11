// ============================================================================
// 微信支付回调通知接口
// POST /api/payment/wechat/notify
//
// 微信支付在用户完成支付后，会向此地址发送支付结果通知。
// 本接口负责：
//   1. 接收微信支付 POST 通知
//   2. 验证回调签名（使用微信支付平台证书）
//   3. 解密回调中的加密资源数据（AES-256-GCM）
//   4. 更新订单状态为 PAID
//   5. 根据订单类型发放权益（开通会员 / 解锁内容 / 充值积分）
//   6. 返回微信要求的成功响应格式 { code: "SUCCESS", message: "成功" }
//
// 注意：微信会对未收到成功响应的通知进行重试（最多 8 次），
//       因此本接口必须实现幂等性处理。
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { parseNotify } from "@/lib/wechatPay";
import {
  getOrder,
  updateOrderStatus,
  updateOrderExtra,
} from "@/lib/payment/orderService";
import {
  Order,
  OrderType,
  OrderStatus,
  PaymentChannel,
  MEMBERSHIP_DURATION,
} from "@/lib/payment/paymentTypes";
import fs from "fs";
import path from "path";

// 使用 Node.js 运行时
export const runtime = "nodejs";

// ==================== 事务日志 ====================

const TXN_LOG_DIR = path.join(process.cwd(), ".data");
const TXN_LOG_FILE = path.join(TXN_LOG_DIR, "wechat-notify-txn.log");

/**
 * 记录回调处理事务日志（用于故障排查和补偿恢复）
 */
function logTransaction(message: string): void {
  try {
    if (!fs.existsSync(TXN_LOG_DIR)) {
      fs.mkdirSync(TXN_LOG_DIR, { recursive: true });
    }
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(TXN_LOG_FILE, line, "utf-8");
  } catch {
    // 日志写入失败不影响主流程
  }
}

// ==================== 权益发放 ====================

/**
 * 根据订单类型发放权益
 *
 * - SINGLE_UNLOCK:   解锁对应的内容/功能
 * - MEMBERSHIP:      开通会员，设置到期时间
 * - POINTS_RECHARGE: 增加用户积分
 *
 * 当前为预留实现（日志记录），正式环境对接数据库后替换为真实操作。
 * 权益发放失败不会阻止订单状态更新，可通过事务日志补偿。
 *
 * @param order 已支付订单
 */
async function deliverBenefits(order: Order): Promise<void> {
  switch (order.type) {
    case OrderType.SINGLE_UNLOCK: {
      const targetId = order.extra?.unlockTargetId;
      if (!targetId) {
        console.warn(
          `[payment/wechat/notify] SINGLE_UNLOCK 订单缺少 unlockTargetId — orderId=${order.orderId}`
        );
        logTransaction(
          `权益发放警告: SINGLE_UNLOCK 订单 ${order.orderId} 缺少 unlockTargetId`
        );
        return;
      }
      // TODO: 对接数据库 — 在 user_unlocks 表中记录解锁
      // 示例 SQL: INSERT INTO user_unlocks (user_id, target_id, unlocked_at, order_id) VALUES (?, ?, NOW(), ?)
      logTransaction(
        `权益发放: 解锁内容 — userId=${order.userId}, targetId=${targetId}, orderId=${order.orderId}`
      );
      console.log(
        `[payment/wechat/notify] 权益发放: 解锁内容 — userId=${order.userId}, targetId=${targetId}`
      );
      break;
    }

    case OrderType.MEMBERSHIP: {
      const level = order.extra?.membershipLevel || "monthly";
      const days =
        order.extra?.membershipDays ??
        MEMBERSHIP_DURATION[level] ??
        30;

      // TODO: 对接数据库 — 更新用户会员等级和到期时间
      // 示例 SQL: UPDATE users SET member_level=?, member_expire=DATE_ADD(NOW(), INTERVAL ? DAY) WHERE user_id=?
      logTransaction(
        `权益发放: 开通会员 — userId=${order.userId}, level=${level}, days=${days}, orderId=${order.orderId}`
      );
      console.log(
        `[payment/wechat/notify] 权益发放: 开通会员 — userId=${order.userId}, level=${level}, days=${days}`
      );
      break;
    }

    case OrderType.POINTS_RECHARGE: {
      // 积分数量 = 充值金额 × 10（1元 = 10积分），或使用 extra 中指定的数量
      const pointsAmount =
        order.extra?.pointsAmount ?? Math.round(order.amount * 10);

      // TODO: 对接数据库 — 在 points_records 表中记录积分增加
      // 示例 SQL: INSERT INTO points_records (user_id, type, source, amount, description, related_order_id, created_at) VALUES (?, 'earn', 'recharge', ?, '积分充值', ?, NOW())
      logTransaction(
        `权益发放: 积分充值 — userId=${order.userId}, points=${pointsAmount}, orderId=${order.orderId}`
      );
      console.log(
        `[payment/wechat/notify] 权益发放: 积分充值 — userId=${order.userId}, points=${pointsAmount}`
      );
      break;
    }

    default:
      console.warn(
        `[payment/wechat/notify] 未知订单类型: ${order.type} — orderId=${order.orderId}`
      );
      logTransaction(`权益发放警告: 未知订单类型 ${order.type} — orderId=${order.orderId}`);
  }
}

// ==================== 微信回调响应格式 ====================

/**
 * 微信支付要求回调成功时返回：
 * { "code": "SUCCESS", "message": "成功" }
 *
 * 失败时返回：
 * { "code": "FAIL", "message": "失败原因" }
 * 微信会重试通知（最多 8 次，间隔递增）
 */
function wechatSuccessResponse() {
  return NextResponse.json(
    { code: "SUCCESS", message: "成功" },
    { status: 200 }
  );
}

function wechatFailResponse(message: string) {
  return NextResponse.json(
    { code: "FAIL", message },
    { status: 200 } // 微信要求即使失败也返回 HTTP 200
  );
}

// ==================== 主处理函数 ====================

export async function POST(request: NextRequest) {
  const txnId = `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`;

  try {
    // 1. 读取原始请求体和请求头
    const rawBody = await request.text();

    // 提取微信回调相关请求头（全部转小写）
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    logTransaction(`[${txnId}] 收到微信回调通知`);

    if (!rawBody) {
      logTransaction(`[${txnId}] 错误: 请求体为空`);
      return wechatFailResponse("请求体为空");
    }

    // 2. 验签 + 解密（parseNotify 内部完成）
    const parseResult = await parseNotify(rawBody, headers);

    if (!parseResult.success || !parseResult.data) {
      logTransaction(
        `[${txnId}] 验签/解密失败: ${parseResult.error || "未知原因"}`
      );
      console.error(
        `[payment/wechat/notify] 回调处理失败: ${parseResult.error}`
      );
      // 验签失败返回 FAIL，微信会重试
      return wechatFailResponse(parseResult.error || "验签失败");
    }

    const notifyData = parseResult.data;
    const orderId = notifyData.out_trade_no;

    logTransaction(
      `[${txnId}] 验签解密通过 — orderId=${orderId}, transactionId=${notifyData.transaction_id}, tradeState=${notifyData.trade_state}`
    );

    // 3. 查询本地订单
    const order = getOrder(orderId);
    if (!order) {
      logTransaction(`[${txnId}] 错误: 订单不存在 orderId=${orderId}`);
      console.error(`[payment/wechat/notify] 订单不存在: ${orderId}`);
      // 订单不存在也返回 SUCCESS，避免微信重复通知
      return wechatSuccessResponse();
    }

    // 4. 幂等检查：已支付的订单不重复处理
    if (order.status === OrderStatus.PAID) {
      logTransaction(`[${txnId}] 订单已支付（幂等跳过）orderId=${orderId}`);
      console.log(
        `[payment/wechat/notify] 订单已支付，幂等跳过 — orderId=${orderId}`
      );
      return wechatSuccessResponse();
    }

    // 5. 交易状态校验
    if (notifyData.trade_state !== "SUCCESS") {
      logTransaction(
        `[${txnId}] 交易状态非 SUCCESS: ${notifyData.trade_state} (${notifyData.trade_state_desc}) — orderId=${orderId}`
      );
      console.warn(
        `[payment/wechat/notify] 交易状态: ${notifyData.trade_state} — orderId=${orderId}`
      );
      // 非 SUCCESS 状态不更新订单，返回 SUCCESS 避免重试
      return wechatSuccessResponse();
    }

    // 6. 金额校验（防止篡改）
    const notifyAmountYuan = notifyData.amount.total / 100; // 分转元
    if (Math.abs(notifyAmountYuan - order.amount) > 0.01) {
      logTransaction(
        `[${txnId}] 错误: 金额不匹配 订单=${order.amount}元 回调=${notifyAmountYuan}元 — orderId=${orderId}`
      );
      console.error(
        `[payment/wechat/notify] 金额不匹配: 订单 ${order.amount} 元，回调 ${notifyAmountYuan} 元 — orderId=${orderId}`
      );
      return wechatFailResponse("金额不匹配");
    }

    // 7. 更新订单状态为 PAID
    const updatedOrder = updateOrderStatus(
      orderId,
      OrderStatus.PAID,
      "wechat" as PaymentChannel
    );

    if (!updatedOrder) {
      logTransaction(`[${txnId}] 错误: 订单状态更新失败 orderId=${orderId}`);
      console.error(
        `[payment/wechat/notify] 订单状态更新失败 — orderId=${orderId}`
      );
      return wechatFailResponse("订单状态更新失败");
    }

    // 回填微信支付交易号
    if (notifyData.transaction_id) {
      updateOrderExtra(orderId, { tradeNo: notifyData.transaction_id });
    }

    logTransaction(
      `[${txnId}] 订单已更新为 PAID — orderId=${orderId}, transactionId=${notifyData.transaction_id}, paidAt=${notifyData.success_time}`
    );
    console.log(
      `[payment/wechat/notify] 支付成功 — orderId=${orderId}, userId=${order.userId}, amount=${order.amount}元`
    );

    // 8. 发放权益（会员开通 / 内容解锁 / 积分充值）
    try {
      await deliverBenefits(updatedOrder);
      logTransaction(`[${txnId}] 权益发放完成 — type=${updatedOrder.type}`);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      logTransaction(`[${txnId}] 权益发放异常: ${errMsg}`);
      console.error(
        `[payment/wechat/notify] 权益发放异常 — orderId=${orderId}:`,
        e
      );
      // 权益发放失败不影响订单状态和回调响应
      // 可通过事务日志后续补偿
    }

    // 9. 返回成功响应给微信
    logTransaction(`[${txnId}] 回调处理完成 — orderId=${orderId}`);
    return wechatSuccessResponse();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logTransaction(`[${txnId}] 回调处理异常: ${errMsg}`);
    console.error("[payment/wechat/notify] 回调处理异常:", error);

    // 即使异常也返回 HTTP 200 + JSON，避免微信频繁重试导致日志爆炸
    // 但 code 为 FAIL，微信会适度重试
    return wechatFailResponse("处理异常");
  }
}
