"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";

import { getInviteCode, getInviteStats, getInvitees, claimReward, getRewardDetails } from "@/lib/inviteStore";

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
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    try {
      const uid = getUserId();
      const code = getInviteCode(uid);
      const statData = getInviteStats(uid);
      const list = getInvitees(uid);
      setInviteCode(code || "");
      setStats(statData);
      // Map InviteRelation to display fields
      const mappedInvitees: Invitee[] = (list || []).map((r: any) => ({
        id: r.id,
        inviteeName: r.inviteeName || "匿名用户",
        level: r.level || 1,
        createdAt: r.createdAt || "",
        rewardClaimed: r.rewardClaimed || false,
      }));
      setInvitees(mappedInvitees);
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
      alert("邀请码已复制");
    } catch {
      alert("复制失败，请手动复制");
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
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#ededed" }}>
        <BrandHeader title="我的推广" showBack />
        <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#ededed", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="我的推广" showBack />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {/* 邀请码展示 */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "13px", color: "#999", marginBottom: "8px" }}>我的邀请码</div>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: BRAND, letterSpacing: "4px", marginBottom: "12px" }}>
            {inviteCode || "------"}
          </div>
          <button
            onClick={handleCopyCode}
            style={{
              padding: "8px 24px",
              borderRadius: "20px",
              backgroundColor: BRAND,
              color: "#fff",
              border: "none",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            复制邀请码
          </button>
        </div>

        {/* 邀请统计 */}
        {stats && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
              <div style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: BRAND }}>{stats.totalInvites}</div>
                <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>总邀请</div>
              </div>
              <div style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#333" }}>{stats.level1Count}</div>
                <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>一级邀请</div>
              </div>
              <div style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#333" }}>{stats.level2Count}</div>
                <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>二级邀请</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#e74c3c" }}>{stats.todayInvites}</div>
                <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>今日邀请</div>
              </div>
              <div style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f39c12" }}>{stats.totalRewards}</div>
                <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>累计奖励(积分)</div>
              </div>
            </div>
          </div>
        )}

        {/* 邀请链接 + 海报入口 */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <button
            onClick={handleCopyLink}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: "#fff",
              border: `1px solid ${BRAND}`,
              color: BRAND,
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            复制邀请链接
          </button>
          <button
            onClick={() => router.push("/invite/poster")}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: BRAND,
              border: "none",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            生成分享海报
          </button>
        </div>

        {/* 邀请好友列表 */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "12px" }}>
            邀请好友 ({invitees.length})
          </div>

          {invitees.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", padding: "20px 0", fontSize: "14px" }}>
              暂无邀请记录，快去邀请好友吧
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {invitees.map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: "#e0e0e0",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: BRAND,
                        color: "#fff",
                        fontSize: "14px",
                        fontWeight: "bold",
                      }}
                    >
                      {item.inviteeName?.charAt(0) || "?"}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "#333" }}>
                      {item.inviteeName}
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
      </div>

      {/* 底部免责声明 */}
      <div style={{ padding: "12px 16px", textAlign: "center", fontSize: "11px", color: "#bbb", backgroundColor: "#ededed" }}>
        邀请好友一起学习，共同进步。请遵守平台规则，禁止虚假邀请。
      </div>
    </div>
  );
}