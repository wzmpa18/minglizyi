/**
 * v25.0.97 国学资料库正式接入导入：batch JSON → academy.db `materials` 表
 *
 * 设计要点（严格对齐既有范式 import_zhenggu_v25_0_24.js）：
 *  - 指纹：sha256('mat:' + 去空白小写) —— 与 academyRoutes.js 完全一致
 *  - 幂等：按 title 判重 + 按 content_hash 判重，重复跳过，绝不覆盖既有资料
 *  - 安全：只 INSERT 不 UPDATE/DELETE；缺列自动 ALTER TABLE ADD COLUMN（向前兼容，不破坏线上数据）
 *  - 合规：status 一律 'pending'，必须后台审核通过后才可发布（"发布就绪"≠发布许可）
 *  - 溯源：写入 copyright_status / source_file / md_path，保证内容可追溯
 *
 * 用法：
 *   node import_guoxue_corpus_v25_0_97.js <batch.json> [dbPath]
 *   默认 dbPath = /www/yandaoguoxue-backend/data/academy.db （生产）
 *   本地验证可传临时 db 路径，脚本会自动建表
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BATCH_FILE = process.argv[2];
const DB_PATH = process.argv[3] || '/www/yandaoguoxue-backend/data/academy.db';

if (!BATCH_FILE) { console.error('用法: node import_guoxue_corpus_v25_0_97.js <batch.json> [dbPath]'); process.exit(1); }
if (!fs.existsSync(BATCH_FILE)) { console.error('批次文件不存在: ' + BATCH_FILE); process.exit(1); }

// 驱动兼容：生产用 better-sqlite3；本地无该依赖时回退 Node 内置 node:sqlite（仅用于离线验证）
let D;
try { D = require('better-sqlite3'); }
catch (e) {
  try { D = require('node:sqlite').DatabaseSync; console.log('[驱动] 回退 node:sqlite（离线验证模式）'); }
  catch (e2) { console.error('缺少 better-sqlite3 且无 node:sqlite: ' + e2.message); process.exit(1); }
}

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function materialHash(text) { return sha256('mat:' + String(text || '').replace(/\s+/g, '').toLowerCase()); }

const batch = JSON.parse(fs.readFileSync(BATCH_FILE, 'utf8'));
const d = new D(DB_PATH);
try { if (typeof d.pragma === 'function') d.pragma('journal_mode = WAL'); else d.exec('PRAGMA journal_mode = WAL'); } catch (e) { /* 忽略 */ }

// ---------- 0. 确保表存在（本地验证环境自动建表；生产已存在则跳过） ----------
d.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track TEXT, name TEXT, sort INTEGER DEFAULT 0, status TEXT DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT, track TEXT, category TEXT, format TEXT, file_path TEXT,
  text_content TEXT, grade TEXT, status TEXT,
  uploader_id TEXT, uploader_name TEXT, created_at TEXT, updated_at TEXT, content_hash TEXT
);
`);

// ---------- 1. 向前兼容：补列（只加列，不改现有列） ----------
const cols = d.prepare("PRAGMA table_info(materials)").all().map(c => c.name);
const EXTRA = {
  copyright_status: 'TEXT', copyright_note: 'TEXT', source_file: 'TEXT',
  md_path: 'TEXT', char_count: 'INTEGER', wash_time: 'TEXT', import_batch: 'TEXT',
};
for (const [col, type] of Object.entries(EXTRA)) {
  if (!cols.includes(col)) {
    d.exec(`ALTER TABLE materials ADD COLUMN ${col} ${type}`);
    console.log('[兼容] 已补列: ' + col + ' ' + type);
  }
}
const finalCols = d.prepare("PRAGMA table_info(materials)").all().map(c => c.name);

// ---------- 2. 类目幂等创建 ----------
const catCache = {};
function ensureCategory(track, name) {
  const key = track + '::' + name;
  if (catCache[key]) return catCache[key];
  let cat = d.prepare('SELECT id FROM categories WHERE track=? AND name=?').get(track, name);
  if (!cat) {
    const maxSort = d.prepare('SELECT COALESCE(MAX(sort),0) s FROM categories WHERE track=?').get(track).s;
    const r = d.prepare('INSERT INTO categories (track,name,sort,status) VALUES (?,?,?,?)').run(track, name, maxSort + 1, 'active');
    cat = { id: Number(r.lastInsertRowid) };
    console.log('[类目] 已创建: ' + track + '/' + name + ' (id=' + cat.id + ')');
  }
  catCache[key] = cat.id;
  return cat.id;
}

// ---------- 3. 逐条导入（幂等） ----------
let inserted = 0, skipTitle = 0, skipHash = 0, fail = 0;
const stmtCache = {};
function insertItem(it) {
  const colsUsed = ['title', 'track', 'category', 'format', 'file_path', 'text_content', 'grade', 'status',
    'uploader_id', 'uploader_name', 'created_at', 'updated_at', 'content_hash',
    'copyright_status', 'copyright_note', 'source_file', 'md_path', 'char_count', 'wash_time', 'import_batch']
    .filter(c => finalCols.includes(c));
  const key = colsUsed.join(',');
  if (!stmtCache[key]) {
    stmtCache[key] = d.prepare(`INSERT INTO materials (${colsUsed.join(',')}) VALUES (${colsUsed.map(() => '?').join(',')})`);
  }
  const text = it.text_content || '';
  const hash = materialHash(text);
  const existTitle = d.prepare('SELECT id FROM materials WHERE title=?').get(it.title);
  if (existTitle) { console.log('[跳过] 同名已存在 #' + existTitle.id + ' ' + it.title); skipTitle++; return; }
  const existHash = d.prepare('SELECT id,title FROM materials WHERE content_hash=?').get(hash);
  if (existHash) { console.log('[跳过] 同指纹已存在 #' + existHash.id + '《' + existHash.title + '》≈ ' + it.title); skipHash++; return; }

  const vals = colsUsed.map(c => {
    switch (c) {
      case 'title': return it.title;
      case 'track': return it.track;
      case 'category': return it.category;
      case 'format': return 'text';
      case 'file_path': return '';
      case 'text_content': return text;
      case 'grade': return it.grade || 'B';
      case 'status': return 'pending';
      case 'uploader_id': return 'system_import';
      case 'uploader_name': return it.uploader_name || 'v25.0.97国学资料库导入';
      case 'created_at': case 'updated_at': return new Date().toISOString().slice(0, 19).replace('T', ' ');
      case 'content_hash': return hash;
      case 'copyright_status': return it.copyright_status || '';
      case 'copyright_note': return it.copyright_note || '';
      case 'source_file': return it.source_file || '';
      case 'md_path': return it.md_path || '';
      case 'char_count': return it.char_count || text.length;
      case 'wash_time': return it.wash_time || '';
      case 'import_batch': return batch.batch || '';
      default: return null;
    }
  });
  const r = stmtCache[key].run(...vals);
  inserted++;
  if (inserted <= 5) console.log('[导入] #' + r.lastInsertRowid + ' ' + it.title + ' (' + text.length + '字)');
}

for (const it of (batch.items || [])) {
  try { ensureCategory(it.track, it.category); insertItem(it); }
  catch (e) { fail++; console.error('[失败] ' + it.title + ' -> ' + e.message); }
}

// ---------- 4. 汇总与自检 ----------
console.log('\n==== 批次 ' + batch.batch + ' 导入完成 ====');
console.log('新增: ' + inserted + ' / 同名跳过: ' + skipTitle + ' / 同指纹跳过: ' + skipHash + ' / 失败: ' + fail);
const total = d.prepare("SELECT COUNT(*) c FROM materials WHERE uploader_id='system_import'").get().c;
console.log('system_import 资料总数: ' + total);
const byStatus = d.prepare("SELECT status, COUNT(*) c FROM materials WHERE uploader_id='system_import' GROUP BY status").all();
console.log('状态分布: ' + JSON.stringify(byStatus));
const byCp = d.prepare("SELECT copyright_status, COUNT(*) c FROM materials WHERE uploader_id='system_import' GROUP BY copyright_status").all();
console.log('版权状态分布: ' + JSON.stringify(byCp));
const sample = d.prepare("SELECT id,title,category,grade,status,char_count,copyright_status FROM materials WHERE uploader_id='system_import' ORDER BY id DESC LIMIT 5").all();
sample.forEach(s => console.log('  #' + s.id + ' [' + s.category + '] ' + s.title + ' | ' + s.grade + '/' + s.status + ' | ' + s.char_count + '字 | ' + s.copyright_status));
console.log('\n提示: status=pending 表示待审，需后台审核通过后才对用户可见（合规要求）。');
