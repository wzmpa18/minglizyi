#!/usr/bin/env node
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const D = new Database('/www/yandaoguoxue-backend/data/academy.db');
const g = (sql, ...args) => D.prepare(sql).all(...args);

console.log('== 医考轨道题目状态 ==');
for (const r of g("SELECT status, COUNT(*) n FROM questions WHERE track='yikao' GROUP BY status")) console.log(`  ${r.status}: ${r.n}`);

console.log('== 医考各科目题目（pending/approved）==');
for (const r of g("SELECT category, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pend, SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) ok FROM questions WHERE track='yikao' GROUP BY category ORDER BY pend DESC")) {
  console.log(`  ${r.category}: pending ${r.pend} / approved ${r.ok}`);
}

console.log('== 医考科目知识点覆盖 ==');
for (const r of g("SELECT category, COUNT(*) n, SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) ok FROM knowledge_points WHERE track='yikao' GROUP BY category ORDER BY n DESC")) {
  console.log(`  ${r.category}: KP ${n_or(r.n)}(审${n_or(r.ok)})`);
}
function n_or(v) { return v || 0; }

console.log('== 医考题目污染抽检（倪海厦/老师/流派词）==');
const dirty = g("SELECT id, substr(stem,1,50) s FROM questions WHERE track='yikao' AND (stem LIKE '%倪海厦%' OR stem LIKE '%人纪%' OR options LIKE '%倪海厦%' OR explanation LIKE '%倪海厦%') LIMIT 10");
console.log(`  命中 ${dirty.length} 条`);
for (const r of dirty) console.log(`  #${r.id} ${r.s}`);

console.log('== 学习资料专题/来源标签（自学中医板块）==');
for (const r of g("SELECT DISTINCT category FROM materials WHERE track='zhongyi' ORDER BY category")) console.log(`  ${r.category}`);
