import test from "node:test";
import assert from "node:assert/strict";
import { formatLiurenLunarDate } from "../src/algorithm-core/modules/daliuren";

test("liuren lunar label matches independently known festival and leap-month dates", () => {
  assert.equal(formatLiurenLunarDate(2026, 10, 18), "九月初九");
  assert.equal(formatLiurenLunarDate(2026, 2, 17), "正月初一");
  assert.equal(formatLiurenLunarDate(2024, 9, 17), "八月十五");
  assert.equal(formatLiurenLunarDate(2023, 3, 22), "闰二月初一");
});
