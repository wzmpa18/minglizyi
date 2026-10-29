"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PrivacyPolicyDocument } from "@/app/privacy/page";

const CONSENT_KEY = "yandao_privacy_consent_v1";
const BRAND = "#7B2FBE";

export default function PrivacyConsentGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [choice, setChoice] = useState<
    "loading" | "pending" | "accepted" | "rejected"
  >("loading");
  const [document, setDocument] = useState<"agreement" | "privacy" | null>(
    null,
  );

  useEffect(() => {
    try {
      setChoice(
        localStorage.getItem(CONSENT_KEY) === "accepted"
          ? "accepted"
          : "pending",
      );
    } catch {
      setChoice("pending");
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {
      /* unavailable storage */
    }
    setChoice("accepted");
  };

  // The policy must be readable before agreement, without mounting app services.
  if (pathname?.replace(/\/+$/, "") === "/privacy")
    return <PrivacyPolicyDocument />;
  if (choice === "accepted") return <>{children}</>;
  if (choice === "loading")
    return <div style={{ minHeight: "100dvh", background: "#fff" }} />;

  if (document) {
    const isPrivacy = document === "privacy";
    if (isPrivacy) {
      return <PrivacyPolicyDocument onBack={() => setDocument(null)} />;
    }
    return (
      <div style={{ minHeight: "100dvh", background: "#f5f2f8", padding: 18 }}>
        <article
          style={{
            maxWidth: 620,
            margin: "0 auto",
            background: "#fff",
            borderRadius: 16,
            padding: "22px 20px",
            color: "#333",
            lineHeight: 1.8,
          }}
        >
          <h1 style={{ margin: "0 0 14px", fontSize: 21, color: "#2D1A3E" }}>
            {isPrivacy ? "言道国学隐私政策" : "言道国学用户协议"}
          </h1>
          {!isPrivacy && (
            <>
              <p>更新日期：2026年10月11日</p>
              <p>
                言道国学提供传统文化学习、排盘工具、题库、离线内容和会员服务。使用前请确认您具有相应民事行为能力，并遵守法律法规与本协议。
              </p>
              <h2 style={{ fontSize: 17 }}>账号与服务</h2>
              <p>
                您应妥善保管账号，不得发布违法违规内容、侵害他人权益或干扰服务运行。传统文化及健康学习内容仅供学习参考，不构成医疗诊断、投资或其他专业决策建议。
              </p>
              <h2 style={{ fontSize: 17 }}>会员与内容</h2>
              <p>
                会员权益以购买页面所示为准。支付成功后系统自动发放权益；如出现异常，可凭订单信息通过帮助与反馈联系我们处理。应用内内容仅限个人学习使用。
              </p>
              <p>
                我们可为安全、合规和功能维护更新服务及协议，并以应用内公告提示重要变化。
              </p>
            </>
          )}
          <button
            onClick={() => setDocument(null)}
            style={{
              width: "100%",
              height: 44,
              marginTop: 12,
              border: "none",
              borderRadius: 12,
              background: BRAND,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            返回隐私选择
          </button>
        </article>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#f5f2f8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-consent-title"
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#fff",
          borderRadius: 18,
          padding: "24px 22px",
          boxShadow: "0 16px 48px rgba(45,26,62,.18)",
        }}
      >
        <h1
          id="privacy-consent-title"
          style={{
            margin: "0 0 12px",
            fontSize: 20,
            color: "#2D1A3E",
            textAlign: "center",
          }}
        >
          隐私保护提示
        </h1>
        {choice === "rejected" ? (
          <>
            <p
              style={{
                fontSize: 14,
                color: "#555",
                lineHeight: 1.8,
                margin: "0 0 18px",
              }}
            >
              您已选择不同意，应用不会启动账号、同步、统计、通知或网络服务。您可以直接关闭应用，也可以重新阅读协议后再选择。
            </p>
            <button
              onClick={() => setChoice("pending")}
              style={{
                width: "100%",
                height: 46,
                border: "none",
                borderRadius: 12,
                background: BRAND,
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              重新选择
            </button>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: 14,
                color: "#555",
                lineHeight: 1.8,
                margin: "0 0 10px",
              }}
            >
              欢迎使用言道国学。为提供账号登录、学习记录、离线内容和必要的安全服务，我们会依照协议处理相关信息。未经同意，应用不会启动这些服务。
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#666",
                lineHeight: 1.7,
                margin: "0 0 20px",
              }}
            >
              请阅读
              <button
                onClick={() => setDocument("agreement")}
                style={{
                  border: 0,
                  background: "transparent",
                  color: BRAND,
                  padding: "0 2px",
                  fontWeight: 700,
                }}
              >
                《用户协议》
              </button>
              和
              <button
                onClick={() => setDocument("privacy")}
                style={{
                  border: 0,
                  background: "transparent",
                  color: BRAND,
                  padding: "0 2px",
                  fontWeight: 700,
                }}
              >
                《隐私政策》
              </button>
              ，了解信息处理范围与您的权利。
            </p>
            <button
              onClick={accept}
              style={{
                width: "100%",
                height: 46,
                border: "none",
                borderRadius: 12,
                background: BRAND,
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              同意并继续
            </button>
            <button
              onClick={() => setChoice("rejected")}
              style={{
                width: "100%",
                height: 42,
                border: "1px solid #ddd",
                borderRadius: 12,
                background: "#fff",
                color: "#666",
                fontSize: 14,
              }}
            >
              不同意
            </button>
          </>
        )}
      </div>
    </div>
  );
}
