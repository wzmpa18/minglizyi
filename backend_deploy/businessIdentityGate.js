'use strict';
const { requiresDomesticPhoneVerification } = require('./channelIdentityPolicy');
// Public exceptions are method+exact-path pairs; never exempt a whole router.
const PUBLIC_GET = new Set(['/api/health', '/api/offline/manifest', '/api/public/pricing', '/api/public/feature-flags', '/api/public/tool-matrix', '/api/public/app-version', '/api/payment/pricing', '/api/version', '/api/wechat/official/callback', '/api/wechat/official/oauth/callback']);
const AUTH_POST = new Set(['/api/auth/send-code', '/api/auth/verify-code', '/api/auth/register', '/api/auth/login', '/api/auth/login-code', '/api/auth/reset-password', '/api/auth/refresh-token', '/api/auth/logout', '/api/auth/check-duplicate']);
const CALLBACK_POST = new Set(['/api/apple-iap/notifications', '/api/payment/callback/wechat', '/api/payment/callback/alipay', '/api/payment/callback/transfer', '/api/wechat/official/callback']);
const SELF = new Set(['/api/auth/profile', '/api/auth/verify-phone', '/api/account/delete', '/api/feedback']);
// These private account services do not publish user content. An existing valid
// account may buy/restore its own entitlements or request a private AI analysis
// without a second SMS enrolment step. Account reads do not enrol again;
// publication and unknown mutations retain verified-identity enforcement.
const PRIVATE_ACCOUNT_SERVICES = /^\/api\/(?:payment|apple-iap|ai|offline)(?:\/|$)/;
function clientIp(req) {
  const remote = req.socket?.remoteAddress || '';
  return ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote) ? String(req.headers['x-forwarded-for'] || remote).split(',').at(-1).trim() : remote;
}
function publicRequest(method, route) {
  return method === 'OPTIONS' || method === 'GET' && PUBLIC_GET.has(route) || method === 'POST' && (AUTH_POST.has(route) || CALLBACK_POST.has(route));
}
function createBusinessIdentityGate({ verifyToken, getUser, resolveAdminKey, journal, now = Date.now }) {
  const attempts = new Map();
  return (req, res, next) => {
    const route = String(req.path || req.url.split('?')[0]);
    if (!route.startsWith('/api/')) return next();
    req.securityRequestId = require('node:crypto').randomUUID();
    res.set?.('X-Security-Request-ID', req.securityRequestId);
    const record = (kind, status, actor) => journal.append({kind, status, actor, method:req.method, route, ip:clientIp(req), requestId:req.securityRequestId});
    const deny = (status, code, error) => { record(code, status, req.admin ? 'admin.' + (req.admin.username || req.admin.keyId || req.admin.role) : req.user?.userId); return res.status(status).json({success:false, code, error}); };
    try {
      // Brute-force throttling is additional to the SMS provider's own limits.
      if (req.method === 'POST' && AUTH_POST.has(route)) {
        const ip = clientIp(req);
        const key = ip + ':' + route, time = now();
        if (attempts.size >= 10000) for (const [k,v] of attempts) if (v.until <= time) attempts.delete(k);
        if (!attempts.has(key) && attempts.size >= 10000) return deny(429, 'AUTH_RATE_LIMIT', '请求繁忙，请稍后再试');
        const bucket = attempts.get(key);
        const current = bucket && bucket.until > time ? bucket : {until:time+15*60*1000, count:0};
        current.count++; attempts.set(key, current);
        if (current.count > 20) return deny(429, 'AUTH_RATE_LIMIT', '尝试过于频繁，请15分钟后重试');
      }
      record('request_started', 0);
      res.once('finish', () => {
        try { record('request_completed', res.statusCode, req.admin ? 'admin.' + (req.admin.username || req.admin.keyId || req.admin.role) : req.user?.userId); }
        catch { console.error('[security-audit] completion write failed; investigate storage immediately'); }
      });
      if (publicRequest(req.method, route)) return next();
      if (route.startsWith('/api/admin/') || route.includes('/admin/')) {
        const admin = resolveAdminKey(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
        if (!admin) return deny(401, 'ADMIN_AUTH_REQUIRED', '请使用有效管理员身份登录');
        req.admin = admin;
        if (admin.role === 'SECURITY_AUDITOR' && !(req.method === 'GET' && ['/api/admin/security/events','/api/admin/unified/whoami'].includes(route))) return deny(403, 'AUDITOR_READ_ONLY', '审计员仅可读取安全日志');
        return next(); // Each route must also enforce its role/scope.
      }
      const user = verifyToken(req.headers.authorization || '');
      if (!user) return deny(401, 'UNAUTHORIZED', '请先登录');
      const row = getUser(user.userId);
      if (!row || row.deleted_at || row.status === 'banned') return deny(403, 'ACCOUNT_UNAVAILABLE', '账号不存在或已停用');
      if (Number(user.authVersion || 0) !== Number(row.auth_version || 0)) return deny(401, 'SESSION_REVOKED', '密码已更新，请重新登录');
      req.user = user;
      if (requiresDomesticPhoneVerification(req) && !SELF.has(route) && !PRIVATE_ACCOUNT_SERVICES.test(route) && req.method !== 'GET' && req.method !== 'HEAD' && (!/^1[3-9]\d{9}$/.test(row.phone || '') || !row.phone_verified_at)) return deny(403, 'PHONE_VERIFICATION_REQUIRED', '国内渠道交流服务需完成一次手机号验证；已验证账号无需重复验证');
      record('identity_accepted', 200, user.userId);
      next();
    } catch {
      return res.status(503).json({success:false, code:'SECURITY_SERVICE_UNAVAILABLE', error:'安全校验暂不可用，请稍后重试'});
    }
  };
}
module.exports = { createBusinessIdentityGate, publicRequest, clientIp };
