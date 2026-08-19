#!/usr/bin/env node
// 公共大类知识点来源勘察 + 倪海厦专区现状 + 医考轨道污染扫描（只读）
'use strict';
const D = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3')('/www/yandaoguoxue-backend/data/academy.db', { readonly: true });

console.log('===== 各公共大类 KP 按材料来源分布 =====');
const PUB_CATS = ['黄帝内经与中医基础理论','伤寒论','金匮要略','中药学与神农本草','方剂学','针灸推拿与经络','中医诊断学','中医临床各科','医案与临证笔记','养生食疗与功法'];
for (const cat of PUB_CATS) {
  const rows = D.prepare(`SELECT COALESCE(m.title,'(无材料/AI生成)') src, COUNT(*) n
    FROM knowledge_points k LEFT JOIN materials m ON k.material_id = m.id
    WHERE k.category = ? GROUP BY src ORDER BY n DESC`).all(cat);
  const qn = D.prepare("SELECT COUNT(*) n FROM questions WHERE category=?").get(cat);
  console.log(`\n[${cat}] KP总数:${rows.reduce((s,r)=>s+r.n,0)} 题总数:${qn.n}`);
  for (const r of rows) console.log(`  ${r.n}\t${String(r.src).slice(0,40)}`);
}

console.log('\n===== 倪海厦专区类目（id 1-8）现状 =====');
const zq = D.prepare("SELECT c.id, c.name, c.status, (SELECT COUNT(*) FROM knowledge_points k WHERE k.category=c.name) kp, (SELECT COUNT(*) FROM questions q WHERE q.category=c.name) q FROM categories c WHERE c.id<=8 ORDER BY c.id").all();
for (const r of zq) console.log(`${r.id}\t${r.name}\tstatus=${r.status}\tKP:${r.kp}\t题:${r.q}`);

console.log('\n===== 医考轨道污染扫描（倪海厦/人纪/天纪/汉唐） =====');
const bad = D.prepare(`SELECT 'kp' t, COUNT(*) n FROM knowledge_points WHERE track='yikao' AND (title LIKE '%倪海厦%' OR content LIKE '%倪海厦%' OR title LIKE '%人纪%' OR content LIKE '%人纪%' OR title LIKE '%天纪%' OR content LIKE '%天纪%')
  UNION ALL SELECT 'q', COUNT(*) FROM questions WHERE track='yikao' AND (stem LIKE '%倪海厦%' OR analysis LIKE '%倪海厦%' OR stem LIKE '%人纪%' OR analysis LIKE '%人纪%' OR options LIKE '%倪海厦%')`).all();
for (const r of bad) console.log(r.t, r.n);

console.log('\n===== 公共大类污染扫描（公共大类不得出现现代人名） =====');
const pubBad = D.prepare(`SELECT category, COUNT(*) n FROM knowledge_points WHERE track='zhongyi' AND category IN (${PUB_CATS.map(() => '?').join(',')})
  AND (title LIKE '%倪海厦%' OR content LIKE '%倪海厦%' OR title LIKE '%人纪%' OR content LIKE '%人纪%') GROUP BY category`).all(...PUB_CATS);
for (const r of pubBad) console.log(r.category, r.n);
console.log('(空=无污染)');

console.log('\n===== 类目清单（zhongyi 全部） =====');
const allCats = D.prepare("SELECT id, name, status, sort FROM categories WHERE track='zhongyi' ORDER BY sort, id").all();
for (const c of allCats) console.log(`${c.id}\t${c.name}\t${c.status}\tsort=${c.sort}`);
