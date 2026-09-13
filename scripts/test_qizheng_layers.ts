// ============================================================================
// 七政四余感应图层引擎验证脚本（P1-1 / GAP E1+H5 运行级）
// ============================================================================
// 验证 src/algorithm-core/modules/qizheng-layers（12 项图层 + RULE_ID 可追溯）：
//   A. 12 层完整性：key 齐全唯一、RULE_ID 前缀规范、分组定义完备
//   B. 宫位感应几何自洽：守=同宫 冲=+6 三方=+4/+8 拱=+5/+7 夹=±1（支序差）
//   C. 度数感应几何：同经<1° 顶星<0.5° 同络=同宿 顶度=同宿且差<0.3°
//   D. 断语层追溯：神煞/化曜 ruleId 挂断语 id、level 继承断语引擎
//   E. 大限层：无行限查询为空；有查询恰 1 条且锚点=行限宫中心→限度
//   F. 多盘端到端：金样本盘全层计算无异常、连线坐标∈[0,360)、幂等
// 运行：npx tsx scripts/test_qizheng_layers.ts
// ============================================================================

import {
  calcQizhengChart,
  xianDuAtAge,
  type QizhengInput,
  type StarPosition,
} from "../src/algorithm-core/modules/qizheng";
import { calcQizhengDuanyu } from "../src/algorithm-core/modules/qizheng-duanyu";
import {
  computeQizhengLayers,
  LAYER_DEFS,
  type LayerKey,
  type LayerLine,
} from "../src/algorithm-core/modules/qizheng-layers";

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

const ZHI_INDEX: Record<string, number> = {
  子: 0, 丑: 1, 寅: 2, 卯: 3, 辰: 4, 巳: 5, 午: 6, 未: 7, 申: 8, 酉: 9, 戌: 10, 亥: 11,
};

/** 环形角度相等（mod 360，容差 tol 度） */
function angEq(a: number, b: number, tol = 0.001): boolean {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d < tol || 360 - d < tol;
}

const BASES: Array<Omit<QizhengInput, "frame" | "mingGongMode" | "dongweiStart">> = [
  { year: 1988, month: 9, day: 27, hour: 15, minute: 40, lat: 39.9042, lon: 116.4074, placeName: "北京市市辖区", gender: "male" },
  { year: 1995, month: 6, day: 18, hour: 5, minute: 20, lat: 23.1291, lon: 113.2644, placeName: "广东省广州市", gender: "female" },
  { year: 2003, month: 12, day: 8, hour: 22, minute: 5, lat: 31.2304, lon: 121.4737, placeName: "上海市市辖区", gender: "male" },
  { year: 1976, month: 2, day: 15, hour: 8, minute: 45, lat: 30.5728, lon: 104.0668, placeName: "四川省成都市", gender: "female" },
];

const CHARTS = BASES.map((base, i) => calcQizhengChart({
  ...base,
  frame: i % 2 === 0 ? "tropical" : "sidereal",
  mingGongMode: i % 3 === 0 ? "sunrise" : "mao",
  dongweiStart: i % 4 === 0 ? 9 : 10,
}));

console.log("========== 七政四余感应图层引擎验证（P1-1 / GAP E1+H5） ==========\n");

// ---------------------------------------------------------------------------
// A. 12 层完整性与 RULE_ID 规范
// ---------------------------------------------------------------------------
console.log("--- A. 12 层完整性 ---");

check(LAYER_DEFS.length === 12, "A1 图层定义恰 12 项", `实际 ${LAYER_DEFS.length}`);
const defKeys = LAYER_DEFS.map((d) => d.key);
check(new Set(defKeys).size === 12, "A2 图层 key 唯一");
for (const g of ["宫位感应", "度数感应", "断语层", "限流层"] as const) {
  check(LAYER_DEFS.filter((d) => d.group === g).length >= 1, `A3 分组「${g}」非空`);
}
for (const d of LAYER_DEFS) {
  check(d.source.length > 0 && d.desc.length > 0, `A4 ${d.name} 层出处/说明非空`);
}

const EXPECT_RULE_PREFIX: Record<LayerKey, string> = {
  shou: "QZ-LY-SHOU", chong: "QZ-LY-CHONG", sanfang: "QZ-LY-SANFANG", gong: "QZ-LY-GONG", jia: "QZ-LY-JIA",
  tongjing: "QZ-LY-TONGJING", tongluo: "QZ-LY-TONGLUO", dingxing: "QZ-LY-DINGXING", dingdu: "QZ-LY-DINGDU",
  shensha: "QZ-LY-SHENSHA:", huayao: "QZ-LY-HUAYAO:", daxian: "QZ-LY-DAXIAN",
};

for (const [ci, res] of CHARTS.entries()) {
  const dy = calcQizhengDuanyu(res);
  const lr = computeQizhengLayers(res, dy, xianDuAtAge(res, 36));
  check(lr.layers.length === 12, `A5 盘${ci + 1} 结果层序恰 12`, `实际 ${lr.layers.length}`);
  check(lr.engineVersion.startsWith("七政图层引擎"), `A6 盘${ci + 1} 引擎版本标识`);
  const keyOrder: LayerKey[] = ["shou", "chong", "sanfang", "gong", "jia", "tongjing", "tongluo", "dingxing", "dingdu", "shensha", "huayao", "daxian"];
  check(JSON.stringify(lr.layers.map((l) => l.key)) === JSON.stringify(keyOrder), `A7 盘${ci + 1} 层序稳定`);
  for (const l of lr.layers) {
    for (const ln of l.lines) {
      check(
        ln.ruleId === EXPECT_RULE_PREFIX[l.key] || ln.ruleId.startsWith(EXPECT_RULE_PREFIX[l.key]),
        `A8 盘${ci + 1} ${l.key} 层 RULE_ID 规范`,
        `ruleId=${ln.ruleId} 期望前缀=${EXPECT_RULE_PREFIX[l.key]}`,
      );
      check(ln.source.length > 0 && ln.label.length > 0, `A9 盘${ci + 1} ${l.key} 层条目含出处与说明`);
      check(ln.fromLon >= 0 && ln.fromLon < 360 && ln.toLon >= 0 && ln.toLon < 360, `A10 盘${ci + 1} ${l.key} 层锚点黄经∈[0,360)`, JSON.stringify({ f: ln.fromLon, t: ln.toLon }));
      check(["ji", "xiong", "zhong"].includes(ln.level), `A11 盘${ci + 1} ${l.key} 层分级合法`);
    }
  }
}

// ---------------------------------------------------------------------------
// B. 宫位感应几何自洽（支序差：守0 冲6 三方4/8 拱5/7 夹1/11）
// ---------------------------------------------------------------------------
console.log("\n--- B. 宫位感应几何 ---");

const GONG_DEFS: Array<{ key: LayerKey; deltas: number[] }> = [
  { key: "shou", deltas: [0] },
  { key: "chong", deltas: [6] },
  { key: "sanfang", deltas: [4, 8] },
  { key: "gong", deltas: [5, 7] },
  { key: "jia", deltas: [1, 11] },
];

for (const [ci, res] of CHARTS.entries()) {
  const dy = calcQizhengDuanyu(res);
  const lr = computeQizhengLayers(res, dy, null);
  const byKey = new Map(lr.layers.map((l) => [l.key, l.lines]));
  const mingBranch = res.mingGong.branchIndex;

  for (const gd of GONG_DEFS) {
    const lines = byKey.get(gd.key)!;
    for (const ln of lines) {
      const s = res.stars.find((st) => st.key === ln.starKey);
      check(!!s, `B1 盘${ci + 1} ${gd.key} 层星存在`, ln.starKey);
      if (!s) continue;
      const rel = ((ZHI_INDEX[s.palaceBranch] - mingBranch) + 12) % 12;
      check(gd.deltas.includes(rel), `B2 盘${ci + 1} ${gd.key} 层支序差合规`, `${s.name} rel=${rel} 期望${gd.deltas}`);
      check(ln.target === "mingGong" && angEq(ln.toLon, res.mingGong.startLon + res.mingGong.width / 2), `B3 盘${ci + 1} ${gd.key} 层目标锚点=命宫中心`);
    }
    // 反向完备：盘上凡满足该支序差的星必须全部出现
    const expectStars = res.stars.filter((s) => gd.deltas.includes(((ZHI_INDEX[s.palaceBranch] - mingBranch) + 12) % 12));
    const gotKeys = new Set(lines.map((l) => l.starKey));
    for (const s of expectStars) {
      check(gotKeys.has(s.key), `B4 盘${ci + 1} ${gd.key} 层命中完备`, `缺 ${s.name}`);
    }
  }
}

// ---------------------------------------------------------------------------
// C. 度数感应几何（同经/同络/顶星/顶度 容差口径）
// ---------------------------------------------------------------------------
console.log("\n--- C. 度数感应几何 ---");

for (const [ci, res] of CHARTS.entries()) {
  const dy = calcQizhengDuanyu(res);
  const lr = computeQizhengLayers(res, dy, null);
  const byKey = new Map(lr.layers.map((l) => [l.key, l.lines]));
  const mingLon = res.mingDu.lon;
  const lonDiff = (s: StarPosition): number => {
    let d = Math.abs(s.lon - mingLon);
    if (d > 360 - d) d = 360 - d;
    return d;
  };

  for (const ln of byKey.get("tongjing")!) {
    check(lonDiff(res.stars.find((s) => s.key === ln.starKey)!) < 1.0, `C1 盘${ci + 1} 同经差<1°`, ln.label);
  }
  const tjExpect = res.stars.filter((s) => lonDiff(s) < 1.0 && lonDiff(s) > 0);
  check(byKey.get("tongjing")!.length === tjExpect.length, `C2 盘${ci + 1} 同经命中数完备`, `得${byKey.get("tongjing")!.length} 期望${tjExpect.length}`);

  for (const ln of byKey.get("dingxing")!) {
    check(lonDiff(res.stars.find((s) => s.key === ln.starKey)!) < 0.5, `C3 盘${ci + 1} 顶星差<0.5°`, ln.label);
  }

  for (const ln of byKey.get("tongluo")!) {
    const s = res.stars.find((st) => st.key === ln.starKey)!;
    check(s.xiuName === res.mingDu.xiuName, `C4 盘${ci + 1} 同络=同宿`, `${s.name} ${s.xiuName} vs ${res.mingDu.xiuName}`);
  }
  const tlExpect = res.stars.filter((s) => s.xiuName === res.mingDu.xiuName && lonDiff(s) > 0.5);
  check(byKey.get("tongluo")!.length === tlExpect.length, `C5 盘${ci + 1} 同络命中数完备`, `得${byKey.get("tongluo")!.length} 期望${tlExpect.length}`);

  for (const ln of byKey.get("dingdu")!) {
    const s = res.stars.find((st) => st.key === ln.starKey)!;
    check(
      s.xiuName === res.mingDu.xiuName && Math.abs(s.xiuDegree - res.mingDu.xiuDegree) < 0.3,
      `C6 盘${ci + 1} 顶度=同宿且宿度差<0.3°`,
      `${s.name} ${s.xiuName}${s.xiuDegree.toFixed(2)} vs ${res.mingDu.xiuName}${res.mingDu.xiuDegree.toFixed(2)}`,
    );
  }
  for (const key of ["tongjing", "tongluo", "dingxing", "dingdu"] as LayerKey[]) {
    for (const ln of byKey.get(key)!) {
      check(ln.target === "mingDu" && angEq(ln.toLon, mingLon), `C7 盘${ci + 1} ${key} 层目标=命度`);
    }
  }
}

// ---------------------------------------------------------------------------
// D. 断语层可追溯（ruleId 挂断语 id、level 继承）
// ---------------------------------------------------------------------------
console.log("\n--- D. 断语层追溯 ---");

for (const [ci, res] of CHARTS.entries()) {
  const dy = calcQizhengDuanyu(res);
  const lr = computeQizhengLayers(res, dy, null);
  const byKey = new Map(lr.layers.map((l) => [l.key, l.lines]));

  const shaItems = dy.sections.find((s) => s.key === "shensha")?.items ?? [];
  const shaLines = byKey.get("shensha")!;
  check(shaLines.length <= shaItems.length, `D1 盘${ci + 1} 神煞层≤断语神煞节条数`);
  const shaIds = new Set(shaItems.map((i) => i.id));
  const dyLevelById = new Map(shaItems.map((i) => [i.id, i.level] as const));
  for (const ln of shaLines) {
    const id = ln.ruleId.replace("QZ-LY-SHENSHA:", "");
    check(shaIds.has(id), `D2 盘${ci + 1} 神煞 ruleId 挂断语 id`, id);
    check(ln.level === dyLevelById.get(id), `D3 盘${ci + 1} 神煞分级继承断语`, `${ln.ruleId} level=${ln.level}`);
    check(ln.source === shaItems.find((i) => i.id === id)!.source, `D4 盘${ci + 1} 神煞出处继承断语`);
  }

  const huaItems = dy.sections.find((s) => s.key === "huayao")?.items ?? [];
  const huaLines = byKey.get("huayao")!;
  const huaIds = new Set(huaItems.map((i) => i.id));
  for (const ln of huaLines) {
    const id = ln.ruleId.replace("QZ-LY-HUAYAO:", "");
    check(huaIds.has(id), `D5 盘${ci + 1} 化曜 ruleId 挂断语 id`, id);
    check(
      ln.target === "mingGong" || ln.target === "shenGong",
      `D6 盘${ci + 1} 化曜目标为命/身宫`,
      ln.target,
    );
  }
}

// ---------------------------------------------------------------------------
// E. 大限层（xian null/非空 两态）
// ---------------------------------------------------------------------------
console.log("\n--- E. 大限层 ---");

for (const [ci, res] of CHARTS.entries()) {
  const dy = calcQizhengDuanyu(res);
  const empty = computeQizhengLayers(res, dy, null);
  check(empty.layers.find((l) => l.key === "daxian")!.lines.length === 0, `E1 盘${ci + 1} 无行限查询 → 大限层空`);

  for (const age of [5, 25, 40, 66]) {
    const xian = xianDuAtAge(res, age);
    const lr = computeQizhengLayers(res, dy, xian);
    const lines = lr.layers.find((l) => l.key === "daxian")!.lines;
    if (!xian) {
      check(lines.length === 0, `E2 盘${ci + 1} ${age}岁超范围 → 大限层空`);
      continue;
    }
    check(lines.length === 1, `E3 盘${ci + 1} ${age}岁 → 大限层恰 1 条`, `实际 ${lines.length}`);
    const ln = lines[0] as LayerLine;
    const pal = res.palaces.find((p) => p.branch === xian.row.palaceBranch)!;
    check(angEq(ln.fromLon, pal.startLon + pal.width / 2), `E4 盘${ci + 1} ${age}岁 起点锚=行限宫中心`);
    check(angEq(ln.toLon, xian.lon), `E5 盘${ci + 1} ${age}岁 终点锚=行限度`);
    check(ln.ruleId === "QZ-LY-DAXIAN", `E6 盘${ci + 1} 大限 RULE_ID`);
  }
}

// ---------------------------------------------------------------------------
// F. 端到端与幂等性（全层开启 × 多盘 × 两次计算全等）
// ---------------------------------------------------------------------------
console.log("\n--- F. 端到端与幂等 ---");

for (const [ci, res] of CHARTS.entries()) {
  const dy = calcQizhengDuanyu(res);
  const a = computeQizhengLayers(res, dy, xianDuAtAge(res, 36));
  const b = computeQizhengLayers(res, calcQizhengDuanyu(res), xianDuAtAge(res, 36));
  check(JSON.stringify(a) === JSON.stringify(b), `F1 盘${ci + 1} 幂等（两次计算 JSON 全等）`);
  const total = a.layers.reduce((n, l) => n + l.lines.length, 0);
  check(total >= 0, `F2 盘${ci + 1} 全层计算无异常（共 ${total} 条连线）`);
}

// ---------------------------------------------------------------------------
// 汇总
// ---------------------------------------------------------------------------
console.log("\n========== 汇总 ==========");
console.log(`通过: ${passed}  失败: ${failed}`);
if (failed > 0) {
  console.error("\n失败明细:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
} else {
  console.log("全部通过 ✓（感应图层引擎 12 层 RULE_ID 可追溯、几何自洽、断语追溯、大限两态、幂等）");
}
