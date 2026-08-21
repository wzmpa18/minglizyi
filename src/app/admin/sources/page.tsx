"use client";

// ============================================================================
// 言道国学 - 内容源管理（行业资讯后台维护）
// FINAL-CLEAN-RC-01：发现页「行业资讯」恢复 + 后台可维护
//   · 资讯增删改查（标题/摘要/来源/原文链接/分类/发布时间）
//   · 保存走后端合规门禁（绝对化用语/营销词拦截）
//   · 一键恢复默认资讯库
//   · 合规红线：每条资讯必须标注来源，仅展示标题+摘要+原文链接
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Newspaper, Plus, Pencil, Trash2, RotateCcw, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { THEME, styles, AdminCard, StatCard, Badge, LoadingSpinner, useMounted, useToast, ConfirmDialog } from "../_shared";
import {
  fetchNewsItems,
  createNewsItem,
  updateNewsItem,
  deleteNewsItem,
  resetNewsItems,
} from "@/lib/admin/client";
import type { NewsAdminItem, NewsAdminCategory } from "@/lib/admin/types";

const CATEGORY_LABELS: Record<NewsAdminCategory, string> = {
  zhongyi: "中医养生",
  yixue: "易学文化",
};

const COMPLIANCE_TERMS = [
  "全网第一", "100%准确", "根治", "分享赚钱", "加微信", "限时抢购", "代购带货", "招商加盟",
];

interface FormState {
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  category: NewsAdminCategory;
}

const EMPTY_FORM: FormState = {
  title: "",
  summary: "",
  source: "",
  sourceUrl: "",
  publishedAt: new Date().toISOString().slice(0, 16),
  category: "zhongyi",
};

function toFormState(item: NewsAdminItem): FormState {
  return {
    title: item.title,
    summary: item.summary,
    source: item.source,
    sourceUrl: item.sourceUrl,
    publishedAt: item.publishedAt.slice(0, 16),
    category: item.category,
  };
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export default function AdminSourcesPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [items, setItems] = useState<NewsAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<"all" | NewsAdminCategory>("all");

  // 表单状态（editingId 为空 = 新增模式）
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // 删除/恢复确认
  const [deleteTarget, setDeleteTarget] = useState<NewsAdminItem | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fetchNewsItems();
    if (data) {
      setItems(data.items);
    } else {
      show("资讯列表加载失败，请检查后端服务与密钥", "error");
    }
    setLoading(false);
  }, [show]);

  useEffect(() => {
    if (mounted) void refresh();
  }, [mounted, refresh]);

  if (!mounted || loading) {
    return <LoadingSpinner text="正在加载内容源数据..." />;
  }

  const zhongyiCount = items.filter(i => i.category === "zhongyi").length;
  const yixueCount = items.filter(i => i.category === "yixue").length;
  const filtered = categoryFilter === "all" ? items : items.filter(i => i.category === categoryFilter);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: NewsAdminItem) => {
    setEditingId(item.id);
    setForm(toFormState(item));
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.source.trim() || !form.sourceUrl.trim()) {
      show("标题、来源、原文链接均为必填", "error");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      source: form.source.trim(),
      sourceUrl: form.sourceUrl.trim(),
      publishedAt: new Date(form.publishedAt).toISOString(),
      category: form.category,
    };
    const res = editingId
      ? await updateNewsItem(editingId, payload)
      : await createNewsItem(payload);
    setSaving(false);
    if (res.ok) {
      show(editingId ? "资讯更新成功" : "资讯新增成功", "success");
      setFormOpen(false);
      void refresh();
    } else {
      show(res.error || "保存失败", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await deleteNewsItem(deleteTarget.id);
    if (res.ok) {
      show(`已删除：${deleteTarget.title.slice(0, 20)}...`, "success");
      void refresh();
    } else {
      show(res.error || "删除失败", "error");
    }
    setDeleteTarget(null);
  };

  const handleReset = async () => {
    const res = await resetNewsItems();
    if (res.ok) {
      show("已恢复默认资讯库（16条）", "success");
      void refresh();
    } else {
      show(res.error || "恢复失败", "error");
    }
    setResetConfirm(false);
  };

  const inputStyle = { ...styles.input, fontSize: 13 };
  const textareaStyle = { ...styles.input, fontSize: 13, minHeight: 64, resize: "vertical" as const };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: THEME.textMain, margin: 0 }}>内容源管理</h1>
          <Badge type="info">发现页 · 行业资讯</Badge>
        </div>
        <p style={{ fontSize: 13, color: THEME.textSub, margin: 0 }}>
          行业资讯内容源后台维护：新增 / 编辑 / 删除 / 恢复默认。保存时后端自动执行合规门禁。
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatCard label="资讯总数" value={items.length} sub="发现页行业资讯" icon={<Newspaper size={18} />} />
        <StatCard label="中医养生" value={zhongyiCount} sub="分类：zhongyi" icon={<Newspaper size={18} />} color={THEME.success} />
        <StatCard label="易学文化" value={yixueCount} sub="分类：yixue" icon={<Newspaper size={18} />} color={THEME.primary} />
      </div>

      {/* 合规提示 */}
      <AdminCard title="合规说明" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <ShieldCheck size={18} color={THEME.success} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: THEME.textSub, lineHeight: 1.8 }}>
            <div>· 合规红线：每条资讯<b style={{ color: THEME.error }}>必须标注来源</b>，前端仅展示标题 + 摘要 + 来源 + 原文链接，不做全文转载。</div>
            <div>· 保存时后端自动拦截以下违规词（标题/摘要/来源全字段校验）：</div>
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {COMPLIANCE_TERMS.map(t => (
                <span key={t} style={{ padding: "2px 8px", borderRadius: 6, backgroundColor: THEME.errorBg, color: THEME.error, fontSize: 11, fontWeight: 600 }}>
                  {t}
                </span>
              ))}
              <span style={{ padding: "2px 8px", borderRadius: 6, backgroundColor: THEME.errorBg, color: THEME.error, fontSize: 11, fontWeight: 600 }}>…等</span>
            </div>
          </div>
        </div>
      </AdminCard>

      {/* 资讯列表 */}
      <AdminCard
        title={`资讯列表（${filtered.length} / ${items.length} 条）`}
        extra={
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...styles.btnSecondary, display: "flex", alignItems: "center", gap: 4 }} onClick={() => void refresh()}>
              <RefreshCw size={13} /> 刷新
            </button>
            <button
              style={{ ...styles.btnSecondary, display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => setResetConfirm(true)}
            >
              <RotateCcw size={13} /> 恢复默认
            </button>
            <button style={{ ...styles.btnPrimary, display: "flex", alignItems: "center", gap: 4 }} onClick={openCreate}>
              <Plus size={13} /> 新增资讯
            </button>
          </div>
        }
      >
        {/* 分类过滤 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          {(["all", "zhongyi", "yixue"] as const).map(c => {
            const active = categoryFilter === c;
            return (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
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
                {c === "all" ? "全部分类" : CATEGORY_LABELS[c]}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: THEME.textHint, fontSize: 13 }}>
            暂无资讯 — 点击右上角「新增资讯」或「恢复默认」
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(item => (
              <div
                key={item.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  backgroundColor: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <Badge type={item.category === "zhongyi" ? "success" : "info"}>
                        {CATEGORY_LABELS[item.category]}
                      </Badge>
                      <span style={{ fontSize: 11, color: THEME.textHint }}>{formatDate(item.publishedAt)}</span>
                      <span style={{ fontSize: 11, color: THEME.textHint, fontFamily: "monospace" }}>{item.id}</span>
                    </div>
                    <div style={{ fontSize: 13, color: THEME.textMain, fontWeight: 600, lineHeight: 1.5 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: THEME.textSub, lineHeight: 1.6, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {item.summary}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, fontSize: 11, color: THEME.textHint }}>
                      <span>来源：{item.source}</span>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: THEME.primary, display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none" }}
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink size={11} /> 原文链接
                      </a>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      style={{ ...styles.btnSecondary, padding: "4px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}
                      onClick={() => openEdit(item)}
                    >
                      <Pencil size={12} /> 编辑
                    </button>
                    <button
                      style={{ ...styles.btnDanger, display: "flex", alignItems: "center", gap: 3 }}
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 size={12} /> 删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {/* 新增/编辑表单 */}
      {formOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 20,
          }}
          onClick={() => setFormOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 24,
              maxWidth: 520,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 17, fontWeight: 800, color: THEME.textMain, margin: "0 0 16px" }}>
              {editingId ? "编辑资讯" : "新增资讯"}
            </h2>

            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>标题（4-80字，必填）</label>
              <input
                style={inputStyle}
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                maxLength={80}
                placeholder="资讯标题"
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>摘要（10-300字，必填）</label>
              <textarea
                style={textareaStyle}
                value={form.summary}
                onChange={e => setForm({ ...form, summary: e.target.value })}
                maxLength={300}
                placeholder="资讯摘要（仅展示摘要，不转载全文）"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={styles.label}>来源（必填，合规红线）</label>
                <input
                  style={inputStyle}
                  value={form.source}
                  onChange={e => setForm({ ...form, source: e.target.value })}
                  placeholder="如：中国中医药报"
                />
              </div>
              <div>
                <label style={styles.label}>分类</label>
                <select
                  style={inputStyle}
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value as NewsAdminCategory })}
                >
                  <option value="zhongyi">中医养生</option>
                  <option value="yixue">易学文化</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>原文链接（http/https，必填）</label>
              <input
                style={inputStyle}
                value={form.sourceUrl}
                onChange={e => setForm({ ...form, sourceUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={styles.label}>发布时间</label>
              <input
                type="datetime-local"
                style={inputStyle}
                value={form.publishedAt}
                onChange={e => setForm({ ...form, publishedAt: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button style={styles.btnSecondary} onClick={() => setFormOpen(false)}>
                取消
              </button>
              <button style={{ ...styles.btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={() => void handleSave()} disabled={saving}>
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除资讯"
        message={`确定删除「${deleteTarget?.title.slice(0, 30) || ""}...」吗？删除后前端立即不可见，不可恢复（可重新录入）。`}
        confirmText="确认删除"
        danger
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 恢复默认确认 */}
      <ConfirmDialog
        open={resetConfirm}
        title="恢复默认资讯库"
        message="将清空当前全部资讯，恢复为系统默认的16条资讯。此操作不可撤销，确定继续吗？"
        confirmText="确认恢复"
        danger
        onConfirm={() => void handleReset()}
        onCancel={() => setResetConfirm(false)}
      />

      {toastNode}
    </div>
  );
}
