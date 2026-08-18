#!/usr/bin/env node
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const db = new Database('/www/yandaoguoxue-backend/data/academy.db', { readonly: true });

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
console.log('tables:', tables.join(', '));

const qTable = tables.find(t => /question/i.test(t));
if (qTable) {
  const cols = db.prepare(`PRAGMA table_info(${qTable})`).all().map(c => c.name);
  console.log(`\n[${qTable}] columns:`, cols.join(', '));
  const byStatus = db.prepare(`SELECT status, COUNT(*) c FROM ${qTable} GROUP BY status`).all();
  console.log(`[${qTable}] by status:`, JSON.stringify(byStatus));
  const fangji = db.prepare(`SELECT * FROM ${qTable} LIMIT 1`).get();
  console.log('sample row keys:', Object.keys(fangji || {}).join(', '));
  const subjectCol = cols.find(c => /subject|category|track/i.test(c));
  if (subjectCol) {
    const bySub = db.prepare(`SELECT ${subjectCol} s, status, COUNT(*) c FROM ${qTable} WHERE ${subjectCol} LIKE ? GROUP BY ${subjectCol}, status`).all('%方剂%');
    console.log('方剂学分布:', JSON.stringify(bySub, null, 1));
  }
}

const kfTables = tables.filter(t => /task|factory/i.test(t));
console.log('\nfactory-ish tables in academy.db:', kfTables.join(', ') || 'none');

const kf = new Database('/www/yandaoguoxue-backend/data/knowledge_factory.db', { readonly: true });
const kfT = kf.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
console.log('knowledge_factory tables:', kfT.join(', '));
for (const t of kfT) {
  if (/task/i.test(t)) {
    const rows = kf.prepare(`SELECT * FROM ${t} ORDER BY rowid DESC LIMIT 5`).all();
    console.log(`\n[${t}] latest 5:`);
    for (const r of rows) console.log(JSON.stringify(r).slice(0, 400));
  }
}
