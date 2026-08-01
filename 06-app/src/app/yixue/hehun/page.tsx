"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  solarToBazi,
  calculateHehun,
  getShengXiao,
  getShiShenShort,
  GAN_WUXING,
  ZHI_WUXING,
} from "@/algorithm-core";
import type { HehunResult } from "@/algorithm-core";
import { DatePickerInline, QuickBtnGroup } from "@/components/shared";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";

// ============================================================================
// 常量配置
// ============================================================================

const BRAND_COLOR = "#7B2FBE";
const MALE_COLOR = "#5B6ABF";
const FEMALE_COLOR = "#D946A8";

/** 五行颜色映射 */
const WX_COLORS: Record<string, string> = {
  金: "#D4A017",
  木: "#2E8B57",
  水: "#1E6FBF",
  火: "#D94040",
  土: "#A0522D",
};

/** 合婚等级颜色 */
const GRADE_COLORS: Record<string, string> = {
  "天作之合": "#D427B5",
  "上等婚": "#3E9B3E",
  "中等婚": "#1E6FBF",
  "下等婚": "#E08020",
  "需谨慎": "#D93030",
};

const COL_NAMES = ["年柱", "月柱", "日柱", "时柱"];

// ============================================================================
// 辅助函数
// ============================================================================

/** 从纳音名称提取五行 */
function extractNayinWx(nayin: string): string {
  if (!nayin) return "";
  if (nayin.includes("金")) return "金";
  if (nayin.includes("木")) return "木";
  if (nayin.includes("水")) return "水";
  if (nayin.includes("火")) return "火";
  if (nayin.includes("土")) return "土";
  return "";
}

/** 获取默认日期字符串（N年前） */
function getDefaultDateStr(yearsAgo: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - yearsAgo);
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0") +
    "T" +
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0")
  );
}

// ============================================================================
// 子组件：八字排盘卡片
// ============================================================================

function BaziCard({
  bazi,
  label,
  genderLabel,
  themeColor,
}: {
  bazi: any;
  label: string;
  genderLabel: string;
  themeColor: string;
}) {
  const sx = getShengXiao(bazi.pillars[0].zhi);
  const wuxingCount = bazi.wuxingCount || {};

  return (
    <div
      className="rounded-2xl bg-white overflow-hidden"
      style={{
        boxShadow: "0 2px 12px rgba(123,47,190,0.10), inset 0 0 0 1px " + themeColor + "22",
      }}
    >
      {/* 头部 */}
      <div
        className="text-center py-1.5 font-bold text-sm text-white"
        style={{ backgroundColor: themeColor }}
      >
        {label}（{sx}）
      </div>

      <div className="px-1 py-2">
        {/* 出生日期 */}
        <div className="text-center text-gray-500 mb-1.5" style={{ fontSize: "10px" }}>
          {bazi.input?.solarDate || ""}
        </div>

        {/* 四柱表格 */}
        <table className="w-full text-center border-collapse">
          <thead>
            <tr>
              {COL_NAMES.map((cn) => (
                <td key={cn} className="text-gray-400 font-medium" style={{ width: "25%", fontSize: "10px" }}>
                  {cn}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 十神 */}
            <tr>
              {bazi.pillars.map((p: any, i: number) => (
                <td key={i} className="text-gray-400" style={{ fontSize: "9px", height: "16px" }}>
                  {i === 2 ? (
                    <span style={{ color: themeColor, fontWeight: 600 }}>{genderLabel}</span>
                  ) : (
                    <span>{getShiShenShort(p.shishen?.gan || "") || ""}</span>
                  )}
                </td>
              ))}
            </tr>
            {/* 天干 */}
            <tr>
              {bazi.pillars.map((p: any, i: number) => (
                <td
                  key={i}
                  className="font-black"
                  style={{
                    fontSize: "20px",
                    color: WX_COLORS[GAN_WUXING[p.gan as keyof typeof GAN_WUXING] || ""] || "#333",
                    lineHeight: "1.3",
                  }}
                >
                  {p.gan}
                </td>
              ))}
            </tr>
            {/* 地支 */}
            <tr>
              {bazi.pillars.map((p: any, i: number) => (
                <td
                  key={i}
                  className="font-black"
                  style={{
                    fontSize: "20px",
                    color: WX_COLORS[ZHI_WUXING[p.zhi as keyof typeof ZHI_WUXING] || ""] || "#333",
                    lineHeight: "1.3",
                  }}
                >
                  {p.zhi}
                </td>
              ))}
            </tr>
            {/* 纳音 */}
            <tr>
              {bazi.pillars.map((p: any, i: number) => {
                const nwx = extractNayinWx(p.nayin || "");
                return (
                  <td key={i} style={{ fontSize: "9px", paddingTop: "2px" }}>
                    <span
                      className="inline-block px-1 rounded"
                      style={{
                        backgroundColor: nwx ? WX_COLORS[nwx] + "18" : "#f5f5f5",
                        color: WX_COLORS[nwx] || "#888",
                      }}
                    >
                      {p.nayin || ""}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        {/* 五行数量 */}
        <div className="flex justify-center gap-2 mt-2" style={{ fontSize: "10px" }}>
          {(["金", "木", "水", "火", "土"] as const).map((wx) => (
            <span key={wx} style={{ color: WX_COLORS[wx] }}>
              {wx}
              <b>{wuxingCount[wx] ?? 0}</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 子组件：分析项展示
// ============================================================================

function AnalysisItem({ item }: { item: HehunResult["items"][number] }) {
  const iconColor = item.pass ? "#3E9B3E" : "#D93030";
  const iconText = item.pass ? "✓" : "✗";
  const bgColor = item.pass ? "#f0faf0" : "#fef2f2";

  return (
    <div
      className="rounded-xl p-2.5 mb-2"
      style={{ backgroundColor: bgColor, borderLeft: "3px solid " + (item.pass ? "#3E9B3E" : "#D93030") }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-sm" style={{ color: "#333" }}>
          {item.name}
        </span>
        <span
          className="flex items-center justify-center rounded-full text-white font-bold"
          style={{
            width: "22px",
            height: "22px",
            fontSize: "12px",
            backgroundColor: iconColor,
          }}
        >
          {iconText}
        </span>
      </div>
      <div className={"text-sm font-medium " + (item.pass ? "text-green-700" : "text-red-600")}>
        {item.passDesc}
      </div>
      <div className="text-xs text-gray-500 mt-1">{item.detail}</div>
      <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
    </div>
  );
}

// ============================================================================
// 主页面组件
// ============================================================================

export default function HehunPage() {
  const router = useRouter();

  const [maleYear, setMaleYear] = useState(() => new Date().getFullYear() - 25);
  const [maleMonth, setMaleMonth] = useState(1);
  const [maleDay, setMaleDay] = useState(1);
  const [maleHour, setMaleHour] = useState(12);
  const [femaleYear, setFemaleYear] = useState(() => new Date().getFullYear() - 23);
  const [femaleMonth, setFemaleMonth] = useState(1);
  const [femaleDay, setFemaleDay] = useState(1);
  const [femaleHour, setFemaleHour] = useState(12);
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [recordSaved, setRecordSaved] = useState(false);

  // URL参数clientId + 回填检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("hehun");
    if (prefill) { try { setHasResult(true); clearPrefillData("hehun"); } catch(e){} }
  }, []);

  // 男方八字
  const maleBazi = useMemo(() => {
    try {
      return solarToBazi({
        year: maleYear,
        month: maleMonth,
        day: maleDay,
        hour: maleHour,
        minute: 0,
        gender: "male",
      });
    } catch {
      return null;
    }
  }, [maleYear, maleMonth, maleDay, maleHour]);

  // 女方八字
  const femaleBazi = useMemo(() => {
    try {
      return solarToBazi({
        year: femaleYear,
        month: femaleMonth,
        day: femaleDay,
        hour: femaleHour,
        minute: 0,
        gender: "female",
      });
    } catch {
      return null;
    }
  }, [femaleYear, femaleMonth, femaleDay, femaleHour]);

  // 合婚结果（仅在点击按钮后才有）
  const hehunResult = useMemo(() => {
    if (!hasResult || !maleBazi || !femaleBazi) return null;
    try {
      return calculateHehun(maleBazi as any, femaleBazi as any);
    } catch (e) {
      console.error("合婚计算出错:", e);
      return null;
    }
  }, [hasResult, maleBazi, femaleBazi]);

  // 保存客户记录（hehunResult计算后）
  useEffect(() => {
    if (hasResult && hehunResult && selectedClient && !recordSaved) {
      try {
        saveRecord({
          clientId: selectedClient.id, type: "hehun",
          data: { ...hehunResult, inputParams: { maleYear, maleMonth, maleDay, maleHour, femaleYear, femaleMonth, femaleDay, femaleHour } },
          note: "", status: "pending"
        });
        setRecordSaved(true);
      } catch(e) { console.error("保存记录失败:", e); }
    }
  }, [hasResult, hehunResult, selectedClient, recordSaved, maleYear, maleMonth, maleDay, maleHour, femaleYear, femaleMonth, femaleDay, femaleHour]);

  /** 点击开始合婚 */
  const doHehun = useCallback(() => {
    setLoading(true);
    setRecordSaved(false);
    setTimeout(() => {
      setHasResult(true);
      setLoading(false);
      // 滚动到结果区
      setTimeout(() => {
        const el = document.getElementById("hehun-result");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }, 300);
  }, []);

  /** 填充示例日期 */
  const fillExample = useCallback(() => {
    const d = new Date();
    setMaleYear(d.getFullYear() - 25);
    setMaleMonth(6);
    setMaleDay(15);
    setMaleHour(10);
    setFemaleYear(d.getFullYear() - 23);
    setFemaleMonth(3);
    setFemaleDay(20);
    setFemaleHour(14);
  }, []);

  /** 重置 */
  const doReset = useCallback(() => {
    const d = new Date();
    setMaleYear(d.getFullYear() - 25);
    setMaleMonth(1);
    setMaleDay(1);
    setMaleHour(12);
    setFemaleYear(d.getFullYear() - 23);
    setFemaleMonth(1);
    setFemaleDay(1);
    setFemaleHour(12);
    setHasResult(false);
  }, []);

  return (
    <div
      className="mx-auto flex min-h-screen flex-col"
      style={{ maxWidth: "420px", backgroundColor: "#f5f0fa" }}
    >
      {/* ====== 顶部导航栏 ====== */}
      <header
        className="sticky top-0 z-50 flex items-center h-11 w-full px-2"
        style={{ backgroundColor: BRAND_COLOR }}
      >
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center"
          title="返回"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1 text-center text-lg font-bold text-white tracking-wide">
          言道八字合婚
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 pb-6">
        {/* ====== 输入区域 ====== */}
        <div className="mx-3 mt-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-center mb-3">
            <span
              className="inline-block px-4 py-1 rounded-full text-white text-xs font-bold"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              八字合婚 · 因缘天定
            </span>
          </div>

          {/* 男女并排输入 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 男方 */}
            <div>
              <label className="flex items-center gap-1 text-sm font-bold mb-1.5" style={{ color: MALE_COLOR }}>
                <span
                  className="inline-flex items-center justify-center rounded-full text-white text-xs font-bold"
                  style={{ width: "18px", height: "18px", backgroundColor: MALE_COLOR, fontSize: "10px" }}
                >
                  ♂
                </span>
                男方
              </label>
              <DatePickerInline
                year={maleYear} month={maleMonth} day={maleDay} hour={maleHour}
                onYearChange={setMaleYear} onMonthChange={setMaleMonth}
                onDayChange={setMaleDay} onHourChange={setMaleHour}
              />
            </div>

            {/* 女方 */}
            <div>
              <label className="flex items-center gap-1 text-sm font-bold mb-1.5" style={{ color: FEMALE_COLOR }}>
                <span
                  className="inline-flex items-center justify-center rounded-full text-white text-xs font-bold"
                  style={{ width: "18px", height: "18px", backgroundColor: FEMALE_COLOR, fontSize: "10px" }}
                >
                  ♀
                </span>
                女方
              </label>
              <DatePickerInline
                year={femaleYear} month={femaleMonth} day={femaleDay} hour={femaleHour}
                onYearChange={setFemaleYear} onMonthChange={setFemaleMonth}
                onDayChange={setFemaleDay} onHourChange={setFemaleHour}
              />
            </div>
          </div>

          {/* 快捷按钮 */}
          <div className="mt-2 grid grid-cols-2 gap-3">
            <QuickBtnGroup items={[
              { label: "今年", onClick: () => { const y = new Date().getFullYear(); setMaleYear(y); } },
              { label: "去年", onClick: () => { const y = new Date().getFullYear(); setMaleYear(y - 1); } },
              { label: "25岁", onClick: () => setMaleYear(new Date().getFullYear() - 25) },
              { label: "30岁", onClick: () => setMaleYear(new Date().getFullYear() - 30) },
            ]} />
            <QuickBtnGroup items={[
              { label: "今年", onClick: () => { const y = new Date().getFullYear(); setFemaleYear(y); } },
              { label: "去年", onClick: () => { const y = new Date().getFullYear(); setFemaleYear(y - 1); } },
              { label: "23岁", onClick: () => setFemaleYear(new Date().getFullYear() - 23) },
              { label: "28岁", onClick: () => setFemaleYear(new Date().getFullYear() - 28) },
            ]} />
          </div>

          {/* 提示文字 */}
          <p className="text-center text-gray-400 mt-2 mb-1" style={{ fontSize: "11px" }}>
            请准确选择出生年月日时（真太阳时最佳）
          </p>

          {/* 客户选择 */}
          <div className="mt-3">
            <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={doHehun}
              disabled={loading}
              className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #7B2FBE 0%, #9B4FDE 100%)",
                boxShadow: "0 4px 12px rgba(123,47,190,0.35)",
              }}
            >
              {loading ? "分析中..." : hasResult ? "重新合婚" : "开始合婚"}
            </button>
          </div>
          <div className="flex gap-2 mt-2 justify-center">
            <button
              onClick={fillExample}
              className="rounded-full px-4 py-1.5 text-xs text-gray-500 border border-gray-200 hover:bg-gray-50"
            >
              填充示例
            </button>
            {hasResult && (
              <button
                onClick={doReset}
                className="rounded-full px-4 py-1.5 text-xs text-gray-500 border border-gray-200 hover:bg-gray-50"
              >
                重置
              </button>
            )}
          </div>
        </div>

        {/* ====== 结果区域 ====== */}
        {hasResult && hehunResult && (
          <div id="hehun-result" className="px-3 mt-3">
            {/* 双方八字排盘 */}
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="text-center font-bold text-sm mb-2" style={{ color: BRAND_COLOR }}>
                双方八字排盘
              </div>
              <div className="grid grid-cols-2 gap-2">
                <BaziCard
                  bazi={hehunResult.male}
                  label="男方"
                  genderLabel="元男"
                  themeColor={MALE_COLOR}
                />
                <BaziCard
                  bazi={hehunResult.female}
                  label="女方"
                  genderLabel="元女"
                  themeColor={FEMALE_COLOR}
                />
              </div>
            </div>

            {/* 合婚评分大字 */}
            <div
              className="rounded-2xl mt-3 p-5 text-center text-white shadow-lg"
              style={{
                background: "linear-gradient(135deg, #7B2FBE 0%, #A855F7 50%, #7B2FBE 100%)",
              }}
            >
              <div className="text-sm opacity-90 mb-1">合婚评分</div>
              <div className="flex items-baseline justify-center">
                <span className="font-black" style={{ fontSize: "64px", lineHeight: "1", textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                  {hehunResult.totalScore}
                </span>
                <span className="text-xl ml-1 opacity-80">分</span>
              </div>
              <div
                className="inline-block mt-2 px-5 py-1.5 rounded-full text-lg font-bold"
                style={{
                  backgroundColor: "rgba(255,255,255,0.9)",
                  color: GRADE_COLORS[hehunResult.grade] || "#333",
                }}
              >
                {hehunResult.grade}
              </div>
              <div className="text-sm mt-2 opacity-90 px-2">{hehunResult.gradeDesc}</div>
            </div>

            {/* 各项分析 */}
            <div className="rounded-2xl bg-white mt-3 p-3 shadow-sm">
              <div className="text-center font-bold text-sm mb-3" style={{ color: BRAND_COLOR }}>
                合婚详析
              </div>
              {hehunResult.items.map((item, i) => (
                <AnalysisItem key={i} item={item} />
              ))}
            </div>

            {/* 总评 */}
            <div
              className="rounded-2xl mt-3 p-4 shadow-sm"
              style={{ backgroundColor: "#faf5ff", borderLeft: "4px solid " + BRAND_COLOR }}
            >
              <div className="font-bold text-sm mb-1" style={{ color: BRAND_COLOR }}>
                合婚总评
              </div>
              <div className="text-sm text-gray-700 leading-relaxed">
                {hehunResult.summary}
              </div>
              <div className="text-xs text-gray-500 mt-2 leading-relaxed">
                合婚共{hehunResult.items.length}项分析，通过
                <b style={{ color: "#3E9B3E" }}>
                  {hehunResult.items.filter((i) => i.pass).length}
                </b>
                项。婚姻幸福取决于双方的经营与包容，命理仅作参考。
              </div>
            </div>

            {/* 免责声明 */}
            <div className="rounded-2xl bg-white mt-3 p-4 shadow-sm">
              <div className="text-center text-gray-400" style={{ fontSize: "11px", lineHeight: "1.7" }}>
                <b className="text-gray-500">免责声明</b>
                <br />
                八字合婚为中国传统民俗文化，分析结果基于传统命理理论，
                <br />
                仅供文化研究与娱乐参考，不构成任何婚姻决策建议。
                <br />
                感情与婚姻的幸福取决于双方的相互理解、尊重与经营。
              </div>
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!hasResult && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div
              className="flex items-center justify-center rounded-full mb-4"
              style={{
                width: "80px",
                height: "80px",
                backgroundColor: BRAND_COLOR + "12",
              }}
            >
              <span style={{ fontSize: "40px" }}>💑</span>
            </div>
            <p className="text-sm text-center px-8 leading-relaxed">
              输入男女双方出生日期时间，
              <br />
              点击"开始合婚"查看八字合婚分析
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
