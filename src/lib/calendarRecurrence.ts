import { Lunar, Solar } from "lunar-javascript";

export interface BirthdayRules {
  leapMonth: "skip" | "regular";
  missingLunarDay: "skip" | "last-day";
  feb29: "skip" | "feb28" | "mar1";
}
export const DEFAULT_BIRTHDAY_RULES: BirthdayRules = { leapMonth: "skip", missingLunarDay: "skip", feb29: "skip" };
export function validCivilDate(year:number,month:number,day:number) {
  if(!Number.isInteger(year)||year<1||year>3000||!Number.isInteger(month)||month<1||month>12||!Number.isInteger(day)||day<1)return false;
  const leap=year%4===0 && (year%100!==0 || year%400===0);
  return day <= [31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
}
export function lunarBirthdayInYear(year: number, month: number, day: number, rules: BirthdayRules = DEFAULT_BIRTHDAY_RULES) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || !month || Math.abs(month) > 12 || day < 1 || day > 30) return null;
  let first;
  try { first = Lunar.fromYmd(year, month, 1).getSolar(); }
  catch {
    if (month >= 0 || rules.leapMonth !== "regular") return null;
    try { first = Lunar.fromYmd(year, -month, 1).getSolar(); } catch { return null; }
  }
  const actualMonth = first.getLunar().getMonth();
  let solar = first.next(day - 1);
  if (solar.getLunar().getMonth() !== actualMonth) {
    if (rules.missingLunarDay !== "last-day") return null;
    solar = first.next(28);
  }
  return { y: solar.getYear(), m: solar.getMonth(), d: solar.getDay() };
}
export function solarBirthdayInYear(year: number, month: number, day: number, rule: BirthdayRules["feb29"] = "skip") {
  if(validCivilDate(year,month,day)) return { y:year,m:month,d:day };
  else {
    if (month !== 2 || day !== 29 || rule === "skip") return null;
    return rule === "feb28" ? { y: year, m: 2, d: 28 } : { y: year, m: 3, d: 1 };
  }
}
/** Resolve a civil time using the event's IANA zone. DST gaps are not silently
 * moved to a different hour. Repeated times use the first valid occurrence. */
export function civilTimeEpoch(y: number, m: number, d: number, hour: number, minute: number, zone: string): number | null {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  try {
    if(!validCivilDate(y,m,d))return null;
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const target = Date.UTC(y,m-1,d,hour,minute), candidates = new Set<number>();
    for (const delta of [-86400000,0,86400000]) {
      const guess = target + delta;
      const p = Object.fromEntries(formatter.formatToParts(guess).map(x=>[x.type,x.value]));
      const offset = Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second) - guess;
      const epoch = target - offset;
      const q = Object.fromEntries(formatter.formatToParts(epoch).map(x=>[x.type,x.value]));
      if (+q.year===y && +q.month===m && +q.day===d && +q.hour===hour && +q.minute===minute) candidates.add(epoch);
    }
    return candidates.size ? Math.min(...candidates) : null;
  } catch { return null; }
}
export const reminderDueAt = (occurrence: number, advanceMinutes: number) => occurrence - advanceMinutes * 60000;
