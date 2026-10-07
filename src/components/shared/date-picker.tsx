"use client";

import { useState, useCallback, useEffect } from "react";
import { Lunar } from "lunar-javascript";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";
import { REGIONS } from "@/data/regions";
import { chinaDstInfo } from "@/algorithm-core/common/dst";
import { clearPendingPaipanRecordMeta, listPaipanRecords, setPendingPaipanRecordContext, setPendingPaipanRecordMeta, type MingzhuProfile, type PaipanRecord } from "@/lib/nativePaipanStore";
import { profileFromRecord, TOOL_NAMES } from "@/lib/paipanProfiles";

// ============================================================================
// 类型定义
// ============================================================================

export interface DatePickerValue {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface DatePickerOptions {
  gender: "male" | "female";
  calType: "solar" | "lunar" | "sizhu";
  zaoWanZi: boolean;
  zhenTaiyang: boolean;
  xiaLing: boolean;
  /** 出生地经度（东经度数，zhenTaiyang 时用于真太阳时校正，缺省北京 116.4） */
  longitude?: number;
  /** 省市区名称，用于排盘基本信息和历史记录恢复。 */
  birthPlace?: string;
  /** 出生地纬度；与经度、行政区快照一起恢复，避免换设备后地点漂移。 */
  latitude?: number;
  birthLocation?: BirthLocationSnapshot;
  /** 旧记录没有地点时保持明确缺失，不默填北京或设备当前位置。 */
  locationMissing?: boolean;
}

export interface BirthLocationSnapshot {
  province: string;
  city: string;
  district: string;
  displayName: string;
  provinceIndex: number;
  cityIndex: number;
  districtIndex: number;
  longitude: number | null;
  latitude: number | null;
  coordinateSource: "regions-gcj02" | "manual-longitude";
  /** 当前地区表内的稳定索引键；不伪装成不存在的官方行政区代码。 */
  regionKey: string;
}

export interface DatePickerProps {
  show: boolean;
  onClose: (reason?: "back" | "submit") => void;
  onSubmit: (date: DatePickerValue, options: DatePickerOptions) => void;
  initialDate?: DatePickerValue;
  initialOptions?: DatePickerOptions;
  showMinute?: boolean;
  showOptions?: boolean;
  showGender?: boolean;
  showCalType?: boolean;
  showToggles?: boolean;
  /** 独立夏令时开关（v25.0.82 P0-3）：引擎内置真太阳时的工具（如七政四余）
   *  不显示"真太阳时"开关（避免误解为可关闭），仅显示夏令时开关 */
  showXiaLing?: boolean;
  showRegion?: boolean;
  showName?: boolean;
  name?: string;
  onNameChange?: (v: string) => void;
  showSaveName?: boolean;
  saveName?: boolean;
  onSaveNameChange?: (v: boolean) => void;
  /** 工具专属扩展参数区（渲染在日期选择与提交按钮之间，如奇门遁甲排盘参数） */
  extraOptions?: React.ReactNode;
  submitText?: string;
  title?: string;
  onRecordImport?: (profile: MingzhuProfile) => void;
  /** Same-tool records can restore their complete result and view state. */
  onRecordRestore?: (record: PaipanRecord) => void;
}

// ============================================================================
// 默认值 - 使用工厂函数避免模块级 new Date() 导致 hydration mismatch
// ============================================================================

function createDefaultDate(): DatePickerValue {
  const n = new Date();
  return {
    year: n.getFullYear(),
    month: n.getMonth() + 1,
    day: n.getDate(),
    hour: n.getHours(),
    minute: 0,
  };
}

const DEFAULT_OPTIONS: DatePickerOptions = {
  gender: "male",
  calType: "solar",
  zaoWanZi: false,
  zhenTaiyang: false,
  xiaLing: false,
  longitude: 116.4,
};

/** 按经度反查最近区县的三级索引（用于初始化选中项） */
function nearestRegion(lng: number): { p: number; c: number; d: number } {
  let best = { p: 0, c: 0, d: 0 };
  let bestDiff = Infinity;
  for (let pi = 0; pi < REGIONS.length; pi++) {
    const cities = REGIONS[pi].cities;
    for (let ci = 0; ci < cities.length; ci++) {
      const districts = cities[ci].districts;
      for (let di = 0; di < districts.length; di++) {
        const v = districts[di].lng;
        if (v == null) continue;
        const diff = Math.abs(v - lng);
        if (diff < bestDiff) { bestDiff = diff; best = { p: pi, c: ci, d: di }; }
      }
    }
  }
  return best;
}

function regionSnapshotAt(region: { p: number; c: number; d: number }, longitude?: number): BirthLocationSnapshot {
  const province = REGIONS[region.p] ?? REGIONS[0];
  const city = province?.cities?.[region.c] ?? province?.cities?.[0];
  const district = city?.districts?.[region.d] ?? city?.districts?.[0];
  const storedLongitude = Number.isFinite(longitude) ? Number(longitude) : (district?.lng ?? city?.lng ?? province?.lng ?? null);
  const baseLongitude = district?.lng ?? city?.lng ?? province?.lng ?? null;
  return {
    province: province?.name || "",
    city: city?.name || "",
    district: district?.name || "",
    displayName: [province?.name, city?.name, district?.name].filter(Boolean).join(" "),
    provinceIndex: region.p,
    cityIndex: region.c,
    districtIndex: region.d,
    longitude: storedLongitude,
    latitude: district?.lat ?? city?.lat ?? province?.lat ?? null,
    coordinateSource: baseLongitude !== null && storedLongitude !== baseLongitude ? "manual-longitude" : "regions-gcj02",
    regionKey: `${region.p}:${region.c}:${region.d}`,
  };
}

function regionFromSnapshot(snapshot: unknown, birthPlace?: string, longitude?: number): { p: number; c: number; d: number } | null {
  if (snapshot && typeof snapshot === "object") {
    const value = snapshot as Partial<BirthLocationSnapshot>;
    if (Number.isInteger(value.provinceIndex) && Number.isInteger(value.cityIndex) && Number.isInteger(value.districtIndex)) {
      const candidate = { p: Number(value.provinceIndex), c: Number(value.cityIndex), d: Number(value.districtIndex) };
      const actual = regionSnapshotAt(candidate, longitude);
      if ((!value.province || value.province === actual.province) && (!value.city || value.city === actual.city) && (!value.district || value.district === actual.district)) return candidate;
    }
    for (let p = 0; p < REGIONS.length; p++) for (let c = 0; c < REGIONS[p].cities.length; c++) for (let d = 0; d < REGIONS[p].cities[c].districts.length; d++) {
      const item = REGIONS[p].cities[c].districts[d];
      if (value.province === REGIONS[p].name && value.city === REGIONS[p].cities[c].name && value.district === item.name) return { p, c, d };
    }
  }
  if (birthPlace) {
    for (let p = 0; p < REGIONS.length; p++) for (let c = 0; c < REGIONS[p].cities.length; c++) for (let d = 0; d < REGIONS[p].cities[c].districts.length; d++) {
      const displayName = [REGIONS[p].name, REGIONS[p].cities[c].name, REGIONS[p].cities[c].districts[d].name].filter(Boolean).join(" ");
      if (displayName === birthPlace) return { p, c, d };
    }
  }
  return Number.isFinite(longitude) ? nearestRegion(Number(longitude)) : null;
}

// ============================================================================
// 工具函数
// ============================================================================

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeap ? 29 : 28;
  }
  const days31 = [1, 3, 5, 7, 8, 10, 12];
  return days31.includes(month) ? 31 : 30;
}

// ============================================================================
// v18.1: 农历→公历转换工具函数
// ============================================================================

/**
 * 将农历日期转换为公历日期
 * 使用 历法引擎 库进行精确转换
 * 转换失败时返回原始日期（降级处理）
 */
function lunarToSolarDate(date: DatePickerValue): DatePickerValue {
  try {
    const lunar = (Lunar as any).fromYmd(date.year, date.month, date.day);
    const solar = lunar.getSolar();
    return {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay(),
      hour: date.hour,
      minute: date.minute,
    };
  } catch (e) {
    console.error('农历→公历转换失败:', e);
    return date;
  }
}

// ============================================================================
// 主组件 - 完全对标吉时雨 component_basic_data.html
// ============================================================================

export default function DatePicker({
  show,
  onClose,
  onSubmit,
  initialDate,
  initialOptions,
  showMinute = false,
  showOptions = true,
  showGender = true,
  showCalType = true,
  showToggles = true,
  showXiaLing = false,
  showRegion = false,
  showName = false,
  name = "",
  onNameChange,
  showSaveName = false,
  saveName = false,
  onSaveNameChange,
  extraOptions = null,
  submitText = "排盘",
  title = "选择日期",
  onRecordImport,
  onRecordRestore,
}: DatePickerProps) {
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [records, setRecords] = useState<PaipanRecord[]>([]);
  const [recordQuery, setRecordQuery] = useState("");
  const [recordMessage, setRecordMessage] = useState("");
  const [recordNote, setRecordNote] = useState("");
  const currentRecordTool = () => {
    const routeTool = typeof window === "undefined" ? "" : window.location.pathname.split("/").filter(Boolean).pop() || "";
    return ({ "taiyi-sanshi": "taiyi", "xuankong-feixing": "xuankong" } as Record<string, string>)[routeTool] || routeTool;
  };
  useEffect(() => { if (!show) clearPendingPaipanRecordMeta(currentRecordTool()); }, [show]);
  useEffect(() => { if (!show) setRecordsOpen(false); }, [show]);
  const openRecords = async () => {
    setRecordsOpen(true); setRecordMessage("加载中…");
    try { setRecords(await listPaipanRecords()); setRecordMessage(""); }
    catch { setRecordMessage("记录读取失败，请关闭后重试"); }
  };
  const [date, setDate] = useState<DatePickerValue>(initialDate || createDefaultDate());
  const [options, setOptions] = useState<DatePickerOptions>({ ...DEFAULT_OPTIONS, ...(initialOptions || {}) });
  const [nameState, setNameState] = useState(name);
  // 三级联动选中索引（省/市/县）。旧记录缺少地点时只显示待补充提示，不猜成北京。
  const [region, setRegion] = useState<{ p: number; c: number; d: number }>(() =>
    regionFromSnapshot(initialOptions?.birthLocation, initialOptions?.birthPlace, initialOptions?.longitude) ?? { p: 0, c: 0, d: 0 }
  );

  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    if (!initialOptions) return;
    setOptions({ ...DEFAULT_OPTIONS, ...initialOptions });
    const restoredRegion = regionFromSnapshot(initialOptions.birthLocation, initialOptions.birthPlace, initialOptions.longitude);
    if (restoredRegion) setRegion(restoredRegion);
  }, [initialOptions]);

  useEffect(() => {
    setNameState(name);
  }, [name]);

  // 每次打开面板只按明确保存的地点同步。旧记录缺地点时不得用默认经度伪装成北京。
  useEffect(() => {
    if (!show || options.locationMissing) return;
    const restoredRegion = regionFromSnapshot(options.birthLocation, options.birthPlace, options.longitude);
    if (restoredRegion) setRegion(restoredRegion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  // ============================================================
  // 日期修改 - 使用原生select的onChange直接更新
  // ============================================================

  const updateDate = useCallback((field: keyof DatePickerValue, value: number) => {
    setDate(prev => {
      const next = { ...prev, [field]: value };
      // 如果改了年份或月份，需要校正日期
      if (field === "year" || field === "month") {
        const maxDay = daysInMonth(next.year, next.month);
        if (next.day > maxDay) next.day = maxDay;
      }
      return next;
    });
  }, []);

  // 当前时间
  const handleNow = useCallback(() => {
    const n = new Date();
    setDate({
      year: n.getFullYear(),
      month: n.getMonth() + 1,
      day: n.getDate(),
      hour: n.getHours(),
      minute: n.getMinutes(),
    });
  }, []);

  // 提交（v18.1: 农历模式自动转换为公历后再传给算法）
  const handleSubmit = useCallback(() => {
    if (showRegion && options.locationMissing) return;
    if (onNameChange) onNameChange(nameState);
    // 名称和备注跟随本次排盘自动保存；用户可在记录抽屉中随时修改或删除。
    setPendingPaipanRecordMeta(currentRecordTool(), nameState, recordNote);
    const birthLocation = showRegion ? regionSnapshotAt(region, options.longitude) : options.birthLocation;
    const birthPlace = showRegion ? birthLocation?.displayName : options.birthPlace;
    setPendingPaipanRecordContext(currentRecordTool(), {
      schemaVersion: 2,
      birthInput: {
        rawDateTime: { ...date },
        year: date.year,
        month: date.month,
        day: date.day,
        hour: date.hour,
        minute: date.minute,
        calendar: options.calType,
        gender: options.gender,
        zaoWanZi: options.zaoWanZi,
        zhenTaiyang: options.zhenTaiyang,
        xiaLing: options.xiaLing,
        birthPlace,
        birthLocation,
        longitude: birthLocation?.longitude ?? options.longitude ?? null,
        latitude: birthLocation?.latitude ?? options.latitude ?? null,
        timezone: "Asia/Shanghai",
        utcOffsetMinutes: 480,
        timezoneSource: "birth-location",
        coordinateSource: birthLocation?.coordinateSource ?? null,
      },
    });
    // 农历模式：将农历日期转换为公历日期，确保算法层始终接收公历
    const finalDate = options.calType === "lunar" ? lunarToSolarDate(date) : date;
    onSubmit(finalDate, {
      ...options,
      birthPlace,
      birthLocation,
      longitude: birthLocation?.longitude ?? options.longitude,
      latitude: birthLocation?.latitude ?? options.latitude,
      locationMissing: false,
    });
    onClose("submit");
  }, [date, options, region, showRegion, nameState, recordNote, onNameChange, onSubmit, onClose]);

  // P1-6: 统一滚动锁 + P1-7: 弹窗返回拦截
  // P1-REOPEN: 排盘弹窗保留底部导航栏（hideNav:false）+ 弹窗整体上移 56px 避让，
  // 弹窗不再遮挡导航栏，导航栏保持可见可点击
  useBodyScrollLock(show, { hideNav: false });
  usePopupBackHandler(onClose, show);

  // 三级联动派生值 + 切换处理
  const prov = REGIONS[region.p] ?? REGIONS[0];
  const cities = prov.cities ?? [];
  const city = cities[Math.min(region.c, cities.length - 1)] ?? cities[0];
  const districts = city ? city.districts : [];
  const applyLng = (v: number | null | undefined) => {
    if (v != null) setOptions(prev => ({ ...prev, longitude: v, locationMissing: false }));
  };
  const onProvinceChange = (pi: number) => {
    const target = REGIONS[pi];
    setRegion({ p: pi, c: 0, d: 0 });
    const firstCity = target.cities[0];
    applyLng(firstCity && firstCity.districts[0] ? firstCity.districts[0].lng : firstCity ? firstCity.lng : target.lng);
  };
  const onCityChange = (ci: number) => {
    setRegion(prev => ({ ...prev, c: ci, d: 0 }));
    const target = cities[ci];
    applyLng(target && target.districts[0] ? target.districts[0].lng : target ? target.lng : city ? city.lng : null);
  };
  const onDistrictChange = (di: number) => {
    setRegion(prev => ({ ...prev, d: di }));
    applyLng(districts[di] ? districts[di].lng : null);
  };

  if (!show) return null;

  // 生成选项数组
  const years = Array.from({ length: 121 }, (_, i) => 1900 + i); // 1900-2020... actually 1900-2100
  const yearsExtended = Array.from({ length: 201 }, (_, i) => 1900 + i); // 1900-2100
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const maxDay = daysInMonth(date.year, date.month);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // select 样式
  const selectClass = "min-w-0 flex-1 rounded-md border border-gray-200 px-1 py-1.5 text-[13px] text-center outline-none focus:border-[#7B2FBE] bg-white cursor-pointer";

  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-center"
      style={{ paddingTop: "max(44px, env(safe-area-inset-top))", paddingBottom: "56px", alignItems: "flex-start" }}
    >
      {/* 遮罩层 - 独立div确保点击可关闭 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onClose()}
      />
      {/* v25.0.30（P8-1 弹窗规范）：屏幕居中偏上 + 80vh 上限 + 内容内滚（原底部形态改居中偏上口径） */}
      <div
        className="relative w-[calc(100%-16px)] max-w-[390px] rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: "calc(100dvh - 108px)", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 - 右上角×关闭按钮（对标吉时雨 closeBtn: 1） */}
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 sticky top-0 bg-white z-10">
          <div className="w-8" />
          <span className="text-base font-bold text-gray-800">{title}</span>
          <button
            type="button"
            onClick={() => onClose()}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2 px-3 py-2">
          {/* 名称与备注会自动写入记录，不再要求用户额外点击保存。 */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={nameState}
                onChange={(e) => setNameState(e.target.value)}
                placeholder="姓名 / 记录名称"
                className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7B2FBE]"
              />
              <input value={recordNote} onChange={(e) => setRecordNote(e.target.value)} maxLength={300} placeholder="备注（可选）" className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7B2FBE]" />
            </div>

          {/* 2. 性别 + 历法切换（对标吉时雨 sex radio + rolldate-button-date-group2） */}
          {(showGender || showCalType) && (
            <div className="flex items-center justify-between">
              {showGender && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, gender: "male" }))}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                      options.gender === "male"
                        ? "bg-[#7B2FBE] text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    男
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, gender: "female" }))}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                      options.gender === "female"
                        ? "bg-[#7B2FBE] text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    女
                  </button>
                </div>
              )}
              {showCalType && (
                <div className="flex items-center gap-1">
                  {([
                    { val: "solar", label: "公历" },
                    { val: "lunar", label: "农历" },
                    { val: "sizhu", label: "四柱" },
                  ] as const).map(t => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setOptions(prev => ({ ...prev, calType: t.val }))}
                      className={`px-2.5 py-1 rounded text-sm font-medium transition-all ${
                        options.calType === t.val
                          ? "bg-[#7B2FBE] text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. 日期 - 原生select下拉框（对标吉时雨 mydate + RolldateFull） */}
          <div>
              <div className="mb-1 flex items-center justify-between">
              <label className="text-sm text-gray-700">日期</label>
              <button type="button" onClick={openRecords} className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-800">排盘记录 / 导入</button>
            </div>
            {recordsOpen && <section data-testid="date-records" className="mb-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
              <div className="mb-2 flex items-center justify-between"><strong className="text-sm text-purple-900">全部工具排盘记录</strong><button type="button" onClick={()=>setRecordsOpen(false)} className="text-xs text-purple-700">收起记录</button></div>
              <input aria-label="搜索可导入记录" value={recordQuery} onChange={e=>setRecordQuery(e.target.value)} placeholder="搜索姓名、工具或日期" className="mb-2 w-full rounded-lg border bg-white p-2 text-sm" />
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {recordMessage ? <p className="text-xs text-gray-500">{recordMessage}</p> : records.filter(r=>`${r.title} ${TOOL_NAMES[r.tool]||r.tool} ${String(r.input.name||"")} ${r.note||""}`.toLocaleLowerCase().includes(recordQuery.trim().toLocaleLowerCase())).map(r=>{const p=profileFromRecord(r);return <div key={r.id} className="rounded-lg bg-white p-2 text-xs">
                  <div className="font-semibold">{TOOL_NAMES[r.tool]||r.tool} · {String(r.input.name||r.title)}</div>
                  {r.note && <div className="mt-1 text-gray-600">备注：{r.note}</div>}
                  {p ? <><div className="my-1 text-gray-600">{p.gender} {p.birthDate} {p.birthTime}</div><button type="button" className="rounded-lg bg-purple-700 px-3 py-2 text-white" onClick={()=>{
                    const [year, month, day] = (p.birthDate || "").split("-").map(Number);
                    const [hour, minute] = (p.birthTime || "").split(":").map(Number);
                    if (year && month && day && Number.isFinite(hour)) setDate({ year, month, day, hour, minute: Number.isFinite(minute) ? minute : 0 });
                    const input = r.input || {};
                    const birthInput = input.birthInput && typeof input.birthInput === "object" ? input.birthInput as Record<string, unknown> : {};
                    const rawLocation = birthInput.birthLocation;
                    const rawPlace = typeof birthInput.birthPlace === "string" ? birthInput.birthPlace : (typeof input.birthPlace === "string" ? input.birthPlace : (p.birthPlace || undefined));
                    const rawLongitude = Number(birthInput.longitude ?? input.longitude);
                    const rawLatitude = Number(birthInput.latitude ?? input.latitude);
                    const restoredRegion = regionFromSnapshot(rawLocation, rawPlace, Number.isFinite(rawLongitude) ? rawLongitude : undefined);
                    if (restoredRegion) setRegion(restoredRegion);
                    setOptions(prev => ({
                      ...prev,
                      gender: p.gender === "女" ? "female" : "male",
                      calType: birthInput.calendar === "lunar" || birthInput.calendar === "sizhu" ? birthInput.calendar : "solar",
                      zaoWanZi: typeof birthInput.zaoWanZi === "boolean" ? birthInput.zaoWanZi : prev.zaoWanZi,
                      zhenTaiyang: typeof birthInput.zhenTaiyang === "boolean" ? birthInput.zhenTaiyang : prev.zhenTaiyang,
                      xiaLing: typeof birthInput.xiaLing === "boolean" ? birthInput.xiaLing : prev.xiaLing,
                      birthPlace: rawPlace,
                      birthLocation: rawLocation as BirthLocationSnapshot | undefined,
                      longitude: Number.isFinite(rawLongitude) ? rawLongitude : prev.longitude,
                      latitude: Number.isFinite(rawLatitude) ? rawLatitude : prev.latitude,
                      locationMissing: !restoredRegion,
                    }));
                    if (r.tool === currentRecordTool() && onRecordRestore) onRecordRestore(r); else onRecordImport?.(p);
                    setNameState(p.name); setRecordNote(r.note || ""); onNameChange?.(p.name); setRecordsOpen(false); setRecordQuery("");
                  }}>导入此人资料</button></> : <div className="mt-1 text-gray-500">无完整出生资料，可在工具记录中查看原盘</div>}
                </div>;})}
                {!recordMessage && records.length===0 && <p className="text-xs text-gray-500">暂无记录，排盘后自动保存</p>}
              </div>
            </section>}
            <div className="flex items-center gap-1.5">
              <select
                data-testid="birth-year"
                value={date.year}
                onChange={(e) => updateDate("year", parseInt(e.target.value, 10))}
                className={selectClass}
              >
                {yearsExtended.map(y => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
              <select
                data-testid="birth-month"
                value={date.month}
                onChange={(e) => updateDate("month", parseInt(e.target.value, 10))}
                className={selectClass}
              >
                {months.map(m => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
              <select
                data-testid="birth-day"
                value={date.day}
                onChange={(e) => updateDate("day", parseInt(e.target.value, 10))}
                className={selectClass}
              >
                {days.map(d => (
                  <option key={d} value={d}>{d}日</option>
                ))}
              </select>
            </div>
              <div className="mt-1 flex items-center gap-1.5">
              <select
                data-testid="birth-hour"
                value={date.hour}
                onChange={(e) => updateDate("hour", parseInt(e.target.value, 10))}
                className={selectClass}
              >
                {hours.map(h => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}时</option>
                ))}
              </select>
              {showMinute && (
                <select
                  value={date.minute}
                  onChange={(e) => updateDate("minute", parseInt(e.target.value, 10))}
                  className={selectClass}
                >
                  {minutes.map(m => (
                    <option key={m} value={m}>{String(m).padStart(2, "0")}分</option>
                  ))}
                </select>
              )}
              {/* 当前时间按钮（对标吉时雨 app-time-btn） */}
              <button
                type="button"
                onClick={handleNow}
                  className="shrink-0 rounded-md border border-[#7B2FBE] bg-[#F3EDF7] px-2 py-1.5 text-[13px] font-medium text-[#7B2FBE] transition-colors hover:bg-[#C9A8DC]"
              >
                当前
              </button>
            </div>
          </div>

          {/* 4. 早晚子时（对标吉时雨 wanzishi radio） */}
          {showOptions && showToggles && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">早晚子时</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, zaoWanZi: true }))}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      options.zaoWanZi
                        ? "bg-[#7B2FBE] text-white font-medium"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    是
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, zaoWanZi: false }))}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      !options.zaoWanZi
                        ? "bg-[#7B2FBE] text-white font-medium"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    否
                  </button>
                </div>
              </div>

              {/* 5. 真太阳时 + 夏令时（对标吉时雨 realsun radio + summertime switch） */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">真太阳时</span>
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, zhenTaiyang: true }))}
                    className={`px-2.5 py-0.5 rounded text-sm transition-all ${
                      options.zhenTaiyang
                        ? "bg-[#7B2FBE] text-white font-medium"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    是
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, zhenTaiyang: false }))}
                    className={`px-2.5 py-0.5 rounded text-sm transition-all ${
                      !options.zhenTaiyang
                        ? "bg-[#7B2FBE] text-white font-medium"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    否
                  </button>
                </div>
                {/* 夏令时开关（对标吉时雨 summertime switch） */}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-700">夏令时</span>
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, xiaLing: !prev.xiaLing }))}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      options.xiaLing ? "bg-[#7B2FBE]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        options.xiaLing ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 5b. 独立夏令时开关（v25.0.82 P0-3）：供引擎内置真太阳时的工具（如七政四余）使用，
                   不显示"真太阳时"开关（引擎必开、避免误解），仅显示夏令时；
                   出生时间落在 1986-1991 中国夏令时区间时动态提示核对 */}
              {showOptions && !showToggles && showXiaLing && (
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-gray-700">夏令时</span>
                      <button
                        type="button"
                        onClick={() => setOptions(prev => ({ ...prev, xiaLing: !prev.xiaLing }))}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          options.xiaLing ? "bg-[#7B2FBE]" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            options.xiaLing ? "left-[22px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    {chinaDstInfo(date.year, date.month, date.day, date.hour, date.minute).active && (
                      <span className="text-[10px] leading-tight text-amber-600">
                        {date.year}年中国夏令时期间
                      </span>
                    )}
                  </div>
                  {chinaDstInfo(date.year, date.month, date.day, date.hour, date.minute).active && !options.xiaLing && (
                    <p className="mt-1 text-[10px] leading-snug text-amber-600">
                      该出生时间处于中国夏令时期间（{chinaDstInfo(date.year, date.month, date.day, date.hour, date.minute).rangeText}）。
                      若录入的是当时钟面时间，请开启"夏令时"以减去 1 小时；若已按标准时间录入则无需开启。
                    </p>
                  )}
                </div>
              )}

              {/* 6. 地区选择 - 省/市/县三级联动 + 手动经度微调（真太阳时校正） */}
              {showRegion && (
                <div className="space-y-1">
                  {options.locationMissing && (
                    <div role="alert" className="flex items-center justify-between gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
                      <span>此历史记录未保存出生地，请在下方补充后再排盘。</span>
                      <button type="button" onClick={() => setOptions(prev => ({ ...prev, locationMissing: false }))} className="shrink-0 rounded border border-amber-300 bg-white px-2 py-1 font-semibold">确认此地</button>
                    </div>
                  )}
                  <label className="block text-sm text-gray-700">
                    出生地（东经{" "}
                    <span className="font-medium text-[#7B2FBE]">{(options.longitude ?? 0).toFixed(4)}°</span>
                    ）
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    <select data-testid="birth-region-province" value={region.p} onChange={(e) => onProvinceChange(parseInt(e.target.value, 10))} className="min-w-0 rounded-md border border-gray-200 px-1 py-1.5 text-xs outline-none focus:border-[#7B2FBE] bg-white">
                      {REGIONS.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
                    </select>
                    <select data-testid="birth-region-city" value={region.c} onChange={(e) => onCityChange(parseInt(e.target.value, 10))} className="min-w-0 rounded-md border border-gray-200 px-1 py-1.5 text-xs outline-none focus:border-[#7B2FBE] bg-white">
                      {cities.map((c, i) => <option key={c.name} value={i}>{c.name}</option>)}
                    </select>
                    <select data-testid="birth-region-district" value={region.d} onChange={(e) => onDistrictChange(parseInt(e.target.value, 10))} className="min-w-0 rounded-md border border-gray-200 px-1 py-1.5 text-xs outline-none focus:border-[#7B2FBE] bg-white">
                      {districts.map((d, i) => <option key={d.name} value={i}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-xs text-gray-500">手动经度</span>
                    <input
                      type="number"
                      data-testid="birth-longitude"
                      step={0.0001}
                      min={73}
                      max={135}
                      value={options.longitude}
                      onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setOptions(prev => ({ ...prev, longitude: v, locationMissing: false })); }}
                      className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-[#7B2FBE] bg-white"
                    />
                    <span className="shrink-0 text-xs text-gray-400">°E</span>
                  </div>
                  {options.zhenTaiyang && <div className="text-[11px] text-gray-400">真太阳时＝钟表时间＋经度差修正＋均时差</div>}
                </div>
              )}
            </>
          )}
        </div>

        {/* 工具专属扩展参数区（如奇门遁甲：排盘方式/寄宫/起局/暗干/时间类型） */}
        {extraOptions}

        {/* 排盘按钮（对标吉时雨 submitFormBtn class="app-paipan-button"） */}
        <div className="px-3 pb-3 pt-1">
          <button
            data-testid="date-picker-submit"
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-full bg-[#7B2FBE] py-2.5 text-base font-bold text-white shadow-lg transition-colors active:bg-[#5B1A8A]"
          >
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
}
