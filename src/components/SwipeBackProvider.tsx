"use client";

/**
 * 右滑返回手势 Provider
 *
 * 包裹应用内容容器，提供 iOS 风格的边缘右滑返回功能。
 * 内部调用 useSwipeBack Hook，负责：
 * - 提供位移动画的目标容器（contentRef）
 * - 确保 SwipeBackProvider 的内容在视觉层级上位于遮罩之上
 *
 * 集成方式（在 app/layout.tsx 中）：
 *
 *   <SwipeBackProvider>
 *     {children}
 *   </SwipeBackProvider>
 *
 * 注意：BottomNav 等固定定位元素应放在 SwipeBackProvider 外部，
 * 以避免 CSS transform 创建的包含块影响其 fixed 定位。
 */

import { useRef } from "react";
import { useSwipeBack } from "@/hooks/useSwipeBack";

export default function SwipeBackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  useSwipeBack(contentRef);

  return (
    <div
      ref={contentRef}
      style={{
        // position: relative 使该元素成为定位上下文，
        // 但不设置 z-index（保持 z-index: auto），
        // 避免创建额外的层叠上下文而影响子元素（如弹窗）的 z-index 行为。
        // 手势滑动时动态添加的 transform 会临时创建层叠上下文，
        // 结束后移除即恢复正常。
        position: "relative",
        // 确保容器有背景色，使遮罩（z-index: -1）在非滑动状态下被完全遮盖
        backgroundColor: "var(--theme-bg, #f8f5fc)",
        // 最小高度占满视口
        minHeight: "100dvh",
      }}
    >
      {children}
    </div>
  );
}
