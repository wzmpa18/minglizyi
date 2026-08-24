"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * v25.0.21: 全局缩放组件（新增可关闭开关）
 *
 * 功能：
 * 1. 移动端：双指捏拉缩放，双击切换100%/200%
 * 2. 桌面端：Ctrl+滚轮缩放，放大后按住拖动查看
 * 3. 缩放范围：100% ~ 250%，localStorage全局记忆
 * 4. 放大后支持上下左右拖动查看（桌面端鼠标拖动，移动端原生滚动）
 * 5. 放大时弹出自动关闭提醒（可在 我的-通用设置 关闭放大功能）
 * 6. v25.0.21：新增「屏幕放大」总开关（yandao_zoom_disabled），关闭后禁用所有缩放交互
 *
 * 集成方式：在 app/layout.tsx 中包裹 {children}
 */

const STORAGE_KEY = "yandao_global_zoom";
const HINT_KEY = "yandao_zoom_hint_shown";
const DISABLED_KEY = "yandao_zoom_disabled";
const MIN_ZOOM = 1.0;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;
const DOUBLE_TAP_MS = 300;

export default function GlobalZoomProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [zoom, setZoom] = useState(1.0);
  const [showHint, setShowHint] = useState(false);
  const [showRemind, setShowRemind] = useState(false);
  const [zoomDisabled, setZoomDisabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);

  // 桌面端拖动相关
  const dragState = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  }>({ isDragging: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });

  // ====== 设置缩放（带边界限制） ======
  const setZoomSafe = useCallback(
    (next: number) => {
      const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(next * 10) / 10));
      setZoom(clamped);
    },
    []
  );

  // ====== 挂载时读取保存的缩放级别/关闭开关 + 首次提示 ======
  // v25.0.47_24: 屏幕放大默认关闭——仅当用户在「我的-通用设置」显式开启（yandao_zoom_disabled === "0"）时才启用缩放交互
  useEffect(() => {
    let explicitlyEnabled = false;
    try {
      const disabled = localStorage.getItem(DISABLED_KEY);
      explicitlyEnabled = disabled === "0";
      if (!explicitlyEnabled) setZoomDisabled(true);

      if (explicitlyEnabled) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const val = parseFloat(saved);
          if (val >= MIN_ZOOM && val <= MAX_ZOOM) {
            setZoom(val);
          }
        }
      }
    } catch {}

    // 首次提示（仅放大功能已开启时才展示）
    try {
      if (!localStorage.getItem(HINT_KEY)) {
        localStorage.setItem(HINT_KEY, "1");
        if (explicitlyEnabled) {
          setShowHint(true);
          const timer = setTimeout(() => setShowHint(false), 3000);
          return () => clearTimeout(timer);
        }
      }
    } catch {}
  }, []);

  // ====== 监听设置页开关变化（跨组件实时生效） ======
  useEffect(() => {
    const onToggle = (e: Event) => {
      const detail = (e as CustomEvent).detail as { disabled: boolean } | undefined;
      const nextDisabled = detail ? detail.disabled : localStorage.getItem(DISABLED_KEY) === "1";
      setZoomDisabled(nextDisabled);
      if (nextDisabled) setZoom(1.0);
    };
    window.addEventListener("yandao-zoom-toggle", onToggle);
    return () => window.removeEventListener("yandao-zoom-toggle", onToggle);
  }, []);

  // ====== 缩放变化时持久化 ======
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(zoom));
    } catch {}
  }, [zoom]);

  // ====== v25.0.21：从 100% 放大时弹自动关闭提醒（3秒） ======
  useEffect(() => {
    if (zoom > 1.0) {
      setShowRemind(true);
      const timer = setTimeout(() => setShowRemind(false), 3000);
      return () => clearTimeout(timer);
    }
    setShowRemind(false);
  }, [zoom > 1.0]); // eslint-disable-line react-hooks/exhaustive-deps

  // ====== 桌面端：Ctrl+滚轮缩放 ======
  useEffect(() => {
    if (zoomDisabled) return;
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoom((z) => {
          const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round((z + delta) * 10) / 10));
          return clamped;
        });
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoomDisabled]);

  // ====== 桌面端：放大后鼠标拖动查看 ======
  useEffect(() => {
    if (zoomDisabled || zoom <= 1.0) return;

    const handleMouseDown = (e: MouseEvent) => {
      // 仅左键拖动
      if (e.button !== 0) return;
      // 排除按钮、链接、输入框等交互元素
      const target = e.target as HTMLElement;
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.closest("button") ||
        target.closest("a")
      ) {
        return;
      }

      dragState.current = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: window.scrollX,
        scrollTop: window.scrollY,
      };
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.current.isDragging) return;

      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;

      window.scrollTo(
        dragState.current.scrollLeft - dx,
        dragState.current.scrollTop - dy
      );
    };

    const handleMouseUp = () => {
      if (dragState.current.isDragging) {
        dragState.current.isDragging = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseleave", handleMouseUp);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [zoom, zoomDisabled]);

  // ====== 移动端：双指捏拉缩放 ======
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (zoomDisabled) return;
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        pinchStartRef.current = { dist, zoom };
      }
    },
    [zoom, zoomDisabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (zoomDisabled) return;
      if (e.touches.length === 2 && pinchStartRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ratio = dist / pinchStartRef.current.dist;
        setZoomSafe(pinchStartRef.current.zoom * ratio);
      }
    },
    [setZoomSafe, zoomDisabled]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (zoomDisabled) return;
      if (e.touches.length < 2) {
        pinchStartRef.current = null;
      }

      // 双击切换 100% / 200%
      if (e.touches.length === 0 && e.changedTouches.length === 1) {
        const now = Date.now();
        if (now - lastTapRef.current < DOUBLE_TAP_MS) {
          setZoomSafe(zoom > 1.5 ? 1.0 : 2.0);
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
        }
      }
    },
    [zoom, setZoomSafe, zoomDisabled]
  );

  return (
    <div
      ref={containerRef}
      style={{
        zoom: zoom,
        // 放大时允许内容溢出并可滚动查看
        overflow: zoom > 1.0 ? "auto" : "visible",
        minHeight: zoom > 1.0 ? "100vh" : undefined,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}

      {/* 首次使用提示 */}
      {showHint && !zoomDisabled && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.78)",
            color: "#fff",
            padding: "8px 18px",
            borderRadius: "20px",
            fontSize: "12px",
            zIndex: 9999,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            animation: "zoomHintFade 0.3s ease",
          }}
        >
          双指捏拉可放大页面 · 双击切换
        </div>
      )}

      {/* v25.0.21：放大时提醒（自动关闭，提示可去设置关闭） */}
      {showRemind && !zoomDisabled && (
        <div
          style={{
            position: "fixed",
            bottom: "110px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.78)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "12px",
            zIndex: 9999,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            animation: "zoomHintFade 0.3s ease",
          }}
        >
          页面已放大 · 可在「我的-通用设置」关闭放大功能
        </div>
      )}

      {/* 缩放指示器（非100%时显示） */}
      {zoom !== 1.0 && !zoomDisabled && (
        <button
          onClick={() => setZoomSafe(1.0)}
          style={{
            position: "fixed",
            bottom: "70px",
            right: "16px",
            background: "rgba(123,47,190,0.9)",
            color: "#fff",
            border: "none",
            borderRadius: "20px",
            padding: "4px 12px",
            fontSize: "11px",
            fontWeight: 600,
            zIndex: 9998,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {Math.round(zoom * 100)}% ✕
        </button>
      )}

      <style>{`
        @keyframes zoomHintFade {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
