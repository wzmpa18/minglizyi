"use client";

// ============================================================================
// 言道国学 - 异常告警中心（P6-TOOL-04 §6.2）
// 提醒堆积/漏发/重复、支付未出报告、报告失败、权益异常、邀请错绑、
// 奖励重复、异常注册、异常退款、投诉激增、履约超时、规则发布失败、
// 星盘计算异常、择日规则异常 —— 全部集中展示、确认、可追溯，禁止静默出错。
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { BellRing, CheckCheck, Trash2, Activity, RefreshCw } from "lucide-react";
import { THEME, styles, AdminCard, StatCard, Badge, LoadingSpinner, useMounted, useToast, ToggleSwitch } from "../_shared";
import {
  listAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  clearAcknowledgedAlerts,
  ALERT_TYPE_LABELS,
  LEVEL_COLORS,
  type AlertRecord,
  type AlertLevel,
} from "@/lib/alertService";
import { dispatchDueReminders, detectMissedReminders, detectDuplicateReminders } from "@/lib/calendarEventsStore";
import { runConsultMaintenance } from "@/lib/consultServiceStore";
import { addNotificationAndNotify } from "@/lib/notificationCenter";

export default function AdminAlertsPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [levelFilter, setLevelFilter] = useState<"all" | AlertLevel>("all");
  const [unackOnly, setUnackOnly] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string>("尚未执行巡检");

  const refresh = useCallback(() => {
    setAlerts(listAlerts());
  }, []);

  useEffect(() => {
    if (mounted) refresh();
  }, [mounted, refresh]);

  if (!mounted) {
    return <LoadingSpinner text="正在加载告警数据..." />;
  }

  const filtered = alerts.filter(
    (a) => (levelFilter === "all" || a.level === levelFilter) && (!unackOnly || !a.acknowledged)
  );
  const unackCount = alerts.filter((a) => !a.acknowledged).length;
  const errorCount = alerts.filter((a) => a.level === "error" || a.level === "critical").length;
  const warningCount = alerts.filter((a) => a.level === "warning").length;

  const runScan = async () => {
    setScanning(true);
    try {
      // 1. 提醒调度巡检（站内通道实时下发，漏发/重复自动记告警）
      const dispatch = dispatchDueReminders((title, body) => {
        addNotificationAndNotify({ category: "system", title, body });
      });
      const missed = detectMissedReminders();
      const dup = detectDuplicateReminders();
      // 2. 咨询履约巡检（结算到期 + 履约超时）
      runConsultMaintenance();
      const lines = [
        `提醒调度：触发 ${dispatch.fired} 条 · 失败 ${dispatch.failed} 条`,
        `漏发检测：${missed.length} 条未按时触发`,
        `重复检测：${dup} 条重复投递`,
        `咨询履约：结算与超时巡检完成`,
      ];
      setScanResult(lines.join("\n"));
      show("巡检完成，结果已更新", "success");
      refresh();
    } catch (e) {
      show(`巡检异常：${e instanceof Error ? e.message : String(e)}`, "error");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: THEME.textMain, margin: 0 }}>异常告警中心</h1>
          {unackCount > 0 && <Badge type="error">{unackCount} 条待处理</Badge>}
        </div>
        <p style={{ fontSize: 13, color: THEME.textSub, margin: 0 }}>
          全站异常统一告警、确认与追溯：提醒 / 支付 / AI / 邀请奖励 / 履约 / 规则发布（P6-TOOL-04 §6.2，禁止静默出错）
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatCard label="告警总数" value={alerts.length} sub={`留存上限 500 条`} icon={<BellRing size={18} />} />
        <StatCard label="待确认" value={unackCount} sub="需人工确认处理" icon={<CheckCheck size={18} />} color={THEME.warning} />
        <StatCard label="错误及以上" value={errorCount} sub="需立即排查" icon={<Activity size={18} />} color={THEME.error} />
        <StatCard label="警告" value={warningCount} sub="观察与跟进" icon={<Activity size={18} />} color={THEME.info} />
      </div>

      {/* 一键巡检 */}
      <AdminCard title="系统巡检" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            style={{ ...styles.btnPrimary, display: "flex", alignItems: "center", gap: 6 }}
            onClick={runScan}
            disabled={scanning}
          >
            <RefreshCw size={14} className={scanning ? "animate-spin" : ""} />
            {scanning ? "巡检中..." : "立即巡检"}
          </button>
          <span style={{ fontSize: 12, color: THEME.textHint }}>
            执行提醒调度、漏发/重复检测与咨询履约巡检，异常自动写入下方告警列表
          </span>
        </div>
        <pre
          style={{
            marginTop: 12,
            padding: "12px 14px",
            borderRadius: 8,
            backgroundColor: THEME.primaryBgLight,
            border: `1px solid ${THEME.border}`,
            fontSize: 12,
            color: THEME.textSub,
            whiteSpace: "pre-wrap",
            margin: 0,
          }}
        >
          {scanResult}
        </pre>
      </AdminCard>

      {/* 告警列表 */}
      <AdminCard
        title={`告警记录（${filtered.length} / ${alerts.length} 条）`}
        extra={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{ ...styles.btnSecondary, display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => {
                acknowledgeAllAlerts();
                show("已确认全部告警", "success");
                refresh();
              }}
              disabled={unackCount === 0}
            >
              <CheckCheck size={13} /> 全部确认
            </button>
            <button
              style={{ ...styles.btnDanger, display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => {
                clearAcknowledgedAlerts();
                show("已清除已确认告警", "success");
                refresh();
              }}
            >
              <Trash2 size={13} /> 清除已确认
            </button>
          </div>
        }
      >
        {/* 过滤器 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {(["all", "critical", "error", "warning", "info"] as const).map((lv) => {
            const active = levelFilter === lv;
            return (
              <button
                key={lv}
                onClick={() => setLevelFilter(lv)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: `1px solid ${active ? THEME.primary : THEME.border}`,
                  backgroundColor: active ? THEME.primary : "#fff",
                  color: active ? "#fff" : THEME.textSub,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {lv === "all" ? "全部级别" : lv === "critical" ? "严重" : lv === "error" ? "错误" : lv === "warning" ? "警告" : "提示"}
              </button>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ToggleSwitch checked={unackOnly} onChange={setUnackOnly} size="sm" />
            <span style={{ fontSize: 12, color: THEME.textSub }}>仅看未确认</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: THEME.textHint, fontSize: 13 }}>
            暂无告警记录 — 系统运行正常
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: `1px solid ${a.level === "error" || a.level === "critical" ? THEME.error : a.level === "warning" ? THEME.warning : THEME.border}`,
                  backgroundColor: a.level === "error" || a.level === "critical" ? THEME.errorBg : a.level === "warning" ? THEME.warningBg : "#fff",
                  opacity: a.acknowledged ? 0.55 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <Badge type={a.level === "error" || a.level === "critical" ? "error" : a.level === "warning" ? "warning" : "info"}>
                        {ALERT_TYPE_LABELS[a.type]}
                      </Badge>
                      <span style={{ fontSize: 11, color: LEVEL_COLORS[a.level], fontWeight: 700 }}>
                        {a.level === "critical" ? "严重" : a.level === "error" ? "错误" : a.level === "warning" ? "警告" : "提示"}
                      </span>
                      {a.acknowledged && <Badge type="success">已确认</Badge>}
                    </div>
                    <div style={{ fontSize: 13, color: THEME.textMain, lineHeight: 1.6 }}>{a.message}</div>
                    <div style={{ fontSize: 11, color: THEME.textHint, marginTop: 4 }}>
                      {a.createdAt.slice(0, 19).replace("T", " ")}
                      {a.refId ? ` · 关联：${a.refId}` : ""}
                      {a.acknowledgedAt ? ` · 确认于 ${a.acknowledgedAt.slice(0, 19).replace("T", " ")}` : ""}
                    </div>
                  </div>
                  {!a.acknowledged && (
                    <button
                      style={{ ...styles.btnSecondary, padding: "4px 12px", fontSize: 11, flexShrink: 0 }}
                      onClick={() => {
                        acknowledgeAlert(a.id);
                        refresh();
                      }}
                    >
                      确认
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {toastNode}
    </div>
  );
}
