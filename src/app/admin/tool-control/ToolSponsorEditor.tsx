"use client";
import { useState } from "react";
import type { ToolMatrixItem } from "@/lib/admin/client";

export default function ToolSponsorEditor({ tool, busy, onSave }: { tool: ToolMatrixItem; busy: boolean; onSave: (patch: Partial<ToolMatrixItem>) => void }) {
  const [draft, setDraft] = useState({ adEnabled: tool.adEnabled === true, adTitle: tool.adTitle || "", adImageUrl: tool.adImageUrl || "", adLinkUrl: tool.adLinkUrl || "" });
  return <fieldset style={{ margin: 0, border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
    <legend>广告位置</legend>
    <label style={{ display: "block", marginBottom: 8 }}><input type="checkbox" checked={draft.adEnabled} disabled={busy} onChange={e => setDraft({ ...draft, adEnabled: e.target.checked })} /> 启用本板块广告</label>
    <label style={{ display: "block", marginBottom: 8 }}>广告标题<input aria-label={`${tool.name}广告标题`} value={draft.adTitle} maxLength={80} disabled={busy} onChange={e => setDraft({ ...draft, adTitle: e.target.value })} style={{ display: "block", width: "100%", padding: 8 }} /></label>
    <label style={{ display: "block", marginBottom: 8 }}>图片地址（本应用HTTPS素材域名，可留空）<input aria-label={`${tool.name}广告图片`} value={draft.adImageUrl} disabled={busy} onChange={e => setDraft({ ...draft, adImageUrl: e.target.value })} style={{ display: "block", width: "100%", padding: 8 }} /></label>
    <label style={{ display: "block", marginBottom: 8 }}>点击链接（学习页或HTTPS地址，可留空）<input aria-label={`${tool.name}广告链接`} value={draft.adLinkUrl} disabled={busy} onChange={e => setDraft({ ...draft, adLinkUrl: e.target.value })} style={{ display: "block", width: "100%", padding: 8 }} /></label>
    <p style={{ fontSize: 12, color: "#666", lineHeight: 1.8 }}>客户端只显示标注“广告”的静态图文；付费有效会员不显示本广告位。素材与广告用途需核对后发布，不能填写脚本或HTML。</p>
    <button type="button" disabled={busy} onClick={() => onSave(draft)}>检查并保存广告位置</button>
  </fieldset>;
}
