import { test } from "node:test";
import assert from "node:assert/strict";
import { solarToBazi } from "../src/algorithm-core/modules/bazi/base";
const { Solar } = require("lunar-javascript");

for (const [year, month, day, hour, gender] of [
  [1990, 5, 15, 12, "male"], [1990, 5, 15, 12, "female"],
  [2024, 1, 1, 0, "male"], [2000, 2, 29, 23, "female"],
] as const) {
  test(`Yun duration and calendar date remain distinct: ${year}-${month}-${day} ${gender}`, () => {
    const result = solarToBazi({ year, month, day, hour, minute: 0, gender });
    const ec = Solar.fromYmdHms(year, month, day, hour, 0, 0).getLunar().getEightChar();
    ec.setSect(1);
    const yun = ec.getYun(gender === "male" ? 1 : 0, 2);
    assert.equal(result.dayun.startDate, yun.getStartSolar().toYmd());
    assert.equal(result.dayun.startYear, yun.getStartSolar().getYear());
    assert.ok(result.dayun.startYear >= year && result.dayun.startYear <= year + 11);
    assert.ok(result.dayun.daysToJie >= 0 && result.dayun.daysToJie <= 33);
    assert.ok(result.dayun.qiyunText.includes(`出生后${yun.getStartYear()}年${yun.getStartMonth()}个月`));
    assert.ok(!result.dayun.qiyunText.includes("后-"));
    assert.deepEqual(result.pillars.map((p: {ganzhi: string}) => p.ganzhi), [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()]);
    assert.equal(result.dayun.dayunList[0].startYear, yun.getDaYun(11)[1].getStartYear());
    assert.equal(result.dayun.dayunList[0].ganzhi, yun.getDaYun(11)[1].getGanZhi());
  });
}
