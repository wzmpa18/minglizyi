"use client";

// ============================================================================
// 言道国学 - 公告管理（首页永久公告栏后台维护）
// v25.0.47_19：官方公告发布
//   · 公告增删改查（标题/内容/级别/置顶/定时发布/过期/跳转链接）
//   · 首页公告栏为永久功能：未登录可见，保证长期未登录用户能收到升级/维护通知
//   · 置顶优先展示；支持 普通通知/重要/紧急 三级
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Bell, Plus, Pencil, Trash2, RefreshCw, Pin, PinOff, Lock } from "lucide-react";
import { THEME, styles, AdminCard, StatCard, Badge, LoadingSpinner, useMounted, useToast, ConfirmDialog } from "../_shared";
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/admin/client";
import type { AnnouncementAdminItem, AnnouncementLevel } from "@/lib/admin/types";

const LEVEL_LABELS: Record<AnnouncementLevel, { label: string; badge: "info" | "warning" | "error" }> = {
  info: { label: "普通通知", badge: "info" },
  important: { label: "重要公告", badge: "warning" },
  urgent: { label: "紧急公告", badge: "error" },
};

interface FormState {
  title: string;
  content: string;
  level: AnnouncementLevel;
  pinned: boolean;
  published: boolean;
  publishAt: string;
  expiresAt: string;
  link: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  content: "",
  level: "info",
  pinned: false,
  published: true,
  publishAt: new Date().toISOString().slice(0, 16),
  expiresAt: "",
  link: "",
};

function toFormState(item: AnnouncementAdminItem): FormState {
  return {
    title: item.title,
    content: item.content,
    level: item.level,
    pinned: item.pinned,
    published: item.published,
    publishAt: item.publishAt.slice(0, 16),
    expiresAt: item.expiresAt ? item.expiresAt.slice(0, 16) : "",
    link: item.link || "",
  };
}

function statusOf(item: AnnouncementAdminItem): { label: string; badge: "success" | "warning" | "error" } {
  const now = Date.now();
  if (item.published === false) return { label: "未发布", badge: "warning" };
  if (item.publishAt && new Date(item.publishAt).getTime() > now) return { label: "定时待发", badge: "warning" };
  if (item.expiresAt && new Date(item.expiresAt).getTime() <= now) return { label: "已过期", badge: "error" };
  return { label: "生效中", badge: "success" };
}

function formatDateTime(iso: string): string {
  return iso ? iso.replace("T", " ").slice(0, 16) : "";
}

export default function AdminAnnouncementsPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [items, setItems] = useState<AnnouncementAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState<AnnouncementAdminItem | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fetchAnnouncements();
    if (data) {
      setItems(data);
    } else {
      show("公告列表加载失败，请检查后端服务与密钥", "error");
    }
    setLoading(false);
  }, [show]);

  useEffect(() => {
    if (mounted) void refresh();
  }, [mounted, refresh]);

  if (!mounted || loading) {
    return <LoadingSpinner text="正在加载公告数据..." />;
  }

  const activeCount = items.filter(i => statusOf(i).label === "生效中").length;
  const pinnedCount = items.filter(i => i.pinned).length;

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: AnnouncementAdminItem) => {
    setEditingId(item.id);
    setForm(toFormState(item));
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      show("标题和内容均为必填", "error");
      return;
    }
    if (form.link && !/^https?:\/\//.test(form.link.trim())) {
      show("跳转链接必须以 http(s):// 开头", "error");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      level: form.level,
      pinned: form.pinned,
      published: form.published,
      publishAt: new Date(form.publishAt).toISOString(),
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      link: form.link.trim() || null,
    };
    const res = editingId
      ? await updateAnnouncement(editingId, payload)
      : await createAnnouncement(payload);
    setSaving(false);
    if (res.ok) {
      show(editingId ? "公告更新成功" : "公告发布成功", "success");
      setFormOpen(false);
      void refresh();
    } else {
      show(res.error || "保存失败", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await deleteAnnouncement(deleteTarget.id);
    if (res.ok) {
      show(`已删除公告：${deleteTarget.title.slice(0, 20)}`, "success");
      void refresh();
    } else {
      show(res.error || "删除失败", "error");
    }
    setDeleteTarget(null);
  };

  const inputStyle = { ...styles.input, fontSize: 13 };
  const textareaStyle = { ...styles.input, fontSize: 13, minHeight: 96, resize: "vertical" as const };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: THEME.textMain, margin: 0 }}>公告管理</h1>
          <Badge type="info">首页永久公告栏</Badge>
        </div>
        <p style={{ fontSize: 13, color: THEME.textSub, margin: 0 }}>
          官方公告发布：升级通知 / 维护公告 / 活动通知。首页公告栏<b style={{ color: THEME.error }}>永久展示（未登录可见）</b>，确保长期未登录用户也能获知版本升级信息。
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatCard label="公告总数" value={items.length} sub="全部记录（含未发布）" icon={<Bell size={18} />} />
        <StatCard label="生效中" value={activeCount} sub="首页正在展示" icon={<Bell size={18} />} color={THEME.success} />
        <StatCard label="置顶" value={pinnedCount} sub="首页优先展示" icon={<Pin size={18} />} color={THEME.warning} />
      </div>

      {/* 永久功能提示 */}
      <AdminCard title="永久功能说明" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Lock size={18} color={THEME.error} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: THEME.textSub, lineHeight: 1.8 }}>
            <div>· 首页公告栏为<b style={{ color: THEME.error }}>永久功能</b>：项目方明确要求任何版本迭代均不得移除该入口。</div>
            <div>· 用途：版本升级通知、维护公告——即使 APP 版本过旧、用户长期未登录，打开首页即可看到最新公告。</div>
            <div>· 展示规则：置顶优先 → 发布时间倒序；「未发布」与「已过期」的公告不会在前端显示。</div>
            <div>· 公告内容不含合规拦截词表（公告为官方通知性质），但仍请避免绝对化用语。</div>
          </div>
        </div>
      </AdminCard>

      {/* 公告列表 */}
      <AdminCard
        title={`公告列表（${items.length} 条）`}
        extra={
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...styles.btnSecondary, display: "flex", alignItems: "center", gap: 4 }} onClick={() => void refresh()}>
              <RefreshCw size={13} /> 刷新
            </button>
            <button style={{ ...styles.btnPrimary, display: "flex", alignItems: "center", gap: 4 }} onClick={openCreate}>
              <Plus size={13} /> 发布公告
            </button>
          </div>
        }
      >
        {items.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: THEME.textHint, fontSize: 13 }}>
            暂无公告 — 点击右上角「发布公告」发布第一条官方公告
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(item => {
              const st = statusOf(item);
              const lv = LEVEL_LABELS[item.level];
              return (
                <div
                  key={item.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: `1px solid ${item.pinned ? THEME.warning : THEME.border}`,
                    backgroundColor: item.pinned ? "#FFFDF5" : "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <Badge type={st.badge}>{st.label}</Badge>
                        <Badge type={lv.badge}>{lv.label}</Badge>
                        {item.pinned && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 6, backgroundColor: THEME.warningBg, color: THEME.warning, fontSize: 11, fontWeight: 700 }}>
                            <Pin size={10} /> 置顶
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: THEME.textHint }}>{formatDateTime(item.publishAt)}</span>
                        {item.expiresAt && <span style={{ fontSize: 11, color: THEME.textHint }}>至 {formatDateTime(item.expiresAt)}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: THEME.textMain, fontWeight: 600, lineHeight: 1.5 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: THEME.textSub, lineHeight: 1.6, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {item.content}
                      </div>
                      {item.link && (
                        <div style={{ fontSize: 11, color: THEME.primary, marginTop: 4, wordBreak: "break-all" }}>
                          跳转：{item.link}
                        </div>
                      )}
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
              );
            })}
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
              maxWidth: 560,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 17, fontWeight: 800, color: THEME.textMain, margin: "0 0 16px" }}>
              {editingId ? "编辑公告" : "发布公告"}
            </h2>

            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>标题（2-60字，必填）</label>
              <input
                style={inputStyle}
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                maxLength={60}
                placeholder="如：APP v25.0.50 版本升级通知"
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>内容（2-2000字，必填）</label>
              <textarea
                style={textareaStyle}
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                maxLength={2000}
                placeholder="公告正文：升级内容 / 维护时间 / 注意事项等"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={styles.label}>级别</label>
                <select
                  style={inputStyle}
                  value={form.level}
                  onChange={e => setForm({ ...form, level: e.target.value as AnnouncementLevel })}
                >
                  <option value="info">普通通知</option>
                  <option value="important">重要公告</option>
                  <option value="urgent">紧急公告</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>发布时间（支持定时）</label>
                <input
                  type="datetime-local"
                  style={inputStyle}
                  value={form.publishAt}
                  onChange={e => setForm({ ...form, publishAt: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>过期时间（留空 = 永不过期）</label>
              <input
                type="datetime-local"
                style={inputStyle}
                value={form.expiresAt}
                onChange={e => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>跳转链接（选填，如升级引导页）</label>
              <input
                style={inputStyle}
                value={form.link}
                onChange={e => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: THEME.textMain, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={e => setForm({ ...form, pinned: e.target.checked })}
                />
                置顶展示（优先于其他公告）
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: THEME.textMain, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={e => setForm({ ...form, published: e.target.checked })}
                />
                立即发布（取消勾选 = 存为草稿）
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button style={styles.btnSecondary} onClick={() => setFormOpen(false)}>
                取消
              </button>
              <button style={{ ...styles.btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={() => void handleSave()} disabled={saving}>
                {saving ? "保存中..." : editingId ? "保存修改" : "发布公告"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除公告"
        message={`确定删除「${deleteTarget?.title.slice(0, 30) || ""}」吗？删除后首页立即不再展示，不可恢复。`}
        confirmText="确认删除"
        danger
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      {toastNode}
    </div>
  );
}
