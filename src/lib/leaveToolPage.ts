"use client";

/**
 * 工具页统一离页导航（P1-REOPEN）
 *
 * 背景：工具页返回若一律 router.push("/yixue")，历史栈会累积重复条目，
 * 用户在列表页再按返回会重新落回工具页弹窗，形成"列表↔工具"ping-pong，
 * 永远退不出去（违反"无循环跳转"审计项）。
 *
 * 策略：Next.js App Router 会在 history.state.idx 记录当前条目序号。
 *   - idx > 0：说明列表页在历史栈下方，router.back() 一次即干净回到列表，栈不留重复
 *   - idx 缺失或为 0：说明工具页是直接进入（分享链接/PWA 直达），栈下没有列表，
 *     此时才 router.push("/yixue") 兜底
 */
import { useRouter } from "next/navigation";

export function leaveToolPage(router: ReturnType<typeof useRouter>) {
  if (typeof window === "undefined") return;
  const state = window.history.state as { idx?: number } | null;
  if (state && typeof state.idx === "number" && state.idx > 0) {
    router.back();
  } else {
    router.push("/yixue");
  }
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
