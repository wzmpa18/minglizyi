#!/usr/bin/env node
'use strict';
// P7-验收推进-01 阶段2：方剂学(yikao)已上线题目抽检审计（只读）
// 抽检比例 ≥20%，四项核查：污染内容 / 考纲格式 / 结构一致性 / 知识点绑定
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const fs = require('fs');
const db = new Database('/www/yandaoguoxue-backend/data/academy.db', { readonly: true });

const TOTAL = db.prepare("SELECT COUNT(*) c FROM questions WHERE track='yikao' AND category='方剂学' AND status='approved'").get().c;
const SAMPLE_N = Math.max(Math.ceil(TOTAL * 0.24), 60); // ≥20%，实际取24%
const rows = db.prepare(`SELECT id, knowledge_id, type, stem, options, answer, analysis, difficulty, q_tier, exam_spec_version
  FROM questions WHERE track='yikao' AND category='方剂学' AND status='approved' ORDER BY RANDOM() LIMIT ?`).all(SAMPLE_N);

// 污染词（人名/流派/机构/课程/营销）
const DIRTY = ['倪海厦', '汉唐', '人纪', '天纪', 'JT叔叔', '老师', '教授', '课程', '培训班', '辅导班', '机构', '网校', '学堂', '冲刺班', '密训', '押题班', '名师', '某医', '公众号', '微信', '客服', '购买', '优惠', '下载APP', '限时', '秒杀'];

// 考纲合法题型
const VALID_TYPES = ['single', 'multiple', 'judge', 'fill', 'case_analysis', 'brief', 'stanza'];

let issues = [];
const stats = { sampled: rows.length, total: TOTAL, dirty: 0, badType: 0, badOptions: 0, badAnswer: 0, noAnalysis: 0, kpUnbound: 0, kpNotFangji: 0, kpNotApproved: 0 };
const sampleOut = [];

for (const r of rows) {
  const f = [];
  // 1) 污染内容
  const fullText = `${r.stem}\n${r.options || ''}\n${r.analysis || ''}`;
  const hit = DIRTY.filter(w => fullText.includes(w));
  if (hit.length) { stats.dirty++; f.push(`污染词:${hit.join(',')}`); }

  // 2) 题型合法
  if (!VALID_TYPES.includes(r.type)) { stats.badType++; f.push(`非法题型:${r.type}`); }

  // 3) 选项格式（选择题：合法JSON、键为字母、≥3项）
  let opts = null;
  if (['single', 'multiple'].includes(r.type)) {
    try {
      opts = JSON.parse(r.options);
      const keys = Object.keys(opts);
      const letterOk = keys.length >= 3 && keys.every(k => /^[A-F]$/.test(k));
      if (!letterOk) { stats.badOptions++; f.push(`选项键异常:${keys.join(',')}`); }
    } catch { stats.badOptions++; f.push('options非JSON'); }
    // 答案键合法
    if (opts) {
      const ansKeys = String(r.answer).split(/[,，、\s]+/).filter(Boolean);
      const ok = ansKeys.length > 0 && ansKeys.every(a => /^[A-F]$/.test(a));
      if (!ok) { stats.badAnswer++; f.push(`答案键异常:${r.answer}`); }
      if (r.type === 'single' && ansKeys.length > 1) { stats.badAnswer++; f.push('单选题多答案'); }
    }
  } else if (r.type === 'judge') {
    if (!/^(正确|错误|对|错|A|B)$/i.test(String(r.answer).trim())) { stats.badAnswer++; f.push(`判断题答案异常:${r.answer}`); }
  } else if (!String(r.answer).trim()) { stats.badAnswer++; f.push('答案为空'); }

  // 4) 解析非空且≥30字
  if (!r.analysis || r.analysis.trim().length < 30) { stats.noAnalysis++; f.push('解析缺失或过短'); }

  // 5) 知识点绑定
  if (!r.knowledge_id) { stats.kpUnbound++; f.push('未绑定知识点'); }
  else {
    const kp = db.prepare('SELECT id, title, track, status FROM knowledge_points WHERE id = ?').get(r.knowledge_id);
    if (!kp) { stats.kpUnbound++; f.push(`知识点不存在:${r.knowledge_id}`); }
    else {
      if (kp.status !== 'approved') { stats.kpNotApproved++; f.push(`知识点未过审:${kp.status}`); }
      if (kp.track !== 'yikao') { stats.kpNotFangji++; f.push(`知识点track异常:${kp.track}`); }
    }
  }

  if (f.length) issues.push({ id: r.id, flags: f });
  sampleOut.push({ id: r.id, type: r.type, stem: r.stem.slice(0, 80), answer: r.answer, flags: f.join(';') });
}

// 题型分布
const typeDist = {};
for (const r of rows) typeDist[r.type] = (typeDist[r.type] || 0) + 1;
const examSpec = {};
for (const r of rows) examSpec[r.exam_spec_version || 'NULL'] = (examSpec[r.exam_spec_version || 'NULL'] || 0) + 1;

console.log(`方剂学(yikao)已上线总数: ${TOTAL}，抽检: ${rows.length}（${(rows.length / TOTAL * 100).toFixed(1)}%）`);
console.log('题型分布:', JSON.stringify(typeDist));
console.log('考纲版本分布:', JSON.stringify(examSpec));
console.log('审计统计:', JSON.stringify(stats, null, 1));
console.log(`\n问题题目 ${issues.length} 道:`);
for (const i of issues) console.log(`  [${i.id}] ${i.flags.join('; ')}`);

fs.writeFileSync('/root/p7_fangji_audit_sample.json', JSON.stringify({ total: TOTAL, sampled: rows.length, stats, issues, sample: sampleOut }, null, 2));
console.log('\n抽检明细已导出: /root/p7_fangji_audit_sample.json');
