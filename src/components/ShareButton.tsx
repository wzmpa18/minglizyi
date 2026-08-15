"use client";

import { useState, useCallback, useRef } from "react";
import { generatePoster } from "@/lib/sharePoster";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { shareReward } from "@/lib/pointsStore";
import { getInviteCode } from "@/lib/inviteStore";

const BRAND = "#7B2FBE";

export interface ShareButtonProps {
  /** 分享类型 */
  type: "post" | "tool" | "article" | "invite";
  /** 分享标题 */
  title: string;
  /** 分享描述 */
  description?: string;
  /** 分享链接 */
  url?: string;
  /** 按钮文字 */
  label?: string;
  /** 按钮样式：inline=行内小按钮，block=块级大按钮 */
  variant?: "inline" | "block";
  /** 回调 */
  onShared?: () => void;
}

export function ShareButton({
  type,
  title,
  description = "",
  url,
  label = "分享",
  variant = "inline",
  onShared,
}: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2500);
  }, []);

  const getCurrentUserInfo = useCallback(() => {
    if (typeof window === "undefined") return { userId: "", userName: "言道用户", inviteCode: "" };
    const userId = localStorage.getItem("yandao_user_id") || "";
    const profileRaw = localStorage.getItem("yandao_user_profile");
    let userName = "言道用户";
    if (profileRaw) {
      try {
        const p = JSON.parse(profileRaw);
        userName = p.nickname || userName;
      } catch { /* ignore */ }
    }
    let inviteCode = "";
    try {
      inviteCode = getInviteCode(userId);
    } catch { /* ignore */ }
    return { userId, userName, inviteCode };
  }, []);

  // 兼容性复制：优先 navigator.clipboard，降级 execCommand
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch { /* fall through to execCommand */ }
    }
    // 降级方案：创建临时 textarea + execCommand
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }, []);

  // 复制链接
  const handleCopyLink = useCallback(() => {
    const link = url || (typeof window !== "undefined" ? window.location.href : "");
    copyToClipboard(link).then((ok) => {
      if (ok) {
        showToast("链接已复制，可粘贴分享");
        handleShareSuccess();
      } else {
        showToast("复制失败，请手动复制：" + link);
      }
    });
    setShowMenu(false);
  }, [url, copyToClipboard, showToast]);

  // 生成海报
  const handleGeneratePoster = useCallback(async () => {
    setShowMenu(false);
    setGenerating(true);
    try {
      const { userId, userName, inviteCode } = getCurrentUserInfo();
      const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "https://yandao.vip");
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`;

      const posterUrl = await generatePoster({
        size: "vertical",
        userId,
        userName,
        inviteCode,
        qrCodeUrl: qrUrl,
      });

      // 下载海报
      const link = document.createElement("a");
      link.href = posterUrl;
      link.download = `yandao-share-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("海报已保存到下载文件夹");
      handleShareSuccess();
    } catch (e) {
      console.error("生成海报失败:", e);
      showToast("海报生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  }, [type, title, description, url, getCurrentUserInfo, showToast]);

  // 系统分享
  const handleSystemShare = useCallback(async () => {
    setShowMenu(false);
    const link = url || (typeof window !== "undefined" ? window.location.href : "");
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: title,
          text: description || title,
          url: link,
        });
        showToast("分享成功");
        handleShareSuccess();
      } catch {
        // 用户取消分享不算失败
      }
    } else {
      // 不支持系统分享时，降级为复制链接
      handleCopyLink();
    }
  }, [title, description, url, showToast, handleCopyLink]);

  // 分享成功后发放奖励
  const handleShareSuccess = useCallback(() => {
    try {
      const result = shareReward();
      if (result.success) {
        showToast(`分享成功 +${result.amount}积分`);
      }
    } catch { /* ignore */ }
    onShared?.();
  }, [onShared, showToast]);

  if (variant === "block") {
    return (
      <>
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={generating}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: BRAND }}
        >
          {generating ? "生成中..." : label}
        </button>
        {showMenu && (
          <ShareMenu
            onCopyLink={handleCopyLink}
            onPoster={handleGeneratePoster}
            onSystemShare={handleSystemShare}
            onClose={() => setShowMenu(false)}
          />
        )}
        {toast && <Toast message={toast} />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={generating}
        className="flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
        style={{ color: "#999" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        <span>{label}</span>
      </button>
      {showMenu && (
        <ShareMenu
          onCopyLink={handleCopyLink}
          onPoster={handleGeneratePoster}
          onSystemShare={handleSystemShare}
          onClose={() => setShowMenu(false)}
        />
      )}
      {toast && <Toast message={toast} />}
    </>
  );
}

// ==================== 分享菜单 ====================
function ShareMenu({
  onCopyLink,
  onPoster,
  onSystemShare,
  onClose,
}: {
  onCopyLink: () => void;
  onPoster: () => void;
  onSystemShare: () => void;
  onClose: () => void;
}) {
  useBodyScrollLock(true);

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} style={{ backgroundColor: "rgba(0,0,0,0.4)" }} />
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[420px] rounded-t-2xl bg-white shadow-xl"
        style={{ animation: "shareSlideUp 0.2s ease-out", paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="px-4 pt-4 pb-2 text-center">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
          <p className="text-sm font-semibold text-gray-800 mb-3">分享到</p>
        </div>
        <div className="grid grid-cols-3 gap-3 px-6 pb-6">
          <button
            onClick={onCopyLink}
            className="flex flex-col items-center gap-2"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: BRAND + "15" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <span className="text-xs text-gray-600">复制链接</span>
          </button>
          <button
            onClick={onPoster}
            className="flex flex-col items-center gap-2"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: BRAND + "15" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <span className="text-xs text-gray-600">生成海报</span>
          </button>
          <button
            onClick={onSystemShare}
            className="flex flex-col items-center gap-2"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: BRAND + "15" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </div>
            <span className="text-xs text-gray-600">系统分享</span>
          </button>
        </div>
        <div className="border-t border-gray-100 py-3 text-center">
          <p className="text-[10px] text-gray-400">
            分享有礼 · 每日首次分享可获得积分奖励 · 请勿分享违规内容
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full border-t border-gray-100 py-3 text-sm text-gray-500"
        >
          取消
        </button>
      </div>
    </>
  );
}

// ==================== Toast 提示 ====================
function Toast({ message }: { message: string }) {
  return (
    <div
      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] rounded-xl px-4 py-2 text-sm text-white shadow-lg"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
    >
      {message}
    </div>
  );
}
