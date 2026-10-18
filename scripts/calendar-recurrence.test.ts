import { test } from "node:test";
import assert from "node:assert/strict";
import { lunarBirthdayInYear, solarBirthdayInYear, civilTimeEpoch, reminderDueAt, DEFAULT_BIRTHDAY_RULES } from "../src/lib/calendarRecurrence";
import { getOccurrences, type CalendarEvent } from "../src/lib/calendarEventsStore";

const event = (patch: Partial<CalendarEvent> = {}): CalendarEvent => ({ id:"fixture",userId:"test",type:"birthday",title:"本地测试",dateMode:"solar",year:2024,month:2,day:29,repeat:"yearly",reminders:[{offsetMinutes:1440}],paused:false,createdAt:"",updatedAt:"",eventTime:"09:00",timeZone:"Asia/Shanghai",...patch });
test("lunar leap month and missing day never silently become another birthday", () => {
  assert.deepEqual(lunarBirthdayInYear(2023,-2,1),{y:2023,m:3,d:22});
  assert.equal(lunarBirthdayInYear(2024,-2,1),null);
  assert.deepEqual(lunarBirthdayInYear(2024,-2,1,{...DEFAULT_BIRTHDAY_RULES,leapMonth:"regular"}),{y:2024,m:3,d:10});
  assert.equal(lunarBirthdayInYear(2023,-2,30),null);
  assert.deepEqual(lunarBirthdayInYear(2023,-2,30,{...DEFAULT_BIRTHDAY_RULES,missingLunarDay:"last-day"}),{y:2023,m:4,d:19});
});
test("Feb 29 follows saved skip/Feb 28/March 1 rules; leap years retain Feb 29", () => {
  assert.equal(solarBirthdayInYear(2025,2,29),null);
  assert.deepEqual(solarBirthdayInYear(2025,2,29,"feb28"),{y:2025,m:2,d:28});
  assert.deepEqual(solarBirthdayInYear(2025,2,29,"mar1"),{y:2025,m:3,d:1});
  assert.deepEqual(solarBirthdayInYear(2028,2,29,"feb28"),{y:2028,m:2,d:29});
});
test("event time uses explicit zone, DST gaps skip and repeated times choose first", () => {
  assert.equal(civilTimeEpoch(2026,3,8,2,30,"America/New_York"),null);
  assert.equal(civilTimeEpoch(2026,11,1,1,30,"America/New_York"),Date.UTC(2026,10,1,5,30));
  assert.equal(civilTimeEpoch(2026,10,19,9,0,"Asia/Shanghai"),Date.UTC(2026,9,19,1));
  assert.equal(civilTimeEpoch(2026,10,19,9,0,"invalid-zone"),null);
  assert.equal(reminderDueAt(Date.UTC(2026,9,19,1),1440),Date.UTC(2026,9,18,1));
});
test("custom months use calendar months, lunar years deduplicate, paused/completed stop reminders", () => {
  const monthly=event({year:2026,month:1,day:31,repeat:"custom",customInterval:1,customUnit:"month"});
  assert.deepEqual(getOccurrences(monthly,2026,1,1,90).map(o=>[o.m,o.d]),[[1,31],[2,28],[3,31]]);
  const lunar=event({year:2023,month:3,day:22,dateMode:"lunar",lunarMonth:-2,lunarDay:1,birthdayRules:{...DEFAULT_BIRTHDAY_RULES,leapMonth:"regular"}});
  assert.deepEqual(getOccurrences(lunar,2024,1,1,120).map(o=>[o.y,o.m,o.d]),[[2024,3,10]]);
  assert.equal(getOccurrences({...monthly,paused:true},2026,1,1,90).length,0);
  assert.equal(getOccurrences({...monthly,completed:true},2026,1,1,90).length,0);
});
