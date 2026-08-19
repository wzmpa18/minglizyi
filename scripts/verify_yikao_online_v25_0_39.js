#!/usr/bin/env node
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const D = new Database('/www/yandaoguoxue-backend/data/academy.db');

console.log('== 医考题目最终状态 ==');
for (const r of D.prepare("SELECT status, COUNT(*) n FROM questions WHERE track='yikao' GROUP BY status").all()) console.log(`  ${r.status}: ${r.n}`);

console.log('== 各科目已上线题数 ==');
for (const r of D.prepare("SELECT category, COUNT(*) n FROM questions WHERE track='yikao' AND status='approved' GROUP BY category ORDER BY n DESC").all()) console.log(`  ${r.category}: ${r.n}`);

console.log('== 9大核心科目核验 ==');
const core = ['中医基础理论', '中药学', '方剂学', '中医诊断学', '针灸学', '中医内科学', '中医外科学', '中医妇科学', '中医儿科学'];
let allOk = true;
for (const c of core) {
  const n = D.prepare("SELECT COUNT(*) n FROM questions WHERE track='yikao' AND status='approved' AND category=?").get(c).n;
  if (n === 0) allOk = false;
  console.log(`  ${c}: ${n}${n === 0 ? ' ← 缺!' : ''}`);
}
console.log(allOk ? '  ✓ 9大核心科目全部有可用题目' : '  ✗ 存在缺失科目');

console.log('== 退回题目留痕 ==');
for (const r of D.prepare("SELECT id, reject_reason FROM questions WHERE track='yikao' AND status='rejected' AND reject_reason LIKE 'v25.0.39%'").all()) {
  console.log(`  #${r.id} ${r.reject_reason}`);
}
console.log('== loc_op_logs 最近3条 ==');
for (const r of D.prepare("SELECT action, detail, created_at FROM loc_op_logs ORDER BY id DESC LIMIT 3").all()) {
  console.log(`  [${r.created_at}] ${r.action}: ${String(r.detail).slice(0, 100)}`);
}
