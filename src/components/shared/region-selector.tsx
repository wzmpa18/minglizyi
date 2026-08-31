"use client";

// ============================================================================
// SharedBirthLocationSelector —— 出生/测量地点省→市→区县三级联动共享组件
// ----------------------------------------------------------------------------
// 数据源（唯一事实源）：src/data/regions.ts（35省 / 2876 区县，带经纬度）
// 抽取自 components/shared/date-picker.tsx 的地区选择块（行为保持一致）。
// 使用方：八字（经 date-picker 内部）、七政四余、专业罗盘、立极尺……
// 快捷城市：仅作为快捷入口，点击后映射进同一 Province/City/County 模型，
//           不形成第二套地点算法（指令 NICHE-PRO-TOOLS-GROWTH-FINAL-SEAL-08 第10章）。
// ============================================================================

import { useMemo, useState } from "react";
import { REGIONS } from "@/data/regions";

export interface RegionSelection {
  province: string;
  city: string;
  district: string;
  lng: number;
  lat: number | null;
}

export interface RegionIndices {
  p: number;
  c: number;
  d: number;
}

/** 按经度反查最近区县的三级索引（用于初始化选中项；缺经度的县跳过） */
export function nearestRegion(lng: number): RegionIndices {
  let best: RegionIndices = { p: 0, c: 0, d: 0 };
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

/** 由三级索引取完整选择（含名称与经纬度） */
export function regionAt(idx: RegionIndices): RegionSelection {
  const prov = REGIONS[Math.min(idx.p, REGIONS.length - 1)] ?? REGIONS[0];
  const cities = prov.cities ?? [];
  const city = cities[Math.min(idx.c, cities.length - 1)] ?? cities[0];
  const districts = city ? city.districts : [];
  const district = districts[Math.min(idx.d, districts.length - 1)] ?? districts[0];
  const lng = district && district.lng != null ? district.lng : city && city.lng != null ? city.lng : prov.lng ?? 116.4;
  const lat = district && district.lat != null ? district.lat : city && city.lat != null ? city.lat : prov.lat ?? null;
  return {
    province: prov.name,
    city: city ? city.name : "",
    district: district ? district.name : "",
    lng,
    lat,
  };
}

/** 快捷城市：名称 → 省/市/县三级索引（映射进同一数据模型，非第二套算法） */
const QUICK_CITIES: Array<{ label: string; match: Array<[string, string]> }> = [
  { label: "北京", match: [["北京市", "市辖区"]] },
  { label: "上海", match: [["上海市", "市辖区"]] },
  { label: "广州", match: [["广东省", "广州市"]] },
  { label: "深圳", match: [["广东省", "深圳市"]] },
  { label: "杭州", match: [["浙江省", "杭州市"]] },
  { label: "成都", match: [["四川省", "成都市"]] },
  { label: "重庆", match: [["重庆市", "市辖区"]] },
  { label: "武汉", match: [["湖北省", "武汉市"]] },
  { label: "西安", match: [["陕西省", "西安市"]] },
  { label: "南京", match: [["江苏省", "南京市"]] },
  { label: "天津", match: [["天津市", "市辖区"]] },
  { label: "长沙", match: [["湖南省", "长沙市"]] },
];

/** 按省市名（可含区县名）解析为三级索引；未命中返回 null */
export function resolveRegion(provinceName: string, cityName: string, districtName?: string): RegionIndices | null {
  const pi = REGIONS.findIndex((p) => p.name === provinceName);
  if (pi < 0) return null;
  const cities = REGIONS[pi].cities;
  const ci = cities.findIndex((c) => c.name === cityName);
  if (ci < 0) return null;
  let di = 0;
  if (districtName) {
    const found = cities[ci].districts.findIndex((d) => d.name === districtName);
    if (found >= 0) di = found;
  }
  return { p: pi, c: ci, d: di };
}

/** 快捷城市点击 → 三级索引（取该市第一个有坐标的区县） */
export function quickCityIndices(label: string): RegionIndices | null {
  const qc = QUICK_CITIES.find((q) => q.label === label);
  if (!qc) return null;
  for (const [provName, cityName] of qc.match) {
    const idx = resolveRegion(provName, cityName);
    if (!idx) continue;
    const cities = REGIONS[idx.p].cities;
    const districts = cities[idx.c].districts;
    for (let di = 0; di < districts.length; di++) {
      if (districts[di].lng != null) return { p: idx.p, c: idx.c, d: di };
    }
    return idx;
  }
  return null;
}

export const QUICK_CITY_LABELS = QUICK_CITIES.map((q) => q.label);

// ============================================================================
// 主组件
// ============================================================================

export interface RegionSelectorProps {
  /** 当前经度（东经度数，唯一真相锚点；打开时据此反查最近区县） */
  lng: number;
  /** 三级选中索引（受控） */
  indices: RegionIndices;
  onIndicesChange: (idx: RegionIndices) => void;
  /** 选中区县变化时回调完整信息（名称+经纬度） */
  onSelectionChange?: (sel: RegionSelection) => void;
  /** 是否显示手动经度微调输入框（默认 true） */
  showManualLng?: boolean;
  /** 是否显示快捷城市按钮（默认 true） */
  showQuickCities?: boolean;
  /** 顶部说明文案 */
  label?: string;
  /** 是否显示经纬度读数行（默认 true） */
  showCoords?: boolean;
}

export default function SharedBirthLocationSelector({
  lng,
  indices,
  onIndicesChange,
  onSelectionChange,
  showManualLng = true,
  showQuickCities = true,
  label = "出生地",
  showCoords = true,
}: RegionSelectorProps) {
  const prov = REGIONS[indices.p] ?? REGIONS[0];
  const cities = prov.cities ?? [];
  const city = cities[Math.min(indices.c, cities.length - 1)] ?? cities[0];
  const districts = city ? city.districts : [];
  const district = districts[Math.min(indices.d, districts.length - 1)] ?? districts[0];

  const sel: RegionSelection = useMemo(
    () => ({
      province: prov.name,
      city: city ? city.name : "",
      district: district ? district.name : "",
      lng: district && district.lng != null ? district.lng : lng,
      lat: district && district.lat != null ? district.lat : city && city.lat != null ? city.lat : prov.lat ?? null,
    }),
    [prov, city, district, lng],
  );

  const [manualLng, setManualLng] = useState<string>("");

  const emit = (idx: RegionIndices, lngOverride?: number | null) => {
    onIndicesChange(idx);
    const s = regionAt(idx);
    const finalLng = lngOverride != null ? lngOverride : s.lng;
    onSelectionChange?.({ ...s, lng: finalLng });
  };

  const onProvinceChange = (pi: number) => emit({ p: pi, c: 0, d: 0 });
  const onCityChange = (ci: number) => emit({ p: indices.p, c: ci, d: 0 });
  const onDistrictChange = (di: number) => emit({ p: indices.p, c: indices.c, d: di });

  const onQuickCity = (label: string) => {
    const idx = quickCityIndices(label);
    if (idx) emit(idx);
  };

  const onManualLngCommit = (raw: string) => {
    const v = parseFloat(raw);
    if (!isNaN(v) && v >= 73 && v <= 136) {
      const s = regionAt(indices);
      onSelectionChange?.({ ...s, lng: v });
    }
  };

  const selectClass = "w-full rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#7B2FBE] bg-white";

  return (
    <div className="space-y-2">
      <label className="block text-sm text-gray-700">
        {label}（东经 <span className="font-medium text-[#7B2FBE]">{sel.lng.toFixed(4)}°</span>
        {sel.lat != null ? <span> / 北纬 <span className="font-medium text-[#7B2FBE]">{sel.lat.toFixed(4)}°</span></span> : null}）
      </label>
      {showQuickCities && (
        <div className="grid grid-cols-6 gap-1">
          {QUICK_CITY_LABELS.map((c) => {
            const active = sel.province.startsWith(c) || c === "重庆" ? sel.province === c + "市" || sel.city === c + "市" : sel.city === c + "市";
            return (
              <button
                key={c}
                type="button"
                onClick={() => onQuickCity(c)}
                className={`rounded py-1.5 text-xs font-medium transition-all ${active ? "bg-[#7B2FBE] text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}
      <select value={indices.p} onChange={(e) => onProvinceChange(parseInt(e.target.value, 10))} className={selectClass}>
        {REGIONS.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
      </select>
      <select value={indices.c} onChange={(e) => onCityChange(parseInt(e.target.value, 10))} className={selectClass}>
        {cities.map((c, i) => <option key={c.name} value={i}>{c.name}</option>)}
      </select>
      <select value={indices.d} onChange={(e) => onDistrictChange(parseInt(e.target.value, 10))} className={selectClass}>
        {districts.map((d, i) => <option key={d.name} value={i}>{d.name}（{d.lng != null ? d.lng.toFixed(2) + "°" : "缺省"}）</option>)}
      </select>
      {showManualLng && (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-gray-500">手动经度</span>
          <input
            type="number"
            step={0.0001}
            min={73}
            max={136}
            value={manualLng !== "" ? manualLng : sel.lng.toFixed(4)}
            onChange={(e) => setManualLng(e.target.value)}
            onBlur={() => onManualLngCommit(manualLng)}
            className="flex-1 rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#7B2FBE] bg-white"
          />
          <span className="shrink-0 text-xs text-gray-400">°E</span>
        </div>
      )}
      {showCoords && (
        <div className="text-[11px] text-gray-400">
          {sel.province} · {sel.city} · {sel.district || "（市辖）"}｜真太阳时＝钟表时间＋经度差修正＋均时差
        </div>
      )}
    </div>
  );
}
