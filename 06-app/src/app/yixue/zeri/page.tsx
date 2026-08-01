"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Solar } from "lunar-javascript";
import { DatePicker } from "@/components/shared";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";

// ============================================================================
// 常量
// ============================================================================
const BRAND = "#7B2FBE";

// 事项类型（对应黄历"宜"中的关键词）
const EVENT_TYPES = [
  { key: "嫁娶", label: "嫁娶", icon: "囍", yiKeywords: ["嫁娶", "结婚", "纳采", "问名", "纳征", "请期", "亲迎"] },
  { key: "开业", label: "开业/开市", icon: "营", yiKeywords: ["开市", "开业", "开张", "交易", "立券", "纳财"] },
  { key: "搬家", label: "搬家/入宅", icon: "宅", yiKeywords: ["入宅", "移徙", "搬家", "安床", "安香", "入宅移居"] },
  { key: "出行", label: "出行/旅游", icon: "行", yiKeywords: ["出行", "旅游", "旅行", "出行远方", "远行"] },
  { key: "动土", label: "动土/装修", icon: "工", yiKeywords: ["动土", "修造", "装修", "破土", "起基", "竖柱"] },
  { key: "安葬", label: "安葬/下葬", icon: "安", yiKeywords: ["安葬", "下葬", "入殓", "破土", "启钻"] },
  { key: "祭祀", label: "祭祀/祈福", icon: "祭", yiKeywords: ["祭祀", "祈福", "酬神", "拜佛", "敬神", "斋醮"] },
  { key: "签约", label: "签约/交易", icon: "契", yiKeywords: ["交易", "立券", "签约", "订盟", "纳财", "开市"] },
];

// 建除十二神吉凶
const JIANCHU_JIXIONG: Record<string, "吉" | "凶" | "中"> = {
  "建": "中", "除": "吉", "满": "中", "平": "中",
  "定": "吉", "执": "中", "破": "凶", "危": "中",
  "成": "吉", "收": "中", "开": "吉", "闭": "凶",
};

// 生肖
const SHENGXIAO = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];

// ============================================================================
// 工具函数
// ============================================================================

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

interface AuspiciousDay {
  date: Date;
  dateStr: string;
  weekday: string;
  lunarStr: string;
  dayGZ: string;
  shengXiao: string;
  jianChu: string;
  jianChuJiXiong: "吉" | "凶" | "中";
  yi: string[];
  ji: string[];
  chongShengXiao: string;
  chongDesc: string;
  sha: string;
  naYin: string;
  // 匹配度评分
  score: number;
  // 匹配原因
  reasons: string[];
  // 特别提示
  warnings: string[];
}

function findAuspiciousDays(eventKey: string, startDate: Date, endDate: Date, userShengXiao?: string): AuspiciousDay[] {
  const eventType = EVENT_TYPES.find(e => e.key === eventKey);
  if (!eventType) return [];

  const results: AuspiciousDay[] = [];
  const cur = new Date(startDate);
  cur.setHours(12, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(12, 0, 0, 0);

  let iterCount = 0;
  while (cur <= end && iterCount < 100) {
    iterCount++;
    try {
      const solar = Solar.fromDate(cur);
      const lunar = solar.getLunar();
      const bazi = lunar.getEightChar();

      const dayGZ = `${bazi.getDayGan()}${bazi.getDayZhi()}`;
      const yi = lunar.getDayYi() || [];
      const ji = lunar.getDayJi() || [];
      const chongShengXiao = lunar.getDayChongShengXiao() || "";
      const chongDesc = lunar.getDayChongDesc() || "";
      const sha = lunar.getDaySha() || "";
      const zhiXing = lunar.getZhiXing() || "";
      const naYin = lunar.getDayNaYin() || "";
      const shengXiao = lunar.getYearShengXiao() || "";

      // 农历日期字符串
      const lunarMonth = lunar.getMonthInChinese();
      const lunarDay = lunar.getDayInChinese();
      const weekday = solar.getWeekInChinese();
      const jieQi = lunar.getJieQi();

      // 检查是否适合该事项
      let matched = false;
      let score = 0;
      const reasons: string[] = [];
      const warnings: string[] = [];

      // 检查宜中是否包含相关关键词
      for (const kw of eventType.yiKeywords) {
        if (yi.some(y => y.includes(kw) || kw.includes(y))) {
          matched = true;
          score += 20;
          reasons.push(`黄历宜"${kw}"`);
          break;
        }
      }

      // 检查建除十二神
      const jc = zhiXing;
      const jcJX = JIANCHU_JIXIONG[jc] || "中";
      if (jcJX === "吉") {
        score += 10;
        reasons.push(`建除"${jc}"日为吉日`);
      } else if (jcJX === "凶") {
        score -= 15;
        warnings.push(`建除"${jc}"日为凶日`);
      }

      // 检查冲煞
      if (chongShengXiao) {
        if (userShengXiao && chongShengXiao === userShengXiao) {
          score -= 30;
          warnings.push(`冲生肖${chongShengXiao}（您的生肖），不宜使用`);
        } else {
          warnings.push(`冲${chongShengXiao}，属${chongShengXiao}者需避开`);
        }
      }

      // 检查忌中是否有该事项
      for (const kw of eventType.yiKeywords) {
        if (ji.some(j => j.includes(kw) || kw.includes(j))) {
          score -= 25;
          warnings.push(`黄历忌"${kw}"`);
          break;
        }
      }

      // 周末加分
      const dayOfWeek = cur.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        score += 5;
        reasons.push("周末休息日，方便行事");
      }

      // 节气日提示
      if (jieQi) {
        warnings.push(`当日为${jieQi}节气`);
      }

      // 评分归一化
      score = Math.max(0, Math.min(100, score + 50));

      // 匹配到宜中的事项或综合评分>=60则入选
      if (matched || score >= 60) {
        results.push({
          date: new Date(cur),
          dateStr: formatDate(cur),
          weekday,
          lunarStr: `农历${lunarMonth}月${lunarDay}${jieQi ? `·${jieQi}` : ""}`,
          dayGZ,
          shengXiao,
          jianChu: jc,
          jianChuJiXiong: jcJX,
          yi: yi.slice(0, 6),
          ji: ji.slice(0, 4),
          chongShengXiao,
          chongDesc,
          sha,
          naYin,
          score,
          reasons,
          warnings,
        });
      }
    } catch {
      // skip errors for individual days
    }
    cur.setDate(cur.getDate() + 1);
  }

  // 按评分排序
  results.sort((a, b) => b.score - a.score);
  return results;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#ed4d49";
  if (score >= 65) return "#00a879";
  if (score >= 50) return "#ffa500";
  return "#666";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "最佳";
  if (score >= 65) return "宜用";
  if (score >= 50) return "可用";
  return "一般";
}

// ============================================================================
// 主组件
// ============================================================================
export default function ZeriPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const defaultStart = addDays(today, 1);
  const defaultEnd = addDays(today, 30);

  const [eventType, setEventType] = useState("嫁娶");
  const [startYear, setStartYear] = useState(defaultStart.getFullYear());
  const [startMonth, setStartMonth] = useState(defaultStart.getMonth() + 1);
  const [startDay, setStartDay] = useState(defaultStart.getDate());
  const [endYear, setEndYear] = useState(defaultEnd.getFullYear());
  const [endMonth, setEndMonth] = useState(defaultEnd.getMonth() + 1);
  const [endDay, setEndDay] = useState(defaultEnd.getDate());
  const [userShengXiao, setUserShengXiao] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [results, setResults] = useState<AuspiciousDay[]>([]);
  const [error, setError] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleSearch = useCallback(() => {
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    if (start > end) {
      setError("开始日期不能晚于结束日期");
      return;
    }
    const dayDiff = Math.round((end.getTime() - start.getTime()) / 86400000);
    if (dayDiff > 90) {
      setError("日期范围不能超过90天");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      const r = findAuspiciousDays(eventType, start, end, userShengXiao || undefined);
      setResults(r);
      setHasResult(true);
      setLoading(false);
      // 保存客户记录
      if(selectedClient && r.length > 0){
        try{saveRecord({clientId:selectedClient.id,type:"zeri",data:{results:r,inputParams:{eventType,startYear,startMonth,startDay,endYear,endMonth,endDay,userShengXiao}},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
      }
    }, 200);
  }, [eventType, startYear, startMonth, startDay, endYear, endMonth, endDay, userShengXiao, selectedClient]);

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
    const handler = () => setHasResult(false);
    window.addEventListener("yixue-edit", handler);
    return () => window.removeEventListener("yixue-edit", handler);
  }, []);

  const eventLabel = useMemo(() => {
    return EVENT_TYPES.find(e => e.key === eventType)?.label || eventType;
  }, [eventType]);

  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "375px", minHeight: "100vh" }}>
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
        showGender={false} showCalType={false} showToggles={false} showRegion={false} showName={false}
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
        showGender={false} showCalType={false} showToggles={false} showRegion={false} showName={false}
        submitText="确认结束日期" title="选择结束日期"
      />

      {/* 输入表单 */}
      {!hasResult && (
        <div className="bg-white px-3 py-3">
          {/* 事项类型 */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">选择事项</label>
            <div className="grid grid-cols-4 gap-1.5">
              {EVENT_TYPES.map((e) => (
                <button
                  key={e.key}
                  onClick={() => setEventType(e.key)}
                  className={`flex flex-col items-center rounded-lg border py-2 text-xs transition-all ${
                    eventType === e.key
                      ? "border-[#7B2FBE] bg-purple-50 text-[#7B2FBE]"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }`}
                >
                  <span className="text-base font-bold">{e.icon}</span>
                  <span className="mt-0.5 text-[10px]">{e.label}</span>
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
          <div className="mb-3">
            <span className="mb-1 block text-xs text-gray-400">快捷日期范围</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "近7天", days: 7 },
                { label: "近15天", days: 15 },
                { label: "近30天", days: 30 },
                { label: "近60天", days: 60 },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => {
                    setStartYear(today.getFullYear());
                    setStartMonth(today.getMonth() + 1);
                    setStartDay(today.getDate() + 1);
                    const e = addDays(today, q.days);
                    setEndYear(e.getFullYear());
                    setEndMonth(e.getMonth() + 1);
                    setEndDay(e.getDate());
                  }}
                  className="border border-[#e8e8e8] rounded px-2 py-0.5 text-xs text-[#888] bg-white cursor-pointer hover:bg-gray-50"
                >
                  {q.label}
                </button>
              ))}
            </div>
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
          {/* 结果概览 */}
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
            </div>
          </div>

          {/* 吉日列表 */}
          {results.length === 0 ? (
            <div className="rounded-lg border border-gray-100 p-6 text-center text-sm text-gray-400">
              <p>所选日期范围内暂无合适吉日</p>
              <p className="mt-1 text-xs text-gray-300">建议扩大日期范围或更换事项类型</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((day, idx) => (
                <div key={day.dateStr} className="rounded-lg border border-gray-100 p-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: getScoreColor(day.score) }}>
                          {getScoreLabel(day.score)}
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
                      <div className="text-lg font-bold" style={{ color: getScoreColor(day.score) }}>{day.score}</div>
                      <div className="text-[10px] text-gray-400">匹配度</div>
                    </div>
                  </div>

                  {/* 冲煞 */}
                  {day.chongShengXiao && (
                    <div className="mt-1.5 rounded bg-red-50 px-1.5 py-1 text-[10px] text-red-600">
                      冲{day.chongShengXiao}（{day.chongDesc}） · 煞{day.sha}方
                    </div>
                  )}

                  {/* 宜/忌 */}
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

                  {/* 推荐理由 */}
                  {day.reasons.length > 0 && (
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

          <div className="mt-3 flex gap-2 px-1">
            <button
              onClick={() => setHasResult(false)}
              className="flex-1 rounded-full py-2 text-sm font-semibold text-white transition-all active:scale-[0.98]"
              style={{ backgroundColor: BRAND }}
            >
              重新查询
            </button>
          </div>
        </div>
      )}

      {/* 免责声明 */}
      <div className="mx-3 mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong>免责声明：</strong>本页面内容仅供传统文化娱乐参考，不构成任何决策建议。择吉属于传统民俗文化，日期选择请结合实际情况理性决定。
        </p>
      </div>
      <div style={{ height: "20px" }} />
    </div>
  );
}
