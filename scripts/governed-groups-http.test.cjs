'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express'),Database=require('better-sqlite3'),crypto=require('node:crypto');
const {createGovernedGroupRouter}=require('../backend_deploy/governedGroupRoutes');
const {createSelectedTextModerator}=require('../backend_deploy/socialModerationPolicy');
const {VERSION}=require('../backend_deploy/studyModerationAutomation');
async function fixture(run){
 const db=new Database(':memory:');db.exec(`CREATE TABLE groups(id INTEGER PRIMARY KEY,name TEXT,owner_id TEXT,owner_name TEXT,member_ids TEXT,announcement TEXT DEFAULT '',admins TEXT DEFAULT '[]',member_mutes TEXT DEFAULT '{}',member_nicknames TEXT DEFAULT '{}',mute_all INTEGER DEFAULT 0,status TEXT DEFAULT 'active',created_at TEXT DEFAULT CURRENT_TIMESTAMP);CREATE TABLE users(user_id TEXT PRIMARY KEY,status TEXT DEFAULT 'active',deleted_at TEXT);INSERT INTO users(user_id) VALUES('1'),('2'),('3'),('4');CREATE TABLE friendships(user_a TEXT,user_b TEXT);INSERT INTO friendships VALUES('1','2'),('1','3'),('2','3');CREATE TABLE blacklists(user_id TEXT,blocked_id TEXT);CREATE TABLE chat_messages(id INTEGER PRIMARY KEY,conversation_id TEXT,sender_id TEXT,sender_name TEXT,content TEXT,msg_type TEXT,client_msg_id TEXT,review_status TEXT,review_reason TEXT,created_at TEXT DEFAULT(datetime('now','localtime')),UNIQUE(conversation_id,client_msg_id));`);
 db.exec('CREATE TABLE reports(id INTEGER PRIMARY KEY,target_type TEXT,target_id TEXT,reporter_id TEXT,reporter_name TEXT,reason TEXT)');
 let review='active',muted=false;const delivered=[];
 const app=express();app.use(express.json());app.use('/groups',createGovernedGroupRouter({getDb:()=>db,getUserDb:()=>db,authRequired:(req,res,next)=>{if(!/^[1-4]$/.test(req.headers['x-test-account']||''))return res.status(401).json({success:false});req.user={userId:req.headers['x-test-account']};next();},userPublicInfo:id=>({nickname:'合成学友'+id}),checkPlatformMute:()=>muted,moderateResourceComment:createSelectedTextModerator({screen:async input=>{if(review==='offline')throw Error('offline');return {decision:review==='active'?'PASS':review==='rejected'?'BLOCK':'REVIEW',automatic:review==='active',flags:[],policyVersion:VERSION,fingerprint:crypto.createHash('sha256').update(input.content).digest('hex')};},audit:async()=>{}}),upsertUserConversation:(_db,member,conv)=>delivered.push([member,conv]),notify:()=>{}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port+'/groups';
 const call=async(user,path='',method='GET',body)=>{const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(user?{'x-test-account':String(user)}:{})},body:body===undefined?undefined:JSON.stringify({...body,moderationVersion:body?.moderationVersion===null?null:VERSION})});return {status:response.status,body:await response.json()};};
 const create=async()=>{const input={name:'历法共读',topic:'calendar',adultConsent:true,requestId:crypto.randomUUID()};return {input,result:await call(1,'','POST',input)};};
 const invite=async(id,target='2')=>{assert.equal((await call(1,`/${id}/invite`,'POST',{userIds:[target]})).status,200);return (await call(target,'/invitations')).body.invitations[0].id;};
 const accept=async(user,id)=>call(user,`/invitations/${id}/accept`,'POST',{adultConsent:true,joinConsent:true});
 try{await run({db,call,create,invite,accept,review:value=>{review=value;},mute:value=>{muted=value;},delivered});}finally{await new Promise(resolve=>server.close(resolve));db.close();}
}
test('group invitation does not add a member; explicit adult acceptance, friendship, expiry, rejection and current-member history floor are enforced',()=>fixture(async({db,call,create,invite,accept})=>{
 assert.equal((await call(null)).status,401);assert.equal((await call(1,'','POST',{name:'未同意'})).status,400);
 const {input,result}=await create(),id=result.body.group.id;assert.equal(result.status,200);assert.equal((await call(1,'','POST',input)).body.duplicated,true);assert.equal((await call(1,'','POST',{...input,name:'修改内容'})).status,409);
 const before=await call(1,`/${id}/messages`,'POST',{content:'入群之前的文字',clientMsgId:crypto.randomUUID()});assert.equal(before.status,200);
 const invitation=await invite(id);assert.deepEqual(JSON.parse(db.prepare('SELECT member_ids FROM groups').get().member_ids),['1']);assert.equal((await call(2,`/${id}/join`,'POST')).status,404);assert.equal((await call(2,`/invitations/${invitation}/accept`,'POST',{})).status,400);assert.equal((await call(3,`/invitations/${invitation}/accept`,'POST',{})).status,404);
 assert.equal((await accept(2,invitation)).body.success,true);assert.equal((await accept(2,invitation)).body.duplicated,true);assert.deepEqual((await call(2,`/${id}/messages`)).body.messages,[]);
 assert.equal((await call(2,`/${id}/invite`,'POST',{userIds:['3']})).status,403);assert.equal((await call(1,`/${id}/invite`,'POST',{userIds:['4']})).status,403);
 const third=await invite(id,'3');db.prepare('UPDATE study_group_invitations SET expires_ms=0 WHERE id=?').run(third);assert.equal((await accept(3,third)).status,410);
 const fresh=await invite(id,'3');assert.equal((await call(3,`/invitations/${fresh}/reject`,'POST')).body.success,true);assert.equal((await accept(3,fresh)).status,410);
}));
test('group text uses 500 visible characters, immutable retry IDs and fail-closed review; pending/rejected text does not reach peers',()=>fixture(async({db,call,create,invite,accept,review,delivered,mute})=>{
 const id=(await create()).result.body.group.id;await accept(2,await invite(id));
 const body={content:'🙂'.repeat(500),clientMsgId:crypto.randomUUID()};assert.equal((await call(1,`/${id}/messages`,'POST',body)).status,200);assert.equal((await call(1,`/${id}/messages`,'POST',body)).body.duplicated,true);assert.equal((await call(2,`/${id}/messages`,'POST',body)).status,409);assert.equal((await call(1,`/${id}/messages`,'POST',{...body,content:'改变内容'})).status,409);assert.equal((await call(1,`/${id}/messages`,'POST',{content:'🙂'.repeat(501),clientMsgId:crypto.randomUUID()})).status,400);assert.equal((await call(1,`/${id}/messages`,'POST',{content:'图片',type:'image',clientMsgId:crypto.randomUUID()})).status,400);
 const count=delivered.length;review('offline');const pending=await call(1,`/${id}/messages`,'POST',{content:'等待审核的学习内容',clientMsgId:crypto.randomUUID()});assert.equal(pending.body.pendingReview,true);assert.equal(delivered.length,count);assert.equal((await call(2,`/${id}/messages`)).body.messages.length,1);assert.equal((await call(1,`/${id}/messages`)).body.messages.length,2);
 db.prepare("UPDATE chat_messages SET review_status='active' WHERE id=?").run(pending.body.message.id);assert.equal((await call(2,`/${id}/messages`)).body.messages.length,2);
 review('rejected');assert.equal((await call(1,`/${id}/messages`,'POST',{content:'审核拒绝的合成内容',clientMsgId:crypto.randomUUID()})).body.message.reviewStatus,'rejected');assert.equal((await call(2,`/${id}/messages`)).body.messages.length,2);
 mute(true);assert.equal((await call(1,`/${id}/messages`,'POST',{content:'平台禁言也约束群主',clientMsgId:crypto.randomUUID()})).status,403);
}));
test('unavailable review holds group creation and profile edits; closed groups, blocks and revoked management prevent access',()=>fixture(async({db,call,create,review,invite,accept})=>{
 review('offline');const pending=(await create()).result.body.group;assert.equal(pending.reviewStatus,'pending');assert.equal((await call(1,`/${pending.id}/invite`,'POST',{userIds:['2']})).status,403);
 review('active');const id=(await create()).result.body.group.id;const invitation=await invite(id);db.prepare('INSERT INTO blacklists VALUES (?,?)').run('1','2');assert.equal((await call(2,'/invitations')).body.invitations.length,0);assert.equal((await accept(2,invitation)).status,403);db.prepare('DELETE FROM blacklists').run();await accept(2,invitation);
 review('offline');assert.equal((await call(1,`/${id}/update`,'POST',{name:'修改后群名',announcement:'合成待审公告'})).body.pendingReview,true);assert.equal(db.prepare('SELECT name FROM groups WHERE id=?').get(id).name,'历法共读');assert.equal(db.prepare('SELECT name FROM study_group_edits WHERE group_id=?').get(id).name,'修改后群名');
 db.prepare("UPDATE groups SET status='closed' WHERE id=?").run(id);assert.equal((await call(2,`/${id}/messages`)).status,403);
}));
test('member cap is checked at acceptance; older own groups and messages remain reachable through keyset pages',()=>fixture(async({db,call,create,invite,accept})=>{
 const id=(await create()).result.body.group.id,invitation=await invite(id);db.prepare('UPDATE groups SET member_ids=? WHERE id=?').run(JSON.stringify(['1',...Array.from({length:49},(_,i)=>'extra'+i)]),id);assert.equal((await accept(2,invitation)).status,409);db.prepare('UPDATE groups SET member_ids=? WHERE id=?').run('["1"]',id);await accept(2,invitation);
 const insert=db.prepare("INSERT INTO chat_messages(conversation_id,sender_id,sender_name,content,msg_type,client_msg_id,review_status) VALUES (?,'1','合成学友','分页文字','text',?,'active')");for(let i=0;i<105;i++)insert.run('group:'+id,crypto.randomUUID());const latest=(await call(2,`/${id}/messages`)).body;assert.equal(latest.messages.length,100);const older=(await call(2,`/${id}/messages?beforeId=${latest.nextBefore}`)).body;assert.equal(older.messages.length,5);assert.equal(new Set([...latest.messages,...older.messages].map(m=>m.id)).size,105);
 for(let i=0;i<101;i++)db.prepare('INSERT INTO groups(name,owner_id,owner_name,member_ids) VALUES (?,?,?,?)').run('其他群','3','其他','["3"]');assert.equal((await call(1)).body.groups[0].id,id);
}));
test('group chart cards bind a fixed recipient list and membership nonce; no new-member or rejoin grant, no raw private input, separate archive/export/revoke',()=>fixture(async({db,call,create,invite,accept})=>{
 const group=(await create()).result.body.group.id;await accept(2,await invite(group));
 const body={requestId:crypto.randomUUID(),recipientIds:['2'],newMembersCanView:false,inferenceConsent:true,rightsConsent:true,permissions:{archive:true,export:false,reshare:true},days:7,charts:[{toolKey:'ziwei',result:{name:'PRIVATE_RAW_NAME',birthDate:'PRIVATE_BIRTH',health:{hospital:'PRIVATE_HOSPITAL'},palaces:Array.from({length:12},(_,index)=>({index,name:'命宫',majorStars:['紫微'],otherStars:['孤辰'],ageRange:[1,10]}))}}]};
 const made=await call(1,`/${group}/cards`,'POST',body);assert.equal(made.status,200);const id=made.body.id;assert.ok(id);assert.equal((await call(1,`/${group}/cards`,'POST',body)).body.duplicated,true);assert.ok(!JSON.stringify(db.prepare('SELECT * FROM study_group_cards').all()).includes('PRIVATE_'));
 assert.equal((await call(2,`/${group}/cards/${id}`)).body.newMembersCanView,false);assert.equal((await call(2,`/${group}/cards/${id}`)).body.permissions.reshare,false);assert.equal((await call(2,`/${group}/cards/${id}/archive`)).status,200);assert.equal((await call(2,`/${group}/cards/${id}/export`)).status,403);
 await accept(3,await invite(group,'3'));assert.equal((await call(3,`/${group}/cards`)).body.items.length,0);assert.equal((await call(3,`/${group}/cards/${id}`)).status,404);assert.equal((await call(1,`/${group}/cards`,'POST',{...body,recipientIds:['2','3']})).status,409);
 assert.equal((await call(2,`/${group}/cards/${id}/report`,'POST',{reason:'合成举报内容'})).status,200);assert.equal(db.prepare("SELECT COUNT(*) n FROM reports WHERE target_type='group_card'").get().n,1);assert.equal((await call(2,`/${group}/cards/${id}`)).status,404);assert.equal((await call(1,`/${group}/cards/${id}/archive`)).status,404);assert.equal((await call(2,`/${group}/cards/${id}/revoke`,'POST')).status,404);
 const oldNonce=db.prepare('SELECT membership_id FROM study_group_access WHERE group_id=? AND user_id=?').get(group,'2').membership_id;db.prepare('UPDATE groups SET member_ids=? WHERE id=?').run('["1","3"]',group);assert.equal((await call(2,`/${group}/cards/${id}`)).status,404);await accept(2,await invite(group));assert.notEqual(db.prepare('SELECT membership_id FROM study_group_access WHERE group_id=? AND user_id=?').get(group,'2').membership_id,oldNonce);assert.equal((await call(2,`/${group}/cards/${id}`)).status,404);
 const fresh=(await call(1,`/${group}/cards`,'POST',{...body,requestId:crypto.randomUUID(),recipientIds:['2','3'],permissions:{export:true}})).body.id;assert.equal((await call(3,`/${group}/cards/${fresh}/export`)).status,200);assert.equal((await call(3,`/${group}/cards/${fresh}/archive`)).status,403);db.prepare('UPDATE study_group_cards SET expires_ms=0 WHERE id=?').run(fresh);assert.equal((await call(3,`/${group}/cards/${fresh}`)).status,404);
 db.prepare("UPDATE groups SET status='closed' WHERE id=?").run(group);assert.equal((await call(1,`/${group}/cards/${id}/revoke`,'POST')).body.success,true);assert.equal(db.prepare('SELECT state FROM study_group_cards WHERE id=?').get(id).state,'revoked');
}));

test('an older unconsented client cannot auto-open a group or invite peers',()=>fixture(async({call})=>{const made=await call(1,'','POST',{name:'无授权合成学习群',topic:'classics',adultConsent:true,requestId:crypto.randomUUID(),moderationVersion:null});assert.equal(made.body.group.reviewStatus,'pending');assert.equal((await call(1,`/${made.body.group.id}/invite`,'POST',{userIds:['2']})).status,403);}));


test('owner departure/rejoin never restores an old card grant, including idempotent retries; a new explicit share is required',()=>fixture(async({db,call,create,invite,accept})=>{
 const made=await create(),group=made.result.body.group.id;await accept(2,await invite(group));await accept(3,await invite(group,'3'));
 const body={requestId:crypto.randomUUID(),recipientIds:['2'],newMembersCanView:false,inferenceConsent:true,rightsConsent:true,permissions:{archive:true},charts:[{toolKey:'bazi',result:{pillars:[{gan:'甲',zhi:'子'},{gan:'乙',zhi:'丑'},{gan:'丙',zhi:'寅'},{gan:'丁',zhi:'卯'}]},showPillars:true}]};
 const id=(await call(1,`/${group}/cards`,'POST',body)).body.id;assert.ok(id);assert.equal((await call(2,`/${group}/cards/${id}`)).status,200);
 const old=db.prepare('SELECT owner_membership FROM study_group_cards WHERE id=?').get(id).owner_membership;
 db.prepare("UPDATE groups SET owner_id='3',member_ids='[\"2\",\"3\"]' WHERE id=?").run(group);
 assert.equal((await call(2,`/${group}/cards/${id}`)).status,410);
 assert.equal((await call(3,`/${group}/invite`,'POST',{userIds:['1']})).status,200);const invitation=(await call(1,'/invitations')).body.invitations[0].id;assert.equal((await accept(1,invitation)).body.success,true);
 const current=db.prepare('SELECT membership_id FROM study_group_access WHERE group_id=? AND user_id=?').get(group,'1').membership_id;assert.notEqual(current,old);
 assert.equal((await call(2,`/${group}/cards/${id}`)).status,410);assert.equal((await call(1,`/${group}/cards/${id}/archive`)).status,410);
 assert.equal((await call(1,`/${group}/cards`,'POST',body)).status,409);
 const fresh=(await call(1,`/${group}/cards`,'POST',{...body,requestId:crypto.randomUUID()})).body.id;assert.ok(fresh);assert.equal((await call(2,`/${group}/cards/${fresh}`)).status,200);
 // An older, unstamped row is held rather than guessed into authorization.
 db.prepare("UPDATE study_group_cards SET owner_membership='' WHERE id=?").run(fresh);assert.equal((await call(2,`/${group}/cards/${fresh}`)).status,410);
}));

test('group mute also blocks chart-card notifications, while existing reads and owner revocation remain available',()=>fixture(async({db,call,create,invite,accept})=>{
 const group=(await create()).result.body.group.id;await accept(2,await invite(group));
 const body={requestId:crypto.randomUUID(),recipientIds:['1'],newMembersCanView:false,inferenceConsent:true,rightsConsent:true,permissions:{},charts:[{toolKey:'xiaoliuren',result:{monthStop:1,dayStop:2,hourStop:3,finalPosition:'速喜',steps:[]}}]};
 const own=(await call(2,`/${group}/cards`,'POST',body)).body.id;assert.ok(own);
 db.prepare('UPDATE groups SET member_mutes=? WHERE id=?').run(JSON.stringify({'2':new Date(Date.now()+60000).toISOString()}),group);
 assert.equal((await call(2,`/${group}/cards`,'POST',{...body,requestId:crypto.randomUUID()})).status,403);assert.equal((await call(1,`/${group}/cards/${own}`)).status,200);
 assert.equal((await call(2,`/${group}/cards/${own}/revoke`,'POST')).body.success,true);
 db.prepare("UPDATE groups SET member_mutes='{}',mute_all=1 WHERE id=?").run(group);
 assert.equal((await call(2,`/${group}/cards`,'POST',{...body,requestId:crypto.randomUUID()})).status,403);
 assert.equal((await call(1,`/${group}/cards`,'POST',{...body,recipientIds:['2'],requestId:crypto.randomUUID()})).status,200);
}));
