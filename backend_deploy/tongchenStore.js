'use strict';
const crypto=require('node:crypto');
const {validateStudyText}=require('./studyCommentPolicy');
const {CALENDAR_RULE_VERSION:RULE,civilTimeEpoch,createCalendarRules}=require('./calendarRules');
const MODES=['solar-md','lunar-md','date','hour','pillars'];
const INTERESTS=['古籍','八字','紫微','六壬','奇门','历法','天文','中医'];
function createTongchenStore(db,{Solar,key,userInfo,now=()=>Date.now()}){
 const rules=createCalendarRules(Solar);
 const fail=(message,status=400)=>{const error=new Error(message);error.status=status;throw error;};
 db.exec(`CREATE TABLE IF NOT EXISTS tongchen_profiles(user_id TEXT PRIMARY KEY,public_id TEXT UNIQUE NOT NULL,tokens TEXT NOT NULL,modes TEXT NOT NULL,interests TEXT NOT NULL,rule_version TEXT NOT NULL,accept_requests INTEGER NOT NULL,consent_version TEXT NOT NULL,joined_ms INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS tongchen_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS tongchen_limits(user_id TEXT,kind TEXT,at_ms INTEGER);
 CREATE INDEX IF NOT EXISTS tongchen_rate ON tongchen_limits(user_id,kind,at_ms);
 INSERT OR IGNORE INTO tongchen_settings VALUES ('enabled','false');
 INSERT OR IGNORE INTO tongchen_settings VALUES ('name','同辰雅集');`);
 // Reuse the established relationship database. No second friends/messages store.
 for(const table of ['friend_requests','friendships'])if(!db.prepare(`PRAGMA table_info(${table})`).all().some(r=>r.name==='source'))db.exec(`ALTER TABLE ${table} ADD COLUMN source TEXT NOT NULL DEFAULT 'legacy'`);
 const settings=()=>Object.fromEntries(db.prepare('SELECT key,value FROM tongchen_settings').all().map(r=>[r.key,r.value]));
 const config=()=>{const s=settings();return {enabled:s.enabled==='true',name:s.name||'同辰雅集',consentVersion:'tongchen-20261019-v1',ruleVersion:RULE,searchPerDay:Number(s.searchPerDay)||30,requestsPerDay:Number(s.requestsPerDay)||5,interests:INTERESTS};};
 const limit=(me,kind,daily,minute=6)=>{
  const stamp=now(),day=Math.floor(stamp/86400000)*86400000;
  if(db.prepare('SELECT COUNT(*) n FROM tongchen_limits WHERE user_id=? AND kind=? AND at_ms>=?').get(me,kind,day).n>=daily||db.prepare('SELECT COUNT(*) n FROM tongchen_limits WHERE user_id=? AND kind=? AND at_ms>?').get(me,kind,stamp-60000).n>=minute)fail('请求过于频繁，请稍后再试',429);
  db.prepare('INSERT INTO tongchen_limits VALUES (?,?,?)').run(me,kind,stamp);
  db.prepare('DELETE FROM tongchen_limits WHERE at_ms<?').run(day-86400000);
 };
 const hash=(kind,value)=>crypto.createHmac('sha256',key).update(`${RULE}\0${kind}\0${value}`).digest('hex');
 const profile=me=>db.prepare('SELECT * FROM tongchen_profiles WHERE user_id=?').get(String(me));
 const available=()=>{if(!config().enabled)fail('同辰雅集暂未开放；退出、删除和举报仍可使用',503);};
 const joined=me=>{available();const p=profile(me);if(!p||p.consent_version!==config().consentVersion)fail('请先阅读告知并主动加入同辰雅集',403);return p;};
 const blocked=(a,b)=>!!db.prepare('SELECT 1 FROM blacklists WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)').get(a,b,b,a);
 const peerFor=(id,me)=>{const p=db.prepare('SELECT * FROM tongchen_profiles WHERE public_id=?').get(String(id));if(!p||p.user_id===String(me)||blocked(String(me),p.user_id)||!userInfo(p.user_id))fail('此学友暂不可交流',404);return p;};
 const card=p=>{const info=userInfo(p.user_id);return info?{id:p.public_id,nickname:info.nickname||'学友',interests:JSON.parse(p.interests),ruleVersion:p.rule_version}:null;};
 function join(me,body){
  available();if(!body||Object.keys(body).some(k=>!['birthDate','hour','minute','timeZone','modes','interests','adultConsent','precisionConsent','consentVersion','acceptRequests'].includes(k)))fail('仅接受本人主动录入的匹配资料');
  if(body.adultConsent!==true||body.precisionConsent!==true||body.consentVersion!==config().consentVersion)fail('须由成年人本人确认用途和精度告知',403);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(body.birthDate||''))fail('出生日期无效');
  const [y,m,d]=body.birthDate.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
  if(y<1900||date.getUTCFullYear()!==y||date.getUTCMonth()+1!==m||date.getUTCDate()!==d)fail('出生日期无效');
  if(typeof body.timeZone!=='string'||!body.timeZone.includes('/'))fail('请选择明确的出生时区');
  if(!Array.isArray(body.modes)||!Array.isArray(body.interests))fail('匹配精度与学习兴趣格式无效');
  let ageDate;try{ageDate=new Intl.DateTimeFormat('en-CA',{timeZone:body.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now());}catch{fail('出生时区无效');}
  const today=Object.fromEntries(ageDate.map(p=>[p.type,p.value]));const age=+today.year-y-(`${today.month}-${today.day}`<`${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`?1:0);
  if(age<18||age>125)fail('同辰雅集仅供18岁以上成年人主动加入',403);
  const modes=[...new Set(body.modes||[])];if(!modes.length||modes.some(mode=>!MODES.includes(mode)))fail('请选择允许搜索的精度');
  const known=body.hour!==null&&body.hour!==undefined;
  if(known&&(!Number.isInteger(body.hour)||body.hour<0||body.hour>23||!Number.isInteger(body.minute)||body.minute<0||body.minute>59))fail('出生钟点无效');
  if(!known&&(modes.includes('hour')||modes.includes('pillars')))fail('时辰不详不能加入同时辰或时柱条件匹配');
  const interests=[...new Set(body.interests||[])];if(interests.length>8||interests.some(v=>!INTERESTS.includes(v)))fail('学习兴趣无效');
  const lunar=Solar.fromYmdHms(y,m,d,known?body.hour:12,known?body.minute:0,0).getLunar();
  const epoch=civilTimeEpoch(y,m,d,known?body.hour:12,known?body.minute:0,body.timeZone);
  if(epoch===null)fail('此日期钟点在所选时区不存在，请核对夏令时或日期');
  const pillars=rules.calendarAt(epoch,{timeZone:body.timeZone,placeName:''}).pillars.split(' · ');
  const tokens={};
  // Raw birth date/time/place are discarded after validation. HMAC indices are
  // still sensitive data, never claimed to be anonymised or exposed to clients.
  if(modes.includes('solar-md'))tokens['solar-md']=hash('solar-md',`${m}-${d}`);
  if(modes.includes('lunar-md'))tokens['lunar-md']=hash('lunar-md',`${lunar.getMonth()}-${lunar.getDay()}`);
  if(modes.includes('date'))tokens.date=hash('date',body.birthDate);
  if(modes.includes('hour'))tokens.hour=hash('hour',`${body.birthDate}:${Math.floor((body.hour+1)/2)%12}`);
  if(modes.includes('pillars'))pillars.forEach((value,i)=>tokens[`pillar${i}`]=hash(`pillar${i}`,value));
  const old=profile(me),publicId=old?.public_id||crypto.randomBytes(16).toString('hex');
  db.prepare(`INSERT INTO tongchen_profiles VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET tokens=excluded.tokens,modes=excluded.modes,interests=excluded.interests,rule_version=excluded.rule_version,accept_requests=excluded.accept_requests,consent_version=excluded.consent_version,joined_ms=excluded.joined_ms`).run(String(me),publicId,JSON.stringify(tokens),JSON.stringify(modes),JSON.stringify(interests),RULE,body.acceptRequests===false?0:1,body.consentVersion,now());
  return {success:true,message:'已按你选择的精度加入。未读取任何客户排盘或亲友记事。'};
 }
 function search(me,body){
  const mine=joined(me),mode=String(body?.mode||'');if(!MODES.includes(mode))fail('请选择匹配条件');
  const myTokens=JSON.parse(mine.tokens),where=['p.user_id<>?','p.consent_version=?','p.rule_version=?'],args=[String(me),config().consentVersion,RULE];
  if(mode==='pillars'){
   if(!JSON.parse(mine.modes).includes('pillars'))fail('请先单独同意四柱精度匹配',403);
   const pillars=body.pillars;if(!Array.isArray(pillars)||pillars.length!==4||!pillars.some(Boolean))fail('至少选择一柱条件');
   pillars.forEach((value,i)=>{if(!value)return;const gan='甲乙丙丁戊己庚辛壬癸'.indexOf(String(value)[0]),zhi='子丑寅卯辰巳午未申酉戌亥'.indexOf(String(value)[1]);if(String(value).length!==2||gan<0||zhi<0||gan%2!==zhi%2)fail('四柱干支条件无效');where.push(`json_extract(p.tokens,'$.pillar${i}')=?`);args.push(hash(`pillar${i}`,value));});
  }else{
   if(!myTokens[mode])fail('请先单独同意此精度匹配',403);where.push(`json_extract(p.tokens,'$."${mode}"')=?`);args.push(myTokens[mode]);
  }
  if(body.interest){if(!INTERESTS.includes(body.interest))fail('兴趣条件无效');where.push('EXISTS (SELECT 1 FROM json_each(p.interests) WHERE value=?)');args.push(body.interest);}
  where.push('NOT EXISTS (SELECT 1 FROM blacklists b WHERE (b.user_id=? AND b.blocked_id=p.user_id) OR (b.user_id=p.user_id AND b.blocked_id=?))');args.push(String(me),String(me));
  limit(String(me),'search',config().searchPerDay);
  const rows=db.prepare(`SELECT p.* FROM tongchen_profiles p WHERE ${where.join(' AND ')} ORDER BY p.joined_ms DESC LIMIT 20`).all(...args);
  return {success:true,items:rows.map(card).filter(Boolean),limited:true,message:'最多展示20位真实已加入学友；同条件不代表性格、婚姻或健康相合。'};
 }
 function leave(me){
  db.prepare('DELETE FROM tongchen_profiles WHERE user_id=?').run(String(me));
  db.prepare("UPDATE friend_requests SET status='cancelled' WHERE source='tongchen' AND status='pending' AND (from_id=? OR to_id=?)").run(String(me),String(me));
  return {success:true,message:'已退出并移出搜索，未决请求已撤回。已有关系可单独解除。'};
 }
 function request(me,peerId){
  const mine=joined(me),peer=peerFor(peerId,me);if(!peer.accept_requests)fail('对方已关闭交流请求',403);
  const a=[String(me),peer.user_id].sort();if(db.prepare('SELECT 1 FROM friendships WHERE user_a=? AND user_b=?').get(...a))return {success:true,message:'已是好友'};
  const existing=db.prepare("SELECT 1 FROM friend_requests WHERE source='tongchen' AND from_id=? AND to_id=? AND status='pending'").get(String(me),peer.user_id);if(existing)return {success:true,message:'已发送，请等待对方同意'};
  limit(String(me),'request',config().requestsPerDay,2);
  db.prepare("INSERT INTO friend_requests(from_id,to_id,from_name,message,status,source) VALUES (?,?,?,'同辰雅集学习交流请求','pending','tongchen')").run(String(me),peer.user_id,userInfo(me)?.nickname||'学友');
  return {success:true,message:'交流请求已发送；对方同意前不能发送私信'};
 }
 function requests(me){
  const incoming=db.prepare("SELECT r.id,r.from_id FROM friend_requests r WHERE r.source='tongchen' AND r.to_id=? AND r.status='pending' ORDER BY id DESC LIMIT 30").all(String(me));
  const friends=db.prepare("SELECT user_a,user_b FROM friendships WHERE user_a=? OR user_b=? LIMIT 100").all(String(me),String(me));
  return {success:true,incoming:incoming.flatMap(r=>{const p=profile(r.from_id);return p&&!blocked(String(me),r.from_id)&&card(p)?[{requestId:r.id,...card(p)}]:[];}),friends:friends.flatMap(r=>{const other=r.user_a===String(me)?r.user_b:r.user_a,p=profile(other);return p&&!blocked(String(me),other)&&card(p)?[card(p)]:[];})};
 }
 function answer(me,id,accept){
  const row=db.prepare("SELECT * FROM friend_requests WHERE id=? AND to_id=? AND source='tongchen'").get(Number(id),String(me));if(!row)fail('请求不存在',404);
  if(!accept){db.prepare("UPDATE friend_requests SET status='rejected' WHERE id=?").run(row.id);return {success:true};}
  joined(me);if(row.status!=='pending')fail('请求已处理',409);
  const peer=profile(row.from_id);if(!peer||blocked(String(me),row.from_id)||!userInfo(row.from_id))fail('请求已失效',404);
  db.exec('BEGIN IMMEDIATE');try{const [a,b]=[String(me),row.from_id].sort();db.prepare("INSERT OR IGNORE INTO friendships(user_a,user_b,source) VALUES (?,?,'tongchen')").run(a,b);db.prepare("UPDATE friend_requests SET status='accepted' WHERE id=?").run(row.id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
  return {success:true,message:'已同意文字交流'};
 }
 function relation(me,peerId){const peer=peerFor(peerId,me),[a,b]=[String(me),peer.user_id].sort();if(!db.prepare('SELECT 1 FROM friendships WHERE user_a=? AND user_b=?').get(a,b))fail('请先获得对方同意',403);return peer;}
 function revoke(me,peerId){const peer=peerFor(peerId,me),[a,b]=[String(me),peer.user_id].sort();db.prepare('DELETE FROM friendships WHERE user_a=? AND user_b=?').run(a,b);return {success:true};}
 function block(me,peerId){const peer=peerFor(peerId,me);db.prepare('INSERT OR IGNORE INTO blacklists(user_id,blocked_id) VALUES (?,?)').run(String(me),peer.user_id);const [a,b]=[String(me),peer.user_id].sort();db.prepare('DELETE FROM friendships WHERE user_a=? AND user_b=?').run(a,b);return {success:true,message:'已屏蔽并解除关系'};}
 function report(me,peerId,reason){const peer=peerFor(peerId,me),text=validateStudyText(reason);if(!text.ok)fail(text.error);db.prepare('INSERT OR IGNORE INTO reports(target_type,target_id,reporter_id,reporter_name,reason) VALUES (?,?,?,?,?)').run('user',peer.user_id,String(me),userInfo(me)?.nickname||'',text.text);return {success:true,message:'举报已进入现有审核后台'};}
 return {config,join,search,leave,request,requests,answer,relation,revoke,block,report,joined,limit,
  mine:me=>{const p=profile(me);return {success:true,joined:!!p,modes:p?JSON.parse(p.modes):[],interests:p?JSON.parse(p.interests):[],acceptRequests:!!p?.accept_requests,config:config()};},
  configure:body=>{if(Object.keys(body||{}).some(k=>!['enabled','name','searchPerDay','requestsPerDay'].includes(k)))fail('设置字段无效');for(const [k,v] of Object.entries(body)){if(k==='enabled'&&typeof v!=='boolean')fail('开关无效');if(k==='name'&&(typeof v!=='string'||v.length>20||!v.trim()||/[<>\n]/.test(v)))fail('名称无效');if(k.endsWith('PerDay')&&(!Number.isInteger(v)||v<1||v>100))fail('频率范围无效');db.prepare('INSERT OR REPLACE INTO tongchen_settings VALUES (?,?)').run(k,String(v));}return {success:true,config:config()};}
 };
}
module.exports={createTongchenStore,RULE,MODES};
