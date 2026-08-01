"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

const BRAND = "#7B2FBE";

// ==================== 类型定义 ====================
interface Post {
  id: string;
  avatar: string;
  nickname: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  isAd?: boolean;
}

// ==================== 模拟数据 ====================
const MOCK_POSTS: Post[] = [
  {
    id: "p1",
    avatar: "易",
    nickname: "易经行者",
    time: "2小时前",
    content: "今天排了个八字，日主甲木生于申月，官星当令，又有财星生官，整体格局不错，就是身弱了点，需要印星帮扶。大家觉得呢？",
    likes: 12,
    comments: 3,
    shares: 1,
  },
  {
    id: "p2",
    avatar: "🌿",
    nickname: "中医传承人",
    time: "3小时前",
    content: "学习了六经辨证，太阳病篇真的太重要了。《伤寒论》开篇即讲太阳病，因为太阳主表，为六经之藩篱，外邪入侵首犯太阳。",
    likes: 18,
    comments: 5,
    shares: 2,
  },
  {
    id: "ad1",
    avatar: "广",
    nickname: "言道会员",
    time: "推广",
    content: "开通言道会员，解锁高级排盘功能、专属AI问答、名师课程无限观看！新用户首月仅需9.9元。",
    likes: 0,
    comments: 0,
    shares: 0,
    isAd: true,
  },
  {
    id: "p3",
    avatar: "紫",
    nickname: "紫微斗数迷",
    time: "5小时前",
    content: "看了自己紫微命盘，命宫天机坐守，三方会照天梁、太阴。天机化气为善，果然是喜欢思考钻研的命格。迁移宫有禄存，外出发展有利。",
    likes: 15,
    comments: 2,
    shares: 0,
  },
  {
    id: "p4",
    avatar: "📚",
    nickname: "方剂学笔记",
    time: "8小时前",
    content: "分享方剂学习笔记：四君子汤（人参、白术、茯苓、甘草）补气健脾；四物汤（当归、川芎、白芍、熟地）补血调经；合起来就是八珍汤，气血双补！",
    likes: 25,
    comments: 7,
    shares: 4,
  },
];

// ==================== localStorage辅助 ====================
function loadPosts(): Post[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("discover_posts");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function savePosts(posts: Post[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("discover_posts", JSON.stringify(posts)); } catch {}
}
function loadLiked(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("discover_liked");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveLiked(liked: string[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("discover_liked", JSON.stringify(liked)); } catch {}
}

// ==================== 头像组件 ====================
function PostAvatar({ text, isAd }: { text: string; isAd?: boolean }) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold"
      style={{ backgroundColor: isAd ? "#999" : BRAND, fontSize: "16px" }}
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
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <button onClick={onClose} className="text-sm text-gray-500">取消</button>
          <h2 className="text-base font-bold text-gray-800">发布动态</h2>
          <div className="w-8" />
        </div>

        {/* 输入区 */}
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

        {/* 添加图片按钮 */}
        <div className="px-5">
          <button
            className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-400"
            onClick={() => alert("付费会员可发布图片动态，敬请期待！")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            添加图片
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="ml-1 text-xs">付费会员可发布图片动态</span>
          </button>
        </div>

        {/* 发布按钮 */}
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

// ==================== 主页面组件 ====================
export default function DiscoverPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [showPublish, setShowPublish] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const userPosts = loadPosts();
    setPosts([...userPosts, ...MOCK_POSTS]);
    setLiked(loadLiked());
  }, []);

  const handleLike = useCallback((postId: string) => {
    setLiked((prev) => {
      const next = prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId];
      saveLiked(next);
      return next;
    });
    setPosts(prev => prev.map(p => {
      if (p.id === postId && !p.isAd) {
        const isLiked = liked.includes(postId);
        return { ...p, likes: isLiked ? p.likes - 1 : p.likes + 1 };
      }
      return p;
    }));
  }, [liked]);

  const handlePublish = useCallback((content: string) => {
    const newPost: Post = {
      id: `user-${Date.now()}`,
      avatar: "我",
      nickname: "言道用户",
      time: "刚刚",
      content,
      likes: 0,
      comments: 0,
      shares: 0,
    };
    setPosts((prev) => {
      const updated = [newPost, ...prev];
      const userPosts = updated.filter((p) => p.id.startsWith("user-"));
      savePosts(userPosts);
      return updated;
    });
  }, []);

  const filteredPosts = posts.filter(p =>
    !searchQuery ||
    p.nickname.includes(searchQuery) ||
    p.content.includes(searchQuery)
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f5f5", maxWidth: "420px", margin: "0 auto", paddingBottom: "72px" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4"
        style={{ backgroundColor: BRAND, height: "48px" }}
      >
        {/* 搜索栏 */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索动态..."
            className="w-full rounded-full bg-white/20 py-2 pl-10 pr-4 text-sm text-white placeholder-white/60 focus:outline-none"
          />
        </div>
        {/* 发布按钮 */}
        <button
          onClick={() => setShowPublish(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-white shadow-md active:scale-95 transition-transform"
          style={{ color: BRAND }}
          title="发布"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </header>

      {/* 信息流 */}
      <div className="px-3 py-3 space-y-3">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="rounded-xl p-4 shadow-sm"
            style={{ backgroundColor: post.isAd ? "#f9f9f9" : "white" }}
          >
            {/* 推广标签 */}
            {post.isAd && (
              <div className="mb-2">
                <span className="rounded px-1.5 py-0.5 text-[10px] text-gray-400" style={{ border: "1px solid #ddd" }}>推广</span>
              </div>
            )}

            {/* 用户信息 */}
            <div className="flex items-center gap-3">
              <PostAvatar text={post.avatar} isAd={post.isAd} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{post.nickname}</p>
                <p className="text-xs text-gray-400">{post.time}</p>
              </div>
            </div>

            {/* 内容 */}
            <p className="mt-3 text-sm leading-relaxed text-gray-700">{post.content}</p>

            {/* 操作栏 */}
            <div className="mt-3 flex items-center gap-5 border-t border-gray-100 pt-3">
              <button
                onClick={() => !post.isAd && handleLike(post.id)}
                className="flex items-center gap-1.5 text-xs transition-colors"
                style={{ color: liked.includes(post.id) ? "#e53935" : "#999" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={liked.includes(post.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>{post.likes}</span>
              </button>
              <button className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>{post.comments}</span>
              </button>
              <button className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>{post.shares}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

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
    </div>
  );
}
