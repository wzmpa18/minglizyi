"use client";

import { useState, useEffect } from "react";

/**
 * 客户端安全日期 Hook
 *
 * 解决 Next.js 静态导出(output: "export")下的 hydration mismatch 问题：
 * - 构建时(SSR)和运行时(客户端)的 new Date() 返回不同值
 * - 导致 React hydration 失败，事件处理器无法绑定到 DOM
 * - 表现为所有 <button onClick> 失效，但原生 <select> 仍可用
 *
 * 解决方案：
 * - 初始渲染(服务端+客户端)使用固定默认日期，保证 hydration 一致
 * - mounted 后在 useEffect 中更新为真实当前日期
 *
 * @returns {Date|null} 初始为默认日期(2026-01-01)，mounted 后为真实当前日期
 */
export function useClientDate(): Date {
  const [date, setDate] = useState<Date>(() => new Date(2026, 0, 1, 12, 0, 0));

  useEffect(() => {
    setDate(new Date());
  }, []);

  return date;
}

/**
 * 仅返回 mounted 状态，用于条件渲染客户端专属内容
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
