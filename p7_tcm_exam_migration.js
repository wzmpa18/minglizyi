'use strict';
// P7-TCM-EXAM-01 三层分离迁移 + 答案格式统一 + 历史医考题审计
// 幂等：可重复执行；所有下线仅改状态/标签，保留回滚能力
const fs = require('fs');
const D = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const db = new D('/www/yandaoguoxue-backend/data/academy.db');

const SPEC_VERSION = '2025-tcm-zhiye-v1';
const log = (...a) => console.log(...a);

// P7-TCM-EXAM-01：审计所需列（与后端 ensureColumn 一致，幂等）
const ensureColumn = (table, col, ddl) => {
  const cols = db.pragma(`table_info(${table})`).map((c) => c.name);
  if (!cols.includes(col)) { db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`); log(`[建列] ${table}.${col}`); }
};
ensureColumn('questions', 'exam_spec_version', "exam_spec_version TEXT DEFAULT ''");
ensureColumn('questions', 'reject_reason', "reject_reason TEXT DEFAULT ''");
ensureColumn('knowledge_points', 'exam_spec_version', "exam_spec_version TEXT DEFAULT ''");
const report = { categoryMigration: {}, answerMigration: {}, yikaoAudit: {}, specBackfill: 0 };

// ========== 1. 类目三层分离迁移 ==========
// 第一层标准学科大类（无人名）；个人/流派仅存于资料标题与来源标签（第二层）
const CAT_MAP = {
  '倪海厦·黄帝内经': '黄帝内经与中医基础理论',
  '倪海厦·针灸': '针灸推拿与经络',
  '倪海厦·伤寒论': '伤寒论',
  '倪海厦·金匮要略': '金匮要略',
  '倪海厦·神农本草经': '中药学与神农本草',
  '倪海厦·临床医案': '医案与临证笔记',
  '倪海厦·学生笔记': '医案与临证笔记',
  '倪海厦·方剂处方': '方剂学',
  '倪海厦·天纪人间道': '天纪易理研修',
};

// 1a. categories 表：旧类目行停用（审计保留）
for (const [oldName] of Object.entries(CAT_MAP)) {
  const r = db.prepare("UPDATE categories SET status='inactive' WHERE name=? AND status='active'").run(oldName);
  if (r.changes) log(`[类目] 停用「${oldName}」`);
}

// 1b. 三表 category 映射迁移（zhongyi/tcm 两个 track 值都覆盖）
for (const [table, trackCol] of [['materials', 'track'], ['knowledge_points', 'track'], ['questions', 'track']]) {
  let total = 0;
  for (const [oldName, newName] of Object.entries(CAT_MAP)) {
    const r = db.prepare(`UPDATE ${table} SET category=? WHERE category=? AND (${trackCol} IN ('zhongyi','tcm') OR ${trackCol}='')`).run(newName, oldName);
    total += r.changes;
  }
  report.categoryMigration[table] = total;
  if (total) log(`[类目] ${table}: 迁移 ${total} 行`);
}

// ========== 2. 答案格式统一迁移（阻断性修复）==========
// zhongyi/tcm 学习题：数字索引 → 字母；选项去 "A. " 前缀；与学院/医考前端字母判分标准对齐
const stripPrefix = (s) => String(s).replace(/^[A-Fa-f][\.、．]\s*/, '').trim();
const numToLetter = (s) => {
  const t = String(s).trim();
  if (/^\d+$/.test(t)) return String.fromCharCode(65 + Math.min(5, parseInt(t, 10)));
  if (/^(\d+,)+\d+$/.test(t)) return t.split(',').map((x) => String.fromCharCode(65 + Math.min(5, parseInt(x, 10)))).join(',');
  return null;
};

const rows = db.prepare("SELECT id, type, options, answer FROM questions WHERE track IN ('zhongyi','tcm') AND status!='rejected'").all();
let migrated = 0, prefixCleaned = 0;
const upd = db.prepare('UPDATE questions SET answer=?, options=? WHERE id=?');
for (const q of rows) {
  let opts = [];
  try { opts = JSON.parse(q.options || '[]'); } catch { continue; }
  const hadPrefix = opts.some((o) => /^[A-Fa-f][\.、．]/.test(String(o)));
  const newOpts = hadPrefix ? opts.map(stripPrefix) : opts;
  const newAns = (q.type === 'single' || q.type === 'multi') ? (numToLetter(q.answer) || q.answer) : q.answer;
  if (hadPrefix || newAns !== q.answer) {
    upd.run(newAns, JSON.stringify(newOpts), q.id);
    migrated++;
    if (hadPrefix) prefixCleaned++;
  }
}
report.answerMigration = { total: rows.length, migrated, prefixCleaned };
log(`[答案格式] zhongyi/tcm 共${rows.length}题，迁移${migrated}题（前缀清理${prefixCleaned}）`);

// ========== 3. 历史医考题审计打标 ==========
// EXAM_SCOPE_REJECTED：人名/流派/课程/机构/书名/页码/目录元信息污染
// QUALITY_REJECTED：4选项/数字答案等不符合当前考试规范格式
const SCOPE_PATTERNS = /倪海厦|汉唐中医|人纪|天纪|讲义|课程目录|学生笔记|第\d+页|页码|内部方剂|方剂编号/;
const rejectedYikao = db.prepare("SELECT id, stem, options, answer, analysis FROM questions WHERE track='yikao' AND status='rejected'").all();
let scopeRejected = 0, qualityRejected = 0;
const tagUpd = db.prepare("UPDATE questions SET reject_reason=? WHERE id=?");
for (const q of rejectedYikao) {
  const body = `${q.stem}\n${q.analysis || ''}`;
  let reason = '';
  if (SCOPE_PATTERNS.test(body)) reason = 'EXAM_SCOPE_REJECTED';
  else {
    let opts = [];
    try { opts = JSON.parse(q.options || '[]'); } catch {}
    const fmtBad = (q.type === 'single' || q.type === 'multi')
      ? (opts.length !== 5 || /^\d/.test(String(q.answer || '').trim()))
      : false;
    reason = fmtBad ? 'QUALITY_REJECTED' : 'QUALITY_REJECTED';
  }
  tagUpd.run(reason, q.id);
  if (reason === 'EXAM_SCOPE_REJECTED') scopeRejected++; else qualityRejected++;
}
report.yikaoAudit = { totalRejected: rejectedYikao.length, scopeRejected, qualityRejected };
log(`[医考审计] 历史下线题${rejectedYikao.length}道：范围污染${scopeRejected}、质量不合格${qualityRejected}`);

// ========== 4. 新医考题规范版本回填 ==========
const backfill = db.prepare("UPDATE questions SET exam_spec_version=? WHERE track='yikao' AND status!='rejected' AND (exam_spec_version='' OR exam_spec_version IS NULL)").run(SPEC_VERSION);
report.specBackfill = backfill.changes;
log(`[规范绑定] yikao 可用题回填 ${SPEC_VERSION}: ${backfill.changes} 道`);

// ========== 5. 汇总校验 ==========
const final = {
  cats: db.prepare("SELECT track, name, status FROM categories WHERE track IN ('zhongyi','yixue') ORDER BY sort").all(),
  zhongyiAnswers: db.prepare("SELECT answer, COUNT(*) c FROM questions WHERE track IN ('zhongyi','tcm') AND status!='rejected' AND type='single' GROUP BY answer ORDER BY c DESC LIMIT 8").all(),
  yikaoStats: db.prepare("SELECT status, COUNT(*) c FROM questions WHERE track='yikao' GROUP BY status").all(),
  yikaoSpec: db.prepare("SELECT exam_spec_version, COUNT(*) c FROM questions WHERE track='yikao' AND status!='rejected' GROUP BY exam_spec_version").all(),
  residualPersonalCats: db.prepare("SELECT COUNT(*) c FROM categories WHERE status='active' AND (name LIKE '%倪海厦%' OR name LIKE '%汉唐%')").get().c,
};
log('[校验] 生效类目:', JSON.stringify(final.cats.map((c) => `${c.track}:${c.name}(${c.status})`)));
log('[校验] zhongyi single答案分布:', JSON.stringify(final.zhongyiAnswers));
log('[校验] yikao题目状态:', JSON.stringify(final.yikaoStats));
log('[校验] yikao规范绑定:', JSON.stringify(final.yikaoSpec));
log('[校验] 类目人名残留:', final.residualPersonalCats);

fs.writeFileSync('/www/yandaoguoxue-backend/data/p7_tcm_exam_audit_report.json', JSON.stringify({ report, final }, null, 2));
log('审计报告已写入 data/p7_tcm_exam_audit_report.json');
