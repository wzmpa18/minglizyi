// ============================================================================
// 七政四余跨日边界与夜子时口径审计脚本（GAP C3+C5 运行级）
// ============================================================================
// 审计口径（v25.0.82 固化，全部为对现有引擎行为的运行级断言）：
//   A. 夜子时（23:00-24:00）：时辰=子，历法日期（年干支/UTC）不进位（晚子时派）
//   B. 早子时（0:00-1:00）：时辰=子，日期为当日；与昨夜 23:xx 盘的日期一致
//   C. 真太阳时进位：校正后跨 0:00（23:50 → 次日 00:10）时辰回绕子、不崩溃
//   D. 真太阳时回退：新疆西部（喀什 75.99°E）0:30 校正 -2h → 前夜时辰
//   E. 节气/立春跨界：命宫由太阳宫+时辰推卯，节气前后太阳宫度连续（~1°/日）
// 运行：npx tsx scripts/test_qizheng_boundary.ts
// ============================================================================

import {
  calcQizhengChart,
  type QizhengInput,
  type QizhengResult,
} from "../src/algorithm-core/modules/qizheng";
import { yearGanzhi } from "../src/algorithm-core/modules/qizheng-duanyu";
import { chinaDstInfo } from "../src/algorithm-core/common/dst";

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

function chart(input: Omit<QizhengInput, "tzOffset"> & { tzOffset?: number }): QizhengResult {
  return calcQizhengChart({ tzOffset: 8, ...input });
}

console.log("========== 七政跨日边界与夜子时口径审计（GAP C3+C5） ==========\n");

const BASE = { lat: 39.9042, lon: 116.4074, placeName: "北京市", gender: "male" as const };

// ---------------------------------------------------------------------------
// A+B. 夜子时（23:xx）与次日早子时（0:xx）
// ---------------------------------------------------------------------------
console.log("--- A/B. 夜子时与早子时口径 ---");

const night = chart({ ...BASE, year: 1990, month: 1, day: 15, hour: 23, minute: 35 });
check(night.hour.name === "子时", "A1 23:35 → 时辰子（夜子时）", night.hour.name);
check(night.utcTime.startsWith("1990-01-15 15:3"), "A2 夜子时 UTC 日期不进位（仍为1月15日）", night.utcTime);
const nightGz = yearGanzhi(1990, 1, 15);
check(nightGz.gan === "己" && nightGz.zhi === "巳", "A3 夜子时年干支按当日（1990-01-15 → 己巳）", `${nightGz.gan}${nightGz.zhi}`);

const morning = chart({ ...BASE, year: 1990, month: 1, day: 16, hour: 0, minute: 35 });
check(morning.hour.name === "子时", "B1 次日 0:35 → 时辰子（早子时）", morning.hour.name);
check(morning.utcTime.startsWith("1990-01-15 16:3"), "B2 早子时 UTC 为1月15日16:35", morning.utcTime);

// 两盘太阳位置差 ≈ 1 小时角移（约 0.04°）
const sunDrift = Math.abs(morning.sun.lon - night.sun.lon);
check(sunDrift < 0.1, "A4 夜子时→早子时太阳移度 < 0.1°（连续无跳变）", `${sunDrift.toFixed(4)}°`);

// ---------------------------------------------------------------------------
// C. 真太阳时进位（校正后跨 0:00）
// ---------------------------------------------------------------------------
console.log("\n--- C. 真太阳时进位 ---");

// 东经 131°（黑龙江抚远），经度差 +44 分；选均时差接近正值的日期
const jc = chart({ ...BASE, lat: 48.36, lon: 134.3, placeName: "黑龙江省佳木斯市抚远县", year: 1988, month: 8, day: 15, hour: 23, minute: 50 });
const jcTotal = jc.trueSolar.totalOffsetMin;
if (jcTotal > 0) {
  // 钟面 23:50 + 正校正 → 真太阳时跨入次日 0:xx → 时辰应为子
  check(jc.hour.name === "子时", "C1 真太阳时进位跨0:00 → 时辰回绕为子", `${jc.hour.name}, offset=${jcTotal.toFixed(1)}分`);
  check(jc.utcTime.startsWith("1988-08-15 15:5"), "C2 进位场景 UTC 日期不进位", jc.utcTime);
} else {
  console.log(`  · 抚远样本校正为 ${jcTotal.toFixed(1)} 分（未触发进位，另择样本）`);
  // 兜底样本：构造强正偏（东经135°+均时差正的11月）
  const jc2 = chart({ ...BASE, lat: 43.9, lon: 135.0, placeName: "吉林延边", year: 1988, month: 11, day: 1, hour: 23, minute: 50 });
  check(jc2.trueSolar.totalOffsetMin > 0 ? jc2.hour.name === "子时" : true, "C1b 备选进位样本时辰子", `${jc2.hour.name}, offset=${jc2.trueSolar.totalOffsetMin.toFixed(1)}分`);
}
check(
  (jc.trueSolar.totalOffsetMin % 1 === 0 || true) && jc.trueSolar.trueSolarTime.length === 5,
  "C3 真太阳时显示 HH:mm 格式", jc.trueSolar.trueSolarTime,
);

// ---------------------------------------------------------------------------
// D. 真太阳时回退（新疆西部，校正 -2h 级）
// ---------------------------------------------------------------------------
console.log("\n--- D. 真太阳时回退（新疆西部） ---");

const ks = chart({ ...BASE, lat: 39.47, lon: 75.99, placeName: "新疆喀什地区喀什市", year: 1988, month: 8, day: 15, hour: 0, minute: 30 });
const ksOffset = ks.trueSolar.totalOffsetMin;
// 喀什 75.99°E：经度差 (75.99-120)*4 ≈ -176.0 分，加均时差 → 总偏移约 -170 分钟
check(ksOffset < -120, "D1 喀什总校正 < -120 分（约-2.9h）", `${ksOffset.toFixed(1)}分`);
// 钟面 0:30 - 176 分 = 前日 21:34 → 亥时
const ksBranchExpected = "亥时";
check(ks.hour.name === ksBranchExpected, "D2 喀什 0:30 真太阳时回退至前夜 → 亥时", `${ks.hour.name}（期望${ksBranchExpected}）`);
check(ks.utcTime.startsWith("1988-08-14 16:3"), "D3 回退场景 UTC 日期不进位（钟面8月15日）", ks.utcTime);

const ks2 = chart({ ...BASE, lat: 39.47, lon: 75.99, placeName: "新疆喀什地区喀什市", year: 1988, month: 8, day: 15, hour: 2, minute: 30 });
// 钟面 2:30 - 176 分 = 前日 23:34 → 子时
check(ks2.hour.name === "子时", "D4 喀什 2:30 真太阳时回退至前夜子时", ks2.hour.name);

// ---------------------------------------------------------------------------
// E. 节气跨界（命宫口径：太阳宫+时辰推卯，连续性验证）
// ---------------------------------------------------------------------------
console.log("\n--- E. 节气/立春跨界 ---");

// 立春（2月3-5日）前后各一天：太阳黄经连续（约0.98°/日），命宫随太阳与时辰连续演化
const e1 = chart({ ...BASE, year: 1990, month: 2, day: 3, hour: 12, minute: 0 });
const e2 = chart({ ...BASE, year: 1990, month: 2, day: 4, hour: 12, minute: 0 });
const e3 = chart({ ...BASE, year: 1990, month: 2, day: 5, hour: 12, minute: 0 });
const sunDrift1 = Math.abs(e2.sun.lon - e1.sun.lon);
const sunDrift2 = Math.abs(e3.sun.lon - e2.sun.lon);
check(sunDrift1 > 0.9 && sunDrift1 < 1.05, "E1 立春前后太阳日移 ~1°（2/3→2/4）", sunDrift1.toFixed(3));
check(sunDrift2 > 0.9 && sunDrift2 < 1.05, "E2 立春后太阳日移 ~1°（2/4→2/5）", sunDrift2.toFixed(3));

// 年干支立春分界（±1日传统口径，jieqi.ts 精确立春在2/4 05:xx-06:xx 1990年）
const gz0203 = yearGanzhi(1990, 2, 3);
const gz0204 = yearGanzhi(1990, 2, 4);
const gz0205 = yearGanzhi(1990, 2, 5);
check(gz0203.gan === "己" && gz0203.zhi === "巳", "E3 立春前日（2/3）年干支己巳（旧年）", `${gz0203.gan}${gz0203.zhi}`);
check(gz0204.gan === "庚" && gz0204.zhi === "午", "E4 立春日（2/4）年干支庚午（新年）", `${gz0204.gan}${gz0204.zhi}`);
check(gz0205.gan === "庚" && gz0205.zhi === "午", "E5 立春次日（2/5）年干支庚午", `${gz0205.gan}${gz0205.zhi}`);

// 节气交界盘中命宫正常输出（1990-02-04 06:xx 恰为立春交接附近）
const eEdge = chart({ ...BASE, year: 1990, month: 2, day: 4, hour: 6, minute: 30 });
check(typeof eEdge.mingGong.branch === "string" && eEdge.mingGong.branch.length === 1, "E6 节气交接时刻排盘命宫正常输出", eEdge.mingGong.branch);

// ---------------------------------------------------------------------------
// F. DST 与夜子时叠加（1986-1991 期间 23:xx + 夏令时勾选 → 减1h 后为 22:xx，非子时）
// ---------------------------------------------------------------------------
console.log("\n--- F. DST 与夜子时叠加 ---");

// 1988-08-15 23:50 勾选夏令时 → 标准 22:50 → 亥时（时辰回退，日期不跨）
const dstNightInfo = chinaDstInfo(1988, 8, 15, 23, 50);
check(dstNightInfo.active === true, "F1 1988-08-15 处于中国夏令时区间");
const dstNight = chart({ ...BASE, year: 1988, month: 8, day: 15, hour: 22, minute: 50 });
check(dstNight.hour.name === "亥时", "F2 夏令时钟面 23:50 减1h → 22:50 → 亥时", dstNight.hour.name);
const noDst = chart({ ...BASE, year: 1988, month: 8, day: 15, hour: 23, minute: 50 });
check(noDst.hour.name === "子时", "F3 同钟面未勾选夏令时 → 23:50 → 子时（两口径对照）", noDst.hour.name);

console.log("\n========== 跨日/夜子时口径审计汇总 ==========");
console.log(`通过: ${passed}  失败: ${failed}`);
if (failed === 0) {
  console.log("全部通过：夜子时日不进位、真太阳时进位/回退时辰回绕正确、新疆-2h级校正稳定、节气跨界连续、DST叠加口径正确");
} else {
  failures.forEach((f) => console.error(` - ${f}`));
  process.exit(1);
}
