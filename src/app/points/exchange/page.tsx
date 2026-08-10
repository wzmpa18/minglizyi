"use client";

import { useState, useEffect, useCallback } from "react";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import { getPointsBalance, EXCHANGE_ITEMS, exchangeItem } from "@/lib/pointsStore";

const BRAND = "#7B2FBE";

interface ExchangeItem {
  id: string;
  name: string;
  cost: number;
  type: string;
}

export default function ExchangePage() {
  const { goBack } = useToolBack();

  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exchanging, setExchanging] = useState(false);
  const [confirmItem, setConfirmItem] = useState<ExchangeItem | null>(null);

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

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const handleExchangeClick = (item: ExchangeItem) => {
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
      const result = exchangeItem(confirmItem.id);
      if (result.success) {
        setBalance((prev) => prev - confirmItem.cost);
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

  const categoryIcons: Record<string, string> = {
    ai: "🤖",
    vip: "👑",
    theme: "🎨",
    coupon: "🎫",
  };

  const categoryLabels: Record<string, string> = {
    ai: "AI额度",
    vip: "会员",
    theme: "主题",
    coupon: "优惠券",
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

        {/* 兑换商品列表 */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "12px" }}>
            兑换商品
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#999" }}>
              加载中...
            </div>
          ) : (EXCHANGE_ITEMS as readonly ExchangeItem[]).length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#999", fontSize: "14px" }}>
              暂无兑换商品
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {EXCHANGE_ITEMS.map((item) => {
                const canAfford = balance >= item.cost;
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
                      cursor: canAfford ? "pointer" : "default",
                      textAlign: "left",
                      opacity: canAfford ? 1 : 0.5,
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
                      {categoryIcons[item.type] || "🎁"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#333", marginBottom: "4px" }}>
                        {item.name}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "16px", fontWeight: "bold", color: canAfford ? BRAND : "#e74c3c" }}>
                        {item.cost.toLocaleString()}
                      </div>
                      <div style={{ fontSize: "11px", color: "#bbb" }}>
                        积分
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
              {categoryIcons[confirmItem.type] || "🎁"}
            </div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#333", marginBottom: "8px" }}>
              确认兑换
            </div>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "6px" }}>
              {confirmItem.name}
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
        虚拟商品一经兑换不支持退换，请谨慎操作
      </div>
    </div>
  );
}
