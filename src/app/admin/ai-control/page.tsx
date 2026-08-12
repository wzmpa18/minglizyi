"use client";

// ============================================================================
// 言道国学 - AI 功能管控页面
// 功能：全局开关、工具启停与定价、会员配额调整、增量包管理
// ============================================================================

import { useEffect, useState, type CSSProperties } from "react";
import { Bot, Power, Settings2, Package, Coins, RefreshCw, Zap } from "lucide-react";
import {
  THEME,
  AdminCard,
  ToggleSwitch,
  Badge,
  LoadingSpinner,
  useToast,
  useMounted,
  styles,
} from "../_shared";
import {
  fetchAIConfig,
  updateAIGlobalEnabled,
  toggleAITool,
  updateAITool,
  updateAIQuotas,
  updateAIPackage,
} from "@/lib/admin/client";
import type { AIConfig, AIToolConfig, MemberLevel } from "@/lib/admin/types";

const LEVEL_LABELS: Record<MemberLevel, string> = {
  basic: "免费用户",
  monthly: "月度会员",
  yearly: "年度会员",
  lifetime: "终身会员",
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  general_ai: { label: "通用AI", color: THEME.info },
  b_tool: { label: "B类付费", color: THEME.warning },
  incremental: { label: "增量包", color: THEME.primary },
};

export default function AIControlPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await fetchAIConfig();
    setConfig(data);
    setLoading(false);
  };

  useEffect(() => {
    if (mounted) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // ---- 全局开关 ----
  const handleGlobalToggle = async (val: boolean) => {
    setSaving(true);
    const updated = await updateAIGlobalEnabled(val);
    if (updated) {
      setConfig(updated);
      show(`AI 全局功能已${val ? "开启" : "关闭"}`, val ? "success" : "warning");
    } else {
      show("操作失败", "error");
    }
    setSaving(false);
  };

  // ---- 工具开关 ----
  const handleToolToggle = async (toolId: string) => {
    setSaving(true);
    const updated = await toggleAITool(toolId);
    if (updated) {
      setConfig(updated);
      show("工具状态已更新");
    } else {
      show("操作失败", "error");
    }
    setSaving(false);
  };

  // ---- 工具价格修改 ----
  const handleToolPriceChange = async (toolId: string, price: number) => {
    setSaving(true);
    const updated = await updateAITool(toolId, { price });
    if (updated) {
      setConfig(updated);
      show("价格已更新");
    } else {
      show("保存失败", "error");
    }
    setSaving(false);
  };

  // ---- 配额修改 ----
  const handleQuotaChange = async (level: MemberLevel, field: "daily" | "monthly", value: number) => {
    if (!config) return;
    const newQuotas = {
      ...config.quotas,
      [level]: { ...config.quotas[level], [field]: value },
    };
    setConfig({ ...config, quotas: newQuotas }); // 乐观更新
    setSaving(true);
    const updated = await updateAIQuotas(newQuotas);
    if (updated) {
      setConfig(updated);
      show("配额已更新");
    } else {
      show("保存失败", "error");
      load();
    }
    setSaving(false);
  };

  // ---- 增量包修改 ----
  const handlePackageChange = async (
    packageId: string,
    patch: Partial<{ price: number; count: number; validity: number; enabled: boolean; name: string }>
  ) => {
    setSaving(true);
    const updated = await updateAIPackage(packageId, patch);
    if (updated) {
      setConfig(updated);
      show("增量包配置已更新");
    } else {
      show("保存失败", "error");
      load();
    }
    setSaving(false);
  };

  if (!mounted || loading) {
    return (
      <div>
        <PageHeader onRefresh={load} />
        <LoadingSpinner text="正在加载 AI 配置..." />
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

  const generalTools = config.tools.filter((t) => t.category === "general_ai");
  const bTools = config.tools.filter((t) => t.category === "b_tool");

  return (
    <div>
      <PageHeader onRefresh={load} saving={saving} />
      {toastNode}

      {/* 全局开关 */}
      <AdminCard
        style={{ marginBottom: 20 }}
        title={
          <>
            <Power size={18} color={THEME.primary} /> 全局 AI 功能总开关
          </>
        }
        extra={<Badge type={config.globalEnabled ? "success" : "error"}>{config.globalEnabled ? "运行中" : "已关闭"}</Badge>}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.textMain }}>
              AI 全局服务 {config.globalEnabled ? "已开启" : "已关闭"}
            </div>
            <div style={{ fontSize: 13, color: THEME.textSub, marginTop: 4 }}>
              关闭后所有 AI 解读、问诊、付费工具均不可用。会员配额与定价配置不受影响。
            </div>
          </div>
          <ToggleSwitch checked={config.globalEnabled} onChange={handleGlobalToggle} />
        </div>
        <div style={{ fontSize: 12, color: THEME.textHint, marginTop: 14 }}>
          最近更新：{new Date(config.updatedAt).toLocaleString("zh-CN")}
        </div>
      </AdminCard>

      {/* 通用 AI 工具开关 */}
      <AdminCard
        style={{ marginBottom: 20 }}
        title={
          <>
            <Bot size={18} color={THEME.info} /> 通用 AI 解读工具
          </>
        }
        extra={<Badge type="info">{generalTools.filter((t) => t.enabled).length}/{generalTools.length} 启用</Badge>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {generalTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onToggle={() => handleToolToggle(tool.id)}
              disabled={!config.globalEnabled || saving}
            />
          ))}
        </div>
      </AdminCard>

      {/* B 类付费工具 */}
      <AdminCard
        style={{ marginBottom: 20 }}
        title={
          <>
            <Coins size={18} color={THEME.warning} /> B 类高价值付费工具
          </>
        }
        extra={<Badge type="warning">{bTools.filter((t) => t.enabled).length}/{bTools.length} 启用</Badge>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {bTools.map((tool) => (
            <BToolCard
              key={tool.id}
              tool={tool}
              onToggle={() => handleToolToggle(tool.id)}
              onPriceChange={(price) => handleToolPriceChange(tool.id, price)}
              disabled={!config.globalEnabled || saving}
            />
          ))}
        </div>
      </AdminCard>

      {/* 会员配额配置 */}
      <AdminCard
        style={{ marginBottom: 20 }}
        title={
          <>
            <Settings2 size={18} color={THEME.primary} /> 会员 AI 配额配置
          </>
        }
        extra={<span style={{ fontSize: 12, color: THEME.textHint }}>-1 表示无限次</span>}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 480 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.border}` }}>
                <th style={thStyle}>会员等级</th>
                <th style={thStyle}>每日配额</th>
                <th style={thStyle}>每月配额</th>
                <th style={thStyle}>说明</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(config.quotas) as MemberLevel[]).map((level) => {
                const q = config.quotas[level];
                return (
                  <tr key={level} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={tdStyle}>
                      <Badge type="primary">{LEVEL_LABELS[level]}</Badge>
                    </td>
                    <td style={tdStyle}>
                      <QuotaInput
                        value={q.daily}
                        onChange={(v) => handleQuotaChange(level, "daily", v)}
                        disabled={saving}
                      />
                    </td>
                    <td style={tdStyle}>
                      <QuotaInput
                        value={q.monthly}
                        onChange={(v) => handleQuotaChange(level, "monthly", v)}
                        disabled={saving}
                      />
                    </td>
                    <td style={{ ...tdStyle, color: THEME.textHint, fontSize: 12 }}>
                      {q.daily === -1 ? "每日无限" : `每日${q.daily}次`}
                      {" · "}
                      {q.monthly === -1 ? "每月无限" : `每月${q.monthly}次`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* 增量包配置 */}
      <AdminCard
        style={{ marginBottom: 20 }}
        title={
          <>
            <Package size={18} color={THEME.primary} /> AI 增量包定价管理
          </>
        }
        extra={<Badge type="primary">{config.packages.filter((p) => p.enabled).length}/{config.packages.length} 上架</Badge>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {config.packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onChange={(patch) => handlePackageChange(pkg.id, patch)}
              disabled={saving}
            />
          ))}
        </div>
      </AdminCard>

      <div style={{ textAlign: "center", padding: "16px 0 8px", fontSize: 12, color: THEME.textHint }}>
        <Zap size={12} style={{ verticalAlign: "middle" }} /> 所有配置实时保存至服务端，修改即时生效
      </div>
    </div>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 600,
  color: THEME.textSub,
};
const tdStyle: CSSProperties = {
  padding: "10px 12px",
  color: THEME.textMain,
};

// ==================== 子组件 ====================

function PageHeader({ onRefresh, saving }: { onRefresh: () => void; saving?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: THEME.textMain, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <Bot size={26} color={THEME.primary} /> AI 功能管控
        </h1>
        <p style={{ fontSize: 14, color: THEME.textSub, marginTop: 6 }}>
          控制 AI 功能开关、调整会员配额、设置增量包与付费工具价格
        </p>
      </div>
      <button onClick={onRefresh} style={{ ...styles.btnSecondary, opacity: saving ? 0.6 : 1 }} disabled={saving}>
        <RefreshCw size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> 刷新
      </button>
    </div>
  );
}

/** 通用 AI 工具卡片 */
function ToolCard({
  tool,
  onToggle,
  disabled,
}: {
  tool: AIToolConfig;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${THEME.border}`,
        borderRadius: 10,
        padding: 14,
        backgroundColor: tool.enabled ? "#fff" : THEME.primaryBgLight,
        opacity: tool.enabled ? 1 : 0.7,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: THEME.textMain }}>{tool.name}</div>
        <ToggleSwitch checked={tool.enabled} onChange={onToggle} size="sm" />
      </div>
      <div style={{ fontSize: 12, color: THEME.textSub, lineHeight: 1.5 }}>{tool.description}</div>
      <div style={{ marginTop: 8 }}>
        <Badge type={tool.enabled ? "success" : "default"}>{tool.enabled ? "已启用" : "已停用"}</Badge>
      </div>
    </div>
  );
}

/** B 类付费工具卡片（带价格编辑） */
function BToolCard({
  tool,
  onToggle,
  onPriceChange,
  disabled,
}: {
  tool: AIToolConfig;
  onToggle: () => void;
  onPriceChange: (price: number) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(tool.price));

  const save = () => {
    const v = parseFloat(price);
    if (isNaN(v) || v < 0) {
      setPrice(String(tool.price));
      setEditing(false);
      return;
    }
    onPriceChange(Math.round(v * 100) / 100);
    setEditing(false);
  };

  return (
    <div
      style={{
        border: `1px solid ${THEME.border}`,
        borderRadius: 10,
        padding: 16,
        backgroundColor: tool.enabled ? "#fff" : THEME.primaryBgLight,
        opacity: tool.enabled ? 1 : 0.7,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain }}>{tool.name}</div>
        <ToggleSwitch checked={tool.enabled} onChange={onToggle} size="sm" />
      </div>
      <div style={{ fontSize: 12, color: THEME.textSub, lineHeight: 1.5, marginBottom: 12 }}>{tool.description}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: THEME.textHint, marginBottom: 2 }}>单次价格</div>
          {editing ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: THEME.warning, fontWeight: 700 }}>¥</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => e.key === "Enter" && save()}
                autoFocus
                style={{ width: 70, padding: "4px 8px", border: `1px solid ${THEME.primary}`, borderRadius: 6, fontSize: 14, outline: "none" }}
              />
            </div>
          ) : (
            <div
              onClick={() => setEditing(true)}
              style={{ fontSize: 18, fontWeight: 800, color: THEME.warning, cursor: "pointer" }}
              title="点击修改价格"
            >
              ¥{tool.price}
            </div>
          )}
        </div>
        <Badge type={tool.enabled ? "warning" : "default"}>{tool.enabled ? "在售" : "已下架"}</Badge>
      </div>
    </div>
  );
}

/** 配额输入框（-1 = 无限） */
function QuotaInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const save = () => {
    setEditing(false);
    if (text.trim() === "-1" || text.trim() === "无限") {
      onChange(-1);
      return;
    }
    const v = parseInt(text, 10);
    if (!isNaN(v) && v >= -1) {
      onChange(v);
    } else {
      setText(String(value));
    }
  };

  if (editing) {
    return (
      <input
        type="number"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && save()}
        autoFocus
        disabled={disabled}
        style={{ width: 80, padding: "4px 8px", border: `1px solid ${THEME.primary}`, borderRadius: 6, fontSize: 14, outline: "none" }}
      />
    );
  }
  return (
    <span
      onClick={() => !disabled && setEditing(true)}
      style={{ fontWeight: 700, color: value === -1 ? THEME.success : THEME.textMain, cursor: disabled ? "not-allowed" : "pointer", fontSize: 15 }}
      title="点击修改"
    >
      {value === -1 ? "∞ 无限" : value}
    </span>
  );
}

/** 增量包卡片 */
function PackageCard({
  pkg,
  onChange,
  disabled,
}: {
  pkg: { id: string; name: string; count: number; price: number; validity: number; enabled: boolean };
  onChange: (patch: Partial<{ price: number; count: number; validity: number; enabled: boolean; name: string }>) => void;
  disabled: boolean;
}) {
  const [editField, setEditField] = useState<string | null>(null);
  const [text, setText] = useState("");

  const startEdit = (field: string, val: number) => {
    setEditField(field);
    setText(String(val));
  };
  const saveEdit = () => {
    const v = parseFloat(text);
    if (!isNaN(v) && v >= 0) {
      const patch: any = {};
      patch[editField!] = Math.round(v * 100) / 100;
      onChange(patch);
    }
    setEditField(null);
  };

  return (
    <div
      style={{
        border: `1px solid ${THEME.border}`,
        borderRadius: 10,
        padding: 16,
        backgroundColor: pkg.enabled ? "#fff" : THEME.primaryBgLight,
        opacity: pkg.enabled ? 1 : 0.7,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain }}>{pkg.name}</div>
        <ToggleSwitch checked={pkg.enabled} onChange={() => onChange({ enabled: !pkg.enabled })} size="sm" />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: THEME.textSub }}>次数</span>
        {editField === "count" ? (
          <input
            type="number"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
            autoFocus
            style={{ width: 70, padding: "2px 6px", border: `1px solid ${THEME.primary}`, borderRadius: 6, fontSize: 13, outline: "none" }}
          />
        ) : (
          <span style={{ fontSize: 13, fontWeight: 600, color: THEME.textMain, cursor: "pointer" }} onClick={() => !disabled && startEdit("count", pkg.count)}>
            {pkg.count} 次
          </span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: THEME.textSub }}>价格</span>
        {editField === "price" ? (
          <input
            type="number"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
            autoFocus
            style={{ width: 70, padding: "2px 6px", border: `1px solid ${THEME.primary}`, borderRadius: 6, fontSize: 13, outline: "none" }}
          />
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.warning, cursor: "pointer" }} onClick={() => !disabled && startEdit("price", pkg.price)}>
            ¥{pkg.price}
          </span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: THEME.textSub }}>有效期</span>
        {editField === "validity" ? (
          <input
            type="number"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
            autoFocus
            style={{ width: 70, padding: "2px 6px", border: `1px solid ${THEME.primary}`, borderRadius: 6, fontSize: 13, outline: "none" }}
          />
        ) : (
          <span style={{ fontSize: 13, fontWeight: 600, color: THEME.textMain, cursor: "pointer" }} onClick={() => !disabled && startEdit("validity", pkg.validity)}>
            {pkg.validity} 天
          </span>
        )}
      </div>
      <div style={{ marginTop: 4 }}>
        <Badge type={pkg.enabled ? "success" : "default"}>{pkg.enabled ? "上架中" : "已下架"}</Badge>
      </div>
    </div>
  );
}
