"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import { getPosts, getComments, addComment, toggleLikePost } from "@/lib/socialStore";
import { getUserProfile, getCurrentUserId } from "@/lib/auth";
import {
  fetchPostDetail,
  fetchComments as fetchRemoteComments,
  addComment as addRemoteComment,
  toggleLike as toggleRemoteLike,
  reportPost,
  reportComment,
  isLoggedIn,
} from "@/lib/socialApi";
import { addFavorite, removeFavorite, isFavorited } from "@/lib/favoritesStore";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

const BRAND = "#7B2FBE";

const REPORT_REASONS = ["垃圾广告或引流", "违法违规内容", "人身攻击或不友善", "色情低俗", "迷信诈骗", "其他"];

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
  const [online, setOnline] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "post" | "comment"; id: string } | null>(null);
  const [toast, setToast] = useState("");
  const [faved, setFaved] = useState(false);

  // P1 弹窗规范：举报面板 —— 返回键优先关闭 + 背景滚动锁
  useBodyScrollLock(showReport);
  usePopupBackHandler(() => setShowReport(false), showReport);

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(""), 2500);
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    // 后端优先：真实多人数据
    try {
      const r = await fetchPostDetail(id);
      if (r.success && r.post) {
        const p = r.post;
        setPost({
          id: p.postId || p.id,
          authorId: p.authorId,
          authorName: p.authorName,
          authorAvatar: p.authorAvatar,
          content: p.content,
          images: p.images || [],
          topic: p.circleLabel || (p.tags && p.tags[0]) || "",
          likes: p.likeCount || 0,
          comments: p.commentCount || 0,
          shares: 0,
          liked: !!p.liked,
          isAd: false,
          createdAt: p.createdAt,
        });
        setOnline(true);
        try {
          const rc = await fetchRemoteComments(id);
          if (rc.success && rc.comments) {
            setComments(rc.comments.map((c: { id: string; postId: string; authorId: string; authorName: string; content: string; createdAt: string }) => ({
              id: c.id, postId: c.postId, authorId: c.authorId, authorName: c.authorName, authorAvatar: "", content: c.content, createdAt: c.createdAt,
            })));
          }
        } catch {}
        setLoading(false);
        return;
      }
    } catch {}
    // 本地兜底
    try {
      const posts = getPosts();
      const found = posts.find((p: Post) => p.id === id);
      if (found) setPost(found);
      setComments(getComments(id) || []);
    } catch (e) {
      console.error("加载详情失败:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (id && typeof window !== "undefined") setFaved(isFavorited(id));
  }, [id]);

  const handleLike = async () => {
    if (!post) return;
    // 乐观更新
    setPost((prev) =>
      prev ? { ...prev, liked: !prev.liked, likes: !prev.liked ? prev.likes + 1 : Math.max(0, prev.likes - 1) } : prev
    );
    if (online && isLoggedIn()) {
      try {
        const r = await toggleRemoteLike(post.id);
        const lc = r.likeCount;
        if (r.success && typeof lc === "number") {
          setPost((prev) => (prev ? { ...prev, liked: !!r.liked, likes: lc } : prev));
        }
        return;
      } catch {
        flash("网络异常，已本地记录");
      }
    }
    try {
      const nowLiked = toggleLikePost(post.id);
      setPost((prev) => (prev ? { ...prev, liked: nowLiked } : prev));
    } catch (e) {
      console.error("点赞失败:", e);
    }
  };

  const handleFavorite = () => {
    if (!post) return;
    if (faved) {
      removeFavorite(post.id);
      setFaved(false);
      flash("已取消收藏");
    } else {
      addFavorite({
        id: post.id,
        type: "moment",
        title: post.content.slice(0, 40) || "动态",
        summary: `${post.authorName} · ${post.likes}赞 ${post.comments}评`,
        tool: "社区动态",
        href: `/discover/${post.id}`,
      });
      setFaved(true);
      flash("已收藏，可在 我的-收藏 查看");
    }
  };

  const handleSendComment = async () => {
    const text = commentText.trim();
    if (!text || !post) return;
    setSubmitting(true);
    if (online && isLoggedIn()) {
      try {
        const r = await addRemoteComment(post.id, text);
        if (r.success) {
          await loadData();
          setCommentText("");
          setSubmitting(false);
          return;
        }
        flash(r.error || "评论失败");
      } catch {
        flash("网络异常，已本地记录");
      }
    }
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
      setPost((prev) => (prev ? { ...prev, comments: prev.comments + 1 } : prev));
      setCommentText("");
    } catch (e) {
      console.error("评论失败:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async (reason: string) => {
    if (!reportTarget) return;
    const isMine =
      reportTarget.type === "post"
        ? post?.authorId === getCurrentUserId()
        : false;
    if (isMine) {
      flash("不能举报自己发布的内容");
      setShowReport(false);
      return;
    }
    try {
      if (reportTarget.type === "post") {
        const r = await reportPost(reportTarget.id, reason);
        if (r.success) { flash(r.message || "举报已提交"); }
        else { flash(r.error || "举报失败"); }
      } else {
        const r = await reportComment(reportTarget.id, reason);
        if (r.success) { flash(r.message || "举报已提交"); }
        else { flash(r.error || "举报失败"); }
      }
    } catch {
      flash("网络异常，举报未送达");
    }
    setShowReport(false);
    setReportTarget(null);
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.content.slice(0, 50), text: post.content, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        flash("链接已复制");
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
          <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>加载中...</div>
        ) : post ? (
          <>
            {/* 帖子详情卡片 */}
            <div style={{ backgroundColor: "#fff", padding: "16px", marginBottom: "8px" }}>
              {/* 作者信息 */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#e0e0e0",
                    overflow: "hidden", marginRight: "10px", flexShrink: 0,
                  }}
                >
                  {post.authorAvatar ? (
                    <img src={post.authorAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div
                      style={{
                        width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", backgroundColor: BRAND, fontSize: "16px", fontWeight: "bold",
                      }}
                    >
                      {post.authorName?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#333" }}>{post.authorName}</div>
                  <div style={{ fontSize: "12px", color: "#999" }}>{formatTime(post.createdAt)}</div>
                </div>
                {post.topic && (
                  <span
                    style={{
                      fontSize: "11px", color: BRAND, backgroundColor: `${BRAND}15`,
                      padding: "3px 8px", borderRadius: "10px", marginRight: "6px",
                    }}
                  >
                    #{post.topic}
                  </span>
                )}
                <button
                  onClick={() => { setReportTarget({ type: "post", id: post.id }); setShowReport(true); }}
                  style={{ background: "none", border: "none", fontSize: "16px", color: "#999", padding: "4px 6px" }}
                  aria-label="举报"
                >
                  ⋯
                </button>
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
                    gridTemplateColumns: post.images.length === 1 ? "1fr" : post.images.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr",
                    gap: "6px", marginBottom: "12px",
                  }}
                >
                  {post.images.map((img, idx) => (
                    <div key={idx} style={{ aspectRatio: "1", backgroundColor: "#f0f0f0", borderRadius: "8px", overflow: "hidden" }}>
                      <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              )}

              {/* 点赞/收藏/评论/分享操作栏 */}
              <div style={{ display: "flex", justifyContent: "space-around", paddingTop: "12px", borderTop: "1px solid #f0f0f0" }}>
                <button
                  onClick={handleLike}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none",
                    fontSize: "14px", color: post.liked ? BRAND : "#999", cursor: "pointer", padding: "4px 8px",
                  }}
                >
                  <span>{post.liked ? "❤️" : "🤍"}</span>
                  <span>{post.likes || 0}</span>
                </button>
                <button
                  onClick={handleFavorite}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none",
                    fontSize: "14px", color: faved ? "#f5a623" : "#999", cursor: "pointer", padding: "4px 8px",
                  }}
                >
                  <span>{faved ? "★" : "☆"}</span>
                  <span>{faved ? "已藏" : "收藏"}</span>
                </button>
                <button
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>(".comment-input");
                    input?.focus();
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none",
                    fontSize: "14px", color: "#999", cursor: "pointer", padding: "4px 8px",
                  }}
                >
                  <span>💬</span>
                  <span>{post.comments || 0}</span>
                </button>
                <button
                  onClick={handleShare}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none",
                    fontSize: "14px", color: "#999", cursor: "pointer", padding: "4px 8px",
                  }}
                >
                  <span>↗️</span>
                  <span>分享</span>
                </button>
              </div>
            </div>

            {/* P9-首发裁剪：评论区隐藏 */}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>动态不存在或已被删除</div>
        )}
      </div>

      {/* 举报面板 */}
      {showReport && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowReport(false)}
        >
          <div
            className="w-full report-panel"
            style={{ maxWidth: "420px", backgroundColor: "#fff", borderRadius: "16px 16px 0 0", maxHeight: "85vh", overflowY: "auto", paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "14px 16px 6px", fontSize: "15px", fontWeight: 600, color: "#333" }}>举报{reportTarget?.type === "comment" ? "评论" : "动态"}</div>
            <div style={{ padding: "0 16px 8px", fontSize: "11px", color: "#999" }}>请选择举报原因，平台将尽快核实处理</div>
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => handleReport(reason)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", background: "none", border: "none", borderBottom: "1px solid #f5f5f5", fontSize: "14px", color: "#444" }}
              >
                {reason}
              </button>
            ))}
            <button
              onClick={() => setShowReport(false)}
              style={{ display: "block", width: "100%", padding: "12px", background: "none", border: "none", fontSize: "14px", color: "#999" }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 轻提示 */}
      {toast && (
        <div
          style={{
            position: "fixed", left: "50%", top: "45%", transform: "translate(-50%,-50%)", zIndex: 200,
            backgroundColor: "rgba(0,0,0,0.75)", color: "#fff", padding: "10px 18px", borderRadius: "10px",
            fontSize: "13px", pointerEvents: "none", maxWidth: "80%", textAlign: "center",
          }}
        >
          {toast}
        </div>
      )}

      {/* P9-首发裁剪：底部评论输入框隐藏 */}

      {/* 底部免责声明 */}
      <div style={{ padding: "12px 16px", textAlign: "center", fontSize: "11px", color: "#bbb", backgroundColor: "#ededed" }}>
        本页面内容由用户生成，仅供参考，不代表平台观点
      </div>
    </div>
  );
}
