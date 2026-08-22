// ============================================================================
// Feature Control 总中心 - v25.0.47_10 (FINAL-ADMIN-COMMERCIAL-SEAL-02)
// 动态系统功能开关：ON / OFF / MAINTENANCE 三态
// - 后台 SUPER_ADMIN 可改，全部操作写审计日志
// - 服务端强制：被关闭能力的核心 API 直接拒绝（不只前端隐藏）
// - 公开只读接口 GET /api/public/feature-flags 供前端镜像
// 挂载：/api/admin/feature-flags（管理） + /api/public/feature-flags（公开）
// ============================================================================
'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

const DATA_DIR = path.join(__dirname, 'data');
const FLAGS_FILE = path.join(DATA_DIR, 'feature-flags.json');

// 角色权限（与 adminUnifiedRoutes 一致）
const ROLES = { SUPER_ADMIN: 50, ADMIN: 40, CONTENT_ADMIN: 30, FINANCE_ADMIN: 30, SUPPORT_ADMIN: 20 };

// ==================== 默认开关矩阵（全 ON）====================
// key: 开关ID  name: 显示名  enforcePaths: 服务端强制拦截的路径前缀/精确路径
const DEFAULT_FLAGS = {
  home:       { name: '首页',       status: 'ON', desc: '产品首页' },
  discover:   { name: '发现/资讯',  status: 'ON', desc: '发现页与资讯流', enforcePaths: ['/api/news'] },
  chat:       { name: '聊天',       status: 'ON', desc: '即时聊天' },
  friends:    { name: '好友',       status: 'ON', desc: '好友关系' },
  groups:     { name: '群聊',       status: 'ON', desc: '群聊功能' },
  learning:   { name: '学习空间',   status: 'ON', desc: '学习资料' },
  tcm:        { name: '中医',       status: 'ON', desc: '中医学习/问诊' },
  yikao:      { name: '医考',       status: 'ON', desc: '医学考试内容' },
  ai:         { name: 'AI 功能',    status: 'ON', desc: '全部AI解读/问诊', enforcePaths: ['/api/ai/chat', '/api/ai/stream'] },
  marketing:  { name: '营销内容',   status: 'ON', desc: '营销物料生成' },
  poster:     { name: '海报',       status: 'ON', desc: '分享海报生成' },
  promotion:  { name: '推广/邀请',  status: 'ON', desc: '邀请注册与推广页' },
  commission: { name: '分佣',       status: 'ON', desc: '推荐佣金结算' },
  payment:    { name: '支付',       status: 'ON', desc: '全部支付下单', enforcePaths: ['/api/payment/create'] },
  upload:     { name: '上传',       status: 'ON', desc: '图片/文件上传' },
  storefront: { name: '橱窗',       status: 'ON', desc: '用户橱窗展示' },
  newsLinks:  { name: '资讯外链',   status: 'ON', desc: '资讯站外链接跳转' },
};

function loadFlags() {
  try {
    if (fs.existsSync(FLAGS_FILE)) {
      const saved = JSON.parse(fs.readFileSync(FLAGS_FILE, 'utf-8'));
      // 合并默认（新增开关自动补 ON），保留已保存状态
      const merged = {};
      for (const k of Object.keys(DEFAULT_FLAGS)) {
        merged[k] = { ...DEFAULT_FLAGS[k], ...(saved.flags && saved.flags[k] ? { status: saved.flags[k].status } : {}) };
      }
      return { flags: merged, updatedAt: saved.updatedAt || null };
    }
  } catch (e) { console.error('[featureControl] 读取失败:', e.message); }
  return { flags: JSON.parse(JSON.stringify(DEFAULT_FLAGS)), updatedAt: null };
}

function saveFlags(flags, operator) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FLAGS_FILE, JSON.stringify({ flags, updatedAt: new Date().toISOString(), updatedBy: operator }, null, 2), 'utf-8');
}

// ==================== 鉴权 ====================

function resolveAdminKey(token) {
  try {
    const keysFile = path.join(DATA_DIR, 'admin-keys.json');
    if (!fs.existsSync(keysFile) || !token) return null;
    const keys = JSON.parse(fs.readFileSync(keysFile, 'utf-8'));
    const h = crypto.createHash('sha256').update(String(token)).digest('hex');
    const hit = (keys.keys || []).find(k => k.keyHash === h && k.status === 'active');
    return hit ? { name: hit.name, role: hit.role } : null;
  } catch { return null; }
}

function adminAuthUnified(minRole) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const admin = resolveAdminKey(token);
    if (!admin) return res.status(401).json({ success: false, error: '密钥无效' });
    if (minRole && (ROLES[admin.role] || 0) < ROLES[minRole]) {
      return res.status(403).json({ success: false, error: `权限不足（需要${minRole}）` });
    }
    req.admin = admin;
    next();
  };
}

function audit(admin, action, target, oldValue, newValue, reason, req) {
  try {
    const logFile = path.join(DATA_DIR, 'admin-audit.json');
    let logs = [];
    if (fs.existsSync(logFile)) logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    logs.unshift({
      id: Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
      operator: admin.name || 'unknown', operatorRole: admin.role,
      time: new Date().toISOString(), action, target: String(target || ''),
      oldValue: oldValue === undefined ? null : oldValue,
      newValue: newValue === undefined ? null : newValue,
      reason: reason || '', ip: (req.headers['x-forwarded-for'] || '').split(',')[0] || '',
    });
    if (logs.length > 5000) logs = logs.slice(0, 5000);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (e) { console.error('[featureControl] 审计写入失败:', e.message); }
}

// ==================== 管理接口 ====================

router.get('/', adminAuthUnified('ADMIN'), (_req, res) => {
  res.json({ success: true, data: loadFlags() });
});

router.put('/', adminAuthUnified('SUPER_ADMIN'), (req, res) => {
  const { flagKey, status, reason } = req.body || {};
  if (!flagKey || !DEFAULT_FLAGS[flagKey]) {
    return res.status(400).json({ success: false, error: '未知开关项: ' + flagKey });
  }
  if (!['ON', 'OFF', 'MAINTENANCE'].includes(status)) {
    return res.status(400).json({ success: false, error: '状态仅支持 ON/OFF/MAINTENANCE' });
  }
  const cur = loadFlags();
  const oldValue = cur.flags[flagKey].status;
  if (oldValue === status) {
    return res.json({ success: true, data: cur, message: '状态未变化' });
  }
  cur.flags[flagKey].status = status;
  saveFlags(cur.flags, req.admin.name);
  audit(req.admin, 'FEATURE_FLAG_UPDATE', flagKey, oldValue, status, reason || `开关 ${flagKey}: ${oldValue} → ${status}`, req);
  console.log(`[featureControl] ${req.admin.name}(${req.admin.role}) 开关 ${flagKey}: ${oldValue} → ${status}`);
  res.json({ success: true, data: cur });
});

// ==================== 公开只读接口（前端镜像用）====================

const publicRouter = express.Router();
publicRouter.get('/', (_req, res) => {
  const cur = loadFlags();
  // 公开版仅返回 key→status（不含内部描述）
  const flags = {};
  for (const [k, v] of Object.entries(cur.flags)) flags[k] = v.status;
  res.json({ success: true, data: { flags, updatedAt: cur.updatedAt } });
});

// ==================== 对外导出（服务端强制用）====================

/** 查询指定开关当前状态（含缓存 5 秒，避免每请求读盘） */
const _cache = { at: 0, flags: null };
function getFlagStatus(flagKey) {
  const now = Date.now();
  if (!_cache.flags || now - _cache.at > 5000) {
    _cache.flags = loadFlags().flags;
    _cache.at = now;
  }
  const f = _cache.flags[flagKey];
  return f ? f.status : 'ON';
}

/**
 * 全局功能开关强制中间件（FINAL-ADMIN-COMMERCIAL-SEAL-02 第五章）
 * 服务端最终裁决：被关闭能力的核心 API 直接 403（不只前端隐藏）。
 * 放行：/api/admin*（管理操作）、/api/public*（公开配置）、支付回调、健康检查。
 */
function globalFeatureGate() {
  return (req, res, next) => {
    try {
      const p = req.path || '/';
      if (p.startsWith('/api/admin') || p.startsWith('/api/public') || p.includes('/callback') || p === '/api/health') return next();
      for (const [key, def] of Object.entries(DEFAULT_FLAGS)) {
        for (const ep of def.enforcePaths || []) {
          if (p === ep || p.startsWith(ep + '/')) {
            const status = getFlagStatus(key);
            if (status === 'ON') return next();
            return res.status(403).json({
              success: false,
              error: status === 'MAINTENANCE' ? `${def.name}功能维护中，请稍后再试` : `${def.name}功能已关闭`,
              code: status === 'MAINTENANCE' ? 'FEATURE_MAINTENANCE' : 'FEATURE_DISABLED',
              flag: key, flagStatus: status,
            });
          }
        }
      }
      return next();
    } catch (e) {
      // 开关层故障不阻断业务
      return next();
    }
  };
}

/** 服务端强制中间件工厂：被关闭/维护的 flag 直接拒绝 */
function featureGate(flagKey, opts) {
  const o = opts || {};
  return (req, res, next) => {
    const status = getFlagStatus(flagKey);
    if (status === 'ON') return next();
    const flagName = (DEFAULT_FLAGS[flagKey] || {}).name || flagKey;
    if (status === 'MAINTENANCE' && o.allowMaintenance) return next();
    const errCode = status === 'MAINTENANCE' ? 'FEATURE_MAINTENANCE' : 'FEATURE_DISABLED';
    return res.status(403).json({
      success: false,
      error: status === 'MAINTENANCE' ? `${flagName}功能维护中，请稍后再试` : `${flagName}功能已关闭`,
      code: errCode,
      flag: flagKey,
      flagStatus: status,
    });
  };
}

/** 路径→开关 反查表（供外部扩展用） */
function buildPathRules() {
  const rules = [];
  for (const [key, def] of Object.entries(DEFAULT_FLAGS)) {
    for (const p of def.enforcePaths || []) rules.push({ path: p, flag: key });
  }
  return rules;
}

module.exports = { router, publicRouter, featureGate, getFlagStatus, globalFeatureGate, buildPathRules, DEFAULT_FLAGS, adminAuthUnified };
