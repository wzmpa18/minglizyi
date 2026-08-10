"use client";

import { useEffect } from "react";
import { initCloudSync } from "@/lib/clientStore";

/**
 * 云端同步初始化组件
 * P1.5整改：应用启动时自动初始化云端同步，迁移本地数据到云端
 */
export default function CloudSyncInit() {
  useEffect(() => {
    // 页面加载后延迟初始化，避免阻塞首屏渲染
    const timer = setTimeout(() => {
      initCloudSync().catch((e) => {
        console.error("Cloud sync init error:", e);
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
