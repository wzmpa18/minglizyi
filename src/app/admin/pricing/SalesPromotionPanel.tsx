"use client";
import { useEffect, useState } from "react";
import { AdminCard, ConfirmDialog } from "../_shared";
import { getAdminKey } from "@/lib/admin/client";
import type { SalesPromotionConfig } from "@/lib/salesPromotion";

const labels: Record<string, string> = { MEMBERSHIP: "会员套餐", AI_PACKAGE: "AI次数包与时卡", SINGLE_UNLOCK: "单次解读与单项工具", BATCH_INTERPRET: "批量学习解读" };
const localTime = (value: string | null) => value ? new Date(Date.parse(value) - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
const isoTime = (value: string) => value ? new Date(value).toISOString() : null;

export default function SalesPromotionPanel() {
  const [saved, setSaved] = useState<SalesPromotionConfig | null>(null);
  const [draft, setDraft] = useState<SalesPromotionConfig | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { let alive = true; void fetch("/api/public/pricing/promotion", { cache: "no-store" }).then(r => r.json()).then(json => {
    if (!alive) return;
    if (!json.success) throw Error(json.error || "促销配置加载失败");
    setSaved(json.data); setDraft(json.data);
  }).catch(() => { if (alive) setMessage("促销配置加载失败，请刷新后重试"); }); return () => { alive = false; }; }, []);
  async function save() {
    if (!draft || !saved || saving) return;
    const key = getAdminKey(); if (!key) { setMessage("请先登录管理员账号"); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/public/pricing/promotion", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ expectedRevision: saved.revision, config: draft }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw Error(json.error || "保存失败");
      setSaved(json.data); setDraft(json.data); setConfirm(false); setMessage("已保存促销配置；原套餐基础价格保持不变。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败"); }
    finally { setSaving(false); }
  }
  return <AdminCard style={{ marginBottom: 18 }}>
    <h2 style={{ marginTop: 0 }}>全场促销</h2>
    <p style={{ fontSize: 13, color: "#666", lineHeight: 1.8 }}>基础价格与促销分开管理。20%优惠即八折；同一商品不重复叠加优惠。会员锁定仍在工具管理中设置，历史已付订单保持成交快照。</p>
    {draft && <div style={{ display: "grid", gap: 12 }}>
      <label><input type="checkbox" checked={draft.enabled} onChange={e => setDraft({ ...draft, enabled: e.target.checked })} /> 开启促销</label>
      <label>活动名称 <input aria-label="促销名称" value={draft.name} maxLength={60} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
      <label>优惠百分比 <input aria-label="优惠百分比" type="number" min={1} max={90} step={1} value={draft.discountPercent} onChange={e => setDraft({ ...draft, discountPercent: Number(e.target.value) })} /> %</label>
      <label>开始时间（当地时间，可留空）<input aria-label="促销开始时间" type="datetime-local" value={localTime(draft.startsAt)} onChange={e => setDraft({ ...draft, startsAt: isoTime(e.target.value) })} /></label>
      <label>结束时间（当地时间，留空则手动关闭）<input aria-label="促销结束时间" type="datetime-local" value={localTime(draft.endsAt)} onChange={e => setDraft({ ...draft, endsAt: isoTime(e.target.value) })} /></label>
      <fieldset><legend>参与商品</legend>{Object.entries(labels).map(([type, name]) => <label key={type} style={{ display: "block", margin: "7px 0" }}><input type="checkbox" checked={draft.productTypes.includes(type)} onChange={e => setDraft({ ...draft, productTypes: e.target.checked ? [...draft.productTypes, type] : draft.productTypes.filter(x => x !== type) })} /> {name}</label>)}</fieldset>
      <button type="button" disabled={saving} onClick={() => setConfirm(true)}>检查并保存促销</button>
    </div>}
    {message && <p role="status">{message}</p>}
    <ConfirmDialog open={confirm} title="确认调整全场促销" confirmText={saving ? "保存中…" : "确认保存"} onCancel={() => { if (!saving) setConfirm(false); }} onConfirm={save} message={draft ? `促销：${draft.name}\n${draft.enabled ? "开启" : "关闭"}，优惠${draft.discountPercent}%\n适用：${draft.productTypes.map(x => labels[x]).join("、")}\n只影响新订单；基础价格不改，历史订单不改。苹果购买金额还须与App Store商品价格同步，后台折扣不能代替苹果定价。` : ""} />
  </AdminCard>;
}
