"use client";

import { useState, useCallback, useEffect } from "react";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { useToolBack } from "@/lib/useToolBack";

import { analyzeCarplate, PROVINCE_PREFIXES, LETTER_WUXING, CARPLATE_WUXING_COLORS, SHULI_DESC, AUSPICIOUS_COMBOS, INAUSPICIOUS_COMBOS, getCarplateScoreColor, wuxingRound } from "@/algorithm-core";
import type { CarplateResult } from "@/algorithm-core";
import EventDivinationPanel from "@/components/EventDivinationPanel";
import BatchNumberMatching from "@/components/BatchNumberMatching";
import { ShareButton } from "@/components/ShareButton";
// ============================================================================
// 常量
// ============================================================================
const BRAND = "#7B2FBE";


// ============================================================================
// 主组件
// ============================================================================
export default function CarplatePage() {
  const pageKey = "yixue_carplate"; const { showResult, savedParams, saveParams, goToResult } = useToolBack({ pageKey, eventName: "yixue-back", globalFlag: "__yixueBackHandled" });
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
  const [plateNumber, setPlateNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [result, setResult] = useState<CarplateResult | null>(null);
  const [error, setError] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);

  const isValid = plateNumber.trim().length >= 2 && /\d/.test(plateNumber);

  const handleAnalyze = useCallback(() => {
    if (!isValid) {
      setError("请输入正确的车牌号（含数字）");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      const r = analyzeCarplate(plateNumber);
      if (!r) {
        setError("车牌号格式不正确，请重新输入");
        setLoading(false);
        return;
      }
      setResult(r);
      setHasResult(true);
      setLoading(false);
      // 保存客户记录
      if(r){
        try{saveRecord({clientId:selectedClient?selectedClient.id:"",type:"carplate",data:{...r,plateNumber},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
      }
    }, 200);
  }, [plateNumber, isValid, selectedClient]);

  // URL参数clientId + 回填检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("carplate");
    if (prefill) { try { setResult(prefill); setHasResult(true); clearPrefillData("carplate"); } catch(e){} }
  }, []);

  useEffect(() => {
    const editHandler = () => setHasResult(false);
    const backHandler = () => { if (hasResult) { setHasResult(false); window.__yixueBackHandled = true; } };
    window.addEventListener("yixue-edit", editHandler);
    window.addEventListener("yixue-back", backHandler);
    return () => {
      window.removeEventListener("yixue-edit", editHandler);
      window.removeEventListener("yixue-back", backHandler);
    };
  }, [hasResult]);

  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "420px", minHeight: "100vh" }}>
      {/* v19.7: 双档位Tab切换 */}
      <div className="bg-white px-3 pt-3">
        <div className="flex rounded-full bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab("single")}
            className="flex-1 rounded-full py-2 text-sm font-semibold transition-all"
            style={{
              backgroundColor: activeTab === "single" ? BRAND : "transparent",
              color: activeTab === "single" ? "#fff" : "#666",
            }}
          >
            单车牌分析 ¥9.9
          </button>
          <button
            onClick={() => setActiveTab("batch")}
            className="flex-1 rounded-full py-2 text-sm font-semibold transition-all"
            style={{
              backgroundColor: activeTab === "batch" ? BRAND : "transparent",
              color: activeTab === "batch" ? "#fff" : "#666",
            }}
          >
            批量合号选号 ¥198
          </button>
        </div>
      </div>

      {/* 批量合号选号模式 */}
      {activeTab === "batch" && (
        <BatchNumberMatching toolType="carplate" />
      )}

      {/* 单车牌分析模式 */}
      {activeTab === "single" && (
        <>
      {/* 输入表单 */}
      {!hasResult && (
        <div className="bg-white px-3 py-3">
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">车牌号码</label>
            <input
              type="text"
              value={plateNumber}
              onChange={(e) => {
                setPlateNumber(e.target.value.toUpperCase());
                setError("");
              }}
              placeholder="如：京A12345 或 粤B88888"
              maxLength={10}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-center text-xl font-mono tracking-widest outline-none focus:border-[#7B2FBE]"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          <div className="mb-3 flex flex-wrap gap-1">
            {["京A88888", "粤B66666", "沪A16888"].map((p) => (
              <button
                key={p}
                onClick={() => setPlateNumber(p)}
                className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500 active:bg-gray-100"
              >
                {p}
              </button>
            ))}
          </div>

          {/* 客户选择 */}
          <div className="mb-2">
            <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAnalyze}
              disabled={!isValid || loading}
              className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: isValid && !loading ? BRAND : "#ccc" }}
            >
              {loading ? "分析中..." : "开始分析"}
            </button>
          </div>

          <div className="mt-4 rounded-lg bg-purple-50/40 p-2.5">
            <div className="text-xs font-bold" style={{ color: BRAND }}>分析内容</div>
            <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-gray-600">
              <span>● 字母数字五行分析</span>
              <span>● 81数理解析</span>
              <span>● 吉祥组合检测</span>
              <span>● 数字寓意解读</span>
              <span>● 五行平衡分析</span>
              <span>● 综合数理评分</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center py-8 text-gray-400">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <p className="mt-3 text-sm">输入车牌号后点击"开始分析"</p>
            <p className="mt-1 text-xs text-gray-300">车牌数理 · 五行平安</p>
          </div>
        </div>
      )}

      {/* 分析结果 */}
      {hasResult && result && (
        <div className="bg-white px-2 py-2">
          {/* 车牌展示 + 评分 */}
          <div className="mb-3 rounded-lg p-3" style={{ backgroundColor: "#f3edf7" }}>
            {/* 模拟车牌 */}
            <div className="mx-auto flex w-fit items-center rounded-md border-2 border-blue-600 bg-blue-600 px-1 py-0.5 text-sm font-bold text-white shadow-md" style={{ letterSpacing: "2px" }}>
              <span className="rounded-sm bg-white/20 px-1.5 py-0.5">{result.province}{result.cityLetter}</span>
              <span className="ml-1 px-1">{result.numberPart}</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: getCarplateScoreColor(result.grade) }}>{result.score}</div>
                <div className="text-xs text-gray-500">综合评分</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold" style={{ color: getCarplateScoreColor(result.grade) }}>{result.grade}</div>
                <div className="text-xs text-gray-500">数理等级</div>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-gray-600">{result.gradeDesc}</p>
          </div>

          {/* 五行分布 */}
          <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
            <div className="mb-2 text-xs font-bold" style={{ color: BRAND }}>五行分布分析</div>
            <div className="grid grid-cols-5 gap-1 text-center text-xs">
              {(["金", "木", "水", "火", "土"] as const).map((wx) => (
                <div key={wx} className="rounded bg-gray-50 p-1">
                  <div className="font-bold" style={{ color: CARPLATE_WUXING_COLORS[wx] }}>{wx}</div>
                  <div className="text-lg font-bold">{Math.floor(wuxingRound(result.wuxingCount[wx]))}</div>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-gray-500">五行格局：{result.wuxingBalance}</p>
            {result.letterWuxingList.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                <span className="text-[10px] text-gray-400">字母五行：</span>
                {result.letterWuxingList.map((lw, i) => (
                  <span key={i} className="text-[10px]">
                    <span className="font-bold">{lw.letter}</span>
                    <span style={{ color: CARPLATE_WUXING_COLORS[lw.wuxing] }}>({lw.wuxing})</span>
                    {i < result.letterWuxingList.length - 1 && " "}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 81数理 */}
          <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: BRAND }}>81数理（数字总和{result.totalSum}）</span>
              <span className={`text-xs font-bold rounded px-2 py-0.5 ${result.shuliJiXiong === "吉" ? "bg-emerald-100 text-emerald-700" : result.shuliJiXiong === "凶" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                第{result.shuliNum}数
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">{result.shuliDesc}</p>
          </div>

          {/* 吉祥/凶组合 */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2">
              <div className="text-xs font-bold text-emerald-700">吉祥组合</div>
              {result.auspiciousFound.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {result.auspiciousFound.slice(0, 6).map((c, i) => (
                    <span key={i} className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{c}</span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-[10px] text-gray-400">未检测到吉祥组合</p>
              )}
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50/50 p-2">
              <div className="text-xs font-bold text-red-700">不利组合</div>
              {result.inauspiciousFound.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {result.inauspiciousFound.slice(0, 6).map((c, i) => (
                    <span key={i} className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">{c}</span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-[10px] text-gray-400">未检测到不利组合</p>
              )}
            </div>
          </div>

          {/* 数字寓意 */}
          {result.meanings.length > 0 && (
            <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
              <div className="mb-1 text-xs font-bold" style={{ color: BRAND }}>数字寓意</div>
              {result.meanings.map((m, i) => (
                <p key={i} className="text-[10px] text-gray-600 leading-relaxed">● {m}</p>
              ))}
            </div>
          )}

          {/* 行车提示 */}
          <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/50 p-2.5">
            <div className="mb-1 text-xs font-bold text-blue-700">行车平安提示</div>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              无论车牌数理，安全驾驶始终是第一位的。遵守交通规则、不酒驾、不疲劳驾驶、系好安全带，才是保平安的根本。
            </p>
          </div>

          <div className="flex gap-2 px-1">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex-1 rounded-full py-2 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              重新分析
            </button>
          </div>

          {/* v19.6: AI深度解读 + 事情断法（付费功能） */}
          <EventDivinationPanel
            toolName="车牌号码"
            chartContext={`车牌: ${result.province}${result.cityLetter}${result.numberPart}\n评分: ${result.score}\n等级: ${result.grade}\n五行: ${JSON.stringify(result.wuxingCount)}\n吉祥组合: ${result.auspiciousFound.join(",")}\n不利组合: ${result.inauspiciousFound.join(",")}\n81数理: 第${result.shuliNum}数`}
            isPaidTool={true}
          />
        </div>
      )}
      {/* 分享排盘结果 */}
      {result && (
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="车牌号民俗解读"
          description="车牌号民俗数理分析"
          variant="block"
          label="分享排盘结果"
          shareData={{
            toolType: "carplate",
            title: `车牌分析：${result.province}${result.cityLetter}${result.numberPart} · ${result.grade}`,
            summary: `评分${result.score} · 等级${result.grade} · 81数理第${result.shuliNum}数`,
            payload: {
              summaryLines: [
                `车牌：${result.province}${result.cityLetter}${result.numberPart}`,
                `评分：${result.score}`,
                `等级：${result.grade}`,
                `五行：${Object.entries(result.wuxingCount || {}).map(([k, v]) => k + String(v)).join(" ")}`,
                `吉祥组合：${result.auspiciousFound.join("、") || "无"}`,
                `不利组合：${result.inauspiciousFound.join("、") || "无"}`,
                `81数理：第${result.shuliNum}数`,
              ],
            },
          }}
        />
      </div>
      )}


      {/* 免责声明 */}
      <div className="mx-3 mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong>免责声明：</strong>本页面内容仅供传统文化参考，不构成任何决策建议。车牌号数理与行车安全无科学关联，请遵守交通法规，安全驾驶。
        </p>
      </div>
      <div style={{ height: "20px" }} />
        </>
      )}
    </div>
  );
}

