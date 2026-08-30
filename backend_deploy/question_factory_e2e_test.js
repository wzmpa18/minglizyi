// ============================================================================
// question_factory_e2e_test.js — QUESTION FACTORY 隔离测试
//                              （FINAL-MASTER-05 第八十一~九十六章）
//   - 隔离临时 academy.db（ACADEMY_DB_PATH 覆盖，不碰生产 data/）
//   - AI 生成调用 mock（Real AI Call = 0，禁止真实付费调用）
//   - 覆盖：
//       83章  来源类型 OFFICIAL/AUTHORIZED/INTERNAL/AI_GENERATED_PRACTICE + 存量标记
//       84章  AI 生成题强制 AI_GENERATED_PRACTICE（不冒充真题）
//       85章  Blueprint 字段全集（year/examType/subject/qp/qtype/weight/diff/officialSource/version）
//       86章  官方源不确定 → NEEDS_OFFICIAL_SOURCE；exam_specs 派生种子 ACTIVE
//       87章  Inventory 按科目/题型/难度统计
//       88章  MIN_INVENTORY 可配置 + belowMin 判定
//       89章  预测补题（近30天用量/库存/活跃用户 → forecastDemand/gap）
//       90章  生成队列（scan 幂等入队；generate 批量生成；重复执行幂等；取消）
//       91章  审核流 DRAFT→SELF_CHECKED→HUMAN_REVIEW→APPROVED→PUBLISHED；
//             AI 生成不可直接发布；REVIEW_REQUIRED 修复后可发布
//       92章  去重报告（Exact/Structural VERIFIED；Semantic PARTIAL 如实标注）+ 相似题对
//       93章  质量指标（correctRate/skipRate/discrimination/sampleSize；avgDuration 如实未采集）
//       94章  坏题自动复审（阈值触发 → REVIEW_REQUIRED + 临时下架 + anomaly_alerts）
//             用户举报 + 幂等 + 后台处理
//       95章  成本报告（批量生成策略 + ai_call_logs 聚合）
//       96章  后台总控概览
// ============================================================================
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(os.tmpdir(), 'qf_e2e_' + Date.now() + '_' + process.pid);
fs.mkdirSync(ROOT, { recursive: true });
process.env.ACADEMY_DB_PATH = path.join(ROOT, 'academy.db');
process.env.JWT_SECRET = 'qf-e2e-test-secret-0123456789abcdef-0123456789abcdef';

let AI_CALLS = 0;
let AI_MOCK_QUEUE = [];

// 先加载 academyRoutes 并替换导出的 callAI（QF 引擎加载时绑定 mock；Real AI Call = 0）
const academy = require('./academyRoutes');
const originalCallAI = academy.callAI;
academy.callAI = async () => {
  AI_CALLS++;
  const next = AI_MOCK_QUEUE.length ? AI_MOCK_QUEUE.shift() : null;
  if (next) return next;
  throw new Error('AI_MOCK_QUEUE 为空（测试未配置预期返回）');
};

const qf = require('./questionFactoryEngine');
const QG = require('./qualityGate');
const db = academy.getDb();

let PASS = 0, FAIL = 0;
const failures = [];
function eq(actual, expected, name) {
  if (actual === expected) { PASS++; console.log('  PASS  ' + name + ' = ' + JSON.stringify(actual)); }
  else { FAIL++; failures.push(name); console.log('  FAIL  ' + name + ` (期望 ${JSON.stringify(expected)} 实际 ${JSON.stringify(actual)})`); }
}
function check(cond, name, extra) {
  if (cond) { PASS++; console.log('  PASS  ' + name); }
  else { FAIL++; failures.push(name); console.log('  FAIL  ' + name + (extra ? '  => ' + JSON.stringify(extra) : '')); }
}
const approx = (a, b, eps, name) => check(Math.abs(a - b) < eps, name + ` (${a} ≈ ${b})`);

// ==================== fixtures ====================
function seedKp(track, category, title, content) {
  const r = db.prepare(`INSERT INTO knowledge_points (material_id, chapter, title, content, tags, difficulty, status,
    source_text, track, category, govern_state)
    VALUES (NULL, '测试章', ?, ?, '[]', 'easy', 'approved', '', ?, ?, 'PUBLISHED')`)
    .run(title, content, track, category);
  return Number(r.lastInsertRowid);
}

function seedQuestion(kpId, track, category, type, stem, options, answer, difficulty, status) {
  const r = db.prepare(`INSERT INTO questions (knowledge_id, track, type, stem, options, answer, keywords, analysis,
    difficulty, status, category, govern_state, q_score, q_hash1, q_hash2)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    kpId, track, type, stem, JSON.stringify(options), answer, '[]', '测试解析',
    difficulty, status, category, status === 'approved' ? 'PUBLISHED' : 'NEEDS_REVIEW', 85,
    QG.qHash1({ type, stem, options, answer }), QG.qHash2({ type, stem, options, answer, difficulty }));
  return Number(r.lastInsertRowid);
}

function seedExam(userId, score, detailArr, daysAgo = 0) {
  const submitted = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  const ids = detailArr.map((x) => x.questionId);
  const r = db.prepare(`INSERT INTO exams (user_id, track, level, question_ids, answers, score, detail, passed, submitted_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    String(userId), 'guoxue', 1, JSON.stringify(ids), '{}', score, JSON.stringify(detailArr), score >= 60 ? 1 : 0, submitted);
  return Number(r.lastInsertRowid);
}

function mockAiReturn(stemSeed, n = 1) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      type: 'single',
      stem: `${stemSeed}编号${i + 1}的国学综合测试题干内容足够长度`,
      options: ['甲选项内容一', '乙选项内容二', '丙选项内容三', '丁选项内容四'],
      answer: '0',
      keywords: ['测试'],
      analysis: '测试解析内容',
      difficulty: 'easy',
    });
  }
  return JSON.stringify(arr);
}

async function main() {
console.log('\n=== 1) 第八十五~八十六章：Exam Blueprint ===');
{
  qf.ensureQfTables();

  // 86章：无官方源 → NEEDS_OFFICIAL_SOURCE（不猜）
  let r = qf.createBlueprint({ year: 2026, examType: 'zhongyi_zhiye', subject: '中药学', questionType: 'A1', version: 'v1', officialSource: '' });
  eq(r.ok, true, '蓝图创建成功');
  eq(r.status, 'NEEDS_OFFICIAL_SOURCE', '86章 无官方源 → NEEDS_OFFICIAL_SOURCE');
  const bpNeedSource = r.id;

  // 85章：有官方源 → DRAFT（字段全集）
  r = qf.createBlueprint({
    year: 2026, examType: 'zhongyi_zhiye', subject: '方剂学', knowledgePoint: '解表剂',
    questionType: 'A1', weight: 5, difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
    officialSource: '国家医学考试中心 https://www.nmec.org.cn', version: 'v1',
  });
  eq(r.ok, true, '带官方源蓝图创建成功');
  eq(r.status, 'DRAFT', '有官方源初始 DRAFT');

  // 唯一性拒绝（与上方蓝图同 year/examType/subject/kp/questionType/version）
  r = qf.createBlueprint({ year: 2026, examType: 'zhongyi_zhiye', subject: '方剂学', knowledgePoint: '解表剂', questionType: 'A1', version: 'v1', officialSource: 'x' });
  eq(r.ok, false, '同版本蓝图重复创建拒绝');

  // 非法参数
  r = qf.createBlueprint({ year: 1999, examType: 'x', subject: 'x', questionType: 'A1', version: 'v1' });
  eq(r.ok, false, 'year 非法拒绝');
  r = qf.createBlueprint({ year: 2026, examType: 'x', subject: '', questionType: 'A1', version: 'v1' });
  eq(r.ok, false, 'subject 缺失拒绝');

  // 86章种子：exam_specs（官方大纲已在库登记）→ 派生 ACTIVE 蓝图
  const seeded = qf.listBlueprints({ status: 'ACTIVE' });
  check(seeded.blueprints.length >= 1, 'exam_specs 派生活跃蓝图（A1/A2）');
  check(seeded.blueprints.every((b) => (b.officialSource || '').includes('nmec.org.cn') || (b.officialSource || '').includes('卫健委')),
    '种子蓝图携带官方源信息', seeded.blueprints.map((b) => b.officialSource));

  // updateBlueprint
  r = qf.updateBlueprint(bpNeedSource, { status: 'ACTIVE', officialSource: '补充确认的官方公开来源' });
  eq(r.ok, true, '蓝图更新成功');
  r = qf.updateBlueprint(999999, { weight: 2 });
  eq(r.ok, false, '不存在蓝图更新拒绝');
  const bpList = qf.listBlueprints({});
  check(bpList.blueprints.some((b) => b.id === bpNeedSource && b.status === 'ACTIVE'), '更新后状态生效');
}

console.log('\n=== 2) 第八十七~八十九章：Inventory / MIN_INVENTORY / 预测 ===');
{
  // 种子知识点+题目（guoxue track）
  const kp1 = seedKp('guoxue', '国学基础', '论语基础', '论语是儒家经典著作核心内容说明');
  const kp2 = seedKp('guoxue', '国学基础', '孟子思想', '孟子主张性善论与仁政学说核心说明');
  const q1 = seedQuestion(kp1, 'guoxue', '国学基础', 'single', '《论语》的编纂者是下列哪位弟子为主的孔门后学？', ['有子', '曾子', '子夏', '集体编纂'], '3', 'easy', 'approved');
  const q2 = seedQuestion(kp1, 'guoxue', '国学基础', 'single', '"学而时习之"出自下列哪一部经典文献？', ['孟子', '论语', '大学', '中庸'], '1', 'easy', 'approved');
  const q3 = seedQuestion(kp2, 'guoxue', '国学基础', 'single', '孟子提出的人性论主张是下列哪一项？', ['性恶论', '性善论', '性无善恶', '性三品'], '1', 'medium', 'approved');
  seedQuestion(kp2, 'guoxue', '国学基础', 'single', '孟子政治思想的核心主张概念是什么？', ['法治', '仁政', '无为', '兼爱'], '1', 'medium', 'pending'); // 不可见

  // 87章：库存只统计可见（approved）
  let inv = qf.getInventory({ track: 'guoxue' });
  const easyGroup = inv.groups.find((g) => g.difficulty === 'easy');
  const mediumGroup = inv.groups.find((g) => g.difficulty === 'medium');
  eq(easyGroup.liveInventory, 2, '87章 easy 库存=2（pending 题不计）');
  eq(mediumGroup.liveInventory, 1, '87章 medium 库存=1');

  // 88章：MIN_INVENTORY 规则
  let r = qf.upsertRule({ track: 'guoxue', category: '国学基础', questionType: 'single', difficulty: 'easy', minInventory: 5, actor: 'test' });
  eq(r.ok, true, '88章 规则创建成功');
  r = qf.upsertRule({ track: 'guoxue', category: '国学基础', questionType: 'single', difficulty: 'easy', minInventory: 8 });
  eq(r.ok, true, '规则幂等更新（同维度覆盖）');
  const rules = qf.listRules();
  const easyRule = rules.find((x) => x.track === 'guoxue' && x.difficulty === 'easy');
  eq(easyRule.minInventory, 8, '规则更新后 min=8');
  r = qf.upsertRule({ track: 'guoxue', minInventory: -1 });
  eq(r.ok, false, '负库存规则拒绝');
  r = qf.deleteRule(999999);
  eq(r.ok, false, '不存在规则删除拒绝');

  // belowMin 判定
  inv = qf.getInventory({ track: 'guoxue' });
  const easyGroup2 = inv.groups.find((g) => g.difficulty === 'easy');
  eq(easyGroup2.minInventory, 8, '规则注入库存统计');
  eq(easyGroup2.belowMin, true, '库存 2 < 8 → belowMin=true');

  // 89章：预测（插入近30天考试模拟用量）
  seedExam(101, 90, [
    { questionId: String(q1), full: true, myAnswer: '3' },
    { questionId: String(q2), full: true, myAnswer: '1' },
  ], 3);
  seedExam(102, 30, [
    { questionId: String(q1), full: false, myAnswer: '' },   // skip
    { questionId: String(q2), full: false, myAnswer: '0' },
  ], 5);
  seedExam(103, 90, [
    { questionId: String(q3), full: true, myAnswer: '1' },
  ], 40);  // 40天前：不计入30天窗口

  inv = qf.getInventory({ track: 'guoxue' });
  const usageEasy = inv.groups.find((g) => g.difficulty === 'easy');
  eq(usageEasy.used30d, 4, '89章 easy 近30天用量=4（40天前的排除）');
  const expectedDemand = Math.max(Math.ceil(4 * 1.2), 8);
  eq(usageEasy.forecastDemand, expectedDemand, `预测需求 = max(用量×1.2, min) = ${expectedDemand}`);
  eq(usageEasy.gap, expectedDemand - 2, `缺口 = ${expectedDemand - 2}`);
  check(inv.activeUsers30d >= 2, `活跃用户30天=${inv.activeUsers30d} ≥ 2`);

  global.__qf = { kp1, kp2, q1, q2, q3 };
}

console.log('\n=== 3) 第九十章：生成队列（scan 幂等 + 批量生成） ===');
{
  // scan：guoxue easy 缺口 → 入队
  let r = qf.scanAndEnqueue({ track: 'guoxue', actor: 'test' });
  eq(r.ok, true, '90章 扫描入队成功');
  check(r.createdCount >= 1, `创建队列任务数=${r.createdCount} ≥ 1`);
  const queueId = r.created[0].id;
  check(r.created[0].reason === 'BELOW_MIN' || r.created[0].reason === 'FORECAST_GAP', '入队原因记录');

  // 幂等：重复 scan 不重复建
  r = qf.scanAndEnqueue({ track: 'guoxue' });
  eq(r.createdCount, 0, 'scan 幂等（同维度不重复入队）');

  const q = qf.listQueue({ status: 'QUEUED' });
  check(q.length >= 1, '队列列表查询正常');

  // 生成：mock AI 返回 3 题
  AI_MOCK_QUEUE = [mockAiReturn('队列生成测试题', 3)];
  r = await qf.processQueueItem(queueId, { actor: 'test' });
  eq(r.ok, true, '队列任务执行成功');
  eq(r.generatedCount, 3, '批量生成 3 题入库');
  eq(AI_CALLS, 1, 'AI 调用次数=1（批量一次调用，Real AI=0 为 mock）');
  check(r.createdIds && r.createdIds.length === 3, '生成题 id 列表返回');
  check(r.selfChecked === 3, '生成题全部自动自检（91章）');

  // 84章：AI 生成题强制 AI_GENERATED_PRACTICE
  const createdIds = r.createdIds || [];
  const genQ = db.prepare('SELECT source_type, qf_state, qf_queue_id, status FROM questions WHERE id=?').get(createdIds[0]);
  eq(genQ.source_type, 'AI_GENERATED_PRACTICE', '84章 AI 生成题 source_type=AI_GENERATED_PRACTICE');
  eq(genQ.qf_queue_id, queueId, '生成题回绑队列任务');
  check(genQ.status === 'pending', '生成题未直接发布（status=pending）');

  // 重复执行幂等
  r = await qf.processQueueItem(queueId);
  check(r.ok && r.already === true, 'DONE 任务重复执行幂等跳过');

  // cancel 拒绝已完成任务
  r = qf.cancelQueueItem(queueId);
  eq(r.ok, false, 'DONE 任务不可取消');

  global.__queueId = queueId;
  global.__genIds = createdIds;
}

console.log('\n=== 4) 第九十一章：审核流（AI 不直接发布） ===');
{
  const { q3 } = global.__qf;
  const genId = global.__genIds[0];

  // 91章：状态机 DRAFT → (selfCheck) → HUMAN_REVIEW → (review) → APPROVED → (publish) → PUBLISHED
  let q = db.prepare('SELECT qf_state, status FROM questions WHERE id=?').get(genId);
  eq(q.qf_state, 'HUMAN_REVIEW', '自检通过后自动进入 HUMAN_REVIEW');

  // AI 生成不可直接 publish（必须先人工审核）
  let r = qf.publishQuestion(genId, 'test');
  eq(r.ok, false, '91章 HUMAN_REVIEW 状态不可直接发布');

  // review reject
  const badId = global.__genIds[1];
  r = qf.reviewQuestion({ questionId: badId, action: 'reject', reason: '人工测试驳回', reviewer: 'test' });
  eq(r.ok, true, '人工驳回成功');
  q = db.prepare('SELECT qf_state, status, reject_reason FROM questions WHERE id=?').get(badId);
  eq(q.qf_state, 'REJECTED', '驳回后 qf_state=REJECTED');
  eq(q.status, 'rejected', '驳回后 status=rejected');

  // review approve
  r = qf.reviewQuestion({ questionId: genId, action: 'approve', reviewer: 'test' });
  eq(r.ok, true, '人工审核通过成功');
  q = db.prepare('SELECT qf_state, status FROM questions WHERE id=?').get(genId);
  eq(q.qf_state, 'APPROVED', '审核通过 qf_state=APPROVED');
  eq(q.status, 'approved', 'APPROVED 组卷可见（status=approved）');

  // publish
  r = qf.publishQuestion(genId, 'test');
  eq(r.ok, true, '发布成功');
  q = db.prepare('SELECT qf_state, status FROM questions WHERE id=?').get(genId);
  eq(q.qf_state, 'PUBLISHED', '发布后 qf_state=PUBLISHED');

  // 已发布再 publish 幂等
  r = qf.publishQuestion(genId, 'test');
  eq(r.ok, true, '重复发布幂等');

  // unpublish → REVIEW_REQUIRED + 临时下架
  r = qf.unpublishQuestion(genId, 'test', '临时抽检下架');
  eq(r.ok, true, '下架成功');
  q = db.prepare('SELECT qf_state, status, reject_reason FROM questions WHERE id=?').get(genId);
  eq(q.qf_state, 'REVIEW_REQUIRED', '下架后 qf_state=REVIEW_REQUIRED');
  eq(q.status, 'pending', '下架后组卷不可见（临时下架）');

  // REVIEW_REQUIRED 修复后可直接 approve → publish
  r = qf.reviewQuestion({ questionId: genId, action: 'approve', reviewer: 'test' });
  eq(r.ok, true, '复审中题目可重新审核通过');
  r = qf.publishQuestion(genId, 'test');
  eq(r.ok, true, '复审通过后重新发布');

  // selfCheck 状态前置校验：非 DRAFT 拒绝
  r = qf.selfCheckQuestion(genId, 'test');
  eq(r.ok, false, '非 DRAFT 状态不可自检');

  // 非法审核 action
  r = qf.reviewQuestion({ questionId: q3, action: 'hack' });
  eq(r.ok, false, '非法审核动作拒绝');

  // QF 题目列表按状态过滤
  const hrList = qf.listQuestions({ qfState: 'HUMAN_REVIEW' });
  check(hrList.questions.length >= 1, 'HUMAN_REVIEW 列表过滤（第3题待审）');
  const pubList = qf.listQuestions({ qfState: 'PUBLISHED' });
  check(pubList.questions.some((x) => x.id === genId), 'PUBLISHED 列表包含已发布题');

  // 存量题读视图兼容（qf_state 空 + status approved → PUBLISHED 视图）
  const legacy = db.prepare('SELECT * FROM questions WHERE id=?').get(global.__qf.q1);
  eq(qf.qfStateView(legacy), 'PUBLISHED', '91章 存量题（qf_state空）读视图兼容 PUBLISHED');
}

console.log('\n=== 5) 第八十三章：存量题来源标记（人工确认，不猜默认） ===');
{
  const { q1, q2, q3 } = global.__qf;
  let r = qf.markSourceType({ questionId: q1, sourceType: 'OFFICIAL', actor: 'test' });
  eq(r.ok, true, '83章 存量题标记 OFFICIAL');
  const row = db.prepare('SELECT source_type FROM questions WHERE id=?').get(q1);
  eq(row.source_type, 'OFFICIAL', '标记落库');

  r = qf.markSourceType({ questionId: q1, sourceType: 'FAKE' });
  eq(r.ok, false, '非法来源类型拒绝');
  r = qf.markSourceType({ questionId: 999999, sourceType: 'AUTHORIZED' });
  eq(r.ok, false, '不存在题目拒绝');

  r = qf.markSourceType({ questionId: q2, sourceType: 'AUTHORIZED', actor: 'test' });
  eq(r.ok, true, '标记 AUTHORIZED');
  r = qf.markSourceType({ questionId: q3, sourceType: 'INTERNAL', actor: 'test' });
  eq(r.ok, true, '标记 INTERNAL');
}

console.log('\n=== 6) 第九十二章：去重（Exact/Structural VERIFIED；Semantic PARTIAL） ===');
{
  const dedupe = qf.dedupeStatus();
  eq(dedupe.exact.status, 'VERIFIED', '92章 Exact 去重=VERIFIED');
  eq(dedupe.structural.status, 'VERIFIED', 'Structural 去重=VERIFIED');
  eq(dedupe.semantic.status, 'PARTIAL', 'Semantic 去重如实 PARTIAL（不假装 embedding）');
  check(!!dedupe.semantic.note, 'Semantic PARTIAL 附说明（不假装实现）');

  // 相似题对检测（bigram 近似）
  const kpSeed = seedKp('guoxue', '国学基础', '测试相似知识点', '用于相似题对检测的测试知识点内容说明');
  const sa = seedQuestion(kpSeed, 'guoxue', '国学基础', 'single', '下列关于仁政学说的核心表述正确的一项是？', ['甲', '乙', '丙', '丁'], '1', 'easy', 'pending');
  const sb = seedQuestion(kpSeed, 'guoxue', '国学基础', 'single', '下列关于仁政学说的核心表述正确的一项？', ['甲', '乙', '丙', '丁'], '1', 'easy', 'pending');
  const sc = seedQuestion(kpSeed, 'guoxue', '国学基础', 'single', '完全无关的另一道题干内容说明文字各不相同', ['甲', '乙', '丙', '丁'], '1', 'easy', 'pending');
  const sim = qf.findSimilarPairs(0.8, 10);
  check(sim.pairs.some((p) => (p.a === sa && p.b === sb) || (p.a === sb && p.b === sa)), '92章 相似题对检出（a-b 高相似）');
  check(!sim.pairs.some((p) => (p.a === sa && p.b === sc) || (p.a === sc && p.b === sa)), '无关题不误报');
}

console.log('\n=== 7) 第九十三~九十四章：质量指标 + 坏题自动复审 ===');
{
  const { q1, q2, q3 } = global.__qf;
  // 构造统计样本：q1 正常；q2 极端正确率（送分题）；q3 极低正确率（坏题）
  for (let i = 0; i < 40; i++) {
    const uid = 200 + i;
    const score = i % 3 === 0 ? 20 : 90;   // 混合高低分组
    seedExam(uid, score, [
      { questionId: String(q1), full: i % 3 !== 0, myAnswer: i % 3 === 0 ? '' : '3' },
      { questionId: String(q2), full: true, myAnswer: '1' },         // q2：40+ 次全对 → 正确率>0.97
      { questionId: String(q3), full: false, myAnswer: '0' },        // q3：41 次全错 → 正确率<0.15
    ], 1);
  }

  let r = qf.refreshQuestionStats(false);
  eq(r.ok, true, '93章 质量指标增量刷新成功');
  check(r.processed >= 41, `处理考试记录=${r.processed} ≥ 41`);
  check(r.updatedQuestions >= 3, `更新题目数=${r.updatedQuestions} ≥ 3`);

  const metrics = qf.getQualityMetrics({});
  const m1 = metrics.questions.find((x) => x.questionId === q1);
  const m2 = metrics.questions.find((x) => x.questionId === q2);
  const m3 = metrics.questions.find((x) => x.questionId === q3);
  check(!!m1, 'q1 指标存在');
  eq(m1.sampleSize, 42, 'q1 样本量=42（2+40）');
  // q1：42 次作答中跳过 15 次（低分组 i%3===0 共 14 次 + 种子用户102 1 次），答对 27 次
  approx(m1.skipRate, 15 / 42, 0.001, 'q1 跳过率=15/42');
  approx(m1.correctRate, 27 / 42, 0.001, 'q1 正确率=27/42');
  check(typeof m1.discrimination === 'number', `q1 区分度=${m1 && m1.discrimination}`);
  check(m1.discrimination > 0.5, `q1 区分度>0.5（高低分组有区分）`, m1);
  check(m2.correctRate > 0.97, `q2 正确率=${m2 && m2.correctRate} >0.97`);
  check(m3.correctRate < 0.15, `q3 正确率=${m3 && m3.correctRate} <0.15`);
  // q3：高分组 27 次（26 次循环全错 + 40天前用户103 答对 1 次），低分组 14 次全错
  approx(m3.highGroupRate, 1 / 27, 0.001, 'q3 高分组正确率=1/27（仅历史1次答对）');
  eq(m3.lowGroupRate, 0, 'q3 低分组全错');
  // avgDuration 如实未采集（不伪造数据）
  check(metrics.avgDuration.available === false && metrics.questions.every((x) => x.avgDurationMs === 0),
    '93章 avgDuration 如实标注未采集（值恒 0 + 说明）');
  check(metrics.questions.every((x) => x.reportRate === 0), '举报率初始 0');

  // 94章：用户举报（幂等）
  r = qf.reportQuestion({ userId: 999, questionId: q3, reason: '错误答案', note: '答案明显错误' });
  eq(r.ok, true, '94章 用户举报成功');
  r = qf.reportQuestion({ userId: 999, questionId: q3, reason: '错误答案' });
  check(r.ok && r.already === true, '同用户同题同理由举报幂等');
  r = qf.reportQuestion({ userId: 999, questionId: q3, reason: '乱写' });
  eq(r.ok, false, '非法举报理由拒绝');

  // 94章：坏题自动复审
  r = qf.evaluateQuestionHealth();
  eq(r.ok, true, '坏题健康检查执行成功');
  const flaggedQ3 = r.flagged.find((x) => x.questionId === q3);
  const flaggedQ2 = r.flagged.find((x) => x.questionId === q2);
  check(!!flaggedQ3, `q3 被标记复审（原因：${flaggedQ3 && flaggedQ3.reasons.join('；')}）`);
  check(!!flaggedQ2, 'q2 送分题被标记复审（正确率>97%）');
  check(!r.flagged.some((x) => x.questionId === q1), '正常题 q1 不误报');

  const q3row = db.prepare('SELECT qf_state, status, reject_reason FROM questions WHERE id=?').get(q3);
  eq(q3row.qf_state, 'REVIEW_REQUIRED', '94章 坏题 qf_state=REVIEW_REQUIRED');
  eq(q3row.status, 'pending', '94章 坏题临时下架（组卷不可见）');
  check((q3row.reject_reason || '').includes('自动复审'), '复审原因留痕');

  // anomaly_alerts 报警（复用 qualityGate 报警表）
  const alert = db.prepare("SELECT * FROM anomaly_alerts WHERE alert_type='qf_question_health' AND detail LIKE ?").get('QF_HEALTH|q#' + q3 + '%');
  check(!!alert, '94章 异常报警写入 anomaly_alerts');

  // 重复评估不重复降级/不重复报警
  r = qf.evaluateQuestionHealth();
  const alertsCount = db.prepare("SELECT COUNT(*) n FROM anomaly_alerts WHERE alert_type='qf_question_health'").get().n;
  check(alertsCount === r.flaggedCount, '重复评估报警不重复插入');

  // 举报处理
  const reports = db.prepare("SELECT * FROM qf_question_reports WHERE question_id=?").all(q3);
  r = qf.handleReport(reports[0].id, { status: 'RESOLVED', actor: 'test' });
  eq(r.ok, true, '举报处理成功');
  r = qf.handleReport(reports[0].id, { status: 'RESOLVED' });
  check(r.ok, '重复处理幂等');
  r = qf.handleReport(999999, { status: 'RESOLVED' });
  eq(r.ok, false, '不存在举报拒绝');
}

console.log('\n=== 8) 第九十五章：生成成本控制 ===');
{
  // ai_call_logs 由真实 callAI 写入——mock 期间未写；手工补录验证聚合口径
  db.prepare('INSERT INTO ai_call_logs (scene, material_id, kp_id, task_id, tokens_in, tokens_out) VALUES (?,?,?,?,?,?)')
    .run('gen_questions', null, null, null, 3000, 1500);
  db.prepare('INSERT INTO ai_call_logs (scene, material_id, kp_id, task_id, tokens_in, tokens_out) VALUES (?,?,?,?,?,?)')
    .run('parse_material', 1, null, null, 8000, 2000);

  const cost = qf.costReport();
  eq(cost.policy.batchGeneration, true, '95章 批量生成策略=true');
  eq(cost.policy.perQuestionRealtimeGeneration, false, '禁止逐题实时生成');
  const gen = cost.byScene.find((s) => s.scene === 'gen_questions');
  eq(gen.calls, 1, 'gen_questions 调用数聚合正确');
  eq(gen.tokensIn, 3000, 'tokens_in 聚合正确');
  check(cost.generation.qfQueueTasks >= 1, 'QF 队列完成任务统计');
  check(cost.generation.publishedAiQuestions >= 1, '已发布 AI 题统计');
  check(cost.generation.aiCallsPerPublishedQuestion !== null, '每题 AI 调用率可追溯');
}

console.log('\n=== 9) 第九十六章：后台总控概览 ===');
{
  const ov = qf.overview();
  check(ov.inventory.groups >= 1, '96章 概览-库存分组');
  // 时点可见题：q1 + 已发布 AI 题 genId（q2/q3 已被 94 章自动复审降级为临时下架）
  check(ov.inventory.liveQuestions >= 2, '概览-可见题总数');
  check(ov.questions.aiGenerated >= 3, '概览-AI 生成题数');
  check(ov.questions.reviewRequired >= 1, '概览-复审中题数');
  check(ov.queue.done >= 1, '概览-队列统计');
  check(ov.reports.open >= 0, '概览-举报统计');
  check(ov.blueprints.total >= 3, '概览-蓝图总数');
  check(Array.isArray(ov.sourceTypes) && ov.sourceTypes.length === 4, '83章 四类来源类型枚举完整');
  check(Array.isArray(ov.qfStates) && ov.qfStates.includes('REVIEW_REQUIRED'), '91章 状态机含 REVIEW_REQUIRED');
}

// ==================== 汇总 ====================
console.log('\n========================================');
console.log(`QUESTION FACTORY E2E: PASS=${PASS}  FAIL=${FAIL}`);
if (FAIL > 0) {
  console.log('失败项：');
  for (const f of failures) console.log('  - ' + f);
  process.exitCode = 1;
} else {
  console.log('全部通过 ✅（Real AI Call = 0，隔离库 = ' + process.env.ACADEMY_DB_PATH + '）');
}
console.log('========================================');
}

main().catch((e) => {
  console.error('[QF-E2E] 致命错误:', e);
  process.exitCode = 1;
}).finally(() => {
  academy.callAI = originalCallAI;
});
