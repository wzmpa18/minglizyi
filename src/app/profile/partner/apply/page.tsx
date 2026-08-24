"use client";

/**
 * 合伙人申请页（DEV-V22-PARTNER-V2）
 * - 入口：邀请落地页底部、推广中心底部「申请成为渠道合伙人」
 * - 推荐绑定：招募海报二维码携带 ?ref=合伙人userId，提交时自动绑定直属一级推荐关系
 * - 自主申请无推荐人则无上级
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { getMyPartnerStatus, applyPartner } from "@/lib/partnerService";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { getUserToken } from "@/lib/auth";

const BRAND = "#6C3EF5";

export default function PartnerApplyPage() {
  const router = useRouter();
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();
  const [status, setStatus] = useState<string>("LOADING");
  const [realName, setRealName] = useState("");
  const [contact, setContact] = useState("");
  const [resources, setResources] = useState("");
  const [expectedScale, setExpectedScale] = useState("");
  const [refCode, setRefCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref) setRefCode(ref.trim());
    }
    if (!getUserToken()) {
      setStatus("NONE");
      return;
    }
    getMyPartnerStatus().then((s) => setStatus(s ? s.status : "ERROR"));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const handleSubmit = async () => {
    if (!realName.trim()) return showToast("请填写姓名");
    if (!contact.trim()) return showToast("请填写联系方式");
    if (!resources.trim()) return showToast("请描述现有推广资源");
    if (!requireLogin()) return;
    setSubmitting(true);
    const r = await applyPartner({
      realName: realName.trim(),
      contact: contact.trim(),
      resources: resources.trim(),
      expectedScale: expectedScale.trim(),
      refCode: refCode || undefined,
    });
    setSubmitting(false);
    if (r.ok) {
      setStatus("PENDING");
      showToast("申请已提交，等待平台审核");
    } else {
      showToast(r.error || "提交失败，请重试");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #e5e0f5",
    backgroundColor: "#faf9ff",
    fontSize: 14,
    color: "#333",
    outline: "none",
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f4fa", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="渠道合伙人申请" showBack backUrl="/profile/promote" />
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 40px" }}>
        {/* 顶部说明卡 */}
        <div style={{
          background: `linear-gradient(135deg, ${BRAND} 0%, #9B59B6 100%)`,
          borderRadius: 16, padding: "20px 18px", color: "#fff", marginBottom: 16,
        }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>渠道合伙人计划</div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 8, lineHeight: 1.8 }}>
            通过专属邀请码发展的用户永久归属您的渠道，渠道净收入 50% 作为基础佣金；
            推荐直属合伙人还可获得其渠道净收入 5% 的培养奖励（平台承担，不影响其收益）。
            每月统一结算、统一提现。
          </div>
        </div>

        {status === "LOADING" ? (
          <div style={{ textAlign: "center", color: "#999", padding: 40 }}>加载中...</div>
        ) : status === "APPROVED" ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12, color: "#333" }}>您已是渠道合伙人</div>
            <button
              onClick={() => router.push("/profile/partner")}
              style={{
                marginTop: 16, padding: "12px 32px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${BRAND}, #9B59B6)`, color: "#fff",
                fontSize: 14, fontWeight: 700,
              }}
            >
              进入合伙人工作台
            </button>
          </div>
        ) : status === "PENDING" ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>⏳</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12, color: "#333" }}>申请审核中</div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>平台将在 1-3 个工作日内完成审核，请耐心等待</div>
          </div>
        ) : status === "DISABLED" ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>🚫</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12, color: "#333" }}>合伙人资格已停用</div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>如有疑问请联系平台客服</div>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 16, padding: 18 }}>
            {status === "REJECTED" && (
              <div style={{ background: "#fff2f0", color: "#cf1322", borderRadius: 10, padding: "10px 12px", fontSize: 12, marginBottom: 14 }}>
                上次申请未通过，可修改资料后重新提交
              </div>
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: "#333", marginBottom: 14 }}>填写申请资料</div>

            <div style={{ fontSize: 12, color: "#888", margin: "10px 0 6px" }}>姓名 *</div>
            <input style={inputStyle} value={realName} onChange={(e) => setRealName(e.target.value)} placeholder="真实姓名" maxLength={50} />

            <div style={{ fontSize: 12, color: "#888", margin: "14px 0 6px" }}>联系方式 *</div>
            <input style={inputStyle} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="手机号 / 微信号" maxLength={100} />

            <div style={{ fontSize: 12, color: "#888", margin: "14px 0 6px" }}>现有推广资源 *</div>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={resources} onChange={(e) => setResources(e.target.value)} placeholder="如：3个微信社群约5000人、公众号粉丝1.2万、抖音账号粉丝数等" maxLength={500} />

            <div style={{ fontSize: 12, color: "#888", margin: "14px 0 6px" }}>预计推广规模</div>
            <input style={inputStyle} value={expectedScale} onChange={(e) => setExpectedScale(e.target.value)} placeholder="如：预计每月带来200名新用户" maxLength={200} />

            {refCode ? (
              <div style={{ background: "#f0f9ff", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#1668dc", marginTop: 14 }}>
                已绑定推荐人（{refCode}），审核通过后将成为您的直属上级合伙人
              </div>
            ) : (
              <div style={{ background: "#fafafa", borderRadius: 10, padding: "10px 12px", fontSize: 11, color: "#999", marginTop: 14 }}>
                通过他人分享的「招募合伙人」海报进入将自动绑定推荐关系；自主申请无上级
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: "100%", marginTop: 18, padding: "13px 0", borderRadius: 12, border: "none",
                background: submitting ? "#c8c2e8" : `linear-gradient(135deg, ${BRAND}, #9B59B6)`,
                color: "#fff", fontSize: 15, fontWeight: 700,
              }}
            >
              {submitting ? "提交中..." : "提交申请"}
            </button>
            <div style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 10, lineHeight: 1.7 }}>
              提交即表示同意平台合伙人协议与结算规则<br />平台将审核推广资源的真实性与合规性
            </div>
          </div>
        )}
      </div>
      {toast && (
        <div style={{
          position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 100,
          background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: 13,
          padding: "10px 18px", borderRadius: 20, zIndex: 999,
        }}>{toast}</div>
      )}
      <LoginPromptModal open={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  );
}
