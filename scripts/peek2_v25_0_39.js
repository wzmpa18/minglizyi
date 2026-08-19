#!/usr/bin/env node
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const D = new Database('/www/yandaoguoxue-backend/data/academy.db');
const g = (sql, ...a) => D.prepare(sql).all(...a);

console.log('== 题型分布(pending yikao) ==');
for (const r of g("SELECT type, COUNT(*) n FROM questions WHERE track='yikao' AND status='pending' GROUP BY type")) console.log(`  ${r.type}: ${r.n}`);

console.log('== 选项数量分布(pending yikao, single) ==');
for (const r of g("SELECT LENGTH(options)-LENGTH(REPLACE(options,',',''))+1 opts, COUNT(*) n FROM questions WHERE track='yikao' AND status='pending' AND type='single' GROUP BY opts")) console.log(`  ${r.opts}项: ${r.n}`);

console.log('== q_score 分布(pending) ==');
for (const r of g("SELECT q_score, COUNT(*) n FROM questions WHERE track='yikao' AND status='pending' GROUP BY q_score ORDER BY q_score")) console.log(`  ${r.q_score}: ${r.n}`);

console.log('== q_checks 含失败项的 pending 题 ==');
const pend = g("SELECT id, type, stem, options, answer, q_checks, category, difficulty FROM questions WHERE track='yikao' AND status='pending'");
let failCnt = 0; const failBy = {};
for (const q of pend) {
  let checks = []; try { checks = JSON.parse(q.q_checks || '[]'); } catch {}
  const fails = checks.filter(c => !c.pass);
  if (fails.length) { failCnt++; for (const f of fails) failBy[f.name] = (failBy[f.name] || 0) + 1; }
}
console.log(`  含失败项题目: ${failCnt}/${pend.length}`);
console.log('  失败项分布:', JSON.stringify(failBy));

console.log('== 短题干样例（题干完整性失败）==');
for (const q of pend) {
  let checks = []; try { checks = JSON.parse(q.q_checks || '[]'); } catch {}
  const f = checks.find(c => c.name === '题干完整性' && !c.pass);
  if (f) { console.log(`  #${q.id} [${q.category}/${q.type}] "${q.stem.slice(0,40)}" note=${f.note}`); }
}

console.log('== dup_tier 分布(pending) ==');
for (const r of g("SELECT dup_tier, COUNT(*) n FROM questions WHERE track='yikao' AND status='pending' GROUP BY dup_tier")) console.log(`  tier${r.dup_tier}: ${r.n}`);

console.log('== 知识点未审核的 pending 题 ==');
console.log(g("SELECT COUNT(*) n FROM questions q WHERE q.track='yikao' AND q.status='pending' AND NOT EXISTS (SELECT 1 FROM knowledge_points k WHERE k.id=q.knowledge_id AND k.status='approved')").get().n);

console.log('== answer 格式分布 ==');
for (const r of g("SELECT type, LENGTH(answer) al, COUNT(*) n FROM questions WHERE track='yikao' AND status='pending' GROUP BY type, al")) console.log(`  ${r.type} len${r.al}: ${r.n}`);
