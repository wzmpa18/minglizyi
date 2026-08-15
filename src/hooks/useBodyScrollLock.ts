"use client";

import { useEffect } from "react";

/**
 * P1-6: 弹窗打开时禁止 body 背景滚动
 * 统一管理 body.modal-open 类名，避免页面穿透
 *
 * 引用计数版：多个弹窗组件同时挂载时（如 DatePicker 默认打开 + LoginPromptModal），
 * locked=false 的实例不得清除其他 locked=true 实例添加的类名。
 * 紫微斗数页曾因此丢失 modal-open，导致底部导航栏遮挡弹窗（P0-1 事故）。
 */

let lockCount = 0;

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    lockCount++;
    document.body.classList.add("modal-open");
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.classList.remove("modal-open");
      }
    };
  }, [locked]);
}
