"use client";

import { useState, useCallback, useEffect } from "react";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { useToolBack } from "@/lib/useToolBack";
import { analyzePhone, PHONE_WUXING_COLORS, CARRIER_PREFIX, BAXING_STARS, INDUSTRY_SUGGESTIONS, getPhoneScoreColor } from "@/algorithm-core";
import type { BaXingStar, BaxingMatch, PhoneAnalysisResult } from "@/algorithm-core";
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
export default function PhonePage() {
  const pageKey = "yixue_phone"; const { showResult, savedParams, saveParams, goToResult } = useToolBack({ pageKey, eventName: "yixue-back", globalFlag: "__yixueBackHandled" });
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [result, setResult] = useState<PhoneAnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);

  const cleaned = phoneNumber.replace(/\D/g, "");
  const isValid = /^1\d{10}$/.test(cleaned);

  const handleAnalyze = useCallback(() => {
    if (!isValid) {
      setError("请输入正确的11位手机号");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      const r = analyzePhone(cleaned);
      setResult(r);
      setHasResult(true);
      setLoading(false);
      // 保存客户记录
      if(selectedClient && r){
        try{saveRecord({clientId:selectedClient.id,type:"phone",data:{...r,phoneNumber:cleaned},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
      }
    }, 200);
  }, [cleaned, isValid, selectedClient]);

  // URL参数clientId + 回填检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("phone");
    if (prefill) { try { setResult(prefill); setHasResult(true); clearPrefillData("phone"); } catch(e){} }
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
            单号码分析 ¥9.9
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
        <BatchNumberMatching toolType="phone" />
      )}

      {/* 单号码分析模式 */}
      {activeTab === "single" && (
        <>
      {/* 输入表单 */}
      {!hasResult && (
        <div className="bg-white px-3 py-3">
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">手机号码</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d]/g, "").slice(0, 11);
                setPhoneNumber(val);
                setError("");
              }}
              placeholder="请输入11位手机号码"
              maxLength={11}
              inputMode="numeric"
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-center text-xl font-mono tracking-widest outline-none focus:border-[#7B2FBE]"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
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
              <span>● 号段运营商分析</span>
              <span>● 数字能量八星解读</span>
              <span>● 五行数理分析</span>
              <span>● 吉凶等级评分</span>
              <span>● 适合行业建议</span>
              <span>● 81数理吉凶</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center py-8 text-gray-400">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            <p className="mt-3 text-sm">输入11位手机号后点击"开始分析"</p>
            <p className="mt-1 text-xs text-gray-300">数字能量学 · 八星解运</p>
          </div>
        </div>
      )}

      {/* 分析结果 */}
      {hasResult && result && (
        <div className="bg-white px-2 py-2">
          {/* 号码展示 + 评分 */}
          <div className="mb-3 rounded-lg p-3" style={{ backgroundColor: "#f3edf7" }}>
            <div className="text-center">
              <div className="text-2xl font-bold tracking-widest" style={{ color: BRAND, fontFamily: "monospace" }}>
                {result.phone.slice(0, 3)} {result.phone.slice(3, 7)} {result.phone.slice(7)}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {result.carrier} | 号段{result.prefix3} | 区号{result.areaCode} | 尾号{result.tailCode}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: getPhoneScoreColor(result.grade) }}>{result.score}</div>
                <div className="text-xs text-gray-500">综合评分</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold" style={{ color: getPhoneScoreColor(result.grade) }}>{result.grade}</div>
                <div className="text-xs text-gray-500">吉凶等级</div>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-gray-600">{result.gradeDesc}</p>
          </div>

          {/* 五行分布 */}
          <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
            <div className="mb-2 text-xs font-bold" style={{ color: BRAND }}>数字五行分析</div>
            <div className="grid grid-cols-5 gap-1 text-center text-xs">
              {(["金", "木", "水", "火", "土"] as const).map((wx) => (
                <div key={wx} className="rounded bg-gray-50 p-1">
                  <div className="font-bold" style={{ color: PHONE_WUXING_COLORS[wx] }}>{wx}</div>
                  <div className="text-lg font-bold">{result.wuxingCount[wx]}</div>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-gray-500">五行格局：{result.wuxingBalance}</p>
          </div>

          {/* 八星能量 */}
          <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
            <div className="mb-2 text-xs font-bold" style={{ color: BRAND }}>数字能量八星组合</div>
            <div className="space-y-1.5">
              {BAXING_STARS.map((star) => {
                const matches = result.baxingMatches.filter(m => m.star.name === star.name);
                const count = matches.length;
                return (
                  <div
                    key={star.name}
                    className={`rounded p-1.5 ${count > 0 ? (star.type === "吉" ? "bg-emerald-50" : "bg-red-50") : "bg-gray-50 opacity-60"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: star.type === "吉" ? "#00a879" : "#ed4d49" }}>
                        {star.name}（{star.type}星）{count > 0 && `×${count}`}
                      </span>
                      <span className="text-[10px] text-gray-400">{star.pairs.slice(0, 4).join("/")}</span>
                    </div>
                    {count > 0 && (
                      <p className="mt-0.5 text-[10px] text-gray-600 leading-relaxed">{star.meaning}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 号码能量位置 */}
          <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
            <div className="mb-2 text-xs font-bold" style={{ color: BRAND }}>号码能量分布图</div>
            <div className="flex gap-0.5">
              {result.phone.split("").map((d, i) => {
                const pair = result.phone.slice(i, i + 2);
                let starName = "", isJi = false;
                for (const m of result.baxingMatches) {
                  if (m.position === i) {
                    starName = m.star.name;
                    isJi = m.star.type === "吉";
                    break;
                  }
                }
                return (
                  <div key={i} className="flex-1 text-center">
                    <div
                      className="rounded py-1 text-sm font-bold"
                      style={{
                        backgroundColor: starName ? (isJi ? "#dcfce7" : "#fee2e2") : "#f9fafb",
                        color: starName ? (isJi ? "#00a879" : "#ed4d49") : "#666",
                      }}
                    >
                      {d}
                    </div>
                    <div className="mt-0.5 text-[8px] text-gray-400" style={{ fontSize: "8px" }}>
                      {starName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 81数理 */}
          <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: BRAND }}>81数理（尾号{result.tailCode}）</span>
              <span className={`text-xs font-bold rounded px-2 py-0.5 ${result.shuliJiXiong === "吉" ? "bg-emerald-100 text-emerald-700" : result.shuliJiXiong === "凶" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                第{result.shuliNum}数·{result.shuliJiXiong}
              </span>
            </div>
          </div>

          {/* 特别提示 */}
          {result.specialNotes.length > 0 && (
            <div className="mb-3 rounded-lg border border-amber-100 bg-amber-50/50 p-2.5">
              <div className="mb-1 text-xs font-bold text-amber-700">特别提示</div>
              {result.specialNotes.map((note, i) => (
                <p key={i} className="text-[10px] text-amber-700 leading-relaxed">● {note}</p>
              ))}
            </div>
          )}

          {/* 适合行业 */}
          <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
            <div className="mb-2 text-xs font-bold" style={{ color: BRAND }}>适合行业建议</div>
            <div className="flex flex-wrap gap-1">
              {result.suitableIndustries.map((ind, i) => (
                <span key={i} className="rounded-full px-2 py-0.5 text-[10px] text-white" style={{ backgroundColor: BRAND }}>
                  {ind}
                </span>
              ))}
            </div>
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
            toolName="手机号码"
            chartContext={`号码: ${result.phone}\n运营商: ${result.carrier}\n评分: ${result.score}\n等级: ${result.grade}\n五行: ${JSON.stringify(result.wuxingCount)}\n八星组合: ${result.baxingMatches.map(m => m.star.name).join(",")}\n81数理: 第${result.shuliNum}数·${result.shuliJiXiong}`}
            isPaidTool={true}
          />
        </div>
      )}
      {/* 分享排盘结果 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="手机号吉凶分析结果"
          description="手机号吉凶分析"
          variant="block"
          label="分享排盘结果"
        />
      </div>


      {/* 免责声明 */}
      <div className="mx-3 mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong>免责声明：</strong>本页面内容仅供传统文化参考，不构成任何决策建议。数字能量学为民间数字文化研究，手机号码吉凶与个人运势无科学关联，请理性看待。
        </p>
      </div>
      <div style={{ height: "20px" }} />
        </>
      )}
    </div>
  );
}
