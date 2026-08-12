"use client";

// ============================================================================
// 言道国学 - 数据看板页面
// 多维度运营数据：用户活跃度、邀请转化、页面浏览、会员收入、AI 使用
// 使用 ECharts 渲染趋势图与分布图
// ============================================================================

import { useEffect, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import {
  BarChart3,
  Users,
  Gift,
  Eye,
  Crown,
  Bot,
  TrendingUp,
  RefreshCw,
  Coins,
  Target,
  Activity,
} from "lucide-react";
import {
  THEME,
  AdminCard,
  StatCard,
  Badge,
  LoadingSpinner,
  ProgressBar,
  useMounted,
  styles,
} from "../_shared";
import { fetchDashboardStats } from "@/lib/admin/client";
import type { DashboardStats } from "@/lib/admin/types";

// ECharts 客户端动态加载（避免 SSR 问题）
const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.textHint }}>图表加载中...</div>,
});

export default function DashboardPage() {
  const mounted = useMounted();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetchDashboardStats();
    setStats(data);
    setLoading(false);
  };

  useEffect(() => {
    if (mounted) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted || loading) {
    return (
      <div>
        <PageHeader onRefresh={load} />
        <LoadingSpinner text="正在加载数据看板..." />
      </div>
    );
  }

  if (!stats) {
    return (
      <div>
        <PageHeader onRefresh={load} />
        <AdminCard>
          <div style={{ textAlign: "center", padding: 40, color: THEME.error }}>
            数据加载失败，请检查网络或密钥后重试。
          </div>
        </AdminCard>
      </div>
    );
  }

  const ua = stats.userActivity;
  const inv = stats.invite;
  const pv = stats.pageViews;
  const mem = stats.membership;
  const ai = stats.aiUsage;

  return (
    <div>
      <PageHeader onRefresh={load} generatedAt={stats.generatedAt} />
      <div style={{ paddingBottom: 24 }}>
        {/* ============ 用户活跃度 ============ */}
        <SectionTitle icon={<Users size={18} />}>用户活跃度</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
          <StatCard label="日活 (DAU)" value={ua.dau.toLocaleString()} sub={`今日新增 ${ua.newUsersToday}`} icon={<Activity size={18} />} color={THEME.primary} trend={{ value: 5.2 }} />
          <StatCard label="周活 (WAU)" value={ua.wau.toLocaleString()} sub="近7日活跃" icon={<Users size={18} />} color={THEME.info} />
          <StatCard label="月活 (MAU)" value={ua.mau.toLocaleString()} sub="近30日活跃" icon={<Users size={18} />} color={THEME.success} />
          <StatCard label="累计用户" value={ua.totalUsers.toLocaleString()} sub="注册总数" icon={<TrendingUp size={18} />} color={THEME.warning} />
        </div>
        <AdminCard style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textSub, marginBottom: 10 }}>近 14 日 DAU 与新增用户趋势</div>
          <ReactECharts
            option={lineChartOption(
              ua.trend.map((t) => t.date.slice(5)),
              [
                { name: "DAU", data: ua.trend.map((t) => t.dau), color: THEME.primary },
                { name: "新增用户", data: ua.trend.map((t) => t.newUsers), color: THEME.success },
              ]
            )}
            style={{ height: 280 }}
          />
        </AdminCard>

        {/* ============ 邀请数据 ============ */}
        <SectionTitle icon={<Gift size={18} />}>邀请数据统计</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
          <StatCard label="累计邀请" value={inv.totalInvites.toLocaleString()} sub={`今日 ${inv.todayInvites}`} icon={<Gift size={18} />} color={THEME.primary} trend={{ value: 3.8 }} />
          <StatCard label="一级邀请" value={inv.level1Count.toLocaleString()} sub="直接邀请" icon={<Users size={18} />} color={THEME.info} />
          <StatCard label="二级邀请" value={inv.level2Count.toLocaleString()} sub="间接邀请" icon={<Users size={18} />} color={THEME.primaryLight} />
          <StatCard label="转化率" value={`${inv.conversionRate}%`} sub="注册→活跃" icon={<Target size={18} />} color={THEME.success} trend={{ value: 1.5 }} />
        </div>
        <AdminCard style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textSub, marginBottom: 10 }}>近 14 日邀请趋势</div>
          <ReactECharts
            option={barChartOption(
              inv.trend.map((t) => t.date.slice(5)),
              [{ name: "邀请人数", data: inv.trend.map((t) => t.invites), color: THEME.primary }]
            )}
            style={{ height: 240 }}
          />
        </AdminCard>

        {/* ============ 页面浏览热度 ============ */}
        <SectionTitle icon={<Eye size={18} />}>页面浏览热度</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
          <StatCard label="总浏览量" value={pv.totalViews.toLocaleString()} icon={<Eye size={18} />} color={THEME.primary} />
          <StatCard label="独立访客" value={pv.totalUniqueVisitors.toLocaleString()} icon={<Users size={18} />} color={THEME.info} />
          <StatCard label="热门页面数" value={pv.pages.length} sub="统计页面" icon={<BarChart3 size={18} />} color={THEME.warning} />
        </div>
        <AdminCard style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textSub, marginBottom: 14 }}>页面浏览量排行 Top 10</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="yd-dash-pv">
            <ReactECharts
              option={hBarChartOption(
                pv.pages.slice(0, 10).map((p) => p.title),
                pv.pages.slice(0, 10).map((p) => p.views),
                THEME.primary
              )}
              style={{ height: 320 }}
            />
            <div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${THEME.border}` }}>
                    <th style={thStyle}>页面</th>
                    <th style={thStyle}>浏览</th>
                    <th style={thStyle}>访客</th>
                    <th style={thStyle}>时长</th>
                  </tr>
                </thead>
                <tbody>
                  {pv.pages.slice(0, 8).map((p, i) => (
                    <tr key={p.path} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                      <td style={tdStyle}>
                        <span style={{ color: i < 3 ? THEME.warning : THEME.textHint, fontWeight: 700, marginRight: 6 }}>{i + 1}</span>
                        {p.title}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{p.views.toLocaleString()}</td>
                      <td style={tdStyle}>{p.uniqueVisitors.toLocaleString()}</td>
                      <td style={{ ...tdStyle, color: THEME.textHint }}>{p.avgDuration}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <style>{`@media (max-width: 800px) { .yd-dash-pv { grid-template-columns: 1fr !important; } }`}</style>
          </div>
        </AdminCard>

        {/* ============ 会员数据 ============ */}
        <SectionTitle icon={<Crown size={18} />}>会员数据</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
          <StatCard label="付费会员" value={mem.paidMembers.toLocaleString()} sub={`总会员 ${mem.totalMembers.toLocaleString()}`} icon={<Crown size={18} />} color={THEME.warning} trend={{ value: 2.1 }} />
          <StatCard label="付费转化率" value={`${mem.conversionRate}%`} sub="免费→付费" icon={<Target size={18} />} color={THEME.success} />
          <StatCard label="本月收入" value={`¥${mem.revenueThisMonth.toLocaleString()}`} icon={<Coins size={18} />} color={THEME.primary} trend={{ value: 8.4 }} />
          <StatCard label="累计收入" value={`¥${mem.revenueTotal.toLocaleString()}`} icon={<TrendingUp size={18} />} color={THEME.info} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }} className="yd-dash-mem">
          <AdminCard>
            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textSub, marginBottom: 10 }}>近 6 个月收入趋势</div>
            <ReactECharts
              option={barChartOption(
                mem.revenueTrend.map((m) => m.month),
                [{ name: "收入(元)", data: mem.revenueTrend.map((m) => m.revenue), color: THEME.primary }]
              )}
              style={{ height: 260 }}
            />
          </AdminCard>
          <AdminCard>
            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textSub, marginBottom: 14 }}>各等级会员分布</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {mem.byLevel.map((l) => {
                const maxCount = Math.max(...mem.byLevel.map((x) => x.count), 1);
                return (
                  <div key={l.level}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: THEME.textMain }}>{l.name}</span>
                      <span style={{ fontSize: 13, color: THEME.textSub }}>{l.count.toLocaleString()} 人 · ¥{l.revenue.toLocaleString()}</span>
                    </div>
                    <ProgressBar value={l.count} max={maxCount} color={l.level === "lifetime" ? THEME.warning : l.level === "yearly" ? THEME.primary : THEME.info} />
                  </div>
                );
              })}
            </div>
          </AdminCard>
          <style>{`@media (max-width: 800px) { .yd-dash-mem { grid-template-columns: 1fr !important; } }`}</style>
        </div>

        {/* ============ AI 使用统计 ============ */}
        <SectionTitle icon={<Bot size={18} />}>AI 使用统计</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
          <StatCard label="今日调用" value={ai.callsToday.toLocaleString()} icon={<Bot size={18} />} color={THEME.info} trend={{ value: 6.7 }} />
          <StatCard label="累计调用" value={ai.totalCalls.toLocaleString()} icon={<Activity size={18} />} color={THEME.primary} />
          <StatCard label="成功率" value={`${ai.successRate}%`} icon={<Target size={18} />} color={THEME.success} />
          <StatCard label="热门工具" value={ai.topTools[0]?.name || "-"} sub={`${ai.topTools[0]?.calls.toLocaleString() || 0} 次`} icon={<TrendingUp size={18} />} color={THEME.warning} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }} className="yd-dash-ai">
          <AdminCard>
            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textSub, marginBottom: 10 }}>近 14 日 AI 调用趋势</div>
            <ReactECharts
              option={lineChartOption(
                ai.callsTrend.map((t) => t.date.slice(5)),
                [{ name: "调用次数", data: ai.callsTrend.map((t) => t.calls), color: THEME.info }]
              )}
              style={{ height: 260 }}
            />
          </AdminCard>
          <AdminCard>
            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textSub, marginBottom: 10 }}>热门 AI 工具调用占比</div>
            <ReactECharts
              option={pieChartOption(
                ai.topTools.map((t) => ({ name: t.name, value: t.calls }))
              )}
              style={{ height: 260 }}
            />
          </AdminCard>
          <style>{`@media (max-width: 800px) { .yd-dash-ai { grid-template-columns: 1fr !important; } }`}</style>
        </div>

        <div style={{ textAlign: "center", padding: "8px 0", fontSize: 12, color: THEME.textHint }}>
          数据看板生成于 {new Date(stats.generatedAt).toLocaleString("zh-CN")}
        </div>
      </div>
    </div>
  );
}

// ==================== 子组件与图表配置 ====================

const thStyle: CSSProperties = { textAlign: "left", padding: "8px 6px", fontSize: 12, fontWeight: 600, color: THEME.textSub };
const tdStyle: CSSProperties = { padding: "8px 6px", color: THEME.textMain, fontSize: 13 };

function PageHeader({ onRefresh, generatedAt }: { onRefresh: () => void; generatedAt?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: THEME.textMain, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <BarChart3 size={26} color={THEME.primary} /> 数据看板
        </h1>
        <p style={{ fontSize: 14, color: THEME.textSub, marginTop: 6 }}>
          用户活跃度 · 邀请转化 · 页面浏览 · 会员收入 · AI 使用
          {generatedAt && <span style={{ marginLeft: 8, fontSize: 12, color: THEME.textHint }}>· {new Date(generatedAt).toLocaleTimeString("zh-CN")}</span>}
        </p>
      </div>
      <button onClick={onRefresh} style={styles.btnSecondary}>
        <RefreshCw size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> 刷新数据
      </button>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 17,
        fontWeight: 700,
        color: THEME.textMain,
        marginBottom: 14,
        marginTop: 4,
        paddingBottom: 10,
        borderBottom: `2px solid ${THEME.primaryBg}`,
      }}
    >
      <span style={{ color: THEME.primary, display: "flex" }}>{icon}</span>
      {children}
    </div>
  );
}

/** 折线图配置 */
function lineChartOption(
  xData: string[],
  series: { name: string; data: number[]; color: string }[]
) {
  return {
    tooltip: { trigger: "axis" },
    legend: { data: series.map((s) => s.name), bottom: 0, textStyle: { color: "#6b5a78", fontSize: 12 } },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    xAxis: { type: "category", data: xData, axisLabel: { color: "#9a8eaa", fontSize: 11 }, axisLine: { lineStyle: { color: "#e8dcf2" } } },
    yAxis: { type: "value", axisLabel: { color: "#9a8eaa", fontSize: 11 }, splitLine: { lineStyle: { color: "#f3edf7" } } },
    series: series.map((s) => ({
      name: s.name,
      type: "line",
      data: s.data,
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: { width: 2.5, color: s.color },
      itemStyle: { color: s.color },
      areaStyle: { color: s.color + "20" },
    })),
  };
}

/** 柱状图配置 */
function barChartOption(
  xData: string[],
  series: { name: string; data: number[]; color: string }[]
) {
  return {
    tooltip: { trigger: "axis" },
    legend: { data: series.map((s) => s.name), bottom: 0, textStyle: { color: "#6b5a78", fontSize: 12 } },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    xAxis: { type: "category", data: xData, axisLabel: { color: "#9a8eaa", fontSize: 11 }, axisLine: { lineStyle: { color: "#e8dcf2" } } },
    yAxis: { type: "value", axisLabel: { color: "#9a8eaa", fontSize: 11 }, splitLine: { lineStyle: { color: "#f3edf7" } } },
    series: series.map((s) => ({
      name: s.name,
      type: "bar",
      data: s.data,
      itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0] },
      barWidth: "50%",
    })),
  };
}

/** 横向柱状图配置 */
function hBarChartOption(yData: string[], data: number[], color: string) {
  return {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 90, right: 30, top: 10, bottom: 20 },
    xAxis: { type: "value", axisLabel: { color: "#9a8eaa", fontSize: 11 }, splitLine: { lineStyle: { color: "#f3edf7" } } },
    yAxis: {
      type: "category",
      data: yData,
      axisLabel: { color: "#6b5a78", fontSize: 12 },
      axisLine: { lineStyle: { color: "#e8dcf2" } },
      inverse: true,
    },
    series: [
      {
        type: "bar",
        data: data,
        itemStyle: { color: color, borderRadius: [0, 4, 4, 0] },
        barWidth: "55%",
        label: { show: true, position: "right", color: "#6b5a78", fontSize: 11 },
      },
    ],
  };
}

/** 饼图配置 */
function pieChartOption(data: { name: string; value: number }[]) {
  const colors = [THEME.primary, THEME.info, THEME.success, THEME.warning, THEME.primaryLight, "#3498db", "#10B981", "#F59E0B"];
  return {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { type: "scroll", bottom: 0, textStyle: { color: "#6b5a78", fontSize: 11 } },
    color: colors,
    series: [
      {
        type: "pie",
        radius: ["40%", "68%"],
        center: ["50%", "45%"],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: "#fff", borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
        data: data,
      },
    ],
  };
}
