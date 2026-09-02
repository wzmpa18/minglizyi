"use client";

// 专业电子罗盘工具页 - NICHE-TOOLS-08 v25.0.69
// ============================================================================
// 功能：实时方位测量（Rotation Vector/iOS磁力计/加速度计+磁力计降级链）、
//       磁北/真北切换（WMM2025 磁偏角修正）、磁场干扰监测、手动测向模式、
//       多门派 Profile 专业盘（三合12圈层/三元/玄空，LUOPAN_PROFILE_ENGINE）、
//       圈层开关（Ring Visibility）+ 全屏放大、逐圈层读数面板、
//       玄空Profile坐向一键跳转飞星排盘、客户记录保存、统一分享。
// 协议：物理量与判读口径由算法层输出；本页不生成吉凶断语，释义仅作方位描述。
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ClientSelector from "@/components/ClientSelector";
import { LuopanDial } from "@/components/LuopanDial";
import { ShareButton } from "@/components/ShareButton";
import { useCompassSensor } from "@/hooks/useCompassSensor";
import SharedBirthLocationSelector, { type RegionIndices, nearestRegion } from "@/components/shared/region-selector";
import { saveRecord } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { trackToolEvent } from "@/lib/toolAnalytics";
import {
  COMPASS_ENGINE_VERSION,
  SHAN_24,
  buildCompassReading,
  compassDeclination,
  decimalYear,
  magneticInterference,
  wmm2025Field,
  type NorthMode,
} from "@/algorithm-core/modules/compass";
import {
  LUOPAN_PROFILE_ENGINE_VERSION,
  SCHOOL_OPTIONS,
  getProfile,
  readProfile,
  type LuopanSchool,
} from "@/algorithm-core/modules/luopan-profile";

const BRAND = "#B8860B";

const SCHOOL_KEY = "yandao_compass_school";
const RINGS_KEY = "yandao_compass_rings_v1";

const SOURCE_LABEL: Record<string, string> = {
  absolute: "Rotation Vector 绝对方位",
  webkit: "iOS 磁力计",
  "accel-mag": "加速度计+磁力计",
  relative: "相对方位（需校准）",
  none: "未连接",
};

const LOC_KEY = "yandao_compass_loc";

interface SavedLoc {
  lat: number;
  lon: number;
  name: string;
  manual?: boolean;
}

export default function CompassPage() {
  const { state: sensor, start, stop } = useCompassSensor();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"sensor" | "manual">("sensor");
  const [northMode, setNorthMode] = useState<NorthMode>("magnetic");
  const [manualHeading, setManualHeading] = useState(0);
  const [lat, setLat] = useState(39.9042);
  const [lon, setLon] = useState(116.4074);
  const [locName, setLocName] = useState("北京");
  const [locManual, setLocManual] = useState(false);
  const [locating, setLocating] = useState(false);
  const [regionIdx, setRegionIdx] = useState<RegionIndices>(() => nearestRegion(116.4074));
  const [showRegionSel, setShowRegionSel] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [toast, setToast] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 专业盘：门派 Profile / 圈层可见性 / 全屏缩放
  const [school, setSchool] = useState<LuopanSchool>("sanhe");
  const [hiddenBySchool, setHiddenBySchool] = useState<Record<string, string[]>>({});
  const [showRingPanel, setShowRingPanel] = useState(false);
  const [showReadings, setShowReadings] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const [zoomSize, setZoomSize] = useState(600);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  // 恢复上次位置与北基准
  useEffect(() => {
    trackToolEvent("compass", "tool_open");
    setMounted(true);
    try {
      const raw = localStorage.getItem(LOC_KEY);
      if (raw) {
        const l = JSON.parse(raw) as SavedLoc;
        if (typeof l.lat === "number" && typeof l.lon === "number") {
          setLat(l.lat);
          setLon(l.lon);
          setLocName(l.name || "自定义");
          setLocManual(!!l.manual);
        }
      }
      const nm = localStorage.getItem("yandao_compass_north") as NorthMode | null;
      if (nm === "magnetic" || nm === "true") setNorthMode(nm);
      const sc = localStorage.getItem(SCHOOL_KEY) as LuopanSchool | null;
      if (sc === "sanhe" || sc === "sanyuan" || sc === "xuankong") setSchool(sc);
      const rg = localStorage.getItem(RINGS_KEY);
      if (rg) {
        const m = JSON.parse(rg) as Record<string, string[]>;
        if (m && typeof m === "object") setHiddenBySchool(m);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const s: SavedLoc = { lat, lon, name: locName, manual: locManual };
    try { localStorage.setItem(LOC_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }, [mounted, lat, lon, locName, locManual]);

  useEffect(() => {
    try { localStorage.setItem("yandao_compass_north", northMode); } catch { /* ignore */ }
  }, [northMode]);

  useEffect(() => {
    try { localStorage.setItem(SCHOOL_KEY, school); } catch { /* ignore */ }
  }, [school]);

  useEffect(() => {
    try { localStorage.setItem(RINGS_KEY, JSON.stringify(hiddenBySchool)); } catch { /* ignore */ }
  }, [hiddenBySchool]);

  // 传感器不可用 → 自动切手动
  useEffect(() => {
    if (sensor.error && sensor.error.includes("无可用方向传感器")) setMode("manual");
  }, [sensor.error]);

  // 传感器专项埋点（§89）：来源/精度分桶/北基准/手动模式
  const sensorSourceRef = useRef<string | null>(null);
  useEffect(() => {
    if (sensor.source !== "none" && sensorSourceRef.current !== sensor.source) {
      sensorSourceRef.current = sensor.source;
      trackToolEvent("compass", "sensor_available", { source: sensor.source });
    }
  }, [sensor.source]);

  const accBucketRef = useRef<string | null>(null);
  useEffect(() => {
    if (sensor.headingMagnetic == null) return;
    const st = sensor.stability;
    const bucket = st > 0.85 ? "high" : st > 0.6 ? "medium" : st > 0.3 ? "low" : "unreliable";
    if (bucket !== accBucketRef.current) {
      accBucketRef.current = bucket;
      trackToolEvent("compass", "sensor_accuracy", { level: bucket, stability: Math.round(st * 100) / 100 });
    }
  }, [sensor.headingMagnetic, sensor.stability]);

  const northTouched = useRef(false);
  useEffect(() => {
    if (northTouched.current) {
      if (northMode === "true") trackToolEvent("compass", "true_north_enabled");
    } else {
      northTouched.current = true;
    }
  }, [northMode]);

  useEffect(() => {
    if (mode === "manual") trackToolEvent("compass", "manual_mode");
  }, [mode]);

  // WMM2025 理论值（位置/日期驱动）
  const wmm = useMemo(
    () => wmm2025Field(lat, lon, 0, decimalYear(new Date())),
    [lat, lon],
  );
  const interference = useMemo(
    () => magneticInterference(sensor.fieldMicroT, wmm.f),
    [sensor.fieldMicroT, wmm.f],
  );

  // 航向：传感器模式取平滑磁北航向，手动模式取输入值
  const headingMagnetic = mode === "sensor" ? sensor.headingMagnetic : manualHeading;
  const reading = useMemo(
    () => (headingMagnetic == null ? null : buildCompassReading(headingMagnetic, wmm.declination, northMode)),
    [headingMagnetic, wmm.declination, northMode],
  );

  // 专业盘：Profile / 圈层可见性 / 各圈层读数
  const profile = useMemo(() => getProfile(school), [school]);
  const visibleRingIds = useMemo(() => {
    const hidden = new Set(hiddenBySchool[school] ?? []);
    return new Set(profile.rings.filter((r) => !hidden.has(r.id)).map((r) => r.id));
  }, [profile, hiddenBySchool, school]);

  const ringReadings = useMemo(() => {
    if (!reading) return [];
    return readProfile(school, reading.heading).filter((r) => visibleRingIds.has(r.ringId));
  }, [reading, school, visibleRingIds]);

  const visibleCount = visibleRingIds.size;
  const hiddenCount = profile.rings.length - visibleCount;

  const switchSchool = useCallback((s: LuopanSchool) => {
    setSchool(s);
    trackToolEvent("compass", "profile_switch", { school: s });
  }, []);

  const toggleRing = useCallback((ringId: string) => {
    setHiddenBySchool((prev) => {
      const hidden = new Set(prev[school] ?? []);
      if (hidden.has(ringId)) hidden.delete(ringId);
      else {
        // 至少保留一个圈层
        const curVisible = getProfile(school).rings.filter((r) => !hidden.has(r.id)).length;
        if (curVisible <= 1) return prev;
        hidden.add(ringId);
      }
      trackToolEvent("compass", "ring_toggle", { ringId, hidden: hidden.has(ringId) });
      return { ...prev, [school]: [...hidden] };
    });
  }, [school]);

  const resetRings = useCallback(() => {
    setHiddenBySchool((prev) => ({ ...prev, [school]: [] }));
    trackToolEvent("compass", "ring_toggle", { reset: true });
  }, [school]);

  const openZoom = useCallback(() => {
    if (typeof window !== "undefined") {
      setZoomSize(Math.max(320, Math.min(760, Math.min(window.innerWidth, window.innerHeight) - 48)));
    }
    setZoomed(true);
    trackToolEvent("compass", "dial_zoom", { school });
  }, [school]);

  // GPS 定位
  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      showToast("当前环境不支持定位，请手动选择位置");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = Math.round(pos.coords.latitude * 10000) / 10000;
        const lo = Math.round(pos.coords.longitude * 10000) / 10000;
        setLat(la);
        setLon(lo);
        setRegionIdx(nearestRegion(lo));
        setLocName("GPS定位");
        setLocManual(false);
        setLocating(false);
        showToast("定位成功，磁偏角已按 WMM2025 更新");
      },
      () => {
        setLocating(false);
        showToast("定位失败（未授权或信号弱），可展开选择测量地");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [showToast]);

  // 保存客户记录
  const saveToClient = useCallback(() => {
    if (!selectedClient) { showToast("请先选择客户"); return; }
    if (!reading) { showToast("暂无有效读数，无法保存"); return; }
    try {
      saveRecord({
        clientId: selectedClient.id,
        type: "compass",
        data: {
          location: { name: locName, lat, lon },
          northMode,
          declination: reading.declination,
          heading: reading.heading,
          magneticHeading: reading.magneticHeading,
          trueHeading: reading.trueHeading,
          facing: reading.facing.shan,
          facingDetail: reading.facing,
          jian: reading.facing.isJian ? reading.facing.jianText : "",
          sitting: reading.sittingShan,
          zuoXiang: reading.zuoXiang,
          bagua: reading.bagua.name,
          school,
          ringReadings: ringReadings.map((r) => ({ ring: r.ringName, label: r.label, note: r.note ?? "" })),
          field: {
            measuredMicroT: sensor.fieldMicroT,
            expectedNanoT: Math.round(wmm.f),
            level: interference.level,
          },
          measuredAt: new Date().toISOString(),
          engine: `${COMPASS_ENGINE_VERSION} / ${LUOPAN_PROFILE_ENGINE_VERSION}`,
        },
        note: "",
        status: "pending",
      });
      setSavedCount((c) => c + 1);
      trackToolEvent("compass", "tool_save");
      showToast("测量记录已保存到客户档案");
    } catch {
      showToast("保存失败，请重试");
    }
  }, [selectedClient, reading, locName, lat, lon, northMode, school, ringReadings, sensor.fieldMicroT, wmm.f, interference.level, showToast]);

  const declText = wmm.declination >= 0
    ? `${Math.abs(wmm.declination).toFixed(2)}° 东偏`
    : `${Math.abs(wmm.declination).toFixed(2)}° 西偏`;

  const interColor =
    interference.level === "ok" ? "#3fbf5a" :
    interference.level === "warn" ? "#f0a020" :
    interference.level === "bad" ? "#e53935" : "#9e9e9e";

  const sourceChip = SOURCE_LABEL[sensor.source] || "未连接";

  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "420px", minHeight: "100vh" }}>
      {/* 引擎徽标 */}
      <div className="flex items-center justify-between bg-white px-3 py-2">
        <div className="text-xs text-gray-500">
          圈层引擎：<span className="font-semibold" style={{ color: BRAND }}>{LUOPAN_PROFILE_ENGINE_VERSION.split("（")[0]}</span>
          <span className="ml-1 text-gray-400">· 磁偏角 WMM2025</span>
        </div>
        <div className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium" style={{ color: BRAND }}>
          {mounted ? new Date().getFullYear() : 2026} 年有效
        </div>
      </div>

      {/* 罗盘盘面 */}
      <div className="bg-white px-3 pt-4 pb-3">
        <LuopanDial
          profile={profile}
          heading={reading ? reading.heading : null}
          visibleRingIds={visibleRingIds}
          northMode={northMode}
          interference={interference.level}
          size={344}
        />

        {/* 盘面操作条：门派名 + 全屏缩放 */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            {profile.name} · {visibleCount}/{profile.rings.length} 圈层{hiddenCount > 0 ? `（已隐藏 ${hiddenCount}）` : ""}
          </span>
          <button
            onClick={openZoom}
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold active:scale-95"
            style={{ color: BRAND }}
          >
            放大盘面
          </button>
        </div>

        {/* 实时读数条 */}
        <div className="mt-3 rounded-xl bg-[#221c14] px-4 py-3 text-center">
          <div className="flex items-end justify-center gap-2">
            <span className="text-3xl font-bold tabular-nums" style={{ color: "#ff5252" }}>
              {reading ? reading.heading.toFixed(1) : "--.-"}
            </span>
            <span className="pb-1 text-sm text-[#e8c96a]">度</span>
          </div>
          <div className="mt-1 text-sm font-semibold text-[#e8c96a]">
            {reading
              ? `${reading.zuoXiang}${reading.facing.isJian ? "" : ""}`
              : mode === "sensor" ? "点击下方按钮开始测量" : "拖动滑杆或选择山向"}
          </div>
          {reading && (
            <div className="mt-1 text-[11px] text-[#bfa76a]">
              {northMode === "true" ? `磁北 ${reading.magneticHeading.toFixed(1)}° + 磁偏角 ${declText}` : `真北 ${reading.trueHeading.toFixed(1)}°（未采用）`}
            </div>
          )}
        </div>

        {/* 传感器控制 */}
        <div className="mt-3 flex items-center gap-2">
          {mode === "sensor" ? (
            sensor.active ? (
              <button
                onClick={() => { stop(); }}
                className="flex-1 rounded-full border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 active:scale-[0.98]"
              >
                停止测量
              </button>
            ) : (
              <button
                onClick={() => { start(); }}
                className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white active:scale-[0.98]"
                style={{ backgroundColor: BRAND }}
              >
                开始测量
              </button>
            )
          ) : null}
          <button
            onClick={() => setMode(mode === "sensor" ? "manual" : "sensor")}
            className="flex-1 rounded-full border border-gray-200 bg-gray-50 py-2.5 text-sm font-semibold text-gray-600 active:scale-[0.98]"
          >
            {mode === "sensor" ? "切手动输入" : "切实时测量"}
          </button>
        </div>

        {/* 传感器状态 */}
        {mode === "sensor" && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">来源：{sourceChip}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
              稳定度：{sensor.stability > 0 ? (sensor.stability * 100).toFixed(0) + "%" : "--"}
            </span>
            {sensor.fieldMicroT != null && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                实测场强：{sensor.fieldMicroT.toFixed(1)}μT
              </span>
            )}
          </div>
        )}

        {/* 持机姿态与校准提示 */}
        {mode === "sensor" && sensor.active && (
          <div className="mt-2">
            {!sensor.screenUp && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                请将手机平放（屏幕朝上）测量，顶边对准被测方向
              </p>
            )}
            {sensor.screenUp && sensor.landscape && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                当前横持手机，建议竖屏平持：顶边（听筒一侧）对准目标
              </p>
            )}
            {sensor.needsCalibration && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                磁力计未校准：请将手机在空中缓慢画"8"字数次后重新测量
              </p>
            )}
            {sensor.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600">{sensor.error}</p>
            )}
          </div>
        )}
      </div>

      {/* 门派 Profile 选择 */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="mb-2 text-xs text-gray-500">罗盘门派（圈层体系 Profile）</div>
        <div className="flex rounded-full border border-gray-200 p-0.5">
          {SCHOOL_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => switchSchool(o.id)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                school === o.id ? "text-white" : "text-gray-500"
              }`}
              style={school === o.id ? { backgroundColor: BRAND } : {}}
            >
              {o.name}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">
          {SCHOOL_OPTIONS.find((o) => o.id === school)?.desc}。六十四卦圈等未经权威考证的圈层按「仅收录已验证圈层」原则暂不纳入。
        </p>
      </div>

      {/* 圈层开关（Ring Visibility） */}
      <div className="mt-2 bg-white px-3 py-3">
        <button
          onClick={() => setShowRingPanel((v) => !v)}
          className="flex w-full items-center justify-between"
        >
          <span className="text-xs text-gray-500">
            圈层开关（{visibleCount}/{profile.rings.length} 显示中）
          </span>
          <span className="text-xs text-gray-400">{showRingPanel ? "收起 ▲" : "展开 ▼"}</span>
        </button>
        {showRingPanel && (
          <div className="mt-2">
            <div className="grid grid-cols-2 gap-1.5">
              {profile.rings.map((r) => {
                const on = visibleRingIds.has(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleRing(r.id)}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-left text-[11px] transition-all active:scale-[0.98] ${
                      on ? "border-amber-200 bg-amber-50/70 text-gray-700" : "border-gray-200 bg-gray-50 text-gray-400"
                    }`}
                  >
                    <span className="truncate">{r.name}</span>
                    <span
                      className="ml-1 inline-block h-3.5 w-3.5 shrink-0 rounded-full border"
                      style={{
                        backgroundColor: on ? BRAND : "#e5e5e5",
                        borderColor: on ? BRAND : "#d0d0d0",
                      }}
                    />
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={resetRings}
                className="flex-1 rounded-full border border-gray-200 bg-gray-50 py-1.5 text-[11px] font-medium text-gray-600 active:scale-95"
              >
                全部显示
              </button>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">
              隐藏不用的圈层后，剩余圈层自动放宽环带、字号随之放大；每个圈层的排布依据（SOURCE/RULE/TEST）可在读数面板逐圈查看。
            </p>
          </div>
        )}
      </div>

      {/* 北基准切换 */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="mb-2 text-xs text-gray-500">北基准（坐向判读口径）</div>
        <div className="flex rounded-full border border-gray-200 p-0.5">
          {(["magnetic", "true"] as NorthMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setNorthMode(m)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                northMode === m ? "text-white" : "text-gray-500"
              }`}
              style={northMode === m ? { backgroundColor: BRAND } : {}}
            >
              {m === "magnetic" ? "磁北（罗盘针）" : "真北（地理北）"}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">
          磁北＝磁针所指（传统罗盘口径）；真北＝地理北（叠加 WMM2025 磁偏角 {declText}）。玄空/三合传统判读多用磁北。
        </p>
      </div>

      {/* 位置与磁偏角 */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">测量位置（磁偏角解算）</span>
          <button
            onClick={locate}
            disabled={locating}
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium active:scale-95"
            style={{ color: BRAND }}
          >
            {locating ? "定位中…" : "GPS 定位"}
          </button>
        </div>
        <button
          onClick={() => setShowRegionSel((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-xs active:bg-gray-50"
        >
          <span className="text-gray-600">{locManual ? "自定义坐标（见下方输入框）" : `当前：${locName}（省/市/区县选择）`}</span>
          <span className="text-gray-400">{showRegionSel ? "收起 ▲" : "展开选择 ▼"}</span>
        </button>
        {showRegionSel && (
          <div className="mt-2 rounded-lg bg-gray-50 p-2">
            <SharedBirthLocationSelector
              lng={lon}
              indices={regionIdx}
              onIndicesChange={setRegionIdx}
              onSelectionChange={(sel) => {
                if (sel.lat != null) setLat(sel.lat);
                setLon(sel.lng);
                setLocName(`${sel.province.replace(/省|市|自治区|壮族自治区|回族自治区|维吾尔自治区|特别行政区/g, "")}·${sel.district || sel.city}`);
                setLocManual(false);
              }}
              label="测量地"
              showManualLng={false}
            />
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number" step="0.0001" min={-90} max={90}
            value={lat}
            onChange={(e) => { setLat(parseFloat(e.target.value) || 0); setLocName("自定义"); setLocManual(true); }}
            className="w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-xs outline-none focus:border-[#B8860B]"
            placeholder="纬度"
          />
          <span className="text-[10px] text-gray-400">°N</span>
          <input
            type="number" step="0.0001" min={-180} max={180}
            value={lon}
            onChange={(e) => { setLon(parseFloat(e.target.value) || 0); setLocName("自定义"); setLocManual(true); }}
            className="w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-xs outline-none focus:border-[#B8860B]"
            placeholder="经度"
          />
          <span className="text-[10px] text-gray-400">°E</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-amber-50/60 p-2">
            <div className="text-[10px] text-gray-500">磁偏角</div>
            <div className="mt-0.5 text-sm font-bold" style={{ color: BRAND }}>{declText}</div>
          </div>
          <div className="rounded-lg bg-amber-50/60 p-2">
            <div className="text-[10px] text-gray-500">理论场强</div>
            <div className="mt-0.5 text-sm font-bold text-gray-700">{(wmm.f / 1000).toFixed(1)}μT</div>
          </div>
          <div className="rounded-lg bg-amber-50/60 p-2">
            <div className="text-[10px] text-gray-500">磁倾角</div>
            <div className="mt-0.5 text-sm font-bold text-gray-700">{wmm.inclination.toFixed(1)}°</div>
          </div>
        </div>
        {/* 磁场干扰状态 */}
        <div className="mt-2 flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: interColor }} />
            <span className="text-xs text-gray-600">{interference.message}</span>
          </div>
          {sensor.fieldMicroT != null && (
            <span className="text-[10px] text-gray-400">
              实测/理论 {(interference.ratio * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* 手动测向 */}
      {mode === "manual" && (
        <div className="mt-2 bg-white px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">手动输入方位角（{northMode === "true" ? "真北" : "磁北"}口径）</span>
            <span className="text-xs font-bold tabular-nums" style={{ color: BRAND }}>
              {manualHeading.toFixed(1)}°
            </span>
          </div>
          <input
            type="range" min={0} max={359.9} step={0.1}
            value={manualHeading}
            onChange={(e) => setManualHeading(parseFloat(e.target.value))}
            className="w-full accent-[#B8860B]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-gray-400">
            <span>0°北</span><span>90°东</span><span>180°南</span><span>270°西</span><span>360°北</span>
          </div>
          <div className="mt-3 grid grid-cols-8 gap-1">
            {SHAN_24.map((s) => {
              const active = reading && reading.facing.shan === s.name;
              return (
                <button
                  key={s.name}
                  onClick={() => setManualHeading(s.center)}
                  className={`rounded py-1.5 text-xs font-medium transition-all ${
                    active ? "text-white" : "bg-gray-100 text-gray-600 active:bg-gray-200"
                  }`}
                  style={active ? { backgroundColor: BRAND } : {}}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400">
            无传感器环境（桌面端）或复核既有读数时使用；点击山名快跳该山正中
          </p>
        </div>
      )}

      {/* 判读结果 */}
      {reading && (
        <div className="mt-2 bg-white px-3 py-3">
          <div className="mb-2 text-sm font-bold" style={{ color: BRAND }}>坐向判读（二十四山）</div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-center">
            <div className="text-lg font-bold text-gray-800">{reading.zuoXiang}</div>
            {reading.facing.isJian && (
              <div className="mt-1 inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-medium text-red-600">
                骑缝兼向（山界±3°）
              </div>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div><span className="text-gray-500">向山：</span><span className="font-semibold">{reading.facing.shan}（{reading.facing.direction}）</span></div>
            <div><span className="text-gray-500">坐山：</span><span className="font-semibold">{reading.sittingShan}（{reading.facing.gua}卦宫）</span></div>
            <div><span className="text-gray-500">八卦：</span><span className="font-semibold">{reading.bagua.name}（{reading.bagua.direction}）</span></div>
            <div><span className="text-gray-500">山内偏移：</span><span className="font-semibold">{reading.facing.offsetInShan > 0 ? "+" : ""}{reading.facing.offsetInShan}°</span></div>
            <div><span className="text-gray-500">五行：</span><span className="font-semibold">{reading.facing.wuxing}</span></div>
            <div><span className="text-gray-500">阴阳：</span><span className="font-semibold">{reading.facing.yinYang}</span></div>
          </div>
          <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-[10px] leading-relaxed text-gray-500">
            判读口径：二十四山子山正北 0°、每山 15°；正中 9° 为正向，山界两侧各 3° 为骑缝兼向（与玄空飞星模块同源）。兼向仅作方位描述，具体立向规则请咨询专业堪舆师。
          </div>
        </div>
      )}

      {/* 逐圈层读数面板 */}
      {ringReadings.length > 0 && (
        <div className="mt-2 bg-white px-3 py-3">
          <button
            onClick={() => setShowReadings((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <span className="text-sm font-bold" style={{ color: BRAND }}>
              逐圈层读数（{profile.name.split("（")[0]}）
            </span>
            <span className="text-xs text-gray-400">{showReadings ? "收起 ▲" : "展开 ▼"}</span>
          </button>
          {showReadings && (
            <div className="mt-2 divide-y divide-gray-100">
              {ringReadings.map((r) => (
                <div key={r.ringId} className="flex items-start justify-between gap-2 py-1.5">
                  <span className="shrink-0 text-[11px] text-gray-500">{r.ringName}</span>
                  <span className="text-right">
                    <span className="text-xs font-bold text-gray-800">{r.label}</span>
                    {r.note && <span className="ml-1 text-[10px] text-gray-400">{r.note}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
          {school === "xuankong" && reading && (
            <a
              href={`/yixue/xuankong-feixing?shan=${encodeURIComponent(reading.sittingShan)}`}
              className="mt-2 block w-full rounded-full border border-amber-200 bg-amber-50 py-2.5 text-center text-sm font-semibold active:scale-[0.98]"
              style={{ color: BRAND }}
            >
              用此坐向（{reading.sittingShan}山）排玄空飞星盘
            </a>
          )}
          <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">
            读数位＝盘面顶点（天心十道所指）；分金「旺相/空亡」等仅为通行分类名称，非玄学断语。
          </p>
        </div>
      )}

      {/* 客户记录 */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="mb-2 text-xs text-gray-500">客户测量记录（可选）</div>
        <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
        <button
          onClick={saveToClient}
          disabled={!selectedClient || !reading}
          className="mt-2 w-full rounded-full border border-amber-200 py-2.5 text-sm font-semibold active:scale-[0.98] disabled:opacity-40"
          style={{ color: BRAND, backgroundColor: "#fdf6e3" }}
        >
          保存本次测量{savedCount > 0 ? `（已存 ${savedCount} 条）` : ""}
        </button>
      </div>

      {/* 分享 */}
      {reading && (
        <div className="px-3 py-2">
          <ShareButton
            type="tool"
            title="罗盘测量结果"
            description="专业电子罗盘"
            variant="block"
            label="分享测量结果"
            onShared={() => trackToolEvent("compass", "tool_share")}
            shareData={{
              toolType: "compass",
              title: `罗盘测向：${reading.zuoXiang} · ${reading.heading.toFixed(1)}°`,
              summary: `${northMode === "true" ? "真北" : "磁北"} ${reading.heading.toFixed(1)}° · ${reading.zuoXiang}${reading.facing.isJian ? "（兼向）" : ""} · ${locName}`,
              payload: {
                summaryLines: [
                  `门派：${SCHOOL_OPTIONS.find((o) => o.id === school)?.name ?? school}`,
                  `北基准：${northMode === "true" ? "真北" : "磁北"}`,
                  `航向：${reading.heading.toFixed(1)}°（磁北 ${reading.magneticHeading.toFixed(1)}° / 真北 ${reading.trueHeading.toFixed(1)}°）`,
                  `坐向：${reading.zuoXiang}`,
                  `向山：${reading.facing.shan}（${reading.facing.direction}，${reading.facing.gua}卦）`,
                  reading.facing.isJian ? `兼向：${reading.facing.jianText}（山界骑缝）` : "立向：正向",
                  ...ringReadings
                    .filter((r) => ["dipan24", "dipan-fenjin120", "chuanshan72", "toudi60", "xuankong-yinyang", "xiu28"].includes(r.ringId))
                    .map((r) => `${r.ringName}：${r.label}${r.note ? `（${r.note}）` : ""}`),
                  `位置：${locName}（${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E）`,
                  `磁偏角：${declText}（WMM2025）`,
                  `磁场状态：${interference.message}`,
                  `引擎：${COMPASS_ENGINE_VERSION} / ${LUOPAN_PROFILE_ENGINE_VERSION}`,
                ],
              },
            }}
          />
        </div>
      )}

      {/* 免责声明 */}
      <div className="mx-3 mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong>免责声明：</strong>本页面内容仅供传统文化学习与参考，不构成任何决策建议。电子罗盘精度受设备传感器质量、校准状态与周边铁磁环境影响，重要堪舆测量建议以专业罗盘复合校验。坐向释义为通行方位口径，不作玄学论断。
        </p>
        <p className="mt-1 text-xs text-gray-400">
          算法依据：NOAA/NCEI《World Magnetic Model 2025 Technical Report》（公共领域）；二十四山通行口径
        </p>
      </div>
      <div style={{ height: "20px" }} />

      {/* 全屏放大盘面（圈层缩放） */}
      {zoomed && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 px-2 py-3">
          <div className="text-xs text-[#e8c96a]">
            {profile.name} · {reading ? reading.heading.toFixed(1) : "--.-"}° {reading ? reading.zuoXiang : ""}
          </div>
          <div className="mt-2 overflow-auto">
            <LuopanDial
              profile={profile}
              heading={reading ? reading.heading : null}
              visibleRingIds={visibleRingIds}
              northMode={northMode}
              interference={interference.level}
              size={zoomSize}
            />
          </div>
          <div className="mt-3 flex w-full max-w-[420px] items-center gap-2 px-3">
            <button
              onClick={() => setZoomed(false)}
              className="flex-1 rounded-full border border-amber-300/60 bg-amber-50/10 py-2.5 text-sm font-semibold text-[#e8c96a] active:scale-[0.98]"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
