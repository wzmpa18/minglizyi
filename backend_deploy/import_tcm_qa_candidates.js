/**
 * 将 805 道外部中医题库候选题导入学院审核队列。
 *
 * 约束：
 * - 只写 pending / PENDING_REVIEW，绝不直接发布；
 * - 不生成解析，不伪造逐题出处；
 * - 保存数据集级来源与格式校验结果，供后台人工复核；
 * - q_hash1 幂等，可重复执行。
 *
 * 用法：
 *   node import_tcm_qa_candidates.js --validate-only
 *   node import_tcm_qa_candidates.js --db=/www/yandaoguoxue-backend/data/academy.db
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SOURCE_DIR = path.join(__dirname, 'data', 'guoxue-corpus', 'staging-pending-review', 'external-candidates', 'tcm-qa-datasets');
const FILES = [
  { file: 'Q&A datasets-SINGLE.json', type: 'single' },
  { file: 'Q&A datasets-MULITPLE.json', type: 'multiple' },
  { file: 'Q&A datasets-TRUE-FALSE.json', type: 'judge' },
];
const CATEGORY = '中医医考候选题·待复核';
const DATASET_ID = 'tcm-qa-datasets-yizhen-buaa';

function argValue(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((v) => v.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

function sha256(s) {
  return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
}

function normalizeItem(raw, type, sourceFile, index) {
  const lines = String(raw.question || '').replace(/\r/g, '').split('\n').map((v) => v.trim()).filter(Boolean);
  const stem = String(lines.shift() || '').replace(/^\s*\d+[.、]\s*/, '').trim();
  const options = [];
  const optionLabels = [];
  for (const line of lines) {
    const match = line.match(/^([A-H])[.、．]\s*(.+)$/i);
    if (!match) continue;
    optionLabels.push(match[1].toUpperCase());
    options.push(String(match[2]).trim());
  }
  const answer = String(raw.answer || '').replace(/\s+/g, '').toUpperCase();
  const issues = [];
  if (!stem) issues.push('EMPTY_STEM');
  if (!answer) issues.push('EMPTY_ANSWER');
  if (type !== 'judge' && options.length < 2) issues.push('OPTIONS_LT_2');
  if (new Set(optionLabels).size !== optionLabels.length) issues.push('DUPLICATE_OPTION_LABEL');
  if (type === 'single' && !/^[A-H]$/.test(answer)) issues.push('INVALID_SINGLE_ANSWER');
  if (type === 'multiple' && !/^[A-H]{2,8}$/.test(answer)) issues.push('INVALID_MULTIPLE_ANSWER');
  if (type === 'judge' && !/^[YN]$/.test(answer)) issues.push('INVALID_JUDGE_ANSWER');
  if (type !== 'judge' && [...answer].some((v) => !optionLabels.includes(v))) issues.push('ANSWER_OPTION_MISSING');

  const appAnswer = type === 'judge' ? (answer === 'Y' ? '正确' : answer === 'N' ? '错误' : answer) : answer;
  const normalized = { type, stem, options, answer: appAnswer };
  return {
    ...normalized,
    sourceFile,
    sourceIndex: index + 1,
    issues,
    hash: sha256(`q:${type}|${stem.replace(/\s+/g, '')}|${JSON.stringify(options)}|${appAnswer}`),
  };
}

function loadCandidates() {
  const items = [];
  for (const def of FILES) {
    const rows = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, def.file), 'utf8'));
    rows.forEach((row, index) => items.push(normalizeItem(row, def.type, def.file, index)));
  }
  return items;
}

function validationReport(items) {
  const issueCounts = {};
  for (const item of items) {
    for (const issue of item.issues) issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  }
  return {
    generatedAt: new Date().toISOString(),
    datasetId: DATASET_ID,
    total: items.length,
    byType: Object.fromEntries(['single', 'multiple', 'judge'].map((t) => [t, items.filter((v) => v.type === t).length])),
    clean: items.filter((v) => v.issues.length === 0).length,
    needsReview: items.filter((v) => v.issues.length > 0).length,
    issueCounts,
    duplicateHashes: items.length - new Set(items.map((v) => v.hash)).size,
    publicationState: 'PENDING_REVIEW',
    note: '本报告只验证格式；未完成医学答案校对、考试版本映射或逐题来源核验。',
  };
}

function ensureColumn(db, table, name, ddl) {
  const names = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
  if (!names.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

function importPending(items, dbPath) {
  const Database = require('better-sqlite3');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='questions'").get();
  if (!table) throw new Error('academy 数据库尚未初始化：缺少 questions 表');
  ensureColumn(db, 'questions', 'category', "category TEXT DEFAULT ''");
  ensureColumn(db, 'questions', 'govern_state', "govern_state TEXT DEFAULT ''");
  ensureColumn(db, 'questions', 'q_score', 'q_score INTEGER DEFAULT 0');
  ensureColumn(db, 'questions', 'q_checks', "q_checks TEXT DEFAULT '[]'");
  ensureColumn(db, 'questions', 'q_tier', "q_tier TEXT DEFAULT ''");
  ensureColumn(db, 'questions', 'dup_tier', 'dup_tier INTEGER DEFAULT 0');
  ensureColumn(db, 'questions', 'q_hash1', "q_hash1 TEXT DEFAULT ''");
  ensureColumn(db, 'questions', 'q_hash2', "q_hash2 TEXT DEFAULT ''");
  ensureColumn(db, 'questions', 'source_id', 'source_id INTEGER DEFAULT 0');
  ensureColumn(db, 'questions', 'chapter', "chapter TEXT DEFAULT ''");
  ensureColumn(db, 'questions', 'exam_point_ids', "exam_point_ids TEXT DEFAULT '[]'");
  ensureColumn(db, 'questions', 'exam_spec_version', "exam_spec_version TEXT DEFAULT ''");
  ensureColumn(db, 'questions', 'reject_reason', "reject_reason TEXT DEFAULT ''");

  const exists = db.prepare('SELECT id FROM questions WHERE q_hash1=? LIMIT 1');
  const insert = db.prepare(`INSERT INTO questions
    (knowledge_id, track, type, stem, options, answer, keywords, analysis, difficulty, status, category,
     govern_state, q_score, q_checks, q_tier, dup_tier, q_hash1, q_hash2, source_id, chapter, exam_point_ids,
     exam_spec_version, reject_reason)
    VALUES (NULL, 'yikao', ?, ?, ?, ?, '[]', '', 'medium', 'pending', ?,
     'PENDING_REVIEW', ?, ?, 'C', 0, ?, ?, 0, ?, '[]', '', ?)`);
  let inserted = 0;
  let duplicated = 0;
  const transaction = db.transaction(() => {
    for (const item of items) {
      if (exists.get(item.hash)) { duplicated += 1; continue; }
      const checks = {
        datasetId: DATASET_ID,
        sourceFile: item.sourceFile,
        sourceIndex: item.sourceIndex,
        formatIssues: item.issues,
        rightsStatus: 'repository_license_declared_upstream_provenance_unverified',
        medicalReview: false,
      };
      const score = item.issues.length ? 20 : 40;
      insert.run(item.type, item.stem.slice(0, 500), JSON.stringify(item.options), item.answer.slice(0, 100), CATEGORY,
        score, JSON.stringify(checks), item.hash, sha256(`q2:${item.type}|${item.options.length}|${item.answer}`),
        DATASET_ID, item.issues.join(',').slice(0, 500));
      inserted += 1;
    }
  });
  transaction();
  db.close();
  return { inserted, duplicated };
}

const items = loadCandidates();
const report = validationReport(items);
fs.writeFileSync(path.join(SOURCE_DIR, 'IMPORT_VALIDATION.json'), JSON.stringify(report, null, 2), 'utf8');
const hashGroups = new Map();
for (const item of items) hashGroups.set(item.hash, [...(hashGroups.get(item.hash) || []), item]);
const issueDetail = {
  generatedAt: report.generatedAt,
  formatIssues: items.filter((item) => item.issues.length).map((item) => ({
    sourceFile: item.sourceFile,
    sourceIndex: item.sourceIndex,
    stem: item.stem,
    answer: item.answer,
    options: item.options,
    issues: item.issues,
  })),
  duplicateGroups: [...hashGroups.entries()].filter(([, group]) => group.length > 1).map(([hash, group]) => ({
    hash,
    items: group.map((item) => ({ sourceFile: item.sourceFile, sourceIndex: item.sourceIndex, stem: item.stem })),
  })),
};
fs.writeFileSync(path.join(SOURCE_DIR, 'IMPORT_ISSUES.json'), JSON.stringify(issueDetail, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));

if (!process.argv.includes('--validate-only')) {
  const dbPath = argValue('db') || process.env.ACADEMY_DB_PATH || '/www/yandaoguoxue-backend/data/academy.db';
  const result = importPending(items, dbPath);
  console.log(JSON.stringify({ dbPath, ...result, state: 'PENDING_REVIEW' }, null, 2));
}
