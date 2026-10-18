'use strict';
const Database = require('better-sqlite3');
const { verifyToken } = require('./auth');
let accounts;
// Private account data must fail closed. Never create a substitute user DB.
module.exports = function activeAccount(req, res, next) {
  res.set('Cache-Control', 'no-store');
  const identity = verifyToken(req.headers.authorization || '');
  if (!identity) return res.status(401).json({ success: false, error: '请先登录' });
  try {
    if (!accounts) accounts = new Database(process.env.DB_PATH || process.env.USER_DB_PATH || '/root/backend-auth/data/yandao_users.db', { readonly: true });
    const account = accounts.prepare('SELECT user_id,nickname,status,deleted_at FROM users WHERE user_id=?').get(String(identity.userId));
    if (!account || account.deleted_at || account.status === 'banned') return res.status(403).json({ success: false, error: '账号不可用，请重新登录或联系客服' });
    req.account = account; req.user = identity; next();
  } catch { res.status(503).json({ success: false, error: '账号服务暂不可用，请稍后重试' }); }
};
