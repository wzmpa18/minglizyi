"use client";

// ============================================================================
// 统一异常告警服务 - P6-TOOL-04 §6.2
// 覆盖告警类型：提醒堆积/漏发/重复、支付成功未出报告、报告生成失败、
// 权益核销异常、邀请错绑、奖励重复发放、异常注册转化、异常退款、
// 投诉激增、履约超时、规则版本发布失败、星盘计算异常、择日规则调用失败。
// 所有告警写入本地告警台账 + 站内通知（管理员视角），禁止静默出错。
// ============================================================================

export type AlertLevel = "info" | "warning" | "error" | "critical";

export type AlertType =
  | "REMINDER_DISPATCH_FAIL" // 提醒投递失败
  | "REMINDER_MISSED" // 提醒漏发
  | "REMINDER_DUPLICATE" // 提醒重复
  | "REMINDER_BACKLOG" // 提醒任务堆积
  | "PAY_NO_REPORT" // 支付成功但未生成 AI 报告
  | "AI_REPORT_FAIL" // 报告生成失败
  | "ENTITLEMENT_FAIL" // 权益核销异常
  | "INVITE_BIND_ERROR" // 邀请关系错绑
  | "REWARD_DUPLICATE" // 奖励重复发放
  | "ABNORMAL_REGISTER" // 异常注册/转化
  | "ABNORMAL_REFUND" // 异常退款
  | "COMPLAINT_SURGE" // 投诉激增
  | "SERVICE_TIMEOUT" // 真人服务履约超时
  | "RULE_PUBLISH_FAIL" // 规则/数据版本发布失败
  | "ASTRO_CALC_FAIL" // 星盘计算异常
  | "ZERI_RULE_FAIL" // 择日规则调用失败
  | "ANTIFRAUD_BLOCK"; // 反作弊拦截

export interface AlertRecord {
  id: string;
  type: AlertType;
  level: AlertLevel;
  message: string;
  /** 相关业务标识（订单号/事件ID/用户ID等） */
  refId?: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

const KEY = "yandao_alert_records";
const MAX_KEEP = 500;

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  REMINDER_DISPATCH_FAIL: "提醒投递失败",
  REMINDER_MISSED: "提醒漏发",
  REMINDER_DUPLICATE: "提醒重复",
  REMINDER_BACKLOG: "提醒堆积",
  PAY_NO_REPORT: "支付未出报告",
  AI_REPORT_FAIL: "AI报告失败",
  ENTITLEMENT_FAIL: "权益核销异常",
  INVITE_BIND_ERROR: "邀请错绑",
  REWARD_DUPLICATE: "奖励重复发放",
  ABNORMAL_REGISTER: "异常注册",
  ABNORMAL_REFUND: "异常退款",
  COMPLAINT_SURGE: "投诉激增",
  SERVICE_TIMEOUT: "履约超时",
  RULE_PUBLISH_FAIL: "规则发布失败",
  ASTRO_CALC_FAIL: "星盘计算异常",
  ZERI_RULE_FAIL: "择日规则异常",
  ANTIFRAUD_BLOCK: "反作弊拦截",
};

export const LEVEL_COLORS: Record<AlertLevel, string> = {
  info: "#0284c7",
  warning: "#d97706",
  error: "#dc2626",
  critical: "#7f1d1d",
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function load(): AlertRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AlertRecord[]) : [];
  } catch {
    return [];
  }
}

function save(list: AlertRecord[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX_KEEP)));
  } catch (e) {
    console.error("[alertService] 存储失败:", e);
  }
}

/** 触发一条告警 */
export function raiseAlert(type: AlertType, level: AlertLevel, message: string, refId?: string): AlertRecord {
  const rec: AlertRecord = {
    id: "al_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    type,
    level,
    message,
    refId,
    createdAt: new Date().toISOString(),
    acknowledged: false,
  };
  const list = load();
  list.push(rec);
  save(list);
  // 同时写入统一系统通知中心（audit 类），确保管理员可见
  try {
    // 延迟 import 避免循环依赖
    import("./notificationCenter").then(({ addNotification }) => {
      addNotification({
        category: "audit",
        title: `【告警】${ALERT_TYPE_LABELS[type]}`,
        body: message,
        idempotentKey: rec.id,
      });
    }).catch(() => {});
  } catch {
    /* ignore */
  }
  return rec;
}

export function listAlerts(filter?: { type?: AlertType; level?: AlertLevel; unacknowledgedOnly?: boolean }): AlertRecord[] {
  let list = load().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (filter?.type) list = list.filter((a) => a.type === filter.type);
  if (filter?.level) list = list.filter((a) => a.level === filter.level);
  if (filter?.unacknowledgedOnly) list = list.filter((a) => !a.acknowledged);
  return list;
}

export function acknowledgeAlert(id: string): boolean {
  const list = load();
  const rec = list.find((a) => a.id === id);
  if (!rec) return false;
  rec.acknowledged = true;
  rec.acknowledgedAt = new Date().toISOString();
  save(list);
  return true;
}

export function acknowledgeAllAlerts(): void {
  const list = load();
  for (const a of list) {
    if (!a.acknowledged) {
      a.acknowledged = true;
      a.acknowledgedAt = new Date().toISOString();
    }
  }
  save(list);
}

export function getUnacknowledgedCount(): number {
  return load().filter((a) => !a.acknowledged).length;
}

export function clearAcknowledgedAlerts(): void {
  save(load().filter((a) => !a.acknowledged));
}
