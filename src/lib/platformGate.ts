"use client";

// ============================================================================
// 平台功能开关 PLATFORM_FEATURE_MATRIX - FINAL-RC-02
//
// 单一事实源（SSOT）的前端镜像：
// - 服务端强制执行见 backend_deploy/platformFeatureGate.js（最终裁决方）
// - 本模块只负责前端 UI 隐藏与请求层拦截，避免出现"仅隐藏按钮但 API 仍可调用"
//
// 平台定义：
// - web:    普通浏览器访问 https://yandaoguoxue.yandao.vip
// - android:Android 壳（Capacitor 原生平台 = android）
// - ios:    iOS 壳（Capacitor 原生平台 = ios，UA 追加标记 YandaoGuoxueIOS）
// - wechat: 微信小程序 / 微信内嵌浏览器（预留）
// - qq:     QQ 小程序 / QQ 内嵌浏览器（预留）
// ============================================================================

export type RuntimePlatform = "ios" | "android" | "web" | "wechat" | "qq" | "unknown";

// ==================== iOS 平台开关（v25.0.47_14 起全平台放开） ====================

/**
 * iOS 是否开放付费功能
 * v25.0.47_14 (FIX-V14-PAY-MARKETING-VIRAL)：Native 扫码支付不依赖平台商店，
 * iOS 全环境（Safari/微信/原生壳）恢复微信支付，消除会员入口死键。
 */
export const IOS_PAYMENT_ENABLED = true;

/** iOS 是否开放商城/数字内容购买 */
export const IOS_STORE_ENABLED = false;

/** iOS 付费关闭期间的统一提示文案（历史遗留，仅在开关关闭时展示） */
export const IOS_PAYMENT_DISABLED_TIP =
  "iOS 版暂未开放付费功能，现有免费功能可正常使用。";

// ==================== 平台功能矩阵 ====================
// 与 backend_deploy/platformFeatureGate.js 中的矩阵保持一致。
// 算命/预测/排盘/占卜类：WECHAT OFF、QQ OFF（服务端强制，审核通过后也不可远程打开）
// 支付能力：iOS OFF（本期不开放任何付费）

export const PLATFORM_FEATURE_MATRIX: Record<string, Record<RuntimePlatform, boolean>> = {
  // —— 预测/命理类（小程序永久关闭，服务端强制） ——
  bazi:          { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  ziwei:         { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  qimen:         { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  liuyao:        { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  daliuren:      { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  xiaoliuren:    { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  meihua:        { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  tarot:         { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  astrology:     { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  hehun:         { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  fortuneConsult:{ web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },

  // —— 支付能力（v25.0.47_14：iOS/微信内浏览器全放开，Native扫码全场景收款；QQ小程序维持关闭） ——
  payment:       { web: true, android: true, ios: IOS_PAYMENT_ENABLED, wechat: true, qq: false, unknown: true },
  store:         { web: true, android: true, ios: IOS_STORE_ENABLED, wechat: false, qq: false, unknown: true },

  // —— 学习工具类（ALL ON，小程序第一增长引擎） ——
  materialToExam: { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  learningSpace:  { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  questionBank:   { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  tcmClassics:    { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
};

// ==================== 平台检测 ====================

/**
 * 检测当前运行平台。
 *
 * iOS/Android 壳通过 Capacitor 注入的 window.Capacitor 原生桥识别
 * （server.url 模式下原生桥仍会注入到远端页面）；
 * UA 追加标记（capacitor.config.ts ios.appendUserAgent = "YandaoGuoxueIOS"）
 * 作为原生桥不可用时的兜底。注意：不能仅凭 iPhone/iPad UA 判定为 iOS 壳，
 * 否则会误伤 iPhone Safari 浏览器访问网页版的付费功能。
 */
export function getRuntimePlatform(): RuntimePlatform {
  if (typeof window === "undefined") return "unknown";

  try {
    const cap = (window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    }).Capacitor;

    if (cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) {
      const p = cap.getPlatform ? cap.getPlatform() : "";
      if (p === "ios") return "ios";
      if (p === "android") return "android";
    }

    const ua = navigator.userAgent || "";
    if (/YandaoGuoxueIOS/i.test(ua)) return "ios";
    if (/YandaoGuoxueAndroid/i.test(ua)) return "android";
    if (/micromessenger/i.test(ua)) return "wechat";
    if (/QQ\//i.test(ua)) return "qq";
  } catch {
    // 检测失败按 web 处理，不阻断正常功能
  }

  return "web";
}

/** 是否 iOS 原生壳 */
export function isIOSNative(): boolean {
  return getRuntimePlatform() === "ios";
}

/** 当前平台是否禁止付费（UI 隐藏 + 请求层双重拦截） */
export function isPaymentsBlocked(): boolean {
  if (typeof window === "undefined") return false;
  const platform = getRuntimePlatform();
  return PLATFORM_FEATURE_MATRIX.payment[platform] === false;
}

/** 查询某功能在指定平台（默认当前平台）是否可用 */
export function isFeatureEnabled(feature: string, platform?: RuntimePlatform): boolean {
  const target = platform || getRuntimePlatform();
  const row = PLATFORM_FEATURE_MATRIX[feature];
  if (!row) return true;
  return row[target] !== false;
}

/**
 * 附带到所有 API 请求的客户端平台标识头。
 * 服务端 platformFeatureGate 中间件依据该头对被关闭能力做最终裁决。
 */
export function clientPlatformHeaders(): Record<string, string> {
  return { "X-Client-Platform": getRuntimePlatform() };
}
