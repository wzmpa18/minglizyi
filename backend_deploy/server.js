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

const { authMiddleware, getMembershipFromDB, getAIQuotaFromDB, consumeAIQuotaInDB, getAnonAIQuota, consumeAnonAIQuota, getUserActiveStatus, verifyToken } = require("./middleware/auth");
// AI_USAGE_POLICY（额度唯一裁决）+ AI Cost Center（成本日志/后台统计）— AI Phase 1
const aiUsagePolicy = require("./aiUsagePolicy");
const aiCostCenter = require("./aiCostCenter");

// AI Cost Center 表结构扩展（幂等 ALTER），失败不阻断服务启动
try {
  aiCostCenter.ensureSchema();
} catch (e) {
  console.error('[Server] aiCostCenter.ensureSchema 失败:', e.message);
}

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
// v25.0.61 FINAL-SEAL P2-C：AI健康统计统一入口（延迟分位数/超时/空内容/连续失败）
// latencies 保留最近200条采样；consecutiveFails>=5 时后台驾驶舱AI状态亮红灯
function recordAIHealth(kind, latencyMs, errDetail) {
  try {
    const _p = require('path').join(__dirname, 'data', 'ai-health.json');
    const _today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); // 中国时区(UTC+8)当日，避免UTC跨日错位
    const _blank = () => ({ date: _today, calls: 0, success: 0, fail: 0, totalLatencyMs: 0, lastSuccessAt: null, lastFailAt: null, lastError: '', latencies: [], gt60s: 0, gt120s: 0, emptyContent: 0, consecutiveFails: 0 });
    let _h = _blank();
    try { _h = { ..._h, ...JSON.parse(require('fs').readFileSync(_p, 'utf-8')) }; } catch (e) {}
    if (_h.date !== _today) _h = _blank();
    _h.calls += 1;
    if (Number.isFinite(latencyMs)) {
      _h.totalLatencyMs += Math.round(latencyMs);
      _h.latencies = (_h.latencies || []).concat(Math.round(latencyMs)).slice(-200);
      if (latencyMs > 60000) _h.gt60s += 1;
      if (latencyMs > 120000) _h.gt120s += 1;
    }
    if (kind === 'success') {
      _h.success += 1; _h.lastSuccessAt = new Date().toISOString(); _h.consecutiveFails = 0;
    } else {
      _h.fail += 1; _h.lastFailAt = new Date().toISOString();
      _h.lastError = String(errDetail || kind).slice(0, 200);
      _h.consecutiveFails = (_h.consecutiveFails || 0) + 1;
      if (kind === 'empty') _h.emptyContent = (_h.emptyContent || 0) + 1;
    }
    require('fs').writeFileSync(_p, JSON.stringify(_h), 'utf-8');
  } catch (e) { /* 统计失败不阻断AI主流程 */ }
}

// v25.0.61 FINAL-SEAL P2-A：匿名AI调用UA审计日志（data/anon-ai-log.json，按日聚合，保留14天）
// 用于统计仍依赖匿名通道的旧APK版本/UA分布，为 AI_ANON_EXPIRE_DATE 下线决策提供证据
function logAnonAIUA(ip, ua) {
  try {
    const _p = require('path').join(__dirname, 'data', 'anon-ai-log.json');
    const _today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); // 中国时区(UTC+8)当日，避免UTC跨日错位
    let _log = {};
    try { _log = JSON.parse(require('fs').readFileSync(_p, 'utf-8')); } catch (e) {}
    if (!_log[_today]) _log[_today] = { calls: 0, ips: {}, uas: {} };
    _log[_today].calls += 1;
    _log[_today].ips[ip] = (_log[_today].ips[ip] || 0) + 1;
    const _uaKey = String(ua).slice(0, 160);
    _log[_today].uas[_uaKey] = (_log[_today].uas[_uaKey] || 0) + 1;
    const _days = Object.keys(_log).sort();
    while (_days.length > 14) { delete _log[_days.shift()]; }
    require('fs').writeFileSync(_p, JSON.stringify(_log), 'utf-8');
  } catch (e) { /* 审计日志失败不阻断 */ }
}

// v25.0.61 FINAL-SEAL P2：同用户AI请求并发锁（单进程fork模式，内存锁即可）
// 背景：配额预检查在上游调用前、扣减在成功后，两个并行请求都能通过预检查 → 双倍烧token。
// 策略：同一用户同时只允许1个在途AI请求，其余立即429 AI_CONCURRENT_LIMIT（不调上游）。
const _aiInflight = new Map();
function acquireAIInflight(owner) {
  const n = _aiInflight.get(owner) || 0;
  if (n >= 1) return false;
  _aiInflight.set(owner, n + 1);
  return true;
}
function releaseAIInflight(owner) {
  const n = _aiInflight.get(owner) || 1;
  if (n <= 1) _aiInflight.delete(owner); else _aiInflight.set(owner, n - 1);
}

app.post('/api/ai/chat', async (req, res) => {
  const _t0 = Date.now();
  let _inflightOwner = null;
  // AI Phase 1：成本计量元数据（requestId 幂等 + 成本日志，不保存敏感 prompt）
  const _meta = {
    requestId: (req.body && req.body.requestId) || require('crypto').randomUUID(),
    featureKey: (req.body && (req.body.toolId || req.body.featureKey)) || 'ai_chat',
    model: null,
    membershipLevel: null,
    providerId: null,
    inputTokens: 0,
    outputTokens: 0,
  };
  const _logCost = (status, errorCode) => {
    try {
      aiCostCenter.logAICall({
        requestId: _meta.requestId,
        userId: _authUser ? _authUser.userId : null,
        featureKey: _meta.featureKey,
        scene: 'ai_chat',
        model: _meta.model || 'unknown',
        membershipLevel: _meta.membershipLevel,
        providerId: _meta.providerId,
        inputTokens: _meta.inputTokens,
        outputTokens: _meta.outputTokens,
        estimatedCost: aiUsagePolicy.estimateCost(_meta.model, _meta.inputTokens, _meta.outputTokens).estimatedCost,
        durationMs: Date.now() - _t0,
        status,
        errorCode: errorCode || null,
      });
    } catch (e) { /* 成本日志失败不阻断 */ }
  };

  // AI Phase 1（第二十七部分）：requestId 幂等——相同请求重复提交（网络重试/重复回调）
  // 不得重复扣额度/记成本；若该 requestId 已有成功记账，直接拒绝。
  if (req.body && typeof req.body.requestId === 'string' && req.body.requestId) {
    if (aiCostCenter.hasSucceededRequest(req.body.requestId)) {
      return res.status(409).json({
        success: false,
        error: '重复请求：该请求已成功处理，请勿重复提交',
        code: 'AI_DUPLICATE_REQUEST',
        requestId: req.body.requestId,
      });
    }
  }

  try {
    // ===== v25.0.60 AUDIT-20260826 P0-3 修复：AI 付费墙服务端强制 =====
    // 鉴权 + 配额校验 + 成功后扣减（配额设施此前为死代码，本次正式接线）
    // - 携带有效 Bearer Token：按用户数据库会员档位限额（basic 3 / monthly·quarterly 50 / yearly·lifetime 无限）
    // - 无 Token（旧版 APK 过渡期）：按 IP 限额 AI_ANON_DAILY_LIMIT（默认 50/日；置 0 = 硬性 401）
    //   旧版 APK 不携带 Authorization 头，直接硬性 401 会导致全体旧版用户 AI 立即不可用，
    //   故保留按 IP 限额的软过渡通道；新版前端全覆盖后可置 0 收紧。
    const _authUser = verifyToken(req.headers.authorization || '');
    let _quotaOwner = null; // 配额记账主体：真实 userId 或 'anon:<ip>'
    if (_authUser) {
      // v25.0.61 D19：封禁/注销账号拒绝调用AI（含存量token会话）
      const _st = getUserActiveStatus(_authUser.userId);
      if (!_st.ok) {
        return res.status(403).json({ success: false, error: _st.msg, code: _st.code });
      }
      _quotaOwner = _authUser.userId;
      const _q = getAIQuotaFromDB(_authUser.userId);
      _meta.membershipLevel = _q.level;
      if (_q.dailyLimit !== Infinity && _q.dailyUsed >= _q.dailyLimit) {
        _logCost('blocked', 'AI_QUOTA_EXCEEDED');
        return res.status(429).json({
          success: false,
          error: `今日AI调用次数已用完（${_q.dailyLimit}次/日），明日重置或升级会员`,
          code: 'AI_QUOTA_EXCEEDED',
          dailyUsed: _q.dailyUsed,
          dailyLimit: _q.dailyLimit,
          level: _q.level,
        });
      }
    } else {
      // ===== v25.0.61 FINAL-SEAL P2-A：匿名通道收紧（仅旧APK过渡专用） =====
      // 审计结论(20260826)：生产真实匿名调用量=0（access log 中仅服务器自测 curl）；
      // APK 为内置资源模式，旧版 APK 不携带 Authorization。策略：
      //   1) 仅旧APK WebView UA（含 wv) / yandao 标识）可走匿名通道，普通浏览器/curl 一律 401；
      //   2) 默认额度 50→5 次/IP/日（AI_ANON_DAILY_LIMIT 可覆盖，置 0 = 硬性 401）；
      //   3) AI_ANON_EXPIRE_DATE（默认 2026-10-31）到期后硬性 401，完成匿名通道下线。
      const _anonLimit = parseInt(process.env.AI_ANON_DAILY_LIMIT, 10);
      const _limit = Number.isFinite(_anonLimit) && _anonLimit >= 0 ? _anonLimit : 5;
      const _expireDate = process.env.AI_ANON_EXPIRE_DATE || '2026-10-31';
      let _expired = true;
      try { _expired = new Date(_expireDate + 'T23:59:59+08:00').getTime() < Date.now(); } catch (e) {}
      if (_limit === 0 || _expired) {
        return res.status(401).json({ success: false, error: '请先登录后使用AI服务', code: 'AI_AUTH_REQUIRED' });
      }
      const _ua = String(req.headers['user-agent'] || '');
      if (!/wv\)|yandao/i.test(_ua)) {
        return res.status(401).json({ success: false, error: '请先登录后使用AI服务', code: 'AI_AUTH_REQUIRED' });
      }
      const _ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
      logAnonAIUA(_ip, _ua);
      const _q = getAnonAIQuota(_ip);
      if (_q.dailyUsed >= _limit) {
        return res.status(429).json({
          success: false,
          error: '当前网络今日AI体验次数已用完，登录后可获得会员额度',
          code: 'AI_QUOTA_EXHAUSTED',
          dailyUsed: _q.dailyUsed,
          dailyLimit: _limit,
          level: 'anonymous',
        });
      }
      _quotaOwner = 'anon:' + _ip;
      _meta.membershipLevel = 'anonymous';
    }

    // v25.0.61 P2：并发锁——同一主体同时只允许1个在途请求（防并行双扣token）
    if (!acquireAIInflight(_quotaOwner)) {
      _logCost('blocked', 'AI_CONCURRENT_LIMIT');
      return res.status(429).json({
        success: false,
        error: '请等待当前AI请求完成后再试',
        code: 'AI_CONCURRENT_LIMIT',
      });
    }
    _inflightOwner = _quotaOwner;

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
    // ===== v25.0.61 FINAL-SEAL P2-B：输入长度硬限制 =====
    // 防止单请求堆砌超长上下文导致上游成本失控（超长命盘×超长追问场景）。
    // 上限以 AI_USAGE_POLICY 档位 maxInputChars 为唯一事实源（默认 12000 字符），
    // AI_INPUT_MAX_CHARS 仅作应急覆盖；超限明确提示缩小范围，不调用上游、不扣配额。
    const _levelPolicy = aiUsagePolicy.getUsagePolicy(_meta.membershipLevel || 'basic');
    const _inputMax = parseInt(process.env.AI_INPUT_MAX_CHARS, 10) || _levelPolicy.maxInputChars || aiUsagePolicy.DEFAULT_MAX_INPUT_CHARS;
    const _inputLen = finalMessages.reduce((s, m) => s + String((m && m.content) || '').length, 0);
    if (_inputLen > _inputMax) {
      return res.status(400).json({
        success: false,
        error: `输入内容过长（约${_inputLen}字符，上限${_inputMax}字符），请缩小分析范围`,
        code: 'AI_INPUT_TOO_LONG',
      });
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
    _meta.model = targetModel;
    _meta.providerId = useHunyuan ? 'tencent' : 'deepseek';
    const apiUrl = process.env.AI_API_URL || (useHunyuan
      ? (process.env.HUNYUAN_API_URL || 'https://tokenhub.tencentmaas.com/v1/chat/completions')
      : 'https://api.deepseek.com/v1/chat/completions');

    // v25.0.60 AUDIT-20260826 D17: max_tokens 4096→8192（默认，AI_MAX_TOKENS 可调）
    // 推理型模型(hy3)思考即消耗 token，4096 上限时复杂命理解读的推理就耗尽配额，
    // 等待60秒后返回空内容（用户视角=AI不能用）。8192 给推理+正文留足空间。
    // AI Phase 1：以上限以档位 maxOutputTokens 为唯一事实源，AI_MAX_TOKENS 仅作应急覆盖。
    const _maxTokens = parseInt(process.env.AI_MAX_TOKENS, 10) || _levelPolicy.maxOutputTokens || aiUsagePolicy.DEFAULT_MAX_OUTPUT_TOKENS;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: targetModel, messages: finalMessages, stream: false, max_tokens: _maxTokens, temperature: 0.7 })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AI] API error:', response.status, errText);
      _logCost('error', 'upstream_' + response.status);
      // v25.0.61 P2-C：上游错误（含502/504）也计入健康统计（原实现漏记，超时表现为上游非200）
      recordAIHealth('fail', Date.now() - _t0, 'upstream_' + response.status);
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
    _meta.inputTokens = Number(usage.prompt_tokens) || 0;
    _meta.outputTokens = Number(usage.completion_tokens) || 0;
    // v25.0.60 AUDIT-20260826 D17: 空内容保护——推理耗尽 token 时上游返回空 content，
    // 原实现按 success:true 返回空串（前端白屏等待60秒无结果，健康统计还误计成功）。
    // 现在明确报错提示重试，不扣配额（下方 content 判空天然跳过），健康统计计为失败。
    if (!content) {
      const _finish = data.choices?.[0]?.finish_reason || '';
      console.error('[AI] 空内容返回 finish_reason=' + _finish + ' usage=' + JSON.stringify(usage));
      _logCost('error', 'AI_EMPTY_CONTENT');
      recordAIHealth('empty', Date.now() - _t0, 'empty_content(' + _finish + ')');
      return res.status(502).json({
        success: false,
        error: 'AI解读生成超时（内容为空），请简化问题后重试',
        code: 'AI_EMPTY_CONTENT',
        finishReason: _finish,
      });
    }
    // v25.0.60 P0-3/P1-7：生成成功后扣减配额（只对成功调用计费）
    if (_quotaOwner && content) {
      try {
        if (_authUser) consumeAIQuotaInDB(_quotaOwner);
        else {
          const _ip = _quotaOwner.slice(5);
          consumeAnonAIQuota(_ip);
        }
      } catch (e) { console.error('[AI] 配额扣减失败:', e.message); }
    }
    // v25.0.47_10: AI健康埋点（成功，含延迟分位数统计）
    recordAIHealth('success', Date.now() - _t0);
    _logCost('success');
    res.json({ success: true, content, usage, cached: false, data: { content, usage } });
  } catch (err) {
    console.error('[AI] 代理错误:', err);
    _logCost('error', 'AI_SERVICE_UNAVAILABLE');
    // v25.0.47_10: AI健康埋点（失败）
    recordAIHealth('fail', Date.now() - _t0, err.message);
    res.json({ success: false, error: `AI 服务异常: ${err.message}`, code: 'AI_SERVICE_UNAVAILABLE' });
  } finally {
    if (_inflightOwner) releaseAIInflight(_inflightOwner);
  }
});
console.log('[Server] ✅ AI代理路由已挂载: /api/ai/chat');

// ==================== Admin 管理路由 ====================
// v25.0.47_13: 统一角色权限模块（adminRoles.js）——支持主密钥+子密钥（SUPER/FINANCE/OPERATOR三级角色）
// stats 任意有效密钥可访问（登录校验+数据总览）；ai-config/membership-config 等价格配置类仅 ADMIN 及以上
const adminRoles = require('./adminRoles');

function adminAuth(minRole, scope) {
  return adminRoles.adminAuth(minRole, scope);
}

// ==================== AI Cost Center + AI_USAGE_POLICY 后台路由（AI Phase 1） ====================
// 成本中心：今日/本月汇总、Top用户、按功能/模型/会员档、告警状态
try {
  app.use('/api/admin/ai-cost', aiCostCenter.makeCostRouter(adminAuth));
  console.log('[Server] ✅ AI成本中心路由已挂载: /api/admin/ai-cost');
} catch (e) {
  console.error('[Server] 挂载 AI成本中心失败:', e.message);
}

// AI_USAGE_POLICY 读取（admin UI 展示剩余额度/政策）与更新（必须 bump policyVersion）
app.get('/api/admin/ai-policy', adminAuth('ADMIN'), (req, res) => {
  const p = aiUsagePolicy.getPolicy();
  const pricing = aiUsagePolicy.getPricing();
  res.json({
    success: true,
    data: {
      policyVersion: p.policyVersion,
      effectiveFrom: p.effectiveFrom,
      legacyUnlimitedProtected: p.legacyUnlimitedProtected,
      tiers: p.tiers,
      pricing,
    },
  });
});

app.put('/api/admin/ai-policy', adminAuth('ADMIN'), (req, res) => {
  const result = aiUsagePolicy.updatePolicy(req.body || {});
  if (!result.ok) {
    return res.status(400).json({ success: false, error: result.error });
  }
  res.json({ success: true, data: { policyVersion: result.policyVersion, policy: result.policy } });
});

app.get('/api/admin/stats', adminAuth(), async (req, res) => {
  try {
    const section = req.query.section;
    const stats = {
      user: { total: 0, active: 0, newToday: 0, newThisWeek: 0, newThisMonth: 0 },
      invite: { totalInvites: 0, successfulInvites: 0, pendingInvites: 0, conversionRate: 0 },
      pageViews: { total: 0, today: 0, topPages: [] },
     membership: { totalMembers: 0, monthly: 0, quarterly: 0, yearly: 0, lifetime: 0, revenue: 0 },
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
          const memberCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE member_level != 'basic' AND (membership_expiry IS NULL OR membership_expiry > datetime('now') OR member_level = 'lifetime')").get();
          stats.membership.totalMembers = memberCount?.count || 0;
          const monthlyCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE member_level = 'monthly' AND (membership_expiry IS NULL OR membership_expiry > datetime('now'))").get();
          stats.membership.monthly = monthlyCount?.count || 0;
          const quarterlyCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE member_level = 'quarterly' AND (membership_expiry IS NULL OR membership_expiry > datetime('now'))").get();
          stats.membership.quarterly = quarterlyCount?.count || 0;
          const yearlyCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE member_level = 'yearly' AND (membership_expiry IS NULL OR membership_expiry > datetime('now'))").get();
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
    quotas: { basic: { daily: 3, monthly: 50 }, monthly: { daily: 50, monthly: 500 }, quarterly: { daily: 50, monthly: 500 }, yearly: { daily: -1, monthly: -1 }, lifetime: { daily: -1, monthly: -1 } }, // v25.0.60 P1-7: 补 quarterly 档（原缺失导致季度会员配额配置不完整）
    packages: [
      { id: "pack_10", name: "10次增量包", count: 10, price: 9.9, validity: 30, enabled: true },
      { id: "pack_50", name: "50次增量包", count: 50, price: 39.9, validity: 90, enabled: true },
      { id: "pack_100", name: "100次增量包", count: 100, price: 69.9, validity: 180, enabled: true },
      { id: "pack_500", name: "500次增量包", count: 500, price: 299, validity: 365, enabled: true },
    ],
    timePlans: [
      { key: 'single', name: 'AI单次解读', price: 2.9, duration: '1次', desc: '单次AI深度解读（非会员）' },
      { key: 'daily', name: 'AI日卡', price: 9.9, duration: '24小时', desc: '当日AI解读不限次' },
      { key: 'monthly', name: 'AI月卡', price: 39.9, duration: '30天', desc: '30天AI解读畅享（与会员权益独立）' },
      { key: 'quarterly', name: 'AI季卡', price: 99.9, duration: '90天', desc: '季度AI解读畅享（与会员权益独立）' },
      { key: 'yearly', name: 'AI年卡', price: 199, duration: '365天', desc: '全年AI解读畅享（与会员权益独立）' },
    ],
    singleUnlockPrice: 9.9,
    updatedAt: new Date().toISOString(),
  };
}
app.get('/api/admin/ai-config', adminAuth('ADMIN'), async (req, res) => {
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
        quotas: { basic: { daily: 3, monthly: 50 }, monthly: { daily: 50, monthly: 500 }, quarterly: { daily: 50, monthly: 500 }, yearly: { daily: -1, monthly: -1 }, lifetime: { daily: -1, monthly: -1 } }, // v25.0.60 P1-7: 补 quarterly 档（原缺失导致季度会员配额配置不完整）
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
        { key: 'single', name: 'AI单次解读', price: 2.9, duration: '1次', desc: '单次AI深度解读（非会员）' },
        { key: 'daily', name: 'AI日卡', price: 9.9, duration: '24小时', desc: '当日AI解读不限次' },
        { key: 'monthly', name: 'AI月卡', price: 39.9, duration: '30天', desc: '30天AI解读畅享（与会员权益独立）' },
        { key: 'quarterly', name: 'AI季卡', price: 99.9, duration: '90天', desc: '季度AI解读畅享（与会员权益独立）' },
        { key: 'yearly', name: 'AI年卡', price: 199, duration: '365天', desc: '全年AI解读畅享（与会员权益独立）' },
      ];
    }
    if (typeof config.singleUnlockPrice !== 'number' || !(config.singleUnlockPrice > 0)) {
      config.singleUnlockPrice = 9.9;
    }
    res.json({ success: true, data: config });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.patch('/api/admin/ai-config', adminAuth('ADMIN'), async (req, res) => {
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

app.put('/api/admin/ai-config', adminAuth('ADMIN'), async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'data', 'admin-ai-config.json');
    const config = { ...req.body, updatedAt: new Date().toISOString() };
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    res.json({ success: true, data: config });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/admin/membership-config', adminAuth('ADMIN'), async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'data', 'admin-membership-config.json');
    let config = null;
    if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!config) {
      config = {
        plans: [
          { level: "basic", name: "普通会员", price: 0, originalPrice: 0, duration: "永久免费", features: ["全部14款排盘工具（基础排盘）","每日3次通用AI问答","中医基础内容查询","模拟考试初级题库","社区浏览发帖 · 签到积分"], badge: "", highlighted: false, enabled: true, sortOrder: 0 },
          { level: "monthly", name: "月度会员", price: 37, originalPrice: 59, duration: "30天", features: ["全部14款排盘工具","每日50次通用AI问答","B类工具月赠3次，超出按¥9.9/次","批量解读享95折","中医学习库全部开放","模拟考试全等级开放","签到积分2倍 · 无广告体验","专属标识/头像框 · 导出排盘报告"], badge: "热门", highlighted: false, enabled: true, sortOrder: 1 },
          { level: "quarterly", name: "季度会员", price: 99, originalPrice: 117, duration: "90天", features: ["全部14款排盘工具","每日50次通用AI问答","B类工具月赠8次，超出按¥9.9/次","批量解读享85折","中医学习库全部开放","模拟考试全等级开放","签到积分2倍 · 无广告体验","专属标识/头像框 · 导出排盘报告"], badge: "", highlighted: false, enabled: true, sortOrder: 2 },
          { level: "yearly", name: "年度会员", price: 374, originalPrice: 458, duration: "365天", features: ["全部14款排盘工具","通用AI问答无限次","B类工具月赠15次，超出按¥9.9/次","批量解读享8折","中医学习库全部开放","模拟考试全等级开放","签到积分3倍 · 无广告体验","专属标识/头像框 · 导出排盘报告","专属客服支持"], badge: "推荐", highlighted: true, enabled: true, sortOrder: 3 },
          { level: "lifetime", name: "终身会员", price: 3600, originalPrice: 4500, duration: "永久有效", features: ["全部14款排盘工具","通用AI问答无限次","B类工具无限次免费使用","批量解读免费使用","中医学习库全部开放","模拟考试全等级开放","签到积分5倍 · 无广告体验","专属标识/头像框 · 导出排盘报告","专属客服支持 · 新功能优先体验"], badge: "尊享", highlighted: false, enabled: true, sortOrder: 4 },
        ],
        complianceLabel: "传统文化学习服务",
        updatedAt: new Date().toISOString(),
      };
    }
    res.json({ success: true, data: config });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.patch('/api/admin/membership-config', adminAuth('ADMIN'), async (req, res) => {
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

app.put('/api/admin/membership-config', adminAuth('ADMIN'), async (req, res) => {
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
  { file: 'announcementRoutes', path: '/api/announcements', name: '公告栏' },
  { file: 'socialStorageRoutes', path: '/api/social', name: '社交存储' },
  { file: 'paymentRoutes', path: '/api/payment', name: '支付' },
  { file: 'shareResultRoutes', path: '/api/share', name: '分享引擎' },
  { file: 'accountDeleteRoutes', path: '/api/account', name: '账号注销' },
  { file: 'commissionRoutes', path: '/api/commission', name: '佣金用户端' },
  { file: 'partnerRoutes', path: '/api/partner', name: '合伙人V2用户端' },
  { file: 'partnerRoutes', path: '/api/admin/partner', name: '合伙人V2管理端' },
  { file: 'adminUnifiedRoutes', path: '/api/admin/unified', name: '统一后台' },
  { file: 'featureControlRoutes', path: '/api/admin/feature-flags', name: '功能开关' },
  { file: 'toolAdminRoutes', path: '/api/admin/tool-matrix', name: '工具矩阵' },
];

for (const route of extraRoutes) {
  try {
    const mod = require('./' + route.file);
    if (mod && typeof mod.createRouter === 'function') {
      app.use(route.path, mod.createRouter());
    } else if (mod && typeof mod.router === 'function') {
      // v25.0.47_10: 支持 { router, publicRouter, ... } 导出形式（featureControl/toolAdmin）
      app.use(route.path, mod.router);
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

// DEV-V22 合伙人结算调度：每月1号自动生成上月结算单（幂等，进程内24h自检）
try {
  require('./partnerEngine').initScheduler();
  console.log('[Server] ✅ 合伙人V2结算调度器已启动（每月1号自动出账）');
} catch (e) {
  console.log('[Server] ⚠️ 合伙人V2结算调度器未启动:', e.message);
}

// ==================== 公开配置接口（v25.0.47_10 价格SSOT/功能开关/工具矩阵 公开只读） ====================
const publicPricingRoutes = require('./publicPricingRoutes');
app.use('/api/public/pricing', publicPricingRoutes.router);
app.use('/api/public/feature-flags', featureControlRoutes.publicRouter);
const toolAdminRoutesMod = require('./toolAdminRoutes');
app.use('/api/public/tool-matrix', toolAdminRoutesMod.publicRouter);
console.log('[Server] ✅ 公开配置接口已挂载: /api/public/pricing | feature-flags | tool-matrix');

// ==================== APP 版本发布接口（v25.0.48 升级提示） ====================
const appVersionRoutes = require('./appVersionRoutes');
app.use('/api/public/app-version', appVersionRoutes.router);
console.log('[Server] ✅ APP版本接口已挂载: /api/public/app-version');

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
        // P2-16 修复：与 GET /api/ai/quota 统一为 -1 表示无限（原为 'unlimited' 字符串，两接口口径不一致）
        remaining: limit === Infinity ? -1 : Math.max(0, limit - quota.dailyUsed - 1),
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

