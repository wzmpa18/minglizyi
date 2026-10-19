'use strict';
const express=require('express'),crypto=require('node:crypto');
const {snapshot,revalidate,validChartAnchor}=require('./liveChartPolicy');
const {validateStudyText}=require('./studyCommentPolicy');
function createStudyGroupCards({db,group,ids,getUserDb,userPublicInfo,checkPlatformMute,canSpeak,notify}){
 const router=express.Router({mergeParams:true});let ready=false;
 const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
 function store(){const d=db();if(!ready){d.exec(`CREATE TABLE IF NOT EXISTS study_group_cards(id TEXT PRIMARY KEY,group_id INTEGER NOT NULL,owner_id TEXT NOT NULL,owner_name TEXT NOT NULL,owner_membership TEXT NOT NULL DEFAULT '',snapshots TEXT NOT NULL,recipients TEXT NOT NULL,permissions TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'active',created_ms INTEGER NOT NULL,expires_ms INTEGER NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,UNIQUE(owner_id,request_id));CREATE INDEX IF NOT EXISTS idx_group_cards ON study_group_cards(group_id,created_ms DESC,id DESC);CREATE TABLE IF NOT EXISTS study_group_card_actions(card_id TEXT NOT NULL,user_id TEXT NOT NULL,action TEXT NOT NULL,at_ms INTEGER NOT NULL);`);if(!d.prepare('PRAGMA table_info(study_group_cards)').all().some(c=>c.name==='owner_membership'))d.exec("ALTER TABLE study_group_cards ADD COLUMN owner_membership TEXT NOT NULL DEFAULT ''");ready=true;}return d;}
 const currentStamp=(g,user)=>{const row=store().prepare('SELECT membership_id FROM study_group_access WHERE group_id=? AND user_id=?').get(g.id,user);if(!row?.membership_id)fail('成员归属尚未核验，请重新取得明确入群确认',403);return row.membership_id;};
 function availableUser(id){const user=getUserDb()?.prepare('SELECT status,deleted_at FROM users WHERE user_id=?').get(id);return user&&!user.deleted_at&&user.status!=='banned';}
 function readable(row,me){if(!row||row.state!=='active'||row.expires_ms<=Date.now())fail('盘卡不存在、已到期或已撤销',404);const g=group(row.group_id,me,true);if(!ids(g).includes(row.owner_id)||!availableUser(row.owner_id))fail('分享者已不在群中或账号不可用',410);if(!row.owner_membership||row.owner_membership!==currentStamp(g,row.owner_id))fail('分享者的入群授权已改变，请重新取得本次明确分享',410);if(store().prepare('SELECT 1 FROM blacklists WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)').get(row.owner_id,me,me,row.owner_id))fail('此盘卡不可访问',403);if(me!==row.owner_id&&!JSON.parse(row.recipients).some(r=>r.id===me&&r.membership===currentStamp(g,me)))fail('此盘卡未向你授权；新加入成员不会自动获得旧盘卡',404);return row;}
 function card(req,me){const row=store().prepare('SELECT * FROM study_group_cards WHERE id=? AND group_id=?').get(req.params.cardId,req.params.id);return readable(row,me);}
 function view(row,me){return {id:row.id,groupId:String(row.group_id),ownerName:row.owner_name,mine:row.owner_id===me,charts:JSON.parse(row.snapshots).map(c=>({...revalidate(c),version:c.version})),permissions:JSON.parse(row.permissions),expiresAt:row.expires_ms,newMembersCanView:false};}
 const audit=(row,me,action)=>store().prepare('INSERT INTO study_group_card_actions VALUES (?,?,?,?)').run(row.id,me,action,Date.now());
 const handle=fn=>async(req,res)=>{res.set({'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});try{res.json(await fn(req,String(req.user.userId)));}catch(e){res.status(e.status||503).json({success:false,error:e.status?e.message:'授权盘卡暂不可用，请重试'});}};
 router.get('/',handle((req,me)=>{
  const g=group(req.params.id,me,true);let before=Number.MAX_SAFE_INTEGER,beforeId='~';if(req.query.cursor){try{const cursor=JSON.parse(Buffer.from(String(req.query.cursor),'base64url').toString());if(!Array.isArray(cursor)||cursor.length!==2||!Number.isSafeInteger(cursor[0])||cursor[0]<0||typeof cursor[1]!=='string'||!/^[\w-]{32,40}$/.test(cursor[1]))fail('分页位置无效');[before,beforeId]=cursor;}catch{fail('分页位置无效');}}
  const rows=store().prepare("SELECT * FROM study_group_cards WHERE group_id=? AND state='active' AND expires_ms>? AND (created_ms<? OR (created_ms=? AND id<?)) ORDER BY created_ms DESC,id DESC LIMIT 50").all(g.id,Date.now(),before,before,beforeId),last=rows.at(-1);return {success:true,items:rows.flatMap(row=>{try{readable(row,me);return [{id:row.id,mine:row.owner_id===me,ownerName:row.owner_name,titles:JSON.parse(row.snapshots).map(c=>c.title),expiresAt:row.expires_ms}];}catch{return [];}}),nextCursor:rows.length===50?Buffer.from(JSON.stringify([last.created_ms,last.id])).toString('base64url'):undefined};
 }));
 function position(req){let before=Number.MAX_SAFE_INTEGER,beforeId='~';if(req.query.cursor){try{const cursor=JSON.parse(Buffer.from(String(req.query.cursor),'base64url').toString());if(!Array.isArray(cursor)||cursor.length!==2||!Number.isSafeInteger(cursor[0])||cursor[0]<0||typeof cursor[1]!=='string'||!/^[\w-]{32,40}$/.test(cursor[1]))fail('分页位置无效');[before,beforeId]=cursor;}catch{fail('分页位置无效');}}return [before,beforeId];}
 router.get('/mine',handle((req,me)=>{
  if(!/^\d{1,16}$/.test(String(req.params.id)))fail('学习群编号无效');const [before,beforeId]=position(req),rows=store().prepare('SELECT * FROM study_group_cards WHERE group_id=? AND owner_id=? AND (created_ms<? OR (created_ms=? AND id<?)) ORDER BY created_ms DESC,id DESC LIMIT 50').all(req.params.id,me,before,before,beforeId),last=rows.at(-1);
  return {success:true,items:rows.map(r=>({id:r.id,mine:true,ownerName:r.owner_name,titles:JSON.parse(r.snapshots).map(c=>c.title),expiresAt:r.expires_ms,state:r.state==='active'&&r.expires_ms<=Date.now()?'expired':r.state})),nextCursor:rows.length===50?Buffer.from(JSON.stringify([last.created_ms,last.id])).toString('base64url'):undefined};
 }));
 router.post('/revoke',handle((req,me)=>{
  const ids=req.body?.ids;if(!Array.isArray(ids)||!ids.length||ids.length>50||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!/^[\w-]{32,40}$/.test(id)))fail('请明确选择1至50张本人分享的盘卡');
  const rows=ids.map(id=>store().prepare('SELECT id,owner_id,state FROM study_group_cards WHERE id=? AND group_id=?').get(id,req.params.id));if(rows.some(r=>!r||r.owner_id!==me))fail('所选盘卡包含无权撤销的项目，本次未作任何更改',403);
  let changed=0;store().transaction(()=>{for(const row of rows)if(row.state!=='revoked'){changed+=store().prepare("UPDATE study_group_cards SET state='revoked' WHERE id=? AND state!='revoked'").run(row.id).changes;audit(row,me,'REVOKE');}})();
  return {success:true,changed,message:'所选盘卡已停止后续访问；已获准另存的副本和截图无法远程收回'};
 }));
 function resolveReferences(groupId,me,refs){
  if(!Array.isArray(refs)||refs.length>4)fail('每条交流最多引用4个盘内位置');
  const seen=new Set();return refs.map(ref=>{if(!ref||typeof ref!=='object'||Object.keys(ref).some(k=>!['cardId','version','anchor'].includes(k))||typeof ref.cardId!=='string'||typeof ref.version!=='string')fail('盘面引用无效');
   const row=readable(store().prepare('SELECT * FROM study_group_cards WHERE id=? AND group_id=?').get(ref.cardId,groupId),me),chart=JSON.parse(row.snapshots).find(c=>c.version===ref.version);
   if(!chart||!validChartAnchor(chart,ref.anchor))fail('所选盘版本或位置无效');const key=ref.cardId+':'+ref.version+':'+ref.anchor;if(seen.has(key))fail('请勿重复引用同一位置');seen.add(key);return {cardId:row.id,version:chart.version,anchor:ref.anchor};
  });
 }
 function visibleReferences(groupId,me,value){
  let refs;try{refs=JSON.parse(value||'[]');if(!Array.isArray(refs)||refs.length>4)throw Error();}catch{return {chartRefs:[],hasUnavailableReferences:true};}
  const visible=refs.flatMap(ref=>{try{resolveReferences(groupId,me,[ref]);const row=store().prepare('SELECT snapshots FROM study_group_cards WHERE id=?').get(ref.cardId),chart=JSON.parse(row.snapshots).find(c=>c.version===ref.version);return [{...ref,title:chart.title}];}catch{return [];}});
  return {chartRefs:visible,hasUnavailableReferences:visible.length!==refs.length};
 }
 router.resolveReferences=resolveReferences;router.visibleReferences=visibleReferences;
 router.post('/',handle((req,me)=>{
  const g=group(req.params.id,me,true),body=req.body||{},ownerMembership=currentStamp(g,me);if(checkPlatformMute(me))fail('当前账号暂不可分享',403);if(typeof canSpeak!=='function'||!canSpeak(g,me))fail('当前处于群内禁言状态，暂不可发送盘卡',403);
  if(body.inferenceConsent!==true||body.rightsConsent!==true||body.newMembersCanView!==false||!/^[\w-]{16,80}$/.test(body.requestId||''))fail('请确认分享权限、推断风险和仅限当前所选成员');
  const peers=body.recipientIds;if(!Array.isArray(peers)||peers.length<1||peers.length>49||new Set(peers).size!==peers.length||peers.some(p=>typeof p!=='string'||p===me||!ids(g).includes(p)||!availableUser(p)))fail('请选择当前群内1至49位接收成员');
  const recipients=peers.map(id=>{if(store().prepare('SELECT 1 FROM blacklists WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)').get(me,id,id,me))fail('所选成员中有已屏蔽的交流关系',403);return {id,membership:currentStamp(g,id)};}).sort((a,b)=>a.id.localeCompare(b.id));
  if(!Array.isArray(body.charts)||body.charts.length<1||body.charts.length>4)fail('请选择1至4张完整盘面');
  const copies=body.charts.map(c=>({...snapshot(c.toolKey,c.result,{showPillars:c.showPillars,visiblePillars:c.visiblePillars}),version:crypto.randomUUID()}));if(Buffer.byteLength(JSON.stringify(copies))>500000)fail('所选盘面超过500KB，请减少盘数');
  const permissions={view:true,archive:body.permissions?.archive===true,export:body.permissions?.export===true,reshare:false,externalAI:false},days=Number(body.days??7);if(!Number.isInteger(days)||days<1||days>30)fail('有效期为1至30天');
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify({group:g.id,ownerMembership,recipients,permissions,days,charts:copies.map(({version,...copy})=>copy)})).digest('hex'),old=store().prepare('SELECT * FROM study_group_cards WHERE owner_id=? AND request_id=?').get(me,body.requestId);
  if(old){if(old.fingerprint!==fingerprint)fail('分享内容或成员已改变，请重新预览',409);return {success:true,id:old.id,duplicated:true};}
  if(store().prepare('SELECT COUNT(*) n FROM study_group_cards WHERE owner_id=? AND created_ms>?').get(me,Date.now()-86400000).n>=10)fail('今日群盘卡分享已达限额',429);
  const id=crypto.randomUUID(),now=Date.now();store().prepare('INSERT INTO study_group_cards(id,group_id,owner_id,owner_name,owner_membership,snapshots,recipients,permissions,created_ms,expires_ms,request_id,fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(id,g.id,me,userPublicInfo(me)?.nickname||'学友',ownerMembership,JSON.stringify(copies),JSON.stringify(recipients),JSON.stringify(permissions),now,now+days*86400000,body.requestId,fingerprint);audit({id},me,'CREATE_CURRENT_MEMBER_COPY');for(const peer of peers)notify(peer,'group_chart',{userId:me,nickname:userPublicInfo(me)?.nickname||'学友'},'在学习群中分享了授权盘卡',`/groups/cards/?group=${g.id}&card=${id}`);return {success:true,id};
 }));
 router.get('/:cardId',handle((req,me)=>({success:true,...view(card(req,me),me)})));
 for(const action of ['archive','export'])router.get('/:cardId/'+action,handle((req,me)=>{const row=card(req,me);if(row.owner_id!==me&&JSON.parse(row.permissions)[action]!==true)fail(action==='archive'?'此盘卡未授权留档':'此盘卡未授权导出',403);audit(row,me,action.toUpperCase());return {success:true,...view(row,me)};}));
 router.post('/:cardId/revoke',handle((req,me)=>{const row=store().prepare('SELECT * FROM study_group_cards WHERE id=? AND group_id=? AND owner_id=?').get(req.params.cardId,req.params.id,me);if(!row)fail('盘卡不存在或无权撤销',404);store().prepare("UPDATE study_group_cards SET state='revoked' WHERE id=?").run(row.id);audit(row,me,'REVOKE');return {success:true,message:'已停止后续访问，不能收回已获准另存的副本或截图'};}));
 router.post('/:cardId/report',handle((req,me)=>{const row=card(req,me),reason=validateStudyText(req.body?.reason);if(!reason.ok)fail(reason.error);if(!store().prepare("SELECT 1 FROM reports WHERE target_type='group_card' AND target_id=? AND reporter_id=?").get(row.id,me))store().prepare('INSERT INTO reports(target_type,target_id,reporter_id,reporter_name,reason) VALUES (?,?,?,?,?)').run('group_card',row.id,me,userPublicInfo(me)?.nickname||'学友',reason.text);store().prepare("UPDATE study_group_cards SET state='held' WHERE id=?").run(row.id);audit(row,me,'REPORT_QUARANTINE');return {success:true};}));
 return router;
}
module.exports={createStudyGroupCards};
