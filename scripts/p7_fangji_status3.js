#!/usr/bin/env node
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const db = new Database('/www/yandaoguoxue-backend/data/academy.db', { readonly: true });

// questions.category 存储格式探测
console.log('== questions.category 样本（track=yikao）==');
console.log(JSON.stringify(db.prepare("SELECT DISTINCT category FROM questions WHERE track='yikao' LIMIT 30").all()));

console.log('\n== yikao 全科 status 分布 ==');
console.log(JSON.stringify(db.prepare("SELECT category, status, COUNT(*) c FROM questions WHERE track='yikao' GROUP BY category, status ORDER BY CAST(category AS INTEGER)").all(), null, 1));

console.log('\n== 方剂学(yikao, category=24) 状态分布 ==');
const fangji = db.prepare("SELECT status, type, COUNT(*) c FROM questions WHERE track='yikao' AND category='24' GROUP BY status, type").all();
console.log(JSON.stringify(fangji, null, 1));

console.log('\n== 方剂学(zhongyi, category=46) 状态分布 ==');
const fz2 = db.prepare("SELECT status, COUNT(*) c FROM questions WHERE track='zhongyi' AND category='46' GROUP BY status").all();
console.log(JSON.stringify(fz2, null, 1));

console.log('\n== 方剂学 pending 样题3道（抽检预览）==');
const samples = db.prepare("SELECT id, type, stem, substr(options,1,200) opts, answer, substr(analysis,1,150) ana, difficulty, status FROM questions WHERE track='yikao' AND category='24' AND status='pending' ORDER BY id LIMIT 3").all();
console.log(JSON.stringify(samples, null, 1).slice(0, 3000));
