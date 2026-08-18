#!/usr/bin/env node
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const db = new Database('/www/yandaoguoxue-backend/data/academy.db', { readonly: true });

// 完整样题3道
const rows = db.prepare(`SELECT id, type, stem, options, answer, analysis, difficulty FROM questions
  WHERE track='yikao' AND category='方剂学' AND status='approved' ORDER BY id LIMIT 3`).all();
for (const r of rows) {
  console.log(`\n===== id=${r.id} type=${r.type} difficulty=${r.difficulty} =====`);
  console.log('题干:', r.stem);
  console.log('选项:', r.options);
  console.log('答案:', r.answer);
  console.log('解析:', r.analysis);
}

// 解析过短的4道题详情
const short = db.prepare(`SELECT id, stem, length(analysis) len, analysis FROM questions
  WHERE track='yikao' AND category='方剂学' AND status='approved' AND length(analysis) < 30`).all();
console.log('\n===== 解析过短题目 =====');
for (const s of short) console.log(`[${s.id}] len=${s.len} | ${s.stem.slice(0, 50)} | 解析: ${s.analysis}`);

// 答案格式分布
const ansFmt = db.prepare(`SELECT answer, COUNT(*) c FROM questions WHERE track='yikao' AND category='方剂学' AND status='approved' GROUP BY answer ORDER BY c DESC LIMIT 8`).all();
console.log('\n答案值分布(前8):', JSON.stringify(ansFmt));

// 对照：其他已上线 yikao 科目的选项键格式
const other = db.prepare(`SELECT category, options FROM questions WHERE track='yikao' AND status='approved' AND category != '方剂学' LIMIT 2`).all();
console.log('\n其他科目选项样例:');
for (const o of other) console.log(`[${o.category}] ${o.options.slice(0, 120)}`);
