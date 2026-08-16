"use client";

import { useState, useRef } from "react";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import { addPost } from "@/lib/socialStore";
import { getCurrentUser } from "@/lib/loginService";
import { communityActivity } from "@/lib/pointsStore";
import { callAI } from "@/lib/aiService";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";

const BRAND = "#7B2FBE";

const TOPICS = [
  { key: "mingli", label: "命理讨论" },
  { key: "zhongyi", label: "中医养生" },
  { key: "jingdian", label: "经典研读" },
  { key: "shenghuo", label: "生活感悟" },
  { key: "guoxue", label: "国学入门" },
];

const SENSITIVE_KEYWORDS = ["敏感词1", "敏感词2", "敏感词3"];

export default function DiscoverCreatePage() {
  const { goBack } = useToolBack();
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [sensitiveWarn, setSensitiveWarn] = useState("");
  const [aiWriting, setAiWriting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  // AI写作助手
  const handleAIWrite = async () => {
    if (!requireLogin()) return;
    if (aiWriting) return;
    setAiWriting(true);
    setAiSuggestion("");
    try {
      const topicLabel = TOPICS.find(t => t.key === selectedTopic)?.label || "国学易学";
      const prompt = `作为国学易学社区的AI写作助手，请帮我写一段社区动态（100-200字），要求：
1. 话题：${topicLabel}
2. 内容积极向上，有学习心得或生活感悟
3. 语言自然亲切，如朋友交流
4. 可以引用一句经典名句增加文化底蕴
5. 末尾加一个相关的emoji表情

${content.trim() ? `用户已有草稿，请在此基础上润色扩展：${content}` : "请从零开始创作。"}`;

      const result = await callAI({ userPrompt: prompt, forceRefresh: true });
      if (result.success && result.content) {
        setAiSuggestion(result.content);
      } else {
        setAiSuggestion("AI写作助手暂时不可用，请稍后再试~");
      }
    } catch (e) {
      console.error("AI写作失败:", e);
      setAiSuggestion("AI写作助手暂时不可用，请稍后再试~");
    } finally {
      setAiWriting(false);
    }
  };

  // 采用AI建议
  const handleUseSuggestion = () => {
    if (aiSuggestion && aiSuggestion.length <= 500) {
      setContent(aiSuggestion);
      setAiSuggestion("");
    } else if (aiSuggestion.length > 500) {
      setContent(aiSuggestion.slice(0, 500));
      setAiSuggestion("");
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 500) {
      setContent(val);
      // 敏感词检测
      const found = SENSITIVE_KEYWORDS.find((kw) => val.includes(kw));
      setSensitiveWarn(found ? `检测到敏感词"${found}"，请修改后发布` : "");
    }
  };

  const handleImageAdd = () => {
    if (images.length >= 4) {
      alert("最多上传4张图片");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImages((prev) => [...prev, dataUrl]);
    };
    reader.readAsDataURL(file);
    // 重置 input 以便选择同一文件
    e.target.value = "";
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePublish = async () => {
    if (!requireLogin()) return;
    const text = content.trim();
    if (!text) {
      alert("请输入动态内容");
      return;
    }
    if (!selectedTopic) {
      alert("请选择话题");
      return;
    }
    if (sensitiveWarn) {
      alert("内容包含敏感词，请修改后发布");
      return;
    }
    setPublishing(true);
    try {
      const user = getCurrentUser();
      await addPost({
        id: 'post_' + Date.now(),
        authorId: user?.userId || 'anonymous',
        authorName: user?.nickname || '言道用户',
        authorAvatar: user?.avatar || '',
        content: text,
        images,
        topic: selectedTopic,
        likes: 0,
        comments: 0,
        shares: 0,
        liked: false,
        isAd: false,
        createdAt: new Date().toISOString(),
      });
      // 发帖奖励积分
      try { communityActivity('发布动态'); } catch {}
      alert("发布成功！");
      goBack();
    } catch (e) {
      console.error("发布失败:", e);
      alert("发布失败，请重试");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#ededed", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="发布动态" showBack color={BRAND} onBack={goBack} />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {/* 文字输入区 */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
          <textarea
            placeholder="分享你的学习心得、生活感悟..."
            value={content}
            onChange={handleContentChange}
            rows={6}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: "15px",
              lineHeight: "1.6",
              color: "#333",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
            <span style={{ fontSize: "12px", color: content.length > 450 ? "#e74c3c" : "#bbb" }}>
              {content.length}/500
            </span>
            {sensitiveWarn && (
              <span style={{ fontSize: "12px", color: "#e74c3c" }}>
                {sensitiveWarn}
              </span>
            )}
          </div>
          {/* AI写作助手按钮 */}
          <button
            onClick={handleAIWrite}
            disabled={aiWriting}
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "8px 0",
              borderRadius: "8px",
              border: `1px solid ${BRAND}40`,
              backgroundColor: `${BRAND}08`,
              color: BRAND,
              fontSize: "13px",
              fontWeight: 600,
              cursor: aiWriting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <span style={{ fontSize: "15px" }}>{aiWriting ? "⏳" : "🤖"}</span>
            <span>{aiWriting ? "AI创作中..." : "AI写作助手"}</span>
          </button>
          {/* AI建议结果 */}
          {aiSuggestion && (
            <div style={{
              marginTop: "10px",
              borderRadius: "8px",
              padding: "12px",
              backgroundColor: "#f3e8ff",
              border: `1px solid ${BRAND}30`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px" }}>🤖</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: BRAND }}>AI创作建议</span>
              </div>
              <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#333", whiteSpace: "pre-wrap", marginBottom: "8px" }}>
                {aiSuggestion}
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleUseSuggestion}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: BRAND,
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  采用此内容
                </button>
                <button
                  onClick={() => setAiSuggestion("")}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                    backgroundColor: "#fff",
                    color: "#666",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  重新创作
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 话题选择 */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#333", marginBottom: "10px" }}>
            选择话题
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {TOPICS.map((topic) => (
              <button
                key={topic.key}
                onClick={() => setSelectedTopic(topic.key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "16px",
                  fontSize: "13px",
                  border: selectedTopic === topic.key ? `2px solid ${BRAND}` : "1px solid #e0e0e0",
                  backgroundColor: selectedTopic === topic.key ? `${BRAND}10` : "#f5f5f5",
                  color: selectedTopic === topic.key ? BRAND : "#666",
                  cursor: "pointer",
                  fontWeight: selectedTopic === topic.key ? 600 : 400,
                }}
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>

        {/* 图片上传 */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#333", marginBottom: "10px" }}>
            添加图片（{images.length}/4）
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {images.map((img, idx) => (
              <div
                key={idx}
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  position: "relative",
                  backgroundColor: "#f0f0f0",
                }}
              >
                <img
                  src={img}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <button
                  onClick={() => handleRemoveImage(idx)}
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    color: "#fff",
                    border: "none",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: "1",
                  }}
                >
                  x
                </button>
              </div>
            ))}
            {images.length < 4 && (
              <button
                onClick={handleImageAdd}
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "8px",
                  border: "1px dashed #ccc",
                  backgroundColor: "#fafafa",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#999",
                  fontSize: "12px",
                  gap: "4px",
                }}
              >
                <span style={{ fontSize: "24px" }}>+</span>
                <span>添加图片</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>

        {/* 发布按钮 */}
        <button
          onClick={handlePublish}
          disabled={publishing || !content.trim() || !selectedTopic}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: "12px",
            backgroundColor: content.trim() && selectedTopic && !publishing ? BRAND : "#ccc",
            color: "#fff",
            border: "none",
            fontSize: "16px",
            fontWeight: 600,
            cursor: content.trim() && selectedTopic && !publishing ? "pointer" : "not-allowed",
            marginTop: "8px",
          }}
        >
          {publishing ? "发布中..." : "发布"}
        </button>
      </div>

      {/* 底部免责声明 */}
      <div style={{ padding: "12px 16px", textAlign: "center", fontSize: "11px", color: "#bbb", backgroundColor: "#ededed" }}>
        发布内容需遵守社区规范，禁止发布违规信息
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />

      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  );
}