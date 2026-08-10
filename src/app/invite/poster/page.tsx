"use client";

import { useState, useCallback } from "react";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import { generatePoster } from "@/lib/sharePoster";

const BRAND = "#7B2FBE";

interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
}

const TEMPLATES: Template[] = [
  {
    id: "personal_invite",
    name: "个人邀请",
    description: "邀请好友加入学习，一起进步",
    preview: "",
  },
  {
    id: "study_checkin",
    name: "学习打卡",
    description: "展示你的学习成果，激励他人",
    preview: "",
  },
  {
    id: "tool_share",
    name: "工具分享",
    description: "分享学习工具，帮助更多人",
    preview: "",
  },
  {
    id: "community_promo",
    name: "社群推广",
    description: "推广学习社群，扩大影响力",
    preview: "",
  },
];

export default function PosterPage() {
  const { goBack } = useToolBack();

  const [selectedTemplate, setSelectedTemplate] = useState<string>(TEMPLATES[0].id);
  const [generating, setGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError("");
    try {
      const templateMap: Record<string, 'invite' | 'study' | 'tool' | 'community'> = {
        personal_invite: 'invite',
        study_checkin: 'study',
        tool_share: 'tool',
        community_promo: 'community',
      };

      // v18.6: 使用真实用户数据
      const userId = typeof window !== "undefined" ? (localStorage.getItem("yandao_user_id") || "") : "";
      let userName = "言道用户";
      try {
        const profileRaw = localStorage.getItem("yandao_user_profile");
        if (profileRaw) {
          const p = JSON.parse(profileRaw);
          userName = p.nickname || userName;
        }
      } catch {}

      let inviteCode = "";
      try {
        const { getInviteCode } = await import("@/lib/inviteStore");
        inviteCode = getInviteCode(userId);
      } catch {}

      const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/register?code=${inviteCode}` : "";
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`;

      const url = await generatePoster({
        template: templateMap[selectedTemplate] || 'invite',
        userId,
        userName,
        inviteCode,
        qrCodeUrl,
      });
      setPosterUrl(url);
    } catch (e) {
      console.error("生成海报失败:", e);
      setError("生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  }, [selectedTemplate]);

  const handleSave = async () => {
    if (!posterUrl) return;
    try {
      // 尝试使用原生分享保存
      if (navigator.share) {
        const response = await fetch(posterUrl);
        const blob = await response.blob();
        const file = new File([blob], "poster.png", { type: "image/png" });
        await navigator.share({
          files: [file],
          title: "分享海报",
        });
      } else {
        // 降级为下载
        const link = document.createElement("a");
        link.href = posterUrl;
        link.download = "poster.png";
        link.click();
      }
    } catch (e) {
      console.error("保存失败:", e);
      // 降级为下载
      const link = document.createElement("a");
      link.href = posterUrl;
      link.download = "poster.png";
      link.click();
    }
  };

  const handleRegenerate = () => {
    setPosterUrl(null);
    setError("");
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#ededed", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="生成海报" showBack color={BRAND} onBack={goBack} />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {!posterUrl ? (
          <>
            {/* 模板选择 */}
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "12px" }}>
                选择海报模板
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px",
                      borderRadius: "10px",
                      border: selectedTemplate === tpl.id ? `2px solid ${BRAND}` : "1px solid #e0e0e0",
                      backgroundColor: selectedTemplate === tpl.id ? `${BRAND}08` : "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {/* 模板预览缩略图 */}
                    <div
                      style={{
                        width: "60px",
                        height: "80px",
                        borderRadius: "6px",
                        backgroundColor: selectedTemplate === tpl.id ? BRAND : "#e0e0e0",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        color: selectedTemplate === tpl.id ? "#fff" : "#999",
                      }}
                    >
                      {tpl.name.slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#333", marginBottom: "4px" }}>
                        {tpl.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#999" }}>
                        {tpl.description}
                      </div>
                    </div>
                    {selectedTemplate === tpl.id && (
                      <span style={{ color: BRAND, fontSize: "18px" }}>&#10003;</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 预览区域 */}
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "14px", color: "#999", marginBottom: "12px" }}>
                模板预览
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
                <div style={{ fontSize: "12px", color: "#999" }}>
                  {TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
                </div>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "12px", marginBottom: "12px", textAlign: "center", color: "#e74c3c", fontSize: "14px" }}>
                {error}
              </div>
            )}

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: "12px",
                backgroundColor: generating ? "#ccc" : BRAND,
                color: "#fff",
                border: "none",
                fontSize: "16px",
                fontWeight: 600,
                cursor: generating ? "not-allowed" : "pointer",
              }}
            >
              {generating ? "生成中..." : "生成海报"}
            </button>
          </>
        ) : (
          <>
            {/* 海报预览 */}
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "14px", color: "#999", marginBottom: "12px" }}>
                海报已生成
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

            {/* 操作按钮 */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  borderRadius: "12px",
                  backgroundColor: BRAND,
                  color: "#fff",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                保存到本地
              </button>
              <button
                onClick={handleRegenerate}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  borderRadius: "12px",
                  backgroundColor: "#fff",
                  border: `1px solid ${BRAND}`,
                  color: BRAND,
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                重新生成
              </button>
            </div>
          </>
        )}
      </div>

      {/* 底部免责声明 */}
      <div style={{ padding: "12px 16px", textAlign: "center", fontSize: "11px", color: "#bbb", backgroundColor: "#ededed" }}>
        海报仅供学习交流使用，请勿用于商业用途
      </div>
    </div>
  );
}