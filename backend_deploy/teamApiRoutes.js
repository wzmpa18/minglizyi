/**
 * 推广团队真实数据 API - v25.0.19
 *
 * 补齐 teamApi.ts 调用的三个端点（此前 404 导致驾驶舱全 0）：
 *   GET /api/auth/invite-code   我的邀请码
 *   GET /api/auth/team/members  团队成员列表（一级/二级）
 *   GET /api/auth/team/stats    驾驶舱统计（今日/本月邀请、一级二级人数、团队总数）
 *
 * 数据来源：用户核心库（只读）users + user_invite_relation
 * 挂载路径：/api/auth（与 register_routes 同前缀，后挂载不冲突）
 */
'use strict';

const express = require('express');
const Database = require('better-sqlite3');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const USER_DB_PATH = process.env.USER_DB_PATH || '/root/backend-auth/data/yandao_users.db';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET 未配置或长度不足32位，服务拒绝启动（fail-closed）。请在部署 .env 设置 ≥32 位随机密钥。');
}

let userDb = null;
function getUserDb() {
  if (!userDb) {
    if (!fs.existsSync(USER_DB_PATH)) return null;
    userDb = new Database(USER_DB_PATH, { readonly: true });
  }
  return userDb;
}

function createRouter() {
  const router = express.Router();

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

  // GET /api/auth/invite-code
  router.get('/invite-code', authRequired, (req, res) => {
    try {
      const db = getUserDb();
      if (!db) return res.status(500).json({ success: false, error: '数据库不可用' });
      const user = db.prepare('SELECT user_id, invite_code FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ?')
        .get(req.user.userId, String(req.user.userId));
      if (!user) return res.status(404).json({ success: false, error: '用户不存在' });
      res.json({ success: true, inviteCode: user.invite_code || '', userId: String(user.user_id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/auth/team/stats
  router.get('/team/stats', authRequired, (req, res) => {
    try {
      const db = getUserDb();
      if (!db) return res.status(500).json({ success: false, error: '数据库不可用' });
      const me = String(req.user.userId);
      const total = db.prepare('SELECT COUNT(*) AS c FROM user_invite_relation WHERE inviter_id = ?').get(me).c;
      const level1 = db.prepare(`SELECT COUNT(*) AS c FROM user_invite_relation WHERE inviter_id = ? AND level = 1`).get(me).c;
      const level2 = db.prepare(`SELECT COUNT(*) AS c FROM user_invite_relation WHERE inviter_id = ? AND level = 2`).get(me).c;
      const today = db.prepare(`
        SELECT COUNT(*) AS c FROM user_invite_relation r
        JOIN users u ON CAST(u.user_id AS TEXT) = r.invitee_id
        WHERE r.inviter_id = ? AND date(u.created_at) = date('now','localtime')
      `).get(me).c;
      const month = db.prepare(`
        SELECT COUNT(*) AS c FROM user_invite_relation r
        JOIN users u ON CAST(u.user_id AS TEXT) = r.invitee_id
        WHERE r.inviter_id = ? AND strftime('%Y-%m', u.created_at) = strftime('%Y-%m','now','localtime')
      `).get(me).c;
      res.json({
        success: true,
        stats: {
          todayInvited: today,
          monthInvited: month,
          level1Count: level1,
          level2Count: level2,
          teamTotal: total,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/auth/team/members?level=1|2|all
  router.get('/team/members', authRequired, (req, res) => {
    try {
      const db = getUserDb();
      if (!db) return res.status(500).json({ success: false, error: '数据库不可用' });
      const me = String(req.user.userId);
      const level = req.query.level || 'all';
      let sql = `
        SELECT r.invitee_id, r.level, u.nickname, u.avatar, u.member_level, u.created_at, u.last_login_at
        FROM user_invite_relation r
        LEFT JOIN users u ON CAST(u.user_id AS TEXT) = r.invitee_id
        WHERE r.inviter_id = ?
      `;
      const params = [me];
      if (level === '1' || level === '2') {
        sql += ' AND r.level = ?';
        params.push(String(level));
      }
      sql += ' ORDER BY r.id DESC LIMIT 200';
      const rows = db.prepare(sql).all(...params);
      res.json({
        success: true,
        members: rows.map(r => ({
          userId: String(r.invitee_id || ''),
          nickname: r.nickname || `用户${r.invitee_id}`,
          avatar: r.avatar || '',
          memberLevel: r.member_level || 'basic',
          level: r.level,
          joinedAt: r.created_at || '',
          lastLoginAt: r.last_login_at || '',
        })),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

module.exports = { createRouter };
