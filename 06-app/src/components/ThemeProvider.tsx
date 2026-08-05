"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getThemeConfig, saveThemeConfig } from "@/lib/themeStore";

// ==================== 类型定义 ====================
export type ThemeMode = "preset" | "custom";
export type FontSize = "normal" | "large" | "xlarge";

export interface ThemeConfig {
  mode: ThemeMode;
  preset: string;
  primaryColor: string;
  bgColor: string;
  cardBg: string;
  textPrimary: string;
  isDark: boolean;
  fontSize: FontSize;
}

export interface PresetTheme {
  key: string;
  name: string;
  primaryColor: string;
  bgColor: string;
  cardBg: string;
  textPrimary: string;
  isDark: boolean;
}

// ==================== 5 套预设主题 ====================
export const PRESET_THEMES: PresetTheme[] = [
  {
    key: "classic",
    name: "经典紫",
    primaryColor: "#7B2FBE",
    bgColor: "#f8f5fc",
    cardBg: "#ffffff",
    textPrimary: "#1a1a1a",
    isDark: false,
  },
  {
    key: "eye-care",
    name: "护眼绿",
    primaryColor: "#2E7D32",
    bgColor: "#E8F5E9",
    cardBg: "#FAFFF5",
    textPrimary: "#1B5E20",
    isDark: false,
  },
  {
    key: "dark",
    name: "深邃黑",
    primaryColor: "#9C5CF0",
    bgColor: "#000000",
    cardBg: "#1a1a1a",
    textPrimary: "#ffffff",
    isDark: true,
  },
  {
    key: "paper",
    name: "简约米白",
    primaryColor: "#8B4513",
    bgColor: "#F8F1E3",
    cardBg: "#FFFDF5",
    textPrimary: "#3E2723",
    isDark: false,
  },
  {
    key: "minimal",
    name: "极简灰",
    primaryColor: "#333333",
    bgColor: "#F0F0F0",
    cardBg: "#ffffff",
    textPrimary: "#000000",
    isDark: false,
  },
  {
    key: "brand-purple",
    name: "品牌紫",
    primaryColor: "#7B2FBE",
    bgColor: "#f8f5fc",
    cardBg: "#ffffff",
    textPrimary: "#1a1a1a",
    isDark: false,
  },
  {
    key: "pure-white",
    name: "纯白",
    primaryColor: "#7B2FBE",
    bgColor: "#FFFFFF",
    cardBg: "#ffffff",
    textPrimary: "#1a1a1a",
    isDark: false,
  },
  {
    key: "dark-night",
    name: "暗夜",
    primaryColor: "#9C5CF0",
    bgColor: "#1a1a2e",
    cardBg: "#16213e",
    textPrimary: "#e0e0e0",
    isDark: true,
  },
  {
    key: "eye-green",
    name: "护眼绿",
    primaryColor: "#2E7D32",
    bgColor: "#E8F5E9",
    cardBg: "#FAFFF5",
    textPrimary: "#1B5E20",
    isDark: false,
  },
];

// 默认配置
const DEFAULT_CONFIG: ThemeConfig = {
  mode: "preset",
  preset: "classic",
  primaryColor: "#7B2FBE",
  bgColor: "#f8f5fc",
  cardBg: "#ffffff",
  textPrimary: "#1a1a1a",
  isDark: false,
  fontSize: "normal",
};

const STORAGE_KEY = "yandao_theme_config";

// ==================== 颜色工具函数 ====================
/** 将 hex 颜色转为 RGB 数组 */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

/** 将 RGB 分量混合白色（生成浅色变体） */
function mixWithWhite(hex: string, ratio: number): string {
  const [r, g, b] = hexToRgb(hex);
  const nr = Math.round(r + (255 - r) * ratio);
  const ng = Math.round(g + (255 - g) * ratio);
  const nb = Math.round(b + (255 - b) * ratio);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

/** 生成浅色变体（用于背景/hover） */
function generateLightVariant(hex: string, isDark: boolean): string {
  if (isDark) {
    // 深色模式下，浅色变体为半透明主色
    return hexToRgb(hex).length > 0
      ? `rgba(${hexToRgb(hex).join(", ")}, 0.15)`
      : "rgba(156, 92, 240, 0.15)";
  }
  return mixWithWhite(hex, 0.75);
}

/** 根据主色和背景自动推导次要文字颜色 */
function deriveTextSecondary(textPrimary: string, isDark: boolean): string {
  if (isDark) return "#aaaaaa";
  const [r, g, b] = hexToRgb(textPrimary === "#000000" || textPrimary === "#1a1a1a" ? "#000000" : textPrimary);
  // 如果主文字色是深色，次要色用中灰
  if (r < 80 && g < 80 && b < 80) return "#666666";
  return "#666666";
}

function deriveTextHint(isDark: boolean): string {
  return isDark ? "#666666" : "#999999";
}

function deriveBorder(isDark: boolean): string {
  return isDark ? "#2a2a2a" : "#f0f0f0";
}

// 字体大小映射
const FONT_SCALE_MAP: Record<FontSize, number> = {
  normal: 1,
  large: 1.1,
  xlarge: 1.2,
};

// ==================== Context ====================
interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (config: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
  applyPreset: (presetKey: string) => void;
  applyCustom: (primaryColor: string) => void;
  setDarkMode: (isDark: boolean) => void;
  setFontSize: (size: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ==================== Provider ====================
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(DEFAULT_CONFIG);
  const [mounted, setMounted] = useState(false);

  // 从 localStorage 加载配置
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ThemeConfig>;
        const merged = { ...DEFAULT_CONFIG, ...parsed };
        setThemeState(merged);
      }
    } catch {
      // ignore parse errors
    }
    setMounted(true);
  }, []);

  // 将配置应用到 DOM：CSS 变量 + dark-theme class + font-scale
  const applyToDOM = useCallback((config: ThemeConfig) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // 主色及其变体
    root.style.setProperty("--theme-primary", config.primaryColor);
    root.style.setProperty("--theme-primary-light", mixWithWhite(config.primaryColor, config.isDark ? 0.2 : 0.4));
    root.style.setProperty("--theme-primary-bg", generateLightVariant(config.primaryColor, config.isDark));

    // 背景与卡片
    root.style.setProperty("--theme-bg", config.bgColor);
    root.style.setProperty("--theme-card-bg", config.cardBg);

    // 文字颜色
    root.style.setProperty("--theme-text-primary", config.textPrimary);
    root.style.setProperty("--theme-text-secondary", deriveTextSecondary(config.textPrimary, config.isDark));
    root.style.setProperty("--theme-text-hint", deriveTextHint(config.isDark));

    // 边框
    root.style.setProperty("--theme-border", deriveBorder(config.isDark));

    // 字体缩放
    const scale = FONT_SCALE_MAP[config.fontSize];
    root.style.setProperty("--font-scale", String(scale));
    document.body.style.fontSize = `calc(14px * var(--font-scale))`;

    // 深色模式 class
    if (config.isDark) {
      root.classList.add("dark-theme");
    } else {
      root.classList.remove("dark-theme");
    }
  }, []);

  // 每次主题变更时应用到 DOM 并持久化
  useEffect(() => {
    if (!mounted) return;
    applyToDOM(theme);
    try {
      saveThemeConfig(theme);
    } catch {
      // ignore storage errors
    }
  }, [theme, mounted, applyToDOM]);

  // ========== 对外 API ==========
  const setTheme = useCallback((partial: Partial<ThemeConfig>) => {
    setThemeState((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetTheme = useCallback(() => {
    setThemeState(DEFAULT_CONFIG);
  }, []);

  const applyPreset = useCallback((presetKey: string) => {
    const preset = PRESET_THEMES.find((p) => p.key === presetKey);
    if (!preset) return;
    setThemeState({
      mode: "preset",
      preset: presetKey,
      primaryColor: preset.primaryColor,
      bgColor: preset.bgColor,
      cardBg: preset.cardBg,
      textPrimary: preset.textPrimary,
      isDark: preset.isDark,
      fontSize: theme.fontSize, // 保留字体大小设置
    });
  }, [theme.fontSize]);

  const applyCustom = useCallback((primaryColor: string) => {
    setThemeState((prev) => ({
      ...prev,
      mode: "custom",
      preset: "custom",
      primaryColor,
    }));
  }, []);

  const setDarkMode = useCallback((isDark: boolean) => {
    setThemeState((prev) => {
      // 切换明暗时，自动调整背景/卡片/文字色
      if (isDark) {
        return {
          ...prev,
          isDark: true,
          bgColor: "#000000",
          cardBg: "#1a1a1a",
          textPrimary: "#ffffff",
        };
      } else {
        // 切回浅色，恢复当前预设的浅色配色（如果是自定义主色，用默认浅色背景）
        const preset = PRESET_THEMES.find((p) => p.key === prev.preset);
        if (preset && prev.mode === "preset") {
          return {
            ...prev,
            isDark: false,
            bgColor: preset.bgColor,
            cardBg: preset.cardBg,
            textPrimary: preset.textPrimary,
          };
        }
        return {
          ...prev,
          isDark: false,
          bgColor: "#f8f5fc",
          cardBg: "#ffffff",
          textPrimary: "#1a1a1a",
        };
      }
    });
  }, []);

  const setFontSize = useCallback((size: FontSize) => {
    setThemeState((prev) => ({ ...prev, fontSize: size }));
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resetTheme,
        applyPreset,
        applyCustom,
        setDarkMode,
        setFontSize,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ==================== Hook ====================
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

