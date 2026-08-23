/**
 * v25.0.47_13 FIX-WITHDRAW-V13-FINAL 统一后台角色权限模块
 *
 * 三级角色体系（服务端强校验，全后台唯一鉴权事实源）：
 *   SUPER_ADMIN(100)   超级管理员：全权限（价格配置/密钥管理/用户封禁/财务终审/系统开关/审计日志）
 *   FINANCE_ADMIN(60)  财务管理员：提现审核/订单流水/佣金报表/财务对账/提现记录导出（scope=finance）
 *   OPERATOR_ADMIN(60) 运营管理员：用户管理/资讯内容/工具开关/营销海报/数据总览（scope=ops）
 * 兼容存量角色：ADMIN(80, 全权限)、CONTENT_ADMIN(60, ops)、SUPPORT_ADMIN(40, ops)
 *
 * 密钥存储（第十章红线）：
 *   - 子密钥仅以 sha256 哈希存 data/admin_keys_v13.json，明文只在签发响应中出现一次
 *   - ADMIN_API_KEY 环境变量主密钥 = SUPER_ADMIN（向后兼容）
 *   - 兼容读取旧存储：admin_roles.json（明文）/ admin-keys.json（哈希数组），不迁移不删除
 *
 * 鉴权用法：router.get('/x', adminAuth('FINANCE_ADMIN', 'finance'), handler)
 *   - minRole：角色等级下限（不传=任意有效密钥）
 *   - scope：'finance' | 'ops'，角色scope不含该域则403（'*'通配全域）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const KEYS_FILE = path.join(DATA_DIR, 'admin_keys_v13.json');
const AUDIT_FILE = path.join(DATA_DIR, 'admin_audit.json');

// ==================== 角色定义 ====================

const ROLES = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  FINANCE_ADMIN: 60,
  OPERATOR_ADMIN: 60,
  CONTENT_ADMIN: 60,
  SUPPORT_ADMIN: 40,
};

const ROLE_SCOPES = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['*'],
  FINANCE_ADMIN: ['finance'],
  OPERATOR_ADMIN: ['ops'],
  CONTENT_ADMIN: ['ops'],
  SUPPORT_ADMIN: ['ops'],
};

const ROLE_LABELS = {
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  FINANCE_ADMIN: '财务管理员',
  OPERATOR_ADMIN: '运营管理员',
  CONTENT_ADMIN: '内容管理员',
  SUPPORT_ADMIN: '客服支持',
};

// ==================== 密钥存储（哈希） ====================

function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function loadKeys() {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      const j = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8'));
      if (j && j.keys) return j.keys;
    }
  } catch (e) { console.error('[AdminRoles] 密钥读取失败:', e.message); }
  return {};
}

function saveKeys(keys) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(KEYS_FILE, JSON.stringify({ keys, updatedAt: new Date().toISOString() }, null, 2));
}

/**
 * 解析密钥 → 管理员身份。查找顺序：
 * 1. ADMIN_API_KEY 环境变量（SUPER_ADMIN）
 * 2. admin_keys_v13.json 哈希存储（v25.0.47_13 主存储）
 * 3. 旧 admin-keys.json（哈希数组，兼容）
 * 4. 旧 admin_roles.json（明文，兼容）
 */
function resolveAdminKey(token) {
  if (!token) return null;
  const envKey = process.env.ADMIN_API_KEY;
  if (envKey && token === envKey) {
    return { key: token, role: 'SUPER_ADMIN', name: '主密钥管理员' };
  }
  const h = sha256(token);
  const keys = loadKeys();
  const hit = keys[h];
  if (hit && hit.status !== 'disabled') {
    return { key: token, role: ROLES[hit.role] ? hit.role : 'ADMIN', name: hit.name || '管理员' };
  }
  try {
    const legacy = path.join(DATA_DIR, 'admin-keys.json');
    if (fs.existsSync(legacy)) {
      const j = JSON.parse(fs.readFileSync(legacy, 'utf-8'));
      const f = (j.keys || []).find((k) => k.keyHash === h && k.status !== 'disabled');
      if (f) return { key: token, role: ROLES[f.role] ? f.role : 'ADMIN', name: f.name || '管理员' };
    }
  } catch (e) { /* ignore */ }
  try {
    const old = path.join(DATA_DIR, 'admin_roles.json');
    if (fs.existsSync(old)) {
      const j = JSON.parse(fs.readFileSync(old, 'utf-8'));
      if (j.keys && j.keys[token] && !j.keys[token].disabled) {
        const r = j.keys[token].role || 'ADMIN';
        return { key: token, role: ROLES[r] ? r : 'ADMIN', name: j.keys[token].name || '管理员' };
      }
    }
  } catch (e) { /* ignore */ }
  return null;
}

// ==================== 鉴权中间件 ====================

function hasScope(role, scope) {
  if (!scope) return true;
  const scopes = ROLE_SCOPES[role] || [];
  return scopes.includes('*') || scopes.includes(scope);
}

function adminAuth(minRole, scope) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const admin = resolveAdminKey(token);
    if (!admin) return res.status(401).json({ success: false, error: '密钥无效' });
    if (minRole && (ROLES[admin.role] || 0) < ROLES[minRole]) {
      audit(admin, 'AUDIT_BLOCK_ROLE', `${req.method} ${req.originalUrl || req.url}`, admin.role, minRole, `越权访问被拦截（需要${ROLE_LABELS[minRole] || minRole}及以上）`, req);
      return res.status(403).json({ success: false, error: `权限不足（需要${ROLE_LABELS[minRole] || minRole}及以上）` });
    }
    if (!hasScope(admin.role, scope)) {
      const domain = scope === 'finance' ? '财务' : scope === 'ops' ? '运营' : scope;
      audit(admin, 'AUDIT_BLOCK_SCOPE', `${req.method} ${req.originalUrl || req.url}`, admin.role, scope, `越权访问被拦截（当前角色无${domain}操作权限）`, req);
      return res.status(403).json({ success: false, error: `权限不足（当前角色无${domain}操作权限）` });
    }
    req.admin = admin;
    next();
  };
}

// ==================== 审计日志（全后台共用一份） ====================

function audit(admin, action, target, oldValue, newValue, reason, req) {
  try {
    const entry = {
      id: Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
      operator: (admin && admin.name) || 'unknown',
      operatorRole: (admin && admin.role) || 'unknown',
      time: new Date().toISOString(),
      action,
      target: String(target || ''),
      oldValue: oldValue === undefined ? null : oldValue,
      newValue: newValue === undefined ? null : newValue,
      reason: String(reason || ''),
      ip: ((req && req.headers['x-forwarded-for']) || (req && req.socket && req.socket.remoteAddress) || '').split(',')[0].trim(),
      ua: String((req && req.headers['user-agent']) || '').slice(0, 200),
    };
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8')); } catch { /* 新文件 */ }
    logs.push(entry);
    if (logs.length > 1000) logs = logs.slice(-1000);
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 1));
  } catch (e) {
    console.error('[AdminRoles] 审计写入失败:', e.message);
  }
}

// ==================== 子密钥签发/禁用（SUPER_ADMIN 专用） ====================

const KEY_PREFIX = { FINANCE_ADMIN: 'YD-FIN', OPERATOR_ADMIN: 'YD-OPS', ADMIN: 'YD-ADM', CONTENT_ADMIN: 'YD-CTN', SUPPORT_ADMIN: 'YD-SUP' };

/** 签发子密钥（明文仅本次返回，落盘只存哈希）。SUPER_ADMIN 不允许签发（仅环境变量主密钥）。 */
function createSubKey(role, name) {
  if (!ROLES[role]) return { ok: false, error: '角色无效' };
  if (role === 'SUPER_ADMIN') return { ok: false, error: 'SUPER_ADMIN 仅允许环境变量主密钥，不可签发' };
  const prefix = KEY_PREFIX[role] || 'YD-KEY';
  const newKey = `${prefix}-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
  const keys = loadKeys();
  keys[sha256(newKey)] = {
    role,
    name: String(name || ROLE_LABELS[role] || role).slice(0, 24),
    createdAt: new Date().toISOString(),
    status: 'active',
  };
  saveKeys(keys);
  return { ok: true, key: newKey, role, name };
}

/** 列出子密钥（脱敏展示，不返回明文/哈希全量） */
function listSubKeys() {
  const keys = loadKeys();
  return Object.entries(keys).map(([h, v]) => ({
    masked: h.slice(0, 8) + '…' + h.slice(-6),
    role: v.role,
    name: v.name,
    createdAt: v.createdAt,
    status: v.status || 'active',
  }));
}

/** 禁用子密钥（按掩码或哈希前缀匹配） */
function disableSubKey(maskedOrHash) {
  const keys = loadKeys();
  const target = Object.keys(keys).find((h) => h === maskedOrHash || (maskedOrHash && h.startsWith(String(maskedOrHash).split('…')[0])));
  if (!target) return { ok: false, error: '未找到该子密钥' };
  const old = { ...keys[target] };
  keys[target].status = 'disabled';
  keys[target].disabledAt = new Date().toISOString();
  saveKeys(keys);
  return { ok: true, old };
}

/** 查询审计日志（最新在前，可按 action 关键字过滤） */
function listAudit(limit = 50, action) {
  let logs = [];
  try { logs = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8')); } catch { /* 空 */ }
  let list = logs.slice().reverse();
  if (action) list = list.filter((l) => (l.action || '').includes(action));
  return list.slice(0, Math.min(200, limit));
}

module.exports = {
  ROLES,
  ROLE_SCOPES,
  ROLE_LABELS,
  adminAuth,
  resolveAdminKey,
  hasScope,
  audit,
  listAudit,
  createSubKey,
  listSubKeys,
  disableSubKey,
  sha256,
};
