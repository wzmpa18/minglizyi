"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { getPosts, type Post } from "@/lib/socialStore";
import { getUserProfile } from "@/lib/auth";
import { getCurrentUserId } from "@/lib/userStore";
import { TAG_COLORS } from "@/lib/feedTags";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

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

export default function MyMomentsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const profile = getUserProfile();
    const uid = profile?.userId || getCurrentUserId();
    const mine = getPosts().filter((p) => p.authorId === uid);
    mine.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setPosts(mine);
    setLoaded(true);
  }, []);

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
  <PageLoginGuard />
      <BrandHeader title="我的动态" showBack />

      <div className="px-3 py-3 pb-24">
        {!loaded ? (
          <div className="py-16 text-center text-sm text-gray-400">加载中...</div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="mt-3 text-sm text-gray-400">还没有发布过动态</p>
            <button
              onClick={() => router.push("/discover")}
              className="mt-4 rounded-full px-5 py-2 text-xs font-semibold text-white active:opacity-80"
              style={{ backgroundColor: BRAND }}
            >
              去广场逛逛
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {posts.map((p) => (
              <div key={p.id} className="rounded-xl bg-white p-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: BRAND }}
                  >
                    {p.authorAvatar || p.authorName.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{p.authorName}</span>
                      <span className="text-[10px] text-gray-400">{formatTime(p.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-700 line-clamp-4">{p.content}</p>
                    {Array.isArray(p.tags) && p.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.tags.map((t) => {
                          const c = TAG_COLORS[t];
                          return (
                            <span
                              key={t}
                              className="rounded-full px-2 py-0.5 text-[10px]"
                              style={{ backgroundColor: c?.bg || "#f5f5f5", color: c?.fg || "#999" }}
                            >
                              #{t}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-2 flex gap-4 text-xs text-gray-400">
                      <span>点赞 {p.likes}</span>
                      <span>评论 {p.comments}</span>
                      <span>分享 {p.shares}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
