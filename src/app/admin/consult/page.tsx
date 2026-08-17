"use client";

// ============================================================================
// 言道国学 - 真人咨询服务管理后台（P6-TOOL-04 §3.3 / §6.1）
// 服务者准入审核 / 服务上下架治理 / 订单售后仲裁 / 数据总览 / 异常告警。
// 全部数据复用 consultServiceStore + toolConfigStore + alertService，无独立系统。
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Users, Store, ClipboardList, Bell, BarChart3, CheckCircle2, XCircle, Snowflake, Sun } from "lucide-react";
import { THEME, styles, AdminCard, StatCard, Badge, LoadingSpinner, useMounted, useToast, ConfirmDialog } from "../_shared";
import {
  listProviders,
  auditConsultProvider,
  setProviderFrozen,
  listConsultServices,
  setConsultServiceStatus,
  listConsultOrders,
  arbitrateAfterSale,
  runConsultMaintenance,
  getConsultStats,
  type ConsultProvider,
  type ConsultService,
  type ConsultOrder,
} from "@/lib/consultServiceStore";
import { getToolConfig } from "@/lib/toolConfigStore";
import { listAlerts, acknowledgeAlert, type AlertRecord } from "@/lib/alertService";

type TabKey = "dashboard" | "providers" | "services" | "orders" | "alerts";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "dashboard", label: "数据总览", icon: <BarChart3 size={14} /> },
  { key: "providers", label: "服务者审核", icon: <Users size={14} /> },
  { key: "services", label: "服务管理", icon: <Store size={14} /> },
  { key: "orders", label: "订单售后", icon: <ClipboardList size={14} /> },
  { key: "alerts", label: "告警", icon: <Bell size={14} /> },
];

const DELIVERY_FORM_LABEL: Record<ConsultService["deliveryForm"], string> = {
  text: "图文报告",
  voice: "语音沟通",
  video: "视频沟通",
  offline: "线下当面",
};

const ORDER_STATUS_LABEL: Record<ConsultOrder["status"], string> = {
  paid: "待接单",
  accepted: "服务中",
  delivered: "待确认",
  confirmed: "结算中",
  settled: "已结算",
  after_selling: "售后仲裁中",
  refunded: "已退款",
  cancelled: "已取消",
};

export default function AdminConsultPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [tab, setTab] = useState<TabKey>("dashboard");

  const [stats, setStats] = useState<ReturnType<typeof getConsultStats> | null>(null);
  const [cfgSummary, setCfgSummary] = useState({ enabled: false, feeRate: 0, settleDays: 7, minPrice: 0, maxPrice: 0, maxDeliveryDays: 7, categories: [] as string[] });
  const [providers, setProviders] = useState<ConsultProvider[]>([]);
  const [services, setServices] = useState<ConsultService[]>([]);
  const [orders, setOrders] = useState<ConsultOrder[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);

  // 审核弹窗
  const [auditTarget, setAuditTarget] = useState<ConsultProvider | null>(null);
  const [auditApprove, setAuditApprove] = useState(true);
  const [auditNote, setAuditNote] = useState("");
  // 仲裁弹窗
  const [arbTarget, setArbTarget] = useState<ConsultOrder | null>(null);
  const [arbRefund, setArbRefund] = useState(true);
  const [arbNote, setArbNote] = useState("");
  // 冻结确认
  const [freezeTarget, setFreezeTarget] = useState<{ p: ConsultProvider; frozen: boolean } | null>(null);

  const refresh = useCallback(() => {
    runConsultMaintenance();
    const cfg = getToolConfig().consult;
    setCfgSummary({
      enabled: cfg.enabled,
      feeRate: cfg.platformFeeRate,
      settleDays: cfg.settleDays,
      minPrice: cfg.minPrice,
      maxPrice: cfg.maxPrice,
      maxDeliveryDays: cfg.maxDeliveryDays,
      categories: cfg.categories || [],
    });
    setStats(getConsultStats());
    setProviders(listProviders());
    setServices(listConsultServices());
    setOrders(listConsultOrders());
    setAlerts(listAlerts().slice(0, 100));
  }, []);

  useEffect(() => {
    if (mounted) refresh();
  }, [mounted, refresh]);

  if (!mounted) {
    return <LoadingSpinner text="正在加载咨询管理数据..." />;
  }

  const pendingProviders = providers.filter((p) => p.auditStatus === "pending");
  const afterSellingOrders = orders.filter((o) => o.status === "after_selling");
  const unackAlerts = alerts.filter((a) => !a.acknowledged);

  const handleAudit = () => {
    if (!auditTarget) return;
    const res = auditConsultProvider(auditTarget.id, auditApprove, auditNote.trim());
    show(res.message, res.success ? "success" : "error");
    setAuditTarget(null);
    setAuditNote("");
    refresh();
  };

  const handleArbitrate = () => {
    if (!arbTarget) return;
    const res = arbitrateAfterSale(arbTarget.orderId, arbRefund, arbNote.trim());
    show(res.message, res.success ? "success" : "error");
    setArbTarget(null);
    setArbNote("");
    refresh();
  };

  const handleFreeze = () => {
    if (!freezeTarget) return;
    const res = setProviderFrozen(freezeTarget.p.id, freezeTarget.frozen);
    show(res.message, res.success ? "success" : "error");
    setFreezeTarget(null);
    refresh();
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: THEME.textMain, margin: 0 }}>真人咨询服务管理</h1>
          <Badge type={cfgSummary.enabled ? "success" : "error"}>{cfgSummary.enabled ? "已开放" : "已关闭"}</Badge>
        </div>
        <p style={{ fontSize: 13, color: THEME.textSub, margin: 0 }}>
          言道精选 consult 类目：服务者准入审核 · 服务治理 · 售后仲裁 · 结算监管（P6-TOOL-04 §3.3）
        </p>
      </div>

      {/* Tab 栏 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const badge =
            t.key === "providers" ? pendingProviders.length :
            t.key === "orders" ? afterSellingOrders.length :
            t.key === "alerts" ? unackAlerts.length : 0;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${active ? THEME.primary : THEME.border}`,
                backgroundColor: active ? THEME.primary : "#fff",
                color: active ? "#fff" : THEME.textSub,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t.icon}
              {t.label}
              {badge > 0 && (
                <span
                  style={{
                    backgroundColor: active ? "#fff" : THEME.error,
                    color: active ? THEME.primary : "#fff",
                    borderRadius: 8,
                    fontSize: 10,
                    padding: "1px 6px",
                    fontWeight: 700,
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ===== 数据总览 ===== */}
      {tab === "dashboard" && stats && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
            <StatCard label="服务者总数" value={stats.providersTotal} sub={`待审核 ${stats.providersPending} 人`} icon={<Users size={18} />} />
            <StatCard label="在架服务" value={stats.servicesOnline} sub={`累计服务 ${services.length} 项`} icon={<Store size={18} />} color={THEME.info} />
            <StatCard label="累计订单" value={stats.ordersTotal} sub={`进行中 ${stats.ordersActive} 单`} icon={<ClipboardList size={18} />} color={THEME.warning} />
            <StatCard label="已结算金额" value={`¥${stats.settledAmount.toFixed(2)}`} sub={`售后中 ${stats.afterSellingCount} 单`} icon={<BarChart3 size={18} />} color={THEME.success} />
          </div>

          <AdminCard title="平台配置（toolConfigStore.consult，可在工具配置中心修改）">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {[
                { k: "功能开关", v: cfgSummary.enabled ? "开放" : "关闭" },
                { k: "平台服务费", v: `${(cfgSummary.feeRate * 100).toFixed(0)}%` },
                { k: "结算周期", v: `T+${cfgSummary.settleDays} 天` },
                { k: "价格区间", v: `¥${cfgSummary.minPrice} ~ ¥${cfgSummary.maxPrice}` },
                { k: "履约时限上限", v: `${cfgSummary.maxDeliveryDays} 天` },
                { k: "服务类目", v: `${cfgSummary.categories.length} 个` },
              ].map((r) => (
                <div key={r.k} style={{ padding: "10px 14px", borderRadius: 8, backgroundColor: THEME.primaryBgLight, border: `1px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 12, color: THEME.textSub }}>{r.k}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain, marginTop: 3 }}>{r.v}</div>
                </div>
              ))}
            </div>
            {cfgSummary.categories.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {cfgSummary.categories.map((c) => (
                  <Badge key={c} type="primary">{c}</Badge>
                ))}
              </div>
            )}
          </AdminCard>
        </>
      )}

      {/* ===== 服务者审核 ===== */}
      {tab === "providers" && (
        <AdminCard title={`服务者管理（共 ${providers.length} 人，待审核 ${pendingProviders.length} 人）`}>
          {providers.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: THEME.textHint, fontSize: 13 }}>暂无服务者申请</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {providers.map((p) => (
                <div key={p.id} style={{ padding: 14, borderRadius: 10, border: `1px solid ${THEME.border}`, backgroundColor: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain }}>{p.nickname}</span>
                        <Badge type={p.auditStatus === "approved" ? "success" : p.auditStatus === "pending" ? "warning" : "error"}>
                          {p.auditStatus === "approved" ? "已认证" : p.auditStatus === "pending" ? "待审核" : "已驳回"}
                        </Badge>
                        {p.frozen && <Badge type="error">已冻结</Badge>}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.textSub, marginTop: 6, lineHeight: 1.7 }}>
                        类目：{p.category} · 申请时间 {p.appliedAt.slice(0, 16).replace("T", " ")}
                        <br />
                        实名：{p.realName || "—"}（证件尾号 {p.idCardLast4 || "—"}）·
                        收款：{p.payoutAlipay ? "支付宝" : p.payoutWechat ? "微信" : p.payoutBank ? "银行卡" : "未绑定"}
                        {p.expertise.length > 0 && (
                          <>
                            <br />
                            擅长：{p.expertise.join("、")}
                          </>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.textSub, marginTop: 6 }}>简介：{p.bio}</div>
                      {p.auditNote && (
                        <div style={{ fontSize: 12, color: THEME.error, marginTop: 6 }}>审核备注：{p.auditNote}</div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                      {p.auditStatus === "pending" && (
                        <>
                          <button
                            style={{ ...styles.btnPrimary, display: "flex", alignItems: "center", gap: 4 }}
                            onClick={() => {
                              setAuditTarget(p);
                              setAuditApprove(true);
                              setAuditNote("");
                            }}
                          >
                            <CheckCircle2 size={14} /> 通过
                          </button>
                          <button
                            style={{ ...styles.btnDanger, display: "flex", alignItems: "center", gap: 4 }}
                            onClick={() => {
                              setAuditTarget(p);
                              setAuditApprove(false);
                              setAuditNote("");
                            }}
                          >
                            <XCircle size={14} /> 驳回
                          </button>
                        </>
                      )}
                      {p.auditStatus === "approved" && (
                        <button
                          style={{
                            ...styles.btnSecondary,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            color: p.frozen ? THEME.success : THEME.error,
                          }}
                          onClick={() => setFreezeTarget({ p, frozen: !p.frozen })}
                        >
                          {p.frozen ? <Sun size={14} /> : <Snowflake size={14} />}
                          {p.frozen ? "解冻" : "冻结"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      )}

      {/* ===== 服务管理 ===== */}
      {tab === "services" && (
        <AdminCard title={`服务治理（共 ${services.length} 项，在架 ${services.filter((s) => s.status === "online").length} 项）`}>
          {services.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: THEME.textHint, fontSize: 13 }}>暂无上架服务</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {services.map((s) => (
                <div key={s.id} style={{ padding: 14, borderRadius: 10, border: `1px solid ${THEME.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: THEME.textMain }}>{s.title}</span>
                        <Badge type={s.status === "online" ? "success" : s.status === "frozen" ? "error" : "default"}>
                          {s.status === "online" ? "在架" : s.status === "offline" ? "已下架" : s.status === "frozen" ? "被冻结" : s.status}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.textSub, marginTop: 6, lineHeight: 1.7 }}>
                        服务者：{s.providerNickname} · {DELIVERY_FORM_LABEL[s.deliveryForm]} · ¥{s.price} · {s.deliveryDays}天交付 · 已售 {s.salesCount}
                        <br />
                        范围：{s.scope}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {s.status !== "frozen" ? (
                        <button
                          style={{ ...styles.btnDanger, display: "flex", alignItems: "center", gap: 4 }}
                          onClick={() => {
                            const res = setConsultServiceStatus(s.id, "frozen", "admin");
                            show(res.message, res.success ? "success" : "error");
                            refresh();
                          }}
                        >
                          <Snowflake size={14} /> 冻结下架
                        </button>
                      ) : (
                        <button
                          style={{ ...styles.btnSecondary, display: "flex", alignItems: "center", gap: 4 }}
                          onClick={() => {
                            const res = setConsultServiceStatus(s.id, "offline", "admin");
                            show(res.message, res.success ? "success" : "error");
                            refresh();
                          }}
                        >
                          <Sun size={14} /> 解除冻结
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      )}

      {/* ===== 订单售后 ===== */}
      {tab === "orders" && (
        <AdminCard title={`订单监管（共 ${orders.length} 单，售后仲裁中 ${afterSellingOrders.length} 单）`}>
          {orders.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: THEME.textHint, fontSize: 13 }}>暂无订单</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {orders.map((o) => (
                <div
                  key={o.orderId}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    border: `1px solid ${o.status === "after_selling" ? THEME.warning : THEME.border}`,
                    backgroundColor: o.status === "after_selling" ? THEME.warningBg : "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: THEME.textMain }}>{o.serviceTitle}</span>
                        <Badge type={o.status === "after_selling" ? "warning" : o.status === "settled" ? "success" : "info"}>
                          {ORDER_STATUS_LABEL[o.status]}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.textSub, marginTop: 6, lineHeight: 1.7 }}>
                        {o.orderId} · ¥{o.amount}（服务费 ¥{o.platformFee} · 结算 ¥{o.settleAmount}）
                        <br />
                        买家：{o.buyerNickname} · 服务者：{o.providerNickname} · 下单 {o.createdAt.slice(0, 16).replace("T", " ")}
                        {o.settledAt && (
                          <>
                            <br />
                            结算时间：{o.settledAt.slice(0, 16).replace("T", " ")}
                          </>
                        )}
                      </div>
                      {o.requirement && (
                        <div style={{ fontSize: 12, color: THEME.textSub, marginTop: 6 }}>买家需求：{o.requirement}</div>
                      )}
                      {o.deliverContent && (
                        <div style={{ fontSize: 12, color: THEME.textSub, marginTop: 6 }}>交付内容：{o.deliverContent.slice(0, 120)}{o.deliverContent.length > 120 ? "…" : ""}</div>
                      )}
                      {o.afterSaleReason && (
                        <div style={{ fontSize: 12, color: THEME.error, marginTop: 6 }}>售后原因：{o.afterSaleReason}</div>
                      )}
                    </div>
                    {o.status === "after_selling" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                        <button
                          style={styles.btnDanger}
                          onClick={() => {
                            setArbTarget(o);
                            setArbRefund(true);
                            setArbNote("");
                          }}
                        >
                          支持退款
                        </button>
                        <button
                          style={styles.btnSecondary}
                          onClick={() => {
                            setArbTarget(o);
                            setArbRefund(false);
                            setArbNote("");
                          }}
                        >
                          驳回售后
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      )}

      {/* ===== 告警 ===== */}
      {tab === "alerts" && (
        <AdminCard
          title={`异常告警（${alerts.length} 条，未确认 ${unackAlerts.length} 条）`}
          extra={
            unackAlerts.length > 0 ? (
              <button
                style={styles.btnSecondary}
                onClick={() => {
                  unackAlerts.forEach((a) => acknowledgeAlert(a.id));
                  show("已全部确认", "success");
                  refresh();
                }}
              >
                全部确认
              </button>
            ) : undefined
          }
        >
          {alerts.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: THEME.textHint, fontSize: 13 }}>暂无告警记录</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alerts.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: `1px solid ${a.level === "error" || a.level === "critical" ? THEME.error : a.level === "warning" ? THEME.warning : THEME.border}`,
                    backgroundColor: a.level === "error" || a.level === "critical" ? THEME.errorBg : a.level === "warning" ? THEME.warningBg : "#fff",
                    opacity: a.acknowledged ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textMain }}>{a.message}</div>
                    {!a.acknowledged && (
                      <button
                        style={{ ...styles.btnSecondary, padding: "4px 10px", fontSize: 11, flexShrink: 0 }}
                        onClick={() => {
                          acknowledgeAlert(a.id);
                          refresh();
                        }}
                      >
                        确认
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.textSub, marginTop: 4 }}>
                    {a.createdAt.slice(0, 19).replace("T", " ")} · ref: {a.refId || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      )}

      {/* ===== 审核弹窗 ===== */}
      {auditTarget && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}
          onClick={() => setAuditTarget(null)}
        >
          <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 24, maxWidth: 420, width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: THEME.textMain, marginBottom: 8 }}>
              {auditApprove ? "通过入驻申请" : "驳回入驻申请"} — {auditTarget.nickname}
            </div>
            <div style={{ fontSize: 13, color: THEME.textSub, marginBottom: 14, lineHeight: 1.6 }}>
              类目 {auditTarget.category} · 实名 {auditTarget.realName || "—"}（尾号 {auditTarget.idCardLast4 || "—"}）
              <br />
              {auditApprove ? "通过后服务者即可上架服务，请确认三要素资料齐备。" : "驳回原因将通过站内消息通知服务者。"}
            </div>
            <textarea
              value={auditNote}
              onChange={(e) => setAuditNote(e.target.value)}
              rows={3}
              placeholder={auditApprove ? "审核备注（选填）" : "驳回原因（必填，如：资料不完整/类目不符）"}
              style={{ ...styles.input, resize: "none", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={styles.btnSecondary} onClick={() => setAuditTarget(null)}>取消</button>
              <button
                style={{ ...styles.btnPrimary, backgroundColor: auditApprove ? THEME.success : THEME.error }}
                disabled={!auditApprove && !auditNote.trim()}
                onClick={handleAudit}
              >
                确认{auditApprove ? "通过" : "驳回"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 仲裁弹窗 ===== */}
      {arbTarget && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}
          onClick={() => setArbTarget(null)}
        >
          <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 24, maxWidth: 420, width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: THEME.textMain, marginBottom: 8 }}>
              {arbRefund ? "仲裁：支持退款" : "仲裁：驳回售后"} — {arbTarget.serviceTitle}
            </div>
            <div style={{ fontSize: 13, color: THEME.textSub, marginBottom: 14, lineHeight: 1.6 }}>
              订单 {arbTarget.orderId} · ¥{arbTarget.amount}
              <br />
              售后原因：{arbTarget.afterSaleReason}
              <br />
              {arbRefund ? `退款将原路退回买家 ¥${arbTarget.amount}，服务者结算终止。` : "驳回后订单恢复为已交付状态，买家可确认收货。"}
            </div>
            <textarea
              value={arbNote}
              onChange={(e) => setArbNote(e.target.value)}
              rows={3}
              placeholder="仲裁说明（必填，将通知双方）"
              style={{ ...styles.input, resize: "none", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={styles.btnSecondary} onClick={() => setArbTarget(null)}>取消</button>
              <button
                style={{ ...styles.btnPrimary, backgroundColor: arbRefund ? THEME.error : THEME.success }}
                disabled={!arbNote.trim()}
                onClick={handleArbitrate}
              >
                确认仲裁
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!freezeTarget}
        title={freezeTarget?.frozen ? "冻结服务者" : "解冻服务者"}
        message={
          freezeTarget?.frozen
            ? `确认冻结 ${freezeTarget?.p.nickname}？其全部在架服务将同步下架，买家将无法预约。`
            : `确认解冻 ${freezeTarget?.p.nickname}？解冻后可自行重新上架服务。`
        }
        danger={freezeTarget?.frozen}
        onConfirm={handleFreeze}
        onCancel={() => setFreezeTarget(null)}
      />

      {toastNode}
    </div>
  );
}
