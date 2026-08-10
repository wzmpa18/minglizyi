"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getGongfaById,
  GONGFA_LIST,
  YANGSHENG_CATEGORIES,
  YANGSHENG_DISCLAIMER,
  type GongfaDetail,
} from "@/data/yangsheng_data";
import { ShareButton } from "@/components/ShareButton";
import { useToolBack } from "@/lib/useToolBack";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";

const BRAND = "#2E7D32";
const BRAND_LIGHT = "#4CAF50";
const BRAND_BG = "#E8F5E9";

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  入门: { bg: "#E8F5E9", text: "#2E7D32" },
  初级: { bg: "#E3F2FD", text: "#1565C0" },
  中级: { bg: "#FFF3E0", text: "#E65100" },
  高级: { bg: "#FFEBEE", text: "#C62828" },
};

const PLATFORM_COLORS: Record<string, string> = {
  "B站": "#fb7299",
  优酷: "#1989fa",
  腾讯视频: "#ff6088",
};

// 评论接口
interface Comment {
  id: string;
  userId: string;
  nickname: string;
  avatar?: string;
  content: string;
  createdAt: string;
}

const COMMENT_KEY_PREFIX = "yandao_yangsheng_comments_";

function loadComments(gongfaId: string): Comment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMMENT_KEY_PREFIX + gongfaId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveComments(gongfaId: string, comments: Comment[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMMENT_KEY_PREFIX + gongfaId, JSON.stringify(comments));
  } catch {
    // ignore
  }
}

// 敏感词过滤
const SENSITIVE_WORDS = ["广告", "微信号", "加我", "代购", "色情", "赌博", "诈骗"];
function filterContent(text: string): string {
  let filtered = text;
  for (const word of SENSITIVE_WORDS) {
    filtered = filtered.replace(new RegExp(word, "gi"), "***");
  }
  return filtered;
}

export default function ClientPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  useToolBack();

  const gongfa = getGongfaById(id);
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  // 收藏状态
  const [isFavorited, setIsFavorited] = useState(false);

  // 评论
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");

  // 加载收藏和评论
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 收藏
    try {
      const favRaw = localStorage.getItem("yandao_yangsheng_favorites");
      if (favRaw) {
        const favs: string[] = JSON.parse(favRaw);
        setIsFavorited(favs.includes(id));
      }
    } catch {
      // ignore
    }

    // 评论
    setComments(loadComments(id));
  }, [id]);

  // 切换收藏
  const toggleFavorite = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const favRaw = localStorage.getItem("yandao_yangsheng_favorites");
      let favs: string[] = favRaw ? JSON.parse(favRaw) : [];
      if (favs.includes(id)) {
        favs = favs.filter((f) => f !== id);
        setIsFavorited(false);
      } else {
        favs.push(id);
        setIsFavorited(true);
      }
      localStorage.setItem("yandao_yangsheng_favorites", JSON.stringify(favs));
    } catch {
      // ignore
    }
  }, [id]);

  // 发表评论
  const handleSubmitComment = useCallback(() => {
    if (!commentText.trim()) return;

    // 需要登录
    if (!requireLogin()) return;

    const userRaw = localStorage.getItem("yandao_user_profile");
    let nickname = "匿名用户";
    let userId = "anonymous";
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        nickname = user.nickname || user.phone || "用户";
        userId = user.id || user.user_number_id || "anonymous";
      } catch {
        // ignore
      }
    }

    const newComment: Comment = {
      id: Date.now().toString(),
      userId,
      nickname,
      content: filterContent(commentText.trim()),
      createdAt: new Date().toISOString(),
    };

    const updated = [newComment, ...comments];
    setComments(updated);
    saveComments(id, updated);
    setCommentText("");
  }, [commentText, comments, id, requireLogin]);

  // 格式化时间
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  if (!gongfa) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
        <p style={{ fontSize: "16px", color: "#666" }}>功法不存在</p>
        <Link href="/zhongyi/yangsheng" style={{ color: BRAND, fontSize: "14px", marginTop: "12px", display: "inline-block" }}>
          返回列表
        </Link>
      </div>
    );
  }

  const category = YANGSHENG_CATEGORIES.find((c) => c.id === gongfa.category);
  const diffColor = DIFFICULTY_COLORS[gongfa.difficulty] || DIFFICULTY_COLORS["入门"];

  // 相关推荐（同分类的其他功法）
  const related = GONGFA_LIST.filter(
    (g) => g.category === gongfa.category && g.id !== gongfa.id
  ).slice(0, 3);

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#f5f9f5",
        paddingBottom: "80px",
      }}
    >
      {/* 顶部导航 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
          padding: "12px 16px",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "20px", padding: "4px" }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>{gongfa.name}</h1>
          <p style={{ fontSize: "11px", opacity: 0.8, margin: 0 }}>
            {gongfa.alias ? gongfa.alias + " · " : ""}{category?.name}
          </p>
        </div>
        <button
          onClick={toggleFavorite}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px" }}
        >
          {isFavorited ? "⭐" : "☆"}
        </button>
        <ShareButton
          type="article"
          title={`${gongfa.name} - 养生上古之道`}
          description={`${gongfa.name}：${gongfa.intro.slice(0, 50)}...`}
          url={`/zhongyi/yangsheng/${gongfa.id}`}
        />
      </div>

      {/* 基本信息栏 */}
      <div style={{ padding: "12px" }}>
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#333", margin: 0 }}>{gongfa.name}</h2>
            <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", backgroundColor: diffColor.bg, color: diffColor.text }}>
              {gongfa.difficulty}
            </span>
            {gongfa.hotTag && (
              <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", backgroundColor: "#fff3e0", color: "#e65100" }}>
                🔥 {gongfa.hotTag}
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", fontSize: "12px", color: "#666" }}>
            {gongfa.alias && <span>别名：{gongfa.alias}</span>}
            <span>传承：{gongfa.inheritor}</span>
            <span>年代：{gongfa.era}</span>
            <span>分类：{category?.name}</span>
          </div>
        </div>
      </div>

      {/* 功法简介 */}
      <div style={{ padding: "0 12px" }}>
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: "bold", color: BRAND, margin: "0 0 8px" }}>📖 功法简介</h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#333", lineHeight: 1.8 }}>{gongfa.intro}</p>
        </div>
      </div>

      {/* 功法详解 */}
      <div style={{ padding: "12px 12px 0" }}>
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: "bold", color: BRAND, margin: "0 0 12px" }}>🧘 功法详解</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {gongfa.steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: "10px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: BRAND_BG,
                    color: BRAND,
                    fontSize: "13px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333", marginBottom: "4px" }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.7, marginBottom: "4px" }}>
                    <span style={{ color: BRAND, fontWeight: 500 }}>要领：</span>{step.essentials}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.7 }}>
                    <span style={{ color: "#e65100", fontWeight: 500 }}>功效：</span>{step.effect}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 视频学习区 */}
      <div style={{ padding: "12px 12px 0" }}>
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: "bold", color: BRAND, margin: "0 0 10px" }}>🎬 视频学习</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {gongfa.videos.map((v, i) => (
              <a
                key={i}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: "#fafafa",
                  textDecoration: "none",
                  border: "1px solid #f0f0f0",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: `linear-gradient(135deg, ${PLATFORM_COLORS[v.platform] || "#666"}22, ${PLATFORM_COLORS[v.platform] || "#666"}44)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: "18px" }}>▶️</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", color: "#333", fontWeight: 500, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {v.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        backgroundColor: PLATFORM_COLORS[v.platform] || "#666",
                        color: "white",
                      }}
                    >
                      {v.platform}
                    </span>
                    {v.duration && <span style={{ fontSize: "10px", color: "#999" }}>{v.duration}</span>}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H8M17 7v9" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* 典籍出处 */}
      {gongfa.classicText && (
        <div style={{ padding: "12px 12px 0" }}>
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              padding: "14px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#6A1B9A", margin: "0 0 8px" }}>📜 典籍出处</h3>
            {gongfa.classicSource && (
              <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#666" }}>{gongfa.classicSource}</p>
            )}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                backgroundColor: "#f5f0fa",
                borderLeft: "3px solid #6A1B9A",
              }}
            >
              <p style={{ margin: 0, fontSize: "13px", color: "#333", lineHeight: 1.8, fontStyle: "italic" }}>
                {gongfa.classicText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 评论互动区 */}
      <div style={{ padding: "12px 12px 0" }}>
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: "bold", color: BRAND, margin: "0 0 12px" }}>
            💬 评论（{comments.length}）
          </h3>

          {/* 评论输入 */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              type="text"
              placeholder="发表你的看法..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value.slice(0, 200))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitComment();
              }}
              style={{
                flex: 1,
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              onClick={handleSubmitComment}
              disabled={!commentText.trim()}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: commentText.trim() ? BRAND : "#ccc",
                color: "white",
                fontSize: "13px",
                cursor: commentText.trim() ? "pointer" : "not-allowed",
              }}
            >
              发表
            </button>
          </div>

          {/* 评论列表 */}
          {comments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#ccc", fontSize: "13px" }}>
              暂无评论，快来发表第一条吧
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {comments.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    gap: "10px",
                    padding: "10px 0",
                    borderBottom: "1px solid #f5f5f5",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: BRAND_BG,
                      color: BRAND,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: "bold",
                      flexShrink: 0,
                    }}
                  >
                    {c.nickname.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "bold", color: "#333" }}>{c.nickname}</span>
                      <span style={{ fontSize: "10px", color: "#ccc" }}>{formatTime(c.createdAt)}</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#333", lineHeight: 1.6 }}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 相关推荐 */}
      {related.length > 0 && (
        <div style={{ padding: "12px 12px 0" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 10px" }}>📂 相关推荐</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/zhongyi/yangsheng/${r.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "white",
                  textDecoration: "none",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    backgroundColor: BRAND_BG,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  {category?.icon || "📖"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: "#333" }}>{r.name}</div>
                  <div style={{ fontSize: "11px", color: "#999" }}>{r.inheritor} · {r.difficulty}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 底部合规声明 */}
      <div
        style={{
          margin: "16px 12px 0",
          padding: "10px 14px",
          backgroundColor: "#fff8e1",
          borderRadius: "12px",
          border: "1px solid #ffecb3",
        }}
      >
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center", lineHeight: 1.5 }}>
          {YANGSHENG_DISCLAIMER}
        </p>
      </div>

      {/* 登录引导弹窗 */}
      {showLoginPrompt && (
        <LoginPromptModal
          show={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
        />
      )}
    </div>
  );
}
