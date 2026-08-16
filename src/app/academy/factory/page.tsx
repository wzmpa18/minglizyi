"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import {
  uploadMaterial,
  fetchMaterials,
  fetchCategories,
  TRACK_LIST,
  GRADE_NAMES,
  type MaterialVo,
  type CategoryVo,
} from "@/lib/academyApi";
import { PageLoginGuard } from "@/components/PageLoginGuard";

const BRAND = "#7B2FBE";

const STATUS_NAMES: Record<string, { text: string; color: string }> = {
  pending: { text: "待审核", color: "#f59e0b" },
  parsing: { text: "解析中", color: "#3498db" },
  parsed: { text: "已解析", color: "#7B2FBE" },
  approved: { text: "已入库", color: "#10b981" },
  rejected: { text: "已驳回", color: "#ef4444" },
};

export default function FactoryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"upload" | "mine">("upload");
  const [mine, setMine] = useState<MaterialVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  // 上传表单
  const [title, setTitle] = useState("");
  const [track, setTrack] = useState<string>("zhongyi");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<CategoryVo[]>([]);
  const [format, setFormat] = useState<"text" | "file">("text");
  const [textContent, setTextContent] = useState("");
  const [fileBase64, setFileBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const loadMine = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchMaterials({ mine: true });
      if (r && r.success && r.materials) setMine(r.materials);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "mine") void loadMine();
  }, [tab, loadMine]);

  useEffect(() => {
    setCategory("");
    fetchCategories(track)
      .then((r) => setCategories(r && r.success && r.categories ? r.categories : []))
      .catch(() => setCategories([]));
  }, [track]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      showToast("文件不能超过 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(String(reader.result || "").split(",").pop() || "");
      setFileName(f.name);
    };
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    const t = title.trim();
    if (!t) { showToast("请填写资料标题"); return; }
    if (format === "text" && !textContent.trim()) { showToast("请粘贴文本内容"); return; }
    if (format === "file" && !fileBase64) { showToast("请选择文件"); return; }
    setSubmitting(true);
    try {
      const r = await uploadMaterial({
        title: t,
        track,
        category: category || undefined,
        format: format === "text" ? "text" : "file",
        textContent: format === "text" ? textContent.trim() : undefined,
        fileBase64: format === "file" ? fileBase64 : undefined,
        fileName: format === "file" ? fileName : undefined,
      });
      if (r && r.success) {
        showToast("上传成功，等待 AI 解析与人工审核");
        setTitle(""); setTextContent(""); setFileBase64(""); setFileName("");
        if (fileRef.current) fileRef.current.value = "";
        setTab("mine");
        void loadMine();
      } else {
        showToast((r && (r.error || r.message)) || "上传失败，请重试");
      }
    } catch {
      showToast("网络异常，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title="知识工厂" showBack backUrl="/academy" />

      {/* Tab */}
      <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-white">
        {(["upload", "mine"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="relative flex-1 py-3 text-sm font-semibold"
            style={{ color: tab === k ? BRAND : "#999" }}
          >
            {k === "upload" ? "上传中心" : "我的资料"}
            {tab === k && (
              <div className="absolute bottom-0 left-1/2 h-0.5 -translate-x-1/2 rounded-full" style={{ width: 40, backgroundColor: BRAND }} />
            )}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <div className="space-y-3 px-3 py-3 pb-24">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">资料标题 *</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="如：中医基础理论 · 阴阳学说讲义"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none"
              style={{ outline: "none" }}
            />
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">所属板块 *</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TRACK_LIST.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTrack(t.key)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{ backgroundColor: track === t.key ? BRAND : "#f0f0f0", color: track === t.key ? "#fff" : "#666" }}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-700">所属类目</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setCategory("")}
                className="rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: category === "" ? BRAND : "#f0f0f0", color: category === "" ? "#fff" : "#666" }}
              >
                不分类
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.name)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{ backgroundColor: category === c.name ? BRAND : "#f0f0f0", color: category === c.name ? "#fff" : "#666" }}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {categories.length === 0 && (
              <p className="mt-2 text-[10px] text-gray-400">该板块暂无类目，可到审核工作台的类目管理中添加</p>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">资料形式 *</p>
            <div className="mt-2 flex gap-2">
              {([["text", "粘贴文本"], ["file", "上传文件"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFormat(k)}
                  className="flex-1 rounded-xl py-2.5 text-xs font-semibold"
                  style={{ backgroundColor: format === k ? BRAND : "#f5f5f5", color: format === k ? "#fff" : "#666" }}
                >
                  {label}
                </button>
              ))}
            </div>
            {format === "text" ? (
              <div className="mt-3">
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="粘贴典籍原文、讲义、学习笔记等文本内容（AI 将解析为结构化知识点）"
                  className="h-40 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed focus:outline-none"
                  style={{ outline: "none" }}
                />
                <p className="mt-1 text-right text-[10px] text-gray-400">{textContent.length} 字</p>
              </div>
            ) : (
              <div className="mt-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.md,.csv,.json"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed py-6 text-xs text-gray-500"
                  style={{ borderColor: "#e0d4f0" }}
                >
                  {fileName ? `已选择：${fileName}` : "点击选择文件（.txt / .md / .csv / .json，≤2MB）"}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-amber-50 px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-amber-700">
              提示：资料上传后由 AI 自动解析为知识点与题目，经管理员审核（S/A/B/C 分级）后进入公共知识库；优质贡献将获得积分奖励。
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-xl py-3 text-sm font-bold text-white active:opacity-90"
            style={{ backgroundColor: submitting ? "#c9b3e0" : BRAND }}
          >
            {submitting ? "上传中..." : "提交资料"}
          </button>

          <button
            onClick={() => router.push("/academy/factory/review")}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-xs text-gray-500 active:bg-gray-50"
          >
            管理员入口 · 审核工作台 →
          </button>
        </div>
      ) : (
        <div className="px-3 py-3 pb-24">
          {loading ? (
            <div className="rounded-2xl bg-white p-6 text-center text-xs text-gray-400 shadow-sm">加载中...</div>
          ) : mine.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-500">暂无上传资料</p>
              <p className="mt-1 text-xs text-gray-400">去上传中心提交第一份资料吧</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {mine.map((m) => {
                const st = STATUS_NAMES[m.status] || { text: m.status, color: "#999" };
                return (
                  <div key={m.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-gray-800">{m.title}</p>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: st.color + "18", color: st.color }}
                      >
                        {st.text}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-400">
                      {TRACK_LIST.find((t) => t.key === m.track)?.name || m.trackName || m.track}
                      {m.category ? ` · ${m.category}` : ""}
                      {m.grade ? ` · ${GRADE_NAMES[m.grade] || m.grade}` : ""}
                      {` · ${new Date(m.createdAt).toLocaleDateString("zh-CN")}`}
                    </p>
                    {m.parseNote && (
                      <p className="mt-2 rounded-lg bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-500">
                        解析结果：{m.parseNote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
