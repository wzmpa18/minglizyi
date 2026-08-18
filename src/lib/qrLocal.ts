"use client";

// ============================================================================
// P9-推广中心：本地二维码生成（qrcode 包）
// 替代境外 api.qrserver.com（境内不可靠），全站二维码统一走此助手
// ============================================================================

export async function makeQrDataUrl(
  text: string,
  opts: { width?: number; dark?: string; light?: string; margin?: number } = {}
): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(text, {
    width: opts.width ?? 300,
    margin: opts.margin ?? 2,
    errorCorrectionLevel: "M",
    color: { dark: opts.dark ?? "#2D1A3E", light: opts.light ?? "#FFFFFF" },
  });
}
