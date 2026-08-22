// ============================================================================
// 言道国学后端服务器 - v23.1 (完整版)
// 功能：AI对话代理 + 短信/邮件验证码 + 用户认证 + 支付 + Admin管理
// 端口：3001
// ============================================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { createPlatformFeatureGate } = require("./platformFeatureGate");

const { authMiddleware, getMembershipFromDB, getAIQuotaFromDB, consumeAIQuotaInDB } = require("./middleware/auth");

const app = express();
const PORT = process.env.API_PORT || 3001;

// 中间件
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb", verify: (req, res, buf) => { req.rawBody = buf.toString("utf-8"); } })); // v25.0.47_4: rawBody供微信V3回调验签
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// FINAL-RC-02: 平台功能开关（服务端强制执行 PLATFORM_FEATURE_MATRIX，必须先于所有业务路由）
app.use(createPlatformFeatureGate());
// v25.0.47_10: 后台动态功能开关服务端强制层（FINAL-ADMIN-COMMERCIAL-SEAL-02 第五章）
const featureControlRoutes = require("./featureControlRoutes");
app.use(featureControlRoutes.globalFeatureGate());

// ==================== 认证路由 ====================
try {
  const registerRoutes = require('./register_routes');
  if (registerRoutes && typeof registerRoutes.createRouter === 'function') {
    app.use('/api/auth', registerRoutes.createRouter());
    console.log('[Server] ✅ 认证路由已挂载: /api/auth/*');
  } else if (typeof registerRoutes === 'function') {
    app.use('/api/auth', registerRoutes);
    console.log('[Server] ✅ 认证路由已挂载(函数模式): /api/auth/*');
  } else {
    console.error('[Server] ❌ register_routes 模块格式不正确');
  }
} catch (e) {
  console.error('[Server] ❌ 认证路由加载失败:', e.message);
  console.error(e.stack);
}

// ==================== AI 代理路由 ====================
// RC-04 AI契约修复: 兼容前端 {systemPrompt,userPrompt} 与 {messages} 双格式;
// 响应顶层返回 content/usage(前端 aiService.ts 契约), 同时保留 data.* 旧结构
app.post('/api/ai/chat', async (req, res) => {
  try {
    // ===== v25.0.47_10: AI 三重开关服务端强制（FINAL-ADMIN-COMMERCIAL-SEAL-02 第五/十三章）=====
    // ① 后台功能开关总中心（feature-flags 的 ai 开关）
    const _aiFlag = featureControlRoutes.getFlagStatus('ai');
    if (_aiFlag !== 'ON') {
      return res.status(403).json({
        success: false,
        error: _aiFlag === 'MAINTENANCE' ? 'AI功能维护中，请稍后再试' : 'AI功能已由后台关闭',
        code: _aiFlag === 'MAINTENANCE' ? 'AI_MAINTENANCE' : 'AI_DISABLED',
        flag: 'ai', flagStatus: _aiFlag,
      });
    }
    // ② AI 管理配置总开关（ai-control 页 globalEnabled）+ ③ 工具级开关
    try {
      const _aiCfgPath = require('path').join(__dirname, 'data', 'admin-ai-config.json');
      if (require('fs').existsSync(_aiCfgPath)) {
        const _aiCfg = JSON.parse(require('fs').readFileSync(_aiCfgPath, 'utf-8'));
        if (_aiCfg.globalEnabled === false) {
          return res.status(403).json({ success: false, error: 'AI服务已由后台关闭', code: 'AI_DISABLED' });
        }
        const _toolId = req.body && req.body.toolId;
        if (_toolId) {
          const _t = (_aiCfg.tools || []).find(x => x.id === _toolId);
          if (_t && _t.enabled === false) {
            return res.status(403).json({ success: false, error: `「${_t.name}」已由后台关闭`, code: 'AI_DISABLED', toolId: _toolId });
          }
          const _tm = require('./toolAdminRoutes').loadMatrix().tools[_toolId];
          if (_tm && (_tm.status !== 'ON' || _tm.aiEnabled === false)) {
            return res.status(403).json({
              success: false,
              error: `「${_tm.name}」${_tm.status === 'MAINTENANCE' ? '维护中，请稍后再试' : '已由后台关闭'}`,
              code: _tm.status === 'MAINTENANCE' ? 'FEATURE_MAINTENANCE' : 'FEATURE_DISABLED',
              toolId: _toolId,
            });
          }
        }
      }
    } catch (_e) { /* 配置读取失败不阻断 AI 服务 */ }
    const { messages, model, stream, systemPrompt, userPrompt } = req.body || {};
    let finalMessages = Array.isArray(messages) && messages.length > 0 ? messages : null;
    if (!finalMessages) {
      const msgs = [];
      if (systemPrompt && String(systemPrompt).trim()) msgs.push({ role: 'system', content: String(systemPrompt) });
      if (userPrompt && String(userPrompt).trim()) msgs.push({ role: 'user', content: String(userPrompt) });
      finalMessages = msgs;
    }
    if (!finalMessages || finalMessages.length === 0) {
      return res.json({ success: false, error: '缺少对话内容' });
    }
    // 20260816 UV-004: .env 实际配置 HUNYUAN_API_KEY(混元 OpenAI 兼容)，原代码只认 DEEPSEEK/OPENAI 导致线上 AI 整体不可用
    const deepseekKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
    const hunyuanKey = process.env.HUNYUAN_API_KEY || '';
    const apiKey = deepseekKey || hunyuanKey;

    if (!apiKey) {
      return res.json({ success: false, error: 'AI 服务未配置', code: 'AI_SERVICE_UNAVAILABLE' });
    }

    const useHunyuan = !deepseekKey && !!hunyuanKey;
    const targetModel = model || (useHunyuan ? (process.env.HUNYUAN_MODEL || 'hy3') : 'deepseek-chat');
    const apiUrl = process.env.AI_API_URL || (useHunyuan
      ? (process.env.HUNYUAN_API_URL || 'https://tokenhub.tencentmaas.com/v1/chat/completions')
      : 'https://api.deepseek.com/v1/chat/completions');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: targetModel, messages: finalMessages, stream: false, max_tokens: 4096, temperature: 0.7 })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AI] API error:', response.status, errText);
      let detail = `AI API 返回错误: ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && (errJson.error.message_zh || errJson.error.message)) {
          detail = errJson.error.message_zh || errJson.error.message;
        }
      } catch {}
      return res.status(response.status).json({ success: false, error: detail, code: 'AI_SERVICE_UNAVAILABLE' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || {};
    // v25.0.47_10: AI健康埋点（后台AI控制中心指标）
    try {
      const _hp = require('path').join(__dirname, 'data', 'ai-health.json');
      const _today = new Date().toISOString().slice(0, 10);
      let _h = { date: _today, calls: 0, success: 0, fail: 0, totalLatencyMs: 0, lastSuccessAt: null, lastFailAt: null, lastError: '' };
      try { _h = { ..._h, ...JSON.parse(require('fs').readFileSync(_hp, 'utf-8')) }; } catch (e) {}
      if (_h.date !== _today) { _h = { date: _today, calls: 0, success: 0, fail: 0, totalLatencyMs: 0, lastSuccessAt: null, lastFailAt: null, lastError: '' }; }
      _h.calls += 1; _h.success += 1; _h.lastSuccessAt = new Date().toISOString();
      require('fs').writeFileSync(_hp, JSON.stringify(_h), 'utf-8');
    } catch (e) {}
    res.json({ success: true, content, usage, cached: false, data: { content, usage } });
  } catch (err) {
    console.error('[AI] 代理错误:', err);
    // v25.0.47_10: AI健康埋点（失败）
    try {
      const _hp = require('path').join(__dirname, 'data', 'ai-health.json');
      const _today = new Date().toISOString().slice(0, 10);
      let _h = { date: _today, calls: 0, success: 0, fail: 0, totalLatencyMs: 0, lastSuccessAt: null, lastFailAt: null, lastError: '' };
      try { _h = { ..._h, ...JSON.parse(require('fs').readFileSync(_hp, 'utf-8')) }; } catch (e) {}
      if (_h.date !== _today) { _h = { date: _today, calls: 0, success: 0, fail: 0, totalLatencyMs: 0, lastSuccessAt: null, lastFailAt: null, lastError: '' }; }
      _h.calls += 1; _h.fail += 1; _h.lastFailAt = new Date().toISOString(); _h.lastError = String(err.message || '').slice(0, 200);
      require('fs').writeFileSync(_hp, JSON.stringify(_h), 'utf-8');
    } catch (e) {}
    res.json({ success: false, error: `AI 服务异常: ${err.message}`, code: 'AI_SERVICE_UNAVAILABLE' });
  }
});
console.log('[Server] ✅ AI代理路由已挂载: /api/ai/chat');

// ==================== Admin 管理路由 ====================
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

function adminAuth(req, res, next) {
  if (!ADMIN_KEY) return res.status(503).json({ success: false, error: "管理密钥未配置(ADMIN_API_KEY)" });
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, error: "未授权访问" });
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (token !== ADMIN_KEY) return res.status(401).json({ success: false, error: "密钥无效" });
  next();
}

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const section = req.query.section;
    const stats = {
      user: { total: 0, active: 0, newToday: 0, newThisWeek: 0, newThisMonth: 0 },
      invite: { totalInvites: 0, successfulInvites: 0, pendingInvites: 0, conversionRate: 0 },
      pageViews: { total: 0, today: 0, topPages: [] },
      membership: { totalMembers: 0, monthly: 0, yearly: 0, lifetime: 0, revenue: 0 },
      aiUsage: { totalCalls: 0, today: 0, successRate: 100, topTools: [] },
      generatedAt: new Date().toISOString(),
    };

    try {
      const Database = require('better-sqlite3');
      const dbPath = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';
      if (fs.existsSync(dbPath)) {
        const db = new Database(dbPath, { readonly: true });
        try {
          const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
          stats.user.total = userCount?.count || 0;
          const todayUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= date('now')").get();
          stats.user.newToday = todayUsers?.count || 0;
          const weekUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= date('now', '-7 days')").get();
          stats.user.newThisWeek = weekUsers?.count || 0;
          const monthUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= date('now', '-30 days')").get();
          stats.user.newThisMonth = monthUsers?.count || 0;
          const memberCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE member_level != 'basic'").get();
          stats.membership.totalMembers = memberCount?.count || 0;
          const monthlyCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE member_level = 'monthly'").get();
          stats.membership.monthly = monthlyCount?.count || 0;
          const yearlyCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE member_level = 'yearly'").get();
          stats.membership.yearly = yearlyCount?.count || 0;
          const lifetimeCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE member_level = 'lifetime'").get();
          stats.membership.lifetime = lifetimeCount?.count || 0;
        } catch (e) { console.log('[Admin] 查询跳过:', e.message); }
        db.close();
      }
    } catch (e) { console.log('[Admin] SQLite未安装'); }

    if (section && stats[section]) {
      return res.json({ success: true, data: { [section]: stats[section] }, generatedAt: stats.generatedAt });
    }
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Admin] stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// v25.0.47_7 价格SSOT: AI管理配置完整默认值工厂（PATCH无配置时初始化用）
function buildDefaultAIAdminConfig() {
  return {
    globalEnabled: true,
    tools: [
      { id: "ai_general", name: "通用AI解读", category: "general_ai", enabled: true, price: 0, description: "排盘结果的通用AI文化解读" },
      { id: "ai_bazi", name: "八字AI解读", category: "general_ai", enabled: true, price: 0, description: "八字命盘AI深度解读" },
      { id: "ai_ziwei", name: "紫微AI解读", category: "general_ai", enabled: true, price: 0, description: "紫微斗数AI解读" },
      { id: "ai_qimen", name: "奇门AI解读", category: "general_ai", enabled: true, price: 0, description: "奇门遁甲AI解读" },
      { id: "ai_liuyao", name: "六爻AI解读", category: "general_ai", enabled: true, price: 0, description: "六爻预测AI解读" },
      { id: "ai_meihua", name: "梅花AI解读", category: "general_ai", enabled: true, price: 0, description: "梅花易数AI解读" },
      { id: "ai_hehun", name: "合婚AI解读", category: "general_ai", enabled: true, price: 0, description: "合婚分析AI解读" },
      { id: "ai_tcm", name: "中医AI问诊", category: "general_ai", enabled: true, price: 0, description: "中医智能问诊辅助" },
      { id: "name_analysis", name: "姓名深度解析", category: "b_tool", enabled: true, price: 9.9, description: "基于姓名学典籍的深度文化解读" },
      { id: "phone_number", name: "手机号吉凶解读", category: "b_tool", enabled: true, price: 18, description: "基于数字能量学的手机号码分析" },
      { id: "license_plate", name: "车牌合号分析", category: "b_tool", enabled: true, price: 18, description: "基于数理的车牌号码文化参考" },
    ],
    quotas: { basic: { daily: 3, monthly: 50 }, monthly: { daily: 50, monthly: 500 }, yearly: { daily: -1, monthly: -1 }, lifetime: { daily: -1, monthly: -1 } },
    packages: [
      { id: "pack_10", name: "10次增量包", count: 10, price: 9.9, validity: 30, enabled: true },
      { id: "pack_50", name: "50次增量包", count: 50, price: 39.9, validity: 90, enabled: true },
      { id: "pack_100", name: "100次增量包", count: 100, price: 69.9, validity: 180, enabled: true },
      { id: "pack_500", name: "500次增量包", count: 500, price: 299, validity: 365, enabled: true },
    ],
    timePlans: [
      { key: 'single', name: '单次解读', price: 2.9, duration: '1次', desc: '单次AI深度解读' },
      { key: 'daily', name: '日卡', price: 9.9, duration: '24小时', desc: '当日无限次解读' },
      { key: 'monthly', name: '月卡', price: 39.9, duration: '30天', desc: '全工具月度畅享' },
      { key: 'quarterly', name: '季卡', price: 99.9, duration: '90天', desc: '季度无限解读' },
      { key: 'yearly', name: '年卡', price: 199, duration: '365天', desc: '全年无限解读' },
    ],
    singleUnlockPrice: 9.9,
    updatedAt: new Date().toISOString(),
  };
}
app.get('/api/admin/ai-config', adminAuth, async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'data', 'admin-ai-config.json');
    let config = null;
    if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!config) {
      config = {
        globalEnabled: true,
        tools: [
          { id: "ai_general", name: "通用AI解读", category: "general_ai", enabled: true, price: 0, description: "排盘结果的通用AI文化解读" },
          { id: "ai_bazi", name: "八字AI解读", category: "general_ai", enabled: true, price: 0, description: "八字命盘AI深度解读" },
          { id: "ai_ziwei", name: "紫微AI解读", category: "general_ai", enabled: true, price: 0, description: "紫微斗数AI解读" },
          { id: "ai_qimen", name: "奇门AI解读", category: "general_ai", enabled: true, price: 0, description: "奇门遁甲AI解读" },
          { id: "ai_liuyao", name: "六爻AI解读", category: "general_ai", enabled: true, price: 0, description: "六爻预测AI解读" },
          { id: "ai_meihua", name: "梅花AI解读", category: "general_ai", enabled: true, price: 0, description: "梅花易数AI解读" },
          { id: "ai_hehun", name: "合婚AI解读", category: "general_ai", enabled: true, price: 0, description: "合婚分析AI解读" },
          { id: "ai_tcm", name: "中医AI问诊", category: "general_ai", enabled: true, price: 0, description: "中医智能问诊辅助" },
          { id: "name_analysis", name: "姓名深度解析", category: "b_tool", enabled: true, price: 9.9, description: "基于姓名学典籍的深度文化解读" },
          { id: "phone_number", name: "手机号吉凶解读", category: "b_tool", enabled: true, price: 18, description: "基于数字能量学的手机号码分析" },
          { id: "license_plate", name: "车牌合号分析", category: "b_tool", enabled: true, price: 18, description: "基于数理的车牌号码文化参考" },
        ],
        quotas: { basic: { daily: 3, monthly: 50 }, monthly: { daily: 50, monthly: 500 }, yearly: { daily: -1, monthly: -1 }, lifetime: { daily: -1, monthly: -1 } },
        packages: [
          { id: "pack_10", name: "10次增量包", count: 10, price: 9.9, validity: 30, enabled: true },
          { id: "pack_50", name: "50次增量包", count: 50, price: 39.9, validity: 90, enabled: true },
          { id: "pack_100", name: "100次增量包", count: 100, price: 69.9, validity: 180, enabled: true },
          { id: "pack_500", name: "500次增量包", count: 500, price: 299, validity: 365, enabled: true },
        ],
        updatedAt: new Date().toISOString(),
      };
    }
    // v25.0.47_7 价格SSOT: AI时长套餐与单次解锁价兜底（管理后台可改，前端/api/payment/pricing读取）
    if (!Array.isArray(config.timePlans) || !config.timePlans.length) {
      config.timePlans = [
        { key: 'single', name: '单次解读', price: 2.9, duration: '1次', desc: '单次AI深度解读' },
        { key: 'daily', name: '日卡', price: 9.9, duration: '24小时', desc: '当日无限次解读' },
        { key: 'monthly', name: '月卡', price: 39.9, duration: '30天', desc: '全工具月度畅享' },
        { key: 'quarterly', name: '季卡', price: 99.9, duration: '90天', desc: '季度无限解读' },
        { key: 'yearly', name: '年卡', price: 199, duration: '365天', desc: '全年无限解读' },
      ];
    }
    if (typeof config.singleUnlockPrice !== 'number' || !(config.singleUnlockPrice > 0)) {
      config.singleUnlockPrice = 9.9;
    }
    res.json({ success: true, data: config });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.patch('/api/admin/ai-config', adminAuth, async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'data', 'admin-ai-config.json');
    let config = null;
    if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!config) config = buildDefaultAIAdminConfig(); // v25.0.47_7: 无配置时用完整默认值，避免空tools覆盖
    const body = req.body;
    if (body.globalEnabled !== undefined) config.globalEnabled = body.globalEnabled;
    if (body.quotas) config.quotas = { ...config.quotas, ...body.quotas };
    if (body.toolId && body.toolPatch) config.tools = (config.tools || []).map(t => t.id === body.toolId ? { ...t, ...body.toolPatch } : t);
    if (body.toolId && body.toggleTool) config.tools = (config.tools || []).map(t => t.id === body.toolId ? { ...t, enabled: !t.enabled } : t);
    if (body.packageId && body.packagePatch) config.packages = (config.packages || []).map(p => p.id === body.packageId ? { ...p, ...body.packagePatch } : p);
    // v25.0.47_7 价格SSOT: AI时长套餐（数组整体替换）+ 单次解锁价
    if (Array.isArray(body.timePlans) && body.timePlans.length) {
      config.timePlans = body.timePlans.map(p => ({
        key: String(p.key || ''),
        name: String(p.name || ''),
        price: Math.max(0, Math.round((Number(p.price) || 0) * 100) / 100),
        duration: String(p.duration || ''),
        desc: String(p.desc || ''),
      }));
    }
    if (typeof body.singleUnlockPrice === 'number' && body.singleUnlockPrice > 0) {
      config.singleUnlockPrice = Math.round(body.singleUnlockPrice * 100) / 100;
    }
    config.updatedAt = new Date().toISOString();
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    res.json({ success: true, data: config });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.put('/api/admin/ai-config', adminAuth, async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'data', 'admin-ai-config.json');
    const config = { ...req.body, updatedAt: new Date().toISOString() };
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    res.json({ success: true, data: config });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/admin/membership-config', adminAuth, async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'data', 'admin-membership-config.json');
    let config = null;
    if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!config) {
      config = {
        plans: [
          { level: "basic", name: "普通会员", price: 0, originalPrice: 0, duration: "永久免费", features: ["全部14款排盘工具（基础排盘）","每日3次通用AI问答","中医基础内容查询","模拟考试初级题库","社区浏览发帖 · 签到积分"], badge: "", highlighted: false, enabled: true, sortOrder: 0 },
          { level: "monthly", name: "月度会员", price: 39, originalPrice: 59, duration: "30天", features: ["全部14款排盘工具","每日50次通用AI问答","B类工具月赠3次，超出享8折","中医学习库全部开放","模拟考试全等级开放","签到积分2倍 · 无广告体验","专属标识/头像框 · 导出排盘报告"], badge: "热门", highlighted: false, enabled: true, sortOrder: 1 },
          { level: "yearly", name: "年度会员", price: 366, originalPrice: 458, duration: "365天", features: ["全部14款排盘工具","通用AI问答无限次","B类工具月赠15次，超出享7折","中医学习库全部开放","模拟考试全等级开放","签到积分3倍 · 无广告体验","专属标识/头像框 · 导出排盘报告","专属客服支持"], badge: "推荐", highlighted: true, enabled: true, sortOrder: 2 },
          { level: "lifetime", name: "终身会员", price: 3600, originalPrice: 4500, duration: "永久有效", features: ["全部14款排盘工具","通用AI问答无限次","B类工具无限次免费使用","中医学习库全部开放","模拟考试全等级开放","签到积分5倍 · 无广告体验","专属标识/头像框 · 导出排盘报告","专属客服支持 · 新功能优先体验"], badge: "尊享", highlighted: false, enabled: true, sortOrder: 3 },
        ],
        complianceLabel: "传统文化学习服务",
        updatedAt: new Date().toISOString(),
      };
    }
    res.json({ success: true, data: config });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.patch('/api/admin/membership-config', adminAuth, async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'data', 'admin-membership-config.json');
    let config = null;
    if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!config) config = { plans: [], complianceLabel: "传统文化学习服务", updatedAt: new Date().toISOString() };
    const body = req.body;
    if (body.level && body.planPatch) config.plans = (config.plans || []).map(p => p.level === body.level ? { ...p, ...body.planPatch } : p);
    if (body.level && body.togglePlan) config.plans = (config.plans || []).map(p => p.level === body.level ? { ...p, enabled: !p.enabled } : p);
    config.updatedAt = new Date().toISOString();
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    res.json({ success: true, data: config });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.put('/api/admin/membership-config', adminAuth, async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'data', 'admin-membership-config.json');
    const config = { ...req.body, updatedAt: new Date().toISOString() };
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    res.json({ success: true, data: config });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

console.log('[Server] ✅ Admin路由已挂载: /api/admin/*');

// ==================== 额外路由 ====================
const extraRoutes = [
  { file: 'contentImportRoutes', path: '/api/admin/content-import', name: '内容导入' },
  { file: 'feedbackRoutes', path: '/api/feedback', name: '反馈' },
  { file: 'pointsConfigRoutes', path: '/api/admin/points-config', name: '积分配置' },
  { file: 'posterConfigRoutes', path: '/api/admin/poster-config', name: '海报配置' },
  { file: 'shareConfigRoutes', path: '/api/admin/share-config', name: '分享配置' },
  { file: 'socialApiRoutes', path: '/api/social', name: '社交API' },
  { file: 'academyRoutes', path: '/api/academy', name: '言道学堂' },
  { file: 'newsRoutes', path: '/api/news', name: '行业资讯' },
  { file: 'newsRoutes', path: '/api/admin/news', name: '资讯管理' },
  { file: 'socialStorageRoutes', path: '/api/social', name: '社交存储' },
  { file: 'paymentRoutes', path: '/api/payment', name: '支付' },
  { file: 'shareResultRoutes', path: '/api/share', name: '分享引擎' },
  { file: 'accountDeleteRoutes', path: '/api/account', name: '账号注销' },
  { file: 'commissionRoutes', path: '/api/commission', name: '佣金用户端' },
  { file: 'adminUnifiedRoutes', path: '/api/admin/unified', name: '统一后台' },
  { file: 'featureControlRoutes', path: '/api/admin/feature-flags', name: '功能开关' },
  { file: 'toolAdminRoutes', path: '/api/admin/tool-matrix', name: '工具矩阵' },
];

for (const route of extraRoutes) {
  try {
    const mod = require('./' + route.file);
    if (mod && typeof mod.createRouter === 'function') {
      app.use(route.path, mod.createRouter());
    } else if (typeof mod === 'function') {
      app.use(route.path, mod);
    } else if (mod && typeof mod === 'object') {
      app.use(route.path, mod);
    }
    console.log(`[Server] ✅ ${route.name}路由已挂载: ${route.path}/*`);
  } catch (e) {
    console.log(`[Server] ⚠️ ${route.name}路由未加载: ${e.message}`);
  }
}

// ==================== 公开配置接口（v25.0.47_10 价格SSOT/功能开关/工具矩阵 公开只读） ====================
const publicPricingRoutes = require('./publicPricingRoutes');
app.use('/api/public/pricing', publicPricingRoutes.router);
app.use('/api/public/feature-flags', featureControlRoutes.publicRouter);
const toolAdminRoutesMod = require('./toolAdminRoutes');
app.use('/api/public/tool-matrix', toolAdminRoutesMod.publicRouter);
console.log('[Server] ✅ 公开配置接口已挂载: /api/public/pricing | feature-flags | tool-matrix');

// ==================== 健康检查 ====================


app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '言道国学后端服务运行中', version: 'v23.1', timestamp: new Date().toISOString(), uptime: process.uptime() });
});


// ==================== 用户查找API（供前端搜索ID/扫码添加好友使用） ====================
app.get('/api/user/lookup', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.json({ success: false, error: '请提供用户ID' });
    }
    const Database = require('better-sqlite3');
    const DB_PATH = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';
    if (!fs.existsSync(DB_PATH)) {
      return res.json({ success: false, error: '数据库不存在' });
    }
    const db = new Database(DB_PATH, { readonly: true });
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (!tableExists) {
      db.close();
      return res.json({ success: false, error: '用户表不存在' });
    }
    const numericId = parseInt(userId, 10);
    if (isNaN(numericId)) {
      db.close();
      return res.json({ success: false, error: '用户ID必须是数字' });
    }
    const user = db.prepare('SELECT user_id, nickname, avatar, bio, member_level FROM users WHERE user_id = ?').get(numericId);
    db.close();
    if (!user) {
      return res.json({ success: false, error: '未找到该用户' });
    }
    return res.json({
      success: true,
      user: {
        userId: String(user.user_id),
        nickname: user.nickname || '言道用户',
        avatar: user.avatar || '',
        bio: user.bio || '',
        memberLevel: user.member_level || 'basic',
      }
    });
  } catch (err) {
    console.error('[User Lookup] error:', err);
    return res.json({ success: false, error: '查找失败: ' + err.message });
  }
});
console.log('[Server] ✅ 用户查找路由已挂载: /api/user/lookup');

// 404
// ==================== P0-5: 会员权限服务端校验 ====================
// GET /api/membership/verify - 从数据库获取真实会员状态（不信任前端任何参数）
app.get('/api/membership/verify', authMiddleware, (req, res) => {
  try {
    const membership = getMembershipFromDB(req.user.userId);
    return res.json({ success: true, data: membership });
  } catch (err) {
    console.error('[membership/verify] error:', err.message);
    return res.status(500).json({ success: false, error: '服务异常' });
  }
});
console.log('[Server] P0-5 会员校验端点已挂载: GET /api/membership/verify');

// ==================== P0-6: AI调用权限服务端校验 ====================
// GET /api/ai/quota - 获取当前AI配额（从数据库读取真实数据）
app.get('/api/ai/quota', authMiddleware, (req, res) => {
  try {
    const quota = getAIQuotaFromDB(req.user.userId);
    return res.json({ success: true, data: quota });
  } catch (err) {
    console.error('[ai/quota] error:', err.message);
    return res.status(500).json({ success: false, error: '服务异常' });
  }
});
console.log('[Server] P0-6 AI配额查询端点已挂载: GET /api/ai/quota');

// POST /api/ai/quota/consume - 消耗一次AI配额（服务端扣减，不信任前端）
app.post('/api/ai/quota/consume', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const quota = getAIQuotaFromDB(userId);
    const limit = quota.dailyLimit;
    
    if (quota.dailyUsed >= limit) {
      return res.status(429).json({
        success: false,
        error: '今日AI调用次数已用完',
        code: 'AI_QUOTA_EXCEEDED',
        dailyUsed: quota.dailyUsed,
        dailyLimit: limit,
        level: quota.level,
      });
    }
    
    const result = consumeAIQuotaInDB(userId);
    if (!result.success) {
      return res.status(500).json({ success: false, error: '配额扣减失败' });
    }
    
    return res.json({
      success: true,
      data: {
        dailyUsed: quota.dailyUsed + 1,
        dailyLimit: limit,
        remaining: limit === Infinity ? 'unlimited' : Math.max(0, limit - quota.dailyUsed - 1),
        level: quota.level,
      },
    });
  } catch (err) {
    console.error('[ai/quota/consume] error:', err.message);
    return res.status(500).json({ success: false, error: '服务异常' });
  }
});
console.log('[Server] P0-6 AI配额消耗端点已挂载: POST /api/ai/quota/consume');


const versionRoute = require('./version_route');
app.use(versionRoute);

app.use((req, res) => {
  res.status(404).json({ success: false, error: `接口不存在: ${req.method} ${req.url}` });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('[Server] 未捕获错误:', err);
  res.status(500).json({ success: false, error: '服务器内部错误', message: err.message });
});

const server = http.createServer(app);




server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  言道国学后端服务 v23.1 已启动`);
  console.log(`  端口: ${PORT}`);
  console.log(`  时间: ${new Date().toISOString()}`);
  console.log(`  PID: ${process.pid}`);
  console.log(`========================================\n`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
process.on('uncaughtException', (err) => console.error('[Server] 未捕获异常:', err));
process.on('unhandledRejection', (reason) => console.error('[Server] 未处理Promise:', reason));

