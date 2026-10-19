'use strict';
// Reuses social.db/groups/chat_messages. Private life-vault data is never read.
const express=require('express'),crypto=require('node:crypto');
const {validateStudyText}=require('./studyCommentPolicy');
const TOPICS=['classics','calendar','tool-learning','medical-literature'];
function createGovernedGroupRouter({getDb,getUserDb,authRequired,userPublicInfo,checkPlatformMute,moderateResourceComment,upsertUserConversation,notify}){
 const router=express.Router();let initialized=false;
 const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
 function db(){const d=getDb();if(!initialized){d.exec(`
 CREATE TABLE IF NOT EXISTS study_group_governance(group_id INTEGER PRIMARY KEY,topic TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',review_reason TEXT NOT NULL DEFAULT '',request_id TEXT NOT NULL,owner_id TEXT NOT NULL,created_ms INTEGER NOT NULL,UNIQUE(owner_id,request_id));
 CREATE TABLE IF NOT EXISTS study_group_invitations(id TEXT PRIMARY KEY,group_id INTEGER NOT NULL,inviter_id TEXT NOT NULL,target_id TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',created_ms INTEGER NOT NULL,expires_ms INTEGER NOT NULL,responded_ms INTEGER);
 CREATE INDEX IF NOT EXISTS idx_study_invite_target ON study_group_invitations(target_id,state,created_ms DESC);
 CREATE TABLE IF NOT EXISTS study_group_access(group_id INTEGER NOT NULL,user_id TEXT NOT NULL,after_msg_id INTEGER NOT NULL,joined_ms INTEGER NOT NULL,PRIMARY KEY(group_id,user_id));
 CREATE TABLE IF NOT EXISTS study_group_edits(group_id INTEGER PRIMARY KEY,name TEXT NOT NULL,announcement TEXT NOT NULL,status TEXT NOT NULL,reason TEXT NOT NULL,created_ms INTEGER NOT NULL);
 `);const columns=d.prepare('PRAGMA table_info(study_group_access)').all();if(!columns.some(c=>c.name==='membership_id'))d.exec("ALTER TABLE study_group_access ADD COLUMN membership_id TEXT NOT NULL DEFAULT ''");for(const row of d.prepare("SELECT group_id,user_id FROM study_group_access WHERE membership_id=''").all())d.prepare('UPDATE study_group_access SET membership_id=? WHERE group_id=? AND user_id=?').run(crypto.randomUUID(),row.group_id,row.user_id);initialized=true;}return d;}
 const ids=row=>JSON.parse(row.member_ids||'[]').map(String);
 function group(id,me,active=false){if(!/^\d{1,16}$/.test(String(id)))fail('学习群不存在',404);const row=db().prepare('SELECT * FROM groups WHERE id=?').get(id);if(!row||!ids(row).includes(String(me)))fail('学习群不存在或你已不在群中',404);if(row.status==='closed')fail('此群已被平台关闭',403);const governance=db().prepare('SELECT * FROM study_group_governance WHERE group_id=?').get(row.id);if(active&&governance?.status!=='active')fail('此学习群尚未通过审核，暂不可发言或邀请',403);return {...row,governance};}
 const manager=(g,me)=>String(g.owner_id)===String(me)||JSON.parse(g.admins||'[]').includes(String(me));
 function friends(a,b){if(a===b)fail('不能邀请自己');for(const id of [a,b]){const u=getUserDb()?.prepare('SELECT status,deleted_at FROM users WHERE user_id=?').get(id);if(!u||u.deleted_at||u.status==='banned')fail('此邀请不可用',403);}const [x,y]=[a,b].sort();if(!db().prepare('SELECT 1 FROM friendships WHERE user_a=? AND user_b=?').get(x,y))fail('只能邀请已双向同意的好友',403);if(db().prepare('SELECT 1 FROM blacklists WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)').get(a,b,b,a))fail('此邀请不可用',403);}
 function vo(g){return {id:String(g.id),groupId:String(g.id),name:g.name,ownerId:g.owner_id,ownerName:g.owner_name,announcement:g.announcement,memberIds:ids(g),memberCount:ids(g).length,maxMembers:50,admins:JSON.parse(g.admins||'[]'),muteAll:!!g.mute_all,avatar:g.avatar||'',createdAt:g.created_at,reviewStatus:g.governance?.status||'legacy-unreviewed',topic:g.governance?.topic||''};}
 const handle=fn=>async(req,res)=>{res.set('Cache-Control','no-store');try{res.json(await fn(req,String(req.user.userId)));}catch(e){res.status(e.status||503).json({success:false,error:e.status?e.message:'学习群暂不可用，请重试'});}};
 router.use(authRequired);
 router.get('/',handle((req,me)=>{
  const before=Number(req.query.before)||Number.MAX_SAFE_INTEGER;if(!Number.isSafeInteger(before)||before<=0)fail('分页位置无效');
  const rows=db().prepare("SELECT g.* FROM groups g WHERE g.id<? AND EXISTS(SELECT 1 FROM json_each(g.member_ids) m WHERE CAST(m.value AS TEXT)=?) ORDER BY g.id DESC LIMIT 50").all(before,me);
  return {success:true,groups:rows.map(row=>vo({...row,governance:db().prepare('SELECT * FROM study_group_governance WHERE group_id=?').get(row.id)})),nextBefore:rows.length===50?rows.at(-1).id:undefined};
 }));
 router.post('/',handle(async(req,me)=>{
  const {name,topic,adultConsent,requestId}=req.body||{},valid=validateStudyText(name);
  if(!valid.ok||Array.from(valid.text||'').length>30||!TOPICS.includes(topic)||adultConsent!==true||!/^[\w-]{16,80}$/.test(requestId||''))fail('请填写30字内群名、选择学习专题，并确认本人已满18岁及群规');
  if(checkPlatformMute(me))fail('当前账号暂不能创建学习群',403);
  const old=db().prepare('SELECT group_id,topic FROM study_group_governance WHERE owner_id=? AND request_id=?').get(me,requestId);
  if(old){const g=group(old.group_id,me);if(g.name!==valid.text||old.topic!==topic)fail('请求内容已改变，请重新确认',409);return {success:true,group:vo(g),duplicated:true};}
  if(db().prepare('SELECT COUNT(*) n FROM study_group_governance WHERE owner_id=? AND created_ms>?').get(me,Date.now()-86400000).n>=3)fail('今日建群已达限额',429);
  const created=db().transaction(()=>{const result=db().prepare('INSERT INTO groups(name,owner_id,owner_name,member_ids) VALUES (?,?,?,?)').run(valid.text,me,userPublicInfo(me)?.nickname||'学友',JSON.stringify([me]));const id=Number(result.lastInsertRowid);db().prepare('INSERT INTO study_group_governance(group_id,topic,request_id,owner_id,created_ms) VALUES (?,?,?,?,?)').run(id,topic,requestId,me,Date.now());db().prepare('INSERT INTO study_group_access(group_id,user_id,after_msg_id,joined_ms,membership_id) VALUES (?,?,0,?,?)').run(id,me,Date.now(),crypto.randomUUID());return id;})();
  let review={status:'pending',reason:'等待内容审核'};try{review=await moderateResourceComment(valid.text+'\n学习专题：'+topic,{userId:me,moderationVersion:req.body?.moderationVersion});}catch{}
  const status=['active','pending','rejected'].includes(review?.status)?review.status:'pending';db().prepare('UPDATE study_group_governance SET status=?,review_reason=? WHERE group_id=?').run(status,String(review?.reason||'').slice(0,500),created);
  return {success:true,group:vo(group(created,me)),pendingReview:status==='pending'};
 }));
 router.get('/invitations',handle((req,me)=>({success:true,invitations:db().prepare("SELECT i.id,i.group_id,i.inviter_id,i.expires_ms,g.name FROM study_group_invitations i JOIN groups g ON g.id=i.group_id JOIN study_group_governance v ON v.group_id=g.id AND v.status='active' WHERE i.target_id=? AND i.state='pending' AND i.expires_ms>? ORDER BY i.created_ms DESC LIMIT 50").all(me,Date.now()).flatMap(i=>{try{group(i.group_id,i.inviter_id,true);friends(i.inviter_id,me);return [{id:i.id,groupId:String(i.group_id),name:i.name,inviterName:userPublicInfo(i.inviter_id)?.nickname||'学友',expiresAt:i.expires_ms}];}catch{return [];}})})));
 router.post('/invitations/:invitationId/:action',handle((req,me)=>{
  const invite=db().prepare('SELECT * FROM study_group_invitations WHERE id=? AND target_id=?').get(req.params.invitationId,me),action=req.params.action;
  if(!invite||!['accept','reject'].includes(action))fail('邀请不存在',404);
  if(action==='reject'){db().prepare("UPDATE study_group_invitations SET state='rejected',responded_ms=? WHERE id=? AND state='pending'").run(Date.now(),invite.id);return {success:true};}
  if(invite.state==='accepted'){group(invite.group_id,me,true);return {success:true,groupId:String(invite.group_id),duplicated:true};}
  if(invite.state!=='pending'||invite.expires_ms<=Date.now())fail('邀请已过期或已处理',410);
  if(req.body?.adultConsent!==true||req.body?.joinConsent!==true)fail('请确认本人已满18岁，并同意加入此群及文字交流规则');
  const g=group(invite.group_id,invite.inviter_id,true);if(!manager(g,invite.inviter_id))fail('邀请人已失去管理权限',410);friends(invite.inviter_id,me);
  if(db().prepare("SELECT COUNT(*) n FROM study_group_invitations WHERE target_id=? AND state='accepted' AND responded_ms>?").get(me,Date.now()-86400000).n>=20)fail('入群操作过于频繁',429);
  db().transaction(()=>{const current=group(g.id,invite.inviter_id,true),members=ids(current);if(!members.includes(me)){if(members.length>=50)fail('此群已达50人上限',409);members.push(me);db().prepare('UPDATE groups SET member_ids=? WHERE id=?').run(JSON.stringify(members),g.id);const floor=db().prepare('SELECT COALESCE(MAX(id),0) id FROM chat_messages WHERE conversation_id=?').get('group:'+g.id).id;db().prepare('INSERT OR REPLACE INTO study_group_access(group_id,user_id,after_msg_id,joined_ms,membership_id) VALUES (?,?,?,?,?)').run(g.id,me,floor,Date.now(),crypto.randomUUID());}db().prepare("UPDATE study_group_invitations SET state='accepted',responded_ms=? WHERE id=? AND state='pending'").run(Date.now(),invite.id);})();
  return {success:true,groupId:String(g.id)};
 }));
 router.post('/:id/join',handle((req,me)=>{group(req.params.id,me);return {success:true,group:vo(group(req.params.id,me))};}));
 router.post('/:id/invite',handle((req,me)=>{
  const g=group(req.params.id,me,true);if(!manager(g,me))fail('仅群主或管理员可邀请',403);if(checkPlatformMute(me))fail('当前账号暂不可邀请',403);
  const peers=req.body?.userIds;if(!Array.isArray(peers)||!peers.length||peers.length>10||new Set(peers).size!==peers.length||peers.some(p=>typeof p!=='string'||!p||p.length>80))fail('每次请选择1至10位好友');
  if(ids(g).length>=50)fail('此群已达50人上限',409);for(const peer of peers)friends(me,peer);
  if(db().prepare('SELECT COUNT(*) n FROM study_group_invitations WHERE inviter_id=? AND created_ms>?').get(me,Date.now()-86400000).n+peers.length>30)fail('今日邀请已达限额',429);
  const invited=[];db().transaction(()=>{for(const peer of peers){if(ids(g).includes(peer))continue;const existing=db().prepare("SELECT id FROM study_group_invitations WHERE group_id=? AND target_id=? AND state='pending' AND expires_ms>?").get(g.id,peer,Date.now());if(!existing)db().prepare('INSERT INTO study_group_invitations(id,group_id,inviter_id,target_id,created_ms,expires_ms) VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(),g.id,me,peer,Date.now(),Date.now()+7*86400000);invited.push(peer);}})();
  return {success:true,invited,added:[],message:'邀请已发出，对方确认前不会加入群'};
 }));
 router.post('/:id/update',handle(async(req,me)=>{
  const g=group(req.params.id,me,true);if(!manager(g,me))fail('只有群主或管理员可以修改群资料',403);
  if(checkPlatformMute(me))fail('当前账号暂不可修改群资料',403);
  const name=req.body?.name===undefined?g.name:req.body.name,announcement=req.body?.announcement===undefined?g.announcement:req.body.announcement;
  const validName=validateStudyText(name),validNotice=announcement===''?{ok:true,text:''}:validateStudyText(announcement);
  if(!validName.ok||Array.from(validName.text).length>30||!validNotice.ok)fail('群名限30字、公告限500字，并仅支持文字');
  let review={status:'pending',reason:'等待内容审核'};try{review=await moderateResourceComment(validName.text+'\n'+validNotice.text,{userId:me,moderationVersion:req.body?.moderationVersion});}catch{}
  const status=['active','pending','rejected'].includes(review?.status)?review.status:'pending';group(g.id,me,true);
  db().transaction(()=>{db().prepare('INSERT OR REPLACE INTO study_group_edits VALUES (?,?,?,?,?,?)').run(g.id,validName.text,validNotice.text,status,String(review?.reason||'').slice(0,500),Date.now());if(status==='active')db().prepare('UPDATE groups SET name=?,announcement=? WHERE id=?').run(validName.text,validNotice.text,g.id);})();
  return {success:true,pendingReview:status==='pending',rejected:status==='rejected',group:vo(group(g.id,me)),message:status==='active'?'群资料已更新':status==='pending'?'资料已提交审核，审核前继续展示原资料':'资料未通过审核，原资料保留'};
 }));
 function floor(g,me){return db().prepare('SELECT after_msg_id FROM study_group_access WHERE group_id=? AND user_id=?').get(g.id,me)?.after_msg_id||0;}
 router.get('/:id/messages',handle((req,me)=>{
  const g=group(req.params.id,me),after=Number(req.query.afterId)||0,before=Number(req.query.beforeId)||Number.MAX_SAFE_INTEGER;if(!Number.isSafeInteger(after)||after<0||!Number.isSafeInteger(before)||before<=0)fail('分页位置无效');
  const asc=after>0,rows=db().prepare(`SELECT * FROM chat_messages WHERE conversation_id=? AND id>? AND id<? AND (review_status='active' OR sender_id=?) AND NOT EXISTS(SELECT 1 FROM blacklists b WHERE (b.user_id=? AND b.blocked_id=sender_id) OR (b.blocked_id=? AND b.user_id=sender_id)) ORDER BY id ${asc?'ASC':'DESC'} LIMIT 100`).all('group:'+g.id,Math.max(after,floor(g,me)),before,me,me,me);if(!asc)rows.reverse();return {success:true,group:vo(g),messages:rows.map(r=>({id:String(r.id),senderId:r.sender_id,senderName:r.sender_name,content:r.content,type:r.msg_type,createdAt:r.created_at,reviewStatus:r.review_status})),nextBefore:rows.length===100?rows[0].id:undefined};
 }));
 router.post('/:id/messages',handle(async(req,me)=>{
  const g=group(req.params.id,me,true),body=req.body||{},validation=validateStudyText(body.content),cmi=body.clientMsgId;
  if(!validation.ok)fail(validation.error);if(body.type&&body.type!=='text')fail('学习群仅支持文字及另行授权的盘卡，不支持图片');if(!/^[\w-]{16,80}$/.test(cmi||''))fail('发送编号无效，请更新客户端');
  if(checkPlatformMute(me))fail('当前账号暂不可发言',403);const muted=JSON.parse(g.member_mutes||'{}')[me];if(!manager(g,me)&&(g.mute_all||new Date(muted||0).getTime()>Date.now()))fail('当前处于群内禁言状态',403);
  const cid='group:'+g.id,existing=db().prepare('SELECT * FROM chat_messages WHERE conversation_id=? AND client_msg_id=?').get(cid,cmi);
  const toMessage=row=>({id:String(row.id),senderId:row.sender_id,senderName:row.sender_name,content:row.content,type:'text',createdAt:row.created_at,reviewStatus:row.review_status});
  if(existing){if(existing.sender_id!==me||existing.content!==validation.text)fail('发送编号已用于其他内容',409);return {success:true,duplicated:true,pendingReview:existing.review_status==='pending',message:toMessage(existing)};}
  if(db().prepare("SELECT COUNT(*) n FROM chat_messages WHERE conversation_id=? AND sender_id=? AND created_at>datetime('now','localtime','-1 minute')").get(cid,me).n>=10)fail('发送过于频繁',429);
  const nicks=JSON.parse(g.member_nicknames||'{}'),name=nicks[me]||userPublicInfo(me)?.nickname||'学友',insert=db().prepare("INSERT INTO chat_messages(conversation_id,sender_id,sender_name,content,msg_type,client_msg_id,review_status) VALUES (?,?,?,?,'text',?,'pending')").run(cid,me,name,validation.text,cmi);
  let review={status:'pending',reason:'等待审核'};try{review=await moderateResourceComment(validation.text,{userId:me,moderationVersion:req.body?.moderationVersion});}catch{}
  let status=['active','pending','rejected'].includes(review?.status)?review.status:'pending';try{group(g.id,me,true);}catch{status='rejected';}
  db().prepare('UPDATE chat_messages SET review_status=?,review_reason=? WHERE id=?').run(status,String(review?.reason||'').slice(0,500),insert.lastInsertRowid);
  if(status==='active')for(const memberId of ids(group(g.id,me))){upsertUserConversation(db(),memberId,cid,'group','',g.id,Number(insert.lastInsertRowid),memberId===me);if(memberId!==me)notify(memberId,'group_chat',{userId:me,nickname:name},`在「${g.name}」发来消息`,'/groups/chat?id='+g.id);}
  return {success:true,pendingReview:status==='pending',message:toMessage(db().prepare('SELECT * FROM chat_messages WHERE id=?').get(insert.lastInsertRowid))};
 }));
 // Existing role, mute, remove, exit, dissolve and report routes remain the SSOT.
 router.use('/:id/cards',require('./studyGroupCards').createStudyGroupCards({db,group,ids,getUserDb,userPublicInfo,checkPlatformMute,notify}));
 // Closed/legacy groups cannot bypass review via their old update routes.
 router.use((req,res,next)=>{if(/\/(leave|report|dissolve)$/.test(req.path))return next();try{const match=req.path.match(/^\/(\d+)\//);if(match)group(match[1],String(req.user.userId),req.method!=='GET');next();}catch(e){res.status(e.status||503).json({success:false,error:e.message});}});
 return router;
}
module.exports={createGovernedGroupRouter,TOPICS};
