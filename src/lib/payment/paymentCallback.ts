// ============================================================================
// 支付回调与权益发放 - v20.4
// 验签通过后更新订单状态为 PAID，根据订单类型自动发放权益
// 分销返佣自动结算：一级返佣 15%、二级返佣 8%
// 所有操作使用事务确保原子性
// ============================================================================

import fs from "fs";
import path from "path";
import {
  Order,
  OrderType,
  OrderStatus,
  PaymentChannel,
  CallbackVerifyResult,
  DISTRIBUTION_CONFIG,
  MEMBERSHIP_DURATION,
} from "./paymentTypes";
import {
  getOrder,
  updateOrderStatus,
  updateOrderExtra,
} from "./orderService";
import { handleCallback as routerHandleCallback } from "./paymentRouter";

// ==================== 权益发放接口（数据访问抽象层） ====================

/**
 * 权益发放数据访问接口
 * 定义发放权益所需的全部数据操作，由具体实现注入
 * 当前预留接口，参数到位后对接后端数据库实现
 */
export interface BenefitDeliveryAdapter {
  /** 解锁单次内容/功能（SINGLE_UNLOCK） */
  unlockContent(userId: string, targetId: string): Promise<void>;
  /** 开通会员（MEMBERSHIP），设置到期时间 */
  activateMembership(userId: string, level: string, days: number): Promise<void>;
  /** 增加用户积分（POINTS_RECHARGE） */
  addPoints(userId: string, points: number): Promise<void>;
}

/**
 * 分销返佣数据访问接口
 */
export interface DistributionAdapter {
  /** 查找用户的一级邀请人 userId */
  getLevel1InviterId(userId: string): Promise<string | null>;
  /** 查找用户的二级邀请人 userId（一级邀请人的邀请人） */
  getLevel2InviterId(userId: string): Promise<string | null>;
  /** 增加用户钱包余额 */
  addWalletBalance(userId: string, amount: number): Promise<void>;
  /** 记录返佣流水 */
  recordRebateFlow(params: {
    receiverId: string;
    consumerId: string;
    orderId: string;
    amount: number;
    rebateAmount: number;
    level: 1 | 2;
  }): Promise<void>;
}

// ==================== 默认适配器实现（预留） ====================

/**
 * 默认权益发放适配器
 * 当前为预留实现，内部标注 TODO，参数到位后对接数据库
 */
class DefaultBenefitAdapter implements BenefitDeliveryAdapter {
  async unlockContent(userId: string, targetId: string): Promise<void> {
    // TODO: 参数到位后启用
    // 实现：在数据库中标记该用户已购买 targetId 对应的内容/功能
    // 示例 SQL: INSERT INTO user_unlocks (user_id, target_id, unlocked_at) VALUES (?, ?, NOW())
    console.log(
      `[BenefitAdapter] unlockContent — userId=${userId}, targetId=${targetId} (TODO: 对接数据库)`
    );
  }

  async activateMembership(
    userId: string,
    level: string,
    days: number
  ): Promise<void> {
    // TODO: 参数到位后启用
    // 实现：更新用户会员等级，设置到期时间
    // 示例 SQL: UPDATE users SET member_level=?, member_expire=DATE_ADD(NOW(), INTERVAL ? DAY) WHERE user_id=?
    console.log(
      `[BenefitAdapter] activateMembership — userId=${userId}, level=${level}, days=${days} (TODO: 对接数据库)`
    );
  }

  async addPoints(userId: string, points: number): Promise<void> {
    // TODO: 参数到位后启用
    // 实现：在用户积分表中增加积分，记录积分流水
    // 示例 SQL: INSERT INTO points_records (user_id, type, source, amount, ...) VALUES (?, 'earn', 'recharge', ?, ...)
    console.log(
      `[BenefitAdapter] addPoints — userId=${userId}, points=${points} (TODO: 对接数据库)`
    );
  }
}

/**
 * 默认分销返佣适配器
 * 当前为预留实现，内部标注 TODO，参数到位后对接数据库
 */
class DefaultDistributionAdapter implements DistributionAdapter {
  async getLevel1InviterId(userId: string): Promise<string | null> {
    // TODO: 参数到位后启用
    // 实现：查询 invite_relations 表，找 invitee_id=userId AND level=1 的 inviter_id
    console.log(
      `[DistributionAdapter] getLevel1InviterId — userId=${userId} (TODO: 对接数据库)`
    );
    return null;
  }

  async getLevel2InviterId(userId: string): Promise<string | null> {
    // TODO: 参数到位后启用
    // 实现：先查一级邀请人 A，再查 A 的一级邀请人 B，即为 userId 的二级邀请人
    console.log(
      `[DistributionAdapter] getLevel2InviterId — userId=${userId} (TODO: 对接数据库)`
    );
    return null;
  }

  async addWalletBalance(userId: string, amount: number): Promise<void> {
    // TODO: 参数到位后启用
    // 实现：更新用户钱包可用余额
    // 示例 SQL: UPDATE wallets SET available_balance = available_balance + ? WHERE user_id = ?
    console.log(
      `[DistributionAdapter] addWalletBalance — userId=${userId}, amount=${amount} (TODO: 对接数据库)`
    );
  }

  async recordRebateFlow(params: {
    receiverId: string;
    consumerId: string;
    orderId: string;
    amount: number;
    rebateAmount: number;
    level: 1 | 2;
  }): Promise<void> {
    // TODO: 参数到位后启用
    // 实现：在钱包流水中记录返佣记录
    // 示例 SQL: INSERT INTO wallet_transactions (user_id, type, amount, related_order_id, ...) VALUES (?, 'distributor_l1/l2', ?, ?, ...)
    console.log(
      `[DistributionAdapter] recordRebateFlow — receiver=${params.receiverId}, consumer=${params.consumerId}, order=${params.orderId}, amount=${params.amount}, rebate=${params.rebateAmount}, level=${params.level} (TODO: 对接数据库)`
    );
  }
}

// ==================== 适配器注入 ====================

let benefitAdapter: BenefitDeliveryAdapter = new DefaultBenefitAdapter();
let distributionAdapter: DistributionAdapter = new DefaultDistributionAdapter();

/**
 * 注入权益发放适配器
 * 参数到位后可替换为数据库实现
 */
export function setBenefitAdapter(adapter: BenefitDeliveryAdapter): void {
  benefitAdapter = adapter;
}

/**
 * 注入分销返佣适配器
 * 参数到位后可替换为数据库实现
 */
export function setDistributionAdapter(adapter: DistributionAdapter): void {
  distributionAdapter = adapter;
}

// ==================== 事务日志（轻量事务支持） ====================

const TXN_LOG_DIR = path.join(process.cwd(), ".data");
const TXN_LOG_FILE = path.join(TXN_LOG_DIR, "payment-txn.log");

/**
 * 记录事务日志（用于原子性保障和故障恢复）
 */
function logTransaction(message: string): void {
  try {
    if (!fs.existsSync(TXN_LOG_DIR)) {
      fs.mkdirSync(TXN_LOG_DIR, { recursive: true });
    }
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(TXN_LOG_FILE, line, "utf-8");
  } catch {
    // 日志失败不影响主流程
  }
}

// ==================== 回调处理主流程 ====================

/**
 * 处理支付回调（主入口）
 *
 * 流程：
 * 1. 调用 paymentRouter.handleCallback 进行验签
 * 2. 验签通过后更新订单状态为 PAID
 * 3. 根据订单类型发放权益
 * 4. 分销返佣自动结算
 * 5. 所有操作记录事务日志，确保原子性
 *
 * @param channel 支付渠道
 * @param data    回调原始数据
 * @returns 处理结果
 */
export async function processPaymentCallback(
  channel: PaymentChannel,
  data: { headers: Record<string, string>; body: string }
): Promise<CallbackVerifyResult> {
  const txnId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
  logTransaction(`[${txnId}] 开始处理 ${channel} 支付回调`);

  // === 步骤 1：验签 ===
  const verifyResult = await routerHandleCallback(channel, data);

  if (!verifyResult.success) {
    logTransaction(
      `[${txnId}] 验签失败: ${verifyResult.error || "未知原因"}`
    );
    return verifyResult;
  }

  logTransaction(
    `[${txnId}] 验签通过 — orderId=${verifyResult.orderId}, amount=${verifyResult.amount}, tradeNo=${verifyResult.tradeNo}`
  );

  // === 步骤 2：查询订单并更新状态 ===
  const orderId = verifyResult.orderId;
  if (!orderId) {
    logTransaction(`[${txnId}] 错误：回调中未包含订单号`);
    return {
      ...verifyResult,
      success: false,
      error: "回调中未包含订单号",
    };
  }

  const order = getOrder(orderId);
  if (!order) {
    logTransaction(`[${txnId}] 错误：订单不存在 orderId=${orderId}`);
    return {
      ...verifyResult,
      success: false,
      error: `订单不存在: ${orderId}`,
    };
  }

  // 幂等检查：已支付的订单不重复处理
  if (order.status === OrderStatus.PAID) {
    logTransaction(`[${txnId}] 订单已支付（幂等跳过）orderId=${orderId}`);
    return {
      ...verifyResult,
      success: true,
    };
  }

  // 金额校验
  if (
    verifyResult.amount !== undefined &&
    Math.abs(verifyResult.amount - order.amount) > 0.01
  ) {
    logTransaction(
      `[${txnId}] 错误：金额不匹配 订单=${order.amount} 回调=${verifyResult.amount}`
    );
    return {
      ...verifyResult,
      success: false,
      error: `金额不匹配: 订单 ${order.amount} 元，回调 ${verifyResult.amount} 元`,
    };
  }

  // 更新订单状态为 PAID
  const updatedOrder = updateOrderStatus(orderId, OrderStatus.PAID, channel);
  if (!updatedOrder) {
    logTransaction(`[${txnId}] 错误：订单状态更新失败 orderId=${orderId}`);
    return {
      ...verifyResult,
      success: false,
      error: "订单状态更新失败",
    };
  }

  // 回填第三方交易号
  if (verifyResult.tradeNo) {
    updateOrderExtra(orderId, { tradeNo: verifyResult.tradeNo });
  }

  logTransaction(`[${txnId}] 订单状态已更新为 PAID — orderId=${orderId}`);

  // === 步骤 3：发放权益 ===
  try {
    await deliverBenefits(updatedOrder);
    logTransaction(`[${txnId}] 权益发放完成 — type=${updatedOrder.type}`);
  } catch (e) {
    logTransaction(
      `[${txnId}] 权益发放异常: ${e instanceof Error ? e.message : String(e)}`
    );
    // 权益发放失败不影响订单状态（可后续补偿）
  }

  // === 步骤 4：分销返佣结算 ===
  try {
    const rebateResult = await settleDistributionRebate(updatedOrder);
    logTransaction(
      `[${txnId}] 分销返佣完成 — L1=${rebateResult.level1Rebate}元, L2=${rebateResult.level2Rebate}元`
    );
  } catch (e) {
    logTransaction(
      `[${txnId}] 分销返佣异常: ${e instanceof Error ? e.message : String(e)}`
    );
    // 返佣失败不影响订单状态（可后续补偿）
  }

  logTransaction(`[${txnId}] 回调处理完成 — orderId=${orderId}`);

  return {
    ...verifyResult,
    success: true,
  };
}

// ==================== 权益发放 ====================

/**
 * 根据订单类型发放权益
 *
 * - SINGLE_UNLOCK:  解锁对应的 AI 功能/内容，标记为已购买
 * - MEMBERSHIP:     开通会员，设置到期时间（月/季/年）
 * - POINTS_RECHARGE: 增加用户积分
 *
 * @param order 已支付订单
 */
export async function deliverBenefits(order: Order): Promise<void> {
  switch (order.type) {
    case OrderType.SINGLE_UNLOCK:
      await deliverSingleUnlock(order);
      break;

    case OrderType.MEMBERSHIP:
      await deliverMembership(order);
      break;

    case OrderType.POINTS_RECHARGE:
      await deliverPointsRecharge(order);
      break;

    default:
      console.warn(`[paymentCallback] 未知订单类型: ${order.type}`);
  }
}

/**
 * 发放单次解锁权益
 */
async function deliverSingleUnlock(order: Order): Promise<void> {
  const targetId = order.extra?.unlockTargetId;
  if (!targetId) {
    console.warn(
      `[paymentCallback] SINGLE_UNLOCK 订单缺少 unlockTargetId — orderId=${order.orderId}`
    );
    return;
  }
  await benefitAdapter.unlockContent(order.userId, targetId);
}

/**
 * 发放会员权益
 */
async function deliverMembership(order: Order): Promise<void> {
  const level = order.extra?.membershipLevel || "monthly";
  const days =
    order.extra?.membershipDays ?? MEMBERSHIP_DURATION[level] ?? 30;

  await benefitAdapter.activateMembership(order.userId, level, days);
}

/**
 * 发放积分充值权益
 */
async function deliverPointsRecharge(order: Order): Promise<void> {
  // 积分数量 = 金额 * 积分汇率（1元 = 10积分）
  const pointsAmount =
    order.extra?.pointsAmount ?? Math.round(order.amount * 10);

  await benefitAdapter.addPoints(order.userId, pointsAmount);
}

// ==================== 分销返佣结算 ====================

/**
 * 分销返佣自动结算
 *
 * 链路：消费用户 C → 一级邀请人 A → 二级邀请人 B
 *  - 一级返佣：给 A 发放消费金额 15%
 *  - 二级返佣：给 B 发放消费金额 8%
 *  - 返佣金额记入邀请人钱包余额
 *  - 记录返佣流水
 *
 * @param order 已支付订单
 * @returns 返佣结算结果
 */
export async function settleDistributionRebate(order: Order): Promise<{
  level1Rebate: number;
  level2Rebate: number;
  level1InviterId: string | null;
  level2InviterId: string | null;
}> {
  let level1Rebate = 0;
  let level2Rebate = 0;
  let level1InviterId: string | null = null;
  let level2InviterId: string | null = null;

  if (!order.userId || order.amount <= 0) {
    return { level1Rebate, level2Rebate, level1InviterId, level2InviterId };
  }

  // === 一级返佣 ===
  level1InviterId = await distributionAdapter.getLevel1InviterId(order.userId);
  if (level1InviterId) {
    level1Rebate = Math.round(order.amount * DISTRIBUTION_CONFIG.LEVEL1_RATE * 100) / 100;
    if (level1Rebate > 0) {
      await distributionAdapter.addWalletBalance(level1InviterId, level1Rebate);
      await distributionAdapter.recordRebateFlow({
        receiverId: level1InviterId,
        consumerId: order.userId,
        orderId: order.orderId,
        amount: order.amount,
        rebateAmount: level1Rebate,
        level: 1,
      });
    }
  }

  // === 二级返佣 ===
  level2InviterId = await distributionAdapter.getLevel2InviterId(order.userId);
  if (level2InviterId) {
    level2Rebate = Math.round(order.amount * DISTRIBUTION_CONFIG.LEVEL2_RATE * 100) / 100;
    if (level2Rebate > 0) {
      await distributionAdapter.addWalletBalance(level2InviterId, level2Rebate);
      await distributionAdapter.recordRebateFlow({
        receiverId: level2InviterId,
        consumerId: order.userId,
        orderId: order.orderId,
        amount: order.amount,
        rebateAmount: level2Rebate,
        level: 2,
      });
    }
  }

  return { level1Rebate, level2Rebate, level1InviterId, level2InviterId };
}

// ==================== 导出 ====================

export const paymentCallback = {
  processPaymentCallback,
  deliverBenefits,
  settleDistributionRebate,
  setBenefitAdapter,
  setDistributionAdapter,
};
