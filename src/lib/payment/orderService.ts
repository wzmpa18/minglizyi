// ============================================================================
// 统一订单系统 - v20.4
// 支持所有支付场景复用（单次AI解锁、会员开通、积分充值等）
// 当前使用 JSON 文件存储（开发/轻量部署），接口设计预留数据库切换能力
// 订单号生成规则：YD + 年月日时分秒 + 6位随机数
// ============================================================================

import fs from "fs";
import path from "path";
import {
  Order,
  OrderType,
  OrderStatus,
  PaymentChannel,
  OrderExtra,
  getComplianceTitle,
  getComplianceDescription,
} from "./paymentTypes";

// ==================== 存储配置 ====================

const DB_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DB_DIR, "payment-orders.json");

interface OrderStoreShape {
  orders: Order[];
}

// ==================== 内部工具函数 ====================

function ensureStore(): OrderStoreShape {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial: OrderStoreShape = { orders: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as OrderStoreShape;
    if (!parsed.orders || !Array.isArray(parsed.orders)) {
      return { orders: [] };
    }
    return parsed;
  } catch (e) {
    console.error("[orderService] store init error:", e);
    return { orders: [] };
  }
}

function saveStore(store: OrderStoreShape): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (e) {
    console.error("[orderService] store save error:", e);
  }
}

/**
 * 生成订单号
 * 规则：YD + 年月日时分秒(14位) + 6位随机数
 * 示例：YD20260810143025123456
 */
export function generateOrderId(): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  const timestamp =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
  const random = Math.floor(100000 + Math.random() * 900000).toString();
  return `YD${timestamp}${random}`;
}

/**
 * 校验 userId 合法性
 */
function assertUserId(userId: string): void {
  if (!userId || typeof userId !== "string" || userId.length < 4) {
    throw new Error("INVALID_USER_ID: 用户标识无效，无法创建或查询订单");
  }
}

/**
 * 校验金额合法性
 */
function assertAmount(amount: number): void {
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    throw new Error("INVALID_AMOUNT: 金额必须为大于 0 的数字");
  }
  // 保留两位小数
  const rounded = Math.round(amount * 100) / 100;
  if (rounded !== amount) {
    throw new Error("INVALID_AMOUNT: 金额最多保留两位小数");
  }
}

// ==================== 统一下单 ====================

/**
 * 统一下单函数
 * 支持所有支付场景复用（单次AI解锁、会员开通、积分充值等）
 *
 * @param userId    用户ID
 * @param type      订单类型
 * @param amount    金额（元）
 * @param title     订单标题（若不传则使用合规口径默认标题）
 * @param extra     业务扩展字段（可选）
 * @returns 创建的订单
 */
export function createOrder(
  userId: string,
  type: OrderType,
  amount: number,
  title?: string,
  extra?: OrderExtra
): Order {
  assertUserId(userId);
  assertAmount(amount);

  const now = new Date().toISOString();
  const order: Order = {
    orderId: generateOrderId(),
    userId,
    type,
    amount,
    title: title || getComplianceTitle(type),
    description: getComplianceDescription(type),
    status: OrderStatus.PENDING,
    channel: null,
    createdAt: now,
    paidAt: null,
    extra: extra || undefined,
  };

  const store = ensureStore();
  store.orders.push(order);
  saveStore(store);

  return order;
}

// ==================== 订单查询 ====================

/**
 * 根据订单号查询单个订单
 * @param orderId 订单号
 * @returns 订单对象，不存在返回 null
 */
export function getOrder(orderId: string): Order | null {
  if (!orderId) return null;
  const store = ensureStore();
  return store.orders.find((o) => o.orderId === orderId) || null;
}

/**
 * 查询用户订单列表
 * @param userId 用户ID
 * @param type   订单类型过滤（可选）
 * @param status 订单状态过滤（可选）
 * @returns 订单列表，按创建时间倒序
 */
export function getUserOrders(
  userId: string,
  type?: OrderType,
  status?: OrderStatus
): Order[] {
  assertUserId(userId);
  const store = ensureStore();
  let orders = store.orders.filter((o) => o.userId === userId);
  if (type !== undefined) {
    orders = orders.filter((o) => o.type === type);
  }
  if (status !== undefined) {
    orders = orders.filter((o) => o.status === status);
  }
  return orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ==================== 订单关闭 ====================

/**
 * 关闭订单
 * 仅 PENDING 状态的订单可关闭
 * @param orderId 订单号
 * @returns 关闭后的订单，失败返回 null
 */
export function closeOrder(orderId: string): Order | null {
  if (!orderId) return null;
  const store = ensureStore();
  const idx = store.orders.findIndex((o) => o.orderId === orderId);
  if (idx < 0) return null;
  if (store.orders[idx].status !== OrderStatus.PENDING) {
    return null;
  }
  store.orders[idx].status = OrderStatus.CLOSED;
  saveStore(store);
  return store.orders[idx];
}

// ==================== 订单状态更新 ====================

/**
 * 更新订单状态
 * @param orderId 订单号
 * @param status  目标状态
 * @param channel 支付渠道（支付成功时回填）
 * @returns 更新后的订单，失败返回 null
 */
export function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  channel?: PaymentChannel
): Order | null {
  if (!orderId) return null;
  const store = ensureStore();
  const idx = store.orders.findIndex((o) => o.orderId === orderId);
  if (idx < 0) return null;

  store.orders[idx].status = status;
  if (channel !== undefined) {
    store.orders[idx].channel = channel;
  }
  if (status === OrderStatus.PAID && !store.orders[idx].paidAt) {
    store.orders[idx].paidAt = new Date().toISOString();
  }

  saveStore(store);
  return store.orders[idx];
}

// ==================== 订单扩展字段更新 ====================

/**
 * 更新订单的扩展字段（用于回填第三方交易号等）
 * @param orderId 订单号
 * @param extra   要合并的扩展字段
 * @returns 更新后的订单，失败返回 null
 */
export function updateOrderExtra(
  orderId: string,
  extra: Partial<OrderExtra>
): Order | null {
  if (!orderId) return null;
  const store = ensureStore();
  const idx = store.orders.findIndex((o) => o.orderId === orderId);
  if (idx < 0) return null;

  store.orders[idx].extra = {
    ...(store.orders[idx].extra || {}),
    ...extra,
  };

  saveStore(store);
  return store.orders[idx];
}

// ==================== 便捷查询 ====================

/**
 * 检查订单是否已支付
 */
export function isOrderPaid(orderId: string): boolean {
  const order = getOrder(orderId);
  return order !== null && order.status === OrderStatus.PAID;
}

/**
 * 统计用户某类型的订单数量
 */
export function countUserOrders(
  userId: string,
  type?: OrderType,
  status?: OrderStatus
): number {
  return getUserOrders(userId, type, status).length;
}
