"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { clearLoginState, getLoginState, type LoginState } from "@/lib/auth";
import { clearAllTokens } from "@/lib/authInterceptor";
import { captureAndSavePoster, preloadImageAsDataUrl } from "@/lib/posterCapture";
import { getPointsBalance } from "@/lib/pointsStore";
import { getAIQuotaInfo } from "@/lib/aiQuotaService";
import { getFollowStats, getCurrentUserId } from "@/lib/userStore";
import { fetchTracks, fetchProgress } from "@/lib/academyApi";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";
import IcpFooter from "@/components/IcpFooter";

const BRAND = "#7B2FBE";

// ==================== 统一入口行（图标 + 文字 + 右侧箭头） ====================
function ZoneItem({
  icon,
  label,
  sub,
  right,
  onClick,
  noBorder,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  noBorder?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 bg-white px-4 py-3 text-left active:bg-gray-50"
      style={{ borderBottom: noBorder ? "none" : "1px solid #f5f5f5" }}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800">{label}</p>
        {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
      </div>
      {right}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

// ==================== 分区容器（可折叠抽屉：白卡 + 可点击区标题 + 展开箭头） ====================
function Zone({
  title,
  children,
  defaultOpen = false,
  storageKey,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  storageKey?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) setOpen(saved === "1");
    } catch {}
  }, [storageKey]);

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, next ? "1" : "0");
        } catch {}
      }
      return next;
    });
  };

  return (
    <section className="mx-3 mt-3 overflow-hidden rounded-xl bg-white shadow-sm">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 pb-1.5 pt-3 active:bg-gray-50"
      >
        <span className="h-3.5 w-1 rounded-full" style={{ backgroundColor: BRAND }} />
        <p className="flex-1 text-left text-[13px] font-semibold text-gray-700">{title}</p>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#999"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}

// ==================== 二维码弹窗（完整海报版） ====================
function QRModal({ onClose, userId, nickname, avatar }: { onClose: () => void; userId: string; nickname?: string; avatar?: string }) {
  // P9-推广中心：优先签名邀请链接，本地生成二维码
  const [shareUrl, setShareUrl] = useState(`https://yandaoguoxue.yandao.vip/friend?ref=${userId}`);

  const posterRef = useRef<HTMLDivElement>(null);
  const [qrSaving, setQrSaving] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>("");
  const [saveMsg, setSaveMsg] = useState("");

  useBodyScrollLock(true);
  usePopupBackHandler(onClose, true);

  useEffect(() => {
    (async () => {
      try {
        const { getInviteLink } = await import("@/lib/inviteApi");
        const linkData = await getInviteLink();
        if (linkData?.inviteLink) setShareUrl(linkData.inviteLink);
      } catch { /* 降级旧链接 */ }
    })();
  }, []);

  useEffect(() => {
    import("@/lib/qrLocal")
      .then(({ makeQrDataUrl }) => makeQrDataUrl(shareUrl, { width: 300, dark: "#7B2FBE" }))
      .then(setQrDataUrl)
      .catch(() => {});
  }, [shareUrl]);

  useEffect(() => {
    if (avatar) {
      preloadImageAsDataUrl(avatar).then(setAvatarDataUrl);
    }
  }, [avatar]);

  const handleDownload = async () => {
    if (!posterRef.current) return;
    setQrSaving(true);
    setSaveMsg("正在生成海报...");
    try {
      const result = await captureAndSavePoster(
        posterRef.current,
        `yandao-qr-${userId}-${Date.now()}.png`,
        2
      );
      setSaveMsg(result.message);
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      setSaveMsg("保存失败，请重试");
      setTimeout(() => setSaveMsg(""), 3000);
    } finally {
      setQrSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("链接已复制到剪贴板！分享给好友即可添加");
    }).catch(() => {
      prompt("复制此链接分享给好友：", shareUrl);
    });
  };

  const qrSrc = qrDataUrl;

  return (
    <>
      {/* ===== 隐藏的海报容器（用于截图） ===== */}
      <div
        ref={posterRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: 375,
          backgroundColor: "#ffffff",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
        }}
      >
        <div style={{
          background: `linear-gradient(135deg, ${BRAND} 0%, #9B59B6 100%)`,
          padding: "32px 24px 28px",
          textAlign: "center",
          color: "#fff",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 10px",
            overflow: "hidden", border: "3px solid rgba(255,255,255,0.4)",
            backgroundColor: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 700,
          }}>
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="头像" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span>{(nickname || "言").charAt(0)}</span>
            )}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            {nickname || "言道用户"}
          </div>
          <div style={{ fontSize: 13, opacity: 0.8, fontFamily: "monospace" }}>
            ID: {userId}
          </div>
        </div>

        <div style={{ padding: "28px 24px 20px", textAlign: "center" }}>
          <div style={{
            display: "inline-block", padding: 10,
            border: `2px solid ${BRAND}`, borderRadius: 12, backgroundColor: "#fff",
          }}>
            <img src={qrSrc} alt="邀请二维码" style={{ width: 200, height: 200, display: "block" }} />
          </div>
        </div>

        <div style={{ padding: "0 24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#333", lineHeight: 1.5 }}>
            扫码加我为好友
          </div>
          <div style={{ fontSize: 15, color: "#555", marginTop: 4, lineHeight: 1.5 }}>
            同研习国学文化
          </div>
          <div style={{
            fontSize: 13, color: BRAND, marginTop: 12,
            padding: "8px 16px", backgroundColor: "#f5f0fa", borderRadius: 8,
            display: "inline-block",
          }}>
            邀请好友开通会员，享两级分销佣金
          </div>
          <div style={{ marginTop: 14, fontSize: 13, color: "#999" }}>专属邀请码</div>
          <div style={{
            fontSize: 22, fontWeight: 700, color: BRAND,
            fontFamily: "monospace", letterSpacing: 2, marginTop: 4,
          }}>
            {userId}
          </div>
        </div>

        <div style={{ padding: "16px 24px 20px", borderTop: "1px solid #f0f0f0", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6, backgroundColor: BRAND,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 12, fontWeight: 700,
            }}>言</div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>言道国学</span>
          </div>
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 8, lineHeight: 1.5 }}>
            内容仅供传统文化学习参考，不构成任何决策建议
          </div>
        </div>
      </div>

      {/* ===== 可见的弹窗 ===== */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
        <div
          className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto"
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

          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #f0f0f0" }}>
            <div style={{
              background: `linear-gradient(135deg, ${BRAND} 0%, #9B59B6 100%)`,
              padding: "20px 16px 16px", textAlign: "center", color: "#fff",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", margin: "0 auto 8px",
                overflow: "hidden", border: "2px solid rgba(255,255,255,0.4)",
                backgroundColor: "rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, fontWeight: 700,
              }}>
                {avatarDataUrl ? (
                  <img src={avatarDataUrl} alt="头像" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span>{(nickname || "言").charAt(0)}</span>
                )}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{nickname || "言道用户"}</div>
              <div style={{ fontSize: 11, opacity: 0.8, fontFamily: "monospace", marginTop: 2 }}>ID: {userId}</div>
            </div>

            <div style={{ padding: "16px", textAlign: "center" }}>
              <div style={{
                display: "inline-block", padding: 6,
                border: `2px solid ${BRAND}`, borderRadius: 10,
              }}>
                <img
                  src={qrSrc}
                  alt="我的二维码"
                  style={{ width: 150, height: 150, display: "block" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginTop: 10 }}>
                扫码加我为好友，同研习国学文化
              </div>
              <div style={{ fontSize: 12, color: BRAND, marginTop: 6 }}>
                邀请好友开通会员，享两级分销佣金
              </div>
              <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
                专属邀请码：<span style={{ color: BRAND, fontWeight: 700, fontFamily: "monospace" }}>{userId}</span>
              </div>
            </div>

            <div style={{ padding: "10px 16px 12px", borderTop: "1px solid #f0f0f0", textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 4, backgroundColor: BRAND,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 9, fontWeight: 700,
                }}>言</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>言道国学</span>
              </div>
              <div style={{ fontSize: 9, color: "#bbb", marginTop: 4 }}>
                内容仅供传统文化学习参考，不构成任何决策建议
              </div>
            </div>
          </div>

          {saveMsg && (
            <div style={{ textAlign: "center", fontSize: 12, color: BRAND, marginTop: 8 }}>
              {saveMsg}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleDownload}
              disabled={qrSaving}
              className="flex-1 rounded-lg py-2.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: BRAND, opacity: qrSaving ? 0.5 : 1 }}
            >
              {qrSaving ? "保存中..." : "保存海报"}
            </button>
            <button
              onClick={handleCopyLink}
              className="flex-1 rounded-lg py-2.5 text-xs font-semibold transition-colors hover:opacity-90"
              style={{ backgroundColor: "#f5f0fa", color: BRAND, border: `1px solid ${BRAND}` }}
            >
              复制链接
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== 退出登录确认弹窗 ====================
function LogoutConfirmModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  useBodyScrollLock(true);
  usePopupBackHandler(onClose, true);

  const handleConfirmLogout = () => {
    clearLoginState();
    clearAllTokens();
    if (typeof window !== "undefined") {
      localStorage.removeItem("profile_userid");
      localStorage.removeItem("yandao_privacy_search");
      localStorage.removeItem("yandao_privacy_nearby");
      localStorage.removeItem("yandao_notify_enabled");
      localStorage.removeItem("privacy_search");
      localStorage.removeItem("privacy_nearby");
      localStorage.removeItem("notify_enabled");
    }
    onClose();
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

// ==================== 关于我们弹窗 ====================
function AboutUsModal({ onClose }: { onClose: () => void }) {
  useBodyScrollLock(true);
  usePopupBackHandler(onClose, true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-2xl bg-white shadow-xl max-h-[85vh] overflow-y-auto"
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
          <div className="text-center">
            <div
              className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: BRAND }}
            >
              <span className="text-2xl font-bold text-white">言</span>
            </div>
            <h4 className="text-lg font-bold text-gray-800">言道</h4>
            <p className="text-xs text-gray-400">v25.0</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 leading-relaxed">
              传统文化学习平台，致力于传承和弘扬中华优秀传统文化，涵盖易学（紫微斗数、八字、奇门遁甲、六爻、梅花易数）和中医（中药、方剂、经络穴位、辨证学习、典籍学习）等领域的系统学习工具
            </p>
          </div>

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

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-600">免责声明：</span>
              本应用内容仅供传统文化学习研究参考，不构成医疗诊断、投资建议或人生决策依据
            </p>
          </div>

          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">© 2026 言道</p>
            <p className="text-xs text-gray-400 mt-0.5">版权所有</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 图标 ====================
const Ic = {
  member: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.09 6.26L20 9l-5 4.87L16.18 21 12 17.77 7.82 21 9 13.87 4 9l5.91-.74L12 2z" />
    </svg>
  ),
  ai: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  ),
  points: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  wallet: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  featured: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  records: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  fav: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
  moments: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  notify: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  follow: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  fans: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  friend: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  qr: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <line x1="14" y1="14" x2="14" y2="17" />
      <line x1="17" y1="14" x2="21" y2="14" />
      <line x1="21" y1="17" x2="21" y2="21" />
      <line x1="14" y1="21" x2="17" y2="21" />
    </svg>
  ),
  inviteCode: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  poster: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  team: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  profit: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  security: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  feedback: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  about: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  academy: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
      <path d="M22 10v6" />
    </svg>
  ),
  study: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  exam: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  ),
  cert: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.5 13l1.5 8-5-3-5 3 1.5-8" />
      <path d="M12 5l.9 1.8 2 .3-1.4 1.4.3 2L12 9.6l-1.8.9.3-2L9.1 7.1l2-.3L12 5z" />
    </svg>
  ),
  wrongbook: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      <line x1="9" y1="9" x2="15" y2="9" />
    </svg>
  ),
  factory: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <path d="M7 18h1" /><path d="M12 18h1" /><path d="M17 18h1" />
    </svg>
  ),
};

// ==================== 主页面组件（六大分区冻结架构） ====================
export default function ProfilePage() {
  const router = useRouter();

  const [loginState, setLoginStateLocal] = useState<LoginState>(() => {
    if (typeof window === "undefined") return { isLoggedIn: false, token: null, profile: null };
    return getLoginState();
  });

  const [showQR, setShowQR] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // 顶部核心资产：AI 剩余额度 / 积分余额
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  const [pointsTotal, setPointsTotal] = useState(0);
  const [followStats, setFollowStats] = useState({ following: 0, fans: 0 });
  // 学堂数据：最高专业头衔 / 连续学习天数
  const [topTitle, setTopTitle] = useState<string>("");
  const [studyStreak, setStudyStreak] = useState(0);

  // 页面加载时从后端同步最新资料
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!loginState.isLoggedIn || !loginState.token) return;

    let cancelled = false;
    (async () => {
      try {
        const { fetchProfileFromServer } = await import("@/lib/loginService");
        const result = await fetchProfileFromServer();
        if (!cancelled && result.success && result.user) {
          setLoginStateLocal({
            isLoggedIn: true,
            token: loginState.token,
            profile: result.user,
          });
        }
      } catch (err) {
        console.error("[Profile] 从服务器获取资料失败:", err);
      }
    })();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 加载 AI 额度与积分余额
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const balance = getPointsBalance();
      setPointsTotal(balance.total);
    } catch { /* ignore */ }
    (async () => {
      try {
        const info = await getAIQuotaInfo();
        if (info && typeof info.dailyRemaining === "number") {
          setAiRemaining(info.dailyRemaining);
        }
      } catch { /* ignore */ }
    })();
    try {
      const uid = getCurrentUserId();
      const stats = getFollowStats(uid);
      setFollowStats(stats);
    } catch { /* ignore */ }
  }, []);

  // 加载学堂数据：最高专业头衔 + 连续学习天数（学习打卡日期连续计算）
  useEffect(() => {
    if (typeof window === "undefined") return;
    (async () => {
      try {
        const [t, p] = await Promise.all([fetchTracks(), fetchProgress()]);
        if (t && t.success && t.tracks) {
          const best = t.tracks
            .filter((x) => x.myLevel > 0)
            .sort((a, b) => b.myLevel - a.myLevel)[0];
          if (best) setTopTitle(best.myTitle);
        }
        if (p && p.success && p.progress && p.progress.length > 0) {
          const days = new Set(p.progress.map((x) => (x.completedAt || "").slice(0, 10)));
          let streak = 0;
          const cur = new Date();
          // 若今日无打卡，从昨天起算连续天数
          const todayStr = cur.toISOString().slice(0, 10);
          if (!days.has(todayStr)) cur.setDate(cur.getDate() - 1);
          for (;;) {
            const s = cur.toISOString().slice(0, 10);
            if (days.has(s)) {
              streak += 1;
              cur.setDate(cur.getDate() - 1);
            } else break;
          }
          setStudyStreak(streak);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const userId = loginState.isLoggedIn && loginState.profile?.userId
    ? loginState.profile.userId
    : (typeof window !== "undefined"
        ? (localStorage.getItem("yandao_user_id") || "YD000000")
        : "YD000000");

  const isMember = loginState.isLoggedIn && loginState.profile?.memberLevel === "premium";

  const goEditProfile = () => {
    if (!loginState.isLoggedIn) {
      router.push("/login");
      return;
    }
    router.push("/profile/edit");
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f5f5", maxWidth: "420px", margin: "0 auto", paddingBottom: "80px" }}>
      {/* ===== 顶部用户信息栏（固定） ===== */}
      <div style={{ backgroundColor: BRAND }} className="px-4 pt-7 pb-5">
        <div className="flex items-center gap-3">
          {/* 左侧：头像 + 昵称 + 会员等级，点击进入个人资料编辑页 */}
          <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={goEditProfile}>
            <div
              className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              {loginState.profile?.avatar ? (
                <img src={loginState.profile.avatar} className="h-14 w-14 rounded-full object-cover" alt="头像" />
              ) : (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
              <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: "#fff" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-base font-bold text-white">
                  {loginState.isLoggedIn && loginState.profile ? loginState.profile.nickname : "未登录，点击登录"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: isMember ? "rgba(255,215,0,0.25)" : "rgba(255,255,255,0.2)",
                    color: isMember ? "#ffe082" : "rgba(255,255,255,0.85)",
                    border: "1px solid rgba(255,255,255,0.35)",
                  }}
                >
                  {isMember ? "高级会员" : "普通用户"}
                </span>
                {topTitle && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)" }}
                  >
                    🏅 {topTitle}
                  </span>
                )}
                <span className="text-[10px] text-white/60 font-mono">ID: {userId}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-white/80">
                <span className="flex items-center gap-1">
                  <span className="text-[11px]" style={{ color: "#ffd54f" }}>★★★★★</span>
                  <span>5.0</span>
                </span>
                <span>连续学习 {studyStreak} 天</span>
              </div>
              <div className="mt-1 flex gap-3 text-[11px] text-white/70">
                <span>关注 {followStats.following}</span>
                <span>粉丝 {followStats.fans}</span>
              </div>
            </div>
          </button>

          {/* 右侧：AI 剩余额度 / 积分余额 */}
          <div className="flex shrink-0 flex-col gap-2">
            <button
              onClick={() => router.push(loginState.isLoggedIn ? "/yixue/ai" : "/login")}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-80"
              style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}
            >
              <span className="text-[10px] text-white/80">AI 额度</span>
              <span className="text-sm font-bold text-white">{aiRemaining !== null ? aiRemaining : "--"}</span>
            </button>
            <button
              onClick={() => router.push("/points")}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-80"
              style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}
            >
              <span className="text-[10px] text-white/80">积分</span>
              <span className="text-sm font-bold text-white">{pointsTotal}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== 第一区：学习中心 ===== */}
      <Zone title="学习中心" defaultOpen storageKey="yandao_zone_study">
        <ZoneItem
          icon={Ic.academy}
          label="言道学堂"
          sub="AI 知识工厂 · 学习考级认证生态"
          onClick={() => router.push("/academy")}
        />
        <ZoneItem
          icon={Ic.study}
          label="我的学习"
          sub="知识点精读 · 学习打卡"
          onClick={() => router.push("/academy/learn")}
        />
        <ZoneItem
          icon={Ic.exam}
          label="我的考试"
          sub="等级考试 · 随机组卷 · 不限补考"
          onClick={() => router.push("/academy/exam")}
        />
        <ZoneItem
          icon={Ic.cert}
          label="我的证书"
          sub="电子证书 · 公开验真"
          onClick={() => router.push("/academy/certificates")}
        />
        <ZoneItem
          icon={Ic.wrongbook}
          label="错题本"
          sub="错题回顾 · 消灭薄弱点"
          onClick={() => router.push("/academy/wrong-book")}
          noBorder
        />
      </Zone>

      {/* ===== 第二区：内容中心 ===== */}
      <Zone title="内容中心" storageKey="yandao_zone_content">
        <ZoneItem
          icon={Ic.records}
          label="我的测算"
          sub="全部工具排盘历史记录"
          onClick={() => router.push("/records")}
        />
        <ZoneItem
          icon={Ic.fav}
          label="我的收藏"
          sub="排盘 / 解读 / 动态统一收纳"
          onClick={() => router.push("/profile/favorites")}
        />
        <ZoneItem
          icon={Ic.factory}
          label="我的上传 · 知识贡献"
          sub="上传资料 · AI 解析 · 贡献积分"
          onClick={() => router.push("/academy/factory")}
          noBorder
        />
      </Zone>

      {/* ===== 第三区：社区中心（P9-首发裁剪：隐藏我的动态/消息通知，保留好友/关注/粉丝） ===== */}
      <Zone title="社区中心" storageKey="yandao_zone_social">
        <ZoneItem
          icon={Ic.follow}
          label="我的关注"
          right={<span className="text-xs text-gray-400">{followStats.following}</span>}
          onClick={() => router.push("/profile/follows")}
        />
        <ZoneItem
          icon={Ic.fans}
          label="我的粉丝"
          right={<span className="text-xs text-gray-400">{followStats.fans}</span>}
          onClick={() => router.push("/profile/fans")}
        />
        <ZoneItem
          icon={Ic.friend}
          label="我的好友"
          onClick={() => router.push("/friends")}
        />
        <ZoneItem
          icon={Ic.qr}
          label="我的二维码"
          sub="扫码加好友，同研习国学"
          onClick={() => setShowQR(true)}
          noBorder
        />
      </Zone>

      {/* ===== 第四区：商业中心 ===== */}
      <Zone title="商业中心" storageKey="yandao_zone_biz">
        <ZoneItem
          icon={Ic.member}
          label="会员中心"
          sub={isMember ? "高级会员权益生效中" : "开通会员解锁全部权益"}
          onClick={() => router.push("/membership")}
        />
        <ZoneItem
          icon={Ic.ai}
          label="AI 额度"
          right={<span className="text-xs text-gray-400">{aiRemaining !== null ? `剩余 ${aiRemaining} 次` : ""}</span>}
          onClick={() => router.push(loginState.isLoggedIn ? "/yixue/ai" : "/login")}
        />
        <ZoneItem
          icon={Ic.points}
          label="积分中心"
          right={<span className="text-xs text-gray-400">{pointsTotal} 分</span>}
          onClick={() => router.push("/points")}
        />
        <ZoneItem
          icon={Ic.wallet}
          label="我的钱包"
          onClick={() => router.push("/profile/wallet")}
        />
        {/* P9-首发裁剪：言道精选入口隐藏 */}
      </Zone>

      {/* ===== 第五区：推广中心 ===== */}
      <Zone title="推广中心" storageKey="yandao_zone_promo">
        <ZoneItem
          icon={Ic.profit}
          label="我的收益"
          sub="推荐佣金 · 可提现余额"
          onClick={() => router.push("/profile/income")}
        />
        <ZoneItem
          icon={Ic.inviteCode}
          label="我的推广"
          sub="邀请码 · 拉新奖励"
          onClick={() => router.push("/invite")}
        />
        <ZoneItem
          icon={Ic.poster}
          label="邀请海报"
          onClick={() => router.push("/invite/poster")}
        />
        <ZoneItem
          icon={Ic.team}
          label="团队数据"
          onClick={() => router.push("/profile/team")}
        />
        <ZoneItem
          icon={Ic.profit}
          label="收益记录"
          onClick={() => router.push("/profile/promote")}
          noBorder
        />
      </Zone>

      {/* ===== 第六区：系统中心 ===== */}
      <Zone title="系统中心" storageKey="yandao_zone_sys">
        <ZoneItem
          icon={Ic.security}
          label="账号安全"
          onClick={() => router.push("/profile/security")}
        />
        <ZoneItem
          icon={Ic.feedback}
          label="意见反馈"
          onClick={() => router.push("/profile/feedback")}
        />
        <ZoneItem
          icon={Ic.settings}
          label="通用设置"
          onClick={() => router.push("/profile/settings")}
        />
        <ZoneItem
          icon={Ic.about}
          label="关于我们"
          onClick={() => setShowAbout(true)}
          noBorder
        />
      </Zone>

      {/* ===== 退出登录（弱样式，页面最底部） ===== */}
      <div className="mx-3 mt-4 mb-2">
        {loginState.isLoggedIn ? (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 text-center text-xs text-gray-400 active:bg-gray-50"
          >
            退出登录
          </button>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-xl py-3 text-center text-sm font-semibold text-white active:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            登录 / 注册
          </button>
        )}
      </div>

      <IcpFooter />

      {/* ===== 弹窗 ===== */}
      {showQR && (
        <QRModal
          onClose={() => setShowQR(false)}
          userId={userId}
          nickname={loginState.isLoggedIn && loginState.profile ? loginState.profile.nickname : undefined}
          avatar={loginState.isLoggedIn && loginState.profile ? loginState.profile.avatar : undefined}
        />
      )}
      {showLogoutConfirm && <LogoutConfirmModal onClose={() => setShowLogoutConfirm(false)} />}
      {showAbout && <AboutUsModal onClose={() => setShowAbout(false)} />}
    </div>
  );
}
