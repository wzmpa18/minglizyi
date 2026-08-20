// ============================================================================
// P7-MKT-POSTER-02 传播统计埋点（第三十三条）
// poster_generated / poster_saved / copy_copied / system_share_started /
// style_switched / qr_selftest_failed
// 第三十四条：系统分享只记 share_started，不伪造 share_success
// ============================================================================

import type { MarketingEventPayload } from "./types";

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

/** 静默上报，失败不打扰用户 */
export async function logMarketingEvent(payload: MarketingEventPayload): Promise<void> {
  if (typeof window === "undefined") return;
  let userId = "";
  try {
    userId = localStorage.getItem("yandao_user_id") || "";
  } catch { /* ignore */ }
  try {
    await fetch(`${API_BASE}/api/poster/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: payload.event,
        userId,
        size: payload.ratio,
        audience: payload.audience,
        product: payload.product,
        channel: payload.channel,
        template: payload.template,
        ratio: payload.ratio,
        copyId: payload.copyId,
      }),
      keepalive: true,
    });
  } catch { /* 静默 */ }
}
