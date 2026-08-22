// ============================================================================
// 工具管理矩阵（服务端 SSOT）- v25.0.47_10 (FINAL-ADMIN-COMMERCIAL-SEAL-02 第四/五章)
// 14 款正式工具的：启用状态/维护模式/收费模式/会员要求/单次价格/AI开关/额度消耗/
// 每日次数/分享开关/五端平台开关
// - GET/PUT /api/admin/tool-matrix（ADMIN 管理，SUPER_ADMIN 也覆盖）
// - GET /api/public/tool-matrix（公开只读，供前端工具页/维护提示/价格展示）
// - 服务端强制：/api/ai/chat 携带 toolId 时按矩阵 status/aiEnabled 拒绝
// 红线：本矩阵只控制 开放/收费/权限/额度/平台，不含任何算法字段
// ============================================================================
'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const DATA_DIR = path.join(__dirname, 'data');
const MATRIX_FILE = path.join(DATA_DIR, 'tool-matrix.json');

const ROLES = { SUPER_ADMIN: 50, ADMIN: 40, CONTENT_ADMIN: 30, FINANCE_ADMIN: 30, SUPPORT_ADMIN: 20 };

// ==================== 默认工具矩阵（与正式 14 款工具对齐）====================
const DEFAULT_MATRIX = {
  bazi:     { name: '八字排盘',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  ziwei:    { name: '紫微斗数',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  qimen:    { name: '奇门遁甲',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  liuyao:   { name: '六爻起卦',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  daliuren: { name: '大六壬',       status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  meihua:   { name: '梅花易数',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  zeri:     { name: '择日择吉',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: true,  qqMp: true },
  hehun:    { name: '八字合婚',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  tarot:    { name: '塔罗占卜',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  astrology:{ name: '星座运势',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  name_analysis:  { name: '姓名深度解析', status: 'ON', payMode: 'ONE_TIME',   price: 9.9,  memberLevel: 'basic', aiEnabled: true, aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  phone_number:   { name: '手机号解读',   status: 'ON', payMode: 'ONE_TIME',   price: 18,   memberLevel: 'basic', aiEnabled: true, aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  license_plate:  { name: '车牌合号',     status: 'ON', payMode: 'ONE_TIME',   price: 18,   memberLevel: 'basic', aiEnabled: true, aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  wenzhen:  { name: '中医问诊',     status: 'ON', payMode: 'ONE_TIME',   price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
};

function loadMatrix() {
  try {
    if (fs.existsSync(MATRIX_FILE)) {
      const saved = JSON.parse(fs.readFileSync(MATRIX_FILE, 'utf-8'));
      const merged = {};
      for (const k of Object.keys(DEFAULT_MATRIX)) {
        merged[k] = { ...DEFAULT_MATRIX[k], ...(saved.tools && saved.tools[k] ? saved.tools[k] : {}) };
      }
      return { tools: merged, updatedAt: saved.updatedAt || null };
    }
  } catch (e) { console.error('[toolMatrix] 读取失败:', e.message); }
  return { tools: JSON.parse(JSON.stringify(DEFAULT_MATRIX)), updatedAt: null };
}

function saveMatrix(tools, operator) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(MATRIX_FILE, JSON.stringify({ tools, updatedAt: new Date().toISOString(), updatedBy: operator }, null, 2), 'utf-8');
}

// ==================== 鉴权（复用统一密钥体系）====================

function resolveAdminKey(token) {
  try {
    // v25.0.47_10: 环境变量主密钥映射 SUPER_ADMIN（与 adminUnifiedRoutes 认证一致）
    const envKey = process.env.ADMIN_API_KEY;
    if (envKey && token && token === envKey) return { name: 'env-admin', role: 'SUPER_ADMIN' };
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
  } catch (e) { console.error('[toolMatrix] 审计写入失败:', e.message); }
}

// ==================== 接口 ====================

router.get('/', adminAuthUnified('ADMIN'), (_req, res) => {
  res.json({ success: true, data: loadMatrix() });
});

// 单工具更新（字段级 patch，白名单校验）
const ALLOWED_FIELDS = ['status', 'payMode', 'price', 'memberLevel', 'aiEnabled', 'aiCreditCost', 'dailyLimit', 'shareEnabled', 'web', 'android', 'ios', 'wechatMp', 'qqMp'];

router.put('/', adminAuthUnified('ADMIN'), (req, res) => {
  const { toolId, patch, reason } = req.body || {};
  if (!toolId || !DEFAULT_MATRIX[toolId]) {
    return res.status(400).json({ success: false, error: '未知工具: ' + toolId });
  }
  if (!patch || typeof patch !== 'object') {
    return res.status(400).json({ success: false, error: '缺少 patch' });
  }
  for (const k of Object.keys(patch)) {
    if (!ALLOWED_FIELDS.includes(k)) {
      return res.status(400).json({ success: false, error: `字段不允许修改: ${k}（红线字段禁止）` });
    }
  }
  if (patch.status && !['ON', 'OFF', 'MAINTENANCE'].includes(patch.status)) {
    return res.status(400).json({ success: false, error: 'status 仅支持 ON/OFF/MAINTENANCE' });
  }
  if (patch.payMode && !['FREE', 'MEMBERSHIP', 'ONE_TIME', 'AI_CREDIT', 'DISABLED'].includes(patch.payMode)) {
    return res.status(400).json({ success: false, error: 'payMode 仅支持 FREE/MEMBERSHIP/ONE_TIME/AI_CREDIT/DISABLED' });
  }
  if (patch.price != null && (Number(patch.price) < 0 || Number(patch.price) > 100000)) {
    return res.status(400).json({ success: false, error: '价格超出合理范围' });
  }

  const cur = loadMatrix();
  const oldValue = { ...cur.tools[toolId] };
  cur.tools[toolId] = { ...cur.tools[toolId], ...patch };
  saveMatrix(cur.tools, req.admin.name);
  audit(req.admin, 'TOOL_MATRIX_UPDATE', toolId,
    { status: oldValue.status, payMode: oldValue.payMode, price: oldValue.price },
    { status: cur.tools[toolId].status, payMode: cur.tools[toolId].payMode, price: cur.tools[toolId].price },
    reason || '', req);
  console.log(`[toolMatrix] ${req.admin.name} 更新 ${toolId}: ${JSON.stringify(patch)}`);
  res.json({ success: true, data: cur });
});

// ==================== 公开只读接口（前端工具页用：维护提示/价格/会员要求）====================

const publicRouter = express.Router();
publicRouter.get('/', (_req, res) => {
  const cur = loadMatrix();
  const tools = {};
  for (const [k, v] of Object.entries(cur.tools)) {
    tools[k] = {
      name: v.name, status: v.status, payMode: v.payMode, price: v.price,
      memberLevel: v.memberLevel, aiEnabled: v.aiEnabled !== false,
      dailyLimit: v.dailyLimit, shareEnabled: v.shareEnabled !== false,
      web: v.web !== false, android: v.android !== false, ios: v.ios !== false,
      wechatMp: v.wechatMp === true, qqMp: v.qqMp === true,
    };
  }
  res.json({ success: true, data: { tools, updatedAt: cur.updatedAt } });
});

module.exports = { router, publicRouter, loadMatrix, DEFAULT_MATRIX, adminAuthUnified };
