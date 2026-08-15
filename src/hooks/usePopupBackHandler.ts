"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    __skipPopupCleanup?: boolean;
  }
}

/**
 * 弹窗返回拦截 Hook
 *
 * 弹窗打开时拦截系统返回键/浏览器返回按钮，优先关闭弹窗而非页面返回。
 *
 * 原理：
 *   1. 弹窗打开时 pushState 一个历史记录
 *   2. 用户按返回键 → popstate 事件 → 关闭弹窗（跳过 history.back 清理）
 *   3. 弹窗正常关闭（点击关闭按钮）→ 自动 history.back() 清理历史状态
 *   4. 组件卸载时（如条件渲染移除）→ 自动清理历史状态
 *   5. 页面主动导航离开时 → 设置 __skipPopupCleanup=true 跳过 history.back 清理，
 *      避免 cleanup 的 history.back() 撤销 router.push 导航
 *
 * 用法：
 *   usePopupBackHandler(handleClose, isOpen);
 */
export function usePopupBackHandler(onClose: () => void, isOpen: boolean) {
  const pushedRef = useRef(false);
  const backHandledRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen && !pushedRef.current) {
      window.history.pushState({ __popup: "1" }, "");
      pushedRef.current = true;
      backHandledRef.current = false;
    } else if (!isOpen && pushedRef.current && !backHandledRef.current) {
      pushedRef.current = false;
      if (!window.__skipPopupCleanup) {
        window.history.back();
      } else {
        window.__skipPopupCleanup = false;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (pushedRef.current) {
        backHandledRef.current = true;
        pushedRef.current = false;
        onCloseRef.current();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    return () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        backHandledRef.current = true;
        if (!window.__skipPopupCleanup) {
          window.history.back();
        } else {
          window.__skipPopupCleanup = false;
        }
      }
    };
  }, []);
}