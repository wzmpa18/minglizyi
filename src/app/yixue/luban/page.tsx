"use client";

// 鲁班尺/丁兰尺工具页 - NICHE-TOOLS-08 v25.0.68
// ============================================================================
// 功能：RULER_PROFILE 多尺制切换（鲁班尺三制式 / 丁兰尺双起量制）、
//       mm/cm/m 单位输入、周期刻度可视化尺带、分位吉凶判读、双尺合参、
//       曲尺压白（紫白星）、最近吉尺寸建议、最近查询本机保存、统一分享。
// 协议（§82）：平实展示传统尺文，不弹窗恐吓、不自动输出「必须修改」类断语。
// 引擎：src/algorithm-core/modules/ruler（净室实现，RULER_PROFILE 可配置）。
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShareButton } from "@/components/ShareButton";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { trackToolEvent } from "@/lib/toolAnalytics";
import {
  RULER_ENGINE_VERSION,
  DINGLAN_PROFILES,
  LUBAN_PROFILES,
  dualRulerRead,
  getDinglanProfile,
  getLubanProfile,
  nearestLuckyLengths,
  quchiZibai,
  readRuler,
  type RulerProfile,
} from "@/algorithm-core/modules/ruler";

const BRAND = "#B8860B";
const HISTORY_KEY = "yandao_luban_history_v1";
const MAX_HISTORY = 12;

type Unit = "mm" | "cm" | "m";

const UNIT_LABEL: Record<Unit, string> = { mm: "毫米", cm: "厘米", m: "米" };
const UNIT_FACTOR: Record<Unit, number> = { mm: 0.1, cm: 1, m: 100 };

const LUCK_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  "大吉": { bg: "#e8f5e9", text: "#1b7a35", border: "#a5d6a7" },
  "吉": { bg: "#eef7ea", text: "#2e7d32", border: "#c5e1a5" },
  "次吉": { bg: "#f1f8e9", text: "#558b2f", border: "#dce7ab" },
  "凶": { bg: "#fdeeea", text: "#b23c26", border: "#f3c1b3" },
  "大凶": { bg: "#fceceb", text: "#9c1c16", border: "#efaaa4" },
};

interface HistoryItem { lengthCm: number; savedAt: string }

function parseLength(raw: string, unit: Unit): number | null {
  const v = parseFloat(raw);
  if (!isFinite(v) || v < 0) return null;
  const cm = v * UNIT_FACTOR[unit];
  if (cm > 99999) return null;
  return cm;
}

function fmtLen(cm: number): string {
  if (cm >= 100) return `${(cm / 100).toFixed(3)} 米`;
  if (cm >= 1) return `${cm.toFixed(2)} 厘米`;
  return `${(cm * 10).toFixed(1)} 毫米`;
}

export default function LubanPage() {
  const [mounted, setMounted] = useState(false);
  const [unit, setUnit] = useState<Unit>("cm");
  const [raw, setRaw] = useState("210");
  const [tab, setTab] = useState<"luban" | "dinglan">("luban");
  const [lubanId, setLubanId] = useState(LUBAN_PROFILES[0].id);
  const [dinglanId, setDinglanId] = useState(DINGLAN_PROFILES[0].id);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [toast, setToast] = useState("");
  const [calcCount, setCalcCount] = useState(0);

  useEffect(() => {
    trackToolEvent("luban", "tool_open");
    setMounted(true);
    try {
      const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as HistoryItem[];
      if (Array.isArray(h)) setHistory(h.filter((x) => typeof x.lengthCm === "number").slice(0, MAX_HISTORY));
    } catch { /* ignore */ }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }, []);

  const lengthCm = useMemo(() => {
    const v = parseLength(raw, unit);
    return v == null ? NaN : v;
  }, [raw, unit]);

  const valid = !isNaN(lengthCm);

  const lubanProfile = useMemo(() => getLubanProfile(lubanId), [lubanId]);
  const dinglanProfile = useMemo(() => getDinglanProfile(dinglanId), [dinglanId]);
  const activeProfile: RulerProfile = tab === "luban" ? lubanProfile : dinglanProfile;

  const lubanReading = useMemo(
    () => (valid ? readRuler("鲁班尺（门公尺·阳尺）", lubanProfile, lengthCm) : null),
    [valid, lubanProfile, lengthCm],
  );
  const dinglanReading = useMemo(
    () => (valid ? readRuler("丁兰尺（阴尺）", dinglanProfile, lengthCm) : null),
    [valid, dinglanProfile, lengthCm],
  );
  const dual = useMemo(
    () => (valid ? dualRulerRead(lubanProfile, dinglanProfile, lengthCm) : null),
    [valid, lubanProfile, dinglanProfile, lengthCm],
  );
  const zibai = useMemo(
    () => (valid ? quchiZibai(lengthCm, lubanProfile.chiCm) : null),
    [valid, lengthCm, lubanProfile],
  );

  // 展示用：当前尺别读数
  const active = tab === "luban" ? lubanReading : dinglanReading;

  const suggestions = useMemo(() => {
    if (!valid) return [];
    return tab === "luban"
      ? nearestLuckyLengths("鲁班尺", lubanProfile, lengthCm, 10, 6, dinglanProfile)
      : nearestLuckyLengths("丁兰尺", dinglanProfile, lengthCm, 10, 6, lubanProfile);
  }, [valid, tab, lubanProfile, dinglanProfile, lengthCm]);

  const commitInput = useCallback((cm: number, note?: string) => {
    const target = cm < 0.1 ? 0.1 : Math.min(cm, 99999);
    // 以当前单位回填输入框
    const factor = UNIT_FACTOR[unit];
    const v = target / factor;
    setRaw(unit === "m" ? v.toFixed(3) : v.toFixed(unit === "cm" ? 2 : 1));
    trackToolEvent("luban", "tool_calculate", { via: note || "input" });
    setCalcCount((c) => c + 1);
  }, [unit]);

  const applyLen = useCallback((cm: number, via: string) => {
    commitInput(cm, via);
  }, [commitInput]);

  const switchUnit = useCallback((u: Unit) => {
    const v = parseLength(raw, unit);
    if (v != null) {
      const nv = v / UNIT_FACTOR[u];
      setRaw(u === "m" ? nv.toFixed(3) : nv.toFixed(u === "cm" ? 2 : 1));
    }
    setUnit(u);
  }, [raw, unit]);

  const switchProfile = useCallback((kind: "luban" | "dinglan", id: string) => {
    if (kind === "luban") setLubanId(id);
    else setDinglanId(id);
    const p = (kind === "luban" ? LUBAN_PROFILES : DINGLAN_PROFILES).find((x) => x.id === id);
    trackToolEvent("luban", "profile_used", { profile: p?.name || id });
  }, []);

  const saveHistory = useCallback(() => {
    if (!valid) { showToast("请先输入有效尺寸"); return; }
    const item: HistoryItem = { lengthCm: Math.round(lengthCm * 100) / 100, savedAt: new Date().toISOString() };
    const next = [item, ...history.filter((h) => h.lengthCm !== item.lengthCm)].slice(0, MAX_HISTORY);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      trackToolEvent("luban", "tool_save");
      showToast("已记入最近查询（本机保存）");
    } catch {
      showToast("保存失败：本机存储空间不足");
    }
  }, [valid, lengthCm, history, showToast]);

  const saveToClient = useCallback(() => {
    if (!selectedClient) { showToast("请先选择客户"); return; }
    if (!valid || !dual || !zibai) { showToast("请先输入有效尺寸"); return; }
    try {
      saveRecord({
        clientId: selectedClient.id,
        type: "luban",
        data: {
          lengthCm: Math.round(lengthCm * 100) / 100,
          luban: {
            profile: lubanProfile.name,
            char: dual.luban.section.char,
            sub: dual.luban.subChar,
            luck: dual.luban.section.luck,
            chiText: dual.luban.chiText,
          },
          dinglan: {
            profile: dinglanProfile.name,
            char: dual.dinglan.section.char,
            sub: dual.dinglan.subChar,
            luck: dual.dinglan.section.luck,
          },
          zibai: { star: zibai.star, note: zibai.note },
          engine: RULER_ENGINE_VERSION,
          measuredAt: new Date().toISOString(),
        },
        note: "",
        status: "pending",
      });
      trackToolEvent("luban", "tool_save");
      showToast("尺寸判读已保存到客户档案");
    } catch {
      showToast("保存失败，请重试");
    }
  }, [selectedClient, valid, dual, zibai, lengthCm, lubanProfile, dinglanProfile, showToast]);

  // ============ 尺带绘制 ============
  const band = useMemo(() => {
    if (!valid || !active) return null;
    const len = active.profile.lengthCm;
    const n = active.profile.sections.length;
    const windowLen = len * 2.2;
    const x0 = lengthCm - windowLen / 2;
    const W = 720;
    const scale = W / windowLen;
    const px = (cm: number) => (cm - x0) * scale;

    const chars: Array<{
      x0: number; x1: number; label: string; luck: string; subs: string[];
    }> = [];
    const startCycle = Math.floor(x0 / len);
    for (let c = startCycle; c <= startCycle + 3; c++) {
      for (let s = 0; s < n; s++) {
        const cx0 = c * len + (s * len) / n;
        if (cx0 > x0 + windowLen) break;
        chars.push({
          x0: px(cx0),
          x1: px(cx0 + len / n),
          label: active.profile.sections[s].char,
          luck: active.profile.sections[s].luck,
          subs: active.profile.sections[s].subs,
        });
      }
    }
    const cycleLines: number[] = [];
    for (let c = startCycle; c <= startCycle + 3; c++) {
      const x = px(c * len);
      if (x >= 0 && x <= W) cycleLines.push(x);
    }
    return { W, len, n, chars, cycleLines, cursorX: px(lengthCm), px };
  }, [valid, active, lengthCm]);

  const unitEquiv = useMemo(() => {
    if (!valid) return null;
    return `${fmtLen(lengthCm)} ＝ ${(lengthCm * 10).toFixed(1)}毫米 / ${lengthCm.toFixed(2)}厘米 / ${(lengthCm / 100).toFixed(4)}米`;
  }, [valid, lengthCm]);

  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "420px", minHeight: "100vh" }}>
      {/* 引擎徽标 */}
      <div className="flex items-center justify-between bg-white px-3 py-2">
        <div className="text-xs text-gray-500">
          尺制引擎：<span className="font-semibold" style={{ color: BRAND }}>RULER_PROFILE 多制式</span>
        </div>
        <div className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium" style={{ color: BRAND }}>
          周期刻度·净室实现
        </div>
      </div>

      {/* 输入区 */}
      <div className="bg-white px-3 pt-3 pb-3">
        <div className="mb-2 text-xs text-gray-500">输入待测尺寸（门/窗/家具等任意长度）</div>
        <div className="flex items-center gap-2">
          <input
            type="number" inputMode="decimal" min={0} step="any"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={() => { if (valid) { trackToolEvent("luban", "tool_calculate", { via: "blur" }); setCalcCount((c) => c + 1); } }}
            className="w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-center text-lg font-bold tabular-nums outline-none focus:border-[#B8860B]"
            placeholder={`如 210（${UNIT_LABEL[unit]}）`}
          />
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            {(["mm", "cm", "m"] as Unit[]).map((u) => (
              <button
                key={u}
                onClick={() => switchUnit(u)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${unit === u ? "text-white" : "text-gray-500"}`}
                style={unit === u ? { backgroundColor: BRAND } : {}}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        {unitEquiv && <p className="mt-1.5 text-center text-[11px] text-gray-400">{unitEquiv}</p>}
        <div className="mt-2 flex gap-1.5">
          {[-5, -1, 1, 5].map((d) => (
            <button
              key={d}
              onClick={() => applyLen((valid ? lengthCm : 0) + d, "quick")}
              disabled={!valid && d < 0}
              className="flex-1 rounded-full border border-gray-200 bg-gray-50 py-1.5 text-xs font-semibold text-gray-600 active:scale-[0.98] disabled:opacity-40"
            >
              {d > 0 ? `+${d}cm` : `${d}cm`}
            </button>
          ))}
          <button
            onClick={() => applyLen(0, "clear")}
            className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 active:scale-[0.98]"
          >
            清零
          </button>
        </div>
        {mounted && calcCount > 0 && valid && (
          <p className="mt-1.5 text-center text-[10px] text-gray-400">已按 {activeProfile.name} 判读（本会话第 {calcCount} 次计算）</p>
        )}
      </div>

      {/* 尺别与制式 */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="mb-2 flex rounded-full border border-gray-200 p-0.5">
          {(["luban", "dinglan"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full py-2 text-sm font-semibold ${tab === t ? "text-white" : "text-gray-500"}`}
              style={tab === t ? { backgroundColor: BRAND } : {}}
            >
              {t === "luban" ? "鲁班尺（阳尺）" : "丁兰尺（阴尺）"}
            </button>
          ))}
        </div>
        <div className="mb-1.5 text-xs text-gray-500">尺制版本（{tab === "luban" ? "门公尺" : "阴尺"}）</div>
        <div className="grid grid-cols-3 gap-1.5">
          {(tab === "luban" ? LUBAN_PROFILES : DINGLAN_PROFILES).map((p) => {
            const activeId = tab === "luban" ? lubanId : dinglanId;
            const on = p.id === activeId;
            return (
              <button
                key={p.id}
                onClick={() => switchProfile(tab, p.id)}
                className={`rounded-lg border px-2 py-2 text-center text-xs font-medium ${on ? "border-[#B8860B] bg-amber-50" : "border-gray-200 bg-gray-50 text-gray-600"}`}
                style={on ? { color: BRAND } : {}}
              >
                <div>{p.name}</div>
                <div className="mt-0.5 text-[10px] text-gray-400">{p.lengthCm}cm</div>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">{activeProfile.note}</p>
      </div>

      {/* 可视化尺带 */}
      {band && active && (
        <div className="mt-2 bg-white px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">刻度尺带（居中为当前尺寸，左右各约一尺）</span>
            <span className="text-[10px] text-gray-400">1尺＝{active.profile.lengthCm}cm</span>
          </div>
          <div className="overflow-hidden rounded-lg border border-amber-200 bg-[#faf5e9]">
            <svg viewBox={`0 0 ${band.W} 118`} width="100%" height="96">
              {/* 主字色带 */}
              {band.chars.map((c, i) => {
                const st = LUCK_STYLE[c.luck] || LUCK_STYLE["吉"];
                return (
                  <rect
                    key={`c${i}`}
                    x={c.x0} y={30} width={c.x1 - c.x0} height={52}
                    fill={st.bg} stroke="#d9c9a3" strokeWidth={0.6}
                  />
                );
              })}
              {/* 小字（分位） */}
              {band.chars.map((c, i) =>
                c.subs.map((sub, k) => {
                  const x = c.x0 + ((c.x1 - c.x0) * (2 * k + 1)) / 8;
                  return (
                    <text
                      key={`s${i}-${k}`}
                      x={x} y={45}
                      textAnchor="middle" fontSize={7.5} fill="#6b5a33"
                      transform={`rotate(${x > band.cursorX - 60 && x < band.cursorX + 60 ? 0 : 0} ${x} 45)`}
                    >
                      {sub}
                    </text>
                  );
                }),
              )}
              {/* 小字分界刻度 */}
              {band.chars.map((c, i) =>
                Array.from({ length: 3 }, (_, k) => {
                  const x = c.x0 + ((c.x1 - c.x0) * (k + 1)) / 4;
                  return <line key={`t${i}-${k}`} x1={x} y1={30} x2={x} y2={44} stroke="#c9b98d" strokeWidth={0.5} />;
                }),
              )}
              {/* 主字 */}
              {band.chars.map((c, i) => {
                const mid = (c.x0 + c.x1) / 2;
                const st = LUCK_STYLE[c.luck] || LUCK_STYLE["吉"];
                return (
                  <text
                    key={`m${i}`}
                    x={mid} y={72}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={15} fontWeight={700} fill={st.text}
                  >
                    {c.label}
                  </text>
                );
              })}
              {/* 周期分界线 */}
              {band.cycleLines.map((x, i) => (
                <line key={`cy${i}`} x1={x} y1={26} x2={x} y2={86} stroke="#8a6d3b" strokeWidth={1.4} />
              ))}
              {/* 尺带上缘 */}
              <line x1={0} y1={30} x2={band.W} y2={30} stroke="#8a6d3b" strokeWidth={1.2} />
              <line x1={0} y1={82} x2={band.W} y2={82} stroke="#8a6d3b" strokeWidth={1.2} />
              {/* 游标 */}
              <line x1={band.cursorX} y1={12} x2={band.cursorX} y2={100} stroke="#e53935" strokeWidth={2.4} />
              <polygon
                points={`${band.cursorX - 6},10 ${band.cursorX + 6},10 ${band.cursorX},20`}
                fill="#e53935"
              />
              <text
                x={Math.min(Math.max(band.cursorX, 46), band.W - 46)} y={104}
                textAnchor="middle" fontSize={11} fontWeight={700} fill="#c62828"
              >
                第{active.cycle}尺 · 尺内{active.inCycleCm.toFixed(2)}cm
              </text>
            </svg>
          </div>
        </div>
      )}

      {/* 判读结果 */}
      {active && (
        <div className="mt-2 bg-white px-3 py-3">
          <div className="mb-2 text-sm font-bold" style={{ color: BRAND }}>
            {active.rulerName} · {active.profile.name}判读
          </div>
          <div
            className="rounded-xl border p-3 text-center"
            style={{
              borderColor: (LUCK_STYLE[active.section.luck] || LUCK_STYLE["吉"]).border,
              backgroundColor: (LUCK_STYLE[active.section.luck] || LUCK_STYLE["吉"]).bg,
            }}
          >
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-3xl font-bold text-gray-800">{active.section.char}</span>
              <span className="text-lg font-semibold text-gray-600">· {active.subChar}</span>
            </div>
            <div className="mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-semibold"
              style={{ color: (LUCK_STYLE[active.section.luck] || LUCK_STYLE["吉"]).text, backgroundColor: "rgba(255,255,255,0.7)" }}>
              {active.section.luck}
            </div>
            <p className="mt-1.5 text-[11px] text-gray-500">{active.section.meaning} · {active.subChar}位</p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div><span className="text-gray-500">尺寸：</span><span className="font-semibold">{fmtLen(active.lengthCm)}</span></div>
            <div><span className="text-gray-500">周期：</span><span className="font-semibold">第 {active.cycle} 尺（尺内 {active.inCycleCm.toFixed(2)}cm）</span></div>
            <div><span className="text-gray-500">营造尺读数：</span><span className="font-semibold">{active.chiText}</span></div>
            <div><span className="text-gray-500">本尺寸位：</span><span className="font-semibold">{active.cunInCycle.toFixed(2)} 寸</span></div>
          </div>
        </div>
      )}

      {/* 双尺合参 */}
      {dual && zibai && (
        <div className="mt-2 bg-white px-3 py-3">
          <div className="mb-2 text-sm font-bold" style={{ color: BRAND }}>双尺合参与曲尺压白</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border p-2.5" style={{
              borderColor: dual.lubanLucky ? LUCK_STYLE["吉"].border : LUCK_STYLE["凶"].border,
              backgroundColor: dual.lubanLucky ? LUCK_STYLE["吉"].bg : LUCK_STYLE["凶"].bg,
            }}>
              <div className="text-[10px] text-gray-500">鲁班尺（阳尺）</div>
              <div className="mt-0.5 text-sm font-bold" style={{ color: dual.lubanLucky ? LUCK_STYLE["吉"].text : LUCK_STYLE["凶"].text }}>
                {dual.luban.section.char}·{dual.luban.subChar}
              </div>
              <div className="text-[10px] text-gray-500">{dual.luban.section.luck}位</div>
            </div>
            <div className="rounded-lg border p-2.5" style={{
              borderColor: dual.dinglanSafe ? LUCK_STYLE["吉"].border : LUCK_STYLE["大凶"].border,
              backgroundColor: dual.dinglanSafe ? LUCK_STYLE["吉"].bg : LUCK_STYLE["大凶"].bg,
            }}>
              <div className="text-[10px] text-gray-500">丁兰尺（阴尺）</div>
              <div className="mt-0.5 text-sm font-bold" style={{ color: dual.dinglanSafe ? LUCK_STYLE["吉"].text : LUCK_STYLE["大凶"].text }}>
                {dual.dinglan.section.char}·{dual.dinglan.subChar}
              </div>
              <div className="text-[10px] text-gray-500">{dual.dinglan.section.luck}位</div>
            </div>
          </div>
          <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-600">
            合参口径：{dual.bothLucky
              ? "阳尺落吉位，且阴尺无大凶字，传统匠作可参用。"
              : "按所选尺制，该尺寸未同时满足阳尺吉位与阴尺避大凶，传统做法多另择尺寸；吉凶为传统尺文表述，非必然结果。"}
            （鲁班尺制式：{lubanProfile.name} / 丁兰尺制式：{dinglanProfile.name}）
          </div>
          <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50/40 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">曲尺压白（紫白星）</span>
              <span className="font-bold" style={{
                color: zibai.lucky === true ? "#1b7a35" : zibai.lucky === false ? "#b23c26" : "#8d6708",
              }}>
                {zibai.star}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              营造尺 {zibai.totalCun} 寸（寸尾 {zibai.cunTail}）：{zibai.note}
            </p>
          </div>
        </div>
      )}

      {/* 最近吉尺寸建议 */}
      {suggestions.length > 0 && (
        <div className="mt-2 bg-white px-3 py-3">
          <div className="mb-2 text-sm font-bold" style={{ color: BRAND }}>附近吉尺寸（±10cm，点击填入）</div>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s) => {
              const st = LUCK_STYLE[s.reading.section.luck] || LUCK_STYLE["吉"];
              return (
                <button
                  key={s.lengthCm}
                  onClick={() => applyLen(s.lengthCm, "suggest")}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 text-left active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-gray-800">{s.lengthCm.toFixed(1)}cm</span>
                    <span className="text-xs" style={{ color: st.text }}>
                      {s.reading.section.char}·{s.reading.subChar}（第{s.reading.cycle}尺）
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {s.deltaCm >= 0 ? `+${s.deltaCm.toFixed(1)}` : s.deltaCm.toFixed(1)}cm
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">
            建议取吉位小字中点（±0.05cm 内），并已按双尺合参剔除对尺「大凶」落位；实际制作请以施工公差与现场条件为准。
          </p>
        </div>
      )}

      {/* 最近查询 */}
      {history.length > 0 && (
        <div className="mt-2 bg-white px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">最近查询（本机）</span>
            <button
              onClick={() => { setHistory([]); localStorage.removeItem(HISTORY_KEY); }}
              className="text-[10px] text-gray-400"
            >
              清空
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h) => (
              <button
                key={`${h.lengthCm}-${h.savedAt}`}
                onClick={() => applyLen(h.lengthCm, "history")}
                className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 active:bg-gray-200"
              >
                {h.lengthCm.toFixed(1)}cm
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 客户记录与保存 */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="mb-2 text-xs text-gray-500">记录（可选）</div>
        <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
        <div className="mt-2 flex gap-1.5">
          <button
            onClick={saveHistory}
            disabled={!valid}
            className="flex-1 rounded-full border border-gray-200 bg-gray-50 py-2.5 text-sm font-semibold text-gray-600 active:scale-[0.98] disabled:opacity-40"
          >
            记入最近查询
          </button>
          <button
            onClick={saveToClient}
            disabled={!selectedClient || !valid}
            className="flex-1 rounded-full border border-amber-200 py-2.5 text-sm font-semibold active:scale-[0.98] disabled:opacity-40"
            style={{ color: BRAND, backgroundColor: "#fdf6e3" }}
          >
            存客户档案
          </button>
        </div>
      </div>

      {/* 分享 */}
      {valid && dual && zibai && active && (
        <div className="mt-2 px-3 py-2">
          <ShareButton
            type="tool"
            title="鲁班尺/丁兰尺查询结果"
            description="传统匠作尺制查询工具"
            variant="block"
            label="分享查询结果"
            onShared={() => trackToolEvent("luban", "tool_share")}
            shareData={{
              toolType: "luban",
              title: `鲁班尺查询：${active.section.char}·${active.subChar}（${fmtLen(active.lengthCm)}）`,
              summary: `${fmtLen(active.lengthCm)} · 鲁班尺${dual.luban.section.char}（${dual.luban.section.luck}）· 丁兰尺${dual.dinglan.section.char}（${dual.dinglan.section.luck}）· 压白${zibai.star}`,
              payload: {
                summaryLines: [
                  `尺寸：${fmtLen(active.lengthCm)}（${active.chiText}）`,
                  `鲁班尺（${dual.luban.profile.name}）：${dual.luban.section.char}·${dual.luban.subChar}，${dual.luban.section.luck}位，第${dual.luban.cycle}尺尺内${dual.luban.inCycleCm.toFixed(2)}cm`,
                  `丁兰尺（${dual.dinglan.profile.name}）：${dual.dinglan.section.char}·${dual.dinglan.subChar}，${dual.dinglan.section.luck}位`,
                  `双尺合参：${dual.bothLucky ? "阳尺吉位且阴尺无大凶" : "未同时满足双尺吉位（传统做法多另择尺寸）"}`,
                  `曲尺压白：营造尺 ${zibai.totalCun} 寸，寸尾 ${zibai.cunTail}，${zibai.star}（${zibai.note}）`,
                  `引擎：${RULER_ENGINE_VERSION}`,
                ],
              },
            }}
          />
        </div>
      )}

      {/* 免责声明 */}
      <div className="mx-3 mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong>免责声明：</strong>本工具按公开传统匠作通行排布呈现尺文与吉凶标注，仅供传统文化学习与参考，
          不构成施工、交易或决策建议。不同地域、流派与历史时期存在多种尺制版本，结果以所选制式为准；
          吉凶为传统尺文表述，非必然结果。
        </p>
      </div>
      <div style={{ height: "20px" }} />

      {toast && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
