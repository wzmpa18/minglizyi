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
        position: "relative",
        // 确保容器有背景色，使遮罩在非滑动状态下被完全遮盖
        backgroundColor: "var(--theme-bg, #f8f5fc)",
        // 最小高度占满视口
        minHeight: "100dvh",
        // 关键：touch-action: pan-y 告诉浏览器只处理垂直滚动，
        // 水平方向的触摸交给 JavaScript 处理（右滑返回手势）
        touchAction: "pan-y",
        // 注意：禁止在此容器上设置 willChange: transform 或常驻 transform，
        // 否则会为所有 position:fixed 后代创建 containing block，
        // 导致弹窗的 fixed inset-0 相对整页而非视口定位（P0-1 事故根因）
        overscrollBehaviorX: "contain",
      }}
    >
      {children}
    </div>
  );
}
