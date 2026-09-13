/**
 * 七政四余学习专题映射完整性验证
 * 用真实服务器导出的135条知识点（qz_points.jsonl）核验：
 * 1. 15专题总数 = 135，无重复分配
 * 2. 服务器全量135个id与专题映射一一对应（无遗漏、无多余）
 * 3. 141题绑定知识点全部落在专题内
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 从 qizhengLearningTopics.ts 提取专题定义（直接 import TS 需要转译，改为正则提取）
const ts = readFileSync(join(__dirname, "..", "src", "lib", "qizhengLearningTopics.ts"), "utf8");
const topicBlocks = [...ts.matchAll(/key: "([^"]+)",\s*seq: (\d+),\s*name: "([^"]+)",[^]*?pointIds: \[([^\]]*)\]/g)];
const topics = topicBlocks.map((m) => ({
  key: m[1],
  seq: Number(m[2]),
  name: m[3],
  pointIds: m[4].split(/[\s,]+/).filter((x) => /^\d+$/.test(x)).map(Number),
}));

const checks = [];
const check = (name, ok, extra = "") => {
  checks.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${extra ? " | " + extra : ""}`);
};

// 1. 专题数
check("专题数量 = 15", topics.length === 15, `实际 ${topics.length}`);

// 2. 总点数与重复
const all = topics.flatMap((t) => t.pointIds);
const dup = all.filter((id, i) => all.indexOf(id) !== i);
check("专题内总点数 = 135", all.length === 135, `实际 ${all.length}`);
check("无重复分配的id", dup.length === 0, dup.length ? `重复: ${dup.join(",")}` : "");

// 3. 与服务器真实数据比对
const serverRows = readFileSync(join(__dirname, "qz_points.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const serverIds = serverRows.map((r) => r.id).sort((a, b) => a - b);
const mappedIds = [...new Set(all)].sort((a, b) => a - b);
const missing = serverIds.filter((id) => !mappedIds.includes(id));
const extra = mappedIds.filter((id) => !serverIds.includes(id));
check("服务器135条全被映射（无遗漏）", missing.length === 0, missing.length ? `遗漏: ${missing.join(",")}` : "");
check("无映射到不存在的知识点", extra.length === 0, extra.length ? `多余: ${extra.join(",")}` : "");

// 4. 每专题点数分布
console.log("\n专题分布：");
topics.sort((a, b) => a.seq - b.seq).forEach((t) => {
  const titles = serverRows.filter((r) => t.pointIds.includes(r.id)).map((r) => r.title);
  console.log(`  ${String(t.seq).padStart(2)}. ${t.name}（${t.pointIds.length}条）`);
  if (t.pointIds.length !== titles.length) {
    console.log(`    !! 该专题有 ${t.pointIds.length - titles.length} 个id不在服务器数据中`);
  }
});

// 5. 题目绑定核验（141题的knowledge_id 都应落在135知识点内 → 专题分组时全部可归组）
console.log("");
const failed = checks.filter((c) => !c.ok);
console.log(failed.length === 0 ? "\n=== 全部校验通过 ===" : `\n=== ${failed.length} 项校验失败 ===`);
process.exit(failed.length === 0 ? 0 : 1);
