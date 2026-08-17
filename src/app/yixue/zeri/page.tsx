"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Solar } from "lunar-javascript";
import { DatePicker } from "@/components/shared";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { getZeriJianchuInterpretation, getZeriShenshaInterpretation, getZeriYijiInterpretation } from "@/lib/zeri-interpretations";
import type { ZeriInterpretItem } from "@/lib/zeri-interpretations";
import { savePaipanState, loadPaipanState, clearPaipanState } from "@/lib/paipanPersistence";
import { useToolBack } from "@/lib/useToolBack";
import { findAuspiciousDays, SHENGXIAO, getZeriScoreColor, getZeriScoreLabel, formatDate, addDaysToDate } from "@/algorithm-core";
import type { AuspiciousDay } from "@/algorithm-core";
import { getToolConfig } from "@/lib/toolConfigStore";
import EventDivinationPanel from "@/components/EventDivinationPanel";
import AIInterpretButton from "@/components/AIInterpretButton";

import { ShareButton } from "@/components/ShareButton";
// ============================================================================
// 常量
// ============================================================================
const BRAND = "#7B2FBE";

// 解读类型颜色
const INTERPRET_TYPE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  jianchu: { bg: "#f3e8ff", fg: "#7B2FBE", label: "建除" },
  shensha: { bg: "#fef3c7", fg: "#d97706", label: "神煞" },
  yiJi: { bg: "#e0f2fe", fg: "#0284c7", label: "宜忌" },
  chong: { bg: "#fef2f2", fg: "#dc2626", label: "冲煞" },
};

// ============================================================================
// 主组件
// ============================================================================
export default function ZeriPage() {
  const pageKey = "yixue_zeri"; const { showResult, savedParams, saveParams, goToResult } = useToolBack({ pageKey, eventName: "yixue-back", globalFlag: "__yixueBackHandled" });
  // P6-TOOL-04：事项分类与展示字段全部来自 LOC 后台配置（toolConfigStore），规则版本可追溯
  const zeriCfg = useMemo(() => getToolConfig().zeri, []);
  const enabledEventTypes = useMemo(() => zeriCfg.eventTypes.filter((e) => e.enabled), [zeriCfg]);
  const [eventType, setEventType] = useState<string>("");
  const [startYear, setStartYear] = useState(2026);
  const [startMonth, setStartMonth] = useState(1);
  const [startDay, setStartDay] = useState(2);
  const [endYear, setEndYear] = useState(2026);
  const [endMonth, setEndMonth] = useState(1);
  const [endDay, setEndDay] = useState(31);
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ds = addDaysToDate(today, 1);
    const de = addDaysToDate(today, 30);
    setStartYear(ds.getFullYear());
    setStartMonth(ds.getMonth() + 1);
    setStartDay(ds.getDate());
    setEndYear(de.getFullYear());
    setEndMonth(de.getMonth() + 1);
    setEndDay(de.getDate());
  }, []);
  const [userShengXiao, setUserShengXiao] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [results, setResults] = useState<AuspiciousDay[]>([]);
  const [error, setError] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [interpretPanel, setInterpretPanel] = useState<{title: string; items: ZeriInterpretItem[]} | null>(null);

  const handleSearch = useCallback(() => {
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    if (start > end) {
      setError("开始日期不能晚于结束日期");
      return;
    }
    const dayDiff = Math.round((end.getTime() - start.getTime()) / 86400000);
    if (dayDiff > zeriCfg.maxRangeDays) {
      setError(`日期范围不能超过${zeriCfg.maxRangeDays}天`);
      return;
    }
    const ev = enabledEventTypes.find((e) => e.id === eventType) || enabledEventTypes[0];
    if (!ev) {
      setError("择日事项未配置，请联系管理员");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      // 引擎预设键命中走内置规则；自定义事项走后台配置的宜忌关键词匹配
      const r = findAuspiciousDays(
        ev.engineKey || ev.name,
        start,
        end,
        userShengXiao || undefined,
        { key: ev.id, label: ev.name, yiKeywords: ev.yiKeywords }
      );
      setResults(r);
      setHasResult(true);
      setLoading(false);
      savePaipanState("zeri",{input:{eventType:ev.id,startYear,startMonth,startDay,endYear,endMonth,endDay,userShengXiao},showForm:false,_ts:Date.now()});
      // 保存客户记录
      if(selectedClient && r.length > 0){
        try{saveRecord({clientId:selectedClient.id,type:"zeri",data:{results:r,inputParams:{eventType:ev.id,startYear,startMonth,startDay,endYear,endMonth,endDay,userShengXiao}},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
      }
    }, 200);
  }, [eventType, startYear, startMonth, startDay, endYear, endMonth, endDay, userShengXiao, selectedClient, zeriCfg, enabledEventTypes]);

  const handleDayClick = useCallback((day: any) => {
    const interp = getZeriJianchuInterpretation(day.jianChu);
    if (interp) setInterpretPanel(interp);
  }, []);

  // URL参数clientId + 回填检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("zeri");
    if (prefill) { try { if(prefill.results){setResults(prefill.results);setHasResult(true);} clearPrefillData("zeri"); } catch(e){} }
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

  // localStorage 持久化：恢复排盘状态（兼容旧版预设键存储）
  useEffect(() => {
    const saved = loadPaipanState("zeri");
    let restored = "";
    if (saved && saved.input) {
      const inp = saved.input as any;
      if (inp.eventType) {
        // 新版存配置 id；旧版存引擎预设键/事项名，映射回配置项
        const hit = enabledEventTypes.find((e) => e.id === inp.eventType)
          || enabledEventTypes.find((e) => e.engineKey === inp.eventType)
          || enabledEventTypes.find((e) => e.name === inp.eventType);
        if (hit) restored = hit.id;
      }
      if (inp.startYear) setStartYear(inp.startYear);
      if (inp.startMonth) setStartMonth(inp.startMonth);
      if (inp.startDay) setStartDay(inp.startDay);
      if (inp.endYear) setEndYear(inp.endYear);
      if (inp.endMonth) setEndMonth(inp.endMonth);
      if (inp.endDay) setEndDay(inp.endDay);
      if (inp.userShengXiao) setUserShengXiao(inp.userShengXiao);
    }
    setEventType(restored || enabledEventTypes[0]?.id || "");
  }, [enabledEventTypes]);

  const currentEvent = useMemo(
    () => enabledEventTypes.find((e) => e.id === eventType) || enabledEventTypes[0],
    [eventType, enabledEventTypes]
  );
  const eventLabel = currentEvent?.name || "择日";

  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "420px", minHeight: "100vh" }}>
      {/* 开始日期选择弹窗 */}
      <DatePicker
        show={showStartPicker}
        onClose={() => setShowStartPicker(false)}
        onSubmit={(dateVal) => {
          setStartYear(dateVal.year);
          setStartMonth(dateVal.month);
          setStartDay(dateVal.day);
          setShowStartPicker(false);
        }}
        initialDate={{ year: startYear, month: startMonth, day: startDay, hour: 0, minute: 0 }}
        showMinute={false}
        showGender={false} showCalType={true} showToggles={false} showRegion={false} showName={false}
        submitText="确认开始日期" title="选择开始日期"
      />

      {/* 结束日期选择弹窗 */}
      <DatePicker
        show={showEndPicker}
        onClose={() => setShowEndPicker(false)}
        onSubmit={(dateVal) => {
          setEndYear(dateVal.year);
          setEndMonth(dateVal.month);
          setEndDay(dateVal.day);
          setShowEndPicker(false);
        }}
        initialDate={{ year: endYear, month: endMonth, day: endDay, hour: 0, minute: 0 }}
        showMinute={false}
        showGender={false} showCalType={true} showToggles={false} showRegion={false} showName={false}
        submitText="确认结束日期" title="选择结束日期"
      />

      {/* 输入表单 */}
      {!hasResult && (
        <div className="bg-white px-3 py-3">
          {/* 事项类型（LOC 后台可配置：增删改、启停） */}
          <div className="mb-3">
            <label className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>选择事项</span>
              <span className="text-[10px] text-gray-400">规则版本 {zeriCfg.version}</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {enabledEventTypes.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEventType(e.id)}
                  className={`flex flex-col items-center rounded-lg border py-2 text-xs transition-all ${
                    eventType === e.id
                      ? "border-[#7B2FBE] bg-purple-50 text-[#7B2FBE]"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }`}
                >
                  <span className="text-base font-bold">{e.name.slice(0, 1)}</span>
                  <span className="mt-0.5 text-[10px]">{e.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 日期范围 */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">开始日期</label>
            <button
              type="button"
              onClick={() => setShowStartPicker(true)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm transition-colors active:bg-gray-50"
            >
              <span className="font-medium text-gray-700">
                {startYear}-{String(startMonth).padStart(2, "0")}-{String(startDay).padStart(2, "0")}
              </span>
              <span className="text-xs text-gray-400">点击修改</span>
            </button>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">结束日期</label>
            <button
              type="button"
              onClick={() => setShowEndPicker(true)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm transition-colors active:bg-gray-50"
            >
              <span className="font-medium text-gray-700">
                {endYear}-{String(endMonth).padStart(2, "0")}-{String(endDay).padStart(2, "0")}
              </span>
              <span className="text-xs text-gray-400">点击修改</span>
            </button>
          </div>

          {/* 生肖（可选） */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">您的生肖（可选，避开冲日）</label>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setUserShengXiao("")}
                className={`rounded-full px-2 py-0.5 text-[10px] ${userShengXiao === "" ? "bg-[#7B2FBE] text-white" : "bg-gray-100 text-gray-500"}`}
              >
                不选
              </button>
              {SHENGXIAO.map((sx) => (
                <button
                  key={sx}
                  onClick={() => setUserShengXiao(sx)}
                  className={`rounded-full px-2 py-0.5 text-[10px] ${userShengXiao === sx ? "bg-[#7B2FBE] text-white" : "bg-gray-100 text-gray-500"}`}
                >
                  {sx}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

          {/* 客户选择 */}
          <div className="mb-2">
            <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              {loading ? "查询中..." : "查询吉日"}
            </button>
          </div>

          <div className="mt-4 rounded-lg bg-purple-50/40 p-2.5">
            <div className="text-xs font-bold" style={{ color: BRAND }}>择日依据</div>
            <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-gray-600">
              <span>● 黄历宜忌（建除十二神）</span>
              <span>● 干支冲煞生肖</span>
              <span>● 日期五行纳音</span>
              <span>● 节气时令参考</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center py-8 text-gray-400">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p className="mt-3 text-sm">选择事项和日期范围后点击"查询吉日"</p>
            <p className="mt-1 text-xs text-gray-300">传统择日 · 协纪辨方</p>
          </div>
        </div>
      )}

      {/* 结果 */}
      {hasResult && (
        <div className="bg-white px-2 py-2">
          {/* 结果概览（含规则版本标识，可追溯本次查询使用的规则） */}
          <div className="mb-3 rounded-lg p-3" style={{ backgroundColor: "#f3edf7" }}>
            <div className="text-center">
              <div className="text-sm" style={{ color: BRAND }}>
                {eventLabel} · 吉日查询
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {startYear}-{String(startMonth).padStart(2, "0")}-{String(startDay).padStart(2, "0")} 至 {endYear}-{String(endMonth).padStart(2, "0")}-{String(endDay).padStart(2, "0")}
                {userShengXiao && ` · 生肖${userShengXiao}`}
              </div>
              <div className="mt-2 text-2xl font-bold" style={{ color: BRAND }}>
                共找到 {results.length} 个吉日
              </div>
              <div className="mt-1 text-[10px] text-gray-400">规则版本 {zeriCfg.version}</div>
            </div>
          </div>

          {/* 民俗注意事项（LOC 后台按事项配置） */}
          {zeriCfg.showFolkNote && currentEvent?.folkNote && (
            <div className="mb-3 rounded-lg border border-amber-100 bg-amber-50/60 p-2.5">
              <div className="text-xs font-bold text-amber-700">【{currentEvent.name}】民俗注意</div>
              <div className="mt-1 text-[11px] leading-relaxed text-amber-800/90">{currentEvent.folkNote}</div>
            </div>
          )}

          {/* 吉日列表 */}
          {results.length === 0 ? (
            <div className="rounded-lg border border-gray-100 p-6 text-center text-sm text-gray-400">
              <p>所选日期范围内暂无合适吉日</p>
              <p className="mt-1 text-xs text-gray-300">建议扩大日期范围或更换事项类型</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((day, idx) => (
                <div key={day.dateStr} className="rounded-lg border border-gray-100 p-2.5" onClick={() => handleDayClick(day)} style={{ cursor: "pointer" }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: getZeriScoreColor(day.score) }}>
                          {getZeriScoreLabel(day.score)}
                        </span>
                        <span className="text-sm font-bold text-gray-800">{day.dateStr}</span>
                        <span className="text-xs text-gray-400">周{day.weekday}</span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-gray-500">{day.lunarStr}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500">
                        <span>{day.dayGZ}日</span>
                        <span>·</span>
                        <span className={day.jianChuJiXiong === "吉" ? "text-emerald-600" : day.jianChuJiXiong === "凶" ? "text-red-500" : "text-gray-500"}>
                          {day.jianChu}日
                        </span>
                        <span>·</span>
                        <span>纳音{day.naYin}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: getZeriScoreColor(day.score) }}>{day.score}</div>
                      <div className="text-[10px] text-gray-400">匹配度</div>
                    </div>
                  </div>

                  {/* 冲煞（后台开关 showChongSha） */}
                  {zeriCfg.showChongSha && day.chongShengXiao && (
                    <div className="mt-1.5 rounded bg-red-50 px-1.5 py-1 text-[10px] text-red-600">
                      冲{day.chongShengXiao}（{day.chongDesc}） · 煞{day.sha}方
                    </div>
                  )}

                  {/* 吉时（后台开关 showJiShi） */}
                  {zeriCfg.showJiShi && day.jiShi && day.jiShi.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1 rounded bg-amber-50/70 px-1.5 py-1 text-[10px]">
                      <span className="font-bold text-amber-700">吉时</span>
                      {day.jiShi.map((js, i) => (
                        <span key={i} className="rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">{js}</span>
                      ))}
                    </div>
                  )}

                  {/* 方位（后台开关 showFangWei：喜神/财神/福神） */}
                  {zeriCfg.showFangWei && (day.posXi || day.posCai || day.posFu) && (
                    <div className="mt-1.5 grid grid-cols-3 gap-1 text-center text-[10px]">
                      {day.posXi && (
                        <div className="rounded bg-gray-50 py-1">
                          <span className="text-gray-400">喜神</span>
                          <span className="ml-1 font-semibold text-gray-700">{day.posXi}</span>
                        </div>
                      )}
                      {day.posCai && (
                        <div className="rounded bg-gray-50 py-1">
                          <span className="text-gray-400">财神</span>
                          <span className="ml-1 font-semibold text-gray-700">{day.posCai}</span>
                        </div>
                      )}
                      {day.posFu && (
                        <div className="rounded bg-gray-50 py-1">
                          <span className="text-gray-400">福神</span>
                          <span className="ml-1 font-semibold text-gray-700">{day.posFu}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 宜/忌（后台开关 showYiJi） */}
                  {zeriCfg.showYiJi && (
                    <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10px]">
                      <div>
                        <span className="text-emerald-600 font-bold">宜：</span>
                        <span className="text-gray-600">{day.yi.join("、") || "无"}</span>
                      </div>
                      <div>
                        <span className="text-red-500 font-bold">忌：</span>
                        <span className="text-gray-600">{day.ji.join("、") || "无"}</span>
                      </div>
                    </div>
                  )}

                  {/* 推荐理由（后台开关 showRuleBasis：规则依据） */}
                  {zeriCfg.showRuleBasis && day.reasons.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {day.reasons.slice(0, 3).map((r, i) => (
                        <span key={i} className="rounded bg-emerald-50 px-1 py-0.5 text-[9px] text-emerald-700">{r}</span>
                      ))}
                    </div>
                  )}

                  {/* 注意事项 */}
                  {day.warnings.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {day.warnings.slice(0, 2).map((w, i) => (
                        <span key={i} className="rounded bg-amber-50 px-1 py-0.5 text-[9px] text-amber-700">{w}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* P6-TOOL-04 §3.2：AI 深度择日分析（增值服务，复用统一 Paywall/AI网关/缓存幂等链路） */}
          {zeriCfg.aiDeepEnabled && results.length > 0 && (
            <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50/40 p-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold" style={{ color: BRAND }}>AI 深度择日分析</div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold" style={{ color: BRAND }}>
                  增值服务 ¥{zeriCfg.aiDeepPrice}/次
                </span>
              </div>
              <div className="mt-1 text-[10px] leading-relaxed text-gray-500">
                AI 结合传统规则对候选吉日做解释、对比与注意事项说明，结果永久缓存不重复计费，生成失败不计费。
              </div>
              <div className="mt-2">
                <AIInterpretButton
                  toolName="择日深度分析"
                  scope="深度分析"
                  buttonText={`AI 深度择日分析 ¥${zeriCfg.aiDeepPrice}/次`}
                  cacheKey={`zeri_deep_${currentEvent?.id}_${startYear}${startMonth}${startDay}_${endYear}${endMonth}${endDay}_${zeriCfg.version}`}
                  contextData={`事项: ${eventLabel}\n规则版本: ${zeriCfg.version}\n日期范围: ${startYear}-${startMonth}-${startDay} 至 ${endYear}-${endMonth}-${endDay}\n生肖: ${userShengXiao || "未指定"}\n民俗注意: ${currentEvent?.folkNote || "无"}\n候选吉日: ${results.slice(0, 5).map((d) => `${d.dateStr}(${d.dayGZ}日,建除${d.jianChu},评分${d.score},吉时${(d.jiShi || []).join("/")},冲${d.chongShengXiao},煞${d.sha}方)`).join("; ")}`}
                  systemPrompt={`你是传统择日文化解读师。请基于提供的择日结果数据，对候选吉日做解释、横向对比与注意事项说明。
要求：
1. 逐条解释每个候选日期的规则依据（建除十二神、干支冲煞、吉时方位等）
2. 对比各候选日期的优劣与适用场景，给出民俗文化视角的参考说明
3. 明确提示需要避开的生肖冲煞与方位
4. 禁止生成确定性承诺（如"必定顺利""保证成功"），禁止替用户做出重大决策
5. 不涉及医疗、法律、金融等专业建议
6. 结尾必须标注：「以上内容仅供传统文化参考与个人娱乐，不构成任何专业建议」`}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-3 text-[10px] text-gray-400">
                <a href="/profile/wallet" className="underline">费用账单</a>
                <span>·</span>
                <a href="/profile/feedback" className="underline">投诉反馈</a>
              </div>
            </div>
          )}

          {/* 解读抽屉 */}
          {interpretPanel && (
            <div className="mt-3">
              <div style={{
                border: "1px solid #7B2FBE",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(123, 47, 190, 0.12)",
              }}>
                {/* 标题栏 */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)",
                  color: "white",
                }}>
                  <span style={{ fontSize: "15px", fontWeight: "bold" }}>
                    {interpretPanel.title}
                  </span>
                  <button
                    onClick={() => setInterpretPanel(null)}
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      border: "none",
                      color: "white",
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* 内容区 */}
                <div style={{ padding: "10px 12px", maxHeight: "360px", overflowY: "auto" }}>
                  {interpretPanel.items.map((item, idx) => {
                    const tc = INTERPRET_TYPE_COLORS[item.type] || INTERPRET_TYPE_COLORS["jianchu"];
                    return (
                      <div key={idx} style={{ marginBottom: idx < interpretPanel.items.length - 1 ? "10px" : 0 }}>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{
                            fontSize: "10px",
                            fontWeight: "bold",
                            padding: "1px 6px",
                            borderRadius: "3px",
                            background: tc.bg,
                            color: tc.fg,
                            marginRight: "8px",
                            flexShrink: 0,
                          }}>
                            {tc.label}
                          </span>
                          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}>{item.title}</span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.7", whiteSpace: "pre-line" }}>
                          {item.content}
                        </div>
                        <div style={{ fontSize: "10px", color: "#999", marginTop: "4px", fontStyle: "italic" }}>
                          —— {item.source}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 底部提示 */}
                <div style={{
                  padding: "6px 12px",
                  background: "#fafafa",
                  borderTop: "1px solid #eee",
                  fontSize: "10px",
                  color: "#999",
                  textAlign: "center",
                }}>
                  点击吉日查看解读 · 引经据典，仅供参考
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 flex gap-2 px-1">
            <button
              onClick={() => { clearPaipanState("zeri"); setHasResult(false); }}
              className="flex-1 rounded-full py-2 text-sm font-semibold text-white transition-all active:scale-[0.98]"
              style={{ backgroundColor: BRAND }}
            >
              重新查询
            </button>
          </div>

          <EventDivinationPanel
            toolName="择日"
            chartContext={`事项: ${eventLabel}\n日期范围: ${startYear}-${String(startMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")} 至 ${endYear}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}\n生肖: ${userShengXiao || "未指定"}\n吉日数量: ${results.length}\n吉日详情: ${results.slice(0, 5).map(d => d.dateStr + "(" + d.dayGZ + "," + d.jianChu + "日,纳音" + d.naYin + ",评分" + d.score + ")").join("; ")}`}
            isPaidTool={false}
          />
        </div>
      )}
      {/* 分享排盘结果 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="择日查询结果"
          description="择吉择日"
          variant="block"
          label="分享排盘结果"
        />
      </div>


      {/* 免责声明（LOC 后台可配置文案） */}
      <div className="mx-3 mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong>免责声明：</strong>{zeriCfg.disclaimer}
        </p>
      </div>
      <div style={{ height: "20px" }} />
    </div>
  );
}
