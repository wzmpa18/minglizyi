"use client";

import React from "react";
import { ShareButton } from "./ShareButton";

export interface NewsCardProps {
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  category: "zhongyi" | "yixue";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  zhongyi: "中医养生",
  yixue: "易学文化",
};

/**
 * 行业资讯卡片组件
 * 仅展示标题、摘要、来源、时间，点击跳转原网页
 * 不做全文爬取/转载，合规规避版权风险
 */
export default function NewsCard({
  title,
  summary,
  source,
  sourceUrl,
  publishedAt,
  category,
}: NewsCardProps) {
  const handleClick = () => {
    // 使用系统浏览器打开原链接，不内嵌 WebView
    window.open(sourceUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={handleClick}
      className="rounded-xl bg-white p-4 shadow-sm transition-all active:scale-[0.99] cursor-pointer"
    >
      {/* 分类标签 + 时间 */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: category === "zhongyi" ? "#2E7D32" : "#7B2FBE" }}
        >
          {CATEGORY_LABELS[category]}
        </span>
        <span className="text-[10px] text-gray-400">{formatDate(publishedAt)}</span>
      </div>

      {/* 标题 */}
      <h3 className="text-sm font-bold text-gray-800 leading-snug line-clamp-2">
        {title}
      </h3>

      {/* 摘要 */}
      <p className="mt-1.5 text-xs text-gray-500 leading-relaxed line-clamp-3">
        {summary}
      </p>

      {/* 来源标注 + 分享按钮（合规红线：必须标注来源） */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-2">
        <span className="text-[11px] text-gray-400">
          来源：{source}
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <ShareButton
            type="article"
            title={title}
            description={summary}
            url={sourceUrl}
          />
        </div>
      </div>
    </div>
  );
}
