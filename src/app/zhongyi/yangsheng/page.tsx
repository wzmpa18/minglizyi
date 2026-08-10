"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  YANGSHENG_CATEGORIES,
  GONGFA_LIST,
  searchGongfa,
  getGongfaByCategory,
  YANGSHENG_DISCLAIMER,
  type GongfaDetail,
} from "@/data/yangsheng_data";
import { useToolBack } from "@/lib/useToolBack";

const BRAND = "#2E7D32"; // 养生模块使用青绿色系
const BRAND_LIGHT = "#4CAF50";
const BRAND_BG = "#E8F5E9";

// 难度颜色
const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  入门: { bg: "#E8F5E9", text: "#2E7D32" },
  初级: { bg: "#E3F2FD", text: "#1565C0" },
  中级: { bg: "#FFF3E0", text: "#E65100" },
  高级: { bg: "#FFEBEE", text: "#C62828" },
};

// 平台颜色
const PLATFORM_COLORS: Record<string, string> = {
  "B站": "#fb7299",
  优酷: "#1989fa",
  腾讯视频: "#ff6088",
};

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function YangshengPage() {
  const router = useRouter();
  useToolBack();

  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // 获取功法列表
  const gongfaList = useMemo(() => {
    if (searchQuery.trim()) {
      return searchGongfa(searchQuery);
    }
    return getGongfaByCategory(activeCategory);
  }, [activeCategory, searchQuery]);

  // 视频列表（从所有功法中提取）
  const videoList = useMemo(() => {
    const videos: Array<{ title: string; platform: string; url: string; gongfaName: string; gongfaId: string }> = [];
    for (const g of GONGFA_LIST) {
      for (const v of g.videos) {
        videos.push({
          ...v,
          gongfaName: g.name,
          gongfaId: g.id,
        });
      }
    }
    return videos.slice(0, 6); // 首页展示6个
  }, []);

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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "20px", padding: "4px" }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>养生</h1>
            <p style={{ fontSize: "11px", opacity: 0.8, margin: 0 }}>上古之道 · 传承千年养生智慧</p>
          </div>
        </div>

        {/* 搜索栏 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "white",
            borderRadius: "20px",
            padding: "8px 14px",
          }}
        >
          <SearchIcon />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索功法名称、传承人..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "14px",
              background: "transparent",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: "2px" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 分类导航（横向滚动标签） */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          gap: "6px",
          padding: "10px 12px",
          scrollbarWidth: "none",
        }}
      >
        {YANGSHENG_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.id);
              setSearchQuery("");
            }}
            style={{
              padding: "8px 14px",
              borderRadius: "20px",
              border: "none",
              whiteSpace: "nowrap",
              fontSize: "13px",
              fontWeight: activeCategory === cat.id ? "bold" : "normal",
              cursor: "pointer",
              backgroundColor: activeCategory === cat.id ? cat.color : "white",
              color: activeCategory === cat.id ? "white" : "#666",
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* 视频学习区 */}
      {!searchQuery && (
        <div style={{ padding: "0 12px 12px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "bold", color: "#333", margin: "0 0 10px" }}>
            🎬 视频学习
          </h2>
          <div
            style={{
              display: "flex",
              overflowX: "auto",
              gap: "10px",
              scrollbarWidth: "none",
              paddingBottom: "4px",
            }}
          >
            {videoList.map((v, i) => (
              <a
                key={i}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flexShrink: 0,
                  width: "180px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "white",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  textDecoration: "none",
                }}
              >
                {/* 视频封面占位 */}
                <div
                  style={{
                    width: "100%",
                    height: "100px",
                    background: `linear-gradient(135deg, ${PLATFORM_COLORS[v.platform] || "#666"}22, ${PLATFORM_COLORS[v.platform] || "#666"}44)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <div style={{ fontSize: "28px" }}>▶️</div>
                  <span
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "6px",
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: PLATFORM_COLORS[v.platform] || "#666",
                      color: "white",
                    }}
                  >
                    {v.platform}
                  </span>
                </div>
                <div style={{ padding: "8px 10px" }}>
                  <div style={{ fontSize: "12px", color: "#333", fontWeight: 500, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {v.title}
                  </div>
                  <div style={{ fontSize: "10px", color: "#999", marginTop: "4px" }}>
                    {v.gongfaName}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 功法列表区 */}
      <div style={{ padding: "0 12px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "bold", color: "#333", margin: "0 0 10px" }}>
          {searchQuery ? `🔍 搜索结果（${gongfaList.length}）` : `📚 功法列表（${gongfaList.length}）`}
        </h2>

        {gongfaList.length === 0 ? (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "30px",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔍</div>
            <div style={{ fontSize: "14px", color: "#999" }}>未找到相关功法</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {gongfaList.map((g) => (
              <GongfaCard key={g.id} gongfa={g} />
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
}

// 功法卡片组件
function GongfaCard({ gongfa }: { gongfa: GongfaDetail }) {
  const diffColor = DIFFICULTY_COLORS[gongfa.difficulty] || DIFFICULTY_COLORS["入门"];

  return (
    <Link
      href={`/zhongyi/yangsheng/${gongfa.id}`}
      style={{
        display: "block",
        background: "white",
        borderRadius: "12px",
        padding: "14px",
        textDecoration: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: BRAND_BG,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "22px",
          }}
        >
          {(() => {
            const cat = YANGSHENG_CATEGORIES.find((c) => c.id === gongfa.category);
            return cat?.icon || "📖";
          })()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "15px", fontWeight: "bold", color: "#333" }}>{gongfa.name}</span>
            <span
              style={{
                fontSize: "10px",
                padding: "1px 6px",
                borderRadius: "4px",
                backgroundColor: diffColor.bg,
                color: diffColor.text,
              }}
            >
              {gongfa.difficulty}
            </span>
            {gongfa.hotTag && (
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  backgroundColor: "#fff3e0",
                  color: "#e65100",
                }}
              >
                🔥 {gongfa.hotTag}
              </span>
            )}
          </div>
          <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
            {gongfa.inheritor} · {gongfa.era}
          </div>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "12px",
              color: "#666",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {gongfa.intro}
          </p>
        </div>
      </div>
    </Link>
  );
}
