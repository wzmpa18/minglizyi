// ============================================================================
// 七政四余流年模式引擎验证脚本（P1-2 / GAP E2+E3+F4 运行级）
// ============================================================================
// 验证 src/algorithm-core/modules/qizheng-liunian：
//   A. 流年干支金样本（1988 戊辰 / 2024 甲辰 / 2025 乙巳 / 2026 丙午 / 2000 庚辰）
//   B. 立春日期（寿星历公式口径）与结果字段
//   C. 流年十一曜落本命盘宫/宿自洽（环形区间归属）
//   D. 太岁：落宫、坐命/冲命/冲身支序差逻辑
//   E. 流年神煞：丙午年全套落宫金样本（阳刃午/飞刃子/的煞卯…/空亡寅卯）
//   F. 流年化曜：十干化曜表导出映射与卷一表逐格一致
//   G. 原流相并：流年星与本命星同 key 对照、moveDeg 环形差
//   H. 多盘多年份端到端 + 幂等
// 运行：npx tsx scripts/test_qizheng_liunian.ts
// ============================================================================

import { calcQizhengChart, type QizhengInput } from "../src/algorithm-core/modules/qizheng";
import { computeQizhengLiunian, LIUNIAN_ENGINE_VERSION } from "../src/algorithm-core/modules/qizheng-liunian";
import { getJieQiDate } from "../src/algorithm-core/common/jieqi";

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

const BASE: Omit<QizhengInput, "frame" | "mingGongMode" | "dongweiStart"> = {
  year: 1988, month: 9, day: 27, hour: 15, minute: 40,
  lat: 39.9042, lon: 116.4074, tzOffset: 8, placeName: "北京市市辖区", gender: "male",
};
const baseChart = calcQizhengChart({ ...BASE, frame: "sidereal", mingGongMode: "mao", dongweiStart: 10 });

console.log("========== 七政四余流年模式引擎验证（P1-2 / GAP E2+E3+F4） ==========\n");

// ---------------------------------------------------------------------------
// A. 流年干支金样本（立春分界年）
// ---------------------------------------------------------------------------
console.log("--- A. 流年干支 ---");

const GZ_CASES: Array<{ year: number; gan: string; zhi: string }> = [
  { year: 1988, gan: "戊", zhi: "辰" },
  { year: 2000, gan: "庚", zhi: "辰" },
  { year: 2024, gan: "甲", zhi: "辰" },
  { year: 2025, gan: "乙", zhi: "巳" },
  { year: 2026, gan: "丙", zhi: "午" },
  { year: 2035, gan: "乙", zhi: "卯" },
];
for (const c of GZ_CASES) {
  const ln = computeQizhengLiunian(baseChart, c.year);
  check(ln.ganzhi.gan === c.gan && ln.ganzhi.zhi === c.zhi, `A1 ${c.year}年干支 ${c.gan}${c.zhi}`, `得 ${ln.ganzhi.gan}${ln.ganzhi.zhi}`);
  check(ln.year === c.year, `A2 ${c.year}年结果回显`);
}

// ---------------------------------------------------------------------------
// B. 立春日期口径
// ---------------------------------------------------------------------------
console.log("\n--- B. 立春日期 ---");

const ln2026 = computeQizhengLiunian(baseChart, 2026);
const lichun2026 = getJieQiDate(2026, 0);
check(ln2026.lichun.month === lichun2026.getMonth() + 1 && ln2026.lichun.day === lichun2026.getDate(), "B1 立春日期与公共节气模块一致", ln2026.lichun.text);
check(ln2026.lichun.month === 2, "B2 2026 立春在 2 月", `${ln2026.lichun.month}月`);
check(ln2026.lichun.day >= 3 && ln2026.lichun.day <= 5, "B3 立春日在 2月3-5日间（寿星历口径）", `${ln2026.lichun.day}日`);
check(ln2026.engineVersion === LIUNIAN_ENGINE_VERSION, "B4 引擎版本标识");

// ---------------------------------------------------------------------------
// C. 流年十一曜落本命盘自洽
// ---------------------------------------------------------------------------
console.log("\n--- C. 流年星落盘自洽 ---");

for (const year of [2024, 2025, 2026]) {
  const ln = computeQizhengLiunian(baseChart, year);
  check(ln.stars.length === 11, `C1 ${year} 流年星恰 11 曜`, `实际 ${ln.stars.length}`);
  const starKeys = new Set(ln.stars.map((s) => s.key));
  for (const k of ["sun", "moon", "jupiter", "mars", "saturn", "venus", "mercury", "qi", "luo", "ji", "bei"]) {
    check(starKeys.has(k), `C2 ${year} 流年含星 ${k}`);
  }
  for (const s of ln.stars) {
    check(s.lon >= 0 && s.lon < 360, `C3 ${year} ${s.name} 黄经∈[0,360)`, String(s.lon));
    const pal = baseChart.palaces.find((p) => p.branch === s.palaceBranch)!;
    const d = ((s.lon - pal.startLon) % 360 + 360) % 360;
    check(d < pal.width && Math.abs(d - s.palaceDegree) < 0.001, `C4 ${year} ${s.name} 宫度自洽`, `${s.palaceBranch}宫${s.palaceDegree.toFixed(2)}° 宽${pal.width}`);
    check(s.renshiGong === pal.renshiGong, `C5 ${year} ${s.name} 人事宫与宫支一致`);
    const man = baseChart.mansions.find((m) => m.name === s.xiuName)!;
    const xd = ((s.lon - man.startLon) % 360 + 360) % 360;
    check(xd < man.width && Math.abs(xd - s.xiuDegree) < 0.001, `C6 ${year} ${s.name} 宿度自洽`, `${s.xiuFullName}${s.xiuDegree.toFixed(2)}°`);
    check(s.benmingPalaceBranch !== "", `C7 ${year} ${s.name} 原流相并含本命宫`);
    check(s.moveDeg >= 0, `C8 ${year} ${s.name} 原流移度≥0`);
  }
}

// ---------------------------------------------------------------------------
// D. 太岁
// ---------------------------------------------------------------------------
console.log("\n--- D. 太岁 ---");

const mingBranchIdx = baseChart.mingGong.branchIndex;
const shenBranchIdx = baseChart.shenGong.branchIndex;
for (const year of [2024, 2025, 2026, 2035]) {
  const ln = computeQizhengLiunian(baseChart, year);
  const ts = ln.taiSui;
  check(ts.branch === ln.ganzhi.zhi, `D1 ${year} 太岁=流年支`);
  const pal = baseChart.palaces.find((p) => p.branch === ts.branch)!;
  check(ts.renshiGong === pal.renshiGong, `D2 ${year} 太岁落宫人事名一致`);
  const relMing = ((ZHI_INDEX[ts.branch] - mingBranchIdx) + 12) % 12;
  const relShen = ((ZHI_INDEX[ts.branch] - shenBranchIdx) + 12) % 12;
  check(ts.zuoMing === (relMing === 0), `D3 ${year} 太岁坐命判定`);
  check(ts.chongMing === (relMing === 6), `D4 ${year} 太岁冲命判定`);
  check(ts.chongShen === (relShen === 6), `D5 ${year} 太岁冲身判定`);
  check(ts.text.length > 0 && ts.source.length > 0, `D6 ${year} 太岁断语含出处`);
}

// ---------------------------------------------------------------------------
// E. 流年神煞（丙午 2026 全套金样本，出自卷四表）
// ---------------------------------------------------------------------------
console.log("\n--- E. 流年神煞 ---");

const sha2026 = ln2026.shensha;
const shaByName = new Map(sha2026.map((s) => [s.id, s]));
const EXPECT_2026: Array<{ id: string; branch: string; level: string }> = [
  { id: "ln_yangren", branch: "午", level: "xiong" },     // 丙干阳刃午
  { id: "ln_feiren", branch: "子", level: "xiong" },      // 飞刃=阳刃对冲
  { id: "ln_deshao", branch: "卯", level: "xiong" },      // 午支三合(寅午戌)
  { id: "ln_xianchi", branch: "卯", level: "xiong" },
  { id: "ln_jiesha", branch: "亥", level: "xiong" },
  { id: "ln_wangshen", branch: "巳", level: "xiong" },
  { id: "ln_yima", branch: "申", level: "zhong" },
  { id: "ln_jiangxing", branch: "午", level: "ji" },
  { id: "ln_huagai", branch: "戌", level: "zhong" },
  { id: "ln_panan", branch: "酉", level: "zhong" },       // 马前一位
  { id: "ln_guchen", branch: "申", level: "xiong" },      // 午支三会(巳午未)
  { id: "ln_guasu", branch: "辰", level: "xiong" },
  { id: "ln_kongwang1", branch: "寅", level: "xiong" },   // 丙午旬（甲辰旬）空寅卯
  { id: "ln_kongwang2", branch: "卯", level: "xiong" },
];
for (const e of EXPECT_2026) {
  const got = shaByName.get(e.id);
  check(!!got, `E1 2026 含神煞 ${e.id}`);
  if (got) {
    check(got.branch === e.branch, `E2 2026 ${e.id} 落${e.branch}宫`, `得 ${got.branch}`);
    check(got.level === e.level, `E3 2026 ${e.id} 分级 ${e.level}`, `得 ${got.level}`);
    check(got.source.includes("卷四"), `E4 2026 ${e.id} 出处卷四`);
  }
}
for (const s of sha2026) {
  const pal = baseChart.palaces.find((p) => p.branch === s.branch);
  check(!!pal && s.renshiGong === pal.renshiGong, `E5 2026 ${s.name}(${s.branch}) 人事宫一致`);
  const relMing = ((ZHI_INDEX[s.branch] - mingBranchIdx) + 12) % 12;
  const relShen = ((ZHI_INDEX[s.branch] - shenBranchIdx) + 12) % 12;
  check(s.onMing === (relMing === 0), `E6 2026 ${s.id} 坐命判定`);
  check(s.onShen === (relShen === 0), `E7 2026 ${s.id} 坐身判定`);
  check(s.chongMing === (relMing === 6), `E8 2026 ${s.id} 冲命判定`);
}

// ---------------------------------------------------------------------------
// F. 流年化曜（与卷一表逐格一致）
// ---------------------------------------------------------------------------
console.log("\n--- F. 流年化曜 ---");

check(ln2026.huayao.length === 10, "F1 2026 流年化曜恰十曜", `实际 ${ln2026.huayao.length}`);
const huaKeys = new Set(ln2026.huayao.map((h) => h.huaName));
for (const n of ["天禄", "天暗", "天福", "天耗", "天磨", "天贵", "天刑", "天印", "天囚", "天权"]) {
  check(huaKeys.has(n), `F2 2026 含化曜 ${n}`);
}
// 丙年天禄=木星（HUAYAO_STAR_SEQ[2]=木，丙干序2）
const tianlu = ln2026.huayao.find((h) => h.huaName === "天禄")!;
check(tianlu.starKey === "jupiter" && tianlu.starName === "木星", "F3 2026 丙年天禄=木星", `${tianlu.starName}`);
const tianquan = ln2026.huayao.find((h) => h.huaName === "天权")!;
check(tianquan.starKey === "bei" && tianquan.starName === "月孛", "F4 2026 丙年天权=月孛（(9+2)%10=孛，甲年尾位罗）", `${tianquan.starName}`);
for (const h of ln2026.huayao) {
  const lnStar = ln2026.stars.find((s) => s.key === h.starKey)!;
  check(h.palaceBranch === lnStar.palaceBranch && h.renshiGong === lnStar.renshiGong, `F5 2026 ${h.huaName} 落宫与流年星一致`);
  const onMing = ZHI_INDEX[h.palaceBranch] === mingBranchIdx;
  const onShen = ZHI_INDEX[h.palaceBranch] === shenBranchIdx;
  check(h.onMing === onMing && h.onShen === onShen, `F6 2026 ${h.huaName} 守命身判定`);
  check(h.source.includes("卷一"), `F7 2026 ${h.huaName} 出处卷一`);
}

// ---------------------------------------------------------------------------
// G. 流年顶星与原流移度
// ---------------------------------------------------------------------------
console.log("\n--- G. 流年顶星 ---");

for (const year of [2024, 2025, 2026]) {
  const ln = computeQizhengLiunian(baseChart, year);
  const mingLon = ((baseChart.mingDu.lon % 360) + 360) % 360;
  const expectDing = ln.stars.filter((s) => {
    let d = Math.abs(s.lon - mingLon);
    if (d > 360 - d) d = 360 - d;
    return d > 0 && d < 0.5;
  });
  check(ln.dingXing.length === expectDing.length, `G1 ${year} 流年顶星数完备`, `得${ln.dingXing.length} 期望${expectDing.length}`);
  for (const s of ln.stars) {
    let d = Math.abs(s.lon - mingLon);
    if (d > 360 - d) d = 360 - d;
    check(s.dingMingDu === (d > 0 && d < 0.5), `G2 ${year} ${s.name} 顶命度标记自洽`);
  }
}

// ---------------------------------------------------------------------------
// H. 多盘多年份端到端 + 幂等
// ---------------------------------------------------------------------------
console.log("\n--- H. 端到端与幂等 ---");

const CHARTS = [
  calcQizhengChart({ ...BASE, frame: "tropical", mingGongMode: "sunrise", dongweiStart: 9 }),
  calcQizhengChart({ ...BASE, frame: "sidereal", mingGongMode: "mao", dongweiStart: 10 }),
  calcQizhengChart({
    year: 1995, month: 6, day: 18, hour: 5, minute: 20,
    lat: 23.1291, lon: 113.2644, tzOffset: 8, placeName: "广东省广州市", gender: "female",
    frame: "sidereal", mingGongMode: "mao", dongweiStart: 9,
  }),
  calcQizhengChart({
    year: 2003, month: 12, day: 8, hour: 22, minute: 5,
    lat: 31.2304, lon: 121.4737, tzOffset: 8, placeName: "上海市市辖区", gender: "male",
    frame: "tropical", mingGongMode: "mao", dongweiStart: 10,
  }),
];
for (const [ci, chart] of CHARTS.entries()) {
  for (const year of [1990, 2026, 2080]) {
    const a = computeQizhengLiunian(chart, year);
    const b = computeQizhengLiunian(chart, year);
    check(JSON.stringify(a) === JSON.stringify(b), `H1 盘${ci + 1} ${year}年 幂等`);
    check(a.stars.length === 11 && a.shensha.length >= 14 && a.huayao.length === 10, `H2 盘${ci + 1} ${year}年 全量输出`);
  }
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
  console.log("全部通过 ✓（流年干支/立春/落盘自洽/太岁/神煞金样本/化曜/顶星/原流相并/幂等）");
}
