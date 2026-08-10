// ============================================================================
// 支付体系类型定义与合规口径 - v20.4
// 所有支付场景统一标注「传统文化学习服务」，禁止出现医疗、命理类违规表述
// 所有支付通道、订单系统、回调处理共用本文件中的类型
// ============================================================================

// ==================== 订单类型枚举 ====================

/**
 * 订单类型枚举
 * - SINGLE_UNLOCK: 单次 AI 解锁（单次深度解读）
 * - MEMBERSHIP: 会员开通（月/季/年）
 * - POINTS_RECHARGE: 积分充值
 */
export enum OrderType {
  SINGLE_UNLOCK = "SINGLE_UNLOCK",
  MEMBERSHIP = "MEMBERSHIP",
  POINTS_RECHARGE = "POINTS_RECHARGE",
}

// ==================== 订单状态枚举 ====================

/**
 * 订单状态枚举
 * - PENDING:  待支付
 * - PAID:     已支付
 * - CLOSED:   已关闭
 * - REFUNDED: 已退款
 */
export enum OrderStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  CLOSED = "CLOSED",
  REFUNDED = "REFUNDED",
}

// ==================== 支付渠道 ====================

/**
 * 支付渠道类型
 * - wechat: 微信支付
 * - alipay: 支付宝
 */
export type PaymentChannel = "wechat" | "alipay";

// ==================== 订单数据结构 ====================

/**
 * 统一订单数据结构
 * 支持所有支付场景复用（单次AI解锁、会员开通、积分充值等）
 */
export interface Order {
  /** 订单号，格式：YD + 年月日时分秒 + 6位随机数 */
  orderId: string;
  /** 用户ID */
  userId: string;
  /** 订单类型 */
  type: OrderType;
  /** 金额（元） */
  amount: number;
  /** 订单标题（合规口径） */
  title: string;
  /** 订单描述（合规口径） */
  description: string;
  /** 订单状态 */
  status: OrderStatus;
  /** 支付渠道（下单时可能未确定，故允许 null） */
  channel: PaymentChannel | null;
  /** 创建时间 ISO */
  createdAt: string;
  /** 支付时间 ISO，未支付为 null */
  paidAt: string | null;
  /** 业务扩展字段，用于挂载会员等级、解锁内容ID、积分数量等 */
  extra?: OrderExtra;
}

/**
 * 订单业务扩展字段
 * 不同订单类型携带不同业务参数
 */
export interface OrderExtra {
  /** SINGLE_UNLOCK: 解锁的内容/功能标识 */
  unlockTargetId?: string;
  /** MEMBERSHIP: 会员等级 monthly | quarterly | yearly | lifetime */
  membershipLevel?: string;
  /** MEMBERSHIP: 会员时长（天） */
  membershipDays?: number;
  /** POINTS_RECHARGE: 充值积分数量 */
  pointsAmount?: number;
  /** 第三方交易号（支付成功后回填） */
  tradeNo?: string;
}

// ==================== 支付通道接口返回类型 ====================

/**
 * 下单（创建支付）返回结果
 */
export interface PaymentResult {
  success: boolean;
  /** 支付单号（第三方返回） */
  paymentId?: string;
  /** 支付链接（H5/扫码） */
  payUrl?: string;
  /** 微信预支付ID */
  prepayId?: string;
  /** 微信 JSAPI 调起参数 */
  jsapiParams?: Record<string, string>;
  /** 原始返回数据（调试用） */
  rawData?: string;
  error?: string;
}

/**
 * 支付查询返回结果
 */
export interface PaymentQueryResult {
  success: boolean;
  /** 映射到订单状态 */
  status: OrderStatus | null;
  /** 第三方交易号 */
  tradeNo?: string;
  /** 支付时间 ISO */
  paidAt?: string;
  rawData?: string;
  error?: string;
}

/**
 * 关闭支付返回结果
 */
export interface PaymentCloseResult {
  success: boolean;
  error?: string;
}

/**
 * 回调验签结果
 */
export interface CallbackVerifyResult {
  success: boolean;
  /** 回调对应的订单号 */
  orderId?: string;
  /** 支付金额（元） */
  amount?: number;
  /** 第三方交易号 */
  tradeNo?: string;
  /** 支付时间 ISO */
  paidAt?: string;
  rawData?: string;
  error?: string;
}

/**
 * 回调原始数据（HTTP 请求头 + 原始 body）
 */
export interface CallbackData {
  headers: Record<string, string>;
  body: string;
}

// ==================== 合规口径常量 ====================

/**
 * 支付合规口径常量
 * 所有支付场景统一标注「传统文化学习服务」
 * 禁止出现医疗、命理类违规表述
 */
export const PAYMENT_COMPLIANCE_TEXT = {
  /** 统一服务名称 */
  SERVICE_NAME: "传统文化学习服务",

  /** 各订单类型的合规标题 */
  TITLES: {
    [OrderType.SINGLE_UNLOCK]: "传统文化学习资料深度解读（单次）",
    [OrderType.MEMBERSHIP]: "传统文化学习平台会员服务",
    [OrderType.POINTS_RECHARGE]: "传统文化学习平台积分充值",
  } as Readonly<Record<OrderType, string>>,

  /** 各订单类型的合规描述 */
  DESCRIPTIONS: {
    [OrderType.SINGLE_UNLOCK]:
      "传统文化学习资料单次深度解读服务，购买后可查看对应学习资料的深度解析内容。",
    [OrderType.MEMBERSHIP]:
      "传统文化学习平台会员服务，开通后可在会员有效期内享受平台全部学习工具与课程资源。",
    [OrderType.POINTS_RECHARGE]:
      "传统文化学习平台积分充值，充值积分可用于兑换平台内的学习工具额度与课程资源。",
  } as Readonly<Record<OrderType, string>>,

  /** 合规注意事项 */
  COMPLIANCE_NOTICE:
    "所有支付场景统一标注「传统文化学习服务」，禁止出现医疗、命理、算命、占卜、风水等违规表述。",
} as const;

/**
 * 根据订单类型获取合规标题
 */
export function getComplianceTitle(type: OrderType): string {
  return PAYMENT_COMPLIANCE_TEXT.TITLES[type];
}

/**
 * 根据订单类型获取合规描述
 */
export function getComplianceDescription(type: OrderType): string {
  return PAYMENT_COMPLIANCE_TEXT.DESCRIPTIONS[type];
}

// ==================== 分销返佣配置 ====================

/**
 * 分销返佣配置
 * 一级返佣 15%，二级返佣 8%
 */
export const DISTRIBUTION_CONFIG = {
  /** 一级返佣比例（邀请人） */
  LEVEL1_RATE: 0.15,
  /** 二级返佣比例（邀请人的邀请人） */
  LEVEL2_RATE: 0.08,
} as const;

// ==================== 会员时长配置 ====================

/**
 * 会员等级与时长映射（天）
 */
export const MEMBERSHIP_DURATION: Readonly<Record<string, number>> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
  lifetime: 0, // 0 表示永久
};
