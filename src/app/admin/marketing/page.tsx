"use client";

// ============================================================================
// 言道国学 - 营销/海报管理中心（FINAL-ADMIN-COMMERCIAL-SEAL-02 第二十六章）
// 海报模板文案：主标题/副标题/卖点/CTA/合规声明/下载链接 —— 修改立即生效
// 分享渠道：微信好友/朋友圈/QQ/微博/小红书等开关与文案
// 数据源：GET/PUT /api/admin/poster-config/poster/config
//        GET/PUT /api/admin/share-config/share/config
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Megaphone, RefreshCw, Save, Share2 } from "lucide-react";
import {
  THEME,
  AdminCard,
  ConfirmDialog,
  LoadingSpinner,
  ToggleSwitch,
  useMounted,
  useToast,
} from "../_shared";
import {
  fetchPosterConfig,
  fetchShareConfig,
  savePosterConfig,
  saveShareConfig,
} from "@/lib/admin/client";

interface ShareChannel {
  enabled: boolean;
  sort?: number;
  label?: string;
}

export default function MarketingPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [poster, setPoster] = useState<Record<string, any> | null>(null);
  const [share, setShare] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"poster" | "share" | null>(null);
  const [confirm, setConfirm] = useState<"poster" | "share" | null>(null);

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([fetchPosterConfig(), fetchShareConfig()]);
    if (p) setPoster(p);
    if (s) setShare(s);
    if (!p && !s) show("营销配置加载失败，请检查权限", "error");
    setLoading(false);
  }, [show]);

  useEffect(() => {
    if (!mounted) return;
    load();
  }, [mounted, load]);

  const setPosterField = (field: string, value: unknown) => {
    setPoster((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const doSave = async () => {
    if (!confirm) return;
    setSaving(confirm);
    try {
      if (confirm === "poster" && poster) {
        const res = await savePosterConfig(poster);
        if (res.ok) show("海报配置已保存，立即生效", "success");
        else show(res.error || "保存失败", "error");
      } else if (confirm === "share" && share) {
        const res = await saveShareConfig(share);
        if (res.ok) show("分享配置已保存，立即生效", "success");
        else show(res.error || "保存失败", "error");
      }
    } finally {
      setSaving(null);
      setConfirm(null);
    }
  };

  if (!mounted || loading) {
    return <LoadingSpinner text="正在加载营销配置..." />;
  }

  const channels = (share?.channels || {}) as Record<string, ShareChannel>;

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
            <Megaphone size={24} style={{ color: THEME.primary }} /> 营销 / 海报
          </h1>
          <div style={{ fontSize: 13, color: THEME.textSub, marginTop: 6 }}>
            海报文案与分享渠道统一管理 · 修改保存后立即生效，无需发版
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

      {/* ===== 海报文案配置 ===== */}
      {poster && (
        <AdminCard
          title={
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Megaphone size={15} /> 海报模板文案
            </span>
          }
          style={{ marginBottom: 16 }}
          extra={
            <button
              onClick={() => setConfirm("poster")}
              disabled={saving === "poster"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                border: "none",
                borderRadius: 8,
                backgroundColor: THEME.primary,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                opacity: saving === "poster" ? 0.6 : 1,
              }}
            >
              <Save size={14} /> {saving === "poster" ? "保存中..." : "保存海报配置"}
            </button>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
            <Field label="主标题（当前）" rows={2}>
              <textarea
                value={(poster.titles || [])[poster.currentTitleIndex || 0] || ""}
                onChange={(e) => {
                  const idx = poster.currentTitleIndex || 0;
                  const titles = [...(poster.titles || [])];
                  titles[idx] = e.target.value;
                  setPosterField("titles", titles);
                }}
                style={textareaStyle}
              />
            </Field>
            <Field label="副标题">
              <input
                value={poster.subtitle || ""}
                onChange={(e) => setPosterField("subtitle", e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="行动按钮文案（CTA）">
              <input
                value={poster.callToAction || ""}
                onChange={(e) => setPosterField("callToAction", e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="iOS 提示文案">
              <input
                value={poster.iosText || ""}
                onChange={(e) => setPosterField("iosText", e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="新人权益文案">
              <textarea
                value={poster.benefits || ""}
                onChange={(e) => setPosterField("benefits", e.target.value)}
                style={textareaStyle}
              />
            </Field>
            <Field label="官方徽标文案">
              <input
                value={poster.officialBadge || ""}
                onChange={(e) => setPosterField("officialBadge", e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="合规免责声明">
              <textarea
                value={poster.complianceText || ""}
                onChange={(e) => setPosterField("complianceText", e.target.value)}
                style={textareaStyle}
              />
            </Field>
            <Field label="品牌主体">
              <input
                value={poster.brandEntity || ""}
                onChange={(e) => setPosterField("brandEntity", e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Android 下载链接">
              <input
                value={poster.downloadUrls?.android || ""}
                onChange={(e) =>
                  setPosterField("downloadUrls", {
                    ...(poster.downloadUrls || {}),
                    android: e.target.value,
                  })
                }
                style={inputStyle}
              />
            </Field>
          </div>
        </AdminCard>
      )}

      {/* ===== 分享渠道配置 ===== */}
      {share && (
        <AdminCard
          title={
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Share2 size={15} /> 分享渠道与文案
            </span>
          }
          extra={
            <button
              onClick={() => setConfirm("share")}
              disabled={saving === "share"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                border: "none",
                borderRadius: 8,
                backgroundColor: THEME.primary,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                opacity: saving === "share" ? 0.6 : 1,
              }}
            >
              <Save size={14} /> {saving === "share" ? "保存中..." : "保存分享配置"}
            </button>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 16 }}>
            {Object.entries(channels).map(([key, ch]) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  backgroundColor: THEME.primaryBgLight,
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                }}
              >
                <span style={{ fontSize: 13, color: THEME.textMain, fontWeight: 600 }}>
                  {ch.label || key}
                </span>
                <ToggleSwitch
                  checked={ch.enabled !== false}
                  size="sm"
                  onChange={(v) =>
                    setShare((prev) =>
                      prev
                        ? {
                            ...prev,
                            channels: {
                              ...prev.channels,
                              [key]: { ...ch, enabled: v },
                            },
                          }
                        : prev
                    )
                  }
                />
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
            <Field label="默认分享文案">
              <textarea
                value={(share.texts as any)?.default || ""}
                onChange={(e) =>
                  setShare((prev) =>
                    prev
                      ? { ...prev, texts: { ...(prev.texts as object), default: e.target.value } }
                      : prev
                  )
                }
                style={textareaStyle}
              />
            </Field>
            <Field label="备选分享文案">
              <textarea
                value={(share.texts as any)?.alternative || ""}
                onChange={(e) =>
                  setShare((prev) =>
                    prev
                      ? { ...prev, texts: { ...(prev.texts as object), alternative: e.target.value } }
                      : prev
                  )
                }
                style={textareaStyle}
              />
            </Field>
          </div>
        </AdminCard>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="确认保存营销配置"
        message={
          confirm === "poster"
            ? "将保存海报模板文案修改，保存后立即对全部用户生效（分享海报实时读取最新文案）。确定继续吗？"
            : "将保存分享渠道与文案修改，保存后立即生效。确定继续吗？"
        }
        confirmText="确认保存"
        onConfirm={doSave}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function Field({
  label,
  rows,
  children,
}: {
  label: string;
  rows?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: THEME.textSub, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: `1px solid ${THEME.border}`,
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box" as const,
  color: THEME.textMain,
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 64,
  resize: "vertical" as const,
  fontFamily: "inherit",
};
