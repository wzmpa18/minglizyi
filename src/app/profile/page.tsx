"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ToggleSwitch } from "@/components/shared";
import { clearLoginState, getLoginState, setLoginState, updateUserProfile, type LoginState } from "@/lib/auth";
import { clearAllTokens } from "@/lib/authInterceptor";
import { ensureCurrentUserInDirectory, getCurrentUserEntry, getUserById, setAllowNearby as setUserStoreAllowNearby, getAllowNearby as getUserStoreAllowNearby } from "@/lib/userStore";
import { getBlacklist, removeFromBlacklist } from "@/lib/socialStore";

const BRAND = "#7B2FBE";

// ==================== 列表项组件 ====================
function ListItem({
  icon,
  label,
  right,
  onClick,
  noBorder,
}: {
  icon: React.ReactNode;
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
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">{icon}</div>
      <span className="flex-1 text-sm text-gray-800">{label}</span>
      {right || (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </button>
  );
}

// ==================== 二维码弹窗 ====================
function QRModal({ onClose, userId, nickname }: { onClose: () => void; userId: string; nickname?: string }) {
  const shareUrl = `https://yandao.vip/friend?ref=${userId}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&bgcolor=ffffff&color=7B2FBE`;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = qrApiUrl;
    link.download = `yandao-qrcode-${userId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("链接已复制到剪贴板！分享给好友即可添加");
    }).catch(() => {
      prompt("复制此链接分享给好友：", shareUrl);
    });
  };

  const handleOpenBrowser = () => {
    window.open(shareUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">我的二维码</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-xl border-2 overflow-hidden" style={{ borderColor: BRAND }}>
          <img
            src={qrApiUrl}
            alt="我的二维码"
            className="h-full w-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
          />
        </div>

        <div className="text-center mt-3">
          <p className="text-sm font-bold text-gray-800">{nickname || '言道用户'}</p>
          <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {userId}</p>
          <p className="text-xs text-gray-400 mt-1">扫一扫，加我为好友</p>
        </div>

        <p className="mt-3 text-center text-sm font-medium" style={{ color: BRAND }}>
          扫码添加好友，邀请享佣金
        </p>
        <p className="mt-1 text-center text-xs text-gray-400">
          我的邀请码：{userId}
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 rounded-lg py-2.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            保存二维码
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 rounded-lg py-2.5 text-xs font-semibold transition-colors hover:opacity-90"
            style={{ backgroundColor: "#f5f0fa", color: BRAND, border: `1px solid ${BRAND}` }}
          >
            复制链接
          </button>
        </div>
        <button
          onClick={handleOpenBrowser}
          className="mt-2 w-full rounded-lg py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          style={{ backgroundColor: "transparent" }}
        >
          在浏览器中打开 →
        </button>
      </div>
    </div>
  );
}

// ==================== 退出登录确认弹窗 ====================
function LogoutConfirmModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  const handleConfirmLogout = () => {
    // v18.3 整改：真实清除登录状态
    clearLoginState();
    // v20.1: 清除所有 token 数据（access + refresh + IndexedDB备份）
    clearAllTokens();
    // 同时清除 profile 页面自身的 localStorage 数据
    if (typeof window !== "undefined") {
      localStorage.removeItem("profile_userid");
      // 新键名
      localStorage.removeItem("yandao_privacy_search");
      localStorage.removeItem("yandao_privacy_nearby");
      localStorage.removeItem("yandao_notify_enabled");
      // 兼容旧键名
      localStorage.removeItem("privacy_search");
      localStorage.removeItem("privacy_nearby");
      localStorage.removeItem("notify_enabled");
    }
    onClose();
    // 返回首页，以游客模式浏览
    router.push("/");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div className="w-full max-w-xs rounded-2xl bg-white shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          <h3 className="text-base font-bold text-gray-800">确认退出登录？</h3>
          <p className="mt-2 text-sm text-gray-500">退出后需要重新登录</p>
        </div>
        <div className="flex border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm text-gray-600 active:bg-gray-50"
            style={{ borderRight: "1px solid #f5f5f5" }}
          >
            取消
          </button>
          <button
            onClick={handleConfirmLogout}
            className="flex-1 py-3 text-sm font-medium text-red-500 active:bg-gray-50"
          >
            退出
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 黑名单管理弹窗 ====================
function BlacklistModal({ onClose }: { onClose: () => void }) {
  const [blacklistIds, setBlacklistIds] = useState<string[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setBlacklistIds(getBlacklist());
  }, [tick]);

  const handleUnblock = (userId: string) => {
    removeFromBlacklist(userId);
    setTick((t) => t + 1);
  };

  // 获取黑名单用户信息
  const blockedUsers = blacklistIds
    .map((id) => {
      const user = getUserById(id);
      return user ? { userId: user.userId, nickname: user.nickname, avatar: user.avatar } : { userId: id, nickname: id, avatar: "" };
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-2xl bg-white shadow-xl overflow-hidden max-h-[70vh] flex flex-col"
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
              <div
                key={user.userId}
                className="flex items-center gap-3 border-b border-gray-50 px-5 py-3"
              >
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
          <p className="text-center text-xs text-gray-400">
            解除拉黑后，对方可以重新向你发送好友申请
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== 关于我们弹窗 ====================
function AboutUsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-2xl bg-white shadow-xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-bold text-gray-800">关于我们</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* App 名称与图标 */}
          <div className="text-center">
            <div
              className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: BRAND }}
            >
              <span className="text-2xl font-bold text-white">言</span>
            </div>
            <h4 className="text-lg font-bold text-gray-800">言道</h4>
            <p className="text-xs text-gray-400">v19.0</p>
          </div>

          {/* 应用简介 */}
          <div>
            <p className="text-sm text-gray-600 leading-relaxed">
              传统文化学习平台，致力于传承和弘扬中华优秀传统文化，涵盖易学（紫微斗数、八字、奇门遁甲、六爻、梅花易数）和中医（中药、方剂、经络穴位、辨证学习、典籍学习）等领域的系统学习工具
            </p>
          </div>

          {/* 核心功能 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">核心功能</p>
            <ul className="space-y-1.5 text-xs text-gray-500">
              <li className="flex items-start gap-2">
                <span style={{ color: BRAND }}>•</span>
                <span>易学排盘与AI解读</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: BRAND }}>•</span>
                <span>中医知识库与智能问诊</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: BRAND }}>•</span>
                <span>社交互动</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: BRAND }}>•</span>
                <span>会员体系</span>
              </li>
            </ul>
          </div>

          {/* 免责声明 */}
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-600">免责声明：</span>
              本应用内容仅供传统文化学习研究参考，不构成医疗诊断、投资建议或人生决策依据
            </p>
          </div>

          {/* 版权信息 */}
          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">© 2026 言道</p>
            <p className="text-xs text-gray-400 mt-0.5">版权所有</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 主页面组件 ====================
export default function ProfilePage() {
  const router = useRouter();
  const [allowSearch, setAllowSearch] = useState(true);
  const [allowNearby, setAllowNearby] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(true);

  const [showQR, setShowQR] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [fanCount, setFanCount] = useState(0);
  const [copied, setCopied] = useState(false);

  // 编辑资料相关状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  // v20.1: 缓存管理状态
  const [cacheSize, setCacheSize] = useState("0 KB");
  const [isClearing, setIsClearing] = useState(false);
  const [cacheToast, setCacheToast] = useState("");

  // v20.1: 计算本地缓存占用大小
  const calculateCacheSize = useCallback(() => {
    if (typeof window === "undefined") return;
    let totalBytes = 0;
    // 统计 localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || "";
        totalBytes += key.length + value.length;
      }
    }
    // 统计 sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key) || "";
        totalBytes += key.length + value.length;
      }
    }
    // 转换为可读格式
    const kb = totalBytes / 1024;
    if (kb < 1024) {
      setCacheSize(`${kb.toFixed(1)} KB`);
    } else {
      setCacheSize(`${(kb / 1024).toFixed(1)} MB`);
    }
  }, []);

  // v20.1: 一键清理缓存（保留登录态和token）
  const handleClearCache = useCallback(() => {
    if (isClearing) return;
    setIsClearing(true);
    try {
      // 需要保留的关键键（登录态、token、用户信息）
      const preserveKeys = [
        "yandao_user_id",
        "yandao_user_profile",
        "yandao_login_token",
        "yandao_login_state",
        "yandao_login_user",
        "yandao_pwd_store",
        "yandao_token_expiry",
        "yandao_refresh_token",
        "yandao_refresh_expiry",
        "yandao_user_phone",
      ];
      const preserved: Record<string, string | null> = {};
      preserveKeys.forEach((key) => {
        preserved[key] = localStorage.getItem(key);
      });

      // 清除 localStorage（保留登录态）
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !preserveKeys.includes(key)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // 恢复保留的键
      preserveKeys.forEach((key) => {
        if (preserved[key] !== null) {
          localStorage.setItem(key, preserved[key]!);
        }
      });

      // 清除 sessionStorage
      sessionStorage.clear();

      // 重新计算缓存大小
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

  // v20.1: 页面加载时计算缓存大小
  useEffect(() => {
    calculateCacheSize();
  }, [calculateCacheSize]);

  // v18.3 整改：使用统一规范的 userId 生成逻辑
  const [userId] = useState(() => {
    if (typeof window === "undefined") return "YD000000";
    const stored = localStorage.getItem("yandao_user_id");
    if (stored) return stored;
    // 兼容旧版 profile_userid
    const oldStored = localStorage.getItem("profile_userid");
    if (oldStored) {
      localStorage.setItem("yandao_user_id", oldStored);
      return oldStored;
    }
    const id = "YD" + Math.floor(100000 + Math.random() * 900000);
    localStorage.setItem("yandao_user_id", id);
    // 兼容旧版
    localStorage.setItem("profile_userid", id);
    return id;
  });

  // v18.3 整改：登录状态初始化
  const [loginState] = useState<LoginState>(() => {
    if (typeof window === "undefined") return { isLoggedIn: false, token: null, profile: null };
    return getLoginState();
  });

  // 持久化开关状态
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("yandao_privacy_search", String(allowSearch));
    localStorage.setItem("yandao_privacy_nearby", String(allowNearby));
    localStorage.setItem("yandao_notify_enabled", String(notifyEnabled));
    // 同步到 userStore，控制附近用户列表可见性
    setUserStoreAllowNearby(allowNearby);
  }, [allowSearch, allowNearby, notifyEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 迁移兼容：先尝试新键名，没有则读取旧键名并迁移到新键名
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
    // 优先使用 userStore 中的附近展示状态（更准确）
    const storeNearby = getUserStoreAllowNearby();
    setAllowNearby(storeNearby);
  }, []);

  useEffect(() => {
    ensureCurrentUserInDirectory();
    const entry = getCurrentUserEntry();
    if (entry) {
      setFollowCount(entry.followCount);
      setFanCount(entry.fanCount);
    }
  }, []);

  const handleCopyUserId = () => {
    if (userId) {
      try {
        navigator.clipboard?.writeText(userId);
      } catch {}
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // ===== 我的二维码：复用 QRModal 的二维码生成逻辑 =====
  const shareUrl = `https://yandao.vip/friend?ref=${userId}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&bgcolor=ffffff&color=7B2FBE`;

  const handleSaveQR = () => {
    const link = document.createElement("a");
    link.href = qrApiUrl;
    link.download = `yandao-qrcode-${userId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 打开编辑资料弹窗（即使没有正式登录也能编辑，使用默认资料）
  const openEditModal = () => {
    const profile = loginState.profile;
    setEditNickname(profile?.nickname || "言道用户");
    setEditBio(profile?.bio || "");
    setEditAvatar(profile?.avatar || "");
    setEditTags(profile?.tags || []);
    setShowEditModal(true);
  };

  // 头像文件上传
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("图片大小不能超过2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f5f5", maxWidth: "420px", margin: "0 auto", paddingBottom: "72px" }}>
      {/* ===== 1. 用户信息区 ===== */}
      <div className="flex flex-col items-center px-4 pt-8 pb-6" style={{ backgroundColor: BRAND }}>
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-full cursor-pointer"
          style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          onClick={openEditModal}
        >
          {loginState.profile?.avatar ? (
            <img src={loginState.profile.avatar} className="h-20 w-20 rounded-full object-cover" alt="头像" />
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
          {/* 相机图标覆盖层 */}
          <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: BRAND }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        </div>
        <h2 className="mt-3 text-lg font-bold text-white">
          {loginState.isLoggedIn && loginState.profile
            ? loginState.profile.nickname
            : "言道用户"}
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={handleCopyUserId}
            className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 active:bg-gray-200 transition-colors"
          >
            <span className="font-mono">ID: {userId}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {copied ? <polyline points="20 6 9 17 4 12" /> : <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />}
              {!copied && <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />}
            </svg>
            {copied && <span className="text-green-500">已复制</span>}
          </button>
        </div>
        <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
          <span>关注 {followCount}</span>
          <span>粉丝 {fanCount}</span>
        </div>
        {loginState.profile?.bio && (
          <p className="mt-1.5 text-xs text-white/80 text-center max-w-[280px]">{loginState.profile.bio}</p>
        )}
        {loginState.profile?.tags && loginState.profile.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap justify-center gap-1.5 max-w-[280px]">
            {loginState.profile.tags.map((tag, i) => (
              <span key={i} className="rounded-full px-2 py-0.5 text-xs text-white/90" style={{ backgroundColor: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <div
          className="mt-2 rounded-full px-3 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)" }}
        >
          {loginState.isLoggedIn && loginState.profile
            ? loginState.profile.memberLevel === "premium" ? "高级会员" : "普通会员"
            : "普通会员"}
        </div>
        <button
          onClick={openEditModal}
          className="mt-2 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          编辑资料
        </button>
      </div>

      {/* ===== 2. 我的二维码展示模块（P1-11）===== */}
      <div className="mx-3 -mt-4 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-gray-400">我的二维码</p>
        </div>
        <div className="flex items-center gap-4 px-4 pb-3 pt-2">
          {/* 二维码图片，点击弹出大图弹窗 */}
          <div
            onClick={() => setShowQR(true)}
            className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border-2 cursor-pointer overflow-hidden active:opacity-80 transition-opacity"
            style={{ borderColor: BRAND }}
            title="点击查看大图"
          >
            <img
              src={qrApiUrl}
              alt="我的二维码"
              className="h-full w-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">
              {loginState.isLoggedIn && loginState.profile ? loginState.profile.nickname : "言道用户"}
            </p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">ID: {userId}</p>
            <p className="text-xs text-gray-500 mt-1.5">扫一扫，加我为好友</p>
            <p className="text-xs font-medium mt-1" style={{ color: BRAND }}>
              扫码添加好友，邀请享佣金
            </p>
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={handleSaveQR}
            className="flex-1 rounded-lg py-2 text-xs font-semibold text-white transition-colors hover:opacity-90 active:opacity-80"
            style={{ backgroundColor: BRAND }}
          >
            保存二维码
          </button>
          <button
            onClick={() => setShowQR(true)}
            className="flex-1 rounded-lg py-2 text-xs font-semibold transition-colors hover:opacity-90 active:opacity-80"
            style={{ backgroundColor: "#f5f0fa", color: BRAND, border: `1px solid ${BRAND}` }}
          >
            查看大图
          </button>
        </div>
      </div>

      {/* ===== 3. 推广与资产入口（P1-12）===== */}
      <div className="mx-3 mt-3 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-gray-400">推广与资产</p>
        </div>
        <ListItem
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          label="我的团队"
          onClick={() => router.push("/profile/team")}
        />
        <ListItem
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          }
          label="我的钱包"
          onClick={() => router.push("/profile/wallet")}
        />
        <ListItem
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
          }
          label="推广中心"
          onClick={() => router.push("/profile/promote")}
        />
        <ListItem
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
          }
          label="我的积分"
          onClick={() => router.push("/profile/points")}
          noBorder
        />
      </div>

      {/* ===== 4. 核心功能区 ===== */}
      <div className="mx-3 mt-3 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-gray-400">功能</p>
        </div>
        <button
          onClick={() => router.push("/clients")}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">我的客户</p>
            <p className="text-xs text-gray-400">客户档案列表</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* ===== 3. 权益与资产区 ===== */}
      <div className="mx-3 mt-3 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-gray-400">权益与资产</p>
        </div>
        <ListItem
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill={BRAND} stroke={BRAND} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.09 6.26L20 9l-5 4.87L16.18 21 12 17.77 7.82 21 9 13.87 4 9l5.91-.74L12 2z" />
            </svg>
          }
          label="会员中心"
          onClick={() => router.push("/membership")}
        />
        <ListItem
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          label="我的记录"
          onClick={() => router.push("/orders")}
          noBorder
        />
      </div>

      {/* ===== 账号安全 ===== */}
      <div className="mx-3 mt-3 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-gray-400">账号安全</p>
        </div>
        <ListItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
              <rect x="2" y="9" width="4" height="12" />
              <circle cx="4" cy="4" r="2" />
            </svg>
          }
          label="账号安全"
          onClick={() => router.push("/profile/security")}
        />
      </div>

      {/* ===== 4. 设置与规则区 ===== */}
      <div className="mx-3 mt-3 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-gray-400">设置</p>
        </div>

        <div style={{ borderBottom: "1px solid #f5f5f5" }}>
          <div className="px-4 pt-3">
            <p className="text-sm text-gray-500">隐私设置</p>
          </div>
          <ListItem
            icon={<span className="text-sm text-gray-600 w-0" />}
            label="允许被搜索"
            right={<ToggleSwitch checked={allowSearch} onChange={() => setAllowSearch(!allowSearch)} />}
          />
          <ListItem
            icon={<span className="text-sm text-gray-600 w-0" />}
            label="允许附近展示"
            right={<ToggleSwitch checked={allowNearby} onChange={() => setAllowNearby(!allowNearby)} />}
          />
          <ListItem
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            }
            label="黑名单管理"
            onClick={() => setShowBlacklist(true)}
          />
        </div>

        <div style={{ borderBottom: "1px solid #f5f5f5" }}>
          <div className="px-4 pt-3">
            <p className="text-sm text-gray-500">通知设置</p>
          </div>
          <ListItem
            icon={<span className="text-sm text-gray-600 w-0" />}
            label="接收推送通知"
            right={<ToggleSwitch checked={notifyEnabled} onChange={() => setNotifyEnabled(!notifyEnabled)} />}
          />
        </div>

        {/* v20.1: 缓存管理 */}
        <div style={{ borderBottom: "1px solid #f5f5f5" }}>
          <div className="px-4 pt-3">
            <p className="text-sm text-gray-500">存储与缓存</p>
          </div>
          <ListItem
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14a9 3 0 0 0 18 0V5" />
                <path d="M3 12a9 3 0 0 0 18 0" />
              </svg>
            }
            label="当前缓存占用"
            right={
              <span className="text-xs text-gray-400">{cacheSize}</span>
            }
          />
          <ListItem
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
          />
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

        <ListItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
          label="用户协议"
          onClick={() => router.push("/agreement")}
        />
        <ListItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
          label="隐私政策"
          onClick={() => router.push("/privacy")}
        />
        <ListItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          }
          label="关于我们"
          right={<span className="text-xs text-gray-400">v19.0</span>}
          onClick={() => setShowAbout(true)}
        />
        {/* 下载APP入口 */}
        <ListItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          }
          label="下载APP"
          onClick={() => window.open("https://www.yandao.vip/download", "_blank")}
          noBorder
        />
      </div>

      {/* 退出登录（v18.3 整改：真实清除登录态） */}
      <div className="mx-3 mt-3 rounded-xl bg-white shadow-sm overflow-hidden">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-4 text-center text-sm font-medium text-red-500 active:bg-gray-50"
        >
          退出登录
        </button>
      </div>

      <div className="py-4 text-center text-xs text-gray-400">
        言道 v1.0.0
      </div>

      {/* ===== 弹窗 ===== */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={() => setShowEditModal(false)}>
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-center text-base font-bold text-gray-800">编辑资料</h3>

            {/* 头像选择 */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">头像</label>
              {/* 隐藏的文件上传 input */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                style={{ display: "none" }}
              />
              {/* 头像预览与上传按钮 */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative flex h-16 w-16 items-center justify-center rounded-full cursor-pointer overflow-hidden"
                  style={{
                    backgroundColor: editAvatar && editAvatar.startsWith("#") ? editAvatar : "#f5f0fa",
                    border: "2px dashed #7B2FBE",
                  }}
                >
                  {editAvatar && !editAvatar.startsWith("#") ? (
                    <img src={editAvatar} className="h-full w-full object-cover" alt="头像预览" />
                  ) : editAvatar && editAvatar.startsWith("#") ? (
                    <span className="text-white text-xl font-bold">
                      {(editNickname || loginState.profile?.nickname || "言").charAt(0)}
                    </span>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={BRAND}>
                      <path d="M20 5h-3.17L15 3H9L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                    </svg>
                  )}
                  {/* 相机图标覆盖层 */}
                  <div
                    className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: BRAND, border: "1.5px solid white" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                      <path d="M20 5h-3.17L15 3H9L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                    </svg>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                    style={{ backgroundColor: BRAND }}
                  >
                    上传图片
                  </button>
                  <span className="text-xs text-gray-400">支持 JPG/PNG，≤2MB</span>
                </div>
              </div>
              {/* 颜色选择（备选） */}
              <label className="mb-2 block text-xs text-gray-500">或选择颜色头像</label>
              <div className="flex flex-wrap gap-2">
                {/* 预设头像：用昵称首字+不同背景色 */}
                {["#7B2FBE", "#E74C3C", "#3498DB", "#2ECC71", "#F39C12", "#1ABC9C", "#9B59B6", "#34495E"].map(color => (
                  <button
                    key={color}
                    onClick={() => setEditAvatar(color)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold"
                    style={{ backgroundColor: color, border: editAvatar === color ? "3px solid #7B2FBE" : "none" }}
                  >
                    {(editNickname || loginState.profile?.nickname || "言").charAt(0)}
                  </button>
                ))}
              </div>
            </div>

            {/* 昵称 */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">昵称</label>
              <input
                type="text"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                maxLength={20}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                placeholder="请输入昵称"
              />
            </div>

            {/* 个人简介 */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">个人简介</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={100}
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-purple-500 resize-none"
                placeholder="介绍一下自己吧"
              />
              <div className="mt-1 text-right text-xs text-gray-400">{editBio.length}/100</div>
            </div>

            {/* 个性标签 */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">个性标签</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editTags.map((tag, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs" style={{ backgroundColor: "#f5f0fa", color: BRAND }}>
                    {tag}
                    <button onClick={() => setEditTags(editTags.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  maxLength={8}
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500"
                  placeholder="添加标签（最多8字）"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim() && editTags.length < 5) {
                      setEditTags([...editTags, tagInput.trim()]);
                      setTagInput("");
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (tagInput.trim() && editTags.length < 5) {
                      setEditTags([...editTags, tagInput.trim()]);
                      setTagInput("");
                    }
                  }}
                  className="rounded-xl px-3 py-1.5 text-sm font-medium text-white"
                  style={{ backgroundColor: BRAND }}
                >
                  添加
                </button>
              </div>
              <div className="mt-1 text-xs text-gray-400">最多5个标签</div>
            </div>

            {/* 按钮区 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-gray-600 bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const success = updateUserProfile({ nickname: editNickname, bio: editBio, avatar: editAvatar, tags: editTags });
                  if (!success) {
                    // 没有现存的 profile，尝试创建一个
                    const newProfile = {
                      userId: userId,
                      nickname: editNickname || "言道用户",
                      avatar: editAvatar,
                      memberLevel: "basic" as const,
                      loginTime: Date.now(),
                      bio: editBio,
                      tags: editTags,
                    };
                    const token = "guest_" + userId;
                    const loginSuccess = setLoginState(token, newProfile);
                    if (!loginSuccess) {
                      // 最终兜底：直接写入 localStorage
                      try {
                        localStorage.setItem("yandao_user_profile", JSON.stringify({ ...newProfile, loginTime: Date.now() }));
                      } catch {}
                    }
                  }
                  setShowEditModal(false);
                  // 刷新页面以显示更新
                  window.location.reload();
                }}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: BRAND }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      {showQR && <QRModal onClose={() => setShowQR(false)} userId={userId} nickname={loginState.isLoggedIn && loginState.profile ? loginState.profile.nickname : undefined} />}
      {showLogoutConfirm && <LogoutConfirmModal onClose={() => setShowLogoutConfirm(false)} />}
      {showBlacklist && <BlacklistModal onClose={() => setShowBlacklist(false)} />}
      {showAbout && <AboutUsModal onClose={() => setShowAbout(false)} />}
      {cacheToast && (
        <div
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] rounded-xl px-4 py-2 text-sm text-white shadow-lg"
          style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
        >
          {cacheToast}
        </div>
      )}
    </div>
  );
}
