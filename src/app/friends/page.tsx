"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { ConfirmDialog as UnifiedConfirmDialog } from "@/components/ui";
import {
  type Friend,
  type FriendRequest,
  type GroupInfo,
  getFriends,
  saveFriends,
  removeFriend,
  addFriend,
  addFriendRequest,
  getFriendRequests,
  getGroups,
  isLegacyLocalGroupId,
  createGroup,
  updateFriendRequest,
  updateFriendNote,
  getBlacklist,
  addToBlacklist,
  removeFromBlacklist,
  isBlocked,
} from "@/lib/socialStore";
import {
  searchUsers,
  getUserById,
  findUserById,
  toggleFollowUser,
  isFollowing as checkFollowing,
  getNearbyUsers,
  type UserDirectoryEntry,
} from "@/lib/userStore";
import { getCurrentUserId, getLoginState } from "@/lib/auth";
import {
  fetchFriends as apiFetchFriends,
  fetchGroups as apiFetchGroups,
  fetchFriendRequests as apiFetchFriendRequests,
  sendFriendRequest as apiSendFriendRequest,
  respondFriendRequest as apiRespondFriendRequest,
  removeFriend as apiRemoveFriend,
  fetchConversations,
  markConversationRead,
  toggleConversationPin,
  toggleConversationMute,
  deleteConversation,
  type ConversationVo,
} from "@/lib/socialApi";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

// ==================== 常量 ====================
const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#F5F0FA";
const NEARBY_TAGS = [
  "八字", "紫微", "奇门", "六爻", "中医", "养生",
  "风水", "择日", "梅花易数", "小六壬", "大六壬", "起名",
];

// ==================== 黑名单工具已迁移至 socialStore ====================
// getBlacklist / addToBlacklist / removeFromBlacklist / isBlocked 均从 @/lib/socialStore 导入

// ==================== 头像组件 ====================
function FriendAvatar({ text, size = 44 }: { text: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-white font-bold select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: BRAND,
        fontSize: size * 0.4,
      }}
    >
      {text.slice(0, 1)}
    </div>
  );
}

// ==================== 确认弹窗：统一组件（P7-弹窗统一-01） ====================
// 原页面自写 ConfirmDialog 已废弃，统一引用 src/components/ui/ConfirmDialog

// ==================== 修改备注弹窗组件 ====================
function NoteEditDialog({
  friendName,
  initialNote,
  onConfirm,
  onCancel,
}: {
  friendName: string;
  initialNote: string;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState(initialNote);
  const inputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(true);
  usePopupBackHandler(onCancel, true);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleConfirm = () => {
    onConfirm(note.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-[320px] rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-2 text-center">
          <h3 className="text-base font-bold text-gray-800">修改备注</h3>
          <p className="mt-2 text-sm text-gray-500">
            为「{friendName}」设置备注名
          </p>
        </div>
        <div className="px-6 py-3">
          <input
            ref={inputRef}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="输入备注名（选填）"
            maxLength={30}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none"
            style={{ outline: "none" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm();
            }}
          />
          <p className="mt-1 text-right text-[10px] text-gray-400">
            {note.length}/30
          </p>
        </div>
        <div className="flex border-t border-gray-100 mt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-sm text-gray-500 font-medium active:bg-gray-50 rounded-bl-2xl"
          >
            取消
          </button>
          <div className="w-px bg-gray-100" />
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 text-sm font-semibold active:bg-gray-50 rounded-br-2xl"
            style={{ color: BRAND }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 操作菜单组件 ====================
function ActionMenu({
  x,
  y,
  onDelete,
  onBlock,
  onMessage,
  onRemark,
  onClose,
}: {
  x: number;
  y: number;
  onDelete: () => void;
  onBlock: () => void;
  onMessage: () => void;
  onRemark: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  usePopupBackHandler(onClose, true);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = x - rect.width;
      let top = y;
      if (left < 8) left = 8;
      if (top + rect.height > vh - 8) top = vh - rect.height - 8;
      if (top < 8) top = 8;
      setPos({ left, top });
    }
  }, [x, y]);

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div
        ref={menuRef}
        className="fixed z-[100] overflow-hidden rounded-xl bg-white shadow-lg"
        style={{
          left: pos.left,
          top: pos.top,
          border: "1px solid #eee",
          minWidth: "140px",
        }}
      >
        {/* v25.0.33（P7-整改-01）：恢复私聊入口 */}
        <button
          onClick={onMessage}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          发消息
        </button>
        <button
          onClick={onRemark}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          修改备注
        </button>
        <button
          onClick={onBlock}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm text-orange-600 hover:bg-gray-50 active:bg-gray-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          拉黑
        </button>
        <button
          onClick={onDelete}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-gray-50 active:bg-gray-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          删除好友
        </button>
      </div>
    </>
  );
}

// ==================== 添加好友视图 ====================
function AddFriendView({
  onBack,
  initialMode,
  initialUid,
}: {
  onBack: () => void;
  initialMode: "scan" | "search" | "nearby";
  initialUid?: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"menu" | "scan" | "search" | "nearby">(initialMode);

  // 搜索模式状态
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserDirectoryEntry[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // 扫码/URL参数自动搜索（从 FriendsPage 传入的 uid，或从 URL 读取）
  React.useEffect(() => {
    const uid = initialUid || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("uid") : null);
    if (uid) {
      setMode("search");
      setSearchQuery(uid);
      // 自动搜索
      const results = searchUsers(uid, { currentUserId });
      setSearchResults(results);
      setHasSearched(true);
    }
  }, [initialUid]);

  // 好友申请弹窗状态
  const [requestingUser, setRequestingUser] = useState<UserDirectoryEntry | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  // P1 弹窗规范：好友申请验证弹窗（内联渲染）滚动锁 + 返回键优先关闭弹窗
  useBodyScrollLock(!!requestingUser);
  usePopupBackHandler(() => {
    setRequestingUser(null);
    setRequestMessage("");
  }, !!requestingUser);

  // 扫码模式状态
  const [manualId, setManualId] = useState("");
  const [scanResult, setScanResult] = useState<UserDirectoryEntry | null>(null);
  const [scanError, setScanError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  // 相机扫码状态
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanStreamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 附近搭子状态
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<Array<any>>([]);

  // 关注状态刷新触发器
  const [followTick, setFollowTick] = useState(0);

  // 获取真实用户ID（登录后为数字ID，未登录为匿名ID）
  const loginState = getLoginState();
  const currentUserId = loginState.isLoggedIn && loginState.profile?.userId
    ? loginState.profile.userId
    : getCurrentUserId();

  const handleBack = () => {
    // 退出时关闭相机
    stopCameraScan();
    if (mode !== "menu") {
      setMode("menu");
      setSearchResults([]);
      setHasSearched(false);
      setScanResult(null);
      setScanError("");
    } else {
      onBack();
    }
  };

  // 组件卸载时清理相机资源
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (scanStreamRef.current) {
        scanStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // ==================== 查找附近用户 ====================
  const handleFindNearby = () => {
    const users = getNearbyUsers(20);
    // 如果选了标签，按标签过滤
    const filtered = selectedTags.length === 0
      ? users
      : users.filter(u => u.tags && u.tags.some(t => selectedTags.includes(t)));
    setNearbyUsers(filtered);
    setHasSearched(true);
  };

  // 进入附近模式时自动查找
  useEffect(() => {
    if (mode === "nearby" && !hasSearched) {
      handleFindNearby();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ==================== 搜索用户 ====================
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setHasSearched(true);
    setSearchError("");
    setSearchLoading(true);
    setSearchResults([]);

    try {
      // 纯数字ID → 调用后端API精确查找
      if (/^\d+$/.test(q)) {
        const user = await findUserById(q);
        if (user) {
          if (user.userId === currentUserId) {
            setSearchError("不能添加自己为好友");
          } else {
            setSearchResults([user]);
          }
        } else {
          setSearchError("未找到该用户，请检查ID是否正确");
        }
      } else {
        // 非纯数字 → 本地模糊搜索（昵称）
        const results = searchUsers(q, { currentUserId });
        if (results.length === 0) {
          setSearchError("未找到匹配的用户，试试搜索用户ID");
        } else {
          setSearchResults(results);
        }
      }
    } catch {
      setSearchError("查找失败，请检查网络后重试");
    } finally {
      setSearchLoading(false);
    }
  };

  // ==================== 发送好友申请（v25.0.19：后端真实送达） ====================
  const handleSendRequest = (user: UserDirectoryEntry, message: string) => {
    const myName = loginState.profile?.nickname || "当前用户";
    const myAvatar = loginState.profile?.nickname?.slice(0, 1) || "我";
    addFriendRequest({
      id: `req_${Date.now()}`,
      fromId: currentUserId,
      fromName: myName,
      fromAvatar: myAvatar,
      message: message || `我是${myName}，想加你为好友`,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    // 后端真实好友申请：对方登录后即可在申请列表看到
    void apiSendFriendRequest(user.userId, message || `我是${myName}，想加你为好友`).catch(() => {});
    setRequestedIds((prev) => new Set(prev).add(user.userId));
    setRequestingUser(null);
    setRequestMessage("");
  };

  // ==================== 关注/取关 ====================
  const handleToggleFollow = (userId: string) => {
    toggleFollowUser(userId);
    setFollowTick((t) => t + 1);
  };

  // ==================== 扫码模式：手动查找 ====================
  const handleManualLookup = async () => {
    const id = manualId.trim();
    if (!id) return;
    setScanResult(null);
    setScanError("");
    setLookingUp(true);
    try {
      const user = await findUserById(id);
      if (user) {
        if (user.userId === currentUserId) {
          setScanResult(null);
          setScanError("不能添加自己为好友");
        } else {
          setScanResult(user);
          setScanError("");
        }
      } else {
        setScanResult(null);
        setScanError("未找到该用户，请检查ID是否正确");
      }
    } catch {
      setScanResult(null);
      setScanError("查找失败，请检查网络后重试");
    } finally {
      setLookingUp(false);
    }
  };

  // ==================== 处理扫码结果 ====================
  const handleScanResult = async (rawText: string) => {
    // 从扫码结果中提取 uid 或 ref 参数
    let uid = rawText.trim();
    try {
      // 如果是 URL，尝试解析 uid 或 ref 参数
      if (uid.includes("uid=") || uid.includes("ref=")) {
        const url = new URL(uid);
        uid = url.searchParams.get("uid") || url.searchParams.get("ref") || uid;
      } else if (uid.startsWith("http")) {
        const url = new URL(uid);
        uid = url.searchParams.get("uid") || url.searchParams.get("ref") || uid;
      }
    } catch {
      // 不是 URL，直接当作用户ID处理
    }

    stopCameraScan();
    setScanResult(null);
    setScanError("");
    setLookingUp(true);
    try {
      const user = await findUserById(uid);
      if (user) {
        if (user.userId === currentUserId) {
          setScanResult(null);
          setScanError("不能添加自己为好友");
        } else {
          setScanResult(user);
          setScanError("");
        }
      } else {
        setScanResult(null);
        setScanError(`未找到ID为「${uid}」的用户，请检查二维码是否正确`);
      }
    } catch {
      setScanResult(null);
      setScanError("查找失败，请检查网络后重试");
    } finally {
      setLookingUp(false);
    }
  };

  // ==================== 启动相机扫码 ====================
  const startCameraScan = async () => {
    setScanError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      scanStreamRef.current = stream;
      setCameraActive(true);

      // 等待 video 元素渲染后绑定
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => {
            // 使用 BarcodeDetector API 进行扫码（Chrome/Android 支持）
            const AnyBarcodeDetector = (window as any).BarcodeDetector;
            if (AnyBarcodeDetector) {
              const detector = new AnyBarcodeDetector({
                formats: ["qr_code"],
              });
              scanIntervalRef.current = setInterval(async () => {
                if (!videoRef.current) return;
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0) {
                    const text = barcodes[0].rawValue;
                    if (text) {
                      handleScanResult(text);
                    }
                  }
                } catch {
                  // 检测失败，继续轮询
                }
              }, 500);
            } else {
              setScanError("当前浏览器不支持扫码功能，请使用系统相机扫描或手动输入ID");
            }
          }).catch(() => {
            setScanError("无法启动摄像头预览，请手动输入ID");
          });
        }
      }, 100);
    } catch {
      setScanError("无法访问摄像头，请检查权限设置或手动输入ID");
      setCameraActive(false);
    }
  };

  // ==================== 停止相机扫码 ====================
  const stopCameraScan = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (scanStreamRef.current) {
      scanStreamRef.current.getTracks().forEach((track) => track.stop());
      scanStreamRef.current = null;
    }
    setCameraActive(false);
  };

  // ==================== 跳转用户主页 ====================
  const goToProfile = (userId: string) => {
    // v25.0.41：统一进入唯一 UserProfile 页面（原 /friends/profile 局部页废弃跳转）
    router.push(`/user?uid=${encodeURIComponent(userId)}`);
  };

  // ==================== 渲染用户卡片 ====================
  const renderUserCard = (user: UserDirectoryEntry) => {
    const isRequested = requestedIds.has(user.userId);
    // followTick 用于触发重新渲染以刷新关注状态
    void followTick;
    const isFollowed = checkFollowing(user.userId);

    return (
      <div
        key={user.userId}
        className="flex items-start gap-3 border-b border-gray-50 px-4 py-3"
      >
        <button
          onClick={() => goToProfile(user.userId)}
          className="shrink-0"
        >
          <FriendAvatar text={user.avatar || user.nickname} size={44} />
        </button>
        <button
          onClick={() => goToProfile(user.userId)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 truncate">
              {user.nickname}
            </span>
            <span className="text-xs text-gray-400 shrink-0">
              ID: {user.userId}
            </span>
          </div>
          {user.bio && (
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
              {user.bio}
            </p>
          )}
          {user.tags && user.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {user.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded px-1.5 py-0.5 text-[10px]"
                  style={{ backgroundColor: BRAND_LIGHT, color: BRAND }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </button>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <button
            onClick={() => {
              if (!isRequested) {
                setRequestingUser(user);
                setRequestMessage("");
              }
            }}
            disabled={isRequested}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold active:opacity-80 transition-opacity"
            style={{
              backgroundColor: isRequested ? "#f0f0f0" : BRAND,
              color: isRequested ? "#999" : "white",
            }}
          >
            {isRequested ? "已申请" : "加好友"}
          </button>
          <button
            onClick={() => handleToggleFollow(user.userId)}
            className="text-[10px] font-medium transition-colors"
            style={{
              color: isFollowed ? "#999" : BRAND,
            }}
          >
            {isFollowed ? "已关注" : "+ 关注"}
          </button>
        </div>
      </div>
    );
  };

  // 二维码 URL - 指向 /friend?ref= 实现自动添加好友（P9：本地生成）
  const friendInviteUrl = `https://yandaoguoxue.yandao.vip/friend?ref=${currentUserId}`;
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    import("@/lib/qrLocal")
      .then(({ makeQrDataUrl }) => makeQrDataUrl(friendInviteUrl, { width: 200, dark: "#7B2FBE" }))
      .then(setQrCodeUrl)
      .catch(() => {});
  }, [currentUserId]);

  return (
    <div
      className="min-h-screen bg-white"
      style={{ maxWidth: "420px", margin: "0 auto", paddingBottom: "72px" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center gap-2 px-2"
        style={{ backgroundColor: BRAND, height: "48px" }}
      >
        <button
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">
          {mode === "menu" ? "添加好友" : mode === "scan" ? "扫码添加" : mode === "search" ? "搜索用户" : "附近搭子"}
        </h1>
      </header>

      {/* 方式选择菜单 */}
      {mode === "menu" && (
        <div className="p-4 space-y-3">
          <button
            onClick={() => setMode("scan")}
            className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-4 active:bg-gray-100 transition-colors"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: BRAND }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-800">扫码添加</p>
              <p className="text-xs text-gray-500">出示二维码或手动输入ID</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <button
            onClick={() => setMode("search")}
            className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-4 active:bg-gray-100 transition-colors"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: BRAND }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-800">搜索用户</p>
              <p className="text-xs text-gray-500">通过昵称 / ID 查找好友</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <button
            onClick={() => setMode("nearby")}
            className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-4 active:bg-gray-100 transition-colors"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: BRAND }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-800">附近搭子</p>
              <p className="text-xs text-gray-500">发现附近兴趣相同的朋友</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      {/* 扫码添加 */}
      {mode === "scan" && (
        <div className="flex flex-col items-center p-6">
          {/* 相机扫码区域 */}
          {cameraActive ? (
            <div className="w-full">
              <div
                className="relative w-full overflow-hidden rounded-xl bg-black"
                style={{ aspectRatio: "1", maxHeight: "300px" }}
              >
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  playsInline
                  muted
                />
                {/* 扫码框 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="border-2 rounded-lg"
                    style={{
                      width: "60%",
                      height: "60%",
                      borderColor: "rgba(255,255,255,0.8)",
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)",
                    }}
                  />
                </div>
                {/* 关闭按钮 */}
                <button
                  onClick={stopCameraScan}
                  className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <p className="mt-3 text-center text-sm text-gray-500">
                将二维码对准框内即可自动识别
              </p>
            </div>
          ) : (
            <>
              {/* 我的二维码 */}
              <p className="mb-3 text-sm font-medium text-gray-700">我的二维码</p>
              <div
                className="rounded-xl border-2 p-3"
                style={{ borderColor: BRAND, backgroundColor: BRAND_LIGHT }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="我的二维码"
                  width={200}
                  height={200}
                  className="rounded-lg"
                />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                让对方扫描此二维码即可添加你为好友
              </p>
              <p className="mt-1 text-xs text-gray-400">
                我的ID：{currentUserId || "未登录"}
              </p>

              {/* 扫一扫按钮 */}
              <button
                onClick={startCameraScan}
                className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white active:opacity-80 transition-opacity flex items-center justify-center gap-2"
                style={{ backgroundColor: BRAND }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                扫一扫
              </button>
              <p className="mt-2 text-center text-xs text-gray-400">
                使用相机扫描好友二维码，或让好友扫描你的二维码
              </p>
            </>
          )}

          {/* 分隔线 */}
          <div className="my-6 flex w-full items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">或手动输入ID</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* 手动输入ID */}
          <div className="w-full">
            <div className="flex gap-2">
              <input
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="输入用户ID（纯数字，如 100000）"
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none"
                style={{ outline: "none" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleManualLookup();
                }}
              />
              <button
                onClick={handleManualLookup}
                disabled={lookingUp}
                className="rounded-xl px-5 text-sm font-semibold text-white active:opacity-80 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: BRAND }}
              >
                {lookingUp ? "查找中..." : "查找"}
              </button>
            </div>

            {/* 错误提示 */}
            {scanError && (
              <p className="mt-3 text-center text-sm text-red-500">{scanError}</p>
            )}

            {/* 查找结果 */}
            {scanResult && (
              <div className="mt-4">
                <div className="mb-2 text-xs font-medium text-gray-500">查找结果</div>
                {renderUserCard(scanResult)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 搜索用户 */}
      {mode === "search" && (
        <div className="p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入用户ID（纯数字）或昵称"
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none"
              style={{ outline: "none" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
            <button
              onClick={handleSearch}
              disabled={searchLoading}
              className="rounded-xl px-5 text-sm font-semibold text-white active:opacity-80 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              {searchLoading ? "查找中..." : "搜索"}
            </button>
          </div>

          {/* 搜索错误提示 */}
          {searchError && (
            <p className="mt-3 text-center text-sm text-red-500">{searchError}</p>
          )}

          {/* 搜索结果 */}
          {hasSearched && !searchLoading && searchResults.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-gray-500">
                找到 {searchResults.length} 位用户
              </p>
              {searchResults.map((user) => renderUserCard(user))}
            </div>
          )}

          {/* 空结果提示（无错误时） */}
          {hasSearched && !searchLoading && !searchError && searchResults.length === 0 && (
            <div className="py-12 text-center">
              <svg
                className="mx-auto mb-3"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ccc"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-sm text-gray-400">
                未找到匹配的用户，试试搜索用户ID
              </p>
            </div>
          )}

          {/* 搜索提示 */}
          {!hasSearched && (
            <div className="mt-8 text-center">
              <svg
                className="mx-auto mb-3"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ccc"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-sm text-gray-400">输入用户ID（纯数字）或昵称开始搜索</p>
              <p className="mt-1 text-xs text-gray-400">
                示例：100000、易经行者、中医
              </p>
            </div>
          )}
        </div>
      )}

      {/* 附近搭子 */}
      {mode === "nearby" && (
        <div className="p-4">
          <p className="mb-3 text-sm font-medium text-gray-700">选择兴趣标签：</p>
          <div className="flex flex-wrap gap-2">
            {NEARBY_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="rounded-full px-3 py-1.5 text-sm transition-colors"
                style={{
                  backgroundColor: selectedTags.includes(tag) ? BRAND : "#f0f0f0",
                  color: selectedTags.includes(tag) ? "white" : "#666",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
          <button
            onClick={handleFindNearby}
            className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white active:opacity-80 transition-opacity"
            style={{ backgroundColor: BRAND }}
          >
            查找附近搭子
          </button>

          {/* 附近用户列表 */}
          {hasSearched && nearbyUsers.length === 0 && (
            <div className="mt-6 py-12 text-center">
              <svg
                className="mx-auto mb-3"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ccc"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <p className="text-sm text-gray-400">附近暂无开启位置展示的用户</p>
            </div>
          )}

          {nearbyUsers.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-gray-500">
                找到 {nearbyUsers.length} 位附近搭子
              </p>
              {nearbyUsers.map((user: any) => (
                <div
                  key={user.userId}
                  onClick={() => goToProfile(user.userId)}
                  className="flex items-start gap-3 border-b border-gray-50 px-1 py-3 active:bg-gray-50 transition-colors cursor-pointer"
                >
                  <FriendAvatar text={user.avatar || user.nickname} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800 truncate">
                        {user.nickname}
                      </span>
                      {user.distanceKm > 0 && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {user.distanceKm < 1 ? Math.round(user.distanceKm * 1000) + "m" : user.distanceKm.toFixed(1) + "km"}
                        </span>
                      )}
                    </div>
                    {user.bio && (
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                        {user.bio}
                      </p>
                    )}
                    {user.tags && user.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {user.tags.slice(0, 4).map((tag: string) => (
                          <span
                            key={tag}
                            className="rounded px-1.5 py-0.5 text-[10px]"
                            style={{ backgroundColor: BRAND_LIGHT, color: BRAND }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ddd"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 mt-1"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 好友申请验证消息弹窗 */}
      {requestingUser && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={() => {
            setRequestingUser(null);
            setRequestMessage("");
          }}
        >
          <div
            className="mx-4 w-full max-w-[320px] rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center gap-3 px-5 pt-5">
              <FriendAvatar
                text={requestingUser.avatar || requestingUser.nickname}
                size={40}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {requestingUser.nickname}
                </p>
                <p className="text-xs text-gray-400">ID: {requestingUser.userId}</p>
              </div>
            </div>
            {/* 验证消息输入 */}
            <div className="px-5 pt-4">
              <p className="mb-2 text-xs text-gray-500">验证消息</p>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder={`我是${currentUserId}，想加你为好友`}
                rows={3}
                maxLength={50}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
                style={{ outline: "none" }}
                autoFocus
              />
              <p className="mt-1 text-right text-[10px] text-gray-400">
                {requestMessage.length}/50
              </p>
            </div>
            {/* 按钮 */}
            <div className="flex border-t border-gray-100 mt-3">
              <button
                onClick={() => {
                  setRequestingUser(null);
                  setRequestMessage("");
                }}
                className="flex-1 py-3 text-sm text-gray-500 font-medium active:bg-gray-50 rounded-bl-2xl"
              >
                取消
              </button>
              <div className="w-px bg-gray-100" />
              <button
                onClick={() => handleSendRequest(requestingUser, requestMessage)}
                className="flex-1 py-3 text-sm font-semibold active:bg-gray-50 rounded-br-2xl"
                style={{ color: BRAND }}
              >
                发送申请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ==================== 好友请求入口组件 ====================
function FriendRequestsEntry({
  count,
  onOpen,
}: {
  count: number;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left active:bg-gray-50 transition-colors"
    >
      <div className="relative">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "#FFF3E0" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </div>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-gray-800">新的请求</span>
        <p className="mt-0.5 truncate text-xs text-gray-500">
          {count > 0 ? `${count} 条待处理的好友请求` : "暂无新的好友请求"}
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}

// ==================== 好友请求列表视图 ====================
function FriendRequestsPanel({
  requests,
  onBack,
  onAccept,
  onReject,
}: {
  requests: FriendRequest[];
  onBack: () => void;
  onAccept: (req: FriendRequest) => void;
  onReject: (req: FriendRequest) => void;
}) {
  return (
    <div
      className="min-h-screen bg-white"
      style={{ maxWidth: "420px", margin: "0 auto", paddingBottom: "72px" }}
    >
      <header
        className="sticky top-0 z-40 flex items-center gap-2 px-2"
        style={{ backgroundColor: BRAND, height: "48px" }}
      >
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">好友请求</h1>
      </header>

      {requests.length === 0 ? (
        <div className="py-20 text-center text-sm text-gray-400">暂无好友请求</div>
      ) : (
        requests.map((req) => (
          <div
            key={req.id}
            className="flex items-center gap-3 border-b border-gray-50 px-4 py-3"
          >
            <FriendAvatar text={req.fromAvatar || req.fromName} size={44} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{req.fromName}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {req.message || "请求添加你为好友"}
              </p>
              <p className="mt-0.5 text-[10px] text-gray-400">{req.createdAt}</p>
            </div>
            {req.status === "pending" ? (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onAccept(req)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white active:opacity-80"
                  style={{ backgroundColor: BRAND }}
                >
                  接受
                </button>
                <button
                  onClick={() => onReject(req)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 active:bg-gray-200"
                >
                  拒绝
                </button>
              </div>
            ) : (
              <span className="text-xs shrink-0" style={{ color: req.status === "accepted" ? "#4CAF50" : "#999" }}>
                {req.status === "accepted" ? "已接受" : "已拒绝"}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ==================== 黑名单管理入口组件 ====================
function BlacklistEntry({
  count,
  onOpen,
}: {
  count: number;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left active:bg-gray-50 transition-colors"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "#FFEBEE" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-gray-800">黑名单管理</span>
        <p className="mt-0.5 truncate text-xs text-gray-500">
          {count > 0 ? `${count} 位被拉黑的用户` : "管理被拉黑的用户"}
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}

// ==================== 黑名单管理视图 ====================
function BlacklistPanel({ onBack }: { onBack: () => void }) {
  const [blacklist, setBlacklist] = useState<string[]>([]);

  const loadBlacklist = useCallback(() => {
    setBlacklist(getBlacklist());
  }, []);

  useEffect(() => {
    loadBlacklist();
  }, [loadBlacklist]);

  const handleUnblock = (userId: string) => {
    removeFromBlacklist(userId);
    loadBlacklist();
  };

  // 根据用户ID获取用户信息（头像、昵称等）
  const blockedUsers = blacklist
    .map((id) => getUserById(id))
    .filter((u): u is UserDirectoryEntry => u !== null);

  return (
    <div
      className="min-h-screen bg-white"
      style={{ maxWidth: "420px", margin: "0 auto", paddingBottom: "72px" }}
    >
      <header
        className="sticky top-0 z-40 flex items-center gap-2 px-2"
        style={{ backgroundColor: BRAND, height: "48px" }}
      >
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">黑名单管理</h1>
      </header>

      {blockedUsers.length === 0 ? (
        <div className="py-20 text-center">
          <svg
            className="mx-auto mb-3"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ccc"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          <p className="text-sm text-gray-400">暂无黑名单用户</p>
        </div>
      ) : (
        blockedUsers.map((user) => (
          <div
            key={user.userId}
            className="flex items-center gap-3 border-b border-gray-50 px-4 py-3"
          >
            <FriendAvatar text={user.avatar || user.nickname} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800 truncate">
                  {user.nickname}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  ID: {user.userId}
                </span>
              </div>
              {user.bio && (
                <p className="mt-0.5 truncate text-xs text-gray-500">{user.bio}</p>
              )}
            </div>
            <button
              onClick={() => handleUnblock(user.userId)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white active:opacity-80 transition-opacity shrink-0"
              style={{ backgroundColor: BRAND }}
            >
              解除拉黑
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// ==================== v25.0.41 消息Tab：服务端统一会话列表 ====================
// 数据全部来自 /api/social/conversations（服务端持久化，跨设备恢复），禁止localStorage模拟
function convTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (now.toDateString() === d.toDateString()) {
      return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    }
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 1) return "昨天";
    if (diffDays < 7) return `${diffDays}天前`;
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function ConversationsView({ onOpenPrivate }: { onOpenPrivate: (peerId: string) => void }) {
  const router = useRouter();
  const [convs, setConvs] = useState<ConversationVo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<{ conv: ConversationVo; x: number; y: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConversationVo | null>(null);

  const load = useCallback(() => {
    void fetchConversations().then((r) => {
      if (r && r.success && r.conversations) setConvs(r.conversations);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu]);

  const open = (c: ConversationVo) => {
    void markConversationRead(c.conversationId).catch(() => {});
    if (c.type === "group") {
      router.push(`/groups/chat?id=${encodeURIComponent(String(c.groupId ?? ""))}`);
    } else {
      onOpenPrivate(c.peerId || "");
    }
  };

  const filtered = convs.filter((c) => {
    const name = c.type === "group" ? c.groupName || "" : c.peerName || "";
    return name.toLowerCase().includes(query.toLowerCase()) || (c.lastMessage?.content || "").includes(query);
  });

  const act = async (fn: () => Promise<any>) => {
    await fn().catch(() => {});
    setMenu(null);
    load();
  };

  return (
    <div>
      {/* 会话搜索 */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索会话"
            className="w-full rounded-xl bg-gray-100 py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
          />
        </div>
      </div>

      {!loaded ? (
        <div className="py-16 text-center text-sm text-gray-400">加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <svg className="mx-auto mb-3" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-sm text-gray-400">{query ? "暂无匹配的会话" : "暂无会话，去通讯录找好友聊聊天吧"}</p>
        </div>
      ) : (
        filtered.map((c) => {
          const name = c.type === "group" ? c.groupName || "群聊" : c.peerName || "用户";
          const lastText = c.lastMessage
            ? `${c.type === "group" && c.lastMessage.senderName ? c.lastMessage.senderName + "：" : ""}${c.lastMessage.type === "image" ? "[图片]" : c.lastMessage.content}`
            : "";
          return (
            <div
              key={c.conversationId}
              className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left select-none cursor-pointer active:bg-gray-50"
              style={c.pinned ? { backgroundColor: "#F7F5FA" } : undefined}
              onClick={() => open(c)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ conv: c, x: e.clientX, y: e.clientY });
              }}
              onTouchStart={(e) => {
                const t0 = Date.now();
                const touch = e.touches[0];
                const timer = setTimeout(() => {
                  if (touch) setMenu({ conv: c, x: touch.clientX, y: touch.clientY });
                }, 500);
                const clear = () => {
                  clearTimeout(timer);
                  document.removeEventListener("touchend", clear);
                  document.removeEventListener("touchmove", clear);
                };
                document.addEventListener("touchend", clear);
                document.addEventListener("touchmove", clear);
                if (Date.now() - t0 < 0) return;
              }}
            >
              <div className="relative shrink-0">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-base font-semibold text-white"
                  style={{ backgroundColor: c.type === "group" ? BRAND : "#9C6ADE" }}
                >
                  {(c.type === "group" ? c.groupName || "群" : c.peerName || "友").slice(0, 1)}
                </div>
                {c.type === "group" && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ background: BRAND, borderRadius: "50%" }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {c.pinned && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <line x1="12" y1="17" x2="12" y2="22" />
                      <path d="M5 17h14l-1.5-6.5a4 4 0 0 0-4-3.5h-3a4 4 0 0 0-4 3.5L5 17z" />
                    </svg>
                  )}
                  <span className="text-sm font-semibold text-gray-800 truncate">{name}</span>
                  {c.muted && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    </svg>
                  )}
                  <span className="ml-auto shrink-0 text-xs text-gray-400">{convTime(c.updatedAt)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="truncate text-xs text-gray-400 flex-1">{lastText || "暂无消息"}</p>
                  {c.unread > 0 && !c.muted && (
                    <span
                      className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                      style={{ backgroundColor: "#F44336" }}
                    >
                      {c.unread > 99 ? "99+" : c.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* 会话操作菜单 */}
      {menu && (
        <div className="fixed inset-0 z-50" onClick={(e) => e.stopPropagation()}>
          <div
            className="absolute w-40 overflow-hidden rounded-xl bg-white shadow-xl"
            style={{
              left: Math.min(menu.x, (typeof window !== "undefined" ? window.innerWidth : 400) - 170),
              top: Math.min(menu.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 220),
              border: "1px solid #eee",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => act(() => toggleConversationPin(menu.conv.conversationId, !menu.conv.pinned))} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 active:bg-gray-100">
              {menu.conv.pinned ? "取消置顶" : "置顶聊天"}
            </button>
            <button onClick={() => act(() => toggleConversationMute(menu.conv.conversationId, !menu.conv.muted))} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 active:bg-gray-100">
              {menu.conv.muted ? "开启提醒" : "消息免打扰"}
            </button>
            {menu.conv.unread > 0 && (
              <button onClick={() => act(() => markConversationRead(menu.conv.conversationId))} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 active:bg-gray-100">
                标记已读
              </button>
            )}
            <button onClick={() => { setDeleteTarget(menu.conv); setMenu(null); }} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-500 active:bg-gray-100">
              删除会话
            </button>
          </div>
        </div>
      )}

      {/* 删除会话确认 */}
      {deleteTarget && (
        <UnifiedConfirmDialog
          open
          danger
          title="删除会话"
          message={`确定删除与「${deleteTarget.type === "group" ? deleteTarget.groupName : deleteTarget.peerName}」的会话吗？删除后可重新发起聊天。`}
          confirmText="删除"
          cancelText="取消"
          onConfirm={() => { const t = deleteTarget; setDeleteTarget(null); void act(() => deleteConversation(t.conversationId)); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ==================== 主页面 ====================
export default function FriendsPage() {
  const router = useRouter();
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  // 视图状态
  const [view, setView] = useState<"list" | "addFriend" | "requests" | "blacklist">("list");
  const [addMode, setAddMode] = useState<"scan" | "search" | "nearby">("scan");
  const [scannedUid, setScannedUid] = useState<string | null>(null);
  // v25.0.41：聊天页两个一级Tab——消息（默认，服务端统一会话）｜通讯录
  const [activeTab, setActiveTab] = useState<"messages" | "contacts">("messages");
  const [contactsSection, setContactsSection] = useState<"friends" | "groups">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);

  // 数据
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [blacklist, setBlacklist] = useState<string[]>([]);

  // 操作菜单
  const [actionMenu, setActionMenu] = useState<{
    friendId: string;
    x: number;
    y: number;
  } | null>(null);

  // 删除确认
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 修改备注
  const [noteEditFriend, setNoteEditFriend] = useState<{ id: string; name: string; note: string } | null>(null);

  // 长按计时器
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 长按是否已触发（用于区分点击与长按，避免长按弹出菜单后误触发跳转）
  const longPressTriggered = useRef(false);

  // P1 弹窗规范：添加菜单展开层返回键优先关闭
  usePopupBackHandler(() => setShowAddMenu(false), showAddMenu);

  // ==================== 登录守卫（进入页面时校验） ====================
  useEffect(() => {
    requireLogin();
  }, []);

  // ==================== URL 参数读取（扫码跳转 / 附近搭子入口）====================
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const uid = params.get("uid");
    const mode = params.get("mode");

    if (uid) {
      // 扫码打开带 uid 参数：自动进入搜索模式并查找用户
      setScannedUid(uid);
      setAddMode("search");
      setView("addFriend");
    } else if (mode === "nearby") {
      // 从发现页"附近用户"入口跳转
      setAddMode("nearby");
      setView("addFriend");
    }
    // 清除 URL 参数，避免刷新时重复触发
    if (uid || mode) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ==================== 数据加载（v25.0.19：本地 + 后端合并） ====================
  const loadData = useCallback(() => {
    setFriends(getFriends());
    // v25.0.47 P1-A：legacy group_* 本地假群一律不展示（与群列表页同一规则）
    setGroups(getGroups().filter((g) => !isLegacyLocalGroupId(g.id)));
    const reqs = getFriendRequests();
    setFriendRequests(reqs);
    setBlacklist(getBlacklist());

    // 后端真实好友/群组/申请（登录后跨设备跨用户可见）
    void apiFetchFriends().then((r) => {
      const serverFriends = r && r.success ? r.friends : undefined;
      if (serverFriends) {
        setFriends((prev) => {
          const localById = new Map(prev.map((f) => [f.id, f]));
          for (const sf of serverFriends) {
            const existing = localById.get(sf.userId);
            if (!existing) {
              prev.push({
                id: sf.userId,
                name: sf.nickname || "言道用户",
                avatar: sf.avatar || (sf.nickname || "友").slice(0, 1),
                online: false,
                lastSeen: sf.friendSince || new Date().toISOString(),
                note: "",
                tags: [],
                addedAt: sf.friendSince || new Date().toISOString(),
              });
            } else {
              // 服务端昵称/头像较新时同步（保留本地备注与标签）
              existing.name = sf.nickname || existing.name;
              existing.avatar = sf.avatar || existing.avatar;
            }
          }
          // v25.0.38 P0-1：同步结果持久化到本地，保证聊天页/信息页等读缓存处昵称一致
          saveFriends([...prev]);
          return [...prev];
        });
      }
    }).catch(() => {});
    void apiFetchGroups().then((r) => {
      const serverGroupsRaw = r && r.success ? r.groups : undefined;
      if (serverGroupsRaw) {
        setGroups((prev) => {
          const ids = new Set(prev.map((g) => g.id));
          const serverGroups: typeof prev = serverGroupsRaw
            .filter((g) => !ids.has(g.groupId))
            .map((g) => ({
              id: g.groupId,
              name: g.name,
              avatar: g.name.slice(0, 1),
              ownerId: g.ownerId,
              ownerName: g.ownerName || "",
              members: [],
              announcement: g.announcement || "",
              maxMembers: 50,
              level: "small" as const,
              createdAt: g.createdAt || "",
              tags: [],
            }));
          return [...prev, ...serverGroups];
        });
      }
    }).catch(() => {});
    void apiFetchFriendRequests().then((r) => {
      const serverReqsRaw = r && r.success ? r.requests : undefined;
      if (serverReqsRaw) {
        setFriendRequests((prev) => {
          const ids = new Set(prev.map((x) => x.id));
          const serverReqs: FriendRequest[] = serverReqsRaw
            .filter((x) => !ids.has(x.id))
            .map((x) => ({
              id: x.id,
              fromId: x.fromId,
              fromName: x.fromName || "言道用户",
              fromAvatar: x.fromName?.slice(0, 1) || "友",
              message: x.message || "",
              status: "pending" as const,
              createdAt: x.createdAt,
            }));
          return [...serverReqs, ...prev];
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================== URL参数处理：自动打开附近搭子 ====================
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    if (mode === "nearby") {
      setAddMode("nearby");
      setView("addFriend");
    }
  }, []);

  useEffect(() => {
    if (view === "list") {
      loadData();
      setShowAddMenu(false);
    }
  }, [view, loadData]);

  // ==================== 计算 ====================
  const pendingCount = friendRequests.filter((r) => r.status === "pending").length;

  const filteredFriends = friends.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.note && f.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ==================== 好友请求处理（v25.0.19：同步后端） ====================
  const handleAcceptRequest = (req: FriendRequest) => {
    updateFriendRequest(req.id, "accepted");
    // 创建好友记录
    const newFriend: Friend = {
      id: req.fromId,
      name: req.fromName,
      avatar: req.fromAvatar || req.fromName.slice(0, 1),
      online: false,
      lastSeen: new Date().toISOString(),
      note: "",
      tags: [],
      addedAt: new Date().toISOString(),
    };
    addFriend(newFriend);
    // 服务端申请（数字ID）同步受理，对方账号同步成为好友
    if (/^\d+$/.test(req.id)) {
      void apiRespondFriendRequest(req.id, "accept").catch(() => {});
    }
    loadData();
  };

  const handleRejectRequest = (req: FriendRequest) => {
    updateFriendRequest(req.id, "rejected");
    if (/^\d+$/.test(req.id)) {
      void apiRespondFriendRequest(req.id, "reject").catch(() => {});
    }
    loadData();
  };

  // ==================== 操作处理 ====================
  const handleDeleteFriend = () => {
    if (deleteConfirmId) {
      removeFriend(deleteConfirmId);
      void apiRemoveFriend(deleteConfirmId).catch(() => {});
      setDeleteConfirmId(null);
      setActionMenu(null);
      loadData();
    }
  };

  const handleBlockFriend = (friendId: string) => {
    addToBlacklist(friendId);
    removeFriend(friendId);
    setActionMenu(null);
    loadData();
  };

  const handleSendMessage = (friendId: string) => {
    if (!requireLogin()) return;
    setActionMenu(null);
    router.push(`/friends/chat?id=${encodeURIComponent(friendId)}`);
  };

  // v25.0.41：点击任何用户统一进入唯一 UserProfile 页面
  const handleOpenProfile = (userId: string) => {
    if (!requireLogin()) return;
    router.push(`/user?uid=${encodeURIComponent(userId)}`);
  };

  // ==================== 修改备注 ====================
  const handleRemarkFriend = (friendId: string) => {
    setActionMenu(null);
    const friend = friends.find((f) => f.id === friendId);
    if (friend) {
      setNoteEditFriend({
        id: friend.id,
        name: friend.name,
        note: friend.note || "",
      });
    }
  };

  const handleSaveNote = (note: string) => {
    if (noteEditFriend) {
      updateFriendNote(noteEditFriend.id, note);
      setNoteEditFriend(null);
      loadData();
    }
  };

  // ==================== 长按事件 ====================
  const handleTouchStart = (friendId: string, e: React.TouchEvent) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      const touch = e.touches[0] || e.changedTouches[0];
      if (touch) {
        setActionMenu({ friendId, x: touch.clientX, y: touch.clientY });
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleContextMenu = (friendId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setActionMenu({ friendId, x: e.clientX, y: e.clientY });
  };

  // ==================== 视图路由 ====================
  if (view === "addFriend") {
    return (
      <AddFriendView
        onBack={() => {
          setScannedUid(null);
          setView("list");
        }}
        initialMode={addMode}
        initialUid={scannedUid}
      />
    );
  }

  if (view === "requests") {
    return (
      <FriendRequestsPanel
        requests={friendRequests}
        onBack={() => setView("list")}
        onAccept={handleAcceptRequest}
        onReject={handleRejectRequest}
      />
    );
  }

  if (view === "blacklist") {
    return <BlacklistPanel onBack={() => setView("list")} />;
  }

  // ==================== 列表视图 ====================
  return (
    <div
      className="min-h-screen bg-white"
      style={{ maxWidth: "420px", margin: "0 auto", paddingBottom: "72px" }}
    >
      {/* ===== Header ===== */}
      <div className="sticky top-0 z-40 relative">
        <BrandHeader title="聊天" />
        {/* + 按钮 */}
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="absolute right-2 top-0 z-10 flex h-10 w-10 items-center justify-center text-white"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* 弹出菜单 */}
        {showAddMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
            <div
              className="absolute right-2 z-50 w-40 overflow-hidden rounded-xl bg-white shadow-xl"
              style={{ top: "44px", border: "1px solid #eee" }}
            >
              <button
                onClick={() => {
                  if (!requireLogin()) return;
                  setShowAddMenu(false);
                  setAddMode("search");
                  setView("addFriend");
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                添加好友
              </button>
              <button
                onClick={() => {
                  if (!requireLogin()) return;
                  setShowAddMenu(false);
                  setAddMode("scan");
                  setView("addFriend");
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
                扫码添加
              </button>
              <button
                onClick={() => {
                  if (!requireLogin()) return;
                  setShowAddMenu(false);
                  router.push("/groups/create");
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                创建群聊
              </button>
              <button
                onClick={() => {
                  if (!requireLogin()) return;
                  setShowAddMenu(false);
                  setAddMode("nearby");
                  setView("addFriend");
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                附近搭子
              </button>
            </div>
          </>
        )}
      </div>

      {/* ===== 分段切换（v25.0.41：聊天页一级Tab——消息｜通讯录） ===== */}
      <div className="flex border-b border-gray-100">
        {(["messages", "contacts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="relative flex-1 py-3 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab ? BRAND : "#999",
              fontWeight: activeTab === tab ? 600 : 400,
            }}
          >
            {tab === "messages" ? "消息" : "通讯录"}
            {activeTab === tab && (
              <div
                className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full"
                style={{ backgroundColor: BRAND }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ===== 搜索栏（仅通讯录Tab；消息Tab使用会话内搜索） ===== */}
      {activeTab === "contacts" && (
        <div className="sticky z-30 bg-white px-4 py-3" style={{ top: "40px" }}>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#999"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索好友 / 群聊"
              className="w-full rounded-xl bg-gray-100 py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* ===== 列表内容 ===== */}
      <div className="flex-1">
        {activeTab === "messages" ? (
          <ConversationsView
            onOpenPrivate={(peerId) => {
              if (!requireLogin()) return;
              router.push(`/friends/chat?id=${encodeURIComponent(peerId)}`);
            }}
          />
        ) : (
          <>
            {/* 新的朋友入口 */}
            <FriendRequestsEntry
              count={pendingCount}
              onOpen={() => setView("requests")}
            />

            {/* 通讯录分区切换：好友｜群聊 */}
            <div className="flex border-b border-gray-50 bg-gray-50/60">
              {(["friends", "groups"] as const).map((sec) => (
                <button
                  key={sec}
                  onClick={() => setContactsSection(sec)}
                  className="relative flex-1 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    color: contactsSection === sec ? BRAND : "#999",
                    fontWeight: contactsSection === sec ? 600 : 400,
                  }}
                >
                  {sec === "friends" ? `好友（${filteredFriends.length}）` : `群聊（${filteredGroups.length}）`}
                  {contactsSection === sec && (
                    <div
                      className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full"
                      style={{ backgroundColor: BRAND }}
                    />
                  )}
                </button>
              ))}
            </div>

            {contactsSection === "friends" ? (
              <>
            {/* 黑名单管理入口 */}
            <BlacklistEntry
              count={blacklist.length}
              onOpen={() => setView("blacklist")}
            />

            {/* 添加好友入口（列表非空且未搜索时显示，方便随时添加） */}
            {filteredFriends.length > 0 && !searchQuery && (
              <button
                onClick={() => {
                  if (!requireLogin()) return;
                  setAddMode("scan");
                  setView("addFriend");
                }}
                className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left active:bg-gray-50"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: BRAND_LIGHT }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={BRAND}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">添加好友</p>
                  <p className="text-xs text-gray-400">扫码或搜索ID添加新朋友</p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ccc"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            {/* 好友列表 */}
            {filteredFriends.length === 0 ? (
              <div className="py-16 text-center">
                <svg
                  className="mx-auto mb-3"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ccc"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <p className="text-sm text-gray-400">
                  {searchQuery ? "暂无匹配的好友" : "暂无好友，快去添加吧"}
                </p>

                {/* 空状态快捷添加按钮（仅未搜索时展示，引导用户添加好友） */}
                {!searchQuery && (
                  <div className="mt-6 flex flex-col items-center gap-3 px-8">
                    {/* 扫码添加好友 - 紫色填充主按钮 */}
                    <button
                      onClick={() => {
                        if (!requireLogin()) return;
                        setAddMode("scan");
                        setView("addFriend");
                      }}
                      className="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white shadow-md transition-transform active:scale-[0.98] active:opacity-90"
                      style={{ backgroundColor: BRAND }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                      </svg>
                      扫码添加好友
                    </button>

                    {/* 搜索ID添加 - 白色描边次按钮 */}
                    <button
                      onClick={() => {
                        if (!requireLogin()) return;
                        setAddMode("search");
                        setView("addFriend");
                      }}
                      className="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border-2 bg-white py-3.5 text-sm font-semibold transition-transform active:scale-[0.98] active:opacity-90"
                      style={{ borderColor: BRAND, color: BRAND }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      搜索ID添加
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredFriends.map((friend) => {
                const blocked = isBlocked(friend.id);
                if (blocked) return null;

                return (
                  <div
                    key={friend.id}
                    className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left select-none cursor-pointer active:bg-gray-50"
                    onClick={() => {
                      // 长按已触发（弹出操作菜单）则不跳转
                      if (longPressTriggered.current) {
                        longPressTriggered.current = false;
                        return;
                      }
                      // v25.0.41：点击好友行进入唯一用户资料页（资料页内可发消息）
                      handleOpenProfile(friend.id);
                    }}
                    onTouchStart={(e) => handleTouchStart(friend.id, e)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    onContextMenu={(e) => handleContextMenu(friend.id, e)}
                    onMouseDown={(e) => {
                      // 右键不触发长按
                      if (e.button === 2) return;
                      longPressTriggered.current = false;
                      longPressTimer.current = setTimeout(() => {
                        longPressTriggered.current = true;
                        setActionMenu({
                          friendId: friend.id,
                          x: e.clientX,
                          y: e.clientY,
                        });
                      }, 500);
                    }}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                  >
                    <FriendAvatar
                      text={friend.avatar || friend.name}
                      size={44}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 truncate">
                          {friend.name}
                        </span>
                        {friend.online && (
                          <span
                            className="inline-block h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: "#4CAF50" }}
                          />
                        )}
                      </div>
                      {friend.note ? (
                        <p className="mt-0.5 truncate text-xs text-gray-400">
                          备注：{friend.note}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-gray-400">
                          {friend.lastSeen ? `最近在线：${new Date(friend.lastSeen).toLocaleDateString("zh-CN")}` : ""}
                        </p>
                      )}
                    </div>
                    {/* 右侧箭头 */}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ddd"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                );
              })
            )}
              </>
            ) : (
              <>
                {/* ===== 群聊分区：我创建的群 / 我加入的群 ===== */}
                {(() => {
                  const myId = getCurrentUserId();
                  const created = filteredGroups.filter((g) => g.ownerId === myId || String(g.ownerId) === String(myId));
                  const joined = filteredGroups.filter((g) => !(g.ownerId === myId || String(g.ownerId) === String(myId)));
                  const renderGroupRow = (group: GroupInfo, isOwner: boolean) => (
                    <div
                      key={group.id}
                      className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left cursor-pointer active:bg-gray-50"
                      onClick={() => {
                        if (!requireLogin()) return;
                        router.push(`/groups/chat?id=${encodeURIComponent(group.id)}`);
                      }}
                    >
                      <FriendAvatar text={group.name} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800 truncate">
                            {group.name}
                          </span>
                          <span className="text-xs text-gray-400 shrink-0">
                            ({group.members.length}人)
                          </span>
                        </div>
                        {group.announcement && (
                          <p className="mt-0.5 truncate text-xs text-gray-400">
                            {group.announcement}
                          </p>
                        )}
                      </div>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ddd"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  );
                  return (
                    <>
                      {created.length > 0 && (
                        <>
                          <p className="px-4 pt-3 pb-1 text-xs font-medium text-gray-400">我创建的群（{created.length}）</p>
                          {created.map((g) => renderGroupRow(g, true))}
                        </>
                      )}
                      {joined.length > 0 && (
                        <>
                          <p className="px-4 pt-3 pb-1 text-xs font-medium text-gray-400">我加入的群（{joined.length}）</p>
                          {joined.map((g) => renderGroupRow(g, false))}
                        </>
                      )}
                      {filteredGroups.length === 0 && (
                        <div className="py-12 text-center">
                          <svg className="mx-auto mb-3" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <p className="text-sm text-gray-400">
                            {searchQuery ? "暂无匹配的群聊" : "暂无群聊"}
                          </p>
                          {!searchQuery && (
                            <button
                              onClick={() => {
                                if (!requireLogin()) return;
                                router.push("/groups/create");
                              }}
                              className="mt-4 rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
                              style={{ backgroundColor: BRAND }}
                            >
                              创建群聊
                            </button>
                          )}
                        </div>
                      )}
                      {filteredGroups.length > 0 && (
                        <button
                          onClick={() => {
                            if (!requireLogin()) return;
                            router.push("/groups/create");
                          }}
                          className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left active:bg-gray-50"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_LIGHT }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">创建群聊</p>
                            <p className="text-xs text-gray-400">和好友一起学习交流</p>
                          </div>
                        </button>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </>
        )}
      </div>

      {/* ===== 操作菜单 ===== */}
      {actionMenu && (
        <ActionMenu
          x={actionMenu.x}
          y={actionMenu.y}
          onDelete={() => setDeleteConfirmId(actionMenu.friendId)}
          onBlock={() => handleBlockFriend(actionMenu.friendId)}
          onMessage={() => handleSendMessage(actionMenu.friendId)}
          onRemark={() => handleRemarkFriend(actionMenu.friendId)}
          onClose={() => setActionMenu(null)}
        />
      )}

      {/* ===== 删除确认弹窗：统一 ConfirmDialog（P7-弹窗统一-01） ===== */}
      {deleteConfirmId && (
        <UnifiedConfirmDialog
          open
          danger
          title="删除好友"
          message="确定要删除该好友吗？删除后将无法恢复。"
          confirmText="删除"
          cancelText="取消"
          onConfirm={handleDeleteFriend}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}

      {/* ===== 修改备注弹窗 ===== */}
      {noteEditFriend && (
        <NoteEditDialog
          friendName={noteEditFriend.name}
          initialNote={noteEditFriend.note}
          onConfirm={handleSaveNote}
          onCancel={() => setNoteEditFriend(null)}
        />
      )}

      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  );
}