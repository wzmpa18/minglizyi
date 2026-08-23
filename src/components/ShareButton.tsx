"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { generatePoster } from "@/lib/sharePoster";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";
import { shareReward } from "@/lib/pointsStore";
import { getInviteCode } from "@/lib/inviteStore";
import { getInviteLink } from "@/lib/inviteApi";
import {
  createShareToken,
  copyLinkReal,
  systemShareReal,
  makeShareQr,
  logShareAction,
  type ShareEngineInput,
  type ShareTokenData,
} from "@/lib/shareEngine";

const BRAND = "#7B2FBE";

export interface ShareButtonProps {
  /** 分享类型 */
  type: "post" | "tool" | "article" | "invite";
  /** 分享标题 */
  title: string;
  /** 分享描述 */
  description?: string;
  /** 分享链接（无 shareData 时使用） */
  url?: string;
  /** 按钮文字 */
  label?: string;
  /** 按钮样式：inline=行内小按钮，block=块级大按钮 */
  variant?: "inline" | "block";
  /**
   * 统一Share Engine输入（v25.0.47_5）：传入后排盘结果存服务端生成Token链接，
   * 接收者扫码/点开可查看真实结果，不再分享空白工具页。
   */
  shareData?: ShareEngineInput;
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
  shareData,
  onShared,
}: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState("");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // P9-推广中心：签名邀请参数（与服务端 resolveInviteAttribution 同一归因口径）
  const [inviteParams, setInviteParams] = useState<{ ref: string; ts: string; sig: string } | null>(null);
  // Share Engine：Token缓存（同一份排盘结果只创建一次）
  const tokenCache = useRef<ShareTokenData | null>(null);
  const tokenCreating = useRef<Promise<ShareTokenData | null> | null>(null);

  useEffect(() => {
    let mounted = true;
    getInviteLink()
      .then((d) => {
        if (mounted && d && d.inviteRef && d.inviteTs && d.inviteSig) {
          setInviteParams({ ref: d.inviteRef, ts: d.inviteTs, sig: d.inviteSig });
        }
      })
      .catch(() => { /* 未登录/接口失败时静默，构建链接走邀请码降级 */ });
    return () => { mounted = false; };
  }, []);

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

  // 兼容性复制：优先 navigator.clipboard，降级 execCommand（真实resolve才算成功）
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    return copyLinkReal(text);
  }, []);

  // P9-推广中心：分享链接统一携带邀请标识，与注册归因复用同一套签名链接口径
  const buildAttributedLink = useCallback((rawUrl: string): string => {
    if (typeof window === "undefined") return rawUrl;
    try {
      const u = new URL(rawUrl, window.location.origin);
      if (inviteParams && !u.searchParams.get("ref")) {
        u.searchParams.set("ref", inviteParams.ref);
        u.searchParams.set("ts", inviteParams.ts);
        u.searchParams.set("sig", inviteParams.sig);
        return u.toString();
      }
      const { inviteCode } = getCurrentUserInfo();
      if (inviteCode && !u.searchParams.get("code") && !u.searchParams.get("ref")) {
        u.searchParams.set("code", inviteCode);
      }
      return u.toString();
    } catch {
      return rawUrl;
    }
  }, [getCurrentUserInfo, inviteParams]);

  /**
   * 取最终分享URL（Share Engine统一入口）：
   * - 有 shareData：服务端创建Token链接（接收者可查看真实排盘结果），失败则明确报错
   * - 无 shareData：沿用当前页URL+邀请归因（文章/帖子等）
   */
  const ensureShareUrl = useCallback(async (): Promise<string | null> => {
    if (!shareData) {
      const rawLink = url || (typeof window !== "undefined" ? window.location.href : "");
      return buildAttributedLink(rawLink);
    }
    if (tokenCache.current) return tokenCache.current.shareUrl;
    if (!tokenCreating.current) {
      tokenCreating.current = createShareToken(shareData).then((d) => {
        if (d) tokenCache.current = d;
        return d;
      });
    }
    const d = await tokenCreating.current;
    if (!d) {
      showToast("分享链接生成失败，请检查网络后重试");
      return null;
    }
    return d.shareUrl;
  }, [shareData, url, buildAttributedLink, showToast]);

  // 复制链接（真实Clipboard resolve）
  const handleCopyLink = useCallback(() => {
    setGenerating(true);
    ensureShareUrl().then((link) => {
      setGenerating(false);
      if (!link) return;
      copyToClipboard(link).then((ok) => {
        if (ok) {
          showToast("链接已复制，可粘贴分享");
          logShareAction("copy_link");
          handleShareSuccess();
        } else {
          showToast("复制失败，请长按手动复制");
        }
      });
      setShowMenu(false);
    });
  }, [ensureShareUrl, copyToClipboard, showToast]);

  // 生成海报（图片真实生成 + 保存）
  const handleGeneratePoster = useCallback(async () => {
    setShowMenu(false);
    setGenerating(true);
    try {
      const link = await ensureShareUrl();
      if (!link) { setGenerating(false); return; }
      const { userId, userName, inviteCode } = getCurrentUserInfo();
      const qrUrl = await makeShareQr(link);
      const posterUrl = await generatePoster({
        size: "vertical",
        userId,
        userName,
        inviteCode,
        qrCodeUrl: qrUrl,
      });

      const a = document.createElement("a");
      a.href = posterUrl;
      a.download = `yandao-share-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast("海报已保存到下载文件夹");
      logShareAction("save_poster");
      handleShareSuccess();
    } catch (e) {
      console.error("生成海报失败:", e);
      showToast("海报生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  }, [ensureShareUrl, getCurrentUserInfo, showToast]);

  // 二维码（本地生成，展示可长按识别）
  const handleShowQr = useCallback(async () => {
    setShowMenu(false);
    setGenerating(true);
    try {
      const link = await ensureShareUrl();
      if (!link) { setGenerating(false); return; }
      const qr = await makeShareQr(link);
      setQrImage(qr);
      logShareAction("qr_code");
    } catch (e) {
      console.error("生成二维码失败:", e);
      showToast("二维码生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  }, [ensureShareUrl, showToast]);

  // 系统分享（真实Web Share API；取消≠成功）
  const handleSystemShare = useCallback(async () => {
    setShowMenu(false);
    setGenerating(true);
    try {
      const link = await ensureShareUrl();
      if (!link) { setGenerating(false); return; }
      const status = await systemShareReal({ title, text: description || title, url: link });
      if (status === "success") {
        showToast("分享成功");
        logShareAction("system_share");
        handleShareSuccess();
      } else if (status === "cancelled") {
        // 用户取消：不提示成功也不报错
      } else if (status === "unsupported") {
        // 不支持系统分享：降级为复制链接
        const ok = await copyToClipboard(link);
        showToast(ok ? "当前环境不支持系统分享，链接已复制" : "复制失败，请手动复制");
        if (ok) { logShareAction("copy_link"); handleShareSuccess(); }
      } else {
        showToast("分享失败，请重试");
      }
    } finally {
      setGenerating(false);
    }
  }, [title, description, ensureShareUrl, copyToClipboard, showToast]);

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
            onQr={handleShowQr}
            onSystemShare={handleSystemShare}
            onClose={() => setShowMenu(false)}
          />
        )}
        {qrImage && <QrModal image={qrImage} url={tokenCache.current?.shareUrl || ""} onClose={() => setQrImage(null)} />}
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
        <span>{generating ? "生成中..." : label}</span>
      </button>
      {showMenu && (
        <ShareMenu
          onCopyLink={handleCopyLink}
          onPoster={handleGeneratePoster}
          onQr={handleShowQr}
          onSystemShare={handleSystemShare}
          onClose={() => setShowMenu(false)}
        />
      )}
      {qrImage && <QrModal image={qrImage} url={tokenCache.current?.shareUrl || ""} onClose={() => setQrImage(null)} />}
      {toast && <Toast message={toast} />}
    </>
  );
}

// ==================== 分享菜单 ====================
function ShareMenu({
  onCopyLink,
  onPoster,
  onQr,
  onSystemShare,
  onClose,
}: {
  onCopyLink: () => void;
  onPoster: () => void;
  onQr: () => void;
  onSystemShare: () => void;
  onClose: () => void;
}) {
  useBodyScrollLock(true);
  usePopupBackHandler(onClose, true);

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} style={{ backgroundColor: "rgba(0,0,0,0.4)" }} />
      {/* v25.0.30（P8-1 弹窗规范）：屏幕居中偏上 + 80vh 上限 + 内容内滚 + 右上角关闭按钮 */}
      <div
        className="fixed left-1/2 -translate-x-1/2 top-[12vh] z-[100] w-full max-w-[360px] rounded-2xl bg-white shadow-xl flex flex-col overflow-hidden"
        style={{ maxHeight: "80vh" }}
      >
        <div className="relative px-4 pt-4 pb-2 text-center">
          <p className="text-sm font-semibold text-gray-800 mb-3">分享到</p>
          <button
            onClick={onClose}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 text-base leading-none"
            style={{ minHeight: "44px", minWidth: "44px", height: "44px", width: "44px" }}
            aria-label="关闭分享菜单"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="grid grid-cols-4 gap-3 px-6 pb-4">
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
            onClick={onQr}
            className="flex flex-col items-center gap-2"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: BRAND + "15" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h3v3h-3zM19 14h2M14 19h2M18 18h3v3h-3z" />
              </svg>
            </div>
            <span className="text-xs text-gray-600">二维码</span>
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
        </div>
        <button
          onClick={onClose}
          className="w-full border-t border-gray-100 py-3 text-sm text-gray-500 flex-shrink-0"
        >
          取消
        </button>
      </div>
    </>
  );
}

// ==================== 二维码弹窗（v25.0.47_19：营销化改版） ====================
// 项目方要求：二维码弹窗不能只是一张孤零零的二维码，必须像海报一样带介绍与营销卖点，
// 引导扫码者下载APP。文案与裂变海报同源（sharePoster.ts VALUE_POINTS / 主副标题）。
const QR_VALUE_POINTS = [
  { icon: "📊", title: "专业排盘", desc: "八字紫微奇门等14款工具" },
  { icon: "📚", title: "典籍学习", desc: "中医经典·易学古籍免费读" },
  { icon: "👥", title: "同道交流", desc: "同好社区·师父在线交流" },
];

function QrModal({ image, url, onClose }: { image: string; url: string; onClose: () => void }) {
  useBodyScrollLock(true);
  usePopupBackHandler(onClose, true);

  const handleSave = useCallback(() => {
    try {
      const a = document.createElement("a");
      a.href = image;
      a.download = `yandao-qr-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch { /* ignore */ }
  }, [image]);

  return (
    <>
      <div className="fixed inset-0 z-[110]" onClick={onClose} style={{ backgroundColor: "rgba(0,0,0,0.55)" }} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[120] flex max-h-[88vh] w-[330px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* 品牌渐变头部：主标题+副标题（与海报同源文案） */}
        <div className="relative px-5 pb-4 pt-5 text-center text-white" style={{ background: `linear-gradient(135deg,${BRAND} 0%,#9B5ECF 100%)` }}>
          <button
            onClick={onClose}
            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-base leading-none text-white"
            aria-label="关闭二维码弹窗"
          >
            ×
          </button>
          <p className="text-[10px] tracking-wide opacity-80">东莞言道科技有限公司</p>
          <p className="mt-1 text-lg font-extrabold">国学随身查，典籍全收录</p>
          <p className="mt-1 text-[11px] opacity-85">14款专业排盘工具 · 中医典籍知识库 · 同好交流社区</p>
        </div>

        <div className="overflow-y-auto px-5 pb-5 pt-4">
          {/* 扫码引导语 */}
          <p className="text-center text-sm font-bold text-gray-800">扫一扫查看这份排盘结果</p>
          <p className="mt-0.5 text-center text-[11px] text-gray-500">好友扫码即可查看完整结果，无需注册</p>

          {/* 二维码 */}
          <div className="mt-3 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="分享二维码" className="h-[210px] w-[210px]" />
          </div>
          <p className="mt-1.5 text-center text-[11px] font-semibold" style={{ color: BRAND }}>
            官方正版 · 安全下载
          </p>

          {/* 营销卖点（与海报 VALUE_POINTS 同源） */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {QR_VALUE_POINTS.map((vp) => (
              <div key={vp.title} className="rounded-xl px-2 py-2.5 text-center" style={{ backgroundColor: BRAND + "0D" }}>
                <div className="text-lg leading-none">{vp.icon}</div>
                <div className="mt-1 text-[11px] font-bold text-gray-800">{vp.title}</div>
                <div className="mt-0.5 text-[9px] leading-tight text-gray-500">{vp.desc}</div>
              </div>
            ))}
          </div>

          {/* 行动召唤 */}
          <div className="mt-3 rounded-xl px-3 py-2.5 text-center" style={{ backgroundColor: "#FFF7ED" }}>
            <p className="text-xs font-bold text-orange-600">🎁 扫码还能免费下载「言道国学」APP</p>
            <p className="mt-0.5 text-[10px] text-orange-500">基础排盘永久免费 · 新人专享基础权益 · 每日签到领积分</p>
          </div>

          {url && (
            <p className="mt-2.5 break-all text-center text-[9px] leading-4 text-gray-400">{url}</p>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex flex-shrink-0 gap-2 border-t border-gray-100 px-5 py-3.5">
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            保存二维码
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500"
          >
            关闭
          </button>
        </div>
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
