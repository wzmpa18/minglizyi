"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";

import { getPointsBalance, POINTS_RULES, dailySignin } from "@/lib/pointsStore";

const BRAND = "#7B2FBE";

export default function PointsPage() {
  const router = useRouter();

  const [balance, setBalance] = useState(0);
  const [todayEarned, setTodayEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [signedInToday, setSignedInToday] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    try {
      const bal = getPointsBalance();
      setBalance(bal?.total ?? 0);
      setTodayEarned(bal?.todayEarned ?? 0);
      // 检查今日是否已签到
      const today = new Date().toISOString().slice(0, 10);
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("yandao_points_records");
          if (raw) {
            const records = JSON.parse(raw);
            setSignedInToday(records.some((r: any) => r.source === "signin" && r.createdAt.startsWith(today)));
          }
        } catch {}
      }
    } catch (e) {
      console.error("加载积分数据失败:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSignIn = async () => {
    if (signedInToday || signingIn) return;
    setSigningIn(true);
    try {
      const result = dailySignin();
      if (result.success) {
        setBalance((prev) => prev + result.amount);
        setTodayEarned((prev) => prev + result.amount);
        setSignedInToday(true);
      }
    } catch (e) {
      console.error("签到失败:", e);
    } finally {
      setSigningIn(false);
    }
  };

  const ruleIcons: Record<string, string> = {
    signin: "\u{1F4C5}",
    study: "\u{1F4D6}",
    share: "\u{1F4E4}",
    invite: "\u{1F465}",
    community: "\u{1F4AC}",
    content: "\u270D\uFE0F",
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#ededed" }}>
        <BrandHeader title="积分中心" showBack />
        <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#ededed", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="积分中心" showBack />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {/* 积分余额 */}
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)`,
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "12px",
            textAlign: "center",
            color: "#fff",
          }}
        >
          <div style={{ fontSize: "13px", opacity: 0.8, marginBottom: "8px" }}>我的积分</div>
          <div style={{ fontSize: "42px", fontWeight: "bold", marginBottom: "8px", lineHeight: "1" }}>
            {balance.toLocaleString()}
          </div>
          <div style={{ fontSize: "13px", opacity: 0.7 }}>
            今日获得 +{todayEarned} 积分
          </div>
        </div>

        {/* 每日签到 */}
        <button
          onClick={handleSignIn}
          disabled={signedInToday || signingIn}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: "12px",
            backgroundColor: signedInToday ? "#e0e0e0" : "#f39c12",
            color: signedInToday ? "#999" : "#fff",
            border: "none",
            fontSize: "16px",
            fontWeight: 600,
            cursor: signedInToday ? "default" : "pointer",
            marginBottom: "12px",
            boxShadow: signedInToday ? "none" : "0 4px 12px rgba(243, 156, 18, 0.3)",
          }}
        >
          {signingIn ? "签到中..." : signedInToday ? "今日已签到" : "每日签到 +5 积分"}
        </button>

        {/* 获取积分方式 */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "12px" }}>
            获取积分
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {Object.entries(POINTS_RULES).map(([key, rule]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    backgroundColor: `${BRAND}10`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  {ruleIcons[key] || "\u{1F4CC}"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#333" }}>
                    {rule.desc}
                  </div>
                  <div style={{ fontSize: "12px", color: "#999" }}>
                    每日上限 {rule.daily} 次
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: BRAND }}>
                    +{rule.amount}
                  </div>
                  <div style={{ fontSize: "11px", color: "#bbb" }}>
                    每次
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 功能入口 */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => router.push("/points/exchange")}
            style={{
              flex: 1,
              padding: "14px 0",
              borderRadius: "12px",
              backgroundColor: BRAND,
              color: "#fff",
              border: "none",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            积分兑换
          </button>
          <button
            onClick={() => router.push("/points/history")}
            style={{
              flex: 1,
              padding: "14px 0",
              borderRadius: "12px",
              backgroundColor: "#fff",
              border: `1px solid ${BRAND}`,
              color: BRAND,
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            积分明细
          </button>
        </div>
      </div>

      {/* 底部免责声明 */}
      <div style={{ padding: "12px 16px", textAlign: "center", fontSize: "11px", color: "#bbb", backgroundColor: "#ededed" }}>
        积分规则最终解释权归平台所有，如有疑问请联系客服
      </div>
    </div>
  );
}