// ============================================================================
// 言道国学 - 微信服务号路由（指令书第六/十三~二十/二十一/三十一章）
// 挂载：app.use('/api/wechat/official', ...)（server.js extraRoutes）
// 公开：callback(GET验证/POST事件) + OAuth(authorize/callback/me/bind/unbind) + js-signature
// 管理：/admin/* 状态/菜单/选题/文章/设置/任务/关注者（adminAuth）
// 安全：Webhook 验签不合法直接 403；openid 走签名 Cookie；不打印 Secret/token（第九十八章）
// ============================================================================
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  checkSignature, parseXml, decryptMessage, encryptMessage, replySignature,
  handleMessage, createOAuthState, consumeOAuthState, isRedirectAllowed,
} = require('./wechatOfficialAccountEngine');
const tokenManager = require('./wechatTokenManager');
const contentEngine = require('./wechatContentEngine');
const draftService = require('./wechatDraftService');
const { getDb, getAuthDb, getSetting, setSetting } = require('./wechatOaDb');
const { adminAuth } = require('./adminRoles');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || '';
const APP_ID = () => process.env.WECHAT_OA_APP_ID || '';
const AES_KEY = () => process.env.WECHAT_OA_ENCODING_AES_KEY || '';
const WX_TOKEN = () => process.env.WECHAT_OA_TOKEN || '';
const COOKIE_NAME = 'woa_identity';
const COOKIE_TTL_S = 30 * 24 * 3600;

function now8601() { return new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19); }

function signIdentity(openid) {
  return jwt.sign({ openid, type: 'woa_identity' }, JWT_SECRET, { expiresIn: COOKIE_TTL_S });
}
function readIdentity(req) {
  const raw = req.headers.cookie || '';
  const m = /(?:^|;\s*)woa_identity=([^;]+)/.exec(raw);
  if (!m) return null;
  try {
    const decoded = jwt.verify(decodeURIComponent(m[1]), JWT_SECRET);
    return decoded.type === 'woa_identity' ? decoded : null;
  } catch { return null; }
}

// 用户 JWT（与 register_routes.authMiddleware 同口径）
function userAuth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ success: false, error: '请先登录' });
  try {
    const decoded = jwt.verify(h.slice(7), JWT_SECRET);
    if (decoded.type === 'refresh') return res.status(401).json({ success: false, error: '请使用access token' });
    const auth = getAuthDb();
    const user = auth ? auth.prepare('SELECT user_id, status FROM users WHERE user_id = ?').get(decoded.userId) : null;
    if (!user) return res.status(401).json({ success: false, error: '用户不存在' });
    req.user = { userId: decoded.userId };
    next();
  } catch { return res.status(401).json({ success: false, error: '认证令牌无效' }); }
}

function createRouter() {
  const router = express.Router();

  // ---------- 第七章：微信服务器验证（GET） ----------
  router.get('/callback', (req, res) => {
    const { signature, timestamp, nonce, echostr } = req.query;
    if (checkSignature(signature, timestamp, nonce)) {
      try {
        getDb().prepare(`INSERT OR IGNORE INTO wechat_oa_events(openid, event_type, event_key, fingerprint, status) VALUES('system', 'VERIFY', '', ?, 'OK')`)
          .run(crypto.createHash('sha256').update(`verify|${timestamp}|${nonce}`).digest('hex'));
      } catch { /* 记录失败不阻断验签回显 */ }
      return res.status(200).send(String(echostr));
    }
    return res.status(403).send('forbidden'); // 第九十七章：不合法请求 403
  });

  // ---------- 第九~十二章：事件/消息接收（POST） ----------
  router.post('/callback', (req, res) => {
    (async () => {
      const { signature, timestamp, nonce, encrypt_type, msg_signature } = req.query;
      const raw = req.rawBody || '';
      if (!raw) return res.status(200).send('ok');
      const safeMode = String(encrypt_type || '') === 'aes' && !!msg_signature;

      if (safeMode) {
        // 安全模式：msg_signature = sha1(sort(token, encrypted, timestamp, nonce))
        const parsedOuter = parseXml(raw);
        const encrypted = parsedOuter.Encrypt || '';
        const expect = replySignature(WX_TOKEN(), encrypted, timestamp, nonce);
        if (expect !== msg_signature) return res.status(403).send('forbidden');
        const { msg, appId } = decryptMessage(encrypted, AES_KEY());
        if (APP_ID() && appId && appId !== APP_ID()) return res.status(403).send('forbidden');
        const msgParsed = parseXml(msg);
        const result = handleMessage(msgParsed);
        if (result.action === 'reply') {
          const encReply = encryptMessage(result.xml, AES_KEY(), APP_ID());
          const sig = replySignature(WX_TOKEN(), encReply, timestamp, nonce);
          const reply = `<xml><Encrypt><![CDATA[${encReply}]]></Encrypt><MsgSignature><![CDATA[${sig}]]></MsgSignature><TimeStamp>${Math.floor(Date.now() / 1000)}</TimeStamp><Nonce><![CDATA[${nonce}]]></Nonce></xml>`;
          return res.status(200).type('application/xml').send(reply);
        }
        return res.status(200).send('ok');
      }

      // 明文/兼容模式
      if (!checkSignature(signature, timestamp, nonce)) return res.status(403).send('forbidden');
      const msgParsed = parseXml(raw);
      const result = handleMessage(msgParsed);
      if (result.action === 'reply') {
        return res.status(200).type('application/xml').send(result.xml);
      }
      return res.status(200).send('ok');
    })().catch(() => res.status(200).send('ok')); // 微信重试机制兜底：始终200防风暴
  });

  // ---------- 第十三章：网页 OAuth ----------
  router.get('/oauth/authorize', (req, res) => {
    const redirect = String(req.query.redirect || 'https://yandaoguoxue.yandao.vip/');
    const state = createOAuthState(redirect);
    if (!state) return res.status(400).json({ success: false, error: 'redirect 不在白名单' });
    const cb = encodeURIComponent('https://yandaoguoxue.yandao.vip/api/wechat/official/oauth/callback');
    const scope = process.env.WECHAT_OA_OAUTH_SCOPE || 'snsapi_base';
    const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${APP_ID()}&redirect_uri=${cb}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`;
    return res.redirect(302, url);
  });

  router.get('/oauth/callback', async (req, res) => {
    const { code, state } = req.query;
    const redirect = consumeOAuthState(String(state || ''));
    if (!redirect) return res.status(400).send('state 无效或已过期');
    try {
      const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${APP_ID()}&secret=${process.env.WECHAT_OA_APP_SECRET}&code=${code}&grant_type=authorization_code`;
      const data = await (await fetch(url)).json();
      if (!data.openid) throw new Error(data.errmsg || 'oauth失败');
      getDb().prepare(`INSERT INTO wechat_oa_events(openid, event_type, event_key, fingerprint, status)
        VALUES(?, 'OAUTH_WEB', '', ?, 'PROCESSED')`)
        .run(data.openid, crypto.createHash('sha256').update(`oauth|${data.openid}|${now8601().slice(0, 13)}`).digest('hex'));
      res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(signIdentity(data.openid))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_TTL_S}`);
      return res.redirect(302, redirect);
    } catch {
      return res.redirect(302, redirect);
    }
  });

  // ---------- 微信身份查询（网页版识别，不自动建账号：第十九/二十章） ----------
  router.get('/me', (req, res) => {
    const identity = readIdentity(req);
    if (!identity) return res.json({ success: true, data: { wechat: null } });
    const row = getDb().prepare("SELECT b.user_id, f.subscribe, f.nickname FROM wechat_user_binding b LEFT JOIN wechat_oa_followers f ON f.openid = b.openid WHERE b.openid = ? AND b.bind_status = 'BOUND'").get(identity.openid);
    const masked = identity.openid.length > 8 ? `${identity.openid.slice(0, 4)}****${identity.openid.slice(-4)}` : '****';
    return res.json({ success: true, data: { wechat: { openidMasked: masked, subscribe: row ? !!row.subscribe : null, nickname: row ? row.nickname : '', boundUserId: row ? row.user_id : null } } });
  });

  // ---------- 第十五章：openid 绑定（已登录用户主动绑定） ----------
  router.post('/bind', userAuth, (req, res) => {
    const identity = readIdentity(req);
    if (!identity) return res.status(400).json({ success: false, error: '未检测到微信身份，请从微信内打开网页后再绑定' });
    const db = getDb();
    db.prepare(`INSERT INTO wechat_user_binding(user_id, openid, bind_status, bound_at, last_seen_at)
      VALUES(?, ?, 'BOUND', datetime('now','localtime'), datetime('now','localtime'))
      ON CONFLICT(user_id, openid) DO UPDATE SET bind_status = 'BOUND', last_seen_at = datetime('now','localtime')`)
      .run(req.user.userId, identity.openid);
    return res.json({ success: true, data: { bound: true } });
  });

  router.post('/unbind', userAuth, (req, res) => {
    const identity = readIdentity(req);
    if (!identity) return res.json({ success: true, data: { unbound: true } });
    getDb().prepare("UPDATE wechat_user_binding SET bind_status = 'UNBOUND' WHERE user_id = ? AND openid = ?").run(req.user.userId, identity.openid);
    return res.json({ success: true, data: { unbound: true } });
  });

  // ---------- 第二十一章：JS-SDK 签名 ----------
  router.get('/js-signature', async (req, res) => {
    const url = String(req.query.url || '');
    try {
      if (!isRedirectAllowed(url.replace(/\/[^/]*$/, '/')) && !isRedirectAllowed(url)) {
        return res.status(403).json({ success: false, error: 'url 域名不在白名单' });
      }
      const sig = await tokenManager.buildJsSignature(url);
      return res.json({ success: true, data: sig });
    } catch (e) {
      return res.status(503).json({ success: false, error: e.message });
    }
  });

  // ---------- 管理端（adminAuth，第三十一~三十三章 / 六十五~六十六章） ----------
  // 状态总览
  router.get('/admin/status', adminAuth('OPERATOR_ADMIN'), async (req, res) => {
    try {
      const stats = contentEngine.dashboardStats();
      const token = tokenManager.tokenStatus();
      let draftCount = null;
      let callbackVerified = false;
      try {
        const ev = getDb().prepare("SELECT COUNT(*) AS n FROM wechat_oa_events WHERE event_type = 'VERIFY'").get();
        callbackVerified = ev.n > 0;
      } catch { }
      if (tokenManager.isConfigured()) {
        try { draftCount = (await draftService.getDraftCount()).total_count; } catch { draftCount = null; }
      }
      return res.json({ success: true, data: {
        ...stats,
        token, draftCount, callbackVerified,
        config: {
          appId: APP_ID() ? `${APP_ID().slice(0, 6)}****` : '',
          appSecret: process.env.WECHAT_OA_APP_SECRET ? 'PRESENT' : 'MISSING',
          token: WX_TOKEN() ? 'PRESENT' : 'MISSING',
          aesKey: AES_KEY() ? 'PRESENT' : 'MISSING',
          oauthDomain: process.env.WECHAT_OA_OAUTH_REDIRECT || 'https://yandaoguoxue.yandao.vip',
          jsDomain: process.env.WECHAT_OA_JS_DOMAIN || 'yandaoguoxue.yandao.vip',
        },
        switches: { autoPublish: contentEngine.AUTO_PUBLISH, autoMassSend: contentEngine.AUTO_MASS_SEND },
      } });
    } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
  });

  // 菜单（第二十五~三十章 + 第三十一章后台管理）
  router.get('/admin/menu/current', adminAuth('OPERATOR_ADMIN'), async (req, res) => {
    try {
      const token = await tokenManager.getAccessToken();
      const data = await (await fetch(`https://api.weixin.qq.com/cgi-bin/get_current_selfmenu_info?access_token=${token}`)).json();
      return res.json({ success: true, data });
    } catch (e) { return res.status(502).json({ success: false, error: e.message }); }
  });

  router.get('/admin/menu/default', adminAuth('OPERATOR_ADMIN'), (req, res) => {
    res.json({ success: true, data: contentEngine.buildMenuJson() });
  });

  router.post('/admin/menu/publish', adminAuth('ADMIN'), async (req, res) => {
    try {
      const menu = req.body && req.body.button ? req.body : contentEngine.buildMenuJson();
      const token = await tokenManager.getAccessToken();
      const data = await (await fetch(`https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(menu),
      })).json();
      if (data.errcode && data.errcode !== 0) return res.status(502).json({ success: false, error: `${data.errcode} ${data.errmsg}` });
      return res.json({ success: true, data: { published: true } });
    } catch (e) { return res.status(502).json({ success: false, error: e.message }); }
  });

  router.post('/admin/menu/delete', adminAuth('ADMIN'), async (req, res) => {
    try {
      const token = await tokenManager.getAccessToken();
      const data = await (await fetch(`https://api.weixin.qq.com/cgi-bin/menu/delete?access_token=${token}`, { method: 'GET' })).json();
      return res.json({ success: true, data });
    } catch (e) { return res.status(502).json({ success: false, error: e.message }); }
  });

  // 选题（第四十一章）
  router.get('/admin/topics', adminAuth('OPERATOR_ADMIN'), (req, res) => {
    const runDate = String(req.query.date || now8601().slice(0, 10));
    res.json({ success: true, data: { runDate, topics: contentEngine.listTopics(runDate) } });
  });
  router.post('/admin/topics/generate', adminAuth('OPERATOR_ADMIN'), (req, res) => {
    const runDate = String(req.body.runDate || now8601().slice(0, 10));
    const r = contentEngine.generateTopics(runDate);
    res.json({ success: true, data: r });
  });
  router.post('/admin/topics/:id/:action(approve|reject|pin|unpin)', adminAuth('OPERATOR_ADMIN'), (req, res) => {
    contentEngine.topicAction(Number(req.params.id), req.params.action);
    res.json({ success: true });
  });
  router.post('/admin/topics/add', adminAuth('OPERATOR_ADMIN'), (req, res) => {
    contentEngine.addManualTopic(String(req.body.keyword || '').slice(0, 60), String(req.body.cluster || 'other'), now8601().slice(0, 10));
    res.json({ success: true });
  });

  // 文章（第四十四~四十八/六十五~六十六章）
  router.get('/admin/articles', adminAuth('OPERATOR_ADMIN'), (req, res) => {
    const status = String(req.query.status || '');
    const rows = status
      ? getDb().prepare('SELECT article_id, topic_id, title, digest, status, safety_status, wechat_media_id, ai_model, word_count, created_at, updated_at FROM wechat_articles WHERE status = ? ORDER BY article_id DESC LIMIT 100').all(status)
      : getDb().prepare('SELECT article_id, topic_id, title, digest, status, safety_status, wechat_media_id, ai_model, word_count, created_at, updated_at FROM wechat_articles ORDER BY article_id DESC LIMIT 100').all();
    res.json({ success: true, data: rows });
  });

  router.get('/admin/articles/:id', adminAuth('OPERATOR_ADMIN'), (req, res) => {
    const row = getDb().prepare('SELECT * FROM wechat_articles WHERE article_id = ?').get(Number(req.params.id));
    if (!row) return res.status(404).json({ success: false, error: '文章不存在' });
    res.json({ success: true, data: row });
  });

  router.patch('/admin/articles/:id', adminAuth('OPERATOR_ADMIN'), (req, res) => {
    const fields = [];
    const vals = [];
    for (const k of ['title', 'digest', 'content_html', 'author']) {
      if (req.body[k] !== undefined) { fields.push(`${k} = ?`); vals.push(String(req.body[k]).slice(0, 200000)); }
    }
    if (!fields.length) return res.status(400).json({ success: false, error: '无可更新字段' });
    fields.push("updated_at = datetime('now','localtime')");
    vals.push(Number(req.params.id));
    getDb().prepare(`UPDATE wechat_articles SET ${fields.join(', ')} WHERE article_id = ?`).run(...vals);
    res.json({ success: true });
  });

  router.post('/admin/articles/:id/regenerate', adminAuth('OPERATOR_ADMIN'), async (req, res) => {
    try {
      const row = getDb().prepare('SELECT topic_id FROM wechat_articles WHERE article_id = ?').get(Number(req.params.id));
      if (!row) return res.status(404).json({ success: false, error: '文章不存在' });
      const r = await contentEngine.generateArticle(row.topic_id);
      res.json({ success: true, data: r });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

  router.post('/admin/generate', adminAuth('OPERATOR_ADMIN'), async (req, res) => {
    try {
      const runDate = String(req.body.runDate || now8601().slice(0, 10));
      const approved = contentEngine.listTopics(runDate).filter((t) => t.status === 'APPROVED' || t.status === 'USED');
      const limit = contentEngine.settings().dailyArticleLimit;
      const results = [];
      for (const t of approved.slice(0, limit)) {
        try { results.push(await contentEngine.generateArticle(t.topic_id)); } catch (e) { results.push({ topicId: t.topic_id, error: e.message }); }
      }
      res.json({ success: true, data: { generated: results.length, results } });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

  router.post('/admin/articles/:id/safety', adminAuth('OPERATOR_ADMIN'), (req, res) => {
    const row = getDb().prepare('SELECT title, digest, content_html FROM wechat_articles WHERE article_id = ?').get(Number(req.params.id));
    if (!row) return res.status(404).json({ success: false, error: '文章不存在' });
    const text = `${row.title} ${row.digest} ${String(row.content_html).replace(/<[^>]+>/g, ' ')}`;
    const safety = contentEngine.safetyGate(text);
    getDb().prepare("UPDATE wechat_articles SET safety_status = ?, safety_reasons = ?, updated_at = datetime('now','localtime') WHERE article_id = ?")
      .run(safety.pass ? 'PASS' : 'BLOCKED', JSON.stringify(safety.reasons), Number(req.params.id));
    res.json({ success: true, data: safety });
  });

  // 同步至微信草稿箱（第六十七章：只能同步到草稿，发布必须去公众平台人工确认）
  router.post('/admin/articles/:id/sync', adminAuth('ADMIN'), async (req, res) => {
    try {
      const s = contentEngine.settings();
      if (s.draftSync !== 'ON') return res.status(400).json({ success: false, error: '草稿同步开关为 OFF' });
      const row = getDb().prepare('SELECT * FROM wechat_articles WHERE article_id = ?').get(Number(req.params.id));
      if (!row) return res.status(404).json({ success: false, error: '文章不存在' });
      if (row.safety_status !== 'PASS') return res.status(400).json({ success: false, error: '文章未通过安全检查' });
      if (row.status === 'RISK_BLOCKED' || row.status === 'DUPLICATE') return res.status(400).json({ success: false, error: `文章状态 ${row.status} 不可同步` });
      // 封面：优先复用已上传素材
      let thumbMediaId = getSetting('wechat_cover_media_id', '');
      if (!thumbMediaId) {
        const coverPath = process.env.WECHAT_OA_COVER_PATH || path.join(__dirname, 'data', 'wechat-cover.png');
        if (!fs.existsSync(coverPath)) return res.status(400).json({ success: false, error: '封面图缺失：data/wechat-cover.png' });
        thumbMediaId = await draftService.uploadCoverImage(coverPath);
        setSetting('wechat_cover_media_id', thumbMediaId, 'system');
      }
      const article = {
        title: row.title,
        author: row.author || '言道国学',
        digest: row.digest || '',
        content: row.content_html,
        thumb_media_id: thumbMediaId,
        need_open_comment: 0,
        only_fans_can_comment: 0,
      };
      getDb().prepare("UPDATE wechat_articles SET status = 'SYNCING', updated_at = datetime('now','localtime') WHERE article_id = ?").run(row.article_id);
      if (row.wechat_media_id) {
        await draftService.updateDraft(row.wechat_media_id, 0, article);
      } else {
        const created = await draftService.createDraft(article);
        getDb().prepare("UPDATE wechat_articles SET wechat_media_id = ?, updated_at = datetime('now','localtime') WHERE article_id = ?").run(created.media_id, row.article_id);
      }
      getDb().prepare("UPDATE wechat_articles SET status = 'WECHAT_DRAFT', updated_at = datetime('now','localtime') WHERE article_id = ?").run(row.article_id);
      res.json({ success: true, data: { synced: true, mediaId: row.wechat_media_id || undefined } });
    } catch (e) {
      getDb().prepare("UPDATE wechat_articles SET status = 'SAFETY_PASSED', updated_at = datetime('now','localtime') WHERE article_id = ? AND status = 'SYNCING'").run(Number(req.params.id));
      res.status(502).json({ success: false, error: e.message });
    }
  });

  router.post('/admin/articles/:id/archive', adminAuth('OPERATOR_ADMIN'), (req, res) => {
    getDb().prepare("UPDATE wechat_articles SET status = 'ARCHIVED', updated_at = datetime('now','localtime') WHERE article_id = ?").run(Number(req.params.id));
    res.json({ success: true });
  });

  router.delete('/admin/articles/:id', adminAuth('ADMIN'), async (req, res) => {
    const row = getDb().prepare('SELECT wechat_media_id FROM wechat_articles WHERE article_id = ?').get(Number(req.params.id));
    if (row && row.wechat_media_id) {
      try { await draftService.deleteDraft(row.wechat_media_id); } catch { }
    }
    getDb().prepare('DELETE FROM wechat_articles WHERE article_id = ?').run(Number(req.params.id));
    res.json({ success: true });
  });

  // 设置（第七十九~八十一章）
  router.get('/admin/settings', adminAuth('OPERATOR_ADMIN'), (req, res) => {
    res.json({ success: true, data: { ...contentEngine.settings(), autoPublish: false, autoMassSend: false } });
  });
  router.put('/admin/settings', adminAuth('ADMIN'), (req, res) => {
    const allowed = ['automation', 'draftSync', 'dailyArticleLimit', 'maxArticleTokens', 'dailyCostCap', 'topicTopN', 'authorName', 'ctaText', 'keywordBlacklist', 'coverTemplate'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    if (patch.dailyArticleLimit) patch.dailyArticleLimit = Math.max(1, Math.min(5, Number(patch.dailyArticleLimit) || 3));
    contentEngine.updateSettings(patch, 'admin');
    res.json({ success: true, data: contentEngine.settings() });
  });

  // 任务日志（第七十六章）
  router.get('/admin/jobs', adminAuth('OPERATOR_ADMIN'), (req, res) => {
    const rows = getDb().prepare('SELECT * FROM wechat_content_jobs ORDER BY job_id DESC LIMIT 50').all();
    res.json({ success: true, data: rows });
  });

  // 关注者（第八十六章）
  router.get('/admin/followers', adminAuth('OPERATOR_ADMIN'), (req, res) => {
    const rows = getDb().prepare("SELECT openid, subscribe, subscribe_time, unsubscribe_time, nickname, source_scene, qr_scene, user_id, updated_at FROM wechat_oa_followers ORDER BY updated_at DESC LIMIT 200").all()
      .map((r) => ({ ...r, openid: r.openid.length > 8 ? `${r.openid.slice(0, 4)}****${r.openid.slice(-4)}` : '****' }));
    res.json({ success: true, data: rows });
  });

  // 审核提醒红点（第六十九章）
  router.get('/admin/notifications', adminAuth('OPERATOR_ADMIN'), (req, res) => {
    const stats = contentEngine.dashboardStats();
    res.json({ success: true, data: { pendingReview: stats.pendingReview, riskBlocked: stats.riskBlocked, message: stats.pendingReview > 0 ? `今日有 ${stats.pendingReview} 篇公众号草稿待审核` : '' } });
  });

  return router;
}

module.exports = { createRouter };
