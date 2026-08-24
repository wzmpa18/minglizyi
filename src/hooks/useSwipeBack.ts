"use client";

/**
 * v25.0.53 双侧边缘侧滑返回 Hook（DEV-V22-PARTNER-V2-BACKSWIPE）
 *
 * 交互规则（指令口径）：
 * - 触发范围：所有二级及以下页面生效；首页及底部Tab主页面（/ /discover /friends /academy /profile）不触发
 * - 触发区域：屏幕左右两侧边缘各 20dp（CSS px）宽度，从边缘向屏幕中心滑动即可触发
 * - 冲突处理：页面内横向滚动组件（轮播图、横向列表）滑动时不触发全局返回
 *
 * 动效规范：
 * - 跟手动画：滑动过程中当前页面跟随手指水平位移，露出侧边半透明黑色遮罩与返回箭头
 * - 松手判定：滑动距离超过屏幕宽度 1/3 则完成返回，否则回弹回原页面
 * - 与安卓系统返回键、底部导航返回逻辑并存互不冲突（不拦截系统返回，仅手势层路由 back）
 */

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// ==================== 常量配置 ====================

/** 左右边缘触发范围（dp，WebView 中 1dp ≈ 1 CSS px），触摸起始点距任一边缘需 <= 此值 */
const EDGE_THRESHOLD = 20;

/** 触发返回的滑动距离阈值：屏幕宽度的 1/3（动态计算） */
const SWIPE_WIDTH_RATIO = 1 / 3;

/** 最大允许垂直移动距离（px），超过则视为滚动并取消手势 */
const VERTICAL_THRESHOLD = 50;

/** 防抖时间（ms），防止重复触发 */
const DEBOUNCE_MS = 500;

/** 完成/弹回动画时长（ms） */
const ANIMATION_MS = 250;

/** 阻尼生效的分界点（屏幕宽度的比例） */
const DAMP_RATIO = 0.6;

/** 阻尼系数（超过分界点后的位移衰减比例） */
const DAMP_FACTOR = 0.4;

/** 不启用侧滑返回的页面：首页 + 五个底部Tab主页面 + 登录/注册（精确匹配，子页面不受影响） */
const EXCLUDED_PATHS: readonly string[] = [
  "/",
  "/discover",
  "/friends",
  "/academy",
  "/profile",
  "/login",
  "/register",
];

/** 确认水平滑动的最小位移（px），用于区分点击和滑动 */
const MIN_HORIZONTAL_MOVE = 10;

// ==================== 类型定义 ====================

interface SwipeState {
  /** 触摸起始 x 坐标 */
  startX: number;
  /** 触摸起始 y 坐标 */
  startY: number;
  /** 当前触摸 x 坐标 */
  currentX: number;
  /** 当前触摸 y 坐标 */
  currentY: number;
  /** 本次手势从哪个边缘开始（left=左边缘右滑 / right=右边缘左滑） */
  edge: "left" | "right" | null;
  /** 是否在追踪触摸（从边缘开始） */
  isTracking: boolean;
  /** 是否已确认水平滑动（开始阻止默认行为并播放动画） */
  isSwiping: boolean;
  /** 上次触发返回的时间戳（用于防抖） */
  lastTrigger: number;
}

// ==================== 工具函数 ====================

/**
 * 检查触摸目标是否为交互元素（表单输入等），
 * 防止在输入操作时误触返回手势。
 *
 * P1-8: 弹窗打开时允许右滑，右滑会关闭弹窗而非返回页面。
 */
function isInteractiveElement(el: HTMLElement | null): boolean {
  if (!el) return false;

  // 表单输入元素
  if (
    el.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""]'
    )
  ) {
    return true;
  }

  // 明确禁用滑动返回的区域
  if (
    el.closest(
      '[role="dialog"], [data-modal], [data-drawer], [data-swipeback-disabled]'
    )
  ) {
    return true;
  }

  return false;
}

/**
 * 检查触摸目标是否在横向滚动容器内（如标签栏、轮播图）。
 * 如果用户正在横向滚动某个容器，则不触发侧滑返回。
 */
function isInsideHorizontalScroll(el: HTMLElement | null): boolean {
  if (!el) return false;

  let current: HTMLElement | null = el;
  // 向上遍历 DOM 树，最多检查 10 层
  for (let i = 0; i < 10 && current; i++) {
    const style = window.getComputedStyle(current);
    const overflowX = style.overflowX;
    const isScrollable =
      (overflowX === "auto" || overflowX === "scroll") &&
      current.scrollWidth > current.clientWidth;
    if (isScrollable) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

/**
 * 检测当前环境是否支持触摸事件（仅在移动设备上启用手势）。
 */
function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

/**
 * 计算带阻尼的水平位移，模拟 iOS 弹性滚动效果。
 * 在屏幕宽度 DAMP_RATIO 比例内为 1:1 跟手，
 * 超过后按 DAMP_FACTOR 衰减，避免页面滑出过远。
 */
function getDampedDistance(distance: number, screenWidth: number): number {
  const maxDx = screenWidth * DAMP_RATIO;
  if (distance <= maxDx) return distance;
  return maxDx + (distance - maxDx) * DAMP_FACTOR;
}

// ==================== Hook 实现 ====================

/**
 * 双侧边缘侧滑手势返回上一页
 *
 * @param contentRef 需要进行位移动画的内容容器引用
 */
export function useSwipeBack(
  contentRef: React.RefObject<HTMLElement | null>
): void {
  const router = useRouter();
  const pathname = usePathname();

  // ---- 可变状态（存储在 ref 中，避免触发重渲染）----
  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    edge: null,
    isTracking: false,
    isSwiping: false,
    lastTrigger: 0,
  });

  // ---- DOM 元素引用 ----
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef<HTMLDivElement | null>(null);

  // ---- requestAnimationFrame 引用 ----
  const rafRef = useRef<number | null>(null);

  // ---- 保存原始 body overflow（滑动时临时隐藏滚动条）----
  const savedOverflowRef = useRef<string>("");

  // ---- 路径名引用（事件处理函数中获取最新值）----
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // ---- router 引用 ----
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    // 仅在支持触摸的设备上启用
    if (!isTouchDevice()) return;

    // ==================== 创建遮罩与箭头元素 ====================

    const overlay = document.createElement("div");
    overlay.setAttribute("data-swipeback-overlay", "");
    overlay.style.cssText = [
      "position: fixed",
      "top: 0",
      "left: 0",
      "width: 100%",
      "height: 100%",
      "z-index: -1",
      "pointer-events: none",
      "opacity: 0",
      "transition: opacity 0.2s ease",
      "background: rgba(0, 0, 0, 0.35)",
      "display: flex",
      "align-items: center",
      "justify-content: flex-start",
      "padding-left: 20px",
    ].join("; ");

    const arrow = document.createElement("div");
    arrow.style.cssText = [
      "width: 36px",
      "height: 36px",
      "opacity: 0",
      "transform: scale(0.8)",
      "transition: opacity 0.15s ease, transform 0.15s ease",
      "display: flex",
      "align-items: center",
      "justify-content: center",
      "flex-shrink: 0",
    ].join("; ");
    arrow.innerHTML =
      '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<polyline points="15 18 9 12 15 6"></polyline>' +
      "</svg>";

    overlay.appendChild(arrow);
    document.body.appendChild(overlay);
    overlayRef.current = overlay;
    arrowRef.current = arrow;

    // ==================== 辅助函数 ====================

    /** 本次手势的有效位移：恒为正数，表示页面朝脱离边缘方向的移动量 */
    function effectiveDx(): number {
      const s = stateRef.current;
      if (!s.edge) return 0;
      const raw = s.currentX - s.startX;
      return s.edge === "left" ? raw : -raw;
    }

    /** 返回触发阈值：屏幕宽度的 1/3 */
    function swipeThreshold(): number {
      return window.innerWidth * SWIPE_WIDTH_RATIO;
    }

    /** 显示遮罩（背景），箭头透明度由 applyTransform 渐进控制 */
    function showOverlay(): void {
      // 临时隐藏 body 滚动，防止水平溢出产生滚动条
      savedOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const ov = overlayRef.current;
      const ar = arrowRef.current;
      const s = stateRef.current;
      if (ov && ar && s.edge) {
        // 箭头固定在本次手势的起始边缘侧
        if (s.edge === "left") {
          ov.style.justifyContent = "flex-start";
          ov.style.paddingLeft = "20px";
          ov.style.paddingRight = "0";
          ar.style.transform = "";
        } else {
          ov.style.justifyContent = "flex-end";
          ov.style.paddingRight = "20px";
          ov.style.paddingLeft = "0";
          ar.style.transform = "rotate(180deg)";
        }
        ov.style.opacity = "1";
      } else if (ov) {
        ov.style.opacity = "1";
      }
    }

    /** 隐藏遮罩与箭头 */
    function hideOverlay(): void {
      // 恢复 body 滚动
      document.body.style.overflow = savedOverflowRef.current;

      const ov = overlayRef.current;
      if (ov) ov.style.opacity = "0";

      const ar = arrowRef.current;
      if (ar) {
        ar.style.opacity = "0";
        ar.style.transform = "scale(0.8)";
      }
    }

    /**
     * 应用位移变换（在 requestAnimationFrame 回调中调用）。
     * 直接操作 DOM style 以避免 React 重渲染，保证 60fps 流畅度。
     */
    function applyTransform(distance: number): void {
      const content = contentRef.current;
      if (!content) return;

      const s = stateRef.current;
      const dir = s.edge === "right" ? -1 : 1;
      const screenWidth = window.innerWidth;
      const damped = getDampedDistance(distance, screenWidth);

      content.style.transition = "none";
      content.style.transform = `translateX(${damped * dir}px)`;
      content.style.boxShadow =
        dir > 0
          ? "-8px 0 24px rgba(0, 0, 0, 0.25)"
          : "8px 0 24px rgba(0, 0, 0, 0.25)";

      // 根据滑动进度渐进显示箭头
      const progress = Math.min(distance / swipeThreshold(), 1);
      const ar = arrowRef.current;
      if (ar) {
        const baseRotate = s.edge === "right" ? "rotate(180deg) " : "";
        ar.style.opacity = String(progress);
        ar.style.transform = `${baseRotate}scale(${0.8 + progress * 0.2})`;
      }
    }

    /** 弹回原位（滑动距离不足时） */
    function bounceBack(): void {
      const content = contentRef.current;
      if (content) {
        content.style.transition = `transform ${ANIMATION_MS}ms ease-out, box-shadow ${ANIMATION_MS}ms ease-out`;
        content.style.transform = "translateX(0)";
        content.style.boxShadow = "none";

        window.setTimeout(() => {
          if (content) content.style.transition = "";
        }, ANIMATION_MS);
      }
      hideOverlay();
    }

    /** 完成返回动画（滑动距离足够时） */
    function completeSwipe(): void {
      const content = contentRef.current;
      const s = stateRef.current;
      const dir = s.edge === "right" ? -1 : 1;
      if (content) {
        const screenWidth = window.innerWidth;
        content.style.transition = `transform ${ANIMATION_MS}ms ease-in`;
        content.style.transform = `translateX(${screenWidth * dir}px)`;
      }

      window.setTimeout(() => {
        // 执行返回导航
        routerRef.current.back();

        // 重置位移：先隐藏可见性避免跳变，下一帧恢复
        const c = contentRef.current;
        if (c) {
          c.style.transition = "none";
          c.style.transform = "";
          c.style.boxShadow = "none";
          c.style.visibility = "hidden";

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (c) {
                c.style.visibility = "";
                c.style.transition = "";
              }
            });
          });
        }

        hideOverlay();
      }, ANIMATION_MS);
    }

    /** 立即重置所有状态（手势被取消时） */
    function reset(): void {
      const content = contentRef.current;
      if (content) {
        content.style.transition = "none";
        content.style.transform = "";
        content.style.boxShadow = "none";
      }
      hideOverlay();
    }

    // ==================== 事件处理 ====================

    function handleTouchStart(e: TouchEvent): void {
      const s = stateRef.current;

      // 排除首页、底部Tab主页面等（精确匹配，二级页面不受影响）
      if (EXCLUDED_PATHS.includes(pathnameRef.current)) return;

      // 仅单指触摸时追踪（避免与双指缩放冲突）
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];

      // 双侧边缘 20dp 触发区：左边缘或右边缘
      const w = window.innerWidth;
      if (touch.clientX <= EDGE_THRESHOLD) {
        s.edge = "left";
      } else if (touch.clientX >= w - EDGE_THRESHOLD) {
        s.edge = "right";
      } else {
        s.edge = null;
        return;
      }

      // 排除表单输入、对话框、抽屉等交互元素
      const target = e.target as HTMLElement | null;
      if (isInteractiveElement(target)) return;

      // 排除横向滚动组件（标签栏、轮播图等）
      if (isInsideHorizontalScroll(target)) return;

      // 记录起始位置
      s.startX = touch.clientX;
      s.startY = touch.clientY;
      s.currentX = touch.clientX;
      s.currentY = touch.clientY;
      s.isTracking = true;
      s.isSwiping = false;
    }

    function handleTouchMove(e: TouchEvent): void {
      const s = stateRef.current;
      if (!s.isTracking) return;

      // 多指触摸时取消（避免与缩放手势冲突）
      if (e.touches.length !== 1) {
        s.isTracking = false;
        s.isSwiping = false;
        s.edge = null;
        reset();
        return;
      }

      const touch = e.touches[0];
      s.currentX = touch.clientX;
      s.currentY = touch.clientY;

      const distance = effectiveDx();
      const dy = Math.abs(s.currentY - s.startY);

      // 垂直移动超过阈值 → 视为滚动，取消手势
      if (dy > VERTICAL_THRESHOLD) {
        s.isTracking = false;
        s.isSwiping = false;
        s.edge = null;
        reset();
        return;
      }

      // 朝屏幕中心滑动且水平位移明显大于垂直位移 → 确认为返回手势
      if (distance > MIN_HORIZONTAL_MOVE && distance > dy) {
        if (!s.isSwiping) {
          s.isSwiping = true;
          showOverlay();
        }

        // 阻止默认行为（防止页面滚动）
        e.preventDefault();

        // 使用 requestAnimationFrame 优化动画性能
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => {
          applyTransform(distance);
          rafRef.current = null;
        });
      }
    }

    function handleTouchEnd(): void {
      const s = stateRef.current;
      if (!s.isTracking) return;

      const distance = effectiveDx();
      const dy = Math.abs(s.currentY - s.startY);

      // 取消未执行的 rAF
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (
        s.isSwiping &&
        distance >= swipeThreshold() &&
        dy <= VERTICAL_THRESHOLD
      ) {
        // 满足返回条件（屏幕宽度 1/3）→ 检查防抖和历史记录
        const now = Date.now();
        if (now - s.lastTrigger > DEBOUNCE_MS && window.history.length > 1) {
          s.lastTrigger = now;
          completeSwipe();
        } else {
          // 防抖期内或无历史记录 → 弹回
          bounceBack();
        }
      } else if (s.isSwiping) {
        // 距离不足 → 弹回
        bounceBack();
      }

      s.isTracking = false;
      s.isSwiping = false;
      s.edge = null;
    }

    function handleTouchCancel(): void {
      const s = stateRef.current;
      if (!s.isTracking) return;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (s.isSwiping) {
        bounceBack();
      } else {
        reset();
      }

      s.isTracking = false;
      s.isSwiping = false;
      s.edge = null;
    }

    // ==================== 注册事件监听 ====================

    // touchstart / touchend / touchcancel 使用 passive（不需要 preventDefault）
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    // touchmove 需要非 passive（需要调用 preventDefault 阻止滚动）
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    document.addEventListener("touchcancel", handleTouchCancel, {
      passive: true,
    });

    // ==================== 清理 ====================

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchCancel);

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      // 恢复 body overflow
      document.body.style.overflow = savedOverflowRef.current;

      // 移除遮罩元素
      if (overlayRef.current) {
        overlayRef.current.remove();
        overlayRef.current = null;
      }
      arrowRef.current = null;
    };
    // 此 effect 仅在挂载时运行一次；所有动态值通过 ref 获取最新值
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
