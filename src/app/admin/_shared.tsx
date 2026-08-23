"use client";

// ============================================================================
// 言道国学 - 后台管理共享 UI 组件与主题常量
// 供 /admin 下所有页面复用，保证视觉一致性（紫色系 #7B2FBE）
// ============================================================================

import React, { useState, useEffect, useCallback, type CSSProperties, type ReactNode } from "react";

// ==================== 主题色 ====================

export const THEME = {
  primary: "#7B2FBE",
  primaryDark: "#6420A0",
  primaryLight: "#9B5ECF",
  primaryBg: "#F3EDF7",
  primaryBgLight: "#faf6fd",
  sidebarBg: "#1f1030",
  sidebarBgHover: "#2d1a45",
  sidebarActive: "#7B2FBE",
  bg: "#f5f0fa",
  cardBg: "#ffffff",
  border: "#e8dcf2",
  textMain: "#2a1a35",
  textSub: "#6b5a78",
  textHint: "#9a8eaa",
  success: "#10B981",
  successBg: "#ecfdf5",
  warning: "#F59E0B",
  warningBg: "#fffbeb",
  error: "#EF4444",
  errorBg: "#fef2f2",
  info: "#3B82F6",
  infoBg: "#eff6ff",
};

// ==================== 通用样式对象 ====================

export const styles = {
  card: {
    backgroundColor: THEME.cardBg,
    borderRadius: 12,
    border: `1px solid ${THEME.border}`,
    padding: 20,
  } as CSSProperties,
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: THEME.textMain,
    display: "flex",
    alignItems: "center",
    gap: 8,
  } as CSSProperties,
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: THEME.textSub,
    marginBottom: 4,
  } as CSSProperties,
  input: {
    width: "100%",
    padding: "8px 12px",
    border: `1px solid ${THEME.border}`,
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    backgroundColor: "#fff",
    boxSizing: "border-box" as const,
    color: THEME.textMain,
    transition: "border-color 0.2s",
  } as CSSProperties,
  btnPrimary: {
    padding: "8px 16px",
    border: "none",
    borderRadius: 8,
    backgroundColor: THEME.primary,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.2s",
  } as CSSProperties,
  btnSecondary: {
    padding: "8px 16px",
    border: `1px solid ${THEME.border}`,
    borderRadius: 8,
    backgroundColor: "#fff",
    color: THEME.textMain,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  } as CSSProperties,
  btnDanger: {
    padding: "6px 12px",
    border: "none",
    borderRadius: 8,
    backgroundColor: THEME.errorBg,
    color: THEME.error,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  } as CSSProperties,
};

// ==================== 通用组件 ====================

/** 卡片容器 */
export function AdminCard({
  children,
  style,
  title,
  extra,
}: {
  children: ReactNode;
  style?: CSSProperties;
  title?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div style={{ ...styles.card, ...style }}>
      {(title || extra) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: title ? 14 : 0,
          }}
        >
          {title && <div style={styles.sectionTitle}>{title}</div>}
          {extra}
        </div>
      )}
      {children}
    </div>
  );
}

/** 统计数字卡片 */
export function StatCard({
  label,
  value,
  sub,
  icon,
  color = THEME.primary,
  trend,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  color?: string;
  trend?: { value: number; label?: string };
}) {
  return (
    <div
      style={{
        backgroundColor: THEME.cardBg,
        borderRadius: 12,
        border: `1px solid ${THEME.border}`,
        padding: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 4,
          height: "100%",
          backgroundColor: color,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 13, color: THEME.textSub, fontWeight: 500 }}>{label}</div>
        {icon && <div style={{ color, fontSize: 18 }}>{icon}</div>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: THEME.textMain, marginTop: 8, lineHeight: 1.2 }}>
        {value}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        {sub && <div style={{ fontSize: 12, color: THEME.textHint }}>{sub}</div>}
        {trend && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: trend.value >= 0 ? THEME.success : THEME.error,
            }}
          >
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%{trend.label ? ` ${trend.label}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

/** 开关组件 */
export function ToggleSwitch({
  checked,
  onChange,
  size = "md",
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  size?: "sm" | "md";
}) {
  const w = size === "sm" ? 36 : 44;
  const h = size === "sm" ? 20 : 24;
  const knob = size === "sm" ? 14 : 18;
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: w,
        height: h,
        borderRadius: h / 2,
        backgroundColor: checked ? THEME.primary : "#d1d5db",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background-color 0.25s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: (h - knob) / 2,
          left: checked ? w - knob - (h - knob) / 2 : (h - knob) / 2,
          width: knob,
          height: knob,
          borderRadius: "50%",
          backgroundColor: "#fff",
          transition: "left 0.25s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

/** 状态徽章 */
export function Badge({
  children,
  type = "default",
}: {
  children: ReactNode;
  type?: "default" | "success" | "warning" | "error" | "info" | "primary";
}) {
  const colorMap: Record<string, { bg: string; color: string }> = {
    default: { bg: "#f3f4f6", color: "#6b7280" },
    success: { bg: THEME.successBg, color: THEME.success },
    warning: { bg: THEME.warningBg, color: THEME.warning },
    error: { bg: THEME.errorBg, color: THEME.error },
    info: { bg: THEME.infoBg, color: THEME.info },
    primary: { bg: THEME.primaryBg, color: THEME.primary },
  };
  const c = colorMap[type] || colorMap.default;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: c.bg,
        color: c.color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/** 章节标题 */
export function SectionTitle({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div style={styles.sectionTitle}>
      {icon && <span style={{ color: THEME.primary }}>{icon}</span>}
      {children}
    </div>
  );
}

/** 加载动画 */
export function LoadingSpinner({ text = "加载中..." }: { text?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 40, color: THEME.textSub }}>
      <div
        style={{
          width: 20,
          height: 20,
          border: `2px solid ${THEME.primaryBg}`,
          borderTopColor: THEME.primary,
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      {text}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/**
 * Toast 提示
 * v25.0.47_19 修复：show 必须用 useCallback 稳定引用。
 * 此前 show 每次渲染都是新函数，导致依赖它的 useCallback（load/refresh）连锁失效，
 * 多个后台页面陷入「渲染→重建回调→useEffect 重跑→重新请求」无限循环：
 * 表现为页面一直闪、请求风暴（每~120ms一次）、浏览器渲染进程崩溃白屏。
 * 严禁移除 useCallback，否则总览/工具/资讯/营销/价格/开关/订单/分佣全部回归死循环。
 */
export function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" | "warning" } | null>(null);
  const show = useCallback((msg: string, type: "success" | "error" | "info" | "warning" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  }, []);
  const node = toast
    ? (() => {
        const c =
          toast.type === "success"
            ? { bg: THEME.success, text: "#fff" }
            : toast.type === "error"
            ? { bg: THEME.error, text: "#fff" }
            : toast.type === "warning"
            ? { bg: THEME.warning, text: "#fff" }
            : { bg: THEME.info, text: "#fff" };
        return (
          <div
            style={{
              position: "fixed",
              top: 20,
              right: 20,
              zIndex: 9999,
              padding: "10px 20px",
              borderRadius: 8,
              backgroundColor: c.bg,
              color: c.text,
              fontSize: 14,
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              animation: "slideIn 0.3s ease",
            }}
          >
            {toast.msg}
          </div>
        );
      })()
    : null;
  return { show, toastNode: node };
}

/** 确认对话框 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  onConfirm,
  onCancel,
  danger = false,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 24,
          maxWidth: 380,
          width: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: THEME.textMain, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 14, color: THEME.textSub, lineHeight: 1.6, marginBottom: 20 }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button style={styles.btnSecondary} onClick={onCancel}>
            {cancelText}
          </button>
          <button
            style={{
              ...styles.btnPrimary,
              backgroundColor: danger ? THEME.error : THEME.primary,
            }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 简易条形进度条 */
export function ProgressBar({ value, max, color = THEME.primary }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ width: "100%", height: 8, backgroundColor: THEME.primaryBg, borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: 4, transition: "width 0.4s" }} />
    </div>
  );
}

/** 客户端挂载检测 hook（避免 hydration 不匹配） */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
