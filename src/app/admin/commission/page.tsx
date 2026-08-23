"use client";

// ============================================================================
// 言道国学 - 分佣与提现管理后台（P8-DISTRIBUTION-COMMISSION-AUTO · v25.0.47_12 两级分佣）
//   · 分佣配置：总开关 / 一级15%+二级5%两级比例 / 月度结算（30号结算/15号后提现）/ 提现通道开关
//   · 佣金明细：按推荐人 / 订单号 / 状态筛选（含待审核异常单，二级佣金记录 record_type=COMMISSION_L2）
//   · 提现审核：待审核列表 + 通过（自动转账）+ 驳回（必填原因）+ 手动解冻扫描
//   · 合规：所有变更走后端审计（operator/time/old/new/reason/IP）
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Coins, RefreshCw, CheckCircle2, XCircle, Snowflake, Settings2, FileText, Banknote, Download, BarChart3 } from "lucide-react";
import { THEME, styles, AdminCard, StatCard, Badge, LoadingSpinner, useMounted, useToast, ConfirmDialog } from "../_shared";
import {
  fetchCommissionConfig,
  updateCommissionConfig,
  fetchCommissionRecords,
  fetchWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  runUnfreezeScan,
  batchApproveWithdrawals,
  syncWithdrawal,
  fetchCommissionStats,
  exportWithdrawalsCsv,
  type CommissionConfig,
  type AdminCommissionRecord,
  type AdminWithdrawal,
  type CommissionStats,
} from "@/lib/admin/unifiedService";

const RECORD_STATUS: Record<string, { label: string; type: "success" | "warning" | "error" | "info" }> = {
  FROZEN: { label: "待解冻", type: "warning" },
  UNFROZEN: { label: "可提现", type: "success" },
  AVAILABLE: { label: "已到账", type: "success" },
  REVERSED: { label: "已冲正", type: "error" },
  PENDING_REVIEW: { label: "待审核", type: "info" },
};

const WITHDRAW_STATUS: Record<string, { label: string; type: "success" | "warning" | "error" | "info" }> = {
  PENDING_REVIEW: { label: "待审核", type: "warning" },
  TRANSFERING: { label: "转账中", type: "info" },
  PROCESSING: { label: "处理中", type: "info" },
  PAID: { label: "已到账", type: "success" },
  FAILED: { label: "失败", type: "error" },
  REJECTED: { label: "已驳回", type: "error" },
};

type TabKey = "config" | "records" | "withdrawals" | "finance";

function fmtTime(iso?: string | null): string {
  if (!iso) return "-";
  return iso.slice(0, 16).replace("T", " ");
}

function fmtCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default function AdminCommissionPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();

  const [tab, setTab] = useState<TabKey>("config");
  const [loading, setLoading] = useState(true);

  // 配置
  const [config, setConfig] = useState<CommissionConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmReason, setConfirmReason] = useState("");

  // 佣金明细
  const [records, setRecords] = useState<AdminCommissionRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [filterInviter, setFilterInviter] = useState("");
  const [filterOrder, setFilterOrder] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // 提现
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [withdrawTotal, setWithdrawTotal] = useState(0);
  const [wStatus, setWStatus] = useState("PENDING_REVIEW");

  // 审核弹窗
  const [approveTarget, setApproveTarget] = useState<AdminWithdrawal | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminWithdrawal | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  // v25.0.47_13: 批量审核 / 状态同步 / 导出 / 财务报表
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsDays, setStatsDays] = useState(30);

  const loadConfig = useCallback(async () => {
    const cfg = await fetchCommissionConfig();
    if (cfg) setConfig(cfg);
    else show("分佣配置加载失败", "error");
  }, [show]);

  const loadRecords = useCallback(async () => {
    const data = await fetchCommissionRecords(1, {
      inviter: filterInviter || undefined,
      orderNo: filterOrder || undefined,
      status: filterStatus || undefined,
    });
    if (data) {
      setRecords(data.records || []);
      setRecordsTotal(data.total || 0);
    }
  }, [filterInviter, filterOrder, filterStatus]);

  const loadWithdrawals = useCallback(async () => {
    const data = await fetchWithdrawals(wStatus);
    if (data) {
      setWithdrawals(data.withdrawals || []);
      setWithdrawTotal(data.total || 0);
    }
  }, [wStatus]);

  useEffect(() => {
    if (!mounted) return;
    (async () => {
      setLoading(true);
      await Promise.all([loadConfig(), loadRecords(), loadWithdrawals()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (mounted) loadWithdrawals();
  }, [mounted, wStatus, loadWithdrawals]);

  // ==================== 配置保存 ====================
  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    const r = await updateCommissionConfig({
      enabled: config.enabled,
      ratios: config.ratios,
      unfreezeEnabled: config.unfreezeEnabled,
      unfreezeDays: config.unfreezeDays,
      withdrawEnabled: config.withdrawEnabled !== false,
      monthlySettleEnabled: config.monthlySettleEnabled !== false,
      settleDay: Number(config.settleDay) || 30,
      withdrawOpenDay: Number(config.withdrawOpenDay) || 15,
      minWithdrawYuan: config.minWithdrawYuan,
      dailyWithdrawLimit: config.dailyWithdrawLimit,
      transferNote: config.transferNote,
      riskControl: config.riskControl,
      __reason: confirmReason || "后台更新分佣配置",
    });
    setSaving(false);
    if (r.ok) {
      show("分佣配置已保存（新订单生效）");
      setConfirmReason("");
    } else {
      show(r.error || "保存失败", "error");
    }
  };

  // ==================== 提现审核 ====================
  const handleApprove = async () => {
    if (!approveTarget) return;
    setBusy(true);
    const r = await approveWithdrawal(approveTarget.id, confirmReason || "审核通过");
    setBusy(false);
    setApproveTarget(null);
    if (r.ok) {
      show(`已通过：${r.status === "PAID" ? "自动转账已发起" : "进入处理中（人工打款）"}`);
      loadWithdrawals();
    } else {
      show(r.error || "审核失败", "error");
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (rejectReason.trim().length < 2) {
      show("驳回必须填写原因", "error");
      return;
    }
    setBusy(true);
    const r = await rejectWithdrawal(rejectTarget.id, rejectReason.trim());
    setBusy(false);
    setRejectTarget(null);
    setRejectReason("");
    if (r.ok) {
      show("已驳回，余额已退回用户可提现账户");
      loadWithdrawals();
    } else {
      show(r.error || "驳回失败", "error");
    }
  };

  const handleUnfreeze = async () => {
    const r = await runUnfreezeScan();
    if (r.ok) show(`解冻扫描完成：${r.unfrozen ?? 0} 条转为可提现`);
    else show(r.error || "扫描失败", "error");
    loadRecords();
  };

  // ==================== v25.0.47_13: 批量通过 / 状态同步 / 导出 / 报表 ====================
  const pendingIds = withdrawals.filter((w) => w.status === "PENDING_REVIEW").map((w) => w.id);
  const allSelected = pendingIds.length > 0 && selectedIds.length === pendingIds.length;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : pendingIds);
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) {
      show("请先勾选待审核的提现单", "error");
      return;
    }
    setBatchBusy(true);
    const r = await batchApproveWithdrawals(selectedIds, "财务批量审核通过");
    setBatchBusy(false);
    if ("ok" in r && typeof r.ok === "boolean" && r.ok === false && !("total" in r)) {
      show((r as { error?: string }).error || "批量审核失败", "error");
      return;
    }
    const data = r as { ok: number; total: number };
    show(`批量审核完成：${data.ok}/${data.total} 笔成功（已发起转账或进入处理中）`);
    setSelectedIds([]);
    loadWithdrawals();
  };

  const handleSync = async (w: AdminWithdrawal) => {
    setSyncingId(w.id);
    const r = await syncWithdrawal(w.id);
    setSyncingId(null);
    if (r.ok) {
      if (r.changed) show(`已同步：微信侧状态 ${r.state}，订单已落账`);
      else show(`微信侧当前状态：${r.state}（未变化）`, "info");
      loadWithdrawals();
    } else {
      show(r.error || "同步失败", "error");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const r = await exportWithdrawalsCsv({
      from: exportFrom || undefined,
      to: exportTo || undefined,
      status: wStatus || undefined,
    });
    setExporting(false);
    if (r.ok) show(`已导出 ${r.filename}（Excel 可直接打开）`);
    else show(r.error || "导出失败", "error");
  };

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const s = await fetchCommissionStats(statsDays);
    if (s) setStats(s);
    else show("报表加载失败（需财务管理员权限）", "error");
    setStatsLoading(false);
  }, [statsDays, show]);

  useEffect(() => {
    if (mounted && tab === "finance") loadStats();
  }, [mounted, tab, loadStats]);

  if (!mounted || loading) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSpinner text="加载分佣数据..." />
      </div>
    );
  }

  const pendingCount = withdrawals.filter((w) => w.status === "PENDING_REVIEW").length;
  const totalCommission = records
    .filter((r) => r.record_type === "COMMISSION" && r.status !== "REVERSED")
    .reduce((s, r) => s + r.commission_cents, 0);

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 概览 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <StatCard label="分佣系统" value={config?.enabled ? "启用中" : "已关闭"} icon={<Coins size={20} />} color={config?.enabled ? THEME.success : THEME.error} />
        <StatCard label="佣金记录（本页）" value={String(recordsTotal)} icon={<FileText size={20} />} color={THEME.primary} />
        <StatCard label="本页佣金合计" value={`¥${fmtCents(totalCommission)}`} icon={<Banknote size={20} />} color={THEME.info} />
        <StatCard label="待审核提现" value={String(withdrawTotal)} icon={<RefreshCw size={20} />} color={pendingCount > 0 ? THEME.warning : THEME.textHint} />
      </div>

      {/* Tab */}
      <div style={{ display: "flex", gap: 8 }}>
        {(
          [
            { key: "config", label: "分佣配置", icon: <Settings2 size={14} /> },
            { key: "records", label: "佣金明细", icon: <FileText size={14} /> },
            { key: "withdrawals", label: "提现审核", icon: <Banknote size={14} /> },
            { key: "finance", label: "财务报表", icon: <BarChart3 size={14} /> },
          ] as { key: TabKey; label: string; icon: React.ReactNode }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${tab === t.key ? THEME.primary : THEME.border}`,
              backgroundColor: tab === t.key ? THEME.primary : "#fff",
              color: tab === t.key ? "#fff" : THEME.textSub,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== 配置 Tab ===== */}
      {tab === "config" && config && (
        <AdminCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: THEME.textMain }}>
              分佣配置（两级分佣：一级 {config.ratios?.level1 ?? 15}% / 二级 {config.ratios?.level2 ?? 5}%）
            </h3>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: THEME.textSub, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              />
              分佣总开关
            </label>
          </div>

          {/* 两级分佣比例（v25.0.47_12：全局统一，按用户实付金额计算） */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={styles.label}>一级推荐人比例（%）</label>
              <input
                type="number"
                min={0}
                max={50}
                value={config.ratios?.level1 ?? 15}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    ratios: { ...config.ratios, level1: Number(e.target.value) },
                  })
                }
                style={styles.input}
              />
              <p style={{ fontSize: 11, color: THEME.textHint, margin: "4px 0 0" }}>直接推荐人按订单实付金额计算</p>
            </div>
            <div>
              <label style={styles.label}>二级推荐人比例（%）</label>
              <input
                type="number"
                min={0}
                max={50}
                value={config.ratios?.level2 ?? 5}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    ratios: { ...config.ratios, level2: Number(e.target.value) },
                  })
                }
                style={styles.input}
              />
              <p style={{ fontSize: 11, color: THEME.textHint, margin: "4px 0 0" }}>一级推荐人的推荐人（间接推荐）</p>
            </div>
          </div>

          {/* 月度结算与提现窗口（v25.0.47_12） */}
          <div style={{ padding: 12, backgroundColor: THEME.primaryBgLight, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: THEME.textSub }}>月度结算与提现窗口</div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: THEME.textSub, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={config.monthlySettleEnabled !== false}
                  onChange={(e) => setConfig({ ...config, monthlySettleEnabled: e.target.checked })}
                />
                启用月度结算模式
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div>
                <label style={styles.label}>月度结算日（每月几号）</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={config.settleDay ?? 30}
                  onChange={(e) => setConfig({ ...config, settleDay: Math.min(28, Math.max(1, Number(e.target.value) || 30)) })}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>提现开放日（每月几号后）</label>
                <input
                  type="number"
                  min={1}
                  max={27}
                  value={config.withdrawOpenDay ?? 15}
                  onChange={(e) => setConfig({ ...config, withdrawOpenDay: Math.min(27, Math.max(1, Number(e.target.value) || 15)) })}
                  style={styles.input}
                />
              </div>
            </div>
            <p style={{ fontSize: 11, color: THEME.textHint, margin: "8px 0 0", lineHeight: 1.6 }}>
              月度结算模式：佣金入账后冻结，每月结算日（默认30号，2月按28号）统一解冻为可提现；每月提现开放日（默认15号）之后用户才可发起提现。关闭月度模式则回退「解冻期天数」机制。
            </p>
          </div>

          {/* 全局参数 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={styles.label}>解冻期天数（月度模式关闭时生效）</label>
              <input
                type="number"
                min={0}
                max={90}
                value={config.unfreezeDays}
                onChange={(e) => setConfig({ ...config, unfreezeDays: Number(e.target.value) })}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>最低提现额（元）</label>
              <input
                type="number"
                min={1}
                step="0.01"
                value={config.minWithdrawYuan}
                onChange={(e) => setConfig({ ...config, minWithdrawYuan: Number(e.target.value) })}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>每日提现次数</label>
              <input
                type="number"
                min={1}
                max={10}
                value={config.dailyWithdrawLimit}
                onChange={(e) => setConfig({ ...config, dailyWithdrawLimit: Number(e.target.value) })}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>转账备注（用户可见）</label>
              <input
                type="text"
                value={config.transferNote}
                onChange={(e) => setConfig({ ...config, transferNote: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: THEME.textSub, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={config.unfreezeEnabled}
                onChange={(e) => setConfig({ ...config, unfreezeEnabled: e.target.checked })}
              />
              启用解冻期（关闭则佣金立即可提现）
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: THEME.textSub, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={config.withdrawEnabled !== false}
                onChange={(e) => setConfig({ ...config, withdrawEnabled: e.target.checked })}
              />
              提现通道开关（微信商家转账权限开通后开启）
            </label>
          </div>

          {/* 风控开关 */}
          <div style={{ padding: 12, backgroundColor: THEME.primaryBgLight, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.textSub, marginBottom: 8 }}>风控规则</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              {Object.entries(config.riskControl || {}).map(([k, v]) => (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: THEME.textSub, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!v}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        riskControl: { ...config.riskControl, [k]: e.target.checked },
                      })
                    }
                  />
                  {RISK_LABELS[k] || k}
                </label>
              ))}
            </div>
          </div>

          {/* 变更原因 */}
          <div style={{ marginBottom: 12 }}>
            <label style={styles.label}>变更原因（写入审计日志）</label>
            <input
              type="text"
              placeholder="例如：调整为春节活动比例"
              value={confirmReason}
              onChange={(e) => setConfirmReason(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSaveConfig} disabled={saving} style={{ ...styles.btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? "保存中..." : "保存配置"}
            </button>
            <button onClick={handleUnfreeze} style={styles.btnSecondary}>
              <Snowflake size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
              手动解冻扫描
            </button>
          </div>

          <p style={{ fontSize: 11, color: THEME.textHint, margin: "12px 0 0", lineHeight: 1.6 }}>
            合规约束：两级分佣（一级+二级合计上限 50%），按用户实付金额计算；新比例仅对新订单生效，历史订单不受影响。月度结算模式下佣金每月结算日统一解冻，提现开放日之后可提现。所有变更记录审计日志。
          </p>
        </AdminCard>
      )}

      {/* ===== 佣金明细 Tab ===== */}
      {tab === "records" && (
        <AdminCard>
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="推荐人ID"
              value={filterInviter}
              onChange={(e) => setFilterInviter(e.target.value)}
              style={{ ...styles.input, width: 130 }}
            />
            <input
              type="text"
              placeholder="订单号"
              value={filterOrder}
              onChange={(e) => setFilterOrder(e.target.value)}
              style={{ ...styles.input, width: 200 }}
            />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...styles.input, width: 130 }}>
              <option value="">全部状态</option>
              <option value="FROZEN">待解冻</option>
              <option value="UNFROZEN">可提现</option>
              <option value="REVERSED">已冲正</option>
              <option value="PENDING_REVIEW">待审核</option>
            </select>
            <button onClick={loadRecords} style={styles.btnPrimary}>
              查询
            </button>
          </div>

          <Table>
            <thead>
              <tr>
                <Th>订单号</Th>
                <Th>付款用户</Th>
                <Th>推荐人</Th>
                <Th>订单金额</Th>
                <Th>比例</Th>
                <Th>佣金</Th>
                <Th>状态</Th>
                <Th>时间</Th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <Td colSpan={8} style={{ textAlign: "center", color: THEME.textHint }}>
                    暂无佣金记录
                  </Td>
                </tr>
              ) : (
                records.map((r) => {
                  const st = RECORD_STATUS[r.status] || { label: r.status, type: "info" as const };
                  return (
                    <tr key={r.id}>
                      <Td style={{ fontFamily: "monospace", fontSize: 11 }}>{r.order_no}</Td>
                      <Td>{r.payer_user_id}</Td>
                      <Td>
                        {r.inviter_user_id}
                        {r.record_type === "COMMISSION_L2" && (
                          <span style={{ fontSize: 10, color: THEME.info, marginLeft: 4 }}>（二级）</span>
                        )}
                      </Td>
                      <Td>¥{fmtCents(r.base_amount_cents)}</Td>
                      <Td>{r.ratio_percent}%</Td>
                      <Td style={{ fontWeight: 700, color: r.commission_cents < 0 ? THEME.error : THEME.success }}>
                        {r.commission_cents < 0 ? "" : "+"}¥{fmtCents(r.commission_cents)}
                      </Td>
                      <Td>
                        <Badge type={st.type}>{st.label}</Badge>
                      </Td>
                      <Td style={{ fontSize: 11 }}>{fmtTime(r.created_at)}</Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </AdminCard>
      )}

      {/* ===== 提现审核 Tab ===== */}
      {tab === "withdrawals" && (
        <AdminCard>
          <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
            <select value={wStatus} onChange={(e) => setWStatus(e.target.value)} style={{ ...styles.input, width: 160 }}>
              <option value="">全部状态</option>
              <option value="PENDING_REVIEW">待审核</option>
              <option value="TRANSFERING">转账中</option>
              <option value="PROCESSING">处理中</option>
              <option value="PAID">已到账</option>
              <option value="FAILED">失败</option>
              <option value="REJECTED">已驳回</option>
            </select>
            <button onClick={loadWithdrawals} style={styles.btnPrimary}>
              刷新
            </button>
            {pendingIds.length > 0 && (
              <button onClick={handleBatchApprove} disabled={batchBusy || selectedIds.length === 0} style={{ ...styles.btnPrimary, opacity: selectedIds.length === 0 || batchBusy ? 0.5 : 1, cursor: selectedIds.length === 0 ? "not-allowed" : "pointer" }}>
                <CheckCircle2 size={13} style={{ verticalAlign: -1, marginRight: 4 }} />
                {batchBusy ? "批量处理中..." : `批量通过（${selectedIds.length}/${pendingIds.length}）`}
              </button>
            )}
            <span style={{ fontSize: 12, color: THEME.textHint }}>共 {withdrawTotal} 条</span>
          </div>

          {/* 导出区（财务对账） */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap", padding: 10, backgroundColor: THEME.primaryBgLight, borderRadius: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: THEME.textSub }}>导出对账：</span>
            <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} style={{ ...styles.input, width: 150 }} />
            <span style={{ fontSize: 12, color: THEME.textHint }}>至</span>
            <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} style={{ ...styles.input, width: 150 }} />
            <span style={{ fontSize: 11, color: THEME.textHint }}>按当前状态筛选（{wStatus || "全部"}）</span>
            <button onClick={handleExport} disabled={exporting} style={{ ...styles.btnSecondary, display: "flex", alignItems: "center", gap: 4 }}>
              <Download size={13} /> {exporting ? "导出中..." : "导出 CSV"}
            </button>
          </div>

          <Table>
            <thead>
              <tr>
                <Th>{pendingIds.length > 0 ? <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /> : ""}</Th>
                <Th>提现单号</Th>
                <Th>用户</Th>
                <Th>金额</Th>
                <Th>状态</Th>
                <Th>申请时间</Th>
                <Th>操作</Th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 ? (
                <tr>
                  <Td colSpan={7} style={{ textAlign: "center", color: THEME.textHint }}>
                    暂无提现记录
                  </Td>
                </tr>
              ) : (
                withdrawals.map((w) => {
                  const st = WITHDRAW_STATUS[w.status] || { label: w.status, type: "info" as const };
                  return (
                    <tr key={w.id}>
                      <Td>
                        {w.status === "PENDING_REVIEW" && (
                          <input type="checkbox" checked={selectedIds.includes(w.id)} onChange={() => toggleSelect(w.id)} />
                        )}
                      </Td>
                      <Td style={{ fontFamily: "monospace", fontSize: 11 }}>{w.withdraw_no}</Td>
                      <Td>{w.user_id}</Td>
                      <Td style={{ fontWeight: 700 }}>¥{fmtCents(w.amount_cents)}</Td>
                      <Td>
                        <Badge type={st.type}>{st.label}</Badge>
                        {w.fail_reason && (
                          <div style={{ fontSize: 10, color: THEME.error, marginTop: 2 }}>{w.fail_reason}</div>
                        )}
                      </Td>
                      <Td style={{ fontSize: 11 }}>{fmtTime(w.created_at)}</Td>
                      <Td>
                        {w.status === "PENDING_REVIEW" && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => {
                                setApproveTarget(w);
                                setConfirmReason("");
                              }}
                              style={{ ...styles.btnPrimary, padding: "4px 10px", fontSize: 12 }}
                            >
                              <CheckCircle2 size={12} style={{ verticalAlign: -1, marginRight: 2 }} />
                              通过
                            </button>
                            <button
                              onClick={() => {
                                setRejectTarget(w);
                                setRejectReason("");
                              }}
                              style={{ ...styles.btnDanger, padding: "4px 10px", fontSize: 12 }}
                            >
                              <XCircle size={12} style={{ verticalAlign: -1, marginRight: 2 }} />
                              驳回
                            </button>
                          </div>
                        )}
                        {w.status === "TRANSFERING" && (
                          <button
                            onClick={() => handleSync(w)}
                            disabled={syncingId === w.id}
                            style={{ ...styles.btnSecondary, padding: "4px 10px", fontSize: 12 }}
                          >
                            <RefreshCw size={12} style={{ verticalAlign: -1, marginRight: 2, animation: syncingId === w.id ? "spin 1s linear infinite" : "none" }} />
                            {syncingId === w.id ? "同步中..." : "同步微信状态"}
                          </button>
                        )}
                        {w.status === "PROCESSING" && (
                          <span style={{ fontSize: 11, color: THEME.textHint }}>人工打款流程</span>
                        )}
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </AdminCard>
      )}

      {/* ===== 财务报表 Tab（v25.0.47_13） ===== */}
      {tab === "finance" && (
        <>
          <AdminCard>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textMain }}>佣金统计报表</span>
              <select value={statsDays} onChange={(e) => setStatsDays(Number(e.target.value))} style={{ ...styles.input, width: 140 }}>
                <option value={7}>近 7 天</option>
                <option value={30}>近 30 天</option>
                <option value={90}>近 90 天</option>
                <option value={180}>近 180 天</option>
              </select>
              <button onClick={loadStats} style={styles.btnPrimary}>刷新报表</button>
            </div>
            {statsLoading ? (
              <LoadingSpinner text="统计中..." />
            ) : stats ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 16 }}>
                  <StatCard label="一级佣金累计" value={`¥${fmtCents(stats.levels.l1_cents || 0)}`} icon={<Coins size={18} />} color={THEME.primary} />
                  <StatCard label="二级佣金累计" value={`¥${fmtCents(stats.levels.l2_cents || 0)}`} icon={<Coins size={18} />} color={THEME.primaryLight} />
                  <StatCard label="冻结中佣金" value={`¥${fmtCents(stats.levels.frozen_cents || 0)}`} icon={<Snowflake size={18} />} color={THEME.warning} />
                  <StatCard label="退款扣回累计" value={`¥${fmtCents(stats.levels.reversed_cents || 0)}`} icon={<XCircle size={18} />} color={THEME.error} />
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.textMain, margin: "10px 0 8px" }}>月度佣金报表（近12个月）</div>
                <Table>
                  <thead>
                    <tr><Th>月份</Th><Th>一级佣金</Th><Th>二级佣金</Th><Th>合计</Th><Th>笔数</Th></tr>
                  </thead>
                  <tbody>
                    {stats.monthly.length === 0 ? (
                      <tr><Td colSpan={5} style={{ textAlign: "center", color: THEME.textHint }}>暂无数据</Td></tr>
                    ) : stats.monthly.map((m) => (
                      <tr key={m.month}>
                        <Td style={{ fontWeight: 600 }}>{m.month}</Td>
                        <Td>¥{fmtCents(m.l1_cents || 0)}</Td>
                        <Td>¥{fmtCents(m.l2_cents || 0)}</Td>
                        <Td style={{ fontWeight: 700, color: THEME.success }}>¥{fmtCents(m.total_cents || 0)}</Td>
                        <Td>{m.count}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.textMain, margin: "16px 0 8px" }}>提现状态汇总</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {stats.withdrawSummary.length === 0 ? (
                    <span style={{ fontSize: 12, color: THEME.textHint }}>暂无提现记录</span>
                  ) : stats.withdrawSummary.map((s) => {
                    const st = WITHDRAW_STATUS[s.status] || { label: s.status, type: "info" as const };
                    return (
                      <div key={s.status} style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${THEME.border}`, backgroundColor: "#fff" }}>
                        <Badge type={st.type}>{st.label}</Badge>
                        <div style={{ fontSize: 18, fontWeight: 800, color: THEME.textMain, marginTop: 6 }}>¥{fmtCents(s.amount_cents || 0)}</div>
                        <div style={{ fontSize: 11, color: THEME.textHint }}>{s.count} 笔</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.textMain, margin: "16px 0 8px" }}>退款扣回明细（最近50条）</div>
                <Table>
                  <thead>
                    <tr><Th>订单号</Th><Th>推荐人</Th><Th>比例</Th><Th>扣回金额</Th><Th>时间</Th></tr>
                  </thead>
                  <tbody>
                    {stats.reversals.length === 0 ? (
                      <tr><Td colSpan={5} style={{ textAlign: "center", color: THEME.textHint }}>暂无退款扣回记录</Td></tr>
                    ) : stats.reversals.map((r, i) => (
                      <tr key={`${r.order_no}-${i}`}>
                        <Td style={{ fontFamily: "monospace", fontSize: 11 }}>{r.order_no}</Td>
                        <Td>{r.inviter_user_id}</Td>
                        <Td>{r.ratio_percent}%</Td>
                        <Td style={{ fontWeight: 700, color: THEME.error }}>¥{fmtCents(r.commission_cents)}</Td>
                        <Td style={{ fontSize: 11 }}>{fmtTime(r.created_at)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            ) : (
              <div style={{ padding: 24, textAlign: "center", color: THEME.textHint, fontSize: 13 }}>报表加载失败</div>
            )}
          </AdminCard>
        </>
      )}

      {/* ===== 审核通过弹窗 ===== */}
      <ConfirmDialog
        open={!!approveTarget}
        title="通过提现申请"
        message={
          approveTarget
            ? `用户 ${approveTarget.user_id} 提现 ¥${fmtCents(approveTarget.amount_cents)}。审核通过后将自动调用微信商家转账；若转账未配置则进入人工打款流程。`
            : ""
        }
        confirmText="确认通过"
        onConfirm={handleApprove}
        onCancel={() => setApproveTarget(null)}
      />

      {/* ===== 驳回弹窗（必填原因） ===== */}
      {rejectTarget && (
        <div
          onClick={() => setRejectTarget(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 20,
              width: 360,
              maxWidth: "92vw",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: THEME.textMain }}>
              驳回提现申请
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: THEME.textSub }}>
              用户 {rejectTarget.user_id} · ¥{fmtCents(rejectTarget.amount_cents)}。驳回后金额自动退回用户可提现余额。
            </p>
            <label style={styles.label}>驳回原因（必填）</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="例如：账号存在异常交易行为"
              style={{ ...styles.input, resize: "none" }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
              <button onClick={() => setRejectTarget(null)} style={styles.btnSecondary}>
                取消
              </button>
              <button onClick={handleReject} disabled={busy} style={styles.btnDanger}>
                {busy ? "处理中..." : "确认驳回"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastNode}
    </div>
  );
}

const RISK_LABELS: Record<string, string> = {
  blockSelfPurchase: "禁止自购自返",
  blockSameDevice: "同设备互荐不计佣",
  blockSamePhone: "同手机号互荐不计佣",
  blockSameIp: "同IP互荐不计佣",
  dailyEarningFreeze: "单日收益超阈值冻结提现",
  highRefundRatePause: "退款率过高暂停分佣",
};

// ==================== 表格小组件 ====================

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "8px 10px",
        borderBottom: `2px solid ${THEME.border}`,
        color: THEME.textSub,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, colSpan, style }: { children?: React.ReactNode; colSpan?: number; style?: React.CSSProperties }) {
  return (
    <td colSpan={colSpan} style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.border}`, ...style }}>
      {children}
    </td>
  );
}
