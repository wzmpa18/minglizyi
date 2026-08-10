"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getAIQuotaInfo,
  purchaseIncrementalPackage,
  getMembershipDisplay,
  AI_QUOTA_CONFIG,
  MEMBERSHIP_LEVELS,
  type AIQuotaInfo,
  type IncrementalPackageInfo,
} from "@/lib/aiQuotaService";

/**
 * v20.0 AI配额体系与增量包 - 前端展示组件
 *
 * 功能区域：
 * 1. AI配额概览：日剩余次数、月剩余次数、增量包剩余次数
 * 2. 会员等级信息：展示当前会员等级（免费/月度/年度/终身）及对应配额
 * 3. 增量包购买：4档增量包（10次/50次/100次/500次），显示价格与有效期
 * 4. 配额用完升级提示：配额耗尽时引导用户购买增量包或升级会员
 *
 * 合规提示：AI解读仅供传统文化学习参考
 */

// --- 主题色 ---
const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#f3edf7";

// --- 组件 Props ---
interface AIQuotaPanelProps {
  show: boolean;
  onClose: () => void;
}

export default function AIQuotaPanel({ show, onClose }: AIQuotaPanelProps) {
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [quotaInfo, setQuotaInfo] = useState<AIQuotaInfo | null>(null);

  // 显示提示
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // 锁定 body 滚动
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  // 加载配额数据
  const loadData = useCallback(async () => {
    setLoading(true);
    const info = await getAIQuotaInfo();
    setQuotaInfo(info);
    setLoading(false);
  }, []);

  // 显示时加载数据（每次打开刷新最新配额）
  useEffect(() => {
    if (show) {
      loadData();
    }
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  // 购买增量包
  const handlePurchase = useCallback(
    async (pkg: IncrementalPackageInfo) => {
      if (purchasing) return;
      setPurchasing(pkg.id);
      const result = await purchaseIncrementalPackage(pkg.id);
      setPurchasing(null);
      if (result.success) {
        showToast(`购买成功！${pkg.name}已到账`);
        loadData();
      } else {
        showToast(result.error || "购买失败，请重试");
      }
    },
    [purchasing, showToast, loadData]
  );

  // 刷新配额
  const handleRefresh = useCallback(() => {
    loadData();
    showToast("已刷新配额信息");
  }, [loadData, showToast]);

  // 当 show 为 false 时不渲染
  if (!show) return null;

  // 会员等级显示信息
  const membershipLevel = quotaInfo?.membershipLevel || "basic";
  const membershipDisplay = getMembershipDisplay(membershipLevel);

  // 判断配额是否用完（日、月、增量包全部耗尽）
  const isQuotaExhausted = quotaInfo
    ? (quotaInfo.dailyRemaining !== -1 && quotaInfo.dailyRemaining <= 0) &&
      (quotaInfo.monthlyRemaining !== -1 && quotaInfo.monthlyRemaining <= 0) &&
      quotaInfo.incrementalRemaining <= 0
    : false;

  // 格式化剩余次数显示（-1 表示无限）
  const formatRemaining = (val: number | string): string => {
    if (val === -1 || val === "无限") return "无限";
    return String(val);
  };

  // 配额概览卡片数据
  const quotaCards = quotaInfo
    ? [
        {
          label: "今日剩余",
          value: formatRemaining(quotaInfo.dailyRemaining),
          icon: "📅",
          color: BRAND,
        },
        {
          label: "本月剩余",
          value: formatRemaining(quotaInfo.monthlyRemaining),
          icon: "🗓️",
          color: "#f39c12",
        },
        {
          label: "增量包剩余",
          value: String(quotaInfo.incrementalRemaining),
          icon: "📦",
          color: "#27ae60",
        },
      ]
    : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {/* 遮罩层 */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)" }}
      />

      {/* 主面板 */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "420px",
          maxHeight: "85vh",
          backgroundColor: "#fff",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 头部 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            flexShrink: 0,
            background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>
            🤖 AI配额中心
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleRefresh}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "none",
                backgroundColor: "rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 14,
                color: "#fff",
              }}
            >
              🔄
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "none",
                backgroundColor: "rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 16,
                color: "#fff",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 16px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {loading && !quotaInfo && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 13 }}>
              加载中...
            </div>
          )}

          {/* ==================== 配额用完升级提示 ==================== */}
          {isQuotaExhausted && (
            <div
              style={{
                marginBottom: 12,
                padding: "12px 14px",
                backgroundColor: "#fff3e0",
                borderRadius: 10,
                border: "1px solid #ffe0b2",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e65100" }}>
                  AI配额已用完
                </div>
                <div style={{ fontSize: 11, color: "#bf6c00", marginTop: 2 }}>
                  请购买下方增量包或升级会员，继续使用AI解读功能
                </div>
              </div>
            </div>
          )}

          {/* ==================== 会员等级信息 ==================== */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                padding: "16px",
                borderRadius: 12,
                background: `linear-gradient(135deg, ${membershipDisplay.color} 0%, ${BRAND_LIGHT} 100%)`,
                color: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>
                    当前会员等级
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>
                    {membershipDisplay.icon} {membershipDisplay.name}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>日额度 / 月额度</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                    {membershipDisplay.dailyLimit} / {membershipDisplay.monthlyLimit}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== AI配额概览 ==================== */}
          {quotaInfo && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 10 }}>
                配额概览
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                {quotaCards.map((card, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: BRAND_BG,
                      borderRadius: 10,
                      padding: "12px 8px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
                      {card.icon} {card.label}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: card.color }}>
                      {card.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* 已购增量包列表 */}
              {quotaInfo.packages && quotaInfo.packages.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    已购增量包
                  </div>
                  {quotaInfo.packages.map((pkg) => (
                    <div
                      key={pkg.packageId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        backgroundColor: "#fafafa",
                        borderRadius: 8,
                        border: "1px solid #f0f0f0",
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 12, color: "#333", fontWeight: 600 }}>
                          {pkg.packageName}
                        </span>
                        <span style={{ fontSize: 11, color: "#999", marginLeft: 8 }}>
                          有效期{pkg.validity}天
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#27ae60",
                          flexShrink: 0,
                        }}
                      >
                        剩余{pkg.remaining}次
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== 增量包购买 ==================== */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 10 }}>
              增量包购买
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {AI_QUOTA_CONFIG.INCREMENTAL_PACKAGES.map((pkg) => {
                const isPurchasing = purchasing === pkg.id;
                const isDisabled = !!purchasing;
                return (
                  <div
                    key={pkg.id}
                    style={{
                      padding: "14px 12px",
                      borderRadius: 12,
                      border: "1px solid #e8d8f0",
                      backgroundColor: BRAND_BG,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>
                      {pkg.name}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: BRAND }}>
                      ¥{pkg.price}
                    </div>
                    <div style={{ fontSize: 11, color: "#888" }}>
                      {pkg.count}次 · 有效期{pkg.validity}天
                    </div>
                    <button
                      onClick={() => handlePurchase(pkg)}
                      disabled={isDisabled}
                      style={{
                        width: "100%",
                        marginTop: 6,
                        padding: "8px 0",
                        border: "none",
                        borderRadius: 8,
                        backgroundColor: isDisabled ? "#ccc" : BRAND,
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                      }}
                    >
                      {isPurchasing ? "购买中..." : "立即购买"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 购买说明 */}
            <div
              style={{
                marginTop: 10,
                padding: "8px 10px",
                backgroundColor: "#f5f5f5",
                borderRadius: 8,
                fontSize: 11,
                color: "#999",
                lineHeight: 1.6,
              }}
            >
              💡 增量包购买后立即生效，优先消耗日/月配额，用完后自动扣减增量包次数。增量包在有效期内可累计使用。
            </div>
          </div>
        </div>

        {/* 底部合规提示 */}
        <div
          style={{
            padding: "10px 16px",
            backgroundColor: "#fff8e1",
            fontSize: 11,
            color: "#e65100",
            textAlign: "center",
            flexShrink: 0,
            borderTop: "1px solid #ffe0b2",
          }}
        >
          ⚠️ AI解读仅供传统文化学习参考
        </div>

        {/* Toast 提示 */}
        {toast && (
          <div
            style={{
              position: "absolute",
              bottom: 50,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "8px 16px",
              backgroundColor: "rgba(0,0,0,0.8)",
              color: "#fff",
              borderRadius: 8,
              fontSize: 13,
              whiteSpace: "nowrap",
              zIndex: 10000,
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
