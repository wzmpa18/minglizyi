"use client";

// ============================================================================
// 言道国学 - 订单管理后台（FINAL-SEAL-03 第二十章）
//   · 订单列表：状态筛选 + 分页（订单号/用户/金额/渠道/支付状态/时间/返佣状态）
//   · 人工补单：仅 SUPER_ADMIN + 二次确认 + 必填原因（≥4字），走真实回调状态机
//     （补单与微信回调同一 updateOrderRecord，自动触发分佣/返佣/首付费奖励）
//   · 全部操作写审计日志
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Receipt, RefreshCw, AlertTriangle, Download } from "lucide-react";
import { THEME, styles, AdminCard, StatCard, Badge, LoadingSpinner, useMounted, useToast, ConfirmDialog } from "../_shared";
import {
  fetchAdminOrders,
  exportOrdersCsv,
  manualConfirmOrder,
  fetchPaymentStatus,
  type AdminOrder,
  type PaymentStatus,
} from "@/lib/admin/unifiedService";

const ORDER_STATUS: Record<string, { label: string; type: "default" | "success" | "warning" | "error" | "info" }> = {
  PENDING: { label: "待支付", type: "warning" },
  PAID: { label: "已支付", type: "success" },
  REFUNDED: { label: "已退款", type: "error" },
  CLOSED: { label: "已关闭", type: "default" },
};

const TYPE_LABELS: Record<string, string> = {
  MEMBERSHIP: "会员",
  SINGLE_UNLOCK: "单项解锁(B类工具)",
  POINTS_RECHARGE: "积分充值",
  AI_PACKAGE: "AI增量包",
  BATCH_INTERPRET: "批量解读",
};

function fmtTime(iso?: string | null): string {
  if (!iso) return "-";
  return iso.slice(0, 16).replace("T", " ");
}

export default function AdminOrdersPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const urlStatusInit = useRef(false);

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [exporting, setExporting] = useState(false);

  // 补单
  const [confirmTarget, setConfirmTarget] = useState<AdminOrder | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchAdminOrders(status, page, 20, { dateFrom, dateTo });
    if (data) {
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } else {
      show("订单加载失败，请检查密钥权限", "error");
    }
  }, [status, page, dateFrom, dateTo, show]);

  useEffect(() => {
    if (!mounted) return;
    // v25.0.47_21：支持仪表盘「待处理订单/实付金额」卡片点击跳转带状态筛选（?status=PENDING/PAID）
    if (!urlStatusInit.current) {
      urlStatusInit.current = true;
      try {
        const q = new URLSearchParams(window.location.search).get("status");
        if (q && ["PENDING", "PAID", "REFUNDED", "CLOSED"].includes(q) && q !== status) {
          setStatus(q); // load 重建后本 effect 再跑一次，走完整加载
          return;
        }
      } catch { /* ignore */ }
    }
    (async () => {
      setLoading(true);
      await Promise.all([load(), fetchPaymentStatus().then(setPayment)]);
      setLoading(false);
    })();
  }, [mounted, load]);

  const handleExport = async () => {
    setExporting(true);
    const r = await exportOrdersCsv(status, { dateFrom, dateTo });
    setExporting(false);
    if (r.ok) {
      show(`已导出订单报表：${r.filename}（Excel 可直接打开）`);
    } else {
      show(r.error || "导出失败", "error");
    }
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    if (confirmReason.trim().length < 4) {
      show("补单原因至少 4 个字", "error");
      return;
    }
    setBusy(true);
    const r = await manualConfirmOrder(confirmTarget.order_no, confirmReason.trim());
    setBusy(false);
    setConfirmTarget(null);
    setConfirmReason("");
    if (r.ok) {
      show("补单成功：订单已置为 PAID（分佣/权益同步触发）");
      load();
    } else {
      show(r.error || "补单失败", "error");
    }
  };

  if (!mounted || loading) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSpinner text="加载订单数据..." />
      </div>
    );
  }

  const paidCount = orders.filter((o) => o.status === "PAID").length;
  const paidSum = orders.filter((o) => o.status === "PAID").reduce((s, o) => s + o.amount, 0);
  const wechat = payment?.wechat;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <StatCard label="订单总数" value={String(total)} icon={<Receipt size={20} />} />
        <StatCard label="本页已支付" value={`${paidCount} 笔`} color={THEME.success} />
        <StatCard label="本页支付额" value={`¥${paidSum.toFixed(2)}`} color={THEME.info} />
        <StatCard
          label="微信支付通道"
          value={wechat ? (wechat.status === "ENABLED" ? "启用" : wechat.configured ? "已配置" : "未配置") : "-"}
          sub={wechat && !wechat.configured ? `缺少: ${wechat.missing.join(", ")}` : undefined}
          color={wechat?.configured ? THEME.success : THEME.warning}
        />
      </div>

      {/* 支付通道详情（不显示密钥） */}
      <AdminCard title={<span>支付通道状态（仅显示配置状态，不显示密钥）</span>}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, color: THEME.textSub }}>
          <div>
            微信支付：
            <Badge type={wechat?.configured ? "success" : "warning"}>
              {wechat?.status || "未知"}
            </Badge>
            {wechat && !wechat.configured && (
              <span style={{ marginLeft: 8, fontSize: 11, color: THEME.warning }}>
                缺少环境变量：{wechat.missing.join(" / ")}
              </span>
            )}
            {wechat?.configured && !wechat.oauthConfigured && (
              <span style={{ marginLeft: 8, fontSize: 11, color: THEME.warning }}>
                OAuth 未配置（缺少 WECHAT_APP_SECRET）
              </span>
            )}
          </div>
          <div>
            分佣系统：
            <Badge type={payment?.commission?.enabled ? "success" : "default"}>
              {payment?.commission?.status || "未启用"}
            </Badge>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ ...styles.input, width: 140 }}>
            <option value="">全部状态</option>
            <option value="PENDING">待支付</option>
            <option value="PAID">已支付</option>
            <option value="REFUNDED">已退款</option>
            <option value="CLOSED">已关闭</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            style={{ ...styles.input, width: 150 }}
            title="下单日期起"
          />
          <span style={{ color: THEME.textHint }}>至</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            style={{ ...styles.input, width: 150 }}
            title="下单日期止"
          />
          <button onClick={load} style={styles.btnPrimary}>
            <RefreshCw size={13} style={{ verticalAlign: -1, marginRight: 4 }} />
            刷新
          </button>
          <button onClick={handleExport} disabled={exporting} style={{ ...styles.btnSecondary, opacity: exporting ? 0.5 : 1 }}>
            <Download size={13} style={{ verticalAlign: -1, marginRight: 4 }} />
            {exporting ? "导出中..." : "导出Excel报表"}
          </button>
          <span style={{ fontSize: 12, color: THEME.textHint }}>
            共 {total} 条 · 第 {page} 页
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ ...styles.btnSecondary, opacity: page <= 1 ? 0.4 : 1 }}>
              上一页
            </button>
            <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} style={{ ...styles.btnSecondary, opacity: page * 20 >= total ? 0.4 : 1 }}>
              下一页
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <Th>订单号</Th>
                <Th>用户（手机号）</Th>
                <Th>类型</Th>
                <Th>金额</Th>
                <Th>状态</Th>
                <Th>渠道</Th>
                <Th>微信交易号</Th>
                <Th>邀请人</Th>
                <Th>返佣</Th>
                <Th>下单/支付时间</Th>
                <Th>操作</Th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <Td colSpan={11} style={{ textAlign: "center", color: THEME.textHint, padding: 24 }}>
                    暂无订单
                  </Td>
                </tr>
              ) : (
                orders.map((o) => {
                  const st = ORDER_STATUS[o.status] || { label: o.status, type: "default" as const };
                  return (
                    <tr key={o.order_no}>
                      <Td style={{ fontFamily: "monospace", fontSize: 11 }}>{o.order_no}</Td>
                      <Td>
                        <div>{o.nickname || "-"}</div>
                        <div style={{ fontSize: 10, color: THEME.textHint }}>
                          {o.phone ? o.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : "无手机号"} · ID {o.user_id}
                        </div>
                      </Td>
                      <Td>{TYPE_LABELS[o.order_type] || o.order_type}</Td>
                      <Td style={{ fontWeight: 700 }}>¥{Number(o.amount).toFixed(2)}</Td>
                      <Td>
                        <Badge type={st.type}>{st.label}</Badge>
                      </Td>
                      <Td style={{ fontSize: 11 }}>{o.payment_method || "-"}</Td>
                      <Td style={{ fontFamily: "monospace", fontSize: 10 }}>{o.transaction_id || "-"}</Td>
                      <Td style={{ fontSize: 11 }}>
                        {o.inviter_nickname || o.inviter_phone || (o.inviter_id ? `ID ${o.inviter_id}` : "-")}
                      </Td>
                      <Td style={{ fontSize: 11 }}>{o.rebateStatus || "-"}</Td>
                      <Td style={{ fontSize: 11 }}>
                        {fmtTime(o.created_at)}
                        {o.paid_at && <div style={{ color: THEME.success }}>{fmtTime(o.paid_at)}</div>}
                      </Td>
                      <Td>
                        {o.status === "PENDING" && (
                          <button
                            onClick={() => {
                              setConfirmTarget(o);
                              setConfirmReason("");
                            }}
                            style={{ ...styles.btnDanger, padding: "3px 8px", fontSize: 11 }}
                          >
                            人工补单
                          </button>
                        )}
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* 补单二次确认 */}
      {confirmTarget && (
        <div
          onClick={() => setConfirmTarget(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#fff", borderRadius: 12, padding: 20, width: 380, maxWidth: "92vw" }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: THEME.error, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={16} />
              人工补单确认（高危操作）
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: THEME.textSub, lineHeight: 1.7 }}>
              订单 {confirmTarget.order_no}（用户 {confirmTarget.nickname || confirmTarget.user_id} · ¥
              {Number(confirmTarget.amount).toFixed(2)}）将被置为 PAID，并自动触发分佣、积分返佣、首付费奖励与权益发放。
              仅限线下已收款等真实场景使用，操作将记录审计日志。
            </p>
            <label style={styles.label}>补单原因（至少 4 个字，写入审计）</label>
            <textarea
              value={confirmReason}
              onChange={(e) => setConfirmReason(e.target.value)}
              rows={3}
              placeholder="例如：用户线下已转账，微信回调丢失"
              style={{ ...styles.input, resize: "none" }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmTarget(null)} style={styles.btnSecondary}>
                取消
              </button>
              <button onClick={handleConfirm} disabled={busy} style={styles.btnPrimary}>
                {busy ? "处理中..." : "确认补单"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastNode}
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
