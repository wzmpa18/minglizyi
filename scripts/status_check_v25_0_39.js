#!/usr/bin/env node
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const D = new Database('/www/yandaoguoxue-backend/data/academy.db');

const g = (sql, ...args) => D.prepare(sql).all(...args);

console.log('== 中医轨道材料状态 ==');
for (const r of g("SELECT status, COUNT(*) n FROM materials WHERE track='zhongyi' GROUP BY status")) console.log(`  ${r.status}: ${r.n}`);

console.log('== 中医知识点状态 ==');
for (const r of g("SELECT status, COUNT(*) n FROM knowledge_points WHERE track='zhongyi' GROUP BY status")) console.log(`  ${r.status}: ${r.n}`);

console.log('== 中医题目状态 ==');
for (const r of g("SELECT status, COUNT(*) n FROM questions WHERE track='zhongyi' GROUP BY status")) console.log(`  ${r.status}: ${r.n}`);

console.log('== 倪海厦专区类目覆盖 ==');
for (const r of g("SELECT m.category category, COUNT(DISTINCT m.id) mats, SUM(CASE WHEN k.status='approved' THEN 1 ELSE 0 END) ok_kp, COUNT(k.id) total_kp FROM materials m LEFT JOIN knowledge_points k ON k.material_id=m.id WHERE m.track='zhongyi' AND m.category LIKE '倪海厦%' GROUP BY m.category")) {
  console.log(`  ${r.category}: 材料${r.mats}部 知识点${r.total_kp}(已审${r.ok_kp})`);
}

console.log('== 未完成材料(pending/parsing) ==');
for (const r of g("SELECT id, substr(title,1,30) t, status, category FROM materials WHERE status IN ('pending','parsing') ORDER BY id")) {
  console.log(`  #${r.id} [${r.status}] ${r.t} (${r.category})`);
}

console.log('== 公共大类知识点/题目覆盖 ==');
for (const r of g(`SELECT k.category, COUNT(*) kp, SUM(CASE WHEN k.status='approved' THEN 1 ELSE 0 END) kp_ok FROM knowledge_points k WHERE k.track='zhongyi' AND k.category NOT LIKE '倪海厦%' GROUP BY k.category ORDER BY k.category`)) {
  const q = D.prepare("SELECT COUNT(*) n, SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) ok FROM questions WHERE track='zhongyi' AND category=?").get(r.category);
  console.log(`  ${r.category}: KP ${r.kp}(审${r.kp_ok}) 题 ${q.n}(上线${q.ok})`);
}

console.log('== gen_tasks 运行中 ==');
for (const r of g("SELECT id, track, category, status, done_groups, total_groups, created_q FROM gen_tasks WHERE status IN ('running','pending') ORDER BY id DESC LIMIT 5")) {
  console.log(`  #${r.id} ${r.track}/${r.category} ${r.status} ${r.done_groups}/${r.total_groups} 已出${r.created_q}`);
}
