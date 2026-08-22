"use client";

// ============================================================================
// 言道国学 - 运营管理中心 · 老板驾驶舱（FINAL-ADMIN-COMMERCIAL-SEAL-02 第二章）
// 登录 /admin 第一屏，直接显示 20 项核心指标 + 三色健康状态
// 数据源：GET /api/admin/unified/overview（服务端实时聚合）
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Bot,
  Clock,
  Coins,
  CreditCard,
  Crown,
  Database,
  GitCommitHorizontal,
  Globe,
  Layers,
  Receipt,
  RefreshCw,
  Server,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { THEME, AdminCard, Badge, LoadingSpinner, useMounted, useToast } from "./_shared";
import { fetchAdminOverview, type AdminOverviewData } from "@/lib/admin/client";

// ==================== 三色健康状态渲染 ====================

function healthColor(status?: string): { color: string; label: string } {
  if (status === "ok" || status === "ON" || status === true) return { color: THEME.success, label: "正常" };
  if (status === "warn" || status === "degraded" || status === "MAINTENANCE") return { color: THEME.warning, label: "部分可用" };
  if (status === "error" || status === "OFF" || status === "down") return { color: THEME.error, label: "故障" };
  return { color: THEME.textHint, label: "未知" };
}

function HealthDot({ status }: { status?: string }) {
  const c = healthColor(status);
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: c.color,
        marginRight: 8,
        boxShadow: `0 0 6px ${c.color}55`,
        flexShrink: 0,
      }}
    />
  );
}

function HealthBadge({ status }: { status?: string }) {
  const c = healthColor(status);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 700,
        backgroundColor: `${c.color}18`,
        color: c.color,
        whiteSpace: "nowrap",
      }}
    >
      <HealthDot status={status} />
      {c.label}
    </span>
  );
}

// ==================== 指标卡片 ====================

function MetricCard({
  label,
  value,
  sub,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <div
      style={{
        backgroundColor: THEME.cardBg,
        borderRadius: 12,
        border: `1px solid ${THEME.border}`,
        padding: 16,
        position: "relative",
        overflow: "hidden",
        cursor: href ? "pointer" : "default",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        if (href) e.currentTarget.style.boxShadow = "0 4px 16px rgba(123,47,190,0.12)";
      }}
      onMouseLeave={(e) => {
        if (href) e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 4,
          height: "100%",
          backgroundColor: THEME.primary,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 12, color: THEME.textSub, fontWeight: 500 }}>{label}</div>
        {icon && <div style={{ color: THEME.primary, fontSize: 16 }}>{icon}</div>}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: THEME.textMain, marginTop: 6, lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: THEME.textHint, marginTop: 4 }}>{sub}</div>}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link> : inner;
}

// ==================== 主页面 ====================

export default function AdminCockpitPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const d = await fetchAdminOverview();
        if (d) {
          setData(d);
          if (!silent) show("驾驶舱数据已刷新", "success");
        } else if (!silent) {
          show("数据加载失败，请检查密钥权限", "error");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [show]
  );

  useEffect(() => {
    if (!mounted) return;
    load(true);
    const timer = setInterval(() => load(true), 60000);
    return () => clearInterval(timer);
  }, [mounted, load]);

  if (!mounted || loading) {
    return <LoadingSpinner text="正在加载驾驶舱数据..." />;
  }

  if (!data) {
    return (
      <AdminCard title="驾驶舱数据加载失败">
        <div style={{ color: THEME.textSub, fontSize: 14, marginBottom: 16 }}>
          无法获取总览数据，可能是管理员密钥无效或权限不足（需要 ADMIN 及以上角色）。
        </div>
        <button
          onClick={() => load()}
          style={{ padding: "8px 16px", border: "none", borderRadius: 8, backgroundColor: THEME.primary, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          重新加载
        </button>
      </AdminCard>
    );
  }

  const users = data.users || {};
  const orders = data.orders || {};
  const ai = data.ai || {};
  const social = data.social || {};
  const moderation = (data.moderation || {}) as Record<string, number>;
  const commission = data.commission || {};
  const payment = data.payment || {};
  const server = data.server || {};
  const health = data.health || {};
  const membership = (data.membership || {}) as Record<string, number>;

  const pendingReports = moderation.pendingReports ?? moderation.pending ?? 0;
  const currentMembers =
    membership.currentMembers ?? membership.members ?? membership.total ?? 0;

  return (
    <div>
      {toastNode}

      {/* ===== 页头 ===== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: THEME.textMain, margin: 0 }}>
            老板驾驶舱
          </h1>
          <div style={{ fontSize: 13, color: THEME.textSub, marginTop: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Badge type="primary">
              <GitCommitHorizontal size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
              {data.version || "未知版本"}
            </Badge>
            <Badge type="info">Commit {data.gitCommit || "-"}</Badge>
            <span>数据每 60 秒自动刷新</span>
          </div>
        </div>
        <button
          onClick={() => load()}
          disabled={refreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            border: `1px solid ${THEME.border}`,
            borderRadius: 8,
            backgroundColor: "#fff",
            color: THEME.textMain,
            fontSize: 13,
            fontWeight: 600,
            cursor: refreshing ? "not-allowed" : "pointer",
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} className={refreshing ? "spin-anim" : ""} />
          {refreshing ? "刷新中..." : "刷新数据"}
        </button>
      </div>

      {/* ===== 系统健康三色状态（指令第二章 1-7 项） ===== */}
      <AdminCard
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Activity size={15} /> 系统健康状态
          </span>
        }
        style={{ marginBottom: 16 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: THEME.primaryBgLight, borderRadius: 8 }}>
            <span style={{ fontSize: 13, color: THEME.textSub, display: "flex", alignItems: "center" }}>
              <Server size={14} style={{ marginRight: 6 }} /> 服务器
            </span>
            <HealthBadge status={health.server} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: THEME.primaryBgLight, borderRadius: 8 }}>
            <span style={{ fontSize: 13, color: THEME.textSub, display: "flex", alignItems: "center" }}>
              <ShieldCheck size={14} style={{ marginRight: 6 }} /> 后端服务
            </span>
            <HealthBadge status={health.backend} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: THEME.primaryBgLight, borderRadius: 8 }}>
            <span style={{ fontSize: 13, color: THEME.textSub, display: "flex", alignItems: "center" }}>
              <Database size={14} style={{ marginRight: 6 }} /> 数据库
            </span>
            <HealthBadge status={health.db} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: THEME.primaryBgLight, borderRadius: 8 }}>
            <span style={{ fontSize: 13, color: THEME.textSub, display: "flex", alignItems: "center" }}>
              <Bot size={14} style={{ marginRight: 6 }} /> AI 服务
            </span>
            <HealthBadge status={ai.enabled === false ? "OFF" : health.ai} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: THEME.primaryBgLight, borderRadius: 8 }}>
            <span style={{ fontSize: 13, color: THEME.textSub, display: "flex", alignItems: "center" }}>
              <CreditCard size={14} style={{ marginRight: 6 }} /> 微信支付
            </span>
            <HealthBadge status={payment.nativeReady ? "ok" : "error"} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: THEME.textHint, marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center" }}><HealthDot status="ok" />绿色=正常</span>
          <span style={{ display: "flex", alignItems: "center" }}><HealthDot status="warn" />黄色=部分可用/待配置</span>
          <span style={{ display: "flex", alignItems: "center" }}><HealthDot status="error" />红色=故障/关闭</span>
        </div>
      </AdminCard>

      {/* ===== 用户与会员（8-11 项） ===== */}
      <div style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain, margin: "18px 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <Users size={16} style={{ color: THEME.primary }} /> 用户与会员
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <MetricCard label="今日新增用户" value={users.newToday ?? 0} sub={`7日活跃 ${users.active7d ?? 0}`} icon={<TrendingUp size={16} />} href="/admin/moderation" />
        <MetricCard label="总用户数" value={users.total ?? 0} sub="累计注册" icon={<Users size={16} />} href="/admin/moderation" />
        <MetricCard label="当前会员数" value={currentMembers} sub="付费会员" icon={<Crown size={16} />} href="/admin/membership" />
      </div>

      {/* ===== 订单与收入（12-14 项） ===== */}
      <div style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain, margin: "18px 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <Receipt size={16} style={{ color: THEME.primary }} /> 订单与收入
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <MetricCard label="今日订单" value={orders.today ?? 0} sub={`累计 ${orders.total ?? 0}`} icon={<Receipt size={16} />} href="/admin/orders" />
        <MetricCard label="今日实付金额" value={`¥${orders.todayRevenueYuan ?? "0.00"}`} sub={`累计 ¥${orders.revenueYuan ?? "0.00"}`} icon={<Wallet size={16} />} href="/admin/orders" />
        <MetricCard
          label="待处理订单"
          value={orders.pendingToday ?? orders.pending ?? 0}
          sub={(orders.pendingToday ?? orders.pending ?? 0) > 0 ? "存在待支付订单" : "无积压"}
          icon={<Clock size={16} />}
          href="/admin/orders"
        />
      </div>

      {/* ===== AI 与内容（15-18 项） ===== */}
      <div style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain, margin: "18px 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <Bot size={16} style={{ color: THEME.primary }} /> AI 与内容
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <MetricCard
          label="今日 AI 调用"
          value={ai.callsToday ?? 0}
          sub={`成功率 ${ai.successRate ?? "-"}%`}
          icon={<Bot size={16} />}
          href="/admin/ai-control"
        />
        <MetricCard label="群数量" value={social.groups ?? 0} sub={`今日动态 ${social.postsToday ?? 0}`} icon={<MessagesSquareIcon />} href="/admin/moderation" />
        <MetricCard
          label="待审核举报"
          value={pendingReports}
          sub={pendingReports > 0 ? "需要尽快处理" : "暂无待处理"}
          icon={<AlertTriangle size={16} />}
          href="/admin/moderation"
        />
      </div>

      {/* ===== 分佣与提现（19-20 项） ===== */}
      <div style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain, margin: "18px 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <Coins size={16} style={{ color: THEME.primary }} /> 分佣与提现
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <MetricCard label="今日佣金" value={`¥${commission.todayYuan ?? "0.00"}`} sub={`累计 ¥${commission.totalYuan ?? "0.00"}`} icon={<Coins size={16} />} href="/admin/commission" />
        <MetricCard
          label="待解冻佣金"
          value={`¥${commission.frozenYuan ?? "0.00"}`}
          sub={`${commission.records ?? 0} 条记录`}
          icon={<BadgeCheck size={16} />}
          href="/admin/commission"
        />
        <MetricCard
          label="提现状态"
          value={commission.withdrawTransfer === "ENABLED" ? "已开放" : "暂未开放"}
          sub={`待审核 ${commission.withdrawalsPending ?? 0} 笔`}
          icon={<Banknote size={16} />}
          href="/admin/commission"
        />
      </div>

      {/* ===== 微信支付详情 ===== */}
      <AdminCard
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CreditCard size={15} /> 微信支付状态
          </span>
        }
        style={{ marginTop: 18 }}
        extra={<Badge type={payment.nativeReady ? "success" : "error"}>{payment.mode || "未配置"}</Badge>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div style={{ fontSize: 13, color: THEME.textSub }}>
            商户号：<b style={{ color: THEME.textMain }}>{payment.mchId || "-"}</b>
          </div>
          <div style={{ fontSize: 13, color: THEME.textSub }}>
            扫码支付(Native)：<b style={{ color: payment.nativeReady ? THEME.success : THEME.error }}>{payment.nativeReady ? "已就绪" : "未配置"}</b>
          </div>
          <div style={{ fontSize: 13, color: THEME.textSub }}>
            JSAPI(微信内)：<b style={{ color: payment.jsapiReady ? THEME.success : THEME.warning }}>{payment.jsapiReady ? "已就绪" : "待公众号参数"}</b>
          </div>
          <div style={{ fontSize: 13, color: THEME.textSub }}>
            AppID：<b style={{ color: payment.appIdConfigured ? THEME.success : THEME.error }}>{payment.appIdConfigured ? "已配置" : "未配置"}</b>
          </div>
          <div style={{ fontSize: 13, color: THEME.textSub }}>
            最近成功支付：<b style={{ color: THEME.textMain }}>{payment.lastPaidAt ? new Date(payment.lastPaidAt).toLocaleString("zh-CN") : "暂无"}</b>
          </div>
        </div>
        <div style={{ fontSize: 12, color: THEME.textHint, marginTop: 10 }}>
          支付密钥等敏感信息一律不在后台显示（只显示已配置/未配置状态）。
        </div>
      </AdminCard>

      {/* ===== 服务器运行信息 ===== */}
      <AdminCard
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Globe size={15} /> 运行环境
          </span>
        }
        style={{ marginTop: 16 }}
        extra={<Badge type="info">Node {server.nodeVersion || "-"}</Badge>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <div style={{ fontSize: 13, color: THEME.textSub }}>
            运行时长：<b style={{ color: THEME.textMain }}>{server.uptimeHours ?? "-"} 小时</b>
          </div>
          <div style={{ fontSize: 13, color: THEME.textSub }}>
            内存占用：<b style={{ color: THEME.textMain }}>{server.memoryMB ?? "-"} MB</b>
          </div>
          <div style={{ fontSize: 13, color: THEME.textSub }}>
            AI Provider：<b style={{ color: THEME.textMain }}>{ai.provider || "-"}</b>
          </div>
          <div style={{ fontSize: 13, color: THEME.textSub }}>
            最近成功 AI：<b style={{ color: THEME.textMain }}>{ai.lastSuccessAt ? new Date(ai.lastSuccessAt).toLocaleString("zh-CN") : "暂无"}</b>
          </div>
          {ai.lastError && (
            <div style={{ fontSize: 13, color: THEME.error, gridColumn: "1 / -1" }}>
              最近 AI 错误：{ai.lastError}
            </div>
          )}
        </div>
      </AdminCard>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-anim { animation: spin 0.8s linear infinite; }
        @media (max-width: 640px) {
          .yd-admin-page-inner > div > div:first-child { gap: 8px; }
        }
      `}</style>
    </div>
  );
}

function MessagesSquareIcon() {
  return <Layers size={16} />;
}
