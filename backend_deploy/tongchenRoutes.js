'use strict';
const express=require('express'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {adminAuth,audit}=require('./adminRoles');
const {createTongchenStore}=require('./tongchenStore');
const {validateStudyText}=require('./studyCommentPolicy');
function createTongchenRouter({getDb,getUserDb,authRequired,userPublicInfo,privateConvId,checkPlatformMute,moderateResourceComment,upsertUserConversation}){
 const router=express.Router();let store;
 const userInfo=id=>{const row=getUserDb()?.prepare('SELECT status,deleted_at FROM users WHERE user_id=?').get(String(id));return row&&!row.deleted_at&&row.status!=='banned'?userPublicInfo(id):null;};
 function service(){
  if(store)return store;const db=getDb();
  const directory=path.join(__dirname,'data'),file=process.env.TONGCHEN_INDEX_KEY_FILE||path.join(directory,'tongchen-index.key');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  if(!fs.existsSync(file)){
   const exists=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='tongchen_profiles'").get();
   if(exists&&db.prepare('SELECT 1 FROM tongchen_profiles LIMIT 1').get())throw new Error('匹配索引密钥缺失，拒绝生成替代密钥');
   fs.writeFileSync(file,crypto.randomBytes(32),{flag:'wx',mode:0o600});
  }
  const key=fs.readFileSync(file);if(key.length!==32)throw new Error('匹配索引密钥格式无效');
  let Solar;try{Solar=require('./calendar-runtime/node_modules/lunar-javascript').Solar;}catch(error){if(process.env.NODE_ENV==='production')throw error;Solar=require('lunar-javascript').Solar;}
  store=createTongchenStore(db,{Solar,key,userInfo});
  const columns=db.prepare('PRAGMA table_info(chat_messages)').all().map(row=>row.name);
  if(!columns.includes('review_status'))db.exec("ALTER TABLE chat_messages ADD COLUMN review_status TEXT NOT NULL DEFAULT 'active'");
  if(!columns.includes('review_reason'))db.exec("ALTER TABLE chat_messages ADD COLUMN review_reason TEXT NOT NULL DEFAULT ''");
  return store;
 }
 const origins=new Set(['https://yandaoguoxue.yandao.vip','https://www.yandao.vip','https://localhost','http://localhost','capacitor://localhost']);
 router.use((req,res,next)=>{res.set('Cache-Control','no-store');if(req.headers.origin&&!origins.has(req.headers.origin))return res.status(403).json({success:false,error:'请求来源不受支持'});if(Buffer.byteLength(JSON.stringify(req.body||{}),'utf8')>70000)return res.status(413).json({success:false,error:'请求过大'});next();});
 const handle=fn=>async(req,res)=>{try{res.json(await fn(req));}catch(error){res.status(error.status||503).json({success:false,error:error.status?error.message:'同辰交流暂不可用，请稍后重试'});}};
 router.get('/config',handle(()=>({success:true,config:service().config()})));
 router.get('/mine',authRequired,handle(req=>service().mine(req.user.userId)));
 router.put('/mine',authRequired,handle(req=>service().join(req.user.userId,req.body)));
 router.delete('/mine',authRequired,handle(req=>service().leave(req.user.userId)));
 router.post('/search',authRequired,handle(req=>service().search(req.user.userId,req.body)));
 router.post('/peer/:peerId/request',authRequired,handle(req=>service().request(req.user.userId,req.params.peerId)));
 router.get('/requests',authRequired,handle(req=>service().requests(req.user.userId)));
 router.put('/request/:id',authRequired,handle(req=>{if(typeof req.body.accept!=='boolean'){const error=new Error('请明确同意或拒绝');error.status=400;throw error;}return service().answer(req.user.userId,req.params.id,req.body.accept);}));
 router.delete('/peer/:peerId/relation',authRequired,handle(req=>service().revoke(req.user.userId,req.params.peerId)));
 router.post('/peer/:peerId/block',authRequired,handle(req=>service().block(req.user.userId,req.params.peerId)));
 router.post('/peer/:peerId/report',authRequired,handle(req=>service().report(req.user.userId,req.params.peerId,req.body.reason)));
 router.get('/peer/:peerId/messages',authRequired,handle(req=>{
  const peer=service().relation(req.user.userId,req.params.peerId),conv=privateConvId(req.user.userId,peer.user_id);
  return {success:true,items:getDb().prepare("SELECT id,sender_id,content,created_at FROM chat_messages WHERE conversation_id=? AND msg_type='text' AND review_status='active' ORDER BY id DESC LIMIT 100").all(conv).reverse().map(row=>({id:String(row.id),mine:String(row.sender_id)===String(req.user.userId),content:row.content,createdAt:row.created_at}))};
 }));
 router.post('/peer/:peerId/messages',authRequired,handle(async req=>{
  const s=service();s.joined(req.user.userId);const peer=s.relation(req.user.userId,req.params.peerId),me=String(req.user.userId),conv=privateConvId(me,peer.user_id),db=getDb();
  const bad=message=>{const error=new Error(message);error.status=400;throw error;};
  if(Object.keys(req.body||{}).some(k=>!['content','requestId','moderationVersion'].includes(k)))bad('仅支持文字交流');
  const text=validateStudyText(req.body.content);if(!text.ok)bad(text.error);
  if(!/^[A-Za-z0-9_-]{16,64}$/.test(req.body.requestId||''))bad('请求编号无效');
  const old=db.prepare('SELECT sender_id,content,review_status FROM chat_messages WHERE conversation_id=? AND client_msg_id=?').get(conv,req.body.requestId);
  if(old){if(old.sender_id!==me||old.content!==text.text)bad('请求编号已被使用');return {success:true,status:old.review_status,duplicated:true};}
  if(checkPlatformMute(me)){const error=new Error('账号暂不可发送交流文字');error.status=403;throw error;}
  s.limit(me,'message',100,10);
  const result=db.prepare("INSERT INTO chat_messages(conversation_id,sender_id,sender_name,content,msg_type,client_msg_id,review_status) VALUES (?,?,?,?,'text',?,'pending')").run(conv,me,userInfo(me)?.nickname||'学友',text.text,req.body.requestId);
  const review=await moderateResourceComment(text.text,{userId:me,moderationVersion:req.body?.moderationVersion});
  // Recheck relationship/block status after asynchronous moderation.
  let stillAllowed=true;try{s.relation(me,req.params.peerId);}catch{stillAllowed=false;}
  const status=stillAllowed?review.status:'rejected';
  db.prepare('UPDATE chat_messages SET review_status=?,review_reason=? WHERE id=?').run(status,review.reason||'',result.lastInsertRowid);
  if(status==='active'){
   upsertUserConversation(db,me,conv,'private',peer.user_id,0,Number(result.lastInsertRowid),true);
   upsertUserConversation(db,peer.user_id,conv,'private',me,0,Number(result.lastInsertRowid),false);
  }
  return {success:true,status,message:status==='active'?'文字已送达':status==='pending'?'文字正在等待人工审核，尚未向对方展示':'文字未通过审核，未向对方展示'};
 }));
 router.use('/admin',adminAuth(undefined,'ops'));
 router.get('/admin/config',handle(()=>({success:true,config:service().config()})));
 router.put('/admin/config',adminAuth('ADMIN'),handle(req=>{const result=service().configure(req.body);audit(req.admin,'TONGCHEN_CONFIG','tongchen','',JSON.stringify(req.body),'真实功能开关与名称',req);return result;}));
 router.get('/admin/messages',handle(()=>{service();return {success:true,items:getDb().prepare("SELECT id,sender_name,content,review_status,review_reason,created_at FROM chat_messages WHERE review_status='pending' ORDER BY id LIMIT 100").all()};}));
 router.put('/admin/message/:id',handle(req=>{
  service();if(!['active','rejected'].includes(req.body.status)||!String(req.body.reason||'').trim()){const error=new Error('请填写审核结果和依据');error.status=400;throw error;}
  const db=getDb(),message=db.prepare("SELECT * FROM chat_messages WHERE id=? AND review_status='pending'").get(Number(req.params.id));
  if(!message)return {success:false};
  const result=db.prepare("UPDATE chat_messages SET review_status=?,review_reason=? WHERE id=? AND review_status='pending'").run(req.body.status,String(req.body.reason).slice(0,500),message.id);
  if(result.changes===1&&req.body.status==='active'){
   const relationship=db.prepare('SELECT user_a,user_b FROM friendships WHERE user_a=? OR user_b=?').all(message.sender_id,message.sender_id).find(row=>privateConvId(row.user_a,row.user_b)===message.conversation_id);
   if(relationship){
    const blocked=db.prepare('SELECT 1 FROM blacklists WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)').get(relationship.user_a,relationship.user_b,relationship.user_b,relationship.user_a);
    if(!blocked&&userInfo(relationship.user_a)&&userInfo(relationship.user_b))for(const [user,peer] of [[relationship.user_a,relationship.user_b],[relationship.user_b,relationship.user_a]])upsertUserConversation(db,user,message.conversation_id,'private',peer,0,Number(message.id),user===message.sender_id);
   }
  }
  audit(req.admin,'TONGCHEN_MESSAGE_REVIEW',String(req.params.id),'pending',req.body.status,String(req.body.reason).slice(0,500),req);
  return {success:result.changes===1};
 }));
 return router;
}
module.exports={createTongchenRouter};
