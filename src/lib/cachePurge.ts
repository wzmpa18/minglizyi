"use client";

// ============================================================================
// 缓存清理工具 - v25.0.47_20
// 背景：用户要求"更新以后自动清除缓存"。新版本部署后，旧标签页自动刷新时
// 必须保证拿到全新构建，而不是任何本地缓存副本。
// 范围：仅清空 CacheStorage 与 Service Worker（可编程缓存），
// 不碰 localStorage —— 登录态与用户数据必须保留。
// ============================================================================

export async function purgeAllCaches(): Promise<void> {
  try {
    if (typeof caches !== "undefined" && caches.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch { /* 老浏览器无 CacheStorage */ }
  try {
    if (typeof navigator !== "undefined" && navigator.serviceWorker?.getRegistrations) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch { /* 无 SW 场景 */ }
}

/** 清缓存后强制刷新（版本更新专用） */
export async function reloadWithCachePurge(): Promise<void> {
  await purgeAllCaches();
  window.location.reload();
}
