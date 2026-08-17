"use client";

// ============================================================================
// 言道国学 - LOC 工具配置中心（P6-TOOL-04 §6.1）
// 万年历字段开关 / 择日规则版本化 / 占星配置 / 真人服务 / 增长反作弊 /
// 记事提醒 —— 全部可视化配置，版本化留存，带审计日志与快照回滚。
// 架构红线：禁止硬编码，前端读取 toolConfigStore 实时生效。
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ScrollText, Sparkles, Handshake, TrendingUp, AlarmClock, History, Save, RotateCcw, Plus, X, BadgeCheck, Ticket, Stethoscope, ArrowUp, ArrowDown } from "lucide-react";
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

type TabKey = "calendar" | "zeri" | "astro" | "consult" | "growth" | "reminder" | "account" | "redeem" | "yikao" | "audit";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "calendar", label: "万年历", icon: <CalendarDays size={14} /> },
  { key: "zeri", label: "择日规则", icon: <ScrollText size={14} /> },
  { key: "astro", label: "占星工具", icon: <Sparkles size={14} /> },
  { key: "consult", label: "真人服务", icon: <Handshake size={14} /> },
  { key: "growth", label: "增长体系", icon: <TrendingUp size={14} /> },
  { key: "reminder", label: "记事提醒", icon: <AlarmClock size={14} /> },
  { key: "account", label: "账户特权", icon: <BadgeCheck size={14} /> },
  { key: "redeem", label: "兑换码", icon: <Ticket size={14} /> },
  { key: "yikao", label: "医考专区", icon: <Stethoscope size={14} /> },
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
  yikao: "医考专区",
  audit: "审计",
};

const CONFIG_MODULES = ["calendar", "zeri", "astro", "consult", "growth", "reminder", "account", "redeem", "yikao"] as const;

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
  const [newExam, setNewExam] = useState({ name: "", id: "" });
  const [newSubject, setNewSubject] = useState({ name: "", id: "" });
  const [newStation, setNewStation] = useState({ name: "", group: "" });
  const [newCard, setNewCard] = useState({ seal: "", title: "", subtitle: "", price: 19.9 });

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

      {/* ===== 医考专区（P6-补04） ===== */}
      {tab === "yikao" && (
        <>
          <AdminCard title="医考专区总配置">
            <BoolField label="专区总开关" desc="学习中心首页入口与 /academy/yikao 页面显隐" value={draft.yikao.enabled} onChange={(v) => setDraft({ ...draft, yikao: { ...draft.yikao, enabled: v } })} />
            <BoolField label="AI 错题深度解析服务" desc="错题本增值解读入口，走统一 Paywall" value={draft.yikao.aiWrongAnalysisEnabled} onChange={(v) => setDraft({ ...draft, yikao: { ...draft.yikao, aiWrongAnalysisEnabled: v } })} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 14 }}>
              <NumField label="AI 错题解析定价" value={draft.yikao.aiWrongAnalysisPrice} onChange={(v) => setDraft({ ...draft, yikao: { ...draft.yikao, aiWrongAnalysisPrice: v } })} suffix="元/次" min={0} max={999} />
              <NumField label="覆盖度达标阈值" value={draft.yikao.coverageThreshold} onChange={(v) => setDraft({ ...draft, yikao: { ...draft.yikao, coverageThreshold: v } })} suffix="%（达到才显示「覆盖全部核心考点」）" min={1} max={100} />
              <div>
                <label style={styles.label}>考纲结构版本</label>
                <input style={styles.input} value={draft.yikao.version} onChange={(e) => setDraft({ ...draft, yikao: { ...draft.yikao, version: e.target.value } })} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={styles.label}>文库学科横向切换标签</label>
              <TagEditor
                values={draft.yikao.libTabs}
                onChange={(v) => setDraft({ ...draft, yikao: { ...draft.yikao, libTabs: v } })}
                placeholder="输入学科名，如：中诊"
              />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={styles.label}>免责声明文案（工具页底部统一展示）</label>
              <textarea
                style={{ ...styles.input, resize: "none" }}
                rows={3}
                value={draft.yikao.disclaimer}
                onChange={(e) => setDraft({ ...draft, yikao: { ...draft.yikao, disclaimer: e.target.value } })}
              />
            </div>
            <SaveBar module="yikao" summary="更新医考专区总配置" />
          </AdminCard>

          <AdminCard title={`考试类别（共 ${draft.yikao.exams.length} 类，顶部导航切换项）`} style={{ marginTop: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {draft.yikao.exams.map((ex, idx) => (
                <div key={ex.id} style={{ padding: 14, borderRadius: 10, border: `1px solid ${ex.enabled ? THEME.border : THEME.errorBg}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        style={{ ...styles.input, fontWeight: 700, width: 180 }}
                        value={ex.name}
                        onChange={(e) => {
                          const list = [...draft.yikao.exams];
                          list[idx] = { ...ex, name: e.target.value };
                          setDraft({ ...draft, yikao: { ...draft.yikao, exams: list } });
                        }}
                      />
                      <Badge type={ex.enabled ? "success" : "error"}>{ex.enabled ? "启用" : "停用"}</Badge>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ToggleSwitch checked={ex.enabled} size="sm" onChange={(v) => {
                        const list = [...draft.yikao.exams];
                        list[idx] = { ...ex, enabled: v };
                        setDraft({ ...draft, yikao: { ...draft.yikao, exams: list } });
                      }} />
                      <button style={styles.btnDanger} onClick={() => setDraft({ ...draft, yikao: { ...draft.yikao, exams: draft.yikao.exams.filter((x) => x.id !== ex.id) } })}>
                        <X size={13} /> 删除
                      </button>
                    </div>
                  </div>
                  <label style={styles.label}>考试科目勾选（顺序即章节树顺序，科目在下方「科目与章节」维护）</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {draft.yikao.subjects.map((s) => {
                      const on = ex.subjectIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            const list = [...draft.yikao.exams];
                            list[idx] = { ...ex, subjectIds: on ? ex.subjectIds.filter((x) => x !== s.id) : [...ex.subjectIds, s.id] };
                            setDraft({ ...draft, yikao: { ...draft.yikao, exams: list } });
                          }}
                          style={{
                            padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                            border: `1px solid ${on ? THEME.primary : THEME.border}`,
                            backgroundColor: on ? THEME.primaryBg : "#fff",
                            color: on ? THEME.primary : THEME.textSub,
                          }}
                        >{on ? "✓ " : ""}{s.name}</button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: 14, borderRadius: 10, border: `2px dashed ${THEME.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.textMain, marginBottom: 10 }}>新增考试类别</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={styles.input} value={newExam.name} placeholder="考试名称，如：中医执业助理医师" onChange={(e) => setNewExam({ ...newExam, name: e.target.value })} />
                <input style={{ ...styles.input, width: 120 }} value={newExam.id} placeholder="类别ID，如 zyzlz" onChange={(e) => setNewExam({ ...newExam, id: e.target.value })} />
                <button
                  style={{ ...styles.btnPrimary, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                  onClick={() => {
                    const id = newExam.id.trim();
                    const name = newExam.name.trim();
                    if (!id || !name) { show("请填写类别ID与考试名称", "error"); return; }
                    if (draft.yikao.exams.some((x) => x.id === id)) { show("类别ID已存在", "error"); return; }
                    setDraft({ ...draft, yikao: { ...draft.yikao, exams: [...draft.yikao.exams, { id, name, subjectIds: draft.yikao.subjects.filter((s) => s.enabled).map((s) => s.id), enabled: true }] } });
                    setNewExam({ name: "", id: "" });
                    show("已加入列表，保存后生效", "success");
                  }}
                >
                  <Plus size={14} /> 加入
                </button>
              </div>
            </div>
            <SaveBar module="yikao" summary="更新医考考试类别" />
          </AdminCard>

          <AdminCard title={`科目与章节（共享池共 ${draft.yikao.subjects.length} 科）`} style={{ marginTop: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {draft.yikao.subjects.map((s, idx) => (
                <div key={s.id} style={{ padding: 14, borderRadius: 10, border: `1px solid ${s.enabled ? THEME.border : THEME.errorBg}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button style={{ ...styles.btnSecondary, padding: "4px 8px" }} disabled={idx === 0} onClick={() => {
                        const list = [...draft.yikao.subjects];
                        [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
                        setDraft({ ...draft, yikao: { ...draft.yikao, subjects: list } });
                      }}><ArrowUp size={12} /></button>
                      <button style={{ ...styles.btnSecondary, padding: "4px 8px" }} disabled={idx === draft.yikao.subjects.length - 1} onClick={() => {
                        const list = [...draft.yikao.subjects];
                        [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
                        setDraft({ ...draft, yikao: { ...draft.yikao, subjects: list } });
                      }}><ArrowDown size={12} /></button>
                      <input
                        style={{ ...styles.input, fontWeight: 700, width: 160 }}
                        value={s.name}
                        onChange={(e) => {
                          const list = [...draft.yikao.subjects];
                          list[idx] = { ...s, name: e.target.value };
                          setDraft({ ...draft, yikao: { ...draft.yikao, subjects: list } });
                        }}
                      />
                      <Badge type={s.enabled ? "success" : "error"}>{s.enabled ? "启用" : "停用"}</Badge>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ToggleSwitch checked={s.enabled} size="sm" onChange={(v) => {
                        const list = [...draft.yikao.subjects];
                        list[idx] = { ...s, enabled: v };
                        setDraft({ ...draft, yikao: { ...draft.yikao, subjects: list } });
                      }} />
                      <button style={styles.btnDanger} onClick={() => setDraft({ ...draft, yikao: { ...draft.yikao, subjects: draft.yikao.subjects.filter((x) => x.id !== s.id), exams: draft.yikao.exams.map((ex) => ({ ...ex, subjectIds: ex.subjectIds.filter((sid) => sid !== s.id) })) } })}>
                        <X size={13} /> 删除
                      </button>
                    </div>
                  </div>
                  <BoolField label="基础章节练习免费开放" desc="关闭后整科目为增值内容（带锁，走统一 Paywall）" value={s.freeTier} onChange={(v) => {
                    const list = [...draft.yikao.subjects];
                    list[idx] = { ...s, freeTier: v };
                    setDraft({ ...draft, yikao: { ...draft.yikao, subjects: list } });
                  }} />
                  <div style={{ marginTop: 8 }}>
                    <label style={styles.label}>二级章节（展开展示；留空则显示「全部章节」）</label>
                    <TagEditor
                      values={s.chapters}
                      onChange={(v) => {
                        const list = [...draft.yikao.subjects];
                        list[idx] = { ...s, chapters: v };
                        setDraft({ ...draft, yikao: { ...draft.yikao, subjects: list } });
                      }}
                      placeholder="输入章节名，如：阴阳五行"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: 14, borderRadius: 10, border: `2px dashed ${THEME.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.textMain, marginBottom: 10 }}>新增科目</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={styles.input} value={newSubject.name} placeholder="科目名称，如：推拿学" onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} />
                <input style={{ ...styles.input, width: 120 }} value={newSubject.id} placeholder="科目ID，如 tuina" onChange={(e) => setNewSubject({ ...newSubject, id: e.target.value })} />
                <button
                  style={{ ...styles.btnPrimary, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                  onClick={() => {
                    const id = newSubject.id.trim();
                    const name = newSubject.name.trim();
                    if (!id || !name) { show("请填写科目ID与名称", "error"); return; }
                    if (draft.yikao.subjects.some((x) => x.id === id)) { show("科目ID已存在", "error"); return; }
                    setDraft({ ...draft, yikao: { ...draft.yikao, subjects: [...draft.yikao.subjects, { id, name, chapters: [], freeTier: true, enabled: true }] } });
                    setNewSubject({ name: "", id: "" });
                    show("已加入共享池，保存后生效", "success");
                  }}
                >
                  <Plus size={14} /> 加入
                </button>
              </div>
            </div>
            <SaveBar module="yikao" summary="更新医考科目与章节" />
          </AdminCard>

          <AdminCard title={`实践技能考核站（共 ${draft.yikao.stations.length} 项）`} style={{ marginTop: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {draft.yikao.stations.map((st, idx) => (
                <div key={st.id} style={{ padding: 14, borderRadius: 10, border: `1px solid ${st.enabled ? THEME.border : THEME.errorBg}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <button style={{ ...styles.btnSecondary, padding: "4px 8px" }} disabled={idx === 0} onClick={() => {
                        const list = [...draft.yikao.stations];
                        [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
                        setDraft({ ...draft, yikao: { ...draft.yikao, stations: list } });
                      }}><ArrowUp size={12} /></button>
                      <button style={{ ...styles.btnSecondary, padding: "4px 8px" }} disabled={idx === draft.yikao.stations.length - 1} onClick={() => {
                        const list = [...draft.yikao.stations];
                        [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
                        setDraft({ ...draft, yikao: { ...draft.yikao, stations: list } });
                      }}><ArrowDown size={12} /></button>
                      <input
                        style={{ ...styles.input, fontWeight: 700, width: 200 }}
                        value={st.name}
                        onChange={(e) => {
                          const list = [...draft.yikao.stations];
                          list[idx] = { ...st, name: e.target.value };
                          setDraft({ ...draft, yikao: { ...draft.yikao, stations: list } });
                        }}
                      />
                      <input
                        style={{ ...styles.input, width: 110 }}
                        value={st.group}
                        onChange={(e) => {
                          const list = [...draft.yikao.stations];
                          list[idx] = { ...st, group: e.target.value };
                          setDraft({ ...draft, yikao: { ...draft.yikao, stations: list } });
                        }}
                      />
                      <Badge type={st.paid ? "warning" : "success"}>{st.paid ? "增值" : "免费"}</Badge>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ToggleSwitch checked={st.paid} size="sm" onChange={(v) => {
                        const list = [...draft.yikao.stations];
                        list[idx] = { ...st, paid: v };
                        setDraft({ ...draft, yikao: { ...draft.yikao, stations: list } });
                      }} />
                      <ToggleSwitch checked={st.enabled} size="sm" onChange={(v) => {
                        const list = [...draft.yikao.stations];
                        list[idx] = { ...st, enabled: v };
                        setDraft({ ...draft, yikao: { ...draft.yikao, stations: list } });
                      }} />
                      <button style={styles.btnDanger} onClick={() => setDraft({ ...draft, yikao: { ...draft.yikao, stations: draft.yikao.stations.filter((x) => x.id !== st.id) } })}>
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: 14, borderRadius: 10, border: `2px dashed ${THEME.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.textMain, marginBottom: 10 }}>新增考核站（分组名如：第一站）</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={styles.input} value={newStation.name} placeholder="站名，如：第一站病案分析" onChange={(e) => setNewStation({ ...newStation, name: e.target.value })} />
                <input style={{ ...styles.input, width: 110 }} value={newStation.group} placeholder="分组" onChange={(e) => setNewStation({ ...newStation, group: e.target.value })} />
                <button
                  style={{ ...styles.btnPrimary, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                  onClick={() => {
                    const name = newStation.name.trim();
                    const group = newStation.group.trim() || "第一站";
                    if (!name) { show("请填写站名", "error"); return; }
                    setDraft({ ...draft, yikao: { ...draft.yikao, stations: [...draft.yikao.stations, { id: "st_" + Date.now().toString(36), name, group, paid: true, enabled: true }] } });
                    setNewStation({ name: "", group: "" });
                    show("已加入列表，保存后生效", "success");
                  }}
                >
                  <Plus size={14} /> 加入
                </button>
              </div>
            </div>
            <SaveBar module="yikao" summary="更新实践技能考核站" />
          </AdminCard>

          <AdminCard title={`精选题库卡片（2×2，共 ${draft.yikao.cards.length} 张）`} style={{ marginTop: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {draft.yikao.cards.map((c, idx) => (
                <div key={c.id} style={{ padding: 14, borderRadius: 10, border: `1px solid ${c.enabled ? THEME.border : THEME.errorBg}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button style={{ ...styles.btnSecondary, padding: "4px 8px" }} disabled={idx === 0} onClick={() => {
                        const list = [...draft.yikao.cards];
                        [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
                        setDraft({ ...draft, yikao: { ...draft.yikao, cards: list } });
                      }}><ArrowUp size={12} /></button>
                      <button style={{ ...styles.btnSecondary, padding: "4px 8px" }} disabled={idx === draft.yikao.cards.length - 1} onClick={() => {
                        const list = [...draft.yikao.cards];
                        [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
                        setDraft({ ...draft, yikao: { ...draft.yikao, cards: list } });
                      }}><ArrowDown size={12} /></button>
                      <input
                        style={{ ...styles.input, fontWeight: 700, width: 64, textAlign: "center" }}
                        maxLength={2}
                        value={c.seal}
                        onChange={(e) => {
                          const list = [...draft.yikao.cards];
                          list[idx] = { ...c, seal: e.target.value };
                          setDraft({ ...draft, yikao: { ...draft.yikao, cards: list } });
                        }}
                      />
                      <input
                        style={{ ...styles.input, fontWeight: 700, width: 130 }}
                        value={c.title}
                        onChange={(e) => {
                          const list = [...draft.yikao.cards];
                          list[idx] = { ...c, title: e.target.value };
                          setDraft({ ...draft, yikao: { ...draft.yikao, cards: list } });
                        }}
                      />
                      <Badge type={c.enabled ? "success" : "error"}>{c.enabled ? "启用" : "停用"}</Badge>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ToggleSwitch checked={c.enabled} size="sm" onChange={(v) => {
                        const list = [...draft.yikao.cards];
                        list[idx] = { ...c, enabled: v };
                        setDraft({ ...draft, yikao: { ...draft.yikao, cards: list } });
                      }} />
                      <button style={styles.btnDanger} onClick={() => setDraft({ ...draft, yikao: { ...draft.yikao, cards: draft.yikao.cards.filter((x) => x.id !== c.id) } })}>
                        <X size={13} /> 删除
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                    <div>
                      <label style={styles.label}>副标题文案</label>
                      <input style={styles.input} value={c.subtitle} onChange={(e) => {
                        const list = [...draft.yikao.cards];
                        list[idx] = { ...c, subtitle: e.target.value };
                        setDraft({ ...draft, yikao: { ...draft.yikao, cards: list } });
                      }} />
                    </div>
                    <NumField label="单次购买价格" value={c.price} onChange={(v) => {
                      const list = [...draft.yikao.cards];
                      list[idx] = { ...c, price: v };
                      setDraft({ ...draft, yikao: { ...draft.yikao, cards: list } });
                    }} suffix="元（0=免费）" min={0} max={999} />
                    <div>
                      <label style={styles.label}>解锁目标键（Paywall 内容键）</label>
                      <input style={styles.input} value={c.target} onChange={(e) => {
                        const list = [...draft.yikao.cards];
                        list[idx] = { ...c, target: e.target.value };
                        setDraft({ ...draft, yikao: { ...draft.yikao, cards: list } });
                      }} />
                    </div>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <BoolField label="会员权益抵扣" desc="开启后会员免费解锁该卡片" value={c.memberFree} onChange={(v) => {
                      const list = [...draft.yikao.cards];
                      list[idx] = { ...c, memberFree: v };
                      setDraft({ ...draft, yikao: { ...draft.yikao, cards: list } });
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: 14, borderRadius: 10, border: `2px dashed ${THEME.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.textMain, marginBottom: 10 }}>新增精选卡片</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input style={{ ...styles.input, width: 60, textAlign: "center" }} maxLength={2} value={newCard.seal} placeholder="印章" onChange={(e) => setNewCard({ ...newCard, seal: e.target.value })} />
                <input style={{ ...styles.input, width: 130 }} value={newCard.title} placeholder="卡片名称" onChange={(e) => setNewCard({ ...newCard, title: e.target.value })} />
                <input style={{ ...styles.input, width: 140 }} value={newCard.subtitle} placeholder="副标题文案" onChange={(e) => setNewCard({ ...newCard, subtitle: e.target.value })} />
                <input style={{ ...styles.input, width: 100 }} type="number" value={newCard.price} placeholder="价格" onChange={(e) => setNewCard({ ...newCard, price: Number(e.target.value) || 0 })} />
                <button
                  style={{ ...styles.btnPrimary, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                  onClick={() => {
                    if (!newCard.seal.trim() || !newCard.title.trim()) { show("请填写印章字与卡片名称", "error"); return; }
                    const id = "card_" + Date.now().toString(36);
                    setDraft({ ...draft, yikao: { ...draft.yikao, cards: [...draft.yikao.cards, { id, seal: newCard.seal.trim(), title: newCard.title.trim(), subtitle: newCard.subtitle.trim() || "精选内容", price: newCard.price, memberFree: true, target: `yikao_${id}`, enabled: true }] } });
                    setNewCard({ seal: "", title: "", subtitle: "", price: 19.9 });
                    show("已加入，保存后生效", "success");
                  }}
                >
                  <Plus size={14} /> 加入
                </button>
              </div>
            </div>
            <SaveBar module="yikao" summary="更新精选题库卡片" />
          </AdminCard>

          <AdminCard title="题目审核与数据看板（复用统一引擎）" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: THEME.textHint, lineHeight: 1.8 }}>
              医考题目走唯一题库引擎标准流水线：知识点绑定 → 三级去重 → 11项质量闸门 → 人工审核 → 入库。<br />
              题目审核 / 批量上下架 / 质量分：学堂 LOC「<b>题库治理</b>」模块（track=医考筛选）。<br />
              覆盖度 / 正确率 / 错题分布看板：学堂 LOC「<b>健康度看板</b>」模块。<br />
              考纲资料入库：学堂「知识工厂」上传 txt/md 考纲文本 → AI 解析知识点 → 生成题目。
            </div>
          </AdminCard>
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
