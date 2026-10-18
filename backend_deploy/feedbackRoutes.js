'use strict';
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const activeAccount = require('./middleware/activeAccount');
const { adminAuth, audit } = require('./adminRoles');
const router = express.Router();
const directory = process.env.FEEDBACK_DATA_DIR || path.join(__dirname, 'data', 'feedback');
const file = path.join(directory, 'feedbacks.json');
const types = new Set(['bug', 'crash', 'suggestion', 'complaint', 'other']);
const statuses = new Set(['pending', 'processing', 'resolved', 'closed']);
const read = () => {
  if (!fs.existsSync(file)) return [];
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(rows)) throw Error('Invalid feedback storage');
  return rows;
};
function write(rows) {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(rows, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(file + '.tmp', file);
}
function text(value, minimum, maximum) {
  const result = value == null ? '' : value;
  if (typeof result !== 'string' || result.trim().length < minimum || result.length > maximum || /[\x00-\x08\x0b\x0c\x0e-\x1f]|<[^>]*>/.test(result)) {
    const error = Error('请检查文字内容与长度'); error.status = 400; throw error;
  }
  return result.trim();
}
const handle = fn => (req, res) => {
  res.set('Cache-Control', 'no-store');
  try { res.json(fn(req)); }
  catch (error) { res.status(error.status || 503).json({ success: false, error: error.status ? error.message : '反馈服务暂不可用，请稍后重试' }); }
};
router.post('/submit', activeAccount, handle(req => {
  const body = req.body || {};
  if (!types.has(body.type) || body.screenshots || body.images) { const error = Error('反馈类型无效或包含不支持的附件'); error.status = 400; throw error; }
  const feedback = {
    id: 'fb_' + crypto.randomUUID(), userId: String(req.account.user_id), userName: req.account.nickname || '用户',
    type: body.type, title: text(body.title, 1, 120), description: text(body.description, 5, 2000),
    contact: text(body.contact, 0, 120), deviceInfo: text(body.deviceInfo, 0, 512), appVersion: text(body.appVersion, 0, 100),
    status: 'pending', createdAt: new Date().toISOString(),
  };
  const rows = read(), now = Date.now(), own = rows.filter(row => String(row.userId) === feedback.userId);
  if (own.filter(row => now - Date.parse(row.createdAt) < 60000).length >= 3 || own.filter(row => now - Date.parse(row.createdAt) < 86400000).length >= 20) {
    const error = Error('反馈过于频繁，请稍后再试'); error.status = 429; throw error;
  }
  rows.push(feedback); write(rows);
  return { success: true, message: '反馈提交成功', feedbackId: feedback.id };
}));
router.get('/list', activeAccount, handle(req => {
  const id = String(req.account.user_id);
  if (req.query.userId && String(req.query.userId) !== id) { const error = Error('只能查看自己的反馈'); error.status = 403; throw error; }
  return { success: true, feedbacks: read().filter(row => String(row.userId) === id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 100) };
}));
router.use('/admin', adminAuth('SUPPORT_ADMIN', 'ops'));
router.get('/admin/queue', handle(req => {
  const status = req.query.status || 'pending';
  if (status !== 'all' && !statuses.has(status)) { const error = Error('处理状态无效'); error.status = 400; throw error; }
  return { success: true, feedbacks: read().filter(row => status === 'all' || row.status === status).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 200) };
}));
router.put('/admin/:id', handle(req => {
  const body = req.body || {};
  if (!statuses.has(body.status)) { const error = Error('处理状态无效'); error.status = 400; throw error; }
  const reply = text(body.adminReply, 0, 2000), rows = read(), row = rows.find(item => item.id === req.params.id);
  if (!row) { const error = Error('反馈不存在'); error.status = 404; throw error; }
  if (body.expectedUpdatedAt !== (row.updatedAt || row.createdAt)) { const error = Error('反馈已被更新，请刷新后重试'); error.status = 409; throw error; }
  const before = row.status;
  row.status = body.status; row.adminReply = reply;
  row.updatedAt = new Date(Math.max(Date.now(), Date.parse(row.updatedAt || row.createdAt) + 1)).toISOString(); row.repliedAt = row.updatedAt;
  write(rows);
  audit(req.admin, 'FEEDBACK_REVIEW', row.id, before, { status: row.status, replyCharacters: reply.length }, '用户反馈处理', req);
  return { success: true, feedback: row };
}));
module.exports = router;
