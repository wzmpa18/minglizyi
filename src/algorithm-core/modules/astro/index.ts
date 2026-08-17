// 占星天文计算引擎 - P6-TOOL-04 §4
// ============================================================================
// 来源：基于开源库 天文历算引擎 2.1.19的天文计算，
//       星盘占星学换算层（宫位/相位/星座归属）为本项目自研实现。
// 协议：天文历算引擎 为 MIT，允许商用与闭源使用，需保留原许可证声明（见
//       docs/compliance/ 第三方数据资产清单）。
// 边界：引擎只做天文与几何计算 + 术语映射，不输出任何吉凶断语；释义文案由后台配置。
// 日期：2026-08-17 创建（v25.0.26）
// ============================================================================

import * as Astronomy from "astronomy-engine";

/** 引擎数据版本（合规可追溯标识） */
export const ASTRO_ENGINE_VERSION = "天文历算引擎 2.1.19";

// ============================================================================
// 类型定义
// ============================================================================

export interface AstroInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 出生地纬度（北纬为正） */
  lat: number;
  /** 出生地经度（东经为正） */
  lon: number;
  /** 出生地时区偏移小时数，默认东八区 8 */
  tzOffset?: number;
  placeName?: string;
}

export interface AstroPlanetPosition {
  body: string; // Sun/Moon/Mercury/Venus/Mars/Jupiter/Saturn/Uranus/Neptune/Pluto
  name: string; // 太阳/月亮/水星/金星/火星/木星/土星/天王星/海王星/冥王星
  symbol: string; // ☉ ☽ ☿ ♀ ♂ ♃ ♄ ♅ ♆ ♇
  /** 真分点黄道经度（0-360） */
  lon: number;
  signIndex: number; // 0=白羊 … 11=双鱼
  signName: string;
  /** 星座内度数（0-29.x） */
  signDegree: number;
  /** 黄经每日变化（度/日，负值=逆行） */
  speed: number;
  retrograde: boolean;
  /** 落入宫位 1-12（等宫制） */
  house: number;
}

export interface AstroAspect {
  planetA: string;
  planetB: string;
  type: string; // 合相/六合/刑/拱/冲
  symbol: string; // ☌ ⚹ □ △ ☍
  angle: number; // 相位精确角度
  orb: number; // 允许度
}

export interface NatalChartResult {
  input: AstroInput;
  utcTime: string;
  siderealTime: string; // 恒星时 LST
  obliquity: number; // 真黄赤交角
  ascendant: number; // 上升点黄经
  ascSignName: string;
  midheaven: number; // 天顶黄经
  mcSignName: string;
  /** 等宫制 12 宫头黄经 */
  houseCusps: number[];
  planets: AstroPlanetPosition[];
  aspects: AstroAspect[];
  engineVersion: string;
}

// ============================================================================
// 常量
// ============================================================================

const ZODIAC_NAMES = ["白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"];
const ZODIAC_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

const PLANET_DEFS: Array<{ body: Astronomy.Body; name: string; symbol: string }> = [
  { body: Astronomy.Body.Sun, name: "太阳", symbol: "☉" },
  { body: Astronomy.Body.Moon, name: "月亮", symbol: "☽" },
  { body: Astronomy.Body.Mercury, name: "水星", symbol: "☿" },
  { body: Astronomy.Body.Venus, name: "金星", symbol: "♀" },
  { body: Astronomy.Body.Mars, name: "火星", symbol: "♂" },
  { body: Astronomy.Body.Jupiter, name: "木星", symbol: "♃" },
  { body: Astronomy.Body.Saturn, name: "土星", symbol: "♄" },
  { body: Astronomy.Body.Uranus, name: "天王星", symbol: "♅" },
  { body: Astronomy.Body.Neptune, name: "海王星", symbol: "♆" },
  { body: Astronomy.Body.Pluto, name: "冥王星", symbol: "♇" },
];

const ASPECT_DEFS = [
  { type: "合相", symbol: "☌", angle: 0, orb: 8 },
  { type: "六合", symbol: "⚹", angle: 60, orb: 4 },
  { type: "刑相", symbol: "□", angle: 90, orb: 7 },
  { type: "拱相", symbol: "△", angle: 120, orb: 7 },
  { type: "冲相", symbol: "☍", angle: 180, orb: 8 },
];

// ============================================================================
// 工具函数
// ============================================================================

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

function signOf(lon: number): { index: number; name: string; symbol: string; degree: number } {
  const idx = Math.floor(norm360(lon) / 30) % 12;
  return { index: idx, name: ZODIAC_NAMES[idx], symbol: ZODIAC_SYMBOLS[idx], degree: norm360(lon) - idx * 30 };
}

/** 某时刻天体真分点黄道经度（含光行差与章动效应） */
function eclipticLonOfDate(body: Astronomy.Body, date: Date, eps: number): number {
  const geo = Astronomy.GeoVector(body, date, true); // J2000 平赤道坐标（含光行差）
  const eqd = Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(date), geo); // 真分点赤道坐标
  const { ra, dec } = Astronomy.EquatorFromVector(eqd); // ra 小时
  const alpha = ra * 15;
  const lon = Math.atan2(
    Math.sin(alpha * D2R) * Math.cos(eps * D2R) + Math.tan(dec * D2R) * Math.sin(eps * D2R),
    Math.cos(alpha * D2R)
  );
  return norm360(lon * R2D);
}

// ============================================================================
// 主入口：本命星盘计算
// ============================================================================

export function calcNatalChart(input: AstroInput): NatalChartResult {
  const { year, month, day, hour, minute, lat, lon } = input;
  const tz = input.tzOffset ?? 8;

  if (lat < -66 || lat > 66) {
    throw new Error("出生地纬度超出可计算范围（±66°，极圈内上升点不稳定），请检查出生地坐标");
  }

  // 出生地本地时间 → UTC 时刻
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0) - tz * 3600 * 1000;
  const date = new Date(utcMs);
  const time = Astronomy.MakeTime(date);

  // 真黄赤交角与当地恒星时
  const eps = Astronomy.e_tilt(time).tobl;
  const gastHours = Astronomy.SiderealTime(date);
  const lstDeg = norm360(gastHours * 15 + lon);
  const lstH = Math.floor(lstDeg / 15);
  const lstM = Math.floor(((lstDeg / 15) - lstH) * 60);

  // 天顶 MC：tan(λMC) = tan(RAMC)/cos(ε)
  const ramc = lstDeg;
  const mc = norm360(Math.atan2(Math.sin(ramc * D2R), Math.cos(ramc * D2R) * Math.cos(eps * D2R)) * R2D);

  // 上升点 ASC：tan(λASC) = -cos(RAMC) / (sinRAMC·cosε + tanφ·sinε)
  const asc = norm360(
    Math.atan2(
      Math.cos(ramc * D2R),
      -(Math.sin(ramc * D2R) * Math.cos(eps * D2R) + Math.tan(lat * D2R) * Math.sin(eps * D2R))
    ) * R2D
  );

  // 等宫制：以 ASC 为第 1 宫宫头，每宫 30°
  const houseCusps: number[] = [];
  for (let i = 0; i < 12; i++) houseCusps.push(norm360(asc + i * 30));

  // 行星位置与速度（±12h 差分）
  const planets: AstroPlanetPosition[] = PLANET_DEFS.map((def) => {
    const lonNow = eclipticLonOfDate(def.body, date, eps);
    const datePlus = new Date(utcMs + 12 * 3600 * 1000);
    const dateMinus = new Date(utcMs - 12 * 3600 * 1000);
    const lonPlus = eclipticLonOfDate(def.body, datePlus, eps);
    const lonMinus = eclipticLonOfDate(def.body, dateMinus, eps);
    let diff = lonPlus - lonMinus;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const speed = diff; // 度/日
    const s = signOf(lonNow);
    return {
      body: def.body,
      name: def.name,
      symbol: def.symbol,
      lon: lonNow,
      signIndex: s.index,
      signName: s.name,
      signDegree: s.degree,
      speed,
      retrograde: speed < 0,
      house: Math.floor(norm360(lonNow - asc) / 30) + 1,
    };
  });

  // 相位计算
  const aspects: AstroAspect[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      let d = Math.abs(planets[i].lon - planets[j].lon);
      if (d > 180) d = 360 - d;
      for (const ad of ASPECT_DEFS) {
        const orb = Math.abs(d - ad.angle);
        if (orb <= ad.orb) {
          aspects.push({
            planetA: planets[i].name,
            planetB: planets[j].name,
            type: ad.type,
            symbol: ad.symbol,
            angle: ad.angle,
            orb: Math.round(orb * 100) / 100,
          });
          break;
        }
      }
    }
  }
  aspects.sort((a, b) => a.orb - b.orb);

  const ascS = signOf(asc);
  const mcS = signOf(mc);

  return {
    input: { ...input, tzOffset: tz },
    utcTime: date.toISOString().replace("T", " ").slice(0, 16) + " UTC",
    siderealTime: `${String(lstH).padStart(2, "0")}时${String(lstM).padStart(2, "0")}分`,
    obliquity: Math.round(eps * 10000) / 10000,
    ascendant: asc,
    ascSignName: ascS.name,
    midheaven: mc,
    mcSignName: mcS.name,
    houseCusps,
    planets,
    aspects,
    engineVersion: ASTRO_ENGINE_VERSION,
  };
}

/** 常用城市经纬度预设（仅坐标数据，供前端选择器使用；项目方可在后台维护扩展） */
export const ASTRO_CITIES: Array<{ name: string; lat: number; lon: number; tz: number }> = [
  { name: "北京", lat: 39.9042, lon: 116.4074, tz: 8 },
  { name: "上海", lat: 31.2304, lon: 121.4737, tz: 8 },
  { name: "广州", lat: 23.1291, lon: 113.2644, tz: 8 },
  { name: "深圳", lat: 22.5431, lon: 114.0579, tz: 8 },
  { name: "杭州", lat: 30.2741, lon: 120.1551, tz: 8 },
  { name: "成都", lat: 30.5728, lon: 104.0668, tz: 8 },
  { name: "重庆", lat: 29.563, lon: 106.5516, tz: 8 },
  { name: "武汉", lat: 30.5928, lon: 114.3055, tz: 8 },
  { name: "西安", lat: 34.3416, lon: 108.9398, tz: 8 },
  { name: "南京", lat: 32.0603, lon: 118.7969, tz: 8 },
  { name: "天津", lat: 39.3434, lon: 117.3616, tz: 8 },
  { name: "长沙", lat: 28.2282, lon: 112.9388, tz: 8 },
  { name: "郑州", lat: 34.7466, lon: 113.6254, tz: 8 },
  { name: "福州", lat: 26.0745, lon: 119.2965, tz: 8 },
  { name: "厦门", lat: 24.4798, lon: 118.0894, tz: 8 },
  { name: "昆明", lat: 25.0389, lon: 102.7183, tz: 8 },
  { name: "贵阳", lat: 26.6477, lon: 106.6302, tz: 8 },
  { name: "南宁", lat: 22.817, lon: 108.3665, tz: 8 },
  { name: "哈尔滨", lat: 45.8038, lon: 126.5349, tz: 8 },
  { name: "沈阳", lat: 41.8057, lon: 123.4315, tz: 8 },
  { name: "济南", lat: 36.6512, lon: 117.1201, tz: 8 },
  { name: "青岛", lat: 36.0671, lon: 120.3826, tz: 8 },
  { name: "苏州", lat: 31.2989, lon: 120.5853, tz: 8 },
  { name: "合肥", lat: 31.8206, lon: 117.2272, tz: 8 },
  { name: "南昌", lat: 28.682, lon: 115.8579, tz: 8 },
  { name: "太原", lat: 37.8706, lon: 112.5489, tz: 8 },
  { name: "石家庄", lat: 38.0428, lon: 114.5149, tz: 8 },
  { name: "兰州", lat: 36.0611, lon: 103.8343, tz: 8 },
  { name: "乌鲁木齐", lat: 43.8256, lon: 87.6168, tz: 8 },
  { name: "拉萨", lat: 29.652, lon: 91.1721, tz: 8 },
  { name: "海口", lat: 20.0444, lon: 110.1999, tz: 8 },
  { name: "呼和浩特", lat: 40.8414, lon: 111.7519, tz: 8 },
  { name: "香港", lat: 22.3193, lon: 114.1694, tz: 8 },
  { name: "澳门", lat: 22.1987, lon: 113.5439, tz: 8 },
  { name: "台北", lat: 25.033, lon: 121.5654, tz: 8 },
];
