"use client";

// 专业电子罗盘工具页 - NICHE-TOOLS-08 v25.0.68
// ============================================================================
// 功能：实时方位测量（Rotation Vector/iOS磁力计/加速度计+磁力计降级链）、
//       磁北/真北切换（WMM2025 磁偏角修正）、磁场干扰监测、手动测向模式、
//       二十四山/八卦/坐向/兼向判读、客户记录保存、统一分享。
// 协议：物理量与判读口径由算法层输出；本页不生成吉凶断语，释义仅作方位描述。
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ClientSelector from "@/components/ClientSelector";
import { CompassDial } from "@/components/CompassDial";
import { ShareButton } from "@/components/ShareButton";
import { useCompassSensor } from "@/hooks/useCompassSensor";
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

const BRAND = "#B8860B";

// 常用城市预设（经纬度为市政中心近似值）
const CITY_PRESETS: Array<{ name: string; lat: number; lon: number }> = [
  { name: "北京", lat: 39.9042, lon: 116.4074 },
  { name: "上海", lat: 31.2304, lon: 121.4737 },
  { name: "广州", lat: 23.1291, lon: 113.2644 },
  { name: "深圳", lat: 22.5431, lon: 114.0579 },
  { name: "成都", lat: 30.5728, lon: 104.0668 },
  { name: "杭州", lat: 30.2741, lon: 120.1551 },
  { name: "武汉", lat: 30.5928, lon: 114.3055 },
  { name: "西安", lat: 34.3416, lon: 108.9398 },
  { name: "哈尔滨", lat: 45.8038, lon: 126.5350 },
  { name: "乌鲁木齐", lat: 43.8256, lon: 87.6168 },
  { name: "香港", lat: 22.3193, lon: 114.1694 },
  { name: "台北", lat: 25.0330, lon: 121.5654 },
];

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
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [toast, setToast] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  // GPS 定位
  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      showToast("当前环境不支持定位，请手动选择位置");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Math.round(pos.coords.latitude * 10000) / 10000);
        setLon(Math.round(pos.coords.longitude * 10000) / 10000);
        setLocName("GPS定位");
        setLocManual(false);
        setLocating(false);
        showToast("定位成功，磁偏角已按 WMM2025 更新");
      },
      () => {
        setLocating(false);
        showToast("定位失败（未授权或信号弱），可手动选择城市");
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
          field: {
            measuredMicroT: sensor.fieldMicroT,
            expectedNanoT: Math.round(wmm.f),
            level: interference.level,
          },
          measuredAt: new Date().toISOString(),
          engine: COMPASS_ENGINE_VERSION,
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
  }, [selectedClient, reading, locName, lat, lon, northMode, sensor.fieldMicroT, wmm.f, interference.level, showToast]);

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
          磁偏角层：<span className="font-semibold" style={{ color: BRAND }}>WMM2025（NOAA 公共领域）</span>
        </div>
        <div className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium" style={{ color: BRAND }}>
          {mounted ? new Date().getFullYear() : 2026} 年有效
        </div>
      </div>

      {/* 罗盘盘面 */}
      <div className="bg-white px-3 pt-4 pb-3">
        <CompassDial
          heading={reading ? reading.heading : null}
          shanReading={reading ? reading.facing : null}
          northMode={northMode}
          interference={interference.level}
          size={344}
        />

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
        <div className="grid grid-cols-6 gap-1">
          {CITY_PRESETS.map((c) => {
            const active = !locManual && c.name === locName;
            return (
              <button
                key={c.name}
                onClick={() => {
                  setLat(c.lat); setLon(c.lon); setLocName(c.name); setLocManual(false);
                }}
                className={`rounded py-1.5 text-xs font-medium transition-all ${
                  active ? "text-white" : "bg-gray-100 text-gray-600 active:bg-gray-200"
                }`}
                style={active ? { backgroundColor: BRAND } : {}}
              >
                {c.name}
              </button>
            );
          })}
        </div>
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
                  `北基准：${northMode === "true" ? "真北" : "磁北"}`,
                  `航向：${reading.heading.toFixed(1)}°（磁北 ${reading.magneticHeading.toFixed(1)}° / 真北 ${reading.trueHeading.toFixed(1)}°）`,
                  `坐向：${reading.zuoXiang}`,
                  `向山：${reading.facing.shan}（${reading.facing.direction}，${reading.facing.gua}卦）`,
                  reading.facing.isJian ? `兼向：${reading.facing.jianText}（山界骑缝）` : "立向：正向",
                  `位置：${locName}（${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E）`,
                  `磁偏角：${declText}（WMM2025）`,
                  `磁场状态：${interference.message}`,
                  `引擎：${COMPASS_ENGINE_VERSION}`,
                ],
              },
            }}
          />
        </div>
      )}

      {/* 免责声明 */}
      <div className="mx-3 mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong>免责声明：</strong>本页面内容仅供传统文化学习与参考，不构成任何决策建议。电子罗盘精度受设备传感器质量、校准状态与周边铁磁环境影响，重要堪舆测量建议以专业罗盘复合校验。坐向释义为通行方位口径，不构成吉凶断语。
        </p>
        <p className="mt-1 text-xs text-gray-400">
          算法依据：NOAA/NCEI《World Magnetic Model 2025 Technical Report》（公共领域）；二十四山通行口径
        </p>
      </div>
      <div style={{ height: "20px" }} />

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
