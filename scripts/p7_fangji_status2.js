#!/usr/bin/env node
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const db = new Database('/www/yandaoguoxue-backend/data/academy.db', { readonly: true });

console.log('== questions.track 分布 ==');
console.log(JSON.stringify(db.prepare('SELECT track, COUNT(*) c FROM questions GROUP BY track').all()));

console.log('\n== categories 表 ==');
const catCols = db.prepare('PRAGMA table_info(categories)').all().map(c => c.name);
console.log('columns:', catCols.join(', '));
const cats = db.prepare('SELECT * FROM categories').all();
for (const c of cats) console.log(JSON.stringify(c).slice(0, 300));

console.log('\n== knowledge_points 结构 ==');
const kpCols = db.prepare('PRAGMA table_info(knowledge_points)').all().map(c => c.name);
console.log('columns:', kpCols.join(', '));
const kpSample = db.prepare("SELECT * FROM knowledge_points WHERE title LIKE '%方剂%' OR name LIKE '%方剂%' LIMIT 5").all();
console.log('方剂 knowledge_points:', JSON.stringify(kpSample, null, 1).slice(0, 1500));
