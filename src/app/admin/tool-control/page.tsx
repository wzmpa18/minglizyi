"use client";

// ============================================================================
// 言道国学 - 工具管理中心（FINAL-ADMIN-COMMERCIAL-SEAL-02 第四/九章）
// 14 款正式工具矩阵：启用/维护/关闭 · 收费模式 · 单次价格 · 会员要求
// · AI 解读开关 · 额度消耗 · 每日次数 · 分享 · Web/Android/iOS/微信/QQ 小程序
// 红线：后台只控制开放/收费/权限/额度/平台，禁止修改排盘算法（后端字段白名单强制）
// 数据源：GET/PUT /api/admin/tool-matrix
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, RefreshCw, ShieldCheck, Wrench, Zap } from "lucide-react";
import {
  THEME,
  AdminCard,
  Badge,
  ConfirmDialog,
  LoadingSpinner,
  ToggleSwitch,
  useMounted,
  useToast,
} from "../_shared";
import {
  fetchToolMatrix,
  updateToolMatrixItem,
  type ToolMatrixItem,
} from "@/lib/admin/client";

const PAY_MODE_META: Record<string, { label: string; color: string }> = {
  FREE: { label: "免费", color: THEME.success },
  MEMBERSHIP: { label: "仅会员", color: THEME.primary },
  ONE_TIME: { label: "单次收费", color: THEME.info },
  AI_CREDIT: { label: "消耗AI额度", color: THEME.warning },
  DISABLED: { label: "停用收费", color: THEME.error },
};

const STATUS_META: Record<string, { label: string; type: "success" | "warning" | "error" }> = {
  ON: { label: "启用", type: "success" },
  OFF: { label: "关闭", type: "error" },
  MAINTENANCE: { label: "维护", type: "warning" },
};

export default function ToolControlPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [tools, setTools] = useState<Record<string, ToolMatrixItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    toolId: string;
    name: string;
    patch: Partial<ToolMatrixItem>;
    desc: string;
  } | null>(null);

  const load = useCallback(async () => {
    const d = await fetchToolMatrix();
    if (d) {
      setTools(d.tools);
    } else {
      show("工具矩阵加载失败，请检查权限", "error");
    }
    setLoading(false);
  }, [show]);

  useEffect(() => {
    if (!mounted) return;
    load();
  }, [mounted, load]);

  const applyPatch = useCallback(
    async (toolId: string, patch: Partial<ToolMatrixItem>) => {
      if (!tools) return;
      setSaving(toolId);
      const res = await updateToolMatrixItem(toolId, patch);
      setSaving(null);
      if (res.ok && res.data) {
        setTools(res.data.tools);
        show("已保存并写入审计日志", "success");
      } else {
        show(res.error || "保存失败", "error");
      }
    },
    [tools, show]
  );

  // 关键操作（状态/收费模式/价格）需二次确认
  const criticalChange = (toolId: string, name: string, patch: Partial<ToolMatrixItem>, desc: string) => {
    setConfirm({ toolId, name, patch, desc });
  };

  const doConfirm = async () => {
    if (!confirm) return;
    await applyPatch(confirm.toolId, confirm.patch);
    setConfirm(null);
  };

  const stats = useMemo(() => {
    if (!tools) return { on: 0, paid: 0, total: 0 };
    const list = Object.values(tools);
    return {
      on: list.filter((t) => t.status === "ON").length,
      paid: list.filter((t) => t.payMode !== "FREE").length,
      total: list.length,
    };
  }, [tools]);

  if (!mounted || loading) {
    return <LoadingSpinner text="正在加载工具矩阵..." />;
  }

  if (!tools) {
    return (
      <AdminCard title="工具矩阵加载失败">
        <div style={{ color: THEME.error, fontSize: 14 }}>无法获取工具配置数据。</div>
      </AdminCard>
    );
  }

  return (
    <div>
      {toastNode}

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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: THEME.textMain, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Wrench size={24} style={{ color: THEME.primary }} /> 工具管理中心
          </h1>
          <div style={{ fontSize: 13, color: THEME.textSub, marginTop: 6 }}>
            共 {stats.total} 款正式工具 · 启用 {stats.on} 款 · 收费 {stats.paid} 款
          </div>
        </div>
        <button
          onClick={() => load()}
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
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} /> 刷新
        </button>
      </div>

      <AdminCard
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={15} /> 架构红线
          </span>
        }
        style={{ marginBottom: 16 }}
      >
        <div style={{ fontSize: 13, color: THEME.textSub, lineHeight: 1.7 }}>
          后台只能控制功能<b>是否开放、收费、权限、额度、平台</b>。
          排盘算法、纳甲、世应、六神、伏神、紫微规则、八字规则、奇门算法等核心逻辑<b>禁止</b>通过后台修改
          （服务端字段白名单强制拦截）。
        </div>
      </AdminCard>

      {/* 工具表格（移动端卡片化） */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(tools).map(([toolId, t]) => {
          const pm = PAY_MODE_META[t.payMode] || PAY_MODE_META.FREE;
          const st = STATUS_META[t.status] || STATUS_META.ON;
          const isOpen = expanded === toolId;
          const busy = saving === toolId;
          return (
            <div
              key={toolId}
              style={{
                backgroundColor: THEME.cardBg,
                borderRadius: 12,
                border: `1px solid ${t.status === "ON" ? THEME.border : THEME.warning + "66"}`,
                overflow: "hidden",
                opacity: busy ? 0.7 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "14px 16px",
                  cursor: "pointer",
                  flexWrap: "wrap",
                }}
                onClick={() => setExpanded(isOpen ? null : toolId)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain }}>{t.name}</span>
                  <Badge type={st.type}>{st.label}</Badge>
                  <Badge type="default">
                    <span style={{ color: pm.color }}>{pm.label}</span>
                    {t.payMode !== "FREE" && t.price > 0 ? ` ¥${t.price}` : ""}
                  </Badge>
                  {t.aiEnabled && (
                    <Badge type="info">
                      <Zap size={10} style={{ marginRight: 3, verticalAlign: -1 }} />AI
                    </Badge>
                  )}
                </div>
                <span style={{ fontSize: 12, color: THEME.textHint }}>{isOpen ? "收起 ▲" : "配置 ▼"}</span>
              </div>

              {isOpen && (
                <div
                  style={{
                    borderTop: `1px solid ${THEME.border}`,
                    padding: 16,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 16,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 状态 */}
                  <div>
                    <div style={{ ...labelStyle }}>运行状态</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["ON", "MAINTENANCE", "OFF"] as const).map((s) => (
                        <button
                          key={s}
                          disabled={busy}
                          onClick={() =>
                            criticalChange(toolId, t.name, { status: s }, `状态改为「${STATUS_META[s].label}」`)
                          }
                          style={{
                            flex: 1,
                            padding: "7px 0",
                            border: t.status === s ? "none" : `1px solid ${THEME.border}`,
                            borderRadius: 8,
                            backgroundColor: t.status === s ? THEME.primary : "#fff",
                            color: t.status === s ? "#fff" : THEME.textSub,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {STATUS_META[s].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 收费模式 */}
                  <div>
                    <div style={{ ...labelStyle }}>
                      <Coins size={12} style={{ marginRight: 4, verticalAlign: -1 }} /> 收费模式
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(["FREE", "MEMBERSHIP", "ONE_TIME", "AI_CREDIT", "DISABLED"] as const).map((m) => (
                        <button
                          key={m}
                          disabled={busy}
                          onClick={() =>
                            criticalChange(toolId, t.name, { payMode: m }, `收费模式改为「${PAY_MODE_META[m].label}」`)
                          }
                          style={{
                            padding: "6px 10px",
                            border: t.payMode === m ? "none" : `1px solid ${THEME.border}`,
                            borderRadius: 8,
                            backgroundColor: t.payMode === m ? PAY_MODE_META[m].color : "#fff",
                            color: t.payMode === m ? "#fff" : THEME.textSub,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {PAY_MODE_META[m].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 单次价格 */}
                  <div>
                    <div style={{ ...labelStyle }}>单次价格（元）</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        defaultValue={t.price}
                        disabled={busy}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          border: `1px solid ${THEME.border}`,
                          borderRadius: 8,
                          fontSize: 14,
                          outline: "none",
                        }}
                        onChange={(e) => {
                          (e.target as HTMLInputElement).dataset.val = e.target.value;
                        }}
                        id={`price-${toolId}`}
                      />
                      <button
                        disabled={busy}
                        onClick={() => {
                          const el = document.getElementById(`price-${toolId}`) as HTMLInputElement | null;
                          const val = el ? Number(el.value) : t.price;
                          if (Number.isNaN(val) || val < 0) return show("请输入有效价格", "error");
                          criticalChange(toolId, t.name, { price: val }, `价格 ¥${t.price} → ¥${val}（只影响新订单）`);
                        }}
                        style={saveBtnStyle}
                      >
                        保存
                      </button>
                    </div>
                  </div>

                  {/* 开关组 */}
                  <div>
                    <div style={{ ...labelStyle }}>功能开关</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <ToggleRow
                        label="AI 解读"
                        checked={!!t.aiEnabled}
                        disabled={busy}
                        onToggle={(v) => applyPatch(toolId, { aiEnabled: v })}
                      />
                      <ToggleRow
                        label="分享功能"
                        checked={!!t.shareEnabled}
                        disabled={busy}
                        onToggle={(v) => applyPatch(toolId, { shareEnabled: v })}
                      />
                    </div>
                  </div>

                  {/* AI 额度消耗 + 每日次数 */}
                  <div>
                    <div style={{ ...labelStyle }}>
                      <Zap size={12} style={{ marginRight: 4, verticalAlign: -1 }} /> AI 额度消耗 / 每日次数
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="number"
                        min={0}
                        defaultValue={t.aiCreditCost ?? 0}
                        disabled={busy}
                        id={`credit-${toolId}`}
                        style={numInputStyle}
                        title="AI 额度消耗"
                      />
                      <input
                        type="number"
                        min={-1}
                        defaultValue={t.dailyLimit ?? -1}
                        disabled={busy}
                        id={`limit-${toolId}`}
                        style={numInputStyle}
                        title="每日次数（-1 不限）"
                      />
                      <button
                        disabled={busy}
                        onClick={() => {
                          const c = document.getElementById(`credit-${toolId}`) as HTMLInputElement | null;
                          const l = document.getElementById(`limit-${toolId}`) as HTMLInputElement | null;
                          applyPatch(toolId, {
                            aiCreditCost: c ? Number(c.value) : 0,
                            dailyLimit: l ? Number(l.value) : -1,
                          });
                        }}
                        style={saveBtnStyle}
                      >
                        保存
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: THEME.textHint, marginTop: 4 }}>
                      每日次数 -1 表示不限次数
                    </div>
                  </div>

                  {/* 平台开关 */}
                  <div>
                    <div style={{ ...labelStyle }}>适用平台</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {(
                        [
                          ["web", "Web"],
                          ["android", "Android"],
                          ["ios", "iOS"],
                          ["wechatMp", "微信小程序"],
                          ["qqMp", "QQ小程序"],
                        ] as const
                      ).map(([field, label]) => (
                        <label
                          key={field}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 13,
                            color: THEME.textSub,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!t[field]}
                            disabled={busy}
                            onChange={(e) => applyPatch(toolId, { [field]: e.target.checked } as Partial<ToolMatrixItem>)}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={`确认修改「${confirm?.name || ""}」`}
        message={confirm ? `${confirm.desc}。修改立即生效并写入审计日志，确定继续吗？` : ""}
        confirmText="确认修改"
        danger={confirm?.patch.status === "OFF"}
        onConfirm={doConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: THEME.textSub,
  marginBottom: 6,
} as const;

const saveBtnStyle = {
  padding: "8px 14px",
  border: "none",
  borderRadius: 8,
  backgroundColor: THEME.primary,
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
} as const;

const numInputStyle = {
  width: 80,
  padding: "8px 10px",
  border: `1px solid ${THEME.border}`,
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
} as const;

function ToggleRow({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, color: THEME.textSub }}>{label}</span>
      <ToggleSwitch checked={checked} onChange={onToggle} size="sm" />
    </div>
  );
}
