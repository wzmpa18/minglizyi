"use client";

import { useState, useEffect, useCallback } from "react";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import {
  FEEDBACK_TYPES,
  FEEDBACK_STATUS_LABELS,
  submitFeedback,
  getUserFeedbacks,
  getDeviceInfo,
  getAppVersion,
  type FeedbackType,
  type Feedback,
} from "@/lib/feedbackService";

const BRAND = "#7B2FBE";

export default function FeedbackPage() {
  const { goBack } = useToolBack();

  const [selectedType, setSelectedType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [history, setHistory] = useState<Feedback[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 加载用户反馈历史
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      let userId = "";
      if (typeof window !== "undefined") {
        userId = localStorage.getItem("yandao_user_id") || "";
      }
      const feedbacks = await getUserFeedbacks(userId);
      setHistory(feedbacks);
    } catch (e) {
      console.error("加载反馈历史失败:", e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory, loadHistory]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setSubmitResult({ success: false, message: "请输入问题标题" });
      return;
    }
    if (description.trim().length < 5) {
      setSubmitResult({ success: false, message: "请至少描述5个字" });
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      let userId = "anonymous";
      let userName = "匿名用户";

      if (typeof window !== "undefined") {
        userId = localStorage.getItem("yandao_user_id") || "anonymous";
        try {
          const profileRaw = localStorage.getItem("yandao_user_profile");
          if (profileRaw) {
            const p = JSON.parse(profileRaw);
            userName = p.nickname || userName;
          }
        } catch {}
      }

      const result = await submitFeedback({
        userId,
        userName,
        type: selectedType,
        title: title.trim(),
        description: description.trim(),
        contact: contact.trim() || undefined,
        deviceInfo: getDeviceInfo(),
        appVersion: getAppVersion(),
      });

      setSubmitResult({ success: result.success, message: result.message });

      if (result.success) {
        // 清空表单
        setTitle("");
        setDescription("");
        setContact("");
        setSelectedType("bug");
      }
    } catch (e: any) {
      setSubmitResult({ success: false, message: "提交失败，请稍后重试" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#ededed", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="问题反馈" showBack color={BRAND} onBack={goBack} />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {/* 切换标签 */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <button
            onClick={() => setShowHistory(false)}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: "10px",
              border: "none",
              backgroundColor: !showHistory ? BRAND : "#fff",
              color: !showHistory ? "#fff" : "#666",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            提交反馈
          </button>
          <button
            onClick={() => setShowHistory(true)}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: "10px",
              border: "none",
              backgroundColor: showHistory ? BRAND : "#fff",
              color: showHistory ? "#fff" : "#666",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            我的反馈
          </button>
        </div>

        {!showHistory ? (
          <>
            {/* 反馈类型选择 */}
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "12px" }}>
                问题类型
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {FEEDBACK_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setSelectedType(t.value)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      padding: "12px 4px",
                      borderRadius: "10px",
                      border: selectedType === t.value ? `2px solid ${t.color}` : "1px solid #e0e0e0",
                      backgroundColor: selectedType === t.value ? `${t.color}10` : "#fff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>{t.icon}</span>
                    <span style={{
                      fontSize: "12px",
                      color: selectedType === t.value ? t.color : "#666",
                      fontWeight: selectedType === t.value ? 600 : 400,
                    }}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 标题输入 */}
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "8px" }}>
                问题标题 <span style={{ color: "#e74c3c" }}>*</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="简述遇到的问题"
                maxLength={100}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ textAlign: "right", fontSize: "12px", color: "#bbb", marginTop: "4px" }}>
                {title.length}/100
              </div>
            </div>

            {/* 详细描述 */}
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "8px" }}>
                详细描述 <span style={{ color: "#e74c3c" }}>*</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请详细描述问题发生的步骤、现象和期望结果，便于我们快速定位和修复"
                maxLength={2000}
                rows={5}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "14px",
                  outline: "none",
                  resize: "none",
                  boxSizing: "border-box",
                  lineHeight: "1.6",
                }}
              />
              <div style={{ textAlign: "right", fontSize: "12px", color: "#bbb", marginTop: "4px" }}>
                {description.length}/2000
              </div>
            </div>

            {/* 联系方式 */}
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "8px" }}>
                联系方式 <span style={{ fontSize: "12px", color: "#999", fontWeight: 400 }}>（选填）</span>
              </div>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="手机号/微信号，便于我们回复处理结果"
                maxLength={100}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* 设备信息 */}
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
              <div style={{ fontSize: "13px", color: "#999" }}>
                <span style={{ marginRight: "8px" }}>📱</span>
                {getDeviceInfo()} | {getAppVersion()}
              </div>
            </div>

            {/* 提交结果提示 */}
            {submitResult && (
              <div
                style={{
                  backgroundColor: submitResult.success ? "#e8f5e9" : "#ffebee",
                  borderRadius: "10px",
                  padding: "12px",
                  marginBottom: "12px",
                  textAlign: "center",
                  color: submitResult.success ? "#2e7d32" : "#c62828",
                  fontSize: "14px",
                }}
              >
                {submitResult.success ? "✅ " : "⚠️ "}
                {submitResult.message}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: "12px",
                backgroundColor: submitting ? "#ccc" : BRAND,
                color: "#fff",
                border: "none",
                fontSize: "16px",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                marginBottom: "12px",
              }}
            >
              {submitting ? "提交中..." : "提交反馈"}
            </button>
          </>
        ) : (
          <>
            {/* 反馈历史列表 */}
            {loadingHistory ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
                加载中...
              </div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
                <div>暂无反馈记录</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {history.map((fb) => {
                  const typeConfig = FEEDBACK_TYPES.find((t) => t.value === fb.type);
                  const statusColor = {
                    pending: "#f39c12",
                    processing: "#3498db",
                    resolved: "#27ae60",
                    closed: "#999",
                  }[fb.status] || "#999";

                  return (
                    <div
                      key={fb.id}
                      style={{
                        backgroundColor: "#fff",
                        borderRadius: "12px",
                        padding: "16px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "18px" }}>{typeConfig?.icon || "📝"}</span>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>
                            {fb.title}
                          </span>
                        </div>
                        <span style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          backgroundColor: `${statusColor}20`,
                          color: statusColor,
                          fontWeight: 600,
                        }}>
                          {FEEDBACK_STATUS_LABELS[fb.status as keyof typeof FEEDBACK_STATUS_LABELS] || "待处理"}
                        </span>
                      </div>
                      <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px", lineHeight: "1.5" }}>
                        {fb.description}
                      </div>
                      <div style={{ fontSize: "11px", color: "#bbb" }}>
                        {new Date(fb.createdAt).toLocaleString("zh-CN")}
                      </div>
                      {fb.adminReply && (
                        <div style={{
                          marginTop: "8px",
                          padding: "8px 12px",
                          backgroundColor: "#f0f7ff",
                          borderRadius: "8px",
                          fontSize: "13px",
                          color: "#333",
                        }}>
                          <span style={{ fontWeight: 600, color: BRAND }}>官方回复：</span>
                          {fb.adminReply}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部免责声明 */}
      <div style={{ padding: "12px 16px", textAlign: "center", fontSize: "11px", color: "#bbb", backgroundColor: "#ededed" }}>
        您的反馈将帮助我们持续优化产品体验
      </div>
    </div>
  );
}
