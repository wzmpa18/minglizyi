/**
 * Question Factory（题目工厂）— FINAL-MASTER-05 第八十一~九十六章
 *
 * 定位红线（第八十一章）：必须复用现有 academy.db / questions / knowledge_points /
 *   现有 AI 生成（academyRoutes.callAI + gatedQuestionInsert）/ 现有审核体系（qualityGate）。
 *   禁止重建题库，禁止第二套生成引擎。
 *
 * 红线（第八十二章）：冻结医考正式引擎——考试引擎/成绩/证书逻辑零改动。
 *   本引擎只负责内容生产治理：蓝图、库存、缺口、生成队列、去重报告、质量指标、复审。
 *
 * 章节映射：
 *   83  题目来源类型 OFFICIAL/AUTHORIZED/INTERNAL/AI_GENERATED_PRACTICE（questions.source_type 列）
 *   84  AI 题禁止冒充真题——QF 生成路径强制 source_type=AI_GENERATED_PRACTICE
 *   85  Exam Blueprint（qf_blueprints：year/examType/subject/kp/questionType/weight/
 *       difficultyDistribution/officialSource/version/status）
 *   86  官方源不确定 → NEEDS_OFFICIAL_SOURCE（不猜）
 *   87  Question Inventory（按科目/知识点/题型/难度统计库存）
 *   88  MIN_INVENTORY（qf_inventory_rules 可配置最低库存）
 *   89  预测补题（近30天用量/当前库存/活跃用户 → 估算需求）
 *   90  生成队列（qf_generation_queue：库存不足 → 入队）
 *   91  AI 生成不是直接发布（qf_state：DRAFT→SELF_CHECKED→HUMAN_REVIEW→APPROVED→PUBLISHED）
 *   92  去重：Exact=VERIFIED(q_hash1) / Structural=VERIFIED(q_hash2) / Semantic=PARTIAL
 *       （bigram 近似相似度，仅提示不拦截；如实标注，不假装 embedding 已实现）
 *   93  质量指标（qf_question_stats：correctRate/avgDuration/skipRate/reportRate/
 *       discrimination/sampleSize；数据来源=解析 exams.detail，零侵入冻结的考试引擎）
 *   94  坏题自动进入复审（异常 → qf_state=REVIEW_REQUIRED + 临时下架 + anomaly_alerts）
 *   95  生成成本控制（批量生成+审核后复用；ai_call_logs 成本报表；禁止逐题实时生成）
 *   96  后台总控由 questionFactoryRoutes 提供
 *
 * 状态映射（qf_state ↔ 旧 status，旧 status 仍是组卷可见性唯一权威）：
 *   APPROVED / PUBLISHED → status='approved'（组卷可见）
 *   其余（DRAFT/SELF_CHECKED/HUMAN_REVIEW/REVIEW_REQUIRED/REJECTED）→ status='pending'/'rejected'
 */
'use strict';

const academy = require('./academyRoutes');
const QG = require('./qualityGate');

const getDb = academy.getDb;
const callAI = academy.callAI;
const extractJson = academy.extractJson;
const gatedQuestionInsert = academy.gatedQuestionInsert;
const genqSystemFor = academy.genqSystemFor;
const genqLevelText = academy.genqLevelText;

// ==================== 常量（第八十三/八十四章） ====================
const SOURCE_TYPES = ['OFFICIAL', 'AUTHORIZED', 'INTERNAL', 'AI_GENERATED_PRACTICE'];

const QF_STATES = ['DRAFT', 'SELF_CHECKED', 'HUMAN_REVIEW', 'APPROVED', 'PUBLISHED', 'REVIEW_REQUIRED', 'REJECTED'];

// qf_state → 旧 status（status 是组卷可见性唯一权威，qf_state 是生产流程元数据）
const QF_TO_LEGACY_STATUS = {
  DRAFT: 'pending', SELF_CHECKED: 'pending', HUMAN_REVIEW: 'pending',
  APPROVED: 'approved', PUBLISHED: 'approved',
  REVIEW_REQUIRED: 'pending',   // 第九十四章：临时下架（组卷不可见）
  REJECTED: 'rejected',
};

// 旧数据读视图兼容（qf_state 为空的存量题）
const LEGACY_TO_QF_VIEW = {
  approved: 'PUBLISHED',
  pending: 'HUMAN_REVIEW',
  rejected: 'REJECTED',
};

// 第九十三~九十四章：质量指标阈值（后台 loc_configs 可配，qf_health_config）
const HEALTH_DEFAULTS = {
  min_sample: 30,          // 样本量不足不判异常（防小样本误杀）
  correct_rate_low: 0.15,  // 正确率过低（坏题/超纲）
  correct_rate_high: 0.97, // 正确率过高（送分题/泄题）
  skip_rate_high: 0.4,     // 跳过率过高（题干歧义）
  open_reports: 3,         // 未处理举报数（用户实报坏题）
  forecast_buffer: 0.2,    // 第八十九章：需求缓冲系数（近30天用量 × 1.2）
};

// 第八十九章：预测窗口
const FORECAST_DAYS = 30;

// 第九十五章：批量生成上限（单队列任务一次生成的题量；禁止逐题实时调大模型）
const GEN_BATCH_MAX = 20;

// ==================== 建表（全部增量幂等，零破坏） ====================
function ensureQfTables() {
  const d = getDb();
  const ensureColumn = (table, col, ddl) => {
    const cols = d.pragma(`table_info(${table})`).map((c) => c.name);
    if (!cols.includes(col)) d.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  };

  // 第八十三~八十四章：题目来源类型 + 第九十一章：QF 流程状态
  ensureColumn('questions', 'source_type', "source_type TEXT DEFAULT ''");
  ensureColumn('questions', 'qf_state', "qf_state TEXT DEFAULT ''");
  ensureColumn('questions', 'qf_queue_id', 'qf_queue_id INTEGER DEFAULT 0');

  d.exec(`
    CREATE TABLE IF NOT EXISTS qf_blueprints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      exam_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      knowledge_point TEXT DEFAULT '',
      question_type TEXT NOT NULL,
      weight INTEGER DEFAULT 1,
      difficulty_distribution TEXT DEFAULT '{}',
      official_source TEXT DEFAULT '',
      version TEXT NOT NULL,
      status TEXT DEFAULT 'NEEDS_OFFICIAL_SOURCE',
      created_by TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(year, exam_type, subject, knowledge_point, question_type, version)
    );
    CREATE INDEX IF NOT EXISTS idx_qf_bp_status ON qf_blueprints(status, year, exam_type);

    CREATE TABLE IF NOT EXISTS qf_inventory_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track TEXT NOT NULL,
      category TEXT DEFAULT '',
      question_type TEXT DEFAULT '',
      difficulty TEXT DEFAULT '',
      min_inventory INTEGER NOT NULL DEFAULT 20,
      updated_by TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(track, category, question_type, difficulty)
    );

    CREATE TABLE IF NOT EXISTS qf_generation_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track TEXT NOT NULL,
      category TEXT DEFAULT '',
      question_type TEXT DEFAULT '',
      difficulty TEXT DEFAULT '',
      target_count INTEGER NOT NULL,
      reason TEXT NOT NULL DEFAULT 'BELOW_MIN',
      forecast_json TEXT DEFAULT '{}',
      status TEXT DEFAULT 'QUEUED',
      generated_count INTEGER DEFAULT 0,
      batch_no TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      error TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_qf_queue_status ON qf_generation_queue(status, created_at);

    CREATE TABLE IF NOT EXISTS qf_question_stats (
      question_id INTEGER PRIMARY KEY,
      attempts INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      skip_count INTEGER DEFAULT 0,
      avg_duration_ms INTEGER DEFAULT 0,
      report_count INTEGER DEFAULT 0,
      open_report_count INTEGER DEFAULT 0,
      discrimination REAL DEFAULT 0,
      high_group_rate REAL DEFAULT 0,
      low_group_rate REAL DEFAULT 0,
      last_exam_id INTEGER DEFAULT 0,
      refreshed_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS qf_question_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      question_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      note TEXT DEFAULT '',
      status TEXT DEFAULT 'OPEN',
      handled_by TEXT DEFAULT '',
      handled_at TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_qf_reports_q ON qf_question_reports(question_id, status);

    CREATE TABLE IF NOT EXISTS qf_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      event TEXT NOT NULL,
      actor TEXT DEFAULT '',
      detail TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_qf_events ON qf_events(target_type, target_id, created_at);

    CREATE TABLE IF NOT EXISTS qf_stats_cursor (
      key TEXT PRIMARY KEY,
      value INTEGER DEFAULT 0
    );
  `);

  // 第八十六~八十七章：蓝图种子——从已登记的 exam_specs（官方公开大纲，库内已有权威信息）派生，
  // 不联网猜测。未确认来源的科目一律 NEEDS_OFFICIAL_SOURCE。
  try {
    const spec = d.prepare("SELECT * FROM exam_specs WHERE status='active' ORDER BY id DESC LIMIT 1").get();
    if (spec) {
      const types = JSON.parse(spec.question_types || '[]');
      const hasSeed = d.prepare('SELECT id FROM qf_blueprints WHERE version=? LIMIT 1').get(spec.version);
      if (!hasSeed && types.length) {
        const ins = d.prepare(`INSERT OR IGNORE INTO qf_blueprints
          (year, exam_type, subject, knowledge_point, question_type, weight, difficulty_distribution, official_source, version, status, created_by)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
        const year = parseInt(String(spec.effective_date || '').slice(0, 4), 10) || new Date().getFullYear();
        for (const t of types) {
          ins.run(year, spec.exam_category, '全科（按类目细化）', '', String(t.code || t.type || 'single'), 1,
            JSON.stringify(JSON.parse(spec.difficulty_policy || '{}')),
            `${spec.authority || ''}${spec.source_url ? ' | ' + spec.source_url : ''}`,
            spec.version, 'ACTIVE', 'system_seed');
        }
      }
    }
  } catch (e) { console.error('[QF] 蓝图种子登记异常(不阻断):', e.message); }
  return true;
}

function logQfEvent(targetType, targetId, event, actor, detail) {
  try {
    getDb().prepare('INSERT INTO qf_events (target_type, target_id, event, actor, detail) VALUES (?,?,?,?,?)')
      .run(targetType, Number(targetId) || 0, String(event), String(actor || 'system').slice(0, 60), String(detail || '').slice(0, 500));
  } catch (e) { console.error('[QF] 事件留痕失败(不阻断):', e.message); }
}

function getHealthConfig() {
  const d = getDb();
  try {
    const row = d.prepare("SELECT value_json FROM loc_configs WHERE key='qf_health_config'").get();
    if (row) return { ...HEALTH_DEFAULTS, ...JSON.parse(row.value_json) };
  } catch { /* 回退默认 */ }
  return { ...HEALTH_DEFAULTS };
}

function qfStateView(q) {
  if (q && q.qf_state) return q.qf_state;
  return LEGACY_TO_QF_VIEW[q && q.status] || 'DRAFT';
}

// ==================== 第八十五~八十六章：Exam Blueprint ====================
function listBlueprints(params = {}) {
  const d = getDb();
  let sql = 'SELECT * FROM qf_blueprints WHERE 1=1';
  const args = [];
  if (params.status) { sql += ' AND status=?'; args.push(params.status); }
  if (params.year) { sql += ' AND year=?'; args.push(Number(params.year)); }
  if (params.examType) { sql += ' AND exam_type=?'; args.push(String(params.examType)); }
  sql += ' ORDER BY year DESC, exam_type, subject, question_type LIMIT ? OFFSET ?';
  args.push(Math.min(parseInt(params.size, 10) || 50, 200), Math.max(parseInt(params.page, 10) || 0, 0) * 50);
  const rows = d.prepare(sql).all(...args);
  const total = d.prepare('SELECT COUNT(*) n FROM qf_blueprints').get().n;
  return {
    total,
    blueprints: rows.map((r) => ({
      id: r.id, year: r.year, examType: r.exam_type, subject: r.subject,
      knowledgePoint: r.knowledge_point, questionType: r.question_type, weight: r.weight,
      difficultyDistribution: JSON.parse(r.difficulty_distribution || '{}'),
      officialSource: r.official_source, version: r.version, status: r.status,
      createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at,
    })),
  };
}

function createBlueprint(params) {
  const d = getDb();
  const year = parseInt(params.year, 10);
  const examType = String(params.examType || '').trim();
  const subject = String(params.subject || '').trim();
  const questionType = String(params.questionType || '').trim();
  const version = String(params.version || '').trim();
  if (!year || year < 2000 || year > 2100) return { ok: false, error: 'year 非法（2000-2100）' };
  if (!examType || !subject || !questionType) return { ok: false, error: 'examType/subject/questionType 必填' };
  if (!/^[a-z0-9_.-]{2,40}$/i.test(version)) return { ok: false, error: 'version 需 2-40 位字母数字_.-' };

  const officialSource = String(params.officialSource || '').trim();
  // 第八十六章：无法确认官方来源 → NEEDS_OFFICIAL_SOURCE（不猜）
  const status = officialSource ? (params.status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT') : 'NEEDS_OFFICIAL_SOURCE';
  const diff = params.difficultyDistribution;
  if (diff && ![JSON.stringify(diff)].every((s) => { try { JSON.parse(s); return true; } catch { return false; } })) {
    return { ok: false, error: 'difficultyDistribution 必须为 JSON 对象' };
  }
  try {
    const r = d.prepare(`INSERT INTO qf_blueprints (year, exam_type, subject, knowledge_point, question_type, weight,
      difficulty_distribution, official_source, version, status, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
      year, examType.slice(0, 60), subject.slice(0, 80), String(params.knowledgePoint || '').slice(0, 120),
      questionType.slice(0, 20), Math.max(1, parseInt(params.weight, 10) || 1),
      JSON.stringify(diff || { easy: 30, medium: 50, hard: 20 }),
      officialSource.slice(0, 300), version, status, String(params.createdBy || 'admin').slice(0, 60));
    logQfEvent('blueprint', r.lastInsertRowid, 'create', params.createdBy, `status=${status}`);
    return { ok: true, id: Number(r.lastInsertRowid), status };
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return { ok: false, error: '同版本蓝图已存在（year/examType/subject/kp/questionType/version 唯一）' };
    return { ok: false, error: e.message };
  }
}

function updateBlueprint(id, params) {
  const d = getDb();
  const bp = d.prepare('SELECT * FROM qf_blueprints WHERE id=?').get(Number(id));
  if (!bp) return { ok: false, error: '蓝图不存在' };
  const sets = [];
  const args = [];
  const allowed = {
    weight: (v) => Math.max(1, parseInt(v, 10) || 1),
    knowledge_point: (v) => String(v).slice(0, 120),
    official_source: (v) => String(v).slice(0, 300),
    status: (v) => (['DRAFT', 'ACTIVE', 'ARCHIVED', 'NEEDS_OFFICIAL_SOURCE'].includes(v) ? v : null),
    difficulty_distribution: (v) => JSON.stringify(v || {}),
  };
  for (const [k, fn] of Object.entries(allowed)) {
    if (params[k] !== undefined) {
      const v = fn(params[k]);
      if (v === null) return { ok: false, error: `字段 ${k} 值非法` };
      sets.push(`${k}=?`); args.push(v);
    }
  }
  if (!sets.length) return { ok: false, error: '无可更新字段' };
  sets.push("updated_at=datetime('now','localtime')");
  args.push(Number(id));
  d.prepare(`UPDATE qf_blueprints SET ${sets.join(', ')} WHERE id=?`).run(...args);
  logQfEvent('blueprint', id, 'update', params.actor, sets.join(','));
  return { ok: true };
}

// ==================== 第八十七~八十九章：Inventory / MIN / 预测 ====================
// 库存口径：status='approved'（组卷可见），与现有组卷引擎可见性一致
function getInventory(params = {}) {
  const d = getDb();
  let sql = `SELECT track, category, type, difficulty, COUNT(*) n FROM questions
    WHERE status='approved' AND track != ''`;
  const args = [];
  if (params.track) { sql += ' AND track=?'; args.push(String(params.track)); }
  if (params.category) { sql += ' AND category=?'; args.push(String(params.category)); }
  sql += ' GROUP BY track, category, type, difficulty ORDER BY track, category, type, difficulty';
  const rows = d.prepare(sql).all(...args);

  const rules = d.prepare('SELECT * FROM qf_inventory_rules').all();
  const ruleMap = new Map();
  for (const r of rules) {
    ruleMap.set([r.track, r.category || '', r.question_type || '', r.difficulty || ''].join('|'), r);
  }

  const usage = getUsage30d(params.track);
  const usageMap = new Map();
  for (const u of usage) usageMap.set([u.track, u.category || '', u.type, u.difficulty].join('|'), u.n);

  const cfg = getHealthConfig();
  const groups = rows.map((r) => {
    const key = [r.track, r.category || '', r.type, r.difficulty].join('|');
    const rule = ruleMap.get(key) || ruleMap.get([r.track, '', '', ''].join('|'));
    const used30d = usageMap.get(key) || 0;
    const minInv = rule ? rule.min_inventory : 0;
    // 第八十九章：估算需求 = max(近30天用量 × (1+缓冲), 最低库存)
    const forecastDemand = Math.max(Math.ceil(used30d * (1 + cfg.forecast_buffer)), minInv);
    const gap = Math.max(0, forecastDemand - r.n);
    return {
      track: r.track, category: r.category || '', questionType: r.type, difficulty: r.difficulty,
      liveInventory: r.n,
      used30d,
      minInventory: minInv,
      ruleId: rule ? rule.id : 0,
      forecastDemand,
      gap,
      belowMin: minInv > 0 && r.n < minInv,
    };
  });
  return {
    groups,
    totals: {
      groups: groups.length,
      liveQuestions: groups.reduce((s, g) => s + g.liveInventory, 0),
      belowMinGroups: groups.filter((g) => g.belowMin).length,
      forecastGapTotal: groups.reduce((s, g) => s + g.gap, 0),
    },
    forecastWindowDays: FORECAST_DAYS,
    activeUsers30d: countActiveUsers30d(),
  };
}

// 近30天使用量：解析 exams.detail（零侵入冻结的考试引擎，不改其任何逻辑）
function getUsage30d(track) {
  const d = getDb();
  const since = new Date(Date.now() - FORECAST_DAYS * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  const exams = d.prepare(`SELECT id, track, question_ids, detail, submitted_at FROM exams
    WHERE submitted_at IS NOT NULL AND submitted_at >= ? ORDER BY id`).all(since);
  const map = new Map();
  for (const e of exams) {
    let detail = [];
    try { detail = JSON.parse(e.detail || '[]'); } catch { continue; }
    if (!Array.isArray(detail) || !detail.length) continue;
    // 类目从题目行取（exam 不存 category）
    for (const item of detail) {
      const qid = Number(item.questionId);
      if (!qid) continue;
      const key = qid;
      if (!map.has(key)) map.set(key, { examTrack: e.track, n: 0 });
      map.get(key).n++;
    }
  }
  // 聚合到 track/category/type/difficulty
  const out = new Map();
  for (const [qid, u] of map) {
    const q = d.prepare('SELECT track, category, type, difficulty FROM questions WHERE id=?').get(qid);
    if (!q) continue;
    if (track && q.track !== track) continue;
    const k = [q.track, q.category || '', q.type, q.difficulty].join('|');
    if (!out.has(k)) out.set(k, { track: q.track, category: q.category || '', type: q.type, difficulty: q.difficulty, n: 0 });
    out.get(k).n += u.n;
  }
  return [...out.values()];
}

// 第八十九章：活跃用户口径=近30天有提交考试的去重用户（数据来源明确，不猜）
function countActiveUsers30d() {
  const d = getDb();
  const since = new Date(Date.now() - FORECAST_DAYS * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  try {
    return d.prepare(`SELECT COUNT(DISTINCT user_id) n FROM exams WHERE submitted_at IS NOT NULL AND submitted_at >= ?`).get(since).n;
  } catch { return 0; }
}

// ==================== 第八十八章：MIN_INVENTORY 规则 ====================
function listRules() {
  const d = getDb();
  return d.prepare('SELECT * FROM qf_inventory_rules ORDER BY track, category, question_type, difficulty').all()
    .map((r) => ({
      id: r.id, track: r.track, category: r.category || '', questionType: r.question_type || '',
      difficulty: r.difficulty || '', minInventory: r.min_inventory,
      updatedBy: r.updated_by, updatedAt: r.updated_at,
    }));
}

function upsertRule(params) {
  const d = getDb();
  const track = String(params.track || '').trim();
  if (!track) return { ok: false, error: 'track 必填' };
  const category = String(params.category || '').trim();
  const questionType = String(params.questionType || '').trim();
  const difficulty = String(params.difficulty || '').trim();
  const minInventory = parseInt(params.minInventory, 10);
  if (!Number.isFinite(minInventory) || minInventory < 0 || minInventory > 100000) return { ok: false, error: 'minInventory 需 0-100000' };
  d.prepare(`INSERT INTO qf_inventory_rules (track, category, question_type, difficulty, min_inventory, updated_by)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(track, category, question_type, difficulty) DO UPDATE SET
      min_inventory=excluded.min_inventory, updated_by=excluded.updated_by, updated_at=datetime('now','localtime')`)
    .run(track, category, questionType, difficulty, minInventory, String(params.actor || 'admin').slice(0, 60));
  logQfEvent('rule', 0, 'upsert', params.actor, `${track}/${category}/${questionType}/${difficulty} min=${minInventory}`);
  return { ok: true };
}

function deleteRule(id) {
  const d = getDb();
  const r = d.prepare('DELETE FROM qf_inventory_rules WHERE id=?').run(Number(id));
  if (!r.changes) return { ok: false, error: '规则不存在' };
  logQfEvent('rule', id, 'delete', 'admin', '');
  return { ok: true };
}

// ==================== 第九十章：生成队列 ====================
// 扫描缺口 → 入队（幂等：同维度已有 QUEUED/GENERATING 任务不重复建）
function scanAndEnqueue(params = {}) {
  const d = getDb();
  const inv = getInventory(params);
  const targets = inv.groups.filter((g) => g.belowMin || g.gap > 0);
  const created = [];
  for (const g of targets) {
    const exists = d.prepare(`SELECT id FROM qf_generation_queue
      WHERE track=? AND COALESCE(category,'')=? AND COALESCE(question_type,'')=? AND COALESCE(difficulty,'')=?
      AND status IN ('QUEUED','GENERATING') LIMIT 1`)
      .get(g.track, g.category, g.questionType, g.difficulty);
    if (exists) continue;
    const target = Math.max(g.gap, g.minInventory - g.liveInventory, 1);
    const batchNo = 'QF-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const r = d.prepare(`INSERT INTO qf_generation_queue (track, category, question_type, difficulty, target_count, reason, forecast_json, batch_no, created_by)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
      g.track, g.category, g.questionType, g.difficulty,
      Math.min(target, GEN_BATCH_MAX * 5),
      g.belowMin ? 'BELOW_MIN' : 'FORECAST_GAP',
      JSON.stringify({ liveInventory: g.liveInventory, minInventory: g.minInventory, used30d: g.used30d, forecastDemand: g.forecastDemand, gap: g.gap }),
      batchNo, String(params.actor || 'system').slice(0, 60));
    created.push({ id: Number(r.lastInsertRowid), track: g.track, category: g.category, questionType: g.questionType, difficulty: g.difficulty, targetCount: Math.min(target, GEN_BATCH_MAX * 5), reason: g.belowMin ? 'BELOW_MIN' : 'FORECAST_GAP', batchNo });
    logQfEvent('queue', r.lastInsertRowid, 'enqueue', params.actor, `${g.track}/${g.category}/${g.questionType}/${g.difficulty} target=${Math.min(target, GEN_BATCH_MAX * 5)} reason=${g.belowMin ? 'BELOW_MIN' : 'FORECAST_GAP'}`);
  }
  return { ok: true, scanned: inv.groups.length, belowMin: inv.totals.belowMinGroups, created, createdCount: created.length };
}

function listQueue(params = {}) {
  const d = getDb();
  let sql = 'SELECT * FROM qf_generation_queue WHERE 1=1';
  const args = [];
  if (params.status) { sql += ' AND status=?'; args.push(String(params.status)); }
  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  const size = Math.min(parseInt(params.size, 10) || 100, 500);
  args.push(size, Math.max(parseInt(params.page, 10) || 0, 0) * size);
  const rows = d.prepare(sql).all(...args);
  return rows.map((r) => ({
    id: r.id, track: r.track, category: r.category || '', questionType: r.question_type || '',
    difficulty: r.difficulty || '', targetCount: r.target_count, reason: r.reason,
    forecast: JSON.parse(r.forecast_json || '{}'), status: r.status,
    generatedCount: r.generated_count, batchNo: r.batch_no, createdBy: r.created_by,
    error: r.error, createdAt: r.created_at, updatedAt: r.updated_at,
  }));
}

// 第九十~九十五章：执行队列任务——批量生成（复用现有 callAI + gatedQuestionInsert，禁止第二套引擎）
// 生成题强制 source_type=AI_GENERATED_PRACTICE（第八十四章）+ qf_state 流转（第九十一章）
async function processQueueItem(queueId, opts = {}) {
  const d = getDb();
  const q = d.prepare('SELECT * FROM qf_generation_queue WHERE id=?').get(Number(queueId));
  if (!q) return { ok: false, error: '队列任务不存在' };
  if (q.status === 'DONE') return { ok: true, already: true, generatedCount: q.generated_count };
  if (q.status === 'GENERATING') return { ok: false, error: '任务执行中（禁止并发重复执行）' };
  if (q.status === 'CANCELLED') return { ok: false, error: '任务已取消' };

  d.prepare("UPDATE qf_generation_queue SET status='GENERATING', updated_at=datetime('now','localtime') WHERE id=?").run(q.id);
  try {
    // 取该维度下已审核知识点（命题依据，与现有 runGenQuestionsTask 同源逻辑）
    let kps = d.prepare(`SELECT * FROM knowledge_points WHERE status='approved'
      AND (track=? OR material_id IN (SELECT id FROM materials WHERE track=?))
      ${q.category ? 'AND (category=? OR material_id IN (SELECT id FROM materials WHERE category=?))' : ''}
      ORDER BY RANDOM() LIMIT 8`)
      .all(...(q.category ? [q.track, q.track, q.category, q.category] : [q.track, q.track]));
    if (!kps.length) {
      kps = d.prepare(`SELECT * FROM knowledge_points WHERE status='approved' AND track=? ORDER BY RANDOM() LIMIT 8`).all(q.track);
    }
    const material = kps.length
      ? kps.map((k) => `- ${k.title}：${k.content}`).join('\n')
      : `赛道「${q.track}」基础常识`;

    let level = 1;
    if (q.difficulty === 'medium') level = 2;
    if (q.difficulty === 'hard') level = 3;

    const count = Math.min(q.target_count, GEN_BATCH_MAX);
    const content = await callAI(genqSystemFor(q.track), `${genqLevelText(q.track, level)}\n生成 ${count} 道题\n知识点依据：\n${material}`, 'gen_questions', { taskId: null });
    const list = extractJson(content);
    const arr = Array.isArray(list) ? list : [];

    let created = 0, discarded = 0, dupFlagged = 0;
    const createdIds = [];
    for (const item of arr.slice(0, count)) {
      if (!item || !item.stem || !item.type) continue;
      if (!['single', 'multi', 'judge', 'fill', 'qa', 'case'].includes(item.type)) continue;
      const kp = kps[created % Math.max(kps.length, 1)];
      const r = gatedQuestionInsert(d, item, kp, q.track, q.category);
      created += r.created;
      discarded += r.discarded;
      dupFlagged += r.dupFlagged;
      if (r.created) {
        // 找到刚插入的题（按 q_hash1 精确定位）→ 落 QF 元数据
        const h1 = QG.qHash1({ ...item, track: q.track, knowledge_id: kp ? kp.id : null });
        const row = d.prepare('SELECT id FROM questions WHERE q_hash1=? ORDER BY id DESC LIMIT 1').get(h1);
        if (row) {
          createdIds.push(row.id);
          d.prepare("UPDATE questions SET source_type='AI_GENERATED_PRACTICE', qf_state='DRAFT', qf_queue_id=? WHERE id=?")
            .run(q.id, row.id);
          logQfEvent('question', row.id, 'qf_create_draft', 'queue#' + q.id, `AI批量生成入库，qf_state=DRAFT，source_type=AI_GENERATED_PRACTICE`);
        }
      }
    }

    if (created === 0 && discarded === 0) {
      d.prepare("UPDATE qf_generation_queue SET status='QUEUED', error=?, updated_at=datetime('now','localtime') WHERE id=?")
        .run(`本次生成 0 题（AI 返回空/解析失败），保持 QUEUED 可重试`, q.id);
      return { ok: false, error: 'AI 本次未产出可用题目（已保持 QUEUED，可重试）' };
    }

    d.prepare("UPDATE qf_generation_queue SET status='DONE', generated_count=?, error='', updated_at=datetime('now','localtime') WHERE id=?")
      .run(created, q.id);
    logQfEvent('queue', q.id, 'done', opts.actor, `created=${created} discarded=${discarded} dupFlagged=${dupFlagged}`);

    // 第九十一章：生成题自动走 自检 → 待人审（AI 不直接发布）
    let selfChecked = 0;
    for (const qid of createdIds) selfChecked += selfCheckQuestion(qid, opts.actor).ok ? 1 : 0;

    return { ok: true, queueId: q.id, generatedCount: created, discarded, dupFlagged, createdIds, selfChecked };
  } catch (e) {
    d.prepare("UPDATE qf_generation_queue SET status='QUEUED', error=?, updated_at=datetime('now','localtime') WHERE id=?")
      .run(String(e.message).slice(0, 400), q.id);
    return { ok: false, error: e.message };
  }
}

function cancelQueueItem(queueId) {
  const d = getDb();
  const q = d.prepare('SELECT * FROM qf_generation_queue WHERE id=?').get(Number(queueId));
  if (!q) return { ok: false, error: '任务不存在' };
  if (q.status === 'GENERATING') return { ok: false, error: '任务执行中，禁止取消' };
  if (q.status === 'DONE') return { ok: false, error: '任务已完成，不可取消' };
  d.prepare("UPDATE qf_generation_queue SET status='CANCELLED', updated_at=datetime('now','localtime') WHERE id=?").run(q.id);
  logQfEvent('queue', queueId, 'cancel', 'admin', '');
  return { ok: true };
}

// ==================== 第九十一~九十二章：审核流 + 去重 ====================
// 自检：重跑质量闸门评分（复用 QG.gateQuestion），通过 → SELF_CHECKED → 自动进入 HUMAN_REVIEW
function selfCheckQuestion(questionId, actor) {
  const d = getDb();
  const q = d.prepare('SELECT * FROM questions WHERE id=?').get(Number(questionId));
  if (!q) return { ok: false, error: '题目不存在' };
  const state = qfStateView(q);
  if (state !== 'DRAFT') return { ok: false, error: `当前状态 ${state}，仅 DRAFT 可自检` };

  const item = {
    type: q.type, stem: q.stem, options: JSON.parse(q.options || '[]'), answer: q.answer,
    keywords: JSON.parse(q.keywords || '[]'), difficulty: q.difficulty,
    knowledge_id: q.knowledge_id, track: q.track,
    exclude_id: q.id,
  };
  const gate = QG.gateQuestion(d, item);
  if (gate.action !== 'insert') {
    d.prepare("UPDATE questions SET qf_state='REJECTED', status='rejected', reject_reason=? WHERE id=?")
      .run(String(gate.rejectReason || gate.state).slice(0, 200), q.id);
    logQfEvent('question', q.id, 'self_check_reject', actor, `score=${gate.score} state=${gate.state}`);
    return { ok: true, passed: false, score: gate.score, state: 'REJECTED', reason: gate.rejectReason || gate.state };
  }
  // DRAFT → SELF_CHECKED → HUMAN_REVIEW（同事务推进，AI 不直接发布）
  d.prepare("UPDATE questions SET qf_state='HUMAN_REVIEW', status='pending', q_score=?, q_checks=? WHERE id=?")
    .run(gate.score, JSON.stringify(gate.checks), q.id);
  logQfEvent('question', q.id, 'self_check_pass', actor, `score=${gate.score} → HUMAN_REVIEW`);
  return { ok: true, passed: true, score: gate.score, state: 'HUMAN_REVIEW' };
}

// 人工审核（第九十一章：HUMAN_REVIEW → APPROVED/REJECTED；approve 由人工触发，AI 禁止自动放行）
function reviewQuestion(params) {
  const d = getDb();
  const q = d.prepare('SELECT * FROM questions WHERE id=?').get(Number(params.questionId));
  if (!q) return { ok: false, error: '题目不存在' };
  const state = qfStateView(q);
  const approve = String(params.action) === 'approve';
  if (state !== 'HUMAN_REVIEW' && state !== 'REVIEW_REQUIRED') {
    return { ok: false, error: `当前状态 ${state}，仅 HUMAN_REVIEW/REVIEW_REQUIRED 可审核` };
  }
  const newQf = approve ? 'APPROVED' : 'REJECTED';
  d.prepare('UPDATE questions SET qf_state=?, status=?, reviewer=?, review_time=datetime(\'now\',\'localtime\'), reject_reason=? WHERE id=?')
    .run(newQf, QF_TO_LEGACY_STATUS[newQf], String(params.reviewer || 'admin').slice(0, 60),
      approve ? '' : String(params.reason || '人工驳回').slice(0, 200), q.id);
  logQfEvent('question', q.id, approve ? 'approve' : 'reject', params.reviewer, params.reason || '');
  return { ok: true, qfState: newQf };
}

// 发布（APPROVED → PUBLISHED；REVIEW_REQUIRED 修复后可直接发布）
function publishQuestion(questionId, actor) {
  const d = getDb();
  const q = d.prepare('SELECT * FROM questions WHERE id=?').get(Number(questionId));
  if (!q) return { ok: false, error: '题目不存在' };
  const state = qfStateView(q);
  if (state !== 'APPROVED' && state !== 'PUBLISHED') {
    return { ok: false, error: `当前状态 ${state}，需先人工 APPROVED（AI 生成不可直接发布）` };
  }
  d.prepare("UPDATE questions SET qf_state='PUBLISHED', status='approved' WHERE id=?").run(q.id);
  logQfEvent('question', q.id, 'publish', actor, '');
  return { ok: true };
}

// 下架（PUBLISHED → REVIEW_REQUIRED：临时下架，进复审；不物理删除）
function unpublishQuestion(questionId, actor, reason) {
  const d = getDb();
  const q = d.prepare('SELECT * FROM questions WHERE id=?').get(Number(questionId));
  if (!q) return { ok: false, error: '题目不存在' };
  d.prepare("UPDATE questions SET qf_state='REVIEW_REQUIRED', status='pending', reject_reason=? WHERE id=?")
    .run(String(reason || '人工下架进复审').slice(0, 200), q.id);
  logQfEvent('question', q.id, 'unpublish', actor, reason || '');
  return { ok: true };
}

// QF 审核队列列表（按 qf_state 过滤；兼容存量空值）
function listQuestions(params = {}) {
  const d = getDb();
  const state = String(params.qfState || '').trim();
  let sql = 'SELECT * FROM questions WHERE 1=1';
  const args = [];
  if (state === 'PUBLISHED' || state === 'APPROVED') {
    sql += " AND status='approved'";
    if (state === 'APPROVED') sql += " AND qf_state='APPROVED'";
  } else if (state === 'HUMAN_REVIEW') {
    sql += " AND status='pending' AND qf_state IN ('', 'HUMAN_REVIEW')";
  } else if (state) {
    sql += ' AND qf_state=?'; args.push(state);
  } else {
    // 默认视图：QF 生产流相关题目（有 qf_state 标记的 + 待审 pending）
    sql += " AND (qf_state != '' OR status='pending')";
  }
  if (params.track) { sql += ' AND track=?'; args.push(String(params.track)); }
  if (params.queueId) { sql += ' AND qf_queue_id=?'; args.push(Number(params.queueId)); }
  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  const size = Math.min(parseInt(params.size, 10) || 50, 200);
  args.push(size, Math.max(parseInt(params.page, 10) || 0, 0) * size);
  const rows = d.prepare(sql).all(...args);
  return {
    questions: rows.map((r) => ({
      id: r.id, track: r.track, category: r.category || '', type: r.type,
      stem: String(r.stem || '').slice(0, 120), difficulty: r.difficulty,
      status: r.status, qfState: qfStateView(r), sourceType: r.source_type || '',
      qScore: r.q_score || 0, dupTier: r.dup_tier || 0, rejectReason: r.reject_reason || '',
      reviewer: r.reviewer || '', qfQueueId: r.qf_queue_id || 0,
      createdAt: r.created_at,
    })),
    total: rows.length,
  };
}

// 第九十二章：去重能力如实报告（不假装）
function dedupeStatus() {
  const d = getDb();
  const exactDup = d.prepare("SELECT COUNT(*) n FROM questions WHERE dup_tier=1").get().n;
  const structDup = d.prepare("SELECT COUNT(*) n FROM questions WHERE dup_tier=2").get().n;
  return {
    exact: { status: 'VERIFIED', method: 'q_hash1 = sha256(归一化 type+stem+options+answer)，命中自动拒绝' },
    structural: { status: 'VERIFIED', method: 'q_hash2 = sha256(题型+难度+选项数+答案+题干数字抹平模式)，命中进人工重复审核' },
    semantic: {
      status: 'PARTIAL',
      method: 'bigram 字符级 Jaccard 相似度近似（非 embedding）',
      note: 'Embedding 模型能力未接入，未稳定实现——按指令第九十二章如实标注 PARTIAL：仅用于相似题提示与冲突检测，不做入库阻断',
    },
    stats: { exactDupBlocked: exactDup, structuralFlagged: structDup },
  };
}

// 语义近似相似检测（PARTIAL 能力：找出疑似相似题对，供人工参考，不阻断）
function findSimilarPairs(threshold = 0.85, limit = 50) {
  const d = getDb();
  const rows = d.prepare("SELECT id, stem, track, type, difficulty FROM questions WHERE status != 'rejected' ORDER BY id DESC LIMIT 800").all();
  const pairs = [];
  const norm = (s) => String(s || '').replace(/[\s，。；、：！？!?,.;:'"()（）【】《》“”]/g, '');
  const bigram = (s) => {
    const t = norm(s); const set = new Set();
    for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
    return set;
  };
  for (let i = 0; i < rows.length && pairs.length < limit; i++) {
    for (let j = i + 1; j < rows.length && pairs.length < limit; j++) {
      if (rows[i].track !== rows[j].track || rows[i].type !== rows[j].type) continue;
      const A = bigram(rows[i].stem), B = bigram(rows[j].stem);
      if (!A.size || !B.size) continue;
      let inter = 0;
      for (const x of A) if (B.has(x)) inter++;
      const sim = inter / (A.size + B.size - inter);
      if (sim >= threshold) pairs.push({ a: rows[i].id, b: rows[j].id, similarity: Math.round(sim * 100) / 100, track: rows[i].track, type: rows[i].type });
    }
  }
  return { threshold, method: 'bigram-jaccard (PARTIAL 近似，非 embedding)', pairs };
}

// ==================== 第九十三章：质量指标（零侵入解析 exams） ====================
// 增量刷新：qf_stats_cursor 记录已处理的最大 exam.id
function refreshQuestionStats(full = false) {
  const d = getDb();
  const cfg = getHealthConfig();
  const cursorRow = d.prepare("SELECT value FROM qf_stats_cursor WHERE key='exam_id'").get();
  let lastId = full ? 0 : (cursorRow ? cursorRow.value : 0);
  if (full) d.prepare('DELETE FROM qf_question_stats').run();

  const exams = d.prepare('SELECT id, user_id, score, question_ids, detail, submitted_at FROM exams WHERE submitted_at IS NOT NULL AND id > ? ORDER BY id').all(lastId);
  if (!exams.length) return { ok: true, processed: 0, note: '无新增考试记录' };

  // 聚合：题目 → { attempts, correct, skip } + 每题高低分组正确集合
  const agg = new Map();
  for (const e of exams) {
    let detail = [];
    try { detail = JSON.parse(e.detail || '[]'); } catch { continue; }
    if (!Array.isArray(detail) || !detail.length) continue;
    const ids = JSON.parse(e.question_ids || '[]');
    const ratio = ids.length ? e.score / (100) : 0;   // 用户该卷得分率（discrimination 分组依据）
    const group = ratio >= 0.7 ? 'high' : ratio <= 0.4 ? 'low' : 'mid';
    for (const item of detail) {
      const qid = Number(item.questionId);
      if (!qid) continue;
      if (!agg.has(qid)) agg.set(qid, { attempts: 0, correct: 0, skip: 0, high: { n: 0, ok: 0 }, low: { n: 0, ok: 0 }, lastExamId: e.id });
      const a = agg.get(qid);
      a.attempts++;
      const skipped = String(item.myAnswer || '').trim() === '';
      if (skipped) a.skip++;
      if (item.full) a.correct++;
      if (group !== 'mid') {
        a[group].n++;
        if (item.full) a[group].ok++;
      }
      a.lastExamId = Math.max(a.lastExamId, e.id);
    }
    lastId = Math.max(lastId, e.id);
  }

  const upsert = d.prepare(`INSERT INTO qf_question_stats (question_id, attempts, correct_count, skip_count, discrimination, high_group_rate, low_group_rate, last_exam_id, refreshed_at)
    VALUES (?,?,?,?,?,?,?,?,datetime('now','localtime'))
    ON CONFLICT(question_id) DO UPDATE SET
      attempts=attempts+excluded.attempts, correct_count=correct_count+excluded.correct_count,
      skip_count=skip_count+excluded.skip_count,
      discrimination=excluded.discrimination, high_group_rate=excluded.high_group_rate,
      low_group_rate=excluded.low_group_rate, last_exam_id=excluded.last_exam_id,
      refreshed_at=datetime('now','localtime')`);

  let updated = 0;
  const tx = d.transaction(() => {
    for (const [qid, a] of agg) {
      const highRate = a.high.n ? a.high.ok / a.high.n : 0;
      const lowRate = a.low.n ? a.low.ok / a.low.n : 0;
      upsert.run(qid, a.attempts, a.correct, a.skip, Math.round((highRate - lowRate) * 1000) / 1000, highRate, lowRate, a.lastExamId);
      updated++;
    }
    d.prepare(`INSERT INTO qf_stats_cursor (key, value) VALUES ('exam_id', ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(lastId);
  });
  tx();

  // 举报数合并刷新（report_count / open_report_count）
  try {
    d.exec(`UPDATE qf_question_stats SET report_count=(SELECT COUNT(*) FROM qf_question_reports r WHERE r.question_id=qf_question_stats.question_id),
      open_report_count=(SELECT COUNT(*) FROM qf_question_reports r WHERE r.question_id=qf_question_stats.question_id AND r.status='OPEN')`);
  } catch (e) { console.error('[QF] 举报计数合并异常(不阻断):', e.message); }

  return { ok: true, processed: exams.length, updatedQuestions: updated, cursorExamId: lastId };
}

// 质量指标视图（正确率/跳过率/举报率/区分度/样本量；平均时长如实标注未采集）
function getQualityMetrics(params = {}) {
  const d = getDb();
  let sql = `SELECT s.*, q.stem, q.track, q.category, q.type, q.difficulty, q.status, q.qf_state, q.source_type
    FROM qf_question_stats s JOIN questions q ON q.id = s.question_id WHERE s.attempts > 0`;
  const args = [];
  if (params.track) { sql += ' AND q.track=?'; args.push(String(params.track)); }
  if (params.onlyReview) { sql += " AND q.qf_state='REVIEW_REQUIRED'"; }
  sql += ' ORDER BY s.attempts DESC LIMIT ? OFFSET ?';
  const size = Math.min(parseInt(params.size, 10) || 100, 500);
  args.push(size, Math.max(parseInt(params.page, 10) || 0, 0) * size);
  const rows = d.prepare(sql).all(...args);
  return {
    // 平均作答时长：现有考试引擎未采集每题用时（冻结不改）——如实标注，不伪造数据
    avgDuration: { available: false, note: '考试引擎未采集每题作答时长（第八十二章冻结不改），字段预留，值恒为 0' },
    questions: rows.map((r) => ({
      questionId: r.question_id, track: r.track, category: r.category || '', type: r.type,
      difficulty: r.difficulty, stem: String(r.stem || '').slice(0, 80),
      status: r.status, qfState: qfStateView(r), sourceType: r.source_type || '',
      sampleSize: r.attempts,
      correctRate: r.attempts ? Math.round((r.correct_count / r.attempts) * 1000) / 1000 : 0,
      skipRate: r.attempts ? Math.round((r.skip_count / r.attempts) * 1000) / 1000 : 0,
      reportRate: r.attempts ? Math.round((r.report_count / r.attempts) * 1000) / 1000 : 0,
      reportCount: r.report_count, openReportCount: r.open_report_count,
      discrimination: r.discrimination,
      highGroupRate: Math.round(r.high_group_rate * 1000) / 1000,
      lowGroupRate: Math.round(r.low_group_rate * 1000) / 1000,
      avgDurationMs: 0,
      refreshedAt: r.refreshed_at,
    })),
  };
}

// ==================== 第九十四章：坏题自动复审 ====================
function evaluateQuestionHealth(params = {}) {
  const d = getDb();
  const cfg = getHealthConfig();
  refreshQuestionStats(false);
  const rows = d.prepare(`SELECT s.*, q.stem, q.qf_state, q.status FROM qf_question_stats s
    JOIN questions q ON q.id=s.question_id WHERE s.attempts >= ?`).all(cfg.min_sample);
  const flagged = [];
  const tx = d.transaction(() => {
    for (const r of rows) {
      const correctRate = r.attempts ? r.correct_count / r.attempts : 0;
      const skipRate = r.attempts ? r.skip_count / r.attempts : 0;
      const reasons = [];
      if (correctRate < cfg.correct_rate_low) reasons.push(`正确率 ${(correctRate * 100).toFixed(1)}% < ${cfg.correct_rate_low * 100}%`);
      if (correctRate > cfg.correct_rate_high) reasons.push(`正确率 ${(correctRate * 100).toFixed(1)}% > ${cfg.correct_rate_high * 100}%`);
      if (skipRate > cfg.skip_rate_high) reasons.push(`跳过率 ${(skipRate * 100).toFixed(1)}% > ${cfg.skip_rate_high * 100}%`);
      if (r.open_report_count >= cfg.open_reports) reasons.push(`未处理举报 ${r.open_report_count} ≥ ${cfg.open_reports}`);
      if (!reasons.length) continue;

      const state = qfStateView(r);
      // 已在复审中的不重复降级；已发布/正常状态 → 临时下架进复审
      if (state !== 'REVIEW_REQUIRED' && state !== 'REJECTED') {
        d.prepare("UPDATE questions SET qf_state='REVIEW_REQUIRED', status='pending', reject_reason=? WHERE id=?")
          .run('自动复审：' + reasons.join('；').slice(0, 200), r.question_id);
      }
      // 复用 qualityGate 报警表（去重签名防重复插入）
      const sig = 'QF_HEALTH|q#' + r.question_id;
      const open = d.prepare("SELECT id FROM anomaly_alerts WHERE status='open' AND alert_type='qf_question_health' AND detail LIKE ?")
        .get(sig + '%');
      if (!open) {
        d.prepare('INSERT INTO anomaly_alerts (alert_type, severity, detail) VALUES (?,?,?)')
          .run('qf_question_health', 'high', `${sig} 样本${r.attempts} ${reasons.join('；')}（qf_state=REVIEW_REQUIRED，已临时下架）`);
      }
      logQfEvent('question', r.question_id, 'auto_review_required', 'system', reasons.join('；'));
      flagged.push({ questionId: r.question_id, stem: String(r.stem || '').slice(0, 80), reasons, sampleSize: r.attempts, previousState: state });
    }
  });
  tx();
  return { ok: true, scanned: rows.length, flagged, flaggedCount: flagged.length, thresholds: cfg };
}

// ==================== 用户举报（第九十四章数据来源） ====================
function reportQuestion(params) {
  const d = getDb();
  const qid = Number(params.questionId);
  const q = d.prepare('SELECT id FROM questions WHERE id=?').get(qid);
  if (!q) return { ok: false, error: '题目不存在' };
  const reasons = ['错误答案', '题干歧义', '超纲', '重复题', '选项错误', '其他'];
  const reason = String(params.reason || '').trim();
  if (!reasons.includes(reason)) return { ok: false, error: `reason 仅支持：${reasons.join('/')}` };
  // 同用户同题同理由去重（幂等）
  const dup = d.prepare(`SELECT id FROM qf_question_reports WHERE user_id=? AND question_id=? AND reason=? AND status='OPEN' LIMIT 1`)
    .get(String(params.userId), qid, reason);
  if (dup) return { ok: true, already: true, reportId: dup.id };
  const r = d.prepare('INSERT INTO qf_question_reports (user_id, question_id, reason, note) VALUES (?,?,?,?)')
    .run(String(params.userId), qid, reason, String(params.note || '').slice(0, 300));
  logQfEvent('question', qid, 'user_report', 'u' + params.userId, reason);
  return { ok: true, reportId: Number(r.lastInsertRowid) };
}

function handleReport(reportId, params) {
  const d = getDb();
  const rep = d.prepare('SELECT * FROM qf_question_reports WHERE id=?').get(Number(reportId));
  if (!rep) return { ok: false, error: '举报不存在' };
  const status = String(params.status || '').trim();
  if (!['RESOLVED', 'DISMISSED'].includes(status)) return { ok: false, error: 'status 仅支持 RESOLVED/DISMISSED' };
  d.prepare("UPDATE qf_question_reports SET status=?, handled_by=?, handled_at=datetime('now','localtime') WHERE id=?")
    .run(status, String(params.actor || 'admin').slice(0, 60), rep.id);
  logQfEvent('report', rep.id, status.toLowerCase(), params.actor, rep.reason);
  return { ok: true };
}

// ==================== 第九十五章：生成成本报告 ====================
function costReport() {
  const d = getDb();
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  const byScene = d.prepare(`SELECT scene, COUNT(*) calls, COALESCE(SUM(tokens_in),0) tin, COALESCE(SUM(tokens_out),0) tout
    FROM ai_call_logs GROUP BY scene ORDER BY calls DESC`).all();
  const last30 = d.prepare(`SELECT COUNT(*) calls, COALESCE(SUM(tokens_in),0) tin, COALESCE(SUM(tokens_out),0) tout
    FROM ai_call_logs WHERE created_at >= ?`).get(since);
  const qfGen = d.prepare(`SELECT COUNT(*) tasks, COALESCE(SUM(generated_count),0) q FROM qf_generation_queue WHERE status='DONE'`).get();
  const legacyGen = d.prepare(`SELECT COUNT(*) n FROM gen_tasks WHERE status='done'`).get().n;
  // 复用率：每道已发布 AI 题的平均 AI 调用次数（越低越省：批量生成+全员复用）
  const published = d.prepare("SELECT COUNT(*) n FROM questions WHERE source_type='AI_GENERATED_PRACTICE' AND status='approved'").get().n;
  const genCalls = byScene.filter((s) => s.scene === 'gen_questions').reduce((x, s) => x + s.calls, 0);
  return {
    policy: {
      batchGeneration: true,
      reuseAfterReview: true,
      perQuestionRealtimeGeneration: false,
      note: '第九十五章：批量生成 + 人工审核后全员复用；禁止用户每做一题实时调用大模型',
    },
    total: { calls: byScene.reduce((s, x) => s + x.calls, 0), tokensIn: byScene.reduce((s, x) => s + x.tin, 0), tokensOut: byScene.reduce((s, x) => s + x.tout, 0) },
    last30d: last30,
    byScene: byScene.map((s) => ({ scene: s.scene, calls: s.calls, tokensIn: s.tin, tokensOut: s.tout })),
    generation: {
      qfQueueTasks: qfGen.tasks, qfGeneratedQuestions: qfGen.q,
      legacyGenTasks: legacyGen,
      publishedAiQuestions: published,
      aiCallsPerPublishedQuestion: published ? Math.round((genCalls / published) * 100) / 100 : null,
    },
  };
}

// ==================== 概览（第九十六章后台首页数据） ====================
function overview() {
  const d = getDb();
  const inv = getInventory();
  const qPending = d.prepare("SELECT COUNT(*) n FROM questions WHERE status='pending'").get().n;
  const qPublished = d.prepare("SELECT COUNT(*) n FROM questions WHERE status='approved'").get().n;
  const qAi = d.prepare("SELECT COUNT(*) n FROM questions WHERE source_type='AI_GENERATED_PRACTICE'").get().n;
  const qReviewRequired = d.prepare("SELECT COUNT(*) n FROM questions WHERE qf_state='REVIEW_REQUIRED'").get().n;
  const queueQueued = d.prepare("SELECT COUNT(*) n FROM qf_generation_queue WHERE status='QUEUED'").get().n;
  const queueDone = d.prepare("SELECT COUNT(*) n FROM qf_generation_queue WHERE status='DONE'").get().n;
  const openReports = d.prepare("SELECT COUNT(*) n FROM qf_question_reports WHERE status='OPEN'").get().n;
  const blueprints = d.prepare("SELECT COUNT(*) n FROM qf_blueprints").get().n;
  const bpNeedsSource = d.prepare("SELECT COUNT(*) n FROM qf_blueprints WHERE status='NEEDS_OFFICIAL_SOURCE'").get().n;
  return {
    inventory: inv.totals,
    activeUsers30d: inv.activeUsers30d,
    questions: { pending: qPending, published: qPublished, aiGenerated: qAi, reviewRequired: qReviewRequired },
    queue: { queued: queueQueued, done: queueDone },
    reports: { open: openReports },
    blueprints: { total: blueprints, needsOfficialSource: bpNeedsSource },
    sourceTypes: SOURCE_TYPES,
    qfStates: QF_STATES,
  };
}

// ==================== 存量题目来源标记（管理端工具，不猜默认值） ====================
function markSourceType(params) {
  const d = getDb();
  const q = d.prepare('SELECT id, source_type FROM questions WHERE id=?').get(Number(params.questionId));
  if (!q) return { ok: false, error: '题目不存在' };
  const st = String(params.sourceType || '').trim();
  if (!SOURCE_TYPES.includes(st)) return { ok: false, error: `sourceType 仅支持：${SOURCE_TYPES.join('/')}` };
  d.prepare('UPDATE questions SET source_type=? WHERE id=?').run(st, q.id);
  logQfEvent('question', q.id, 'mark_source_type', params.actor, `${q.source_type || '(空)'} → ${st}`);
  return { ok: true };
}

module.exports = {
  SOURCE_TYPES, QF_STATES, QF_TO_LEGACY_STATUS, HEALTH_DEFAULTS, FORECAST_DAYS, GEN_BATCH_MAX,
  ensureQfTables, getHealthConfig, qfStateView,
  listBlueprints, createBlueprint, updateBlueprint,
  getInventory, getUsage30d, countActiveUsers30d,
  listRules, upsertRule, deleteRule,
  scanAndEnqueue, listQueue, processQueueItem, cancelQueueItem,
  selfCheckQuestion, reviewQuestion, publishQuestion, unpublishQuestion, listQuestions,
  dedupeStatus, findSimilarPairs,
  refreshQuestionStats, getQualityMetrics,
  evaluateQuestionHealth, reportQuestion, handleReport,
  costReport, overview, markSourceType,
};
