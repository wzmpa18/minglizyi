'use strict';
const express=require('express');
const Database=require('better-sqlite3');
const fs=require('node:fs');
const path=require('node:path');
const {authMiddleware,verifyToken}=require('./middleware/auth');
const {adminAuth}=require('./adminRoles');
const {createStudyCommentStore}=require('./studyCommentStore');
const {screenPublicComment}=require('./studyCommentSafety');
const {STUDY_TOOL_TARGETS}=require('./studyToolTargets');
const {requiresDomesticPhoneVerification}=require('./channelIdentityPolicy');

let store,accounts,social;
function lifeEligible(id){try{if(!social)social=new Database(process.env.SOCIAL_DB_PATH||path.join(__dirname,'data/social.db'),{readonly:true});if(social.prepare("SELECT value FROM tongchen_settings WHERE key='enabled'").get()?.value!=='true')return false;const p=social.prepare('SELECT public_id,joined_ms,rule_version FROM tongchen_profiles WHERE user_id=? AND consent_version=?').get(String(id),'tongchen-20261019-v1');return p?`${p.public_id}:${p.joined_ms}:${p.rule_version}`:false;}catch{return false;}}
function getStore(){
  if(store)return store;
  const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'data/study-acupoint-targets.json'),'utf8'));
  const zhenggu=JSON.parse(fs.readFileSync(path.join(__dirname,'data/study-zhenggu-targets.json'),'utf8'));
  const location=process.env.STUDY_COMMENT_DB_PATH||path.join(__dirname,'data/study-comments.db');
  fs.mkdirSync(path.dirname(location),{recursive:true});
  const db=new Database(location); db.pragma('journal_mode = WAL'); db.pragma('busy_timeout = 5000');
  store=createStudyCommentStore(db,new Set([...catalog.targets,...STUDY_TOOL_TARGETS,...zhenggu.targets]),()=>Date.now(),{lifeEligible,accountEligible:id=>{try{account(id);return true;}catch{return false;}}}); return store;
}
function account(id,publishing=false,req){
  if(!accounts)accounts=new Database(process.env.DB_PATH||process.env.USER_DB_PATH||'/root/backend-auth/data/yandao_users.db',{readonly:true});
  const row=accounts.prepare('SELECT user_id,nickname,status,deleted_at,phone FROM users WHERE user_id=?').get(String(id));
  if(!row || row.deleted_at || row.status==='banned') {const error=new Error('账号不可用，请重新登录或联系客服');error.status=403;throw error;}
  if(publishing&&requiresDomesticPhoneVerification(req)&&!/^1[3-9]\d{9}$/.test(String(row.phone||''))){const error=new Error('国内渠道留言需完成一次手机号验证；已验证账号无需重复验证');error.status=403;throw error;}
  return row;
}
const allowedOrigins=new Set(['https://yandaoguoxue.yandao.vip','https://www.yandao.vip','https://localhost','http://localhost','capacitor://localhost']);
function safeOrigin(req,res,next){
  const origin=req.headers.origin;
  if(origin && !allowedOrigins.has(origin))return res.status(403).json({success:false,error:'请求来源不受支持'});
  if(Buffer.byteLength(req.rawBody||JSON.stringify(req.body||{}),'utf8')>70000)return res.status(413).json({success:false,error:'请求数据过大'});
  next();
}
const handle=fn=>async(req,res)=>{try{res.set('Cache-Control','no-store');res.set('X-Robots-Tag','noindex, nofollow');res.json(await fn(req));}catch(e){res.status(e.status||503).json({success:false,error:e.status?e.message:'学习讨论暂不可用，请稍后重试'});}};
function createRouter(){
  const router=express.Router();
  router.use(safeOrigin);
  router.get('/research/:domain',handle(req=>{const me=verifyToken(req.headers.authorization||'');if(me)account(me.userId);return {success:true,...getStore().researchState(me?.userId||'',req.params.domain)};}));
  router.put('/research/:domain',authMiddleware,handle(req=>{account(req.user.userId,true,req);return getStore().researchJoin(req.user.userId,req.params.domain,req.body);}));
  router.delete('/research/:domain',authMiddleware,handle(req=>{account(req.user.userId);return getStore().researchLeave(req.user.userId,req.params.domain);}));
  router.get('/target/:targetId',handle(req=>{
    const me=verifyToken(req.headers.authorization||'');if(me)account(me.userId);
    const service=getStore(),view=['recent','featured','mine'].includes(req.query.view)?req.query.view:'recent';if(view==='mine'&&!me)return {success:false,error:'登录后查看自己的留言'};const rows=service.list(req.params.targetId,me?.userId||'',{view,before:req.query.before,chapterId:typeof req.query.chapter==='string'?req.query.chapter:'',limit:21});return {success:true,config:service.config(req.params.targetId),comments:rows.slice(0,20),nextCursor:rows.length>20?rows[19].id:rows.nextScanCursor||''};
  }));
  router.get('/mine/:targetId',authMiddleware,handle(req=>{account(req.user.userId);return {success:true,items:getStore().mine(req.params.targetId,req.user.userId)};}));
  router.post('/target/:targetId',authMiddleware,handle(async req=>{const me=account(req.user.userId,true,req),service=getStore(),submitted=service.submit(req.params.targetId,me.user_id,me.nickname,req.body);if(!submitted.duplicated){const input=service.safetyInput(submitted.id);service.recordSafety(submitted.id,input.moderationVersion?await service.automaticScreen(input):await screenPublicComment(input.content));}const status=service.mine(req.params.targetId,me.user_id).find(r=>String(r.id)===submitted.id)?.status||submitted.status;return status==='REJECTED'?{success:false,id:submitted.id,status,error:'本条内容暂不能公开，请修改后重新提交；如有异议可通过用户反馈申请复核'}:{...submitted,status,pendingReview:status==='PENDING',message:status==='APPROVED'?'已发布':submitted.message};}));
  router.post('/comment/:id/recheck',authMiddleware,handle(async req=>{account(req.user.userId,true,req);const service=getStore();service.ownRecheck(req.params.id,req.user.userId);const input=service.safetyInput(req.params.id);service.recordSafety(req.params.id,await service.automaticScreen(input));return {success:true,message:'已重新检测，请刷新处理状态；疑点或服务异常仍保持隔离'};}));
  router.delete('/comment/:id',authMiddleware,handle(req=>{account(req.user.userId);return getStore().remove(req.params.id,req.user.userId);}));
  router.post('/comment/:id/report',authMiddleware,handle(req=>{account(req.user.userId);return getStore().report(req.params.id,req.user.userId,req.body.reason);}));
  router.get('/blocks',authMiddleware,handle(req=>{account(req.user.userId);return {success:true,items:getStore().blocks(req.user.userId)};}));
  router.post('/blocks/:userId',authMiddleware,handle(req=>{account(req.user.userId);return getStore().block(req.user.userId,req.params.userId);}));
  router.delete('/blocks/:userId',authMiddleware,handle(req=>{account(req.user.userId);return getStore().block(req.user.userId,req.params.userId,true);}));
  router.use('/admin',adminAuth(undefined,'ops'));
  const actor=req=>req.admin.name||req.admin.role;
  router.get('/admin/queue',handle(()=>({success:true,...getStore().queue()})));
  router.put('/admin/research/:domain',adminAuth('ADMIN'),handle(req=>getStore().research.configure(req.params.domain,req.body.enabled,actor(req),req.body)));
  router.put('/admin/config',adminAuth('ADMIN'),handle(req=>getStore().setConfig(actor(req),req.body)));
  router.put('/admin/comment/:id/check',handle(async req=>{const service=getStore(),input=service.safetyInput(req.params.id);service.recordSafety(req.params.id,input.moderationVersion?await service.automaticScreen(input):await screenPublicComment(input.content));return {success:true};}));
  router.put('/admin/comment/:id',handle(req=>getStore().review(req.params.id,actor(req),req.body)));
  router.put('/admin/mute/:userId',handle(req=>getStore().mute(actor(req),req.params.userId,req.body.hours,req.body.reason)));
  router.put('/admin/report/:id',handle(req=>getStore().resolveReport(actor(req),req.params.id,String(req.body.note||'').slice(0,500))));
  return router;
}
module.exports={createRouter,screenSelectedText:input=>getStore().screenSelectedText(input)};
