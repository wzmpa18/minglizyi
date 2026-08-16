"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";

const BRAND = "#7B2FBE";

// ==================== 类型定义 ====================
interface TeamMember {
  userId: string;
  nickname: string;
  avatar: string;          // 预设色值或图片URL
  account: string;         // 账号（手机号/邮箱），用于脱敏展示
  level: 1 | 2;            // 1=一级直推，2=二级间推
  registeredAt: string;    // 注册时间 ISO
  totalConsumption: number; // 累计消费（元）
}

interface TeamData {
  members: TeamMember[];
}

// ==================== 本地存储逻辑（架构预留对接位） ====================
const STORAGE_KEY = "yandao_team_data";

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function getTeamData(): TeamData {
  // 从本地存储读取真实数据，无数据则返回空列表（后续对接后端接口）
  const data = safeGet<TeamData | null>(STORAGE_KEY, null);
  if (data && data.members) {
    return data;
  }
  return { members: [] };
}

// ==================== 工具函数 ====================
// 账号脱敏：手机号保留前3后4，邮箱保留首末各2位
function maskAccount(account: string): string {
  if (!account) return "未绑定";
  if (account.includes("@")) {
    // 邮箱
    const [name, domain] = account.split("@");
    if (name.length <= 2) return account;
    return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 4, 2))}${name.slice(-2)}@${domain}`;
  }
  // 手机号
  const digits = account.replace(/\D/g, "");
  if (digits.length >= 7) {
    return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  }
  return account;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return iso;
  }
}

// ==================== 主页面 ====================
export default function TeamPage() {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tab, setTab] = useState<"level1" | "level2">("level1");
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  useEffect(() => {
    requireLogin();
  }, []);

  useEffect(() => {
    setMembers(getTeamData().members);
  }, []);

  // 数据概览
  const overview = useMemo(() => {
    const level1 = members.filter((m) => m.level === 1);
    const level2 = members.filter((m) => m.level === 2);
    const totalConsumption = members.reduce((sum, m) => sum + m.totalConsumption, 0);
    // 累计收益 = 一级消费的15% + 二级消费的8%（与分销比例一致）
    const income =
      level1.reduce((s, m) => s + m.totalConsumption, 0) * 0.15 +
      level2.reduce((s, m) => s + m.totalConsumption, 0) * 0.08;
    return {
      total: members.length,
      level1Count: level1.length,
      level2Count: level2.length,
      income: Math.round(income * 100) / 100,
      totalConsumption: Math.round(totalConsumption * 100) / 100,
    };
  }, [members]);

  const list = members.filter((m) => (tab === "level1" ? m.level === 1 : m.level === 2));

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="我的团队" showBack backUrl="/profile" />

      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {/* ===== 数据概览 ===== */}
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND} 0%, #9B59B6 100%)`,
            borderRadius: 12,
            padding: "18px 16px",
            marginBottom: 12,
            color: "#fff",
            boxShadow: "0 2px 8px rgba(123,47,190,0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>累计收益（元）</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 2 }}>
                {overview.income.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>团队总消费</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>
                ¥{overview.totalConsumption.toFixed(2)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{overview.total}</div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>总人数</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.2)", borderRight: "1px solid rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{overview.level1Count}</div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>一级成员</div>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{overview.level2Count}</div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>二级成员</div>
            </div>
          </div>
        </div>

        {/* ===== 成员列表 Tab ===== */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          {/* Tab 切换 */}
          <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0" }}>
            {[
              { key: "level1" as const, label: `一级成员（${overview.level1Count}）` },
              { key: "level2" as const, label: `二级成员（${overview.level2Count}）` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  fontSize: 14,
                  fontWeight: tab === t.key ? 600 : 400,
                  color: tab === t.key ? BRAND : "#999",
                  border: "none",
                  borderBottom: tab === t.key ? `2px solid ${BRAND}` : "2px solid transparent",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 成员列表 */}
          {list.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 10px", display: "block" }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <div style={{ fontSize: 14 }}>暂无{tab === "level1" ? "一级" : "二级"}成员</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>去推广中心邀请好友加入吧</div>
              <button
                onClick={() => router.push("/profile/promote")}
                style={{
                  marginTop: 14,
                  padding: "8px 20px",
                  borderRadius: 20,
                  border: `1px solid ${BRAND}`,
                  backgroundColor: "#f5f0fa",
                  color: BRAND,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                去邀请
              </button>
            </div>
          ) : (
            list.map((m, idx) => (
              <div
                key={m.userId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: idx === list.length - 1 ? "none" : "1px solid #f5f5f5",
                }}
              >
                {/* 头像 */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    backgroundColor: m.avatar,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {m.nickname.charAt(0)}
                </div>
                {/* 信息 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.nickname}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 8,
                        backgroundColor: m.level === 1 ? "#f5f0fa" : "#f0f0f0",
                        color: m.level === 1 ? BRAND : "#999",
                        flexShrink: 0,
                      }}
                    >
                      {m.level === 1 ? "一级" : "二级"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 3, display: "flex", gap: 10 }}>
                    <span>{maskAccount(m.account)}</span>
                    <span>注册 {formatTime(m.registeredAt)}</span>
                  </div>
                </div>
                {/* 累计消费 */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: BRAND }}>
                    ¥{m.totalConsumption.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>累计消费</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 说明 */}
        <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <p style={{ fontSize: 12, color: "#999", lineHeight: 1.7, margin: 0 }}>
            <span style={{ fontWeight: 600, color: "#666" }}>收益说明：</span>
            一级成员消费可获 15% 佣金，二级成员消费可获 8% 分成。收益将自动计入您的钱包余额。
          </p>
        </div>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />

      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  );
}
