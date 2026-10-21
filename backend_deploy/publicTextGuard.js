'use strict';
const { localFlags } = require('./studyCommentSafety');
// Defence in depth before writes, including legacy routes. This local check
// does not send private health records/prompts/passwords to a third party.
// Social publication still requires the existing per-object review pipeline.
const FIELDS = new Set(['content','text','nickname','bio','title','description','displayName','groupName','comment','reply','reason','message','tags']);
function collectPublicText(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 4) return [];
  const result = [];
  for (const [key, item] of Object.entries(value)) {
    if (!FIELDS.has(key)) continue;
    if (typeof item === 'string') result.push(item);
    else if (Array.isArray(item)) for (const x of item) if (typeof x === 'string') result.push(x);
  }
  return result;
}
function publicTextGuard(req, res, next) {
  if (!['POST','PUT','PATCH'].includes(req.method) || !req.path?.startsWith('/api/')) return next();
  // A private complaint may need to describe a violation. It is not a public
  // post and must remain available to report abuse, including disputed words.
  if (req.path === '/api/feedback' || req.path.startsWith('/api/feedback/')) return next();
  // Callback signatures cover their complete untouched body; never filter it.
  if (req.path.startsWith('/api/payment/callback/') || req.path === '/api/apple-iap/notifications') return next();
  const flags = [...new Set(collectPublicText(req.body).flatMap(localFlags))];
  if (!flags.length) return next();
  try {
    require('./securityAudit').getSecurityAudit().append({actor:req.user?.userId,kind:'content_rule_held',method:req.method,route:req.path,status:422,ip:req.socket?.remoteAddress});
  } catch { return res.status(503).json({success:false,error:'安全审计暂不可用，未提交'}); }
  return res.status(422).json({success:false,code:'CONTENT_REVIEW_REQUIRED',error:'文字存在风险语境，请修改后提交；有异议可通过用户反馈申请复核'});
}
module.exports = { publicTextGuard, collectPublicText };
