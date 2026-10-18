"use client";
import { useCallback, useEffect, useState } from "react";
import { getAdminKey } from "@/lib/admin/client";
import type { Feedback, FeedbackStatus } from "@/lib/feedbackService";

const labels: Record<FeedbackStatus, string> = { pending: "待处理", processing: "处理中", resolved: "已解决", closed: "已关闭" };
type Review = Feedback & { updatedAt?: string };
async function request(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`/api/feedback/admin${path}`, { method, cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminKey() || ""}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok || !data.success) throw Error(data.error || "反馈服务暂不可用");
  return data;
}
function ReviewCard({ item, onSaved }: { item: Review; onSaved: () => void }) {
  const [status, setStatus] = useState(item.status), [reply, setReply] = useState(item.adminReply || "");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const save = async () => {
    if (!window.confirm(`将反馈“${item.title}”从${labels[item.status]}改为${labels[status]}，并保存当前回复？用户可在自己的反馈记录查看。`)) return;
    setBusy(true); setError("");
    try { await request(`/${encodeURIComponent(item.id)}`, "PUT", { status, adminReply: reply, expectedUpdatedAt: item.updatedAt || item.createdAt }); onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : "保存失败"); }
    finally { setBusy(false); }
  };
  return <article style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18, marginBottom: 14, overflowWrap: "anywhere" }}>
    <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>{item.title}</h2>
    <p style={{ color: "#64748b", fontSize: 13 }}>{item.userName} · {item.userId} · {item.type} · {new Date(item.createdAt).toLocaleString("zh-CN")}</p>
    <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{item.description}</p>
    {item.contact && <p>用户自留联系方式：{item.contact}</p>}
    <details><summary>设备与版本</summary><p>{item.deviceInfo || "未提供"} · {item.appVersion || "未提供版本"}</p></details>
    <label style={{ display: "block", marginTop: 14 }}>处理状态 <select value={status} onChange={e => setStatus(e.target.value as FeedbackStatus)} disabled={busy} style={{ padding: 8 }}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <label style={{ display: "block", marginTop: 12 }}>给用户的回复<textarea value={reply} onChange={e => setReply(e.target.value)} maxLength={2000} rows={4} disabled={busy} style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 10, marginTop: 6, border: "1px solid #cbd5e1", borderRadius: 8 }} /></label>
    {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
    <button onClick={save} disabled={busy} style={{ background: "#6d28d9", color: "white", border: 0, borderRadius: 8, padding: "10px 18px", marginTop: 10 }}>{busy ? "保存中…" : "保存处理结果"}</button>
  </article>;
}
export default function FeedbackAdminPage() {
  const [filter, setFilter] = useState("pending"), [items, setItems] = useState<Review[]>([]), [loading, setLoading] = useState(false), [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError(""); setItems([]);
    try { setItems((await request(`/queue?status=${encodeURIComponent(filter)}`)).feedbacks || []); }
    catch (e) { setError(e instanceof Error ? e.message : "读取失败"); }
    finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { void load(); }, [load]);
  return <main style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
    <h1 style={{ fontSize: 24 }}>用户反馈与广告投诉</h1>
    <p style={{ color: "#64748b", lineHeight: 1.7 }}>仅运营和客服角色可查看。每次显示所选状态最近200条；联系方式仅用于处理本条反馈。回复会显示在用户自己的反馈记录中。</p>
    <div style={{ display: "flex", gap: 10, margin: "18px 0" }}><label>筛选 <select value={filter} onChange={e => setFilter(e.target.value)} disabled={loading} style={{ padding: 8 }}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}<option value="all">全部</option></select></label><button disabled={loading} onClick={load}>刷新</button></div>
    {loading && <p>正在读取…</p>}{error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
    {!loading && !error && items.length === 0 && <p>当前筛选下没有反馈。</p>}
    {items.map(item => <ReviewCard key={item.id + (item.updatedAt || item.createdAt)} item={item} onSaved={load} />)}
  </main>;
}
