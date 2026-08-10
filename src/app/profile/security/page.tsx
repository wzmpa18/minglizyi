"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { getLoginState } from "@/lib/auth";

const BRAND = "#7B2FBE";

// ==================== 类型定义 ====================
interface WeChatBindInfo {
  openid: string;
  nickname: string;
  avatar: string;
  boundAt: string;
}

// ==================== 本地存储 ====================
const WECHAT_BIND_KEY = "yandao_wechat_bind";

function getWeChatBind(): WeChatBindInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WECHAT_BIND_KEY);
    return raw ? (JSON.parse(raw) as WeChatBindInfo) : null;
  } catch {
    return null;
  }
}

function removeWeChatBind(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WECHAT_BIND_KEY);
  } catch {}
}

// ==================== 脱敏工具 ====================
function maskPhone(phone: string): string {
  if (!phone) return "未绑定";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 7) {
    return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  }
  return phone;
}

function maskEmail(email: string): string {
  if (!email) return "未绑定";
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return email;
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***${domain}`;
}

// ==================== 主页面 ====================
export default function SecurityPage() {
  const router = useRouter();
  const [wechatBind, setWechatBind] = useState<WeChatBindInfo | null>(null);
  const [showBindDialog, setShowBindDialog] = useState(false);
  const [showUnbindDialog, setShowUnbindDialog] = useState(false);
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [numberId, setNumberId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setWechatBind(getWeChatBind());
    const state = getLoginState();
    setPhone(state.profile?.phone || "");
    setEmail(state.profile?.email || "");
    setNumberId(state.profile?.numberId || "");
  }, []);

  // v20.1: 复制数字ID到剪贴板
  const handleCopyNumberId = () => {
    if (!numberId) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(numberId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        // 降级方案
        const textarea = document.createElement("textarea");
        textarea.value = numberId;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = numberId;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUnbindConfirm = () => {
    removeWeChatBind();
    setWechatBind(null);
    setShowUnbindDialog(false);
  };

  // 通用行样式
  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderBottom: "1px solid #f5f5f5",
  };

  const iconBoxStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f5f0fa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const labelStyle: React.CSSProperties = {
    flex: 1,
    fontSize: 14,
    color: "#333",
    textAlign: "left",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    overflow: "hidden",
  };

  const sectionTitleStyle: React.CSSProperties = {
    padding: "12px 16px 4px",
    fontSize: 12,
    fontWeight: 500,
    color: "#999",
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="账号安全" showBack backUrl="/profile" />

      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {/* ===== 微信绑定 ===== */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>微信绑定</div>
          <div style={rowStyle}>
            <div style={iconBoxStyle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={BRAND}>
                <path d="M12 3C6.5 3 2 6.58 2 11c0 2.32 1.25 4.4 3.22 5.83-.16.6-.62 2.04-.7 2.35-.1.38.14.37.3.27.12-.08 1.96-1.33 2.75-1.87.78.2 1.6.3 2.43.3 5.5 0 10-3.58 10-8s-4.5-8-10-8z" />
              </svg>
            </div>
            <span style={labelStyle}>微信账号</span>
            {wechatBind ? (
              <>
                <span style={{ fontSize: 13, color: "#666", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {wechatBind.nickname}
                </span>
                <button
                  onClick={() => setShowUnbindDialog(true)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 16,
                    border: `1px solid ${BRAND}`,
                    backgroundColor: "#fff",
                    color: BRAND,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  解绑
                </button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 13, color: "#bbb" }}>未绑定</span>
                <button
                  onClick={() => setShowBindDialog(true)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 16,
                    border: "none",
                    backgroundColor: BRAND,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  去绑定
                </button>
              </>
            )}
          </div>
        </div>

        {/* ===== 账号信息（数字ID / 手机号 / 邮箱）===== */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>账号信息</div>
          {/* v20.1: 数字ID展示 */}
          <div style={rowStyle}>
            <div style={iconBoxStyle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: "#333", textAlign: "left" }}>我的数字ID</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: numberId ? BRAND : "#bbb", textAlign: "left", marginTop: 2, fontFamily: "monospace", letterSpacing: 1 }}>
                {numberId || "未生成"}
              </div>
            </div>
            {numberId && (
              <button
                onClick={handleCopyNumberId}
                style={{
                  padding: "6px 14px",
                  borderRadius: 16,
                  border: `1px solid ${BRAND}`,
                  backgroundColor: copied ? BRAND : "#fff",
                  color: copied ? "#fff" : BRAND,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    已复制
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    复制
                  </>
                )}
              </button>
            )}
          </div>
          <div style={rowStyle}>
            <div style={iconBoxStyle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </div>
            <span style={labelStyle}>手机号</span>
            <span style={{ fontSize: 13, color: phone ? "#666" : "#bbb" }}>{maskPhone(phone)}</span>
          </div>
          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <div style={iconBoxStyle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <span style={labelStyle}>邮箱</span>
            <span style={{ fontSize: 13, color: email ? "#666" : "#bbb" }}>{maskEmail(email)}</span>
          </div>
        </div>

        {/* ===== 密码管理 ===== */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>密码管理</div>
          <button
            onClick={() => router.push("/forgot-password")}
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
            <div style={iconBoxStyle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span style={{ flex: 1, textAlign: "left", fontSize: 14, color: "#333" }}>修改密码</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 16, lineHeight: 1.7 }}>
          绑定微信和手机号可提升账号安全性<br />如遇账号问题请联系客服
        </p>
      </div>

      {/* ===== 微信绑定二维码占位弹窗 ===== */}
      {showBindDialog && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 24 }}
          onClick={() => setShowBindDialog(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 300, backgroundColor: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#333", margin: 0, flex: 1, textAlign: "center" }}>微信绑定</h3>
              <button onClick={() => setShowBindDialog(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#999", padding: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* 二维码占位 */}
            <div
              style={{
                width: 160,
                height: 160,
                margin: "0 auto 16px",
                borderRadius: 12,
                border: `2px dashed ${BRAND}`,
                backgroundColor: "#f5f0fa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: BRAND,
              }}
            >
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <line x1="14" y1="14" x2="14" y2="14.01" />
                <line x1="18" y1="14" x2="18" y2="14.01" />
                <line x1="21" y1="14" x2="21" y2="14.01" />
                <line x1="14" y1="18" x2="14" y2="18.01" />
                <line x1="18" y1="18" x2="18" y2="18.01" />
                <line x1="21" y1="18" x2="21" y2="18.01" />
                <line x1="14" y1="21" x2="14" y2="21.01" />
                <line x1="18" y1="21" x2="18" y2="21.01" />
              </svg>
            </div>

            <p style={{ fontSize: 16, fontWeight: 700, color: BRAND, margin: "0 0 6px" }}>即将开放</p>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 16px" }}>微信绑定功能敬请期待</p>

            <button
              onClick={() => setShowBindDialog(false)}
              style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", backgroundColor: BRAND, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
            >
              知道了
            </button>
          </div>
        </div>
      )}

      {/* ===== 解绑确认弹窗 ===== */}
      {showUnbindDialog && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 24 }}
          onClick={() => setShowUnbindDialog(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 300, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "24px 20px", textAlign: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#333", margin: "0 0 8px" }}>确认解绑微信？</h3>
              <p style={{ fontSize: 13, color: "#999", margin: 0 }}>解绑后可重新绑定其他微信账号</p>
            </div>
            <div style={{ display: "flex", borderTop: "1px solid #f0f0f0" }}>
              <button
                onClick={() => setShowUnbindDialog(false)}
                style={{ flex: 1, padding: "12px 0", border: "none", backgroundColor: "transparent", color: "#666", fontSize: 15, cursor: "pointer", borderRight: "1px solid #f0f0f0" }}
              >
                取消
              </button>
              <button
                onClick={handleUnbindConfirm}
                style={{ flex: 1, padding: "12px 0", border: "none", backgroundColor: "transparent", color: "#e74c3c", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                确认解绑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
