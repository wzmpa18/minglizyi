"use client";
import researchTopics from "../../../../backend_deploy/data/study-research-topics.json";
import { ResearchLearningDrawers } from "@/components/ResearchLearningDrawers";
import { simulateEvidenceLearning } from "@/lib/researchLearning";
import { TcmStudyRoadmap } from "@/components/TcmStudyRoadmap";

import { SectionGate } from "@/components/SectionGate";
import { useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Sparkles,
  Users,
  BookOpen,
} from "lucide-react";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { WENZHEN_CATEGORIES } from "@/data/wenzhen_data";

// ============================================================================
// 辨证学习页
// 本APP内容仅供传统文化研究参考，不构成医疗建议。如有身体不适，请及时就医。
// 流程：选择症状 → 辨证参数（7大门类流派体系） → AI辨证结果
// ============================================================================

// 品牌色
const BRAND = "#7B2FBE";

// 辨证参数页顶部固定提示文案
const TOP_NOTICE =
  "建议仅在同一医学体系内选择，避免辨证逻辑冲突；仅对照已收录原文；多选流派不代表个人诊断更准确";

// 祝由专项合规声明
const ZHUYOU_COMPLIANCE =
  "祝由科相关内容仅限典籍文化研究学习，不含任何操作指导，不构成医疗建议";

// ---- 症状分类数据（11类，保持不变） ----
interface SymptomItem { id: string; label: string; }
interface SymptomCategory { key: string; label: string; icon: string; symptoms: SymptomItem[]; }

const SYMPTOM_CATEGORIES: SymptomCategory[] = researchTopics.categories;

// ---- 基础辨证维度（八纲/六经/脏腑，保留） ----
const DIAGNOSIS_SYSTEMS = [
  { key: "bagang", label: "八纲辨证", desc: "阴阳·表里·寒热·虚实" },
  { key: "liujing", label: "六经辨证", desc: "太阳·阳明·少阳·太阴·少阴·厥阴" },
  { key: "zangfu", label: "脏腑辨证", desc: "肝·心·脾·肺·肾" },
] as const;

// ---- 疗法侧重（单选，默认综合方案） ----
const THERAPY_FOCUS = [
  { key: "tangyao", label: "汤药为主" },
  { key: "zhenjiu", label: "针灸为主" },
  { key: "zhenggu", label: "正骨为主" },
  { key: "shiliao", label: "食疗外治为主" },
  { key: "zonghe", label: "综合方案" },
] as const;

// ============================================================================
// 页面组件
// ============================================================================

function BianZhengPageOriginal() {
  useToolBack({ pageKey: "zhongyi_bianzheng", eventName: "zhongyi-back", globalFlag: "__zhongyiBackHandled" });

  // v20.1: 登录守卫
  const { showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  // 流程步骤：1=症状选择 2=辨证参数 3=结果输出
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // 第一步：症状选择
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
  const [symptomDetail, setSymptomDetail] = useState("");
  const [symptomDuration,setSymptomDuration]=useState("");

  // 第二步：辨证参数
  const [selectedSystem, setSelectedSystem] = useState<string>("bagang");
  const [activeCategory, setActiveCategory] = useState<string>("beipai");
  const [selectedMasters, setSelectedMasters] = useState<Set<string>>(
    new Set(["nihaisha", "zhangzhongjing"])
  );
  const [therapyFocus, setTherapyFocus] = useState<string>("zonghe");
  const [supplementText, setSupplementText] = useState("");

  // 第三步：结果
  const [loading, setLoading] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState("");
  const [hasError, setHasError] = useState(false);

  const category = WENZHEN_CATEGORIES.find((c) => c.id === activeCategory)!;

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    const cat = WENZHEN_CATEGORIES.find((c) => c.id === catId);
    if (cat?.defaultSelected) {
      setSelectedMasters(new Set(cat.defaultSelected));
    } else {
      setSelectedMasters(new Set(cat?.masters.slice(0, 2).map((m) => m.id) || []));
    }
  };

  const toggleMaster = (masterId: string) => {
    setSelectedMasters(prev => {
      const next = new Set(prev);
      if (next.has(masterId)) next.delete(masterId);
      else next.add(masterId);
      return next;
    });
  };

  const handleAnalyze = async () => {
    if (loading) return;
    setLoading(true); setHasError(false); setStep(3);
    try {
      const report = await simulateEvidenceLearning(Array.from(selectedSymptoms), selectedSystem, therapyFocus);
      const context = `本机学习条件：持续时间${symptomDuration||"未填写"}；流派${category.name}。所选医家标签仅用于学习记录，未经人工建立与条文的学术对应，不代表这些医家的诊断或意见。`;
      setDiagnosisResult(context+"\n\n"+report);
    } catch { setHasError(true); setDiagnosisResult("原文索引暂不可用，请从相关经典医案抽屉查看；不会生成无出处的诊断或处方。"); }
    finally { setLoading(false); }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedSymptoms(new Set());
    setSymptomDetail("");setSymptomDuration("");
    setSelectedSystem("bagang");
    setActiveCategory("beipai");
    setSelectedMasters(new Set(["nihaisha", "zhangzhongjing"]));
    setTherapyFocus("zonghe");
    setSupplementText("");
    setDiagnosisResult("");
    setHasError(false);
  };

  return (
    <div className="mx-auto max-w-[420px] min-h-screen" style={{ backgroundColor: "#0f1419" }}>
      <BrandHeader title="辨证学习" showBack={true} backUrl="/zhongyi" />
      <TcmStudyRoadmap/>

      {/* 页面标题 */}
      <div className="px-4 pt-3 mb-3">
        <h1 className="text-lg font-bold" style={{ color: "#e8edf0" }}>
          辨证学习
        </h1>
        <p className="text-xs mt-1" style={{ color: "#8b9a8b" }}>
          中医辨证论治体系学习，本APP内容仅供传统文化研究参考，不构成医疗建议。如有身体不适，请及时就医。
        </p>
      </div>

      {/* 免责提示 */}
      <div className="px-4 mb-4">
        <div
          className="rounded-xl p-3"
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
              原文卡来自所列版本；用户自述、学习对照与医学依据分别标记，仅供学习研究参考，不构成任何医疗诊断或用药建议。身体不适请及时就医。
            </p>
          </div>
        </div>
      </div>

      {/* 步骤进度条 */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2">
          {[
            { num: 1, label: "症状选择" },
            { num: 2, label: "辨证参数" },
            { num: 3, label: "结果输出" },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <div
                className="flex items-center gap-1.5"
                style={{ opacity: step >= s.num ? 1 : 0.4 }}
              >
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0"
                  style={{
                    backgroundColor: step >= s.num ? BRAND : "#1a2027",
                    color: step >= s.num ? "#fff" : "#8b9a8b",
                  }}
                >
                  {step > s.num ? "✓" : s.num}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: step >= s.num ? "#e8edf0" : "#6b7a6b" }}
                >
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div
                  className="flex-1 h-0.5 mx-1.5 rounded"
                  style={{ backgroundColor: step > s.num ? BRAND : "rgba(255,255,255,0.1)" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 第一步：症状选择                                             */}
      {/* ============================================================ */}
      {step === 1 && (
        <div className="px-4 space-y-4 pb-8">
          {SYMPTOM_CATEGORIES.map((cat) => (
            <div key={cat.key}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">{cat.icon}</span>
                <p className="text-xs font-bold" style={{ color: "#d4a84b" }}>
                  {cat.label}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cat.symptoms.map((sym) => {
                  const selected = selectedSymptoms.has(sym.id);
                  return (
                    <button
                      key={sym.id}
                      onClick={() => toggleSymptom(sym.id)}
                      className="rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150"
                      style={{
                        backgroundColor: selected ? BRAND : "rgba(123, 47, 190, 0.08)",
                        color: selected ? "#fff" : "#8b9a8b",
                        border: `1px solid ${selected ? BRAND : "rgba(123, 47, 190, 0.15)"}`,
                      }}
                    >
                      {sym.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <label className="block text-sm" style={{color:'#d4a84b'}}>持续时间（只留本页，不作病程判断）<select aria-label="症状持续时间" className="ml-2 rounded border p-2 text-stone-900" value={symptomDuration} onChange={e=>setSymptomDuration(e.target.value)}>{['','不足一天','一至七天','数周','数月','更久','不确定'].map(t=><option value={t} key={t}>{t||'选填'}</option>)}</select></label>
          {/* 补充症状描述 */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: "#d4a84b" }}>
              补充描述（疼痛性质、持续时间等）
            </p>
            <textarea
              value={symptomDetail}
              onChange={(e) => setSymptomDetail(e.target.value)}
              placeholder="可补充描述症状的具体性质、持续时间、加重缓解因素等..."
              rows={3}
              className="w-full rounded-lg p-3 text-sm resize-none outline-none"
              style={{
                backgroundColor: "#0f1419",
                color: "#e8edf0",
                border: "1px solid rgba(123, 47, 190, 0.2)",
              }}
            />
          </div>

          {/* 已选症状计数 + 下一步 */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs" style={{ color: "#6b7a6b" }}>
              已选 {selectedSymptoms.size} 项症状
            </span>
            <button
              onClick={() => setStep(2)}
              disabled={selectedSymptoms.size === 0}
              className="px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 disabled:opacity-40"
              style={{ backgroundColor: BRAND, color: "#fff" }}
            >
              下一步 →
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 第二步：辨证参数页                                           */}
      {/* 上方展示已选症状，下方为完整7大门类流派选择区                 */}
      {/* ============================================================ */}
      {step === 2 && (
        <div className="px-4 space-y-5 pb-8">
          {/* 顶部固定提示文案 */}
          <div
            className="rounded-xl p-3"
            style={{
              backgroundColor: "rgba(123, 47, 190, 0.08)",
              border: "1px solid rgba(123, 47, 190, 0.2)",
            }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle
                className="h-4 w-4 mt-0.5 shrink-0"
                style={{ color: BRAND }}
              />
              <p className="text-xs leading-relaxed" style={{ color: "#c8b0e0" }}>
                {TOP_NOTICE}
              </p>
            </div>
          </div>

          {/* 已选症状摘要（上方展示已选症状） */}
          <div
            className="rounded-xl p-3"
            style={{
              backgroundColor: "rgba(123, 47, 190, 0.06)",
              border: "1px solid rgba(123, 47, 190, 0.15)",
            }}
          >
            <p className="text-xs font-medium mb-1.5" style={{ color: BRAND }}>
              已选症状（{selectedSymptoms.size}项）
            </p>
            <div className="flex flex-wrap gap-1">
              {Array.from(selectedSymptoms).map((s) => (
                <span
                  key={s}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(123, 47, 190, 0.12)", color: "#c8d0c8" }}
                >
                  {s}
                </span>
              ))}
            </div>
            {symptomDetail.trim() && (
              <p
                className="text-xs mt-2 pt-2"
                style={{ color: "#8b9a8b", borderTop: "1px solid rgba(123, 47, 190, 0.1)" }}
              >
                补充：{symptomDetail.trim()}
              </p>
            )}
          </div>

          {/* 基础辨证维度（八纲/六经/脏腑，保留） */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: "#d4a84b" }}>
              基础辨证维度（选择一种）
            </p>
            <div className="space-y-2">
              {DIAGNOSIS_SYSTEMS.map((sys) => (
                <button
                  key={sys.key}
                  onClick={() => setSelectedSystem(sys.key)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-150 text-left"
                  style={{
                    backgroundColor: selectedSystem === sys.key ? "rgba(123, 47, 190, 0.12)" : "#1a2027",
                    border: `1px solid ${selectedSystem === sys.key ? BRAND : "rgba(123, 47, 190, 0.1)"}`,
                  }}
                >
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-full shrink-0"
                    style={{
                      backgroundColor: selectedSystem === sys.key ? BRAND : "transparent",
                      border: `1.5px solid ${selectedSystem === sys.key ? BRAND : "#6b7a6b"}`,
                    }}
                  >
                    {selectedSystem === sys.key && (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#e8edf0" }}>{sys.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>{sys.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 门类选择 - 横向滚动标签栏（7个门类标签） */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5" style={{ color: "#d4a84b" }} />
              <p className="text-xs font-bold" style={{ color: "#d4a84b" }}>
                流派门类（7大体系）
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {WENZHEN_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className="px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: activeCategory === cat.id ? BRAND : "#1a2027",
                    color: activeCategory === cat.id ? "#fff" : "#8b9a8b",
                    border: `1px solid ${activeCategory === cat.id ? BRAND : "rgba(123, 47, 190, 0.15)"}`,
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 门类描述 */}
          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: "#1a2027", border: "1px solid rgba(123, 47, 190, 0.1)" }}
          >
            <p className="text-sm font-bold" style={{ color: BRAND }}>
              {category.name} · {category.subtitle}
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "#8b9a8b" }}>
              {category.description}
            </p>
          </div>

          {/* 祝由专项合规声明（祝由板块选中时显示） */}
          {activeCategory === "zhuyou" && (
            <div
              className="rounded-xl p-3"
              style={{
                backgroundColor: "rgba(220, 53, 69, 0.1)",
                border: "1px solid rgba(220, 53, 69, 0.35)",
              }}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="h-4 w-4 mt-0.5 shrink-0"
                  style={{ color: "#dc3545" }}
                />
                <p
                  className="text-xs leading-relaxed font-semibold"
                  style={{ color: "#ff6b6b" }}
                >
                  {ZHUYOU_COMPLIANCE}
                </p>
              </div>
            </div>
          )}

          {/* 名家列表（可多选） */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: "#d4a84b" }}>
              选择医家/流派（可多选，已选 {selectedMasters.size} 位）
            </p>
            <div className="space-y-2">
              {category.masters.map((master) => {
                const selected = selectedMasters.has(master.id);
                return (
                  <button
                    key={master.id}
                    onClick={() => toggleMaster(master.id)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-150 text-left"
                    style={{
                      backgroundColor: selected ? "rgba(123, 47, 190, 0.1)" : "#1a2027",
                      border: `1px solid ${selected ? BRAND : "rgba(123, 47, 190, 0.1)"}`,
                    }}
                  >
                    {/* 多选 checkbox */}
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded shrink-0 mt-0.5"
                      style={{
                        backgroundColor: selected ? BRAND : "transparent",
                        border: `1.5px solid ${selected ? BRAND : "#6b7a6b"}`,
                      }}
                    >
                      {selected && (
                        <svg
                          className="h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="3"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: "#e8edf0" }}>
                          {master.name}
                        </span>
                        {master.dynasty && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: "rgba(255,255,255,0.06)",
                              color: "#8b9a8b",
                            }}
                          >
                            {master.dynasty}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <BookOpen className="h-3 w-3 shrink-0" style={{ color: "#d4a84b" }} />
                        <span className="text-[11px]" style={{ color: "#8b9a8b" }}>
                          {master.books.join("、")}
                        </span>
                      </div>
                      <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "#6b7a6b" }}>
                        {master.focus}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 疗法侧重（单选，默认综合方案） */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: "#d4a84b" }}>
              治法文献学习方向（非本人治疗方案）
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {THERAPY_FOCUS.map((tf) => (
                <button
                  key={tf.key}
                  onClick={() => setTherapyFocus(tf.key)}
                  className="px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: therapyFocus === tf.key ? BRAND : "#1a2027",
                    color: therapyFocus === tf.key ? "#fff" : "#8b9a8b",
                    border: `1px solid ${therapyFocus === tf.key ? BRAND : "rgba(123, 47, 190, 0.15)"}`,
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* 补充说明（500字上限） */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: "#d4a84b" }}>
              补充说明（选填，最多500字）
            </p>
            <textarea
              value={supplementText}
              onChange={(e) => setSupplementText(e.target.value.slice(0, 500))}
              placeholder="填写需要复习的概念或疑问；只保留在本页，不发送AI，不必录入病历或隐私。"
              rows={3}
              className="w-full rounded-lg p-3 text-sm resize-none outline-none"
              style={{
                backgroundColor: "#0f1419",
                color: "#e8edf0",
                border: "1px solid rgba(123, 47, 190, 0.2)",
              }}
            />
            <div className="text-right text-[11px] mt-1" style={{ color: "#6b7a6b" }}>
              {supplementText.length}/500
            </div>
          </div>

          {/* 按钮组 */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
              style={{
                backgroundColor: "#1a2027",
                color: "#8b9a8b",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              ← 上一步
            </button>
            <button
              onClick={handleAnalyze}
              disabled={selectedMasters.size === 0 || loading}
              className="flex-[2] py-2.5 rounded-lg text-sm font-bold transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ backgroundColor: BRAND, color: "#fff" }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在分析...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  开始原文学习对照
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 第三步：结果输出                                             */}
      {/* ============================================================ */}
      {step === 3 && (
        <div className="px-4 space-y-4 pb-8">
          {/* 加载状态 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mb-3" style={{ color: BRAND }} />
              <p className="text-sm" style={{ color: "#8b9a8b" }}>正在本机检索原文...</p>
              <p className="text-xs mt-1" style={{ color: "#6b7a6b" }}>
                {category.name} · {Array.from(selectedMasters).length}位医家
              </p>
              <p className="text-xs mt-1" style={{ color: "#6b7a6b" }}>
                请稍候，分析结果即将呈现
              </p>
            </div>
          )}

          {/* 分析结果 */}
          {!loading && diagnosisResult && (
            <>
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: hasError ? "rgba(220, 53, 69, 0.06)" : "#1a2027",
                  border: `1px solid ${hasError ? "rgba(220, 53, 69, 0.2)" : "rgba(123, 47, 190, 0.2)"}`,
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles
                    className="h-4 w-4"
                    style={{ color: hasError ? "#dc3545" : BRAND }}
                  />
                  <p
                    className="text-sm font-bold"
                    style={{ color: hasError ? "#dc3545" : "#e8edf0" }}
                  >
                    {hasError ? "分析提示" : "模拟辨证学习对照"}
                  </p>
                </div>
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "#c8d0c8" }}
                >
                  {diagnosisResult}
                </p>
              </div>

              {/* 固定合规提示 */}
              <div
                className="rounded-xl p-3"
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
                    以上内容仅供中医学习参考，不构成诊疗建议，身体不适请及时就医。
                  </p>
                </div>
              </div>
            </>
          )}

          {/* 重新分析按钮 */}
          {!loading && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
                style={{
                  backgroundColor: "#1a2027",
                  color: "#8b9a8b",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                ← 修改学习维度
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
                style={{ backgroundColor: BRAND, color: "#fff" }}
              >
                重新选择症状
              </button>
            </div>
          )}
        </div>
      )}

      <ResearchLearningDrawers selectedSymptoms={Array.from(selectedSymptoms)} selfDescription={symptomDetail}/>

      {/* 底部免责声明 */}
      <div className="px-4 pb-8">
        <p className="text-center text-xs" style={{ color: "#6b7a6b" }}>
          本APP内容仅供传统文化研究参考，不构成医疗建议。如有身体不适，请及时就医。
        </p>
      </div>

      {/* v20.1: 登录提示弹窗 */}
      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  );
}

// v25.0.47_12: 中医板块知识开放程度门控（后台工具矩阵实时控制：开放/会员专享/维护/关闭）
export default function BianZhengPage() {
  return (
    <SectionGate toolId="zhongyi_bianzheng" title="辨证学">
      <BianZhengPageOriginal />
    </SectionGate>
  );
}
