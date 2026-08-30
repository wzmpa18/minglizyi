/**
 * questionFactoryRoutes.js — QUESTION FACTORY 路由（FINAL-MASTER-05 第八十一~九十六章）
 *
 * 用户端（JWT，挂载 /api/qf）：
 *   POST /questions/:id/report        — 举报坏题（第九十四章数据来源：错误答案/歧义/超纲/重复/选项错误）
 *
 * 管理端（密钥鉴权 CONTENT_ADMIN，挂载 /api/admin/qf）：
 *   GET  /overview                    — 总览（库存/缺口/队列/审核/举报/蓝图）
 *   --- Exam Blueprint（第八十五~八十六章）---
 *   GET  /blueprints                  — 蓝图列表
 *   POST /blueprints                  — 创建蓝图（官方源不确定自动 NEEDS_OFFICIAL_SOURCE）
 *   PUT  /blueprints/:id              — 更新（weight/status/official_source/难度分布）
 *   --- Inventory / MIN / 预测（第八十七~八十九章）---
 *   GET  /inventory                   — 库存统计（科目/题型/难度 + 30天用量 + 预测需求 + 缺口）
 *   GET  /rules                       — MIN_INVENTORY 规则列表
 *   POST /rules                       — 创建/更新规则
 *   DELETE /rules/:id                 — 删除规则
 *   --- 生成队列（第九十章）---
 *   POST /scan                        — 扫描缺口并入队（幂等）
 *   GET  /queue                       — 队列列表
 *   POST /queue/:id/generate          — 执行队列任务（批量生成，AI_GENERATED_PRACTICE）
 *   POST /queue/:id/cancel            — 取消任务
 *   --- 审核流（第九十一章：AI 不直接发布）---
 *   GET  /questions                   — QF 题目列表（按 qfState 过滤）
 *   POST /questions/:id/review        — 人工 approve/reject（HUMAN_REVIEW/REVIEW_REQUIRED）
 *   POST /questions/:id/publish       — APPROVED → PUBLISHED
 *   POST /questions/:id/unpublish     — 临时下架进复审
 *   POST /questions/:id/source-type    — 存量题来源标记（第八十三章，人工确认不猜）
 *   --- 去重 / 质量 / 复审（第九十二~九十四章）---
 *   GET  /dedupe                      — 去重能力报告（Exact/Structural VERIFIED，Semantic PARTIAL）
 *   GET  /dedupe/similar              — 相似题对（bigram 近似，供人工参考）
 *   POST /quality/refresh             — 增量刷新质量指标（解析 exams，零侵入）
 *   GET  /quality                     — 质量指标列表
 *   POST /quality/evaluate            — 坏题自动复审（异常→临时下架+报警）
 *   GET  /reports                     — 举报列表
 *   POST /reports/:id/handle          — 处理举报（RESOLVED/DISMISSED）
 *   --- 成本（第九十五章）---
 *   GET  /cost                        — 生成成本报告（ai_call_logs 真实聚合）
 */
'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const qf = require('./questionFactoryEngine');
const { adminAuth, audit } = require('./adminRoles');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET 未配置或长度不足32位，服务拒绝启动（fail-closed）。请在部署 .env 设置 ≥32 位随机密钥。');
}

function createRouter() {
  const router = express.Router();
  qf.ensureQfTables();

  function authRequired(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : (req.headers['x-access-token'] || '');
    if (!token) return res.status(401).json({ success: false, error: '请先登录' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
    }
  }

  const guard = fn => (req, res) => {
    try { fn(req, res); } catch (e) {
      console.error('[QFRoutes] 内部错误:', e.message);
      res.status(500).json({ success: false, error: '服务内部错误' });
    }
  };

  // ==================== 用户端 ====================

  // 第九十四章：用户举报坏题（坏题自动复审的数据来源之一）
  router.post('/questions/:id/report', authRequired, guard((req, res) => {
    const b = req.body || {};
    const r = qf.reportQuestion({
      userId: req.user.userId, questionId: req.params.id,
      reason: b.reason, note: b.note,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  // ==================== 管理端：总控 ====================

  router.get('/overview', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    res.json({ success: true, data: qf.overview() });
  }));

  // ---- 第八十五~八十六章：Exam Blueprint ----

  router.get('/blueprints', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    res.json({ success: true, data: qf.listBlueprints({
      status: req.query.status, year: req.query.year, examType: req.query.examType,
      page: req.query.page, size: req.query.size,
    }) });
  }));

  router.post('/blueprints', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const b = req.body || {};
    const r = qf.createBlueprint({
      year: b.year, examType: b.examType, subject: b.subject, knowledgePoint: b.knowledgePoint,
      questionType: b.questionType, weight: b.weight, difficultyDistribution: b.difficultyDistribution,
      officialSource: b.officialSource, version: b.version, status: b.status,
      createdBy: req.admin && req.admin.name,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'QF_BLUEPRINT_CREATE', `year=${b.year} type=${b.examType} subject=${b.subject} qtype=${b.questionType} v=${b.version} status=${r.status}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  router.put('/blueprints/:id', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const b = req.body || {};
    const r = qf.updateBlueprint(req.params.id, { ...b, actor: req.admin && req.admin.name });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'QF_BLUEPRINT_UPDATE', `id=${req.params.id} ${JSON.stringify(b).slice(0, 200)}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  // ---- 第八十七~八十九章：Inventory / 预测 ----

  router.get('/inventory', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    res.json({ success: true, data: qf.getInventory({
      track: req.query.track, category: req.query.category,
    }) });
  }));

  // ---- 第八十八章：MIN_INVENTORY ----

  router.get('/rules', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    res.json({ success: true, data: { rules: qf.listRules() } });
  }));

  router.post('/rules', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const b = req.body || {};
    const r = qf.upsertRule({
      track: b.track, category: b.category, questionType: b.questionType,
      difficulty: b.difficulty, minInventory: b.minInventory,
      actor: req.admin && req.admin.name,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'QF_RULE_UPSERT', `track=${b.track} cat=${b.category || ''} type=${b.questionType || ''} diff=${b.difficulty || ''} min=${b.minInventory}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  router.delete('/rules/:id', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const r = qf.deleteRule(req.params.id);
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'QF_RULE_DELETE', `id=${req.params.id}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  // ---- 第九十章：生成队列 ----

  router.post('/scan', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const b = req.body || {};
    const r = qf.scanAndEnqueue({ track: b.track, actor: req.admin && req.admin.name });
    audit(req.admin, 'QF_QUEUE_SCAN', `scanned=${r.scanned} belowMin=${r.belowMin} created=${r.createdCount}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  router.get('/queue', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    res.json({ success: true, data: { queue: qf.listQueue({ status: req.query.status, page: req.query.page, size: req.query.size }) } });
  }));

  // 第九十~九十五章：执行生成（批量；AI_GENERATED_PRACTICE；生成后自动自检进人审，禁止直接发布）
  router.post('/queue/:id/generate', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    qf.processQueueItem(req.params.id, { actor: req.admin && req.admin.name })
      .then((r) => {
        if (!r.ok) return res.status(400).json({ success: false, error: r.error });
        audit(req.admin, 'QF_QUEUE_GENERATE', `id=${req.params.id} generated=${r.generatedCount} discarded=${r.discarded} selfChecked=${r.selfChecked}`, null, null, '', null, null, '', req);
        res.json({ success: true, data: r });
      })
      .catch((e) => res.status(500).json({ success: false, error: e.message }));
  }));

  router.post('/queue/:id/cancel', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const r = qf.cancelQueueItem(req.params.id);
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'QF_QUEUE_CANCEL', `id=${req.params.id}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  // ---- 第九十一章：审核流（AI 不直接发布）----

  router.get('/questions', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    res.json({ success: true, data: qf.listQuestions({
      qfState: req.query.qfState, track: req.query.track, queueId: req.query.queueId,
      page: req.query.page, size: req.query.size,
    }) });
  }));

  router.post('/questions/:id/review', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const b = req.body || {};
    if (!['approve', 'reject'].includes(String(b.action))) {
      return res.status(400).json({ success: false, error: 'action 仅支持 approve/reject' });
    }
    const r = qf.reviewQuestion({
      questionId: req.params.id, action: b.action, reason: b.reason,
      reviewer: req.admin && req.admin.name,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'QF_QUESTION_REVIEW', `id=${req.params.id} ${b.action} reason=${b.reason || ''}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  router.post('/questions/:id/publish', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const r = qf.publishQuestion(req.params.id, req.admin && req.admin.name);
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'QF_QUESTION_PUBLISH', `id=${req.params.id}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  router.post('/questions/:id/unpublish', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const b = req.body || {};
    const r = qf.unpublishQuestion(req.params.id, req.admin && req.admin.name, b.reason);
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'QF_QUESTION_UNPUBLISH', `id=${req.params.id} reason=${b.reason || ''}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  // 第八十三章：存量题来源标记（人工确认；AI 生成路径已强制 AI_GENERATED_PRACTICE）
  router.post('/questions/:id/source-type', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const b = req.body || {};
    const r = qf.markSourceType({ questionId: req.params.id, sourceType: b.sourceType, actor: req.admin && req.admin.name });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'QF_MARK_SOURCE_TYPE', `id=${req.params.id} ${b.sourceType}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  // ---- 第九十二章：去重 ----

  router.get('/dedupe', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    res.json({ success: true, data: qf.dedupeStatus() });
  }));

  router.get('/dedupe/similar', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const threshold = Math.min(Math.max(parseFloat(req.query.threshold) || 0.85, 0.5), 0.99);
    res.json({ success: true, data: qf.findSimilarPairs(threshold) });
  }));

  // ---- 第九十三~九十四章：质量指标 + 坏题复审 ----

  router.post('/quality/refresh', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const b = req.body || {};
    const r = qf.refreshQuestionStats(!!b.full);
    audit(req.admin, 'QF_STATS_REFRESH', `processed=${r.processed} updated=${r.updatedQuestions || 0} full=${!!b.full}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  router.get('/quality', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    res.json({ success: true, data: qf.getQualityMetrics({
      track: req.query.track, onlyReview: req.query.onlyReview === '1',
      page: req.query.page, size: req.query.size,
    }) });
  }));

  router.post('/quality/evaluate', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const r = qf.evaluateQuestionHealth();
    audit(req.admin, 'QF_HEALTH_EVALUATE', `scanned=${r.scanned} flagged=${r.flaggedCount}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  // ---- 举报处理（第九十四章）----

  router.get('/reports', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const db = require('./academyRoutes').getDb();
    const status = req.query.status;
    const rows = status
      ? db.prepare('SELECT * FROM qf_question_reports WHERE status=? ORDER BY id DESC LIMIT 200').all(String(status))
      : db.prepare('SELECT * FROM qf_question_reports ORDER BY id DESC LIMIT 200').all();
    res.json({
      success: true,
      data: {
        reports: rows.map((r) => ({
          id: r.id, userId: r.user_id, questionId: r.question_id, reason: r.reason,
          note: r.note, status: r.status, handledBy: r.handled_by, handledAt: r.handled_at, createdAt: r.created_at,
        })),
      },
    });
  }));

  router.post('/reports/:id/handle', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    const b = req.body || {};
    const r = qf.handleReport(req.params.id, { status: b.status, actor: req.admin && req.admin.name });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'QF_REPORT_HANDLE', `id=${req.params.id} ${b.status}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  // ---- 第九十五章：成本 ----

  router.get('/cost', adminAuth('SUPER_ADMIN', 'content'), guard((req, res) => {
    res.json({ success: true, data: qf.costReport() });
  }));

  return router;
}

module.exports = { createRouter };
