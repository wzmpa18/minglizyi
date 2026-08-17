"use client";

// ============================================================================
// 言道国学 - LOC 工具配置中心（P6-TOOL-04 §6.1）
// 万年历字段开关 / 择日规则版本化 / 占星配置 / 真人服务 / 增长反作弊 /
// 记事提醒 —— 全部可视化配置，版本化留存，带审计日志与快照回滚。
// 架构红线：禁止硬编码，前端读取 toolConfigStore 实时生效。
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ScrollText, Sparkles, Handshake, TrendingUp, AlarmClock, History, Save, RotateCcw, Plus, X, BadgeCheck, Ticket } from "lucide-react";
import { THEME, styles, AdminCard, Badge, LoadingSpinner, useMounted, useToast, ToggleSwitch, ConfirmDialog } from "../_shared";
import {
  getToolConfig,
  updateToolConfig,
  rollbackToolConfig,
  listConfigSnapshots,
  listConfigAudit,
  getModuleVersion,
  DEFAULT_TOOL_CONFIG,
  type ToolConfig,
  type ZeriEventTypeConfig,
} from "@/lib/toolConfigStore";
import {
  generateCodes,
  setCodeStatus,
  listCodes,
  listRedemptions,
  listRedeemAudit,
  getCodeStats,
  exportCodesCsv,
  type RedeemCode,
} from "@/lib/redeemCodeStore";

type TabKey = "calendar" | "zeri" | "astro" | "consult" | "growth" | "reminder" | "account" | "redeem" | "audit";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "calendar", label: "万年历", icon: <CalendarDays size={14} /> },
  { key: "zeri", label: "择日规则", icon: <ScrollText size={14} /> },
  { key: "astro", label: "占星工具", icon: <Sparkles size={14} /> },
  { key: "consult", label: "真人服务", icon: <Handshake size={14} /> },
  { key: "growth", label: "增长体系", icon: <TrendingUp size={14} /> },
  { key: "reminder", label: "记事提醒", icon: <AlarmClock size={14} /> },
  { key: "account", label: "账户特权", icon: <BadgeCheck size={14} /> },
  { key: "redeem", label: "兑换码", icon: <Ticket size={14} /> },
  { key: "audit", label: "审计与回滚", icon: <History size={14} /> },
];

const MODULE_LABEL: Record<TabKey, string> = {
  calendar: "万年历",
  zeri: "择日规则",
  astro: "占星工具",
  consult: "真人服务",
  growth: "增长体系",
  reminder: "记事提醒",
  account: "账户特权",
  redeem: "兑换码",
  audit: "审计",
};

const CONFIG_MODULES = ["calendar", "zeri", "astro", "consult", "growth", "reminder", "account", "redeem"] as const;

function NumField({
  label, value, onChange, suffix, min = 0, max = 999999,
}: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string; min?: number; max?: number;
}) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="number"
          style={styles.input}
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);
          }}
        />
        {suffix && <span style={{ fontSize: 12, color: THEME.textHint, flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function BoolField({
  label, desc, value, onChange,
}: {
  label: string; desc?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: `1px solid ${THEME.border}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textMain }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: THEME.textHint, marginTop: 2 }}>{desc}</div>}
      </div>
      <ToggleSwitch checked={value} onChange={onChange} size="sm" />
    </div>
  );
}

function TagEditor({
  values, onChange, placeholder, type = "text",
}: {
  values: string[]; onChange: (v: string[]) => void; placeholder?: string; type?: "text" | "number";
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setInput("");
  };
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {values.map((v) => (
          <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, backgroundColor: THEME.primaryBg, color: THEME.primary, fontSize: 12, fontWeight: 600 }}>
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} style={{ border: "none", background: "none", cursor: "pointer", color: THEME.primary, display: "flex", padding: 0 }}>
              <X size={12} />
            </button>
          </span>
        ))}
        {values.length === 0 && <span style={{ fontSize: 12, color: THEME.textHint }}>暂无，请在下方添加</span>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={styles.input}
          value={input}
          type={type === "number" ? "number" : "text"}
          placeholder={placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button style={{ ...styles.btnSecondary, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }} onClick={add}>
          <Plus size={13} /> 添加
        </button>
      </div>
    </div>
  );
}

/** 兑换码生成/管理/兑换记录/审计（嵌入 redeem Tab，权益核销复用统一引擎） */
function RedeemManager({ onToast }: { onToast: (msg: string, type?: "success" | "error") => void }) {
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [records, setRecords] = useState<ReturnType<typeof listRedemptions>>([]);
  const [auditList, setAuditList] = useState<ReturnType<typeof listRedeemAudit>>([]);
  const [gen, setGen] = useState({ rewardType: "membership" as "membership" | "points", level: "monthly" as "monthly" | "yearly" | "lifetime", points: 100, count: 10, maxUses: 1, validDays: 90, note: "活动发放" });
  const [generating, setGenerating] = useState(false);

  const refresh = () => {
    setCodes(listCodes().slice().reverse());
    setRecords(listRedemptions().slice().reverse());
    setAuditList(listRedeemAudit());
  };
  useEffect(() => { refresh(); }, []);

  const handleGenerate = () => {
    setGenerating(true);
    try {
      const res = generateCodes({
        count: gen.count,
        rewardType: gen.rewardType,
        level: gen.rewardType === "membership" ? gen.level : undefined,
        points: gen.rewardType === "points" ? gen.points : undefined,
        maxUses: gen.maxUses,
        validDays: gen.validDays,
        note: gen.note,
        createdBy: "admin",
      });
      onToast(res.message, res.success ? "success" : "error");
      if (res.success && res.codes.length > 0) {
        const blob = new Blob([res.codes.join("\r\n")], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `兑换码_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
      refresh();
    } finally {
      setGenerating(false);
    }
  };

  const downloadCsv = () => {
    const blob = new Blob([exportCodesCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `兑换码清单_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = getCodeStats();

  return (
    <>
      <AdminCard title="批量生成兑换码" style={{ marginTop: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <div>
            <label style={styles.label}>权益类型</label>
            <select style={styles.input} value={gen.rewardType} onChange={(e) => setGen({ ...gen, rewardType: e.target.value as "membership" | "points" })}>
              <option value="membership">会员</option>
              <option value="points">积分</option>
            </select>
          </div>
          {gen.rewardType === "membership" ? (
            <div>
              <label style={styles.label}>会员档位</label>
              <select style={styles.input} value={gen.level} onChange={(e) => setGen({ ...gen, level: e.target.value as "monthly" | "yearly" | "lifetime" })}>
                <option value="monthly">月度会员（30天）</option>
                <option value="yearly">年度会员（365天）</option>
                <option value="lifetime">终身会员</option>
              </select>
            </div>
          ) : (
            <NumField label="积分数额" value={gen.points} onChange={(v) => setGen({ ...gen, points: v })} suffix="分" min={1} max={100000} />
          )}
          <NumField label="生成数量" value={gen.count} onChange={(v) => setGen({ ...gen, count: v })} suffix="个" min={1} max={500} />
          <NumField label="每码可兑换人次" value={gen.maxUses} onChange={(v) => setGen({ ...gen, maxUses: v })} suffix="人（0=不限）" min={0} max={10000} />
          <NumField label="有效期" value={gen.validDays} onChange={(v) => setGen({ ...gen, validDays: v })} suffix="天（0=永久）" min={0} max={3650} />
          <div>
            <label style={styles.label}>备注（用途/活动名）</label>
            <input style={styles.input} value={gen.note} onChange={(e) => setGen({ ...gen, note: e.target.value })} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button style={styles.btnSecondary} onClick={downloadCsv}>导出清单 CSV</button>
          <button style={{ ...styles.btnPrimary, opacity: generating ? 0.6 : 1 }} disabled={generating} onClick={handleGenerate}>
            {generating ? "生成中..." : `生成 ${gen.count} 个兑换码`}
          </button>
        </div>
      </AdminCard>

      <AdminCard title={`兑换码列表（共 ${stats.total} 个 · 启用 ${stats.active} · 已兑换 ${stats.redeemed} 人次）`} style={{ marginTop: 16 }}>
        {codes.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: THEME.textHint, fontSize: 13 }}>暂无兑换码，请在上方生成</div>
        ) : (
          <div style={{ overflowX: "auto", maxHeight: 360, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, background: "#fff" }}>
                <tr style={{ borderBottom: `2px solid ${THEME.border}`, textAlign: "left" }}>
                  <th style={{ padding: "8px 10px", color: THEME.textSub }}>兑换码</th>
                  <th style={{ padding: "8px 10px", color: THEME.textSub }}>权益</th>
                  <th style={{ padding: "8px 10px", color: THEME.textSub }}>备注</th>
                  <th style={{ padding: "8px 10px", color: THEME.textSub }}>已兑/上限</th>
                  <th style={{ padding: "8px 10px", color: THEME.textSub }}>有效期至</th>
                  <th style={{ padding: "8px 10px", color: THEME.textSub }}>状态</th>
                  <th style={{ padding: "8px 10px", color: THEME.textSub }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.code} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", fontWeight: 700, color: THEME.textMain }}>{c.code}</td>
                    <td style={{ padding: "8px 10px" }}>{c.rewardType === "membership" ? `会员-${c.level}` : `${c.points}积分`}</td>
                    <td style={{ padding: "8px 10px", color: THEME.textSub }}>{c.note}</td>
                    <td style={{ padding: "8px 10px" }}>{c.usedCount}/{c.maxUses || "不限"}</td>
                    <td style={{ padding: "8px 10px", color: THEME.textSub, whiteSpace: "nowrap" }}>{c.expiresAt ? c.expiresAt.slice(0, 10) : "永久"}</td>
                    <td style={{ padding: "8px 10px" }}><Badge type={c.status === "active" ? "success" : "warning"}>{c.status === "active" ? "启用" : "停用"}</Badge></td>
                    <td style={{ padding: "8px 10px" }}>
                      <button
                        style={{ ...styles.btnSecondary, padding: "4px 10px", fontSize: 12 }}
                        onClick={() => {
                          const res = setCodeStatus(c.code, c.status === "active" ? "disabled" : "active");
                          onToast(res.message, res.success ? "success" : "error");
                          refresh();
                        }}
                      >{c.status === "active" ? "停用" : "启用"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <AdminCard title={`兑换记录（${records.length} 条）与操作审计`} style={{ marginTop: 16 }}>
        <div style={{ overflowX: "auto", maxHeight: 280, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ position: "sticky", top: 0, background: "#fff" }}>
              <tr style={{ borderBottom: `2px solid ${THEME.border}`, textAlign: "left" }}>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>时间</th>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>动作</th>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>兑换码</th>
                <th style={{ padding: "8px 10px", color: THEME.textSub }}>明细</th>
              </tr>
            </thead>
            <tbody>
              {auditList.slice(0, 100).map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                  <td style={{ padding: "8px 10px", color: THEME.textSub, whiteSpace: "nowrap" }}>{a.createdAt.slice(0, 19).replace("T", " ")}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <Badge type={a.action === "redeem" ? "success" : a.action === "redeem_fail" ? "warning" : "info"}>
                      {{ generate: "生成", redeem: "兑换成功", redeem_fail: "兑换失败", disable: "停用", enable: "启用" }[a.action]}
                    </Badge>
                  </td>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>{a.code || "—"}</td>
                  <td style={{ padding: "8px 10px", color: THEME.textMain }}>{a.detail}</td>
                </tr>
              ))}
              {auditList.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: THEME.textHint }}>暂无兑换操作记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </>
  );
}

export default function AdminToolsPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [tab, setTab] = useState<TabKey>("calendar");
  const [draft, setDraft] = useState<ToolConfig | null>(null);
  const [versions, setVersions] = useState<Record<string, string>>({});
  const [audit, setAudit] = useState<ReturnType<typeof listConfigAudit>>([]);
  const [snapshots, setSnapshots] = useState<Record<string, string[]>>({});
  const [rollbackTarget, setRollbackTarget] = useState<{ module: TabKey; version: string } | null>(null);
  const [newEvent, setNewEvent] = useState({ name: "", keywords: "", folkNote: "" });

  const refresh = useCallback(() => {
    const cfg = getToolConfig();
    setDraft(JSON.parse(JSON.stringify(cfg)) as ToolConfig);
    const vs: Record<string, string> = {};
    CONFIG_MODULES.forEach((m) => {
      vs[m] = getModuleVersion(m);
    });
    setVersions(vs);
    setAudit(listConfigAudit());
    const snaps: Record<string, string[]> = {};
    CONFIG_MODULES.forEach((m) => {
      snaps[m] = listConfigSnapshots(m);
    });
    setSnapshots(snaps);
  }, []);

  useEffect(() => {
    if (mounted) refresh();
  }, [mounted, refresh]);

  if (!mounted || !draft) {
    return <LoadingSpinner text="正在加载工具配置..." />;
  }

  const saveModule = (module: TabKey, summary: string) => {
    if (module === "audit") return;
    const patch = draft[module as keyof ToolConfig] as unknown as Record<string, unknown>;
    const res = updateToolConfig(module as keyof ToolConfig, patch as never, summary, "admin");
    show(res.success ? `已保存，新版本 ${res.version}，实时生效` : `保存失败：${res.error}`, res.success ? "success" : "error");
    refresh();
  };

  const SaveBar = ({ module, summary }: { module: TabKey; summary: string }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
      <Badge type="primary">当前版本 {versions[module] || "—"}</Badge>
      <button style={{ ...styles.btnPrimary, display: "flex", alignItems: "center", gap: 6 }} onClick={() => saveModule(module, summary)}>
        <Save size={14} /> 保存并生效
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: THEME.textMain, margin: 0 }}>工具配置中心</h1>
          <Badge type="primary">LOC 运营后台</Badge>
        </div>
        <p style={{ fontSize: 13, color: THEME.textSub, margin: 0 }}>
          万年历 / 择日 / 占星 / 真人服务 / 增长 / 提醒全部可视化配置 · 版本化留存 · 审计可回溯（P6-TOOL-04 §6.1）
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${active ? THEME.primary : THEME.border}`,
                backgroundColor: active ? THEME.primary : "#fff",
                color: active ? "#fff" : THEME.textSub,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ===== 万年历 ===== */}
      {tab === "calendar" && (
        <AdminCard title="万年历配置（首页字段开关与功能入口）">
          <BoolField label="功能总开关" desc="关闭后万年历工具整体停用" value={draft.calendar.functionEnabled} onChange={(v) => setDraft({ ...draft, calendar: { ...draft.calendar, functionEnabled: v } })} />
          <BoolField label="公历/农历/节气/干支" value={draft.calendar.showGanzhi} onChange={(v) => setDraft({ ...draft, calendar: { ...draft.calendar, showGanzhi: v } })} />
          <BoolField label="宜忌展示" value={draft.calendar.showYiJi} onChange={(v) => setDraft({ ...draft, calendar: { ...draft.calendar, showYiJi: v } })} />
          <BoolField label="冲煞展示" value={draft.calendar.showChongSha} onChange={(v) => setDraft({ ...draft, calendar: { ...draft.calendar, showChongSha: v } })} />
          <BoolField label="吉时展示" value={draft.calendar.showJiShi} onChange={(v) => setDraft({ ...draft, calendar: { ...draft.calendar, showJiShi: v } })} />
          <BoolField label="方位展示（喜神/财神/福神）" value={draft.calendar.showFangWei} onChange={(v) => setDraft({ ...draft, calendar: { ...draft.calendar, showFangWei: v } })} />
          <BoolField label="当日待办/生日提醒摘要" value={draft.calendar.showDayEvents} onChange={(v) => setDraft({ ...draft, calendar: { ...draft.calendar, showDayEvents: v } })} />
          <BoolField label="「记事提醒」入口" value={draft.calendar.showReminderEntry} onChange={(v) => setDraft({ ...draft, calendar: { ...draft.calendar, showReminderEntry: v } })} />
          <BoolField label="「择日」入口" value={draft.calendar.showZeriEntry} onChange={(v) => setDraft({ ...draft, calendar: { ...draft.calendar, showZeriEntry: v } })} />
          <BoolField label="「更多工具」入口" value={draft.calendar.showMoreToolsEntry} onChange={(v) => setDraft({ ...draft, calendar: { ...draft.calendar, showMoreToolsEntry: v } })} />
          <SaveBar module="calendar" summary="更新万年历字段开关配置" />
        </AdminCard>
      )}

      {/* ===== 择日规则 ===== */}
      {tab === "zeri" && (
        <>
          <AdminCard title="择日规则总配置（版本化）">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              <NumField label="AI 深度择日定价（元/次）" value={draft.zeri.aiDeepPrice} onChange={(v) => setDraft({ ...draft, zeri: { ...draft.zeri, aiDeepPrice: v } })} suffix="元" min={0} max={999} />
              <NumField label="查询范围上限" value={draft.zeri.maxRangeDays} onChange={(v) => setDraft({ ...draft, zeri: { ...draft.zeri, maxRangeDays: v } })} suffix="天" min={1} max={365} />
            </div>
            <div style={{ marginTop: 8 }}>
              <BoolField label="AI 深度择日服务" desc="结果页底部的增值分析入口" value={draft.zeri.aiDeepEnabled} onChange={(v) => setDraft({ ...draft, zeri: { ...draft.zeri, aiDeepEnabled: v } })} />
              <BoolField label="结果展示吉时" value={draft.zeri.showJiShi} onChange={(v) => setDraft({ ...draft, zeri: { ...draft.zeri, showJiShi: v } })} />
              <BoolField label="结果展示宜忌" value={draft.zeri.showYiJi} onChange={(v) => setDraft({ ...draft, zeri: { ...draft.zeri, showYiJi: v } })} />
              <BoolField label="结果展示冲煞" value={draft.zeri.showChongSha} onChange={(v) => setDraft({ ...draft, zeri: { ...draft.zeri, showChongSha: v } })} />
              <BoolField label="结果展示方位" value={draft.zeri.showFangWei} onChange={(v) => setDraft({ ...draft, zeri: { ...draft.zeri, showFangWei: v } })} />
              <BoolField label="结果展示民俗注意事项" value={draft.zeri.showFolkNote} onChange={(v) => setDraft({ ...draft, zeri: { ...draft.zeri, showFolkNote: v } })} />
              <BoolField label="结果展示不建议日期及依据" value={draft.zeri.showAvoidDays} onChange={(v) => setDraft({ ...draft, zeri: { ...draft.zeri, showAvoidDays: v } })} />
              <BoolField label="结果展示规则依据" value={draft.zeri.showRuleBasis} onChange={(v) => setDraft({ ...draft, zeri: { ...draft.zeri, showRuleBasis: v } })} />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={styles.label}>免责声明文案</label>
              <textarea
                style={{ ...styles.input, resize: "none" }}
                rows={3}
                value={draft.zeri.disclaimer}
                onChange={(e) => setDraft({ ...draft, zeri: { ...draft.zeri, disclaimer: e.target.value } })}
              />
            </div>
            <SaveBar module="zeri" summary="更新择日规则总配置" />
          </AdminCard>

          <AdminCard title={`择日事项分类（共 ${draft.zeri.eventTypes.length} 项）`} style={{ marginTop: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {draft.zeri.eventTypes.map((et, idx) => (
                <div key={et.id} style={{ padding: 14, borderRadius: 10, border: `1px solid ${et.enabled ? THEME.border : THEME.errorBg}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        style={{ ...styles.input, fontWeight: 700, width: 140 }}
                        value={et.name}
                        onChange={(e) => {
                          const list = [...draft.zeri.eventTypes];
                          list[idx] = { ...et, name: e.target.value };
                          setDraft({ ...draft, zeri: { ...draft.zeri, eventTypes: list } });
                        }}
                      />
                      <Badge type={et.enabled ? "success" : "error"}>{et.enabled ? "启用" : "停用"}</Badge>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ToggleSwitch checked={et.enabled} size="sm" onChange={(v) => {
                        const list = [...draft.zeri.eventTypes];
                        list[idx] = { ...et, enabled: v };
                        setDraft({ ...draft, zeri: { ...draft.zeri, eventTypes: list } });
                      }} />
                      <button
                        style={{ ...styles.btnDanger, display: "flex", alignItems: "center", gap: 4 }}
                        onClick={() => {
                          const list = draft.zeri.eventTypes.filter((x) => x.id !== et.id);
                          setDraft({ ...draft, zeri: { ...draft.zeri, eventTypes: list } });
                        }}
                      >
                        <X size={13} /> 删除
                      </button>
                    </div>
                  </div>
                  <label style={styles.label}>宜忌匹配关键词（逗号分隔）</label>
                  <input
                    style={styles.input}
                    value={et.yiKeywords.join("，")}
                    onChange={(e) => {
                      const list = [...draft.zeri.eventTypes];
                      list[idx] = { ...et, yiKeywords: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) };
                      setDraft({ ...draft, zeri: { ...draft.zeri, eventTypes: list } });
                    }}
                  />
                  <div style={{ marginTop: 8 }}>
                    <label style={styles.label}>民俗注意事项</label>
                    <textarea
                      style={{ ...styles.input, resize: "none" }}
                      rows={2}
                      value={et.folkNote}
                      onChange={(e) => {
                        const list = [...draft.zeri.eventTypes];
                        list[idx] = { ...et, folkNote: e.target.value };
                        setDraft({ ...draft, zeri: { ...draft.zeri, eventTypes: list } });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, padding: 14, borderRadius: 10, border: `2px dashed ${THEME.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.textMain, marginBottom: 10 }}>新增事项分类</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <div>
                  <label style={styles.label}>事项名称</label>
                  <input style={styles.input} value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} placeholder="如：开业剪彩" />
                </div>
                <div>
                  <label style={styles.label}>宜忌关键词（逗号分隔）</label>
                  <input style={styles.input} value={newEvent.keywords} onChange={(e) => setNewEvent({ ...newEvent, keywords: e.target.value })} placeholder="如：开市，交易，立券" />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={styles.label}>民俗注意事项</label>
                <textarea style={{ ...styles.input, resize: "none" }} rows={2} value={newEvent.folkNote} onChange={(e) => setNewEvent({ ...newEvent, folkNote: e.target.value })} />
              </div>
              <button
                style={{ ...styles.btnPrimary, marginTop: 10, display: "flex", alignItems: "center", gap: 4 }}
                onClick={() => {
                  if (!newEvent.name.trim() || !newEvent.keywords.trim()) {
                    show("请填写事项名称与关键词", "error");
                    return;
                  }
                  const et: ZeriEventTypeConfig = {
                    id: "et_" + Date.now().toString(36),
                    name: newEvent.name.trim(),
                    enabled: true,
                    yiKeywords: newEvent.keywords.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
                    folkNote: newEvent.folkNote.trim() || "暂无民俗注意事项，由项目方后台补充。",
                    weight: 50,
                  };
                  setDraft({ ...draft, zeri: { ...draft.zeri, eventTypes: [...draft.zeri.eventTypes, et] } });
                  setNewEvent({ name: "", keywords: "", folkNote: "" });
                  show("已加入列表，保存后生效", "success");
                }}
              >
                <Plus size={14} /> 加入列表
              </button>
            </div>
            <SaveBar module="zeri" summary="更新择日事项分类" />
          </AdminCard>
        </>
      )}

      {/* ===== 占星 ===== */}
      {tab === "astro" && (
        <AdminCard title="占星工具配置">
          <BoolField label="功能开关" value={draft.astro.enabled} onChange={(v) => setDraft({ ...draft, astro: { ...draft.astro, enabled: v } })} />
          <BoolField label="AI 深度解读服务" value={draft.astro.aiDeepEnabled} onChange={(v) => setDraft({ ...draft, astro: { ...draft.astro, aiDeepEnabled: v } })} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: `1px solid ${THEME.border}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textMain }}>隐私默认私有</div>
              <div style={{ fontSize: 11, color: THEME.textHint, marginTop: 2 }}>合规要求：强制开启，不可配置为默认公开</div>
            </div>
            <Badge type="success">强制开启</Badge>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 14 }}>
            <NumField label="AI 解读定价（元/次）" value={draft.astro.aiDeepPrice} onChange={(v) => setDraft({ ...draft, astro: { ...draft.astro, aiDeepPrice: v } })} suffix="元" min={0} max={999} />
            <NumField label="免费体验次数" value={draft.astro.aiFreeTrialCount} onChange={(v) => setDraft({ ...draft, astro: { ...draft.astro, aiFreeTrialCount: v } })} suffix="次" min={0} max={10} />
            <NumField label="最多保存星盘数" value={draft.astro.maxSavedCharts} onChange={(v) => setDraft({ ...draft, astro: { ...draft.astro, maxSavedCharts: v } })} suffix="个" min={1} max={100} />
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, backgroundColor: THEME.infoBg, fontSize: 12, color: THEME.info }}>
            第三方数据版本：{draft.astro.dataVersion}（许可证核查见 docs/compliance/占星工具第三方数据资产清单.md）
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={styles.label}>免责声明文案</label>
            <textarea
              style={{ ...styles.input, resize: "none" }}
              rows={3}
              value={draft.astro.disclaimer}
              onChange={(e) => setDraft({ ...draft, astro: { ...draft.astro, disclaimer: e.target.value } })}
            />
          </div>
          <SaveBar module="astro" summary="更新占星工具配置" />
        </AdminCard>
      )}

      {/* ===== 真人服务 ===== */}
      {tab === "consult" && (
        <AdminCard title="真人咨询服务配置（言道精选 consult 类目）">
          <BoolField label="功能开关" value={draft.consult.enabled} onChange={(v) => setDraft({ ...draft, consult: { ...draft.consult, enabled: v } })} />
          <BoolField label="准入需身份+收款+类目三要素校验" desc="关闭后仅基础资料校验（不建议）" value={draft.consult.entryAuditRequired} onChange={(v) => setDraft({ ...draft, consult: { ...draft.consult, entryAuditRequired: v } })} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 14 }}>
            <NumField label="最低定价" value={draft.consult.minPrice} onChange={(v) => setDraft({ ...draft, consult: { ...draft.consult, minPrice: v } })} suffix="元" min={1} max={9999} />
            <NumField label="最高定价" value={draft.consult.maxPrice} onChange={(v) => setDraft({ ...draft, consult: { ...draft.consult, maxPrice: v } })} suffix="元" min={1} max={99999} />
            <NumField label="平台服务费比例" value={Math.round(draft.consult.platformFeeRate * 100)} onChange={(v) => setDraft({ ...draft, consult: { ...draft.consult, platformFeeRate: v / 100 } })} suffix="%" min={0} max={50} />
            <NumField label="结算周期" value={draft.consult.settleDays} onChange={(v) => setDraft({ ...draft, consult: { ...draft.consult, settleDays: v } })} suffix="天（确认收货后）" min={0} max={90} />
            <NumField label="履约时限上限" value={draft.consult.maxDeliveryDays} onChange={(v) => setDraft({ ...draft, consult: { ...draft.consult, maxDeliveryDays: v } })} suffix="天" min={1} max={30} />
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={styles.label}>服务类目管理（服务者入驻与上架时选择）</label>
            <TagEditor
              values={draft.consult.categories}
              onChange={(v) => setDraft({ ...draft, consult: { ...draft.consult, categories: v } })}
              placeholder="输入新类目名称，如：六爻卦象咨询"
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={styles.label}>免责声明文案</label>
            <textarea
              style={{ ...styles.input, resize: "none" }}
              rows={3}
              value={draft.consult.disclaimer}
              onChange={(e) => setDraft({ ...draft, consult: { ...draft.consult, disclaimer: e.target.value } })}
            />
          </div>
          <SaveBar module="consult" summary="更新真人咨询服务配置" />
        </AdminCard>
      )}

      {/* ===== 增长体系 ===== */}
      {tab === "growth" && (
        <AdminCard title="分享邀请与反作弊配置">
          <BoolField label="分享海报功能" value={draft.growth.sharePosterEnabled} onChange={(v) => setDraft({ ...draft, growth: { ...draft.growth, sharePosterEnabled: v } })} />
          <BoolField label="邀请功能" value={draft.growth.inviteEnabled} onChange={(v) => setDraft({ ...draft, growth: { ...draft.growth, inviteEnabled: v } })} />
          <BoolField label="申诉入口" value={draft.growth.appealEnabled} onChange={(v) => setDraft({ ...draft, growth: { ...draft.growth, appealEnabled: v } })} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: `1px solid ${THEME.border}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textMain }}>归因优先级</div>
              <div style={{ fontSize: 11, color: THEME.textHint, marginTop: 2 }}>合规要求：强制首绑优先，禁止后到链接覆盖已确认绑定</div>
            </div>
            <Badge type="success">首绑优先（强制）</Badge>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 14 }}>
            <NumField label="邀请链接有效期" value={draft.growth.inviteValidDays} onChange={(v) => setDraft({ ...draft, growth: { ...draft.growth, inviteValidDays: v } })} suffix="天" min={1} max={365} />
            <NumField label="邀请注册奖励" value={draft.growth.registerRewardPoints} onChange={(v) => setDraft({ ...draft, growth: { ...draft.growth, registerRewardPoints: v } })} suffix="积分" min={0} max={10000} />
            <NumField label="首次付费奖励" value={draft.growth.firstPayRewardPoints} onChange={(v) => setDraft({ ...draft, growth: { ...draft.growth, firstPayRewardPoints: v } })} suffix="积分" min={0} max={10000} />
            <NumField label="学习达标奖励" value={draft.growth.learningRewardPoints} onChange={(v) => setDraft({ ...draft, growth: { ...draft.growth, learningRewardPoints: v } })} suffix="积分" min={0} max={10000} />
            <NumField label="同设备注册数上限" value={draft.growth.maxRegistersPerDevice} onChange={(v) => setDraft({ ...draft, growth: { ...draft.growth, maxRegistersPerDevice: v } })} suffix="个" min={1} max={20} />
            <NumField label="单用户日邀请上限" value={draft.growth.maxInvitesPerDay} onChange={(v) => setDraft({ ...draft, growth: { ...draft.growth, maxInvitesPerDay: v } })} suffix="次/日" min={1} max={200} />
            <NumField label="异常奖励冻结观察期" value={draft.growth.rewardFreezeHours} onChange={(v) => setDraft({ ...draft, growth: { ...draft.growth, rewardFreezeHours: v } })} suffix="小时" min={1} max={168} />
          </div>
          <SaveBar module="growth" summary="更新增长与反作弊配置" />
        </AdminCard>
      )}

      {/* ===== 记事提醒 ===== */}
      {tab === "reminder" && (
        <AdminCard title="记事提醒配置">
          <BoolField label="功能总开关" value={draft.reminder.enabled} onChange={(v) => setDraft({ ...draft, reminder: { ...draft.reminder, enabled: v } })} />
          <BoolField label="系统推送通道" desc="实际生效以用户授权与设备能力为准" value={draft.reminder.pushEnabled} onChange={(v) => setDraft({ ...draft, reminder: { ...draft.reminder, pushEnabled: v } })} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 14 }}>
            <NumField label="每用户事件上限" value={draft.reminder.maxEventsPerUser} onChange={(v) => setDraft({ ...draft, reminder: { ...draft.reminder, maxEventsPerUser: v } })} suffix="条" min={10} max={2000} />
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={styles.label}>提醒档位白名单（分钟，0=准时）</label>
            <TagEditor
              type="number"
              values={draft.reminder.offsetWhitelist.map(String)}
              onChange={(v) => setDraft({ ...draft, reminder: { ...draft.reminder, offsetWhitelist: v.map(Number).filter((n) => Number.isFinite(n) && n >= 0) } })}
              placeholder="输入分钟数，如 30"
            />
          </div>
          <SaveBar module="reminder" summary="更新记事提醒配置" />
        </AdminCard>
      )}

      {/* ===== 账户特权（P6-TOOL-04-补02：全权限账户白名单） ===== */}
      {tab === "account" && (
        <AdminCard title="全权限账户白名单">
          <div style={{ fontSize: 12, color: THEME.textHint, marginBottom: 10, lineHeight: 1.7 }}>
            白名单账户在统一会员引擎内视为终身会员：不限次 AI 解读、B 类工具免费、免广告、报告导出、签到积分 5 倍。
            支持精确 11 位手机号，或以 * 结尾的前缀（如 134* 匹配全部 134 号段，范围由项目方自行把控）。
          </div>
          <div style={{ marginTop: 6 }}>
            <label style={styles.label}>全权限手机号列表</label>
            <TagEditor
              values={draft.account.superPhones}
              onChange={(v) => setDraft({ ...draft, account: { ...draft.account, superPhones: v } })}
              placeholder="输入完整手机号或前缀（如 134*）后回车"
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={styles.label}>备注说明</label>
            <input
              style={styles.input}
              value={draft.account.note}
              onChange={(e) => setDraft({ ...draft, account: { ...draft.account, note: e.target.value } })}
            />
          </div>
          <SaveBar module="account" summary="更新全权限账户白名单" />
        </AdminCard>
      )}

      {/* ===== 会员兑换码（权益核销复用统一会员/积分引擎） ===== */}
      {tab === "redeem" && (
        <>
          <AdminCard title="兑换码规则配置">
            <BoolField label="兑换入口总开关" value={draft.redeem.enabled} onChange={(v) => setDraft({ ...draft, redeem: { ...draft.redeem, enabled: v } })} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 14 }}>
              <NumField label="单用户兑换次数上限" value={draft.redeem.maxRedeemPerUser} onChange={(v) => setDraft({ ...draft, redeem: { ...draft.redeem, maxRedeemPerUser: v } })} suffix="次（0=不限）" min={0} max={100} />
              <NumField label="防爆破告警阈值" value={draft.redeem.maxFailAttempts} onChange={(v) => setDraft({ ...draft, redeem: { ...draft.redeem, maxFailAttempts: v } })} suffix="次/日" min={3} max={50} />
            </div>
            <SaveBar module="redeem" summary="更新兑换码规则配置" />
          </AdminCard>
          <RedeemManager onToast={show} />
        </>
      )}

      {/* ===== 审计与回滚 ===== */}
      {tab === "audit" && (
        <>
          <AdminCard title={`配置审计日志（最近 ${Math.min(audit.length, 100)} 条）`}>
            {audit.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: THEME.textHint, fontSize: 13 }}>暂无配置变更记录</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${THEME.border}`, textAlign: "left" }}>
                      <th style={{ padding: "8px 10px", color: THEME.textSub }}>时间</th>
                      <th style={{ padding: "8px 10px", color: THEME.textSub }}>模块</th>
                      <th style={{ padding: "8px 10px", color: THEME.textSub }}>动作</th>
                      <th style={{ padding: "8px 10px", color: THEME.textSub }}>说明</th>
                      <th style={{ padding: "8px 10px", color: THEME.textSub }}>版本变化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.slice(0, 100).map((a) => (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <td style={{ padding: "8px 10px", color: THEME.textSub, whiteSpace: "nowrap" }}>{a.createdAt.slice(0, 19).replace("T", " ")}</td>
                        <td style={{ padding: "8px 10px" }}>{MODULE_LABEL[a.module as TabKey] || a.module}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <Badge type={a.action === "update" ? "info" : "warning"}>{a.action === "update" ? "更新" : "回滚"}</Badge>
                        </td>
                        <td style={{ padding: "8px 10px", color: THEME.textMain }}>{a.summary}</td>
                        <td style={{ padding: "8px 10px", color: THEME.textHint, whiteSpace: "nowrap" }}>{a.beforeVersion} → {a.afterVersion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          <AdminCard title="配置快照与回滚" style={{ marginTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {CONFIG_MODULES.map((m) => (
                <div key={m} style={{ padding: 14, borderRadius: 10, border: `1px solid ${THEME.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: THEME.textMain }}>{MODULE_LABEL[m]}</span>
                    <Badge type="primary">{versions[m]}</Badge>
                  </div>
                  {(snapshots[m] || []).length === 0 ? (
                    <div style={{ fontSize: 12, color: THEME.textHint }}>暂无历史快照</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {(snapshots[m] || []).slice(0, 8).map((v) => (
                        <div key={v} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, color: THEME.textSub }}>{v}</span>
                          {v !== versions[m] && (
                            <button
                              style={{ ...styles.btnSecondary, padding: "3px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                              onClick={() => setRollbackTarget({ module: m, version: v })}
                            >
                              <RotateCcw size={11} /> 回滚
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard title="恢复默认配置" style={{ marginTop: 16 }}>
            <p style={{ fontSize: 12, color: THEME.textSub, marginBottom: 12, lineHeight: 1.7 }}>
              将全部模块重置为出厂默认配置（{DEFAULT_TOOL_CONFIG.zeri.version} 规则集、默认价格与阈值）。
              建议先确认各模块快照可回滚后再操作。
            </p>
            <button
              style={{ ...styles.btnDanger }}
              onClick={() => {
                if (typeof window === "undefined") return;
                localStorage.removeItem("yandao_tool_config");
                show("已恢复默认配置（历史快照仍可回滚）", "success");
                refresh();
              }}
            >
              恢复全部默认
            </button>
          </AdminCard>
        </>
      )}

      <ConfirmDialog
        open={!!rollbackTarget}
        title="回滚配置"
        message={`确认将「${MODULE_LABEL[rollbackTarget?.module as TabKey]}」回滚到版本 ${rollbackTarget?.version}？回滚后前端实时生效，操作将记入审计日志。`}
        danger
        onConfirm={() => {
          if (!rollbackTarget) return;
          const res = rollbackToolConfig(rollbackTarget.module as keyof ToolConfig, rollbackTarget.version, "admin");
          show(res.success ? `已回滚至 ${res.version}` : `回滚失败：${res.error}`, res.success ? "success" : "error");
          setRollbackTarget(null);
          refresh();
        }}
        onCancel={() => setRollbackTarget(null)}
      />

      {toastNode}
    </div>
  );
}
