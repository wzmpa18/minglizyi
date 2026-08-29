// ============================================================================
// aiCostCenter.js — AI 成本中心（成本日志 + 后台聚合统计）
// ============================================================================
// 指令：P0-PRODUCTION-SEAL-AND-AI-COST-PHASE1-03 第四十一~四十七章
//
// 原则：
//   - 复用现有 ai_call_logs（academy.db），在其上扩展列，禁止新造第二套 AI 日志系统。
//   - 只记录计量元数据，默认不保存完整 prompt/命理输入/中医私人内容（第四十三章）。
//   - 旧日志缺 model/价格版本时：estimatedCost=null 标记 UNKNOWN，禁止伪造成精确成本（第四十五章）。
//   - 成本告警先做「告警状态」，不自动封真实正常用户（第四十七章）。
// ============================================================================
'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const Database = require('better-sqlite3');

const ACADEMY_DB_PATH = path.join(__dirname, 'data', 'academy.db');

let _db = null;
function getDb() {
  if (_db) return _db;
  const dir = path.dirname(ACADEMY_DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _db = new Database(ACADEMY_DB_PATH);
  _db.pragma('journal_mode = WAL');
  return _db;
}

// ==================== 扩展列（幂等） ====================
// 现有列：id, scene, material_id, kp_id, task_id, tokens_in, tokens_out, created_at
// 新增列（第三十四~四十三章计量元数据）：
const EXTRA_COLUMNS = [
  ['request_id', 'TEXT'],
  ['user_id', 'TEXT'],
  ['feature_key', 'TEXT'],
  ['model', 'TEXT'],
  ['membership_level', 'TEXT'],
  ['partner_id', 'TEXT'],
  ['provider_id', 'TEXT'],
  ['estimated_cost', 'REAL'],
  ['duration_ms', 'INTEGER'],
  ['status', 'TEXT'],
  ['error_code', 'TEXT'],
];

function ensureSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_call_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scene TEXT NOT NULL,
      material_id INTEGER,
      kp_id INTEGER,
      task_id INTEGER,
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_aicall_scene ON ai_call_logs(scene, created_at);
  `);
  const cols = db.prepare("PRAGMA table_info(ai_call_logs)").all().map(c => c.name);
  for (const [name, type] of EXTRA_COLUMNS) {
    if (!cols.includes(name)) {
      db.exec(`ALTER TABLE ai_call_logs ADD COLUMN ${name} ${type}`);
      console.log('[aiCostCenter] 已扩展 ai_call_logs 列:', name);
    }
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_aicall_user ON ai_call_logs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_aicall_model ON ai_call_logs(model, created_at);
    CREATE INDEX IF NOT EXISTS idx_aicall_request ON ai_call_logs(request_id);
  `);
}

/**
 * 写入一条 AI 调用成本日志（禁止写入敏感 prompt 内容）
 * @param {object} r { requestId, userId, featureKey, scene, model, membershipLevel, partnerId, providerId,
 *                     inputTokens, outputTokens, estimatedCost, costSource, durationMs, status, errorCode }
 */
function logAICall(r) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO ai_call_logs
        (request_id, user_id, feature_key, scene, model, membership_level, partner_id, provider_id,
         tokens_in, tokens_out, estimated_cost, duration_ms, status, error_code)
      VALUES
        (@requestId, @userId, @featureKey, @scene, @model, @membershipLevel, @partnerId, @providerId,
         @inputTokens, @outputTokens, @estimatedCost, @durationMs, @status, @errorCode)
    `).run({
      requestId: r.requestId || null,
      userId: r.userId || null,
      featureKey: r.featureKey || null,
      scene: r.scene || 'ai_chat',
      model: r.model || null,
      membershipLevel: r.membershipLevel || null,
      partnerId: r.partnerId || null,
      providerId: r.providerId || null,
      inputTokens: Number(r.inputTokens) || 0,
      outputTokens: Number(r.outputTokens) || 0,
      estimatedCost: typeof r.estimatedCost === 'number' ? r.estimatedCost : null,
      durationMs: Number(r.durationMs) || 0,
      status: r.status || 'unknown',
      errorCode: r.errorCode || null,
    });
    return true;
  } catch (e) {
    // 成本日志失败不阻断 AI 主流程
    console.error('[aiCostCenter] 写入成本日志失败:', e.message);
    return false;
  }
}

// ==================== 后台成本中心路由 ====================

function oneRow(sql, ...args) {
  try { return getDb().prepare(sql).get(...args) || null; } catch (e) { return null; }
}
function allRows(sql, ...args) {
  try { return getDb().prepare(sql).all(...args) || []; } catch (e) { return []; }
}

// 中国时区(UTC+8)当日键
function cnDate(d = new Date()) {
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function subtractDays(dateKey, days) {
  const d = new Date(dateKey + 'T00:00:00+08:00');
  d.setDate(d.getDate() - days);
  return cnDate(d);
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function makeCostRouter(adminAuth) {
  const r = express.Router();
  r.use(adminAuth('ADMIN'));

  // 今日 + 本月总览
  r.get('/summary', (req, res) => {
    const today = cnDate();
    const monthStartTile = today.slice(0, 7) + '-01';
    const todayStats = oneRow(
      `SELECT
         COUNT(*) requests,
         SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) success,
         SUM(CASE WHEN status!='success' THEN 1 ELSE 0 END) fail,
         COALESCE(SUM(tokens_in),0) tokensIn,
         COALESCE(SUM(tokens_out),0) tokensOut,
         COALESCE(SUM(estimated_cost),0) estimatedCost,
         SUM(CASE WHEN estimated_cost IS NULL THEN 1 ELSE 0 END) unknownCost
       FROM ai_call_logs WHERE created_at >= ?`,
      today
    );
    const monthStats = oneRow(
      `SELECT
         COUNT(*) requests,
         SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) success,
         SUM(CASE WHEN status!='success' THEN 1 ELSE 0 END) fail,
         COALESCE(SUM(tokens_in),0) tokensIn,
         COALESCE(SUM(tokens_out),0) tokensOut,
         COALESCE(SUM(estimated_cost),0) estimatedCost
       FROM ai_call_logs WHERE created_at >= ?`,
      monthStartTile
    );
    res.json({ success: true, data: { today: todayStats || {}, month: monthStats || {} } });
  });

  // Top 用户（按估算成本 / 调用次数），仅统计带 user_id 的用户 AI 调用
  r.get('/top-users', (req, res) => {
    const rows = allRows(
      `SELECT user_id, COUNT(*) calls, COALESCE(SUM(tokens_in),0) tin, COALESCE(SUM(tokens_out),0) tout,
              COALESCE(SUM(estimated_cost),0) estCost
       FROM ai_call_logs WHERE user_id IS NOT NULL AND user_id != ''
       GROUP BY user_id ORDER BY estCost DESC, calls DESC LIMIT ?`,
      parseInt(req.query.limit, 10) || 20
    );
    res.json({ success: true, data: rows });
  });

  // 按功能
  r.get('/by-feature', (req, res) => {
    const rows = allRows(
      `SELECT COALESCE(feature_key, scene, 'unknown') feature, COUNT(*) calls,
              COALESCE(SUM(tokens_in),0) tin, COALESCE(SUM(tokens_out),0) tout, COALESCE(SUM(estimated_cost),0) estCost
       FROM ai_call_logs GROUP BY feature ORDER BY calls DESC`
    );
    res.json({ success: true, data: rows });
  });

  // 按模型
  r.get('/by-model', (req, res) => {
    const rows = allRows(
      `SELECT COALESCE(model, 'unknown') model, COUNT(*) calls,
              COALESCE(SUM(tokens_in),0) tin, COALESCE(SUM(tokens_out),0) tout, COALESCE(SUM(estimated_cost),0) estCost
       FROM ai_call_logs GROUP BY model ORDER BY calls DESC`
    );
    res.json({ success: true, data: rows });
  });

  // 按会员档
  r.get('/by-membership', (req, res) => {
    const rows = allRows(
      `SELECT COALESCE(membership_level, 'unknown') level, COUNT(*) calls,
              COALESCE(SUM(tokens_in),0) tin, COALESCE(SUM(tokens_out),0) tout, COALESCE(SUM(estimated_cost),0) estCost
       FROM ai_call_logs GROUP BY membership_level ORDER BY calls DESC`
    );
    res.json({ success: true, data: rows });
  });

  // 成本/异常告警（第四十七章：先做「告警状态」，不自动封真实正常用户）
  // 实时从 ai_call_logs 计算：单用户日成本异常 / 全站日成本异常 / 错误率异常 / 请求频率异常。
  // 阈值可通过后台之后配置，Phase 1 用默认阈值，仅呈现告警状态供人工处置。
  r.get('/alerts', (req, res) => {
    const today = cnDate();
    const alerts = [];
    function push(kind, level, title, detail) {
      alerts.push({ kind, level, title, detail, at: new Date().toISOString() });
    }

    // 1) 全站日成本异常：今日成本 > 近7日（不含今日）日均的 2 倍，且今日成本 > 1 元
    const todayCost = (oneRow(
      `SELECT COALESCE(SUM(estimated_cost),0) c FROM ai_call_logs WHERE created_at >= ?`, today
    ) || {}).c;
    const sevenDayAvg = (oneRow(
      `SELECT COALESCE(AVG(c),0) a FROM (
         SELECT COALESCE(SUM(estimated_cost),0) c FROM ai_call_logs
         WHERE created_at >= ? AND created_at < ? GROUP BY substr(created_at,1,10)
       )`, subtractDays(today, 7), today
    ) || {}).a;
    if (todayCost > 1 && todayCost > 2 * sevenDayAvg) {
      push('site_daily_cost', 'warning', '全站日成本异常飙升', `今日¥${round2(todayCost)} vs 近7日日均¥${round2(sevenDayAvg)}`);
    }

    // 2) 错误率异常：今日失败占比 > 20% 且请求数 >= 20
    const errStats = oneRow(
      `SELECT COUNT(*) total, SUM(CASE WHEN status!='success' THEN 1 ELSE 0 END) fail
       FROM ai_call_logs WHERE created_at >= ?`, today
    ) || {};
    const total = errStats.total || 0;
    const fail = errStats.fail || 0;
    if (total >= 20 && fail / total > 0.2) {
      push('error_rate', 'warning', 'AI 错误率异常', `今日失败${fail}/${total}（${Math.round(fail / total * 100)}%）`);
    }

    // 3) 单用户日成本异常：用户今日估算成本 > 50 元
    const userCostAnomaly = allRows(
      `SELECT user_id, COALESCE(SUM(estimated_cost),0) c FROM ai_call_logs
       WHERE created_at >= ? AND user_id IS NOT NULL AND user_id != ''
       GROUP BY user_id HAVING c > 50 ORDER BY c DESC LIMIT 20`, today
    );
    for (const u of userCostAnomaly) {
      push('user_daily_cost', 'warning', '单用户日成本异常', `user ${u.user_id} 今日成本¥${round2(u.c)}`);
    }

    // 4) 请求频率异常：单用户今日请求数 > 200
    const userFreqAnomaly = allRows(
      `SELECT user_id, COUNT(*) c FROM ai_call_logs
       WHERE created_at >= ? AND user_id IS NOT NULL AND user_id != ''
       GROUP BY user_id HAVING c > 200 ORDER BY c DESC LIMIT 20`, today
    );
    for (const u of userFreqAnomaly) {
      push('user_freq', 'warning', '单用户请求频率异常', `user ${u.user_id} 今日${u.c}次`);
    }

    res.json({ success: true, data: alerts });
  });

  return r;
}

module.exports = { ACADEMY_DB_PATH, getDb, ensureSchema, logAICall, makeCostRouter, cnDate };