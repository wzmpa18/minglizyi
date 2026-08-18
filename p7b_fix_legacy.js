'use strict';
// P7-TCM-EXAM-01 补充迁移：
// A. 学习轨道遗留数字索引答案 → 字母格式（approved+pending；rejected 冻结不动）
// B. 「倪海厦·天纪人间道」类目值 → 「天纪易理研修」（materials/knowledge_points/questions 三表）
// 幂等：重复执行无副作用；先备份；全程审计日志
const path = require('path');
const fs = require('fs');
const D = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');

const DB_PATH = '/www/yandaoguoxue-backend/data/academy.db';
const BACKUP = '/www/yandaoguoxue-backend/data/academy.backup-p7b-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.db';
const LOG = '/root/p7b_fix_legacy.log';

function log(m) { const l = `[${new Date().toLocaleString('zh-CN', { hour12: false })}] ${m}`; console.log(l); fs.appendFileSync(LOG, l + '\n'); }

if (!fs.existsSync(BACKUP)) { fs.copyFileSync(DB_PATH, BACKUP); log('[备份] ' + BACKUP); } else { log('[备份] 已存在，跳过 ' + BACKUP); }

const db = new D(DB_PATH);
const toLetter = (n) => String.fromCharCode(65 + n);

// ===== B. 类目值迁移 =====
const CAT_OLD = '倪海厦·天纪人间道', CAT_NEW = '天纪易理研修';
for (const [tbl, key] of [['materials', 'id'], ['knowledge_points', 'id'], ['questions', 'id']]) {
  const r = db.prepare(`UPDATE ${tbl} SET category = ? WHERE category = ?`).run(CAT_NEW, CAT_OLD);
  log(`[类目] ${tbl}: ${r.changes} 行 ${CAT_OLD} -> ${CAT_NEW}`);
}

// ===== A. 数字索引答案 → 字母 =====
const rows = db.prepare("SELECT id, type, options, answer FROM questions WHERE status IN ('approved','pending')").all();
let migrated = 0, skipped = 0, fillKept = 0;
const upd = db.prepare('UPDATE questions SET answer = ? WHERE id = ?');
const fixOne = (a) => {
  const t = String(a).trim();
  if (!/^\d+(,\d+)*$/.test(t)) return null;
  return t.split(',').map(x => toLetter(parseInt(x, 10))).join(',');
};
for (const r of rows) {
  if (r.type !== 'single' && r.type !== 'multi') { const t = String(r.answer || '').trim(); if (/^\d/.test(t)) fillKept++; continue; }
  let opts = []; try { opts = JSON.parse(r.options || '[]'); } catch (e) {}
  const t = String(r.answer || '').trim();
  if (!/^\d+(,\d+)*$/.test(t)) { skipped++; continue; }
  const parts = t.split(',').map(x => parseInt(x, 10));
  if (opts.length > 0 && parts.every(p => p >= 0 && p < opts.length)) {
    upd.run(parts.map(toLetter).join(','), r.id);
    migrated++;
  } else { fillKept++; }
}
log(`[答案] 选择题迁移 ${migrated} 道 | 已是字母/文本 ${skipped} | 填空数字保留 ${fillKept}`);

// ===== 验证 =====
const badChoice = db.prepare("SELECT COUNT(*) c FROM questions q WHERE q.status IN ('approved','pending') AND q.type IN ('single','multi') AND q.answer GLOB '[0-9]*'").get();
log('[验证] 选择题数字答案残留: ' + badChoice.c);
const catLeft = db.prepare("SELECT (SELECT COUNT(*) FROM materials WHERE category=?) a, (SELECT COUNT(*) FROM knowledge_points WHERE category=?) b, (SELECT COUNT(*) FROM questions WHERE category=?) c").get(CAT_OLD, CAT_OLD, CAT_OLD);
log('[验证] 旧类目残留: ' + JSON.stringify(catLeft));
log('===== 完成 =====');
