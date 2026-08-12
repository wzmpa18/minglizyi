"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { sendSmsCode, sendEmailCode, registerWithPhone, registerWithEmail, checkUserExist } from "@/lib/loginService";

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

type RegisterMode = "phone" | "email";

export default function RegisterPage() {
  const router = useRouter();

  const [registerMode, setRegisterMode] = useState<RegisterMode>("phone");

  // 手机号注册字段
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");

  // 邮箱注册字段
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");

  // 共用字段
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // v19.7_final: 注册唯一性实时校验
  const [phoneExistMsg, setPhoneExistMsg] = useState("");
  const [emailExistMsg, setEmailExistMsg] = useState("");
  const [phoneAvailMsg, setPhoneAvailMsg] = useState("");
  const [emailAvailMsg, setEmailAvailMsg] = useState("");
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);

  // v18.6: 从URL参数自动填充邀请码（/register?code=XXX 或 /register?ref=userId）
  // ref 参数也被存储为 referrer_id，注册时传给后端
  const [referrerId, setReferrerId] = useState("");
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const ref = params.get("ref");
    if (code) {
      setInviteCode(code);
    }
    if (ref) {
      // ref 是数字 userId，直接传给后端
      setReferrerId(ref);
    }
    // 也检查 localStorage 中 friend 页存储的 referrer_id
    const storedRef = localStorage.getItem("yandao_referrer_id");
    if (storedRef && !ref) {
      setReferrerId(storedRef);
    }
  }, []);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
    setError("");
    setPhoneExistMsg("");
    setPhoneAvailMsg("");
  };

  // v20.1: 手机号失焦实时校验唯一性
  const handlePhoneBlur = useCallback(async () => {
    const purePhone = phone.replace(/\s/g, "");
    if (purePhone.length !== 11) return;
    setPhoneChecking(true);
    setPhoneExistMsg("");
    setPhoneAvailMsg("");
    try {
      const exists = await checkUserExist(purePhone);
      if (exists) {
        setPhoneExistMsg("该手机号已注册，请直接登录或找回密码");
      } else {
        setPhoneAvailMsg("账号可用");
      }
    } catch {
      // 网络错误不阻塞
    } finally {
      setPhoneChecking(false);
    }
  }, [phone]);

  const handleSmsCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6));
    setError("");
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value.trim());
    setError("");
    setEmailExistMsg("");
    setEmailAvailMsg("");
  };

  // v20.1: 邮箱失焦实时校验唯一性
  const handleEmailBlur = useCallback(async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setEmailChecking(true);
    setEmailExistMsg("");
    setEmailAvailMsg("");
    try {
      const exists = await checkUserExist(undefined, email);
      if (exists) {
        setEmailExistMsg("该邮箱已注册，请直接登录或找回密码");
      } else {
        setEmailAvailMsg("账号可用");
      }
    } catch {
      // 网络错误不阻塞
    } finally {
      setEmailChecking(false);
    }
  }, [email]);

  const handleEmailCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6));
    setError("");
  };

  const handleGetSmsCode = useCallback(async () => {
    const purePhone = phone.replace(/\s/g, "");
    if (purePhone.length !== 11) {
      setError("请输入正确的手机号");
      return;
    }
    // v19.7_final: 阻止已注册手机号提交
    if (phoneExistMsg) {
      setError(phoneExistMsg);
      return;
    }
    try {
      setCodeLoading(true);
      const result = await sendSmsCode(purePhone);
      if (!result.success) {
        setError(result.message || "发送验证码失败，请重试");
        return;
      }
      setCountdown(60);
      setError("");
    } catch (err: any) {
      setError(err?.message || "发送验证码失败，请重试");
    } finally {
      setCodeLoading(false);
    }
  }, [phone, phoneExistMsg]);

  const handleGetEmailCode = useCallback(async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("请输入正确的邮箱地址");
      return;
    }
    // v19.7_final: 阻止已注册邮箱发送验证码
    if (emailExistMsg) {
      setError(emailExistMsg);
      return;
    }
    try {
      setCodeLoading(true);
      const result = await sendEmailCode(email);
      if (!result.success) {
        setError(result.message || "发送验证码失败，请重试");
        return;
      }
      setCountdown(60);
      setError("");
    } catch (err: any) {
      setError(err?.message || "发送验证码失败，请重试");
    } finally {
      setCodeLoading(false);
    }
  }, [email, emailExistMsg]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8 || pwd.length > 16) {
      return "密码长度需为8-16位";
    }
    if (!/[a-zA-Z]/.test(pwd)) {
      return "密码需包含至少一个字母";
    }
    if (!/\d/.test(pwd)) {
      return "密码需包含至少一个数字";
    }
    return null;
  };

  // 手机号注册
  const handlePhoneRegister = useCallback(async () => {
    const purePhone = phone.replace(/\s/g, "");

    if (purePhone.length !== 11) {
      setError("请输入正确的手机号");
      return;
    }
    // v19.7_final: 阻止已注册手机号提交
    if (phoneExistMsg) {
      setError(phoneExistMsg);
      return;
    }
    if (smsCode.length !== 6) {
      setError("请输入6位验证码");
      return;
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    try {
      setLoading(true);
      const result = await registerWithPhone({
        phone: purePhone,
        smsCode,
        password,
        inviteCode: inviteCode.trim() || undefined,
        referrer_id: referrerId || undefined,
      });
      if (!result.success || !result.user) {
        setError(result.message || "注册失败，请重试");
        return;
      }
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "注册失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [phone, smsCode, password, confirmPassword, inviteCode, referrerId, router, phoneExistMsg]);

  // 邮箱注册
  const handleEmailRegister = useCallback(async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("请输入正确的邮箱地址");
      return;
    }
    // v19.7_final: 阻止已注册邮箱提交
    if (emailExistMsg) {
      setError(emailExistMsg);
      return;
    }
    if (emailCode.length !== 6) {
      setError("请输入6位验证码");
      return;
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    try {
      setLoading(true);
      const result = await registerWithEmail({
        email,
        emailCode,
        password,
        inviteCode: inviteCode.trim() || undefined,
        referrer_id: referrerId || undefined,
      });
      if (!result.success || !result.user) {
        setError(result.message || "注册失败，请重试");
        return;
      }
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "注册失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [email, emailCode, password, confirmPassword, inviteCode, referrerId, router, emailExistMsg]);

  // 统一提交入口
  const handleSubmit = useCallback(() => {
    if (registerMode === "phone") {
      handlePhoneRegister();
    } else {
      handleEmailRegister();
    }
  }, [registerMode, handlePhoneRegister, handleEmailRegister]);

  // 回车快捷提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleGoLogin = () => {
    router.push("/login");
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
      <BrandHeader title="注册" showBack />

      <div
        style={{
          flex: 1,
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#333", margin: 0 }}>
            创建账号
          </h1>
          <p style={{ fontSize: 14, color: "#999", marginTop: 8 }}>
            注册言道国学，开启国学之旅
          </p>
        </div>

        {/* 注册模式 Tab 切换 */}
        <div
          style={{
            display: "flex",
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 4,
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => { setRegisterMode("phone"); setError(""); }}
            style={{
              flex: 1,
              padding: "10px 0",
              border: "none",
              borderRadius: 8,
              backgroundColor: registerMode === "phone" ? BRAND : "transparent",
              color: registerMode === "phone" ? "#fff" : "#666",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            手机号注册
          </button>
          <button
            onClick={() => { setRegisterMode("email"); setError(""); }}
            style={{
              flex: 1,
              padding: "10px 0",
              border: "none",
              borderRadius: 8,
              backgroundColor: registerMode === "email" ? BRAND : "transparent",
              color: registerMode === "email" ? "#fff" : "#666",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            邮箱注册
          </button>
        </div>

        {/* 手机号注册 */}
        {registerMode === "phone" && (
          <>
            {/* 手机号 */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: "0 16px",
                  height: 52,
                  border: error.includes("手机号") ? "1px solid #e74c3c" : "1px solid transparent",
                }}
              >
                <span style={{ fontSize: 16, marginRight: 8, color: "#999" }}>+86</span>
                <input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                  onKeyDown={handleKeyDown}
                  maxLength={13}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontSize: 16,
                    color: "#333",
                    backgroundColor: "transparent",
                  }}
                />
                {phoneChecking && <span style={{ fontSize: 11, color: "#999" }}>...</span>}
              </div>
              {phoneExistMsg && (
                <div style={{ fontSize: 12, color: "#e74c3c", marginTop: 4, paddingLeft: 16 }}>
                  {phoneExistMsg}
                </div>
              )}
              {phoneAvailMsg && (
                <div style={{ fontSize: 12, color: "#27ae60", marginTop: 4, paddingLeft: 16, display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {phoneAvailMsg}
                </div>
              )}
            </div>

            {/* 验证码 */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: "0 16px",
                  height: 52,
                  border: error.includes("验证码") ? "1px solid #e74c3c" : "1px solid transparent",
                }}
              >
                <input
                  type="text"
                  placeholder="请输入验证码"
                  value={smsCode}
                  onChange={handleSmsCodeChange}
                  onKeyDown={handleKeyDown}
                  maxLength={6}
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
                  onClick={handleGetSmsCode}
                  disabled={countdown > 0 || codeLoading}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: countdown > 0 ? "#999" : BRAND,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: countdown > 0 || codeLoading ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {countdown > 0 ? `${countdown}s后重发` : codeLoading ? "发送中..." : "获取验证码"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* 邮箱注册 */}
        {registerMode === "email" && (
          <>
            {/* 邮箱 */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: "0 16px",
                  height: 52,
                  border: error.includes("邮箱") ? "1px solid #e74c3c" : "1px solid transparent",
                }}
              >
                <input
                  type="email"
                  placeholder="请输入邮箱地址"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
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
                {emailChecking && <span style={{ fontSize: 11, color: "#999" }}>...</span>}
              </div>
              {emailExistMsg && (
                <div style={{ fontSize: 12, color: "#e74c3c", marginTop: 4, paddingLeft: 16 }}>
                  {emailExistMsg}
                </div>
              )}
              {emailAvailMsg && (
                <div style={{ fontSize: 12, color: "#27ae60", marginTop: 4, paddingLeft: 16, display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {emailAvailMsg}
                </div>
              )}
            </div>

            {/* 邮箱验证码 */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: "0 16px",
                  height: 52,
                  border: error.includes("验证码") ? "1px solid #e74c3c" : "1px solid transparent",
                }}
              >
                <input
                  type="text"
                  placeholder="请输入邮箱验证码"
                  value={emailCode}
                  onChange={handleEmailCodeChange}
                  onKeyDown={handleKeyDown}
                  maxLength={6}
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
                  onClick={handleGetEmailCode}
                  disabled={countdown > 0 || codeLoading}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: countdown > 0 ? "#999" : BRAND,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: countdown > 0 || codeLoading ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {countdown > 0 ? `${countdown}s后重发` : codeLoading ? "发送中..." : "获取验证码"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* 设置密码 */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: "0 16px",
              height: 52,
              border: error.includes("密码") && !error.includes("不一致") ? "1px solid #e74c3c" : "1px solid transparent",
            }}
          >
            <input
              type={showPassword ? "text" : "password"}
              placeholder="设置密码（8-16位，含字母和数字）"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
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
        </div>

        {/* 确认密码 */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: "0 16px",
              height: 52,
              border: error.includes("不一致") ? "1px solid #e74c3c" : "1px solid transparent",
            }}
          >
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="确认密码"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
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
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              aria-label={showConfirmPassword ? "隐藏密码" : "显示密码"}
            >
              <EyeIcon show={showConfirmPassword} />
            </button>
          </div>
        </div>

        {/* 邀请码（选填） */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: "0 16px",
              height: 52,
            }}
          >
            <input
              type="text"
              placeholder="邀请码（选填）"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value);
                setError("");
              }}
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

        {/* 错误提示 */}
        {error && (
          <div
            style={{
              color: "#e74c3c",
              fontSize: 13,
              marginBottom: 12,
              marginTop: -16,
              paddingLeft: 4,
            }}
          >
            {error}
          </div>
        )}

        {/* 注册按钮 */}
        <button
          onClick={handleSubmit}
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
            marginBottom: 20,
          }}
        >
          {loading ? "注册中..." : "注册"}
        </button>

        {/* 已有账号？去登录 */}
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: 14, color: "#999" }}>已有账号？</span>
          <button
            onClick={handleGoLogin}
            style={{
              border: "none",
              background: "transparent",
              color: BRAND,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            去登录
          </button>
        </div>
      </div>

      {/* 底部免责声明 */}
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
    </div>
  );
}
