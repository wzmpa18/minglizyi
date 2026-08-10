"use client";

/**
 * 认证拦截器 - v20.1 登录态永久持久化
 *
 * 核心机制：
 * 1. Token 双轨：access_token (7天) + refresh_token (30天)
 * 2. 401 自动续期：接口返回401时，静默调用刷新接口，续期后自动重发原请求
 * 3. 多端持久化：网页端 localStorage + IndexedDB 双份备份；APP端 Capacitor Preferences
 * 4. 仅手动退出登录时清除 token，其余场景（杀后台、重启、关浏览器）均保持登录
 *
 * 用法：
 *   import { fetchWithAuth } from "@/lib/authInterceptor";
 *   const res = await fetchWithAuth("/api/some-endpoint", { method: "POST", ... });
 */

import { getLoginState, clearLoginState, getUserToken } from "./auth";

// ==================== Token 存储键名 ====================
const REFRESH_TOKEN_KEY = "yandao_refresh_token";
const TOKEN_EXPIRY_KEY = "yandao_token_expiry";
const REFRESH_EXPIRY_KEY = "yandao_refresh_expiry";

// Token 有效期
const ACCESS_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7天
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30天

// ==================== Token 持久化 ====================

/**
 * 保存 token 对（access + refresh）到本地存储
 */
export function saveTokenPair(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  try {
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(now + ACCESS_TOKEN_TTL));
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(REFRESH_EXPIRY_KEY, String(now + REFRESH_TOKEN_TTL));

    // IndexedDB 备份（防止 localStorage 被清理）
    saveToIndexedDB(REFRESH_TOKEN_KEY, refreshToken);
    saveToIndexedDB(REFRESH_EXPIRY_KEY, String(now + REFRESH_TOKEN_TTL));
  } catch {}
}

/**
 * 获取 refresh token（优先 localStorage，回退 IndexedDB）
 */
export async function getRefreshToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // 优先从 localStorage 获取
  let token = localStorage.getItem(REFRESH_TOKEN_KEY);

  // 回退到 IndexedDB
  if (!token) {
    token = await getFromIndexedDB(REFRESH_TOKEN_KEY);
    if (token) {
      // 恢复到 localStorage
      try {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
        const expiry = await getFromIndexedDB(REFRESH_EXPIRY_KEY);
        if (expiry) localStorage.setItem(REFRESH_EXPIRY_KEY, expiry);
      } catch {}
    }
  }

  return token;
}

/**
 * 检查 refresh token 是否过期
 */
export async function isRefreshTokenValid(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const expiryStr = localStorage.getItem(REFRESH_EXPIRY_KEY);
  if (!expiryStr) return false;
  return Date.now() < parseInt(expiryStr, 10);
}

/**
 * 清除所有 token 数据（仅退出登录时调用）
 */
export function clearAllTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(REFRESH_EXPIRY_KEY);
  clearIndexedDB();
}

// ==================== IndexedDB 备份存储 ====================

const DB_NAME = "yandao_auth_backup";
const DB_VERSION = 1;
const STORE_NAME = "tokens";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToIndexedDB(key: string, value: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

async function getFromIndexedDB(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function clearIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
  } catch {}
}

// ==================== 401 自动续期 ====================

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * 静默刷新 token
 * 调用后端 /api/auth/refresh-token 接口，用 refresh_token 换取新的 access_token
 * @returns true=刷新成功, false=刷新失败（需重新登录）
 */
async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return false;

      const isValid = await isRefreshTokenValid();
      if (!isValid) return false;

      const res = await fetch("/api/auth/refresh-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.success && data.accessToken && data.refreshToken) {
        // 更新本地存储的 token
        saveTokenPair(data.accessToken, data.refreshToken);
        return true;
      }

      return false;
    } catch {
      // 网络异常时 token 不失效，恢复网络后自动续期
      return false;
    } finally {
      isRefreshing = false;
    }
  })();

  return refreshPromise;
}

// ==================== 带认证的 fetch 封装 ====================

/**
 * 带认证的 fetch 请求
 * - 自动携带 token
 * - 401 时自动续期并重发
 * - 续期失败时引导登录
 *
 * @param url 请求地址
 * @param options fetch 选项
 * @returns fetch Response
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getUserToken();

  // 注入 Authorization header
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  // 发送请求
  let response = await fetch(url, { ...options, headers });

  // 401 自动续期
  if (response.status === 401 && token) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      // 续期成功，重发原请求
      const newToken = getUserToken();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
      }
      response = await fetch(url, { ...options, headers });
    } else {
      // refresh token 也过期，清除登录态，引导重新登录
      clearLoginState();
      clearAllTokens();

      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname + window.location.search;
        sessionStorage.setItem("yandao_login_redirect", currentPath);
        // 不立即跳转，让调用方处理 401 响应
      }
    }
  }

  return response;
}

/**
 * 检查并恢复登录态（APP启动/页面加载时调用）
 * 尝试从 IndexedDB 恢复 token，确保杀进程/重启后仍保持登录
 */
export async function restoreLoginState(): Promise<void> {
  if (typeof window === "undefined") return;

  const state = getLoginState();

  // 如果 localStorage 中已有登录态，检查是否需要续期
  if (state.isLoggedIn) {
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (expiryStr) {
      const expiry = parseInt(expiryStr, 10);
      // 如果 access token 过期但 refresh token 有效，自动续期
      if (Date.now() > expiry) {
        await refreshAccessToken();
      }
    }
    return;
  }

  // localStorage 无登录态，尝试从 IndexedDB 恢复
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    const isValid = await isRefreshTokenValid();
    if (isValid) {
      // 尝试续期获取新的 access token
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        // 续期失败，清除残留数据
        clearAllTokens();
      }
    } else {
      clearAllTokens();
    }
  }
}
