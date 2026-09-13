// ============================================================================
// 七政四余历史排盘 Profile 持久化验证脚本（GAP B2/F8 运行级）
// ============================================================================
// 验证 v25.0.82 页面 data 增补的 star_system / calculation_profile /
// algorithm_version 三字段链路（与 src/app/yixue/qizheng/page.tsx 同构模拟）：
//   A. 保存侧：saveRecord data 的 Profile 字段与引擎输出一致
//   B. 恢复侧（新记录）：按当时 Profile 重排，关键盘面字段与原盘全等
//   C. 兜底（旧记录）：无新字段的存量 data 从 input 兜底恢复，同样全等
//   D. 反例：若错用默认 Profile（今制/遇卯安命/10岁）恢复恒星制+日出定命+9岁盘，
//      盘面应发生漂移——证明"按当时 Profile 恢复"不可省略
// 运行：npx tsx scripts/test_qizheng_profile.ts
// ============================================================================

import {
  calcQizhengChart,
  QIZHENG_ENGINE_VERSION,
  type QizhengInput,
  type QizhengResult,
  type StarFrame,
  type MingGongMode,
} from "../src/algorithm-core/modules/qizheng";

let passed = 0;
let failed = 0;
let defaultProfileDriftCount = 0;
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

/** 与页面 saveRecord 完全同构的 data 构造（v25.0.82） */
function buildRecordData(res: QizhengResult) {
  return {
    input: res.input,
    star_system: res.frame,
    calculation_profile: {
      ming_mode: res.input.mingGongMode,
      dongwei_start: res.dongwei.startBase,
      zhen_ta: true,
    },
    algorithm_version: res.engineVersion,
    mingGong: res.mingGong.branch,
    shenGong: res.shenGong.branch,
    mingDu: `${res.mingDu.xiuFullName}${res.mingDu.xiuDegree.toFixed(1)}°`,
    chuxian: res.dongwei.chuxianText,
  };
}

/** 与页面 mount prefill 恢复逻辑同构（v25.0.82）：优先显式 Profile 字段，兜底 input */
function restoreFromRecord(data: ReturnType<typeof buildRecordData>): {
  frame: StarFrame; ming: MingGongMode; dw: 9 | 10; input: QizhengInput;
} {
  const histInput = data.input as QizhengInput;
  const histProfile = (data.calculation_profile ?? {}) as {
    ming_mode?: MingGongMode; dongwei_start?: 9 | 10;
  };
  const histFrame: StarFrame | undefined =
    data.star_system === "sidereal" || data.star_system === "tropical"
      ? data.star_system
      : histInput?.frame;
  const histMing: MingGongMode | undefined = histProfile.ming_mode ?? histInput?.mingGongMode;
  const histDw: 9 | 10 | undefined = histProfile.dongwei_start ?? histInput?.dongweiStart;
  return {
    frame: histFrame ?? "tropical",
    ming: histMing ?? "mao",
    dw: histDw ?? 10,
    input: histInput,
  };
}

/** 盘面关键指纹：命宫/命度/身宫/身度/命度主/洞微出限/11曜宫度分布 */
function chartFingerprint(r: QizhengResult): string {
  return JSON.stringify({
    frame: r.frame,
    mingGong: r.mingGong.branch,
    mingDu: r.mingDu.xiuFullName + r.mingDu.xiuDegree.toFixed(2),
    shenGong: r.shenGong.branch,
    shenDu: r.shenDu.xiuFullName + r.shenDu.xiuDegree.toFixed(2),
    mingDuZhu: r.mingDuZhu,
    chuxian: r.dongwei.chuxianText,
    trueSolar: r.trueSolar.trueSolarTime,
    stars: r.stars.map((s) => `${s.key}:${s.palaceBranch}${s.palaceDegree.toFixed(2)}@${s.xiuName}${s.xiuDegree.toFixed(2)}`),
  });
}

// ---------------------------------------------------------------------------
// 样本：同一出生时间 × 四组 Profile（覆盖两星制 × 两命宫法 × 两童限起岁）
// ---------------------------------------------------------------------------
const SAMPLES: Array<{ label: string; base: Omit<QizhengInput, "frame" | "mingGongMode" | "dongweiStart">; profile: { frame: StarFrame; ming: MingGongMode; dw: 9 | 10 } }> = [
  {
    label: "样本1 1988-09-27 15:40 北京",
    base: { year: 1988, month: 9, day: 27, hour: 15, minute: 40, lat: 39.9042, lon: 116.4074, placeName: "北京市市辖区", gender: "male" },
    profile: { frame: "sidereal", ming: "sunrise", dw: 9 },
  },
  {
    label: "样本2 1995-06-18 05:20 广州",
    base: { year: 1995, month: 6, day: 18, hour: 5, minute: 20, lat: 23.1291, lon: 113.2644, placeName: "广东省广州市", gender: "female" },
    profile: { frame: "sidereal", ming: "mao", dw: 9 },
  },
  {
    label: "样本3 1990-01-15 23:35 成都（夜子时）",
    base: { year: 1990, month: 1, day: 15, hour: 23, minute: 35, lat: 30.5728, lon: 104.0668, placeName: "四川省成都市", gender: "male" },
    profile: { frame: "tropical", ming: "sunrise", dw: 10 },
  },
];

console.log("========== 七政历史排盘 Profile 持久化验证（GAP B2/F8） ==========");
console.log(`引擎：${QIZHENG_ENGINE_VERSION}\n`);

for (const s of SAMPLES) {
  console.log(`--- ${s.label} | 星制=${s.profile.frame} 命宫法=${s.profile.ming} 童限=${s.profile.dw}岁 ---`);

  const input: QizhengInput = {
    ...s.base,
    frame: s.profile.frame,
    mingGongMode: s.profile.ming,
    dongweiStart: s.profile.dw,
  };
  const res = calcQizhengChart(input);
  const data = buildRecordData(res);
  const origFp = chartFingerprint(res);

  // A. 保存侧字段一致性
  check(data.star_system === res.frame, "A1 star_system 与引擎星制一致", `${data.star_system} vs ${res.frame}`);
  check(data.calculation_profile.ming_mode === input.mingGongMode, "A2 calculation_profile.ming_mode 一致");
  check(data.calculation_profile.dongwei_start === res.dongwei.startBase, "A3 calculation_profile.dongwei_start 与引擎童限一致");
  check(data.calculation_profile.zhen_ta === true, "A4 zhen_ta 真太阳时标记为 true");
  check(data.algorithm_version === res.engineVersion, "A5 algorithm_version 与引擎版本一致", `${data.algorithm_version}`);
  check(typeof res.engineVersion === "string" && res.engineVersion.includes("真太阳时复用 common/jieqi Meeus"), "A6 引擎版本含真太阳时统一标识");

  // B. 恢复侧（新记录，含全部 Profile 字段）
  const rb = restoreFromRecord(data);
  check(rb.frame === s.profile.frame && rb.ming === s.profile.ming && rb.dw === s.profile.dw, "B1 恢复出当时 Profile 三参数", JSON.stringify({ r: [rb.frame, rb.ming, rb.dw], e: [s.profile.frame, s.profile.ming, s.profile.dw] }));
  const resB = calcQizhengChart({ ...rb.input, frame: rb.frame, mingGongMode: rb.ming, dongweiStart: rb.dw });
  check(chartFingerprint(resB) === origFp, "B2 按当时 Profile 重排 → 盘面指纹全等");

  // C. 兜底（旧记录：剥离 star_system / calculation_profile / algorithm_version，
  //    仅剩 input —— v25.0.74 存量历史数据形态）
  const legacyData: any = { input: data.input, mingGong: data.mingGong, shenGong: data.shenGong, mingDu: data.mingDu, chuxian: data.chuxian };
  const rc = restoreFromRecord(legacyData);
  check(rc.frame === (input.frame ?? "tropical") && rc.ming === (input.mingGongMode ?? "mao") && rc.dw === (input.dongweiStart ?? 10), "C1 旧记录从 input 兜底恢复 Profile");
  const resC = calcQizhengChart({ ...rc.input, frame: rc.frame, mingGongMode: rc.ming, dongweiStart: rc.dw });
  check(chartFingerprint(resC) === origFp, "C2 兜底恢复重排 → 盘面指纹全等");

  // D. 反例：错用默认 Profile（今制/遇卯安命/10岁）恢复非默认盘，
  //    sidereal 或童限 9 岁盘必漂移（口径恰好重叠的样本不算失败）
  const wrong = calcQizhengChart({ ...input, frame: "tropical", mingGongMode: "mao", dongweiStart: 10 });
  const profileMismatch = s.profile.frame !== "tropical" || s.profile.ming !== "mao" || s.profile.dw !== 10;
  if (profileMismatch && chartFingerprint(wrong) !== origFp) {
    defaultProfileDriftCount++;
  } else if (profileMismatch) {
    console.log(`  · 说明：默认 Profile 恢复盘面相同（${s.label} 两口径此盘恰好重叠，合法）`);
  }
  console.log("");
}

console.log("========== Profile 持久化验证汇总 ==========");
console.log(`通过: ${passed}  失败: ${failed}  默认Profile漂移样本数: ${defaultProfileDriftCount}/${SAMPLES.filter((s) => s.profile.frame !== "tropical" || s.profile.ming !== "mao" || s.profile.dw !== 10).length}`);
check(defaultProfileDriftCount >= 1, "D1 至少一个非默认样本被默认 Profile 恢复后盘面漂移（证明按当时 Profile 必要）");
if (failed === 0) {
  console.log("全部通过：保存字段一致、当时Profile恢复全等、旧记录兜底可用、默认Profile反例漂移成立");
} else {
  failures.forEach((f) => console.error(` - ${f}`));
  process.exit(1);
}
