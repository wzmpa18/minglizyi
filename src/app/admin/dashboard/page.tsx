"use client";

// ============================================================================
// 言道国学 - 系统状态页（v25.0.47_19 重写）
// v25.0.47_19 修复：原页面按从未实现的后端数据规格编写（读取 stats.userActivity
// 等不存在字段），导致访问即 TypeError 白屏。现改为聚合真实存在的两个接口：
//   1. /api/admin/unified/overview —— 服务健康(三色) + 用户/会员/订单/AI/社交/审核/佣金
//   2. /api/admin/stats           —— 用户明细(周增/月增) + 会员等级分布
// 全部字段防御式访问，任何字段缺失/为空均不崩溃。
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Users,
  Crown,
  Coins,
  Bot,
  TrendingUp,
  RefreshCw,
  Server,
  ShieldCheck,
  Eye,
  Gift,
  MessagesSquare,
  Flag,
  Target,
  Clock,
} from "lucide-react";
import {
  THEME,
  AdminCard,
  StatCard,
  LoadingSpinner,
  ProgressBar,
  useMounted,
  styles,
} from "../_shared";
import { fetchAdminOverview, fetchDashboardStats, type AdminOverviewData } from "@/lib/admin/client";

interface StatsShape {
  user?: { total?: number; active?: number; newToday?: number; newThisWeek?: number; newThisMonth?: number };
  invite?: { totalInvites?: number; successfulInvites?: number; pendingInvites?: number; conversionRate?: number };
  pageViews?: { total?: number; today?: number; topPages?: { path?: string; title?: string; views?: number }[] };
  membership?: { totalMembers?: number; monthly?: number; yearly?: number; lifetime?: number; revenue?: number };
  aiUsage?: { totalCalls?: number; today?: number; successRate?: number; topTools?: { name?: string; calls?: number }[] };
  generatedAt?: string;
}

export default function DashboardPage() {
  const mounted = useMounted();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [stats, setStats] = useState<StatsShape | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, st] = await Promise.all([fetchAdminOverview(), fetchDashboardStats()]);
    setOverview(ov);
    setStats(st as unknown as StatsShape | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (mounted) load();
  }, [mounted, load]);

  if (!mounted || loading) {
    return (
      <div>
        <PageHeader onRefresh={load} />
        <LoadingSpinner text="正在加载数据看板..." />
      </div>
    );
  }

  if (!overview && !stats) {
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

  // ===== 防御式取值（后端字段缺失时显示 0 / -） =====
  const num = (v: unknown): number => (typeof v === "number" && !isNaN(v) ? v : 0);
  const yuan = (v: unknown): string => (typeof v === "number" ? `¥${v.toFixed(2)}` : typeof v === "string" ? `¥${v}` : "¥0.00");

  const health = (overview?.health || {}) as Record<string, string>;
  const healthEntries = Object.entries(health);
  const serverInfo = overview?.server || {};
  const users = overview?.users || {};
  const membership = overview?.membership || {};
  const orders = overview?.orders || {};
  const ai = overview?.ai || {};
  const social = overview?.social || {};
  const moderation = overview?.moderation || {};
  const commission = overview?.commission || {};
  const payment = overview?.payment || {};
  // v25.0.61 FINAL-HANDOVER：备份状态（后端 /overview data.backup，只读）
  const backup = (overview?.backup || {}) as {
    gateOk?: boolean;
    offsite?: string;
    lastDrill?: string | null;
    usersDb?: { ok?: boolean; lastSuccess?: string; size?: number };
    socialDb?: { ok?: boolean; lastSuccess?: string; size?: number };
    ordersDb?: { ok?: boolean; lastSuccess?: string; size?: number };
  };

  const stUser = stats?.user || {};
  const stMember = stats?.membership || {};
  const stInvite = stats?.invite || {};
  const stPv = stats?.pageViews || {};
  const stAi = stats?.aiUsage || {};

  const memberLevels = [
    { key: "monthly", name: "月度会员", count: num(stMember.monthly) },
    { key: "yearly", name: "年度会员", count: num(stMember.yearly) },
    { key: "lifetime", name: "终身会员", count: num(stMember.lifetime) },
  ];
  const maxLevelCount = Math.max(...memberLevels.map((l) => l.count), 1);

  const topTools = Array.isArray(stAi.topTools) ? stAi.topTools.slice(0, 6) : [];
  const maxToolCalls = Math.max(...topTools.map((t) => num(t.calls)), 1);
  const topPages = Array.isArray(stPv.topPages) ? stPv.topPages.slice(0, 6) : [];

  return (
    <div>
      <PageHeader onRefresh={load} generatedAt={overview?.generatedAt} />

      {/* ============ 服务健康状态 ============ */}
      <SectionTitle icon={<Activity size={18} />}>服务健康状态</SectionTitle>
      <AdminCard style={{ marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
          <HealthDot label="后端服务" status={health.backend || health.server || "正常"} />
          <HealthDot label="数据库" status={health.database || "正常"} />
          <HealthDot label="AI 服务" status={health.ai || (ai.enabled ? "正常" : "关闭")} />
          <HealthDot label="微信支付" status={health.payment || (payment.nativeReady ? "正常" : "待配置")} />
          {/* v25.0.61 FINAL-HANDOVER 第四十六章：SOCIAL_BACKUP_GATE 红灯（备份门禁失败/超48h未备份） */}
          <HealthDot label="数据备份" status={health.backup || "未知"} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: THEME.textSub, borderTop: `1px solid ${THEME.border}`, paddingTop: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Server size={13} /> 运行 {String(serverInfo.uptimeHours ?? "-")} 小时</span>
          <span>内存 {String(serverInfo.memoryMB ?? "-")} MB</span>
          <span>Node {String(serverInfo.nodeVersion ?? "-")}</span>
          <span>PID {String(serverInfo.pid ?? "-")}</span>
          <span>Web {String(overview?.version || "-")}</span>
          {overview?.appVersion ? <span>APP v{String(overview.appVersion)}</span> : null}
          <span>Commit {String(overview?.gitCommit || "-")}</span>
        </div>
        {/* v25.0.61 FINAL-HANDOVER 第二十八章：备份状态只读显示（无任何密码/密钥） */}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${THEME.border}`, display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: THEME.textSub }}>
          <span>用户库备份：{fmtBackupTime(backup?.usersDb?.lastSuccess)}</span>
          <span>社交库备份：{fmtBackupTime(backup?.socialDb?.lastSuccess)}</span>
          <span>订单库备份：{fmtBackupTime(backup?.ordersDb?.lastSuccess)}（与用户库同文件）</span>
          <span>恢复演练：{fmtBackupTime(backup?.lastDrill)}</span>
          <span>异地备份：{backup?.offsite === "configured" ? "已配置" : "未配置"}</span>
        </div>
        {healthEntries.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 11, color: THEME.textHint }}>
            原始健康字段：{healthEntries.map(([k, v]) => `${k}=${v}`).join(" · ")}
          </div>
        )}
      </AdminCard>

      {/* ============ 核心运营指标 ============ */}
      <SectionTitle icon={<BarChart3 size={18} />}>核心运营指标</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="总用户数" value={num(users.total).toLocaleString()} sub={`今日新增 ${num(users.newToday)} · 7日活跃 ${num(users.active7d)}`} icon={<Users size={18} />} color={THEME.primary} />
        <StatCard label="当前会员数" value={num(membership.paid ?? membership.currentMembers).toLocaleString()} sub={`总会员 ${num(stMember.totalMembers).toLocaleString()}`} icon={<Crown size={18} />} color={THEME.warning} />
        <StatCard label="今日实付金额" value={yuan(orders.todayRevenueYuan)} sub={`累计 ${yuan(orders.revenueYuan)} · 点击查看谁付费`} icon={<Coins size={18} />} color={THEME.success} onClick={() => router.push("/admin/orders?status=PAID")} />
        <StatCard label="待处理订单" value={num(orders.pending).toLocaleString()} sub={`总订单 ${num(orders.total)} · 已支付 ${num(orders.paid)} · 点击查看明细`} icon={<Clock size={18} />} color={num(orders.pending) > 0 ? THEME.error : THEME.info} onClick={() => router.push("/admin/orders?status=PENDING")} />
        <StatCard label="今日 AI 调用" value={num(ai.callsToday).toLocaleString()} sub={`成功率 ${String(ai.successRate ?? "-")}`} icon={<Bot size={18} />} color={THEME.info} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginBottom: 24 }}>
        {/* ============ 用户与增长 ============ */}
        <AdminCard title="用户与增长">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <MiniStat label="累计注册" value={num(stUser.total).toLocaleString()} />
            <MiniStat label="今日新增" value={num(stUser.newToday).toLocaleString()} />
            <MiniStat label="本周新增" value={num(stUser.newThisWeek).toLocaleString()} />
            <MiniStat label="本月新增" value={num(stUser.newThisMonth).toLocaleString()} />
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${THEME.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: THEME.textSub, marginBottom: 6 }}>近 7 日活跃用户</div>
            <ProgressBar value={num(users.active7d)} max={Math.max(num(users.total), 1)} color={THEME.primary} />
            <div style={{ fontSize: 11, color: THEME.textHint, marginTop: 4 }}>{num(users.active7d)} / {num(users.total)} 人</div>
          </div>
        </AdminCard>

        {/* ============ 会员等级分布 ============ */}
        <AdminCard title="会员等级分布">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {memberLevels.map((l) => (
              <div key={l.key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: THEME.textMain }}>{l.name}</span>
                  <span style={{ fontSize: 13, color: THEME.textSub }}>{l.count.toLocaleString()} 人</span>
                </div>
                <ProgressBar value={l.count} max={maxLevelCount} color={l.key === "lifetime" ? THEME.warning : l.key === "yearly" ? THEME.primary : THEME.info} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${THEME.border}`, fontSize: 12, color: THEME.textSub }}>
            累计会员收入：{yuan(stMember.revenue)}
          </div>
        </AdminCard>

        {/* ============ 邀请与浏览 ============ */}
        <AdminCard title="邀请与页面浏览">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <MiniStat label="累计邀请" value={num(stInvite.totalInvites).toLocaleString()} icon={<Gift size={13} />} />
            <MiniStat label="成功邀请" value={num(stInvite.successfulInvites).toLocaleString()} />
            <MiniStat label="总浏览量" value={num(stPv.total).toLocaleString()} icon={<Eye size={13} />} />
            <MiniStat label="今日浏览" value={num(stPv.today).toLocaleString()} />
          </div>
          {topPages.length > 0 ? (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${THEME.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: THEME.textSub, marginBottom: 6 }}>热门页面</div>
              {topPages.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: THEME.textMain, padding: "3px 0" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{p.title || p.path || "-"}</span>
                  <span style={{ color: THEME.textHint }}>{num(p.views).toLocaleString()} 次</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 12, fontSize: 11, color: THEME.textHint }}>页面浏览明细暂无数据（需接入埋点后展示）</div>
          )}
        </AdminCard>

        {/* ============ 社交与审核 ============ */}
        <AdminCard title="社交与内容审核">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <MiniStat label="群聊数" value={num(social.groups).toLocaleString()} icon={<MessagesSquare size={13} />} />
            <MiniStat label="动态数" value={num(social.posts).toLocaleString()} />
            <MiniStat label="待处理举报" value={num(moderation.pendingReports).toLocaleString()} icon={<Flag size={13} />} highlight={num(moderation.pendingReports) > 0} />
            <MiniStat label="评论数" value={num(social.comments).toLocaleString()} />
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${THEME.border}`, fontSize: 12, color: THEME.textSub, display: "flex", flexDirection: "column", gap: 4 }}>
            <span>佣金记录：{num(commission.records).toLocaleString()} 条 · 累计 {yuan(commission.totalYuan)}</span>
            <span>待审提现：{num(commission.withdrawalsPending).toLocaleString()} 笔</span>
          </div>
        </AdminCard>
      </div>

      {/* ============ AI 使用统计 ============ */}
      <SectionTitle icon={<Bot size={18} />}>AI 使用统计</SectionTitle>
      <AdminCard>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
          <MiniStat label="今日调用" value={num(stAi.today).toLocaleString()} />
          <MiniStat label="累计调用" value={num(stAi.totalCalls).toLocaleString()} />
          <MiniStat label="成功率" value={`${num(stAi.successRate)}%`} icon={<Target size={13} />} />
          <MiniStat label="AI 总开关" value={ai.enabled === false ? "关闭" : "开启"} icon={<ShieldCheck size={13} />} highlight={ai.enabled === false} />
        </div>
        {topTools.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topTools.map((t, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: THEME.textMain }}>{t.name || "-"}</span>
                  <span style={{ fontSize: 12, color: THEME.textSub }}>{num(t.calls).toLocaleString()} 次</span>
                </div>
                <ProgressBar value={num(t.calls)} max={maxToolCalls} color={THEME.info} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: THEME.textHint }}>AI 工具调用明细暂无数据</div>
        )}
      </AdminCard>

      <div style={{ textAlign: "center", padding: "12px 0 4px", fontSize: 12, color: THEME.textHint, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <TrendingUp size={12} /> 数据生成于 {overview?.generatedAt ? new Date(overview.generatedAt).toLocaleString("zh-CN") : stats?.generatedAt ? new Date(stats.generatedAt).toLocaleString("zh-CN") : "-"}
      </div>
    </div>
  );
}

// ==================== 子组件 ====================

function PageHeader({ onRefresh, generatedAt }: { onRefresh: () => void; generatedAt?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: THEME.textMain, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <Activity size={26} color={THEME.primary} /> 系统状态
        </h1>
        <p style={{ fontSize: 14, color: THEME.textSub, marginTop: 6 }}>
          服务健康 · 核心指标 · 会员分布 · AI 使用
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

// v25.0.61 FINAL-HANDOVER：备份时间显示（缺数据显示 "-"）
function fmtBackupTime(t?: string | null): string {
  if (!t) return "-";
  const d = new Date(t);
  if (isNaN(d.getTime())) return String(t);
  return d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function HealthDot({ label, status }: { label: string; status: string }) {
  const s = String(status);
  const isBad = /故障|关闭|error|down|fail/i.test(s);
  const isWarn = /待配置|维护|partial|warn|未知/i.test(s);
  const color = isBad ? THEME.error : isWarn ? THEME.warning : THEME.success;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 10,
        border: `1px solid ${THEME.border}`,
        backgroundColor: "#fff",
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 12, color: THEME.textSub }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>{isBad ? "故障/关闭" : isWarn ? s : "正常"}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon, highlight = false }: { label: string; value: string | number; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        backgroundColor: highlight ? "#FEF2F2" : THEME.primaryBgLight,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: THEME.textSub }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: highlight ? THEME.error : THEME.textMain }}>{value}</div>
      </div>
      {icon && <span style={{ color: highlight ? THEME.error : THEME.primaryLight, display: "flex" }}>{icon}</span>}
    </div>
  );
}
