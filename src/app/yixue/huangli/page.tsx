"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Solar, LunarTime } from "lunar-javascript";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { useClientDate } from "@/lib/useClientDate";
import { getCalendarGanzhiInterpretation, getCalendarJieqiInterpretation, getCalendarShichenInterpretation } from "@/lib/calendar-interpretations";
import type { CalendarInterpretItem } from "@/lib/calendar-interpretations";
import { savePaipanState, loadPaipanState } from "@/lib/paipanPersistence";

import { ShareButton } from "@/components/ShareButton";
const BRAND = "#7B2FBE";

// 解读类型颜色
const INTERPRET_TYPE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  ganzhi: { bg: "#f3e8ff", fg: "#7B2FBE", label: "干支" },
  jieqi: { bg: "#e0f2fe", fg: "#0284c7", label: "节气" },
  shichen: { bg: "#fef3c7", fg: "#d97706", label: "时辰" },
};

// 时辰范围（对照 jishiyu TIME_RANGE）
const SHICHEN_LIST = [
  { zhi: "子", range: "23:00-00:59" },
  { zhi: "丑", range: "01:00-02:59" },
  { zhi: "寅", range: "03:00-04:59" },
  { zhi: "卯", range: "05:00-06:59" },
  { zhi: "辰", range: "07:00-08:59" },
  { zhi: "巳", range: "09:00-10:59" },
  { zhi: "午", range: "11:00-12:59" },
  { zhi: "未", range: "13:00-14:59" },
  { zhi: "申", range: "15:00-16:59" },
  { zhi: "酉", range: "17:00-18:59" },
  { zhi: "戌", range: "19:00-20:59" },
  { zhi: "亥", range: "21:00-22:59" },
];

export default function HuangliPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(2026, 0, 1));
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [saveTip, setSaveTip] = useState("");
  const [interpretPanel, setInterpretPanel] = useState<{title: string; items: CalendarInterpretItem[]} | null>(null);
  const today = useClientDate();
  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  // URL参数clientId
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("huangli");
    if (prefill) { clearPrefillData("huangli"); }
  }, []);

  // localStorage 持久化：恢复黄历状态
  useEffect(() => {
    const saved = loadPaipanState("huangli");
    if (saved && saved.input) {
      const inp = saved.input as any;
      if (inp.selectedDate) setSelectedDate(new Date(inp.selectedDate));
    }
  }, []);

  // localStorage 持久化：保存黄历状态
  useEffect(() => {
    savePaipanState("huangli",{input:{selectedDate:selectedDate.toISOString()},showForm:false,_ts:Date.now()});
  }, [selectedDate]);

  const handleSaveRecord = () => {
    if (!selectedClient) { alert("请先选择客户"); return; }
    const dateStr = `${y}-${m}-${d}`;
    const data = {
      dateStr, year: y, month: m, day: d, weekday,
      lunarMonth, lunarDay, shengXiao,
      yearGZ, monthGZ, dayGZ, timeGZ,
      yi: yi.slice(0, 10), ji: ji.slice(0, 10),
    };
    try {
      saveRecord({ clientId: selectedClient.id, type: "huangli", data, note: "", status: "pending" });
      setSaveTip("已保存到客户档案");
      setTimeout(() => setSaveTip(""), 2000);
    } catch(e) { console.error("保存失败:", e); }
  };

  // 点击干支解读
  const handleGanzhiClick = useCallback((gz: string, label: string) => {
    const interp = getCalendarGanzhiInterpretation(gz);
    if (interp) {
      setInterpretPanel({ title: `${label} · ${gz}`, items: interp.items });
    }
  }, []);

  // 点击节气解读
  const handleJieqiClick = useCallback((jieqi: string) => {
    const interp = getCalendarJieqiInterpretation(jieqi);
    if (interp) setInterpretPanel(interp);
  }, []);

  // 点击时辰解读
  const handleShichenClick = useCallback((shichen: string, ganzhi: string) => {
    const interp = getCalendarShichenInterpretation(shichen);
    if (interp) {
      setInterpretPanel({ title: `${shichen}时 · ${ganzhi}`, items: interp.items });
    }
  }, []);

  const solar = useMemo(() => Solar.fromDate(selectedDate), [selectedDate]);
  const lunar = useMemo(() => solar.getLunar(), [solar]);
  const bazi = useMemo(() => lunar.getEightChar(), [lunar]);

  const goPrev = useCallback(() => {
    setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  }, []);
  const goNext = useCallback(() => {
    setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  }, []);
  const goToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const y = solar.getYear();
  const m = solar.getMonth();
  const d = solar.getDay();
  const weekday = solar.getWeekInChinese();
  const lunarMonth = lunar.getMonthInChinese();
  const lunarDay = lunar.getDayInChinese();
  const shengXiao = lunar.getYearShengXiao();

  // 干支四柱
  const yearGZ = `${bazi.getYearGan()}${bazi.getYearZhi()}`;
  const monthGZ = `${bazi.getMonthGan()}${bazi.getMonthZhi()}`;
  const dayGZ = `${bazi.getDayGan()}${bazi.getDayZhi()}`;
  const timeGZ = `${lunar.getTimeGan()}${lunar.getTimeZhi()}`;

  // 宜忌
  const yi = lunar.getDayYi();
  const ji = lunar.getDayJi();

  // 节气
  const jieQi = lunar.getJieQi();
  const nextJieQi = lunar.getNextJieQi(true);
  const prevJieQi = lunar.getPrevJieQi(true);

  // 核心黄历数据
  const chongShengXiao = lunar.getDayChongShengXiao();
  const chongDesc = lunar.getDayChongDesc();
  const sha = lunar.getDaySha();
  const zhiXing = lunar.getZhiXing();
  const tianShenType = lunar.getDayTianShenType();
  const tianShen = lunar.getDayTianShen();
  const naYin = lunar.getDayNaYin();
  const xingXiu = `${lunar.getXiu()}${lunar.getZheng()}${lunar.getAnimal()}`;
  const pengZuGan = lunar.getPengZuGan();
  const pengZuZhi = lunar.getPengZuZhi();
  const taiShen = lunar.getDayPositionTai();

  // 方位
  const caiShen = `${lunar.getDayPositionCaiDesc()} ${lunar.getDayPositionCai()}`;
  const xiShen = `${lunar.getDayPositionXiDesc()} ${lunar.getDayPositionXi()}`;
  const fuShen = `${lunar.getDayPositionFuDesc()} ${lunar.getDayPositionFu()}`;
  const yangGui = `${lunar.getDayPositionYangGuiDesc()} ${lunar.getDayPositionYangGui()}`;

  // 吉神凶煞
  const jiShen = lunar.getDayJiShen();
  const xiongSha = lunar.getDayXiongSha();

  // 节日
  const lunarFestivals = lunar.getFestivals();
  const solarFestivals = solar.getFestivals();

  // 十二时辰吉凶
  const shichenData = useMemo(() => {
    return SHICHEN_LIST.map((sc, idx) => {
      const h = idx === 0 ? 0 : idx * 2;
      const lt = LunarTime.fromYmdHms(lunar.getYear(), lunar.getMonth(), lunar.getDay(), h, 0, 0);
      return {
        ...sc,
        gan: lt.getGan(),
        zhi: lt.getZhi(),
        ganZhi: `${lt.getGan()}${lt.getZhi()}`,
        luck: lt.getTianShenLuck(),
      };
    });
  }, [lunar]);

  const isToday =
    y === today.getFullYear() &&
    m === today.getMonth() + 1 &&
    d === today.getDate();

  return (
    <div className="min-h-screen bg-[#ededed] pb-[80px]">
      {/* ===== 顶部日期导航栏 ===== */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #9B5ECF 100%)` }}
      >
        <button
          onClick={goPrev}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white active:bg-white/30"
          aria-label="上一天"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-center">
          <div className="text-base font-bold">
            {y}年{m}月{d}日 星期{weekday}
          </div>
          {isToday && <div className="text-[11px] opacity-80">今天</div>}
        </div>
        <button
          onClick={goNext}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white active:bg-white/30"
          aria-label="下一天"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="mx-auto w-full px-3 pt-3" style={{ maxWidth: "500px" }}>
        {/* 今天按钮 */}
        {!isToday && (
          <button
            onClick={goToday}
            className="mb-2.5 w-full rounded-lg border py-2 text-sm font-semibold"
            style={{ borderColor: BRAND, color: BRAND, backgroundColor: "#F3EDF7" }}
          >
            回到今日
          </button>
        )}

        {/* 客户选择与保存 */}
        <div className="mb-2.5 bg-white rounded-lg shadow-sm">
          <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
          {selectedClient && (
            <div className="px-3 pb-2">
              <button
                onClick={handleSaveRecord}
                className="w-full rounded-lg py-2 text-sm text-white font-medium"
                style={{ backgroundColor: BRAND }}
              >
                {saveTip || "保存当日黄历到客户档案"}
              </button>
            </div>
          )}
        </div>

        {/* ===== 公历农历日期大字 ===== */}
        <div className="mb-2.5 rounded-[10px] bg-white p-4 text-center shadow-sm">
          <div className="text-4xl font-bold" style={{ color: BRAND }}>
            {lunarMonth}月{lunarDay}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {y}年{m}月{d}日 · 星期{weekday} · {shengXiao}年
          </div>
          {jieQi && (
            <div
              onClick={() => handleJieqiClick(jieQi)}
              className="mt-2 inline-block cursor-pointer rounded-full px-3 py-0.5 text-xs font-semibold text-white hover:opacity-80"
              style={{ backgroundColor: BRAND }}
              title="点击查看节气详解"
            >
              {jieQi}
            </div>
          )}
          {(lunarFestivals.length > 0 || solarFestivals.length > 0) && (
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {[...lunarFestivals, ...solarFestivals].map((f, i) => (
                <span key={i} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-500">
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ===== 干支四柱 ===== */}
        <div className="mb-2.5 rounded-[10px] bg-white p-3.5 shadow-sm">
          <div className="mb-2 text-center text-sm font-semibold text-gray-600">干支四柱 · 点击查看详解</div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "年柱", gz: yearGZ },
              { label: "月柱", gz: monthGZ },
              { label: "日柱", gz: dayGZ },
              { label: "时柱", gz: timeGZ },
            ].map((p) => (
              <div
                key={p.label}
                onClick={() => handleGanzhiClick(p.gz, p.label)}
                className="cursor-pointer rounded-lg border border-gray-200 bg-gradient-to-b from-white to-gray-50 py-2 text-center hover:border-purple-300 hover:from-purple-50/30 hover:to-purple-50/10 transition-colors"
                title="点击查看干支详解"
              >
                <div className="text-[11px] text-gray-400">{p.label}</div>
                <div className="mt-0.5 text-lg font-bold tracking-wider" style={{ color: BRAND }}>
                  {p.gz}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== 解读抽屉 ===== */}
        {interpretPanel && (
          <div className="mb-2.5">
            <div style={{
              border: "1px solid #7B2FBE",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(123, 47, 190, 0.12)",
              backgroundColor: "#fff",
            }}>
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
              <div style={{ padding: "10px 12px", maxHeight: "360px", overflowY: "auto" }}>
                {interpretPanel.items.map((item, idx) => {
                  const tc = INTERPRET_TYPE_COLORS[item.type] || INTERPRET_TYPE_COLORS["ganzhi"];
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
              <div style={{
                padding: "6px 12px",
                background: "#fafafa",
                borderTop: "1px solid #eee",
                fontSize: "10px",
                color: "#999",
                textAlign: "center",
              }}>
                点击干支、节气或时辰查看经典解读 · 引经据典，仅供参考
              </div>
            </div>
          </div>
        )}

        {/* ===== 当日宜忌 ===== */}
        <div className="mb-2.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-[10px] border border-green-100 bg-white p-3.5 shadow-sm">
            <div className="mb-2 text-center text-base font-bold text-emerald-600">宜</div>
            {yi.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-1">
                {yi.map((item, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-xs text-emerald-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-gray-400">诸事不宜</div>
            )}
          </div>
          <div className="rounded-[10px] border border-red-100 bg-white p-3.5 shadow-sm">
            <div className="mb-2 text-center text-base font-bold text-red-500">忌</div>
            {ji.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-1">
                {ji.map((item, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-xs text-red-500"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-gray-400">无特别禁忌</div>
            )}
          </div>
        </div>

        {/* ===== 冲煞生肖 & 值神 & 建星 ===== */}
        <div className="mb-2.5 rounded-[10px] bg-white p-3.5 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <InfoCell label="冲煞" value={`冲${chongShengXiao}(${chongDesc}) 煞${sha}`} valueColor="#e53e3e" />
            <InfoCell label="十二建星" value={`${zhiXing}日`} valueColor={BRAND} />
            <InfoCell label={`${tianShenType}（值日）`} value={tianShen} valueColor={tianShenType === "黄道" ? "#00a879" : "#e53e3e"} />
            <InfoCell label="纳音五行" value={naYin} valueColor="#a64b00" />
          </div>
        </div>

        {/* ===== 胎神占方 & 彭祖百忌 ===== */}
        <div className="mb-2.5 rounded-[10px] bg-white p-3.5 shadow-sm">
          <div className="mb-2 text-center text-sm font-semibold text-gray-600">胎神与彭祖百忌</div>
          <div className="rounded-lg bg-amber-50 p-2.5 mb-2">
            <div className="text-[11px] text-amber-600 font-semibold mb-0.5">胎神占方</div>
            <div className="text-sm text-amber-800 font-semibold">{taiShen}</div>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            <div className="rounded-lg bg-amber-50 p-2.5">
              <div className="text-[11px] text-amber-600 font-semibold mb-0.5">彭祖百忌（天干）</div>
              <div className="text-sm text-amber-800">{pengZuGan}</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-2.5">
              <div className="text-[11px] text-amber-600 font-semibold mb-0.5">彭祖百忌（地支）</div>
              <div className="text-sm text-amber-800">{pengZuZhi}</div>
            </div>
          </div>
        </div>

        {/* ===== 二十八星宿 ===== */}
        <div className="mb-2.5 rounded-[10px] bg-white p-3.5 shadow-sm">
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniCell label="廿八星宿" value={xingXiu} />
            <MiniCell label="喜神方位" value={xiShen} />
            <MiniCell label="财神方位" value={caiShen} />
            <MiniCell label="福神方位" value={fuShen} />
            <MiniCell label="阳贵方位" value={yangGui} />
            <MiniCell label="生肖" value={shengXiao} />
          </div>
        </div>

        {/* ===== 吉神凶煞 ===== */}
        <div className="mb-2.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-[10px] border border-green-100 bg-white p-3 shadow-sm">
            <div className="mb-1.5 text-center text-sm font-semibold text-emerald-600">吉神宜趋</div>
            <div className="flex flex-wrap justify-center gap-1">
              {jiShen.length > 0 ? (
                jiShen.slice(0, 10).map((s, i) => (
                  <span key={i} className="rounded bg-green-50 px-1.5 py-0.5 text-[11px] text-emerald-600">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-gray-400">无</span>
              )}
            </div>
          </div>
          <div className="rounded-[10px] border border-red-100 bg-white p-3 shadow-sm">
            <div className="mb-1.5 text-center text-sm font-semibold text-red-500">凶煞宜忌</div>
            <div className="flex flex-wrap justify-center gap-1">
              {xiongSha.length > 0 ? (
                xiongSha.slice(0, 10).map((s, i) => (
                  <span key={i} className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] text-red-500">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-gray-400">无</span>
              )}
            </div>
          </div>
        </div>

        {/* ===== 节气信息 ===== */}
        <div className="mb-2.5 rounded-[10px] bg-white p-3.5 shadow-sm">
          <div className="mb-2 text-center text-sm font-semibold text-gray-600">节气信息</div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            {prevJieQi && (
              <div
                className="cursor-pointer rounded-lg bg-blue-50 p-2 hover:bg-blue-100 transition-colors"
                onClick={() => handleJieqiClick(prevJieQi.getName())}
                title="点击查看节气详解"
              >
                <div className="text-gray-400">上一节气</div>
                <div className="font-semibold text-[#0074e4]">
                  {prevJieQi.getName()}
                </div>
                <div className="text-gray-400 mt-0.5">
                  {prevJieQi.getSolar().getMonth()}月{prevJieQi.getSolar().getDay()}日
                </div>
              </div>
            )}
            {nextJieQi && (
              <div
                className="cursor-pointer rounded-lg bg-purple-50 p-2 hover:bg-purple-100 transition-colors"
                onClick={() => handleJieqiClick(nextJieQi.getName())}
                title="点击查看节气详解"
              >
                <div className="text-gray-400">下一节气</div>
                <div className="font-semibold" style={{ color: BRAND }}>
                  {nextJieQi.getName()}
                </div>
                <div className="text-gray-400 mt-0.5">
                  {nextJieQi.getSolar().getMonth()}月{nextJieQi.getSolar().getDay()}日
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== 十二时辰吉凶 ===== */}
        <div className="mb-2.5 rounded-[10px] bg-white p-3.5 shadow-sm">
          <div className="mb-2 text-center text-sm font-semibold text-gray-600">十二时辰吉凶 · 点击查看详解</div>
          <div className="grid grid-cols-4 gap-1.5">
            {shichenData.map((sc) => (
              <div
                key={sc.zhi}
                onClick={() => handleShichenClick(sc.zhi, sc.ganZhi)}
                className={`cursor-pointer rounded-md border p-1.5 text-center hover:opacity-80 transition-opacity ${
                  sc.luck === "吉"
                    ? "border-green-200 bg-green-50 hover:border-green-300"
                    : sc.luck === "凶"
                    ? "border-red-200 bg-red-50 hover:border-red-300"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
                title="点击查看时辰详解"
              >
                <div className="text-xs font-bold">{sc.zhi}时</div>
                <div className="text-[10px] text-gray-500">{sc.ganZhi}</div>
                <div className="text-[9px] text-gray-400">{sc.range}</div>
                <div
                  className={`mt-0.5 text-xs font-bold ${
                    sc.luck === "吉"
                      ? "text-emerald-600"
                      : sc.luck === "凶"
                      ? "text-red-500"
                      : "text-amber-600"
                  }`}
                >
                  {sc.luck}
                </div>
              </div>
            ))}
          </div>
        </div>
      {/* 分享排盘结果 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="老黄历查询结果"
          description="老黄历查询"
          variant="block"
          label="分享排盘结果"
        />
      </div>

      {/* ===== 添加到手机桌面 ===== */}
      <AddToHomeScreen />


        {/* ===== 免责声明 ===== */}
        <div className="rounded-lg bg-[#f9f9f9] p-3 text-center border border-gray-200">
          <p className="mb-1 text-xs font-semibold text-gray-400">免责声明</p>
          <p className="text-[11px] leading-relaxed text-gray-400">
            本老黄历数据由 lunar-javascript 历法库计算，仅供传统文化学习与参考。宜忌、冲煞、神煞等内容均来源于传统择日典籍，不构成任何决策依据。请理性看待，切勿迷信。
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== 小组件 =====
function InfoCell({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2.5 text-center">
      <div className="text-[11px] text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm font-bold" style={{ color: valueColor }}>
        {value}
      </div>
    </div>
  );
}

function MiniCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2">
      <div className="text-[11px] text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-gray-700">{value}</div>
    </div>
  );
}

// ===== 添加到手机桌面组件 =====
function AddToHomeScreen() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 检测是否已在独立模式（已添加到桌面）
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // 检测 iOS
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    // 监听 beforeinstallprompt 事件（Android Chrome）
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // 已添加到桌面时不显示
  if (isStandalone) return null;

  const handleAddClick = async () => {
    if (deferredPrompt) {
      // Android Chrome：触发安装提示
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      // iOS 或不支持 beforeinstallprompt 的浏览器：显示手动指引
      setShowModal(true);
    }
  };

  return (
    <>
      <div className="mx-3 mb-2">
        <button
          onClick={handleAddClick}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-semibold transition-colors active:opacity-80"
          style={{ borderColor: BRAND, color: BRAND, backgroundColor: "#F3EDF7" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          添加黄历到手机桌面
        </button>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-800">添加到桌面</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">iOS 设备请按以下步骤操作：</p>
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold" style={{ backgroundColor: BRAND }}>1</span>
                    <span>点击 Safari 底部的<span className="font-semibold" style={{ color: BRAND }}> 分享 </span>按钮</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold" style={{ backgroundColor: BRAND }}>2</span>
                    <span>选择<span className="font-semibold" style={{ color: BRAND }}> 添加到主屏幕</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold" style={{ backgroundColor: BRAND }}>3</span>
                    <span>点击右上角<span className="font-semibold" style={{ color: BRAND }}> 添加</span> 即可</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Android 设备请按以下步骤操作：</p>
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold" style={{ backgroundColor: BRAND }}>1</span>
                    <span>点击浏览器菜单（右上角 <span className="font-semibold" style={{ color: BRAND }}>⋮</span>）</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold" style={{ backgroundColor: BRAND }}>2</span>
                    <span>选择<span className="font-semibold" style={{ color: BRAND }}> 添加到主屏幕</span> 或<span className="font-semibold" style={{ color: BRAND }}> 安装应用</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold" style={{ backgroundColor: BRAND }}>3</span>
                    <span>确认添加即可在桌面查看黄历</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-lg bg-purple-50 p-2.5">
              <p className="text-[11px] text-gray-500 leading-relaxed">
                添加到桌面后，可以像原生 APP 一样全屏使用黄历功能，无需打开浏览器输入网址。
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}