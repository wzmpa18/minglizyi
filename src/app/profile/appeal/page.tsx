"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createAppeal,
  type AppealType,
  APPEAL_DEADLINE_DAYS,
  COMPLIANCE_DISCLAIMER,
} from "@/lib/dualTrackService";
import { getUserProfile } from "@/lib/auth";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F5F0FA";
const MAX_IMAGES = 5;
const MIN_REASON_LENGTH = 20;
const MAX_REASON_LENGTH = 500;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 单张图片上限 5MB

// ==================== 申诉类型选项 ====================
const APPEAL_TYPE_OPTIONS: Array<{
  value: AppealType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    value: "rating",
    label: "评价申诉",
    desc: "对评价处理结果有异议",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.39 6.95H22l-6.19 4.5L18.2 22 12 17.27 5.8 22l2.39-8.55L2 8.95h7.61z" />
      </svg>
    ),
  },
  {
    value: "points_deduction",
    label: "积分扣分申诉",
    desc: "对积分扣分结果有异议",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
];

// ==================== 申诉规则说明数据 ====================
const APPEAL_RULES: Array<{ title: string; body: string }> = [
  {
    title: "申诉期限",
    body: `用户/师父对评价处理、积分扣分结果有异议，可在处罚生效后 ${APPEAL_DEADLINE_DAYS} 天内发起申诉，逾期不再受理。`,
  },
  {
    title: "评委团组成",
    body: "系统自动随机抽取 9 名符合条件的活跃用户组成临时大众评委团，对申诉进行裁决。",
  },
  {
    title: "评委准入条件",
    body: "近 30 天活跃、无违规记录、等级≥3级、与申诉双方无利益关联。",
  },
  {
    title: "投票裁决",
    body: "评委查看双方举证材料后独立投票，结果按多数票（≥5票）判定。",
  },
  {
    title: "裁决结果",
    body: "支持申诉≥5票：撤销原处罚，恢复对应积分/评价；支持申诉<5票：维持原处罚。",
  },
  {
    title: "终局规则",
    body: "同一评价/处罚仅可申诉 1 次，裁决结果为最终结果。",
  },
];

// ==================== 顶部品牌头部（含返回按钮） ====================
function BrandHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <div
      className="sticky top-0 z-40 flex h-11 items-center justify-center relative shrink-0"
      style={{ backgroundColor: BRAND }}
    >
      <button
        onClick={() => router.back()}
        className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center text-white active:bg-white/10 transition-colors"
        aria-label="返回"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span className="text-white text-[17px] font-bold">{title}</span>
    </div>
  );
}

// ==================== 申诉规则说明区块 ====================
function AppealRulesSection() {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: "16px",
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#333" }}>申诉规则说明</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {APPEAL_RULES.map((rule, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span
              style={{
                flexShrink: 0,
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: BRAND_BG,
                color: BRAND,
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 1,
              }}
            >
              {idx + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#444", margin: 0, marginBottom: 2 }}>
                {rule.title}
              </p>
              <p style={{ fontSize: 12.5, color: "#888", lineHeight: 1.6, margin: 0 }}>
                {rule.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 成功提示遮罩 ====================
function SuccessOverlay({ message }: { message: string }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: "32px 28px",
          width: "78%",
          maxWidth: 300,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            backgroundColor: "#e8f5e9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ fontSize: 16, fontWeight: 600, color: "#333", margin: "0 0 6px" }}>
          申诉提交成功
        </p>
        <p style={{ fontSize: 13, color: "#999", margin: 0, lineHeight: 1.6 }}>
          {message}
        </p>
      </div>
    </div>
  );
}

// ==================== 主页面（内部组件，使用 useSearchParams） ====================
function AppealPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 根据 URL 参数自动填充申诉类型与目标 ID
  const urlType = searchParams.get("type") as AppealType | null;
  const urlTargetId = searchParams.get("targetId");

  const [appealType, setAppealType] = useState<AppealType>(
    urlType === "rating" || urlType === "points_deduction" ? urlType : "rating"
  );
  const [targetId, setTargetId] = useState<string>(urlTargetId || "");
  const [reason, setReason] = useState("");
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 校验登录态
  useEffect(() => {
    const profile = getUserProfile();
    if (!profile) {
      setIsLoggedIn(false);
    } else {
      setIsLoggedIn(true);
    }
  }, []);

  // 选择图片处理
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const remaining = MAX_IMAGES - evidenceImages.length;
      if (remaining <= 0) {
        setError(`最多上传 ${MAX_IMAGES} 张图片`);
        e.target.value = "";
        return;
      }

      const fileList = Array.from(files).slice(0, remaining);
      const readPromises: Promise<string>[] = [];

      for (const file of fileList) {
        if (!file.type.startsWith("image/")) {
          setError("请选择图片文件");
          continue;
        }
        if (file.size > MAX_IMAGE_SIZE) {
          setError("单张图片不能超过 5MB");
          continue;
        }
        readPromises.push(
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("读取失败"));
            reader.readAsDataURL(file);
          })
        );
      }

      Promise.all(readPromises)
        .then((base64List) => {
          if (base64List.length > 0) {
            setEvidenceImages((prev) => [...prev, ...base64List].slice(0, MAX_IMAGES));
            setError("");
          }
        })
        .catch(() => {
          setError("图片读取失败，请重试");
        })
        .finally(() => {
          e.target.value = "";
        });
    },
    [evidenceImages.length]
  );

  // 删除指定图片
  const handleRemoveImage = useCallback((index: number) => {
    setEvidenceImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 触发文件选择
  const handleUploadClick = useCallback(() => {
    if (evidenceImages.length >= MAX_IMAGES) {
      setError(`最多上传 ${MAX_IMAGES} 张图片`);
      return;
    }
    fileInputRef.current?.click();
  }, [evidenceImages.length]);

  // 提交申诉
  const handleSubmit = useCallback(async () => {
    setError("");

    // 登录校验
    if (!isLoggedIn) {
      setError("请先登录后再发起申诉");
      return;
    }

    // 目标 ID 校验
    if (!targetId.trim()) {
      setError("缺少申诉目标，请从评价或积分记录页面进入申诉");
      return;
    }

    // 申诉理由校验
    const trimmedReason = reason.trim();
    if (trimmedReason.length < MIN_REASON_LENGTH) {
      setError(`申诉理由至少需要 ${MIN_REASON_LENGTH} 字，当前 ${trimmedReason.length} 字`);
      return;
    }
    if (trimmedReason.length > MAX_REASON_LENGTH) {
      setError(`申诉理由不能超过 ${MAX_REASON_LENGTH} 字`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await createAppeal(
        appealType,
        targetId.trim(),
        trimmedReason,
        evidenceImages
      );
      if (result.success) {
        setSuccessMsg(
          "系统将随机抽取 9 名大众评委进行裁决，裁决结果请留意后续通知。"
        );
        // 延迟后跳转回来源页
        setTimeout(() => {
          router.back();
        }, 2200);
      } else {
        setError(result.error || "提交失败，请稍后重试");
      }
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }, [isLoggedIn, targetId, reason, evidenceImages, appealType, router]);

  const reasonLength = reason.trim().length;
  const reasonValid = reasonLength >= MIN_REASON_LENGTH && reasonLength <= MAX_REASON_LENGTH;
  const canSubmit = reasonValid && targetId.trim() !== "" && isLoggedIn && !submitting;

  // ==================== 未登录拦截 ====================
  if (!isLoggedIn) {
    return (
      <div
        style={{
          maxWidth: "420px",
          margin: "0 auto",
          minHeight: "100vh",
          backgroundColor: "#f5f5f5",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <BrandHeader title="申诉" />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <p style={{ fontSize: 15, color: "#666", marginBottom: 16 }}>请先登录后再发起申诉</p>
          <button
            onClick={() => router.push("/login")}
            style={{
              padding: "10px 32px",
              borderRadius: 24,
              border: "none",
              backgroundColor: BRAND,
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            去登录
          </button>
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
        backgroundColor: "#f5f5f5",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <BrandHeader title="申诉" />

      <div
        style={{
          flex: 1,
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ===== 申诉类型选择 ===== */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: "16px",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#333" }}>申诉类型</span>
            <span style={{ color: "#e74c3c", fontSize: 14 }}>*</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {APPEAL_TYPE_OPTIONS.map((option) => {
              const selected = appealType === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setAppealType(option.value)}
                  style={{
                    flex: 1,
                    padding: "14px 10px",
                    borderRadius: 10,
                    border: selected ? `1.5px solid ${BRAND}` : "1.5px solid #e8e8e8",
                    backgroundColor: selected ? BRAND_BG : "#fff",
                    color: selected ? BRAND : "#666",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {option.icon}
                  <span style={{ fontSize: 14, fontWeight: selected ? 600 : 500 }}>
                    {option.label}
                  </span>
                  <span style={{ fontSize: 11, color: selected ? BRAND_LIGHT : "#aaa" }}>
                    {option.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 申诉目标 ID（来自 URL，只读展示） */}
          {targetId && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 8,
                backgroundColor: "#fafafa",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
              <span style={{ fontSize: 12, color: "#999" }}>申诉目标：</span>
              <span style={{ fontSize: 12, color: "#666", fontFamily: "monospace", wordBreak: "break-all" }}>
                {targetId}
              </span>
            </div>
          )}
        </div>

        {/* ===== 申诉理由输入框 ===== */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: "16px",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#333" }}>申诉理由</span>
              <span style={{ color: "#e74c3c", fontSize: 14 }}>*</span>
            </div>
            <span
              style={{
                fontSize: 12,
                color: reasonLength > MAX_REASON_LENGTH ? "#e74c3c" : reasonLength >= MIN_REASON_LENGTH ? BRAND : "#999",
              }}
            >
              {reasonLength}/{MAX_REASON_LENGTH}
            </span>
          </div>
          <textarea
            placeholder={`请详细描述您的申诉理由（至少 ${MIN_REASON_LENGTH} 字），包括事件经过、您认为处理不当的依据等...`}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError("");
            }}
            maxLength={MAX_REASON_LENGTH}
            rows={5}
            style={{
              width: "100%",
              border: `1px solid ${reasonLength > 0 && reasonLength < MIN_REASON_LENGTH ? "#FFD54F" : "#eee"}`,
              borderRadius: 8,
              outline: "none",
              fontSize: 14,
              color: "#333",
              backgroundColor: "#fafafa",
              padding: "12px",
              resize: "none",
              lineHeight: 1.6,
              fontFamily: "inherit",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = BRAND;
              e.target.style.backgroundColor = "#fff";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = reasonLength > 0 && reasonLength < MIN_REASON_LENGTH ? "#FFD54F" : "#eee";
              e.target.style.backgroundColor = "#fafafa";
            }}
          />
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            {reasonLength < MIN_REASON_LENGTH ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span style={{ fontSize: 11.5, color: "#FF9800" }}>
                  还需 {MIN_REASON_LENGTH - reasonLength} 字
                </span>
              </>
            ) : (
              <span style={{ fontSize: 11.5, color: "#4CAF50" }}>已满足最低字数要求</span>
            )}
          </div>
        </div>

        {/* ===== 上传举证图片 ===== */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: "16px",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#333" }}>举证图片</span>
              <span style={{ fontSize: 12, color: "#aaa" }}>（选填）</span>
            </div>
            <span style={{ fontSize: 12, color: evidenceImages.length >= MAX_IMAGES ? "#e74c3c" : "#999" }}>
              {evidenceImages.length}/{MAX_IMAGES}
            </span>
          </div>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {/* 图片预览网格 + 上传按钮 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
            }}
          >
            {evidenceImages.map((img, index) => (
              <div
                key={index}
                style={{
                  position: "relative",
                  width: "100%",
                  paddingTop: "100%",
                  borderRadius: 8,
                  overflow: "hidden",
                  backgroundColor: "#f5f5f5",
                }}
              >
                <img
                  src={img}
                  alt={`举证图片 ${index + 1}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                {/* 删除按钮 */}
                <button
                  onClick={() => handleRemoveImage(index)}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: "none",
                    backgroundColor: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  aria-label="删除图片"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                {/* 序号标记 */}
                <span
                  style={{
                    position: "absolute",
                    bottom: 4,
                    left: 4,
                    fontSize: 10,
                    color: "#fff",
                    backgroundColor: "rgba(0,0,0,0.45)",
                    borderRadius: 4,
                    padding: "1px 5px",
                  }}
                >
                  {index + 1}
                </span>
              </div>
            ))}

            {/* 上传按钮（未满时显示） */}
            {evidenceImages.length < MAX_IMAGES && (
              <button
                onClick={handleUploadClick}
                style={{
                  width: "100%",
                  paddingTop: "100%",
                  position: "relative",
                  borderRadius: 8,
                  border: `1.5px dashed ${BRAND}50`,
                  backgroundColor: BRAND_BG,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    color: BRAND,
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 500 }}>上传图片</span>
                </div>
              </button>
            )}
          </div>

          <p style={{ fontSize: 11, color: "#bbb", marginTop: 8, marginBottom: 0 }}>
            最多上传 {MAX_IMAGES} 张，支持 JPG/PNG，单张不超过 5MB
          </p>
        </div>

        {/* ===== 申诉规则说明 ===== */}
        <AppealRulesSection />

        {/* ===== 错误提示 ===== */}
        {error && (
          <div
            style={{
              backgroundColor: "#fff3e0",
              color: "#e65100",
              fontSize: 13,
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ===== 提交按钮 ===== */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: "100%",
            height: 50,
            backgroundColor: canSubmit ? BRAND : "#d5c0e8",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: submitting ? 0.75 : 1,
            transition: "background-color 0.2s, opacity 0.2s",
            marginBottom: 16,
          }}
        >
          {submitting ? "提交中..." : "提交申诉"}
        </button>
      </div>

      {/* ===== 底部合规提示 ===== */}
      <div
        style={{
          padding: "14px 20px 24px",
          textAlign: "center",
          fontSize: 11,
          color: "#bbb",
          lineHeight: 1.7,
        }}
      >
        <p style={{ margin: 0 }}>{COMPLIANCE_DISCLAIMER}</p>
        <p style={{ margin: "4px 0 0" }}>
          申诉及裁决流程遵循平台公平公正原则，恶意申诉将计入违规记录。
        </p>
      </div>

      {/* ===== 成功遮罩 ===== */}
      {successMsg && <SuccessOverlay message={successMsg} />}
    </div>
  );
}

// ==================== 默认导出（Suspense 包裹 useSearchParams） ====================
export default function AppealPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            maxWidth: "420px",
            margin: "0 auto",
            minHeight: "100vh",
            backgroundColor: "#f5f5f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ color: "#999", fontSize: 15 }}>加载中...</p>
        </div>
      }
    >
      <AppealPageInner />
    </Suspense>
  );
}
