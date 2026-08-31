"use client";

// ============================================================================
// 言道国学 - 系统功能开关总中心（FINAL-ADMIN-COMMERCIAL-SEAL-02 第二十八/五章）
// 系统级开关（基础17项 + v25.0.71 七政断语7项）：ON / OFF / MAINTENANCE 三态
// - 服务端强制：被关闭能力的核心 API 直接拒绝（不只前端隐藏）
//   七政断语类开关经 /api/public/feature-flags 镜像下发，控制七政排盘页断语面板
// - 全部操作写审计日志，修改需二次确认
// 数据源：GET/PUT /api/admin/feature-flags
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldAlert, ToggleLeft, Zap } from "lucide-react";
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
  fetchFeatureFlags,
  updateFeatureFlag,
  type FeatureFlagItem,
  type FeatureFlagStatus,
} from "@/lib/admin/client";

const STATUS_META: Record<FeatureFlagStatus, { label: string; type: "success" | "warning" | "error"; color: string }> = {
  ON: { label: "开启", type: "success", color: THEME.success },
  OFF: { label: "关闭", type: "error", color: THEME.error },
  MAINTENANCE: { label: "维护中", type: "warning", color: THEME.warning },
};

export default function FeatureFlagsPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [flags, setFlags] = useState<Record<string, FeatureFlagItem> | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    key: string;
    name: string;
    from: FeatureFlagStatus;
    to: FeatureFlagStatus;
  } | null>(null);

  const load = useCallback(async () => {
    const d = await fetchFeatureFlags();
    if (d) {
      setFlags(d.flags);
      setUpdatedAt(d.updatedAt || null);
    } else {
      show("功能开关加载失败，请检查权限", "error");
    }
    setLoading(false);
  }, [show]);

  useEffect(() => {
    if (!mounted) return;
    load();
  }, [mounted, load]);

  const requestChange = (key: string, item: FeatureFlagItem, to: FeatureFlagStatus) => {
    if (item.status === to) return;
    setConfirm({ key, name: item.name, from: item.status, to });
  };

  const doChange = async () => {
    if (!confirm) return;
    setSaving(confirm.key);
    const res = await updateFeatureFlag(
      confirm.key,
      confirm.to,
      `后台操作：${confirm.name} ${STATUS_META[confirm.from].label} → ${STATUS_META[confirm.to].label}`
    );
    setSaving(null);
    setConfirm(null);
    if (res.ok && res.data) {
      setFlags(res.data.flags);
      setUpdatedAt(res.data.updatedAt || null);
      show(`「${confirm.name}」已设为${STATUS_META[confirm.to].label}`, "success");
    } else {
      show(res.error || "修改失败（需要 SUPER_ADMIN 权限）", "error");
    }
  };

  if (!mounted || loading) {
    return <LoadingSpinner text="正在加载功能开关..." />;
  }

  if (!flags) {
    return (
      <AdminCard title="功能开关加载失败">
        <div style={{ color: THEME.error, fontSize: 14 }}>
          无法获取开关数据。本页面需要 ADMIN 及以上权限。
        </div>
      </AdminCard>
    );
  }

  const entries = Object.entries(flags);
  const onCount = entries.filter(([, v]) => v.status === "ON").length;

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
            <ToggleLeft size={24} style={{ color: THEME.primary }} /> 系统功能开关
          </h1>
          <div style={{ fontSize: 13, color: THEME.textSub, marginTop: 6 }}>
            共 {entries.length} 项 · 开启 {onCount} 项
            {updatedAt && ` · 最近更新 ${new Date(updatedAt).toLocaleString("zh-CN")}`}
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
            <ShieldAlert size={15} /> 服务端强制说明
          </span>
        }
        style={{ marginBottom: 16, backgroundColor: THEME.warningBg, borderColor: "#fde68a" }}
      >
        <div style={{ fontSize: 13, color: THEME.textSub, lineHeight: 1.7 }}>
          开关在<b>服务端强制执行</b>：关闭「AI 功能」后，直接调用 <code>/api/ai/chat</code> 也会被拒绝；
          关闭「支付」后无法创建真实支付订单；关闭「发现/资讯」后资讯 API 返回 403。
          前端隐藏只是第一层，服务端才是最终裁决。全部修改写入审计日志，需要 SUPER_ADMIN 权限。
        </div>
      </AdminCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {entries.map(([key, item]) => {
          const meta = STATUS_META[item.status] || STATUS_META.ON;
          const enforced = (item.enforcePaths || []).length > 0;
          return (
            <div
              key={key}
              style={{
                backgroundColor: THEME.cardBg,
                borderRadius: 12,
                border: `1px solid ${item.status === "ON" ? THEME.border : meta.color + "55"}`,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain }}>{item.name}</div>
                <Badge type={meta.type}>{meta.label}</Badge>
              </div>
              <div style={{ fontSize: 12, color: THEME.textHint, marginBottom: 12 }}>
                {item.desc || key}
                {enforced && (
                  <span style={{ marginLeft: 8, color: THEME.info, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Zap size={11} /> 服务端强制
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["ON", "MAINTENANCE", "OFF"] as FeatureFlagStatus[]).map((s) => {
                  const active = item.status === s;
                  const m = STATUS_META[s];
                  return (
                    <button
                      key={s}
                      disabled={saving === key}
                      onClick={() => requestChange(key, item, s)}
                      style={{
                        flex: 1,
                        padding: "7px 0",
                        border: active ? "none" : `1px solid ${THEME.border}`,
                        borderRadius: 8,
                        backgroundColor: active ? m.color : "#fff",
                        color: active ? "#fff" : THEME.textSub,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: saving === key ? "wait" : "pointer",
                        opacity: saving === key ? 0.6 : 1,
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title="确认修改功能开关"
        message={
          confirm
            ? `即将把「${confirm.name}」从「${STATUS_META[confirm.from].label}」改为「${STATUS_META[confirm.to].label}」。此操作立即生效并写入审计日志。确定继续吗？`
            : ""
        }
        confirmText="确认修改"
        danger={confirm?.to === "OFF"}
        onConfirm={doChange}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
