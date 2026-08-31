// ============================================================================
// 七政四余断语引擎专项验证脚本（金样本交叉比对）
// ============================================================================
// 验证策略（三层，全部可独立复算）：
//   A. 干支/知识库常量金样本：年干支立春分界、阳刃/旬空/月煞/值难等抽查
//   B. 断语命中交叉比对：脚本内置一份独立知识库表（与引擎源码分离），
//      用金样本盘面数据复算六节断语的应命中集合，与引擎实际输出逐项比对
//   C. 断语纪律：id 唯一、出处可追溯（卷节格式）、无生死绝对断言、统计一致
// 运行：npx tsx scripts/test_qizheng_duanyu.ts
// ============================================================================

import { calcQizhengChart, type QizhengInput } from "../src/algorithm-core/modules/qizheng";
import {
  calcQizhengDuanyu,
  yearGanzhi,
  type QizhengDuanyuResult,
  type DuanyuItem,
} from "../src/algorithm-core/modules/qizheng-duanyu";

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

// ---------------------------------------------------------------------------
// 独立知识库表（测试本地副本，与引擎源码分离编写，交叉验证用）
// ---------------------------------------------------------------------------

const GANS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const ZHIS = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

/** 十干化曜星序（果老星宗卷一§1.6.2：甲起禄火，每干顺移一位） */
const HY_STAR_SEQ = ["火", "孛", "木", "金", "土", "月", "水", "气", "计", "罗"];
const HY_NAME_SEQ = ["天禄", "天暗", "天福", "天耗", "天磨", "天贵", "天刑", "天印", "天囚", "天权"];
const SHORT2KEY: Record<string, string> = {
  日: "sun", 月: "moon", 木: "jupiter", 火: "mars", 土: "saturn",
  金: "venus", 水: "mercury", 气: "qi", 罗: "luo", 计: "ji", 孛: "bei",
};
function hyTableFor(gan: string): Record<string, string> {
  const gi = GANS.indexOf(gan);
  const row: Record<string, string> = {};
  HY_NAME_SEQ.forEach((name, ni) => { row[name] = HY_STAR_SEQ[(ni + gi) % 10]; });
  return row;
}

/** 特化吉星表（卷一§1.6.3） */
const TEHUA: Record<string, Record<string, string[]>> = {
  文星: { 甲: ["罗"], 乙: ["计"], 丙: ["金"], 丁: ["火"], 戊: ["金"], 己: ["气"], 庚: ["木"], 辛: ["土"], 壬: ["日"], 癸: ["月"] },
  魁星: { 甲: ["月"], 乙: ["日"], 丙: ["罗"], 丁: ["计"], 戊: ["火"], 己: ["金"], 庚: ["木"], 辛: ["水"], 壬: ["气"], 癸: ["水"] },
  官星: { 甲: ["气"], 乙: ["水"], 丙: ["罗"], 丁: ["计"], 戊: ["孛"], 己: ["火"], 庚: ["金"], 辛: ["木"], 壬: ["月"], 癸: ["土"] },
  印星: { 甲: ["木"], 乙: ["日"], 丙: ["火"], 丁: ["月"], 戊: ["土"], 己: ["罗"], 庚: ["金"], 辛: ["计"], 壬: ["水"], 癸: ["孛"] },
  催官: { 甲: ["金"], 乙: ["水"], 丙: ["日"], 丁: ["罗"], 戊: ["木"], 己: ["气"], 庚: ["孛"], 辛: ["土"], 壬: ["月"], 癸: ["计"] },
  禄神: { 甲: ["木", "孛"], 乙: ["水"], 丙: ["计"], 丁: ["罗"], 戊: ["土"], 己: ["火"], 庚: ["金"], 辛: ["气"], 壬: ["日"], 癸: ["月"] },
  喜神: { 甲: ["罗"], 乙: ["计"], 丙: ["气"], 丁: ["水"], 戊: ["月"], 己: ["土"], 庚: ["金"], 辛: ["木"], 壬: ["孛"], 癸: ["火"] },
};

/** 阳刃（卷四§4.2.1） */
const YANG_REN: Record<string, string> = {
  甲: "卯", 乙: "辰", 丙: "午", 丁: "未", 戊: "午", 己: "未",
  庚: "酉", 辛: "戌", 壬: "子", 癸: "丑",
};

/** 年支三合神煞（卷四§4.5） */
const SANHE: Record<string, { de: string; xianchi: string; jie: string; wang: string; ma: string; jiang: string; huagai: string }> = {
  申: { de: "酉", xianchi: "酉", jie: "巳", wang: "亥", ma: "寅", jiang: "子", huagai: "辰" },
  子: { de: "酉", xianchi: "酉", jie: "巳", wang: "亥", ma: "寅", jiang: "子", huagai: "辰" },
  辰: { de: "酉", xianchi: "酉", jie: "巳", wang: "亥", ma: "寅", jiang: "子", huagai: "辰" },
  寅: { de: "卯", xianchi: "卯", jie: "亥", wang: "巳", ma: "申", jiang: "午", huagai: "戌" },
  午: { de: "卯", xianchi: "卯", jie: "亥", wang: "巳", ma: "申", jiang: "午", huagai: "戌" },
  戌: { de: "卯", xianchi: "卯", jie: "亥", wang: "巳", ma: "申", jiang: "午", huagai: "戌" },
  巳: { de: "午", xianchi: "午", jie: "寅", wang: "申", ma: "亥", jiang: "酉", huagai: "丑" },
  酉: { de: "午", xianchi: "午", jie: "寅", wang: "申", ma: "亥", jiang: "酉", huagai: "丑" },
  丑: { de: "午", xianchi: "午", jie: "寅", wang: "申", ma: "亥", jiang: "酉", huagai: "丑" },
  亥: { de: "子", xianchi: "子", jie: "申", wang: "寅", ma: "巳", jiang: "卯", huagai: "未" },
  卯: { de: "子", xianchi: "子", jie: "申", wang: "寅", ma: "巳", jiang: "卯", huagai: "未" },
  未: { de: "子", xianchi: "子", jie: "申", wang: "寅", ma: "巳", jiang: "卯", huagai: "未" },
};

/** 孤辰寡宿（卷四§4.5.5） */
const GU_GUA: Record<string, { gu: string; gua: string }> = {
  寅: { gu: "巳", gua: "丑" }, 卯: { gu: "巳", gua: "丑" }, 辰: { gu: "巳", gua: "丑" },
  巳: { gu: "申", gua: "辰" }, 午: { gu: "申", gua: "辰" }, 未: { gu: "申", gua: "辰" },
  申: { gu: "亥", gua: "未" }, 酉: { gu: "亥", gua: "未" }, 戌: { gu: "亥", gua: "未" },
  亥: { gu: "寅", gua: "戌" }, 子: { gu: "寅", gua: "戌" }, 丑: { gu: "寅", gua: "戌" },
};

/** 旬空（卷四§4.5.7） */
const XUN: Array<{ start: number; kong: [string, string] }> = [
  { start: 0, kong: ["戌", "亥"] }, { start: 10, kong: ["申", "酉"] },
  { start: 20, kong: ["午", "未"] }, { start: 30, kong: ["辰", "巳"] },
  { start: 40, kong: ["寅", "卯"] }, { start: 50, kong: ["子", "丑"] },
];

/** 月煞（卷四§4.4.2） */
const YUE_SHA: Record<number, string> = {
  1: "戌", 2: "巳", 3: "午", 4: "未", 5: "寅", 6: "卯",
  7: "辰", 8: "亥", 9: "子", 10: "丑", 11: "申", 12: "酉",
};

/** 值难星（卷四§4.4.3） */
const ZHI_NAN: Array<{ months: number[]; keys: string[] }> = [
  { months: [1, 2], keys: ["sun"] },
  { months: [3, 4], keys: ["moon"] },
  { months: [5, 6], keys: ["mars", "luo"] },
  { months: [7, 8], keys: ["mercury", "bei"] },
  { months: [9, 10], keys: ["jupiter", "qi"] },
  { months: [11, 12], keys: ["venus"] },
];

/** 庙旺乐喜（卷三§3.3.2） */
const MWLX: Record<string, { miao: string; wang: string; le: string; xi: string }> = {
  sun: { miao: "午", wang: "卯", le: "未", xi: "亥" },
  moon: { miao: "未", wang: "酉", le: "亥", xi: "子" },
  jupiter: { miao: "亥", wang: "寅", le: "未", xi: "巳" },
  mars: { miao: "卯", wang: "寅", le: "戌", xi: "酉" },
  saturn: { miao: "子", wang: "申", le: "辰", xi: "丑" },
  venus: { miao: "酉", wang: "辰", le: "亥", xi: "丑" },
  mercury: { miao: "巳", wang: "申", le: "亥", xi: "寅" },
  qi: { miao: "丑", wang: "寅", le: "午", xi: "亥" },
  bei: { miao: "亥", wang: "戌", le: "寅", xi: "申" },
  luo: { miao: "戌", wang: "寅", le: "午", xi: "巳" },
  ji: { miao: "酉", wang: "巳", le: "申", xi: "丑" },
};

/** 忌躔（卷三§3.4.1） */
const JI_CHAN: Record<string, string[]> = {
  jupiter: ["辰", "酉"], mars: ["申", "巳"], saturn: ["寅", "亥"], venus: ["卯", "戌"],
  mercury: ["辰", "未"], ji: ["寅", "亥", "卯"], qi: ["酉"], bei: ["戌"],
  luo: ["酉", "亥"], sun: ["卯", "酉"], moon: ["卯", "酉"],
};

const YANG_STARS = ["sun", "jupiter", "saturn", "mercury", "qi", "ji", "bei"];
const YIN_STARS = ["moon", "mars", "venus", "luo"];
const YANG_GONGS = ["子", "丑", "寅", "卯", "辰", "巳"];

const chong = (b: string) => ZHIS[(ZHIS.indexOf(b) + 6) % 12];
const maQian = (b: string) => ZHIS[(ZHIS.indexOf(b) + 1) % 12];

function xunKongOf(gan: string, zhi: string): [string, string] {
  const gi = GANS.indexOf(gan);
  const zi = ZHIS.indexOf(zhi);
  let seq = -1;
  for (let n = 0; n < 6; n++) {
    const cand = zi + n * 12;
    if (cand % 10 === gi) { seq = cand; break; }
  }
  for (const x of XUN) {
    if (seq >= x.start && seq < x.start + 10) return x.kong;
  }
  return ["戌", "亥"];
}

// ---------------------------------------------------------------------------
// A. 干支金样本（立春分界口径：2月4日前属上一年）
// ---------------------------------------------------------------------------
console.log("=== A. 年干支金样本（立春分界） ===");
check(yearGanzhi(1984, 2, 5).gan === "甲" && yearGanzhi(1984, 2, 5).zhi === "子", "1984-02-05 → 甲子年");
check(yearGanzhi(1984, 2, 3).gan === "癸" && yearGanzhi(1984, 2, 3).zhi === "亥", "1984-02-03（立春前）→ 癸亥年");
check(yearGanzhi(1990, 1, 15).gan === "己" && yearGanzhi(1990, 1, 15).zhi === "巳", "1990-01-15（立春前）→ 己巳年");
check(yearGanzhi(2024, 2, 10).gan === "甲" && yearGanzhi(2024, 2, 10).zhi === "辰", "2024-02-10 → 甲辰年");
check(yearGanzhi(2024, 2, 3).gan === "癸" && yearGanzhi(2024, 2, 3).zhi === "卯", "2024-02-03（立春前）→ 癸卯年");
check(yearGanzhi(1988, 9, 27).gan === "戊" && yearGanzhi(1988, 9, 27).zhi === "辰", "1988-09-27 → 戊辰年");
check(yearGanzhi(1995, 6, 18).gan === "乙" && yearGanzhi(1995, 6, 18).zhi === "亥", "1995-06-18 → 乙亥年");

// 化曜表独立复算（甲起禄火顺移）
{
  const jia = hyTableFor("甲");
  check(jia["天禄"] === "火" && jia["天暗"] === "孛" && jia["天福"] === "木" && jia["天权"] === "罗", "甲年化曜：禄火暗孛福木权罗");
  const yi = hyTableFor("乙");
  check(yi["天禄"] === "孛" && yi["天权"] === "火", "乙年化曜顺移一位：禄孛权火");
  const wu = hyTableFor("戊");
  check(wu["天禄"] === "土" && wu["天刑"] === "火" && wu["天权"] === "金", "戊年化曜：禄土刑火权金");
}

// ---------------------------------------------------------------------------
// B+C. 金样本断语交叉比对
// ---------------------------------------------------------------------------

interface Sample {
  label: string;
  input: QizhengInput;
}

const SAMPLES: Sample[] = [
  {
    label: "金样本1：1988-09-27 14:30 北京（男，昼生）",
    input: { year: 1988, month: 9, day: 27, hour: 14, minute: 30, lat: 39.9042, lon: 116.4074, tzOffset: 8, placeName: "北京市东城区", gender: "male" },
  },
  {
    label: "金样本2：1995-06-18 03:10 上海（女，夜生）",
    input: { year: 1995, month: 6, day: 18, hour: 3, minute: 10, lat: 31.2304, lon: 121.4737, tzOffset: 8, placeName: "上海市黄浦区", gender: "female" },
  },
  {
    label: "金样本3：1990-01-15 10:05 广州（男，立春前→己巳年）",
    input: { year: 1990, month: 1, day: 15, hour: 10, minute: 5, lat: 23.1291, lon: 113.2644, tzOffset: 8, placeName: "广州市越秀区", gender: "male" },
  },
];

for (const smp of SAMPLES) {
  console.log(`\n=== B/C. ${smp.label} ===`);
  const chart = calcQizhengChart(smp.input);
  const dy: QizhengDuanyuResult = calcQizhengDuanyu(chart);
  const items = dy.sections.flatMap((sec) => sec.items);
  const byId = new Map<string, DuanyuItem>(items.map((i) => [i.id, i]));

  // —— C1. 断语纪律 ——
  const ids = items.map((i) => i.id);
  check(new Set(ids).size === ids.length, "C1 断语 id 全局唯一", `total=${ids.length}`);
  check(items.every((i) => ["ji", "xiong", "zhong"].includes(i.level)), "C1 level 仅取 ji/xiong/zhong");
  check(items.every((i) => /^知识库卷[一二三四五六七八]§/.test(i.source)), "C1 出处均为知识库卷节格式");
  check(items.every((i) => i.text.length >= 6), "C1 断语正文非空（≥6字）");
  const deathWords = items.filter((i) => /生死|必死|夭折|寿元|倒限/.test(i.text + i.title));
  check(deathWords.length === 0, "C1 无生死倒限类绝对断言", deathWords.map((i) => i.id).join(","));
  const sum = dy.summary;
  check(
    sum.ji === items.filter((i) => i.level === "ji").length &&
    sum.xiong === items.filter((i) => i.level === "xiong").length &&
    sum.zhong === items.filter((i) => i.level === "zhong").length &&
    sum.total === items.length,
    "C1 summary 统计与实际一致", JSON.stringify(sum),
  );
  check(dy.sections.length === 6, "C1 六节断语齐全", `sections=${dy.sections.length}`);

  const mingB = chart.mingGong.branch;
  const shenB = chart.shenGong.branch;
  const gz = yearGanzhi(smp.input.year, smp.input.month, smp.input.day);
  check(dy.yearGanzhi.gan === gz.gan && dy.yearGanzhi.zhi === gz.zhi, "B 年干支与排盘口径一致", `${dy.yearGanzhi.gan}${dy.yearGanzhi.zhi}`);

  // —— B1. 垣殿得地（卷三）交叉复算 ——
  const secYd = dy.sections.find((x) => x.key === "yuandian")!;
  const ydIds = new Set(secYd.items.map((i) => i.id));
  for (const st of chart.stars) {
    check(ydIds.has(`yuan_${st.key}`) === st.inYuan, `B1 ${st.name}入垣断语⟺inYuan`, `palace=${st.palaceBranch}`);
    check(ydIds.has(`dian_${st.key}`) === st.shengDian, `B1 ${st.name}升殿断语⟺shengDian`);
    const m = MWLX[st.key];
    const expectMwlx = !!(m && [m.miao, m.wang, m.le, m.xi].includes(st.palaceBranch));
    check(ydIds.has(`mwlx_${st.key}`) === expectMwlx, `B1 ${st.name}庙旺乐喜断语⟺复算`, st.palaceBranch);
    const expectJc = !!(JI_CHAN[st.key] || []).includes(st.palaceBranch);
    check(ydIds.has(`jichan_${st.key}`) === expectJc, `B1 ${st.name}忌躔断语⟺复算`, st.palaceBranch);
  }

  // —— B2. 十干化曜（卷一§1.6）交叉复算 ——
  const secHy = dy.sections.find((x) => x.key === "huayao")!;
  const hyIds = new Set(secHy.items.map((i) => i.id));
  const hyTable = hyTableFor(gz.gan);
  const hyByStar = new Map<string, string[]>();
  for (const [name, short] of Object.entries(hyTable)) {
    const k = SHORT2KEY[short];
    if (k) hyByStar.set(k, [...(hyByStar.get(k) ?? []), name]);
  }
  const starByKey = new Map(chart.stars.map((x) => [x.key, x]));
  for (const st of chart.stars) {
    const inMingShen = st.palaceBranch === mingB || st.palaceBranch === shenB;
    const isHuaStar = hyByStar.has(st.key);
    check(hyIds.has(`hua_${st.key}`) === (inMingShen && isHuaStar), `B2 ${st.name}化曜守命身断语⟺复算`, `palace=${st.palaceBranch} ming=${mingB} shen=${shenB}`);
  }
  for (const [teName, tbl] of Object.entries(TEHUA)) {
    for (const short of tbl[gz.gan]) {
      const k = SHORT2KEY[short];
      const st = k ? starByKey.get(k) : undefined;
      const expect = !!(st && (st.palaceBranch === mingB || st.palaceBranch === shenB));
      check(hyIds.has(`tehua_${teName}_${k}`) === expect, `B2 特化${teName}（${short}）断语⟺复算`, `expect=${expect}`);
    }
  }

  // —— B3. 神煞吉凶（卷四）交叉复算 ——
  const secSs = dy.sections.find((x) => x.key === "shensha")!;
  const ssIds = new Set(secSs.items.map((i) => i.id));
  const expectSha = (id: string, branch: string) =>
    check(ssIds.has(id) === (mingB === branch || shenB === branch), `B3 神煞 ${id}⟺复算（煞宫=${branch}）`, `ming=${mingB} shen=${shenB}`);
  const yr = YANG_REN[gz.gan];
  expectSha("sha_yangren", yr);
  expectSha("sha_feiren", chong(yr));
  const sh = SANHE[gz.zhi];
  expectSha("sha_de", sh.de);
  expectSha("sha_xianchi", sh.xianchi);
  expectSha("sha_jie", sh.jie);
  expectSha("sha_wang", sh.wang);
  expectSha("sha_ma", sh.ma);
  expectSha("sha_jiang", sh.jiang);
  expectSha("sha_huagai", sh.huagai);
  expectSha("sha_pan", maQian(sh.ma));
  expectSha("sha_gu", GU_GUA[gz.zhi].gu);
  expectSha("sha_gua", GU_GUA[gz.zhi].gua);
  const [k1, k2] = xunKongOf(gz.gan, gz.zhi);
  expectSha("sha_kong1", k1);
  expectSha("sha_kong2", k2);
  expectSha("sha_yue", YUE_SHA[smp.input.month]);
  const zn = ZHI_NAN.find((z) => z.months.includes(smp.input.month))!;
  for (const key of zn.keys) {
    const st = starByKey.get(key);
    const expect = !!(st && (st.palaceBranch === mingB || st.palaceBranch === shenB));
    check(ssIds.has(`sha_zhinan_${key}`) === expect, `B3 值难星${st?.name ?? key}断语⟺复算`, `expect=${expect}`);
  }

  // —— B4. 身命格局（卷六/卷七）关键断语复算 ——
  const secGj = dy.sections.find((x) => x.key === "geju")!;
  const gjIds = new Set(secGj.items.map((i) => i.id));
  // 三主：命宫宫主/命度主/身主星在盘必断
  const mingOwnerKey = chart.palaces.find((p) => p.branch === mingB)?.ownerKey;
  if (mingOwnerKey && starByKey.get(mingOwnerKey)) {
    check(gjIds.has("zhu_命主"), "B4 命主三主断语存在");
  }
  // 日月夹命
  const mingIdx = ZHIS.indexOf(mingB);
  const neighbors = [ZHIS[(mingIdx + 11) % 12], ZHIS[(mingIdx + 1) % 12]].sort().join(",");
  const sunB = starByKey.get("sun")?.palaceBranch ?? "";
  const moonB = starByKey.get("moon")?.palaceBranch ?? "";
  const expectJiaMing = [sunB, moonB].sort().join(",") === neighbors;
  check(gjIds.has("geju_riyuejiaming") === expectJiaMing, "B4 日月夹命断语⟺复算", `sun=${sunB} moon=${moonB} neighbors=${neighbors}`);
  // 金水辅日
  const sunIdx = ZHIS.indexOf(sunB);
  const adj = new Set([ZHIS[(sunIdx + 11) % 12], ZHIS[(sunIdx + 1) % 12]]);
  const expectJsfR = adj.has(starByKey.get("venus")?.palaceBranch ?? "") && adj.has(starByKey.get("mercury")?.palaceBranch ?? "");
  check(gjIds.has("geju_jinshuifuri") === expectJsfR, "B4 金水辅日断语⟺复算");
  // 孤月独明（夜生+太阴独居一宫）
  const moonStar = starByKey.get("moon");
  const expectGuyue = !!(!chart.dayNight.isDay && moonStar && chart.stars.filter((x) => x.palaceBranch === moonStar.palaceBranch).length === 1);
  check(gjIds.has("geju_guyue") === expectGuyue, "B4 孤月独明断语⟺复算", `isDay=${chart.dayNight.isDay} expect=${expectGuyue}`);
  // 五残星照命
  const wucan = chart.dayNight.isDay ? ["mars", "venus", "bei", "moon", "luo"] : ["saturn", "jupiter", "sun", "qi"];
  const expectWucan = wucan.some((k) => {
    const st = starByKey.get(k);
    return st && (st.palaceBranch === mingB || st.palaceBranch === chong(mingB));
  });
  check(gjIds.has("geju_wucan") === expectWucan, "B4 五残星照命断语⟺复算", `expect=${expectWucan}`);
  // 昼夜向背
  const zhouStars = chart.dayNight.isDay ? YANG_STARS : YIN_STARS;
  const expectZy = zhouStars.some((k) => {
    const st = starByKey.get(k);
    return st && (chart.dayNight.isDay ? YANG_GONGS.includes(st.palaceBranch) : !YANG_GONGS.includes(st.palaceBranch));
  });
  check(gjIds.has("geju_zhouye") === expectZy, "B4 昼夜向背断语⟺复算", `expect=${expectZy}`);
  // 当令星恒有
  check(gjIds.has("geju_lingxing"), "B4 当令星断语存在");
  // 女命重身
  check(gjIds.has("geju_nvshen") === (smp.input.gender === "female"), "B4 女命重身断语⟺性别");

  // —— B5. 十二宫断（卷七§7.3）：有星之人事宫必出断语 ——
  const secGd = dy.sections.find((x) => x.key === "gongduan")!;
  const gdIds = new Set(secGd.items.map((i) => i.id));
  const GONG_ID: Record<string, string> = {
    命宫: "gong_ming", 财帛: "gong_caibo", 兄弟: "gong_xiongdi", 田宅: "gong_tianzhai",
    男女: "gong_nannv", 奴仆: "gong_nupu", 妻妾: "gong_qiqie", 疾厄: "gong_jie",
    迁移: "gong_qianyi", 官禄: "gong_guanlu", 福德: "gong_fude", 相貌: "gong_xiangmao",
  };
  for (const p of chart.palaces) {
    const hasStars = p.stars.length > 0;
    const expectId = GONG_ID[p.renshiGong];
    if (expectId) {
      if (p.renshiGong === "相貌" || p.renshiGong === "奴仆") continue; // 相貌/奴仆为条件断语（有星性/主星入才出）
      check(gdIds.has(expectId) === hasStars, `B5 ${p.renshiGong}宫（${p.branch}）断语⟺宫内有星`, `stars=${p.stars.length}`);
    }
  }

  // —— B6. 歌赋引用（卷八）：命宫星曜玉衡断 + 总纲 ——
  const secGf = dy.sections.find((x) => x.key === "gefu")!;
  const gfIds = new Set(secGf.items.map((i) => i.id));
  for (const st of chart.stars) {
    if (st.palaceBranch === mingB) {
      check(gfIds.has(`gefu_ming_${st.key}`), `B6 玉衡经·${st.name}守命断语存在`);
    }
    if (st.palaceBranch === shenB && st.palaceBranch !== mingB) {
      check(gfIds.has(`gefu_shen_${st.key}`), `B6 玉衡经·${st.name}守身断语存在`);
    }
  }
  check(gfIds.has("gefu_zonggang"), "B6 断命总纲断语存在");

  console.log(`  盘面：命宫${mingB} 身宫${shenB} ${gz.gan}${gz.zhi}年 断语共${items.length}条（吉${sum.ji}/凶${sum.xiong}/中性${sum.zhong}）`);
}

// ---------------------------------------------------------------------------
// 汇总
// ---------------------------------------------------------------------------
console.log(`\n========== 断语专项验证汇总 ==========`);
console.log(`通过: ${passed}  失败: ${failed}`);
if (failed > 0) {
  console.log("失败项：");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
} else {
  console.log("全部通过：金样本断语命中与知识库复算一致，断语纪律（出处/分级/无生死断言/统计）合规。");
}
