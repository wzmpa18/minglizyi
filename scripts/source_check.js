#!/usr/bin/env node
// 来源登记与材料 source_id 勘察（只读）
'use strict';
const D = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3')('/www/yandaoguoxue-backend/data/academy.db', { readonly: true });
const srcCols = D.prepare("PRAGMA table_info(source_registry)").all().map(c => c.name);
console.log('source_registry 列:', srcCols.join(', '));
const srcs = D.prepare("SELECT * FROM source_registry ORDER BY id").all();
for (const s of srcs) console.log(JSON.stringify({ id: s.id, name: s.name || s.title, author: s.author, level: s.authorization_level || s.level }));
console.log('\n材料 source_id 使用情况:');
const mats = D.prepare("SELECT id, title, source_id FROM materials WHERE track='zhongyi' AND id IN (1,9,13,15,22,28,31) ORDER BY id").all();
for (const m of mats) console.log(m.id, m.title.slice(0, 22), 'source_id=' + m.source_id);
console.log('\nzhongyi 知识点 source_author 分布:');
const sa = D.prepare("SELECT source_author, COUNT(*) n FROM knowledge_points WHERE track='zhongyi' GROUP BY source_author").all();
for (const r of sa) console.log(JSON.stringify(r.source_author), r.n);
