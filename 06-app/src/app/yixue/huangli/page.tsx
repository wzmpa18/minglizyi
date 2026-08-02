"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Solar, LunarTime } from "lunar-javascript";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { useClientDate } from "@/lib/useClientDate";

const BRAND = "#7B2FBE";

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
              className="mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: BRAND }}
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
          <div className="mb-2 text-center text-sm font-semibold text-gray-600">干支四柱</div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "年柱", gz: yearGZ },
              { label: "月柱", gz: monthGZ },
              { label: "日柱", gz: dayGZ },
              { label: "时柱", gz: timeGZ },
            ].map((p) => (
              <div key={p.label} className="rounded-lg border border-gray-200 bg-gradient-to-b from-white to-gray-50 py-2 text-center">
                <div className="text-[11px] text-gray-400">{p.label}</div>
                <div className="mt-0.5 text-lg font-bold tracking-wider" style={{ color: BRAND }}>
                  {p.gz}
                </div>
              </div>
            ))}
          </div>
        </div>

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
              <div className="rounded-lg bg-blue-50 p-2">
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
              <div className="rounded-lg bg-purple-50 p-2">
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
          <div className="mb-2 text-center text-sm font-semibold text-gray-600">十二时辰吉凶</div>
          <div className="grid grid-cols-4 gap-1.5">
            {shichenData.map((sc) => (
              <div
                key={sc.zhi}
                className={`rounded-md border p-1.5 text-center ${
                  sc.luck === "吉"
                    ? "border-green-200 bg-green-50"
                    : sc.luck === "凶"
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200 bg-gray-50"
                }`}
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
