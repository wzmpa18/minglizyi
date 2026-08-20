// ============================================================================
// P7-MKT-POSTER-02 二维码自测（第三十条）
// 海报生成后自动 QRCode Decode Test：能否解码 + 链接是否与签名邀请链接一致
// 未通过：海报禁止保存（由调用方控制）
// ============================================================================

export interface QrSelfTestResult {
  passed: boolean;
  decodedText: string;
  expectedLink: string;
  reason: string;
}

function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("poster image load failed"));
    img.src = src;
  });
}

/**
 * 解码海报图片中的二维码，并校验内容与传入的签名邀请链接完全一致。
 * @param posterDataUrl 海报PNG dataUrl
 * @param expectedLink 服务端签名邀请链接（二维码应编码此链接）
 */
export async function qrSelfTest(
  posterDataUrl: string,
  expectedLink: string
): Promise<QrSelfTestResult> {
  if (!posterDataUrl || !expectedLink) {
    return { passed: false, decodedText: "", expectedLink, reason: "海报或链接为空" };
  }
  try {
    const { default: jsQR } = await import("jsqr");
    const img = await loadImageEl(posterDataUrl);
    const scale = Math.min(1, 1080 / img.naturalWidth);
    const cw = Math.max(1, Math.round(img.naturalWidth * scale));
    const ch = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.drawImage(img, 0, 0, cw, ch);
    const imageData = ctx.getImageData(0, 0, cw, ch);
    const code = jsQR(imageData.data, cw, ch);
    if (!code || !code.data) {
      return { passed: false, decodedText: "", expectedLink, reason: "二维码无法解码（可能被遮挡或过小）" };
    }
    if (code.data !== expectedLink) {
      return { passed: false, decodedText: code.data, expectedLink, reason: "二维码内容与邀请链接不一致" };
    }
    return { passed: true, decodedText: code.data, expectedLink, reason: "解码成功且链接一致" };
  } catch (e) {
    return {
      passed: false,
      decodedText: "",
      expectedLink,
      reason: `自测异常：${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/** 链接格式结构校验：必须是 https 且携带签名邀请参数（服务端HMAC） */
export function isSignedInviteLinkShape(link: string): boolean {
  try {
    const u = new URL(link);
    return u.protocol === "https:" && !!(u.searchParams.get("ref") || u.searchParams.get("token") || u.searchParams.get("sig"));
  } catch {
    return false;
  }
}
