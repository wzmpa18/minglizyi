"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import { getPosts, getComments, addComment, toggleLikePost } from "@/lib/socialStore";
import { getUserProfile } from "@/lib/auth";

const BRAND = "#7B2FBE";

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  images: string[];
  topic: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  isAd: boolean;
  createdAt: string;
}

interface CommentItem {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export default function DiscoverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { goBack } = useToolBack();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const posts = getPosts();
      const found = posts.find((p: Post) => p.id === id);
      if (found) setPost(found);
      const cmts = getComments(id);
      setComments(cmts || []);
    } catch (e) {
      console.error("加载详情失败:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLike = () => {
    if (!post) return;
    try {
      const nowLiked = toggleLikePost(post.id);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              liked: nowLiked,
              likes: nowLiked ? prev.likes + 1 : Math.max(0, prev.likes - 1),
            }
          : prev
      );
    } catch (e) {
      console.error("点赞失败:", e);
    }
  };

  const handleSendComment = () => {
    const text = commentText.trim();
    if (!text || !post) return;
    setSubmitting(true);
    try {
      const user = getUserProfile();
      const newComment: CommentItem = {
        id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        postId: post.id,
        authorId: user?.userId || "anonymous",
        authorName: user?.nickname || "匿名用户",
        authorAvatar: user?.avatar || "",
        content: text,
        createdAt: new Date().toISOString(),
      };
      addComment(newComment);
      setComments((prev) => [newComment, ...prev]);
      setPost((prev) =>
        prev ? { ...prev, comments: prev.comments + 1 } : prev
      );
      setCommentText("");
    } catch (e) {
      console.error("评论失败:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.content.slice(0, 50),
          text: post.content,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("链接已复制");
      }
    } catch (e) {
      console.error("分享失败:", e);
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return "刚刚";
      if (minutes < 60) return `${minutes}分钟前`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}小时前`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days}天前`;
      return date.toLocaleDateString("zh-CN");
    } catch {
      return timeStr;
    }
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#ededed", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="动态详情" showBack color={BRAND} onBack={goBack} />

      {/* 内容区域 */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "60px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
            加载中...
          </div>
        ) : post ? (
          <>
            {/* 帖子详情卡片 */}
            <div style={{ backgroundColor: "#fff", padding: "16px", marginBottom: "8px" }}>
              {/* 作者信息 */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#e0e0e0",
                    overflow: "hidden",
                    marginRight: "10px",
                    flexShrink: 0,
                  }}
                >
                  {post.authorAvatar ? (
                    <img
                      src={post.authorAvatar}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        backgroundColor: BRAND,
                        fontSize: "16px",
                        fontWeight: "bold",
                      }}
                    >
                      {post.authorName?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#333" }}>
                    {post.authorName}
                  </div>
                  <div style={{ fontSize: "12px", color: "#999" }}>
                    {formatTime(post.createdAt)}
                  </div>
                </div>
                {post.topic && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: BRAND,
                      backgroundColor: `${BRAND}15`,
                      padding: "3px 8px",
                      borderRadius: "10px",
                    }}
                  >
                    #{post.topic}
                  </span>
                )}
              </div>

              {/* 帖子内容 */}
              <div style={{ fontSize: "15px", lineHeight: "1.7", color: "#333", marginBottom: "12px", whiteSpace: "pre-wrap" }}>
                {post.content}
              </div>

              {/* 图片展示 */}
              {post.images && post.images.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      post.images.length === 1
                        ? "1fr"
                        : post.images.length === 2
                        ? "1fr 1fr"
                        : "1fr 1fr 1fr",
                    gap: "6px",
                    marginBottom: "12px",
                  }}
                >
                  {post.images.map((img, idx) => (
                    <div
                      key={idx}
                      style={{
                        aspectRatio: "1",
                        backgroundColor: "#f0f0f0",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={img}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 点赞/评论/分享操作栏 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  paddingTop: "12px",
                  borderTop: "1px solid #f0f0f0",
                }}
              >
                <button
                  onClick={handleLike}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "none",
                    border: "none",
                    fontSize: "14px",
                    color: post.liked ? BRAND : "#999",
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                >
                  <span>{post.liked ? "❤️" : "🤍"}</span>
                  <span>{post.likes || 0}</span>
                </button>
                <button
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>(".comment-input");
                    input?.focus();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "none",
                    border: "none",
                    fontSize: "14px",
                    color: "#999",
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                >
                  <span>💬</span>
                  <span>{post.comments || 0}</span>
                </button>
                <button
                  onClick={handleShare}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "none",
                    border: "none",
                    fontSize: "14px",
                    color: "#999",
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                >
                  <span>↗️</span>
                  <span>{post.shares || 0}</span>
                </button>
              </div>
            </div>

            {/* 评论区 */}
            <div style={{ backgroundColor: "#fff", padding: "16px" }}>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "12px" }}>
                全部评论 ({comments.length})
              </div>

              {comments.length === 0 ? (
                <div style={{ textAlign: "center", color: "#999", padding: "20px 0", fontSize: "14px" }}>
                  暂无评论，快来抢沙发吧
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {comments.map((cmt) => (
                    <div key={cmt.id} style={{ display: "flex", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor: "#e0e0e0",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        {cmt.authorAvatar ? (
                          <img
                            src={cmt.authorAvatar}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              backgroundColor: "#ccc",
                              fontSize: "12px",
                            }}
                          >
                            {cmt.authorName?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#333" }}>
                            {cmt.authorName}
                          </span>
                          <span style={{ fontSize: "11px", color: "#bbb" }}>
                            {formatTime(cmt.createdAt)}
                          </span>
                        </div>
                        <div style={{ fontSize: "14px", color: "#555", lineHeight: "1.5" }}>
                          {cmt.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
            动态不存在或已被删除
          </div>
        )}
      </div>

      {/* 底部评论输入框 */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#fff",
          borderTop: "1px solid #e0e0e0",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 100,
        }}
      >
        <input
          className="comment-input"
          type="text"
          placeholder="写下你的评论..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          style={{
            flex: 1,
            height: "36px",
            border: "1px solid #e0e0e0",
            borderRadius: "18px",
            padding: "0 14px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: "#f5f5f5",
          }}
        />
        <button
          onClick={handleSendComment}
          disabled={!commentText.trim() || submitting}
          style={{
            backgroundColor: commentText.trim() ? BRAND : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "18px",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: commentText.trim() ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
          }}
        >
          {submitting ? "发送中" : "发送"}
        </button>
      </div>

      {/* 底部免责声明 */}
      <div style={{ padding: "12px 16px", textAlign: "center", fontSize: "11px", color: "#bbb", backgroundColor: "#ededed" }}>
        本页面内容由用户生成，仅供参考，不代表平台观点
      </div>
    </div>
  );
}