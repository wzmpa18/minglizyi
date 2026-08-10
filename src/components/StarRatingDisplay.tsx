"use client";

import { useState } from "react";
import StarRatingExplanation from "./StarRatingExplanation";
import PointsExplanation from "./PointsExplanation";
import { renderStarSymbols, getPointsLevel } from "@/lib/dualTrackService";

/**
 * 统一星级+积分双轨显示组件
 *
 * 所有师父露出位置统一使用此组件展示：
 * - 星级：★★★★☆ 4.8 格式，右侧带问号图标
 * - 积分：独立字段，右侧带问号图标
 *
 * 使用位置：
 * - 同道首页排行榜师父卡片
 * - 师父个人主页顶部信息区
 * - 各工具页底部「找同道师父交流」师父列表
 * - 评价详情页、搜索结果师父列表
 * - 聊天窗口对方信息卡
 */

interface StarRatingDisplayProps {
  starRating: number;
  starRatingCount?: number;
  isNewProtected?: boolean;
  showPoints?: boolean;
  points?: number;
  size?: "small" | "medium" | "large";
}

export default function StarRatingDisplay({
  starRating,
  starRatingCount,
  isNewProtected = false,
  showPoints = false,
  points = 0,
  size = "medium",
}: StarRatingDisplayProps) {
  const fontSize = size === "small" ? 12 : size === "large" ? 16 : 14;
  const starSize = size === "small" ? 12 : size === "large" ? 18 : 14;

  // 防御性转换：确保 starRating 和 points 始终为有效数字
  // 避免 undefined/null/string 调用 .toFixed() 导致页面白屏崩溃
  const safeStarRating = typeof starRating === "number" && !isNaN(starRating) ? starRating : Number(starRating) || 0;
  const safePoints = typeof points === "number" && !isNaN(points) ? points : Number(points) || 0;
  const safeCount = typeof starRatingCount === "number" && !isNaN(starRatingCount) ? starRatingCount : (starRatingCount != null ? Number(starRatingCount) || 0 : undefined);

  const levelInfo = getPointsLevel(safePoints);

  // 判断是否有有效星级（> 0 才算有评分）
  const hasRating = safeStarRating > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* 星级行 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize,
        }}
      >
        {isNewProtected ? (
          <>
            <span style={{ color: "#f39c12", fontSize: starSize }}>☆☆☆☆☆</span>
            <span style={{ color: "#999", fontSize: fontSize - 1 }}>评分积累中</span>
          </>
        ) : hasRating ? (
          <>
            <span style={{ color: "#f39c12", fontSize: starSize, letterSpacing: 1 }}>
              {renderStarSymbols(safeStarRating)}
            </span>
            <span style={{ color: "#333", fontWeight: 600 }}>{safeStarRating.toFixed(1)}</span>
            {safeCount !== undefined && (
              <span style={{ color: "#999", fontSize: fontSize - 2 }}>({safeCount}条评价)</span>
            )}
          </>
        ) : (
          <>
            <span style={{ color: "#ddd", fontSize: starSize, letterSpacing: 1 }}>☆☆☆☆☆</span>
            <span style={{ color: "#999", fontWeight: 500 }}>暂无评分</span>
          </>
        )}
        <StarRatingExplanation />
      </div>

      {/* 积分行（可选显示） */}
      {showPoints && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize,
          }}
        >
          <span style={{ fontSize: starSize - 2 }}>{levelInfo.icon}</span>
          <span style={{ color: "#7B2FBE", fontWeight: 600 }}>
            {safePoints > 0 ? `${safePoints.toFixed(1)} 积分` : "0 分"}
          </span>
          <span style={{ color: "#999", fontSize: fontSize - 2 }}>
            · {levelInfo.title}
          </span>
          <PointsExplanation />
        </div>
      )}
    </div>
  );
}
