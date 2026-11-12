'use strict';

const crypto = require('crypto');

const pending = new Map();
const DAILY_READ_LIMIT = Math.max(1, Math.min(100, Number(process.env.STUDY_EXPLANATION_DAILY_LIMIT) || 20));
const DAILY_GENERATION_LIMIT = Math.max(1, Math.min(500, Number(process.env.STUDY_EXPLANATION_GENERATION_LIMIT) || 100));

function mountQuestionStudyExplanationRoutes(router, { getDb, callAI, canReadQuestion }) {
  // The main academy router is also loaded by isolated review tools. Keep the
  // auth database's schema initialization out of that router's startup path.
  const authenticate = (req, res, next) => require('./middleware/auth').authMiddleware(req, res, next);
  router.post('/questions/:id/study-explanation', authenticate, async (req, res) => {
    try {
    const { getMembershipFromDB, getAIQuotaFromDB, consumeAIQuotaInDB, beijingToday } = require('./middleware/auth');
    const questionId = Number(req.params.id);
    if (!Number.isSafeInteger(questionId) || questionId <= 0) return res.status(400).json({ success: false, error: '题目编号无效' });
    const membership = getMembershipFromDB(String(req.user.userId));
    if (!membership.isActive || !['monthly', 'quarterly', 'yearly', 'lifetime'].includes(membership.level)) {
      return res.status(403).json({ success: false, code: 'MEMBERSHIP_REQUIRED', error: 'AI 题目讲解需有效会员权益' });
    }
    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS question_study_explanations (
      question_id INTEGER PRIMARY KEY, source_hash TEXT NOT NULL, content TEXT NOT NULL, generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS question_study_explanation_access (
      user_id TEXT NOT NULL, question_id INTEGER NOT NULL, usage_date TEXT NOT NULL,
      PRIMARY KEY(user_id, question_id, usage_date)
    );
    CREATE INDEX IF NOT EXISTS idx_study_explanation_access_day ON question_study_explanation_access(user_id, usage_date);`);
    const question = db.prepare('SELECT * FROM questions WHERE id=? AND track=? AND status=?').get(questionId, 'yikao', 'approved');
    if (!question || !canReadQuestion(req, question)) return res.status(404).json({ success: false, error: '题目不存在或不可阅读' });
    const knowledge = question.knowledge_id ? db.prepare('SELECT title,content,source_text FROM knowledge_points WHERE id=? AND status=?').get(question.knowledge_id, 'approved') : null;
    const source = JSON.stringify([question.stem, question.options, question.answer, question.analysis, knowledge]);
    const sourceHash = crypto.createHash('sha256').update(source).digest('hex');
    const date = beijingToday();
    const userId = String(req.user.userId);
    const seen = db.prepare('SELECT 1 FROM question_study_explanation_access WHERE user_id=? AND question_id=? AND usage_date=?').get(userId, questionId, date);
    const used = db.prepare('SELECT COUNT(*) count FROM question_study_explanation_access WHERE user_id=? AND usage_date=?').get(userId, date).count;
    if (!seen && used >= DAILY_READ_LIMIT) return res.status(429).json({ success: false, code: 'STUDY_EXPLANATION_LIMIT', error: `今日讲解额度已用完（${DAILY_READ_LIMIT}题）` });
    let cached = db.prepare('SELECT content FROM question_study_explanations WHERE question_id=? AND source_hash=?').get(questionId, sourceHash);
    let generated = false;
    if (!cached) {
      const globalGenerated = db.prepare('SELECT COUNT(*) count FROM question_study_explanations WHERE date(generated_at, ?)=?').get('+8 hours', date).count;
      if (globalGenerated >= DAILY_GENERATION_LIMIT) return res.status(503).json({ success: false, code: 'GENERATION_CAP', error: '今日新讲解生成额度已满，请稍后再试' });
      const quota = getAIQuotaFromDB(userId);
      if (quota.remaining === 0) return res.status(429).json({ success: false, code: 'AI_QUOTA_EXCEEDED', error: '今日 AI 额度已用完' });
      let task = pending.get(questionId);
      if (!task) {
        task = (async () => {
          const prompt = `题干：${question.stem}\n选项：${question.options}\n正确答案：${question.answer}\n现有解析：${question.analysis || '无'}\n已审核知识点：${knowledge ? `${knowledge.title}\n${knowledge.content}\n引用：${knowledge.source_text || '无'}` : '无'}`;
          const content = String(await callAI('你是医考学习辅导老师。仅依据提供的题目、解析及知识点，用通俗语言解释正确选项、易错选项与复习要点；依据不足时明确说明。不得编造教材页码、临床诊断或处方。请在1200字内完成。', prompt, 'study_explanation', { kpId: question.knowledge_id || null })).trim();
          if (content.length < 40 || content.length > 6000) throw new Error('本次讲解未通过长度检查');
          db.prepare(`INSERT INTO question_study_explanations(question_id,source_hash,content) VALUES (?,?,?)
            ON CONFLICT(question_id) DO UPDATE SET source_hash=excluded.source_hash,content=excluded.content,generated_at=CURRENT_TIMESTAMP`).run(questionId, sourceHash, content);
          return content;
        })();
        pending.set(questionId, task);
        task.finally(() => { if (pending.get(questionId) === task) pending.delete(questionId); }).catch(() => {});
        generated = true;
      }
      try { cached = { content: await task }; }
      catch { return res.status(503).json({ success: false, error: '讲解生成暂不可用，请先查看题目解析与考点资料' }); }
      if (generated) {
        const quotaCharge = consumeAIQuotaInDB(userId);
        if (!quotaCharge.success) return res.status(429).json({ success: false, code: 'AI_QUOTA_EXCEEDED', error: '今日 AI 额度已用完' });
      }
    }
    db.prepare('INSERT OR IGNORE INTO question_study_explanation_access(user_id,question_id,usage_date) VALUES (?,?,?)').run(userId, questionId, date);
    const total = db.prepare('SELECT COUNT(*) count FROM question_study_explanation_access WHERE user_id=? AND usage_date=?').get(userId, date).count;
    res.set('Cache-Control', 'no-store').json({ success: true, content: cached.content, cached: !generated, remaining: Math.max(0, DAILY_READ_LIMIT - total) });
    } catch (error) {
      console.error('[study-explanation] request failed:', error);
      if (!res.headersSent) res.status(500).json({ success: false, error: '讲解暂不可用，请先查看题目解析与考点资料' });
    }
  });
}

module.exports = { mountQuestionStudyExplanationRoutes };
