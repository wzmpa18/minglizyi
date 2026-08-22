"use client";

// ============================================================================
// 言道国学 - 会员收费板块管理页面
// 功能：会员等级展示、价格/权益/徽章编辑、套餐上下架、合规口径管理
// ============================================================================

import { useEffect, useState, type CSSProperties } from "react";
import {
  Crown,
  RefreshCw,
  Edit3,
  Check,
  X,
  ShoppingCart,
  Tag,
  Shield,
  Star,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  THEME,
  AdminCard,
  ToggleSwitch,
  Badge,
  LoadingSpinner,
  useToast,
  useMounted,
  styles,
  ConfirmDialog,
} from "../_shared";
import {
  fetchMembershipConfig,
  updateMembershipPlan,
  toggleMembershipPlan,
  saveMembershipConfig,
} from "@/lib/admin/client";
import type { MembershipConfig, MembershipPlanConfig, MemberLevel } from "@/lib/admin/types";

const LEVEL_COLORS: Record<MemberLevel, string> = {
  basic: "#95a5a6",
  monthly: "#3498db",
  quarterly: "#10B981",
  yearly: THEME.primary,
  lifetime: "#F59E0B",
};

export default function MembershipPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [config, setConfig] = useState<MembershipConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingLevel, setEditingLevel] = useState<MemberLevel | null>(null);
  const [editForm, setEditForm] = useState<MembershipPlanConfig | null>(null);
  const [complianceEditing, setComplianceEditing] = useState(false);
  const [complianceText, setComplianceText] = useState("");
  const [toggleTarget, setToggleTarget] = useState<MemberLevel | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await fetchMembershipConfig();
    setConfig(data);
    setLoading(false);
  };

  useEffect(() => {
    if (mounted) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // ---- 进入编辑 ----
  const startEdit = (plan: MembershipPlanConfig) => {
    setEditingLevel(plan.level);
    setEditForm({ ...plan, features: [...plan.features] });
  };

  const cancelEdit = () => {
    setEditingLevel(null);
    setEditForm(null);
  };

  // ---- 保存编辑 ----
  const saveEdit = async () => {
    if (!editForm || !editingLevel) return;
    setSaving(true);
    const updated = await updateMembershipPlan(editingLevel, editForm);
    if (updated) {
      setConfig(updated);
      show("套餐配置已保存");
    } else {
      show("保存失败", "error");
    }
    setSaving(false);
    setEditingLevel(null);
    setEditForm(null);
  };

  // ---- 上下架 ----
  const handleToggle = async (level: MemberLevel) => {
    setSaving(true);
    const updated = await toggleMembershipPlan(level);
    if (updated) {
      setConfig(updated);
      const plan = updated.plans.find((p) => p.level === level);
      show(`套餐「${plan?.name}」已${plan?.enabled ? "上架" : "下架"}`, plan?.enabled ? "success" : "warning");
    } else {
      show("操作失败", "error");
    }
    setSaving(false);
    setToggleTarget(null);
  };

  // ---- 合规口径 ----
  const saveCompliance = async () => {
    if (!config) return;
    setSaving(true);
    const updated = await saveMembershipConfig({ ...config, complianceLabel: complianceText });
    if (updated) {
      setConfig(updated);
      show("合规口径已更新");
    } else {
      show("保存失败", "error");
    }
    setSaving(false);
    setComplianceEditing(false);
  };

  if (!mounted || loading) {
    return (
      <div>
        <PageHeader onRefresh={load} />
        <LoadingSpinner text="正在加载会员配置..." />
      </div>
    );
  }

  if (!config) {
    return (
      <div>
        <PageHeader onRefresh={load} />
        <AdminCard>
          <div style={{ textAlign: "center", padding: 40, color: THEME.error }}>
            配置加载失败，请检查网络或密钥后重试。
          </div>
        </AdminCard>
      </div>
    );
  }

  const sortedPlans = [...config.plans].sort((a, b) => a.sortOrder - b.sortOrder);
  const paidPlans = sortedPlans.filter((p) => p.level !== "basic");

  return (
    <div>
      <PageHeader onRefresh={load} saving={saving} />
      {toastNode}

      {/* 概览统计 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <SummaryCard label="套餐总数" value={config.plans.length} icon={<Crown size={18} />} color={THEME.primary} />
        <SummaryCard label="上架中" value={config.plans.filter((p) => p.enabled).length} icon={<Eye size={18} />} color={THEME.success} />
        <SummaryCard label="已下架" value={config.plans.filter((p) => !p.enabled).length} icon={<EyeOff size={18} />} color={THEME.textHint} />
        <SummaryCard label="推荐套餐" value={config.plans.filter((p) => p.highlighted).length} icon={<Star size={18} />} color={THEME.warning} />
      </div>

      {/* 合规口径 */}
      <AdminCard
        style={{ marginBottom: 20 }}
        title={
          <>
            <Shield size={18} color={THEME.primary} /> 合规口径配置
          </>
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Tag size={16} color={THEME.textSub} />
          {complianceEditing ? (
            <>
              <input
                value={complianceText}
                onChange={(e) => setComplianceText(e.target.value)}
                style={{ ...styles.input, flex: 1, minWidth: 200 }}
                autoFocus
              />
              <button style={styles.btnPrimary} onClick={saveCompliance} disabled={saving}>
                <Check size={14} style={{ verticalAlign: "middle" }} /> 保存
              </button>
              <button style={styles.btnSecondary} onClick={() => setComplianceEditing(false)}>
                取消
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 15, fontWeight: 600, color: THEME.textMain }}>{config.complianceLabel}</span>
              <Badge type="info">支付展示文案</Badge>
              <button
                style={{ ...styles.btnSecondary, marginLeft: "auto" }}
                onClick={() => {
                  setComplianceText(config.complianceLabel);
                  setComplianceEditing(true);
                }}
              >
                <Edit3 size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> 修改
              </button>
            </>
          )}
        </div>
        <div style={{ fontSize: 12, color: THEME.textHint, marginTop: 10 }}>
          该文案将显示在支付页面与服务说明中，确保合规表述一致。
        </div>
      </AdminCard>

      {/* 会员套餐列表 */}
      <div style={{ marginBottom: 14, fontSize: 16, fontWeight: 700, color: THEME.textMain, display: "flex", alignItems: "center", gap: 8 }}>
        <ShoppingCart size={18} color={THEME.primary} /> 会员套餐管理
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {sortedPlans.map((plan) => {
          const isEditing = editingLevel === plan.level && !!editForm;
          return (
            <PlanCard
              key={plan.level}
              plan={plan}
              editing={isEditing}
              editForm={editForm}
              saving={saving}
              onEdit={() => startEdit(plan)}
              onCancel={cancelEdit}
              onSave={saveEdit}
              onFormChange={setEditForm}
              onToggle={() => setToggleTarget(plan.level)}
            />
          );
        })}
      </div>

      <div style={{ textAlign: "center", padding: "20px 0 8px", fontSize: 12, color: THEME.textHint }}>
        会员配置最近更新：{new Date(config.updatedAt).toLocaleString("zh-CN")}
      </div>

      {/* 上下架确认弹窗 */}
      <ConfirmDialog
        open={!!toggleTarget}
        title="确认操作"
        message={
          toggleTarget
            ? `确定要${config.plans.find((p) => p.level === toggleTarget)?.enabled ? "下架" : "上架"}套餐「${config.plans.find((p) => p.level === toggleTarget)?.name}」吗？`
            : ""
        }
        confirmText="确认"
        danger={config.plans.find((p) => p.level === toggleTarget)?.enabled}
        onConfirm={() => toggleTarget && handleToggle(toggleTarget)}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}

// ==================== 子组件 ====================

const thStyle: CSSProperties = { textAlign: "left", padding: "8px", fontSize: 13, fontWeight: 600, color: THEME.textSub };

function PageHeader({ onRefresh, saving }: { onRefresh: () => void; saving?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: THEME.textMain, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <Crown size={26} color={THEME.primary} /> 会员收费管理
        </h1>
        <p style={{ fontSize: 14, color: THEME.textSub, marginTop: 6 }}>
          管理会员等级、价格、权益配置与套餐上下架
        </p>
      </div>
      <button onClick={onRefresh} style={{ ...styles.btnSecondary, opacity: saving ? 0.6 : 1 }} disabled={saving}>
        <RefreshCw size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> 刷新
      </button>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div style={{ backgroundColor: THEME.cardBg, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: THEME.textSub }}>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: THEME.textMain, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function PlanCard({
  plan,
  editing,
  editForm,
  saving,
  onEdit,
  onCancel,
  onSave,
  onFormChange,
  onToggle,
}: {
  plan: MembershipPlanConfig;
  editing: boolean;
  editForm: MembershipPlanConfig | null;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onFormChange: (form: MembershipPlanConfig) => void;
  onToggle: () => void;
}) {
  const color = LEVEL_COLORS[plan.level];
  const p = editing && editForm ? editForm : plan;

  const update = (patch: Partial<MembershipPlanConfig>) => {
    if (editForm) onFormChange({ ...editForm, ...patch });
  };

  const updateFeature = (idx: number, value: string) => {
    if (!editForm) return;
    const features = [...editForm.features];
    features[idx] = value;
    onFormChange({ ...editForm, features });
  };

  const addFeature = () => {
    if (!editForm) return;
    onFormChange({ ...editForm, features: [...editForm.features, "新增权益"] });
  };

  const removeFeature = (idx: number) => {
    if (!editForm) return;
    onFormChange({ ...editForm, features: editForm.features.filter((_, i) => i !== idx) });
  };

  return (
    <div
      style={{
        backgroundColor: THEME.cardBg,
        borderRadius: 14,
        border: plan.highlighted ? `2px solid ${color}` : `1px solid ${THEME.border}`,
        overflow: "hidden",
        opacity: plan.enabled ? 1 : 0.65,
        position: "relative",
      }}
    >
      {/* 头部色条 */}
      <div style={{ height: 6, backgroundColor: color }} />

      <div style={{ padding: 18 }}>
        {/* 标题行 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            {editing ? (
              <input
                value={editForm?.name || ""}
                onChange={(e) => update({ name: e.target.value })}
                style={{ ...styles.input, fontSize: 16, fontWeight: 700, width: "auto" }}
              />
            ) : (
              <div style={{ fontSize: 17, fontWeight: 800, color: THEME.textMain }}>{plan.name}</div>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <Badge type="primary" >{plan.duration}</Badge>
              {plan.badge && <Badge type="warning">{plan.badge}</Badge>}
              {plan.highlighted && <Badge type="success"><Star size={10} style={{ verticalAlign: "middle" }} /> 推荐</Badge>}
              <Badge type={plan.enabled ? "success" : "default"}>{plan.enabled ? "上架" : "下架"}</Badge>
            </div>
          </div>
          {!editing && (
            <button onClick={onEdit} style={{ ...styles.btnSecondary, padding: "6px 10px", fontSize: 12 }}>
              <Edit3 size={13} style={{ verticalAlign: "middle" }} /> 编辑
            </button>
          )}
        </div>

        {/* 价格 */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14, padding: "10px 0", borderTop: `1px solid ${THEME.border}`, borderBottom: `1px solid ${THEME.border}` }}>
          {editing ? (
            <>
              <span style={{ color: color, fontWeight: 700 }}>¥</span>
              <input
                type="number"
                value={editForm?.price ?? 0}
                onChange={(e) => update({ price: parseFloat(e.target.value) || 0 })}
                style={{ ...styles.input, width: 80, fontSize: 18, fontWeight: 800, color: color }}
              />
              <span style={{ fontSize: 13, color: THEME.textHint }}>原价 ¥</span>
              <input
                type="number"
                value={editForm?.originalPrice ?? 0}
                onChange={(e) => update({ originalPrice: parseFloat(e.target.value) || 0 })}
                style={{ ...styles.input, width: 70 }}
              />
            </>
          ) : (
            <>
              <span style={{ fontSize: 28, fontWeight: 800, color: color }}>¥{plan.price}</span>
              {plan.originalPrice > plan.price && (
                <span style={{ fontSize: 14, color: THEME.textHint, textDecoration: "line-through" }}>¥{plan.originalPrice}</span>
              )}
              <span style={{ fontSize: 12, color: THEME.textHint, marginLeft: "auto" }}>{plan.duration}</span>
            </>
          )}
        </div>

        {/* 权益列表 */}
        <div style={{ fontSize: 12, fontWeight: 600, color: THEME.textSub, marginBottom: 8 }}>会员权益</div>
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            {editForm?.features.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: THEME.success, fontSize: 12 }}>✓</span>
                <input
                  value={f}
                  onChange={(e) => updateFeature(i, e.target.value)}
                  style={{ ...styles.input, flex: 1, fontSize: 12, padding: "4px 8px" }}
                />
                <button onClick={() => removeFeature(i)} style={{ border: "none", background: "transparent", cursor: "pointer", color: THEME.error, padding: 4 }}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <button onClick={addFeature} style={{ ...styles.btnSecondary, padding: "4px 10px", fontSize: 12, alignSelf: "flex-start" }}>
              + 添加权益
            </button>
          </div>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {plan.features.map((f, i) => (
              <li key={i} style={{ fontSize: 12, color: THEME.textSub, padding: "3px 0", display: "flex", gap: 6, lineHeight: 1.5 }}>
                <span style={{ color: THEME.success, flexShrink: 0 }}>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}

        {/* 编辑态：徽章、推荐、时长 */}
        {editing && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, padding: "10px 0", borderTop: `1px solid ${THEME.border}` }}>
            <div>
              <label style={styles.label}>时长描述</label>
              <input value={editForm?.duration || ""} onChange={(e) => update({ duration: e.target.value })} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>徽章文案</label>
              <input value={editForm?.badge || ""} onChange={(e) => update({ badge: e.target.value })} style={styles.input} placeholder="如：热门" />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 16, alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: THEME.textSub, cursor: "pointer" }}>
                <ToggleSwitch checked={!!editForm?.highlighted} onChange={(v) => update({ highlighted: v })} size="sm" />
                设为推荐套餐
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: THEME.textSub, cursor: "pointer" }}>
                <ToggleSwitch checked={!!editForm?.enabled} onChange={(v) => update({ enabled: v })} size="sm" />
                上架销售
              </label>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {editing ? (
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button style={{ ...styles.btnPrimary, flex: 1 }} onClick={onSave} disabled={saving}>
              <Check size={14} style={{ verticalAlign: "middle" }} /> 保存配置
            </button>
            <button style={styles.btnSecondary} onClick={onCancel} disabled={saving}>
              取消
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              onClick={onToggle}
              style={{
                ...styles.btnSecondary,
                flex: 1,
                color: plan.enabled ? THEME.error : THEME.success,
                borderColor: plan.enabled ? THEME.error : THEME.success,
              }}
            >
              {plan.enabled ? <><EyeOff size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> 下架</> : <><Eye size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> 上架</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
