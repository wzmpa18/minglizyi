import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = path.join(root, "src", "data", "guoxueClassics.json");
const reportFile = path.join(root, "docs", "reports", "20261004_国学典籍全文目录审计.json");
const write = process.argv.includes("--write");

// Each work must pass both a conservative minimum length and its terminal
// section markers. Short complete works intentionally use smaller thresholds.
const rules = {
  lunyu: [25000, ["學而第一", "堯曰第二十"], 20],
  daxue: [6500, ["大學章句", "凡傳十章"], 10],
  zhongyong: [12000, ["中庸", "第三十三章"], 33],
  yijing: [28000, ["第 一 卦 乾", "第 六十四 卦 未濟"], 64],
  shijing: [40000, ["國風", "商頌"], 305],
  liji: [115000, ["曲禮上第一", "喪服四制第四九"], 49],
  zuozhuan: [210000, ["隱公元年", "哀公二十七年"], 12],
  daodejing_wangbi: [28000, ["一章", "八十一章"], 81],
  huangdi_yinfujing: [600, ["觀天之道", "昭昭乎進乎象矣"], 3],
  qingjingjing: [900, ["老君曰", "真常之道"], 1],
  taishang_ganying: [1400, ["禍福無門", "胡不勉而行之"], 1],
  zhuangzi: [80000, ["【逍遙遊】", "【天下】"], 33],
  liezi: [55000, ["列子卷一", "列子卷八"], 8],
  guiguzi: [7000, ["鬼谷子序", "鬼谷子"], 3],
  mengzi: [43000, ["梁惠王上", "盡心下"], 14],
  xunzi: [150000, ["荀子卷一", "荀子卷二十"], 20],
  xiaojing: [2200, ["開宗明義章·第一", "喪親章·第十八"], 18],
  hanfeizi: [115000, ["初見秦第一", "制分第五十五"], 55],
  shangjunshu: [22000, ["更法第一", "定分第二十六"], 26],
  guanzi: [190000, ["牧民第一", "管子卷二十四"], 86],
  mozi: [70000, ["親士第一", "墨子卷十五"], 71],
  gongsunlongzi: [10500, ["跡府第一", "名實論第六", "《公孫龍子》終"], 6],
  lvshi_chunqiu: [170000, ["孟春紀第一", "呂氏春秋卷二十六"], 160],
  huainanzi: [150000, ["【原道訓】", "【要略】"], 21],
  sunzibingfa: [9000, ["始計第一", "用間第十三"], 13],
  wuzi: [5200, ["圖國第一", "勵士第六"], 6],
  simafa: [4000, ["仁本", "用眾"], 5],
  liutao: [19000, ["文師第一", "犬韜"], 60],
  sanlue: [4500, ["上略", "下略"], 3],
  sushu: [1500, ["原始章第一", "安禮章第六"], 6],
  shanhaijing: [45000, ["【南山經】", "【海內經】"], 18],
  caigentan: [30000, ["前集", "後集"], 2],
  weiluyehua: [8200, ["圍爐夜話", "欲利己"], 221],
  youmengying: [28000, ["序", "幽人夢境"], 1],
  liaofansixun: [10500, ["第一篇 立命之學", "第四篇 謙德之效"], 4],
  sanzijing: [1450, ["人之初", "戒之哉"], 1],
  baijiaxing: [700, ["趙錢孫李", "百家姓終"], 1],
  qianziwen: [1250, ["天地玄黃", "焉哉乎也"], 1],
  dizigui: [1450, ["總序", "聖與賢"], 7],
  zhuzijiaxun: [700, ["黎明即起", "庶乎近焉"], 1],
  shenglvqimeng: [8500, ["卷上", "卷下"], 30],
  zengguangxianwen: [10000, ["上集", "下集"], 2],
};

function cleanSourceNoise(input) {
  let value = String(input || "").replace(/\r\n/g, "\n");
  const lines = value.split("\n").filter((line) => {
    const text = line.trim();
    if (!text) return true;
    if (/^Produced by /i.test(text)) return false;
    if (/^(更多资料|版本信息|姊妹计划|参阅维基百科|更多有声文献|收听本文|此录音根据|中国哲学书电子化计划)/u.test(text)) return false;
    if (/^此.+作品在全世界都属于公有领域/u.test(text)) return false;
    if (/^Public domain/i.test(text)) return false;
    if (/^↑/u.test(text)) return false;
    if (/^校勘記$/u.test(text)) return false;
    return true;
  });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

const payload = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const results = [];
const ids = new Set();
for (const book of payload.books) {
  const rule = rules[book.id];
  const content = cleanSourceNoise(book.content);
  const errors = [];
  if (!rule) errors.push("未登记完整性规则");
  if (ids.has(book.id)) errors.push("ID重复");
  ids.add(book.id);
  if (!book.category) errors.push("目录为空");
  if (!book.sourceUrl || !book.license) errors.push("来源或许可为空");
  if (rule) {
    const [minChars, markers, sectionCount] = rule;
    if (content.length < minChars) errors.push(`正文过短 ${content.length}<${minChars}`);
    const compact = content.replace(/\s+/g, "");
    for (const marker of markers) if (!compact.includes(marker.replace(/\s+/g, ""))) errors.push(`缺少终端标记：${marker}`);
    if (!errors.length && write) {
      book.content = content;
      book.completeness = "full";
      book.sectionCount = sectionCount;
      book.verifiedAt = "2026-10-04";
    }
  }
  results.push({ id: book.id, title: book.title, category: book.category, chars: content.length, status: errors.length ? "blocked" : "full", errors });
}

const failed = results.filter((row) => row.status !== "full");
fs.mkdirSync(path.dirname(reportFile), { recursive: true });
fs.writeFileSync(reportFile, JSON.stringify({ schema: "yandao.guoxue.catalog-audit.v1", generatedAt: new Date().toISOString(), total: results.length, full: results.length - failed.length, blocked: failed.length, books: results }, null, 2));
if (failed.length) {
  for (const row of failed) console.error(`BLOCK ${row.id}: ${row.errors.join("；")}`);
  process.exitCode = 1;
} else {
  if (write) fs.writeFileSync(dataFile, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`PASS ${results.length}/${results.length} complete books${write ? "; catalogue updated" : ""}`);
}
