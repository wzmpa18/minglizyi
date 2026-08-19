#!/usr/bin/env node
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const D = new Database('/www/yandaoguoxue-backend/data/academy.db');

console.log(D.prepare("SELECT sql FROM sqlite_master WHERE name='questions'").get().sql);
console.log('\n== 样例题目 2 条 ==');
for (const r of D.prepare("SELECT * FROM questions WHERE track='yikao' AND status='pending' LIMIT 2").all()) {
  console.log(JSON.stringify(r, null, 1).slice(0, 1500));
}
console.log('\n== q_checks 字段分布 ==');
for (const r of D.prepare("SELECT q_checks, COUNT(*) n FROM questions WHERE track='yikao' AND status='pending' GROUP BY q_checks LIMIT 10").all()) {
  console.log(`  ${String(r.q_checks).slice(0, 80)}: ${r.n}`);
}
console.log('\n== 知识点映射为空的 pending 题目 ==');
console.log(D.prepare("SELECT COUNT(*) n FROM questions WHERE track='yikao' AND status='pending' AND (knowledge_id IS NULL OR knowledge_id=0)").get().n);
