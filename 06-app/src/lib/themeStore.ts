/**
 * 主题配置 localStorage 封装层
 * 统一管理 app_theme_config 的读写，避免跨层直接调用 localStorage
 */
const THEME_KEY = "yandao_theme_config";

export function getThemeConfig(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveThemeConfig(config: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
}
