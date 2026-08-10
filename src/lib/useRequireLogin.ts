"use client";

/**
 * 登录守卫 Hook - v20.1
 * 功能：在调用AI/付费功能前校验登录态，未登录弹出登录提示框
 * 使用场景：易学工具AI解读按钮、姓名解析付费区、发现页发布动态/AI点评、好友/群聊/钱包/推广等
 *
 * 用法：
 *   const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();
 *   const handleAIInterpret = () => {
 *     if (!requireLogin()) return; // 未登录会自动弹出提示框
 *     // 已登录，继续执行...
 *   };
 *   // 在JSX中渲染 <LoginPromptModal />
 */

import { useState, useCallback } from "react";
import { getLoginState } from "./auth";

export interface UseRequireLoginResult {
  /** 检查登录态，未登录则弹出提示框并返回false，已登录返回true */
  requireLogin: () => boolean;
  /** 是否显示登录提示框 */
  showLoginPrompt: boolean;
  /** 设置登录提示框显示状态 */
  setShowLoginPrompt: (show: boolean) => void;
  /** 当前是否已登录 */
  isLoggedIn: boolean;
}

export function useRequireLogin(): UseRequireLoginResult {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const requireLogin = useCallback((): boolean => {
    const state = getLoginState();
    if (!state.isLoggedIn) {
      setShowLoginPrompt(true);
      return false;
    }
    return true;
  }, []);

  const state = getLoginState();

  return {
    requireLogin,
    showLoginPrompt,
    setShowLoginPrompt,
    isLoggedIn: state.isLoggedIn,
  };
}
