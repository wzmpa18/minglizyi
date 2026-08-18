/**
 * P6-TCM-02 质量治理层（Quality Gate）v25.0.25
 *
 * 定位：嵌入知识工厂原有 12 步流水线对应节点的治理层，不替换、不重写任何原有步骤。
 * 覆盖指令章节：
 *   二、知识点全链路来源证据链 / 状态机（永久冻结）/ 三级质量闸门 / 冲突检测
 *   三、题库三级去重 / 11 项质量闸门 / 多维关联模型 / 覆盖度引擎
 *   四、来源注册库（1-6 级授权）/ 版权分离原则 / 用户贡献版权声明
 *   七、题库健康度看板指标 / 自动异常报警
 *
 * 架构红线：
 *   - 全部迁移为增量式（ensureColumn / CREATE IF NOT EXISTS），零破坏
 *   - 禁止 AI 自动放行：治理层只分级（淘汰/普通/优先），入库必须人工审核
 *   - 已发布知识点禁止物理删除，只允许 DEPRECATED / SUPERSEDED 状态流转
 */
'use strict';

const crypto = require('crypto');

// ==================== 2.2 知识点状态机（永久冻结） ====================
const KP_STATES = ['DRAFT', 'PROCESSING', 'NEEDS_REVIEW', 'CONFLICT', 'REJECTED', 'APPROVED', 'PUBLISHED', 'DEPRECATED', 'SUPERSEDED'];

// 旧 status 与治理状态映射（旧字段保留兼容，新字段承载完整状态机）
const LEGACY_TO_STATE = { pending: 'NEEDS_REVIEW', approved: 'PUBLISHED', rejected: 'REJECTED' };
// 治理状态回写旧 status（保证组卷/列表等既有逻辑不变）：
//   进入正式可见（PUBLISHED/APPROVED）→ approved；其余一律 pending/rejected 之外不外露
const STATE_TO_LEGACY = {
  DRAFT: 'pending', PROCESSING: 'pending', NEEDS_REVIEW: 'pending', CONFLICT: 'pending',
  REJECTED: 'rejected', APPROVED: 'approved', PUBLISHED: 'approved',
  DEPRECATED: 'rejected', SUPERSEDED: 'rejected',
};

// ==================== 4.1 来源注册库授权等级（永久冻结） ====================
const SOURCE_LEVELS = {
  1: { name: '官方明确授权/公版内容', usage: '可商用、可修改、可公开' },
  2: { name: '开放许可协议资料', usage: '按许可协议范围使用' },
  3: { name: '项目自有原创内容', usage: '全平台可用' },
  4: { name: '用户明确授权上传内容', usage: '按用户授权范围使用' },
  5: { name: 'AI 基于知识点原创生成', usage: '全平台可用' },
  6: { name: '授权状态不明确的第三方内容', usage: '仅待审核区，禁止进入公共题库' },
};

const GOVERNANCE_DEFAULTS = {
  kp_pass_score: 70,        // 知识点 <70 自动淘汰
  kp_priority_score: 90,    // ≥90 优先审核队列
  q_pass_score: 70,         // 题目 <70 自动淘汰
  q_priority_score: 90,     // ≥90 优先审核队列
  conflict_title_sim: 0.85, // 冲突检测：标题相似阈值（后台可配）
  conflict_content_sim: 0.6,// 冲突判定：同题名下内容差异阈值
  kp_question_concentration: 15, // 报警：单知识点题目集中上限
};

function sha256(s) { return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex'); }

// 文本归一化（去空白/标点/大小写）
function normText(s) {
  return String(s || '')
    .replace(/[\s，。；、：！？!?,.;:'"()（）【】\[\]《》“”‘’·—\-…]/g, '')
    .toLowerCase();
}

// 字符 bigram Jaccard 相似度（轻量，无外部依赖）
function bigrams(s) {
  const t = normText(s); const set = new Set();
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
  return set;
}
function jaccard(a, b) {
  const A = bigrams(a), B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

// ==================== 迁移：全部增量、幂等 ====================
function applyQualityGate(d) {
  const ensureColumn = (table, col, ddl) => {
    const cols = d.pragma(`table_info(${table})`).map(c => c.name);
    if (!cols.includes(col)) d.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  };

  // 2.1 知识点全链路来源证据链字段
  ensureColumn('knowledge_points', 'govern_state', "govern_state TEXT DEFAULT ''");
  ensureColumn('knowledge_points', 'version', 'version INTEGER DEFAULT 1');
  ensureColumn('knowledge_points', 'q_score', 'q_score INTEGER DEFAULT 0');
  ensureColumn('knowledge_points', 'q_checks', "q_checks TEXT DEFAULT '[]'");
  ensureColumn('knowledge_points', 'source_author', "source_author TEXT DEFAULT ''");
  ensureColumn('knowledge_points', 'source_location', "source_location TEXT DEFAULT ''");
  ensureColumn('knowledge_points', 'extraction_time', "extraction_time TEXT DEFAULT ''");
  ensureColumn('knowledge_points', 'ai_model', "ai_model TEXT DEFAULT ''");
  ensureColumn('knowledge_points', 'prompt_version', "prompt_version TEXT DEFAULT ''");
  ensureColumn('knowledge_points', 'confidence_score', 'confidence_score REAL DEFAULT 0');
  ensureColumn('knowledge_points', 'reviewer', "reviewer TEXT DEFAULT ''");
  ensureColumn('knowledge_points', 'review_time', "review_time TEXT DEFAULT ''");
  ensureColumn('knowledge_points', 'conflict_group', 'conflict_group INTEGER DEFAULT 0');
  ensureColumn('knowledge_points', 'superseded_by', 'superseded_by INTEGER DEFAULT 0');

  // 3.2/3.3 题目质量与多维关联模型字段
  ensureColumn('questions', 'govern_state', "govern_state TEXT DEFAULT ''");
  ensureColumn('questions', 'version', 'version INTEGER DEFAULT 1');
  ensureColumn('questions', 'q_score', 'q_score INTEGER DEFAULT 0');
  ensureColumn('questions', 'q_checks', "q_checks TEXT DEFAULT '[]'");
  ensureColumn('questions', 'q_tier', "q_tier TEXT DEFAULT ''");
  ensureColumn('questions', 'dup_tier', 'dup_tier INTEGER DEFAULT 0');
  ensureColumn('questions', 'q_hash1', "q_hash1 TEXT DEFAULT ''");
  ensureColumn('questions', 'q_hash2', "q_hash2 TEXT DEFAULT ''");
  ensureColumn('questions', 'source_id', 'source_id INTEGER DEFAULT 0');
  ensureColumn('questions', 'secondary_knowledge_ids', "secondary_knowledge_ids TEXT DEFAULT '[]'");
  ensureColumn('questions', 'chapter', "chapter TEXT DEFAULT ''");
  ensureColumn('questions', 'exam_point_ids', "exam_point_ids TEXT DEFAULT '[]'");
  ensureColumn('questions', 'reviewer', "reviewer TEXT DEFAULT ''");
  ensureColumn('questions', 'review_time', "review_time TEXT DEFAULT ''");

  // 4.1 来源注册库绑定：materials 增加 source_id + 4.3 版权声明记录
  ensureColumn('materials', 'source_id', 'source_id INTEGER DEFAULT 0');
  ensureColumn('materials', 'declaration_json', "declaration_json TEXT DEFAULT ''");

  d.exec(`
    CREATE TABLE IF NOT EXISTS source_registry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      source_type TEXT DEFAULT 'book',
      author TEXT DEFAULT '',
      auth_level INTEGER DEFAULT 6,
      license_note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS kp_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kp_id INTEGER NOT NULL,
      event TEXT NOT NULL,
      actor TEXT DEFAULT '',
      detail TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_kp_events ON kp_events(kp_id, created_at);

    CREATE TABLE IF NOT EXISTS anomaly_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_type TEXT NOT NULL,
      severity TEXT DEFAULT 'high',
      detail TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_open ON anomaly_alerts(status, alert_type);

    CREATE INDEX IF NOT EXISTS idx_q_hash1 ON questions(q_hash1);
    CREATE INDEX IF NOT EXISTS idx_q_hash2 ON questions(q_hash2);
    CREATE INDEX IF NOT EXISTS idx_kp_state ON knowledge_points(govern_state);
    CREATE INDEX IF NOT EXISTS idx_q_dup ON questions(dup_tier, status);
  `);

  // 存量回填：govern_state（幂等，仅补空值行）
  try {
    const rows = d.prepare(`SELECT id, status FROM knowledge_points WHERE govern_state='' OR govern_state IS NULL LIMIT 10000`).all();
    if (rows.length) {
      const up = d.prepare('UPDATE knowledge_points SET govern_state=? WHERE id=?');
      d.transaction(() => { for (const r of rows) up.run(LEGACY_TO_STATE[r.status] || 'NEEDS_REVIEW', r.id); })();
    }
    const qrows = d.prepare(`SELECT id, status FROM questions WHERE govern_state='' OR govern_state IS NULL LIMIT 20000`).all();
    if (qrows.length) {
      const up = d.prepare('UPDATE questions SET govern_state=? WHERE id=?');
      d.transaction(() => { for (const r of qrows) up.run(LEGACY_TO_STATE[r.status] || 'NEEDS_REVIEW', r.id); })();
    }
    // 来源证据链回填：经 kp.material_id 关联资料元数据（老数据补齐追溯字段）
    d.exec(`
      UPDATE knowledge_points SET
        extraction_time = COALESCE(NULLIF(extraction_time,''), created_at),
        ai_model = 'legacy_backfill'
      WHERE extraction_time='' OR extraction_time IS NULL;
      UPDATE knowledge_points SET source_location = 'offset:' || material_id
      WHERE (source_location='' OR source_location IS NULL) AND material_id IS NOT NULL;
      UPDATE questions SET
        source_id = (SELECT source_id FROM knowledge_points k WHERE k.id = questions.knowledge_id)
      WHERE (source_id=0 OR source_id IS NULL) AND knowledge_id IS NOT NULL;
      UPDATE questions SET
        chapter = (SELECT k.chapter FROM knowledge_points k WHERE k.id = questions.knowledge_id)
      WHERE (chapter='' OR chapter IS NULL) AND knowledge_id IS NOT NULL;
    `);
  } catch (e) { console.error('[QualityGate] 存量回填异常(不阻断启动):', e.message); }
}

function getGovernanceConfig(d) {
  try {
    const row = d.prepare(`SELECT value_json FROM loc_configs WHERE key='governance'`).get();
    if (row) return { ...GOVERNANCE_DEFAULTS, ...JSON.parse(row.value_json) };
  } catch { /* 回退默认 */ }
  return { ...GOVERNANCE_DEFAULTS };
}

// ==================== 2.4 知识冲突检测 ====================
// 同（相似）标题 + 不同来源（不同资料）+ 内容差异超阈值 → CONFLICT
function detectKpConflict(d, title, content, excludeMaterialId) {
  const cfg = getGovernanceConfig(d);
  const candidates = d.prepare(`
    SELECT id, title, content, material_id, conflict_group FROM knowledge_points
    WHERE status != 'rejected' AND material_id != ? AND title LIKE ?
    LIMIT 50`).all(excludeMaterialId || 0, `%${String(title).slice(0, 8)}%`);
  for (const c of candidates) {
    const titleSim = jaccard(title, c.title);
    if (titleSim < cfg.conflict_title_sim) continue;
    const contentSim = jaccard(content, c.content);
    if (contentSim < cfg.conflict_content_sim) {
      return { conflictWith: c.id, group: c.conflict_group || 0, titleSim, contentSim };
    }
  }
  return null;
}

function nextConflictGroup(d) {
  const r = d.prepare('SELECT COALESCE(MAX(conflict_group),0)+1 AS g FROM knowledge_points').get();
  return r.g;
}

// ==================== 2.3 知识点三级质量闸门 ====================
// 返回 { action: 'discard'|'review', state, score, checks, tier, conflict }
function gateKnowledgePoint(d, kp) {
  const cfg = getGovernanceConfig(d);
  const checks = [];
  const add = (name, ok, weight, note) => checks.push({ name, pass: !!ok, weight, note: note || '' });

  const title = String(kp.title || '').trim();
  const content = String(kp.content || '').trim();

  add('标题完整性', title.length >= 4 && title.length <= 60, 15, `标题${title.length}字`);
  add('内容充分性', content.length >= 20, 15, `正文${content.length}字`);
  add('来源绑定', !!kp.material_id || !!kp.source_id, 20, kp.material_id ? `material#${kp.material_id}` : '');
  add('原文快照', String(kp.source_text || '').trim().length > 0, 10);
  add('AI置信度', Number(kp.confidence_score || 0) >= 0.6, 10, `conf=${kp.confidence_score || 0}`);
  add('指纹唯一', !kp._hashDup, 15);
  add('章节归属', String(kp.chapter || '').trim().length > 0, 5);

  let score = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);

  // 冲突检测独立于评分：命中即强制 CONFLICT 进人工裁定
  let conflict = null;
  if (score >= cfg.kp_pass_score && kp.material_id) {
    conflict = detectKpConflict(d, title, content, kp.material_id);
  }
  if (conflict) {
    return { action: 'review', state: 'CONFLICT', score, checks, tier: 'normal', conflict };
  }
  if (score < cfg.kp_pass_score) return { action: 'discard', state: 'REJECTED', score, checks, tier: 'normal', conflict: null };
  return {
    action: 'review', state: 'NEEDS_REVIEW', score, checks,
    tier: score >= cfg.kp_priority_score ? 'priority' : 'normal', conflict: null,
  };
}

// ==================== 3.1 题库三级去重 ====================
// L1 完全重复：题干+选项+答案+题型 归一化精确 Hash → 自动拒绝
// L2 结构重复：题型+难度+选项数+答案+题干模式（去数字/空格）→ 进人工重复审核
// L3 语义判定：同知识点不同考法/难度/题型 → 正常保留（不拦截）
function qHash1(q) {
  return sha256('q1:' + normText([q.type, q.stem, (q.options || []).join('|'), q.answer].join('#')));
}
function qHash2(q) {
  const stemPattern = String(q.stem || '').replace(/[0-9０-９一二三四五六七八九十]+/g, 'N').replace(/\s+/g, '');
  return sha256('q2:' + normText([q.type, q.difficulty, (q.options || []).length, q.answer, stemPattern].join('#')));
}

function checkQuestionDuplicate(d, q) {
  const h1 = qHash1(q);
  if (d.prepare('SELECT id FROM questions WHERE q_hash1=? LIMIT 1').get(h1)) {
    return { tier: 1, h1, h2: qHash2(q), dupOf: 'exact' };
  }
  const h2 = qHash2(q);
  const sim = d.prepare('SELECT id, knowledge_id, stem FROM questions WHERE q_hash2=? LIMIT 1').get(h2);
  if (sim) return { tier: 2, h1, h2, dupOf: sim.id, simStem: sim.stem };
  return { tier: 0, h1, h2, dupOf: 0 };
}

// ==================== 3.2 题目 11 项质量闸门 ====================
// P7-TCM-EXAM-01：医考轨道（yikao）范围污染检测——命中即 EXAM_SCOPE_REJECTED，
// 不允许"改名重新入库"（reject_reason 留审计，回滚需人工）
const EXAM_SCOPE_PATTERN = /倪海厦|陈士铎|汉唐中医|人纪|天纪|讲义|课程目录|课程讲解|学生笔记|听课笔记|随堂|第[一二三四五六七八九十百\d]+页|页码|整理时间|内部方剂|方剂编号|民间经验方|秘方|祖传|包治|彻底根治|根治百病|疗效显著/;

function gateQuestion(d, q) {
  const cfg = getGovernanceConfig(d);
  const checks = [];
  const add = (name, ok, weight, note) => checks.push({ name, pass: !!ok, weight, note: note || '' });
  const isYikao = String(q.track || '') === 'yikao';

  const stem = String(q.stem || '').trim();
  const answer = String(q.answer ?? '').trim();
  const options = Array.isArray(q.options) ? q.options : [];
  const type = String(q.type || '');
  // P8-5a：答案兼容字母（A-F，国家医考五选项口径）与数字索引（历史数据）
  const ansIdx = (v) => {
    const s = String(v ?? '').trim().toUpperCase();
    if (/^[A-F]$/.test(s)) return s.charCodeAt(0) - 65;
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    return -1;
  };
  const inRange = (v) => { const i = ansIdx(v); return i >= 0 && i <= 5; };
  const validAnswer = type === 'single' ? inRange(answer)
    : type === 'multi' ? answer.length > 0 && answer.split(',').every((x) => inRange(x))
    : type === 'judge' ? ['对', '错'].includes(answer)
    : ['fill', 'qa', 'case'].includes(type) ? answer.length > 0 : false;

  // P7-TCM-EXAM-01 3.3：医考题选项数/答案格式由当前生效 exam_spec_version 配置，不硬编码
  let yikaoSpec = null;
  if (isYikao) {
    try {
      const row = d.prepare("SELECT * FROM exam_specs WHERE status='active' ORDER BY id DESC LIMIT 1").get();
      if (row) yikaoSpec = { version: row.version, questionTypes: JSON.parse(row.question_types || '[]'), difficultyPolicy: JSON.parse(row.difficulty_policy || '{}') };
    } catch (e) { /* exam_specs 未就绪时走默认五选项口径 */ }
  }
  const specSingle = yikaoSpec && yikaoSpec.questionTypes.find((t) => t.code === 'A1' || /single/i.test(String(t.code || '')));
  const yikaoOptCount = specSingle ? Number(specSingle.options) || 5 : 5;
  const specLetterFmt = !specSingle || specSingle.answerFormat !== 'index';
  // 1 题干完整性
  add('题干完整性', stem.length >= 10, 10, `${stem.length}字`);
  // 2 答案一致性
  add('答案一致性', validAnswer, 12, `type=${type}`);
  // 3 选项唯一性（常规题 4-5 项；医考题按 exam_spec 当前规范，默认 5 项）
  const optOk = (type === 'single' || type === 'multi')
    ? (isYikao
        ? options.length === yikaoOptCount && new Set(options.map(normText)).size === options.length
        : options.length >= 4 && options.length <= 5 && new Set(options.map(normText)).size === options.length)
    : true;
  add('选项唯一性', optOk, 10, `${options.length}项${isYikao ? `/规范${yikaoOptCount}项` : ''}`);
  // 4 答案可验证性
  const verifiable = (type === 'single' || type === 'multi')
    ? answer.split(',').every(inRange)
    : ['judge', 'fill'].includes(type) ? answer.length > 0
    : Array.isArray(q.keywords) && q.keywords.length > 0;
  add('答案可验证性', verifiable, 10);
  // 5 主知识点绑定
  add('主知识点绑定', !!q.knowledge_id, 10);
  // 6 考点关联（主知识点存在且已审核）
  const kp = q.knowledge_id ? d.prepare('SELECT id, status FROM knowledge_points WHERE id=?').get(q.knowledge_id) : null;
  add('考点关联', !!(kp && kp.status === 'approved'), 8, kp ? `kp#${kp.id}` : '未绑定');
  // 7 题型规范
  add('题型规范', ['single', 'multi', 'judge', 'fill', 'qa', 'case'].includes(type), 10);
  // 8 难度分级
  add('难度分级', ['easy', 'medium', 'hard'].includes(String(q.difficulty || '')), 5);
  // 9 重复度检测（三级去重）
  const dup = checkQuestionDuplicate(d, q);
  add('重复度检测', dup.tier === 0, 10, dup.tier === 1 ? 'L1完全重复' : dup.tier === 2 ? `L2结构相似#${dup.dupOf}` : '');
  // 10 来源溯源（经知识点→资料链路可追溯）
  const src = q.knowledge_id
    ? d.prepare('SELECT m.id FROM knowledge_points k JOIN materials m ON m.id=k.material_id WHERE k.id=?').get(q.knowledge_id)
    : null;
  add('来源溯源', !!src, 10);
  // 11 合规性检测（姓名版权分离：姓名合法保留；拦截整段未授权原文复刻特征）
  const body = stem + (options.join('') || '');
  const complianceOk = body.length < 900 && !/(郑重声明|版权所有.{0,6}禁止|本书目录|内容提要[:：])/.test(body);
  add('合规性检测', complianceOk, 5);
  // 12 医考答案格式规范（P7-TCM-EXAM-01 3.3：新题必须按当前规范统一格式，字母口径）
  const yikaoFmtOk = !isYikao || !specLetterFmt || !['single', 'multi'].includes(type)
    || (/^[A-E](,[A-E])*$/.test(answer.toUpperCase()));
  add('医考答案格式', yikaoFmtOk, 12, isYikao ? (yikaoSpec ? `v=${yikaoSpec.version}` : '默认字母口径') : '非医考');
  // 13 医考范围污染（P7-TCM-EXAM-01 1.3：人名/流派/课程/页码/内部编号，阻断性）
  const scopeHit = isYikao ? EXAM_SCOPE_PATTERN.test(body) : false;
  add('医考范围污染', !scopeHit, 0, scopeHit ? 'EXAM_SCOPE_REJECTED' : '无污染');

  const score = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);

  // 医考范围污染：无条件 EXAM_SCOPE_REJECTED（0 权重不计分，纯阻断；留审计标记供人工核查回滚）
  if (scopeHit) {
    return { action: 'discard', state: 'EXAM_SCOPE_REJECTED', score: Math.min(score, 60), checks, tier: 'rejected-scope', dup, rejectReason: 'EXAM_SCOPE_REJECTED' };
  }
  // L1 完全重复：无条件自动拒绝（即使其余项满分）
  if (dup.tier === 1) {
    return { action: 'discard', state: 'REJECTED', score: Math.min(score, 60), checks, tier: 'normal', dup };
  }
  if (score < cfg.q_pass_score) {
    return { action: 'discard', state: 'REJECTED', score, checks, tier: 'normal', dup, rejectReason: 'QUALITY_REJECTED' };
  }
  return {
    action: 'insert', state: 'NEEDS_REVIEW', score, checks,
    tier: score >= cfg.q_priority_score ? 'priority' : 'normal', dup,
  };
}

// ==================== 2.2 状态流转（带版本与事件留痕） ====================
function logKpEvent(d, kpId, event, actor, detail) {
  d.prepare('INSERT INTO kp_events (kp_id, event, actor, detail) VALUES (?,?,?,?)')
    .run(kpId, event, actor || 'system', String(detail || '').slice(0, 500));
}

// 审核动作同步：旧 status + 治理状态 + 审核留痕
function applyReview(d, table, id, approve, reviewer) {
  const legacy = approve ? 'approved' : 'rejected';
  const state = approve ? 'PUBLISHED' : 'REJECTED';
  const col = table === 'knowledge_points' ? 'kp_id' : 'q_id';
  d.prepare(`UPDATE ${table} SET status=?, govern_state=?, reviewer=?, review_time=datetime('now','localtime') WHERE id=?`)
    .run(legacy, state, reviewer || 'admin', id);
  if (table === 'knowledge_points') logKpEvent(d, id, approve ? 'publish' : 'reject', reviewer, '人工审核');
  return { legacy, state, col };
}

// 废弃：保留原版本，不再对外可见，禁止物理删除（2.2 红线）
function deprecateKp(d, kpId, actor, reason) {
  const kp = d.prepare('SELECT * FROM knowledge_points WHERE id=?').get(kpId);
  if (!kp) throw new Error('知识点不存在');
  d.prepare(`UPDATE knowledge_points SET status='rejected', govern_state='DEPRECATED' WHERE id=?`).run(kpId);
  logKpEvent(d, kpId, 'deprecate', actor, reason || '');
  return kp;
}

// 新版本替代：原版本标 SUPERSEDED（留 superseded_by），新版本作为 v+1 进入审核
function supersedeKp(d, kpId, patch, actor) {
  const kp = d.prepare('SELECT * FROM knowledge_points WHERE id=?').get(kpId);
  if (!kp) throw new Error('知识点不存在');
  const newVersion = (kp.version || 1) + 1;
  const insert = d.prepare(`
    INSERT INTO knowledge_points (material_id, chapter, title, content, tags, difficulty, status, source_text,
      track, category, content_hash, govern_state, version, source_author, source_location, ai_model, prompt_version)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const r = insert.run(kp.material_id, kp.chapter,
    String(patch.title || kp.title).slice(0, 60), String(patch.content || kp.content).slice(0, 800),
    kp.tags, kp.difficulty, 'pending', kp.source_text, kp.track, kp.category, kp.content_hash,
    'NEEDS_REVIEW', newVersion, kp.source_author, kp.source_location, 'human_patch', 'v25.0.25');
  d.prepare(`UPDATE knowledge_points SET status='rejected', govern_state='SUPERSEDED', superseded_by=? WHERE id=?`)
    .run(r.lastInsertRowid, kpId);
  logKpEvent(d, kpId, 'supersede', actor, `被 v${newVersion}(#${r.lastInsertRowid}) 替代`);
  logKpEvent(d, r.lastInsertRowid, 'create_as_new_version', actor, `替代 #${kpId} v${kp.version || 1}`);
  return { newId: r.lastInsertRowid, version: newVersion };
}

// 冲突裁定：指定权威版本过审，其余版本保留并标记（历史版本永久留存）
function resolveConflict(d, groupId, keepKpId, actor, note) {
  const members = d.prepare(`SELECT id FROM knowledge_points WHERE conflict_group=? AND id != ?`).all(groupId, keepKpId);
  d.prepare(`UPDATE knowledge_points SET status='approved', govern_state='PUBLISHED', conflict_group=0,
    reviewer=?, review_time=datetime('now','localtime') WHERE id=?`).run(actor || 'admin', keepKpId);
  const mark = d.prepare(`UPDATE knowledge_points SET govern_state='REJECTED', status='rejected' WHERE id=?`);
  d.transaction(() => { for (const m of members) { mark.run(m.id); logKpEvent(d, m.id, 'conflict_lose', actor, `组#${groupId}裁定保留#${keepKpId}`); } })();
  logKpEvent(d, keepKpId, 'conflict_win', actor, `组#${groupId} 权威版本 ${note || ''}`);
  return { keep: keepKpId, dismissed: members.map(m => m.id) };
}

// ==================== 2.1 来源证据链反查 ====================
function traceKnowledge(d, kpId) {
  const kp = d.prepare('SELECT * FROM knowledge_points WHERE id=?').get(kpId);
  if (!kp) return null;
  const material = kp.material_id ? d.prepare('SELECT * FROM materials WHERE id=?').get(kp.material_id) : null;
  const source = material && material.source_id ? d.prepare('SELECT * FROM source_registry WHERE id=?').get(material.source_id) : null;
  const events = d.prepare('SELECT * FROM kp_events WHERE kp_id=? ORDER BY id DESC LIMIT 50').all(kpId);
  const versions = d.prepare('SELECT id, version, govern_state, created_at FROM knowledge_points WHERE material_id=? AND title=? ORDER BY version')
    .all(kp.material_id || 0, kp.title);
  const aiCalls = d.prepare('SELECT scene, tokens_in, tokens_out, created_at FROM ai_call_logs WHERE kp_id=? OR material_id=? ORDER BY id DESC LIMIT 20')
    .all(kpId, kp.material_id || 0);
  return {
    knowledge: {
      id: kp.id, title: kp.title, version: kp.version || 1, state: kp.govern_state,
      score: kp.q_score, checks: safeJson(kp.q_checks), conflict_group: kp.conflict_group,
      superseded_by: kp.superseded_by || 0,
    },
    source: {
      material_id: kp.material_id, material_title: material ? material.title : '',
      source_id: source ? source.id : (material ? material.source_id : 0),
      source_type: source ? source.source_type : '',
      source_title: source ? source.name : (material ? material.title : ''),
      source_author: kp.source_author || (source ? source.author : ''),
      auth_level: source ? source.auth_level : 0,
      source_location: kp.source_location, source_text: kp.source_text,
      track: kp.track, category: kp.category,
    },
    generation: {
      extraction_time: kp.extraction_time || kp.created_at, ai_model: kp.ai_model,
      prompt_version: kp.prompt_version, confidence_score: kp.confidence_score,
      ai_calls: aiCalls,
    },
    review: {
      status: kp.status, state: kp.govern_state, reviewer: kp.reviewer, review_time: kp.review_time,
      events,
    },
    versions,
  };
}

function safeJson(s) { try { return JSON.parse(s || '[]'); } catch { return []; } }

// ==================== 3.4 覆盖度引擎（真实计算，禁止写死） ====================
function computeCoverage(d, track, category) {
  const filter = `
    FROM knowledge_points k WHERE k.status='approved'
    AND (k.track=? OR k.material_id IN (SELECT id FROM materials WHERE track=?))
    ${category ? 'AND (k.category=? OR k.material_id IN (SELECT id FROM materials WHERE category=?))' : ''}`;
  const args = category ? [track, track, category, category] : [track, track];

  const kpTotal = d.prepare(`SELECT COUNT(*) n ${filter}`).get(...args).n;
  const kpCovered = d.prepare(`
    SELECT COUNT(DISTINCT k.id) n ${filter}
    AND k.id IN (SELECT knowledge_id FROM questions WHERE status!='rejected' AND knowledge_id IS NOT NULL)`).get(...args).n;

  // 考点维度：章节即核心考点
  const chapters = d.prepare(`SELECT DISTINCT k.chapter ch ${filter} AND k.chapter!=''`).all(...args).map(r => r.ch);
  const coveredChapters = chapters.filter(ch => d.prepare(`
    SELECT COUNT(*) n FROM knowledge_points k JOIN questions q ON q.knowledge_id=k.id
    WHERE k.status='approved' AND k.chapter=? AND q.status!='rejected'`).get(ch).n > 0);
  const uncovered = d.prepare(`
    SELECT k.id, k.title, k.chapter ${filter}
    AND k.id NOT IN (SELECT knowledge_id FROM questions WHERE status!='rejected' AND knowledge_id IS NOT NULL)
    ORDER BY k.id LIMIT 100`).all(...args);

  const rate = kpTotal ? Math.round((kpCovered / kpTotal) * 100) : 0;
  const display = rate >= 100 ? '已覆盖全部核心知识点与考点'
    : rate >= 70 ? '已覆盖主要核心知识点'
    : '核心知识点持续完善中';

  return {
    track, category: category || '',
    kp_total: kpTotal, kp_covered: kpCovered, kp_uncovered: kpTotal - kpCovered,
    coverage_rate: rate, display_text: display,
    exam_points_total: chapters.length, exam_points_covered: coveredChapters.length,
    uncovered_list: uncovered,
  };
}

// ==================== 7.1 题库健康度看板 ====================
function collectHealth(d) {
  const q = (sql) => d.prepare(sql).get();
  const kpConflict = q(`SELECT COUNT(*) n FROM knowledge_points WHERE govern_state='CONFLICT'`).n;
  const kpNoSource = q(`SELECT COUNT(*) n FROM knowledge_points WHERE material_id IS NULL OR material_id=0`).n;
  const qPending = q(`SELECT COUNT(*) n FROM questions WHERE status='pending'`).n;
  const qDup = q(`SELECT COUNT(*) n FROM questions WHERE dup_tier=2`).n;
  const qHigh = q(`SELECT COUNT(*) n FROM questions WHERE q_score>=90 AND status!='rejected'`).n;
  const qLegacyNoScore = q(`SELECT COUNT(*) n FROM questions WHERE q_score=0 AND status!='rejected'`).n;
  const qNoKp = q(`SELECT COUNT(*) n FROM questions WHERE knowledge_id IS NULL OR knowledge_id=0`).n;

  const byCategory = d.prepare(`
    SELECT k.category cat, COUNT(DISTINCT k.id) kp_total,
      COUNT(DISTINCT CASE WHEN q.id IS NOT NULL THEN k.id END) kp_covered
    FROM knowledge_points k
    LEFT JOIN questions q ON q.knowledge_id=k.id AND q.status!='rejected'
    WHERE k.status='approved'
    GROUP BY k.category`).all();

  const ai = q(`SELECT COUNT(*) calls, COALESCE(SUM(tokens_in),0) tin, COALESCE(SUM(tokens_out),0) tout FROM ai_call_logs`);
  const genDone = q(`SELECT COUNT(*) n FROM gen_tasks WHERE status='done'`).n;
  const genFail = q(`SELECT COUNT(*) n FROM gen_tasks WHERE status='failed'`).n;
  const dedupSaved = q(`SELECT COUNT(*) n FROM knowledge_points WHERE id IN (SELECT kp_id FROM kp_events WHERE event='hash_dedup_reuse')`).n;

  return {
    knowledge: {
      kp_total: q(`SELECT COUNT(*) n FROM knowledge_points`).n,
      kp_approved: q(`SELECT COUNT(*) n FROM knowledge_points WHERE status='approved'`).n,
      kp_uncovered: q(`SELECT COUNT(*) n FROM knowledge_points k WHERE k.status='approved' AND k.id NOT IN (SELECT knowledge_id FROM questions WHERE status!='rejected' AND knowledge_id IS NOT NULL)`).n,
      kp_conflict: kpConflict, kp_no_source: kpNoSource,
    },
    question: {
      q_total: q(`SELECT COUNT(*) n FROM questions`).n,
      q_pending: qPending, q_dup: qDup, q_high_quality: qHigh,
      q_no_score_legacy: qLegacyNoScore, q_no_kp: qNoKp,
    },
    coverage: byCategory.map(r => ({
      category: r.cat || '未分类',
      kp_total: r.kp_total, kp_covered: r.kp_covered,
      coverage_rate: r.kp_total ? Math.round((r.kp_covered / r.kp_total) * 100) : 0,
    })),
    cost: {
      ai_calls: ai.calls, tokens_in: ai.tin, tokens_out: ai.tout,
      gen_done: genDone, gen_failed: genFail,
      dedup_saved_kp: dedupSaved,
    },
  };
}

// ==================== 7.2 自动异常报警 ====================
function scanAnomalies(d) {
  const cfg = getGovernanceConfig(d);
  const alerts = [];
  const push = (alert_type, severity, detail) => {
    const sig = sha256(alert_type + '|' + String(detail).slice(0, 80));
    const open = d.prepare(`SELECT id FROM anomaly_alerts WHERE status='open' AND alert_type=? AND substr(detail,1,80)=substr(?,1,80)`)
      .get(alert_type, String(detail));
    if (open) return;
    d.prepare('INSERT INTO anomaly_alerts (alert_type, severity, detail) VALUES (?,?,?)').run(alert_type, severity, String(detail).slice(0, 400));
    alerts.push({ alert_type, severity, detail });
  };

  // 1 同知识点题目异常集中
  const conc = d.prepare(`SELECT knowledge_id, COUNT(*) n FROM questions WHERE status!='rejected' AND knowledge_id IS NOT NULL GROUP BY knowledge_id HAVING n > ? ORDER BY n DESC LIMIT 10`)
    .all(cfg.kp_question_concentration);
  if (conc.length) push('kp_question_concentration', 'high', `知识点#${conc[0].knowledge_id} 集中 ${conc[0].n} 题（阈值 ${cfg.kp_question_concentration}），共 ${conc.length} 个知识点超限`);

  // 2 重复率异常升高
  const dupRate = d.prepare(`SELECT COUNT(*) n FROM questions WHERE dup_tier=2`).get().n;
  const qTotal = d.prepare(`SELECT COUNT(*) n FROM questions`).get().n;
  if (qTotal > 100 && dupRate / qTotal > 0.2) push('dup_rate_spike', 'high', `结构重复题 ${dupRate}/${qTotal}（${Math.round(dupRate / qTotal * 100)}%）超 20%`);

  // 3 无来源知识点
  const noSrc = d.prepare(`SELECT COUNT(*) n FROM knowledge_points WHERE material_id IS NULL OR material_id=0`).get().n;
  if (noSrc > 50) push('sourceless_kp', 'high', `无来源知识点 ${noSrc} 个`);

  // 4 冲突激增
  const conflict = d.prepare(`SELECT COUNT(*) n FROM knowledge_points WHERE govern_state='CONFLICT'`).get().n;
  if (conflict > 20) push('conflict_spike', 'high', `待裁定冲突知识点 ${conflict} 个`);

  // 5 无绑定/不可验证题目
  const noKp = d.prepare(`SELECT COUNT(*) n FROM questions WHERE (knowledge_id IS NULL OR knowledge_id=0) AND status!='rejected'`).get().n;
  if (noKp > 20) push('unbound_questions', 'high', `无知识点绑定题目 ${noKp} 道`);

  // 6 核心考点长期无覆盖
  const uncovChapters = d.prepare(`
    SELECT k.chapter ch, COUNT(*) n FROM knowledge_points k
    WHERE k.status='approved' AND k.chapter!=''
    AND k.id NOT IN (SELECT knowledge_id FROM questions WHERE status!='rejected' AND knowledge_id IS NOT NULL)
    GROUP BY k.chapter ORDER BY n DESC LIMIT 5`).all();
  if (uncovChapters.length) push('uncovered_exam_points', 'medium', `${uncovChapters.length} 个考点章节无题目覆盖，最大「${uncovChapters[0].ch}」${uncovChapters[0].n} 个知识点未覆盖`);

  // 7 AI 生成失败率
  const fail = d.prepare(`SELECT COUNT(*) n FROM gen_tasks WHERE status='failed'`).get().n;
  const done = d.prepare(`SELECT COUNT(*) n FROM gen_tasks WHERE status='done'`).get().n;
  if (done + fail > 10 && fail / (done + fail) > 0.2) push('ai_failure_spike', 'high', `AI 出题任务失败率 ${Math.round(fail / (done + fail) * 100)}%（${fail}/${done + fail}）`);

  // 8 用户内容重复率（Knowledge Hash 命中占比）
  const matDup = d.prepare(`SELECT COUNT(*) n FROM materials WHERE dedup_of>0`).get().n;
  const matTotal = d.prepare(`SELECT COUNT(*) n FROM materials`).get().n;
  if (matTotal > 20 && matDup / matTotal > 0.3) push('user_content_dup', 'medium', `用户资料重复上传率 ${Math.round(matDup / matTotal * 100)}%（${matDup}/${matTotal}）`);

  return { scanned: true, new_alerts: alerts };
}

module.exports = {
  KP_STATES, SOURCE_LEVELS, LEGACY_TO_STATE, STATE_TO_LEGACY, GOVERNANCE_DEFAULTS,
  applyQualityGate, getGovernanceConfig,
  gateKnowledgePoint, detectKpConflict, nextConflictGroup,
  gateQuestion, checkQuestionDuplicate, qHash1, qHash2,
  applyReview, deprecateKp, supersedeKp, resolveConflict, logKpEvent,
  traceKnowledge, computeCoverage, collectHealth, scanAnomalies,
};
