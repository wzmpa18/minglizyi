"use client";
import {InterfaceButton as Button,InterfaceLabel as Label,InterfaceOption as Option} from "@/components/InterfaceControls";

import { SectionGate } from "@/components/SectionGate";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Brain,
  AlertTriangle,
  BookOpen,
  Lightbulb,
  ChevronDown,
  ScrollText,
  X,
} from "lucide-react";
import {
  studySyndromeMatch,
  searchClassicTexts,
  SHANGHAN_SYNDROMES,
} from "@/algorithm-core";
import type { TcmSyndrome } from "@/algorithm-core";
import { BrandHeader } from "@/components/shared";
import {ResearchLearningDrawers} from "@/components/ResearchLearningDrawers";
import {localMedicalConcepts} from "@/lib/medicalLearning";
import { useToolBack } from "@/lib/useToolBack";

// ============================================================
// 类型定义
// ============================================================

interface ClassicTextResult {
  classic: string;
  chapter: string;
  subchapter: string;
  subsection: string;
  content_preview: string;
  content_lines: number;
  source_mark: string;
  disclaimer: string;
}

// ============================================================
// 辨证学习页面
// ============================================================

function ShanghanPageOriginal() {
  useToolBack({ pageKey: "zhongyi_shanghan", eventName: "zhongyi-back", globalFlag: "__zhongyiBackHandled" });
  const [symptomsInput, setSymptomsInput] = useState('');
  const [studySyndromeName,setStudySyndromeName]=useState('');
  const studySyndrome=SHANGHAN_SYNDROMES.find(s=>s.name===studySyndromeName);
  const generation=useRef(0);
  useEffect(()=>()=>{generation.current++;},[]);
  const [symptomTags, setSymptomTags] = useState<string[]>([]);
  const [matchedSyndromes, setMatchedSyndromes] = useState<TcmSyndrome[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [classicTexts, setClassicTexts] = useState<ClassicTextResult[]>([]);
  const [loadingTexts, setLoadingTexts] = useState(false);
  const [expandedSyndrome, setExpandedSyndrome] = useState<string | null>(null);

  // 添加症状标签
  const addSymptomTag = useCallback(() => {
    const trimmed = symptomsInput.trim();
    if (trimmed && !symptomTags.includes(trimmed)) {
      setSymptomTags((prev) => [...prev, trimmed]);
      setSymptomsInput("");
    }
  }, [symptomsInput, symptomTags]);

  // 移除症状标签
  const removeSymptomTag = useCallback((tag: string) => {
    setSymptomTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  // 执行对照学习
  const handleAnalyze = useCallback(async () => {
    if (symptomTags.length === 0) return;

    const turn=++generation.current;setClassicTexts([]);setLoadingTexts(false);
    const result = studySyndromeMatch(symptomTags);
    setMatchedSyndromes(
      result.syndromes.length > 0 ? result.syndromes : []
    );
    setHasSearched(true);
    setExpandedSyndrome(null);

    // 搜索相关典籍条文
    if (result.syndromes.length > 0) {
      setLoadingTexts(true);
      try {
        const pages=await Promise.all(symptomTags.map(term=>searchClassicTexts(term,{classic:'伤寒论',limit:5})));
        if(turn!==generation.current)return;
        const unique=new Map(pages.flat().map(t=>[`${t.classic}:${t.chapter}:${t.subsection}:${t.content_preview}`,t]));setClassicTexts([...unique.values()].slice(0,10));
      } catch {if(turn!==generation.current)return;setClassicTexts([]);}
      setLoadingTexts(false);
    }
  }, [symptomTags]);

  // 重置
  const handleReset = useCallback(() => {
    generation.current++;setLoadingTexts(false);
    setSymptomTags([]);
    setSymptomsInput("");
    setMatchedSyndromes([]);
    setHasSearched(false);
    setClassicTexts([]);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addSymptomTag();
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <BrandHeader title="伤寒论" showBack={true} backUrl="/zhongyi" />

      {/* ======================================== */}
      {/* 页面标题 */}
      {/* ======================================== */}
      <div className="mb-4">
        <h1 className="text-xl font-bold" style={{ color: "#e8edf0" }}>
          辨证学习
        </h1>
        <p className="text-xs mt-1" style={{ color: "#8b9a8b" }}>
          基于《伤寒论》六经辨证体系，症状与证型对照学习
        </p>
      </div>

      {/* ======================================== */}
      {/* 说明卡片 */}
      {/* ======================================== */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{
          backgroundColor: "#1a2027",
          border: "1px solid rgba(45, 90, 39, 0.15)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-5 w-5" style={{ color: "#2d5a27" }} />
          <h2 className="text-base font-semibold" style={{ color: "#e8edf0" }}>
            证型对照学习模式
          </h2>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "#8b9a8b" }}>
          本工具基于《伤寒论》六经辨证体系，将您输入的症状与典籍记载的各证型进行对照，
          展示多个候选证型及其匹配度。此为非诊断工具，仅供中医学习参考。
        </p>
      </div>

      {/* ======================================== */}
      {/* 警告 */}
      {/* ======================================== */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{
          backgroundColor: "rgba(212, 168, 75, 0.08)",
          border: "1px solid rgba(212, 168, 75, 0.2)",
        }}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle
            className="h-4 w-4 mt-0.5 shrink-0"
            style={{ color: "#d4a84b" }}
          />
          <p className="text-xs leading-relaxed" style={{ color: "#c8b060" }}>
            六经辨证需四诊合参，本工具仅供学习参考，不可替代专业中医诊断。
          </p>
        </div>
      </div>

      {/* ======================================== */}
      {/* 症状标签输入区 */}
      {/* ======================================== */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{
          backgroundColor: "#1a2027",
          border: "1px solid rgba(45, 90, 39, 0.15)",
        }}
      >
        <h3
          className="flex items-center gap-2 text-sm font-semibold mb-3"
          style={{ color: "#e8edf0" }}
        >
          <Search className="h-4 w-4" style={{ color: "#2d5a27" }} />
          输入症状
        </h3>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={symptomsInput}
            onChange={(e) => setSymptomsInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入症状后按回车添加..."
            className="flex-1 rounded-lg border py-2 px-3 text-sm outline-none transition-colors"
            style={{
              backgroundColor: "#0f1419",
              borderColor: "rgba(45, 90, 39, 0.2)",
              color: "#e8edf0",
            }}
          />
          <Button
            onClick={addSymptomTag}
            disabled={!symptomsInput.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-40"
            style={{
              backgroundColor: "rgba(45, 90, 39, 0.2)",
              color: "#2d5a27",
            }}
          >
            添加
          </Button>
        </div>

        {/* 标签展示 */}
        {symptomTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {symptomTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "rgba(45, 90, 39, 0.15)",
                  color: "#2d5a27",
                  border: "1px solid rgba(45, 90, 39, 0.25)",
                }}
              >
                {tag}
                <Button
                  onClick={() => removeSymptomTag(tag)}
                  className="ml-0.5 hover:opacity-80"
                >
                  <X className="h-3 w-3" />
                </Button>
              </span>
            ))}
          </div>
        )}

        {/* 快捷症状 */}
        <div className="mb-3">
          <p className="text-xs mb-1.5" style={{ color: "#6b7a6b" }}>
            快捷添加：
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              "发热",
              "恶寒",
              "无汗",
              "头痛",
              "口苦",
              "咽干",
              "目眩",
              "心烦",
              "喜呕",
              "往来寒热",
              "胸胁苦满",
              "脉浮紧",
              "脉弦",
              "脉微细",
              "下利",
            ].map((s) => (
              <Button
                key={s}
                onClick={() => {
                  if (!symptomTags.includes(s)) {
                    setSymptomTags((prev) => [...prev, s]);
                  }
                }}
                className="px-2 py-1 rounded-full text-xs transition-all duration-200"
                style={{
                  backgroundColor: "rgba(45, 90, 39, 0.08)",
                  color: "#8b9a8b",
                  border: "1px solid rgba(45, 90, 39, 0.1)",
                }}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={symptomTags.length === 0}
            className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "#2d5a27",
              color: "#e8edf0",
            }}
          >
            开始对照学习
          </Button>
          {symptomTags.length > 0 && (
            <Button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: "rgba(45, 90, 39, 0.1)",
                color: "#8b9a8b",
              }}
            >
              重置
            </Button>
          )}
        </div>
      </div>

      {/* ======================================== */}
      {/* 结果区域 */}
      {/* ======================================== */}
      {hasSearched && (
        <div className="space-y-4 mb-6">
          {matchedSyndromes.length > 0 ? (
            <>
              <h3
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: "#e8edf0" }}
              >
                <Brain className="h-4 w-4" style={{ color: "#2d5a27" }} />
                学习目录命中（{matchedSyndromes.length}项）
              </h3>

              {matchedSyndromes.map((syndrome, idx) => (
                <div
                  key={idx}
                  className="rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: "#1a2027",
                    border: "1px solid rgba(45, 90, 39, 0.15)",
                  }}
                >
                  <Button
                    onClick={() =>
                      setExpandedSyndrome(
                        expandedSyndrome === syndrome.name
                          ? null
                          : syndrome.name
                      )
                    }
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[#2d5a27]/5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: "rgba(45, 90, 39, 0.15)",
                        }}
                      >
                        <span
                          className="text-sm font-bold"
                          style={{ color: "#2d5a27" }}
                        >
                          {idx + 1}
                        </span>
                      </div>
                      <div>
                        <p
                          className="font-medium text-sm"
                          style={{ color: "#e8edf0" }}
                        >
                          {syndrome.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: "rgba(45, 90, 39, 0.15)",
                              color: "#2d5a27",
                            }}
                          >
                            关键词包含关系：{syndrome.score}对
                          </span>

                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className="h-4 w-4 transition-transform"
                      style={{
                        color: "#8b9a8b",
                        transform:
                          expandedSyndrome === syndrome.name
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                      }}
                    />
                  </Button>

                  {/* 展开详情 */}
                  {expandedSyndrome === syndrome.name && (
                    <div
                      className="px-4 py-4 space-y-3"
                      style={{ borderTop: "1px solid rgba(45, 90, 39, 0.1)" }}
                    >
                      {/* 证型描述 */}
                      <div>
                        <p
                          className="text-xs font-medium mb-1"
                          style={{ color: "#6b7a6b" }}
                        >
                          证型描述
                        </p>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#c8d0c8" }}
                        >
                          {syndrome.description}
                        </p>
                      </div>

                      {/* 关键症状 */}
                      <div>
                        <p
                          className="text-xs font-medium mb-1"
                          style={{ color: "#6b7a6b" }}
                        >
                          关键症状
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {syndrome.symptoms.map((s, i) => (
                            <span
                              key={i}
                              className="inline-block rounded-full px-2.5 py-0.5 text-xs"
                              style={{
                                backgroundColor: "rgba(45, 90, 39, 0.1)",
                                color: "#2d5a27",
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 推理过程 */}
                      <div>
                        <p
                          className="text-xs font-medium mb-1"
                          style={{ color: "#6b7a6b" }}
                        >
                          <Lightbulb
                            className="h-3 w-3 inline mr-1"
                            style={{ color: "#d4a84b" }}
                          />
                          目录检索规则
                        </p>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#8b9a8b" }}
                        >
                          输入词与该目录关键词存在{syndrome.score}对包含关系，仅用于查资料，不是症状个数、诊断概率或临床验证。目录所列症状的完全同词命中：
                          {syndrome.symptoms
                            .filter((s) => symptomTags.includes(s))
                            .join("、") || "（部分匹配关键词）"}
                          。
                        </p>
                      </div>

                      <p className="text-xs leading-6 text-stone-300">此条为编写者目录概述，不冒充已逐条核验的古籍原文。请在下方完整来源章节核对语境；方剂名录由你另行选读。</p>
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div
              className="rounded-xl p-6 text-center"
              style={{
                backgroundColor: "#1a2027",
                border: "1px solid rgba(45, 90, 39, 0.15)",
              }}
            >
              <Search
                className="h-8 w-8 mx-auto mb-2"
                style={{ color: "#6b7a6b" }}
              />
              <p className="text-sm" style={{ color: "#8b9a8b" }}>
                未找到关键词目录
              </p>
              <p className="text-xs mt-1" style={{ color: "#6b7a6b" }}>
                可换一个文献术语检索；不会据此推断证型
              </p>
            </div>
          )}

          {/* 相关典籍条文 */}
          {classicTexts.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: "#1a2027",
                border: "1px solid rgba(45, 90, 39, 0.15)",
              }}
            >
              <h3
                className="flex items-center gap-2 text-sm font-semibold mb-3"
                style={{ color: "#e8edf0" }}
              >
                <BookOpen className="h-4 w-4" style={{ color: "#d4a84b" }} />
                旧版条目摘要 · 请核对完整原文
              </h3>
              <div className="space-y-2">
                {classicTexts.map((text, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: "rgba(45, 90, 39, 0.08)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p
                        className="text-xs font-medium"
                        style={{ color: "#2d5a27" }}
                      >
                        {text.classic} · {text.chapter}
                      </p>
                      <span className="text-xs" style={{ color: "#6b7a6b" }}>
                        {text.source_mark}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#c8d0c8" }}>
                      {text.content_preview}
                    </p>
                    {text.subsection && (
                      <p className="text-xs mt-1" style={{ color: "#8b9a8b" }}>
                        {text.subsection}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingTexts && (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: "#8b9a8b" }}>
                正在搜索相关典籍条文...
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================================== */}
      {/* 六经证型概览（初始状态） */}
      {/* ======================================== */}
      {!hasSearched && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{
            backgroundColor: "#1a2027",
            border: "1px solid rgba(45, 90, 39, 0.15)",
          }}
        >
          <h3
            className="flex items-center gap-2 text-sm font-semibold mb-3"
            style={{ color: "#e8edf0" }}
          >
            <ScrollText className="h-4 w-4" style={{ color: "#2d5a27" }} />
            六经证型概览
          </h3>
          <div className="space-y-2">
            {SHANGHAN_SYNDROMES.map((syndrome, idx) => (
              <div
                key={idx}
                className="rounded-lg p-3"
                style={{
                  backgroundColor: "rgba(45, 90, 39, 0.06)",
                }}
              >
                <p className="text-sm font-medium" style={{ color: "#e8edf0" }}>
                  {syndrome.name}
                </p>
                <p
                  className="text-xs mt-0.5 line-clamp-2"
                  style={{ color: "#8b9a8b" }}
                >
                  {syndrome.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasSearched&&<ResearchLearningDrawers selectedSymptoms={localMedicalConcepts(symptomTags.join('、'))} selfDescription=""/>}
      <section className="mb-6 space-y-3 rounded-xl border border-stone-600 bg-stone-900 p-4 text-sm text-stone-100"><h2 className="font-semibold">六经目录与方剂名录 · 自主选读</h2><p className="text-xs leading-6">不会根据输入自动推荐方剂。以下为既有整理目录，尚需逐条专业校核；药量、用药和针法应回原典学习，不能照用于个人。</p><Label className="block">选择目录<select aria-label="六经目录自主选读" value={studySyndromeName} onChange={e=>setStudySyndromeName(e.target.value)} className="mt-2 w-full rounded bg-white p-3 text-stone-900"><Option value="">请选择学习条目</Option>{SHANGHAN_SYNDROMES.map(item=><Option key={item.name} value={item.name}>{item.name}</Option>)}</select></Label>{studySyndrome&&<><p>{studySyndrome.description}</p><Link className="block underline" href={`/zhongyi/classic/?q=${encodeURIComponent(studySyndrome.name)}&scope=original`}>在完整古籍中核对来源</Link><div className="flex flex-wrap gap-3">{studySyndrome.formulas.map(f=><Link key={f} className="underline" href={`/zhongyi/formula/?name=${encodeURIComponent(f)}`}>{f} · 查资料</Link>)}</div></>}</section>

      {/* ======================================== */}
      {/* 本APP内容仅供传统文化研究参考，不构成医疗建议。如有身体不适，请及时就医。 */}
      {/* ======================================== */}
      <p className="text-center text-xs pb-4" style={{ color: "#6b7a6b" }}>
        本APP内容仅供传统文化研究参考，不构成医疗建议。如有身体不适，请及时就医。
      </p>
    </div>
  );
}

// v25.0.47_12: 中医板块知识开放程度门控（后台工具矩阵实时控制：开放/会员专享/维护/关闭）
export default function ShanghanPage() {
  return (
    <SectionGate toolId="zhongyi_shanghan" title="伤寒六经">
      <ShanghanPageOriginal />
    </SectionGate>
  );
}
