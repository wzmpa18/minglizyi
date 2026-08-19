#!/usr/bin/env node
// 轨道隔离精确勘察：zhongyi 真实覆盖（track 限定）+ 医考污染明细 + 同名类目混叠
'use strict';
const D = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3')('/www/yandaoguoxue-backend/data/academy.db', { readonly: true });

console.log('===== zhongyi 轨道真实覆盖（track=zhongyi 限定） =====');
const cats = D.prepare("SELECT id, name FROM categories WHERE track='zhongyi' AND status='active' ORDER BY sort, id").all();
for (const c of cats) {
  const kp = D.prepare("SELECT COUNT(*) n FROM knowledge_points WHERE category=? AND track='zhongyi'").get(c.name);
  const q = D.prepare("SELECT COUNT(*) n, SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) a FROM questions WHERE category=? AND track='zhongyi'").get(c.name);
  console.log(`${c.id}\t${c.name}\tKP:${kp.n}\t题:${q.n}(上线${q.a || 0})`);
}

console.log('\n===== 同名类目跨轨道混叠检测 =====');
const dup = D.prepare(`SELECT name, GROUP_CONCAT(track) tracks FROM categories GROUP BY name HAVING COUNT(DISTINCT track) > 1`).all();
for (const r of dup) console.log(r.name, '→', r.tracks);
const mixKp = D.prepare(`SELECT k.category, k.track, COUNT(*) n FROM knowledge_points k
  WHERE k.track != (SELECT c.track FROM categories c WHERE c.name = k.category LIMIT 1)
  GROUP BY k.category, k.track LIMIT 20`).all();
console.log('KP 的 track 与所属类目轨道不一致的数量:', mixKp.length);
for (const r of mixKp) console.log(`  ${r.category} kp.track=${r.track} n=${r.n}`);
const mixQ = D.prepare(`SELECT q.category, q.track, COUNT(*) n FROM questions q
  WHERE q.track != (SELECT c.track FROM categories c WHERE c.name = q.category LIMIT 1)
  GROUP BY q.category, q.track LIMIT 20`).all();
console.log('题目 track 与类目轨道不一致:', mixQ.length);
for (const r of mixQ) console.log(`  ${r.category} q.track=${r.track} n=${r.n}`);

console.log('\n===== 医考轨道污染明细（倪海厦/人纪/天纪/汉唐/讲义/学生笔记） =====');
const badKp = D.prepare(`SELECT id, material_id, category, title, status FROM knowledge_points WHERE track='yikao'
  AND (title LIKE '%倪海厦%' OR content LIKE '%倪海厦%' OR title LIKE '%人纪%' OR content LIKE '%人纪%' OR title LIKE '%天纪%' OR content LIKE '%天纪%' OR title LIKE '%汉唐%' OR content LIKE '%汉唐%')`).all();
for (const r of badKp) console.log(`KP#${r.id} mat=${r.material_id} [${r.category}] ${r.status} ${String(r.title).slice(0, 50)}`);
const badQ = D.prepare(`SELECT id, knowledge_id, category, status, substr(stem,1,50) stem FROM questions WHERE track='yikao'
  AND (stem LIKE '%倪海厦%' OR analysis LIKE '%倪海厦%' OR options LIKE '%倪海厦%' OR stem LIKE '%人纪%' OR analysis LIKE '%人纪%' OR options LIKE '%人纪%' OR stem LIKE '%天纪%' OR stem LIKE '%汉唐%')`).all();
for (const r of badQ) console.log(`Q#${r.id} kp=${r.knowledge_id} [${r.category}] ${r.status} ${r.stem}`);

console.log('\n===== zhongyi 公共大类含人名 KP 明细 =====');
const PUB = ['黄帝内经与中医基础理论','伤寒论','金匮要略','中药学与神农本草','方剂学','针灸推拿与经络','中医诊断学','中医临床各科','医案与临证笔记','养生食疗与功法'];
const badPub = D.prepare(`SELECT id, material_id, category, title, status FROM knowledge_points WHERE track='zhongyi' AND category IN (${PUB.map(() => '?').join(',')})
  AND (title LIKE '%倪海厦%' OR content LIKE '%倪海厦%' OR title LIKE '%人纪%' OR content LIKE '%人纪%')`).all(...PUB);
for (const r of badPub) console.log(`KP#${r.id} mat=${r.material_id} [${r.category}] ${r.status} ${String(r.title).slice(0, 50)}`);

console.log('\n===== 经方实战方剂/考纲材料归属 =====');
const mats = D.prepare("SELECT id, title, track, category, status FROM materials WHERE title LIKE '%经方实战%' OR title LIKE '%考纲%' ORDER BY id").all();
for (const m of mats) console.log(`#${m.id} [${m.track}] ${m.title.slice(0,30)} cat=${m.category} ${m.status}`);
