"use client";

// ============================================================================
// 来源注册库管理（P6-TOOL-04-补02 §2.1/§3/验收1、5）
// 三条原则：开发隔离 + 来源可溯 + 分级标注。所有第三方资源强制登记；
// 支持一键下架/恢复/争议标记（全程审计留痕 + 告警），可导出完整清单。
// ============================================================================

import { useEffect, useState } from "react";
import { ShieldCheck, Download, Plus, Ban, RotateCcw, AlertTriangle } from "lucide-react";
import { THEME, styles, AdminCard, Badge, LoadingSpinner, useMounted, useToast } from "../_shared";
import {
  listSources,
  listSourceAudit,
  upsertSource,
  takedownSource,
  restoreSource,
  disputeSource,
  exportSourcesCsv,
  runSourceIntegrityCheck,
  LICENSE_LABELS,
  type SourceRecord,
  type SourceLicense,
} from "@/lib/sourceRegistry";

const EMPTY_FORM = {
  sourceId: "",
  name: "",
  license: "MIT" as SourceLicense,
  version: "",
  commercialUse: true,
  url: "",
  scope: "",
  importedBy: "platform",
  note: "",
};

export default function AdminSourcesPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [auditList, setAuditList] = useState<ReturnType<typeof listSourceAudit>>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showForm, setShowForm] = useState(false);
  const [checkResult, setCheckResult] = useState<string>("");

  const refresh = () => {
    setSources(listSources());
    setAuditList(listSourceAudit());
  };

  useEffect(() => {
    if (mounted) refresh();
  }, [mounted]);

  if (!mounted) return <LoadingSpinner text="正在加载来源注册库..." />;

  const downloadCsv = () => {
    const blob = new Blob([exportSourcesCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `第三方资源清单_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    show("清单已导出（含来源/许可证/版本/商用权限）", "success");
  };

  const handleSave = () => {
    const res = upsertSource({ ...form, importedAt: new Date().toISOString(), status: "active" });
    show(res.message, res.success ? "success" : "error");
    if (res.success) {
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      refresh();
    }
  };

  const runCheck = () => {
    const r = runSourceIntegrityCheck();
    setCheckResult(r.passed ? "✅ 完整性自检通过：无孤儿数据、许可证全部合规、状态合法" : `⚠️ 发现 ${r.issues.length} 项问题：\n` + r.issues.join("\n"));
    show(r.passed ? "完整性自检通过" : `自检发现 ${r.issues.length} 项问题`, r.passed ? "success" : "error");
  };

  const statusBadge = (s: SourceRecord) =>
    s.status === "active" ? <Badge type="success">在用</Badge>
      : s.status === "suspended" ? <Badge type="warning">已下架</Badge>
      : <Badge type="error">争议中</Badge>;

  return (
    <div>
      {toastNode}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: THEME.textMain, margin: 0 }}>来源注册库</h1>
          <Badge type="primary">净室合规</Badge>
          <Badge type="info">P6-TOOL-04-补02</Badge>
        </div>
        <p style={{ fontSize: 13, color: THEME.textSub, margin: 0 }}>
          开发隔离 · 来源可溯 · 分级标注：第三方引擎/数据/素材全量登记，许可证限 PublicDomain / MIT / CC0 / CC BY / 书面授权五类，支持一键下架与争议处置
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={{ ...styles.btnPrimary, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} /> {showForm ? "收起表单" : "登记新来源"}
        </button>
        <button style={{ ...styles.btnSecondary, display: "flex", alignItems: "center", gap: 6 }} onClick={downloadCsv}>
          <Download size={14} /> 导出完整清单
        </button>
        <button style={{ ...styles.btnSecondary, display: "flex", alignItems: "center", gap: 6 }} onClick={runCheck}>
          <ShieldCheck size={14} /> 完整性自检
        </button>
      </div>

      {checkResult && (
        <div style={{ padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 12, whiteSpace: "pre-wrap", lineHeight: 1.8, backgroundColor: checkResult.startsWith("✅") ? THEME.primaryBg : "#fff7ed", color: checkResult.startsWith("✅") ? THEME.primary : "#9a3412", border: `1px solid ${THEME.border}` }}>
          {checkResult}
        </div>
      )}

      {showForm && (
        <AdminCard title="登记/更新来源记录" style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div>
              <label style={styles.label}>source_id（唯一标识）</label>
              <input style={styles.input} value={form.sourceId} placeholder="如 SRC-XXX-YYY" onChange={(e) => setForm({ ...form, sourceId: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>来源名称</label>
              <input style={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>许可证类型</label>
              <select style={styles.input} value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value as SourceLicense })}>
                {(Object.keys(LICENSE_LABELS) as SourceLicense[]).map((k) => (
                  <option key={k} value={k}>{LICENSE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={styles.label}>版本号</label>
              <input style={styles.input} value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>商用权限</label>
              <select style={styles.input} value={form.commercialUse ? "1" : "0"} onChange={(e) => setForm({ ...form, commercialUse: e.target.value === "1" })}>
                <option value="1">允许商用</option>
                <option value="0">禁止商用（禁止上线）</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>原始地址</label>
              <input style={styles.input} value={form.url} placeholder="https:// 或 -" onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>使用范围/模块</label>
              <input style={styles.input} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>导入人</label>
              <input style={styles.input} value={form.importedBy} onChange={(e) => setForm({ ...form, importedBy: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={styles.label}>备注（授权类素材须注明书面授权情况）</label>
            <input style={styles.input} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button style={styles.btnPrimary} onClick={handleSave}>保存登记</button>
          </div>
        </AdminCard>
      )}

      <AdminCard title={`第三方资源清单（${sources.length} 条 · MIT/CC BY ${sources.filter((s) => s.license === "MIT" || s.license === "CC-BY-4.0").length} 条需前端署名）`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.border}`, textAlign: "left" }}>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>source_id</th>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>名称</th>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>许可证</th>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>版本</th>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>商用</th>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>使用范围</th>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>状态</th>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.sourceId} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace", color: THEME.textSub }}>{s.sourceId}</td>
                  <td style={{ padding: "8px 10px", color: THEME.textMain, fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: "8px 10px" }}><Badge type={s.license === "PublicDomain" ? "info" : s.license === "Authorized" ? "warning" : "primary"}>{LICENSE_LABELS[s.license]}</Badge></td>
                  <td style={{ padding: "8px 10px", color: THEME.textSub }}>{s.version}</td>
                  <td style={{ padding: "8px 10px" }}>{s.commercialUse ? "✅" : "❌"}</td>
                  <td style={{ padding: "8px 10px", color: THEME.textSub, maxWidth: 220 }}>{s.scope}</td>
                  <td style={{ padding: "8px 10px" }}>{statusBadge(s)}</td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                    {s.status === "active" ? (
                      <>
                        <button
                          title="一键下架（冻结关联内容，溯源保留举证）"
                          style={{ ...styles.btnSecondary, padding: "4px 8px", fontSize: 11, marginRight: 6, color: "#b91c1c", borderColor: "#fca5a5" }}
                          onClick={() => {
                            const reason = window.prompt(`下架 ${s.name} 的原因（将记入审计并触发告警）：`);
                            if (reason === null) return;
                            const res = takedownSource(s.sourceId, reason || "未注明");
                            show(res.message, res.success ? "success" : "error");
                            refresh();
                          }}
                        ><Ban size={12} /> 下架</button>
                        <button
                          title="标记争议（投诉处理中）"
                          style={{ ...styles.btnSecondary, padding: "4px 8px", fontSize: 11, color: "#b45309", borderColor: "#fcd34d" }}
                          onClick={() => {
                            const detail = window.prompt(`争议详情（如投诉方/诉求）：`);
                            if (detail === null) return;
                            const res = disputeSource(s.sourceId, detail || "未注明");
                            show(res.message, res.success ? "success" : "error");
                            refresh();
                          }}
                        ><AlertTriangle size={12} /> 争议</button>
                      </>
                    ) : (
                      <button
                        title="恢复上架"
                        style={{ ...styles.btnSecondary, padding: "4px 8px", fontSize: 11 }}
                        onClick={() => {
                          const res = restoreSource(s.sourceId);
                          show(res.message, res.success ? "success" : "error");
                          refresh();
                        }}
                      ><RotateCcw size={12} /> 恢复</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard title={`处置与登记审计（${auditList.length} 条）`} style={{ marginTop: 16 }}>
        <div style={{ overflowX: "auto", maxHeight: 280, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ position: "sticky", top: 0, background: "#fff" }}>
              <tr style={{ borderBottom: `2px solid ${THEME.border}`, textAlign: "left" }}>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>时间</th>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>动作</th>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>source_id</th>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>明细</th>
              </tr>
            </thead>
            <tbody>
              {auditList.slice(0, 100).map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                  <td style={{ padding: "8px 10px", color: THEME.textSub, whiteSpace: "nowrap" }}>{a.createdAt.slice(0, 19).replace("T", " ")}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <Badge type={a.action === "takedown" || a.action === "dispute" ? "warning" : "info"}>
                      {{ create: "登记", update: "更新", takedown: "下架", restore: "恢复", dispute: "争议" }[a.action]}
                    </Badge>
                  </td>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>{a.sourceId}</td>
                  <td style={{ padding: "8px 10px", color: THEME.textMain }}>{a.detail}</td>
                </tr>
              ))}
              {auditList.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: THEME.textHint }}>暂无处置记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
