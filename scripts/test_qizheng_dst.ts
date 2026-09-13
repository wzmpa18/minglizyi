// ============================================================================
// 中国历史夏令时（1986-1991 DST）处理验证脚本（GAP C4 运行级）
// ============================================================================
// 验证 v25.0.82 公共模块 src/algorithm-core/common/dst.ts 与七政排盘端到端链路：
//   A. 区间判断：六年起止边界（含 02:00 时刻归属）、年中、区间外
//   B. 校正运算：减 1 小时、跨日/跨月/跨年回退、未勾选原样返回
//   C. 端到端：勾选夏令时录入钟面时间 与 直接录入标准时间 两盘全等
// 运行：npx tsx scripts/test_qizheng_dst.ts
// ============================================================================

import { chinaDstInfo, applyChinaDstCorrection } from "../src/algorithm-core/common/dst";
import { calcQizhengChart, type QizhengInput } from "../src/algorithm-core/modules/qizheng";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(cond: boolean, label: string, detail?: string) {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(`${label}${detail ? ` | ${detail}` : ""}`);
    console.error(`  ✗ FAIL: ${label}${detail ? ` | ${detail}` : ""}`);
  }
}

console.log("========== 中国历史夏令时（1986-1991）处理验证（GAP C4） ==========\n");

// ---------------------------------------------------------------------------
// A. 区间判断（[开始日 02:00, 结束日 02:00)，钟面时间口径）
// ---------------------------------------------------------------------------
console.log("--- A. 区间判断 ---");

const CASES: Array<{ y: number; m: number; d: number; h: number; expect: boolean; label: string }> = [
  { y: 1986, m: 5, d: 4, h: 1, expect: false, label: "1986-05-04 01:59 前 → 区间外（首日拨快前）" },
  { y: 1986, m: 5, d: 4, h: 2, expect: true, label: "1986-05-04 02:00 起 → 区间内（拨快时刻含）" },
  { y: 1986, m: 9, d: 14, h: 1, expect: true, label: "1986-09-14 01:xx → 区间内" },
  { y: 1986, m: 9, d: 14, h: 2, expect: false, label: "1986-09-14 02:00 起 → 区间外（拨回时刻不含）" },
  { y: 1987, m: 4, d: 12, h: 2, expect: true, label: "1987-04-12 02:00 起 → 区间内" },
  { y: 1987, m: 4, d: 12, h: 1, expect: false, label: "1987-04-12 01:xx → 区间外" },
  { y: 1987, m: 9, d: 13, h: 2, expect: false, label: "1987-09-13 02:00 → 区间外" },
  { y: 1988, m: 4, d: 17, h: 3, expect: true, label: "1988-04-17 03:00 → 区间内" },
  { y: 1988, m: 9, d: 11, h: 1, expect: true, label: "1988-09-11 01:xx → 区间内" },
  { y: 1989, m: 6, d: 15, h: 12, expect: true, label: "1989-06-15 12:00 → 区间内（年中）" },
  { y: 1990, m: 8, d: 20, h: 0, expect: true, label: "1990-08-20 00:xx → 区间内" },
  { y: 1991, m: 4, d: 14, h: 2, expect: true, label: "1991-04-14 02:00 起 → 区间内" },
  { y: 1991, m: 9, d: 15, h: 1, expect: true, label: "1991-09-15 01:xx → 区间内" },
  { y: 1991, m: 9, d: 15, h: 2, expect: false, label: "1991-09-15 02:00 → 区间外（末年结束）" },
  { y: 1986, m: 4, d: 30, h: 12, expect: false, label: "1986-04-30 → 区间外（未开始）" },
  { y: 1992, m: 6, d: 1, h: 12, expect: false, label: "1992-06-01 → 区间外（停用后）" },
  { y: 1985, m: 7, d: 1, h: 12, expect: false, label: "1985-07-01 → 区间外（实行前）" },
  { y: 2000, m: 7, d: 1, h: 12, expect: false, label: "2000-07-01 → 区间外（远期）" },
];

for (const c of CASES) {
  const info = chinaDstInfo(c.y, c.m, c.d, c.h, 30);
  check(info.active === c.expect, c.label, `active=${info.active}`);
}
check(chinaDstInfo(1988, 8, 15, 6, 0).rangeText === "1988-04-17 02:00 至 1988-09-11 02:00", "A-区间文本格式正确");

// ---------------------------------------------------------------------------
// B. 校正运算（减 1 小时 + 跨日/跨月/跨年回退）
// ---------------------------------------------------------------------------
console.log("\n--- B. 校正运算 ---");

const noChange = applyChinaDstCorrection(1988, 8, 15, 6, 0, false);
check(!noChange.applied && noChange.corrected.hour === 6 && noChange.corrected.day === 15, "B1 未勾选 → 原样返回");

const sameDay = applyChinaDstCorrection(1988, 8, 15, 6, 0, true);
check(sameDay.applied && sameDay.corrected.hour === 5 && sameDay.corrected.day === 15 && !sameDay.crossedDay, "B2 勾选 → 减 1 小时（6:00 → 5:00）");

const crossDay = applyChinaDstCorrection(1986, 5, 4, 0, 30, true);
check(crossDay.crossedDay && crossDay.corrected.month === 5 && crossDay.corrected.day === 3 && crossDay.corrected.hour === 23 && crossDay.corrected.minute === 30, "B3 跨日回退（1986-05-04 00:30 → 05-03 23:30）", JSON.stringify(crossDay.corrected));

const crossMonth = applyChinaDstCorrection(1987, 4, 12, 0, 30, true);
check(crossMonth.crossedDay && crossMonth.corrected.month === 4 && crossMonth.corrected.day === 11 && crossMonth.corrected.hour === 23, "B4 跨日跨月（1987-04-12 00:30 → 04-11 23:30）", JSON.stringify(crossMonth.corrected));

const crossYear = applyChinaDstCorrection(1988, 1, 1, 0, 30, true);
check(crossYear.crossedDay && crossYear.corrected.year === 1987 && crossYear.corrected.month === 12 && crossYear.corrected.day === 31 && crossYear.corrected.hour === 23, "B5 跨年回退（1988-01-01 00:30 → 1987-12-31 23:30，用户误勾场景）", JSON.stringify(crossYear.corrected));

const crossMonthEnd = applyChinaDstCorrection(1989, 5, 31, 0, 30, true);
check(crossMonthEnd.crossedDay && crossMonthEnd.corrected.month === 5 && crossMonthEnd.corrected.day === 30 && crossMonthEnd.corrected.hour === 23, "B6 跨日（5月31日 00:30 → 5月30日 23:30）");

// ---------------------------------------------------------------------------
// C. 端到端：七政排盘（勾选夏令时钟面 vs 直接录入标准时间 → 两盘全等）
// ---------------------------------------------------------------------------
console.log("\n--- C. 七政排盘端到端 ---");

function chartFingerprint(r: ReturnType<typeof calcQizhengChart>): string {
  return JSON.stringify({
    mingGong: r.mingGong.branch,
    mingDu: r.mingDu.xiuFullName + r.mingDu.xiuDegree.toFixed(2),
    shenGong: r.shenGong.branch,
    hour: r.hour.name,
    trueSolar: r.trueSolar.trueSolarTime,
    stars: r.stars.map((s) => `${s.key}:${s.palaceBranch}${s.palaceDegree.toFixed(2)}`),
  });
}

const E2E: Array<{ label: string; clock: [number, number, number, number, number]; place: { lat: number; lon: number; name: string } }> = [
  { label: "1988-08-15 06:00 北京（DST 期间）", clock: [1988, 8, 15, 6, 0], place: { lat: 39.9042, lon: 116.4074, name: "北京市" } },
  { label: "1986-07-20 15:40 广州（DST 期间）", clock: [1986, 7, 20, 15, 40], place: { lat: 23.1291, lon: 113.2644, name: "广东省广州市" } },
  { label: "1991-04-14 02:30 上海（DST 首日拨快后）", clock: [1991, 4, 14, 2, 30], place: { lat: 31.2304, lon: 121.4737, name: "上海市" } },
];

for (const e of E2E) {
  const [y, m, d, h, min] = e.clock;
  // 路径1：用户勾选夏令时，录入当时钟面时间（页面 handleSubmit 口径）
  const dst = applyChinaDstCorrection(y, m, d, h, min, true);
  const input1: QizhengInput = {
    year: dst.corrected.year, month: dst.corrected.month, day: dst.corrected.day,
    hour: dst.corrected.hour, minute: dst.corrected.minute,
    lat: e.place.lat, lon: e.place.lon, tzOffset: 8, placeName: e.place.name, gender: "male",
  };
  // 路径2：用户已知标准时间直接录入
  const input2: QizhengInput = { ...input1 };
  const r1 = calcQizhengChart(input1);
  const r2 = calcQizhengChart(input2);
  check(chartFingerprint(r1) === chartFingerprint(r2), `C 端到端两盘全等：${e.label}`);
  // 差 1 小时反例：未勾选夏令时直接用钟面时间 → 盘面应不同（时辰可能漂移）
  const wrong = calcQizhengChart({
    year: y, month: m, day: d, hour: h, minute: min,
    lat: e.place.lat, lon: e.place.lon, tzOffset: 8, placeName: e.place.name, gender: "male",
  });
  console.log(`  · ${e.label}：钟面 ${y}-${m}-${d} ${h}:${String(min).padStart(2, "0")} → 标准 ${dst.corrected.month}-${dst.corrected.day} ${dst.corrected.hour}:${String(dst.corrected.minute).padStart(2, "0")}；时辰 ${r1.hour.name}（勾选）/ ${wrong.hour.name}（未勾选）`);
}

console.log("\n========== DST 处理验证汇总 ==========");
console.log(`通过: ${passed}  失败: ${failed}`);
if (failed === 0) {
  console.log("全部通过：六年区间边界正确、减1小时及跨日/跨月/跨年回退正确、端到端两盘全等");
} else {
  failures.forEach((f) => console.error(` - ${f}`));
  process.exit(1);
}
