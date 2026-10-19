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

let store,accounts;
function getStore(){
  if(store)return store;
  const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'data/study-acupoint-targets.json'),'utf8'));
  const zhenggu=JSON.parse(fs.readFileSync(path.join(__dirname,'data/study-zhenggu-targets.json'),'utf8'));
  const location=process.env.STUDY_COMMENT_DB_PATH||path.join(__dirname,'data/study-comments.db');
  fs.mkdirSync(path.dirname(location),{recursive:true});
  const db=new Database(location); db.pragma('journal_mode = WAL'); db.pragma('busy_timeout = 5000');
  store=createStudyCommentStore(db,new Set([...catalog.targets,...STUDY_TOOL_TARGETS,...zhenggu.targets])); return store;
}
function account(id,publishing=false){
  if(!accounts)accounts=new Database(process.env.DB_PATH||process.env.USER_DB_PATH||'/root/backend-auth/data/yandao_users.db',{readonly:true});
  const row=accounts.prepare('SELECT user_id,nickname,status,deleted_at,phone FROM users WHERE user_id=?').get(String(id));
  if(!row || row.deleted_at || row.status==='banned') {const error=new Error('账号不可用，请重新登录或联系客服');error.status=403;throw error;}
  if(publishing&&!/^1[3-9]\d{9}$/.test(String(row.phone||''))){const error=new Error('请使用已通过短信验证的手机号账号登录后再留言；阅读与用户反馈仍可使用');error.status=403;throw error;}
  return row;
}
const allowedOrigins=new Set(['https://yandaoguoxue.yandao.vip','https://www.yandao.vip','https://localhost','http://localhost','capacitor://localhost']);
function safeOrigin(req,res,next){
  const origin=req.headers.origin;
  if(origin && !allowedOrigins.has(origin))return res.status(403).json({success:false,error:'请求来源不受支持'});
  if(Buffer.byteLength(req.rawBody||JSON.stringify(req.body||{}),'utf8')>70000)return res.status(413).json({success:false,error:'请求数据过大'});
  next();
}
const handle=fn=>async(req,res)=>{try{res.set('Cache-Control','no-store');res.json(await fn(req));}catch(e){res.status(e.status||503).json({success:false,error:e.status?e.message:'学习讨论暂不可用，请稍后重试'});}};
function createRouter(){
  const router=express.Router();
  router.use(safeOrigin);
  router.get('/target/:targetId',handle(req=>{
    const me=verifyToken(req.headers.authorization||'');if(me)account(me.userId);
    const service=getStore(),view=['recent','featured','mine'].includes(req.query.view)?req.query.view:'recent';if(view==='mine'&&!me)return {success:false,error:'登录后查看自己的留言'};const rows=service.list(req.params.targetId,me?.userId||'',{view,before:req.query.before,limit:21});return {success:true,config:service.config(req.params.targetId),comments:rows.slice(0,20),nextCursor:rows.length>20?rows[19].id:''};
  }));
  router.get('/mine/:targetId',authMiddleware,handle(req=>{account(req.user.userId);return {success:true,items:getStore().mine(req.params.targetId,req.user.userId)};}));
  router.post('/target/:targetId',authMiddleware,handle(async req=>{const me=account(req.user.userId,true),service=getStore(),submitted=service.submit(req.params.targetId,me.user_id,me.nickname,req.body);if(!submitted.duplicated){const input=service.safetyInput(submitted.id);service.recordSafety(submitted.id,await screenPublicComment(input.content));}const status=service.mine(req.params.targetId,me.user_id).find(r=>String(r.id)===submitted.id)?.status||submitted.status;return status==='REJECTED'?{success:false,id:submitted.id,status,error:'本条内容暂不能公开，请修改后重新提交；如有异议可通过用户反馈申请复核'}:{...submitted,status,pendingReview:status==='PENDING'};}));
  router.delete('/comment/:id',authMiddleware,handle(req=>{account(req.user.userId);return getStore().remove(req.params.id,req.user.userId);}));
  router.post('/comment/:id/report',authMiddleware,handle(req=>{account(req.user.userId);return getStore().report(req.params.id,req.user.userId,req.body.reason);}));
  router.get('/blocks',authMiddleware,handle(req=>{account(req.user.userId);return {success:true,items:getStore().blocks(req.user.userId)};}));
  router.post('/blocks/:userId',authMiddleware,handle(req=>{account(req.user.userId);return getStore().block(req.user.userId,req.params.userId);}));
  router.delete('/blocks/:userId',authMiddleware,handle(req=>{account(req.user.userId);return getStore().block(req.user.userId,req.params.userId,true);}));
  router.use('/admin',adminAuth(undefined,'ops'));
  const actor=req=>req.admin.name||req.admin.role;
  router.get('/admin/queue',handle(()=>({success:true,...getStore().queue()})));
  router.put('/admin/config',adminAuth('ADMIN'),handle(req=>getStore().setConfig(actor(req),req.body)));
  router.put('/admin/comment/:id/check',handle(async req=>{const service=getStore(),input=service.safetyInput(req.params.id);service.recordSafety(req.params.id,await screenPublicComment(input.content));return {success:true};}));
  router.put('/admin/comment/:id',handle(req=>getStore().review(req.params.id,actor(req),req.body)));
  router.put('/admin/mute/:userId',handle(req=>getStore().mute(actor(req),req.params.userId,req.body.hours,req.body.reason)));
  router.put('/admin/report/:id',handle(req=>getStore().resolveReport(actor(req),req.params.id,String(req.body.note||'').slice(0,500))));
  return router;
}
module.exports={createRouter};
