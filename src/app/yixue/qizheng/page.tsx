"use client";

// 七政四余排盘工具页 - NICHE-TOOLS v25.0.68 / 断语面板 v25.0.71
// ============================================================================
// 功能：出生信息排盘（今制/恒星制）、真太阳时校正、十二人事宫、二十八宿宿度、
//       十一曜（七政四余）宫度分布、命宫命度/身宫身度、洞微大限行限查询、
//       客户记录保存、统一分享、AI 解读。
// 盘面：Moira 式圆盘（外圈二十八宿 → 十二地支宫 → 内区星曜；0° 黄经在上，
//       顺时针展开；命度/身度以红/蓝标于外缘）。
// 断语：v25.0.71 接入断语引擎（qizheng-duanyu，果老星宗八卷知识库），
//       六节断语（垣殿/化曜/神煞/格局/十二宫断/歌赋），逐条标注出处；
//       后台「系统功能开关」七项断语开关（总开关+六节）经 /api/public/feature-flags
//       镜像控制展示，关闭的节不渲染、不进 AI 上下文。
// 协议：排盘数据与判读口径由算法层输出；断语由知识库引擎输出并受后台开关管控。
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ClientSelector from "@/components/ClientSelector";
import { ShareButton } from "@/components/ShareButton";
import { trackToolEvent } from "@/lib/toolAnalytics";
import AIInterpretButton from "@/components/AIInterpretButton";
import { DatePicker } from "@/components/shared";
import { saveRecord } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import {
  calcQizhengChart,
  xianDuAtAge,
  QIZHENG_ENGINE_VERSION,
  type QizhengInput,
  type QizhengResult,
  type StarPosition,
  type MingGongMode,
  type StarFrame,
} from "@/algorithm-core/modules/qizheng";
import {
  calcQizhengDuanyu,
  DUANYU_ENGINE_VERSION,
  type DuanyuItem,
  type DuanyuSectionKey,
} from "@/algorithm-core/modules/qizheng-duanyu";
import { fetchFeatureFlags, flagOn } from "@/lib/featureFlags";
import SharedBirthLocationSelector, { type RegionIndices, regionAt } from "@/components/shared/region-selector";

const BRAND = "#7B2FBE";
const RAD = Math.PI / 180;
const C = 180;

// SVG 极坐标（0° 黄经在正上，顺时针）
function px(r: number, a: number): [number, number] {
  return [C + r * Math.sin(a * RAD), C - r * Math.cos(a * RAD)];
}
function pt(r: number, a: number): string {
  const [x, y] = px(r, a);
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}
function sectorPath(r1: number, r2: number, a1: number, a2: number): string {
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M ${pt(r2, a1)} A ${r2},${r2} 0 ${large} 1 ${pt(r2, a2)} L ${pt(r1, a2)} A ${r1},${r1} 0 ${large} 0 ${pt(r1, a1)} Z`;
}

const PAN_BG = "#f5ecd7";
const PAN_LINE = "#8a6d3b";
const PAN_DARK = "#14100b";
const GOLD = "#e8c96a";
const STAR_AREA = "#0e1526";

const WUXING_STAR_COLOR: Record<string, string> = {
  "金": "#ffd54f", "木": "#81c784", "水": "#4fc3f7", "火": "#ff8a65", "土": "#d4b56a",
};

/** 断语分级徽标样式 */
const DUANYU_LEVEL_META: Record<DuanyuItem["level"], { label: string; badge: string }> = {
  ji: { label: "吉", badge: "bg-emerald-100 text-emerald-700" },
  xiong: { label: "凶", badge: "bg-red-100 text-red-600" },
  zhong: { label: "中性", badge: "bg-gray-100 text-gray-500" },
};

const HOURS = ["00:00-01:00", "01:00-03:00", "03:00-05:00", "05:00-07:00", "07:00-09:00", "09:00-11:00",
  "11:00-13:00", "13:00-15:00", "15:00-17:00", "17:00-19:00", "19:00-21:00", "21:00-23:00", "23:00-24:00"];

const PAIPAN_KEY = "yandao_qizheng_input";

export default function QizhengPage() {
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [result, setResult] = useState<QizhengResult | null>(null);
  const [name, setName] = useState("");
  const [regionIdx, setRegionIdx] = useState<RegionIndices>({ p: 0, c: 0, d: 0 });
  const [frame, setFrame] = useState<StarFrame>("tropical");
  const [mingMode, setMingMode] = useState<MingGongMode>("mao");
  const [dongweiStart, setDongweiStart] = useState<9 | 10>(10);
  const [xianAge, setXianAge] = useState<number | "">("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [toast, setToast] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [lastInput, setLastInput] = useState<QizhengInput | null>(null);

  useEffect(() => {
    trackToolEvent("qizheng", "tool_open");
    setMounted(true);
    try {
      const raw = localStorage.getItem(PAIPAN_KEY);
      if (raw) {
        const s = JSON.parse(raw) as { regionIdx?: RegionIndices; frame?: StarFrame; mingMode?: MingGongMode; dongweiStart?: 9 | 10 };
        if (s.regionIdx && typeof s.regionIdx.p === "number") setRegionIdx(s.regionIdx);
        if (s.frame === "sidereal" || s.frame === "tropical") setFrame(s.frame);
        if (s.mingMode === "mao" || s.mingMode === "sunrise") setMingMode(s.mingMode);
        if (s.dongweiStart === 9 || s.dongweiStart === 10) setDongweiStart(s.dongweiStart);
      }
    } catch { /* ignore */ }
  }, []);

  // 排盘参数变更埋点（跳过挂载首拍）
  const profileTouched = useRef(false);
  useEffect(() => {
    if (mounted) {
      if (profileTouched.current) {
        trackToolEvent("qizheng", "profile_used", { frame, mingMode, dongweiStart });
      }
      profileTouched.current = true;
    }
  }, [mounted, frame, mingMode, dongweiStart]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(PAIPAN_KEY, JSON.stringify({ regionIdx, frame, mingMode, dongweiStart }));
    } catch { /* ignore */ }
  }, [mounted, regionIdx, frame, mingMode, dongweiStart]);

  // 出生地：省→市→区县三级联动（与八字同一数据源 src/data/regions.ts）
  const region = regionAt(regionIdx);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  const handleSubmit = useCallback((
    dateVal: { year: number; month: number; day: number; hour: number; minute: number },
    opts: { gender: "male" | "female" },
  ) => {
    const input: QizhengInput = {
      year: dateVal.year, month: dateVal.month, day: dateVal.day,
      hour: dateVal.hour, minute: dateVal.minute,
      lat: region.lat ?? 39.9042, lon: region.lng, tzOffset: 8,
      placeName: `${region.province}${region.city ? region.city : ""}${region.district ? region.district : ""}`,
      gender: opts.gender,
      frame, mingGongMode: mingMode, dongweiStart,
    };
    try {
      const res = calcQizhengChart(input);
      setResult(res);
      setLastInput(input);
      setShowForm(false);
      trackToolEvent("qizheng", "chart_generated", {
        frame,
        mingMode,
        dongweiStart,
        lat: region.lat != null ? Math.round(region.lat * 10) / 10 : 0,
      });
      trackToolEvent("qizheng", "tool_calculate");
      // v25.0.74: 未选客户也保存（用户反馈排盘记录不能保存）；clientId 留空挂"未指定"
      try {
        saveRecord({
          clientId: selectedClient ? selectedClient.id : "", type: "qizheng",
          data: { input, mingGong: res.mingGong.branch, shenGong: res.shenGong.branch,
            mingDu: `${res.mingDu.xiuFullName}${res.mingDu.xiuDegree.toFixed(1)}°`,
            chuxian: res.dongwei.chuxianText },
          note: "", status: "pending",
        });
        setSavedCount((c) => c + 1);
        showToast(selectedClient ? "排盘结果已保存到客户档案" : "排盘记录已保存");
      } catch { /* 保存失败不阻断排盘 */ }
    } catch (e) {
      trackToolEvent("qizheng", "tool_error", { phase: "calc" });
      showToast(`排盘失败：${e instanceof Error ? e.message : "输入参数异常"}`);
    }
  }, [region, frame, mingMode, dongweiStart, selectedClient, showToast]);

  const xian = useMemo(() => {
    if (!result || xianAge === "" || xianAge < 1 || xianAge > 120) return null;
    return xianDuAtAge(result, xianAge);
  }, [result, xianAge]);

  // ==================== 断语（v25.0.71） ====================
  // 后台「系统功能开关」镜像：总开关 qizheng_duanyu + 六节分开关
  const [featureFlags, setFeatureFlags] = useState<Record<string, string>>({});
  const [dyOpenSections, setDyOpenSections] = useState<Set<DuanyuSectionKey>>(new Set(["yuandian"]));

  useEffect(() => {
    fetchFeatureFlags().then(setFeatureFlags).catch(() => { /* 拉取失败按全开兜底 */ });
  }, []);

  const duanyu = useMemo(() => {
    if (!result) return null;
    try {
      return calcQizhengDuanyu(result);
    } catch {
      return null;
    }
  }, [result]);

  const duanyuMasterOn = flagOn(featureFlags, "qizheng_duanyu");
  const duanyuMasterMaint = featureFlags.qizheng_duanyu === "MAINTENANCE";
  const visibleDySections = useMemo(() => {
    if (!duanyu || !duanyuMasterOn) return [];
    return duanyu.sections.filter((s) => flagOn(featureFlags, `qizheng_duanyu_${s.key}`));
  }, [duanyu, duanyuMasterOn, featureFlags]);

  const duanyuSummary = useMemo(() => {
    const all = visibleDySections.flatMap((s) => s.items);
    return {
      ji: all.filter((i) => i.level === "ji").length,
      xiong: all.filter((i) => i.level === "xiong").length,
      zhong: all.filter((i) => i.level === "zhong").length,
      total: all.length,
    };
  }, [visibleDySections]);

  const toggleDySection = useCallback((key: DuanyuSectionKey) => {
    setDyOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // 星曜径向避让排布（按黄经排序，近距径向递减）
  const starLayout = useMemo(() => {
    if (!result) return [];
    const sorted = [...result.stars].sort((a, b) => a.lon - b.lon);
    const placed: Array<{ s: StarPosition; r: number }> = [];
    for (const s of sorted) {
      let r = 92;
      for (const p of placed) {
        let d = Math.abs(s.lon - p.s.lon);
        if (d > 180) d = 360 - d;
        if (d < 12 && Math.abs(p.r - r) < 14) r = p.r - 17;
      }
      placed.push({ s, r: Math.max(38, r) });
    }
    return placed;
  }, [result]);

  const birthText = result
    ? `${result.input.year}年${result.input.month}月${result.input.day}日 ${String(result.input.hour).padStart(2, "0")}:${String(result.input.minute).padStart(2, "0")}`
    : "";
  const frameText = result?.frame === "sidereal" ? "恒星制（郑氏星案）" : "黄道回归今制";

  const aiContext = useMemo(() => {
    if (!result) return "";
    const lines = [
      `星制：${frameText}`,
      `出生：${birthText}（${result.input.placeName}）`,
      `真太阳时：${result.trueSolar.trueSolarTime}（校正 ${result.trueSolar.totalOffsetMin.toFixed(1)} 分钟）`,
      `时辰：${result.hour.name}（${result.hour.branch}时）｜${result.dayNight.isDay ? "昼生" : "夜生"}`,
      `命宫：${result.mingGong.branch}宫｜命度：${result.mingDu.xiuFullName}${result.mingDu.xiuDegree.toFixed(1)}°｜命度主：${result.mingDuZhu}`,
      `身宫：${result.shenGong.branch}宫｜身度：${result.shenDu.xiuFullName}${result.shenDu.xiuDegree.toFixed(1)}°｜身度主：${result.shenDuZhu}`,
      `命元五行：${result.mingYuanWuxing}`,
      `洞微大限：出限 ${result.dongwei.chuxianText}`,
      "十一曜：",
      ...result.stars.map((s) =>
        `${s.name}（${s.wuxing}）${s.palaceBranch}宫${s.palaceDegree.toFixed(1)}° ${s.xiuFullName}${s.xiuDegree.toFixed(1)}° ${s.renshiGong}宫 ${s.retrograde ? "逆行" : "顺行"}${s.inYuan ? " 入垣" : ""}${s.shengDian ? " 升殿" : ""}`),
      "洞微行限：",
      ...result.dongwei.rows.map((r) => `${r.renshiGong}（${r.palaceBranch}宫）${r.startAge}-${Math.ceil(r.endAge) - 1}岁 共${r.years}年${r.isTongxian ? "（童限）" : ""}`),
    ];
    // v25.0.71：可见断语（受后台开关管控，关闭的节不进 AI 上下文）
    if (visibleDySections.length > 0) {
      lines.push("知识库断语（果老星宗八卷，逐条含出处）：");
      for (const sec of visibleDySections) {
        lines.push(`【${sec.name}】`);
        for (const it of sec.items) {
          lines.push(`[${DUANYU_LEVEL_META[it.level].label}] ${it.title}：${it.text}（${it.source}）`);
        }
      }
    }
    return lines.join("\n");
  }, [result, frameText, birthText, visibleDySections]);

  // ==================== 未排盘：介绍页 ====================
  if (!result) {
    return (
      <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "420px", minHeight: "100vh" }}>
        <div className="bg-white px-4 py-6">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white" style={{ backgroundColor: "#1a2a5e" }}>
            政
          </div>
          <h1 className="text-center text-lg font-bold text-gray-800">七政四余排盘</h1>
          <p className="mt-2 text-center text-xs leading-relaxed text-gray-500">
            七政（日月五星）四余（炁罗计孛）星命古法，以二十八宿宿度定经、十二宫定域，
            洞微大限推行限。
          </p>
          <div className="mt-4 space-y-2 rounded-xl bg-[#f5f0fa] p-3 text-[11px] leading-relaxed text-gray-600">
            <p>· 天文层：Astronomy Engine（MIT）日月行星黄经，与 JPL 对拍验证</p>
            <p>· 今制/恒星制双星制可选，真太阳时按出生地经度校正</p>
            <p>· 命宫（遇卯安命/日出定命）、命度、身度、度主全链路</p>
            <p>· 洞微大限行限表与任意虚岁行限度查询</p>
            <p>· 断语六节（垣殿/化曜/神煞/格局/十二宫断/歌赋），逐条标注古籍出处</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 w-full rounded-full py-3 text-sm font-semibold text-white active:scale-[0.98]"
            style={{ backgroundColor: BRAND }}
          >
            开始排盘
          </button>
        </div>
        <DatePicker
          show={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          submitText="立即排盘"
          title="七政四余排盘"
          extraOptions={
            <div className="mt-3 space-y-3">
              <div>
                <div className="mb-1.5 text-xs text-gray-500">出生地点（省/市/区县三级 · 与八字同一数据源，供经纬度与日出日落解算）</div>
                <SharedBirthLocationSelector
                  lng={region.lng}
                  indices={regionIdx}
                  onIndicesChange={setRegionIdx}
                  label="出生地"
                />
              </div>
              <div>
                <div className="mb-1.5 text-xs text-gray-500">星制</div>
                <div className="flex rounded-full border border-gray-200 p-0.5">
                  {([["tropical", "黄道回归今制"], ["sidereal", "恒星制（郑案）"]] as Array<[StarFrame, string]>).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setFrame(k)}
                      className={`flex-1 rounded-full py-1.5 text-xs font-medium ${frame === k ? "text-white" : "text-gray-500"}`}
                      style={frame === k ? { backgroundColor: BRAND } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-xs text-gray-500">命宫定法</div>
                <div className="flex rounded-full border border-gray-200 p-0.5">
                  {([["mao", "遇卯安命（古法）"], ["sunrise", "日出定命"]] as Array<[MingGongMode, string]>).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setMingMode(k)}
                      className={`flex-1 rounded-full py-1.5 text-xs font-medium ${mingMode === k ? "text-white" : "text-gray-500"}`}
                      style={mingMode === k ? { backgroundColor: BRAND } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-xs text-gray-500">童限起岁</div>
                <div className="flex rounded-full border border-gray-200 p-0.5">
                  {([10, 9] as Array<9 | 10>).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setDongweiStart(k)}
                      className={`flex-1 rounded-full py-1.5 text-xs font-medium ${dongweiStart === k ? "text-white" : "text-gray-500"}`}
                      style={dongweiStart === k ? { backgroundColor: BRAND } : {}}
                    >
                      {k} 岁起（{k === 10 ? "通行古法" : "师传早一年"}）
                    </button>
                  ))}
                </div>
              </div>
            </div>
          }
        />
        <div className="mx-3 mt-3 rounded-lg border border-red-100 bg-red-50/50 p-3">
          <p className="text-xs leading-relaxed text-gray-500">
            <strong>免责声明：</strong>本工具仅供传统文化学习与参考，不构成任何人生决策建议。星曜释义为通行天文口径描述。
          </p>
        </div>
        {toast && (
          <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white">{toast}</div>
        )}
      </div>
    );
  }

  // ==================== 已排盘：盘面 ====================
  const sun = result.stars.find((s) => s.key === "sun");
  const moon = result.stars.find((s) => s.key === "moon");

  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "420px", minHeight: "100vh" }}>
      {/* 基本信息 */}
      <div className="bg-white px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-gray-800">
            {name ? `${name} · ` : ""}七政四余星盘
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full border px-3 py-1 text-[11px] font-medium active:scale-95"
            style={{ borderColor: "#d9c7ee", color: BRAND }}
          >
            重新排盘
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <div><span className="text-gray-500">出生：</span><span className="font-medium">{birthText}</span></div>
          <div><span className="text-gray-500">地点：</span><span className="font-medium">{result.input.placeName}</span></div>
          <div><span className="text-gray-500">真太阳时：</span><span className="font-medium">{result.trueSolar.trueSolarTime}</span></div>
          <div><span className="text-gray-500">时辰：</span><span className="font-medium">{result.hour.name}（{result.hour.branch}时）</span></div>
          <div><span className="text-gray-500">昼夜：</span><span className="font-medium">{result.dayNight.isDay ? "昼生" : "夜生"}</span></div>
          <div><span className="text-gray-500">星制：</span><span className="font-medium">{frameText}</span></div>
        </div>
        <p className="mt-1.5 text-[10px] text-gray-400">
          真太阳时校正：经度差 {result.trueSolar.longitudeOffsetMin.toFixed(1)} 分 + 均时差 {result.trueSolar.equationOfTimeMin.toFixed(1)} 分
        </p>
      </div>

      {/* 星盘 */}
      <div className="mt-2 bg-white px-2 py-3">
        <div className="mx-auto" style={{ width: 344, height: 344 }}>
          <svg viewBox="0 0 360 360" width={344} height={344}>
            {/* 外圈底 */}
            <circle cx={C} cy={C} r={179} fill={PAN_BG} stroke={PAN_LINE} strokeWidth={2} />
            {/* 二十八宿圈（150-176） */}
            {result.mansions.map((m) => {
              const a1 = m.startLon;
              const a2 = m.startLon + m.width;
              const mid = a1 + m.width / 2;
              const [tx, ty] = px(163, mid);
              return (
                <g key={m.name}>
                  <path d={sectorPath(150, 176, a1, a2)} fill="#efe4c8" stroke={PAN_LINE} strokeWidth={0.5} />
                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central"
                    fontSize={10} fill="#5a4526" fontWeight={600}
                    transform={`rotate(${mid} ${tx} ${ty})`}>
                    {m.name}
                  </text>
                </g>
              );
            })}
            {/* 十二宫圈（104-148） */}
            {result.palaces.map((p) => {
              const mid = p.startLon + p.width / 2;
              const [bx, by] = px(134, mid);
              const [rx, ry] = px(114, mid);
              const flip = mid > 90 && mid < 270;
              return (
                <g key={p.branch}>
                  <path d={sectorPath(104, 148, p.startLon, p.startLon + p.width)} fill={PAN_BG} stroke={PAN_LINE} strokeWidth={0.8} />
                  <text x={bx} y={by} textAnchor="middle" dominantBaseline="central"
                    fontSize={17} fill="#3a2d18" fontWeight={700}
                    transform={`rotate(${mid} ${bx} ${by})`}>
                    {p.branch}
                  </text>
                  <text x={rx} y={ry} textAnchor="middle" dominantBaseline="central"
                    fontSize={8.5} fill="#7a6240"
                    transform={`rotate(${flip ? mid + 180 : mid} ${rx} ${ry})`}>
                    {flip ? p.renshiGong.split("").reverse().join("") : p.renshiGong}
                  </text>
                  <text x={rx} y={ry} dy={flip ? -9 : 9} textAnchor="middle" dominantBaseline="central"
                    fontSize={7.5} fill="#a08a5f"
                    transform={`rotate(${flip ? mid + 180 : mid} ${rx} ${ry})`}>
                    {flip ? `主${p.owner}`.split("").reverse().join("") : `主${p.owner}`}
                  </text>
                </g>
              );
            })}
            {/* 命宫高亮 */}
            <path d={sectorPath(104, 148, result.mingGong.startLon, result.mingGong.startLon + result.mingGong.width)}
              fill="rgba(123,47,190,0.18)" stroke="#7B2FBE" strokeWidth={1.2} />
            <path d={sectorPath(104, 148, result.palaces[result.shenGong.branchIndex].startLon, result.palaces[result.shenGong.branchIndex].startLon + result.palaces[result.shenGong.branchIndex].width)}
              fill="rgba(33,150,243,0.14)" stroke="#2196F3" strokeWidth={1} />
            {/* 星区 */}
            <circle cx={C} cy={C} r={104} fill={STAR_AREA} stroke={PAN_LINE} strokeWidth={1.5} />
            <circle cx={C} cy={C} r={99} fill="none" stroke="#31406b" strokeWidth={0.7} />
            {/* 度刻度（星区内缘每 15°） */}
            {Array.from({ length: 24 }, (_, i) => {
              const a = i * 15;
              const [x1, y1] = px(104, a);
              const [x2, y2] = px(99, a);
              return <line key={`k${a}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#31406b" strokeWidth={0.6} />;
            })}
            {/* 星曜 */}
            {starLayout.map(({ s, r }) => {
              const [x, y] = px(r, s.lon);
              const color = WUXING_STAR_COLOR[s.wuxing] || GOLD;
              return (
                <g key={s.key}>
                  <text x={x} y={y - 5} textAnchor="middle" dominantBaseline="central"
                    fontSize={11} fill={color} fontWeight={700}>
                    {s.kind === "zheng" ? s.symbol : s.name}
                  </text>
                  <text x={x} y={y + 6} textAnchor="middle" dominantBaseline="central"
                    fontSize={7.5} fill="#c9d4ee">
                    {s.name}
                  </text>
                  {s.retrograde && (
                    <text x={x} y={y + 15} textAnchor="middle" fontSize={7} fill="#ff8a80">逆</text>
                  )}
                </g>
              );
            })}
            {/* 天心十字 */}
            <line x1={C} y1={C - 103} x2={C} y2={C + 103} stroke="rgba(232,201,106,0.4)" strokeWidth={0.8} />
            <line x1={C - 103} y1={C} x2={C + 103} y2={C} stroke="rgba(232,201,106,0.4)" strokeWidth={0.8} />
            {/* 命度 / 身度标记（外缘） */}
            <g>
              <line x1={px(176, result.mingDu.lon)[0]} y1={px(176, result.mingDu.lon)[1]}
                x2={px(158, result.mingDu.lon)[0]} y2={px(158, result.mingDu.lon)[1]}
                stroke="#e53935" strokeWidth={2} />
              <circle cx={px(183, result.mingDu.lon)[0]} cy={px(183, result.mingDu.lon)[1]} r={4} fill="#e53935" />
            </g>
            <g>
              <line x1={px(176, result.shenDu.lon)[0]} y1={px(176, result.shenDu.lon)[1]}
                x2={px(158, result.shenDu.lon)[0]} y2={px(158, result.shenDu.lon)[1]}
                stroke="#4fc3f7" strokeWidth={2} />
              <circle cx={px(183, result.shenDu.lon)[0]} cy={px(183, result.shenDu.lon)[1]} r={4} fill="#4fc3f7" />
            </g>
            {/* 中心引擎标记 */}
            <circle cx={C} cy={C} r={26} fill={PAN_DARK} stroke={PAN_LINE} strokeWidth={1} />
            <text x={C} y={C - 7} textAnchor="middle" fontSize={7.5} fill="#bfa76a">七政四余</text>
            <text x={C} y={C + 3} textAnchor="middle" fontSize={8.5} fill={GOLD} fontWeight={700}>{result.mingGong.branch}宫立命</text>
            <text x={C} y={C + 13} textAnchor="middle" fontSize={7} fill="#bfa76a">{result.shenGong.branch}宫安身</text>
          </svg>
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-2 text-[10px] text-gray-500">
          <span><span className="mr-0.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: "#e53935" }} />命度</span>
          <span><span className="mr-0.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: "#4fc3f7" }} />身度</span>
          <span><span className="mr-0.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: "rgba(123,47,190,0.55)" }} />命宫</span>
          <span><span className="mr-0.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: "rgba(33,150,243,0.5)" }} />身宫</span>
          <span>盘面：0° 黄经在上顺时针（今制＝黄道分点起量）</span>
        </div>
      </div>

      {/* 命身要略 */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="mb-2 text-sm font-bold" style={{ color: BRAND }}>命身要略</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-[#f5f0fa] p-2.5">
            <div className="text-[10px] text-gray-500">命宫 / 命度</div>
            <div className="mt-0.5 text-sm font-bold text-gray-800">{result.mingGong.branch}宫 · {result.mingDu.xiuFullName}{result.mingDu.xiuDegree.toFixed(1)}°</div>
            <div className="mt-0.5 text-[11px] text-gray-600">命度主：{result.mingDuZhu}｜命元：{result.mingYuanWuxing}</div>
          </div>
          <div className="rounded-lg bg-[#eff6fd] p-2.5">
            <div className="text-[10px] text-gray-500">身宫 / 身度</div>
            <div className="mt-0.5 text-sm font-bold text-gray-800">{result.shenGong.branch}宫 · {result.shenDu.xiuFullName}{result.shenDu.xiuDegree.toFixed(1)}°</div>
            <div className="mt-0.5 text-[11px] text-gray-600">身度主：{result.shenDuZhu}</div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-gray-100 p-2">
            <span className="text-gray-500">太阳：</span><span className="font-semibold">{sun ? `${sun.palaceBranch}宫${sun.palaceDegree.toFixed(1)}° ${sun.xiuFullName}${sun.xiuDegree.toFixed(1)}°` : "--"}</span>
          </div>
          <div className="rounded-lg border border-gray-100 p-2">
            <span className="text-gray-500">太阴：</span><span className="font-semibold">{moon ? `${moon.palaceBranch}宫${moon.palaceDegree.toFixed(1)}° ${moon.xiuFullName}${moon.xiuDegree.toFixed(1)}°` : "--"}</span>
          </div>
        </div>
      </div>

      {/* 十一曜明细 */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="mb-2 text-sm font-bold" style={{ color: BRAND }}>十一曜宫度（七政四余）</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-gray-500">
                <th className="py-1.5 text-left font-medium">星曜</th>
                <th className="py-1.5 text-left font-medium">宫/度</th>
                <th className="py-1.5 text-left font-medium">宿度</th>
                <th className="py-1.5 text-left font-medium">人事宫</th>
                <th className="py-1.5 text-left font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {result.stars.map((s) => (
                <tr key={s.key} className="border-t border-gray-50">
                  <td className="py-1.5">
                    <span style={{ color: WUXING_STAR_COLOR[s.wuxing] || "#333" }}>●</span>{" "}
                    <span className="font-semibold">{s.name}</span>
                    <span className="ml-0.5 text-[9px] text-gray-400">{s.wuxing}</span>
                  </td>
                  <td className="py-1.5 tabular-nums">{s.palaceBranch}宫{s.palaceDegree.toFixed(1)}°</td>
                  <td className="py-1.5 tabular-nums">{s.xiuName}{s.xiuDegree.toFixed(1)}°</td>
                  <td className="py-1.5">{s.renshiGong}</td>
                  <td className="py-1.5">
                    <span className={s.retrograde ? "text-red-500" : "text-gray-400"}>{s.retrograde ? "逆" : "顺"}</span>
                    {s.inYuan && <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] text-amber-700">入垣</span>}
                    {s.shengDian && <span className="ml-1 rounded bg-emerald-100 px-1 py-0.5 text-[9px] text-emerald-700">升殿</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[10px] text-gray-400">
          入垣＝星居宫主之宫；升殿＝星居宿主之宿。迟速：{result.stars.map((s) => `${s.name}${s.retrograde ? "逆" : "顺"}`).slice(0, 11).join("、")}
        </p>
      </div>

      {/* 洞微大限 */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: BRAND }}>洞微大限</span>
          <span className="text-[11px] text-gray-500">童限 {result.dongwei.startBase} 岁起 · 出限 {result.dongwei.chuxianText}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-gray-500">
                <th className="py-1.5 text-left font-medium">人事宫</th>
                <th className="py-1.5 text-left font-medium">限宫</th>
                <th className="py-1.5 text-left font-medium">虚岁</th>
                <th className="py-1.5 text-left font-medium">管限</th>
              </tr>
            </thead>
            <tbody>
              {result.dongwei.rows.map((r, i) => (
                <tr key={i} className={`border-t border-gray-50 ${r.isTongxian ? "bg-amber-50/50" : ""}`}>
                  <td className="py-1.5">{r.renshiGong}{r.isTongxian && <span className="ml-1 text-[9px] text-amber-700">童限</span>}</td>
                  <td className="py-1.5">{r.palaceBranch}宫</td>
                  <td className="py-1.5 tabular-nums">{r.startAge}-{Math.ceil(r.endAge) - 1}岁</td>
                  <td className="py-1.5 tabular-nums">{r.years}年</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 行限查询 */}
        <div className="mt-3 rounded-lg bg-[#f5f0fa] p-3">
          <div className="mb-2 text-xs font-medium text-gray-700">行限查询（输入虚岁）</div>
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} max={120} placeholder="如 36"
              value={xianAge}
              onChange={(e) => setXianAge(e.target.value === "" ? "" : Math.floor(Number(e.target.value)))}
              className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-center text-sm outline-none focus:border-[#7B2FBE]"
            />
            <div className="flex-1 text-[11px] leading-relaxed">
              {xianAge === "" ? (
                <span className="text-gray-400">查询该岁所在大限与行限度</span>
              ) : xian ? (
                <>
                  <span className="text-gray-600">{xian.row.renshiGong}限（{xian.row.palaceBranch}宫，{xian.row.startAge}-{Math.ceil(xian.row.endAge) - 1}岁）</span>
                  <br />
                  <span className="font-semibold" style={{ color: BRAND }}>行限 {xian.xiuFullName}{xian.xiuDegree.toFixed(1)}°</span>
                </>
              ) : (
                <span className="text-gray-400">虚岁超出行限范围</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 断语解读（v25.0.71 果老星宗八卷知识库，受后台七项开关管控） */}
      {duanyu && (duanyuMasterOn || duanyuMasterMaint) && (
        <div className="mt-2 bg-white px-3 py-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: BRAND }}>断语解读（果老星宗）</span>
            <span className="flex items-center gap-2">
              {duanyuMasterOn && (
                <span className="text-[10px] text-gray-500">
                  {duanyu.yearGanzhi.gan}{duanyu.yearGanzhi.zhi}年 · 共{duanyuSummary.total}条
                </span>
              )}
              {/* v25.0.72：跳转易学学习区·七政四余类目（八卷135知识点+141题，可追溯出处） */}
              <Link
                href="/academy/learn?track=yixue&category=%E4%B8%83%E6%94%BF%E5%9B%9B%E4%BD%99"
                className="rounded-full border px-2 py-0.5 text-[10px] active:opacity-70"
                style={{ borderColor: BRAND + "44", color: BRAND }}
              >
                查看学习资料
              </Link>
            </span>
          </div>
          {duanyuMasterMaint ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-700">
              断语功能维护中，稍后再试（后台开关：MAINTENANCE）
            </div>
          ) : visibleDySections.length === 0 ? (
            <div className="rounded-lg bg-[#f5f0fa] p-3 text-center text-xs text-gray-500">
              本盘暂无命中的可见断语
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap gap-2 text-[10px]">
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">吉 {duanyuSummary.ji}</span>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600">凶 {duanyuSummary.xiong}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">中性 {duanyuSummary.zhong}</span>
                <span className="text-gray-400">分级为古籍通行口径提示，非绝对祸福断言</span>
              </div>
              <div className="divide-y divide-gray-100">
                {visibleDySections.map((sec) => {
                  const open = dyOpenSections.has(sec.key);
                  return (
                    <div key={sec.key} className="py-1">
                      <button
                        type="button"
                        onClick={() => toggleDySection(sec.key)}
                        className="flex w-full items-center justify-between py-2 text-left active:opacity-70"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-800">{sec.name}</span>
                          <span className="rounded-full bg-[#f5f0fa] px-1.5 py-0.5 text-[9px] text-gray-500">{sec.items.length}</span>
                        </span>
                        <span className="text-xs text-gray-400">{open ? "收起 ▲" : "展开 ▼"}</span>
                      </button>
                      {open && (
                        <div className="space-y-2 pb-2">
                          <p className="text-[10px] leading-relaxed text-gray-400">{sec.desc}</p>
                          {sec.items.map((it) => {
                            const meta = DUANYU_LEVEL_META[it.level];
                            return (
                              <div key={it.id} className="rounded-lg border border-gray-100 p-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${meta.badge}`}>{meta.label}</span>
                                  <span className="text-xs font-semibold text-gray-800">{it.title}</span>
                                </div>
                                <p className="mt-1.5 text-[11px] leading-relaxed text-gray-600">{it.text}</p>
                                {it.verse && (
                                  <p className="mt-1.5 rounded bg-[#faf6ec] p-2 text-[10px] leading-relaxed text-[#8a6d3b]">
                                    「{it.verse}」
                                  </p>
                                )}
                                <p className="mt-1.5 text-[9px] text-gray-400">出处：{it.source}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <p className="mt-1.5 text-[9px] text-gray-400">
            断语引擎：{DUANYU_ENGINE_VERSION} · 逐条标注知识库卷节出处，仅供传统文化学习参考
          </p>
        </div>
      )}

      {/* AI 解读 */}
      <div className="mt-2 bg-white px-3 py-3">
        <AIInterpretButton
          toolName="七政四余"
          scope="整体解读"
          contextData={aiContext}
          buttonText="AI 解读星盘"
        />
      </div>

      {/* 客户记录 */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="mb-2 text-xs text-gray-500">客户排盘记录（可选）</div>
        <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
        <button
          onClick={() => {
            if (!selectedClient) { showToast("请先选择客户"); return; }
            if (!lastInput) { showToast("无排盘数据"); return; }
            try {
              saveRecord({
                clientId: selectedClient.id, type: "qizheng",
                data: { input: lastInput, mingGong: result.mingGong.branch, shenGong: result.shenGong.branch,
                  mingDu: `${result.mingDu.xiuFullName}${result.mingDu.xiuDegree.toFixed(1)}°`,
                  chuxian: result.dongwei.chuxianText },
                note: "", status: "pending",
              });
              trackToolEvent("qizheng", "tool_save");
              setSavedCount((c) => c + 1);
              showToast("排盘记录已保存到客户档案");
            } catch { showToast("保存失败，请重试"); }
          }}
          disabled={!selectedClient}
          className="mt-2 w-full rounded-full border py-2.5 text-sm font-semibold active:scale-[0.98] disabled:opacity-40"
          style={{ borderColor: "#d9c7ee", color: BRAND, backgroundColor: "#f5f0fa" }}
        >
          保存排盘到客户档案{savedCount > 0 ? `（已存 ${savedCount} 条）` : ""}
        </button>
      </div>

      {/* 分享 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="七政四余排盘结果"
          description="七政四余星命排盘"
          variant="block"
          label="分享排盘结果"
          onShared={() => trackToolEvent("qizheng", "tool_share")}
          shareData={{
            toolType: "qizheng",
            title: `七政四余：${result.mingGong.branch}宫立命 · ${result.mingDu.xiuFullName}`,
            summary: `${frameText} · 命宫${result.mingGong.branch} · 身宫${result.shenGong.branch}`,
            payload: {
              summaryLines: [
                `出生：${birthText}（${result.input.placeName}）`,
                `真太阳时：${result.trueSolar.trueSolarTime}｜时辰：${result.hour.name}`,
                `星制：${frameText}｜命宫定法：${result.input.mingGongMode === "sunrise" ? "日出定命" : "遇卯安命"}`,
                `命宫：${result.mingGong.branch}宫｜命度：${result.mingDu.xiuFullName}${result.mingDu.xiuDegree.toFixed(1)}°｜命度主：${result.mingDuZhu}`,
                `身宫：${result.shenGong.branch}宫｜身度：${result.shenDu.xiuFullName}${result.shenDu.xiuDegree.toFixed(1)}°｜身度主：${result.shenDuZhu}`,
                `命元五行：${result.mingYuanWuxing}`,
                `太阳：${sun ? `${sun.palaceBranch}宫${sun.palaceDegree.toFixed(1)}°` : "--"}｜太阴：${moon ? `${moon.palaceBranch}宫${moon.palaceDegree.toFixed(1)}°` : "--"}`,
                `洞微大限：童限${result.dongwei.startBase}岁起，出限${result.dongwei.chuxianText}`,
                `引擎：${QIZHENG_ENGINE_VERSION}`,
              ],
            },
          }}
        />
      </div>

      {/* 免责声明 */}
      <div className="mx-3 mt-2 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong>免责声明：</strong>本页面内容仅供传统文化学习与参考，不构成任何人生决策建议。星盘基于天文历算引擎（MIT 协议）计算，四余（炁罗计孛）为古典虚拟曜口径。
        </p>
        <p className="mt-1 text-[10px] text-gray-400">引擎：{QIZHENG_ENGINE_VERSION}</p>
      </div>
      <div style={{ height: "20px" }} />

      {/* 重排弹窗 */}
      <DatePicker
        show={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        submitText="重新排盘"
        title="七政四余排盘"
        initialDate={lastInput ? { year: lastInput.year, month: lastInput.month, day: lastInput.day, hour: lastInput.hour, minute: lastInput.minute } : undefined}
        extraOptions={
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1.5 text-xs text-gray-500">出生地点（省/市/区县三级）</div>
              <SharedBirthLocationSelector
                lng={region.lng}
                indices={regionIdx}
                onIndicesChange={setRegionIdx}
                label="出生地"
                showQuickCities={false}
              />
            </div>
            <div className="flex rounded-full border border-gray-200 p-0.5">
              {([["tropical", "今制"], ["sidereal", "恒星制"]] as Array<[StarFrame, string]>).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFrame(k)}
                  className={`flex-1 rounded-full py-1.5 text-xs font-medium ${frame === k ? "text-white" : "text-gray-500"}`}
                  style={frame === k ? { backgroundColor: BRAND } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {toast && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white">{toast}</div>
      )}
    </div>
  );
}
