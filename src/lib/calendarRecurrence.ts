import { Lunar } from "lunar-javascript";
import { validCivilDate } from "../../backend_deploy/calendarRules";
export { validCivilDate,civilTimeEpoch } from "../../backend_deploy/calendarRules";

export interface BirthdayRules {
  leapMonth: "skip" | "regular";
  missingLunarDay: "skip" | "last-day";
  feb29: "skip" | "feb28" | "mar1";
}
export const DEFAULT_BIRTHDAY_RULES: BirthdayRules = { leapMonth: "skip", missingLunarDay: "skip", feb29: "skip" };
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
export const reminderDueAt = (occurrence: number, advanceMinutes: number) => occurrence - advanceMinutes * 60000;
