"use client";

import { useState, useCallback, useEffect } from "react";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import { generatePoster, POSTER_SIZES, type PosterSize } from "@/lib/sharePoster";
import {
  SHARE_CHANNELS,
  share,
  getDefaultShareParams,
  type ShareChannel,
} from "@/lib/shareService";
import { PageLoginGuard } from "@/components/PageLoginGuard";

const BRAND = "#7B2FBE";

// Toast 消息类型
interface ToastMsg {
  id: number;
  text: string;
  type: "success" | "error" | "info";
}

export default function PosterPage() {
  const { goBack } = useToolBack();

  const [selectedSize, setSelectedSize] = useState<PosterSize>("square");
  const [generating, setGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [sharing, setSharing] = useState<ShareChannel | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [inviteCode, setInviteCode] = useState("");

  // 拉取用户数据
  useEffect(() => {
    (async () => {
      const userId =
        typeof window !== "undefined" ? localStorage.getItem("yandao_user_id") || "" : "";
      try {
        const { getInviteCode } = await import("@/lib/inviteStore");
        setInviteCode(getInviteCode(userId));
      } catch {}
    })();
  }, []);

  // Toast 工具函数
  const showToast = useCallback((text: string, type: ToastMsg["type"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError("");
    try {
      const userId =
        typeof window !== "undefined" ? localStorage.getItem("yandao_user_id") || "" : "";
      let userName = "言道用户";
      try {
        const profileRaw = localStorage.getItem("yandao_user_profile");
        if (profileRaw) {
          const p = JSON.parse(profileRaw);
          userName = p.nickname || userName;
        }
      } catch {}

      let code = "";
      try {
        const { getInviteCode } = await import("@/lib/inviteStore");
        code = getInviteCode(userId);
        setInviteCode(code);
      } catch {}

      const shareUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/friend?ref=${userId}`
          : "";
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
        shareUrl
      )}`;

      const url = await generatePoster({
        size: selectedSize,
        userId,
        userName,
        inviteCode: code,
        qrCodeUrl,
      });
      setPosterUrl(url);
      setShowShareSheet(true);
    } catch (e) {
      console.error("生成海报失败:", e);
      setError("生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  }, [selectedSize]);

  const handleShare = useCallback(
    async (channel: ShareChannel) => {
      setSharing(channel);
      try {
        const defaults = getDefaultShareParams(inviteCode);
        const result = await share({
          channel,
          title: defaults.title,
          text: defaults.text,
          url: defaults.url,
          posterDataUrl: posterUrl || undefined,
        });

        if (result.success) {
          if (result.rewarded && result.rewardAmount) {
            showToast(`${result.message}（+${result.rewardAmount}积分）`, "success");
          } else {
            showToast(result.message || "分享成功", "success");
          }
        } else {
          showToast(result.message || "分享失败", "error");
        }
      } catch (e) {
        console.error("分享失败:", e);
        showToast("分享失败，请重试", "error");
      } finally {
        setSharing(null);
      }
    },
    [inviteCode, posterUrl, showToast]
  );

  const handleRegenerate = () => {
    setPosterUrl(null);
    setError("");
    setShowShareSheet(false);
  };

  // 当前选中尺寸的尺寸信息
  const sizeConfig = POSTER_SIZES[selectedSize];
  const sizeKeys = Object.keys(POSTER_SIZES) as PosterSize[];

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#ededed",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
  <PageLoginGuard />
      <BrandHeader title="生成海报" showBack color={BRAND} onBack={goBack} />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", paddingBottom: showShareSheet ? "240px" : "16px" }}>
        {/* 海报预览区（生成后） */}
        {posterUrl ? (
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "14px", color: "#999", marginBottom: "12px" }}>
              海报已生成 · {sizeConfig.label}
            </div>
            <img
              src={posterUrl}
              alt="生成的海报"
              style={{
                width: "100%",
                maxWidth: "300px",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
          </div>
        ) : (
          <>
            {/* 尺寸选择 */}
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "12px",
              }}
            >
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "12px" }}>
                选择海报尺寸
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {sizeKeys.map((sizeKey) => {
                  const cfg = POSTER_SIZES[sizeKey];
                  const isSelected = selectedSize === sizeKey;
                  return (
                    <button
                      key={sizeKey}
                      onClick={() => setSelectedSize(sizeKey)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px",
                        borderRadius: "10px",
                        border: isSelected ? `2px solid ${BRAND}` : "1px solid #e0e0e0",
                        backgroundColor: isSelected ? `${BRAND}08` : "#fff",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {/* 尺寸缩略图（按比例显示） */}
                      <div
                        style={{
                          width: "48px",
                          height: "64px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            width:
                              cfg.width >= cfg.height
                                ? "48px"
                                : `${(cfg.width / cfg.height) * 48}px`,
                            height:
                              cfg.width >= cfg.height
                                ? `${(cfg.height / cfg.width) * 48}px`
                                : "48px",
                            borderRadius: "4px",
                            backgroundColor: isSelected ? BRAND : "#e0e0e0",
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#333", marginBottom: "4px" }}>
                          {cfg.label}
                        </div>
                        <div style={{ fontSize: "12px", color: "#999" }}>
                          {cfg.desc} · {cfg.width}×{cfg.height}
                        </div>
                      </div>
                      {isSelected && (
                        <span style={{ color: BRAND, fontSize: "18px" }}>&#10003;</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 预览区域 */}
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "14px", color: "#999", marginBottom: "12px" }}>
                尺寸预览
              </div>
              <div
                style={{
                  width: "200px",
                  height: "280px",
                  margin: "0 auto",
                  borderRadius: "8px",
                  backgroundColor: "#f0f0f0",
                  border: "1px dashed #ccc",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <div style={{ fontSize: "32px", color: BRAND, opacity: 0.5 }}>海报</div>
                <div style={{ fontSize: "12px", color: "#999" }}>{sizeConfig.label}</div>
                <div style={{ fontSize: "11px", color: "#bbb" }}>{sizeConfig.desc}</div>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "10px",
                  padding: "12px",
                  marginBottom: "12px",
                  textAlign: "center",
                  color: "#e74c3c",
                  fontSize: "14px",
                }}
              >
                {error}
              </div>
            )}
          </>
        )}

        {/* 生成 / 重新生成 按钮 */}
        <button
          onClick={posterUrl ? handleRegenerate : handleGenerate}
          disabled={generating}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: "12px",
            backgroundColor: generating ? "#ccc" : posterUrl ? "#fff" : BRAND,
            color: posterUrl ? BRAND : "#fff",
            border: posterUrl ? `1px solid ${BRAND}` : "none",
            fontSize: "16px",
            fontWeight: 600,
            cursor: generating ? "not-allowed" : "pointer",
          }}
        >
          {generating ? "生成中..." : posterUrl ? "重新生成" : "生成海报"}
        </button>
      </div>

      {/* 底部分享面板（海报生成后显示） */}
      {showShareSheet && posterUrl && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            maxWidth: "420px",
            margin: "0 auto",
            backgroundColor: "#fff",
            borderRadius: "16px 16px 0 0",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
            padding: "16px 16px 20px",
            zIndex: 100,
          }}
        >
          {/* 拖拽指示条 */}
          <div
            style={{
              width: "36px",
              height: "4px",
              borderRadius: "2px",
              backgroundColor: "#e0e0e0",
              margin: "0 auto 14px",
            }}
          />
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "14px" }}>
            分享到
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px 8px",
            }}
          >
            {SHARE_CHANNELS.map((item) => {
              const isSharing = sharing === item.channel;
              return (
                <button
                  key={item.channel}
                  onClick={() => handleShare(item.channel)}
                  disabled={!!sharing}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 4px",
                    border: "none",
                    background: "transparent",
                    cursor: sharing ? "not-allowed" : "pointer",
                    opacity: sharing && !isSharing ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      backgroundColor: `${item.color}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                    }}
                  >
                    {isSharing ? "…" : item.icon}
                  </div>
                  <div style={{ fontSize: "11px", color: "#555", textAlign: "center" }}>
                    {item.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 底部免责声明 */}
      <div
        style={{
          padding: "12px 16px",
          textAlign: "center",
          fontSize: "11px",
          color: "#bbb",
          backgroundColor: "#ededed",
        }}
      >
        海报仅供学习交流使用，请勿用于商业用途
      </div>

      {/* Toast 通知 */}
      {toasts.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            alignItems: "center",
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                padding: "12px 20px",
                borderRadius: "10px",
                backgroundColor:
                  t.type === "success" ? "rgba(0,128,0,0.92)" : t.type === "error" ? "rgba(231,76,60,0.92)" : "rgba(51,51,51,0.92)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 500,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                maxWidth: "320px",
                textAlign: "center",
              }}
            >
              {t.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
