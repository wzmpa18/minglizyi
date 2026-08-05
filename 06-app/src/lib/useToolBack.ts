/**
 * 工具页面返回处理 Hook
 * v18.2 专项整改：统一逐级返回逻辑 + 参数持久化
 * 
 * 使用方式：
 * const { showResult, savedParams, saveParams, handleBack } = useToolBack("yixue_bazi");
 * 
 * 当用户点击返回时：
 * 1. 如果正在显示结果 → 切换回输入模式，参数完整保留
 * 2. 如果已在输入模式 → 通知layout跳转到工具列表
 */
import { useState, useEffect, useCallback } from "react";
import { getUserInput, saveUserInput, clearUserInput } from "./userInputStore";

declare global { interface Window { __yixueBackHandled?: boolean; __zhongyiBackHandled?: boolean; } }

interface UseToolBackOptions {
  /** localStorage 存储键，如 "yixue_bazi" */
  pageKey: string;
  /** 事件名，易学用 "yixue-back"，中医用 "zhongyi-back" */
  eventName?: string;
  /** 全局标记字段 */
  globalFlag?: "__yixueBackHandled" | "__zhongyiBackHandled";
}

export function useToolBack(options: UseToolBackOptions) {
  const { pageKey, eventName = "yixue-back", globalFlag = "__yixueBackHandled" } = options;
  const [showResult, setShowResult] = useState(false);
  const [savedParams, setSavedParams] = useState<Record<string, any> | null>(null);

  // 初始化时从 localStorage 恢复参数
  useEffect(() => {
    const saved = getUserInput(pageKey);
    if (saved) setSavedParams(saved);
  }, [pageKey]);

  // 监听返回事件
  useEffect(() => {
    const handler = () => {
      if (showResult) {
        // 从结果页回到输入页，参数已保留在 savedParams 中
        setShowResult(false);
        window[globalFlag] = true;
      }
      // 如果已在输入页，不做任何事，让 layout 跳转到列表
    };
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [showResult, eventName, globalFlag]);

  // 保存参数
  const saveParams = useCallback((params: Record<string, any>) => {
    setSavedParams(params);
    saveUserInput(pageKey, params);
  }, [pageKey]);

  // 清除参数
  const clearParams = useCallback(() => {
    setSavedParams(null);
    clearUserInput(pageKey);
  }, [pageKey]);

  // 显示结果
  const goToResult = useCallback(() => {
    setShowResult(true);
  }, []);

  return {
    showResult,
    savedParams,
    saveParams,
    clearParams,
    goToResult,
    setShowResult,
  };
}