#!/usr/bin/env node
// 中医学习板块覆盖缺口勘察（服务器只读查询）
'use strict';
const D = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3')('/www/yandaoguoxue-backend/data/academy.db', { readonly: true });

const cats = D.prepare("SELECT id, name FROM categories WHERE track = 'zhongyi' ORDER BY id").all();
console.log('===== zhongyi 轨道类目覆盖 =====');
for (const c of cats) {
  const kp = D.prepare("SELECT COUNT(*) n, SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) p FROM knowledge_points WHERE category = ?").get(c.name);
  const q = D.prepare("SELECT COUNT(*) n, SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) a FROM questions WHERE category = ?").get(c.name);
  console.log(`${c.id}\t${c.name}\t知识点:${kp.n}(发布${kp.p || 0})\t题目:${q.n}(上线${q.a || 0})`);
}

console.log('\n===== 知识点状态分布（zhongyi） =====');
const st = D.prepare("SELECT status, COUNT(*) n FROM knowledge_points WHERE track='zhongyi' GROUP BY status").all();
for (const r of st) console.log(r.status, r.n);

console.log('\n===== 题目状态分布（zhongyi） =====');
const qs = D.prepare("SELECT status, COUNT(*) n FROM questions WHERE track='zhongyi' GROUP BY status").all();
for (const r of qs) console.log(r.status, r.n);

console.log('\n===== 医考轨道对照 =====');
const ykCats = D.prepare("SELECT COUNT(*) c FROM categories WHERE track='yikao'").get();
const ykQ = D.prepare("SELECT COUNT(*) n FROM questions WHERE track='yikao'").get();
const ykApproved = D.prepare("SELECT COUNT(*) n FROM questions WHERE track='yikao' AND status='approved'").get();
console.log(`医考类目:${ykCats.c} 题目:${ykQ.n} 上线:${ykApproved.n}`);
const ykPerCat = D.prepare("SELECT category, COUNT(*) n, SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) a FROM questions WHERE track='yikao' GROUP BY category ORDER BY a DESC").all();
for (const r of ykPerCat) console.log(`${r.category}\t题:${r.n}\t上线:${r.a || 0}`);

console.log('\n===== 学习资料（materials）zhongyi 登记情况 =====');
const mats = D.prepare("SELECT id, title, status, category, LENGTH(text_content) len FROM materials WHERE track='zhongyi' ORDER BY id").all();
for (const m of mats) console.log(`${m.id}\t${String(m.title).slice(0, 28)}\t${m.status}\t${m.category || '-'}\t${m.len}字`);
console.log('zhongyi资料总数:', mats.length);
const matOther = D.prepare("SELECT track, COUNT(*) n FROM materials GROUP BY track").all();
console.log('全部资料分布:', JSON.stringify(matOther));
