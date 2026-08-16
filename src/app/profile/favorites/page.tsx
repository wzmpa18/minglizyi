"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { getFavorites, removeFavorite, type FavoriteItem, type FavoriteType } from "@/lib/favoritesStore";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

const TYPE_TABS: { key: FavoriteType | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "paipan", label: "排盘" },
  { key: "interpret", label: "解读" },
  { key: "moment", label: "动态" },
  { key: "video", label: "视频" },
  { key: "other", label: "其他" },
];

export default function FavoritesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<FavoriteType | "all">("all");
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = () => {
    setItems(getFavorites(tab === "all" ? undefined : tab));
    setLoaded(true);
  };

  useEffect(() => {
    reload();
  }, [tab]);

  const handleRemove = (id: string) => {
    removeFavorite(id);
    reload();
  };

  const handleOpen = (item: FavoriteItem) => {
    if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
  <PageLoginGuard />
      <BrandHeader title="我的收藏" showBack />

      {/* 类型筛选栏 */}
      <div className="sticky top-0 z-10 flex gap-2 overflow-x-auto bg-white px-4 py-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
        {TYPE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: tab === t.key ? BRAND : "#f5f5f5",
              color: tab === t.key ? "#fff" : "#666",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-3 py-3 pb-24">
        {!loaded ? (
          <div className="py-16 text-center text-sm text-gray-400">加载中...</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <p className="mt-3 text-sm text-gray-400">暂无收藏内容</p>
            <p className="mt-1 text-xs text-gray-400">排盘结果、AI 解读、动态均可收藏</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl bg-white p-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <button className="flex-1 text-left" onClick={() => handleOpen(item)}>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: "#f5f0fa", color: BRAND }}
                      >
                        {item.type === "paipan" ? "排盘" : item.type === "interpret" ? "解读" : item.type === "moment" ? "动态" : item.type === "video" ? "视频" : "其他"}
                      </span>
                      {item.tool && (
                        <span className="text-[10px] text-gray-400">{item.tool}</span>
                      )}
                      <span className="text-[10px] text-gray-300">
                        {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-gray-800 line-clamp-2">{item.title}</p>
                    {item.summary && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{item.summary}</p>
                    )}
                  </button>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="shrink-0 rounded-lg p-1.5 text-gray-300 active:bg-gray-50 active:text-red-400"
                    aria-label="取消收藏"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
