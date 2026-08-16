"use client";

// ============================================================================
// P6-J 学习运营中心（LOC）- v25.0.22
// 五大冻结原则之「学习运营后台原则」：所有学习体系配置可视化，实时生效，操作留痕
// 数据看板 / 考试配置 / 积分分佣 / 机构档位 / 机构管理 / 全覆盖出题 / 操作日志
// ============================================================================

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchLocConfig,
  updateLocConfig,
  fetchLocDashboard,
  fetchLocOpLogs,
  fetchAllOrgsForAdmin,
  reviewOrg,
  fetchGenTasks,
  startFullGenQuestions,
  fetchCategories,
  setAcademyAdminKey,
  getAcademyAdminKey,
  TRACK_LIST,
  LEVEL_NAMES,
  type LocDashboard,
  type OrgVo,
  type GenTaskVo,
} from "@/lib/academyApi";

const BRAND = "#7B2FBE";

type TabKey = "dashboard" | "exam" | "rules" | "tiers" | "orgs" | "fullgen" | "logs";

const TABS: Array<{ key: TabKey; name: string }> = [
  { key: "dashboard", name: "数据看板" },
  { key: "exam", name: "考试配置" },
  { key: "rules", name: "积分与分佣" },
  { key: "tiers", name: "机构档位" },
  { key: "orgs", name: "机构管理" },
  { key: "fullgen", name: "全覆盖出题" },
  { key: "logs", name: "操作日志" },
];

interface ExamLevelCfg {
  total: number; easy: number; medium: number; hard: number;
  single: number; multi: number; judge: number;
  fill?: number; qa?: number; case?: number;
  minutes: number; passScore: number;
}
type ExamCfg = Record<"1" | "2" | "3", ExamLevelCfg>;

interface OrgTier { key: string; name: string; price: number; memberLimit: number; features: string[] }
interface CommissionRules { inviteRegisterPoints: number; memberFirstPayRate: number; memberRenewPayRate: number }
interface PointsRules { studyCheckin: number; questionCorrect: number; examPass: number; inviteRegister: number; materialApproved: number }

const EXAM_FIELDS: Array<{ k: keyof ExamLevelCfg; label: string }> = [
  { k: "total", label: "总题量" },
  { k: "easy", label: "简单" }, { k: "medium", label: "中等" }, { k: "hard", label: "困难" },
  { k: "single", label: "单选" }, { k: "multi", label: "多选" }, { k: "judge", label: "判断" },
  { k: "fill", label: "填空" }, { k: "qa", label: "问答" }, { k: "case", label: "案例" },
  { k: "minutes", label: "时长(分)" }, { k: "passScore", label: "及格分" },
];

const STATUS_BADGE: Record<string, { text: string; color: string }> = {
  pending: { text: "待审核", color: "#f59e0b" },
  active: { text: "已开通", color: "#10b981" },
  rejected: { text: "已驳回", color: "#ef4444" },
  running: { text: "进行中", color: "#3498db" },
  done: { text: "已完成", color: "#10b981" },
  failed: { text: "失败", color: "#ef4444" },
};

export default function LocPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const [dash, setDash] = useState<LocDashboard | null>(null);
  const [examCfg, setExamCfg] = useState<ExamCfg | null>(null);
  const [commission, setCommission] = useState<CommissionRules | null>(null);
  const [pointsRules, setPointsRules] = useState<PointsRules | null>(null);
  const [tiers, setTiers] = useState<OrgTier[] | null>(null);
  const [orgs, setOrgs] = useState<OrgVo[]>([]);
  const [tasks, setTasks] = useState<GenTaskVo[]>([]);
  const [logs, setLogs] = useState<Array<{ id: string; adminId: string; action: string; target: string; detail: string; createdAt: string }>>([]);

  // 全覆盖出题表单
  const [genTrack, setGenTrack] = useState("zhongyi");
  const [genCategory, setGenCategory] = useState("");
  const [genLevel, setGenLevel] = useState(1);
  const [cats, setCats] = useState<Array<{ id: string; name: string }>>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    const k = getAcademyAdminKey();
    if (k) { setAdminKey(k); setAuthed(true); }
  }, []);

  const handleAuth = () => {
    const k = adminKey.trim();
    if (!k) return;
    setAcademyAdminKey(k);
    setAuthed(true);
    showToast("已进入学习运营中心");
  };

  const loadConfig = useCallback(async () => {
    const r = await fetchLocConfig();
    if (r && r.success && r.config) {
      const c = r.config as Record<string, unknown>;
      if (c.exam_config) setExamCfg(c.exam_config as ExamCfg);
      if (c.commission_rules) setCommission(c.commission_rules as CommissionRules);
      if (c.points_rules) setPointsRules(c.points_rules as PointsRules);
      if (c.org_tiers) setTiers(c.org_tiers as OrgTier[]);
    } else if (r && r.error) {
      showToast(r.error);
    }
  }, []);

  const loadTab = useCallback(async () => {
    if (!authed) return;
    try {
      if (tab === "dashboard") {
        const r = await fetchLocDashboard();
        if (r && r.success && r.dashboard) setDash(r.dashboard);
      } else if (tab === "exam" || tab === "rules" || tab === "tiers") {
        await loadConfig();
      } else if (tab === "orgs") {
        const r = await fetchAllOrgsForAdmin();
        if (r && r.success && r.orgs) setOrgs(r.orgs);
      } else if (tab === "fullgen") {
        const r = await fetchGenTasks();
        if (r && r.success && r.tasks) setTasks(r.tasks);
      } else if (tab === "logs") {
        const r = await fetchLocOpLogs();
        if (r && r.success && r.logs) setLogs(r.logs);
      }
    } catch { showToast("加载失败"); }
  }, [authed, tab, loadConfig]);

  useEffect(() => { void loadTab(); }, [loadTab]);

  // 出题任务轮询（有进行中任务时每 5 秒刷新）
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (authed && tab === "fullgen" && tasks.some((t) => t.status === "running")) {
      pollRef.current = setInterval(async () => {
        const r = await fetchGenTasks();
        if (r && r.success && r.tasks) setTasks(r.tasks);
      }, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [authed, tab, tasks]);

  useEffect(() => {
    if (authed && tab === "fullgen") {
      setGenCategory("");
      fetchCategories(genTrack)
        .then((r) => setCats(r && r.success && r.categories ? r.categories : []))
        .catch(() => setCats([]));
    }
  }, [authed, tab, genTrack]);

  const saveCfg = async (key: string, value: unknown, label: string) => {
    setBusy(true);
    try {
      const r = await updateLocConfig(key, value);
      showToast(r && r.success ? `${label}已保存，实时生效` : (r && r.error) || "保存失败");
      if (r && r.success) await loadConfig();
    } catch { showToast("网络异常"); } finally { setBusy(false); }
  };

  const handleOrgReview = async (id: string, name: string, action: "approve" | "reject") => {
    let tier = "";
    if (action === "approve" && tiers) {
      const opts = tiers.map((t) => t.key).join(",");
      tier = (window.prompt(`为「${name}」选择档位（${opts}，默认免费档）：`, "free") || "free").trim();
    }
    if (!window.confirm(`确认${action === "approve" ? "通过" : "驳回"}机构「${name}」？`)) return;
    setBusy(true);
    try {
      const r = await reviewOrg(id, action, tier || undefined);
      showToast(r && r.success ? "已处理" : (r && r.error) || "操作失败");
      await loadTab();
    } catch { showToast("网络异常"); } finally { setBusy(false); }
  };

  const handleFullGen = async () => {
    setBusy(true);
    try {
      const r = await startFullGenQuestions({ track: genTrack, category: genCategory || undefined, level: genLevel });
      if (r && r.success) {
        showToast("全覆盖出题任务已启动");
        const t = await fetchGenTasks();
        if (t && t.success && t.tasks) setTasks(t.tasks);
      } else {
        showToast((r && r.error) || "启动失败");
      }
    } catch { showToast("网络异常"); } finally { setBusy(false); }
  };

  const num = (v: unknown, d = 0) => (typeof v === "number" && !Number.isNaN(v) ? v : d);

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
          <p className="text-lg font-bold" style={{ color: BRAND }}>学习运营中心</p>
          <p className="mt-1 text-xs text-gray-500">P6-J Learning Operation Center · 需要管理员密钥</p>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            placeholder="输入学堂管理员密钥（ADMIN_API_KEY）"
            className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
            style={{ outline: "none" }}
          />
          <button onClick={handleAuth} className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold text-white" style={{ backgroundColor: BRAND }}>
            进入运营中心
          </button>
          <p className="mt-3 text-[10px] leading-relaxed text-gray-400">
            密钥仅保存在当前会话（sessionStorage），关闭浏览器后自动失效；与审核工作台共用同一密钥。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-base font-bold" style={{ color: BRAND }}>学习运营中心</p>
            <p className="text-[10px] text-gray-400">五大冻结原则 · 配置实时生效 · 操作全程留痕</p>
          </div>
          <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-green-600">管理员已登录</span>
        </div>
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: tab === t.key ? BRAND : "#f0f0f0", color: tab === t.key ? "#fff" : "#666" }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4">
        {/* ============ 数据看板 ============ */}
        {tab === "dashboard" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {[
                ["资料", dash?.materials], ["知识点", dash?.knowledgePoints], ["上架题目", dash?.questions],
                ["考试场次", dash?.exams], ["通过场次", dash?.examPasses], ["证书", dash?.certificates],
                ["学习打卡", dash?.checkins], ["活跃机构", dash?.orgs], ["机构成员", dash?.orgMembers], ["AI 调用", dash?.aiCalls],
              ].map(([label, v]) => (
                <div key={String(label)} className="rounded-xl bg-white p-3 text-center shadow-sm">
                  <p className="text-xl font-bold" style={{ color: BRAND }}>{v ?? "-"}</p>
                  <p className="mt-0.5 text-[10px] text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-gray-700">AI 调用监控（永久缓存原则）</p>
              <p className="mt-1 text-[11px] text-gray-400">
                累计 tokens：输入 {dash?.aiTokensIn ?? 0} / 输出 {dash?.aiTokensOut ?? 0}；缓存命中内容重复访问不计入 AI 调用
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-gray-400">
                    <tr><th className="py-1.5">场景</th><th>调用次数</th><th>tokens</th></tr>
                  </thead>
                  <tbody>
                    {(dash?.aiByScene || []).map((s) => (
                      <tr key={s.scene} className="border-t border-gray-50">
                        <td className="py-1.5 font-medium text-gray-700">{s.scene}</td>
                        <td>{s.calls}</td>
                        <td className="text-gray-500">{s.tokens}</td>
                      </tr>
                    ))}
                    {(dash?.aiByScene || []).length === 0 && (
                      <tr><td colSpan={3} className="py-3 text-center text-gray-300">暂无 AI 调用记录</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-gray-700">近 30 天 AI 调用趋势</p>
              <div className="mt-3 space-y-1.5">
                {(dash?.aiByDay || []).slice(-15).map((d) => {
                  const max = Math.max(...(dash?.aiByDay || [{ calls: 1 }]).map((x) => x.calls), 1);
                  return (
                    <div key={d.day} className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="w-16 shrink-0">{d.day.slice(5)}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded bg-gray-100">
                        <div className="h-full rounded" style={{ width: `${(d.calls / max) * 100}%`, backgroundColor: BRAND }} />
                      </div>
                      <span className="w-8 text-right">{d.calls}</span>
                    </div>
                  );
                })}
                {(dash?.aiByDay || []).length === 0 && <p className="py-3 text-center text-xs text-gray-300">暂无数据</p>}
              </div>
            </div>
          </div>
        )}

        {/* ============ 考试配置 ============ */}
        {tab === "exam" && examCfg && (
          <div className="space-y-4">
            <p className="text-[11px] text-gray-500">各等级试卷结构、分值比例、时长与及格线；保存后立即生效于下一场考试组卷，无需重启。</p>
            {(["1", "2", "3"] as const).map((lv) => (
              <div key={lv} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-sm font-bold text-gray-700">{lv} 级 · {LEVEL_NAMES[Number(lv)]}试卷</p>
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {EXAM_FIELDS.map(({ k, label }) => (
                    <label key={String(k)} className="block">
                      <span className="text-[10px] text-gray-400">{label}</span>
                      <input
                        type="number"
                        value={num(examCfg[lv][k])}
                        onChange={(e) => setExamCfg({ ...examCfg, [lv]: { ...examCfg[lv], [k]: Number(e.target.value) || 0 } })}
                        className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                        style={{ outline: "none" }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              disabled={busy}
              onClick={() => saveCfg("exam_config", examCfg, "考试配置")}
              className="w-full rounded-xl py-3 text-sm font-bold text-white"
              style={{ backgroundColor: busy ? "#c9b3e0" : BRAND }}
            >
              保存考试配置（实时生效）
            </button>
          </div>
        )}

        {/* ============ 积分与分佣 ============ */}
        {tab === "rules" && commission && pointsRules && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-gray-700">积分规则（points_rules）</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {([
                  ["studyCheckin", "学习打卡"], ["questionCorrect", "答对题目"], ["examPass", "考试通过"],
                  ["inviteRegister", "邀请注册"], ["materialApproved", "资料入库"],
                ] as const).map(([k, label]) => (
                  <label key={k} className="block">
                    <span className="text-[10px] text-gray-400">{label}</span>
                    <input
                      type="number"
                      value={num(pointsRules[k])}
                      onChange={(e) => setPointsRules({ ...pointsRules, [k]: Number(e.target.value) || 0 })}
                      className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                      style={{ outline: "none" }}
                    />
                  </label>
                ))}
              </div>
              <button disabled={busy} onClick={() => saveCfg("points_rules", pointsRules, "积分规则")} className="mt-3 w-full rounded-xl py-2.5 text-xs font-bold text-white" style={{ backgroundColor: BRAND }}>
                保存积分规则
              </button>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-gray-700">分佣规则（commission_rules）</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {([
                  ["inviteRegisterPoints", "邀请注册积分"],
                  ["memberFirstPayRate", "会员首充分佣"],
                  ["memberRenewPayRate", "会员续费分佣"],
                ] as const).map(([k, label]) => (
                  <label key={k} className="block">
                    <span className="text-[10px] text-gray-400">{label}{k.includes("Rate") ? "（0-1）" : ""}</span>
                    <input
                      type="number"
                      step="0.05"
                      value={num(commission[k])}
                      onChange={(e) => setCommission({ ...commission, [k]: Number(e.target.value) || 0 })}
                      className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                      style={{ outline: "none" }}
                    />
                  </label>
                ))}
              </div>
              <button disabled={busy} onClick={() => saveCfg("commission_rules", commission, "分佣规则")} className="mt-3 w-full rounded-xl py-2.5 text-xs font-bold text-white" style={{ backgroundColor: BRAND }}>
                保存分佣规则
              </button>
            </div>
          </div>
        )}

        {/* ============ 机构档位 ============ */}
        {tab === "tiers" && tiers && (
          <div className="space-y-4">
            <p className="text-[11px] text-gray-500">机构入驻收费档位全部后台可配置，不写死任何数值；公益机构审核通过自动使用 free 档。</p>
            <div className="space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="block">
                      <span className="text-[10px] text-gray-400">档位标识</span>
                      <input value={t.key} onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, key: e.target.value.trim() } : x))} className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs" style={{ outline: "none" }} />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-gray-400">档位名称</span>
                      <input value={t.name} onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs" style={{ outline: "none" }} />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-gray-400">年费（元）</span>
                      <input type="number" value={num(t.price)} onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, price: Number(e.target.value) || 0 } : x))} className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs" style={{ outline: "none" }} />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-gray-400">成员上限</span>
                      <input type="number" value={num(t.memberLimit)} onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, memberLimit: Number(e.target.value) || 0 } : x))} className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs" style={{ outline: "none" }} />
                    </label>
                  </div>
                  <label className="mt-2 block">
                    <span className="text-[10px] text-gray-400">权益（逗号分隔）</span>
                    <input value={(t.features || []).join(",")} onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, features: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : x))} className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs" style={{ outline: "none" }} />
                  </label>
                  <button onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="mt-2 text-[10px] text-red-400">删除此档位</button>
                </div>
              ))}
            </div>
            <button onClick={() => setTiers([...tiers, { key: "", name: "新档位", price: 0, memberLimit: 50, features: [] }])} className="w-full rounded-xl border-2 border-dashed py-2.5 text-xs text-gray-500" style={{ borderColor: "#e0d4f0" }}>
              + 新增档位
            </button>
            <button disabled={busy} onClick={() => saveCfg("org_tiers", tiers, "机构档位")} className="w-full rounded-xl py-3 text-sm font-bold text-white" style={{ backgroundColor: busy ? "#c9b3e0" : BRAND }}>
              保存机构档位（实时生效）
            </button>
          </div>
        )}

        {/* ============ 机构管理 ============ */}
        {tab === "orgs" && (
          <div className="space-y-2">
            <p className="text-[11px] text-gray-500">机构入驻审核、档位配置；通过后机构获得独立学习空间（资料/题库/考试/成员/排行/收益）。</p>
            {orgs.map((o) => {
              const st = STATUS_BADGE[o.status] || { text: o.status, color: "#999" };
              return (
                <div key={o.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{o.name}</p>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {o.type === "public" ? "公益非营利" : "商业培训"} · 档位 {o.tier || "-"} · 成员 {o.memberCount ?? 0}/{o.memberLimit}
                      </p>
                      {o.intro && <p className="mt-1 line-clamp-2 text-[11px] text-gray-400">{o.intro}</p>}
                    </div>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${st.color}1a`, color: st.color }}>{st.text}</span>
                  </div>
                  {o.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <button disabled={busy} onClick={() => handleOrgReview(o.id, o.name, "approve")} className="flex-1 rounded-lg py-2 text-xs font-bold text-white" style={{ backgroundColor: "#10b981" }}>通过并开通</button>
                      <button disabled={busy} onClick={() => handleOrgReview(o.id, o.name, "reject")} className="flex-1 rounded-lg border border-red-200 py-2 text-xs font-bold text-red-500">驳回</button>
                    </div>
                  )}
                </div>
              );
            })}
            {orgs.length === 0 && <div className="rounded-2xl bg-white p-8 text-center text-xs text-gray-400 shadow-sm">暂无机构入驻申请</div>}
          </div>
        )}

        {/* ============ 全覆盖出题 ============ */}
        {tab === "fullgen" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-gray-700">启动全覆盖出题任务</p>
              <p className="mt-1 text-[11px] text-gray-400">遍历类目下全部已审核知识点，逐组生成题目（每组至少 1 题/知识点）；已有题目的知识点自动跳过，零重复 AI 调用。</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="text-[10px] text-gray-400">板块</span>
                  <select value={genTrack} onChange={(e) => setGenTrack(e.target.value)} className="mt-0.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs" style={{ outline: "none" }}>
                    {TRACK_LIST.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] text-gray-400">类目（空=全板块）</span>
                  <select value={genCategory} onChange={(e) => setGenCategory(e.target.value)} className="mt-0.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs" style={{ outline: "none" }}>
                    <option value="">全板块</option>
                    {cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] text-gray-400">目标等级</span>
                  <select value={genLevel} onChange={(e) => setGenLevel(Number(e.target.value))} className="mt-0.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs" style={{ outline: "none" }}>
                    <option value={1}>1 级 · 初级</option>
                    <option value={2}>2 级 · 中级</option>
                    <option value={3}>3 级 · 高级</option>
                  </select>
                </label>
              </div>
              <button disabled={busy} onClick={handleFullGen} className="mt-3 w-full rounded-xl py-2.5 text-xs font-bold text-white" style={{ backgroundColor: busy ? "#c9b3e0" : BRAND }}>
                启动全覆盖出题（题目覆盖全部知识点）
              </button>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-gray-700">任务进度（进行中每 5 秒自动刷新）</p>
              <div className="mt-3 space-y-2">
                {tasks.map((t) => {
                  const st = STATUS_BADGE[t.status] || { text: t.status, color: "#999" };
                  const pct = t.totalGroups > 0 ? Math.round((t.doneGroups / t.totalGroups) * 100) : 0;
                  return (
                    <div key={t.id} className="rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700">
                          #{t.id} · {TRACK_LIST.find((x) => x.key === t.track)?.name || t.track}
                          {t.category ? ` / ${t.category}` : ""} · {LEVEL_NAMES[t.level]}级
                        </span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${st.color}1a`, color: st.color }}>{st.text}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded bg-gray-100">
                        <div className="h-full rounded transition-all" style={{ width: `${pct}%`, backgroundColor: BRAND }} />
                      </div>
                      <p className="mt-1.5 text-[10px] text-gray-500">
                        进度 {t.doneGroups}/{t.totalGroups} 组 · 覆盖知识点 {t.coveredKp}/{t.totalKp} · 生成 {t.createdQ} 题 · 缓存跳过 {t.skippedCached}
                        {t.error ? ` · 错误：${t.error}` : ""}
                      </p>
                    </div>
                  );
                })}
                {tasks.length === 0 && <p className="py-4 text-center text-xs text-gray-300">暂无任务记录</p>}
              </div>
            </div>
          </div>
        )}

        {/* ============ 操作日志 ============ */}
        {tab === "logs" && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-gray-700">配置操作日志（最近 100 条，可追溯）</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-gray-400">
                  <tr><th className="py-1.5">时间</th><th>操作人</th><th>动作</th><th>对象</th><th>内容</th></tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-t border-gray-50">
                      <td className="whitespace-nowrap py-1.5 text-gray-500">{l.createdAt}</td>
                      <td>{l.adminId}</td>
                      <td className="font-medium" style={{ color: BRAND }}>{l.action}</td>
                      <td className="text-gray-600">{l.target}</td>
                      <td className="max-w-[280px] truncate text-gray-400" title={l.detail}>{l.detail}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-gray-300">暂无操作记录</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900/85 px-4 py-2 text-xs text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
