"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { loginWithPassword } from "@/lib/loginService";
import { getLoginState, moveLoginStateToSession } from "@/lib/auth";
import { useNativeShell } from "@/lib/nativeShellGate";

const BRAND = "#7B2FBE";

/** 密码框小眼睛图标 */
function EyeIcon({ show }: { show: boolean }) {
  if (show) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  // v25.0.77: iOS 壳内隐藏下载引导（App Store 2.5.2 外部安装引导）；v25.0.87 微信登录已彻底移除
  const nativeShell = useNativeShell();

  // v20.1: 统一账号输入（支持手机号/邮箱/数字ID）
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 已登录自动跳转首页
  useEffect(() => {
    const state = getLoginState();
    if (state.isLoggedIn) {
      router.push("/");
    }
  }, [router]);

  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccount(e.target.value);
    setError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError("");
  };

  // v20.1: 统一密码登录（支持手机号/邮箱/数字ID）
  const handlePasswordLogin = useCallback(async () => {
    const trimmed = account.trim();
    if (!trimmed) {
      setError("请输入手机号、邮箱或数字ID");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }
    if (!agreed) {
      setError("请先同意用户协议和隐私政策");
      return;
    }
    try {
      setLoading(true);
      const result = await loginWithPassword(trimmed, password);
      if (!result.success) {
        setError(result.message || "登录失败，请重试");
        return;
      }
      if (!rememberMe) {
        moveLoginStateToSession();
      }
      redirectAfterLogin();
    } catch (err: any) {
      setError(err?.message || "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [account, password, agreed, rememberMe, router]);

  // 回车快捷提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePasswordLogin();
    }
  };

  // v25.0.87: 登录后自动返回原页面（如有redirect参数）
  const redirectAfterLogin = () => {
    if (typeof window !== "undefined") {
      const redirect = sessionStorage.getItem("yandao_login_redirect");
      if (redirect) {
        sessionStorage.removeItem("yandao_login_redirect");
        router.push(redirect);
        return;
      }
    }
    router.push("/");
  };

  // v25.0.87: 游客模式同样须先勾选隐私协议
  const handleGuestBrowse = () => {
    if (!agreed) {
      setError("请先阅读并勾选用户协议和隐私政策");
      return;
    }
    router.push("/");
  };

  const handleForgotPassword = () => {
    router.push("/forgot-password");
  };

  const handleGoRegister = () => {
    router.push("/register");
  };

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#ededed",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <BrandHeader title="登录" showBack />

      <div
        style={{
          flex: 1,
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${BRAND}, #9B59B6)`,
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              color: "#fff",
              fontWeight: "bold",
            }}
          >
            言
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#333", margin: 0 }}>
            欢迎来到言道国学
          </h1>
          <p style={{ fontSize: 14, color: "#999", marginTop: 8 }}>
            传承千年智慧，感悟国学之美
          </p>
        </div>

        {/* v20.1: 统一账号输入（支持手机号/邮箱/数字ID） */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: "0 16px",
              height: 52,
              border: error.includes("账号") || error.includes("手机号") || error.includes("邮箱") || error.includes("ID") ? "1px solid #e74c3c" : "1px solid transparent",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <input
              type="text"
              placeholder="手机号 / 邮箱 / 数字ID"
              value={account}
              onChange={handleAccountChange}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 16,
                color: "#333",
                backgroundColor: "transparent",
              }}
            />
          </div>
        </div>

        {/* 密码输入 */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: "0 16px",
              height: 52,
              border: error.includes("密码") ? "1px solid #e74c3c" : "1px solid transparent",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="请输入密码"
              value={password}
              onChange={handlePasswordChange}
              onKeyDown={handleKeyDown}
              maxLength={16}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 16,
                color: "#333",
                backgroundColor: "transparent",
              }}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 4,
                marginLeft: 8,
              }}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
            >
              <EyeIcon show={showPassword} />
            </button>
          </div>
          {/* 忘记密码链接 */}
          <div style={{ textAlign: "right", marginTop: 10 }}>
            <button
              onClick={handleForgotPassword}
              style={{
                border: "none",
                background: "transparent",
                color: BRAND,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              忘记密码？
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              color: "#e74c3c",
              fontSize: 13,
              marginBottom: 12,
              paddingLeft: 4,
            }}
          >
            {error}
          </div>
        )}

        {/* 记住登录状态 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              fontSize: 13,
              color: "#666",
            }}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                marginRight: 6,
                accentColor: BRAND,
                width: 16,
                height: 16,
              }}
            />
            记住登录状态
          </label>
        </div>

        {/* v25.0.87: 隐私协议勾选框——紧邻登录按钮上方，默认不勾选，登录/游客模式均须先勾选 */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            marginBottom: 14,
            paddingTop: 4,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              cursor: "pointer",
              fontSize: 12,
              color: "#999",
              lineHeight: 1.6,
              maxWidth: 320,
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                setError("");
              }}
              style={{
                marginRight: 6,
                marginTop: 3,
                accentColor: BRAND,
                width: 16,
                height: 16,
                flexShrink: 0,
              }}
            />
            <span>
              我已阅读并同意
              <span
                style={{ color: BRAND, cursor: "pointer" }}
                onClick={(e) => {
                  e.preventDefault();
                  router.push("/agreement");
                }}
              >
                《用户协议》
              </span>
              和
              <span
                style={{ color: BRAND, cursor: "pointer" }}
                onClick={(e) => {
                  e.preventDefault();
                  router.push("/privacy");
                }}
              >
                《隐私政策》
              </span>
            </span>
          </label>
        </div>

        {/* 密码登录按钮 */}
        <button
          onClick={handlePasswordLogin}
          disabled={loading}
          style={{
            width: "100%",
            height: 52,
            backgroundColor: BRAND,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 17,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            marginBottom: 16,
          }}
        >
          {loading ? "登录中..." : "登录"}
        </button>

        {/* v25.0.88: 原生壳内隐藏下载引导（APP端冗余入口，v25.0.77起iOS壳已隐藏） */}
        {nativeShell ? null : (<>
          {/* v25.0.47_14: 下载APP入口（全浏览器可见，与注册页一致） */}
          <a
            href="https://yandaoguoxue.yandao.vip/friend"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              height: 46,
              border: `1.5px solid ${BRAND}`,
              borderRadius: 12,
              backgroundColor: "#fff",
              color: BRAND,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              marginBottom: 6,
              cursor: "pointer",
              boxSizing: "border-box",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            下载言道国学APP
          </a>
          <div style={{ textAlign: "center", fontSize: 11, color: "#aaa", marginBottom: 16 }}>
            安卓安装包 · 手机浏览器打开即可下载
          </div>
          </>) }

        {/* v25.0.87: 彻底移除微信快捷登录（全渠道统一，不再保留第三方快捷登录） */}

        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: 14, color: "#999" }}>还没有账号？</span>
          <button
            onClick={handleGoRegister}
            style={{
              border: "none",
              background: "transparent",
              color: BRAND,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            去注册
          </button>
          <span style={{ fontSize: 14, color: "#ddd", margin: "0 8px" }}>|</span>
          <button
            onClick={handleGuestBrowse}
            style={{
              border: "none",
              background: "transparent",
              color: BRAND,
              fontSize: 14,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            游客模式浏览
          </button>
        </div>
      </div>

      <div
        style={{
          padding: "16px 24px",
          textAlign: "center",
          fontSize: 11,
          color: "#bbb",
          lineHeight: 1.6,
        }}
      >
        <p style={{ margin: 0 }}>
          本应用仅供学习交流使用，所有内容仅供参考。
        </p>
        <p style={{ margin: "4px 0 0" }}>
          言道国学不对内容的准确性、完整性作任何保证。
        </p>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
