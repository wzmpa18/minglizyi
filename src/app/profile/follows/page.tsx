"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { getFollowingList, getUserById, toggleFollowUser } from "@/lib/userStore";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

export default function FollowsPage() {
  const router = useRouter();
  const [list, setList] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setList(getFollowingList());
    setLoaded(true);
  }, []);

  const handleUnfollow = (id: string) => {
    toggleFollowUser(id);
    setList(getFollowingList());
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
  <PageLoginGuard />
      <BrandHeader title="我的关注" showBack />

      <div className="px-3 py-3 pb-24">
        {!loaded ? (
          <div className="py-16 text-center text-sm text-gray-400">加载中...</div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p className="mt-3 text-sm text-gray-400">还没有关注任何用户</p>
            <button
              onClick={() => router.push("/discover")}
              className="mt-4 rounded-full px-5 py-2 text-xs font-semibold text-white active:opacity-80"
              style={{ backgroundColor: BRAND }}
            >
              去广场发现同好
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            {list.map((id, idx) => {
              const u = getUserById(id);
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: idx === list.length - 1 ? "none" : "1px solid #f5f5f5" }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: BRAND }}
                  >
                    {u?.avatar || u?.nickname?.slice(0, 1) || id.slice(0, 1)}
                  </div>
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => router.push(`/user?uid=${encodeURIComponent(id)}`)}
                  >
                    <p className="truncate text-sm font-semibold text-gray-800">{u?.nickname || id}</p>
                    <p className="text-xs text-gray-400 font-mono">ID: {id}</p>
                  </button>
                  <button
                    onClick={() => handleUnfollow(id)}
                    className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium text-gray-500 active:bg-gray-50"
                    style={{ borderColor: "#e5e5e5" }}
                  >
                    取消关注
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
