"use client";

// ============================================================================
// 言道国学 - 统一产品与价格中心（FINAL-ADMIN-COMMERCIAL-SEAL-02 第六~九章）
// Product/Price SSOT：所有正式收费项集中展示与改价
// - 会员套餐（月/年/终身）  - AI 时卡（单次/日/月/季）
// - AI 增量包              - B 类付费工具（姓名/手机号/车牌）
// 改价安全流程：输入新价 → 确认页（旧价/新价/影响范围）→ 二次确认 → 保存
// 规则：改价只影响新订单，历史订单保留原成交价快照
// 数据源：/api/admin/membership-config + /api/admin/ai-config + /api/admin/tool-matrix
// 前端用户侧价格从 /api/public/pricing 实时读取（无需发版）
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Bot, Clock, Coins, Crown, RefreshCw, Tag, Wrench } from "lucide-react";
import {
  THEME,
  AdminCard,
  Badge,
  ConfirmDialog,
  LoadingSpinner,
  useMounted,
  useToast,
} from "../_shared";
import {
  fetchAIConfig,
  fetchMembershipConfig,
  fetchToolMatrix,
  saveAIConfig,
  updateMembershipPlan,
  updateToolMatrixItem,
  type ToolMatrixItem,
} from "@/lib/admin/client";
import type { AIConfig, MembershipConfig, MembershipPlanConfig } from "@/lib/admin/types";

/** AI 时卡（admin-ai-config.json 中的 timePlans） */
interface AITimePlan {
  key: string;
  name: string;
  price: number;
  duration: string;
  desc?: string;
  enabled?: boolean;
}

type PriceTarget =
  | { kind: "membership"; plan: MembershipPlanConfig }
  | { kind: "timePlan"; plan: AITimePlan }
  | { kind: "package"; pkg: { id: string; name: string; price: number; count: number; enabled?: boolean } }
  | { kind: "tool"; toolId: string; tool: ToolMatrixItem };

export default function PricingCenterPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [memCfg, setMemCfg] = useState<MembershipConfig | null>(null);
  const [aiCfg, setAiCfg] = useState<AIConfig | null>(null);
  const [tools, setTools] = useState<Record<string, ToolMatrixItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{
    target: PriceTarget;
    oldPrice: number;
    newPrice: number;
    label: string;
  } | null>(null);

  const load = useCallback(async () => {
    const [m, a, t] = await Promise.all([
      fetchMembershipConfig(),
      fetchAIConfig(),
      fetchToolMatrix(),
    ]);
    if (m) setMemCfg(m);
    if (a) setAiCfg(a);
    if (t) setTools(t.tools);
    if (!m && !a) show("价格配置加载失败，请检查权限", "error");
    setLoading(false);
  }, [show]);

  useEffect(() => {
    if (!mounted) return;
    load();
  }, [mounted, load]);

  // ============ 改价确认流程 ============
  const requestPriceChange = (target: PriceTarget, label: string, oldPrice: number, newPrice: number) => {
    if (newPrice === oldPrice) return;
    if (Number.isNaN(newPrice) || newPrice < 0) {
      show("请输入有效的非负价格", "error");
      return;
    }
    setConfirm({ target, oldPrice, newPrice, label });
  };

  const doConfirm = async () => {
    if (!confirm || !aiCfg) return;
    setSaving(true);
    const { target, newPrice } = confirm;
    try {
      if (target.kind === "membership") {
        const res = await updateMembershipPlan(target.plan.level, { price: newPrice });
        if (res) {
          setMemCfg(res);
          show("会员价格已更新（仅影响新订单）", "success");
        } else show("保存失败", "error");
      } else if (target.kind === "timePlan") {
        const updated: AIConfig = {
          ...aiCfg,
          timePlans: ((aiCfg as any).timePlans || []).map((p: AITimePlan) =>
            p.key === target.plan.key ? { ...p, price: newPrice } : p
          ),
          updatedAt: new Date().toISOString(),
        };
        const res = await saveAIConfig(updated);
        if (res) {
          setAiCfg(res);
          show("时卡价格已更新（仅影响新订单）", "success");
        } else show("保存失败", "error");
      } else if (target.kind === "package") {
        const updated: AIConfig = {
          ...aiCfg,
          packages: aiCfg.packages.map((p) =>
            p.id === target.pkg.id ? { ...p, price: newPrice } : p
          ),
          updatedAt: new Date().toISOString(),
        };
        const res = await saveAIConfig(updated);
        if (res) {
          setAiCfg(res);
          show("增量包价格已更新（仅影响新订单）", "success");
        } else show("保存失败", "error");
      } else if (target.kind === "tool") {
        const res = await updateToolMatrixItem(target.toolId, { price: newPrice });
        if (res.ok && res.data) {
          setTools(res.data.tools);
          show("工具价格已更新（仅影响新订单）", "success");
        } else show(res.error || "保存失败", "error");
      }
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  };

  if (!mounted || loading) {
    return <LoadingSpinner text="正在加载产品价格配置..." />;
  }

  const timePlans: AITimePlan[] = (aiCfg as any)?.timePlans || [];
  const packages = aiCfg?.packages || [];
  const paidTools = tools
    ? Object.entries(tools).filter(([, t]) => t.payMode !== "FREE" && t.price > 0)
    : [];

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
            <Tag size={24} style={{ color: THEME.primary }} /> 产品与价格中心
          </h1>
          <div style={{ fontSize: 13, color: THEME.textSub, marginTop: 6 }}>
            价格唯一事实源（SSOT）· 修改后用户端实时生效，无需重新发版
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

      <AdminCard style={{ marginBottom: 16, backgroundColor: THEME.infoBg, borderColor: "#bfdbfe" }}>
        <div style={{ fontSize: 13, color: THEME.textSub, lineHeight: 1.7 }}>
          <b>改价安全规则：</b>修改价格只影响<b>新订单</b>，历史订单保留原成交价快照。
          用户端价格从服务端 <code>/api/public/pricing</code> 实时读取。
          会员套餐佣金按下单时配置快照结算，未来改价不影响历史订单。
        </div>
      </AdminCard>

      {/* ===== 会员套餐 ===== */}
      <SectionTitle icon={<Crown size={16} />}>会员套餐</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 22 }}>
        {(memCfg?.plans || []).map((p) => (
          <ProductCard
            key={p.level}
            productId={p.level}
            name={p.name}
            type="会员"
            price={p.price}
            originalPrice={p.originalPrice}
            duration={p.duration}
            enabled={p.enabled}
            features={p.features}
            onPrice={(np) => requestPriceChange({ kind: "membership", plan: p }, p.name, p.price, np)}
          />
        ))}
        {!memCfg?.plans?.length && <EmptyHint />}
      </div>

      {/* ===== AI 时卡 ===== */}
      <SectionTitle icon={<Clock size={16} />}>AI 时卡 / 单次解锁</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 22 }}>
        {timePlans.map((p) => (
          <ProductCard
            key={p.key}
            productId={p.key}
            name={p.name}
            type="AI时卡"
            price={p.price}
            duration={p.duration}
            desc={p.desc}
            enabled={p.enabled !== false}
            onPrice={(np) => requestPriceChange({ kind: "timePlan", plan: p }, p.name, p.price, np)}
          />
        ))}
        {!timePlans.length && <EmptyHint />}
      </div>

      {/* ===== AI 增量包 ===== */}
      <SectionTitle icon={<Coins size={16} />}>AI 额度增量包</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 22 }}>
        {packages.map((p) => (
          <ProductCard
            key={p.id}
            productId={p.id}
            name={p.name}
            type="额度包"
            price={p.price}
            duration={`${p.validity}天 · ${p.count}次`}
            enabled={p.enabled}
            onPrice={(np) =>
              requestPriceChange({ kind: "package", pkg: p }, p.name, p.price, np)
            }
          />
        ))}
        {!packages.length && <EmptyHint />}
      </div>

      {/* ===== 付费工具 ===== */}
      <SectionTitle icon={<Wrench size={16} />}>付费工具（单项解锁）</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 22 }}>
        {paidTools.map(([toolId, t]) => (
          <ProductCard
            key={toolId}
            productId={toolId}
            name={t.name}
            type="单次收费"
            price={t.price}
            duration="单次使用"
            enabled={t.status === "ON"}
            onPrice={(np) => requestPriceChange({ kind: "tool", toolId, tool: t }, t.name, t.price, np)}
          />
        ))}
        {!paidTools.length && <EmptyHint />}
      </div>

      {/* ===== AI 付费工具（ai-config 内） ===== */}
      {(aiCfg?.tools || []).some((t) => t.price > 0) && (
        <>
          <SectionTitle icon={<Bot size={16} />}>AI 解读单项（AI管理页可调）</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 22 }}>
            {(aiCfg?.tools || []).filter((t) => t.price > 0).map((t) => (
              <div
                key={t.id}
                style={{
                  backgroundColor: THEME.cardBg,
                  borderRadius: 12,
                  border: `1px solid ${THEME.border}`,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain }}>{t.name}</span>
                  <Badge type={t.enabled ? "success" : "default"}>{t.enabled ? "在售" : "下架"}</Badge>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: THEME.primary }}>¥{t.price}</div>
                <div style={{ fontSize: 12, color: THEME.textHint, marginTop: 6 }}>
                  {t.description || t.id} · 到「AI管理」页修改
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== 改价确认弹窗（指令第八章） ===== */}
      <ConfirmDialog
        open={!!confirm}
        title="确认修改价格"
        confirmText={saving ? "保存中..." : "二次确认并保存"}
        onConfirm={doConfirm}
        onCancel={() => setConfirm(null)}
        message={
          confirm
            ? [
                `产品：「${confirm.label}」`,
                `旧价格：¥${confirm.oldPrice}`,
                `新价格：¥${confirm.newPrice}`,
                "",
                "影响范围：仅新订单按新价格创建；",
                "历史订单保留原成交价快照，不受影响；",
                "生效时间：保存后立即生效（用户端实时读取）。",
                "",
                "确定要保存吗？此操作将写入审计日志。",
              ].join("\n")
            : ""
        }
      />
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 16, fontWeight: 700, color: THEME.textMain, margin: "4px 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: THEME.primary }}>{icon}</span>
      {children}
    </div>
  );
}

function EmptyHint() {
  return (
    <div style={{ fontSize: 13, color: THEME.textHint, padding: 16 }}>暂无配置项</div>
  );
}

function ProductCard({
  productId,
  name,
  type,
  price,
  originalPrice,
  duration,
  desc,
  features,
  enabled,
  onPrice,
}: {
  productId: string;
  name: string;
  type: string;
  price: number;
  originalPrice?: number;
  duration?: string;
  desc?: string;
  features?: string[];
  enabled: boolean;
  onPrice: (newPrice: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(price));

  return (
    <div
      style={{
        backgroundColor: THEME.cardBg,
        borderRadius: 12,
        border: `1px solid ${THEME.border}`,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain }}>{name}</span>
        <Badge type={enabled ? "success" : "default"}>{enabled ? "在售" : "已下架"}</Badge>
      </div>
      <div style={{ fontSize: 11, color: THEME.textHint, marginBottom: 8 }}>
        productId: {productId} · {type}
        {duration ? ` · ${duration}` : ""}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: THEME.primary }}>¥{price}</span>
        {originalPrice != null && originalPrice > price && (
          <span style={{ fontSize: 13, color: THEME.textHint, textDecoration: "line-through" }}>
            ¥{originalPrice}
          </span>
        )}
      </div>
      {desc && <div style={{ fontSize: 12, color: THEME.textSub, marginBottom: 8 }}>{desc}</div>}
      {features && features.length > 0 && (
        <div style={{ fontSize: 12, color: THEME.textSub, marginBottom: 10, lineHeight: 1.6 }}>
          {features.slice(0, 3).map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 4 }}>
              <span style={{ color: THEME.success }}>✓</span>
              <span>{f}</span>
            </div>
          ))}
          {features.length > 3 && <span style={{ color: THEME.textHint }}>等 {features.length} 项权益</span>}
        </div>
      )}
      {editing ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            min={0}
            step="0.1"
            value={val}
            autoFocus
            onChange={(e) => setVal(e.target.value)}
            style={{
              flex: 1,
              padding: "7px 10px",
              border: `1px solid ${THEME.primary}`,
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            onClick={() => {
              onPrice(Number(val));
              setEditing(false);
            }}
            style={{
              padding: "7px 14px",
              border: "none",
              borderRadius: 8,
              backgroundColor: THEME.primary,
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            下一步
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setVal(String(price));
            }}
            style={{
              padding: "7px 12px",
              border: `1px solid ${THEME.border}`,
              borderRadius: 8,
              backgroundColor: "#fff",
              color: THEME.textSub,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            取消
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setVal(String(price));
            setEditing(true);
          }}
          style={{
            width: "100%",
            padding: "8px 0",
            border: `1px solid ${THEME.border}`,
            borderRadius: 8,
            backgroundColor: "#fff",
            color: THEME.primary,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          修改价格
        </button>
      )}
    </div>
  );
}
