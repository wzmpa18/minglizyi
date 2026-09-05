/**
 * B3-2 易学九学科学习资料构建（IOS-4.3B-RECOVERY §九 §十）
 * 从 App 内置知识数据（项目合法拥有资料）导出为知识工厂可解析的学习资料 MD。
 * 产出 5 份新资料：紫微斗数 / 梅花易数 / 六爻 / 大六壬 / 传统历法
 * 用法：npx tsx scripts/build_yixue_materials.ts
 */
import * as fs from "fs";
import * as path from "path";
import {
  GUA_INTERPRETATIONS,
  LIUSHEN_INTERPRETATIONS,
  LIUQIN_INTERPRETATIONS,
  SHIYING_INTERPRETATIONS,
} from "../src/lib/liuyao-interpretations";
import {
  KB_STAR_NOTES,
  KB_AUX_STAR_NOTES,
  KB_STAR_PALACE_SUPPLEMENTS,
  KB_OVERLAY_GUIDE,
  KB_TIMING_RULES,
  KB_TIANJI_SOURCE,
  KB_TIANJI_PALACE_NOTES,
  KB_TIANJI_SIHUA_NOTES,
  KB_TIANJI_TIMING_NOTES,
  KB_TIANJI_PATTERNS,
  KB_TIANJI_ZIWEI_LAYOUT,
} from "../src/lib/ziwei-kb-supplement";
import {
  KETI_INTERPRETATIONS,
  TIANJIANG_INTERPRETATIONS,
  ZHI_DLR_INTERPRETATIONS,
  getLiuqinInterpretation,
  getSanChuanInterpretation,
  getSiKeInterpretation,
} from "../src/lib/daliuren-interpretations";
import {
  GANZHI_DETAILS,
  JIEQI_DETAILS,
  SHICHEN_DETAILS,
} from "../src/lib/calendar-interpretations";

const OUT_DIR = path.join(__dirname, "..", "tmp", "yixue_materials");
fs.mkdirSync(OUT_DIR, { recursive: true });

function w(file: string, content: string) {
  fs.writeFileSync(path.join(OUT_DIR, file), content, "utf8");
  console.log(`[OK] ${file} (${(content.length / 1000).toFixed(1)}k chars)`);
}

// ==================== 1. 六爻经典解读知识库 ====================
function buildLiuyao(): string {
  const L: string[] = [];
  L.push("# 六爻经典解读知识库（App 内置 · 学习版）");
  L.push("");
  L.push("> 内容来源：App 六爻工具内置经典解读数据库，引经据典于《周易》《火珠林》《卜筮正宗》《增删卜易》《断易天机》等典籍。本资料仅用于传统文化学习研究。");
  L.push("");

  L.push("## 卷一：六十四卦解读");
  L.push("");
  for (const g of Object.values(GUA_INTERPRETATIONS)) {
    L.push(`### ${g.name}`);
    L.push("");
    L.push(`${g.title}。${g.summary}`);
    L.push("");
    for (const d of g.details) L.push(`- ${d}`);
    L.push("");
    L.push(`【典籍来源：${g.source}】`);
    L.push("");
  }

  L.push("## 卷二：六神解读");
  L.push("");
  for (const s of Object.values(LIUSHEN_INTERPRETATIONS)) {
    L.push(`### ${s.shen}`);
    L.push("");
    L.push(s.summary);
    L.push("");
    for (const d of s.details) L.push(`- ${d}`);
    L.push("");
    L.push(`【典籍来源：${s.source}】`);
    L.push("");
  }

  L.push("## 卷三：六亲解读");
  L.push("");
  for (const q of Object.values(LIUQIN_INTERPRETATIONS)) {
    L.push(`### ${q.qin}`);
    L.push("");
    L.push(q.summary);
    L.push("");
    for (const d of q.details) L.push(`- ${d}`);
    L.push("");
    L.push(`【典籍来源：${q.source}】`);
    L.push("");
  }

  L.push("## 卷四：世应解读");
  L.push("");
  for (const sy of Object.values(SHIYING_INTERPRETATIONS)) {
    L.push(`### ${sy.type === "世" ? "世爻" : "应爻"}`);
    L.push("");
    L.push(sy.summary);
    L.push("");
    for (const d of sy.details) L.push(`- ${d}`);
    L.push("");
    L.push(`【典籍来源：${sy.source}】`);
    L.push("");
  }
  return L.join("\n");
}

// ==================== 2. 紫微斗数补充知识库 ====================
function buildZiweiSupplement(): string {
  const L: string[] = [];
  L.push("# 紫微斗数补充知识库（App 内置 · 学习版）");
  L.push("");
  L.push(`> 内容来源：App 紫微斗数工具内置知识库补充（${KB_TIANJI_SOURCE} 等编者整理资料）。本资料仅用于传统文化学习研究。`);
  L.push("");

  L.push("## 卷一：十四主星赋性断语");
  L.push("");
  for (const s of KB_STAR_NOTES) {
    L.push(`### ${s.star}`);
    L.push("");
    L.push(`**性质**：${s.nature}`);
    L.push("");
    L.push(`**核心特质**：${s.traits}`);
    L.push("");
    if (s.patterns.length) {
      L.push("**格局组合**：");
      for (const p of s.patterns) L.push(`- ${p}`);
      L.push("");
    }
    if (s.sihua.length) {
      L.push("**四化要点**：");
      for (const p of s.sihua) L.push(`- ${p}`);
      L.push("");
    }
    L.push(`**流年重点**：${s.yearly}`);
    L.push("");
  }

  L.push("## 卷二：辅星赋性断语");
  L.push("");
  for (const s of KB_AUX_STAR_NOTES) {
    L.push(`### ${s.group}（${s.stars.join("、")}）`);
    L.push("");
    for (const p of s.lines) L.push(`- ${p}`);
    L.push("");
  }

  L.push("## 卷三：星曜宫位补充断语");
  L.push("");
  for (const sp of KB_STAR_PALACE_SUPPLEMENTS) {
    L.push(`- **${sp.star} 入 ${sp.palace}**：${sp.interpretation}`);
  }
  L.push("");

  L.push("## 卷四：星曜叠加指南");
  L.push("");
  for (const g of KB_OVERLAY_GUIDE) {
    L.push(`### ${g.title}（${g.type}）`);
    L.push("");
    L.push(g.content);
    L.push("");
  }

  L.push("## 卷五：时限推演规则");
  L.push("");
  for (const t of KB_TIMING_RULES) {
    L.push(`### ${t.title}`);
    L.push("");
    L.push(t.content);
    L.push("");
  }

  L.push(`## 卷六：${KB_TIANJI_SOURCE} 十二宫笔记`);
  L.push("");
  for (const [palace, notes] of Object.entries(KB_TIANJI_PALACE_NOTES)) {
    L.push(`### ${palace}`);
    L.push("");
    for (const n of notes) L.push(`- ${n}`);
    L.push("");
  }

  L.push("## 卷七：四化笔记");
  L.push("");
  for (const [name, notes] of Object.entries(KB_TIANJI_SIHUA_NOTES)) {
    L.push(`### ${name}`);
    L.push("");
    for (const n of notes) L.push(`- ${n}`);
    L.push("");
  }

  L.push("## 卷八：时限推演笔记");
  L.push("");
  for (const n of KB_TIANJI_TIMING_NOTES) L.push(`- ${n}`);
  L.push("");

  L.push("## 卷九：常见格局");
  L.push("");
  for (const n of KB_TIANJI_PATTERNS) L.push(`- ${n}`);
  L.push("");

  L.push("## 卷十：紫微星系布局笔记");
  L.push("");
  for (const [name, notes] of Object.entries(KB_TIANJI_ZIWEI_LAYOUT)) {
    L.push(`### ${name}`);
    L.push("");
    for (const n of notes) L.push(`- ${n}`);
    L.push("");
  }
  return L.join("\n");
}

// ==================== 3. 大六壬补充知识库 ====================
function buildDaliurenSupplement(): string {
  const L: string[] = [];
  L.push("# 大六壬补充知识库（App 内置 · 学习版）");
  L.push("");
  L.push("> 内容来源：App 大六壬工具内置经典解读数据库，引经据典于《大六壬大全》《大六壬指南》等典籍。本资料仅用于传统文化学习研究。");
  L.push("");

  L.push("## 卷一：九宗门课体解读");
  L.push("");
  for (const k of Object.values(KETI_INTERPRETATIONS)) {
    L.push(`### ${k.name}（${k.title}）`);
    L.push("");
    L.push(k.summary);
    L.push("");
    for (const d of k.details) L.push(`- ${d}`);
    L.push("");
    L.push(`【典籍来源：${k.source}】`);
    L.push("");
  }

  L.push("## 卷二：十二天将解读");
  L.push("");
  for (const t of Object.values(TIANJIANG_INTERPRETATIONS)) {
    L.push(`### ${t.fullName}（${t.name}）`);
    L.push("");
    L.push(t.summary);
    L.push("");
    for (const d of t.details) L.push(`- ${d}`);
    L.push("");
    L.push(`【典籍来源：${t.source}】`);
    L.push("");
  }

  L.push("## 卷三：十二地支解读（大六壬视角）");
  L.push("");
  for (const z of Object.values(ZHI_DLR_INTERPRETATIONS)) {
    L.push(`### ${z.title}`);
    L.push("");
    L.push(z.summary);
    L.push("");
    for (const d of z.details) L.push(`- ${d}`);
    L.push("");
    L.push(`【典籍来源：${z.source}】`);
    L.push("");
  }

  L.push("## 卷四：六亲类象解读");
  L.push("");
  for (const key of ["父", "兄", "子", "财", "官", "我"]) {
    L.push(`- ${getLiuqinInterpretation(key)}`);
  }
  L.push("");

  L.push("## 卷五：三传位置解读");
  L.push("");
  for (const pos of ["初", "中", "末"]) {
    const r = getSanChuanInterpretation(pos, "子", "父", "贵人", "甲");
    for (const it of r.items.filter((i) => i.type === "position")) {
      L.push(`### ${it.title}`);
      L.push("");
      L.push(it.content);
      L.push("");
      L.push(`【典籍来源：${it.source}】`);
      L.push("");
    }
  }

  L.push("## 卷六：四课位置解读");
  L.push("");
  for (const ke of ["一", "二", "三", "四"]) {
    const r = getSiKeInterpretation(ke, "子", "子", "贵人", "甲");
    for (const it of r.items.filter((i) => i.type === "position")) {
      L.push(`### ${it.title}`);
      L.push("");
      L.push(it.content);
      L.push("");
      L.push(`【典籍来源：${it.source}】`);
      L.push("");
    }
  }
  return L.join("\n");
}

// ==================== 4. 传统历法知识库 ====================
function buildCalendar(): string {
  const L: string[] = [];
  L.push("# 传统历法知识库（App 内置 · 学习版）");
  L.push("");
  L.push("> 内容来源：App 历法工具内置解读数据库（干支、节气、时辰）。本资料仅用于传统历法文化学习研究。");
  L.push("");

  L.push("## 卷一：干支纪年基础");
  L.push("");
  L.push("十天干为：甲、乙、丙、丁、戊、己、庚、辛、壬、癸。");
  L.push("十二地支为：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。");
  L.push("天干与地支依次相配，阳干配阳支、阴干配阴支，组成六十个基本单位，称六十甲子，周而复始，用于纪年、纪月、纪日、纪时。");
  L.push("");
  L.push("### 六十甲子干支解读（示例）");
  L.push("");
  for (const [gz, info] of Object.entries(GANZHI_DETAILS)) {
    L.push(`#### ${gz}`);
    L.push("");
    L.push(info.summary);
    L.push("");
    for (const d of info.details) L.push(`- ${d}`);
    L.push("");
  }

  L.push("## 卷二：二十四节气");
  L.push("");
  L.push("二十四节气是干支历中表示自然节律变化的特定节令，现行的“二十四节气”依据太阳在回归黄道上的位置制定，将一年划分为二十四个等份，反映四季、气温、物候等自然现象的变化规律。");
  L.push("");
  L.push("节气分为“节”与“气”两类，交替排列：");
  L.push("- 十二节（月令分界）：立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒。节是月令的分界点，每到一个“节”即进入下一个月份。");
  L.push("- 十二气（节气中点）：雨水、春分、谷雨、小满、夏至、大暑、处暑、秋分、霜降、小雪、冬至、大寒。气是节气的中点，标志每个节气时段内的气候特征。");
  L.push("");
  L.push("### 二十四节气解读");
  L.push("");
  for (const [jq, info] of Object.entries(JIEQI_DETAILS)) {
    L.push(`#### ${jq}`);
    L.push("");
    L.push(info.summary);
    L.push("");
    for (const d of info.details) L.push(`- ${d}`);
    L.push("");
  }

  L.push("## 卷三：十二时辰");
  L.push("");
  L.push("古代将一昼夜划分为十二时辰，以地支纪之，每个时辰相当于现在的两个小时。");
  L.push("");
  for (const [sc, info] of Object.entries(SHICHEN_DETAILS)) {
    L.push(`### ${info.summary.split("，")[0]}（${sc}时）`);
    L.push("");
    L.push(info.summary);
    L.push("");
    for (const d of info.details) L.push(`- ${d}`);
    L.push("");
  }
  return L.join("\n");
}

// ==================== 主流程 ====================
const KB_DIR = "E:\\八字命理类文档包括排盘方式电子版\\整理出来的命理类核心文件";

function read(p: string): string {
  return fs.readFileSync(p, "utf8");
}

// 清理 E 盘 KB 的噪音行（本地素材路径 / 待填充标记），保留正文
function cleanKb(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^【本地素材：.*】\s*$/.test(line.trim()))
    .filter((line) => !/^【古籍溯源：待后端AI接口联网检索填充】\s*$/.test(line.trim()))
    .join("\n");
}

// 资料级编纂纪律声明（策略§十：古籍断语仅为古籍记载）
const DISCIPLINE_NOTE =
  "\n> **编纂纪律**：本文档所涉古籍断语（含吉凶、灾祸、寿夭等表述）均为古籍记载之摘录，仅供传统文化学习研究之用，不构成任何现实预测或吉凶断言。\n";

const liuyaoMd = buildLiuyao();
w("六爻经典解读知识库.md", liuyaoMd);

const ziweiSup = buildZiweiSupplement();
w("紫微斗数补充知识库.md", ziweiSup);

const dlrSup = buildDaliurenSupplement();
w("大六壬补充知识库.md", dlrSup);

const calMd = buildCalendar();
w("传统历法知识库.md", calMd);

// 合成最终 5 份上传资料（KB 清理 + 编纂纪律声明）
const ziweiKb = cleanKb(read(path.join(KB_DIR, "ziwei_standard_kb.md")));
const meihuaKb = cleanKb(read(path.join(KB_DIR, "meihualiuyao_standard_kb_v2.md")));
const dlrKb = cleanKb(read(path.join(KB_DIR, "daliuren_standard_kb_v2.md")));

w("M_紫微斗数学习资料.md", `${ziweiKb}${DISCIPLINE_NOTE}\n---\n${ziweiSup}`);
w("M_梅花易数学习资料.md", `${meihuaKb}${DISCIPLINE_NOTE}`);
w("M_六爻学习资料.md", `${liuyaoMd}${DISCIPLINE_NOTE}`);
w("M_大六壬学习资料.md", `${dlrKb}${DISCIPLINE_NOTE}\n---\n${dlrSup}`);
w("M_传统历法学习资料.md", calMd);

console.log("\n[BUILD_DONE] 5 份学习资料已生成于 tmp/yixue_materials/");
