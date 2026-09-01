// ============================================================================
// 平台支付门控（遗留兼容文件——正式 SSOT 见 src/lib/platformGate.ts）
// v25.0.77 (IOS-APPSTORE-FINAL-RELEASE-SEAL-11)：iOS 原生壳支付关闭——
// Apple App Review 3.1.1 要求 App 内数字内容购买走 IAP，首版未建内购，
// 全部购买入口在 iOS 壳内拦截；已购会员权益登录恢复不受影响。
// 此前 v25.0.47_14 曾全平台放开（Native 扫码不依赖平台商店），
// v25.0.77 起为 App Store 上架合规重新收口，与本文件值保持一致。
// ============================================================================

export const IOS_PAYMENT_ENABLED = false;

export const IOS_PAYMENT_DISABLED_TIP =
  "iOS 版暂未开放购买功能，您已获得的会员权益登录后可正常使用。";

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIPadOS = navigator.platform === "MacIntel" && (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints !== undefined && (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1;
  return /iPad|iPhone|iPod/i.test(ua) || isIPadOS;
}

/** 数字商品支付是否被平台策略阻断（当前仅 iOS 首版阻断） */
export function isPaymentsBlocked(): boolean {
  return !IOS_PAYMENT_ENABLED && isIOSDevice();
}
