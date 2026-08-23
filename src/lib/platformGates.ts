// ============================================================================
// 平台支付门控 - v25.0.47_14 (FIX-V14-PAY-MARKETING-VIRAL)
// v25.0.47_14 起支付全平台放开：Native 扫码支付（页面展示付款二维码，
// 微信扫码/长按识别付款）不依赖平台商店，iOS Safari/微信均可正常收款。
//   - Web / Android / iOS / 微信内置浏览器：微信支付全部开放
//   - 历史遗留：v25.0.47_10 曾因 App Store 审核策略临时关闭 iOS 付费
// 与后端 /api/admin/unified/payment-status 的 iosPaymentEnabled 保持一致。
// ============================================================================

export const IOS_PAYMENT_ENABLED = true;

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
