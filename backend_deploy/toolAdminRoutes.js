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

// ==================== 默认工具矩阵（与正式 14 款工具对齐）====================
// v25.0.47_12 定价对齐：B类单次解析工具统一零售价 9.9 元/次（择日/合婚转 ONE_TIME）
const DEFAULT_MATRIX = {
  bazi:     { name: '八字排盘',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  ziwei:    { name: '紫微斗数',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  qimen:    { name: '奇门遁甲',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  liuyao:   { name: '六爻起卦',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  daliuren: { name: '大六壬',       status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  meihua:   { name: '梅花易数',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  zeri:     { name: '择日择吉',     status: 'ON', payMode: 'ONE_TIME',   price: 9.9, memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: true,  qqMp: true },
  hehun:    { name: '八字合婚',     status: 'ON', payMode: 'ONE_TIME',   price: 9.9, memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  tarot:    { name: '塔罗占卜',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  astrology:{ name: '星座运势',     status: 'ON', payMode: 'FREE',        price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  name_analysis:  { name: '姓名深度解析', status: 'ON', payMode: 'ONE_TIME',   price: 9.9,  memberLevel: 'basic', aiEnabled: true, aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  phone_number:   { name: '手机号解读',   status: 'ON', payMode: 'ONE_TIME',   price: 9.9,  memberLevel: 'basic', aiEnabled: true, aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  license_plate:  { name: '车牌合号',     status: 'ON', payMode: 'ONE_TIME',   price: 9.9,  memberLevel: 'basic', aiEnabled: true, aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  wenzhen:  { name: '中医问诊',     status: 'ON', payMode: 'ONE_TIME',   price: 0,  memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true,  web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  // ==================== v25.0.47_12: 中医板块知识开放程度控制 ====================
  // 后台可调：status（ON开放/OFF关闭/MAINTENANCE维护）× payMode+memberLevel（FREE全员/MEMBERSHIP会员专享）
  // 默认全部开放；「中医学习库全部开放」是付费会员权益之一，故支持按档位收紧
  zhongyi_classic:     { name: '中医·典籍文库',  status: 'ON', payMode: 'FREE', price: 0, memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  zhongyi_herb:        { name: '中医·中药库',    status: 'ON', payMode: 'FREE', price: 0, memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  zhongyi_formula:     { name: '中医·方剂库',    status: 'ON', payMode: 'FREE', price: 0, memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  zhongyi_meridian:    { name: '中医·经络穴位',  status: 'ON', payMode: 'FREE', price: 0, memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  zhongyi_bianzheng:   { name: '中医·辨证学',    status: 'ON', payMode: 'FREE', price: 0, memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  zhongyi_yangsheng:   { name: '中医·养生功法',  status: 'ON', payMode: 'FREE', price: 0, memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  zhongyi_shanghan:    { name: '中医·伤寒六经',  status: 'ON', payMode: 'FREE', price: 0, memberLevel: 'basic',    aiEnabled: true,  aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  zhongyi_constitution:{ name: '中医·体质测评',  status: 'ON', payMode: 'FREE', price: 0, memberLevel: 'basic',    aiEnabled: true, aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  zhongyi_exam:        { name: '中医·医考刷题',  status: 'ON', payMode: 'FREE', price: 0, memberLevel: 'basic',    aiEnabled: true, aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  // ==================== v25.0.68: 易学四工具上线（NICHE-TOOLS-07，基础功能免费） ====================
  qizheng: { name: '七政四余',   status: 'ON', payMode: 'FREE', price: 0, memberLevel: 'basic', aiEnabled: true, aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  compass:  { name: '专业罗盘',   status: 'ON', payMode: 'FREE', price: 0, memberLevel: 'basic', aiEnabled: false, aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  liji:     { name: '立极尺',     status: 'ON', payMode: 'FREE', price: 0, memberLevel: 'basic', aiEnabled: false, aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
  luban:    { name: '鲁班尺丁兰尺', status: 'ON', payMode: 'FREE', price: 0, memberLevel: 'basic', aiEnabled: false, aiCreditCost: 0, dailyLimit: -1, shareEnabled: true, web: true, android: true, ios: true, wechatMp: false, qqMp: false },
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

// ==================== 鉴权（v25.0.47_13 统一角色权限模块）====================

const adminRoles = require('./adminRoles');
const { ROLES } = adminRoles;
// 兼容旧导出名
const adminAuthUnified = (minRole, scope) => adminRoles.adminAuth(minRole, scope);
const audit = adminRoles.audit;

// ==================== 接口 ====================

// v25.0.47_13: 工具开关配置属运营菜单 → OPERATOR_ADMIN(ops) 即可查看/操作；
// 但收费模式/价格/会员要求/AI额度等资费字段仅 ADMIN 及以上（运营禁止修改价格）
router.get('/', adminAuthUnified('OPERATOR_ADMIN', 'ops'), (_req, res) => {
  res.json({ success: true, data: loadMatrix() });
});

// 单工具更新（字段级 patch，白名单校验）
const ALLOWED_FIELDS = ['status', 'payMode', 'price', 'memberLevel', 'aiEnabled', 'aiCreditCost', 'dailyLimit', 'shareEnabled', 'web', 'android', 'ios', 'wechatMp', 'qqMp'];
// 运营角色可改字段（开关/维护/平台支持/分享）；资费字段（payMode/price/memberLevel/aiCreditCost/dailyLimit）需 ADMIN+
const OPERATOR_FIELDS = ['status', 'shareEnabled', 'web', 'android', 'ios', 'wechatMp', 'qqMp'];

router.put('/', adminAuthUnified('OPERATOR_ADMIN', 'ops'), (req, res) => {
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
  // v25.0.47_13: 运营角色改资费字段 → 服务端拦截（价格修改仅 ADMIN/SUPER_ADMIN）
  const roleLevel = ROLES[req.admin.role] || 0;
  if (roleLevel < ROLES.ADMIN) {
    const illegal = Object.keys(patch).filter((k) => !OPERATOR_FIELDS.includes(k));
    if (illegal.length) {
      return res.status(403).json({ success: false, error: `运营角色无权修改资费字段（${illegal.join('、')}），请联系管理员` });
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
