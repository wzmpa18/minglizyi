"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";

import { getInviteCode, getInviteStats, getInvitees, claimReward } from "@/lib/inviteStore";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

interface InviteStats {
  totalInvites: number;
  level1Count: number;
  level2Count: number;
  todayInvites: number;
  totalRewards: number;
}

interface Invitee {
  id: string;
  inviteeName: string;
  level: number;
  createdAt: string;
  rewardClaimed: boolean;
}

function getUserId(): string {
  if (typeof window === "undefined") return "YD000000";
  return localStorage.getItem("yandao_user_id") || localStorage.getItem("profile_userid") || "YD000000";
}

export default function InvitePage() {
  const router = useRouter();

  const [inviteCode, setInviteCode] = useState("");
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [monthInvites, setMonthInvites] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    try {
      const uid = getUserId();
      const code = getInviteCode(uid);
      const statData = getInviteStats(uid);
      const list = getInvitees(uid);
      setInviteCode(code || "");
      setStats(statData);

      const mappedInvitees: Invitee[] = (list || []).map((r: any) => ({
        id: r.id,
        inviteeName: r.inviteeName || "匿名用户",
        level: r.level || 1,
        createdAt: r.createdAt || "",
        rewardClaimed: r.rewardClaimed || false,
      }));
      setInvitees(mappedInvitees);

      const now = new Date();
      const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      setMonthInvites(mappedInvitees.filter((i) => i.createdAt.startsWith(monthPrefix)).length);
    } catch (e) {
      console.error("加载推广数据失败:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("复制失败，请长按邀请码手动复制");
    }
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/invite?code=${inviteCode}`;
    try {
      await navigator.clipboard.writeText(link);
      alert("邀请链接已复制");
    } catch {
      alert("复制失败");
    }
  };

  const handleClaimReward = (inviteeId: string) => {
    setClaiming(true);
    try {
      claimReward(inviteeId);
      setInvitees((prev) =>
        prev.map((item) =>
          item.id === inviteeId ? { ...item, rewardClaimed: true } : item
        )
      );
      alert("奖励已领取");
    } catch (e) {
      console.error("领取奖励失败:", e);
    } finally {
      setClaiming(false);
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleDateString("zh-CN");
    } catch {
      return timeStr;
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
  <PageLoginGuard />
        <BrandHeader title="推广中心" showBack />
        <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>加载中...</div>
      </div>
    );
  }

  const teamTotal = (stats?.level1Count || 0) + (stats?.level2Count || 0);

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="推广中心" showBack />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
        {/* ===== 邀请码卡 ===== */}
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND} 0%, #9B59B6 100%)`,
            borderRadius: "14px",
            padding: "18px 20px",
            marginBottom: "12px",
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "12px", opacity: 0.85 }}>我的邀请码</div>
              <div style={{ fontSize: "26px", fontWeight: "bold", letterSpacing: "3px", marginTop: "4px", fontFamily: "monospace" }}>
                {inviteCode || "------"}
              </div>
            </div>
            <button
              onClick={handleCopyCode}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                backgroundColor: "rgba(255,255,255,0.22)",
                border: "1px solid rgba(255,255,255,0.45)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                backdropFilter: "blur(4px)",
              }}
            >
              {copied ? "已复制" : "复制邀请码"}
            </button>
          </div>
          <button
            onClick={handleCopyLink}
            style={{
              marginTop: "12px",
              width: "100%",
              padding: "9px 0",
              borderRadius: "10px",
              backgroundColor: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.35)",
              color: "#fff",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            复制邀请链接
          </button>
        </div>

        {/* ===== 数据驾驶舱 ===== */}
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#333", margin: "4px 2px 10px" }}>推广数据概览</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
          <button
            onClick={() => router.push("/profile/team")}
            style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 8px", textAlign: "center", border: "none", cursor: "pointer" }}
          >
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#e74c3c", lineHeight: 1.2 }}>{stats?.todayInvites ?? 0}</div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>今日邀请</div>
          </button>
          <button
            onClick={() => router.push("/profile/team")}
            style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 8px", textAlign: "center", border: "none", cursor: "pointer" }}
          >
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#f39c12", lineHeight: 1.2 }}>{monthInvites}</div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>本月邀请</div>
          </button>
          <button
            onClick={() => router.push("/profile/promote")}
            style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 8px", textAlign: "center", border: "none", cursor: "pointer" }}
          >
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#f39c12", lineHeight: 1.2 }}>{stats?.totalRewards ?? 0}</div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>累计收益(分)</div>
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          <button
            onClick={() => router.push("/profile/team")}
            style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 8px", textAlign: "center", border: "none", cursor: "pointer" }}
          >
            <div style={{ fontSize: "22px", fontWeight: "bold", color: BRAND, lineHeight: 1.2 }}>{stats?.level1Count ?? 0}</div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>一级邀请</div>
          </button>
          <button
            onClick={() => router.push("/profile/team")}
            style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 8px", textAlign: "center", border: "none", cursor: "pointer" }}
          >
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#3498db", lineHeight: 1.2 }}>{stats?.level2Count ?? 0}</div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>二级邀请</div>
          </button>
          <button
            onClick={() => router.push("/profile/team")}
            style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 8px", textAlign: "center", border: "none", cursor: "pointer" }}
          >
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1e8e5a", lineHeight: 1.2 }}>{teamTotal}</div>
            <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>团队总人数</div>
          </button>
        </div>

        {/* ===== 四大功能入口 ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
          <button
            onClick={handleCopyCode}
            style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 4px", textAlign: "center", border: "none", cursor: "pointer" }}
          >
            <div style={{ width: "34px", height: "34px", margin: "0 auto 6px", borderRadius: "10px", backgroundColor: "#f5f0fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div style={{ fontSize: "12px", color: "#555", fontWeight: 500 }}>邀请码</div>
          </button>
          <button
            onClick={() => router.push("/invite/poster")}
            style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 4px", textAlign: "center", border: "none", cursor: "pointer" }}
          >
            <div style={{ width: "34px", height: "34px", margin: "0 auto 6px", borderRadius: "10px", backgroundColor: "#f5f0fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div style={{ fontSize: "12px", color: "#555", fontWeight: 500 }}>邀请海报</div>
          </button>
          <button
            onClick={() => router.push("/profile/team")}
            style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 4px", textAlign: "center", border: "none", cursor: "pointer" }}
          >
            <div style={{ width: "34px", height: "34px", margin: "0 auto 6px", borderRadius: "10px", backgroundColor: "#f5f0fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div style={{ fontSize: "12px", color: "#555", fontWeight: 500 }}>我的团队</div>
          </button>
          <button
            onClick={() => router.push("/profile/promote")}
            style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 4px", textAlign: "center", border: "none", cursor: "pointer" }}
          >
            <div style={{ width: "34px", height: "34px", margin: "0 auto 6px", borderRadius: "10px", backgroundColor: "#f5f0fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div style={{ fontSize: "12px", color: "#555", fontWeight: 500 }}>收益明细</div>
          </button>
        </div>

        {/* ===== 邀请好友明细 ===== */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "12px" }}>
            邀请好友明细 ({invitees.length})
          </div>

          {invitees.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", padding: "20px 0", fontSize: "14px" }}>
              暂无邀请记录，快去邀请好友吧
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {invitees.map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ flexShrink: 0 }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: item.level === 1 ? BRAND : "#3498db",
                        color: "#fff",
                        fontSize: "14px",
                        fontWeight: "bold",
                      }}
                    >
                      {item.inviteeName?.charAt(0) || "?"}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "#333", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.inviteeName}</span>
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "1px 6px",
                          borderRadius: "8px",
                          backgroundColor: item.level === 1 ? "#f5f0fa" : "#e8f2fc",
                          color: item.level === 1 ? BRAND : "#2471a3",
                          flexShrink: 0,
                        }}
                      >
                        {item.level === 1 ? "一级" : "二级"}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#999" }}>
                      {formatTime(item.createdAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {!item.rewardClaimed ? (
                      <button
                        onClick={() => handleClaimReward(item.id)}
                        disabled={claiming}
                        style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          backgroundColor: BRAND,
                          color: "#fff",
                          border: "none",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        +50 领取
                      </button>
                    ) : (
                      <span style={{ fontSize: "12px", color: "#27ae60" }}>
                        已领取
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部免责声明 */}
        <div style={{ padding: "14px 4px 6px", textAlign: "center", fontSize: "11px", color: "#bbb" }}>
          邀请好友一起学习，共同进步。请遵守平台规则，禁止虚假邀请。
        </div>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
