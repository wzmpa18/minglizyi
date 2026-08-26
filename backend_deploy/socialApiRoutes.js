/**
 * 社交体系后端 API - v25.0.42（社交最终封板）
 *
 * 目标：把「动态广场 / 评论 / 点赞 / 关注 / 好友请求 / 好友关系 / 私聊 / 群聊 / 消息通知」
 * 从单机 localStorage 升级为真实多人互通的后端服务。
 *
 * 存储：独立 SQLite 文件 data/social.db（与用户核心库物理隔离，业务表独立命名）
 * 用户信息：只读连接用户核心库（/root/backend-auth/data/yandao_users.db）查询 users 表
 * 认证：JWT authMiddleware（与 register_routes 同密钥），游客只读列表
 *
 * v25.0.42 新增（社交最终封板指令）：
 *   1) 统一会话模型 user_conversations（私聊+群聊统一Conversation List，
 *      服务端未读/置顶/免打扰/删除会话，未读跨设备可恢复）
 *   2) 消息幂等（client_msg_id 唯一索引，重发/重放返回原消息）
 *   3) 群聊完整第一版：解散/转让/管理员/全员禁言/成员禁言/群昵称/群头像/邀请好友/举报群/举报消息
 *   4) 服务端黑名单（blacklists 表 + 私聊/好友申请/动态流/评论隔离）
 *   5) 动态收藏（favorites）+ 评论回复（parent_id）+ 好友备注（friend_remarks）
 *   6) 功能开关全量放开：posts/comments/groups enabled
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

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reporter_id TEXT NOT NULL,
      reporter_name TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);

    CREATE TABLE IF NOT EXISTS sensitive_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      scene TEXT NOT NULL,
      content TEXT NOT NULL,
      words TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_sensitive_user ON sensitive_logs(user_id, id DESC);

    CREATE TABLE IF NOT EXISTS user_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      conv_type TEXT NOT NULL DEFAULT 'private',
      peer_id TEXT DEFAULT '',
      group_id INTEGER DEFAULT 0,
      pinned INTEGER DEFAULT 0,
      muted INTEGER DEFAULT 0,
      hidden INTEGER DEFAULT 0,
      last_read_msg_id INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, conversation_id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_conv ON user_conversations(user_id, hidden, pinned, updated_at);

    CREATE TABLE IF NOT EXISTS blacklists (
      user_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (user_id, blocked_id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS friend_remarks (
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      remark TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (user_id, friend_id)
    );
  `);
  // P6-I-PLUS 规则5：社交圈层分类系统永久冻结 —— 8 个固定一级圈层，禁止随意新增
  try {
    const cols = d.prepare(`PRAGMA table_info(posts)`).all().map(c => c.name);
    if (cols.includes('post_id') && !cols.includes('circle')) {
      d.exec(`ALTER TABLE posts ADD COLUMN circle TEXT DEFAULT ''`);
      d.exec(`CREATE INDEX IF NOT EXISTS idx_posts_circle ON posts(circle, id DESC)`);
    }
  } catch (e) { console.error('[SocialApi] circle 列迁移异常(不阻断):', e.message); }
  // v25.0.42：群聊扩展列（头像/管理员/全员禁言/成员禁言/群昵称）+ 消息幂等列 + 评论回复列
  try {
    const gcols = d.prepare('PRAGMA table_info(groups)').all().map(c => c.name);
    if (gcols.includes('id')) {
      if (!gcols.includes('avatar')) d.exec(`ALTER TABLE groups ADD COLUMN avatar TEXT DEFAULT ''`);
      if (!gcols.includes('admins')) d.exec(`ALTER TABLE groups ADD COLUMN admins TEXT DEFAULT '[]'`);
      if (!gcols.includes('mute_all')) d.exec(`ALTER TABLE groups ADD COLUMN mute_all INTEGER DEFAULT 0`);
      if (!gcols.includes('member_mutes')) d.exec(`ALTER TABLE groups ADD COLUMN member_mutes TEXT DEFAULT '{}'`);
      if (!gcols.includes('member_nicknames')) d.exec(`ALTER TABLE groups ADD COLUMN member_nicknames TEXT DEFAULT '{}'`);
    }
    const mcols = d.prepare('PRAGMA table_info(chat_messages)').all().map(c => c.name);
    if (mcols.includes('id') && !mcols.includes('client_msg_id')) {
      d.exec(`ALTER TABLE chat_messages ADD COLUMN client_msg_id TEXT DEFAULT ''`);
    }
    d.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_client_msg ON chat_messages(conversation_id, client_msg_id) WHERE client_msg_id != ''`);
    const ccols = d.prepare('PRAGMA table_info(comments)').all().map(c => c.name);
    if (ccols.includes('id') && !ccols.includes('parent_id')) {
      d.exec(`ALTER TABLE comments ADD COLUMN parent_id INTEGER DEFAULT 0`);
    }
  } catch (e) { console.error('[SocialApi] v25.0.42 群聊/消息列迁移异常(不阻断):', e.message); }
  // v25.0.42：存量会话回填 user_conversations（幂等 INSERT OR IGNORE，仅启动时一次）
  try {
    backfillUserConversations(d);
  } catch (e) { console.error('[SocialApi] 会话回填异常(不阻断):', e.message); }
}

// v25.0.42：存量会话回填——把 chat_messages 里已有的会话补进 user_conversations（幂等）
function backfillUserConversations(d) {
  const convs = d.prepare('SELECT conversation_id, MAX(id) AS max_id, MAX(created_at) AS last_at FROM chat_messages GROUP BY conversation_id').all();
  // 修正：better-sqlite3 混用匿名?与编号?N会误判参数个数（Too many parameter values），改用具名参数
  const stmt = d.prepare(`INSERT OR IGNORE INTO user_conversations (user_id, conversation_id, conv_type, peer_id, group_id, updated_at)
    VALUES (@u, @cid, @ty, @peer, @gid, COALESCE((SELECT created_at FROM chat_messages WHERE conversation_id = @cid ORDER BY id DESC LIMIT 1), datetime('now','localtime')))`);
  for (const c of convs) {
    const cid = c.conversation_id;
    if (cid.startsWith('private:')) {
      const parts = cid.split(':'); // private:a:b
      if (parts.length === 3) {
        stmt.run({ u: parts[1], cid, ty: 'private', peer: parts[2], gid: 0 });
        stmt.run({ u: parts[2], cid, ty: 'private', peer: parts[1], gid: 0 });
      }
    } else if (cid.startsWith('group:')) {
      const gid = parseInt(cid.slice(6), 10);
      const g = d.prepare('SELECT member_ids FROM groups WHERE id = ?').get(gid);
      if (g) {
        const members = JSON.parse(g.member_ids || '[]');
        for (const m of members) stmt.run({ u: String(m), cid, ty: 'group', peer: '', gid });
      }
    }
  }
}

// v25.0.42：统一会话模型助手——发消息时维护双方/全员会话（接收方 hidden 复位，发送方已读推进）
function upsertUserConversation(d, userId, convId, convType, peerId, groupId, lastMsgId, isSender) {
  d.prepare(`INSERT INTO user_conversations (user_id, conversation_id, conv_type, peer_id, group_id, updated_at, hidden)
    VALUES (?,?,?,?,?,datetime('now','localtime'),0)
    ON CONFLICT(user_id, conversation_id) DO UPDATE SET updated_at = datetime('now','localtime'), hidden = 0`)
    .run(String(userId), convId, convType, String(peerId || ''), groupId || 0);
  if (isSender) {
    d.prepare('UPDATE user_conversations SET last_read_msg_id = MAX(last_read_msg_id, ?) WHERE user_id = ? AND conversation_id = ?')
      .run(lastMsgId, String(userId), convId);
  }
}

// v25.0.42：黑名单助手
function isBlockedBy(ownerId, targetId) {
  return !!getDb().prepare('SELECT 1 FROM blacklists WHERE user_id = ? AND blocked_id = ?').get(String(ownerId), String(targetId));
}
function blockedListOf(userId) {
  return getDb().prepare('SELECT blocked_id FROM blacklists WHERE user_id = ?').all(String(userId)).map(r => String(r.blocked_id));
}

// 8 个固定圈层（永久冻结，与学习模块分类一一对应）
const SOCIAL_CIRCLES = {
  TCM: { key: 'TCM', label: '中医', track: 'zhongyi' },
  ZWDS: { key: 'ZWDS', label: '紫微', track: 'yixue' },
  Bazi: { key: 'Bazi', label: '八字', track: 'yixue' },
  LiuRen: { key: 'LiuRen', label: '六壬', track: 'yixue' },
  QiMen: { key: 'QiMen', label: '奇门', track: 'yixue' },
  FengShui: { key: 'FengShui', label: '风水', track: 'yixue' },
  GuoXue: { key: 'GuoXue', label: '国学', track: 'guoxue' },
  Life: { key: 'Life', label: '生活', track: '' },
};

// ==================== P7-整改-01：功能总开关（后台一键开关） ====================
// 数据来源：data/social_feature_config.json（服务器后台可直接编辑），环境变量同名大写可覆盖。
// v25.0.42 社交最终封板：好友/私聊/群聊/动态/评论 全量放开（发现社交全链 E2E 依据）。
const FEATURE_CONFIG_PATH = path.join(__dirname, 'data', 'social_feature_config.json');
const FEATURE_DEFAULTS = {
  friends_add_enabled: true,   // 好友添加（含扫码加好友）
  private_chat_enabled: true,  // 一对一私聊（文字+图片）
  posts_enabled: true,         // 动态发布（v25.0.42 放开）
  comments_enabled: true,      // 公开评论（v25.0.42 放开）
  groups_enabled: true,        // 群聊（v25.0.42 放开）
};
let featureConfigCache = null;
let featureConfigMtime = 0;

function featureEnabled(key) {
  let val;
  const envKey = key.toUpperCase();
  if (process.env[envKey] !== undefined) {
    val = process.env[envKey];
  } else {
    try {
      const st = fs.statSync(FEATURE_CONFIG_PATH);
      if (!featureConfigCache || st.mtimeMs !== featureConfigMtime) {
        featureConfigMtime = st.mtimeMs;
        featureConfigCache = JSON.parse(fs.readFileSync(FEATURE_CONFIG_PATH, 'utf-8'));
      }
      val = featureConfigCache[key];
    } catch { /* 无配置文件时走默认值 */ }
  }
  const enabled = val === undefined ? FEATURE_DEFAULTS[key] : (val === true || val === 'true' || val === 1 || val === '1');
  return enabled;
}

function featureDisabled(res, label) {
  return res.status(403).json({ success: false, error: `${label}功能暂未开放` });
}

// ==================== P7-整改-01：统一敏感词过滤（与前端 socialStore 同源词表） ====================
const SENSITIVE_WORDS = [
  '违法', '赌博', '毒品', '枪支', '色情', '裸聊', '约炮',
  '诈骗', '传销', '洗钱', '高利贷', '假币', '炸药',
  '政治敏感', '邪教', '恐怖', '分裂',
];

function findSensitiveWords(text) {
  const hit = [];
  for (const w of SENSITIVE_WORDS) {
    if (text.includes(w)) hit.push(w);
  }
  return hit;
}

function logSensitive(userId, scene, content, words) {
  try {
    getDb().prepare('INSERT INTO sensitive_logs (user_id, scene, content, words) VALUES (?,?,?,?)')
      .run(String(userId), scene, String(content).slice(0, 500), JSON.stringify(words));
  } catch (e) { console.error('[SocialApi] 敏感词留痕失败:', e.message); }
}

// 排盘/工具分享自动匹配圈层（toolType → circle key）
function autoCircleFromTool(toolType) {
  const t = String(toolType || '').toLowerCase();
  if (!t) return '';
  if (/(ziwei|zwds|紫微)/.test(t)) return 'ZWDS';
  if (/(bazi|八字|bithi)/.test(t)) return 'Bazi';
  if (/(liuren|六壬)/.test(t)) return 'LiuRen';
  if (/(qimen|奇门)/.test(t)) return 'QiMen';
  if (/(fengshui|风水|xuankong|堪舆)/.test(t)) return 'FengShui';
  if (/(zhongyi|tcm|中医| acupuncture|针灸| herbal|本草)/.test(t)) return 'TCM';
  if (/(guoxue|国学|poem|classic|经史)/.test(t)) return 'GuoXue';
  return '';
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
  } catch {
    return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
  }
  // v25.0.61 FINAL-SEAL D19：封禁/注销账号全社交链路拦截（后台封禁原先只在后台显示）
  const udb = getUserDb();
  if (udb) {
    try {
      const row = udb.prepare('SELECT status, deleted_at FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ?').get(req.user.userId, String(req.user.userId));
      if (row) {
        if (row.deleted_at) return res.status(403).json({ success: false, error: '该账号已注销', code: 'ACCOUNT_DELETED' });
        if (row.status === 'banned') return res.status(403).json({ success: false, error: '该账号已被封禁，如有疑问请联系客服', code: 'ACCOUNT_BANNED' });
      }
    } catch (e) { /* DB异常不阻断鉴权 */ }
  }
  next();
}

// v25.0.61 FINAL-SEAL D19：平台级禁言（users.muted_until）检查。
// 后台设置的禁言原先无任何生效点；现发布动态/评论/私聊/群消息时拒绝，到期自动恢复（仅返回剩余分钟数）。
function checkPlatformMute(userId) {
  const udb = getUserDb();
  if (!udb) return null;
  try {
    const row = udb.prepare('SELECT muted_until FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ?').get(userId, String(userId));
    if (row && row.muted_until) {
      const until = new Date(row.muted_until).getTime();
      if (Number.isFinite(until) && until > Date.now()) {
        return { remainMinutes: Math.ceil((until - Date.now()) / 60000) };
      }
    }
  } catch (e) {}
  return null;
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
    circle: row.circle && SOCIAL_CIRCLES[row.circle] ? row.circle : '',
    circleLabel: row.circle && SOCIAL_CIRCLES[row.circle] ? SOCIAL_CIRCLES[row.circle].label : '',
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

  // GET /api/social/circles —— 8 个固定圈层目录（前端筛选栏数据源，永久冻结）
  router.get('/circles', (_req, res) => {
    res.json({ success: true, circles: Object.values(SOCIAL_CIRCLES) });
  });

  // GET /api/social/posts?tag=&circle=&cursor=&limit=（circle 圈层筛选，不同领域不混排）
  router.get('/posts', authOptional, (req, res) => {
    try {
      const d = getDb();
      const { tag = '', circle = '', cursor = 0, limit = 20 } = req.query;
      const lim = Math.min(parseInt(limit, 10) || 20, 50);
      const cur = (parseInt(cursor, 10) || 0) > 0 ? parseInt(cursor, 10) : 9007199254740992; // cursor缺省=首页
      const ck = circle && SOCIAL_CIRCLES[circle] ? circle : '';
      let rows;
      if (ck && tag) {
        rows = d.prepare(`SELECT * FROM posts WHERE status='active' AND circle=? AND tags LIKE ? AND id < ? ORDER BY id DESC LIMIT ?`)
          .all(ck, `%"${tag}"%`, cur, lim);
      } else if (ck) {
        rows = d.prepare(`SELECT * FROM posts WHERE status='active' AND circle=? AND id < ? ORDER BY id DESC LIMIT ?`)
          .all(ck, cur, lim);
      } else if (tag) {
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

  // POST /api/social/posts  { content, images, tags, toolType, circle }
  // P6-I-PLUS 规则5：发布动态必须绑定圈层（排盘/证书分享按 toolType 自动匹配，无圈层拒绝发布）
  router.post('/posts', authRequired, (req, res) => {
    try {
      if (!featureEnabled('posts_enabled')) return featureDisabled(res, '动态发布');
      const _mute = checkPlatformMute(req.user.userId);
      if (_mute) return res.status(403).json({ success: false, error: `你已被禁言（剩余约${_mute.remainMinutes}分钟），暂不能发布动态`, code: 'USER_MUTED' });
      const { content, images = [], tags = [], toolType = '', circle = '' } = req.body;
      if (!content || !String(content).trim()) {
        return res.status(400).json({ success: false, error: '动态内容不能为空' });
      }
      // 统一敏感词过滤：违规拦截并留痕（与私聊/群聊同规范）
      const postText = String(content).trim().slice(0, 5000);
      const postHits = findSensitiveWords(postText);
      if (postHits.length) {
        logSensitive(String(req.user.userId), 'post', postText, postHits);
        return res.status(400).json({ success: false, error: '动态包含违规内容，已拦截' });
      }
      const autoCk = autoCircleFromTool(toolType);
      const ck = (circle && SOCIAL_CIRCLES[circle] ? circle : '') || autoCk;
      if (!ck) {
        return res.status(400).json({ success: false, error: `发布动态必须选择圈层：${Object.values(SOCIAL_CIRCLES).map(c => c.label).join('/')}` });
      }
      const info = userPublicInfo(req.user.userId) || { nickname: '国学爱好者', avatar: '' };
      const postId = `p${Date.now()}${Math.floor(Math.random() * 1000)}`;
      getDb().prepare(`INSERT INTO posts (post_id, user_id, nickname, avatar, content, images, tags, tool_type, circle) VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(postId, String(req.user.userId), info.nickname, info.avatar, String(content).trim().slice(0, 5000),
          JSON.stringify(Array.isArray(images) ? images.slice(0, 9) : []),
          JSON.stringify(Array.isArray(tags) ? tags.slice(0, 5) : []),
          String(toolType || '').slice(0, 40), ck);
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

  // POST /api/social/posts/:postId/report { reason } 举报动态（幂等：同人同动态仅一次）
  router.post('/posts/:postId/report', authRequired, (req, res) => {
    try {
      const d = getDb();
      const postId = req.params.postId;
      const me = String(req.user.userId);
      const post = d.prepare('SELECT * FROM posts WHERE post_id = ?').get(postId);
      if (!post) return res.status(404).json({ success: false, error: '动态不存在' });
      const dup = d.prepare('SELECT 1 FROM reports WHERE target_type = ? AND target_id = ? AND reporter_id = ?')
        .get('post', postId, me);
      if (dup) return res.json({ success: true, duplicated: true, message: '已收到你的举报，请勿重复提交' });
      const info = userPublicInfo(me) || { nickname: '' };
      d.prepare('INSERT INTO reports (target_type, target_id, reporter_id, reporter_name, reason) VALUES (?,?,?,?,?)')
        .run('post', postId, me, info.nickname || '', String(req.body.reason || '其他').trim().slice(0, 200));
      res.json({ success: true, message: '举报已提交，平台将尽快核实处理' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/comments/:commentId/report { reason } 举报评论
  router.post('/comments/:commentId/report', authRequired, (req, res) => {
    try {
      const d = getDb();
      const commentId = req.params.commentId;
      const me = String(req.user.userId);
      const comment = d.prepare('SELECT * FROM comments WHERE id = ?').get(parseInt(commentId, 10));
      if (!comment) return res.status(404).json({ success: false, error: '评论不存在' });
      const dup = d.prepare('SELECT 1 FROM reports WHERE target_type = ? AND target_id = ? AND reporter_id = ?')
        .get('comment', commentId, me);
      if (dup) return res.json({ success: true, duplicated: true, message: '已收到你的举报，请勿重复提交' });
      const info = userPublicInfo(me) || { nickname: '' };
      d.prepare('INSERT INTO reports (target_type, target_id, reporter_id, reporter_name, reason) VALUES (?,?,?,?,?)')
        .run('comment', commentId, me, info.nickname || '', String(req.body.reason || '其他').trim().slice(0, 200));
      res.json({ success: true, message: '举报已提交，平台将尽快核实处理' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/social/posts/:postId/comments
  router.get('/posts/:postId/comments', (req, res) => {
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
      if (!featureEnabled('comments_enabled')) return featureDisabled(res, '评论');
      const _mute = checkPlatformMute(req.user.userId);
      if (_mute) return res.status(403).json({ success: false, error: `你已被禁言（剩余约${_mute.remainMinutes}分钟），暂不能评论`, code: 'USER_MUTED' });
      const { content } = req.body;
      if (!content || !String(content).trim()) return res.status(400).json({ success: false, error: '评论内容不能为空' });
      // 统一敏感词过滤：违规拦截并留痕（与私聊/群聊同规范）
      const cmText = String(content).trim().slice(0, 1000);
      const cmHits = findSensitiveWords(cmText);
      if (cmHits.length) {
        logSensitive(String(req.user.userId), 'comment', cmText, cmHits);
        return res.status(400).json({ success: false, error: '评论包含违规内容，已拦截' });
      }
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
      if (!featureEnabled('friends_add_enabled')) return featureDisabled(res, '添加好友');
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
      if (!featureEnabled('private_chat_enabled')) return featureDisabled(res, '私聊');
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

  // POST /api/social/messages/private/:peerId { content, type: 'text' | 'image', clientMsgId? }
  // P7-整改-01：文字/图片消息；敏感词拦截留痕；单聊会话滚动覆盖仅保留最近100条
  // v25.0.42：黑名单拦截 + clientMsgId 幂等 + 统一会话模型（服务端未读）
  router.post('/messages/private/:peerId', authRequired, (req, res) => {
    try {
      if (!featureEnabled('private_chat_enabled')) return featureDisabled(res, '私聊');
      const _mute = checkPlatformMute(req.user.userId);
      if (_mute) return res.status(403).json({ success: false, error: `你已被禁言（剩余约${_mute.remainMinutes}分钟），暂不能发送消息`, code: 'USER_MUTED' });
      const { content, type = 'text', clientMsgId = '' } = req.body;
      if (!content || !String(content).trim()) return res.status(400).json({ success: false, error: '消息不能为空' });

      const d = getDb();
      const me = String(req.user.userId);
      const peer = String(req.params.peerId);
      const msgType = String(type);
      let finalContent;

      // v25.0.42：黑名单隔离——对方把我拉黑则拒发；我拉黑对方也拒发（提示先解除）
      if (isBlockedBy(peer, me)) return res.status(403).json({ success: false, error: '对方已将你加入黑名单，消息无法发送' });
      if (isBlockedBy(me, peer)) return res.status(403).json({ success: false, error: '对方已在你的黑名单中，请先解除拉黑' });

      // v25.0.42：clientMsgId 幂等——重发/重放返回已落库原消息，不重复入账
      const cmi = String(clientMsgId || '').slice(0, 64);
      if (cmi) {
        const conv0 = privateConvId(me, peer);
        const dup = d.prepare('SELECT * FROM chat_messages WHERE conversation_id = ? AND client_msg_id = ?').get(conv0, cmi);
        if (dup) {
          return res.json({ success: true, duplicated: true, message: { id: String(dup.id), senderId: dup.sender_id, senderName: dup.sender_name, content: dup.content, type: dup.msg_type, createdAt: dup.created_at } });
        }
      }

      if (msgType === 'image') {
        // 图片消息：仅接受 data:image/* base64，最大约3MB（路由体限制6mb）
        const c = String(content);
        if (!/^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(c)) {
          return res.status(400).json({ success: false, error: '图片格式不支持' });
        }
        if (c.length > 4 * 1024 * 1024) {
          return res.status(400).json({ success: false, error: '图片过大，请压缩后重试' });
        }
        finalContent = c;
      } else {
        // 文字消息：统一敏感词过滤，违规拦截并留痕
        const text = String(content).trim().slice(0, 3000);
        const hits = findSensitiveWords(text);
        if (hits.length) {
          logSensitive(me, 'private_message', text, hits);
          return res.status(400).json({ success: false, error: '消息包含违规内容，已拦截' });
        }
        finalContent = text;
      }

      const info = userPublicInfo(me) || { nickname: '国学爱好者' };
      const convId = privateConvId(me, peer);
      const result = d.prepare('INSERT INTO chat_messages (conversation_id, sender_id, sender_name, content, msg_type, client_msg_id) VALUES (?,?,?,?,?,?)')
        .run(convId, me, info.nickname, finalContent, msgType === 'image' ? 'image' : 'text', cmi);

      // 滚动覆盖：单聊会话仅保留最近100条
      d.prepare(`DELETE FROM chat_messages WHERE conversation_id = ? AND id NOT IN (SELECT id FROM chat_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 100)`).run(convId, convId);

      // v25.0.42：统一会话模型（发送方已读推进、接收方未读累计且会话复位显示）
      upsertUserConversation(d, me, convId, 'private', peer, 0, Number(result.lastInsertRowid), true);
      upsertUserConversation(d, peer, convId, 'private', me, 0, Number(result.lastInsertRowid), false);

      // v25.0.38 P0-2：通知跳转改 query 格式（静态导出下动态路由 /friends/chat/:id 会 404 兜底首页，B 端点通知进不去聊天页）
      notify(peer, 'chat', { userId: me, nickname: info.nickname }, msgType === 'image' ? '发来一张图片' : `发来消息：${finalContent.slice(0, 30)}`, `/friends/chat?id=${me}`);
      const row = d.prepare('SELECT * FROM chat_messages WHERE id = ?').get(result.lastInsertRowid);
      res.json({ success: true, message: { id: String(row.id), senderId: row.sender_id, senderName: row.sender_name, content: row.content, type: row.msg_type, createdAt: row.created_at } });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ==================== 群聊 ====================

  // 群聊开关（默认关闭，仅拦截写操作；读取走 GET 不受影响）
  router.use('/groups', (req, res, next) => {
    if (!featureEnabled('groups_enabled') && req.method !== 'GET') {
      return featureDisabled(res, '群聊');
    }
    next();
  });

  // POST /api/social/groups { name, avatar? }
  router.post('/groups', authRequired, (req, res) => {
    try {
      const { name, avatar = '' } = req.body;
      if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: '群名称不能为空' });
      const info = userPublicInfo(req.user.userId) || { nickname: '国学爱好者' };
      const result = getDb().prepare('INSERT INTO groups (name, owner_id, owner_name, member_ids, avatar) VALUES (?,?,?,?,?)')
        .run(String(name).trim().slice(0, 30), String(req.user.userId), info.nickname, JSON.stringify([String(req.user.userId)]), String(avatar || '').slice(0, 500));
      const row = getDb().prepare('SELECT * FROM groups WHERE id = ?').get(result.lastInsertRowid);
      res.json({ success: true, group: groupToVo(row) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  function groupToVo(row) {
    const memberIds = JSON.parse(row.member_ids || '[]');
    return {
      id: String(row.id),
      groupId: String(row.id),
      name: row.name,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      announcement: row.announcement,
      memberIds,
      memberCount: memberIds.length,
      avatar: row.avatar || '',
      admins: JSON.parse(row.admins || '[]'),
      muteAll: !!row.mute_all,
      createdAt: row.created_at,
    };
  }

  // v25.0.42：群权限助手——群主/管理员判定
  function isGroupManager(row, userId) {
    return String(row.owner_id) === String(userId) || (JSON.parse(row.admins || '[]')).includes(String(userId));
  }
  // v25.0.42：成员禁言剩余时间（秒），0=未禁言
  function memberMuteRemain(row, userId) {
    const mutes = JSON.parse(row.member_mutes || '{}');
    const until = mutes[String(userId)];
    if (!until) return 0;
    const remain = Math.floor((new Date(until).getTime() - Date.now()) / 1000);
    return remain > 0 ? remain : 0;
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

  // GET /api/social/groups/:id/detail 群详情（成员资料/角色/群昵称/我的禁言状态，仅成员可看）
  router.get('/groups/:id/detail', authRequired, (req, res) => {
    try {
      const row = getDb().prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      const me = String(req.user.userId);
      const members = JSON.parse(row.member_ids || '[]');
      if (!members.includes(me)) return res.status(403).json({ success: false, error: '你不是群成员' });
      const admins = JSON.parse(row.admins || '[]');
      const nicks = JSON.parse(row.member_nicknames || '{}');
      const memberProfiles = members.map((id) => {
        const info = userPublicInfo(id) || {};
        const role = String(row.owner_id) === String(id) ? 'owner' : (admins.includes(String(id)) ? 'admin' : 'member');
        return { userId: id, nickname: nicks[String(id)] || info.nickname || `用户${id.slice(-4)}`, realName: info.nickname || '', avatar: info.avatar || '', memberLevel: info.memberLevel || 0, role, groupNickname: nicks[String(id)] || '' };
      });
      res.json({
        success: true,
        group: groupToVo(row),
        members: memberProfiles,
        myRole: String(row.owner_id) === me ? 'owner' : (admins.includes(me) ? 'admin' : 'member'),
        myGroupNickname: nicks[me] || '',
        myMuteRemain: memberMuteRemain(row, me),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/groups/:id/leave 退群（群主退群自动转让给最早入群成员，无人则解散）
  router.post('/groups/:id/leave', authRequired, (req, res) => {
    try {
      const d = getDb();
      const row = d.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      const me = String(req.user.userId);
      const members = JSON.parse(row.member_ids || '[]');
      if (!members.includes(me)) return res.status(400).json({ success: false, error: '你不在该群' });
      const rest = members.filter((m) => m !== me);
      if (rest.length === 0) {
        d.prepare('DELETE FROM groups WHERE id = ?').run(row.id);
        return res.json({ success: true, dissolved: true });
      }
      let ownerId = row.owner_id, ownerName = row.owner_name;
      if (String(row.owner_id) === me) {
        const nextOwner = rest[0];
        const info = userPublicInfo(nextOwner) || { nickname: `用户${nextOwner.slice(-4)}` };
        ownerId = nextOwner;
        ownerName = info.nickname;
        notify(nextOwner, 'group_transfer', { userId: me, nickname: ownerName }, `你已成为「${row.name}」的新群主`, `/groups/chat?id=${row.id}`);
      }
      d.prepare('UPDATE groups SET member_ids = ?, owner_id = ?, owner_name = ? WHERE id = ?')
        .run(JSON.stringify(rest), String(ownerId), ownerName, row.id);
      res.json({ success: true, dissolved: false });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/groups/:id/kick { userId } 群主移除成员
  router.post('/groups/:id/kick', authRequired, (req, res) => {
    try {
      const d = getDb();
      const row = d.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      const me = String(req.user.userId);
      const admins = JSON.parse(row.admins || '[]');
      const isOwner = String(row.owner_id) === me;
      if (!isOwner && !admins.includes(me)) return res.status(403).json({ success: false, error: '仅群主/管理员可移除成员' });
      const target = String(req.body.userId || '');
      if (String(row.owner_id) === target) return res.status(403).json({ success: false, error: '不能移除群主' });
      if (!isOwner && admins.includes(target)) return res.status(403).json({ success: false, error: '管理员不能移除其他管理员' });
      const members = JSON.parse(row.member_ids || '[]');
      if (!members.includes(target)) return res.status(400).json({ success: false, error: '该用户不在群内' });
      if (target === me) return res.status(400).json({ success: false, error: '请使用退出群聊' });
      d.prepare('UPDATE groups SET member_ids = ?, admins = ? WHERE id = ?')
        .run(JSON.stringify(members.filter((m) => m !== target)), JSON.stringify(admins.filter((a) => a !== target)), row.id);
      notify(target, 'group_kicked', { userId: me }, `你已被移出「${row.name}」`, '/friends');
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/groups/:id/update { name?, announcement?, avatar? } 群主/管理员改群名/公告/头像
  router.post('/groups/:id/update', authRequired, (req, res) => {
    try {
      const d = getDb();
      const row = d.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      if (!isGroupManager(row, req.user.userId)) return res.status(403).json({ success: false, error: '仅群主/管理员可修改群资料' });
      const name = req.body.name !== undefined ? String(req.body.name).trim().slice(0, 30) : row.name;
      const announcement = req.body.announcement !== undefined ? String(req.body.announcement).trim().slice(0, 200) : row.announcement;
      const avatar = req.body.avatar !== undefined ? String(req.body.avatar).slice(0, 500) : row.avatar;
      if (!name) return res.status(400).json({ success: false, error: '群名称不能为空' });
      d.prepare('UPDATE groups SET name = ?, announcement = ?, avatar = ? WHERE id = ?').run(name, announcement, avatar, row.id);
      const updated = d.prepare('SELECT * FROM groups WHERE id = ?').get(row.id);
      res.json({ success: true, group: groupToVo(updated) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ==================== v25.0.42：群聊完整第一版管理路由 ====================

  // POST /api/social/groups/:id/dissolve 群主解散群（通知全员并删除群）
  router.post('/groups/:id/dissolve', authRequired, (req, res) => {
    try {
      const d = getDb();
      const row = d.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      const me = String(req.user.userId);
      if (String(row.owner_id) !== me) return res.status(403).json({ success: false, error: '仅群主可解散群聊' });
      const members = JSON.parse(row.member_ids || '[]');
      const info = userPublicInfo(me) || { nickname: '群主' };
      for (const memberId of members) {
        if (memberId !== me) notify(memberId, 'group_dissolved', { userId: me, nickname: info.nickname }, `群「${row.name}」已被群主解散`, '/friends');
        d.prepare('DELETE FROM user_conversations WHERE user_id = ? AND conversation_id = ?').run(String(memberId), `group:${row.id}`);
      }
      d.prepare('DELETE FROM groups WHERE id = ?').run(row.id);
      res.json({ success: true, dissolved: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/groups/:id/transfer { userId } 群主转让
  router.post('/groups/:id/transfer', authRequired, (req, res) => {
    try {
      const d = getDb();
      const row = d.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      const me = String(req.user.userId);
      if (String(row.owner_id) !== me) return res.status(403).json({ success: false, error: '仅群主可转让群主' });
      const target = String(req.body.userId || req.body.toUserId || '');
      const members = JSON.parse(row.member_ids || '[]');
      if (!members.includes(target)) return res.status(400).json({ success: false, error: '该用户不在群内' });
      if (target === me) return res.status(400).json({ success: false, error: '你已是群主' });
      const info = userPublicInfo(target) || { nickname: `用户${target.slice(-4)}` };
      d.prepare('UPDATE groups SET owner_id = ?, owner_name = ? WHERE id = ?').run(target, info.nickname, row.id);
      // 转让后原群主保留管理员身份
      const admins = JSON.parse(row.admins || '[]');
      if (!admins.includes(me)) { admins.push(me); d.prepare('UPDATE groups SET admins = ? WHERE id = ?').run(JSON.stringify(admins), row.id); }
      notify(target, 'group_transfer', { userId: me, nickname: info.nickname }, `你已成为「${row.name}」的新群主`, `/groups/chat?id=${row.id}`);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/groups/:id/admins { userId, action: 'set'|'remove' } 群主设置/移除管理员
  router.post('/groups/:id/admins', authRequired, (req, res) => {
    try {
      const d = getDb();
      const row = d.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      const me = String(req.user.userId);
      if (String(row.owner_id) !== me) return res.status(403).json({ success: false, error: '仅群主可设置管理员' });
      const target = String(req.body.userId || '');
      const action = req.body.action ? String(req.body.action) : (req.body.isAdmin === false ? 'remove' : 'set');
      const members = JSON.parse(row.member_ids || '[]');
      if (!members.includes(target)) return res.status(400).json({ success: false, error: '该用户不在群内' });
      if (target === me) return res.status(400).json({ success: false, error: '不能对自己操作' });
      const admins = JSON.parse(row.admins || '[]');
      if (action === 'set') {
        if (!admins.includes(target)) admins.push(target);
      } else {
        const idx = admins.indexOf(target);
        if (idx >= 0) admins.splice(idx, 1);
      }
      d.prepare('UPDATE groups SET admins = ? WHERE id = ?').run(JSON.stringify(admins), row.id);
      const info = userPublicInfo(target) || { nickname: '成员' };
      notify(target, action === 'set' ? 'group_admin_set' : 'group_admin_removed', { userId: me, nickname: info.nickname },
        action === 'set' ? `你已成为「${row.name}」的管理员` : `你已被移除「${row.name}」管理员身份`, `/groups/chat?id=${row.id}`);
      res.json({ success: true, admins });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/groups/:id/mute-all { enabled } 群主/管理员全员禁言开关
  router.post('/groups/:id/mute-all', authRequired, (req, res) => {
    try {
      const d = getDb();
      const row = d.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      if (!isGroupManager(row, req.user.userId)) return res.status(403).json({ success: false, error: '仅群主/管理员可操作' });
      const enabled = !!(req.body.enabled === true || req.body.enabled === 'true' || req.body.muted === true || req.body.muted === 'true');
      d.prepare('UPDATE groups SET mute_all = ? WHERE id = ?').run(enabled ? 1 : 0, row.id);
      res.json({ success: true, muteAll: enabled });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/groups/:id/mute-member { userId, minutes } 群主/管理员禁言成员（minutes=0解除）
  router.post('/groups/:id/mute-member', authRequired, (req, res) => {
    try {
      const d = getDb();
      const row = d.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      const me = String(req.user.userId);
      if (!isGroupManager(row, me)) return res.status(403).json({ success: false, error: '仅群主/管理员可操作' });
      const target = String(req.body.userId || '');
      const members = JSON.parse(row.member_ids || '[]');
      if (!members.includes(target)) return res.status(400).json({ success: false, error: '该用户不在群内' });
      if (String(row.owner_id) === target) return res.status(400).json({ success: false, error: '不能禁言群主' });
      const minutes = Math.max(0, Math.min(parseInt(req.body.minutes, 10) || 0, 43200));
      const mutes = JSON.parse(row.member_mutes || '{}');
      if (minutes > 0) {
        mutes[target] = new Date(Date.now() + minutes * 60000).toISOString();
        notify(target, 'group_muted', { userId: me, nickname: '' }, `你已在「${row.name}」被禁言${minutes}分钟`, `/groups/chat?id=${row.id}`);
      } else {
        delete mutes[target];
      }
      d.prepare('UPDATE groups SET member_mutes = ? WHERE id = ?').run(JSON.stringify(mutes), row.id);
      res.json({ success: true, mutedUntil: mutes[target] || '' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/groups/:id/nickname { nickname } 设置我的群昵称
  router.post('/groups/:id/nickname', authRequired, (req, res) => {
    try {
      const d = getDb();
      const row = d.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      const me = String(req.user.userId);
      const members = JSON.parse(row.member_ids || '[]');
      if (!members.includes(me)) return res.status(403).json({ success: false, error: '你不是群成员' });
      const nick = String(req.body.nickname || '').trim().slice(0, 20);
      const nicks = JSON.parse(row.member_nicknames || '{}');
      if (nick) nicks[me] = nick; else delete nicks[me];
      d.prepare('UPDATE groups SET member_nicknames = ? WHERE id = ?').run(JSON.stringify(nicks), row.id);
      res.json({ success: true, groupNickname: nick });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/groups/:id/invite { userIds: [] } 成员邀请好友入群（v1直接入群+通知）
  router.post('/groups/:id/invite', authRequired, (req, res) => {
    try {
      const d = getDb();
      const row = d.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      const me = String(req.user.userId);
      const members = JSON.parse(row.member_ids || '[]');
      if (!members.includes(me)) return res.status(403).json({ success: false, error: '你不是群成员' });
      const userIds = Array.isArray(req.body.userIds) ? req.body.userIds.map(String).slice(0, 50) : [];
      if (!userIds.length) return res.status(400).json({ success: false, error: '请选择要邀请的好友' });
      const added = [];
      const info = userPublicInfo(me) || { nickname: '成员' };
      for (const uid of userIds) {
        if (members.includes(uid)) continue; // 已在群
        members.push(uid);
        added.push(uid);
        notify(uid, 'group_invite', { userId: me, nickname: info.nickname }, `「${info.nickname}」邀请你加入群「${row.name}」`, `/groups/chat?id=${row.id}`);
      }
      if (added.length) {
        d.prepare('UPDATE groups SET member_ids = ? WHERE id = ?').run(JSON.stringify(members), row.id);
        const updated = d.prepare('SELECT * FROM groups WHERE id = ?').get(row.id);
        res.json({ success: true, group: groupToVo(updated), added });
      } else {
        res.json({ success: true, group: groupToVo(row), added: [] });
      }
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/groups/:id/report { reason } 举报群（幂等：同人同群仅一次）
  router.post('/groups/:id/report', authRequired, (req, res) => {
    try {
      const d = getDb();
      const row = d.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      const me = String(req.user.userId);
      const dup = d.prepare('SELECT 1 FROM reports WHERE target_type = ? AND target_id = ? AND reporter_id = ?').get('group', String(row.id), me);
      if (dup) return res.json({ success: true, duplicated: true, message: '已收到你的举报，请勿重复提交' });
      const info = userPublicInfo(me) || { nickname: '' };
      d.prepare('INSERT INTO reports (target_type, target_id, reporter_id, reporter_name, reason) VALUES (?,?,?,?,?)')
        .run('group', String(row.id), me, info.nickname || '', String(req.body.reason || '其他').trim().slice(0, 200));
      res.json({ success: true, message: '举报已提交，平台将尽快核实处理' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/messages/:msgId/report { reason } 举报消息（私聊/群聊通用）
  router.post('/messages/:msgId/report', authRequired, (req, res) => {
    try {
      const d = getDb();
      const msg = d.prepare('SELECT * FROM chat_messages WHERE id = ?').get(parseInt(req.params.msgId, 10));
      if (!msg) return res.status(404).json({ success: false, error: '消息不存在' });
      const me = String(req.user.userId);
      // 仅会话相关人可举报（发送者或私聊对方或群成员）
      const cid = msg.conversation_id;
      let related = String(msg.sender_id) === me;
      if (!related && cid.startsWith('private:')) {
        const parts = cid.split(':');
        related = parts.length === 3 && (parts[1] === me || parts[2] === me);
      } else if (!related && cid.startsWith('group:')) {
        const g = d.prepare('SELECT member_ids FROM groups WHERE id = ?').get(parseInt(cid.slice(6), 10));
        related = !!(g && JSON.parse(g.member_ids || '[]').includes(me));
      }
      if (!related) return res.status(403).json({ success: false, error: '无权举报该消息' });
      const dup = d.prepare('SELECT 1 FROM reports WHERE target_type = ? AND target_id = ? AND reporter_id = ?').get('message', String(msg.id), me);
      if (dup) return res.json({ success: true, duplicated: true, message: '已收到你的举报，请勿重复提交' });
      const info = userPublicInfo(me) || { nickname: '' };
      d.prepare('INSERT INTO reports (target_type, target_id, reporter_id, reporter_name, reason) VALUES (?,?,?,?,?)')
        .run('message', String(msg.id), me, info.nickname || '', String(req.body.reason || '其他').trim().slice(0, 200));
      res.json({ success: true, message: '举报已提交，平台将尽快核实处理' });
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

  // POST /api/social/groups/:id/messages { content, clientMsgId? }
  // v25.0.42：全员禁言/成员禁言拦截 + clientMsgId 幂等 + 群昵称 + 统一会话模型 + 通知链接query修复
  router.post('/groups/:id/messages', authRequired, (req, res) => {
    try {
      const { content, type = 'text', clientMsgId = '' } = req.body;
      if (!content || !String(content).trim()) return res.status(400).json({ success: false, error: '消息不能为空' });
      // v25.0.61 D19：平台级禁言（群主/管理员同样受平台禁言约束）
      const _pmute = checkPlatformMute(req.user.userId);
      if (_pmute) return res.status(403).json({ success: false, error: `你已被禁言（剩余约${_pmute.remainMinutes}分钟），暂不能发送消息`, code: 'USER_MUTED' });
      const d = getDb();
      const row = d.prepare('SELECT * FROM groups WHERE id = ?').get(parseInt(req.params.id, 10));
      if (!row) return res.status(404).json({ success: false, error: '群不存在' });
      const members = JSON.parse(row.member_ids || '[]');
      const me = String(req.user.userId);
      if (!members.includes(me)) return res.status(403).json({ success: false, error: '你不是群成员' });

      // v25.0.42：禁言拦截（群主/管理员不受限）
      const manager = isGroupManager(row, me);
      if (!manager) {
        if (row.mute_all) return res.status(403).json({ success: false, error: '群主已开启全员禁言' });
        const remain = memberMuteRemain(row, me);
        if (remain > 0) return res.status(403).json({ success: false, error: `你已被禁言，剩余${Math.ceil(remain / 60)}分钟` });
      }

      // v25.0.42：文字消息敏感词过滤（与私聊同源）
      if (String(type) !== 'image') {
        const text = String(content).trim().slice(0, 3000);
        const hits = findSensitiveWords(text);
        if (hits.length) {
          logSensitive(me, 'group_message', text, hits);
          return res.status(400).json({ success: false, error: '消息包含违规内容，已拦截' });
        }
      }

      const convId = `group:${row.id}`;
      // v25.0.42：clientMsgId 幂等
      const cmi = String(clientMsgId || '').slice(0, 64);
      if (cmi) {
        const dup = d.prepare('SELECT * FROM chat_messages WHERE conversation_id = ? AND client_msg_id = ?').get(convId, cmi);
        if (dup) {
          return res.json({ success: true, duplicated: true, message: { id: String(dup.id), senderId: dup.sender_id, senderName: dup.sender_name, content: dup.content, type: dup.msg_type, createdAt: dup.created_at } });
        }
      }

      // v25.0.42：群昵称优先（群内显示名）
      const nicks = JSON.parse(row.member_nicknames || '{}');
      const info = userPublicInfo(me) || { nickname: '国学爱好者' };
      const displayName = nicks[me] || info.nickname;
      const result = d.prepare('INSERT INTO chat_messages (conversation_id, sender_id, sender_name, content, msg_type, client_msg_id) VALUES (?,?,?,?,?,?)')
        .run(convId, me, displayName, String(content).trim().slice(0, 3000), String(type) === 'image' ? 'image' : 'text', cmi);

      // v25.0.42：统一会话模型（全员会话维护，发送方已读推进）
      for (const memberId of members) {
        upsertUserConversation(d, memberId, convId, 'group', '', row.id, Number(result.lastInsertRowid), String(memberId) === me);
      }

      for (const memberId of members) {
        if (memberId !== me) notify(memberId, 'group_chat', { userId: me, nickname: displayName }, `在「${row.name}」发来消息`, `/groups/chat?id=${row.id}`);
      }
      const msg = d.prepare('SELECT * FROM chat_messages WHERE id = ?').get(result.lastInsertRowid);
      res.json({ success: true, message: { id: String(msg.id), senderId: msg.sender_id, senderName: msg.sender_name, content: msg.content, type: msg.msg_type, createdAt: msg.created_at } });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ==================== v25.0.42：统一会话模型（消息中心） ====================

  // GET /api/social/conversations 统一会话列表（私聊+群聊，服务端未读跨设备可恢复）
  router.get('/conversations', authRequired, (req, res) => {
    try {
      const d = getDb();
      const me = String(req.user.userId);
      const rows = d.prepare('SELECT * FROM user_conversations WHERE user_id = ? AND hidden = 0 ORDER BY pinned DESC, updated_at DESC LIMIT 200').all(me);
      const conversations = [];
      let totalUnread = 0;
      for (const r of rows) {
        const lastRow = d.prepare('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1').get(r.conversation_id);
        if (!lastRow) continue; // 无消息的空会话不展示
        const unread = d.prepare('SELECT COUNT(*) AS c FROM chat_messages WHERE conversation_id = ? AND id > ? AND sender_id != ?').get(r.conversation_id, r.last_read_msg_id, me).c;
        if (!r.muted) totalUnread += unread; // 免打扰会话不计入总未读（微信同款角标语义）
        const conv = {
          conversationId: r.conversation_id,
          type: r.conv_type, // 'private' | 'group'
          pinned: !!r.pinned,
          muted: !!r.muted,
          updatedAt: r.updated_at,
          unread,
          lastMessage: {
            id: String(lastRow.id),
            senderId: lastRow.sender_id,
            senderName: lastRow.sender_name,
            content: lastRow.msg_type === 'image' ? '[图片]' : String(lastRow.content).slice(0, 60),
            type: lastRow.msg_type,
            createdAt: lastRow.created_at,
          },
        };
        if (r.conv_type === 'private') {
          const info = userPublicInfo(r.peer_id);
          conv.peerId = r.peer_id;
          conv.name = info ? info.nickname : `用户${r.peer_id}`;
          conv.avatar = info ? info.avatar : '';
          conv.lastMessage.preview = lastRow.sender_id === me ? `我: ${conv.lastMessage.content}` : conv.lastMessage.content;
        } else {
          const g = d.prepare('SELECT * FROM groups WHERE id = ?').get(r.group_id);
          if (!g) continue; // 群已解散/删除
          conv.groupId = String(g.id);
          conv.name = g.name;
          conv.avatar = g.avatar || '';
          conv.memberCount = JSON.parse(g.member_ids || '[]').length;
          conv.lastMessage.preview = `${lastRow.sender_id === me ? '我' : lastRow.sender_name}: ${conv.lastMessage.content}`;
        }
        conversations.push(conv);
      }
      // 系统通知未读并入总未读（消息中心统一入口）
      const sysUnread = d.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0').get(me).c;
      res.json({ success: true, conversations, totalUnread, notificationUnread: sysUnread });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/conversations/:conversationId/read 进入会话清未读（服务端持久化，跨设备一致）
  router.post('/conversations/:conversationId/read', authRequired, (req, res) => {
    try {
      const d = getDb();
      const me = String(req.user.userId);
      const convId = String(req.params.conversationId || '');
      const row = d.prepare('SELECT * FROM user_conversations WHERE user_id = ? AND conversation_id = ?').get(me, convId);
      const maxRow = d.prepare('SELECT MAX(id) AS m FROM chat_messages WHERE conversation_id = ?').get(convId);
      const maxId = (maxRow && maxRow.m) || 0;
      if (row) {
        d.prepare('UPDATE user_conversations SET last_read_msg_id = MAX(last_read_msg_id, ?) WHERE user_id = ? AND conversation_id = ?').run(maxId, me, convId);
      } else {
        const convType = convId.startsWith('group:') ? 'group' : 'private';
        let peerId = '', groupId = 0;
        if (convType === 'private') { const p = convId.split(':'); peerId = (p[1] === me ? p[2] : p[1]) || ''; }
        else groupId = parseInt(convId.slice(6), 10) || 0;
        d.prepare('INSERT OR IGNORE INTO user_conversations (user_id, conversation_id, conv_type, peer_id, group_id, last_read_msg_id) VALUES (?,?,?,?,?,?)')
          .run(me, convId, convType, peerId, groupId, maxId);
      }
      res.json({ success: true, lastReadMsgId: maxId });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/conversations/:conversationId/pin 置顶切换
  router.post('/conversations/:conversationId/pin', authRequired, (req, res) => {
    try {
      const d = getDb();
      const me = String(req.user.userId);
      const convId = String(req.params.conversationId || '');
      const row = d.prepare('SELECT * FROM user_conversations WHERE user_id = ? AND conversation_id = ?').get(me, convId);
      if (!row) return res.status(404).json({ success: false, error: '会话不存在' });
      d.prepare('UPDATE user_conversations SET pinned = ? WHERE user_id = ? AND conversation_id = ?').run(row.pinned ? 0 : 1, me, convId);
      res.json({ success: true, pinned: !row.pinned });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/conversations/:conversationId/mute 免打扰切换
  router.post('/conversations/:conversationId/mute', authRequired, (req, res) => {
    try {
      const d = getDb();
      const me = String(req.user.userId);
      const convId = String(req.params.conversationId || '');
      const row = d.prepare('SELECT * FROM user_conversations WHERE user_id = ? AND conversation_id = ?').get(me, convId);
      if (!row) return res.status(404).json({ success: false, error: '会话不存在' });
      d.prepare('UPDATE user_conversations SET muted = ? WHERE user_id = ? AND conversation_id = ?').run(row.muted ? 0 : 1, me, convId);
      res.json({ success: true, muted: !row.muted });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // DELETE /api/social/conversations/:conversationId 删除会话（仅隐藏，新消息自动恢复）
  router.delete('/conversations/:conversationId', authRequired, (req, res) => {
    try {
      const d = getDb();
      const me = String(req.user.userId);
      const convId = String(req.params.conversationId || '');
      d.prepare('UPDATE user_conversations SET hidden = 1 WHERE user_id = ? AND conversation_id = ?').run(me, convId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ==================== v25.0.42：服务端黑名单 ====================

  // GET /api/social/blacklist 我的黑名单（含用户资料）
  router.get('/blacklist', authRequired, (req, res) => {
    try {
      const rows = getDb().prepare('SELECT * FROM blacklists WHERE user_id = ? ORDER BY created_at DESC').all(String(req.user.userId))
        .map(r => {
          const info = userPublicInfo(r.blocked_id) || {};
          return { userId: String(r.blocked_id), nickname: info.nickname || `用户${r.blocked_id}`, avatar: info.avatar || '', createdAt: r.created_at };
        });
      res.json({ success: true, blacklist: rows });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/blacklist/:userId 加入黑名单（自动解除好友关系）
  router.post('/blacklist/:userId', authRequired, (req, res) => {
    try {
      const d = getDb();
      const me = String(req.user.userId);
      const target = String(req.params.userId || '');
      if (!target || target === me) return res.status(400).json({ success: false, error: '参数错误' });
      d.prepare('INSERT OR IGNORE INTO blacklists (user_id, blocked_id) VALUES (?,?)').run(me, target);
      // 自动解除好友关系 + 清理双向 pending 申请
      const [a, b] = friendKeyPair(me, target);
      d.prepare('DELETE FROM friendships WHERE user_a = ? AND user_b = ?').run(a, b);
      d.prepare(`UPDATE friend_requests SET status = 'rejected', updated_at = datetime('now','localtime') WHERE ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)) AND status = 'pending'`).run(me, target, target, me);
      // 对方拉黑列表不动（单向黑名单，各自管理）
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // DELETE /api/social/blacklist/:userId 移出黑名单
  router.delete('/blacklist/:userId', authRequired, (req, res) => {
    try {
      const d = getDb();
      const me = String(req.user.userId);
      d.prepare('DELETE FROM blacklists WHERE user_id = ? AND blocked_id = ?').run(me, String(req.params.userId || ''));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ==================== v25.0.42：动态收藏 + 好友备注 ====================

  // POST /api/social/posts/:postId/favorite 收藏/取消收藏
  router.post('/posts/:postId/favorite', authRequired, (req, res) => {
    try {
      const d = getDb();
      const postId = req.params.postId;
      const me = String(req.user.userId);
      const post = d.prepare('SELECT * FROM posts WHERE post_id = ? AND status = ?').get(postId, 'active');
      if (!post) return res.status(404).json({ success: false, error: '动态不存在' });
      const existing = d.prepare('SELECT 1 FROM favorites WHERE post_id = ? AND user_id = ?').get(postId, me);
      if (existing) {
        d.prepare('DELETE FROM favorites WHERE post_id = ? AND user_id = ?').run(postId, me);
        res.json({ success: true, favorited: false });
      } else {
        d.prepare('INSERT INTO favorites (post_id, user_id) VALUES (?,?)').run(postId, me);
        res.json({ success: true, favorited: true });
      }
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/social/favorites/mine 我的收藏列表
  router.get('/favorites/mine', authRequired, (req, res) => {
    try {
      const d = getDb();
      const me = String(req.user.userId);
      const rows = d.prepare(`SELECT p.* FROM favorites f JOIN posts p ON p.post_id = f.post_id WHERE f.user_id = ? AND p.status = 'active' ORDER BY f.created_at DESC LIMIT 100`).all(me);
      res.json({ success: true, posts: rows.map(r => rowToPost(r, me)) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/social/friends/:userId/remark { remark } 设置好友备注（服务端持久化）
  router.post('/friends/:userId/remark', authRequired, (req, res) => {
    try {
      const d = getDb();
      const me = String(req.user.userId);
      const friendId = String(req.params.userId || '');
      const [a, b] = friendKeyPair(me, friendId);
      if (!d.prepare('SELECT 1 FROM friendships WHERE user_a = ? AND user_b = ?').get(a, b)) {
        return res.status(400).json({ success: false, error: '对方不是你的好友' });
      }
      const remark = String(req.body.remark || '').trim().slice(0, 20);
      d.prepare(`INSERT INTO friend_remarks (user_id, friend_id, remark, updated_at) VALUES (?,?,?,datetime('now','localtime'))
        ON CONFLICT(user_id, friend_id) DO UPDATE SET remark = excluded.remark, updated_at = datetime('now','localtime')`)
        .run(me, friendId, remark);
      res.json({ success: true, remark });
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

  router.get('/users/:userId/profile', authOptional, (req, res) => {
    const info = userPublicInfo(req.params.userId);
    if (!info) return res.status(404).json({ success: false, error: '用户不存在' });
    const d = getDb();
    const posts = d.prepare(`SELECT COUNT(*) AS c FROM posts WHERE user_id = ? AND status='active'`).get(info.userId).c;
    const followers = d.prepare('SELECT COUNT(*) AS c FROM follows WHERE followed_id = ?').get(info.userId).c;
    const following = d.prepare('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?').get(info.userId).c;
    // v25.0.41：附带当前登录用户与目标用户的关系（好友/备注/拉黑），供唯一用户资料页使用
    let rel = {};
    if (req.user) {
      const me = String(req.user.userId);
      if (me !== info.userId) {
        const [fa, fb] = friendKeyPair(me, info.userId);
        const isFriend = !!d.prepare('SELECT 1 AS x FROM friendships WHERE user_a = ? AND user_b = ?').get(fa, fb);
        const remarkRow = d.prepare('SELECT remark FROM friend_remarks WHERE user_id = ? AND friend_id = ?').get(me, info.userId);
        rel = {
          isFriend,
          friendRemark: remarkRow ? remarkRow.remark : '',
          blockedByMe: !!d.prepare('SELECT 1 AS x FROM blacklists WHERE user_id = ? AND blocked_id = ?').get(me, info.userId),
          blockingMe: !!d.prepare('SELECT 1 AS x FROM blacklists WHERE user_id = ? AND blocked_id = ?').get(info.userId, me),
        };
      } else {
        rel = { isSelf: true };
      }
    }
    res.json({ success: true, user: { ...info, postCount: posts, followerCount: followers, followingCount: following, ...rel } });
  });

  return router;
}

module.exports = { createRouter };
