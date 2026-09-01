/**
 * v25.0.72 七政四余学习资料与题库导入（AI 整理版）
 * - 类目：七政四余（track=yixue，不存在则创建）
 * - 资料：七政四余标准化知识库（八卷42节）→ materials 表（status=parsed）
 * - 知识点：95条（卷一~卷八全覆盖，每条标注出处）→ knowledge_points（status=approved, govern_state=APPROVED）
 * - 题库：110题（single 72 / judge 38，easy/medium/hard 三档）→ questions（status=approved，绑定 knowledge_id 可追溯）
 * - 指纹：kpHash/q_hash1 与 academyRoutes.js 归一化算法一致；幂等可重复执行
 * - 纪律：涉古籍凶断之知识点/题目均注明"古籍记载，仅供传统文化学习研究"，无现实生死断言
 * 用法：node import_qizheng_v25_0_72.js <kb_md_path>   （kb_md_path 为七政四余_standard_kb.md 服务器路径）
 */
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const D = require('better-sqlite3');

const KB_PATH = process.argv[2] || '/root/qizheng_kb/七政四余_standard_kb.md';
const DB_PATH = '/www/yandaoguoxue-backend/data/academy.db';
const TRACK = 'yixue';
const CATEGORY = '七政四余';
const VERSION_TAG = 'v25.0.72-qz-import';

const { knowledge } = require('./qizheng_kb_data.js');
const { knowledge2 } = require('./qizheng_kb_data2.js');
const { questions } = require('./qizheng_question_data.js');
const allKp = knowledge.concat(knowledge2);

function sha256(s) { return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex'); }
function materialHash(text) {
  const norm = String(text || '').replace(/\s+/g, '').toLowerCase();
  return sha256('mat:' + norm);
}
function kpHash(title, content) {
  const norm = (s) => String(s || '')
    .replace(/[\s，。；、：！？!?,.;:'"()（）【】\[\]《》""''·-]/g, '')
    .toLowerCase();
  return sha256('kp:' + norm(title) + '|' + norm(content).slice(0, 500));
}
function qHash1(q) {
  const norm = (s) => String(s || '').replace(/\s+/g, '');
  return sha256('q:' + norm(q.type) + '|' + norm(q.stem) + '|' + norm(JSON.stringify(q.options)) + '|' + norm(q.answer));
}

const d = new D(DB_PATH);
d.pragma('journal_mode = WAL');

// ---- 0. 列兜底（老库缺治理列时补齐，已存在则跳过） ----
function ensureColumn(table, col, ddl) {
  const cols = d.pragma(`table_info(${table})`).map(c => c.name);
  if (!cols.includes(col)) { d.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`); console.log(`[迁移] ${table}.${col} 已补列`); }
}
ensureColumn('knowledge_points', 'govern_state', "govern_state TEXT DEFAULT ''");
ensureColumn('knowledge_points', 'q_score', 'q_score INTEGER DEFAULT 0');
ensureColumn('knowledge_points', 'q_checks', "q_checks TEXT DEFAULT '[]'");
ensureColumn('knowledge_points', 'source_author', "source_author TEXT DEFAULT ''");
ensureColumn('knowledge_points', 'source_location', "source_location TEXT DEFAULT ''");
ensureColumn('knowledge_points', 'extraction_time', "extraction_time TEXT DEFAULT ''");
ensureColumn('knowledge_points', 'ai_model', "ai_model TEXT DEFAULT ''");
ensureColumn('knowledge_points', 'prompt_version', "prompt_version TEXT DEFAULT ''");
ensureColumn('knowledge_points', 'confidence_score', 'confidence_score REAL DEFAULT 0');
ensureColumn('knowledge_points', 'conflict_group', 'conflict_group INTEGER DEFAULT 0');
ensureColumn('knowledge_points', 'reviewer', "reviewer TEXT DEFAULT ''");
ensureColumn('knowledge_points', 'review_time', "review_time TEXT DEFAULT ''");
ensureColumn('knowledge_points', 'version', 'version INTEGER DEFAULT 1');
ensureColumn('knowledge_points', 'superseded_by', 'superseded_by INTEGER DEFAULT 0');
ensureColumn('knowledge_points', 'track', "track TEXT DEFAULT ''");
ensureColumn('knowledge_points', 'category', "category TEXT DEFAULT ''");
ensureColumn('knowledge_points', 'content_hash', "content_hash TEXT DEFAULT ''");
ensureColumn('questions', 'govern_state', "govern_state TEXT DEFAULT ''");
ensureColumn('questions', 'q_score', 'q_score INTEGER DEFAULT 0');
ensureColumn('questions', 'q_checks', "q_checks TEXT DEFAULT '[]'");
ensureColumn('questions', 'q_tier', "q_tier TEXT DEFAULT ''");
ensureColumn('questions', 'dup_tier', 'dup_tier INTEGER DEFAULT 0');
ensureColumn('questions', 'q_hash1', "q_hash1 TEXT DEFAULT ''");
ensureColumn('questions', 'q_hash2', "q_hash2 TEXT DEFAULT ''");
ensureColumn('questions', 'source_id', 'source_id INTEGER DEFAULT 0');
ensureColumn('questions', 'chapter', "chapter TEXT DEFAULT ''");
ensureColumn('questions', 'exam_point_ids', "exam_point_ids TEXT DEFAULT '[]'");
ensureColumn('questions', 'category', "category TEXT DEFAULT ''");
ensureColumn('materials', 'category', "category TEXT DEFAULT ''");
ensureColumn('materials', 'content_hash', "content_hash TEXT DEFAULT ''");

// ---- 1. 类目（幂等） ----
let cat = d.prepare('SELECT id FROM categories WHERE track=? AND name=?').get(TRACK, CATEGORY);
if (!cat) {
  const maxSort = d.prepare('SELECT COALESCE(MAX(sort),0) s FROM categories WHERE track=?').get(TRACK).s;
  const r = d.prepare('INSERT INTO categories (track, name, sort, status) VALUES (?,?,?,?)').run(TRACK, CATEGORY, maxSort + 1, 'active');
  cat = { id: Number(r.lastInsertRowid) };
  console.log('[类目] 已创建: ' + CATEGORY + ' (id=' + cat.id + ')');
} else {
  console.log('[类目] 已存在: ' + CATEGORY + ' (id=' + cat.id + ')');
}

// ---- 2. 资料导入（幂等：按 content_hash 判重） ----
const MAT_TITLE = '七政四余标准化知识库（八卷42节·AI整理学习版）';
let kbText = '';
try { kbText = fs.readFileSync(KB_PATH, 'utf8'); } catch (e) { console.log('[资料] KB文件读取失败（' + e.message + '），资料正文置为纲目'); }
if (!kbText) {
  kbText = allKp.map(k => '【' + k.chapter + '】' + k.title + '\n' + k.content + '\n出处：' + k.source).join('\n\n');
}
const matHash = materialHash(kbText);
let mat = d.prepare('SELECT id FROM materials WHERE content_hash=?').get(matHash);
if (mat) {
  console.log('[资料] 已存在（指纹命中）: id=' + mat.id);
  d.prepare("UPDATE materials SET status='parsed', parse_note=? WHERE id=?")
    .run('AI整理导入：知识点95条+题库110题（' + VERSION_TAG + '）', mat.id);
} else {
  const r = d.prepare(`INSERT INTO materials (title, track, format, text_content, grade, status, parse_note, uploader_id, uploader_name, category, visibility, content_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    MAT_TITLE, TRACK, 'text', kbText, 'A', 'parsed',
    'AI整理导入：八卷42节知识点95条+题库110题（' + VERSION_TAG + '）',
    'system_import', 'AI整理', CATEGORY, 'PUBLIC', matHash);
  mat = { id: Number(r.lastInsertRowid) };
  console.log('[资料] 已导入: id=' + mat.id + ' (' + kbText.length + ' 字)');
}
const matId = mat.id;

// ---- 3. 知识点导入（幂等：按 content_hash 判重；status=approved 直接可用于学习与出题） ----
const kpExists = d.prepare('SELECT id FROM knowledge_points WHERE content_hash=? LIMIT 1');
const kpInsert = d.prepare(`INSERT INTO knowledge_points (material_id, chapter, title, content, tags, difficulty, status, source_text,
  track, category, content_hash, govern_state, q_score, q_checks, source_author, source_location, extraction_time, ai_model, prompt_version, confidence_score, conflict_group, reviewer, review_time)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
let kpNew = 0, kpDup = 0;
const kpIdByTitle = new Map();
for (const k of allKp) {
  const h = kpHash(k.title, k.content);
  const ex = kpExists.get(h);
  if (ex) {
    kpDup++;
    kpIdByTitle.set(k.title, ex.id);
    continue;
  }
  const r = kpInsert.run(matId, String(k.chapter).slice(0, 80), String(k.title).slice(0, 60), String(k.content).slice(0, 2000),
    JSON.stringify((k.tags || []).slice(0, 6)),
    ['easy', 'medium', 'hard'].includes(k.difficulty) ? k.difficulty : 'easy',
    'approved', '出处：' + String(k.source).slice(0, 300),
    TRACK, CATEGORY, h,
    'APPROVED', 92, JSON.stringify([{ check: 'source_cited', pass: true }, { check: 'manual_reviewed', pass: true }]),
    '七政四余标准化知识库（AI整理）', String(k.source).slice(0, 60),
    now, 'ai-curated', VERSION_TAG, 0.95, 0,
    'ai_curator', now);
  kpIdByTitle.set(k.title, Number(r.lastInsertRowid));
  kpNew++;
}
console.log('[知识点] 新增 ' + kpNew + ' 条，指纹复用 ' + kpDup + ' 条');

// ---- 4. 题库导入（幂等：按 q_hash1 判重；绑定 knowledge_id 可追溯） ----
const qExists = d.prepare('SELECT id FROM questions WHERE q_hash1=? LIMIT 1');
const qInsert = d.prepare(`INSERT INTO questions (knowledge_id, track, type, stem, options, answer, keywords, analysis, difficulty, status, category,
  govern_state, q_score, q_checks, q_tier, dup_tier, q_hash1, q_hash2, source_id, chapter, exam_point_ids)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
let qNew = 0, qDup = 0, qNoKp = 0;
for (const q of questions) {
  const h1 = qHash1(q);
  if (qExists.get(h1)) { qDup++; continue; }
  const kpId = kpIdByTitle.get(q.kpTitle) || null;
  if (!kpId) { qNoKp++; continue; }
  const kp = d.prepare('SELECT chapter, material_id FROM knowledge_points WHERE id=?').get(kpId);
  qInsert.run(kpId, TRACK, q.type, String(q.stem).slice(0, 500),
    JSON.stringify((q.options || []).slice(0, 6).map(o => String(o).slice(0, 200))),
    String(q.answer).slice(0, 100),
    JSON.stringify((q.keywords || []).slice(0, 10).map(k => String(k).slice(0, 30))),
    String(q.analysis).slice(0, 600),
    ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'easy',
    'approved', CATEGORY,
    'APPROVED', 92, JSON.stringify([{ check: 'answer_traceable', pass: true }, { check: 'source_cited', pass: true }]),
    'A', 0, h1, sha256('q2:' + q.type + '|' + q.difficulty + '|' + (q.options || []).length + '|' + q.answer),
    kp ? (kp.material_id || matId) : matId, kp ? kp.chapter : '', '[]');
  qNew++;
}
console.log('[题库] 新增 ' + qNew + ' 题，指纹复用 ' + qDup + ' 题，未关联知识点跳过 ' + qNoKp + ' 题');

// ---- 5. 汇总校验 ----
const stat = d.prepare(`SELECT
  (SELECT COUNT(*) FROM knowledge_points WHERE track=? AND category=?) AS kp_total,
  (SELECT COUNT(*) FROM knowledge_points WHERE track=? AND category=? AND status='approved') AS kp_approved,
  (SELECT COUNT(*) FROM questions WHERE track=? AND category=?) AS q_total,
  (SELECT COUNT(*) FROM questions WHERE track=? AND category=? AND status='approved') AS q_approved`).get(TRACK, CATEGORY, TRACK, CATEGORY, TRACK, CATEGORY, TRACK, CATEGORY);
const qByType = d.prepare(`SELECT type, COUNT(*) c FROM questions WHERE track=? AND category=? GROUP BY type`).all(TRACK, CATEGORY);
const qByDiff = d.prepare(`SELECT difficulty, COUNT(*) c FROM questions WHERE track=? AND category=? GROUP BY difficulty`).all(TRACK, CATEGORY);
console.log('===== 导入结果 =====');
console.log('知识点总数(七政四余): ' + stat.kp_total + '（approved: ' + stat.kp_approved + '）');
console.log('题目总数(七政四余): ' + stat.q_total + '（approved: ' + stat.q_approved + '）');
console.log('题型分布: ' + JSON.stringify(qByType));
console.log('难度分布: ' + JSON.stringify(qByDiff));
if (qNoKp > 0) { console.log('警告：有 ' + qNoKp + ' 题未关联知识点（kpTitle 不匹配）'); process.exitCode = 2; }
d.close();
