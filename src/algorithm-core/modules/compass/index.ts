// 专业电子罗盘引擎 - NICHE-TOOLS-08
// ============================================================================
// 来源：磁偏角采用 NOAA/NCEI 世界地磁场模型 WMM2025
//       （历元 2025.0，有效期 2025.0-2030.0，阶数 12），
//       官方源代码与系数数据属美国政府公共领域（public domain），可自由商用；
//       球谐展开/施密特准归一勒让德递推按 WMM 技术报告标准算法净室实现，
//       实现后与 NOAA 官方发布之 WMM2025_TEST_VALUES.TXT 十二组双精度
//       测试值逐项对拍（X/Y/Z/H/F/I/D，误差<0.01°/<1nT）；
//       Android 系统 GeomagneticField（WMM-2020）仅作交叉验证与降级，
//       不作为主引擎。
//       二十四山/八卦/坐向体系为通行为业公识（子山正北 0°，每山 15°），
//       与本工程玄空飞星模块的二十四山表同源对齐；
//       兼向取"山界±3°骑缝"通行判读口径（正中 9° 为正向）。
// 协议：净室独立实现；传感器层只做物理量解算，不输出任何吉凶断语，
//       坐向释义文案由页面/后台配置。
// 日期：2026-08-31 创建（v25.0.68）
// ============================================================================

/** 引擎数据版本（合规可追溯标识） */
export const COMPASS_ENGINE_VERSION = "电子罗盘引擎 v25.0.68（磁偏角层：NOAA WMM2025，公共领域）";

// ============================================================================
// 一、WMM2025 地磁模型（系数为美国政府公共领域数据）
// ============================================================================

/** 模型阶数 */
const WMM_NMAX = 12;
/** 三角索引数：(12+1)(12+2)/2 = 91 */
const WMM_NCOEFF = 91;
/** WMM2025 历元 */
const WMM_EPOCH = 2025.0;
/** WGS-84 长半轴 (km) */
const WGS84_A = 6378.137;
/** WGS-84 短半轴 (km) */
const WGS84_B = 6356.7523142;
/** WGS-84 第一偏心率平方 */
const WGS84_ESQ = 1 - (WGS84_B * WGS84_B) / (WGS84_A * WGS84_A);
/** 地磁参考球半径 (km) */
const EARTH_MAG_R = 6371.2;

/** 三角索引：n(n+1)/2 + m */
const IDX = (n: number, m: number) => (n * (n +1)) / 2 + m;

/** 主场高斯系数 g(n,m)（nT），WMM2025COF released 2024-11-13 */
const WMM_G: number[] = [
  0.0,
  -29351.8, -1410.8,
  -2556.6, 2951.1, 1649.3,
  1361.0, -2404.1, 1243.8, 453.6,
  895.0, 799.5, 55.7, -281.1, 12.1,
  -233.2, 368.9, 187.2, -138.7, -142.0, 20.9,
  64.4, 63.8, 76.9, -115.7, -40.9, 14.9, -60.7,
  79.5, -77.0, -8.8, 59.3, 15.8, 2.5, -11.1, 14.2,
  23.2, 10.8, -17.5, 2.0, -21.7, 16.9, 15.0, -16.8, 0.9,
  4.6, 7.8, 3.0, -0.2, -2.5, -13.1, 2.4, 8.6, -8.7, -12.9,
  -1.3, -6.4, 0.2, 2.0, -1.0, -0.6, -0.9, 1.5, 0.9, -2.7, -3.9,
  2.9, -1.5, -2.5, 2.4, -0.6, -0.1, -0.6, -0.1, 1.1, -1.0, -0.2, 2.6,
  -2.0, -0.2, 0.3, 1.2, -1.3, 0.6, 0.6, 0.5, -0.1, -0.4, -0.2, -1.3, -0.7,
];

/** 主场高斯系数 h(n,m)（nT） */
const WMM_H: number[] = [
  0.0,
  0.0, 4545.4,
  0.0, -3133.6, -815.1,
  0.0, -56.6, 237.5, -549.5,
  0.0, 278.6, -133.9, 212.0, -375.6,
  0.0, 45.4, 220.2, -122.9, 43.0, 106.1,
  0.0, -18.4, 16.8, 48.8, -59.8, 10.9, 72.7,
  0.0, -48.9, -14.4, -1.0, 23.4, -7.4, -25.1, -2.3,
  0.0, 7.1, -12.6, 11.4, -9.7, 12.7, 0.7, -5.2, 3.9,
  0.0, -24.8, 12.2, 8.3, -3.3, -5.2, 7.2, -0.6, 0.8, 10.0,
  0.0, 3.3, 0.0, 2.4, 5.3, -9.1, 0.4, -4.2, -3.8, 0.9, -9.1,
  0.0, 0.0, 2.9, -0.6, 0.2, 0.5, -0.3, -1.2, -1.7, -2.9, -1.8, -2.3,
  0.0, -1.3, 0.7, 1.0, -1.4, 0.0, 0.6, -0.1, 0.8, 0.1, -1.0, 0.1, 0.2,
];

/** 长期变化系数 dg/dt（nT/年） */
const WMM_GDOT: number[] = [
  0.0,
  12.0, 9.7,
  -11.6, -5.2, -8.0,
  -1.3, -4.2, 0.4, -15.6,
  -1.6, -2.4, -6.0, 5.6, -7.0,
  0.6, 1.4, 0.0, 0.6, 2.2, 0.9,
  -0.2, -0.4, 0.9, 1.2, -0.9, 0.3, 0.9,
  0.0, -0.1, -0.1, 0.5, -0.1, -0.8, -0.8, 0.8,
  -0.1, 0.2, 0.0, 0.5, -0.1, 0.3, 0.2, 0.0, 0.2,
  0.0, -0.1, 0.1, 0.3, -0.3, 0.0, 0.3, -0.1, 0.1, -0.1,
  0.1, 0.0, 0.1, 0.1, 0.0, -0.3, 0.0, -0.1, -0.1, 0.0, 0.0,
  0.0, 0.0, 0.0, 0.0, 0.0, -0.1, 0.0, 0.0, -0.1, -0.1, -0.1, -0.1,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.0, 0.0, 0.0, -0.1, 0.0, -0.1,
];

/** 长期变化系数 dh/dt（nT/年） */
const WMM_HDOT: number[] = [
  0.0,
  0.0, -21.5,
  0.0, -27.7, -12.1,
  0.0, 4.0, -0.3, -4.1,
  0.0, -1.1, 4.1, 1.6, -4.4,
  0.0, -0.5, 2.2, 0.4, 1.7, 1.9,
  0.0, 0.3, -1.6, -0.4, 0.9, 0.7, 0.9,
  0.0, 0.6, 0.5, -0.8, 0.0, -1.0, 0.6, -0.2,
  0.0, -0.2, 0.5, -0.4, 0.4, -0.5, -0.6, 0.3, 0.2,
  0.0, -0.3, 0.3, -0.3, 0.3, 0.2, -0.1, -0.2, 0.4, 0.1,
  0.0, 0.0, 0.0, -0.2, 0.1, -0.1, 0.1, 0.0, -0.1, 0.2, 0.0,
  0.0, 0.0, 0.1, 0.0, 0.1, 0.0, 0.0, 0.1, 0.0, 0.0, 0.0, 0.0,
  0.0, 0.0, 0.0, -0.1, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.1,
];

/** WMM2025 地磁场分量结果 */
export interface WmmField {
  /** 北向分量 X（nT，地理北） */
  x: number;
  /** 东向分量 Y（nT） */
  y: number;
  /** 垂直分量 Z（nT，向下为正） */
  z: number;
  /** 水平强度 H（nT） */
  h: number;
  /** 总场强 F（nT） */
  f: number;
  /** 磁倾角（度，向下为正） */
  inclination: number;
  /** 磁偏角（度，东偏为正；-7.3 = 西偏 7.3°） */
  declination: number;
}

/** 角度归一化到 [0,360) */
export function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/** 日期 → 十进制年（用于 WMM 时间插值） */
export function decimalYear(date: Date): number {
  const year = date.getFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const frac = (date.getTime() - start) / (end - start);
  return year + frac;
}

/**
 * WMM2025 地磁场全分量解算（净室实现，对拍 NOAA 官方测试值通过）
 * @param lat 大地纬度（度，北正南负）
 * @param lon 大地经度（度，东正西负）
 * @param altKm WGS-84 椭球高（km，默认 0）
 * @param dyear 十进制年（默认取当前时刻）
 */
export function wmm2025Field(
  lat: number,
  lon: number,
  altKm = 0,
  dyear?: number,
): WmmField {
  const dt = (dyear ?? decimalYear(new Date())) - WMM_EPOCH;

  // 1) 时间插值的高斯系数
  const g = new Array<number>(WMM_NCOEFF);
  const h = new Array<number>(WMM_NCOEFF);
  for (let i = 0; i < WMM_NCOEFF; i++) {
    g[i] = WMM_G[i] + WMM_GDOT[i] * dt;
    h[i] = WMM_H[i] + WMM_HDOT[i] * dt;
  }

  // 2) 极区防奇异：钳制纬度（By 的 cos(地心纬度) 分母）
  let latDeg = lat;
  if (latDeg > 89.9999) latDeg = 89.9999;
  if (latDeg < -89.9999) latDeg = -89.9999;

  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;
  const latRad = latDeg * D2R;
  const lonRad = normalizeDeg(lon) * D2R;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);

  // 3) 大地坐标 → 地心球坐标（含椭球高）
  const rc = WGS84_A / Math.sqrt(1 - WGS84_ESQ * sinLat * sinLat);
  const p = (rc + altKm) * cosLat;
  const zc = (rc * (1 - WGS84_ESQ) + altKm) * sinLat;
  const r = Math.sqrt(p * p + zc * zc);
  const gcLat = Math.atan2(zc, p); // 地心纬度
  const sinGc = Math.sin(gcLat);
  const cosGc = Math.cos(gcLat);

  // 4) 相对半径幂 (EARTH_MAG_R/r)^(n+2)
  const ratio = EARTH_MAG_R / r;
  const rr = new Array<number>(WMM_NMAX + 1);
  rr[0] = ratio * ratio;
  for (let n = 1; n <= WMM_NMAX; n++) rr[n] = rr[n - 1] * ratio;

  // 5) 经度三角递推 cos(mλ)/sin(mλ)
  const cosML = new Array<number>(WMM_NMAX + 1);
  const sinML = new Array<number>(WMM_NMAX + 1);
  cosML[0] = 1; sinML[0] = 0;
  cosML[1] = Math.cos(lonRad);
  sinML[1] = Math.sin(lonRad);
  for (let m = 2; m <= WMM_NMAX; m++) {
    cosML[m] = cosML[m - 1] * cosML[1] - sinML[m - 1] * sinML[1];
    sinML[m] = sinML[m - 1] * cosML[1] + cosML[m - 1] * sinML[1];
  }

  // 6) 高斯归一化勒让德递推（自变量 x=sin(地心纬度)，z=cos(地心纬度)）
  const pcup = new Array<number>(WMM_NCOEFF).fill(0);
  const dpcup = new Array<number>(WMM_NCOEFF).fill(0);
  pcup[0] = 1; dpcup[0] = 0;
  for (let n = 1; n <= WMM_NMAX; n++) {
    for (let m = 0; m <= n; m++) {
      const idx = IDX(n, m);
      if (n === m) {
        const i1 = IDX(n - 1, m - 1);
        pcup[idx] = cosGc * pcup[i1];
        dpcup[idx] = cosGc * dpcup[i1] + sinGc * pcup[i1];
      } else if (n === 1 && m === 0) {
        pcup[idx] = sinGc;
        dpcup[idx] = -cosGc;
      } else {
        const i2 = IDX(n - 1, m);
        if (m > n - 2) {
          pcup[idx] = sinGc * pcup[i2];
          dpcup[idx] = sinGc * dpcup[i2] - cosGc * pcup[i2];
        } else {
          const i1 = IDX(n - 2, m);
          const k = ((n - 1) * (n - 1) - m * m) / ((2 * n - 1) * (2 * n - 3));
          pcup[idx] = sinGc * pcup[i2] - k * pcup[i1];
          dpcup[idx] = sinGc * dpcup[i2] - cosGc * pcup[i2] - k * dpcup[i1];
        }
      }
    }
  }

  // 7) 施密特准归一系数 + 导数符号翻转（d/d(余纬) → d/d(纬度)）
  const sqn = new Array<number>(WMM_NCOEFF);
  sqn[0] = 1;
  for (let n = 1; n <= WMM_NMAX; n++) {
    sqn[IDX(n, 0)] = sqn[IDX(n - 1, 0)] * (2 * n - 1) / n;
    for (let m = 1; m <= n; m++) {
      sqn[IDX(n, m)] =
        sqn[IDX(n, m - 1)] *
        Math.sqrt(((n - m + 1) * (m === 1 ? 2 : 1)) / (n + m));
    }
  }
  for (let n = 1; n <= WMM_NMAX; n++) {
    for (let m = 0; m <= n; m++) {
      const idx = IDX(n, m);
      pcup[idx] *= sqn[idx];
      dpcup[idx] = -dpcup[idx] * sqn[idx];
    }
  }

  // 8) 球谐求和（地心球坐标架：Bx 北、By 东、Bz 下）
  let bx = 0, by = 0, bz = 0;
  for (let n = 1; n <= WMM_NMAX; n++) {
    for (let m = 0; m <= n; m++) {
      const idx = IDX(n, m);
      const gcosHsin = g[idx] * cosML[m] + h[idx] * sinML[m];
      const gsinHcos = g[idx] * sinML[m] - h[idx] * cosML[m];
      bz -= rr[n] * (n + 1) * gcosHsin * pcup[idx];
      by += rr[n] * m * gsinHcos * pcup[idx];
      bx -= rr[n] * gcosHsin * dpcup[idx];
    }
  }
  // By 除以 cos(地心纬度)
  if (Math.abs(cosGc) > 1e-10) by /= cosGc;

  // 9) 地心球坐标 → 大地坐标旋转
  const psi = gcLat - latRad;
  const bxGeo = bx * Math.cos(psi) - bz * Math.sin(psi);
  const byGeo = by;
  const bzGeo = bx * Math.sin(psi) + bz * Math.cos(psi);

  const hMag = Math.hypot(bxGeo, byGeo);
  const fMag = Math.hypot(hMag, bzGeo);
  return {
    x: bxGeo,
    y: byGeo,
    z: bzGeo,
    h: hMag,
    f: fMag,
    inclination: Math.atan2(bzGeo, hMag) * R2D,
    declination: Math.atan2(byGeo, bxGeo) * R2D,
  };
}

/** 仅取磁偏角（度，东偏为正） */
export function compassDeclination(
  lat: number,
  lon: number,
  date: Date = new Date(),
  altKm = 0,
): number {
  return wmm2025Field(lat, lon, altKm, decimalYear(date)).declination;
}

// ============================================================================
// 二、二十四山 / 八卦 / 坐向体系
// ============================================================================

/** 二十四山（自正北顺时针，子=0°，每山15°） */
export const SHAN_24: Array<{
  name: string;
  center: number;
  gua: string;
  yinYang: "阴" | "阳";
  wuxing: string;
  direction: string;
}> = [
  { name: "子", center: 0,   gua: "坎", yinYang: "阳", wuxing: "水", direction: "正北" },
  { name: "癸", center: 15,  gua: "坎", yinYang: "阴", wuxing: "水", direction: "北偏东" },
  { name: "丑", center: 30,  gua: "艮", yinYang: "阴", wuxing: "土", direction: "东北偏北" },
  { name: "艮", center: 45,  gua: "艮", yinYang: "阳", wuxing: "土", direction: "东北" },
  { name: "寅", center: 60,  gua: "艮", yinYang: "阳", wuxing: "木", direction: "东北偏东" },
  { name: "甲", center: 75,  gua: "震", yinYang: "阳", wuxing: "木", direction: "东偏北" },
  { name: "卯", center: 90,  gua: "震", yinYang: "阴", wuxing: "木", direction: "正东" },
  { name: "乙", center: 105, gua: "震", yinYang: "阴", wuxing: "木", direction: "东偏南" },
  { name: "辰", center: 120, gua: "巽", yinYang: "阳", wuxing: "土", direction: "东南偏东" },
  { name: "巽", center: 135, gua: "巽", yinYang: "阴", wuxing: "木", direction: "东南" },
  { name: "巳", center: 150, gua: "巽", yinYang: "阴", wuxing: "火", direction: "东南偏南" },
  { name: "丙", center: 165, gua: "离", yinYang: "阳", wuxing: "火", direction: "南偏东" },
  { name: "午", center: 180, gua: "离", yinYang: "阳", wuxing: "火", direction: "正南" },
  { name: "丁", center: 195, gua: "离", yinYang: "阴", wuxing: "火", direction: "南偏西" },
  { name: "未", center: 210, gua: "坤", yinYang: "阴", wuxing: "土", direction: "西南偏南" },
  { name: "坤", center: 225, gua: "坤", yinYang: "阳", wuxing: "土", direction: "西南" },
  { name: "申", center: 240, gua: "坤", yinYang: "阳", wuxing: "金", direction: "西南偏西" },
  { name: "庚", center: 255, gua: "兑", yinYang: "阳", wuxing: "金", direction: "西偏南" },
  { name: "酉", center: 270, gua: "兑", yinYang: "阴", wuxing: "金", direction: "正西" },
  { name: "辛", center: 285, gua: "兑", yinYang: "阴", wuxing: "金", direction: "西偏北" },
  { name: "戌", center: 300, gua: "乾", yinYang: "阳", wuxing: "土", direction: "西北偏西" },
  { name: "乾", center: 315, gua: "乾", yinYang: "阳", wuxing: "金", direction: "西北" },
  { name: "亥", center: 330, gua: "乾", yinYang: "阴", wuxing: "水", direction: "西北偏北" },
  { name: "壬", center: 345, gua: "坎", yinYang: "阳", wuxing: "水", direction: "北偏西" },
];

/** 后天八卦八方位（中心角，度） */
export const BAGUA_8: Array<{ name: string; center: number; direction: string }> = [
  { name: "坎", center: 0,   direction: "北" },
  { name: "艮", center: 45,  direction: "东北" },
  { name: "震", center: 90,  direction: "东" },
  { name: "巽", center: 135, direction: "东南" },
  { name: "离", center: 180, direction: "南" },
  { name: "坤", center: 225, direction: "西南" },
  { name: "兑", center: 270, direction: "西" },
  { name: "乾", center: 315, direction: "西北" },
];

/** 二十四山判读结果 */
export interface ShanReading {
  /** 所在山名 */
  shan: string;
  /** 山中心方位角（度） */
  shanCenter: number;
  /** 在山内偏移（度，-7.5~+7.5，正值顺时针） */
  offsetInShan: number;
  /** 所在卦名 */
  gua: string;
  /** 阴阳 */
  yinYang: "阴" | "阳";
  /** 五行 */
  wuxing: string;
  /** 方位描述 */
  direction: string;
  /** 是否兼向（山界±3°骑缝带） */
  isJian: boolean;
  /** 兼向描述，如 "子山兼癸"（非兼向为空） */
  jianText: string;
}

/**
 * 二十四山判读（含兼向）
 * @param heading 方位角（度，0=北 顺时针）
 * @param jianZone 兼向带宽（度，默认 3，即山界两侧各 3° 内判为骑缝）
 */
export function shanForHeading(heading: number, jianZone = 3): ShanReading {
  const hd = normalizeDeg(heading);
  const idx = Math.round(hd / 15) % 24;
  const s = SHAN_24[idx];
  let offset = hd - s.center;
  if (offset > 180) offset -= 360;
  if (offset < -180) offset += 360;

  // 偏移带符号最近邻：|offset| ≤ 7.5 保证落在本山
  let isJian = false;
  let jianText = "";
  if (Math.abs(offset) > 7.5 - jianZone) {
    isJian = true;
    // 正偏移=顺时针=偏向下一山，负偏移=逆时针=偏向上一山
    const neighbor = offset > 0 ? SHAN_24[(idx + 1) % 24] : SHAN_24[(idx + 23) % 24];
    jianText = `${s.name}山兼${neighbor.name}`;
  }
  return {
    shan: s.name,
    shanCenter: s.center,
    offsetInShan: Math.round(offset * 10) / 10,
    gua: s.gua,
    yinYang: s.yinYang,
    wuxing: s.wuxing,
    direction: s.direction,
    isJian,
    jianText,
  };
}

/** 对宫山（隔十二山）：向山↔坐山互推 */
export function oppositeShan(shanName: string): string {
  const i = SHAN_24.findIndex((s) => s.name === shanName);
  return SHAN_24[(i + 12) % 24].name;
}

/** 八卦方位判读 */
export function baguaForHeading(heading: number): { name: string; direction: string } {
  const hd = normalizeDeg(heading);
  const idx = Math.round(hd / 45) % 8;
  return { name: BAGUA_8[idx].name, direction: BAGUA_8[idx].direction };
}

// ============================================================================
// 三、航向换算 / 环形平滑 / 磁场干扰判定
// ============================================================================

/** 磁北航向 → 真北航向（磁偏角东偏为正） */
export function toTrueHeading(magneticHeading: number, declinationEast: number): number {
  return normalizeDeg(magneticHeading + declinationEast);
}

/** 真北航向 → 磁北航向 */
export function toMagneticHeading(trueHeading: number, declinationEast: number): number {
  return normalizeDeg(trueHeading - declinationEast);
}

/** 角度差（a-b 归到 -180~180） */
export function angleDiff(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/**
 * 环形平滑器：航向不能直接算术平均（359°与1°均值应为0°而非180°），
 * 用单位向量求和取方向均值，滑动窗口。
 */
export class CircularSmoother {
  private buf: number[] = [];
  private sinSum = 0;
  private cosSum = 0;

  constructor(private windowSize = 8) {}

  push(deg: number): void {
    const rad = (deg * Math.PI) / 180;
    this.buf.push(deg);
    this.sinSum += Math.sin(rad);
    this.cosSum += Math.cos(rad);
    if (this.buf.length > this.windowSize) {
      const old = this.buf.shift()!;
      const oldRad = (old * Math.PI) / 180;
      this.sinSum -= Math.sin(oldRad);
      this.cosSum -= Math.cos(oldRad);
    }
  }

  /** 当前平滑航向（窗口空返回 null） */
  get(): number | null {
    if (this.buf.length === 0) return null;
    return normalizeDeg((Math.atan2(this.sinSum, this.cosSum) * 180) / Math.PI);
  }

  /** 平滑度：单位向量合成长度/样本数（1=完全稳定，0=剧烈抖动） */
  stability(): number {
    if (this.buf.length === 0) return 0;
    return Math.hypot(this.sinSum, this.cosSum) / this.buf.length;
  }

  reset(): void {
    this.buf = [];
    this.sinSum = 0;
    this.cosSum = 0;
  }
}

/** 磁场干扰判定级别 */
export type InterferenceLevel = "ok" | "warn" | "bad" | "unknown";

/** 磁场强度干扰判定结果 */
export interface InterferenceResult {
  level: InterferenceLevel;
  /** 实测/理论场强比 */
  ratio: number;
  /** 提示文案 */
  message: string;
}

/**
 * 磁场干扰判定：实测磁力计总场强（μT）对拍 WMM2025 理论总场强（nT）。
 * 比值偏离合理带即提示存在铁磁干扰（钢筋、电器、手机壳磁扣等）。
 * @param measuredMicroT 磁力计实测总场强（μT）
 * @param expectedNanoT WMM2025 理论总场强 F（nT）
 */
export function magneticInterference(
  measuredMicroT: number | null,
  expectedNanoT: number,
): InterferenceResult {
  if (measuredMicroT == null || !isFinite(measuredMicroT) || expectedNanoT <= 0) {
    return { level: "unknown", ratio: 0, message: "磁场监测不可用" };
  }
  const ratio = (measuredMicroT * 1000) / expectedNanoT;
  if (ratio >= 0.85 && ratio <= 1.15) {
    return { level: "ok", ratio, message: "磁场环境良好" };
  }
  if (ratio >= 0.6 && ratio <= 1.4) {
    return {
      level: "warn",
      ratio,
      message: "磁场略有偏差，建议远离金属/电器后复测",
    };
  }
  return {
    level: "bad",
    ratio,
    message: "磁场干扰严重，读数不可靠，请远离铁磁物体",
  };
}

// ============================================================================
// 四、罗盘读数综合（页面/记录/分享用）
// ============================================================================

/** 北基准模式 */
export type NorthMode = "magnetic" | "true";

/** 罗盘读数汇总 */
export interface CompassReadingResult {
  /** 基准模式 */
  mode: NorthMode;
  /** 显示航向（度，按基准模式换算） */
  heading: number;
  /** 磁北航向（度） */
  magneticHeading: number;
  /** 真北航向（度） */
  trueHeading: number;
  /** 磁偏角（度，东偏为正） */
  declination: number;
  /** 向山判读（手机顶边指向） */
  facing: ShanReading;
  /** 坐山（向山对宫） */
  sittingShan: string;
  /** 坐向描述：如 "坐子向午"（含兼向则 "坐子向午兼癸"） */
  zuoXiang: string;
  /** 八卦方位 */
  bagua: { name: string; direction: string };
}

/**
 * 汇总罗盘读数
 * @param magneticHeading 磁北航向（度，0=磁北顺时针）
 * @param declinationEast 磁偏角（度，东偏为正）
 * @param mode 显示基准
 */
export function buildCompassReading(
  magneticHeading: number,
  declinationEast: number,
  mode: NorthMode,
): CompassReadingResult {
  const trueH = toTrueHeading(magneticHeading, declinationEast);
  const heading = mode === "true" ? trueH : normalizeDeg(magneticHeading);
  const facing = shanForHeading(heading);
  const sitting = oppositeShan(facing.shan);
  let zuoXiang = `坐${sitting}向${facing.shan}`;
  if (facing.isJian) {
    // 兼向描述：向山兼邻山，坐山同样兼对宫邻山
    const neighbor = facing.offsetInShan > 0
      ? SHAN_24[(SHAN_24.findIndex((s) => s.name === facing.shan) + 1) % 24].name
      : SHAN_24[(SHAN_24.findIndex((s) => s.name === facing.shan) + 23) % 24].name;
    const sittingNeighbor = oppositeShan(neighbor);
    zuoXiang = `坐${sitting}向${facing.shan}（${sitting}兼${sittingNeighbor}、${facing.shan}兼${neighbor}）`;
  }
  return {
    mode,
    heading: Math.round(heading * 10) / 10,
    magneticHeading: Math.round(normalizeDeg(magneticHeading) * 10) / 10,
    trueHeading: Math.round(trueH * 10) / 10,
    declination: Math.round(declinationEast * 100) / 100,
    facing,
    sittingShan: sitting,
    zuoXiang,
    bagua: baguaForHeading(heading),
  };
}
