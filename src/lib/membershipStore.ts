"use client";

export type MemberLevel = "basic" | "monthly" | "yearly" | "lifetime";

export interface MembershipStatus {
  level: MemberLevel;
  startTime: string;
  expireTime: string | null; // null = never expires (lifetime)
  isActive: boolean;
  daysRemaining: number;
}

export interface MembershipPlan {
  level: MemberLevel;
  name: string;
  price: number;
  originalPrice: number;
  duration: string;
  features: string[];
  highlighted: boolean;
  badge: string;
}

export interface OrderRecord {
  id: string;
  level: MemberLevel;
  planName: string;
  amount: number;
  paymentMethod: "wechat" | "alipay";
  status: "pending" | "paid" | "failed" | "refunded";
  createdAt: string;
  paidAt: string | null;
}

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    level: "basic",
    name: "普通会员",
    price: 0,
    originalPrice: 0,
    duration: "永久免费",
    features: ["基础排盘工具", "每日3次AI问答", "社区浏览发帖", "每日签到积分", "中医基础查询（中药、方剂、经络、典籍）"],
    highlighted: false,
    badge: "",
  },
  {
    level: "monthly",
    name: "月度会员",
    price: 19.9,
    originalPrice: 29.9,
    duration: "30天",
    features: ["全部14款排盘工具", "每日50次AI问答", "社区全部功能", "双倍签到积分", "无广告体验", "全部中医功能（含智能问诊）"],
    highlighted: false,
    badge: "热门",
  },
  {
    level: "yearly",
    name: "年度会员",
    price: 128,
    originalPrice: 238,
    duration: "365天",
    features: ["全部14款排盘工具", "无限AI问答", "社区全部功能", "3倍签到积分", "无广告体验", "专属课程库", "导出排盘报告", "全部中医功能（含智能问诊、名家辨证、针灸建议）"],
    highlighted: true,
    badge: "推荐",
  },
  {
    level: "lifetime",
    name: "终身会员",
    price: 598,
    originalPrice: 998,
    duration: "永久有效",
    features: ["全部14款排盘工具", "无限AI问答", "社区全部功能", "5倍签到积分", "无广告体验", "专属课程库", "导出排盘报告", "优先客服支持", "专属标识", "全部中医功能（含智能问诊、名家辨证、针灸建议）"],
    highlighted: false,
    badge: "尊享",
  },
];

const STATUS_KEY = "yandao_membership_status";
const ORDERS_KEY = "yandao_membership_orders";

// safeGet/safeSet helpers
function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// Get current membership status
export function getMembershipStatus(): MembershipStatus {
  const status = safeGet<MembershipStatus | null>(STATUS_KEY, null);
  if (!status) {
    return {
      level: "basic",
      startTime: new Date().toISOString(),
      expireTime: null,
      isActive: true,
      daysRemaining: Infinity,
    };
  }
  // Check if expired (except lifetime)
  if (status.level !== "lifetime" && status.expireTime) {
    const now = Date.now();
    const expire = new Date(status.expireTime).getTime();
    if (now >= expire) {
      // Expired, downgrade to basic
      const expired: MembershipStatus = {
        level: "basic",
        startTime: new Date().toISOString(),
        expireTime: null,
        isActive: true,
        daysRemaining: Infinity,
      };
      safeSet(STATUS_KEY, expired);
      return expired;
    }
    status.isActive = true;
    status.daysRemaining = Math.ceil((expire - now) / (24 * 60 * 60 * 1000));
  } else {
    status.isActive = true;
    status.daysRemaining = Infinity;
  }
  return status;
}

// Activate membership (simulated payment success)
export function activateMembership(level: MemberLevel): MembershipStatus {
  const now = new Date();
  let expireTime: string | null = null;
  
  if (level === "monthly") {
    const exp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    expireTime = exp.toISOString();
  } else if (level === "yearly") {
    const exp = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    expireTime = exp.toISOString();
  }
  // lifetime: expireTime stays null
  
  const status: MembershipStatus = {
    level,
    startTime: now.toISOString(),
    expireTime,
    isActive: true,
    daysRemaining: level === "lifetime" ? Infinity : (level === "monthly" ? 30 : 365),
  };
  
  safeSet(STATUS_KEY, status);
  return status;
}

// Create order
export function createOrder(level: MemberLevel, paymentMethod: "wechat" | "alipay"): OrderRecord {
  const plan = MEMBERSHIP_PLANS.find(p => p.level === level);
  const order: OrderRecord = {
    id: `ORD${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    level,
    planName: plan?.name || level,
    amount: plan?.price || 0,
    paymentMethod,
    status: "pending",
    createdAt: new Date().toISOString(),
    paidAt: null,
  };
  
  const orders = getOrders();
  orders.unshift(order);
  safeSet(ORDERS_KEY, orders);
  return order;
}

// Mark order as paid and activate membership
export function completeOrder(orderId: string): { success: boolean; message: string; status?: MembershipStatus } {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return { success: false, message: "订单不存在" };
  if (order.status === "paid") return { success: false, message: "订单已支付" };
  
  order.status = "paid";
  order.paidAt = new Date().toISOString();
  safeSet(ORDERS_KEY, orders);
  
  // Activate membership
  const status = activateMembership(order.level);
  return { success: true, message: "支付成功，会员已激活", status };
}

// Get all orders
export function getOrders(): OrderRecord[] {
  return safeGet<OrderRecord[]>(ORDERS_KEY, []);
}

// Get membership level display name
export function getLevelName(level: MemberLevel): string {
  const plan = MEMBERSHIP_PLANS.find(p => p.level === level);
  return plan?.name || "普通会员";
}

// Get membership badge color
export function getLevelColor(level: MemberLevel): string {
  switch (level) {
    case "lifetime": return "#FFD700";
    case "yearly": return "#7B2FBE";
    case "monthly": return "#3498db";
    default: return "#999";
  }
}
