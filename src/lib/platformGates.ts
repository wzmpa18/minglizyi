// ============================================================================
// 平台支付门控 - v25.0.47_10 (FINAL-ADMIN-COMMERCIAL-SEAL-02 第三十八章)
// iOS 首版策略：IOS_PAYMENT_ENABLED = false
//   - Web / Android：微信支付正常（Native 扫码 + JSAPI）
//   - iOS 首版：禁止网页微信购买会员/AI 额度等数字商品
//   - iOS 数字商品后续走 StoreKit / IAP
// 与后端 /api/admin/unified/payment-status 的 iosPaymentEnabled 保持一致。
// ============================================================================

export const IOS_PAYMENT_ENABLED = false;

export const IOS_PAYMENT_DISABLED_TIP =
  "iOS 版暂不支持网页支付购买，数字商品将通过 App Store 内购提供，敬请期待后续版本。";

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
