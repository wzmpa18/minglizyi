// ============================================================================
// 账号注销路由模块 - v25.0.44
// FINAL-RC-02 第十九条：iOS上架要求应用内自助注销账号入口，
// 真实执行服务器删除/匿名化流程（Apple审核指南 5.1.1(v)）。
//
// 路由前缀：/api/account
// 路由列表：
//   POST /api/account/delete — 注销账号（JWT认证 + confirmText="注销" 双重确认）
//
// 注销行为（事务内执行）：
//   1. users 表 PII 匿名化：昵称/头像/简介/性别/生日/标签清空，
//      phone/email 置 NULL，password_hash 随机化（无法再登录）
//   2. deleted_at 标记注销时间（幂等加列）
//   3. user_records（排盘记录）删除、user_ratings 删除
//   4. 审计日志追加至 data/account_deletions.log
// ============================================================================

'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET || 'yandao_default_jwt_secret_2026';
const DB_PATH = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';
const AUDIT_LOG = path.join(path.dirname(DB_PATH), 'account_deletions.log');

function getDB() {
  const Database = require('better-sqlite3');
  return new Database(DB_PATH);
}

function ensureDeletedColumn(db) {
  const col = db.prepare("SELECT name FROM pragma_table_info('users') WHERE name='deleted_at'").get();
  if (!col) {
    db.prepare('ALTER TABLE users ADD COLUMN deleted_at TEXT').run();
  }
}

function appendAudit(userId, phoneMasked) {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), userId, phone: phoneMasked }) + '\n';
    fs.appendFileSync(AUDIT_LOG, line, 'utf8');
  } catch (e) {
    console.error('[accountDelete] 审计日志写入失败:', e.message);
  }
}

function createRouter() {
  const router = express.Router();

  // POST /api/account/delete
  router.post('/delete', (req, res) => {
    let db = null;
    try {
      // --- JWT 验证（与 register_routes.authMiddleware 同逻辑）---
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: '未提供有效的认证令牌，请先登录' });
      }
      const token = authHeader.split(' ')[1];
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
      }
      if (decoded.type === 'refresh') {
        return res.status(401).json({ success: false, error: '请使用 access token' });
      }
      const userId = parseInt(decoded.userId, 10);
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({ success: false, error: '认证令牌无效' });
      }

      // --- 双重确认 ---
      const confirmText = String((req.body && req.body.confirmText) || '').trim();
      if (confirmText !== '注销') {
        return res.status(400).json({
          success: false,
          error: 'CONFIRM_REQUIRED',
          message: '请在确认框中输入"注销"以确认操作',
        });
      }

      db = getDB();
      ensureDeletedColumn(db);

      const user = db.prepare('SELECT user_id, phone, deleted_at FROM users WHERE user_id = ?').get(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: '用户不存在' });
      }
      if (user.deleted_at) {
        return res.status(409).json({ success: false, error: '账号已注销，无需重复操作' });
      }

      const phoneMasked = user.phone ? String(user.phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '';
      const randomHash = crypto.randomBytes(32).toString('hex');
      const now = new Date().toISOString();

      // --- 事务：匿名化 + 关联数据删除 ---
      const tx = db.transaction(() => {
        db.prepare(`UPDATE users SET
          nickname = '已注销用户',
          avatar = '',
          bio = '',
          gender = '',
          birthday = '',
          tags = '[]',
          phone = NULL,
          email = NULL,
          password_hash = ?,
          member_level = 'basic',
          membership_expiry = NULL,
          last_login_at = NULL,
          deleted_at = ?
        WHERE user_id = ?`).run(randomHash, now, userId);

        // 排盘记录：直接删除
        try {
          db.prepare('DELETE FROM user_records WHERE user_id = ?').run(userId);
        } catch (e) { /* 表可能不存在，忽略 */ }

        // 评分记录：删除
        try {
          db.prepare('DELETE FROM user_ratings WHERE user_id = ?').run(userId);
        } catch (e) { /* ignore */ }

        // 设备档案：解绑（置空 user 关联）
        try {
          db.prepare('UPDATE device_registry SET user_id = NULL WHERE user_id = ?').run(userId);
        } catch (e) { /* ignore */ }
      });
      tx();

      appendAudit(userId, phoneMasked);
      console.log(`[accountDelete] ✅ 用户 ${userId} 已注销并匿名化 (${now})`);

      return res.json({
        success: true,
        message: '账号已注销，个人数据已删除或匿名化处理',
        deletedAt: now,
      });
    } catch (e) {
      console.error('[accountDelete] 注销失败:', e.message);
      console.error(e.stack);
      return res.status(500).json({ success: false, error: '注销失败，请稍后重试或联系客服' });
    } finally {
      if (db) {
        try { db.close(); } catch (e) { /* ignore */ }
      }
    }
  });

  return router;
}

module.exports = { createRouter };
