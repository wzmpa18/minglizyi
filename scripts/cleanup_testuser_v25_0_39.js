#!/usr/bin/env node
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const U = new Database('/root/backend-auth/data/yandao_users.db');
const PA = '19700000139';

const u = U.prepare('SELECT user_id, phone FROM users WHERE phone=?').get(PA);
if (!u) { console.log('测试用户不存在，无需清理'); process.exit(0); }
const uid = String(u.user_id);
console.log('测试用户:', uid);

const tables = U.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
const hit = [];
for (const t of tables) {
  try {
    const info = U.prepare(`PRAGMA foreign_key_list("${t}")`).all();
    const refs = info.filter(f => f.table === 'users');
    if (refs.length) hit.push({ t, col: refs[0].from });
  } catch {}
}
console.log('引用users的子表:', hit.map(h => `${h.t}.${h.col}`).join(', ') || '无');

const tx = U.transaction(() => {
  for (const h of hit) {
    const r = U.prepare(`DELETE FROM "${h.t}" WHERE "${h.col}"=?`).run(uid);
    if (r.changes) console.log(`  清理 ${h.t}: ${r.changes} 行`);
  }
  U.prepare('DELETE FROM users WHERE user_id=?').run(uid);
});
tx();
console.log('清理完成:', !U.prepare('SELECT 1 FROM users WHERE phone=?').get(PA));
