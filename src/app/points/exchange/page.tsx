"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import {
  getPointsBalance,
  EXCHANGE_ITEMS,
  exchangeItem,
  getUserExchangeCount,
} from "@/lib/pointsStore";
import type { ExchangeItem } from "@/lib/pointsStore";
import { getClientUserId } from "@/lib/auth";

const BRAND = "#7B2FBE";

// 分类展示顺序（装扮类 / 资料类 / 题库类 / 特权类 / 工具类）
const CATEGORY_ORDER: ExchangeItem["category"][] = [
  "decor",
  "material",
  "exam",
  "privilege",
  "tool",
];

interface CategoryGroup {
  category: ExchangeItem["category"];
  categoryName: string;
  items: ExchangeItem[];
}

export default function ExchangePage() {
  const { goBack } = useToolBack();

  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exchanging, setExchanging] = useState(false);
  const [confirmItem, setConfirmItem] = useState<ExchangeItem | null>(null);
  // 记录当前用户对各商品的已兑换次数，用于前端展示与限兑校验
  const [exchangedCounts, setExchangedCounts] = useState<Record<string, number>>({});

  const loadBalance = useCallback(() => {
    setLoading(true);
    try {
      const bal = getPointsBalance();
      setBalance(bal.total);
    } catch (e) {
      console.error("加载积分余额失败:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadExchangedCounts = useCallback(() => {
    try {
      const uid = getClientUserId();
      const counts: Record<string, number> = {};
      EXCHANGE_ITEMS.forEach((item) => {
        counts[item.id] = getUserExchangeCount(item.id, uid);
      });
      setExchangedCounts(counts);
    } catch (e) {
      console.error("加载兑换记录失败:", e);
    }
  }, []);

  useEffect(() => {
    loadBalance();
    loadExchangedCounts();
  }, [loadBalance, loadExchangedCounts]);

  // 按 categoryName 分组，保持固定的分类顺序
  const groupedItems = useMemo<CategoryGroup[]>(() => {
    return CATEGORY_ORDER.map((category) => {
      const items = EXCHANGE_ITEMS.filter((i) => i.category === category);
      const categoryName = items[0]?.categoryName ?? "";
      return { category, categoryName, items };
    }).filter((g) => g.items.length > 0);
  }, []);

  const handleExchangeClick = (item: ExchangeItem) => {
    const userExchanged = exchangedCounts[item.id] ?? 0;
    if (item.stock <= 0) {
      alert("该商品已兑完");
      return;
    }
    if (userExchanged >= item.perUserLimit) {
      alert(`已达兑换上限（每人限兑${item.perUserLimit}次）`);
      return;
    }
    if (balance < item.cost) {
      alert("积分不足，无法兑换");
      return;
    }
    setConfirmItem(item);
  };

  const handleConfirmExchange = () => {
    if (!confirmItem) return;
    setExchanging(true);
    try {
      const uid = getClientUserId();
      const result = exchangeItem(confirmItem.id, uid);
      if (result.success) {
        setBalance((prev) => prev - confirmItem.cost);
        setExchangedCounts((prev) => ({
          ...prev,
          [confirmItem.id]: (prev[confirmItem.id] ?? 0) + 1,
        }));
        alert(`成功兑换 ${confirmItem.name}！`);
        setConfirmItem(null);
      } else {
        alert(result.message);
      }
    } catch (e) {
      console.error("兑换失败:", e);
      alert("兑换失败，请重试");
    } finally {
      setExchanging(false);
    }
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#ededed", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="积分兑换" showBack color={BRAND} onBack={goBack} />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {/* 积分余额 */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "13px", color: "#999", marginBottom: "4px" }}>当前积分</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: BRAND }}>
              {loading ? "..." : balance.toLocaleString()}
            </div>
          </div>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: `${BRAND}10`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
            }}
          >
            💎
          </div>
        </div>

        {/* 兑换商品列表 - 按 categoryName 分组展示 */}
        {loading ? (
          <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "20px 0", textAlign: "center", color: "#999" }}>
            加载中...
          </div>
        ) : EXCHANGE_ITEMS.length === 0 ? (
          <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "20px 0", textAlign: "center", color: "#999", fontSize: "14px" }}>
            暂无兑换商品
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {groupedItems.map((group) => (
              <div key={group.category} style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px" }}>
                {/* 分类标题 */}
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#333",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ display: "inline-block", width: "3px", height: "14px", backgroundColor: BRAND, borderRadius: "2px" }} />
                  {group.categoryName}
                </div>

                {/* 该分类下的商品 */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {group.items.map((item) => {
                    const canAfford = balance >= item.cost;
                    const userExchanged = exchangedCounts[item.id] ?? 0;
                    const reachedLimit = userExchanged >= item.perUserLimit;
                    const outOfStock = item.stock <= 0;
                    const disabled = !canAfford || reachedLimit || outOfStock;
                    let disableReason = "";
                    if (outOfStock) disableReason = "已兑完";
                    else if (reachedLimit) disableReason = "已达上限";
                    else if (!canAfford) disableReason = "积分不足";
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleExchangeClick(item)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "14px",
                          borderRadius: "10px",
                          border: "1px solid #f0f0f0",
                          backgroundColor: "#fff",
                          cursor: disabled ? "default" : "pointer",
                          textAlign: "left",
                          opacity: disabled ? 0.5 : 1,
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "10px",
                            backgroundColor: `${BRAND}10`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "22px",
                            flexShrink: 0,
                          }}
                        >
                          {item.icon || "🎁"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#333", marginBottom: "4px" }}>
                            {item.name}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#999",
                              marginBottom: "4px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.description}
                          </div>
                          <div style={{ fontSize: "11px", color: "#bbb" }}>
                            库存 {item.stock} · 限兑 {item.perUserLimit} 次
                            {userExchanged > 0 ? ` · 已兑 ${userExchanged}` : ""}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          {disabled && disableReason ? (
                            <div style={{ fontSize: "12px", color: "#e74c3c", fontWeight: 600, marginBottom: "2px" }}>
                              {disableReason}
                            </div>
                          ) : null}
                          <div style={{ fontSize: "16px", fontWeight: "bold", color: canAfford ? BRAND : "#e74c3c" }}>
                            {item.cost.toLocaleString()}
                          </div>
                          <div style={{ fontSize: "11px", color: "#bbb" }}>积分</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 确认兑换弹窗 */}
      {confirmItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setConfirmItem(null)}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              padding: "24px",
              width: "100%",
              maxWidth: "340px",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>
              {confirmItem.icon || "🎁"}
            </div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#333", marginBottom: "8px" }}>
              确认兑换
            </div>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
              {confirmItem.name}
            </div>
            <div style={{ fontSize: "13px", color: "#999", marginBottom: "8px", padding: "0 4px" }}>
              {confirmItem.description}
            </div>
            <div style={{ fontSize: "13px", color: "#999", marginBottom: "6px" }}>
              库存 {confirmItem.stock} · 限兑 {confirmItem.perUserLimit} 次
            </div>
            <div style={{ fontSize: "13px", color: "#999", marginBottom: "16px" }}>
              需要消耗 <span style={{ color: BRAND, fontWeight: 600 }}>{confirmItem.cost}</span> 积分
            </div>
            <div style={{ fontSize: "12px", color: "#bbb", marginBottom: "20px" }}>
              兑换后剩余积分: {balance - confirmItem.cost}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setConfirmItem(null)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: "10px",
                  backgroundColor: "#f5f5f5",
                  color: "#666",
                  border: "none",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmExchange}
                disabled={exchanging}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: "10px",
                  backgroundColor: BRAND,
                  color: "#fff",
                  border: "none",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: exchanging ? "not-allowed" : "pointer",
                }}
              >
                {exchanging ? "兑换中..." : "确认兑换"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部免责声明 */}
      <div style={{ padding: "12px 16px", textAlign: "center", fontSize: "11px", color: "#bbb", backgroundColor: "#ededed" }}>
        <div style={{ marginBottom: "4px" }}>虚拟商品一经兑换不支持退换，请谨慎操作</div>
        <div>内容仅供传统文化学习参考，不构成任何决策建议</div>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
