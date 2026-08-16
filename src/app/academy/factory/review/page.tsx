"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BrandHeader } from "@/components/shared";
import {
  fetchMaterials,
  reviewMaterial,
  parseMaterial,
  fetchKnowledge,
  reviewKnowledge,
  fetchQuestions,
  reviewQuestion,
  generateQuestions,
  fetchCategories,
  createCategory,
  deleteCategory,
  setAcademyAdminKey,
  getAcademyAdminKey,
  TRACK_LIST,
  TYPE_NAMES,
  GRADE_NAMES,
  type MaterialVo,
  type KnowledgeVo,
  type QuestionVo,
} from "@/lib/academyApi";
import { PageLoginGuard } from "@/components/PageLoginGuard";

const BRAND = "#7B2FBE";

type TabKey = "materials" | "knowledge" | "questions";

export default function ReviewWorkbenchPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<TabKey>("materials");
  const [materials, setMaterials] = useState<MaterialVo[]>([]);
  const [points, setPoints] = useState<KnowledgeVo[]>([]);
  const [questions, setQuestions] = useState<QuestionVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  // 出题面板
  const [genTrack, setGenTrack] = useState("zhongyi");
  const [genCategory, setGenCategory] = useState("");
  const [genLevel, setGenLevel] = useState(1);
  const [genCount, setGenCount] = useState(10);
  const [cats, setCats] = useState<Array<{ id: string; name: string }>>([]);
  const [newCatName, setNewCatName] = useState("");
  const [showCatMgr, setShowCatMgr] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  useEffect(() => {
    const k = getAcademyAdminKey();
    if (k) {
      setAdminKey(k);
      setAuthed(true);
    }
  }, []);

  const loadCats = useCallback(async () => {
    try {
      const r = await fetchCategories(genTrack);
      setCats(r && r.success && r.categories ? r.categories : []);
    } catch { setCats([]); }
  }, [genTrack]);

  useEffect(() => {
    setGenCategory("");
    if (authed) void loadCats();
  }, [authed, loadCats]);

  const handleAddCat = async () => {
    const name = newCatName.trim();
    if (!name) { showToast("请填写类目名称"); return; }
    setBusy(true);
    try {
      const r = await createCategory(genTrack, name);
      if (r && r.success) {
        showToast("类目已创建");
        setNewCatName("");
        await loadCats();
      } else {
        showToast((r && r.error) || "创建失败");
      }
    } catch {
      showToast("网络异常");
    } finally {
      setBusy(false);
    }
  };

  const handleDelCat = async (id: string, name: string) => {
    if (!window.confirm(`确认删除类目「${name}」？`)) return;
    setBusy(true);
    try {
      const r = await deleteCategory(id);
      if (r && r.success) {
        showToast("已删除");
        if (genCategory === name) setGenCategory("");
        await loadCats();
      } else {
        showToast((r && r.error) || "删除失败");
      }
    } catch {
      showToast("网络异常");
    } finally {
      setBusy(false);
    }
  };

  const load = useCallback(async () => {
    if (!authed) return;
    setLoading(true);
    try {
      if (tab === "materials") {
        const r = await fetchMaterials({ status: "pending" });
        if (r && r.success && r.materials) setMaterials(r.materials);
      } else if (tab === "knowledge") {
        const r = await fetchKnowledge({ status: "pending" });
        if (r && r.success && r.points) setPoints(r.points);
      } else {
        const r = await fetchQuestions({ status: "pending" });
        if (r && r.success && r.questions) setQuestions(r.questions);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [authed, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAuth = () => {
    const k = adminKey.trim();
    if (!k) return;
    setAcademyAdminKey(k);
    setAuthed(true);
    showToast("已启用管理员模式");
  };

  const handleMaterial = async (id: string, action: "parse" | "approve" | "reject") => {
    setBusy(true);
    try {
      if (action === "parse") {
        showToast("AI 解析已启动，请稍后刷新查看");
        await parseMaterial(id);
      } else {
        const grade = action === "approve" ? (window.prompt("资料分级（S/A/B/C，默认 B）：", "B") || "B").toUpperCase() : undefined;
        const r = await reviewMaterial(id, action, grade);
        showToast(r && r.success ? (action === "approve" ? `已入库（${grade}）` : "已驳回") : "操作失败");
      }
      await load();
    } catch {
      showToast("操作异常");
    } finally {
      setBusy(false);
    }
  };

  const handleKnowledge = async (id: string, action: "approve" | "reject") => {
    setBusy(true);
    try {
      const r = await reviewKnowledge(id, action);
      showToast(r && r.success ? (action === "approve" ? "知识点已通过" : "已驳回") : "操作失败");
      await load();
    } catch {} finally {
      setBusy(false);
    }
  };

  const handleQuestion = async (id: string, action: "approve" | "reject") => {
    setBusy(true);
    try {
      const r = await reviewQuestion(id, action);
      showToast(r && r.success ? (action === "approve" ? "题目已上架" : "已驳回") : "操作失败");
      await load();
    } catch {} finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    setBusy(true);
    showToast("AI 出题中，约需 1-2 分钟...");
    try {
      const r = await generateQuestions({ track: genTrack, level: genLevel, count: genCount, category: genCategory || undefined });
      if (r && r.success) {
        showToast(`已生成 ${r.created || 0} 道题，请到题目审核处理`);
        if (tab === "questions") await load();
      } else {
        showToast((r && r.error) || "出题失败");
      }
    } catch {
      showToast("网络异常");
    } finally {
      setBusy(false);
    }
  };

  if (!authed) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <PageLoginGuard />
        <BrandHeader title="审核工作台" showBack backUrl="/academy/factory" />
        <div className="px-3 py-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-gray-800">管理员验证</p>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
              输入学堂管理员密钥（ADMIN_API_KEY）以进入审核工作台；密钥仅保存在当前会话，关闭浏览器后自动失效。
            </p>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="请输入管理员密钥"
              className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
              style={{ outline: "none" }}
            />
            <button
              onClick={handleAuth}
              className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white"
              style={{ backgroundColor: BRAND }}
            >
              进入工作台
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title="审核工作台" showBack backUrl="/academy/factory" />

      {/* Tab */}
      <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-white">
        {([["materials", "资料审核"], ["knowledge", "知识点审核"], ["questions", "题目审核"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="relative flex-1 py-3 text-[13px] font-semibold"
            style={{ color: tab === k ? BRAND : "#999" }}
          >
            {label}
            {tab === k && (
              <div className="absolute bottom-0 left-1/2 h-0.5 -translate-x-1/2 rounded-full" style={{ width: 32, backgroundColor: BRAND }} />
            )}
          </button>
        ))}
      </div>

      <div className="px-3 py-3 pb-24">
        {/* 类目管理（仅题目页显示） */}
        {tab === "questions" && (
          <div className="mb-3 rounded-2xl bg-white p-4 shadow-sm">
            <button
              onClick={() => setShowCatMgr(!showCatMgr)}
              className="flex w-full items-center justify-between"
            >
              <div className="text-left">
                <p className="text-sm font-bold text-gray-800">类目管理</p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {TRACK_LIST.find((t) => t.key === genTrack)?.name} · {cats.length} 个类目
                </p>
              </div>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                className="transition-transform"
                style={{ transform: showCatMgr ? "rotate(180deg)" : "none" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showCatMgr && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="flex gap-2">
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    maxLength={40}
                    placeholder={`在${TRACK_LIST.find((t) => t.key === genTrack)?.name || ""}板块下新增类目`}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs"
                    style={{ outline: "none" }}
                  />
                  <button
                    onClick={handleAddCat}
                    disabled={busy}
                    className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white"
                    style={{ backgroundColor: busy ? "#c9b3e0" : BRAND }}
                  >
                    新增
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cats.length === 0 ? (
                    <p className="text-[11px] text-gray-400">暂无类目</p>
                  ) : cats.map((c) => (
                    <span
                      key={c.id}
                      className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600"
                    >
                      {c.name}
                      <button
                        onClick={() => handleDelCat(c.id, c.name)}
                        disabled={busy}
                        className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-300 text-[9px] leading-none text-white"
                        aria-label={`删除${c.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI 出题面板（仅题目页显示） */}
        {tab === "questions" && (
          <div className="mb-3 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-gray-800">AI 出题</p>
            <p className="mt-0.5 text-[11px] text-gray-400">从已入库知识点自动生成题目（生成后需人工审核上架）</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={genTrack}
                onChange={(e) => setGenTrack(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs"
              >
                {TRACK_LIST.map((t) => (
                  <option key={t.key} value={t.key}>{t.name}</option>
                ))}
              </select>
              <select
                value={genCategory}
                onChange={(e) => setGenCategory(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs"
              >
                <option value="">全部类目</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select
                value={genLevel}
                onChange={(e) => setGenLevel(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs"
              >
                <option value={1}>初级</option>
                <option value={2}>中级</option>
                <option value={3}>高级</option>
              </select>
              <select
                value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs"
              >
                {[5, 10, 20].map((n) => (
                  <option key={n} value={n}>{n} 题</option>
                ))}
              </select>
              <button
                onClick={handleGenerate}
                disabled={busy}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                style={{ backgroundColor: busy ? "#c9b3e0" : BRAND }}
              >
                开始生成
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-xs text-gray-400 shadow-sm">加载中...</div>
        ) : tab === "materials" ? (
          materials.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-500">没有待审核资料</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {materials.map((m) => (
                <div key={m.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold leading-snug text-gray-800">{m.title}</p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    {TRACK_LIST.find((t) => t.key === m.track)?.name || m.track} · {m.format} · 上传者 {m.uploaderName || m.uploaderId}
                  </p>
                  {m.textPreview && (
                    <p className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-500">
                      {m.textPreview}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleMaterial(m.id, "parse")} disabled={busy} className="flex-1 rounded-lg bg-gray-100 py-2 text-xs font-semibold text-gray-600">
                      AI 解析
                    </button>
                    <button onClick={() => handleMaterial(m.id, "approve")} disabled={busy} className="flex-1 rounded-lg py-2 text-xs font-bold text-white" style={{ backgroundColor: "#10b981" }}>
                      通过入库
                    </button>
                    <button onClick={() => handleMaterial(m.id, "reject")} disabled={busy} className="flex-1 rounded-lg py-2 text-xs font-semibold text-white" style={{ backgroundColor: "#ef4444" }}>
                      驳回
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === "knowledge" ? (
          points.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-500">没有待审核知识点</p>
              <p className="mt-1 text-xs text-gray-400">先在资料审核中执行 AI 解析</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {points.map((p) => (
                <div key={p.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold leading-snug text-gray-800">{p.title}</p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    {TRACK_LIST.find((t) => t.key === p.track)?.name || p.track}
                    {p.chapter ? ` · ${p.chapter}` : ""}
                  </p>
                  <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-600">
                    {p.content}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleKnowledge(p.id, "approve")} disabled={busy} className="flex-1 rounded-lg py-2 text-xs font-bold text-white" style={{ backgroundColor: "#10b981" }}>
                      通过
                    </button>
                    <button onClick={() => handleKnowledge(p.id, "reject")} disabled={busy} className="flex-1 rounded-lg py-2 text-xs font-semibold text-white" style={{ backgroundColor: "#ef4444" }}>
                      驳回
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : questions.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">没有待审核题目</p>
            <p className="mt-1 text-xs text-gray-400">使用上方 AI 出题面板生成题目</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {questions.map((q) => (
              <div key={q.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: BRAND + "15", color: BRAND }}>
                    {TYPE_NAMES[q.type] || q.type}
                  </span>
                  <span className="text-[10px] text-gray-400">{q.difficulty}</span>
                </div>
                <p className="mt-2 text-sm font-semibold leading-snug text-gray-800">{q.stem}</p>
                {q.options.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {q.options.map((o, i) => (
                      <p key={i} className="text-[12px] text-gray-600">{String.fromCharCode(65 + i)}. {o}</p>
                    ))}
                  </div>
                )}
                {q.answer && (
                  <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-[11px] text-emerald-700">参考答案：{q.answer}</p>
                )}
                {q.analysis && (
                  <p className="mt-1 rounded-lg bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-500">解析：{q.analysis}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => handleQuestion(q.id, "approve")} disabled={busy} className="flex-1 rounded-lg py-2 text-xs font-bold text-white" style={{ backgroundColor: "#10b981" }}>
                    上架
                  </button>
                  <button onClick={() => handleQuestion(q.id, "reject")} disabled={busy} className="flex-1 rounded-lg py-2 text-xs font-semibold text-white" style={{ backgroundColor: "#ef4444" }}>
                    驳回
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => void load()}
          className="mt-4 w-full rounded-xl border border-gray-200 bg-white py-2.5 text-xs text-gray-500 active:bg-gray-50"
        >
          刷新列表
        </button>
      </div>

      {toast && (
        <div
          className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs text-white shadow-lg"
          style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
        >
          {toast}
        </div>
      )}

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
