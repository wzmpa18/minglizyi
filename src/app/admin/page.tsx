"use client";

// ============================================================================
// 言道国学 - 后台管理控制台概览首页
// 展示核心指标快览 + 功能模块导航卡片
// ============================================================================

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bot,
  Crown,
  Users,
  Gift,
  Coins,
  TrendingUp,
  ArrowRight,
  Activity,
} from "lucide-react";
import { THEME, AdminCard, StatCard, LoadingSpinner, useMounted, Badge } from "./_shared";
import { fetchDashboardStats } from "@/lib/admin/client";
import type { DashboardStats } from "@/lib/admin/types";

export default function AdminOverviewPage() {
  const mounted = useMounted();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mounted) return;
    fetchDashboardStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, [mounted]);

  if (!mounted || loading) {
    return (
      <div>
        <PageHeader />
        <LoadingSpinner text="正在加载控制台数据..." />
      </div>
    );
  }

  const quickStats = stats
    ? [
        {
          label: "日活用户 (DAU)",
          value: stats.userActivity.dau.toLocaleString(),
          sub: `总用户 ${stats.userActivity.totalUsers.toLocaleString()}`,
          icon: <Users size={18} />,
          color: THEME.primary,
        },
        {
          label: "今日新增邀请",
          value: stats.invite.todayInvites,
          sub: `累计 ${stats.invite.totalInvites.toLocaleString()} · 转化率 ${stats.invite.conversionRate}%`,
          icon: <Gift size={18} />,
          color: THEME.success,
        },
        {
          label: "今日 AI 调用",
          value: stats.aiUsage.callsToday.toLocaleString(),
          sub: `累计 ${stats.aiUsage.totalCalls.toLocaleString()} 次`,
          icon: <Bot size={18} />,
          color: THEME.info,
        },
        {
          label: "本月会员收入",
          value: `¥${stats.membership.revenueThisMonth.toLocaleString()}`,
          sub: `付费会员 ${stats.membership.paidMembers.toLocaleString()} 人`,
          icon: <Coins size={18} />,
          color: THEME.warning,
        },
      ]
    : [];

  const modules: {
    href: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
    items: string[];
  }[] = [
    {
      href: "/admin/dashboard",
      title: "数据看板",
      desc: "多维度运营数据分析",
      icon: <BarChart3 size={24} />,
      color: THEME.primary,
      items: ["用户活跃度", "邀请与转化", "页面浏览热度", "会员收入", "AI 使用统计"],
    },
    {
      href: "/admin/ai-control",
      title: "AI 功能管控",
      desc: "AI 能力开关与配额定价",
      icon: <Bot size={24} />,
      color: THEME.info,
      items: ["全局开关", "工具启停", "会员配额", "增量包定价", "B 类工具定价"],
    },
    {
      href: "/admin/membership",
      title: "会员管理",
      desc: "会员等级与收费体系",
      icon: <Crown size={24} />,
      color: THEME.warning,
      items: ["等级权益", "价格调整", "套餐上下架", "合规口径"],
    },
  ];

  return (
    <div>
      <PageHeader />

      {/* 核心指标快览 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {quickStats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      {/* 功能模块导航 */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: THEME.textMain,
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Activity size={18} color={THEME.primary} /> 功能模块
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {modules.map((m) => (
          <Link key={m.href} href={m.href} style={{ textDecoration: "none" }}>
            <div
              style={{
                backgroundColor: THEME.cardBg,
                borderRadius: 12,
                border: `1px solid ${THEME.border}`,
                padding: 22,
                cursor: "pointer",
                transition: "all 0.2s",
                height: "100%",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = m.color;
                e.currentTarget.style.boxShadow = `0 6px 20px ${m.color}22`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = THEME.border;
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: `${m.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: m.color,
                  }}
                >
                  {m.icon}
                </div>
                <ArrowRight size={18} color={THEME.textHint} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: THEME.textMain, marginBottom: 4 }}>{m.title}</div>
              <div style={{ fontSize: 13, color: THEME.textSub, marginBottom: 14 }}>{m.desc}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {m.items.map((it) => (
                  <span
                    key={it}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 6,
                      backgroundColor: THEME.primaryBg,
                      color: THEME.textSub,
                    }}
                  >
                    {it}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 近期趋势速览 */}
      {stats && (
        <AdminCard
          title={
            <>
              <TrendingUp size={18} color={THEME.primary} /> 近 14 日活跃与 AI 调用趋势
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="yd-overview-trends">
            <MiniTrend
              title="日活用户"
              color={THEME.primary}
              data={stats.userActivity.trend.map((t) => ({ label: t.date.slice(5), value: t.dau }))}
            />
            <MiniTrend
              title="AI 调用次数"
              color={THEME.info}
              data={stats.aiUsage.callsTrend.map((t) => ({ label: t.date.slice(5), value: t.calls }))}
            />
          </div>
          <style>{`@media (max-width: 700px) { .yd-overview-trends { grid-template-columns: 1fr !important; } }`}</style>
        </AdminCard>
      )}

      {/* 页脚信息 */}
      <div style={{ textAlign: "center", padding: "24px 0 8px", fontSize: 12, color: THEME.textHint }}>
        言道国学管理控制台 · 数据更新于 {stats ? new Date(stats.generatedAt).toLocaleString("zh-CN") : "-"}
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: THEME.textMain, margin: 0 }}>控制台概览</h1>
        <Badge type="success">已登录</Badge>
      </div>
      <p style={{ fontSize: 14, color: THEME.textSub, margin: 0 }}>
        欢迎使用言道国学管理控制台，从这里管理 AI 功能、会员体系并查看运营数据。
      </p>
    </div>
  );
}

/** 迷你趋势条形图 */
function MiniTrend({
  title,
  color,
  data,
}: {
  title: string;
  color: string;
  data: { label: string; value: number }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textSub, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
        {data.map((d, i) => (
          <div
            key={i}
            title={`${d.label}: ${d.value.toLocaleString()}`}
            style={{
              flex: 1,
              height: `${(d.value / max) * 100}%`,
              minHeight: 3,
              backgroundColor: color,
              borderRadius: "3px 3px 0 0",
              opacity: 0.85,
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: THEME.textHint }}>
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
