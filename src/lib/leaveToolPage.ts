"use client";

import type { useRouter } from "next/navigation";

type ToolRouter = Pick<ReturnType<typeof useRouter>, "replace">;

export function leaveToolPage(router: ToolRouter) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname.replace(/\/$/, "");
  if (!path.startsWith("/yixue/")) return;

  // App Router does not expose the previous entry or a reliable history index.
  router.replace("/yixue/");
}

export function closeInitialToolPopup(router: ToolRouter, reason?: "back") {
  if (typeof window === "undefined") return;
  const path = window.location.pathname.replace(/\/$/, "");
  if (!path.startsWith("/yixue/")) return;

  // On popstate the popup entry has already been removed. An explicit close
  // leaves through the router, so popup cleanup must not queue another back.
  if (reason !== "back" && window.history.state?.__popup === "1") {
    window.__skipPopupCleanup = true;
  }
  leaveToolPage(router);
}

/**
 * 是否由页面顶栏返回键/底部导航触发的"托管返回"。
 * layout 返回键会先设 __skipPopupCleanup 再消费弹窗垫层，
 * 此时弹窗 popstate 关闭不应再自行导航，避免双重跳转。
 */
export function isManagedBackNavigation(): boolean {
  if (typeof window === "undefined") return false;
  return window.__skipPopupCleanup === true;
}
