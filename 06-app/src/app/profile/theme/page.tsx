"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTheme, PRESET_THEMES, FontSize } from "@/components/ThemeProvider";

// ==================== Toggle Switch ====================
function ToggleSwitch({ checked, onChange, activeColor }: { checked: boolean; onChange: (v: boolean) => void; activeColor?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
      style={{ backgroundColor: checked ? activeColor || "#7B2FBE" : "#ddd" }}
    >
      <span
        className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ==================== 主页面 ====================
export default function ThemeSettingsPage() {
  const router = useRouter();
  const { theme, applyPreset, applyCustom, setDarkMode, setFontSize, resetTheme } = useTheme();

  const primary = theme.primaryColor;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--theme-bg)", maxWidth: "420px", margin: "0 auto", paddingBottom: "80px" }}
    >
      {/* ===== 顶部栏 ===== */}
      <div
        className="sticky top-0 z-10 flex items-center px-4"
        style={{
          height: "48px",
          backgroundColor: "var(--theme-card-bg)",
          borderBottom: "1px solid var(--theme-border)",
        }}
      >
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center"
          style={{ color: "var(--theme-text-primary)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-base font-bold" style={{ color: "var(--theme-text-primary)", marginRight: "32px" }}>
          主题与配色
        </h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* ===== 预设主题 ===== */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--theme-card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        >
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-medium" style={{ color: "var(--theme-text-hint)" }}>预设主题</p>
          </div>
          <div className="grid grid-cols-5 gap-2 px-4 pb-4">
            {PRESET_THEMES.map((preset) => {
              const isSelected = theme.mode === "preset" && theme.preset === preset.key;
              return (
                <button
                  key={preset.key}
                  onClick={() => applyPreset(preset.key)}
                  className="flex flex-col items-center gap-1.5 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: isSelected ? "var(--theme-primary-bg)" : "transparent",
                    border: isSelected ? `2px solid ${preset.primaryColor}` : "2px solid transparent",
                  }}
                >
                  <div className="relative">
                    <div
                      className="h-10 w-10 rounded-full shadow-sm flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${preset.primaryColor} 0%, ${preset.primaryColor} 50%, ${preset.bgColor} 50%, ${preset.bgColor} 100%)`,
                        border: `2px solid ${preset.cardBg}`,
                      }}
                    >
                      {isSelected && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: isSelected ? preset.primaryColor : "var(--theme-text-secondary)" }}>
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== 自定义主色 ===== */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--theme-card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        >
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-medium" style={{ color: "var(--theme-text-hint)" }}>自定义主色</p>
          </div>
          <div className="px-4 pb-4 flex items-center gap-3">
            <label
              className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full shadow-sm"
              style={{ backgroundColor: primary }}
            >
              <input
                type="color"
                value={primary}
                onChange={(e) => applyCustom(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </label>
            <div className="flex-1">
              <p className="text-sm" style={{ color: "var(--theme-text-primary)" }}>
                {theme.mode === "custom" ? "自定义颜色" : "点击色盘选择自定义主色"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--theme-text-hint)" }}>
                当前色值：{primary.toUpperCase()}
              </p>
            </div>
            {theme.mode === "custom" && (
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: primary }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* ===== 深色模式切换 ===== */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--theme-card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--theme-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {theme.isDark ? (
                    <>
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </>
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </>
                  )}
                </svg>
              </div>
              <span className="text-sm" style={{ color: "var(--theme-text-primary)" }}>深色模式</span>
            </div>
            <ToggleSwitch checked={theme.isDark} onChange={setDarkMode} activeColor={primary} />
          </div>
        </div>

        {/* ===== 字体大小 ===== */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--theme-card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        >
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-medium" style={{ color: "var(--theme-text-hint)" }}>字体大小</p>
          </div>
          <div className="flex px-4 pb-4 gap-2">
            {([
              { key: "normal" as FontSize, label: "标准", size: 14 },
              { key: "large" as FontSize, label: "稍大", size: 15 },
              { key: "xlarge" as FontSize, label: "更大", size: 16 },
            ]).map((opt) => {
              const isSelected = theme.fontSize === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setFontSize(opt.key)}
                  className="flex-1 py-2.5 rounded-lg text-center transition-all"
                  style={{
                    backgroundColor: isSelected ? "var(--theme-primary-bg)" : "transparent",
                    border: isSelected ? `1.5px solid ${primary}` : "1.5px solid var(--theme-border)",
                    color: isSelected ? primary : "var(--theme-text-secondary)",
                    fontSize: `${opt.size}px`,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== 预览卡片 ===== */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--theme-card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        >
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-medium" style={{ color: "var(--theme-text-hint)" }}>效果预览</p>
          </div>
          <div className="px-4 pb-4">
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: "var(--theme-bg)",
                border: "1px solid var(--theme-border)",
              }}
            >
              <h3 className="text-base font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
                言道国学
              </h3>
              <p className="text-sm mb-3" style={{ color: "var(--theme-text-secondary)" }}>
                基于传统命理学典籍，提供八字、紫微斗数等排盘功能。
              </p>
              <p className="text-xs mb-3" style={{ color: "var(--theme-text-hint)" }}>
                这是一段提示文字，用于展示辅助信息颜色。
              </p>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: primary }}
                >
                  主要按钮
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: "var(--theme-primary-bg)",
                    color: primary,
                  }}
                >
                  次要按钮
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 重置按钮 ===== */}
        <div className="pt-2 pb-4">
          <button
            onClick={resetTheme}
            className="w-full py-3 rounded-xl text-sm font-medium transition-colors active:opacity-80"
            style={{
              backgroundColor: "var(--theme-card-bg)",
              color: "var(--theme-error)",
              border: "1px solid var(--theme-border)",
            }}
          >
            恢复默认主题
          </button>
        </div>
      </div>
    </div>
  );
}
