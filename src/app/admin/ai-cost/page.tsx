"use client";

// ============================================================================
// 言道国学 - AI 成本中心（AI Phase 1）
// 需求：P0-PRODUCTION-SEAL-AND-AI-COST-PHASE1-03 第四十六~四十七章
//   - 今日/本月请求数、成功率、失败数、tokens、估算成本
//   - Top用户 / 按功能 / 按模型 / 按会员档
//   - AI_USAGE_POLICY（服务端唯一事实源）只读展示 + 版本号
//   - 成本/异常告警状态（不自动封号）
// ============================================================================

import { useEffect, useState } from "react";
import {
  Bot,
  Coins,
  TrendingUp,
  UserCog,
  Layers,
  Cpu,
  Crown,
  BellRing,
  ShieldCheck,
} from "lucide-react";
import {
  THEME,
  AdminCard,
  StatCard,
  Badge,
  LoadingSpinner,
  useToast,
  useMounted,
  styles,
  SectionTitle,
} from "../_shared";
import {
  fetchAICostSummary,
  fetchAICostList,
  fetchAIPolicy,
} from "@/lib/admin/client";

const LEVEL_LABELS: Record<string, string> = {
  basic: "免费用户",
  monthly: "月度会员",
  quarterly: "季度会员",
  yearly: "年度会员",
  lifetime: "终身会员",
  unknown: "未知",
  anonymous: "匿名（旧APK过渡）",
};

function fmtMoney(n: unknown): string {
  const v = Number(n) || 0;
  return v > 0 ? `¥${v.toFixed(4)}` : "¥0";
}

function fmtNum(n: unknown): string {
  const v = Number(n) || 0;
  return v.toLocaleString("zh-CN");
}

export default function AICostCenterPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [byFeature, setByFeature] = useState<any[]>([]);
  const [byModel, setByModel] = useState<any[]>([]);
  const [byMembership, setByMembership] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, tu, bf, bm, bmbr, al, pol] = await Promise.all([
        fetchAICostSummary(),
        fetchAICostList("top-users"),
        fetchAICostList("by-feature"),
        fetchAICostList("by-model"),
        fetchAICostList("by-membership"),
        fetchAICostList("alerts"),
        fetchAIPolicy(),
      ]);
      setSummary(s);
      setTopUsers(tu);
      setByFeature(bf);
      setByModel(bm);
      setByMembership(bmbr);
      setAlerts(al);
      setPolicy(pol);
    } catch (e: any) {
      show(`加载失败：${e?.message || e}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted) return null;
  if (loading) return <LoadingSpinner text="AI 成本中心加载中..." />;

  const today = summary?.today || {};
  const month = summary?.month || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {toastNode}

      {/* ============ 核心指标 ============ */}
      <AdminCard title="今日 AI 调用（中国时区 UTC+8）">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <StatCard label="今日请求数" value={fmtNum(today.requests)} icon={<Bot size={18} />} />
          <StatCard label="今日成功" value={fmtNum(today.success)} color={THEME.success} />
          <StatCard label="今日失败" value={fmtNum(today.fail)} color={today.fail > 0 ? THEME.error : THEME.textSub} />
          <StatCard label="今日 tokens（入/出）" value={`${fmtNum(today.tokensIn)} / ${fmtNum(today.tokensOut)}`} icon={<Cpu size={18} />} />
          <StatCard label="今日估算成本" value={fmtMoney(today.estimatedCost)} icon={<Coins size={18} />} color={THEME.primary} />
          <StatCard label="今日未知成本条数" value={fmtNum(today.unknownCost)} sub="缺 model/价格版本 → UNKNOWN" color={THEME.warning} />
        </div>
      </AdminCard>

      <AdminCard title="本月 AI 调用">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <StatCard label="本月请求" value={fmtNum(month.requests)} icon={<TrendingUp size={18} />} />
          <StatCard label="本月成功" value={fmtNum(month.success)} color={THEME.success} />
          <StatCard label="本月失败" value={fmtNum(month.fail)} color={month.fail > 0 ? THEME.error : THEME.textSub} />
          <StatCard label="本月 tokens（入/出）" value={`${fmtNum(month.tokensIn)} / ${fmtNum(month.tokensOut)}`} />
          <StatCard label="本月估算成本" value={fmtMoney(month.estimatedCost)} icon={<Coins size={18} />} color={THEME.primary} />
        </div>
      </AdminCard>

      {/* ============ AI_USAGE_POLICY 只读展示 ============ */}
      <AdminCard title="AI_USAGE_POLICY（服务端唯一事实源）" extra={<Badge>policyVersion {policy?.policyVersion || "—"}</Badge>}>
        {policy?.legacyUnlimitedProtected?.length ? (
          <p style={{ fontSize: 12, color: THEME.textSub, margin: "0 0 12px 0" }}>
            <ShieldCheck size={14} style={{ verticalAlign: "-2px", marginRight: 6, color: THEME.primary }} />
            历史无限权益保护档位：{policy.legacyUnlimitedProtected.map((l: string) => LEVEL_LABELS[l] || l).join(" / ")}
            （LEGACY_UNLIMITED_PROTECTED，禁止改为每天 N 次，仅施加 Fair Use 安全限流）
          </p>
        ) : null}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: THEME.primaryBg }}>
              <th style={th}>档位</th>
              <th style={th}>每日次数</th>
              <th style={th}>月硬上限</th>
              <th style={th}>并发</th>
              <th style={th}>输入上限(字)</th>
              <th style={th}>输出上限(tokens)</th>
              <th style={th}>超额购买</th>
              <th style={th}>历史无限</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(policy?.tiers || {}).map(([level, t]: [string, any]) => (
              <tr key={level} style={{ borderTop: `1px solid ${THEME.border}` }}>
                <td style={td}>{LEVEL_LABELS[level] || level}</td>
                <td style={td}>{t.dailyRequests === -1 ? "无限" : t.dailyRequests}</td>
                <td style={td}>{t.monthlyRequests === -1 ? "不设上限" : t.monthlyRequests}</td>
                <td style={td}>{t.maxConcurrent}</td>
                <td style={td}>{t.maxInputChars}</td>
                <td style={td}>{t.maxOutputTokens}</td>
                <td style={td}>{t.overageAllowed ? t.overageProductId || "是" : "否"}</td>
                <td style={td}>{t.legacyUnlimited ? <Badge type="primary">是</Badge> : "否"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: THEME.textHint, margin: "10px 0 0 0" }}>
          后台修改策略接口 PUT /api/admin/ai-policy 自动 bump policyVersion；禁止静默 UPDATE 一个数字导致历史权益瞬间变化。
        </p>
      </AdminCard>

      {/* ============ 明细维度 ============ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <AdminCard title={<SectionTitle icon={<Layers size={16} />}>按功能</SectionTitle>}>
          <GroupTable rows={byFeature} keyField="feature" />
        </AdminCard>
        <AdminCard title={<SectionTitle icon={<Crown size={16} />}>按会员档</SectionTitle>}>
          <GroupTable rows={byMembership} keyField="level" keyLabel={(k) => LEVEL_LABELS[k] || k} />
        </AdminCard>
        <AdminCard title={<SectionTitle icon={<Cpu size={16} />}>按模型</SectionTitle>}>
          <GroupTable rows={byModel} keyField="model" />
        </AdminCard>
        <AdminCard title={<SectionTitle icon={<UserCog size={16} />}>Top 用户（按估算成本）</SectionTitle>}>
          <GroupTable rows={topUsers} keyField="user_id" />
        </AdminCard>
      </div>

      {/* ============ 告警状态 ============ */}
      <AdminCard
        title={
          <SectionTitle icon={<BellRing size={16} />}>
            成本 / 异常告警（告警状态，不自动封号）
          </SectionTitle>
        }
      >
        {alerts.length === 0 ? (
          <p style={{ fontSize: 13, color: THEME.textSub }}>当前无异常告警。</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: a.level === "critical" ? THEME.errorBg : THEME.warningBg,
                  border: `1px solid ${a.level === "critical" ? "#fecaca" : "#fde68a"}`,
                  fontSize: 13,
                }}
              >
                <Badge type={a.level === "critical" ? "error" : "warning"}>{a.kind}</Badge>
                <strong style={{ color: THEME.textMain }}>{a.title}</strong>
                <span style={{ color: THEME.textSub, flex: 1 }}>{a.detail}</span>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  fontWeight: 600,
  color: THEME.textSub,
  fontSize: 12,
};
const td: React.CSSProperties = {
  padding: "6px 8px",
  color: THEME.textMain,
};

function GroupTable({
  rows,
  keyField,
  keyLabel,
}: {
  rows: any[];
  keyField: string;
  keyLabel?: (k: string) => string;
}) {
  if (!rows || rows.length === 0) {
    return <p style={{ fontSize: 13, color: THEME.textHint }}>暂无数据。</p>;
  }
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ background: THEME.primaryBg }}>
          <th style={th}>{keyField === "user_id" ? "用户" : "名称"}</th>
          <th style={th}>调用</th>
          <th style={th}>tokens 入/出</th>
          <th style={th}>估算成本</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderTop: `1px solid ${THEME.border}` }}>
            <td style={td}>{(keyLabel ? keyLabel(r[keyField]) : r[keyField]) || "unknown"}</td>
            <td style={td}>{fmtNum(r.calls)}</td>
            <td style={td}>{`${fmtNum(r.tin)} / ${fmtNum(r.tout)}`}</td>
            <td style={td}>{fmtMoney(r.estCost)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}