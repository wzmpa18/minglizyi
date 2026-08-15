"use client";

import { useEffect } from "react";

/**
 * P1-6: 弹窗打开时禁止 body 背景滚动
 * 统一管理 body.modal-open 类名，避免页面穿透
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (locked) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [locked]);
}