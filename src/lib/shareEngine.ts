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
 * 系统分享（Web Share API）
 * 返回：{ status: 'success' | 'cancelled' | 'unsupported' | 'error' }
 * 用户取消（AbortError）明确不算成功。
 */
export async function systemShareReal(params: {
  title: string;
  text?: string;
  url: string;
}): Promise<"success" | "cancelled" | "unsupported" | "error"> {
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

/** 生成分享链接二维码（本地qrcode包，无境外依赖） */
export async function makeShareQr(url: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#2D1A3E", light: "#FFFFFF" },
  });
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
