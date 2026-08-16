/**
 * 社交体系后端 API - v25.0.19
 *
 * 目标：把「动态广场 / 评论 / 点赞 / 关注 / 好友请求 / 好友关系 / 私聊 / 群聊 / 消息通知」
 * 从单机 localStorage 升级为真实多人互通的后端服务。
 *
 * 存储：独立 SQLite 文件 data/social.db（与用户核心库物理隔离，业务表独立命名）
 * 用户信息：只读连接用户核心库（/root/backend-auth/data/yandao_users.db）查询 users 表
 * 认证：JWT authMiddleware（与 register_routes 同密钥），游客只读列表
 */
'use strict';

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const SOCIAL_DB_PATH = path.join(__dirname, 'data', 'social.db');
const USER_DB_PATH = process.env.USER_DB_PATH || '/root/backend-auth/data/yandao_users.db';
const JWT_SECRET = process.env.JWT_SECRET || 'yandao_default_jwt_secret_change_me';

function ensureDataDir() {
  const dir = path.dirname(SOCIAL_DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let db = null;
function getDb() {
  if (!db) {
    ensureDataDir();
    db = new Database(SOCIAL_DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables(db);
  }
  return db;
}

let userDb = null;
function getUserDb() {
  if (!userDb) {
    if (!fs.existsSync(USER_DB_PATH)) return null;
    userDb = new Database(USER_DB_PATH, { readonly: true });
  }
  return userDb;
}

function initTables(d) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id TEXT UNIQUE,
      user_id TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      content TEXT NOT NULL,
      images TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      tool_type TEXT DEFAULT '',
      like_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

    CREATE TABLE IF NOT EXISTS likes (
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL,
      followed_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (follower_id, followed_id)
    );

    CREATE TABLE IF NOT EXISTS friend_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      from_name TEXT DEFAULT '',
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_freq_to ON friend_requests(to_id, status);

    CREATE TABLE IF NOT EXISTS friendships (
      user_a TEXT NOT NULL,
      user_b TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (user_a, user_b)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT DEFAULT '',
      content TEXT NOT NULL,
      msg_type TEXT DEFAULT 'text',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_chat_conv ON chat_messages(conversation_id, id);

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      owner_name TEXT DEFAULT '',
      announcement TEXT DEFAULT '',
      member_ids TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      actor_id TEXT DEFAULT '',
      actor_name TEXT DEFAULT '',
      content TEXT DEFAULT '',
      link TEXT DEFAULT '',
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read, id DESC);
  `);
}

// ==================== 认证 ====================

function authOptional(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.headers['x-access-token'] || '');
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch { /* 游客 */ }
  }
  next();
}

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

function userPublicInfo(userId) {
  const udb = getUserDb();
  if (udb) {
    try {
      const row = udb.prepare('SELECT user_id, nickname, avatar, bio, member_level FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ?').get(userId, String(userId));
      if (row) {
        return {
          userId: String(row.user_id),
          nickname: row.nickname || `国学爱好者${String(row.user_id).slice(-4)}`,
          avatar: row.avatar || '',
          bio: row.bio || '',
          memberLevel: row.member_level || 'basic',
        };
      }
    } catch (e) {
      console.error('[SocialApi] userPublicInfo error:', e.message);
    }
  }
  return null;
}

function notify(userId, type, actor, content, link) {
  getDb().prepare('INSERT INTO notifications (user_id, type, actor_id, actor_name, content, link) VALUES (?,?,?,?,?,?)')
    .run(String(userId), type, String(actor.userId || ''), actor.nickname || '', content || '', link || '');
}

function friendKeyPair(a, b) {
  const x = String(a), y = String(b);
  return x < y ? [x, y] : [y, x];
}

function privateConvId(a, b) {
  const [x, y] = friendKeyPair(a, b);
  return `private:${x}:${y}`;
}

function rowToPost(row, currentUserId) {
  let liked = false;
  if (currentUserId) {
    liked = !!getDb().prepare('SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?').get(row.post_id, String(currentUserId));
  }
  return {
    id: row.post_id,
    postId: row.post_id,
    authorId: row.user_id,
    authorName: row.nickname,
    authorAvatar: row.avatar,
    content: row.content,
    images: JSON.parse(row.images || '[]'),
    tags: JSON.parse(row.tags || '[]'),
    toolType: row.tool_type,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    liked,
    createdAt: row.created_at,
  };
}

function createRouter() {
  const router = express.Router();
  router.use(express.json({ limit: '6mb' }));

  // ==================== 动态广场 ====================

  // GET /api/social/posts?tag=&cursor=&limit=
  router.get('/posts', authOptional, (req, res) => {
    try {
      const d = getDb();
      const { tag = '', cursor = 0, limit = 20 } = req.query;
      const lim = Math.min(parseInt(limit, 10) || 20, 50);
      const cur = parseInt(cursor, 10) || 0;
      let rows;
      if (tag) {
        rows = d.prepare(`SELECT * FROM posts WHERE status='active' AND tags LIKE ? AND id < ? ORDER BY id DESC LIMIT ?`)
          .all(`%"${tag}"%`, cur, lim);
      } else {
        rows = d.prepare(`SELECT * FROM posts WHERE status='active' AND id < ? ORDER BY id DESC LIMIT ?`).all(cur, lim);
      }
      const currentUserId = req.user ? String(req.user.userId) : '';
      const posts = rows.map(r => rowToPost(r, currentUserId));
      const nextCursor = rows.length === lim ? rows[rows.length - 1].id : 0;
      res.json({ success: true, posts, nextCursor });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/social/posts/mine
  router.get('/posts/mine', authRequired, (req, res) => {
    try {
      const d = getDb();
      const rows = d.prepare(`SELECT * FROM posts WHERE user_id = ? AND status != 'deleted' ORDER BY id DESC LIMIT 100`).all(String(req.user.userId));
      res.json({ success: true, posts: rows.map(r => rowToPost(r, String(req.user.userId))) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/posts  { content, images, tags, toolType }
  router.post('/posts', authRequired, (req, res) => {
    try {
      const { content, images = [], tags = [], toolType = '' } = req.body;
      if (!content || !String(content).trim()) {
        return res.status(400).json({ success: false, error: '动态内容不能为空' });
      }
      const info = userPublicInfo(req.user.userId) || { nickname: '国学爱好者', avatar: '' };
      const postId = `p${Date.now()}${Math.floor(Math.random() * 1000)}`;
      getDb().prepare(`INSERT INTO posts (post_id, user_id, nickname, avatar, content, images, tags, tool_type) VALUES (?,?,?,?,?,?,?,?)`)
        .run(postId, String(req.user.userId), info.nickname, info.avatar, String(content).trim().slice(0, 5000),
          JSON.stringify(Array.isArray(images) ? images.slice(0, 9) : []),
          JSON.stringify(Array.isArray(tags) ? tags.slice(0, 5) : []),
          String(toolType || '').slice(0, 40));
      const row = getDb().prepare('SELECT * FROM posts WHERE post_id = ?').get(postId);
      res.json({ success: true, post: rowToPost(row, String(req.user.userId)) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/social/posts/:postId
  router.get('/posts/:postId', authOptional, (req, res) => {
    try {
      const row = getDb().prepare(`SELECT * FROM posts WHERE post_id = ? AND status='active'`).get(req.params.postId);
      if (!row) return res.status(404).json({ success: false, error: '动态不存在' });
      const currentUserId = req.user ? String(req.user.userId) : '';
      res.json({ success: true, post: rowToPost(row, currentUserId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // DELETE /api/social/posts/:postId（作者本人）
  router.delete('/posts/:postId', authRequired, (req, res) => {
    try {
      const row = getDb().prepare('SELECT * FROM posts WHERE post_id = ?').get(req.params.postId);
      if (!row) return res.status(404).json({ success: false, error: '动态不存在' });
      if (String(row.user_id) !== String(req.user.userId)) {
        return res.status(403).json({ success: false, error: '只能删除自己的动态' });
      }
      getDb().prepare(`UPDATE posts SET status='deleted' WHERE post_id = ?`).run(req.params.postId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/posts/:postId/like
  router.post('/posts/:postId/like', authRequired, (req, res) => {
    try {
      const d = getDb();
      const postId = req.params.postId;
      const uid = String(req.user.userId);
      const post = d.prepare(`SELECT * FROM posts WHERE post_id = ?`).get(postId);
      if (!post) return res.status(404).json({ success: false, error: '动态不存在' });
      const existing = d.prepare('SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?').get(postId, uid);
      if (existing) {
        d.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(postId, uid);
        d.prepare('UPDATE posts SET like_count = MAX(0, like_count - 1) WHERE post_id = ?').run(postId);
      } else {
        d.prepare('INSERT INTO likes (post_id, user_id) VALUES (?,?)').run(postId, uid);
        d.prepare('UPDATE posts SET like_count = like_count + 1 WHERE post_id = ?').run(postId);
        if (String(post.user_id) !== uid) {
          const info = userPublicInfo(uid) || { nickname: '有人' };
          notify(post.user_id, 'like', { userId: uid, nickname: info.nickname }, '赞了你的动态', `/discover/${postId}`);
        }
      }
      const updated = d.prepare('SELECT like_count FROM posts WHERE post_id = ?').get(postId);
      res.json({ success: true, liked: !existing, likeCount: updated.like_count });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/social/posts/:postId/comments
  router.get('/posts/:postId/comments', (_req, res) => {
    try {
      const rows = getDb().prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY id ASC LIMIT 200').all(req.params.postId);
      res.json({
        success: true,
        comments: rows.map(r => ({ id: String(r.id), postId: r.post_id, authorId: r.user_id, authorName: r.nickname, content: r.content, createdAt: r.created_at })),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/posts/:postId/comments { content }
  router.post('/posts/:postId/comments', authRequired, (req, res) => {
    try {
      const { content } = req.body;
      if (!content || !String(content).trim()) return res.status(400).json({ success: false, error: '评论内容不能为空' });
      const d = getDb();
      const post = d.prepare(`SELECT * FROM posts WHERE post_id = ?`).get(req.params.postId);
      if (!post) return res.status(404).json({ success: false, error: '动态不存在' });
      const info = userPublicInfo(req.user.userId) || { nickname: '国学爱好者' };
      const result = d.prepare('INSERT INTO comments (post_id, user_id, nickname, content) VALUES (?,?,?,?)')
        .run(req.params.postId, String(req.user.userId), info.nickname, String(content).trim().slice(0, 1000));
      d.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE post_id = ?').run(req.params.postId);
      if (String(post.user_id) !== String(req.user.userId)) {
        notify(post.user_id, 'comment', { userId: req.user.userId, nickname: info.nickname }, `评论了你的动态：${String(content).trim().slice(0, 30)}`, `/discover/${req.params.postId}`);
      }
      const row = d.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
      res.json({ success: true, comment: { id: String(row.id), postId: row.post_id, authorId: row.user_id, authorName: row.nickname, content: row.content, createdAt: row.created_at } });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ==================== 关注 ====================

  router.post('/follow/:userId', authRequired, (req, res) => {
    try {
      const d = getDb();
      const target = String(req.params.userId);
      const me = String(req.user.userId);
      if (target === me) return res.status(400).json({ success: false, error: '不能关注自己' });
      const existing = d.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?').get(me, target);
      if (existing) {
        d.prepare('DELETE FROM follows WHERE follower_id = ? AND followed_id = ?').run(me, target);
        return res.json({ success: true, following: false });
      }
      d.prepare('INSERT INTO follows (follower_id, followed_id) VALUES (?,?)').run(me, target);
      const info = userPublicInfo(me) || { nickname: '有人' };
      notify(target, 'follow', { userId: me, nickname: info.nickname }, '关注了你', '/friends');
      res.json({ success: true, following: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/follow/status/:userId', authRequired, (req, res) => {
    try {
      const row = getDb().prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?').get(String(req.user.userId), String(req.params.userId));
      res.json({ success: true, following: !!row });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ==================== 好友 ====================

  // POST /api/social/friends/request { toId, message }
  router.post('/friends/request', authRequired, (req, res) => {
    try {
      const { toId, message = '' } = req.body;
      const me = String(req.user.userId);
      const target = String(toId || '');
      if (!target || target === me) return res.status(400).json({ success: false, error: '参数错误' });
      const d = getDb();
      const [a, b] = friendKeyPair(me, target);
      if (d.prepare('SELECT 1 FROM friendships WHERE user_a = ? AND user_b = ?').get(a, b)) {
        return res.json({ success: false, error: '你们已经是好友了' });
      }
      const pending = d.prepare(`SELECT * FROM friend_requests WHERE from_id = ? AND to_id = ? AND status = 'pending'`).get(me, target);
      if (pending) return res.json({ success: false, error: '已发送过请求，等待对方处理' });
      const reverse = d.prepare(`SELECT * FROM friend_requests WHERE from_id = ? AND to_id = ? AND status = 'pending'`).get(target, me);
      if (reverse) {
        // 对方向我发过请求：直接互加好友
        d.prepare(`UPDATE friend_requests SET status='accepted', updated_at=datetime('now','localtime') WHERE id = ?`).run(reverse.id);
        d.prepare('INSERT OR IGNORE INTO friendships (user_a, user_b) VALUES (?,?)').run(a, b);
        return res.json({ success: true, autoAccepted: true, message: '对方已向你发送请求，已自动成为好友' });
      }
      const info = userPublicInfo(me) || { nickname: '国学爱好者' };
      const result = d.prepare('INSERT INTO friend_requests (from_id, to_id, from_name, message) VALUES (?,?,?,?)')
        .run(me, target, info.nickname, String(message).slice(0, 200));
      notify(target, 'friend_request', { userId: me, nickname: info.nickname }, `请求添加你为好友${message ? '：' + String(message).slice(0, 50) : ''}`, '/friends/requests');
      res.json({ success: true, requestId: String(result.lastInsertRowid) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/social/friends/requests（我收到的 pending 请求）
  router.get('/friends/requests', authRequired, (req, res) => {
    try {
      const rows = getDb().prepare(`SELECT * FROM friend_requests WHERE to_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 100`).all(String(req.user.userId));
      res.json({
        success: true,
        requests: rows.map(r => ({ id: String(r.id), fromId: r.from_id, fromName: r.from_name, message: r.message, createdAt: r.created_at })),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/friends/requests/:id/accept | /reject
  router.post('/friends/requests/:id/:action', authRequired, (req, res) => {
    try {
      const d = getDb();
      const row = d.prepare('SELECT * FROM friend_requests WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row || String(row.to_id) !== String(req.user.userId)) {
        return res.status(404).json({ success: false, error: '请求不存在' });
      }
      if (row.status !== 'pending') return res.status(400).json({ success: false, error: '该请求已处理' });
      const action = req.params.action;
      if (action !== 'accept' && action !== 'reject') return res.status(400).json({ success: false, error: '未知操作' });
      d.prepare(`UPDATE friend_requests SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?`)
        .run(action === 'accept' ? 'accepted' : 'rejected', row.id);
      if (action === 'accept') {
        const [a, b] = friendKeyPair(row.from_id, row.to_id);
        d.prepare('INSERT OR IGNORE INTO friendships (user_a, user_b) VALUES (?,?)').run(a, b);
        const info = userPublicInfo(req.user.userId) || { nickname: '对方' };
        notify(row.from_id, 'friend_accepted', { userId: req.user.userId, nickname: info.nickname }, '已通过你的好友请求', '/friends');
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/social/friends/list
  router.get('/friends/list', authRequired, (req, res) => {
    try {
      const me = String(req.user.userId);
      const rows = getDb().prepare('SELECT * FROM friendships WHERE user_a = ? OR user_b = ?').all(me, me);
      const friends = rows.map(r => {
        const friendId = r.user_a === me ? r.user_b : r.user_a;
        const info = userPublicInfo(friendId);
        return {
          userId: friendId,
          nickname: info ? info.nickname : `用户${friendId}`,
          avatar: info ? info.avatar : '',
          memberLevel: info ? info.memberLevel : 'basic',
          friendSince: r.created_at,
        };
      }).sort((x, y) => x.nickname.localeCompare(y.nickname, 'zh-CN'));
      res.json({ success: true, friends });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // DELETE /api/social/friends/:userId
  router.delete('/friends/:userId', authRequired, (req, res) => {
    try {
      const [a, b] = friendKeyPair(req.user.userId, req.params.userId);
      getDb().prepare('DELETE FROM friendships WHERE user_a = ? AND user_b = ?').run(a, b);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ==================== 私聊 ====================

  // GET /api/social/messages/private/:peerId?afterId=
  router.get('/messages/private/:peerId', authRequired, (req, res) => {
    try {
      const convId = privateConvId(req.user.userId, req.params.peerId);
      const afterId = parseInt(req.query.afterId, 10) || 0;
      const rows = getDb().prepare('SELECT * FROM chat_messages WHERE conversation_id = ? AND id > ? ORDER BY id ASC LIMIT 200').all(convId, afterId);
      res.json({
        success: true,
        messages: rows.map(r => ({ id: String(r.id), senderId: r.sender_id, senderName: r.sender_name, content: r.content, type: r.msg_type, createdAt: r.created_at })),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/messages/private/:peerId { content }
  router.post('/messages/private/:peerId', authRequired, (req, res) => {
    try {
      const { content, type = 'text' } = req.body;
      if (!content || !String(content).trim()) return res.status(400).json({ success: false, error: '消息不能为空' });
      const info = userPublicInfo(req.user.userId) || { nickname: '国学爱好者' };
      const convId = privateConvId(req.user.userId, req.params.peerId);
      const result = getDb().prepare('INSERT INTO chat_messages (conversation_id, sender_id, sender_name, content, msg_type) VALUES (?,?,?,?,?)')
        .run(convId, String(req.user.userId), info.nickname, String(content).trim().slice(0, 3000), String(type));
      notify(req.params.peerId, 'chat', { userId: req.user.userId, nickname: info.nickname }, `发来消息：${String(content).trim().slice(0, 30)}`, `/friends/chat/${req.user.userId}`);
      const row = getDb().prepare('SELECT * FROM chat_messages WHERE id = ?').get(result.lastInsertRowid);
      res.json({ success: true, message: { id: String(row.id), senderId: row.sender_id, senderName: row.sender_name, content: row.content, type: row.msg_type, createdAt: row.created_at } });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ==================== 群聊 ====================

  // POST /api/social/groups { name }
  router.post('/groups', authRequired, (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: '群名称不能为空' });
      const info = userPublicInfo(req.user.userId) || { nickname: '国学爱好者' };
      const result = getDb().prepare('INSERT INTO groups (name, owner_id, owner_name, member_ids) VALUES (?,?,?,?)')
        .run(String(name).trim().slice(0, 30), String(req.user.userId), info.nickname, JSON.stringify([String(req.user.userId)]));
      const row = getDb().prepare('SELECT * FROM groups WHERE id = ?').get(result.lastInsertRowid);
      res.json({ success: true, group: groupToVo(row) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  function groupToVo(row) {
    return {
      id: String(row.id),
      groupId: String(row.id),
      name: row.name,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      announcement: row.announcement,
      memberIds: JSON.parse(row.member_ids || '[]'),
      createdAt: row.created_at,
    };
  }

  // GET /api/social/groups
  router.get('/groups', authRequired, (req, res) => {
    try {
      const me = String(req.user.userId);
      const rows = getDb().prepare('SELECT * FROM groups ORDER BY id DESC LIMIT 100').all();
      const mine = rows.filter(r => JSON.parse(r.member_ids || '[]').includes(me));
      res.json({ success: true, groups: mine.map(groupToVo) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/groups/:id/join
  router.post('/groups/:id/join', authRequired, (req, res) => {
    try {
      const d = getDb();
      const row = d.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      const members = JSON.parse(row.member_ids || '[]');
      const me = String(req.user.userId);
      if (!members.includes(me)) {
        members.push(me);
        d.prepare('UPDATE groups SET member_ids = ? WHERE id = ?').run(JSON.stringify(members), row.id);
      }
      res.json({ success: true, group: groupToVo({ ...row, member_ids: JSON.stringify(members) }) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/social/groups/:id/messages?afterId=
  router.get('/groups/:id/messages', authRequired, (req, res) => {
    try {
      const row = getDb().prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      const members = JSON.parse(row.member_ids || '[]');
      if (!members.includes(String(req.user.userId))) return res.status(403).json({ success: false, error: '你不是群成员' });
      const afterId = parseInt(req.query.afterId, 10) || 0;
      const msgs = getDb().prepare('SELECT * FROM chat_messages WHERE conversation_id = ? AND id > ? ORDER BY id ASC LIMIT 200')
        .all(`group:${row.id}`, afterId);
      res.json({
        success: true,
        messages: msgs.map(r => ({ id: String(r.id), senderId: r.sender_id, senderName: r.sender_name, content: r.content, type: r.msg_type, createdAt: r.created_at })),
        group: groupToVo(row),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/groups/:id/messages { content }
  router.post('/groups/:id/messages', authRequired, (req, res) => {
    try {
      const { content, type = 'text' } = req.body;
      if (!content || !String(content).trim()) return res.status(400).json({ success: false, error: '消息不能为空' });
      const d = getDb();
      const row = d.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      const members = JSON.parse(row.member_ids || '[]');
      const me = String(req.user.userId);
      if (!members.includes(me)) return res.status(403).json({ success: false, error: '你不是群成员' });
      const info = userPublicInfo(me) || { nickname: '国学爱好者' };
      const result = d.prepare('INSERT INTO chat_messages (conversation_id, sender_id, sender_name, content, msg_type) VALUES (?,?,?,?,?)')
        .run(`group:${row.id}`, me, info.nickname, String(content).trim().slice(0, 3000), String(type));
      for (const memberId of members) {
        if (memberId !== me) notify(memberId, 'group_chat', { userId: me, nickname: info.nickname }, `在「${row.name}」发来消息`, `/groups/chat/${row.id}`);
      }
      const msg = d.prepare('SELECT * FROM chat_messages WHERE id = ?').get(result.lastInsertRowid);
      res.json({ success: true, message: { id: String(msg.id), senderId: msg.sender_id, senderName: msg.sender_name, content: msg.content, type: msg.msg_type, createdAt: msg.created_at } });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ==================== 通知 ====================

  router.get('/notifications', authRequired, (req, res) => {
    try {
      const rows = getDb().prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(String(req.user.userId));
      const unread = getDb().prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0').get(String(req.user.userId)).c;
      res.json({
        success: true,
        unread,
        notifications: rows.map(r => ({ id: String(r.id), type: r.type, actorId: r.actor_id, actorName: r.actor_name, content: r.content, link: r.link, read: !!r.read, createdAt: r.created_at })),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.post('/notifications/read-all', authRequired, (req, res) => {
    try {
      getDb().prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(String(req.user.userId));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ==================== 用户公开信息 ====================

  router.get('/users/:userId/profile', (_req, res) => {
    const info = userPublicInfo(_req.params.userId);
    if (!info) return res.status(404).json({ success: false, error: '用户不存在' });
    const posts = getDb().prepare(`SELECT COUNT(*) AS c FROM posts WHERE user_id = ? AND status='active'`).get(info.userId).c;
    const followers = getDb().prepare('SELECT COUNT(*) AS c FROM follows WHERE followed_id = ?').get(info.userId).c;
    const following = getDb().prepare('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?').get(info.userId).c;
    res.json({ success: true, user: { ...info, postCount: posts, followerCount: followers, followingCount: following } });
  });

  return router;
}

module.exports = { createRouter };
