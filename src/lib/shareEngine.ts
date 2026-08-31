/**
 * 统一分享引擎（Share Engine）- v25.0.47_5 · FINAL-PRODUCTION-SEAL-03
 *
 * 所有易学工具的"分享排盘结果"统一走本引擎，禁止各工具自维护分享代码。
 *
 * 输入：toolType + title + summary + payload（脱敏后的结果摘要）
 * 输出：COPY_LINK / POSTER / QR_CODE / SYSTEM_SHARE 四种真实动作
 *
 * 真实性纪律（第四章）：
 *   - 复制成功 = Clipboard API 真实 resolve
 *   - 海报成功 = 图片真实生成并可保存
 *   - 系统分享成功 = Web Share API 真实返回成功；用户取消 ≠ 成功
 *   - 任何失败 = 抛错/返回 false，由调用方显示失败提示
 */

export interface ShareEngineInput {
  /** 工具类型标识（如 liuyao / ziwei / bazi / qimen / meihua / daliuren） */
  toolType: string;
  /** 分享标题 */
  title: string;
  /** 一句话摘要（≤200字） */
  summary: string;
  /** 结果数据（引擎会再做一次客户端脱敏） */
  payload: unknown;
}

export interface ShareTokenData {
  token: string;
  shareUrl: string;
  expiresAt: string;
}

// ==================== 客户端脱敏（与服务端 sanitizeValue 同口径） ====================

const SENSITIVE_KEY_PATTERNS = [
  /phone|mobile|tel(?!e)/i,
  /idcard|id_card|identity/i,
  /password|passwd|secret|token|session/i,
  /birthday|birth_?time|birth_?date|birthdate/i,
  /手机|电话|身份证|生日|出生|密码/i,
  /^name$|^realName$|^userName$|^nickname$/i,
  /备注|私人|private_?note/i,
  /email/i,
  /avatar|photo|image|headimg/i,
];

function sanitizeClient(value: unknown, depth: number): unknown {
  if (depth > 6) return "[TRUNCATED]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value
      .replace(/1[3-9]\d{9}/g, (m) => m.slice(0, 3) + "****" + m.slice(-2))
      .replace(/\d{17}[\dXx]/g, (m) => m.slice(0, 4) + "**********" + m.slice(-2));
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitizeClient(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERNS.some((re) => re.test(k))) continue;
      out[k] = sanitizeClient(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

// ==================== Token 创建 ====================

/**
 * 创建服务端分享Token（排盘结果存服务端，落地页按Token取回）
 * 失败返回 null（网络错误/接口失败），调用方必须按失败处理。
 */
export async function createShareToken(input: ShareEngineInput): Promise<ShareTokenData | null> {
  if (typeof window === "undefined") return null;
  try {
    const userId = localStorage.getItem("yandao_user_id") || "";
    let userName = "言道用户";
    const profileRaw = localStorage.getItem("yandao_user_profile");
    if (profileRaw) {
      try {
        const p = JSON.parse(profileRaw);
        if (p && p.nickname) userName = String(p.nickname).slice(0, 24);
      } catch { /* ignore */ }
    }
    const res = await fetch("/api/share/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toolType: input.toolType,
        title: input.title,
        summary: input.summary,
        payload: sanitizeClient(input.payload, 0),
        sharer: { userId: /^\d{1,12}$/.test(userId) ? userId : "", userName },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.success && json.data && json.data.token && json.data.shareUrl) {
      return json.data as ShareTokenData;
    }
    return null;
  } catch {
    return null;
  }
}

// ==================== 四种真实分享动作 ====================

/** 兼容性复制：navigator.clipboard 优先，降级 execCommand；真实返回成功与否 */
export async function copyLinkReal(url: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch { /* fall through */ }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = url;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * 系统分享 v2（Share P0 修复 · v25.0.68）：
 *
 * 根因（APP_SHARE_ROOT_CAUSE）：Capacitor Android WebView 中 navigator.share()
 * 存在且 resolve，但宿主 WebView 未实现 Web Share chooser —— 面板从未弹出，
 * 而 systemShareReal v1 把 resolve 误判为 "success"，产生"分享成功"假提示。
 *
 * 修复语义：
 *   1. 原生 APP：优先 @capacitor/share 插件（真实调起 Android/iOS 系统分享面板）
 *      - 原生路径失败直接返回 error，绝不回落到 WebView navigator.share 假成功陷阱
 *   2. Web：Web Share API（浏览器原生面板，真实可用）
 *   - success = 分享面板真实打开 / 系统真实接受
 *   - cancelled = 用户明确取消
 *   - unsupported = 环境不支持（由调用方降级复制链接）
 */
export async function systemShareReal(params: {
  title: string;
  text?: string;
  url: string;
}): Promise<"success" | "cancelled" | "unsupported" | "error"> {
  // 1) 原生 APP：Capacitor Share 插件优先（修复核心）
  if (typeof window !== "undefined") {
    let nativePlatform = false;
    try {
      const { Capacitor } = await import("@capacitor/core");
      nativePlatform = Capacitor.isNativePlatform();
      if (nativePlatform) {
        const { Share } = await import("@capacitor/share");
        await Share.share({
          title: params.title,
          text: params.text || params.title,
          url: params.url,
          dialogTitle: "分享言道国学",
        });
        return "success";
      }
    } catch (e) {
      if (nativePlatform) {
        // 确认原生平台后插件调用失败：直接 error，绝不回落 WebView navigator.share 假成功陷阱
        const err = e as { message?: string };
        if (/cancel/i.test(String(err?.message || ""))) return "cancelled";
        return "error";
      }
      // 平台判定本身失败：按 Web 路径继续
    }
  }
  // 2) Web：Web Share API（真实浏览器分享面板）
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "unsupported";
  }
  try {
    await navigator.share({ title: params.title, text: params.text || params.title, url: params.url });
    return "success";
  } catch (e) {
    const err = e as { name?: string };
    if (err && (err.name === "AbortError" || err.name === "NotAllowedError")) {
      return "cancelled";
    }
    return "error";
  }
}

/**
 * 生成分享链接二维码（本地qrcode包，无境外依赖）
 * v25.0.68：CJS/ESM 双兼容导入（修 Web 端动态导入 default 缺失隐患）+ 内容自检
 */
export async function makeShareQr(url: string): Promise<string> {
  const mod = await import("qrcode");
  const QRCode = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod;
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#2D1A3E", light: "#FFFFFF" },
  });
}

/**
 * 二维码内容自检（Share P1）：Decode(QR) 必须等于预期分享 URL
 * 用 jsqr 从 dataURL 还原像素解码；失败返回 false，调用方按失败处理
 */
export async function verifyShareQr(dataUrl: string, expectedUrl: string): Promise<boolean> {
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load failed"));
      img.src = dataUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const jsQR = (await import("jsqr")).default;
    const decoded = jsQR(data.data, canvas.width, canvas.height);
    return !!decoded && decoded.data === expectedUrl;
  } catch {
    return false;
  }
}

/** 记录分享行为日志（静默，不阻塞主流程） */
export function logShareAction(channel: string): void {
  try {
    if (typeof fetch === "undefined") return;
    const userId = typeof localStorage !== "undefined" ? localStorage.getItem("yandao_user_id") || "" : "";
    fetch("/api/share/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, userId }),
    }).catch(() => {});
  } catch { /* ignore */ }
}
