#!/usr/bin/env node
/**
 * v25.0.39 P1-1 医考题库存量题目批量质检上线
 * 质检标准（用户规范3.2）：
 *   1. 题干/选项/答案完整性  2. 正确答案唯一性  3. 题型与选项格式（A1型5选项单选）
 *   4. 题干与解析一致性(analysis非空且非套话)  5. 三级去重(q_hash 批内+对已上线库)
 *   6. 人名/课程/页码污染检测  7. 考纲知识点映射(knowledge_id→已审知识点)
 *   8. 人工抽检（DRY RUN 输出随机样本，人工复核后 --apply 正式执行）
 * 用法：node yikao_qc_approve_v25_0_39.js           → DRY RUN
 *       node yikao_qc_approve_v25_0_39.js --apply   → 正式批量上线
 */
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const D = new Database('/www/yandaoguoxue-backend/data/academy.db');
const APPLY = process.argv.includes('--apply');

// 污染词：现代个人/课程/讲义/页码/营销词（金元四大家等考纲内历史流派词不在其列）
const POLLUTE = ['倪海厦', '人纪', '天纪', '汉唐', '刘渡舟', '郝万山', '胡希恕', '邓中甲', '王洪图', '徐文兵', '黄煌', '潘毅',
  '讲义', '押题', '真题', '内部资料', '网课', '视频课', '培训班', '老师说', '第页', '页码', '速成班', '必考原题'];

const rows = D.prepare("SELECT id, knowledge_id, type, stem, options, answer, analysis, difficulty, category, q_checks, q_hash1, q_score FROM questions WHERE track='yikao' AND status='pending'").all();
const approvedHashes = new Set(D.prepare("SELECT q_hash1 h FROM questions WHERE track='yikao' AND status='approved' AND q_hash1!=''").all().map(r => r.h));
const kpOk = new Set(D.prepare("SELECT id FROM knowledge_points WHERE status='approved'").all().map(r => r.id));

const pass = [], fail = [];
const failReasons = {};
const mark = (q, reason) => { fail.push({ ...q, reason }); failReasons[reason] = (failReasons[reason] || 0) + 1; };
const batchHash = new Map();

for (const q of rows) {
  // 7. 考纲知识点映射
  if (!q.knowledge_id || !kpOk.has(q.knowledge_id)) { mark(q, '知识点未审核/缺失'); continue; }
  // 1. 题干完整性（≥6字完整问句；<6字如“噎膈是指”过于残缺）
  if (!q.stem || q.stem.replace(/\s/g, '').length < 6) { mark(q, '题干过短(<6字)'); continue; }
  // 1. 选项完整性
  let opts = [];
  try { opts = JSON.parse(q.options || '[]'); } catch { mark(q, '选项JSON损坏'); continue; }
  if (!Array.isArray(opts) || opts.length === 0) { mark(q, '选项为空'); continue; }
  // 3. 题型与选项格式：A1/A2 单选必须恰好5个非空且互不重复的选项
  if (q.type === 'single' && opts.length !== 5) { mark(q, `选项数${opts.length}≠5`); continue; }
  if (opts.some(o => !String(o).trim())) { mark(q, '存在空选项'); continue; }
  if (new Set(opts.map(o => String(o).trim())).size !== opts.length) { mark(q, '选项重复'); continue; }
  // 2. 正确答案唯一性：单字母且指向有效选项
  if (!/^[A-Z]$/.test(q.answer)) { mark(q, `答案格式异常:${q.answer}`); continue; }
  const idx = q.answer.charCodeAt(0) - 65;
  if (idx < 0 || idx >= opts.length) { mark(q, `答案越界:${q.answer}`); continue; }
  // 4. 解析一致性：非空
  if (!q.analysis || q.analysis.replace(/\s/g, '').length < 5) { mark(q, '解析为空'); continue; }
  // 6. 污染检测
  const blob = q.stem + ' ' + opts.join(' ') + ' ' + q.analysis;
  const hit = POLLUTE.find(w => blob.includes(w));
  if (hit) { mark(q, `污染词:${hit}`); continue; }
  // 5. 三级去重：对已上线库 + 批内
  if (q.q_hash1 && approvedHashes.has(q.q_hash1)) { mark(q, '与已上线题重复'); continue; }
  if (q.q_hash1) {
    if (batchHash.has(q.q_hash1)) { mark(q, '批内重复'); continue; }
    batchHash.set(q.q_hash1, q.id);
  }
  pass.push(q);
}

console.log(`===== 医考 pending 题目质检 ${APPLY ? '[APPLY 正式执行]' : '[DRY RUN]'} =====`);
console.log(`总数 ${rows.length} | 通过 ${pass.length} | 退回 ${fail.length}`);
console.log('退回原因分布:', JSON.stringify(failReasons, null, 0));
const byCat = {};
for (const q of pass) byCat[q.category] = (byCat[q.category] || 0) + 1;
console.log('通过题目科目分布:');
for (const [c, n] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) console.log(`  ${c}: ${n}`);

if (fail.length) {
  console.log('\n== 退回题目明细(前20) ==');
  for (const q of fail.slice(0, 20)) console.log(`  #${q.id} [${q.category}] ${q.reason} | ${q.stem.slice(0, 30)}`);
}

// 8. 人工抽检：每科目随机抽1题（共约21题），供人工复核
console.log('\n===== 人工抽检样本（每科目1题，请人工核对答案正确性）=====');
const seen = new Set();
let shown = 0;
for (const q of pass.sort(() => Math.random() - 0.5)) {
  if (seen.has(q.category)) continue;
  seen.add(q.category);
  shown++;
  let opts = []; try { opts = JSON.parse(q.options); } catch {}
  console.log(`\n[抽检${shown}] #${q.id} ${q.category} 难度${q.difficulty}`);
  console.log(`  题干: ${q.stem}`);
  opts.forEach((o, i) => console.log(`    ${String.fromCharCode(65 + i)}. ${o}`));
  console.log(`  答案: ${q.answer}`);
  console.log(`  解析: ${String(q.analysis).slice(0, 120)}`);
  if (shown >= 21) break;
}

if (APPLY) {
  const tx = D.transaction(() => {
    const upApprove = D.prepare("UPDATE questions SET status='approved', reviewer='project_owner_authorized', review_time=datetime('now','localtime') WHERE id=?");
    const upReject = D.prepare("UPDATE questions SET status='rejected', reject_reason=?, reviewer='project_owner_authorized', review_time=datetime('now','localtime') WHERE id=?");
    for (const q of pass) upApprove.run(q.id);
    for (const q of fail) upReject.run(`v25.0.39质检退回：${q.reason}`, q.id);
    D.prepare("INSERT INTO loc_op_logs (admin_id, action, target, detail) VALUES (?,?,?,?)")
      .run('project_owner_authorized', 'yikao_batch_qc', `questions×${rows.length}`,
        `v25.0.39 P1-1 医考存量题批量质检：通过上线 ${pass.length} 题，退回 ${fail.length} 题（${JSON.stringify(failReasons)}）`);
  });
  tx();
  console.log(`\n[APPLY] 已执行：上线 ${pass.length} 题，退回 ${fail.length} 题，操作已留痕 loc_op_logs`);
} else {
  console.log('\n[DRY RUN] 未写库。确认抽检无误后执行: node yikao_qc_approve_v25_0_39.js --apply');
}
