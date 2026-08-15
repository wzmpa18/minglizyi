/**
 * 工具页面返回处理 Hook
 * v18.2 专项整改：统一逐级返回逻辑 + 参数持久化
 * v18.4 修复：支持可选参数，无参数时返回空操作
 * 
 * 使用方式：
 * const { showResult, savedParams, saveParams, goBack } = useToolBack({ pageKey: "yixue_bazi" });
 * const { goBack } = useToolBack(); // 无参数时 goBack 为空操作
 * 
 * 当用户点击返回时：
 * 1. 如果正在显示结果 → 切换回输入模式，参数完整保留
 * 2. 如果已在输入模式 → 通知layout跳转到工具列表
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { getUserInput, saveUserInput, clearUserInput } from "./userInputStore";

declare global { interface Window { __yixueBackHandled?: boolean; __zhongyiBackHandled?: boolean; } }

interface UseToolBackOptions {
  /** localStorage 存储键，如 "yixue_bazi" */
  pageKey?: string;
  /** 事件名，易学用 "yixue-back"，中医用 "zhongyi-back" */
  eventName?: string;
  /** 全局标记字段 */
  globalFlag?: "__yixueBackHandled" | "__zhongyiBackHandled";
}

export function useToolBack(options?: UseToolBackOptions) {
  const { pageKey = "__default__", eventName = "yixue-back", globalFlag = "__yixueBackHandled" } = options || {};
  const [showResult, setShowResult] = useState(false);
  const [savedParams, setSavedParams] = useState<Record<string, any> | null>(null);

  // v21.6: ref 确保事件处理器始终读取最新 showResult，避免闭包陷阱导致循环跳转
  const showResultRef = useRef(showResult);
  useEffect(() => { showResultRef.current = showResult; }, [showResult]);

  // 初始化时从 localStorage 恢复参数
  useEffect(() => {
    if (!pageKey || pageKey === "__default__") return;
    const saved = getUserInput(pageKey);
    if (saved) setSavedParams(saved);
  }, [pageKey]);

  // 监听返回事件 - v21.6: 使用 ref 避免闭包捕获旧值
  useEffect(() => {
    if (!pageKey || pageKey === "__default__") return;
    const handler = () => {
      if (showResultRef.current) {
        setShowResult(false);
        window[globalFlag] = true;
      }
    };
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [eventName, globalFlag, pageKey]);

  // 保存参数
  const saveParams = useCallback((params: Record<string, any>) => {
    if (!pageKey || pageKey === "__default__") return;
    setSavedParams(params);
    saveUserInput(pageKey, params);
  }, [pageKey]);

  // 清除参数
  const clearParams = useCallback(() => {
    if (!pageKey || pageKey === "__default__") return;
    setSavedParams(null);
    clearUserInput(pageKey);
  }, [pageKey]);

  // 显示结果
  const goToResult = useCallback(() => {
    setShowResult(true);
  }, []);

  // v18.4: goBack - 简单返回上一页
  const goBack = useCallback(() => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  }, []);

  return {
    showResult,
    savedParams,
    saveParams,
    clearParams,
    goToResult,
    goBack,
    setShowResult,
  };
}