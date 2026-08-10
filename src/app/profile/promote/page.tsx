"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { getInviteCode, getInviteStats, getInvitees, type InviteRelation, type InviteStats } from "@/lib/inviteStore";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";

const BRAND = "#7B2FBE";

// ==================== 工具函数 ====================
function getUserId(): string {
  if (typeof window === "undefined") return "YD000000";
  return localStorage.getItem("yandao_user_id") || localStorage.getItem("profile_userid") || "YD000000";
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return iso;
  }
}

// ==================== 主页面 ====================
export default function PromotePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [invitees, setInvitees] = useState<InviteRelation[]>([]);
  const [copiedType, setCopiedType] = useState<"code" | "link" | null>(null);
  const [showPoster, setShowPoster] = useState(false);
  const [toast, setToast] = useState("");
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  useEffect(() => {
    requireLogin();
  }, []);

  const loadData = useCallback(() => {
    const uid = getUserId();
    setUserId(uid);
    setInviteCode(getInviteCode(uid));
    setStats(getInviteStats(uid));
    setInvitees(getInvitees(uid));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 邀请链接
  const inviteLink = `https://yandao.vip/friend?ref=${userId}`;
  // 海报二维码
  const posterQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(inviteLink)}&bgcolor=ffffff&color=7B2FBE`;

  // 显示轻提示
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  // 复制邀请码
  const handleCopyCode = () => {
    try {
      navigator.clipboard?.writeText(inviteCode);
    } catch {}
    setCopiedType("code");
    setTimeout(() => setCopiedType(null), 1500);
    showToast("邀请码已复制");
  };

  // 复制邀请链接
  const handleCopyLink = () => {
    const text = `【言道】邀请你一起学习传统文化！点击链接加入：${inviteLink} （我的邀请码：${inviteCode}）`;
    try {
      navigator.clipboard?.writeText(text).then(() => {
        setCopiedType("link");
        setTimeout(() => setCopiedType(null), 1500);
        showToast("邀请链接已复制");
      }).catch(() => {
        prompt("复制此邀请链接：", text);
      });
    } catch {
      prompt("复制此邀请链接：", text);
    }
  };

  // 保存海报图片
  const handleSavePoster = () => {
    const link = document.createElement("a");
    link.href = posterQrUrl;
    link.download = `yandao-invite-poster-${userId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("海报已开始下载");
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="推广中心" showBack backUrl="/profile" />

      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {/* ===== 专属邀请码 ===== */}
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND} 0%, #9B59B6 100%)`,
            borderRadius: 12,
            padding: "20px 16px",
            marginBottom: 12,
            color: "#fff",
            boxShadow: "0 2px 8px rgba(123,47,190,0.25)",
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.85 }}>我的专属邀请码</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 2, fontFamily: "monospace" }}>
              {inviteCode || "------"}
            </div>
            <button
              onClick={handleCopyCode}
              style={{
                padding: "8px 18px",
                borderRadius: 20,
                border: "none",
                backgroundColor: copiedType === "code" ? "rgba(255,255,255,0.3)" : "#fff",
                color: BRAND,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {copiedType === "code" ? "已复制" : "复制"}
            </button>
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 10, lineHeight: 1.6 }}>
            好友通过你的邀请码注册，即建立邀请关系<br />
            好友消费你享 15% 佣金，二级好友消费享 8% 分成
          </div>
        </div>

        {/* ===== 推广数据概览 ===== */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[
            { label: "累计邀请", value: stats?.totalInvites ?? 0, color: BRAND },
            { label: "一级好友", value: stats?.level1Count ?? 0, color: "#3498DB" },
            { label: "二级好友", value: stats?.level2Count ?? 0, color: "#2ECC71" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                flex: 1,
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: "14px 8px",
                textAlign: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* ===== 推广操作 ===== */}
        <div style={{ backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "12px 16px 4px" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>推广方式</span>
          </div>

          {/* 复制邀请链接 */}
          <button
            onClick={handleCopyLink}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
              borderBottom: "1px solid #f5f5f5",
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#f5f0fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#333" }}>复制邀请链接</div>
              <div style={{ fontSize: 12, color: "#999", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {copiedType === "link" ? "已复制到剪贴板" : "复制专属链接分享给好友"}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* 生成邀请海报 */}
          <button
            onClick={() => setShowPoster(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#f5f0fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#333" }}>生成邀请海报</div>
              <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>保存海报图片分享到朋友圈</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* ===== 邀请记录 ===== */}
        <div style={{ backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>邀请记录</span>
            <span style={{ fontSize: 12, color: "#999" }}>共 {invitees.length} 人</span>
          </div>
          {invitees.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#bbb" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 10px", display: "block" }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              <div style={{ fontSize: 14 }}>暂无邀请记录</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>快去邀请好友一起学习吧</div>
            </div>
          ) : (
            invitees.map((r, idx) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: idx === invitees.length - 1 ? "none" : "1px solid #f5f5f5",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    backgroundColor: r.level === 1 ? BRAND : "#9B59B6",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {(r.inviteeName || "匿").charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.inviteeName || "匿名用户"}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 8,
                        backgroundColor: r.level === 1 ? "#f5f0fa" : "#f0f0f0",
                        color: r.level === 1 ? BRAND : "#999",
                        flexShrink: 0,
                      }}
                    >
                      {r.level === 1 ? "一级" : "二级"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#bbb", marginTop: 3 }}>注册时间 {formatTime(r.createdAt)}</div>
                </div>
                {r.rewardAmount ? (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#27ae60" }}>+{r.rewardAmount}</div>
                    <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>积分奖励</div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 16, lineHeight: 1.7 }}>
          邀请奖励自动发放至积分账户<br />佣金收益可前往「我的钱包」查看与提现
        </p>
      </div>

      {/* ===== 邀请海报弹窗 ===== */}
      {showPoster && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", padding: 24 }} onClick={() => setShowPoster(false)}>
          <div style={{ width: "100%", maxWidth: 300, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }} onClick={(e) => e.stopPropagation()}>
            {/* 海报顶部 */}
            <div style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #9B59B6 100%)`, padding: "24px 20px", color: "#fff", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>言道 · 传统文化学习平台</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>扫码加入，邀请有礼</div>
            </div>
            {/* 海报正文 */}
            <div style={{ padding: "20px", textAlign: "center" }}>
              <div style={{ display: "inline-block", padding: 8, border: `2px solid ${BRAND}`, borderRadius: 12 }}>
                <img
                  src={posterQrUrl}
                  alt="邀请海报二维码"
                  style={{ width: 180, height: 180, display: "block" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div style={{ marginTop: 14, fontSize: 14, color: "#333", fontWeight: 600 }}>
                扫一扫，立即加入言道
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#999" }}>
                邀请码：<span style={{ color: BRAND, fontWeight: 700, fontFamily: "monospace" }}>{inviteCode}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: "#bbb" }}>
                易学排盘 · 中医知识库 · 智能问诊
              </div>
            </div>
            {/* 海报操作 */}
            <div style={{ display: "flex", borderTop: "1px solid #f0f0f0" }}>
              <button
                onClick={() => setShowPoster(false)}
                style={{ flex: 1, padding: "12px 0", border: "none", backgroundColor: "transparent", color: "#999", fontSize: 15, cursor: "pointer", borderRight: "1px solid #f0f0f0" }}
              >
                关闭
              </button>
              <button
                onClick={handleSavePoster}
                style={{ flex: 1, padding: "12px 0", border: "none", backgroundColor: "transparent", color: BRAND, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                保存海报
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 轻提示 ===== */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 22,
            fontSize: 13,
            zIndex: 60,
            whiteSpace: "nowrap",
          }}
        >
          {toast}
        </div>
      )}

      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  );
}
