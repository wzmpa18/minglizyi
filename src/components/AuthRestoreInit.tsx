"use client";

import { useEffect } from "react";
import { restoreLoginState } from "@/lib/authInterceptor";

/**
 * 登录态恢复初始化组件 - v20.1
 * 应用启动时自动恢复登录态，确保杀后台、手机重启、关浏览器后仍保持登录
 * 尝试从 IndexedDB 恢复 token，并自动续期过期的 access token
 */
export default function AuthRestoreInit() {
  useEffect(() => {
    // 延迟执行，避免阻塞首屏渲染
    const timer = setTimeout(() => {
      restoreLoginState().catch((e) => {
        console.error("Auth restore error:", e);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
