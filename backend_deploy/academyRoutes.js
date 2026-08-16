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

// ==================== 赛道与等级配置 ====================

const TRACKS = {
  tcm: { code: 'TCM', name: '中医', titles: ['', '中医学徒', '中医研究员', '中医讲师', '中医高级师', '认证大师'] },
  bazi: { code: 'BZ', name: '八字', titles: ['', '命理学徒', '命理研究员', '命理讲师', '命理高级师', '认证大师'] },
  qimen: { code: 'QM', name: '奇门', titles: ['', '奇门学徒', '奇门研究员', '奇门讲师', '奇门高级师', '认证大师'] },
  ziwei: { code: 'ZW', name: '紫微', titles: ['', '紫微学徒', '紫微研究员', '紫微讲师', '紫微高级师', '认证大师'] },
  general: { code: 'GX', name: '国学通识', titles: ['', '国学学徒', '国学研究员', '国学讲师', '国学高级师', '认证大师'] },
};

// 组卷配置：题量 / 分值 / 及格线 / 限时（分钟）/ 难度配比
const EXAM_CONFIG = {
  1: { total: 10, easy: 6, medium: 4, hard: 0, single: 6, multi: 2, judge: 2, minutes: 15, passScore: 60 },
  2: { total: 15, easy: 5, medium: 6, hard: 4, single: 8, multi: 3, judge: 2, fill: 2, minutes: 25, passScore: 70 },
  3: { total: 20, easy: 4, medium: 8, hard: 8, single: 8, multi: 4, judge: 2, fill: 3, qa: 2, case: 1, minutes: 40, passScore: 75 },
};

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
  `);
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

// ==================== AI 通道（复用 /api/ai/chat 同款配置） ====================

async function callAI(systemPrompt, userPrompt) {
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
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
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
    id: String(r.id), title: r.title, track: r.track, trackName: (TRACKS[r.track] || {}).name || r.track,
    format: r.format, grade: r.grade, status: r.status, parseNote: r.parse_note,
    uploaderId: r.uploader_id, uploaderName: r.uploader_name,
    textPreview: (r.text_content || '').slice(0, 200), createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function knowledgeVo(r) {
  return {
    id: String(r.id), materialId: r.material_id ? String(r.material_id) : '', chapter: r.chapter,
    title: r.title, content: r.content, tags: JSON.parse(r.tags || '[]'),
    difficulty: r.difficulty, status: r.status, sourceText: r.source_text, createdAt: r.created_at,
  };
}

function questionVo(r, withAnswer) {
  const vo = {
    id: String(r.id), knowledgeId: r.knowledge_id ? String(r.knowledge_id) : '',
    track: r.track, type: r.type, stem: r.stem,
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
  const track = TRACKS[r.track] || { name: r.track };
  return {
    id: String(r.id), certNo: r.cert_no, userId: r.user_id, userName: r.user_name,
    track: r.track, trackName: track.name, level: r.level, title: r.title,
    examId: r.exam_id ? String(r.exam_id) : '', issuedAt: r.issued_at,
    expireAt: r.expire_at, status: r.status,
  };
}

function nextCertNo(track, year) {
  const code = (TRACKS[track] || { code: 'GX' }).code;
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

function runParseTask(materialId, text) {
  const d = getDb();
  d.prepare(`UPDATE materials SET status='parsing', updated_at=datetime('now','localtime') WHERE id=?`).run(materialId);
  callAI(PARSE_SYSTEM, `赛道资料内容：\n${text.slice(0, 12000)}`)
    .then(content => {
      const list = extractJson(content);
      const arr = Array.isArray(list) ? list : [];
      const insert = d.prepare('INSERT INTO knowledge_points (material_id, chapter, title, content, tags, difficulty, status, source_text) VALUES (?,?,?,?,?,?,?,?)');
      let n = 0;
      for (const kp of arr.slice(0, 200)) {
        if (!kp || !kp.title) continue;
        insert.run(materialId, String(kp.chapter || '未分章').slice(0, 60), String(kp.title).slice(0, 60),
          String(kp.content || '').slice(0, 800), JSON.stringify(Array.isArray(kp.tags) ? kp.tags.slice(0, 6) : []),
          ['easy', 'medium', 'hard'].includes(kp.difficulty) ? kp.difficulty : 'easy', 'pending',
          String(kp.content || '').slice(0, 300));
        n++;
      }
      d.prepare(`UPDATE materials SET status='parsed', parse_note=?, updated_at=datetime('now','localtime') WHERE id=?`)
        .run(`AI 解析完成：提取 ${n} 个知识点，待人工审核`, materialId);
      console.log(`[Academy] 资料#${materialId} 解析完成: ${n} 个知识点`);
    })
    .catch(err => {
      d.prepare(`UPDATE materials SET status='parse_failed', parse_note=?, updated_at=datetime('now','localtime') WHERE id=?`)
        .run(`AI 解析失败：${err.message}`, materialId);
      console.error(`[Academy] 资料#${materialId} 解析失败:`, err.message);
    });
}

function runGenQuestionsTask(track, level, count) {
  const d = getDb();
  const kps = d.prepare(`SELECT * FROM knowledge_points WHERE status='approved' AND (track=? OR material_id IN (SELECT id FROM materials WHERE track=?)) ORDER BY RANDOM() LIMIT 8`)
    .all(track, track);
  const material = kps.length ? kps.map(k => `- ${k.title}：${k.content}`).join('\n') : `赛道「${(TRACKS[track] || {}).name}」基础常识`;
  const diffMap = { 1: 'easy 为主', 2: 'easy/medium 均衡', 3: 'medium/hard 为主' };
  return callAI(GENQ_SYSTEM, `目标等级：${level}级（${diffMap[level] || '均衡'}）\n生成 ${count} 道题\n知识点依据：\n${material}`)
    .then(content => {
      const list = extractJson(content);
      const arr = Array.isArray(list) ? list : [];
      const insert = d.prepare('INSERT INTO questions (knowledge_id, track, type, stem, options, answer, keywords, analysis, difficulty, status) VALUES (?,?,?,?,?,?,?,?,?,?)');
      let n = 0;
      for (const q of arr.slice(0, 50)) {
        if (!q || !q.stem || !q.type) continue;
        if (!['single', 'multi', 'judge', 'fill', 'qa', 'case'].includes(q.type)) continue;
        insert.run(kps[n % Math.max(kps.length, 1)] ? kps[n % Math.max(kps.length, 1)].id : null,
          track, q.type, String(q.stem).slice(0, 1000),
          JSON.stringify(Array.isArray(q.options) ? q.options.slice(0, 6).map(o => String(o).slice(0, 200)) : []),
          String(q.answer ?? '').slice(0, 2000),
          JSON.stringify(Array.isArray(q.keywords) ? q.keywords.slice(0, 10).map(k => String(k).slice(0, 30)) : []),
          String(q.analysis || '').slice(0, 600),
          ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'easy', 'pending');
        n++;
      }
      return n;
    });
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

  // ---------- 赛道概览（公开） ----------
  router.get('/tracks', authRequired, (req, res) => {
    try {
      const d = getDb();
      const me = String(req.user.userId);
      const tracks = Object.entries(TRACKS).map(([key, t]) => {
        const kpCount = d.prepare(`SELECT COUNT(*) AS c FROM knowledge_points WHERE status='approved' AND (track=? OR material_id IN (SELECT id FROM materials WHERE track=?))`).get(key, key).c;
        const qCount = d.prepare(`SELECT COUNT(*) AS c FROM questions WHERE status='approved' AND track=?`).get(key).c;
        const myCerts = d.prepare(`SELECT level, title, cert_no, status, issued_at, expire_at FROM certificates WHERE user_id=? AND track=? ORDER BY level DESC`).all(me, key);
        const myBest = d.prepare(`SELECT MAX(level) AS lv FROM certificates WHERE user_id=? AND track=?`).get(me, key).lv || 0;
        return {
          key, name: t.name, code: t.code,
          knowledgeCount: kpCount, questionCount: qCount,
          myLevel: myBest, myTitle: t.titles[myBest] || '', myCertificates: myCerts.map(c => ({ ...c, level: c.level, expireAt: c.expire_at })),
        };
      });
      res.json({ success: true, tracks });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ---------- P6-A 资料 ----------
  router.post('/materials', authRequired, (req, res) => {
    try {
      const { title, track, format = 'text', textContent = '', fileBase64 = '', fileName = '', grade = 'C' } = req.body;
      if (!title || !String(title).trim()) return res.status(400).json({ success: false, error: '请填写资料标题' });
      if (!TRACKS[track]) return res.status(400).json({ success: false, error: '请选择有效赛道' });
      let filePath = '';
      if (fileBase64) {
        if (!fs.existsSync(FILE_DIR)) fs.mkdirSync(FILE_DIR, { recursive: true });
        const safeName = `${Date.now()}_${String(fileName || 'file').replace(/[^\w.\-\u4e00-\u9fff]/g, '_').slice(0, 60)}`;
        filePath = path.join(FILE_DIR, safeName);
        fs.writeFileSync(filePath, Buffer.from(fileBase64.replace(/^data:[^;]+;base64,/, ''), 'base64'));
      }
      if (!textContent && !filePath) return res.status(400).json({ success: false, error: '请提供文本内容或上传文件' });
      const result = getDb().prepare('INSERT INTO materials (title, track, format, file_path, text_content, grade, status, uploader_id, uploader_name) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(String(title).trim().slice(0, 100), track, format, filePath, String(textContent).slice(0, 200000),
          ['S', 'A', 'B', 'C'].includes(grade) ? grade : 'C', 'pending', String(req.user.userId), req.user.nickname || `用户${req.user.userId}`);
      res.json({ success: true, materialId: String(result.lastInsertRowid), message: '资料已提交，等待解析与审核' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/materials', authRequired, (req, res) => {
    try {
      const d = getDb();
      const { track = '', status = '', mine = '' } = req.query;
      const me = String(req.user.userId);
      let sql = 'SELECT * FROM materials WHERE 1=1';
      const params = [];
      if (track) { sql += ' AND track = ?'; params.push(track); }
      if (mine === '1') { sql += ' AND uploader_id = ?'; params.push(me); }
      else if (isAdmin(req)) { if (status) { sql += ' AND status = ?'; params.push(status); } }
      else { sql += ` AND (status = 'approved' OR uploader_id = ?)`; params.push(me); }
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
      const { track = '', status = '', materialId = '' } = req.query;
      let sql = `SELECT k.* FROM knowledge_points k LEFT JOIN materials m ON k.material_id = m.id WHERE 1=1`;
      const params = [];
      if (track) { sql += ' AND (k.material_id IN (SELECT id FROM materials WHERE track = ?))'; params.push(track); }
      if (materialId) { sql += ' AND k.material_id = ?'; params.push(parseInt(materialId, 10)); }
      if (isAdmin(req)) { if (status) { sql += ' AND k.status = ?'; params.push(status); } }
      else { sql += ` AND k.status = 'approved'`; }
      sql += ' ORDER BY k.id DESC LIMIT 300';
      res.json({ success: true, points: d.prepare(sql).all(...params).map(knowledgeVo) });
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
      const { track = 'general', level = 1, count = 10 } = req.body;
      const n = parseInt(count, 10) || 10;
      const created = await runGenQuestionsTask(track, parseInt(level, 10) || 1, Math.min(n, 30));
      res.json({ success: true, created, message: `AI 已生成 ${created} 道题，待人工审核` });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/questions', authRequired, (req, res) => {
    try {
      const d = getDb();
      const { track = '', status = '', type = '' } = req.query;
      let sql = 'SELECT * FROM questions WHERE 1=1';
      const params = [];
      if (track) { sql += ' AND track = ?'; params.push(track); }
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
      const cfg = EXAM_CONFIG[level];
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
      const passed = got >= EXAM_CONFIG[exam.level].passScore;
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
      res.json({ success: true, passed, score: got, totalScore: total, passScore: EXAM_CONFIG[exam.level].passScore, detail, certificate });
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

  return router;
}

module.exports = { createRouter };
