"use client";

// ============================================================================
// 真人咨询服务体系（言道精选 consult 类目）- P6-TOOL-04 §3.3
// 定位：「找真人师傅分析」为言道精选个人店铺下的受审核服务类目，
//       不建设独立咨询商城。
// 全链路复用：
//  - 订单：统一订单系统（lib/payment/orderService + paymentService，OrderType.CONSULT_SERVICE）
//  - 配置：toolConfigStore.consult（价格区间/抽成/结算周期/履约时限/准入开关/免责）
//  - 结算：钱包体系口径（平台服务费 + T+settleDays 可提现）
//  - 告警：alertService（SERVICE_TIMEOUT / COMPLAINT_SURGE / ABNORMAL_REFUND）
//  - 通知：notificationCenter 统一消息中心
// 服务者准入：身份实名 + 收款账户 + 类目校验三要素（entryAuditRequired 开关控制）。
// ============================================================================

import { getToolConfig } from "./toolConfigStore";

// ==================== 类型定义 ====================

/** 服务者入驻申请与档案 */
export interface ConsultProvider {
  id: string;
  userId: string;
  nickname: string;
  avatar?: string;
  /** 类目准入（如：命理咨询/风水勘测/择日指导） */
  category: string;
  expertise: string[];
  bio: string;
  /** 身份实名信息（准入审核要素一）：真实姓名 + 证件类型/号码后四位（不存全量证件号） */
  realName: string;
  idCardLast4: string;
  /** 收款账户（准入审核要素二）：三选一即可 */
  payoutAlipay?: string;
  payoutWechat?: string;
  payoutBank?: string;
  /** 审核状态 */
  auditStatus: "pending" | "approved" | "rejected";
  auditNote?: string;
  auditAt?: string;
  appliedAt: string;
  /** 冻结（违规下架，服务全部不可售） */
  frozen: boolean;
}

/** 上架的咨询服务（言道精选 consult 类目商品） */
export interface ConsultService {
  id: string;
  providerId: string;
  providerNickname: string;
  title: string;
  /** 服务范围（必填，明确做什么/不做什么） */
  scope: string;
  /** 交付形式：图文报告 / 语音沟通 / 视频沟通 / 线下当面 */
  deliveryForm: "text" | "voice" | "video" | "offline";
  price: number; // 元，须在 consult.minPrice ~ maxPrice 区间内
  /** 承诺交付时限（天），不得超过 consult.maxDeliveryDays */
  deliveryDays: number;
  /** 退款规则说明 */
  refundPolicy: string;
  /** 上架状态 */
  status: "draft" | "pending_review" | "online" | "offline" | "frozen";
  createdAt: string;
  updatedAt: string;
  salesCount: number;
  avgRating?: number;
}

/** 咨询订单履约状态机：
 *  paid(已支付待接单) → accepted(已接单) → delivered(已交付) → confirmed(已确认，结算中)
 *  → settled(已结算)；任一履约前阶段可发起售后 after_selling → refunded(已退款)
 */
export type ConsultOrderStatus =
  | "paid"
  | "accepted"
  | "delivered"
  | "confirmed"
  | "settled"
  | "after_selling"
  | "refunded"
  | "cancelled";

export interface ConsultOrder {
  /** 与统一订单系统共用的订单号（OrderType.CONSULT_SERVICE） */
  orderId: string;
  serviceId: string;
  serviceTitle: string;
  providerId: string;
  providerNickname: string;
  buyerId: string;
  buyerNickname: string;
  amount: number;
  /** 平台服务费（成交时按 consult.platformFeeRate 快照） */
  platformFee: number;
  /** 服务者应结算金额 */
  settleAmount: number;
  status: ConsultOrderStatus;
  /** 买家需求描述 */
  requirement: string;
  /** 交付内容（服务者填写） */
  deliverContent?: string;
  deliveredAt?: string;
  confirmedAt?: string;
  /** 确认收货后 settleDays 天可结算 */
  settleDueAt?: string;
  settledAt?: string;
  /** 售后/退款 */
  afterSaleReason?: string;
  refundedAt?: string;
  createdAt: string;
}

// ==================== 存储键 ====================

const PROVIDERS_KEY = "yandao_consult_providers";
const SERVICES_KEY = "yandao_consult_services";
const ORDERS_KEY = "yandao_consult_orders";

// ==================== 工具 ====================

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeGet<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("[consultService] 存储失败:", e);
  }
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function notify(input: { category: "order" | "audit" | "system"; title: string; body: string; linkTo?: string; idempotentKey?: string }): void {
  try {
    import("./notificationCenter").then(({ addNotification }) => {
      addNotification(input);
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

function alert(type: "SERVICE_TIMEOUT" | "COMPLAINT_SURGE" | "ABNORMAL_REFUND", level: "warning" | "error", message: string, refId: string): void {
  try {
    import("./alertService").then(({ raiseAlert }) => {
      raiseAlert(type, level, message, refId);
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

// ==================== 服务者准入 ====================

export interface ApplyProviderInput {
  userId: string;
  nickname: string;
  avatar?: string;
  category: string;
  expertise: string[];
  bio: string;
  realName: string;
  idCardLast4: string;
  payoutAlipay?: string;
  payoutWechat?: string;
  payoutBank?: string;
}

export interface ApplyProviderResult {
  success: boolean;
  message: string;
  provider?: ConsultProvider;
}

/**
 * 服务者入驻申请：身份 + 收款 + 类目三要素校验（P6-TOOL-04 §3.3 准入要求）。
 * entryAuditRequired=true 时三要素齐备才可提交，审核通过后方可上架服务。
 */
export function applyConsultProvider(input: ApplyProviderInput): ApplyProviderResult {
  const cfg = getToolConfig().consult;
  if (!cfg.enabled) return { success: false, message: "真人咨询服务当前未开放" };

  // 基础字段
  if (!input.userId) return { success: false, message: "请先登录" };
  if (!input.nickname?.trim()) return { success: false, message: "请填写展示昵称" };
  if (!input.category?.trim()) return { success: false, message: "请选择服务类目" };
  if (!input.bio?.trim() || input.bio.trim().length < 30) {
    return { success: false, message: "请填写至少30字的服务简介，说明擅长领域与服务方式" };
  }

  // 准入三要素（entryAuditRequired 开关来自 LOC 后台配置）
  if (cfg.entryAuditRequired) {
    if (!input.realName?.trim()) return { success: false, message: "准入校验：请填写实名姓名" };
    if (!/^\d{4}$/.test(input.idCardLast4 || "")) {
      return { success: false, message: "准入校验：请填写证件号码后4位" };
    }
    if (!input.payoutAlipay && !input.payoutWechat && !input.payoutBank) {
      return { success: false, message: "准入校验：请至少绑定一种收款账户（支付宝/微信/银行卡）" };
    }
  }

  const providers = safeGet<ConsultProvider[]>(PROVIDERS_KEY, []);
  const existing = providers.find((p) => p.userId === input.userId);
  if (existing && existing.auditStatus === "approved") {
    return { success: false, message: "您已是认证服务者，无需重复申请" };
  }
  if (existing && existing.auditStatus === "pending") {
    return { success: false, message: "您的入驻申请正在审核中，请耐心等待" };
  }

  const provider: ConsultProvider = {
    id: existing?.id || genId("cp"),
    userId: input.userId,
    nickname: input.nickname.trim(),
    avatar: input.avatar,
    category: input.category.trim(),
    expertise: (input.expertise || []).filter(Boolean).slice(0, 8),
    bio: input.bio.trim(),
    realName: (input.realName || "").trim(),
    idCardLast4: input.idCardLast4 || "",
    payoutAlipay: input.payoutAlipay?.trim() || undefined,
    payoutWechat: input.payoutWechat?.trim() || undefined,
    payoutBank: input.payoutBank?.trim() || undefined,
    auditStatus: "pending",
    appliedAt: new Date().toISOString(),
    frozen: false,
  };
  if (existing) {
    const idx = providers.findIndex((p) => p.userId === input.userId);
    providers[idx] = provider;
  } else {
    providers.push(provider);
  }
  safeSet(PROVIDERS_KEY, providers);

  notify({
    category: "audit",
    title: "入驻申请已提交",
    body: "您的真人咨询服务者入驻申请已提交，平台将在1-3个工作日内完成审核，结果将通过站内消息通知。",
    idempotentKey: `provider_applied_${provider.id}`,
  });
  return { success: true, message: "入驻申请已提交，等待平台审核", provider };
}

export function getMyProvider(userId: string): ConsultProvider | null {
  return safeGet<ConsultProvider[]>(PROVIDERS_KEY, []).find((p) => p.userId === userId) || null;
}

export function listProviders(filter?: { auditStatus?: ConsultProvider["auditStatus"] }): ConsultProvider[] {
  let list = safeGet<ConsultProvider[]>(PROVIDERS_KEY, []);
  if (filter?.auditStatus) list = list.filter((p) => p.auditStatus === filter.auditStatus);
  return list.sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
}

/** 管理端审核入驻申请 */
export function auditConsultProvider(providerId: string, approved: boolean, note: string): { success: boolean; message: string } {
  const providers = safeGet<ConsultProvider[]>(PROVIDERS_KEY, []);
  const p = providers.find((x) => x.id === providerId);
  if (!p) return { success: false, message: "申请记录不存在" };
  if (p.auditStatus !== "pending") return { success: false, message: "该申请已处理" };
  p.auditStatus = approved ? "approved" : "rejected";
  p.auditNote = note;
  p.auditAt = new Date().toISOString();
  safeSet(PROVIDERS_KEY, providers);
  notify({
    category: "audit",
    title: approved ? "入驻审核通过" : "入驻审核未通过",
    body: approved
      ? "恭喜！您的服务者入驻申请已通过审核，现在可以上架咨询服务了。"
      : `很遗憾，您的入驻申请未通过审核。原因：${note || "资料不完整"}。您可完善资料后重新申请。`,
    idempotentKey: `provider_audited_${providerId}_${approved ? "ok" : "no"}`,
  });
  return { success: true, message: approved ? "已通过" : "已驳回" };
}

// ==================== 服务上架 ====================

/** 管理端冻结/解冻服务者：冻结时其全部在架服务同步下架（治理体系 §6.1-6） */
export function setProviderFrozen(providerId: string, frozen: boolean): { success: boolean; message: string } {
  const providers = safeGet<ConsultProvider[]>(PROVIDERS_KEY, []);
  const p = providers.find((x) => x.id === providerId);
  if (!p) return { success: false, message: "服务者不存在" };
  p.frozen = frozen;
  safeSet(PROVIDERS_KEY, providers);

  const services = safeGet<ConsultService[]>(SERVICES_KEY, []);
  let affected = 0;
  for (const s of services) {
    if (s.providerId === providerId && s.status === "online") {
      s.status = "frozen";
      s.updatedAt = new Date().toISOString();
      affected += 1;
    }
  }
  safeSet(SERVICES_KEY, services);

  if (frozen) {
    alert("COMPLAINT_SURGE", "warning", `服务者 ${p.nickname}（${p.id}）已被管理端冻结，${affected} 个在架服务同步下架`, providerId);
  }
  notify({
    category: "system",
    title: frozen ? "服务者账号已被冻结" : "服务者账号已解冻",
    body: frozen
      ? `您的服务者账号已被平台冻结，${affected} 个在架服务已同步下架。如有疑问可通过申诉渠道联系平台。`
      : "您的服务者账号已解冻，可重新上架服务。",
    idempotentKey: `provider_frozen_${providerId}_${frozen ? "1" : "0"}_${Date.now()}`,
  });
  return { success: true, message: frozen ? `已冻结，同步下架 ${affected} 个在架服务` : "已解冻，服务者可重新上架服务" };
}

export interface PublishServiceInput {
  providerUserId: string;
  title: string;
  scope: string;
  deliveryForm: ConsultService["deliveryForm"];
  price: number;
  deliveryDays: number;
  refundPolicy: string;
}

export interface PublishServiceResult {
  success: boolean;
  message: string;
  service?: ConsultService;
}

/**
 * 上架咨询服务：仅审核通过且未冻结的服务者可上架；
 * 价格须在 consult.minPrice~maxPrice 区间、时限不超过 maxDeliveryDays（均后台可配）。
 */
export function publishConsultService(input: PublishServiceInput): PublishServiceResult {
  const cfg = getToolConfig().consult;
  if (!cfg.enabled) return { success: false, message: "真人咨询服务当前未开放" };

  const provider = getMyProvider(input.providerUserId);
  if (!provider) return { success: false, message: "请先提交服务者入驻申请" };
  if (provider.auditStatus === "pending") return { success: false, message: "入驻申请审核中，通过后方可上架服务" };
  if (provider.auditStatus === "rejected") return { success: false, message: "入驻申请未通过，无法上架服务" };
  if (provider.frozen) return { success: false, message: "服务者账号已冻结，无法上架服务" };

  if (!input.title?.trim() || input.title.trim().length < 4) return { success: false, message: "标题至少4个字" };
  if (!input.scope?.trim() || input.scope.trim().length < 20) {
    return { success: false, message: "请填写至少20字的服务范围说明（做什么、不做什么）" };
  }
  if (!Number.isFinite(input.price) || input.price < cfg.minPrice || input.price > cfg.maxPrice) {
    return { success: false, message: `定价须在 ¥${cfg.minPrice} ~ ¥${cfg.maxPrice} 区间内` };
  }
  if (!Number.isFinite(input.deliveryDays) || input.deliveryDays < 1 || input.deliveryDays > cfg.maxDeliveryDays) {
    return { success: false, message: `交付时限须在 1 ~ ${cfg.maxDeliveryDays} 天` };
  }
  if (!input.refundPolicy?.trim()) return { success: false, message: "请填写退款规则" };

  const services = safeGet<ConsultService[]>(SERVICES_KEY, []);
  const svc: ConsultService = {
    id: genId("cst"),
    providerId: provider.id,
    providerNickname: provider.nickname,
    title: input.title.trim(),
    scope: input.scope.trim(),
    deliveryForm: input.deliveryForm,
    price: Math.round(input.price * 100) / 100,
    deliveryDays: Math.floor(input.deliveryDays),
    refundPolicy: input.refundPolicy.trim(),
    status: "online",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    salesCount: 0,
  };
  services.push(svc);
  safeSet(SERVICES_KEY, services);
  return { success: true, message: "服务已上架", service: svc };
}

export function listConsultServices(filter?: { providerId?: string; onlineOnly?: boolean }): ConsultService[] {
  let list = safeGet<ConsultService[]>(SERVICES_KEY, []);
  if (filter?.providerId) list = list.filter((s) => s.providerId === filter.providerId);
  if (filter?.onlineOnly) list = list.filter((s) => s.status === "online");
  return list.sort((a, b) => b.salesCount - a.salesCount || (a.createdAt < b.createdAt ? 1 : -1));
}

export function getConsultService(serviceId: string): ConsultService | null {
  return safeGet<ConsultService[]>(SERVICES_KEY, []).find((s) => s.id === serviceId) || null;
}

/** 服务者下架/恢复自己的服务；管理端可冻结任何服务 */
export function setConsultServiceStatus(serviceId: string, status: ConsultService["status"], operator: "provider" | "admin"): { success: boolean; message: string } {
  const services = safeGet<ConsultService[]>(SERVICES_KEY, []);
  const svc = services.find((s) => s.id === serviceId);
  if (!svc) return { success: false, message: "服务不存在" };
  svc.status = status;
  svc.updatedAt = new Date().toISOString();
  safeSet(SERVICES_KEY, services);
  if (status === "frozen" && operator === "admin") {
    alert("COMPLAINT_SURGE", "warning", `咨询服务「${svc.title}」已被管理端冻结下架`, serviceId);
  }
  return { success: true, message: "状态已更新" };
}

// ==================== 咨询订单（复用统一订单系统） ====================

export interface CreateConsultOrderResult {
  success: boolean;
  message: string;
  consultOrder?: ConsultOrder;
}

/**
 * 创建咨询订单：订单号由统一订单系统生成（OrderType.CONSULT_SERVICE），
 * 本函数只登记履约台账；支付走统一 Paywall/支付编排，禁止模块内独立支付。
 */
export function createConsultOrder(input: {
  unifiedOrderId: string;
  serviceId: string;
  buyerId: string;
  buyerNickname: string;
  requirement: string;
}): CreateConsultOrderResult {
  const cfg = getToolConfig().consult;
  const svc = getConsultService(input.serviceId);
  if (!svc) return { success: false, message: "服务不存在或已下架" };
  if (svc.status !== "online") return { success: false, message: "该服务当前不可预约" };
  if (svc.providerId === input.buyerId) return { success: false, message: "不能预约自己的服务" };

  const orders = safeGet<ConsultOrder[]>(ORDERS_KEY, []);
  if (orders.some((o) => o.orderId === input.unifiedOrderId)) {
    return { success: false, message: "订单已存在" };
  }
  const platformFee = Math.round(svc.price * cfg.platformFeeRate * 100) / 100;
  const order: ConsultOrder = {
    orderId: input.unifiedOrderId,
    serviceId: svc.id,
    serviceTitle: svc.title,
    providerId: svc.providerId,
    providerNickname: svc.providerNickname,
    buyerId: input.buyerId,
    buyerNickname: input.buyerNickname || "用户",
    amount: svc.price,
    platformFee,
    settleAmount: Math.round((svc.price - platformFee) * 100) / 100,
    status: "paid",
    requirement: (input.requirement || "").trim().slice(0, 500),
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  safeSet(ORDERS_KEY, orders);

  // 销量+1
  const services = safeGet<ConsultService[]>(SERVICES_KEY, []);
  const s = services.find((x) => x.id === svc.id);
  if (s) {
    s.salesCount += 1;
    safeSet(SERVICES_KEY, services);
  }

  notify({
    category: "order",
    title: "新咨询订单",
    body: `用户预约了您的服务「${svc.title}」，请及时接单并在 ${svc.deliveryDays} 天内完成交付。`,
    linkTo: "/featured/consult",
    idempotentKey: `consult_new_${order.orderId}`,
  });
  return { success: true, message: "咨询订单已创建", consultOrder: order };
}

export function listConsultOrders(filter?: { providerId?: string; buyerId?: string; status?: ConsultOrderStatus }): ConsultOrder[] {
  let list = safeGet<ConsultOrder[]>(ORDERS_KEY, []);
  if (filter?.providerId) list = list.filter((o) => o.providerId === filter.providerId);
  if (filter?.buyerId) list = list.filter((o) => o.buyerId === filter.buyerId);
  if (filter?.status) list = list.filter((o) => o.status === filter.status);
  return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** 服务者接单 */
export function acceptConsultOrder(orderId: string, providerUserId: string): { success: boolean; message: string } {
  const provider = getMyProvider(providerUserId);
  const orders = safeGet<ConsultOrder[]>(ORDERS_KEY, []);
  const o = orders.find((x) => x.orderId === orderId);
  if (!o) return { success: false, message: "订单不存在" };
  if (!provider || provider.id !== o.providerId) return { success: false, message: "无权操作此订单" };
  if (o.status !== "paid") return { success: false, message: "订单状态不允许接单" };
  o.status = "accepted";
  safeSet(ORDERS_KEY, orders);
  notify({
    category: "order",
    title: "咨询订单已接单",
    body: `师傅已接单「${o.serviceTitle}」，将按承诺时限交付。`,
    linkTo: "/featured/consult",
    idempotentKey: `consult_accepted_${orderId}`,
  });
  return { success: true, message: "已接单" };
}

/** 服务者交付 */
export function deliverConsultOrder(orderId: string, providerUserId: string, content: string): { success: boolean; message: string } {
  const provider = getMyProvider(providerUserId);
  const orders = safeGet<ConsultOrder[]>(ORDERS_KEY, []);
  const o = orders.find((x) => x.orderId === orderId);
  if (!o) return { success: false, message: "订单不存在" };
  if (!provider || provider.id !== o.providerId) return { success: false, message: "无权操作此订单" };
  if (o.status !== "paid" && o.status !== "accepted") return { success: false, message: "订单状态不允许交付" };
  if (!content?.trim() || content.trim().length < 10) return { success: false, message: "请填写交付内容说明" };
  o.status = "delivered";
  o.deliverContent = content.trim().slice(0, 2000);
  o.deliveredAt = new Date().toISOString();
  safeSet(ORDERS_KEY, orders);
  notify({
    category: "order",
    title: "咨询服务已交付",
    body: `您的咨询「${o.serviceTitle}」已完成交付，请确认收货；如有问题可在7天内发起售后。`,
    linkTo: "/featured/consult",
    idempotentKey: `consult_delivered_${orderId}`,
  });
  return { success: true, message: "已交付，等待买家确认" };
}

/** 买家确认收货 → 进入结算期（settleDays 后可结算） */
export function confirmConsultOrder(orderId: string, buyerId: string): { success: boolean; message: string } {
  const cfg = getToolConfig().consult;
  const orders = safeGet<ConsultOrder[]>(ORDERS_KEY, []);
  const o = orders.find((x) => x.orderId === orderId);
  if (!o) return { success: false, message: "订单不存在" };
  if (o.buyerId !== buyerId) return { success: false, message: "无权操作此订单" };
  if (o.status !== "delivered") return { success: false, message: "订单尚未交付，无法确认" };
  o.status = "confirmed";
  o.confirmedAt = new Date().toISOString();
  o.settleDueAt = new Date(Date.now() + cfg.settleDays * 86400 * 1000).toISOString();
  safeSet(ORDERS_KEY, orders);
  notify({
    category: "order",
    title: "咨询订单已确认",
    body: `买家已确认收货「${o.serviceTitle}」，结算金额 ¥${o.settleAmount} 将于 ${cfg.settleDays} 天后进入您的可提现余额。`,
    linkTo: "/profile/wallet",
    idempotentKey: `consult_confirmed_${orderId}`,
  });
  return { success: true, message: "已确认收货" };
}

/** 买家发起售后（交付前或交付后7天内） */
export function startAfterSale(orderId: string, buyerId: string, reason: string): { success: boolean; message: string } {
  const orders = safeGet<ConsultOrder[]>(ORDERS_KEY, []);
  const o = orders.find((x) => x.orderId === orderId);
  if (!o) return { success: false, message: "订单不存在" };
  if (o.buyerId !== buyerId) return { success: false, message: "无权操作此订单" };
  if (!["paid", "accepted", "delivered"].includes(o.status)) {
    return { success: false, message: "当前状态不支持发起售后" };
  }
  if (!reason?.trim() || reason.trim().length < 10) return { success: false, message: "请填写至少10字的售后原因" };
  o.status = "after_selling";
  o.afterSaleReason = reason.trim().slice(0, 500);
  safeSet(ORDERS_KEY, orders);
  alert("COMPLAINT_SURGE", "warning", `咨询订单 ${orderId} 发起售后：${o.afterSaleReason.slice(0, 60)}`, orderId);
  notify({
    category: "order",
    title: "售后申请已提交",
    body: `订单「${o.serviceTitle}」售后申请已提交，平台将介入仲裁，结果将通过站内消息通知。`,
    idempotentKey: `consult_aftersale_${orderId}`,
  });
  return { success: true, message: "售后申请已提交，等待平台仲裁" };
}

/** 管理端仲裁：退款（买家胜）或驳回（服务者胜，恢复 delivered） */
export function arbitrateAfterSale(orderId: string, refund: boolean, note: string): { success: boolean; message: string } {
  const orders = safeGet<ConsultOrder[]>(ORDERS_KEY, []);
  const o = orders.find((x) => x.orderId === orderId);
  if (!o) return { success: false, message: "订单不存在" };
  if (o.status !== "after_selling") return { success: false, message: "该订单不在售后仲裁中" };
  if (refund) {
    o.status = "refunded";
    o.refundedAt = new Date().toISOString();
    // 退款执行由统一订单/支付体系承载（OrderStatus.REFUNDED），此处登记履约结果
    alert("ABNORMAL_REFUND", "warning", `咨询订单 ${orderId} 仲裁退款 ¥${o.amount}：${note}`, orderId);
    notify({
      category: "order",
      title: "售后仲裁结果：已退款",
      body: `订单「${o.serviceTitle}」仲裁支持退款，¥${o.amount} 将原路退回。${note}`,
      idempotentKey: `consult_refunded_${orderId}`,
    });
  } else {
    o.status = "delivered";
    notify({
      category: "order",
      title: "售后仲裁结果：驳回",
      body: `订单「${o.serviceTitle}」售后申请未获支持，交易继续。${note}`,
      idempotentKey: `consult_arbitrate_reject_${orderId}`,
    });
  }
  safeSet(ORDERS_KEY, orders);
  return { success: true, message: refund ? "已仲裁退款" : "已驳回售后" };
}

/** 结算到期订单（页面加载/定时触发）：confirmed 且过 settleDueAt → settled，入服务者钱包台账 */
export function settleDueConsultOrders(): number {
  const now = Date.now();
  let settled = 0;
  const orders = safeGet<ConsultOrder[]>(ORDERS_KEY, []);
  for (const o of orders) {
    if (o.status !== "confirmed" || !o.settleDueAt) continue;
    if (new Date(o.settleDueAt).getTime() <= now) {
      o.status = "settled";
      o.settledAt = new Date().toISOString();
      settled += 1;
      // 结算入账：写入钱包交易台账（复用钱包体系口径）
      try {
        const raw = localStorage.getItem("yandao_wallet_data");
        if (raw) {
          const wallet = JSON.parse(raw);
          if (wallet && typeof wallet === "object") {
            wallet.totalIncome = Math.round(((wallet.totalIncome || 0) + o.settleAmount) * 100) / 100;
            wallet.availableBalance = Math.round(((wallet.availableBalance || 0) + o.settleAmount) * 100) / 100;
            wallet.recentTransactions = [
              {
                id: genId("wt"),
                userId: o.providerId,
                type: "income",
                amount: o.settleAmount,
                description: `咨询服务结算：${o.serviceTitle}（订单 ${o.orderId}，平台服务费 ¥${o.platformFee}）`,
                relatedOrderId: o.orderId,
                timestamp: new Date().toISOString(),
              },
              ...(wallet.recentTransactions || []),
            ].slice(0, 50);
            localStorage.setItem("yandao_wallet_data", JSON.stringify(wallet));
          }
        }
      } catch {
        /* ignore */
      }
      notify({
        category: "order",
        title: "咨询款已结算",
        body: `订单「${o.serviceTitle}」结算款 ¥${o.settleAmount} 已进入可提现余额。`,
        linkTo: "/profile/wallet",
        idempotentKey: `consult_settled_${o.orderId}`,
      });
    }
  }
  if (settled > 0) safeSet(ORDERS_KEY, orders);
  return settled;
}

/** 履约超时检测：accepted 超过承诺时限未交付 → 告警（禁止静默） */
export function checkDeliveryTimeouts(): number {
  const services = safeGet<ConsultService[]>(SERVICES_KEY, []);
  const orders = safeGet<ConsultOrder[]>(ORDERS_KEY, []);
  let flagged = 0;
  const key = "yandao_consult_timeout_flagged";
  let flaggedIds: string[] = [];
  try {
    flaggedIds = JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    flaggedIds = [];
  }
  for (const o of orders) {
    if (o.status !== "paid" && o.status !== "accepted") continue;
    if (flaggedIds.includes(o.orderId)) continue;
    const svc = services.find((s) => s.id === o.serviceId);
    const limitDays = svc?.deliveryDays || getToolConfig().consult.maxDeliveryDays;
    const deadline = new Date(o.createdAt).getTime() + (limitDays + 1) * 86400 * 1000;
    if (Date.now() > deadline) {
      alert("SERVICE_TIMEOUT", "error", `咨询订单 ${o.orderId}（${o.serviceTitle}）已超承诺交付时限 ${limitDays} 天仍未交付，需平台介入`, o.orderId);
      flaggedIds.push(o.orderId);
      flagged += 1;
    }
  }
  if (flagged > 0) {
    try {
      localStorage.setItem(key, JSON.stringify(flaggedIds.slice(-100)));
    } catch {
      /* ignore */
    }
  }
  return flagged;
}

/** 页面加载统一巡检：结算到期 + 超时告警 */
export function runConsultMaintenance(): void {
  try {
    settleDueConsultOrders();
    checkDeliveryTimeouts();
  } catch {
    /* ignore */
  }
}

// ==================== 统计（LOC 后台展示） ====================

export function getConsultStats(): {
  providersTotal: number;
  providersPending: number;
  servicesOnline: number;
  ordersTotal: number;
  ordersActive: number;
  afterSellingCount: number;
  settledAmount: number;
} {
  const providers = safeGet<ConsultProvider[]>(PROVIDERS_KEY, []);
  const services = safeGet<ConsultService[]>(SERVICES_KEY, []);
  const orders = safeGet<ConsultOrder[]>(ORDERS_KEY, []);
  return {
    providersTotal: providers.length,
    providersPending: providers.filter((p) => p.auditStatus === "pending").length,
    servicesOnline: services.filter((s) => s.status === "online").length,
    ordersTotal: orders.length,
    ordersActive: orders.filter((o) => ["paid", "accepted", "delivered", "confirmed", "after_selling"].includes(o.status)).length,
    afterSellingCount: orders.filter((o) => o.status === "after_selling").length,
    settledAmount: Math.round(orders.filter((o) => o.status === "settled").reduce((s, o) => s + o.settleAmount, 0) * 100) / 100,
  };
}
