"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandHeader, ToggleSwitch } from "@/components/shared";
import { setAllowNearby as setUserStoreAllowNearby, getAllowNearby as getUserStoreAllowNearby, getUserById } from "@/lib/userStore";
import { getBlacklist, removeFromBlacklist } from "@/lib/socialStore";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

function SettingsItem({
  icon,
  label,
  right,
  onClick,
  noBorder,
}: {
  icon?: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  onClick?: () => void;
  noBorder?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 bg-white px-4 py-3.5 text-left active:bg-gray-50"
      style={{ borderBottom: noBorder ? "none" : "1px solid #f5f5f5" }}
    >
      {icon ? <div className="flex h-8 w-8 shrink-0 items-center justify-center">{icon}</div> : null}
      <span className="flex-1 text-sm text-gray-800">{label}</span>
      {right || (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </button>
  );
}

// ==================== 黑名单管理弹窗（P1 收敛：自个人中心迁入） ====================
function BlacklistModal({ onClose }: { onClose: () => void }) {
  const [blacklistIds, setBlacklistIds] = useState<string[]>([]);
  const [tick, setTick] = useState(0);

  useBodyScrollLock(true);
  usePopupBackHandler(onClose, true);

  useEffect(() => {
    setBlacklistIds(getBlacklist());
  }, [tick]);

  const handleUnblock = (userId: string) => {
    removeFromBlacklist(userId);
    setTick((t) => t + 1);
  };

  const blockedUsers = blacklistIds.map((id) => {
    const user = getUserById(id);
    return user ? { userId: user.userId, nickname: user.nickname, avatar: user.avatar } : { userId: id, nickname: id, avatar: "" };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
  <PageLoginGuard />
      <div
        className="w-full max-w-xs rounded-2xl bg-white shadow-xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-bold text-gray-800">黑名单管理</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {blockedUsers.length === 0 ? (
            <div className="py-12 text-center">
              <svg className="mx-auto mb-3" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              <p className="text-sm text-gray-400">黑名单为空</p>
              <p className="text-xs text-gray-400 mt-1">被拉黑的用户将显示在这里</p>
            </div>
          ) : (
            blockedUsers.map((user) => (
              <div key={user.userId} className="flex items-center gap-3 border-b border-gray-50 px-5 py-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-bold"
                  style={{ backgroundColor: BRAND, fontSize: "14px" }}
                >
                  {user.avatar || user.nickname.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{user.nickname}</p>
                  <p className="text-xs text-gray-400">ID: {user.userId}</p>
                </div>
                <button
                  onClick={() => handleUnblock(user.userId)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white active:opacity-80 transition-opacity"
                  style={{ backgroundColor: BRAND }}
                >
                  解除拉黑
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-3">
          <p className="text-center text-xs text-gray-400">解除拉黑后，对方可以重新向你发送好友申请</p>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [allowSearch, setAllowSearch] = useState(true);
  const [allowNearby, setAllowNearby] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [showBlacklist, setShowBlacklist] = useState(false);

  const [cacheSize, setCacheSize] = useState("0 KB");
  const [isClearing, setIsClearing] = useState(false);
  const [cacheToast, setCacheToast] = useState("");

  // 持久化开关状态
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("yandao_privacy_search", String(allowSearch));
    localStorage.setItem("yandao_privacy_nearby", String(allowNearby));
    localStorage.setItem("yandao_notify_enabled", String(notifyEnabled));
    setUserStoreAllowNearby(allowNearby);
  }, [allowSearch, allowNearby, notifyEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const getWithFallback = (newKey: string, oldKey: string) => {
      let val = localStorage.getItem(newKey);
      if (val !== null) return val;
      val = localStorage.getItem(oldKey);
      if (val !== null) {
        localStorage.setItem(newKey, val);
        localStorage.removeItem(oldKey);
      }
      return val;
    };
    const s = getWithFallback("yandao_privacy_search", "privacy_search");
    const n = getWithFallback("yandao_privacy_nearby", "privacy_nearby");
    const nf = getWithFallback("yandao_notify_enabled", "notify_enabled");
    if (s !== null) setAllowSearch(s === "true");
    if (n !== null) setAllowNearby(n === "true");
    if (nf !== null) setNotifyEnabled(nf === "true");
    const storeNearby = getUserStoreAllowNearby();
    setAllowNearby(storeNearby);
  }, []);

  const calculateCacheSize = useCallback(() => {
    if (typeof window === "undefined") return;
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) totalBytes += key.length + (localStorage.getItem(key) || "").length;
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) totalBytes += key.length + (sessionStorage.getItem(key) || "").length;
    }
    const kb = totalBytes / 1024;
    if (kb < 1024) setCacheSize(`${kb.toFixed(1)} KB`);
    else setCacheSize(`${(kb / 1024).toFixed(1)} MB`);
  }, []);

  const handleClearCache = useCallback(() => {
    if (isClearing) return;
    setIsClearing(true);
    try {
      const preserveKeys = [
        "yandao_user_id", "yandao_user_profile", "yandao_login_token", "yandao_login_state",
        "yandao_login_user", "yandao_pwd_store", "yandao_token_expiry", "yandao_refresh_token",
        "yandao_refresh_expiry", "yandao_user_phone",
      ];
      const preserved: Record<string, string | null> = {};
      preserveKeys.forEach((key) => { preserved[key] = localStorage.getItem(key); });

      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !preserveKeys.includes(key)) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      preserveKeys.forEach((key) => {
        if (preserved[key] !== null) localStorage.setItem(key, preserved[key]!);
      });

      sessionStorage.clear();
      calculateCacheSize();
      setCacheToast("缓存已清理，登录状态不受影响");
      setTimeout(() => setCacheToast(""), 3000);
    } catch {
      setCacheToast("清理失败，请重试");
      setTimeout(() => setCacheToast(""), 3000);
    } finally {
      setIsClearing(false);
    }
  }, [isClearing, calculateCacheSize]);

  useEffect(() => { calculateCacheSize(); }, [calculateCacheSize]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f5f5", maxWidth: "420px", margin: "0 auto", paddingBottom: "72px" }}>
      <BrandHeader title="通用设置" showBack />

      {/* ===== 隐私设置 ===== */}
      <div className="mx-3 mt-3 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-gray-400">隐私设置</p>
        </div>
        <SettingsItem
          label="允许被搜索"
          right={<ToggleSwitch checked={allowSearch} onChange={() => setAllowSearch(!allowSearch)} />}
        />
        <SettingsItem
          label="允许附近展示"
          right={<ToggleSwitch checked={allowNearby} onChange={() => setAllowNearby(!allowNearby)} />}
        />
        <SettingsItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          }
          label="黑名单管理"
          onClick={() => setShowBlacklist(true)}
          noBorder
        />
      </div>

      {/* ===== 通知设置 ===== */}
      <div className="mx-3 mt-3 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-gray-400">通知设置</p>
        </div>
        <SettingsItem
          label="接收推送通知"
          right={<ToggleSwitch checked={notifyEnabled} onChange={() => setNotifyEnabled(!notifyEnabled)} />}
          noBorder
        />
      </div>

      {/* ===== 存储与缓存 ===== */}
      <div className="mx-3 mt-3 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-gray-400">存储与缓存</p>
        </div>
        <SettingsItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14a9 3 0 0 0 18 0V5" />
              <path d="M3 12a9 3 0 0 0 18 0" />
            </svg>
          }
          label="当前缓存占用"
          right={<span className="text-xs text-gray-400">{cacheSize}</span>}
        />
        <SettingsItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          }
          label={isClearing ? "清理中..." : "一键清理缓存"}
          onClick={handleClearCache}
          noBorder
        />
      </div>

      {/* ===== 个性化 ===== */}
      <div className="mx-3 mt-3 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-gray-400">个性化</p>
        </div>
        <Link href="/profile/theme" className="block" style={{ borderBottom: "1px solid #f5f5f5" }}>
          <div className="flex w-full items-center gap-3 bg-white px-4 py-3.5 text-left active:bg-gray-50">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r="0.5" fill={BRAND} />
                <circle cx="17.5" cy="10.5" r="0.5" fill={BRAND} />
                <circle cx="8.5" cy="7.5" r="0.5" fill={BRAND} />
                <circle cx="6.5" cy="12.5" r="0.5" fill={BRAND} />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5-4.5-9-10-9z" />
              </svg>
            </div>
            <span className="flex-1 text-sm text-gray-800">主题与配色</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
        <SettingsItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
          label="用户协议"
          onClick={() => router.push("/agreement")}
        />
        <SettingsItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
          label="隐私政策"
          onClick={() => router.push("/privacy")}
          noBorder
        />
      </div>

      {cacheToast && (
        <div className="fixed left-1/2 top-1/2 z-[60] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/75 px-4 py-2 text-sm text-white">
          {cacheToast}
        </div>
      )}

      {showBlacklist && <BlacklistModal onClose={() => setShowBlacklist(false)} />}
    </div>
  );
}
