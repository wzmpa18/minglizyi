"use client";
import {InterfaceButton as Button,InterfaceLabel as Label,InterfaceOption as Option} from "@/components/InterfaceControls";

import { SectionGate } from "@/components/SectionGate";
import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getConstitutionById,
  saveResult,
  COMPLIANCE_TEXT,
  CONSTITUTION_PROVENANCE,
  getConstitutionTypes,
} from "@/algorithm-core/modules/tcm/constitution";
import type { ConstitutionResult } from "@/algorithm-core/modules/tcm/constitution";
import {stageLifeImport} from "@/lib/lifeImport";
import {getUserProfile} from "@/lib/auth";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";

function getScoreLevel(score: number): { label: string; color: string } {
  if (score >= 60) return { label: "≥60", color: "#C62828" };
  if (score >= 40) return { label: "40–59", color: "#E65100" };
  if (score >= 30) return { label: "30–39", color: "#FF9800" };
  return { label: "<30", color: "#4CAF50" };
}

function ConstitutionResultInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromHistory = searchParams.get("from") === "history";
  const [result, setResult] = useState<ConstitutionResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [studyTypeId,setStudyTypeId]=useState('');
  const studyType=getConstitutionById(studyTypeId);
  const [savedToClient, setSavedToClient] = useState(false);
  const [personLabel,setPersonLabel]=useState('');
  const [saveError,setSaveError]=useState('');

  useEffect(() => {
    try {
      const key = fromHistory ? "tcm_constitution_view_result" : "tcm_constitution_result";
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed: ConstitutionResult = JSON.parse(raw);
        // Re-hydrate constitution types from data (in case stored data is stale)
        const primaryType = getConstitutionById(parsed.primaryType.id);
        if (primaryType) {
          parsed.primaryType = primaryType;
        }
        parsed.secondaryTypes = parsed.secondaryTypes
          .map((t) => getConstitutionById(t.id))
          .filter(Boolean) as typeof parsed.secondaryTypes;
        setResult(parsed);
      }
    } catch {
      // ignore
    }
  }, [fromHistory]);

  const allTypes = useMemo(() => getConstitutionTypes(), []);

  const handleSave = () => {
    if (!result || saved) return;
    saveResult(result);
    setSaved(true);
  };

  const handleSaveToClient = () => {
    if (!result || savedToClient) return;
    try{
      stageLifeImport({title:'体质问卷学习计分',text:`${result.date}\n历史问卷规则标签：${result.primaryType.name}（不是健康结论）\n${result.scores.map(s=>`${s.name}：转化分${s.convertedScore} / 100`).join('\n')}\n${CONSTITUTION_PROVENANCE.note}`,categories:['学习','健康记录'],tags:['问卷学习','未经临床验证'],people:personLabel.trim()?[personLabel.trim()]:[],sourceRefs:[{kind:'SOURCE_USER_IMPORTED',platform:'本机历史问卷学习',at:new Date(result.timestamp).toISOString(),verified:false}]},String(getUserProfile()?.userId||''));
      setSavedToClient(true);router.push('/profile/life/');
    }catch(e){setSaveError(e instanceof Error?e.message:'留档尚未完成');}
  };

  const handleRetake = () => {
    try {
      sessionStorage.removeItem("tcm_constitution_result");
    } catch {
      // ignore
    }
    router.push("/zhongyi/constitution/quiz");
  };

  const handleHome = () => {
    router.push("/zhongyi/constitution");
  };

  if (!result) {
    return (
      <div
        style={{
          maxWidth: "420px",
          margin: "0 auto",
          minHeight: "100vh",
          backgroundColor: "#f8f5fc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "#999" }}>
          <p style={{ fontSize: "14px" }}>未找到测评结果</p>
          <Button
            onClick={handleHome}
            style={{
              marginTop: "16px",
              padding: "8px 20px",
              borderRadius: "20px",
              backgroundColor: BRAND,
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  const { primaryType, secondaryTypes, scores, isBalanced } = result;

  // Sort scores by convertedScore desc for bar chart
  const sortedScores = [...scores].sort((a, b) => b.convertedScore - a.convertedScore);
  const primaryScore = scores.find((s) => s.id === primaryType.id)?.convertedScore || 0;

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#f8f5fc",
        paddingBottom: "120px",
      }}
    >
      {/* 顶部导航 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
          padding: "12px 16px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Button
            onClick={handleHome}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Button>
          <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, flex: 1 }}>测评结果</h1>
          <span style={{ fontSize: "11px", opacity: 0.8 }}>{result.date}</span>
        </div>
      </div>

      {/* 主要体质结果 */}
      <div style={{ padding: "16px 12px 0" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "8px" }}>历史问卷规则标签（不是诊断）</div>
          <div style={{ fontSize: "56px", marginBottom: "8px" }}>{primaryType.icon}</div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: primaryType.color,
              marginBottom: "4px",
            }}
          >
            {primaryType.name}
          </div>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "12px" }}>{primaryType.pinyin}</div>
          <div
            style={{
              display: "inline-block",
              padding: "4px 16px",
              borderRadius: "20px",
              backgroundColor: primaryType.bgColor,
              color: primaryType.color,
              fontSize: "13px",
              fontWeight: "bold",
            }}
          >
            问卷转化分 · {primaryScore} / 100
          </div>
          {isBalanced && (
            <p style={{ fontSize: "12px", color: "#2E7D32", marginTop: "12px", margin: "12px auto 0", maxWidth: "280px", lineHeight: 1.6 }}>
              此标签只反映历史问卷的计分规则，不能据此判断健康或排除疾病。
            </p>
          )}
        </div>
      </div>

      {/* 其他计分标签 */}
      {secondaryTypes.length > 0 && (
        <div style={{ padding: "12px 12px 0" }}>
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 10px" }}>
              🔍 其他计分标签倾向
            </h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {secondaryTypes.map((t) => {
                const s = scores.find((sc) => sc.id === t.id)?.convertedScore || 0;
                return (
                  <div
                    key={t.id}
                    style={{
                      flex: "1",
                      minWidth: "100px",
                      padding: "12px",
                      borderRadius: "12px",
                      backgroundColor: t.bgColor,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "28px", marginBottom: "4px" }}>{t.icon}</div>
                    <div style={{ fontSize: "13px", fontWeight: "bold", color: t.color }}>{t.name}</div>
                    <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>{s}分 · 倾向</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 体质得分条形图 */}
      <div style={{ padding: "12px 12px 0" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 14px" }}>
            📊 九个问卷维度的转化分
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {allTypes.map((type) => {
              const s = scores.find((sc) => sc.id === type.id);
              const scoreVal = s?.convertedScore || 0;
              const level = getScoreLevel(scoreVal);
              const isPrimary = type.id === primaryType.id;
              return (
                <div key={type.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>{type.icon}</span>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: isPrimary ? "bold" : "normal",
                          color: isPrimary ? type.color : "#333",
                        }}
                      >
                        {type.name}
                      </span>
                      {isPrimary && (
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "1px 5px",
                            borderRadius: "3px",
                            backgroundColor: type.bgColor,
                            color: type.color,
                          }}
                        >
                          规则标签
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "11px", color: level.color }}>{level.label}</span>
                      <span style={{ fontSize: "13px", fontWeight: "bold", color: type.color, minWidth: "30px", textAlign: "right" }}>
                        {scoreVal}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      height: "8px",
                      backgroundColor: "#f5f5f5",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${scoreVal}%`,
                        borderRadius: "4px",
                        background: isPrimary
                          ? `linear-gradient(90deg, ${type.color} 0%, ${type.color}cc 100%)`
                          : type.color,
                        opacity: isPrimary ? 1 : 0.6,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <section className="m-3 space-y-3 rounded-2xl bg-white p-4 text-sm leading-7 text-stone-800">
        <h2 className="font-semibold">来源、计分与适用边界</h2>
        <p>{CONSTITUTION_PROVENANCE.note}</p><a className="underline" href={CONSTITUTION_PROVENANCE.officialUrl} target="_blank" rel="noopener noreferrer">核对现行标准公开信息</a>
        <p>转化分＝（原始分－条目数）÷（条目数×4）×100，反向题先按6减答案计分。这里显示问卷分数，不是疾病概率、健康分数或治疗指征。旧记录不会被重算或伪装为现行标准结果。</p>
        <Label className="block">自主选择术语学习<select aria-label="体质术语学习" value={studyTypeId} onChange={e=>setStudyTypeId(e.target.value)} className="mt-2 w-full rounded border bg-white p-3 text-stone-900"><Option value="">请选择，不按问卷推荐调理</Option>{allTypes.map(t=><Option key={t.id} value={t.id}>{t.name}</Option>)}</select></Label>
        {studyType&&<div className="space-y-3 rounded-xl border p-3"><h3 className="font-semibold">{studyType.name} · 编写者概述</h3><p>下列为历史整理笔记，尚未逐条专业核验，不是对你的状态描述。</p><p>{studyType.features}</p><p>{studyType.commonManifestations}</p><Link className="block underline" href={`/zhongyi/classic/?q=${encodeURIComponent(studyType.name)}&scope=original`}>检索完整古籍，核对原文语境</Link><div className="flex flex-wrap gap-4"><Link className="underline" href="/zhongyi/herb/">性味归经学习</Link><Link className="underline" href="/zhongyi/meridian/">经络与穴位文献</Link><Link className="underline" href="/zhongyi/classic/">饮食起居原典</Link></div><p>这些是独立资料入口，不根据答题生成适用于本人的药物、饮食限制或按穴方案。</p></div>}
      </section>

      {/* 操作按钮 */}
      <div style={{ padding: "16px 12px 0" }}>
        {/* 客户档案保存区 */}
        <div style={{ marginBottom: "12px" }}>
          <Label className="block text-sm text-stone-800">人物本地标签（选填）<input aria-label="人物本地标签" value={personLabel} onChange={e=>setPersonLabel(e.target.value)} maxLength={80} className="my-2 w-full rounded border bg-white p-3 text-stone-900"/></Label>
          <Button onClick={handleSaveToClient} disabled={savedToClient} className="w-full rounded-xl bg-purple-700 p-3 text-sm text-white disabled:opacity-40">{savedToClient?'已交给本机草稿，请核对保存':'预览并存入本机人生记录'}</Button>
          <p className="mt-2 text-xs leading-6 text-stone-600">仅在当前页面进程交接；解锁独立档案后核对并保存，不经过客户档案云同步。历史结果也可另存，不改写原记录。</p>{saveError&&<p role="status" className="text-sm text-red-800">{saveError}</p>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Button
            onClick={handleSave}
            disabled={saved || fromHistory}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background:
                saved || fromHistory
                  ? "#e0e0e0"
                  : `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
              color: saved || fromHistory ? "#999" : "white",
              fontSize: "15px",
              fontWeight: "bold",
              cursor: saved || fromHistory ? "default" : "pointer",
              boxShadow: saved || fromHistory ? "none" : "0 2px 8px rgba(123,47,190,0.3)",
            }}
          >
            {saved ? "✓ 已保存到历史记录" : fromHistory ? "历史记录中的结果" : "保存结果到历史"}
          </Button>
          <div style={{ display: "flex", gap: "10px" }}>
            <Button
              onClick={handleRetake}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid #ddd",
                background: "white",
                color: "#666",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              重新测评
            </Button>
            <Button
              onClick={handleHome}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid #ddd",
                background: "white",
                color: "#666",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              返回首页
            </Button>
          </div>
        </div>
      </div>

      {/* 合规提示 */}
      <div
        style={{
          margin: "16px 12px 0",
          padding: "10px 14px",
          backgroundColor: "#fff8e1",
          borderRadius: "12px",
          border: "1px solid #ffecb3",
        }}
      >
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center", lineHeight: 1.5 }}>
          ⚠️ {COMPLIANCE_TEXT}
        </p>
      </div>
    </div>
  );
}

function ConstitutionResultPageOriginal() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8f5fc",
          }}
        >
          <div style={{ textAlign: "center", color: BRAND }}>加载中...</div>
        </div>
      }
    >
      <ConstitutionResultInner />
    </Suspense>
  );
}

// v25.0.47_12: 中医板块知识开放程度门控（后台工具矩阵实时控制：开放/会员专享/维护/关闭）
export default function ConstitutionResultPage() {
  return (
    <SectionGate toolId="zhongyi_constitution" title="体质测评">
      <ConstitutionResultPageOriginal />
    </SectionGate>
  );
}
