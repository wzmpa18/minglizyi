"use client";

import { useEffect } from "react";

/**
 * P1-6: 弹窗打开时禁止 body 背景滚动
 * 统一管理 body.modal-open 类名，避免页面穿透
 *
 * 引用计数版：多个弹窗组件同时挂载时（如 DatePicker 默认打开 + LoginPromptModal），
 * locked=false 的实例不得清除其他 locked=true 实例添加的类名。
 * 紫微斗数页曾因此丢失 modal-open，导致底部导航栏遮挡弹窗（P0-1 事故）。
 *
 * P1-REOPEN: options.hideNav=false 时弹窗打开仍显示底部导航栏
 * （排盘 DatePicker 场景：弹窗上移避让导航栏，导航栏保持可点击），
 * 默认 hideNav=true 维持原有"弹窗打开隐藏导航栏"行为。
 */

let lockCount = 0;
let navHideCount = 0;

export function useBodyScrollLock(locked: boolean, options?: { hideNav?: boolean }) {
  const hideNav = options?.hideNav !== false;

  useEffect(() => {
    if (!locked) return;
    lockCount++;
    document.body.classList.add("modal-open");
    if (hideNav) {
      navHideCount++;
      document.body.classList.add("nav-hide");
    }
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (hideNav) {
        navHideCount = Math.max(0, navHideCount - 1);
        if (navHideCount === 0) {
          document.body.classList.remove("nav-hide");
        }
      }
      if (lockCount === 0) {
        document.body.classList.remove("modal-open");
      }
    };
  }, [locked, hideNav]);
}
