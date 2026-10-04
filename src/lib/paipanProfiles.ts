import type { PaipanRecord, MingzhuProfile } from "./nativePaipanStore";

export const TOOL_NAMES: Record<string, string> = {
 bazi:"八字", ziwei:"紫微斗数", qizheng:"七政四余", qimen:"奇门遁甲", liuyao:"六爻",
 meihua:"梅花易数", daliuren:"大六壬", xiaoliuren:"小六壬", chenggu:"称骨", hehun:"合婚",
 zeri:"择日", zeji:"择吉", phone:"手机号", carplate:"车牌", jiemeng:"解梦", qiming:"起名",
 taiyi:"太乙", xuankong:"玄空", astro:"占星", astrology:"占星", tarot:"塔罗", xingming:"姓名",
};
// These tools record birth dates. Event-chart times must never be imported as birthdays.
const BIRTH_TOOLS = new Set(["bazi", "ziwei", "qizheng", "chenggu", "astro", "astrology", "zhanxing", "name", "qiming"]);
export function profileFromRecord(r: PaipanRecord): MingzhuProfile | null {
 if (!BIRTH_TOOLS.has(r.tool)) return null;
 const i = r.input.birthInput && typeof r.input.birthInput === "object" ? r.input.birthInput as Record<string,unknown>
  : r.input.birth && typeof r.input.birth === "object" ? r.input.birth as Record<string,unknown> : r.input;
 if (i === r.input && (i.useTrueSolar === true || i.xiaLing === true)) return null;
 if ((r.tool === "name" || r.tool === "qiming") && i.calType === "lunar") return null;
 const dateParts = typeof i.birthDate === "string" ? i.birthDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) : null;
 const y = Number(dateParts?.[1] ?? i.year), m = Number(dateParts?.[2] ?? i.month), d = Number(dateParts?.[3] ?? i.day);
 if (!Number.isInteger(y) || m < 1 || m > 12 || d < 1 || d > 31) return null;
 const date = new Date(0); date.setFullYear(y, m-1, d); date.setHours(0,0,0,0);
 if (date.getMonth() !== m-1 || date.getDate() !== d) return null;
 const hour = Number(i.hour ?? i.birthHour), minute = Number(i.minute ?? i.birthMinute ?? 0);
 if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return null;
 const pad = (v:number) => String(v).padStart(2,"0");
 return {
  id: `record-${r.id}`, name: typeof r.input.name === "string" && r.input.name.trim() ? r.input.name : typeof i.name === "string" && i.name.trim() ? i.name : typeof r.input.fullName === "string" && r.input.fullName.trim() ? r.input.fullName : r.title,
  gender: (r.input.gender ?? i.gender) === "male" || (r.input.gender ?? i.gender) === "男" ? "男" : (r.input.gender ?? i.gender) === "female" || (r.input.gender ?? i.gender) === "女" ? "女" : null,
  birthDate: `${y}-${pad(m)}-${pad(d)}`, birthTime: `${pad(hour)}:${pad(minute)}`,
  birthPlace: typeof i.placeName === "string" ? i.placeName : typeof i.birthPlace === "string" ? i.birthPlace : null,
  extra: { ...i, calendar: "solar", sourceTool: r.tool, sourceRecordId: r.id },
  createdAt: r.createdAt, updatedAt: r.updatedAt,
 };
}
