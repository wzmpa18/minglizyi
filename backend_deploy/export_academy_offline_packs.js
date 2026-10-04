/**
 * 从学院生产库导出已治理通过的离线学习包。
 * 只纳入 status=approved 且 govern_state 为 APPROVED/PUBLISHED 的记录；
 * 不读取原始资料目录、不做 OCR、不把 NEEDS_REVIEW/CONFLICT 带进用户包。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const dbArg = process.argv.find((v) => v.startsWith('--db='));
const versionArg = process.argv.find((v) => v.startsWith('--version='));
const trackArg = process.argv.find((v) => v.startsWith('--track='));
const dbPath = dbArg ? dbArg.slice(5) : path.join(__dirname, 'data', 'academy.db');
const version = versionArg ? versionArg.slice(10) : '1.0.0';
const tracks = trackArg ? trackArg.slice(8).split(',') : ['zhongyi', 'yixue'];
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('version 必须是 x.y.z');
if (tracks.some((track) => !['zhongyi', 'yixue', 'yikao', 'guoxue'].includes(track))) throw new Error('track 非法');

const outDir = path.join(__dirname, 'data', 'offline_pack_sources');
fs.mkdirSync(outDir, { recursive: true });
const db = new Database(dbPath, { readonly: true });

function parseArray(value) {
  try { const result = JSON.parse(value || '[]'); return Array.isArray(result) ? result : []; } catch { return []; }
}

for (const track of tracks) {
  const knowledge = db.prepare(`SELECT id,material_id,chapter,title,content,tags,difficulty,status,source_text,created_at,track,category
    FROM knowledge_points WHERE track=? AND status='approved' AND govern_state IN ('APPROVED','PUBLISHED') ORDER BY id`).all(track)
    .map((row) => ({ id: String(row.id), materialId: String(row.material_id || ''), chapter: row.chapter || '', title: row.title || '',
      content: row.content || '', tags: parseArray(row.tags), difficulty: row.difficulty || 'medium', status: 'approved',
      sourceText: row.source_text || '', createdAt: row.created_at || '', track: row.track, category: row.category || '未分类' }));
  const questions = db.prepare(`SELECT id,knowledge_id,track,type,stem,options,answer,keywords,analysis,difficulty,status,created_at,category
    FROM questions WHERE track=? AND status='approved' AND govern_state IN ('APPROVED','PUBLISHED') ORDER BY id`).all(track)
    .map((row) => ({ id: String(row.id), knowledgeId: String(row.knowledge_id || ''), track: row.track, trackName: track,
      category: row.category || '未分类', type: row.type, stem: row.stem || '', options: parseArray(row.options), answer: row.answer || '',
      keywords: parseArray(row.keywords), analysis: row.analysis || '', difficulty: row.difficulty || 'medium', status: 'approved', createdAt: row.created_at || '' }));
  const categoryNames = [...new Set([...knowledge.map((r) => r.category), ...questions.map((r) => r.category)])].sort();
  const categories = categoryNames.map((name, index) => ({ id: `${track}-${index + 1}`, track, trackName: track, name, sort: index + 1,
    materialCount: knowledge.filter((r) => r.category === name).length }));
  const payload = { schema: 'yandao.academy.offline.v1', version, generatedAt: new Date().toISOString(),
    governance: "status=approved AND govern_state IN ('APPROVED','PUBLISHED')", track, categories, knowledge, questions };
  const file = path.join(outDir, `academy-${track}-v${version}.pack`);
  fs.writeFileSync(file, JSON.stringify(payload), 'utf8');
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  console.log(JSON.stringify({ track, version, file, bytes: fs.statSync(file).size, sha256, knowledge: knowledge.length, questions: questions.length }));
}
db.close();
