"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import {
  getInviteLink,
  getInviteOverview,
  getPointsTransactions,
  type InviteLinkData,
  type InviteOverview,
  type PointsTransactions,
} from "@/lib/inviteApi";
import {
  VIRAL_TEMPLATES,
  getViralTemplate,
  cycleViralTemplate,
  renderViralPoster,
  SHARE_COPY_LIBRARY,
  DEFAULT_SHARE_TEXT,
  type ViralTemplateId,
} from "@/lib/marketing/viralTemplates";

const BRAND = "#7B2FBE";

const posterSecondaryBtn: React.CSSProperties = {
  padding: "10px 0",
  borderRadius: "10px",
  border: "1px solid #d5c7ea",
  backgroundColor: "#fff",
  color: BRAND,
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  try {
    return new Date(String(timeStr).replace(" ", "T")).toLocaleDateString("zh-CN");
  } catch {
    return timeStr;
  }
}

export default function InvitePage() {
  const router = useRouter();

  const [link, setLink] = useState<InviteLinkData | null>(null);
  const [overview, setOverview] = useState<InviteOverview | null>(null);
  const [points, setPoints] = useState<PointsTransactions | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"invitees" | "rewards" | "points">("invitees");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // v25.0.47_14: 邀请裂变海报（3套模板 + 完整海报导出，修复“保存相册只有二维码”）
  const [activeViralId, setActiveViralId] = useState<ViralTemplateId>("VIRAL_MOMENTS");
  const [posterUrl, setPosterUrl] = useState("");
  const [posterGenerating, setPosterGenerating] = useState(false);
  const [posterError, setPosterError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const posterQrRef = useRef("");
  const posterCodeRef = useRef<string | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2500);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const linkData = await getInviteLink();
      setLink(linkData);
      if (linkData) {
        try {
          const QRCode = (await import("qrcode")).default;
          const url = await QRCode.toDataURL(linkData.inviteLink, {
            width: 600,
            margin: 2,
            errorCorrectionLevel: "M",
            color: { dark: "#2D1A3E", light: "#FFFFFF" },
          });
          setQrDataUrl(url);
        } catch (e) {
          console.error("二维码生成失败:", e);
        }
      }
      const [ov, pt] = await Promise.all([getInviteOverview(), getPointsTransactions(30)]);
      setOverview(ov);
      setPoints(pt);
    } catch (e) {
      console.error("加载推广数据失败:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // 兼容性复制：优先 clipboard，降级 execCommand
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch { /* fall through */ }
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
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

  // v25.0.47_14: 渲染完整裂变海报（背景+标题+卖点+二维码+邀请码+合规底栏）
  const renderPosterByTemplate = useCallback(async (templateId: ViralTemplateId) => {
    if (!posterQrRef.current) return;
    setPosterGenerating(true);
    setPosterError("");
    try {
      const result = await renderViralPoster(templateId, {
        qrDataUrl: posterQrRef.current,
        inviteCode: posterCodeRef.current,
      });
      if (result.complianceBlocked || !result.dataUrl) {
        setPosterError("海报生成失败，请重试");
        setPosterUrl("");
        return;
      }
      setPosterUrl(result.dataUrl);
    } catch (e) {
      console.error("海报生成失败:", e);
      setPosterError("海报生成失败，请重试");
    } finally {
      setPosterGenerating(false);
    }
  }, []);

  // 二维码就绪后自动生成默认模板海报
  useEffect(() => {
    if (qrDataUrl && !posterUrl && !posterGenerating) {
      posterQrRef.current = qrDataUrl;
      posterCodeRef.current = link?.inviteCode;
      void renderPosterByTemplate("VIRAL_MOMENTS");
    }
  }, [qrDataUrl, link, posterUrl, posterGenerating, renderPosterByTemplate]);

  const switchToTemplate = useCallback(
    (templateId: ViralTemplateId) => {
      if (templateId === activeViralId && posterUrl) return;
      setActiveViralId(templateId);
      setPosterUrl("");
      void renderPosterByTemplate(templateId);
    },
    [activeViralId, posterUrl, renderPosterByTemplate]
  );

  /** 「换一个风格」：循环切换3套模板 */
  const handleSwitchStyle = useCallback(() => {
    const next = cycleViralTemplate(getViralTemplate(activeViralId).variant.id);
    switchToTemplate(next.id);
  }, [activeViralId, switchToTemplate]);

  /** 「使用通用版」：回到默认模板一（朋友圈种草版） */
  const handleUseGeneric = useCallback(() => {
    if (activeViralId === "VIRAL_MOMENTS" && posterUrl) {
      showToast("当前已是通用版（种草版）");
      return;
    }
    switchToTemplate("VIRAL_MOMENTS");
    showToast("已切换为通用版素材");
  }, [activeViralId, posterUrl, switchToTemplate, showToast]);

  /** 保存完整海报图片（≥750×1334，含全部元素） */
  const handleSavePoster = useCallback(async () => {
    if (!posterUrl) {
      showToast("海报生成中，请稍候");
      return;
    }
    try {
      const a = document.createElement("a");
      a.href = posterUrl;
      a.download = `yandao-invite-poster-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("完整海报已保存；若未弹出可长按海报图保存");
    } catch {
      showToast("保存失败，可长按海报图片保存");
    }
  }, [posterUrl, showToast]);

  /** 系统分享：带海报图片 + 默认文案 */
  const handleSharePoster = useCallback(async () => {
    if (!posterUrl) {
      showToast("海报生成中，请稍候");
      return;
    }
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        if (typeof navigator.canShare === "function") {
          try {
            const blob = await (await fetch(posterUrl)).blob();
            const file = new File([blob], "yandao-invite-poster.png", { type: "image/png" });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ title: "言道国学", text: DEFAULT_SHARE_TEXT, files: [file] });
              return;
            }
          } catch { /* 降级 */ }
        }
        await navigator.share({ title: "言道国学", text: DEFAULT_SHARE_TEXT, url: link?.inviteLink });
      } catch {
        // 用户取消分享不算失败
      }
    } else {
      const ok = await copyToClipboard(DEFAULT_SHARE_TEXT + (link?.inviteLink ? "\n" + link.inviteLink : ""));
      showToast(ok ? "当前浏览器不支持系统分享，文案已复制" : "当前浏览器不支持系统分享");
    }
  }, [posterUrl, link, copyToClipboard, showToast]);

  const handleCopyCode = useCallback(async () => {
    if (!link?.inviteCode) return;
    const ok = await copyToClipboard(link.inviteCode);
    showToast(ok ? "邀请码已复制" : "复制失败，请长按手动复制");
  }, [link, copyToClipboard, showToast]);

  const handleCopyLink = useCallback(async () => {
    if (!link?.inviteLink) return;
    const ok = await copyToClipboard(link.inviteLink);
    showToast(ok ? "邀请链接已复制，可粘贴分享" : "复制失败，请手动复制：" + link.inviteLink);
  }, [link, copyToClipboard, showToast]);

  // 保存二维码到相册（浏览器下载；iOS Safari 长按图片保存的引导提示）
  const handleSaveQr = useCallback(async () => {
    if (!qrDataUrl) {
      showToast("二维码未就绪，请稍后重试");
      return;
    }
    try {
      const link = document.createElement("a");
      link.href = qrDataUrl;
      link.download = `yandao-invite-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("二维码已保存；若未弹出，可长按二维码图片保存");
    } catch {
      showToast("保存失败，可长按二维码图片保存");
    }
  }, [qrDataUrl, showToast]);

  // 系统分享（优先文件+链接，降级纯链接）
  const handleSystemShare = useCallback(async () => {
    if (!link?.inviteLink) return;
    const shareText = "言道国学 · 传统文化学习平台，排盘、学堂、题库一站学习，邀你一起来";
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        if (qrDataUrl && typeof navigator.canShare === "function") {
          try {
            const blob = await (await fetch(qrDataUrl)).blob();
            const file = new File([blob], "yandao-invite.png", { type: "image/png" });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ title: "言道国学", text: shareText, url: link.inviteLink, files: [file] });
              showToast("分享成功");
              return;
            }
          } catch { /* 降级为链接分享 */ }
        }
        await navigator.share({ title: "言道国学", text: shareText, url: link.inviteLink });
        showToast("分享成功");
      } catch {
        // 用户取消分享不算失败
      }
    } else {
      const ok = await copyToClipboard(link.inviteLink);
      showToast(ok ? "当前浏览器不支持系统分享，链接已复制" : "当前浏览器不支持系统分享");
    }
  }, [link, qrDataUrl, copyToClipboard, showToast]);

  if (loading) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <PageLoginGuard />
        <BrandHeader title="推广中心" showBack />
        <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>加载中...</div>
      </div>
    );
  }

  const stats = overview?.stats;

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="推广中心" showBack />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
        {/* ===== AI推广助手入口（P7-MKT-POSTER-02） ===== */}
        <button
          onClick={() => router.push("/invite/poster")}
          style={{
            width: "100%",
            background: `linear-gradient(135deg, #3D2364 0%, ${BRAND} 60%, #9B59B6 100%)`,
            borderRadius: "14px",
            padding: "16px 18px",
            marginBottom: "12px",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            textAlign: "left",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              backgroundColor: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              flexShrink: 0,
            }}
          >
            ✦
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "15px", fontWeight: 700 }}>
              AI推广助手 · 智能海报
              <span style={{ fontSize: "10px", fontWeight: 500, padding: "2px 6px", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.2)", marginLeft: "8px", verticalAlign: "middle" }}>
                新
              </span>
            </div>
            <div style={{ fontSize: "11px", opacity: 0.88, marginTop: "3px", lineHeight: 1.5 }}>
              选圈层、选模块、选渠道，AI自动生成专属推广海报与配套文案
            </div>
          </div>
          <span style={{ fontSize: "18px", opacity: 0.8 }}>›</span>
        </button>

        {/* ===== v25.0.47_14 邀请裂变海报卡（完整海报导出，修复"保存相册只有二维码"） ===== */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#333" }}>邀请裂变海报</div>
            <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "8px", backgroundColor: "#FFF3E0", color: "#E65100" }}>
              保存即完整海报
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "#999", marginBottom: "12px", lineHeight: 1.5 }}>
            {getViralTemplate(activeViralId).desc}
          </div>

          {/* 3套模板切换 */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
            {VIRAL_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => switchToTemplate(t.id)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "10px",
                  border: activeViralId === t.id ? `2px solid ${BRAND}` : "1px solid #e5e5e5",
                  backgroundColor: activeViralId === t.id ? "#F5EFFB" : "#fff",
                  color: activeViralId === t.id ? BRAND : "#666",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t.shortName}
              </button>
            ))}
          </div>

          {/* 海报预览（点击放大，长按可保存） */}
          {posterGenerating ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: "13px" }}>海报生成中...</div>
          ) : posterError ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#e74c3c", fontSize: "13px" }}>
              {posterError}
              <div>
                <button
                  onClick={() => void renderPosterByTemplate(activeViralId)}
                  style={{ marginTop: "8px", padding: "6px 18px", borderRadius: "16px", border: "1px solid #ddd", backgroundColor: "#fff", color: "#555", fontSize: "12px", cursor: "pointer" }}
                >
                  重试
                </button>
              </div>
            </div>
          ) : posterUrl ? (
            <div style={{ textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterUrl}
                alt="邀请海报"
                onClick={() => setPreviewOpen(true)}
                style={{
                  width: "100%",
                  maxWidth: "270px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.14)",
                  cursor: "zoom-in",
                  display: "block",
                  margin: "0 auto",
                }}
              />
              <div style={{ fontSize: "10px", color: "#bbb", marginTop: "8px" }}>
                点击海报可放大 · 微信内长按海报图片也能保存到相册
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#999", fontSize: "13px" }}>
              邀请二维码加载中，稍候自动生成海报...
            </div>
          )}

          {/* 操作按钮 */}
          {posterUrl && (
            <>
              <button
                onClick={handleSavePoster}
                disabled={posterGenerating}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: posterGenerating ? "#ccc" : BRAND,
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: posterGenerating ? "not-allowed" : "pointer",
                  marginTop: "12px",
                  marginBottom: "8px",
                }}
              >
                保存海报图片
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <button onClick={handleSwitchStyle} style={posterSecondaryBtn}>换一个风格</button>
                <button onClick={handleUseGeneric} style={posterSecondaryBtn}>使用通用版</button>
                <button onClick={handleSharePoster} style={posterSecondaryBtn}>系统分享</button>
              </div>
            </>
          )}
        </div>

        {/* ===== v25.0.47_14 全场景分享文案库（一键复制即用） ===== */}
        <div style={{ backgroundColor: "#fff", borderRadius: "14px", padding: "16px", marginBottom: "12px" }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#333", marginBottom: "4px" }}>全场景分享文案</div>
          <div style={{ fontSize: "11px", color: "#999", marginBottom: "12px" }}>按场景一键复制，配合海报发朋友圈/群聊/好友</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {SHARE_COPY_LIBRARY.map((sc) => (
              <div key={sc.id} style={{ backgroundColor: "#fafafa", borderRadius: "10px", padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#555" }}>
                    {sc.title}
                    <span style={{ fontSize: "10px", fontWeight: 400, color: "#aaa", marginLeft: "6px" }}>{sc.scene}</span>
                  </span>
                  <button
                    onClick={async () => {
                      const ok = await copyToClipboard(sc.text);
                      showToast(ok ? `${sc.title}已复制` : "复制失败，请手动选择复制");
                    }}
                    style={{ fontSize: "11px", padding: "4px 12px", borderRadius: "12px", border: `1px solid ${BRAND}55`, backgroundColor: `${BRAND}08`, color: BRAND, cursor: "pointer", flexShrink: 0 }}
                  >
                    复制
                  </button>
                </div>
                <div style={{ fontSize: "12px", color: "#444", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{sc.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== 专属邀请二维码卡 ===== */}
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND} 0%, #9B59B6 100%)`,
            borderRadius: "14px",
            padding: "18px 20px",
            marginBottom: "12px",
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div
              style={{
                flexShrink: 0,
                width: "128px",
                height: "128px",
                borderRadius: "12px",
                backgroundColor: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="专属邀请二维码" style={{ width: "116px", height: "116px", display: "block" }} />
              ) : (
                <div style={{ fontSize: "11px", color: "#999", textAlign: "center", padding: "8px" }}>二维码生成中...</div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 700 }}>我的专属邀请二维码</div>
              <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "4px", lineHeight: 1.5 }}>
                二维码内含签名加密邀请链接，好友扫码注册即永久绑定邀请关系
              </div>
              <div style={{ fontSize: "11px", marginTop: "6px", opacity: 0.9 }}>
                邀请注册 +{link?.rewardRules?.register ?? 50} 积分 / 首次付费 +{link?.rewardRules?.firstPay ?? 200} 积分
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "14px" }}>
            <button
              onClick={handleSaveQr}
              style={{
                padding: "9px 0",
                borderRadius: "10px",
                backgroundColor: "rgba(255,255,255,0.95)",
                border: "none",
                color: BRAND,
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              保存二维码
            </button>
            <button
              onClick={handleSystemShare}
              style={{
                padding: "9px 0",
                borderRadius: "10px",
                backgroundColor: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.45)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              系统分享
            </button>
            <button
              onClick={handleCopyLink}
              style={{
                padding: "9px 0",
                borderRadius: "10px",
                backgroundColor: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.45)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              复制链接
            </button>
          </div>
        </div>

        {/* ===== 邀请码卡 ===== */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "14px 16px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "#999" }}>我的邀请码</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", letterSpacing: "3px", marginTop: "2px", fontFamily: "monospace", color: "#333" }}>
              {link?.inviteCode || "------"}
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            style={{
              padding: "8px 18px",
              borderRadius: "20px",
              backgroundColor: "#f5f0fa",
              border: `1px solid ${BRAND}33`,
              color: BRAND,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            复制邀请码
          </button>
        </div>

        {/* ===== 推广数据概览（单层口径） ===== */}
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#333", margin: "4px 2px 10px" }}>推广数据概览</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 8px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#e74c3c", lineHeight: 1.2 }}>{stats?.totalInvites ?? 0}</div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>累计邀请</div>
          </div>
          <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 8px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#f39c12", lineHeight: 1.2 }}>{stats?.todayInvites ?? 0}</div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>今日邀请</div>
          </div>
          <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 8px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#3498db", lineHeight: 1.2 }}>{stats?.monthInvites ?? 0}</div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>本月邀请</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 8px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: BRAND, lineHeight: 1.2 }}>{stats?.totalRewardPoints ?? 0}</div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>累计邀请奖励（积分）</div>
          </div>
          <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 8px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1e8e5a", lineHeight: 1.2 }}>{stats?.pointsBalance ?? points?.balance ?? 0}</div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>当前积分余额</div>
          </div>
        </div>

        {/* ===== 明细三 Tab ===== */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px" }}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
            {([
              ["invitees", `邀请明细 (${overview?.invitees.length ?? 0})`],
              ["rewards", `奖励明细 (${overview?.rewards.length ?? 0})`],
              ["points", "积分流水"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1,
                  padding: "7px 4px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: tab === key ? "#f5f0fa" : "#fafafa",
                  color: tab === key ? BRAND : "#888",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "invitees" && (
            <div>
              {(overview?.invitees.length ?? 0) === 0 ? (
                <div style={{ textAlign: "center", color: "#999", padding: "20px 0", fontSize: "14px" }}>
                  暂无邀请记录，保存二维码分享给好友吧
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {overview!.invitees.map((item) => (
                    <div key={item.inviteeId} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: BRAND,
                          color: "#fff",
                          fontSize: "14px",
                          fontWeight: "bold",
                          flexShrink: 0,
                        }}
                      >
                        {item.name?.charAt(0) || "?"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 500, color: "#333" }}>
                          {item.name}
                          <span style={{ fontSize: "10px", color: "#999", marginLeft: "6px" }}>直接邀请</span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#999" }}>{formatTime(item.invitedAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "rewards" && (
            <div>
              {(overview?.rewards.length ?? 0) === 0 ? (
                <div style={{ textAlign: "center", color: "#999", padding: "20px 0", fontSize: "14px" }}>
                  暂无奖励记录；好友注册或首次付费后自动发放
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {overview!.rewards.map((r) => (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#333" }}>{r.type}</div>
                        <div style={{ fontSize: "11px", color: "#999" }}>{formatTime(r.grantedAt)}</div>
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e8e5a" }}>+{r.points}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "points" && (
            <div>
              {(points?.transactions.length ?? 0) === 0 ? (
                <div style={{ textAlign: "center", color: "#999", padding: "20px 0", fontSize: "14px" }}>
                  暂无积分流水
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {points!.transactions.map((t) => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#333" }}>{t.typeLabel}</div>
                        <div style={{ fontSize: "11px", color: "#999" }}>{formatTime(t.createdAt)}</div>
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: t.amount >= 0 ? "#1e8e5a" : "#e74c3c" }}>
                        {t.amount >= 0 ? `+${t.amount}` : t.amount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 规则说明 */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 16px", marginTop: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#333", marginBottom: "8px" }}>奖励规则（单层）</div>
          <div style={{ fontSize: "12px", color: "#777", lineHeight: 1.8 }}>
            · 好友通过你的二维码或链接注册，你立即获得 +{link?.rewardRules?.register ?? 50} 积分<br />
            · 好友在平台首次有效付费，你再获得 +{link?.rewardRules?.firstPay ?? 200} 积分<br />
            · 邀请关系首次绑定后永久生效，仅统计直接邀请<br />
            · 奖励自动发放至积分账户，明细上方可查
          </div>
        </div>

        {/* 底部免责声明 */}
        <div style={{ padding: "14px 4px 6px", textAlign: "center", fontSize: "11px", color: "#bbb" }}>
          邀请好友一起学习，共同进步。请遵守平台规则，禁止虚假邀请。
        </div>
      </div>

      {/* v25.0.47_14: 海报全屏预览（微信内长按保存的入口） */}
      {previewOpen && posterUrl && (
        <div
          onClick={() => setPreviewOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.92)",
            zIndex: 500,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterUrl}
            alt="邀请海报大图"
            style={{ maxWidth: "100%", maxHeight: "78vh", borderRadius: "10px" }}
          />
          <div style={{ color: "#fff", fontSize: "13px", marginTop: "16px", textAlign: "center", lineHeight: 1.8 }}>
            长按海报图片可保存到相册 / 发送给朋友
            <br />
            <span style={{ fontSize: "11px", color: "#aaa" }}>点击空白处关闭</span>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 200,
            borderRadius: "12px",
            padding: "10px 18px",
            backgroundColor: "rgba(0,0,0,0.75)",
            color: "#fff",
            fontSize: "13px",
          }}
        >
          {toast}
        </div>
      )}

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
