import { Body, Equator, Horizon, Illumination, MoonPhase, Observer, SearchRiseSet, SearchSunLongitude, SunPosition } from "astronomy-engine";

export const ASTRONOMY_SOURCE = "https://github.com/cosinekitty/astronomy/tree/v2.1.19/source/js";
export const SKY_BODIES = [
  { body: Body.Sun, name: "太阳", color: "#fbbf24" },
  { body: Body.Moon, name: "月球", color: "#e2e8f0" },
  { body: Body.Mercury, name: "水星", color: "#a8a29e" },
  { body: Body.Venus, name: "金星", color: "#fde68a" },
  { body: Body.Mars, name: "火星", color: "#fb7185" },
  { body: Body.Jupiter, name: "木星", color: "#fdba74" },
  { body: Body.Saturn, name: "土星", color: "#d6b982" },
  { body: Body.Uranus, name: "天王星", color: "#67e8f9" },
  { body: Body.Neptune, name: "海王星", color: "#818cf8" },
] as const;

export function chinaTimeInput(date: Date) { return new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 16); }
export function parseChinaTime(input: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) throw new Error("请填写完整的日期和时间。");
  const date = new Date(input + ":00+08:00");
  const year = Number(input.slice(0, 4));
  if (!Number.isFinite(date.getTime()) || year < 1 || year > 3000 || chinaTimeInput(date) !== input) throw new Error("请选择公元1—3000年内的有效日期和时间。");
  return date;
}
export function formatChinaTime(date: Date) {
  // Fixed UTC+8 even before modern standard time; Asia/Shanghai uses historic
  // local mean time for early years and would contradict the input label.
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Etc/GMT-8", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

/** Zenith-centred azimuthal equidistant diagram, looking UP: N top, E left. */
export function skyDiagramPoint(azimuth: number, altitude: number) {
  if (!Number.isFinite(azimuth) || !Number.isFinite(altitude) || altitude < 0 || altitude > 90) throw new Error("Only above-horizon points belong in the sky diagram");
  const radius = 140 * (90 - altitude) / 90, angle = azimuth * Math.PI / 180;
  return { x: 180 - radius * Math.sin(angle), y: 180 - radius * Math.cos(angle) };
}

export function calculateStudySky(date: Date, latitude: number, longitude: number) {
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new Error("请检查时间、纬度（-90至90）和经度（-180至180）。");
  const observer = new Observer(latitude, longitude, 0);
  const bodies = SKY_BODIES.map(def => {
    const equatorial = Equator(def.body, date, observer, true, true);
    const horizontal = Horizon(date, observer, equatorial.ra, equatorial.dec, "normal");
    const light = Illumination(def.body, date);
    return { ...def, altitude: horizontal.altitude, azimuth: horizontal.azimuth, ra: equatorial.ra, dec: equatorial.dec, magnitude: light.mag, illuminated: light.phase_fraction };
  });
  const start = new Date(chinaTimeInput(date).slice(0, 10) + "T00:00:00+08:00");
  const end = start.getTime() + 86400000;
  const events = [Body.Sun, Body.Moon].map(body => {
    const event = (direction: 1 | -1) => {
      const found = SearchRiseSet(body, observer, direction, start, 1);
      return found && found.date.getTime() < end ? found.date : null;
    };
    return { body, rise: event(1), set: event(-1) };
  });
  return { bodies, events, moonPhase: MoonPhase(date), sunLongitude: SunPosition(date).elon, daylight: bodies[0].altitude >= 0 };
}

const QI_MAIN = ["厥阴风木", "少阴君火", "少阳相火", "太阴湿土", "阳明燥金", "太阳寒水"] as const;
const QI_GUEST = ["厥阴风木", "少阴君火", "太阴湿土", "少阳相火", "阳明燥金", "太阳寒水"] as const;
const TERM_BOUNDARIES = [
  { name: "大寒", month: 0, angle: 300 }, { name: "春分", month: 2, angle: 0 },
  { name: "小满", month: 4, angle: 60 }, { name: "大暑", month: 6, angle: 120 },
  { name: "秋分", month: 8, angle: 180 }, { name: "小雪", month: 10, angle: 240 },
];
const mod = (value: number, divisor: number) => (value % divisor + divisor) % divisor;
function term(year: number, index: number) {
  const def = TERM_BOUNDARIES[index];
  // Narrow, known bracket is required by SearchSunLongitude, not a 365-day search.
  const found = SearchSunLongitude(def.angle, new Date(Date.UTC(year, def.month, 15)), 15);
  if (!found) throw new Error("节气计算未取得结果，请更换年份后重试。");
  return { ...def, date: found.date };
}

/** Explicit study convention: Dahan-to-Dahan cycle, solar-longitude term boundaries.
 * Not a meteorological forecast, diagnostic model, or reconstruction of ancient ke time.
 */
export function calculateYunqiStudy(year: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 2099) throw new Error("年份范围为1900—2099。");
  const stemIndex = mod(year - 4, 10), branchIndex = mod(year - 4, 12);
  const stem = "甲乙丙丁戊己庚辛壬癸"[stemIndex], branch = "子丑寅卯辰巳午未申酉戌亥"[branchIndex];
  const earth = ["土", "金", "水", "木", "火"][stemIndex % 5];
  const siIndex = [1, 2, 3, 4, 5, 0][branchIndex % 6];
  const boundaries = [...TERM_BOUNDARIES.map((_, i) => term(year, i)), term(year + 1, 0)];
  const phases = QI_MAIN.map((mainQi, index) => ({
    index, label: ["初之气", "二之气", "三之气", "四之气", "五之气", "终之气"][index],
    mainQi, guestQi: QI_GUEST[mod(siIndex - 2 + index, 6)],
    start: boundaries[index].date, end: boundaries[index + 1].date,
    startTerm: boundaries[index].name, endTerm: boundaries[index + 1].name,
  }));
  return { year, ganzhi: stem + branch, stem, branch, annualMovement: earth + "运" + (stemIndex % 2 === 0 ? "太过" : "不及"), siTian: QI_GUEST[siIndex], zaiQuan: QI_GUEST[(siIndex + 3) % 6], phases };
}

export function yunqiPhaseAt(study: ReturnType<typeof calculateYunqiStudy>, date: Date) {
  return study.phases.findIndex(phase => date >= phase.start && date < phase.end);
}
