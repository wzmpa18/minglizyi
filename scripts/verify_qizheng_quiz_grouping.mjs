/**
 * 141题专题分组验证：按 ClientPage 相同算法（knowledgeId → 专题）模拟分组
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ts = readFileSync(join(__dirname, "..", "src", "lib", "qizhengLearningTopics.ts"), "utf8");
const topicBlocks = [...ts.matchAll(/key: "([^"]+)",\s*seq: (\d+),\s*name: "([^"]+)",[^]*?pointIds: \[([^\]]*)\]/g)];
const topics = topicBlocks.map((m) => ({
  key: m[1], seq: Number(m[2]), name: m[3],
  pointIds: m[4].split(/[\s,]+/).filter((x) => /^\d+$/.test(x)).map(Number),
}));

const TOPIC_OF_POINT = new Map();
for (const t of topics) for (const id of t.pointIds) TOPIC_OF_POINT.set(id, t);

const questions = readFileSync(join(__dirname, "qz_questions.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));

const groups = topics.map((t) => ({ topic: t, qs: [] }));
const byKey = new Map(groups.map((g) => [g.topic.key, g]));
const misc = [];
for (const q of questions) {
  const t = TOPIC_OF_POINT.get(Number(q.knowledge_id));
  const g = t ? byKey.get(t.key) : undefined;
  if (g) g.qs.push(q);
  else misc.push(q);
}

console.log(`题目总数: ${questions.length}`);
console.log(`归组成功: ${questions.length - misc.length}`);
console.log(`misc 兜底组: ${misc.length}${misc.length ? " ← FAIL" : ""}`);
console.log("");
groups.sort((a, b) => a.topic.seq - b.topic.seq).forEach((g) => {
  if (g.qs.length === 0) return;
  const types = {};
  g.qs.forEach((q) => { types[q.type] = (types[q.type] || 0) + 1; });
  console.log(`${String(g.topic.seq).padStart(2)}. ${g.topic.name} · 练习 ${g.qs.length} 题 [${Object.entries(types).map(([t, n]) => `${t}×${n}`).join(" ")}]`);
});

const empty = groups.filter((g) => g.qs.length === 0);
console.log(`\n无题专题: ${empty.map((g) => g.topic.name).join("、") || "无"}`);
console.log(misc.length === 0 && groups.reduce((s, g) => s + g.qs.length, 0) === 141 ? "\n=== 题目分组校验通过（141/141 全部归入专题，无兜底组）===" : "\n=== FAIL ===");
process.exit(misc.length === 0 ? 0 : 1);
