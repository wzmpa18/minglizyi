'use strict';
// Shared by the server and the bundled client. Notices contain text only;
// they never contain routes, payment actions, executable code or feature flags.
const SCHEMA = 'yandao.notice.v1';
const CHANNELS = ['default','internal','google','ios-full-learning','tencent','huawei','oppo','vivo','honor','xiaomi','samsung','lenovo'];
const PLATFORMS = ['web','android','ios'];
const KINDS = ['learning','service'];
function version(value) { return /^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(String(value || '')) ? String(value).split('.').map(Number) : null; }
function compareVersion(a,b) { const x=version(a),y=version(b); if(!x||!y)return null;for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;return 0; }
function plain(value,max) { return typeof value==='string' && value.trim().length>=2 && value.length<=max && !/[\u0000-\u0008\u000b-\u001f\u202a-\u202e]/.test(value) && !/<[^>]*>|https?:\/\/|www\.|javascript:/i.test(value); }
function noticeError(item) {
  if (!item || item.schema!==SCHEMA || !/^[A-Za-z0-9_-]{1,100}$/.test(item.id||'')) return '公告协议或编号无效';
  if (!plain(item.title,60) || !plain(item.content,2000)) return '公告仅支持标题与正文纯文本，不含HTML或网址';
  if (/返现|返佣|现金|佣金|分销|促销|限时折扣|扫码.{0,8}(?:付费|支付)|邀请.{0,16}(?:奖励|解锁)|(?:官网|站外).{0,12}(?:购买|付费|充值)|审核.{0,8}后.{0,12}(?:开放|开启)/.test(item.title+'\n'+item.content)) return '公告仅用于学习或服务通知，不支持营销、奖励、站外付费或功能激活';
  if (!KINDS.includes(item.kind) || item.publisher!=='言道国学官方通知' || item.purpose!=='NOTICE_ONLY' || item.link) return '公告来源或用途无效';
  if (!Number.isSafeInteger(item.revision) || item.revision<1 || !['info','important','urgent'].includes(item.level)) return '公告修订或级别无效';
  if (!Array.isArray(item.channels) || !item.channels.length || item.channels.some(x=>!CHANNELS.includes(x)) || new Set(item.channels).size!==item.channels.length) return '请选择明确的客户端渠道';
  if (!Array.isArray(item.platforms) || !item.platforms.length || item.platforms.some(x=>!PLATFORMS.includes(x))) return '请选择明确的平台';
  if (!version(item.minVersion) || !version(item.maxVersion) || compareVersion(item.minVersion,item.maxVersion)>0) return '公告客户端版本范围无效';
  if (!Number.isFinite(Date.parse(item.publishAt)) || !Number.isFinite(Date.parse(item.expiresAt)) || Date.parse(item.expiresAt)<=Date.parse(item.publishAt)) return '公告须有明确有效时窗';
  if (typeof item.popup!=='boolean' || typeof item.published!=='boolean') return '公告发布或弹窗状态无效';
  return null;
}
function reviewed(item) { return item.review?.status==='APPROVED' && item.review.revision===item.revision && typeof item.review.reference==='string' && item.review.reference.trim().length>=3 && Number.isFinite(Date.parse(item.review.approvedAt)) && item.review.scope==='COMPANY_CONTENT_REVIEW'; }
function eligibleNotice(item,context,now=Date.now()) {
  if(noticeError(item) || item.published!==true || !reviewed(item) || !CHANNELS.includes(context?.channel) || !PLATFORMS.includes(context?.platform) || !version(context?.version))return false;
  return item.channels.includes(context.channel) && item.platforms.includes(context.platform) && compareVersion(context.version,item.minVersion)>=0 && compareVersion(context.version,item.maxVersion)<=0 && Date.parse(item.publishAt)<=now && Date.parse(item.expiresAt)>now;
}
function publicNotice(item) {
  const value=Object.fromEntries(['schema','id','revision','title','content','kind','publisher','purpose','level','channels','platforms','minVersion','maxVersion','publishAt','expiresAt','popup','published','pinned'].map(key=>[key,item[key]]));
  value.review={...item.review,reference:'公司内容审核已留证'}; // Internal evidence references remain admin-only.
  return value;
}
module.exports={SCHEMA,CHANNELS,PLATFORMS,KINDS,compareVersion,noticeError,reviewed,eligibleNotice,publicNotice};
