/**
 * P6 言道学堂（AI 知识工厂）后端 - v25.0.19 V1.0
 *
 * 流水线：资料上传 → AI 解析知识点 → 人工审核入库 → AI 出题 → 人工审核入题库
 *        → 随机组卷 → 限时考试 → 自动判分 → 证书生成/头衔升级 → 公开验真
 *
 * 设计红线：
 *   - 开发只建系统，不生产内容：空库状态下所有流程可运行
 *   - AI 生成内容必须人工审核（status=pending）才能入库对外可见
 *   - 资料分级 S/A/B/C；证书编号 YA-年份-赛道缩写-序号；高级证书 2 年复核
 *
 * 存储：独立 SQLite 文件 data/academy.db（业务独立，不触碰用户核心库结构）
 * 审核/出题触发权限：x-admin-key（ADMIN_API_KEY）或 ACADEMY_ADMIN_IDS 白名单
 */
'use strict';

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const ACADEMY_DB_PATH = path.join(__dirname, 'data', 'academy.db');
const FILE_DIR = path.join(__dirname, 'data', 'academy_files');
const JWT_SECRET = process.env.JWT_SECRET || 'yandao_default_jwt_secret_change_me';

// ==================== 板块与等级配置 ====================
// v25.0.20：三大板块（中医/易学/国学）+ 板块下自定义类目（categories 表）
// 旧赛道值兼容映射：tcm→zhongyi, bazi/qimen/ziwei→yixue, general→guoxue

const TRACKS = {
  zhongyi: { code: 'TCM', name: '中医', titles: ['', '中医学徒', '中医研究员', '中医讲师', '中医高级师', '认证大师'] },
  yixue: { code: 'YX', name: '易学', titles: ['', '易学学徒', '易学研究员', '易学讲师', '易学高级师', '认证大师'] },
  guoxue: { code: 'GX', name: '国学', titles: ['', '国学学徒', '国学研究员', '国学讲师', '国学高级师', '认证大师'] },
};

const TRACK_ALIASES = { tcm: 'zhongyi', bazi: 'yixue', qimen: 'yixue', ziwei: 'yixue', general: 'guoxue' };

function normTrack(t) {
  if (TRACKS[t]) return t;
  return TRACK_ALIASES[t] || '';
}

function trackName(t) {
  return (TRACKS[t] || TRACKS[TRACK_ALIASES[t]] || { name: t || '' }).name || t || '';
}

// 预置类目（中医·倪海厦人纪系列 / 易学·天纪）
const PRESET_CATEGORIES = [
  ['zhongyi', '倪海厦·黄帝内经', 1],
  ['zhongyi', '倪海厦·针灸', 2],
  ['zhongyi', '倪海厦·伤寒论', 3],
  ['zhongyi', '倪海厦·金匮要略', 4],
  ['zhongyi', '倪海厦·神农本草经', 5],
  ['zhongyi', '倪海厦·临床医案', 6],
  ['zhongyi', '倪海厦·学生笔记', 7],
  ['zhongyi', '倪海厦·方剂处方', 8],
  ['yixue', '倪海厦·天纪人间道', 1],
  // v25.0.21：易学分门别类类目（用户整理的命理类核心资料）
  ['yixue', '八字命理', 10],
  ['yixue', '紫微斗数', 11],
  ['yixue', '奇门遁甲', 12],
  ['yixue', '大六壬', 13],
  ['yixue', '小六壬', 14],
  ['yixue', '梅花易数', 15],
  ['yixue', '玄空风水', 16],
  ['yixue', '七政四余', 17],
  ['yixue', '易经推命', 18],
  ['yixue', '堪舆地脉', 19],
];

// 组卷配置：题量 / 分值 / 及格线 / 限时（分钟）/ 难度配比
// P6-J：考试配置默认值。实际运行时实时读取 loc_configs（key=exam_config），后台修改即时生效
const EXAM_CONFIG_DEFAULT = {
  1: { total: 10, easy: 6, medium: 4, hard: 0, single: 6, multi: 2, judge: 2, minutes: 15, passScore: 60 },
  2: { total: 15, easy: 5, medium: 6, hard: 4, single: 8, multi: 3, judge: 2, fill: 2, minutes: 25, passScore: 70 },
  3: { total: 20, easy: 4, medium: 8, hard: 8, single: 8, multi: 4, judge: 2, fill: 3, qa: 2, case: 1, minutes: 40, passScore: 75 },
};

function getExamConfig() {
  try {
    const row = getDb().prepare(`SELECT value_json FROM loc_configs WHERE key='exam_config'`).get();
    if (row) {
      const cfg = JSON.parse(row.value_json);
      if (cfg && cfg['1'] && cfg['2'] && cfg['3']) return cfg;
    }
  } catch { /* 配置缺失/损坏时回退默认值 */ }
  return EXAM_CONFIG_DEFAULT;
}

let db = null;
function getDb() {
  if (!db) {
    const dir = path.dirname(ACADEMY_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(ACADEMY_DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables(db);
  }
  return db;
}

function initTables(d) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      track TEXT NOT NULL,
      format TEXT DEFAULT 'text',
      file_path TEXT DEFAULT '',
      text_content TEXT DEFAULT '',
      grade TEXT DEFAULT 'C',
      status TEXT DEFAULT 'pending',
      parse_note TEXT DEFAULT '',
      uploader_id TEXT DEFAULT '',
      uploader_name TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS knowledge_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER,
      chapter TEXT DEFAULT '',
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      difficulty TEXT DEFAULT 'easy',
      status TEXT DEFAULT 'pending',
      source_text TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_kp_track_status ON knowledge_points(difficulty, status);

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER,
      track TEXT DEFAULT 'general',
      type TEXT NOT NULL,
      stem TEXT NOT NULL,
      options TEXT DEFAULT '[]',
      answer TEXT NOT NULL,
      keywords TEXT DEFAULT '[]',
      analysis TEXT DEFAULT '',
      difficulty TEXT DEFAULT 'easy',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_q_exam ON questions(status, track, type, difficulty);

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      track TEXT NOT NULL,
      level INTEGER NOT NULL,
      question_ids TEXT NOT NULL,
      answers TEXT DEFAULT '{}',
      score INTEGER DEFAULT 0,
      detail TEXT DEFAULT '{}',
      passed INTEGER DEFAULT 0,
      started_at TEXT DEFAULT (datetime('now','localtime')),
      submitted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_exams_user ON exams(user_id, track);

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cert_no TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT DEFAULT '',
      track TEXT NOT NULL,
      level INTEGER NOT NULL,
      title TEXT DEFAULT '',
      exam_id INTEGER,
      issued_at TEXT DEFAULT (datetime('now','localtime')),
      expire_at TEXT,
      status TEXT DEFAULT 'valid'
    );

    CREATE TABLE IF NOT EXISTS study_progress (
      user_id TEXT NOT NULL,
      track TEXT NOT NULL,
      chapter TEXT NOT NULL,
      completed INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (user_id, track, chapter)
    );

    CREATE TABLE IF NOT EXISTS wrong_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      question_id INTEGER NOT NULL,
      my_answer TEXT DEFAULT '',
      exam_id INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_wrong_user ON wrong_answers(user_id);

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track TEXT NOT NULL,
      name TEXT NOT NULL,
      sort INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // v25.0.20：旧库列迁移（materials/knowledge_points/questions 补 category；knowledge_points 补 track）
  const ensureColumn = (table, col, ddl) => {
    const cols = d.pragma(`table_info(${table})`).map(c => c.name);
    if (!cols.includes(col)) d.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  };
  ensureColumn('materials', 'category', "category TEXT DEFAULT ''");
  ensureColumn('knowledge_points', 'track', "track TEXT DEFAULT ''");
  ensureColumn('knowledge_points', 'category', "category TEXT DEFAULT ''");
  ensureColumn('questions', 'category', "category TEXT DEFAULT ''");
  // P6-I 原则4：三层权限（PUBLIC/PRIVATE/ORG），禁止新增其他类型
  ensureColumn('materials', 'visibility', "visibility TEXT DEFAULT 'PUBLIC'");
  ensureColumn('materials', 'org_id', 'org_id INTEGER DEFAULT 0');

  // P6-A/P6-B：全覆盖出题批量任务（知识点分组遍历，进度可查）
  d.exec(`
    CREATE TABLE IF NOT EXISTS gen_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track TEXT NOT NULL,
      category TEXT DEFAULT '',
      level INTEGER DEFAULT 1,
      total_groups INTEGER DEFAULT 0,
      done_groups INTEGER DEFAULT 0,
      total_kp INTEGER DEFAULT 0,
      covered_kp INTEGER DEFAULT 0,
      created_q INTEGER DEFAULT 0,
      skipped_cached INTEGER DEFAULT 0,
      status TEXT DEFAULT 'running',
      error TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // P6-I 原则2：AI 调用日志（一次生成永久复用，重复访问零消耗，全量可追溯）
  d.exec(`
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

  // P6-I 原则3：机构学习空间 SaaS
  d.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'commercial',
      logo TEXT DEFAULT '',
      intro TEXT DEFAULT '',
      notice TEXT DEFAULT '',
      owner_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      tier TEXT DEFAULT 'free',
      member_limit INTEGER DEFAULT 50,
      expire_at TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS org_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(org_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS org_invite_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL,
      code TEXT NOT NULL UNIQUE,
      uses INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS org_earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL,
      user_id TEXT DEFAULT '',
      source TEXT NOT NULL,
      amount REAL DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // P6-J：学习运营中心配置（实时生效，禁止改代码调规则）+ 操作留痕
  d.exec(`
    CREATE TABLE IF NOT EXISTS loc_configs (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_by TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS loc_op_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT DEFAULT '',
      detail TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // LOC 默认配置初始化（幂等）：机构档位 / 分佣规则 / 积分规则
  const defaultCfg = [
    ['org_tiers', JSON.stringify([
      { key: 'free', name: '公益基础版', price: 0, memberLimit: 50, features: ['资料', '题库', '考试'] },
      { key: 'biz50', name: '商业版·50人', price: 299, memberLimit: 50, features: ['全功能'] },
      { key: 'biz100', name: '商业版·100人', price: 599, memberLimit: 100, features: ['全功能'] },
      { key: 'biz300', name: '商业版·300人', price: 999, memberLimit: 300, features: ['全功能'] },
    ])],
    ['commission_rules', JSON.stringify({
      inviteRegisterPoints: 100,
      memberFirstPayRate: 0.2,
      memberRenewPayRate: 0.1,
    })],
    ['points_rules', JSON.stringify({
      studyCheckin: 5, questionCorrect: 2, examPass: 50, inviteRegister: 100, materialApproved: 200,
    })],
  ];
  const cfgExist = d.prepare('SELECT key FROM loc_configs WHERE key=?');
  const cfgIns = d.prepare('INSERT INTO loc_configs (key, value_json, updated_by) VALUES (?,?,?)');
  for (const [k, v] of defaultCfg) {
    if (!cfgExist.get(k)) cfgIns.run(k, v, 'system_init');
  }

  // 预置类目（幂等：缺一条补一条，v25.0.21 起每次启动确保齐全）
  const existCat = d.prepare('SELECT id FROM categories WHERE track=? AND name=?');
  const ins = d.prepare('INSERT INTO categories (track, name, sort) VALUES (?,?,?)');
  for (const [track, name, sort] of PRESET_CATEGORIES) {
    if (!existCat.get(track, name)) ins.run(track, name, sort);
  }
}

// ==================== 认证与权限 ====================

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

function isAdmin(req) {
  const key = req.headers['x-admin-key'];
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey && key === adminKey) return true;
  const ids = (process.env.ACADEMY_ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  return !!(req.user && ids.includes(String(req.user.userId)));
}

function adminRequired(req, res, next) {
  if (!isAdmin(req)) return res.status(403).json({ success: false, error: '需要管理员权限' });
  next();
}

// P6-I 原则4：用户已加入的机构 id 列表（用于 ORG 资料可见性判断）
function myOrgIds(req) {
  try {
    const uid = String(req.user.userId);
    return getDb().prepare(`SELECT org_id FROM org_members WHERE user_id=?`).all(uid).map(r => r.org_id);
  } catch { return []; }
}

// ==================== AI 通道（复用 /api/ai/chat 同款配置） ====================
// P6-I 原则2：所有 AI 调用写入 ai_call_logs（场景/关联对象/token 估算），重复内容走库缓存不调 AI

async function callAI(systemPrompt, userPrompt, scene = 'other', refs = {}) {
  const deepseekKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
  const hunyuanKey = process.env.HUNYUAN_API_KEY || '';
  const apiKey = deepseekKey || hunyuanKey;
  if (!apiKey) throw new Error('AI 服务未配置密钥');
  const useHunyuan = !deepseekKey && !!hunyuanKey;
  const model = useHunyuan ? (process.env.HUNYUAN_MODEL || 'hy3') : 'deepseek-chat';
  const url = useHunyuan
    ? (process.env.HUNYUAN_API_URL || 'https://tokenhub.tencentmaas.com/v1/chat/completions')
    : 'https://api.deepseek.com/chat/completions';
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!resp.ok) throw new Error(`AI 接口返回 ${resp.status}`);
  const data = await resp.json();
  const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  try {
    const usage = data.usage || {};
    getDb().prepare(`INSERT INTO ai_call_logs (scene, material_id, kp_id, task_id, tokens_in, tokens_out) VALUES (?,?,?,?,?,?)`)
      .run(scene, refs.materialId || null, refs.kpId || null, refs.taskId || null,
        usage.prompt_tokens || Math.ceil((systemPrompt.length + userPrompt.length) / 2),
        usage.completion_tokens || Math.ceil(content.length / 2));
  } catch { /* 日志失败不阻断业务 */ }
  return content;
}

function extractJson(text) {
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text;
  const start = raw.search(/[[{]/);
  if (start < 0) return null;
  const end = Math.max(raw.lastIndexOf(']'), raw.lastIndexOf('}'));
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ==================== 业务辅助 ====================

function materialVo(r) {
  return {
    id: String(r.id), title: r.title, track: r.track, trackName: trackName(r.track),
    category: r.category || '', format: r.format, grade: r.grade, status: r.status, parseNote: r.parse_note,
    uploaderId: r.uploader_id, uploaderName: r.uploader_name,
    visibility: r.visibility || 'PUBLIC', orgId: String(r.org_id || 0),
    textPreview: (r.text_content || '').slice(0, 200), createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function knowledgeVo(r) {
  return {
    id: String(r.id), materialId: r.material_id ? String(r.material_id) : '', chapter: r.chapter,
    title: r.title, content: r.content, tags: JSON.parse(r.tags || '[]'),
    track: r.track || '', category: r.category || '',
    difficulty: r.difficulty, status: r.status, sourceText: r.source_text, createdAt: r.created_at,
  };
}

function questionVo(r, withAnswer) {
  const vo = {
    id: String(r.id), knowledgeId: r.knowledge_id ? String(r.knowledge_id) : '',
    track: r.track, trackName: trackName(r.track), category: r.category || '',
    type: r.type, stem: r.stem,
    options: JSON.parse(r.options || '[]'), difficulty: r.difficulty, status: r.status,
    analysis: r.analysis, createdAt: r.created_at,
  };
  if (withAnswer) {
    vo.answer = r.answer;
    vo.keywords = JSON.parse(r.keywords || '[]');
  }
  return vo;
}

function certVo(r) {
  return {
    id: String(r.id), certNo: r.cert_no, userId: r.user_id, userName: r.user_name,
    track: r.track, trackName: trackName(r.track), level: r.level, title: r.title,
    examId: r.exam_id ? String(r.exam_id) : '', issuedAt: r.issued_at,
    expireAt: r.expire_at, status: r.status,
  };
}

function nextCertNo(track, year) {
  const code = (TRACKS[track] || TRACKS[TRACK_ALIASES[track]] || { code: 'GX' }).code;
  const prefix = `YA-${year}-${code}-`;
  const row = getDb().prepare("SELECT cert_no FROM certificates WHERE cert_no LIKE ? ORDER BY id DESC LIMIT 1").get(prefix + '%');
  let seq = 1;
  if (row) seq = parseInt(row.cert_no.slice(prefix.length), 10) + 1;
  return prefix + String(seq).padStart(6, '0');
}

// ==================== AI 解析 / 出题（异步任务） ====================

const PARSE_SYSTEM = `你是国学知识结构化引擎。将用户提供的资料拆分为知识点数组，严格输出 JSON：
[{"chapter":"章节名","title":"知识点标题(20字内)","content":"知识点说明(150字内)","tags":["标签"],"difficulty":"easy|medium|hard"}]
只输出 JSON，不要解释。若资料无法解析输出 []。`;

const GENQ_SYSTEM = `你是国学考试出题引擎。基于给定知识点生成考试题目，严格输出 JSON 数组：
[{"type":"single|multi|judge|fill|qa|case","stem":"题干","options":["A选项","B选项","C选项","D选项"],"answer":"答案(single填选项序号0-3;multi填序号数组字符串如\"0,2\";judge填对|错;fill填标准答案文本;qa/case填参考答案要点)","keywords":["评分关键词"],"analysis":"解析(100字内)","difficulty":"easy|medium|hard"}]
single/multi 必须给 4 个选项；judge 无需 options（输出 []）；qa/case options 输出 []。只输出 JSON。`;

// v25.0.21：全文分段解析（每段约 11k 字，最多 14 段 ≈ 15 万字，保证长篇典籍全覆盖）
const PARSE_CHUNK = 11000;
const PARSE_MAX_CHUNKS = 14;

function splitForParse(text) {
  const chunks = [];
  let rest = String(text || '');
  while (rest.length > 0 && chunks.length < PARSE_MAX_CHUNKS) {
    if (rest.length <= PARSE_CHUNK) { chunks.push(rest); break; }
    let cut = rest.lastIndexOf('\n', PARSE_CHUNK);
    if (cut < PARSE_CHUNK * 0.5) cut = rest.lastIndexOf('。', PARSE_CHUNK);
    if (cut < PARSE_CHUNK * 0.5) cut = PARSE_CHUNK;
    chunks.push(rest.slice(0, cut + 1));
    rest = rest.slice(cut + 1).trimStart();
  }
  return chunks;
}

async function runParseTask(materialId, text) {
  const d = getDb();
  const mat = d.prepare('SELECT track, category FROM materials WHERE id = ?').get(materialId) || {};
  d.prepare(`UPDATE materials SET status='parsing', updated_at=datetime('now','localtime') WHERE id=?`).run(materialId);
  const chunks = splitForParse(text);
  const insert = d.prepare('INSERT INTO knowledge_points (material_id, chapter, title, content, tags, difficulty, status, source_text, track, category) VALUES (?,?,?,?,?,?,?,?,?,?)');
  let n = 0;
  try {
    for (let i = 0; i < chunks.length; i++) {
      const content = await callAI(PARSE_SYSTEM, `赛道资料内容（第${i + 1}/${chunks.length}段）：\n${chunks[i]}`, 'parse_material', { materialId });
      const list = extractJson(content);
      const arr = Array.isArray(list) ? list : [];
      for (const kp of arr.slice(0, 200)) {
        if (!kp || !kp.title) continue;
        insert.run(materialId, String(kp.chapter || '未分章').slice(0, 60), String(kp.title).slice(0, 60),
          String(kp.content || '').slice(0, 800), JSON.stringify(Array.isArray(kp.tags) ? kp.tags.slice(0, 6) : []),
          ['easy', 'medium', 'hard'].includes(kp.difficulty) ? kp.difficulty : 'easy', 'pending',
          String(kp.content || '').slice(0, 300), mat.track || '', mat.category || '');
        n++;
      }
    }
    d.prepare(`UPDATE materials SET status='parsed', parse_note=?, updated_at=datetime('now','localtime') WHERE id=?`)
      .run(`AI 解析完成：全文 ${chunks.length} 段，提取 ${n} 个知识点，待人工审核`, materialId);
    console.log(`[Academy] 资料#${materialId} 解析完成: ${chunks.length} 段 / ${n} 个知识点`);
  } catch (err) {
    d.prepare(`UPDATE materials SET status='parsed', parse_note=?, updated_at=datetime('now','localtime') WHERE id=?`)
      .run(`AI 解析完成（部分）：已提取 ${n} 个知识点，末段失败：${err.message}`, materialId);
    console.error(`[Academy] 资料#${materialId} 解析第段失败:`, err.message);
  }
}

function runGenQuestionsTask(track, level, count, category = '') {
  const d = getDb();
  const kps = d.prepare(`SELECT * FROM knowledge_points WHERE status='approved'
      AND (track=? OR material_id IN (SELECT id FROM materials WHERE track=?))
      ${category ? 'AND (category=? OR material_id IN (SELECT id FROM materials WHERE category=?))' : ''}
      ORDER BY RANDOM() LIMIT 8`)
    .all(...(category ? [track, track, category, category] : [track, track]));
  const material = kps.length ? kps.map(k => `- ${k.title}：${k.content}`).join('\n') : `赛道「${trackName(track)}」基础常识`;
  const diffMap = { 1: 'easy 为主', 2: 'easy/medium 均衡', 3: 'medium/hard 为主' };
  return callAI(GENQ_SYSTEM, `目标等级：${level}级（${diffMap[level] || '均衡'}）\n生成 ${count} 道题\n知识点依据：\n${material}`, 'gen_questions', { taskId: null })
    .then(content => {
      const list = extractJson(content);
      const arr = Array.isArray(list) ? list : [];
      const insert = d.prepare('INSERT INTO questions (knowledge_id, track, type, stem, options, answer, keywords, analysis, difficulty, status, category) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
      let n = 0;
      for (const q of arr.slice(0, 50)) {
        if (!q || !q.stem || !q.type) continue;
        if (!['single', 'multi', 'judge', 'fill', 'qa', 'case'].includes(q.type)) continue;
        const kp = kps[n % Math.max(kps.length, 1)];
        insert.run(kp ? kp.id : null,
          track, q.type, String(q.stem).slice(0, 1000),
          JSON.stringify(Array.isArray(q.options) ? q.options.slice(0, 6).map(o => String(o).slice(0, 200)) : []),
          String(q.answer ?? '').slice(0, 2000),
          JSON.stringify(Array.isArray(q.keywords) ? q.keywords.slice(0, 10).map(k => String(k).slice(0, 30)) : []),
          String(q.analysis || '').slice(0, 600),
          ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'easy', 'pending',
          category || (kp ? (kp.category || '') : ''));
        n++;
      }
      return n;
    });
}

// ==================== P6-B 全覆盖出题引擎（v25.0.22） ====================
// 设计：把类目下【全部】已审核知识点按 8 个/组遍历，逐组调 AI 出题；
//       已有题目的知识点直接跳过（原则2 AI 永久缓存：一次生成永久复用，重复生成=0 消耗）
//       题目逐条绑定 knowledge_id → 知识点全覆盖可追溯，任务进度实时可查

const FULLGEN_GROUP_SIZE = 8;

async function runFullGenTask(taskId) {
  const d = getDb();
  const task = d.prepare('SELECT * FROM gen_tasks WHERE id=?').get(taskId);
  if (!task) return;
  const bump = d.prepare(`UPDATE gen_tasks SET done_groups=done_groups+1, covered_kp=covered_kp+?, created_q=created_q+?, skipped_cached=skipped_cached+?, updated_at=datetime('now','localtime') WHERE id=?`);
  const finish = d.prepare(`UPDATE gen_tasks SET status=?, error=?, updated_at=datetime('now','localtime') WHERE id=?`);
  try {
    const all = d.prepare(`SELECT * FROM knowledge_points WHERE status='approved'
        AND (track=? OR material_id IN (SELECT id FROM materials WHERE track=?))
        ${task.category ? 'AND (category=? OR material_id IN (SELECT id FROM materials WHERE category=?))' : ''}
        ORDER BY id`).all(...(task.category ? [task.track, task.track, task.category, task.category] : [task.track, task.track]));
    // 缓存查重：已有题目（未驳回）的知识点不重复生成
    const hasQ = new Set(d.prepare(`SELECT DISTINCT knowledge_id FROM questions WHERE knowledge_id IS NOT NULL AND status != 'rejected'`).all().map(r => r.knowledge_id));
    const pending = all.filter(k => !hasQ.has(k.id));
    const groups = [];
    for (let i = 0; i < pending.length; i += FULLGEN_GROUP_SIZE) groups.push(pending.slice(i, i + FULLGEN_GROUP_SIZE));
    d.prepare('UPDATE gen_tasks SET total_groups=?, total_kp=?, skipped_cached=? WHERE id=?')
      .run(groups.length, all.length, all.length - pending.length, taskId);
    if (groups.length === 0) { finish.run('done', '全部知识点已有题目（缓存命中，0 次 AI 调用）', taskId); return; }

    const insert = d.prepare('INSERT INTO questions (knowledge_id, track, type, stem, options, answer, keywords, analysis, difficulty, status, category) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    const diffMap = { 1: 'easy 为主', 2: 'easy/medium 均衡', 3: 'medium/hard 为主' };
    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi];
      const kpText = group.map((k, idx) => `${gi + 1}.${idx + 1} [${k.title}] ${k.content}`).join('\n');
      const per = Math.max(4, Math.min(10, group.length + 2));
      const content = await callAI(
        GENQ_SYSTEM,
        `目标等级：${task.level}级（${diffMap[task.level] || '均衡'}）\n逐个知识点出题：以下 ${group.length} 个知识点，每个知识点至少 1 道题，共生成 ${per} 道题，题目顺序与知识点顺序对应\n知识点依据：\n${kpText}`,
        'gen_full', { taskId });
      const list = extractJson(content);
      const arr = Array.isArray(list) ? list : [];
      let created = 0;
      for (let qi = 0; qi < arr.length; qi++) {
        const q = arr[qi];
        if (!q || !q.stem || !q.type) continue;
        if (!['single', 'multi', 'judge', 'fill', 'qa', 'case'].includes(q.type)) continue;
        const kp = group[Math.min(qi, group.length - 1)];
        insert.run(kp.id, task.track, q.type, String(q.stem).slice(0, 1000),
          JSON.stringify(Array.isArray(q.options) ? q.options.slice(0, 6).map(o => String(o).slice(0, 200)) : []),
          String(q.answer ?? '').slice(0, 2000),
          JSON.stringify(Array.isArray(q.keywords) ? q.keywords.slice(0, 10).map(k => String(k).slice(0, 30)) : []),
          String(q.analysis || '').slice(0, 600),
          ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'easy', 'pending',
          task.category || kp.category || '');
        created++;
      }
      const covered = created > 0 ? group.length : 0;
      bump.run(covered, created, 0, taskId);
    }
    finish.run('done', '', taskId);
    console.log(`[Academy] 全覆盖出题任务#${taskId} 完成`);
  } catch (err) {
    finish.run('failed', String(err.message || err).slice(0, 300), taskId);
    console.error(`[Academy] 全覆盖出题任务#${taskId} 失败:`, err.message);
  }
}

// ==================== 判分 ====================

function gradeAnswer(q, myAnswer) {
  const ans = String(myAnswer ?? '').trim();
  switch (q.type) {
    case 'single': {
      const idx = parseInt(ans, 10);
      if (isNaN(idx)) return { full: false, ratio: 0 };
      const correct = parseInt(String(q.answer).trim(), 10);
      return { full: idx === correct, ratio: idx === correct ? 1 : 0 };
    }
    case 'multi': {
      const mine = ans.split(',').map(s => s.trim()).filter(Boolean).sort();
      const correct = String(q.answer).split(',').map(s => s.trim()).filter(Boolean).sort();
      const hit = mine.filter(x => correct.includes(x)).length;
      const wrong = mine.filter(x => !correct.includes(x)).length;
      if (mine.length === correct.length && hit === correct.length && wrong === 0) return { full: true, ratio: 1 };
      return { full: false, ratio: correct.length ? Math.max(0, (hit - wrong) / correct.length) : 0 };
    }
    case 'judge':
      return { full: ans === String(q.answer).trim(), ratio: ans === String(q.answer).trim() ? 1 : 0 };
    case 'fill': {
      const norm = s => String(s).replace(/\s+/g, '').toLowerCase();
      return { full: norm(ans) === norm(q.answer), ratio: norm(ans) === norm(q.answer) ? 1 : 0 };
    }
    case 'qa':
    case 'case': {
      const keywords = JSON.parse(q.keywords || '[]');
      if (!keywords.length) return { full: ans.length > 20, ratio: ans.length > 20 ? 1 : 0 };
      const hit = keywords.filter(k => ans.includes(k)).length;
      return { full: hit / keywords.length >= 0.6, ratio: hit / keywords.length };
    }
    default:
      return { full: false, ratio: 0 };
  }
}

// ==================== 路由 ====================

function createRouter() {
  const router = express.Router();
  router.use(express.json({ limit: '12mb' }));

  // ---------- 板块概览（公开） ----------
  router.get('/tracks', authRequired, (req, res) => {
    try {
      const d = getDb();
      const me = String(req.user.userId);
      // 兼容旧赛道值（tcm/bazi/qimen/ziwei/general → 新三板块）
      const trackKeys = (key) => [key, ...Object.entries(TRACK_ALIASES).filter(([, v]) => v === key).map(([k]) => k)];
      const inSql = (key, col) => `${col} IN (${trackKeys(key).map(() => '?').join(',')})`;
      const tracks = Object.entries(TRACKS).map(([key, t]) => {
        const kpCount = d.prepare(`SELECT COUNT(*) AS c FROM knowledge_points WHERE status='approved' AND (material_id IN (SELECT id FROM materials WHERE ${inSql(key, 'track')}))`).get(...trackKeys(key)).c;
        const qCount = d.prepare(`SELECT COUNT(*) AS c FROM questions WHERE status='approved' AND ${inSql(key, 'track')}`).get(...trackKeys(key)).c;
        const myCerts = d.prepare(`SELECT level, title, cert_no, status, issued_at, expire_at FROM certificates WHERE user_id=? AND ${inSql(key, 'track')} ORDER BY level DESC`).all(me, ...trackKeys(key));
        const myBest = d.prepare(`SELECT MAX(level) AS lv FROM certificates WHERE user_id=? AND ${inSql(key, 'track')}`).get(me, ...trackKeys(key)).lv || 0;
        const catCount = d.prepare(`SELECT COUNT(*) AS c FROM categories WHERE track=? AND status='active'`).get(key).c;
        return {
          key, name: t.name, code: t.code, categoryCount: catCount,
          knowledgeCount: kpCount, questionCount: qCount,
          myLevel: myBest, myTitle: t.titles[myBest] || '', myCertificates: myCerts.map(c => ({ ...c, level: c.level, expireAt: c.expire_at })),
        };
      });
      res.json({ success: true, tracks });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ---------- 类目（板块下自定义类目） ----------
  router.get('/categories', authRequired, (req, res) => {
    try {
      const d = getDb();
      const { track = '' } = req.query;
      const rows = track
        ? d.prepare(`SELECT * FROM categories WHERE status='active' AND track=? ORDER BY sort, id`).all(track)
        : d.prepare(`SELECT * FROM categories WHERE status='active' ORDER BY track, sort, id`).all();
      const matCnt = d.prepare(`SELECT category, COUNT(*) AS c FROM materials GROUP BY category`);
      const cntMap = Object.fromEntries(matCnt.all().map(r => [r.category, r.c]));
      res.json({
        success: true,
        categories: rows.map(r => ({
          id: String(r.id), track: r.track, trackName: trackName(r.track), name: r.name, sort: r.sort,
          materialCount: cntMap[r.name] || 0,
        })),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.post('/categories', adminRequired, (req, res) => {
    try {
      const { track, name } = req.body;
      const t = normTrack(track);
      if (!t) return res.status(400).json({ success: false, error: '请选择有效板块' });
      if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: '请填写类目名称' });
      const exist = getDb().prepare(`SELECT id FROM categories WHERE track=? AND name=?`).get(t, String(name).trim());
      if (exist) return res.status(400).json({ success: false, error: '该类目已存在' });
      const maxSort = getDb().prepare(`SELECT MAX(sort) AS s FROM categories WHERE track=?`).get(t).s || 0;
      const r = getDb().prepare('INSERT INTO categories (track, name, sort) VALUES (?,?,?)').run(t, String(name).trim().slice(0, 40), maxSort + 1);
      res.json({ success: true, categoryId: String(r.lastInsertRowid) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.delete('/categories/:id', adminRequired, (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const row = getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id);
      if (!row) return res.status(404).json({ success: false, error: '类目不存在' });
      const used = getDb().prepare('SELECT COUNT(*) AS c FROM materials WHERE category = ?').get(row.name).c;
      if (used > 0) return res.status(400).json({ success: false, error: `该类目下有 ${used} 份资料，请先移除资料` });
      getDb().prepare(`UPDATE categories SET status='deleted' WHERE id=?`).run(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ---------- P6-A 资料 ----------
  router.post('/materials', authRequired, (req, res) => {
    try {
      const { title, track, category = '', format = 'text', textContent = '', fileBase64 = '', fileName = '', grade = 'C', visibility = 'PUBLIC', orgId = 0 } = req.body;
      if (!title || !String(title).trim()) return res.status(400).json({ success: false, error: '请填写资料标题' });
      const t = normTrack(track);
      if (!t) return res.status(400).json({ success: false, error: '请选择有效板块' });
      // v25.0.22：仅接受记事本类文件（txt/md/text/markdown），PDF/Word/图片一律拒绝（识别稳定、成本可控）
      const ALLOWED_EXT = ['.txt', '.md', '.text', '.markdown'];
      if (fileName) {
        const ext = String(fileName).toLowerCase().match(/\.[a-z0-9]+$/);
        if (!ext || !ALLOWED_EXT.includes(ext[0])) {
          return res.status(400).json({ success: false, error: `仅支持记事本类文件（${ALLOWED_EXT.join(' / ')}）。PDF/Word/图片请先另存为 txt 再上传` });
        }
      }
      let cat = String(category).trim().slice(0, 40);
      if (cat) {
        const ok = getDb().prepare(`SELECT id FROM categories WHERE track=? AND name=? AND status='active'`).get(t, cat);
        if (!ok) return res.status(400).json({ success: false, error: '类目不存在，请先在类目管理中创建' });
      }
      // P6-I 原则4：三层权限校验（ORG 需为该机构管理员/成员）
      const vis = ['PUBLIC', 'PRIVATE', 'ORG'].includes(visibility) ? visibility : 'PUBLIC';
      let orgIdVal = 0;
      if (vis === 'ORG') {
        const d = getDb();
        const org = d.prepare(`SELECT o.* FROM organizations o JOIN org_members m ON m.org_id=o.id WHERE o.id=? AND o.status='active' AND m.user_id=? AND m.role IN ('owner','admin')`)
          .get(parseInt(orgId, 10) || 0, String(req.user.userId));
        if (!org) return res.status(403).json({ success: false, error: '无权上传机构资料：需为机构管理员' });
        orgIdVal = org.id;
      }
      let filePath = '';
      if (fileBase64) {
        if (!fs.existsSync(FILE_DIR)) fs.mkdirSync(FILE_DIR, { recursive: true });
        const safeName = `${Date.now()}_${String(fileName || 'file').replace(/[^\w.\-\u4e00-\u9fff]/g, '_').slice(0, 60)}`;
        filePath = path.join(FILE_DIR, safeName);
        fs.writeFileSync(filePath, Buffer.from(fileBase64.replace(/^data:[^;]+;base64,/, ''), 'base64'));
      }
      if (!textContent && !filePath) return res.status(400).json({ success: false, error: '请提供文本内容或上传文件' });
      const result = getDb().prepare('INSERT INTO materials (title, track, category, format, file_path, text_content, grade, status, uploader_id, uploader_name, visibility, org_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(String(title).trim().slice(0, 100), t, cat, 'text', filePath, String(textContent).slice(0, 200000),
          ['S', 'A', 'B', 'C'].includes(grade) ? grade : 'C', 'pending', String(req.user.userId), req.user.nickname || `用户${req.user.userId}`, vis, orgIdVal);
      res.json({ success: true, materialId: String(result.lastInsertRowid), message: '资料已提交，等待解析与审核' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/materials', authRequired, (req, res) => {
    try {
      const d = getDb();
      const { track = '', category = '', status = '', mine = '' } = req.query;
      const me = String(req.user.userId);
      let sql = 'SELECT * FROM materials WHERE 1=1';
      const params = [];
      if (track) {
        const t = normTrack(track);
        const keys = [t, ...Object.entries(TRACK_ALIASES).filter(([, v]) => v === t).map(([k]) => k)];
        sql += ` AND track IN (${keys.map(() => '?').join(',')})`;
        params.push(...keys);
      }
      if (category) { sql += ' AND category = ?'; params.push(category); }
      if (mine === '1') { sql += ' AND uploader_id = ?'; params.push(me); }
      else if (isAdmin(req)) { if (status) { sql += ' AND status = ?'; params.push(status); } }
      else {
        // P6-I 原则4：PUBLIC 已审核 + 自己的私有 + 本机构资料
        const orgs = myOrgIds(req);
        sql += ` AND (status = 'approved' OR uploader_id = ?) AND (visibility = 'PUBLIC' OR uploader_id = ?`;
        params.push(me, me);
        if (orgs.length) {
          sql += ` OR (visibility = 'ORG' AND org_id IN (${orgs.map(() => '?').join(',')}))`;
          params.push(...orgs);
        }
        sql += ')';
      }
      sql += ' ORDER BY id DESC LIMIT 200';
      res.json({ success: true, materials: d.prepare(sql).all(...params).map(materialVo) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/materials/:id', authRequired, (req, res) => {
    try {
      const row = getDb().prepare('SELECT * FROM materials WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '资料不存在' });
      if (row.status !== 'approved' && String(row.uploader_id) !== String(req.user.userId) && !isAdmin(req)) {
        return res.status(403).json({ success: false, error: '资料审核中，暂不可见' });
      }
      res.json({ success: true, material: materialVo(row), textContent: row.text_content });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 管理员：触发 AI 解析
  router.post('/materials/:id/parse', adminRequired, (req, res) => {
    try {
      const row = getDb().prepare('SELECT * FROM materials WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '资料不存在' });
      if (!row.text_content) return res.status(400).json({ success: false, error: '该资料无文本内容（OCR 通道待接入），请补充文本后解析' });
      runParseTask(row.id, row.text_content);
      res.json({ success: true, message: '解析任务已启动，请稍后刷新查看知识点' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 管理员：资料审核 + 分级
  router.post('/materials/:id/review', adminRequired, (req, res) => {
    try {
      const { action, grade } = req.body; // action: approve/reject
      if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, error: '未知操作' });
      getDb().prepare(`UPDATE materials SET status=?, grade=?, updated_at=datetime('now','localtime') WHERE id=?`)
        .run(action === 'approve' ? 'approved' : 'rejected', ['S', 'A', 'B', 'C'].includes(grade) ? grade : 'C', parseInt(req.params.id, 10));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ---------- P6-A 知识点 ----------
  router.get('/knowledge', authRequired, (req, res) => {
    try {
      const d = getDb();
      const { track = '', category = '', status = '', materialId = '' } = req.query;
      let sql = `SELECT k.*, m.track AS m_track, m.category AS m_category FROM knowledge_points k LEFT JOIN materials m ON k.material_id = m.id WHERE 1=1`;
      const params = [];
      if (track) {
        const t = normTrack(track);
        const keys = [t, ...Object.entries(TRACK_ALIASES).filter(([, v]) => v === t).map(([k]) => k)];
        sql += ` AND (m.track IN (${keys.map(() => '?').join(',')}) OR k.track IN (${keys.map(() => '?').join(',')}))`;
        params.push(...keys, ...keys);
      }
      if (category) { sql += ' AND (k.category = ? OR m.category = ?)'; params.push(category, category); }
      if (materialId) { sql += ' AND k.material_id = ?'; params.push(parseInt(materialId, 10)); }
      if (isAdmin(req)) { if (status) { sql += ' AND k.status = ?'; params.push(status); } }
      else { sql += ` AND k.status = 'approved'`; }
      sql += ' ORDER BY k.id DESC LIMIT 300';
      const rows = d.prepare(sql).all(...params).map(r => knowledgeVo({ ...r, track: r.track || r.m_track || '', category: r.category || r.m_category || '' }));
      res.json({ success: true, points: rows });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/knowledge/:id', authRequired, (req, res) => {
    try {
      const row = getDb().prepare('SELECT * FROM knowledge_points WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '知识点不存在' });
      if (row.status !== 'approved' && !isAdmin(req)) return res.status(403).json({ success: false, error: '知识点审核中' });
      res.json({ success: true, point: knowledgeVo(row) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.post('/knowledge/:id/review', adminRequired, (req, res) => {
    try {
      const { action, content, title } = req.body;
      if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, error: '未知操作' });
      if (content || title) {
        getDb().prepare('UPDATE knowledge_points SET status=?, title=COALESCE(NULLIF(?,\'\'),title), content=COALESCE(NULLIF(?,\'\'),content) WHERE id=?')
          .run(action === 'approve' ? 'approved' : 'rejected', title || '', content || '', parseInt(req.params.id, 10));
      } else {
        getDb().prepare('UPDATE knowledge_points SET status=? WHERE id=?').run(action === 'approve' ? 'approved' : 'rejected', parseInt(req.params.id, 10));
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ---------- P6-B 题库 ----------
  router.post('/questions/generate', adminRequired, async (req, res) => {
    try {
      const { track = 'zhongyi', category = '', level = 1, count = 10 } = req.body;
      const t = normTrack(track);
      if (!t) return res.status(400).json({ success: false, error: '请选择有效板块' });
      const n = parseInt(count, 10) || 10;
      const created = await runGenQuestionsTask(t, parseInt(level, 10) || 1, Math.min(n, 30), String(category).trim());
      res.json({ success: true, created, message: `AI 已生成 ${created} 道题，待人工审核` });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // v25.0.22 P6-B：全覆盖出题（遍历类目全部知识点，分组出题，缓存命中不重复生成）
  router.post('/questions/generate-full', adminRequired, (req, res) => {
    try {
      const { track = 'zhongyi', category = '', level = 1 } = req.body;
      const t = normTrack(track);
      if (!t) return res.status(400).json({ success: false, error: '请选择有效板块' });
      const info = getDb().prepare('INSERT INTO gen_tasks (track, category, level, status) VALUES (?,?,?,?)')
        .run(t, String(category).trim(), Math.min(3, Math.max(1, parseInt(level, 10) || 1)), 'running');
      runFullGenTask(Number(info.lastInsertRowid));
      res.json({ success: true, taskId: String(info.lastInsertRowid), message: '全覆盖出题任务已启动，可轮询进度' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/gen-tasks', adminRequired, (req, res) => {
    try {
      const rows = getDb().prepare('SELECT * FROM gen_tasks ORDER BY id DESC LIMIT 50').all();
      res.json({
        success: true, tasks: rows.map(t => ({
          id: String(t.id), track: t.track, category: t.category, level: t.level,
          totalGroups: t.total_groups, doneGroups: t.done_groups, totalKp: t.total_kp,
          coveredKp: t.covered_kp, createdQ: t.created_q, skippedCached: t.skipped_cached,
          status: t.status, error: t.error, createdAt: t.created_at, updatedAt: t.updated_at,
        })),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/questions', authRequired, (req, res) => {
    try {
      const d = getDb();
      const { track = '', category = '', status = '', type = '' } = req.query;
      let sql = 'SELECT * FROM questions WHERE 1=1';
      const params = [];
      if (track) {
        const t = normTrack(track);
        const keys = [t, ...Object.entries(TRACK_ALIASES).filter(([, v]) => v === t).map(([k]) => k)];
        sql += ` AND track IN (${keys.map(() => '?').join(',')})`;
        params.push(...keys);
      }
      if (category) { sql += ' AND category = ?'; params.push(category); }
      if (type) { sql += ' AND type = ?'; params.push(type); }
      if (isAdmin(req)) { if (status) { sql += ' AND status = ?'; params.push(status); } }
      else { sql += ` AND status = 'approved'`; }
      sql += ' ORDER BY id DESC LIMIT 300';
      res.json({ success: true, questions: d.prepare(sql).all(...params).map(q => questionVo(q, isAdmin(req))) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.post('/questions/:id/review', adminRequired, (req, res) => {
    try {
      const { action, stem, answer, analysis } = req.body;
      if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, error: '未知操作' });
      const id = parseInt(req.params.id, 10);
      if (stem || answer || analysis) {
        getDb().prepare('UPDATE questions SET status=?, stem=COALESCE(NULLIF(?,\'\'),stem), answer=COALESCE(NULLIF(?,\'\'),answer), analysis=COALESCE(NULLIF(?,\'\'),analysis) WHERE id=?')
          .run(action === 'approve' ? 'approved' : 'rejected', stem || '', answer || '', analysis || '', id);
      } else {
        getDb().prepare('UPDATE questions SET status=? WHERE id=?').run(action === 'approve' ? 'approved' : 'rejected', id);
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ---------- P6-C 考试 ----------
  router.post('/exams/start', authRequired, (req, res) => {
    try {
      const d = getDb();
      const { track, level: levelStr } = req.body;
      if (!TRACKS[track]) return res.status(400).json({ success: false, error: '请选择有效赛道' });
      const level = Math.min(3, Math.max(1, parseInt(levelStr, 10) || 1));
      const cfg = getExamConfig()[level];
      const picked = [];
      const pickBy = (type, difficulty, n) => {
        if (n <= 0) return;
        const rows = d.prepare(`SELECT * FROM questions WHERE status='approved' AND track=? AND type=? AND difficulty=? ORDER BY RANDOM() LIMIT ?`)
          .all(track, type, difficulty, n);
        picked.push(...rows);
      };
      for (const [type, n] of Object.entries({ single: cfg.single, multi: cfg.multi, judge: cfg.judge, fill: cfg.fill || 0, qa: cfg.qa || 0, case: cfg.case || 0 })) {
        pickBy(type, 'easy', Math.ceil(n / 2));
        pickBy(type, 'medium', Math.floor(n / 2));
        pickBy(type, 'hard', n - Math.ceil(n / 2) - Math.floor(n / 2));
      }
      if (picked.length === 0) {
        return res.json({ success: false, error: `「${TRACKS[track].name}」题库建设中，暂无可组卷题目`, empty: true });
      }
      const perScore = Math.floor(100 / picked.length);
      const result = d.prepare('INSERT INTO exams (user_id, track, level, question_ids, answers) VALUES (?,?,?,?,?)')
        .run(String(req.user.userId), track, level, JSON.stringify(picked.map(q => q.id)), '{}');
      res.json({
        success: true,
        examId: String(result.lastInsertRowid),
        track, trackName: TRACKS[track].name, level, levelTitle: TRACKS[track].titles[level],
        minutes: cfg.minutes, passScore: cfg.passScore,
        questions: picked.map(q => ({ ...questionVo(q, false), score: perScore })),
        startedAt: new Date().toISOString(),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.post('/exams/:id/submit', authRequired, (req, res) => {
    try {
      const d = getDb();
      const exam = d.prepare('SELECT * FROM exams WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!exam || String(exam.user_id) !== String(req.user.userId)) return res.status(404).json({ success: false, error: '考试不存在' });
      if (exam.submitted_at) return res.status(400).json({ success: false, error: '该试卷已提交' });
      const { answers = {} } = req.body;
      const ids = JSON.parse(exam.question_ids || '[]');
      const questions = ids.map(qid => d.prepare('SELECT * FROM questions WHERE id = ?').get(qid)).filter(Boolean);
      let total = 0, got = 0;
      const detail = [];
      const wrongInsert = d.prepare('INSERT INTO wrong_answers (user_id, question_id, my_answer, exam_id) VALUES (?,?,?,?)');
      for (const q of questions) {
        const per = Math.floor(100 / questions.length);
        total += per;
        const g = gradeAnswer(q, answers[q.id]);
        const score = Math.round(per * g.ratio);
        got += score;
        if (!g.full) wrongInsert.run(String(req.user.userId), q.id, String(answers[q.id] ?? ''), exam.id);
        detail.push({
          questionId: String(q.id), type: q.type, stem: q.stem, options: JSON.parse(q.options || '[]'),
          myAnswer: String(answers[q.id] ?? ''), correctAnswer: q.answer, analysis: q.analysis,
          score, full: g.full, ratio: Math.round(g.ratio * 100) / 100,
        });
      }
      const passed = got >= getExamConfig()[exam.level].passScore;
      d.prepare('UPDATE exams SET answers=?, score=?, detail=?, passed=?, submitted_at=datetime(\'now\',\'localtime\') WHERE id=?')
        .run(JSON.stringify(answers), got, JSON.stringify(detail), passed ? 1 : 0, exam.id);

      let certificate = null;
      if (passed) {
        const track = TRACKS[exam.track] || { titles: ['', '学徒', '研究员', '讲师'] };
        const year = new Date().getFullYear();
        const certNo = nextCertNo(exam.track, year);
        // 高级(3级)证书 2 年复核；1/2 级永久
        const expireAt = exam.level >= 3
          ? new Date(Date.now() + 2 * 365 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ')
          : null;
        const info = d.prepare('INSERT INTO certificates (cert_no, user_id, user_name, track, level, title, exam_id, expire_at) VALUES (?,?,?,?,?,?,?,?)')
          .run(certNo, String(req.user.userId), req.user.nickname || `用户${req.user.userId}`, exam.track, exam.level, track.titles[exam.level] || '', exam.id, expireAt);
        certificate = certVo(d.prepare('SELECT * FROM certificates WHERE id = ?').get(info.lastInsertRowid));
      }
      res.json({ success: true, passed, score: got, totalScore: total, passScore: getExamConfig()[exam.level].passScore, detail, certificate });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/exams/mine', authRequired, (req, res) => {
    try {
      const rows = getDb().prepare('SELECT * FROM exams WHERE user_id = ? ORDER BY id DESC LIMIT 50').all(String(req.user.userId));
      res.json({
        success: true,
        exams: rows.map(r => ({
          id: String(r.id), track: r.track, trackName: (TRACKS[r.track] || {}).name || r.track,
          level: r.level, score: r.score, passed: !!r.passed, startedAt: r.started_at, submittedAt: r.submitted_at,
        })),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ---------- P6-F 证书 ----------
  router.get('/certificates/mine', authRequired, (req, res) => {
    try {
      const rows = getDb().prepare('SELECT * FROM certificates WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(String(req.user.userId));
      res.json({ success: true, certificates: rows.map(certVo) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 公开验真（无需登录）
  router.get('/certificates/verify/:certNo', (req, res) => {
    try {
      const row = getDb().prepare('SELECT * FROM certificates WHERE cert_no = ?').get(String(req.params.certNo).trim().toUpperCase());
      if (!row) return res.status(404).json({ success: false, valid: false, error: '证书编号不存在，请核对后重试' });
      const expired = row.expire_at && new Date(row.expire_at) < new Date();
      const vo = certVo(row);
      res.json({
        success: true,
        valid: row.status === 'valid' && !expired,
        certificate: { ...vo, status: expired ? 'expired' : vo.status },
        message: expired ? '该证书已过复核期，需完成复核考试恢复效力' : (row.status === 'valid' ? '证书有效' : '该证书已失效'),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ---------- 学习进度 ----------
  router.post('/progress/checkin', authRequired, (req, res) => {
    try {
      const { track, chapter } = req.body;
      if (!track || !chapter) return res.status(400).json({ success: false, error: '参数错误' });
      getDb().prepare(`INSERT INTO study_progress (user_id, track, chapter, completed, updated_at) VALUES (?,?,?,1,datetime('now','localtime'))
        ON CONFLICT(user_id, track, chapter) DO UPDATE SET completed=1, updated_at=datetime('now','localtime')`)
        .run(String(req.user.userId), track, String(chapter).slice(0, 80));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/progress', authRequired, (req, res) => {
    try {
      const { track } = req.query;
      const rows = track
        ? getDb().prepare('SELECT * FROM study_progress WHERE user_id = ? AND track = ?').all(String(req.user.userId), track)
        : getDb().prepare('SELECT * FROM study_progress WHERE user_id = ?').all(String(req.user.userId));
      res.json({ success: true, progress: rows.map(r => ({ track: r.track, chapter: r.chapter, completedAt: r.updated_at })) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ---------- 错题本 ----------
  router.get('/wrong-answers', authRequired, (req, res) => {
    try {
      const d = getDb();
      const rows = d.prepare(`SELECT w.*, q.stem, q.options, q.answer, q.analysis, q.type, q.track FROM wrong_answers w JOIN questions q ON q.id = w.question_id WHERE w.user_id = ? ORDER BY w.id DESC LIMIT 200`).all(String(req.user.userId));
      res.json({
        success: true,
        wrongs: rows.map(r => ({
          id: String(r.id), questionId: String(r.question_id), myAnswer: r.my_answer, type: r.type,
          track: r.track, stem: r.stem, options: JSON.parse(r.options || '[]'), answer: r.answer,
          analysis: r.analysis, createdAt: r.created_at,
        })),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ---------- P6-I 机构学习空间 SaaS（v25.0.22） ----------
  function orgVo(o, extra = {}) {
    return {
      id: String(o.id), name: o.name, type: o.type, logo: o.logo, intro: o.intro, notice: o.notice,
      ownerId: o.owner_id, status: o.status, tier: o.tier, memberLimit: o.member_limit,
      expireAt: o.expire_at, createdAt: o.created_at, ...extra,
    };
  }

  function myOrgRole(d, orgId, userId) {
    const m = d.prepare('SELECT role FROM org_members WHERE org_id=? AND user_id=?').get(orgId, String(userId));
    return m ? m.role : '';
  }

  // 机构入驻申请
  router.post('/orgs/apply', authRequired, (req, res) => {
    try {
      const { name, type = 'commercial', intro = '', logo = '' } = req.body;
      if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: '请填写机构名称' });
      if (!['public', 'commercial'].includes(type)) return res.status(400).json({ success: false, error: '机构类型无效' });
      const d = getDb();
      const dup = d.prepare(`SELECT id FROM organizations WHERE name=? AND status != 'rejected'`).get(String(name).trim());
      if (dup) return res.status(400).json({ success: false, error: '该机构名称已存在' });
      const tiers = JSON.parse((d.prepare(`SELECT value_json FROM loc_configs WHERE key='org_tiers'`).get() || { value_json: '[]' }).value_json);
      const tier = type === 'public' ? 'free' : 'biz50';
      const limit = (tiers.find(x => x.key === tier) || {}).memberLimit || 50;
      const info = d.prepare('INSERT INTO organizations (name, type, logo, intro, owner_id, status, tier, member_limit) VALUES (?,?,?,?,?,?,?,?)')
        .run(String(name).trim().slice(0, 50), type, String(logo).slice(0, 500), String(intro).slice(0, 1000),
          String(req.user.userId), 'pending', tier, limit);
      d.prepare('INSERT INTO org_members (org_id, user_id, role) VALUES (?,?,?)').run(Number(info.lastInsertRowid), String(req.user.userId), 'owner');
      res.json({ success: true, orgId: String(info.lastInsertRowid), message: '入驻申请已提交，等待平台审核' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 平台审核机构（通过/驳回 + 档位配置）
  router.post('/orgs/:id/review', adminRequired, (req, res) => {
    try {
      const { action, tier = '' } = req.body;
      if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, error: '未知操作' });
      const d = getDb();
      const org = d.prepare('SELECT * FROM organizations WHERE id=?').get(parseInt(req.params.id, 10));
      if (!org) return res.status(404).json({ success: false, error: '机构不存在' });
      let memberLimit = org.member_limit;
      if (action === 'approve' && tier) {
        const tiers = JSON.parse((d.prepare(`SELECT value_json FROM loc_configs WHERE key='org_tiers'`).get() || { value_json: '[]' }).value_json);
        const t = tiers.find(x => x.key === tier);
        if (t) memberLimit = t.memberLimit;
      }
      d.prepare(`UPDATE organizations SET status=?, tier=?, member_limit=? WHERE id=?`)
        .run(action === 'approve' ? 'active' : 'rejected', tier || org.tier, memberLimit, org.id);
      d.prepare('INSERT INTO loc_op_logs (admin_id, action, target, detail) VALUES (?,?,?,?)')
        .run('admin', `org_${action}`, `org#${org.id}`, `${org.name} tier=${tier || org.tier}`);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 我管理的机构 / 公开机构列表（管理员 ?all=1 可见全部含待审核，供 LOC 机构审核）
  router.get('/orgs', authRequired, (req, res) => {
    try {
      const d = getDb();
      const { mine = '', all = '' } = req.query;
      const me = String(req.user.userId);
      let rows;
      if (mine === '1') {
        rows = d.prepare(`SELECT o.*, (SELECT COUNT(*) FROM org_members m WHERE m.org_id=o.id) member_count FROM organizations o JOIN org_members m ON m.org_id=o.id WHERE m.user_id=? AND m.role IN ('owner','admin') ORDER BY o.id DESC`).all(me);
      } else if (all === '1' && isAdmin(req)) {
        rows = d.prepare(`SELECT o.*, (SELECT COUNT(*) FROM org_members m WHERE m.org_id=o.id) member_count FROM organizations o ORDER BY o.id DESC LIMIT 200`).all();
      } else {
        rows = d.prepare(`SELECT o.*, (SELECT COUNT(*) FROM org_members m WHERE m.org_id=o.id) member_count FROM organizations o WHERE o.status='active' ORDER BY o.id DESC LIMIT 50`).all();
      }
      res.json({ success: true, orgs: rows.map(o => orgVo(o, { memberCount: o.member_count })) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 机构详情（成员可见完整信息）
  router.get('/orgs/:id', authRequired, (req, res) => {
    try {
      const d = getDb();
      const org = d.prepare('SELECT * FROM organizations WHERE id=?').get(parseInt(req.params.id, 10));
      if (!org) return res.status(404).json({ success: false, error: '机构不存在' });
      const role = myOrgRole(d, org.id, req.user.userId);
      if (org.status !== 'active' && !role && !isAdmin(req)) return res.status(403).json({ success: false, error: '机构未开放' });
      const memberCount = d.prepare('SELECT COUNT(*) c FROM org_members WHERE org_id=?').get(org.id).c;
      const materialCount = d.prepare(`SELECT COUNT(*) c FROM materials WHERE org_id=? AND visibility='ORG'`).get(org.id).c;
      res.json({ success: true, org: orgVo(org, { memberCount, materialCount, myRole: role || (isAdmin(req) ? 'admin' : '') }) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 生成邀请码（机构管理员）
  router.post('/orgs/:id/invite-code', authRequired, (req, res) => {
    try {
      const d = getDb();
      const orgId = parseInt(req.params.id, 10);
      const role = myOrgRole(d, orgId, req.user.userId);
      if (!['owner', 'admin'].includes(role) && !isAdmin(req)) return res.status(403).json({ success: false, error: '需要机构管理员权限' });
      const code = `YD${orgId}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      d.prepare('INSERT INTO org_invite_codes (org_id, code) VALUES (?,?)').run(orgId, code);
      res.json({ success: true, code });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 凭邀请码加入机构
  router.post('/orgs/join', authRequired, (req, res) => {
    try {
      const { code = '' } = req.body;
      const d = getDb();
      const inv = d.prepare(`SELECT i.* FROM org_invite_codes i JOIN organizations o ON o.id=i.org_id WHERE i.code=? AND o.status='active'`).get(String(code).trim().toUpperCase());
      if (!inv) return res.status(400).json({ success: false, error: '邀请码无效' });
      const org = d.prepare('SELECT * FROM organizations WHERE id=?').get(inv.org_id);
      const count = d.prepare('SELECT COUNT(*) c FROM org_members WHERE org_id=?').get(inv.org_id).c;
      if (count >= org.member_limit) return res.status(400).json({ success: false, error: '机构成员已满' });
      d.prepare('INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES (?,?,?)').run(inv.org_id, String(req.user.userId), 'member');
      d.prepare('UPDATE org_invite_codes SET uses=uses+1 WHERE id=?').run(inv.id);
      res.json({ success: true, orgId: String(inv.org_id), message: `已加入「${org.name}」` });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 机构成员列表（管理员）
  router.get('/orgs/:id/members', authRequired, (req, res) => {
    try {
      const d = getDb();
      const orgId = parseInt(req.params.id, 10);
      const role = myOrgRole(d, orgId, req.user.userId);
      if (!['owner', 'admin'].includes(role) && !isAdmin(req)) return res.status(403).json({ success: false, error: '需要机构管理员权限' });
      const rows = d.prepare(`SELECT m.*, (SELECT COUNT(*) FROM study_progress p WHERE p.user_id=m.user_id) checkins,
        (SELECT COUNT(*) FROM exams e WHERE e.user_id=m.user_id AND e.passed=1) passes FROM org_members m WHERE m.org_id=? ORDER BY m.joined_at DESC`).all(orgId);
      res.json({ success: true, members: rows.map(m => ({ userId: m.user_id, role: m.role, joinedAt: m.joined_at, checkins: m.checkins, passes: m.passes })) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 机构内部排行榜（学习时长/考试/打卡）
  router.get('/orgs/:id/ranking', authRequired, (req, res) => {
    try {
      const d = getDb();
      const orgId = parseInt(req.params.id, 10);
      const role = myOrgRole(d, orgId, req.user.userId);
      if (!role && !isAdmin(req)) return res.status(403).json({ success: false, error: '仅机构成员可见' });
      const rows = d.prepare(`SELECT m.user_id,
        (SELECT COUNT(*) FROM study_progress p WHERE p.user_id=m.user_id) checkins,
        (SELECT COALESCE(AVG(e.score),0) FROM exams e WHERE e.user_id=m.user_id) avgScore,
        (SELECT COUNT(*) FROM exams e WHERE e.user_id=m.user_id AND e.passed=1) passes
        FROM org_members m WHERE m.org_id=? ORDER BY checkins DESC, avgScore DESC LIMIT 100`).all(orgId);
      res.json({ success: true, ranking: rows });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 机构收益明细（管理员）
  router.get('/orgs/:id/earnings', authRequired, (req, res) => {
    try {
      const d = getDb();
      const orgId = parseInt(req.params.id, 10);
      const role = myOrgRole(d, orgId, req.user.userId);
      if (!['owner', 'admin'].includes(role) && !isAdmin(req)) return res.status(403).json({ success: false, error: '需要机构管理员权限' });
      const rows = d.prepare('SELECT * FROM org_earnings WHERE org_id=? ORDER BY id DESC LIMIT 200').all(orgId);
      const total = d.prepare('SELECT COALESCE(SUM(amount),0) s FROM org_earnings WHERE org_id=?').get(orgId).s;
      res.json({ success: true, total, earnings: rows.map(e => ({ id: String(e.id), userId: e.user_id, source: e.source, amount: e.amount, note: e.note, createdAt: e.created_at })) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ---------- P6-J 学习运营中心 LOC（v25.0.22，配置实时生效+操作留痕） ----------
  const LOC_KEYS = ['exam_config', 'org_tiers', 'commission_rules', 'points_rules', 'learning_paths', 'track_titles'];

  router.get('/loc/config', adminRequired, (req, res) => {
    try {
      const rows = getDb().prepare('SELECT * FROM loc_configs').all();
      const cfg = {};
      for (const r of rows) { try { cfg[r.key] = JSON.parse(r.value_json); } catch { cfg[r.key] = r.value_json; } }
      if (!cfg.exam_config) cfg.exam_config = EXAM_CONFIG_DEFAULT;
      res.json({ success: true, config: cfg, editableKeys: LOC_KEYS });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.put('/loc/config', adminRequired, (req, res) => {
    try {
      const { key, value } = req.body;
      if (!LOC_KEYS.includes(key)) return res.status(400).json({ success: false, error: `不支持的配置项：${key}` });
      const d = getDb();
      d.prepare(`INSERT INTO loc_configs (key, value_json, updated_by, updated_at) VALUES (?,?,?,datetime('now','localtime'))
        ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
        .run(key, JSON.stringify(value), String(req.user ? req.user.userId : 'admin'));
      d.prepare('INSERT INTO loc_op_logs (admin_id, action, target, detail) VALUES (?,?,?,?)')
        .run(String(req.user ? req.user.userId : 'admin'), 'loc_config_update', key, JSON.stringify(value).slice(0, 500));
      res.json({ success: true, message: '配置已保存，实时生效' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/loc/op-logs', adminRequired, (req, res) => {
    try {
      const rows = getDb().prepare('SELECT * FROM loc_op_logs ORDER BY id DESC LIMIT 100').all();
      res.json({ success: true, logs: rows.map(l => ({ id: String(l.id), adminId: l.admin_id, action: l.action, target: l.target, detail: l.detail, createdAt: l.created_at })) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 数据看板：学习/题库/考试/AI 调用统计
  router.get('/loc/dashboard', adminRequired, (req, res) => {
    try {
      const d = getDb();
      const one = (sql, ...p) => d.prepare(sql).get(...p);
      res.json({
        success: true,
        dashboard: {
          materials: one('SELECT COUNT(*) c FROM materials').c,
          knowledgePoints: one('SELECT COUNT(*) c FROM knowledge_points').c,
          questions: one(`SELECT COUNT(*) c FROM questions WHERE status='approved'`).c,
          exams: one('SELECT COUNT(*) c FROM exams').c,
          examPasses: one('SELECT COUNT(*) c FROM exams WHERE passed=1').c,
          certificates: one('SELECT COUNT(*) c FROM certificates').c,
          checkins: one('SELECT COUNT(*) c FROM study_progress').c,
          orgs: one(`SELECT COUNT(*) c FROM organizations WHERE status='active'`).c,
          orgMembers: one('SELECT COUNT(*) c FROM org_members').c,
          aiCalls: one('SELECT COUNT(*) c FROM ai_call_logs').c,
          aiTokensIn: one('SELECT COALESCE(SUM(tokens_in),0) s FROM ai_call_logs').s,
          aiTokensOut: one('SELECT COALESCE(SUM(tokens_out),0) s FROM ai_call_logs').s,
          aiByScene: d.prepare(`SELECT scene, COUNT(*) calls, SUM(tokens_in+tokens_out) tokens FROM ai_call_logs GROUP BY scene ORDER BY calls DESC`).all(),
          aiByDay: d.prepare(`SELECT date(created_at) day, COUNT(*) calls FROM ai_call_logs WHERE created_at >= datetime('now','localtime','-30 days') GROUP BY day ORDER BY day`).all(),
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

module.exports = { createRouter };
