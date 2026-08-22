"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { DatePicker } from "@/components/shared";
import { ASTRO_CITIES, calcNatalChart, ASTRO_ENGINE_VERSION } from "@/algorithm-core";
import type { NatalChartResult } from "@/algorithm-core";
import { getToolConfig } from "@/lib/toolConfigStore";
import { listCharts, saveChart, deleteChart, deleteAllCharts, buildShareSnapshot } from "@/lib/astroStore";
import type { SavedChart } from "@/lib/astroStore";
import { savePaipanState, loadPaipanState, clearPaipanState } from "@/lib/paipanPersistence";
import AIInterpretButton from "@/components/AIInterpretButton";
import { buildDeepReportSystemPrompt } from "@/lib/deepReportPrompt";
import { ShareButton } from "@/components/ShareButton";

import { getDignity, DIGNITY_NOTES, CLASSICAL_ASTRO_VERSION as CLASSICAL_VERSION } from "@/lib/classicalAstroRules";

// ============================================================================
// 常量
// ============================================================================
const BRAND = "#7B2FBE";
const ZODIAC_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

// 术语解释（通用科普，LOC 后台可扩展替换文案）
const TERM_NOTES: Array<{ term: string; note: string }> = [
  { term: "上升点 ASC", note: "出生时刻东方地平线与黄道的交点，占星传统中代表外在形象与待人接物的第一印象。" },
  { term: "天顶 MC", note: "出生时刻黄道最高点，传统上与事业方向、社会形象相关。" },
  { term: "行星落座", note: "行星在出生时刻所处的黄道十二星座区间，反映传统占星对该能量领域的描述风格。" },
  { term: "宫位", note: "以出生时间与地点把天空划分为十二个生活领域（等宫制），行星落入的宫位表示其作用的领域。" },
  { term: "相位", note: "两颗行星黄经之间的特定角度（合、六合、刑、拱、冲），占星传统中描述两者能量的互动方式。" },
  { term: "逆行 ℞", note: "由于地球与其他行星绕日运动的相对速度差异产生的视觉逆行现象，属正常天文现象。" },
];

// ============================================================================
// 主组件
// ============================================================================
export default function AstroPage() {
  const astroCfg = useMemo(() => getToolConfig().astro, []);
  const [birth, setBirth] = useState({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
  const [cityIdx, setCityIdx] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chart, setChart] = useState<NatalChartResult | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SavedChart[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [shareConfirmed, setShareConfirmed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showMyCharts, setShowMyCharts] = useState(false);
  const [showDignity, setShowDignity] = useState(false);

  useEffect(() => {
    setSaved(listCharts());
  }, []);

  // 恢复上次排盘状态
  useEffect(() => {
    const s = loadPaipanState("astro");
    if (s && s.input) {
      const inp = s.input as unknown as { birth?: typeof birth; cityIdx?: number; chart?: NatalChartResult };
      if (inp.birth) setBirth(inp.birth);
      if (typeof inp.cityIdx === "number") setCityIdx(inp.cityIdx);
      if (inp.chart) setChart(inp.chart);
    }
  }, []);

  const city = ASTRO_CITIES[cityIdx] || ASTRO_CITIES[0];

  const handleCalc = useCallback(() => {
    setError("");
    setLoading(true);
    setTimeout(() => {
      try {
        const result = calcNatalChart({
          year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.minute,
          lat: city.lat, lon: city.lon, tzOffset: city.tz, placeName: city.name,
        });
        setChart(result);
        savePaipanState("astro", { input: { birth, cityIdx, chart: result }, showForm: false, _ts: Date.now() });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "星盘计算失败，请检查输入");
      } finally {
        setLoading(false);
      }
    }, 150);
  }, [birth, city, cityIdx]);

  // ==================== 星盘轮盘绘制 ====================
  const chartSvg = useMemo(() => {
    if (!chart) return null;
    const cx = 150, cy = 150;
    const rZodiac = 138, rHouseOuter = 112, rPlanet = 92, rInner = 62;
    const asc = chart.ascendant;
    // 黄经 → 屏幕角度：ASC 固定在左侧（180°屏幕角）
    const pos = (lon: number, r: number) => {
      const theta = (180 + (lon - asc)) * Math.PI / 180;
      return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) };
    };
    const parts: string[] = [];

    // 外圈
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${rZodiac}" fill="none" stroke="${BRAND}" stroke-width="1.5"/>`);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${rHouseOuter}" fill="none" stroke="${BRAND}" stroke-width="1"/>`);

    // 十二星座扇区分隔（黄经 0/30/...）
    for (let i = 0; i < 12; i++) {
      const p1 = pos(i * 30, rZodiac);
      const p2 = pos(i * 30, rHouseOuter);
      parts.push(`<line x1="${p2.x}" y1="${p2.y}" x2="${p1.x}" y2="${p1.y}" stroke="#d8c7ee" stroke-width="0.8"/>`);
      const mid = pos(i * 30 + 15, (rZodiac + rHouseOuter) / 2);
      parts.push(`<text x="${mid.x}" y="${mid.y + 4}" text-anchor="middle" font-size="11" fill="#7B2FBE">${ZODIAC_SYMBOLS[i]}</text>`);
    }

    // 十二宫宫头线（ASC 起每 30°）
    for (let i = 0; i < 12; i++) {
      const cusp = chart.houseCusps[i];
      const p1 = pos(cusp, rHouseOuter);
      const p2 = pos(cusp, rInner);
      const isAxis = i === 0 || i === 3 || i === 6 || i === 9;
      parts.push(`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${isAxis ? BRAND : "#c9b6e4"}" stroke-width="${isAxis ? 1.4 : 0.7}" ${isAxis ? 'stroke-dasharray="none"' : 'stroke-dasharray="3,3"'}/>`);
      const label = pos(cusp + 15, (rHouseOuter + rInner) / 2 + 8);
      parts.push(`<text x="${label.x}" y="${label.y}" text-anchor="middle" font-size="8" fill="#9b7ec9">${i + 1}</text>`);
    }

    // 行星
    chart.planets.forEach((p) => {
      const pt = pos(p.lon, rPlanet);
      parts.push(`<text x="${pt.x}" y="${pt.y + 4}" text-anchor="middle" font-size="13" font-weight="bold" fill="#3b2460">${p.symbol}${p.retrograde ? "℞" : ""}</text>`);
      const dt = pos(p.lon, rPlanet - 14);
      parts.push(`<text x="${dt.x}" y="${dt.y}" text-anchor="middle" font-size="6.5" fill="#888">${Math.floor(p.signDegree)}°</text>`);
    });

    // ASC/MC 标注
    const ascP = pos(asc, rHouseOuter - 14);
    parts.push(`<text x="${ascP.x - 4}" y="${ascP.y + 3}" text-anchor="middle" font-size="9" font-weight="bold" fill="${BRAND}">ASC</text>`);
    const mcP = pos(chart.midheaven, rHouseOuter - 14);
    parts.push(`<text x="${mcP.x}" y="${mcP.y + 3}" text-anchor="middle" font-size="9" font-weight="bold" fill="${BRAND}">MC</text>`);

    return `<svg viewBox="0 0 300 300" style="width:100%;max-width:340px;display:block;margin:0 auto">${parts.join("")}</svg>`;
  }, [chart]);

  // ==================== 渲染 ====================
  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "420px", minHeight: "100vh" }}>
      <DatePicker
        show={showPicker}
        onClose={() => setShowPicker(false)}
        onSubmit={(v) => { setBirth({ year: v.year, month: v.month, day: v.day, hour: v.hour, minute: v.minute }); setShowPicker(false); }}
        initialDate={birth}
        showMinute={true}
        showGender={false} showCalType={false} showToggles={false} showRegion={false} showName={false}
        submitText="确认出生时间" title="选择出生日期与时间（公历）"
      />

      {/* 输入表单 */}
      {!chart && (
        <div className="bg-white px-3 py-3">
          <div className="mb-2 text-center text-sm font-bold" style={{ color: BRAND }}>占星星盘 · 兴趣工具</div>
          <div className="mb-2 text-center text-[11px] text-gray-400">基于天文算法计算行星位置 · 仅供文化娱乐</div>

          {/* 出生地 */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">出生城市</label>
            <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/60 p-2">
              {ASTRO_CITIES.map((c, i) => (
                <button
                  key={c.name}
                  onClick={() => setCityIdx(i)}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${cityIdx === i ? "text-white" : "bg-white text-gray-600"}`}
                  style={cityIdx === i ? { backgroundColor: BRAND } : { border: "1px solid #e5e7eb" }}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="mt-1 text-[10px] text-gray-400">坐标：{city.lat.toFixed(2)}°, {city.lon.toFixed(2)}° · 时区 UTC+{city.tz}</div>
          </div>

          {/* 出生日期时间 */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">出生日期与时间（公历，尽量精确到分）</label>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm active:bg-gray-50"
            >
              <span className="font-medium text-gray-700">
                {birth.year}-{String(birth.month).padStart(2, "0")}-{String(birth.day).padStart(2, "0")} {String(birth.hour).padStart(2, "0")}:{String(birth.minute).padStart(2, "0")}
              </span>
              <span className="text-xs text-gray-400">点击修改</span>
            </button>
          </div>

          {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

          <button
            onClick={handleCalc}
            disabled={loading || !astroCfg.enabled}
            className="w-full rounded-full py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: BRAND }}
          >
            {loading ? "计算中..." : "生成星盘"}
          </button>

          <button onClick={() => setShowTerms(!showTerms)} className="mt-3 w-full text-center text-xs text-gray-400">
            {showTerms ? "收起术语说明 ▲" : "什么是上升点/宫位/相位？术语说明 ▼"}
          </button>
          {showTerms && (
            <div className="mt-2 space-y-1.5 rounded-lg bg-gray-50 p-2.5">
              {TERM_NOTES.map((t) => (
                <div key={t.term}>
                  <span className="text-[11px] font-bold text-gray-700">{t.term}</span>
                  <span className="ml-1 text-[11px] text-gray-500">{t.note}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 结果 */}
      {chart && (
        <div className="bg-white px-3 py-3">
          {/* 概览 */}
          <div className="mb-3 rounded-lg p-3" style={{ backgroundColor: "#f3edf7" }}>
            <div className="text-center text-sm font-bold" style={{ color: BRAND }}>本命星盘</div>
            <div className="mt-1 text-center text-xs text-gray-500">
              {chart.input.year}-{String(chart.input.month).padStart(2, "0")}-{String(chart.input.day).padStart(2, "0")} {String(chart.input.hour).padStart(2, "0")}:{String(chart.input.minute).padStart(2, "0")} · {chart.input.placeName}
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-2 text-center text-[11px]">
              <div className="rounded bg-white/70 py-1.5">
                <span className="text-gray-400">上升</span>
                <span className="ml-1 font-bold text-gray-700">{chart.ascSignName}</span>
              </div>
              <div className="rounded bg-white/70 py-1.5">
                <span className="text-gray-400">天顶</span>
                <span className="ml-1 font-bold text-gray-700">{chart.mcSignName}</span>
              </div>
            </div>
            <div className="mt-1.5 text-center text-[10px] text-gray-400">
              恒星时 {chart.siderealTime} · 黄赤交角 {chart.obliquity}° · {chart.engineVersion}
            </div>
          </div>

          {/* 星盘轮盘 */}
          <div className="mb-3 rounded-lg border border-purple-100 p-2" dangerouslySetInnerHTML={{ __html: chartSvg || "" }} />

          {/* 行星表 */}
          <div className="mb-3 overflow-hidden rounded-lg border border-gray-100">
            <div className="grid grid-cols-6 bg-gray-50 px-2 py-1.5 text-[10px] font-bold text-gray-500">
              <span>行星</span><span>星座</span><span className="text-right">度数</span><span className="text-right">宫位</span><span className="text-right">尊贵</span><span className="text-right">状态</span>
            </div>
            {chart.planets.map((p) => {
              const dig = getDignity(p.name, p.signIndex);
              const digColor = dig.kind === "domicile" || dig.kind === "exaltation" ? "#1E8449" : dig.kind === "detriment" || dig.kind === "fall" ? "#b03a2e" : "#9aa0a6";
              return (
                <div key={p.body} className="grid grid-cols-6 items-center px-2 py-1.5 text-[11px] text-gray-700 odd:bg-white even:bg-gray-50/50">
                  <span className="font-semibold">{p.symbol} {p.name}</span>
                  <span>{p.signName}</span>
                  <span className="text-right">{Math.floor(p.signDegree)}°{String(Math.floor((p.signDegree % 1) * 60)).padStart(2, "0")}′</span>
                  <span className="text-right">{p.house}宫</span>
                  <span className="text-right font-semibold" style={{ color: digColor }}>{dig.label}</span>
                  <span className={`text-right ${p.retrograde ? "font-bold text-red-500" : "text-gray-300"}`}>{p.retrograde ? "℞ 逆行" : "顺行"}</span>
                </div>
              );
            })}
          </div>

          {/* 古典尊贵说明（公版典籍框架） */}
          <div className="mb-3 rounded-lg border border-purple-100 p-2.5">
            <button onClick={() => setShowDignity(!showDignity)} className="flex w-full items-center justify-between">
              <span className="text-xs font-bold text-gray-700">古典尊贵（庙旺陷弱）· {CLASSICAL_VERSION}</span>
              <span className="text-[10px] text-gray-400">{showDignity ? "收起 ▲" : "展开 ▼"}</span>
            </button>
            {showDignity && (
              <div className="mt-2 space-y-1.5">
                {chart.planets.filter((p) => ["太阳", "月亮", "水星", "金星", "火星", "木星", "土星"].includes(p.name)).map((p) => {
                  const dig = getDignity(p.name, p.signIndex);
                  return (
                    <div key={p.body} className="rounded bg-gray-50 px-2 py-1.5">
                      <span className="text-[11px] font-bold text-gray-700">{p.name}·{p.signName}</span>
                      <span className="ml-1.5 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold" style={{ color: dig.kind === "domicile" || dig.kind === "exaltation" ? "#1E8449" : dig.kind ? "#b03a2e" : "#666" }}>
                        {dig.label}
                      </span>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{dig.note}</p>
                    </div>
                  );
                })}
                <div className="border-t border-gray-100 pt-1.5">
                  {DIGNITY_NOTES.map((t) => (
                    <div key={t.term} className="mt-1">
                      <span className="text-[10px] font-bold text-gray-600">{t.term}</span>
                      <span className="ml-1 text-[10px] text-gray-400">{t.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 相位 */}
          {chart.aspects.length > 0 && (
            <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
              <div className="mb-1.5 text-xs font-bold text-gray-700">主要相位</div>
              <div className="flex flex-wrap gap-1.5">
                {chart.aspects.slice(0, 12).map((a, i) => (
                  <span key={i} className="rounded-full bg-purple-50 px-2 py-1 text-[10px] text-purple-700">
                    {a.planetA} {a.symbol} {a.planetB} · {a.type}(容许度{a.orb}°)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI 深度解读（增值服务，统一 Paywall 链路） */}
          {astroCfg.aiDeepEnabled && (
            <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50/40 p-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold" style={{ color: BRAND }}>AI 星盘深度解读</div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold" style={{ color: BRAND }}>
                  增值服务 ¥{astroCfg.aiDeepPrice}/次
                </span>
              </div>
              <div className="mt-1 text-[10px] leading-relaxed text-gray-500">
                性格倾向、关系沟通、成长建议等文化娱乐类内容，禁止绝对化结论。结果永久缓存不重复计费，生成失败不计费。
              </div>
              <div className="mt-2">
                <AIInterpretButton
                  toolName="占星解读"
                  scope="深度解读"
                  buttonText={`AI 深度解读 ¥${astroCfg.aiDeepPrice}/次`}
                  cacheKey={`astro_deep_${chart.input.year}${chart.input.month}${chart.input.day}${chart.input.hour}${chart.input.minute}_${chart.input.lat}_${chart.input.lon}_${astroCfg.dataVersion}`}
                  contextData={`出生: ${chart.input.year}-${chart.input.month}-${chart.input.day} ${chart.input.hour}:${chart.input.minute} ${chart.input.placeName}\n上升: ${chart.ascSignName}\n天顶: ${chart.mcSignName}\n行星: ${chart.planets.map((p) => `${p.name}=${p.signName}${Math.floor(p.signDegree)}度${p.house}宫${p.retrograde ? "(逆行)" : ""}`).join("; ")}\n古典尊贵: ${chart.planets.map((p) => `${p.name}:${getDignity(p.name, p.signIndex).label}`).join("; ")}\n相位: ${chart.aspects.slice(0, 8).map((a) => `${a.planetA}${a.symbol}${a.planetB}(${a.type},${a.orb}度)`).join("; ")}`}
                  systemPrompt={buildDeepReportSystemPrompt("占星解读", "围绕性格倾向、关系沟通、成长建议等文化娱乐向内容展开，行星落座、宫位、相位的解读仅作传统文化视角的描述")}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-3 text-[10px] text-gray-400">
                <a href="/profile/wallet" className="underline">费用账单</a>
                <span>·</span>
                <a href="/profile/feedback" className="underline">投诉反馈</a>
              </div>
            </div>
          )}

          {/* 保存（隐私默认私有） */}
          <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
            <div className="text-xs font-bold text-gray-700">保存星盘</div>
            <div className="mt-1 text-[10px] text-gray-400">🔒 出 生时间与地点为敏感数据，保存后默认仅自己可见（私有）</div>
            <div className="mt-2 flex gap-2">
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="星盘名称，如：我的星盘"
                maxLength={30}
                className="flex-1 rounded-lg border border-gray-200 px-2.5 py-2 text-xs outline-none focus:border-purple-300"
              />
              <button
                onClick={() => {
                  const r = saveChart(saveName, chart, astroCfg.maxSavedCharts);
                  if (r.success && r.chart) {
                    setSaved(listCharts());
                    setSaveMsg("已保存（私有）");
                    setSaveName("");
                  } else {
                    setSaveMsg(r.error || "保存失败");
                  }
                  setTimeout(() => setSaveMsg(""), 2500);
                }}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-white"
                style={{ backgroundColor: BRAND }}
              >
                保存
              </button>
            </div>
            {saveMsg && <div className="mt-1 text-[10px] text-gray-500">{saveMsg}</div>}
          </div>

          {/* 分享预览（分享前必须确认） */}
          <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
            <div className="text-xs font-bold text-gray-700">分享</div>
            <div className="mt-1 text-[10px] text-gray-400">分享前请先预览并确认公开内容范围，分享文本不含精确坐标</div>
            <button
              onClick={() => { setShowSharePreview(true); setShareConfirmed(false); }}
              className="mt-2 w-full rounded-lg border py-2 text-xs font-semibold"
              style={{ borderColor: BRAND, color: BRAND }}
            >
              预览分享内容
            </button>
            {showSharePreview && (
              <div className="mt-2 rounded-lg bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-600">
                {buildShareSnapshot({ id: "", title: saveName || "本命星盘", isPrivate: true, chart, createdAt: "", updatedAt: "" })}
                <label className="mt-2 flex items-start gap-1.5 text-[10px] text-gray-500">
                  <input type="checkbox" checked={shareConfirmed} onChange={(e) => setShareConfirmed(e.target.checked)} className="mt-0.5" />
                  我已确认以上内容可以公开，了解其中包含我的出生日期与时间
                </label>
                {shareConfirmed && (
                  <div className="mt-2">
                    <ShareButton type="tool" title="占星星盘" description="占星兴趣工具" variant="block" label="确认并分享" shareData={{
              toolType: "astro",
              title: `占星星盘：上升${chart.ascSignName}`,
              summary: `上升${chart.ascSignName} · 天顶${chart.mcSignName} · 已确认公开`,
              payload: {
                summaryLines: buildShareSnapshot({ id: "", title: saveName || "本命星盘", isPrivate: true, chart, createdAt: "", updatedAt: "" }).split("\n").filter(Boolean),
              },
            }} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 我的星盘（查看/删除） */}
          <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-gray-700">我的星盘（{saved.length}/{astroCfg.maxSavedCharts}）</div>
              <div className="flex gap-2">
                <button onClick={() => setShowMyCharts(!showMyCharts)} className="text-[10px] text-purple-600 underline">
                  {showMyCharts ? "收起" : "展开"}
                </button>
                {saved.length > 0 && (
                  <button
                    onClick={() => { if (confirm("确定彻底删除全部星盘数据？此操作不可恢复")) { deleteAllCharts(); setSaved([]); } }}
                    className="text-[10px] text-red-500 underline"
                  >
                    全部删除
                  </button>
                )}
              </div>
            </div>
            {showMyCharts && (
              <div className="mt-2 space-y-1.5">
                {saved.length === 0 && <div className="text-[11px] text-gray-400">暂无保存的星盘</div>}
                {saved.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1.5">
                    <div>
                      <div className="text-[11px] font-medium text-gray-700">🔒 {s.title}</div>
                      <div className="text-[10px] text-gray-400">
                        {s.chart.input.year}-{String(s.chart.input.month).padStart(2, "0")}-{String(s.chart.input.day).padStart(2, "0")} · 上升{s.chart.ascSignName}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setChart(s.chart); setBirth({ year: s.chart.input.year, month: s.chart.input.month, day: s.chart.input.day, hour: s.chart.input.hour, minute: s.chart.input.minute }); setShowMyCharts(false); }}
                        className="text-[10px] text-purple-600 underline"
                      >
                        查看
                      </button>
                      <button onClick={() => { deleteChart(s.id); setSaved(listCharts()); }} className="text-[10px] text-red-500 underline">
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { clearPaipanState("astro"); setChart(null); }}
              className="flex-1 rounded-full py-2 text-sm font-semibold text-white active:scale-[0.98]"
              style={{ backgroundColor: BRAND }}
            >
              重新排盘
            </button>
          </div>
        </div>
      )}

      {/* 免责声明（后台可配置文案） */}
      <div className="mx-3 mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong>免责声明：</strong>{astroCfg.disclaimer}
        </p>
        <p className="mt-1 text-[10px] text-gray-400">天文计算：{astroCfg.dataVersion} · 隐私策略：出生数据默认私有，可随时彻底删除</p>
      </div>
      <div style={{ height: "20px" }} />
    </div>
  );
}
