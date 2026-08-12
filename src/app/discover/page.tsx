"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import {
  getQualityPosts,
  getIndustryNews,
  getCachedPosts,
  setCachedPosts,
  type QualityPost,
  type NewsItem,
  type NewsCategory,
  // 视频外链聚合
  getVideos,
  addVideo,
  getLikedVideos,
  toggleVideoLike,
  getFavoritedVideos,
  toggleVideoFavorite,
  getVideoComments,
  addVideoComment,
  parseVideoLink,
  checkVideoContent,
  reportVideo,
  type VideoItem,
  type VideoComment,
} from "@/lib/discoverService";
import {
  getPosts,
  savePosts,
  addPost,
  getLikedPosts,
  toggleLikePost,
  filterSensitive,
  addComment,
  getComments,
  toggleFollow,
  getFollows,
  type Post as StorePost,
  type Comment,
} from "@/lib/socialStore";
import { getUserProfile } from "@/lib/auth";
import { getCurrentUser } from "@/lib/loginService";
import { communityActivity } from "@/lib/pointsStore";
import { getMembershipStatus } from "@/lib/membershipStore";
import { callAI } from "@/lib/aiService";
import NewsCard from "@/components/NewsCard";
import { ShareButton } from "@/components/ShareButton";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";

const BRAND = "#7B2FBE";

type TabType = "internal" | "news" | "video";

// ==================== 时间格式化 ====================
function formatTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = now - t;
  if (diff < 0) return "刚刚";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}分钟前`;
  const hour = Math.floor(diff / 3600000);
  if (hour < 24) return `${hour}小时前`;
  const day = Math.floor(diff / 86400000);
  if (day < 30) return `${day}天前`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// ==================== 头像组件 ====================
function PostAvatar({ text }: { text: string }) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold"
      style={{ backgroundColor: BRAND, fontSize: "16px" }}
    >
      {text}
    </div>
  );
}

// ==================== 发布面板 ====================
function PublishPanel({
  onClose,
  onPublish,
}: {
  onClose: () => void;
  onPublish: (content: string) => void;
}) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handlePublish = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onPublish(trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-white shadow-xl"
        style={{ maxWidth: "420px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <button onClick={onClose} className="text-sm text-gray-500">取消</button>
          <h2 className="text-base font-bold text-gray-800">发布动态</h2>
          <div className="w-8" />
        </div>
        <div className="p-5">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="分享你的易学/中医学习心得..."
            className="w-full h-36 resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
            maxLength={500}
          />
          <p className="mt-1 text-right text-xs text-gray-400">{text.length}/500</p>
        </div>
        <div className="p-5">
          <button
            onClick={handlePublish}
            disabled={!text.trim()}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-[0.98]"
            style={{
              backgroundColor: text.trim() ? BRAND : "#ddd",
              cursor: text.trim() ? "pointer" : "not-allowed",
            }}
          >
            发布
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 视频提交面板 ====================
function VideoSubmitPanel({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (url: string, title: string, description: string) => string | null;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const urlRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    urlRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const u = url.trim();
    const t = title.trim();
    if (!u) { setError("请输入视频链接"); return; }
    if (!t) { setError("请填写视频标题"); return; }
    setError("");
    const errMsg = onSubmit(u, t, description.trim());
    if (errMsg) {
      setError(errMsg);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-white shadow-xl"
        style={{ maxWidth: "420px", maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sticky top-0 bg-white">
          <button onClick={onClose} className="text-sm text-gray-500">取消</button>
          <h2 className="text-base font-bold text-gray-800">提交学习视频</h2>
          <div className="w-8" />
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">视频链接 *</label>
            <textarea
              ref={urlRef}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="粘贴B站或西瓜视频的公开链接，如：https://www.bilibili.com/video/BVxxxx"
              className="w-full h-20 resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-gray-400">仅支持B站(bilibili.com)和西瓜视频(ixigua.com)公开链接</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">视频标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="为视频起一个标题"
              maxLength={50}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">简介（选填）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简单介绍视频内容，如学习要点、适用人群等"
              maxLength={200}
              className="w-full h-20 resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <div className="rounded-lg bg-amber-50 px-3 py-2">
            <p className="text-[11px] leading-relaxed text-amber-700">
              版权声明：请仅提交公开可访问的学习视频。视频内容版权归原平台及作者所有，本应用仅做链接聚合展示，不存储任何视频内容。如发现侵权内容，可点击举报按钮。
            </p>
          </div>
        </div>
        <div className="p-5 sticky bottom-0 bg-white border-t border-gray-100">
          <button
            onClick={handleSubmit}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-[0.98]"
            style={{ backgroundColor: BRAND }}
          >
            提交
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 视频卡片组件 ====================
function VideoCard({
  video,
  liked,
  favorited,
  comments,
  commentText,
  showComments,
  onLike,
  onFavorite,
  onToggleComments,
  onComment,
  onCommentChange,
  onReport,
}: {
  video: VideoItem;
  liked: boolean;
  favorited: boolean;
  comments: VideoComment[];
  commentText: string;
  showComments: boolean;
  onLike: () => void;
  onFavorite: () => void;
  onToggleComments: () => void;
  onComment: () => void;
  onCommentChange: (text: string) => void;
  onReport: () => void;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      {/* 提交者信息 */}
      <div className="flex items-center gap-3">
        <PostAvatar text={video.authorAvatar || video.author.slice(0, 1)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{video.author}</p>
          <p className="text-xs text-gray-400">{formatTime(video.createdAt)}</p>
        </div>
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: video.platform === "bilibili" ? "#FB7299" : "#FF6B35" }}
        >
          {video.platform === "bilibili" ? "B站" : "西瓜视频"}
        </span>
      </div>

      {/* 标题与简介 */}
      <div className="mt-3">
        <h3 className="text-sm font-bold text-gray-800 leading-snug">{video.title}</h3>
        {video.description && (
          <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">{video.description}</p>
        )}
      </div>

      {/* 嵌入播放器 */}
      <div className="mt-3 overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "16/9" }}>
        {playing ? (
          <iframe
            src={video.embedUrl}
            className="h-full w-full"
            allowFullScreen
            scrolling="no"
            frameBorder="0"
            sandbox="allow-scripts allow-same-origin allow-popups"
            title={video.title}
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="flex h-full w-full items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full transition-transform active:scale-90"
              style={{ backgroundColor: "rgba(123,47,190,0.85)" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <polygon points="6 4 20 12 6 20" />
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* 来源标注 */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">来源：{video.sourceLabel} · 由 @{video.author} 分享</span>
        <button
          onClick={onReport}
          className="text-[11px] text-gray-400 underline active:opacity-70"
        >
          侵权举报
        </button>
      </div>

      {/* 操作栏 */}
      <div className="mt-2 flex items-center gap-5 border-t border-gray-100 pt-3">
        <button
          onClick={onLike}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: liked ? "#e53935" : "#999" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{video.likes}</span>
        </button>
        <button
          onClick={onFavorite}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: favorited ? "#FFA000" : "#999" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span>{video.favorites}</span>
        </button>
        <button
          onClick={onToggleComments}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: showComments ? BRAND : "#999" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{video.comments}</span>
        </button>
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-gray-400 ml-auto active:opacity-70"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span>原链接</span>
        </a>
      </div>

      {/* 评论区 */}
      {showComments && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs" style={{ backgroundColor: BRAND }}>
                {c.authorAvatar || c.authorName.slice(0, 1)}
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">{c.authorName}</p>
                <p className="text-sm text-gray-700 mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">暂无评论，快来抢沙发~</p>
          )}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => onCommentChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onComment();
                }
              }}
              placeholder="写评论..."
              maxLength={200}
              className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:outline-none"
            />
            <button
              onClick={onComment}
              disabled={!commentText.trim()}
              className="rounded-full px-4 py-2 text-xs font-medium text-white transition-all"
              style={{
                backgroundColor: commentText.trim() ? BRAND : "#ddd",
                cursor: commentText.trim() ? "pointer" : "not-allowed",
              }}
            >
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 主页面 ====================
export default function DiscoverPage() {
  const router = useRouter();
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  // Tab 状态
  const [activeTab, setActiveTab] = useState<TabType>("internal");

  // 站内动态状态
  const [posts, setPosts] = useState<QualityPost[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [postPage, setPostPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 行业资讯状态
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsPage, setNewsPage] = useState(1);
  const [hasMoreNews, setHasMoreNews] = useState(false);
  const [newsError, setNewsError] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsCategory, setNewsCategory] = useState<NewsCategory | "all">("all");

  // 学习视频状态
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videoLiked, setVideoLiked] = useState<Set<string>>(new Set());
  const [videoFavorited, setVideoFavorited] = useState<Set<string>>(new Set());
  const [videoCommentsMap, setVideoCommentsMap] = useState<Record<string, VideoComment[]>>({});
  const [videoCommentText, setVideoCommentText] = useState("");
  const [activeCommentVideo, setActiveCommentVideo] = useState<string | null>(null);
  const [showVideoSubmit, setShowVideoSubmit] = useState(false);

  // 通用状态
  const [showPublish, setShowPublish] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState("");
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [aiComments, setAiComments] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  // ==================== 加载站内动态 ====================
  const loadPosts = useCallback((page: number, refresh: boolean) => {
    setRefreshing(refresh);
    const { posts: newPosts, hasMore } = getQualityPosts(page, 20);

    if (refresh) {
      setPosts(newPosts);
      setCachedPosts(newPosts);
    } else {
      setPosts((prev) => [...prev, ...newPosts]);
    }

    setHasMorePosts(hasMore);
    setPostPage(page);

    // 加载评论
    const allComments: Record<string, Comment[]> = {};
    newPosts.forEach((p) => {
      allComments[p.id] = getComments(p.id);
    });
    setCommentsMap((prev) => (refresh ? allComments : { ...prev, ...allComments }));

    setLiked(getLikedPosts());
    setFollows(new Set(getFollows()));
    setRefreshing(false);
  }, []);

  // ==================== 加载行业资讯（含错误降级，支持分类过滤） ====================
  const loadNews = useCallback((page: number, refresh: boolean, category?: NewsCategory | "all") => {
    setNewsLoading(true);
    setNewsError(false);
    try {
      const cat = category ?? newsCategory;
      const { news: newNews, hasMore } = getIndustryNews(page, 20, cat);
      if (refresh) {
        setNews(newNews);
      } else {
        setNews((prev) => [...prev, ...newNews]);
      }
      setHasMoreNews(hasMore);
      setNewsPage(page);
    } catch {
      setNewsError(true);
    } finally {
      setNewsLoading(false);
    }
  }, [newsCategory]);

  // ==================== 加载学习视频 ====================
  const loadVideos = useCallback(() => {
    const list = getVideos();
    setVideos(list);
    setVideoLiked(getLikedVideos());
    setVideoFavorited(getFavoritedVideos());
    const allComments: Record<string, VideoComment[]> = {};
    list.forEach((v) => {
      allComments[v.id] = getVideoComments(v.id);
    });
    setVideoCommentsMap(allComments);
  }, []);

  // ==================== 初始化 ====================
  useEffect(() => {
    // 加载本地存储的动态数据（无数据则显示空状态）
    const storePosts = getPosts();

    // 先尝试加载缓存（提升二次打开速度）
    const cached = getCachedPosts();
    if (cached && cached.length > 0) {
      setPosts(cached);
      setLiked(getLikedPosts());
      setFollows(new Set(getFollows()));
    } else if (storePosts.length > 0) {
      // 将 Post 转换为 QualityPost，补充默认 qualityScore
      setPosts(storePosts.map(p => ({ ...p, qualityScore: 0 })));
      setLiked(getLikedPosts());
      setFollows(new Set(getFollows()));
    }

    // 加载最新数据
    loadPosts(1, true);

    const membership = getMembershipStatus();
    setIsMember(membership.isActive && membership.level !== "basic");
  }, [loadPosts]);

  // 下载APP Banner 已移除 - 用户通过分享海报二维码下载APP

  // ==================== Tab 切换 ====================
  const handleTabSwitch = (tab: TabType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (tab === "news" && news.length === 0 && !newsError) {
      loadNews(1, true);
    }
    if (tab === "video") {
      loadVideos();
    }
  };

  // ==================== 资讯分类切换 ====================
  const handleNewsCategoryChange = (cat: NewsCategory | "all") => {
    if (cat === newsCategory) return;
    setNewsCategory(cat);
    setNews([]);
    setNewsPage(1);
    setHasMoreNews(false);
    loadNews(1, true, cat);
  };

  // ==================== 视频点赞 ====================
  const handleVideoLike = useCallback((videoId: string) => {
    const nowLiked = toggleVideoLike(videoId);
    setVideoLiked((prev) => {
      const next = new Set(prev);
      if (nowLiked) next.add(videoId);
      else next.delete(videoId);
      return next;
    });
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === videoId) {
          return { ...v, liked: nowLiked, likes: nowLiked ? v.likes + 1 : v.likes - 1 };
        }
        return v;
      })
    );
  }, []);

  // ==================== 视频收藏 ====================
  const handleVideoFavorite = useCallback((videoId: string) => {
    const nowFav = toggleVideoFavorite(videoId);
    setVideoFavorited((prev) => {
      const next = new Set(prev);
      if (nowFav) next.add(videoId);
      else next.delete(videoId);
      return next;
    });
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === videoId) {
          return { ...v, favorited: nowFav, favorites: nowFav ? v.favorites + 1 : v.favorites - 1 };
        }
        return v;
      })
    );
  }, []);

  // ==================== 视频评论 ====================
  const handleVideoComment = useCallback(
    (videoId: string) => {
      const text = videoCommentText.trim();
      if (!text) return;
      const user = getCurrentUser();
      const comment: VideoComment = {
        id: `vc_${Date.now()}`,
        videoId,
        authorId: user?.userId || "anonymous",
        authorName: user?.nickname || "言道用户",
        authorAvatar: user?.avatar || "",
        content: filterSensitive(text).filtered,
        createdAt: new Date().toISOString(),
      };
      addVideoComment(comment);
      setVideoCommentsMap((prev) => ({
        ...prev,
        [videoId]: [...(prev[videoId] || []), comment],
      }));
      setVideoCommentText("");
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, comments: v.comments + 1 } : v))
      );
    },
    [videoCommentText]
  );

  // ==================== 视频侵权举报 ====================
  const handleVideoReport = useCallback((videoId: string) => {
    reportVideo(videoId);
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  }, []);

  // ==================== 提交学习视频 ====================
  const handleVideoSubmit = useCallback(
    (url: string, title: string, description: string): string | null => {
    // 解析链接
    const parseResult = parseVideoLink(url);
    if (!parseResult.valid || !parseResult.platform || !parseResult.embedUrl || !parseResult.sourceLabel) {
      return parseResult.error || "链接解析失败，请检查链接是否正确";
    }
    // 检查标题/简介
    const contentCheck = checkVideoContent(title, description);
    if (!contentCheck.valid) {
      return contentCheck.error || "内容包含违规信息";
    }
    const user = getCurrentUser();
    const newVideo: VideoItem = {
      id: `vid_${Date.now()}`,
      url,
      platform: parseResult.platform,
      videoId: parseResult.videoId || "",
      embedUrl: parseResult.embedUrl,
      title,
      description,
      author: user?.nickname || "言道用户",
      authorId: user?.userId || "anonymous",
      authorAvatar: user?.avatar || (user?.nickname || "言").slice(0, 1),
      sourceLabel: parseResult.sourceLabel,
      likes: 0,
      favorites: 0,
      comments: 0,
      liked: false,
      favorited: false,
      createdAt: new Date().toISOString(),
    };
    addVideo(newVideo);
    setVideos((prev) => [newVideo, ...prev]);
    setVideoCommentsMap((prev) => ({ ...prev, [newVideo.id]: [] }));
    try {
      communityActivity("提交学习视频");
    } catch {}
    return null;
    },
    []
  );

  // ==================== 点赞 ====================
  const handleLike = useCallback((postId: string) => {
    const nowLiked = toggleLikePost(postId);
    setLiked((prev) => {
      const next = new Set(prev);
      if (nowLiked) next.add(postId);
      else next.delete(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return { ...p, liked: nowLiked, likes: nowLiked ? p.likes + 1 : p.likes - 1 };
        }
        return p;
      })
    );
  }, []);

  // ==================== AI点评动态 ====================
  const handleAIComment = useCallback(async (postId: string, postContent: string) => {
    if (!requireLogin()) return;
    if (aiLoading) return;
    setAiLoading(postId);
    try {
      const prompt = `作为国学易学社区的AI助手，请对以下用户动态进行简短点评（50-100字），要求：
1. 肯定用户的学习热情
2. 补充相关知识或见解
3. 鼓励继续分享
4. 语气亲切自然，如师友交流
5. 末尾附加免责声明：以上AI点评仅供学习参考

用户动态内容：${postContent}`;

      const result = await callAI({
        userPrompt: prompt,
        forceRefresh: true,
      });
      if (result && result.success && result.content) {
        setAiComments((prev) => ({ ...prev, [postId]: result.content }));
      } else {
        setAiComments((prev) => ({ ...prev, [postId]: "AI点评暂时不可用，请稍后再试~" }));
      }
    } catch (e) {
      console.error("AI点评失败:", e);
      setAiComments((prev) => ({ ...prev, [postId]: "AI点评暂时不可用，请稍后再试~" }));
    } finally {
      setAiLoading(null);
    }
  }, [aiLoading]);

  // ==================== 评论 ====================
  const handleComment = useCallback(
    (postId: string) => {
      const text = commentText.trim();
      if (!text) return;
      const user = getCurrentUser();
      const comment: Comment = {
        id: `c_${Date.now()}`,
        postId,
        authorId: user?.userId || "anonymous",
        authorName: user?.nickname || "言道用户",
        authorAvatar: user?.avatar || "",
        content: filterSensitive(text).filtered,
        createdAt: new Date().toISOString(),
      };
      addComment(comment);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment],
      }));
      setCommentText("");
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: p.comments + 1 } : p))
      );
    },
    [commentText]
  );

  // ==================== 关注 ====================
  const handleFollow = useCallback((userId: string) => {
    const nowFollowed = toggleFollow(userId);
    setFollows((prev) => {
      const next = new Set(prev);
      if (nowFollowed) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  const toggleComments = useCallback((postId: string) => {
    setActiveCommentPost((prev) => {
      // 切换到不同帖子时清空评论输入框
      if (prev !== postId) {
        setCommentText("");
      }
      return prev === postId ? null : postId;
    });
  }, []);

  // ==================== 发布动态 ====================
  const handlePublish = useCallback((content: string) => {
    const { filtered } = filterSensitive(content);
    const user = getUserProfile();
    const newPost: QualityPost = {
      id: `user_${Date.now()}`,
      authorId: user?.userId || "anonymous",
      authorName: user?.nickname || "言道用户",
      authorAvatar: user?.avatar || "",
      content: filtered,
      images: [],
      topic: "",
      likes: 0,
      comments: 0,
      shares: 0,
      liked: false,
      isAd: false,
      createdAt: new Date().toISOString(),
      qualityScore: 0,
    };
    addPost(newPost);
    setPosts((prev) => [newPost, ...prev]);
    try {
      communityActivity("发布动态");
    } catch {}
  }, []);

  // ==================== 搜索过滤 ====================
  const filteredPosts = posts.filter((p) => {
    if (!searchQuery) return true;
    return p.authorName.includes(searchQuery) || p.content.includes(searchQuery);
  });

  // ==================== 渲染 ====================
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#f5f5f5", maxWidth: "420px", margin: "0 auto", paddingBottom: "72px" }}
    >
      <BrandHeader title="发现" />

      {/* 附近用户入口 */}
      <div className="flex gap-2 px-3 pt-3 overflow-x-auto" style={{ marginBottom: "0" }}>
        <button
          onClick={() => router.push("/friends?mode=nearby")}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors active:opacity-80"
          style={{
            backgroundColor: "#f0e6f6",
            border: "1px solid #7B2FBE",
            color: "#7B2FBE",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          附近用户
        </button>
      </div>

      {/* Tab 切换栏 */}
      <div className="sticky top-0 z-40 flex border-b border-gray-200 bg-white mt-2">
        <button
          onClick={() => handleTabSwitch("internal")}
          className="flex-1 py-3 text-sm font-semibold transition-colors relative"
          style={{ color: activeTab === "internal" ? BRAND : "#999" }}
        >
          站内动态
          {activeTab === "internal" && (
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
              style={{ width: "40px", backgroundColor: BRAND }}
            />
          )}
        </button>
        <button
          onClick={() => handleTabSwitch("news")}
          className="flex-1 py-3 text-sm font-semibold transition-colors relative"
          style={{ color: activeTab === "news" ? BRAND : "#999" }}
        >
          行业资讯
          {activeTab === "news" && (
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
              style={{ width: "40px", backgroundColor: BRAND }}
            />
          )}
        </button>
        <button
          onClick={() => handleTabSwitch("video")}
          className="flex-1 py-3 text-sm font-semibold transition-colors relative"
          style={{ color: activeTab === "video" ? BRAND : "#999" }}
        >
          学习视频
          {activeTab === "video" && (
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
              style={{ width: "40px", backgroundColor: BRAND }}
            />
          )}
        </button>
      </div>

      {/* ==================== Tab 1: 站内动态 ==================== */}
      {activeTab === "internal" && (
        <>
          {/* 搜索 + 发布 + 刷新栏 */}
          <div
            className="sticky top-[41px] z-30 flex items-center gap-2 px-4 py-2"
            style={{ backgroundColor: BRAND }}
          >
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索动态..."
                className="w-full rounded-full bg-white/20 py-2 pl-10 pr-4 text-sm text-white placeholder-white/60 focus:outline-none"
              />
            </div>
            <button
              onClick={() => {
                if (!requireLogin()) return;
                router.push("/discover/create");
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-md active:scale-95 transition-transform"
              style={{ color: BRAND }}
              title="发布动态"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              onClick={() => loadPosts(1, true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20"
              title="刷新"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshing ? "animate-spin" : ""}
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>

          {/* 动态列表 */}
          <div className="px-3 py-3 space-y-3">
            {filteredPosts.map((post) => (
              <div key={post.id} className="rounded-xl bg-white p-4 shadow-sm">
                {/* 用户信息 */}
                <div className="flex items-center gap-3">
                  <PostAvatar text={post.authorAvatar || post.authorName.slice(0, 1)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{post.authorName}</p>
                    <p className="text-xs text-gray-400">{formatTime(post.createdAt)}</p>
                  </div>
                  {post.authorId !== "system" && (
                    <button
                      onClick={() => handleFollow(post.authorId)}
                      className="rounded-full px-3 py-1 text-xs font-medium transition-all"
                      style={{
                        backgroundColor: follows.has(post.authorId) ? "#f0f0f0" : BRAND,
                        color: follows.has(post.authorId) ? "#999" : "#fff",
                      }}
                    >
                      {follows.has(post.authorId) ? "已关注" : "+关注"}
                    </button>
                  )}
                </div>

                {/* 内容 */}
                <div
                  onClick={() => router.push(`/discover/${post.id}`)}
                  className="cursor-pointer"
                >
                  <p className="mt-3 text-sm leading-relaxed text-gray-700">{post.content}</p>
                </div>

                {/* 操作栏 */}
                <div className="mt-3 flex items-center gap-5 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: liked.has(post.id) ? "#e53935" : "#999" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={liked.has(post.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span>{post.likes}</span>
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: activeCommentPost === post.id ? BRAND : "#999" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>{post.comments}</span>
                  </button>
                  <ShareButton
                    type="post"
                    title={post.content.slice(0, 50)}
                    description={post.content}
                    url={typeof window !== "undefined" ? `${window.location.origin}/discover/${post.id}` : ""}
                    label={String(post.shares)}
                  />
                  <button
                    onClick={() => handleAIComment(post.id, post.content)}
                    disabled={aiLoading === post.id}
                    className="flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: aiComments[post.id] ? BRAND : "#999" }}
                  >
                    <span style={{ fontSize: "14px" }}>{aiLoading === post.id ? "⏳" : "🤖"}</span>
                    <span>{aiLoading === post.id ? "AI点评中" : "AI点评"}</span>
                  </button>
                </div>

                {/* AI点评结果 */}
                {aiComments[post.id] && (
                  <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: "#f3e8ff", border: `1px solid ${BRAND}30` }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span style={{ fontSize: "14px" }}>🤖</span>
                      <span className="text-xs font-semibold" style={{ color: BRAND }}>AI智能点评</span>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-700" style={{ whiteSpace: "pre-wrap" }}>{aiComments[post.id]}</p>
                  </div>
                )}

                {/* 评论区 */}
                {activeCommentPost === post.id && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    {(commentsMap[post.id] || []).map((c) => (
                      <div key={c.id} className="flex gap-2 py-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs" style={{ backgroundColor: BRAND }}>
                          {c.authorAvatar || c.authorName.slice(0, 1)}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">{c.authorName}</p>
                          <p className="text-sm text-gray-700 mt-0.5">{c.content}</p>
                        </div>
                      </div>
                    ))}
                    {(commentsMap[post.id] || []).length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">暂无评论，快来抢沙发~</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleComment(post.id);
                          }
                        }}
                        placeholder="写评论..."
                        maxLength={200}
                        className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:outline-none"
                      />
                      <button
                        onClick={() => handleComment(post.id)}
                        disabled={!commentText.trim()}
                        className="rounded-full px-4 py-2 text-xs font-medium text-white transition-all"
                        style={{
                          backgroundColor: commentText.trim() ? BRAND : "#ddd",
                          cursor: commentText.trim() ? "pointer" : "not-allowed",
                        }}
                      >
                        发送
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 加载更多 */}
            {hasMorePosts && (
              <button
                onClick={() => loadPosts(postPage + 1, false)}
                className="w-full rounded-xl bg-white py-3 text-sm text-gray-500 shadow-sm"
              >
                加载更多
              </button>
            )}
            {!hasMorePosts && filteredPosts.length > 0 && (
              <p className="text-center text-xs text-gray-400 py-4">没有更多了~</p>
            )}
            {filteredPosts.length === 0 && (
              <div className="text-center py-16">
                <p className="text-sm text-gray-400">暂无动态</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== Tab 2: 行业资讯 ==================== */}
      {activeTab === "news" && (
        <>
          {/* 合规提示 */}
          <div
            className="mx-3 mt-3 rounded-lg px-4 py-2.5 text-xs leading-relaxed"
            style={{ backgroundColor: "#FFF8E1", color: "#8D6E63" }}
          >
            本站资讯均来自公开网络聚合，版权归原作者所有，如有侵权请联系删除。点击资讯可跳转至原始来源网页查看全文。
          </div>

          {/* 资讯分类切换 */}
          <div className="flex gap-2 px-3 py-3 overflow-x-auto">
            {([
              { key: "all", label: "全部" },
              { key: "zhongyi", label: "中医" },
              { key: "yixue", label: "易学" },
            ] as const).map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleNewsCategoryChange(cat.key)}
                className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: newsCategory === cat.key ? BRAND : "#f0f0f0",
                  color: newsCategory === cat.key ? "#fff" : "#666",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 资讯列表 */}
          <div className="px-3 space-y-3 pb-3">
            {news.map((item) => (
              <NewsCard
                key={item.id}
                title={item.title}
                summary={item.summary}
                source={item.source}
                sourceUrl={item.sourceUrl}
                publishedAt={item.publishedAt}
                category={item.category}
              />
            ))}

            {/* 加载更多 */}
            {hasMoreNews && !newsError && (
              <button
                onClick={() => loadNews(newsPage + 1, false)}
                className="w-full rounded-xl bg-white py-3 text-sm text-gray-500 shadow-sm"
              >
                加载更多
              </button>
            )}
            {!hasMoreNews && news.length > 0 && !newsError && (
              <p className="text-center text-xs text-gray-400 py-4">没有更多资讯了~</p>
            )}

            {/* 错误降级占位 */}
            {newsError && (
              <div className="text-center py-16">
                <p className="text-sm text-gray-400">暂无资讯，稍后刷新</p>
                <button
                  onClick={() => loadNews(1, true)}
                  className="mt-3 rounded-full px-6 py-2 text-sm text-white"
                  style={{ backgroundColor: BRAND }}
                >
                  刷新
                </button>
              </div>
            )}

            {/* 加载中 */}
            {newsLoading && news.length === 0 && !newsError && (
              <div className="text-center py-16">
                <p className="text-sm text-gray-400">加载中...</p>
              </div>
            )}

            {/* 空状态 */}
            {!newsLoading && news.length === 0 && !newsError && (
              <div className="text-center py-16">
                <p className="text-sm text-gray-400">暂无资讯，稍后刷新</p>
                <button
                  onClick={() => loadNews(1, true)}
                  className="mt-3 rounded-full px-6 py-2 text-sm text-white"
                  style={{ backgroundColor: BRAND }}
                >
                  刷新
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== Tab 3: 学习视频 ==================== */}
      {activeTab === "video" && (
        <>
          {/* 合规提示 */}
          <div
            className="mx-3 mt-3 rounded-lg px-4 py-2.5 text-xs leading-relaxed"
            style={{ backgroundColor: "#FFF8E1", color: "#8D6E63" }}
          >
            视频内容版权归原平台及作者所有，本应用仅做链接聚合展示，不存储任何视频内容。如发现侵权内容，请点击「侵权举报」。
          </div>

          {/* 提交视频按钮 */}
          <div className="px-3 py-3">
            <button
              onClick={() => setShowVideoSubmit(true)}
              className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ backgroundColor: BRAND }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              提交学习视频
            </button>
          </div>

          {/* 视频列表 */}
          <div className="px-3 space-y-3 pb-3">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                liked={videoLiked.has(video.id)}
                favorited={videoFavorited.has(video.id)}
                comments={videoCommentsMap[video.id] || []}
                commentText={activeCommentVideo === video.id ? videoCommentText : ""}
                showComments={activeCommentVideo === video.id}
                onLike={() => handleVideoLike(video.id)}
                onFavorite={() => handleVideoFavorite(video.id)}
                onToggleComments={() =>
                  setActiveCommentVideo((prev) => (prev === video.id ? null : video.id))
                }
                onComment={() => handleVideoComment(video.id)}
                onCommentChange={setVideoCommentText}
                onReport={() => {
                  if (confirm("确定要举报该视频侵权吗？举报后该视频将从列表中移除。")) {
                    handleVideoReport(video.id);
                  }
                }}
              />
            ))}

            {/* 空状态 */}
            {videos.length === 0 && (
              <div className="text-center py-16">
                <svg
                  className="mx-auto mb-3"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ccc"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <p className="text-sm text-gray-400">还没有学习视频</p>
                <p className="mt-1 text-xs text-gray-400">点击上方按钮，分享优质的B站/西瓜视频学习资源</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* 免责声明 */}
      <div className="px-4 pb-4">
        <p className="text-center text-xs text-gray-400">
          内容仅供学习交流，不构成任何决策建议。
        </p>
      </div>

      {/* 发布面板 */}
      {showPublish && (
        <PublishPanel
          onClose={() => setShowPublish(false)}
          onPublish={handlePublish}
        />
      )}

      {/* 视频提交面板 */}
      {showVideoSubmit && (
        <VideoSubmitPanel
          onClose={() => setShowVideoSubmit(false)}
          onSubmit={handleVideoSubmit}
        />
      )}

      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  );
}
