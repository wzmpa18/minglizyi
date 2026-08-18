"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { getCurrentUser, updateProfileToServer } from "@/lib/loginService";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

interface UserProfile {
  avatar: string;
  nickname: string;
  phone: string;
  gender: "male" | "female" | "secret";
  birthday: string;
  bio: string;
}

export default function EditProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile>({
    avatar: "",
    nickname: "",
    phone: "",
    gender: "secret",
    birthday: "",
    bio: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const genderOptions = [
    { value: "male", label: "男" },
    { value: "female", label: "女" },
    { value: "secret", label: "保密" },
  ] as const;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const user = await getCurrentUser();
        if (user) {
          setProfile({
            avatar: user.avatar || "",
            nickname: user.nickname || "",
            phone: user.phone || "",
            gender: user.gender || "secret",
            birthday: user.birthday || "",
            bio: user.bio || "",
          });
        }
      } catch (err: any) {
        setError("获取用户信息失败");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("图片大小不能超过2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      // 压缩为256px JPEG，避免base64超过后端请求体限制导致保存失败
      const img = new Image();
      img.onload = () => {
        const MAX = 256;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setProfile((prev) => ({ ...prev, avatar: reader.result as string }));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setProfile((prev) => ({ ...prev, avatar: canvas.toDataURL("image/jpeg", 0.85) }));
      };
      img.onerror = () => {
        setProfile((prev) => ({ ...prev, avatar: reader.result as string }));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    // 重置 input 以便可以重复选择同一文件
    e.target.value = "";
  }, []);

  const handleSave = useCallback(async () => {
    if (!profile.nickname.trim()) {
      setError("请输入昵称");
      return;
    }
    if (profile.bio.length > 100) {
      setError("个性签名不能超过100字");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const result = await updateProfileToServer({
        avatar: profile.avatar,
        nickname: profile.nickname.trim(),
        gender: profile.gender,
        birthday: profile.birthday,
        bio: profile.bio.trim(),
      });
      if (!result.success) {
        setError(result.message || "保存失败，请重试");
        return;
      }
      setSuccess("保存成功");
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }, [profile, router]);

  if (loading) {
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
  <PageLoginGuard />
        <BrandHeader title="编辑资料" showBack />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ color: "#999", fontSize: 15 }}>加载中...</p>
        </div>
      </div>
    );
  }

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
      <BrandHeader title="编辑资料" showBack />

      <div
        style={{
          flex: 1,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 头像编辑 */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: "20px",
            marginBottom: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: "none" }}
          />
          <div
            onClick={handleAvatarClick}
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              backgroundColor: profile.avatar ? "transparent" : `${BRAND}15`,
              backgroundImage: profile.avatar ? `url(${profile.avatar})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              border: `2px solid ${BRAND}30`,
            }}
          >
            {!profile.avatar && (
              <svg width="36" height="36" viewBox="0 0 24 24" fill={BRAND}>
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            )}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 26,
                height: 26,
                borderRadius: "50%",
                backgroundColor: BRAND,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #fff",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M20 5h-3.17L15 3H9L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
              </svg>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#999", marginTop: 10 }}>
            点击更换头像
          </p>
        </div>

        {/* 昵称 */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: "0 16px",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: 52,
              borderBottom: "1px solid #f5f5f5",
            }}
          >
            <span style={{ fontSize: 15, color: "#333", width: 72, flexShrink: 0 }}>
              昵称
            </span>
            <input
              type="text"
              placeholder="请输入昵称"
              value={profile.nickname}
              onChange={(e) => {
                setProfile((prev) => ({ ...prev, nickname: e.target.value }));
                setError("");
              }}
              maxLength={20}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 15,
                color: "#333",
                backgroundColor: "transparent",
                textAlign: "right",
              }}
            />
          </div>
        </div>

        {/* 手机号（仅显示） */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: "0 16px",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: 52,
              borderBottom: "1px solid #f5f5f5",
            }}
          >
            <span style={{ fontSize: 15, color: "#333", width: 72, flexShrink: 0 }}>
              手机号
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 15,
                color: "#999",
                textAlign: "right",
              }}
            >
              {profile.phone ? profile.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : "未绑定"}
            </span>
          </div>
        </div>

        {/* 性别选择 */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: "0 16px",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: 52,
              borderBottom: "1px solid #f5f5f5",
            }}
          >
            <span style={{ fontSize: 15, color: "#333", width: 72, flexShrink: 0 }}>
              性别
            </span>
            <div
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              {genderOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    setProfile((prev) => ({ ...prev, gender: option.value }))
                  }
                  style={{
                    padding: "6px 16px",
                    borderRadius: 20,
                    border: profile.gender === option.value
                      ? `1.5px solid ${BRAND}`
                      : "1.5px solid #e0e0e0",
                    backgroundColor: profile.gender === option.value
                      ? `${BRAND}10`
                      : "transparent",
                    color: profile.gender === option.value ? BRAND : "#666",
                    fontSize: 13,
                    fontWeight: profile.gender === option.value ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 生日选择 */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: "0 16px",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: 52,
              borderBottom: "1px solid #f5f5f5",
            }}
          >
            <span style={{ fontSize: 15, color: "#333", width: 72, flexShrink: 0 }}>
              生日
            </span>
            <input
              type="date"
              value={profile.birthday}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, birthday: e.target.value }))
              }
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 15,
                color: "#333",
                backgroundColor: "transparent",
                textAlign: "right",
                cursor: "pointer",
              }}
            />
          </div>
        </div>

        {/* 个性签名 */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: "16px",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 15, color: "#333" }}>个性签名</span>
            <span
              style={{
                fontSize: 12,
                color: profile.bio.length > 100 ? "#e74c3c" : "#999",
              }}
            >
              {profile.bio.length}/100
            </span>
          </div>
          <textarea
            placeholder="介绍一下自己吧..."
            value={profile.bio}
            onChange={(e) => {
              setProfile((prev) => ({ ...prev, bio: e.target.value }));
              setError("");
            }}
            maxLength={100}
            rows={3}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "#333",
              backgroundColor: "transparent",
              resize: "none",
              lineHeight: 1.6,
              fontFamily: "inherit",
            }}
          />
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

        {/* 成功提示 */}
        {success && (
          <div
            style={{
              backgroundColor: "#e8f5e9",
              color: "#2e7d32",
              fontSize: 13,
              padding: "10px 16px",
              borderRadius: 8,
              marginBottom: 12,
              marginTop: -16,
              textAlign: "center",
            }}
          >
            {success}
          </div>
        )}

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            height: 52,
            backgroundColor: BRAND,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 17,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "保存中..." : "保存"}
        </button>
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

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
