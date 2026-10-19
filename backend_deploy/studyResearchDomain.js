'use strict';
const crypto=require('node:crypto');
const {domainFor,ageCheck,topics,prepareResearch}=require('./studyResearchPolicy');
function createResearchDomain(db,{now=()=>Date.now(),lifeEligible=()=>false,accountEligible=()=>true}={}){
 db.exec(`CREATE TABLE IF NOT EXISTS study_research_consents(user_id TEXT,domain TEXT,version TEXT,joined_ms INTEGER,PRIMARY KEY(user_id,domain));
 CREATE TABLE IF NOT EXISTS study_research_aliases(user_id TEXT,domain TEXT,public_id TEXT UNIQUE,PRIMARY KEY(user_id,domain));
 CREATE TABLE IF NOT EXISTS study_comment_research(comment_id INTEGER PRIMARY KEY,domain TEXT,metadata_json TEXT NOT NULL);
 INSERT OR IGNORE INTO study_comment_settings VALUES ('research:symptom:enabled','false');
 INSERT OR IGNORE INTO study_comment_settings VALUES ('research:life:enabled','false');`);
 if(!db.prepare('PRAGMA table_info(study_research_consents)').all().some(r=>r.name==='membership_nonce'))db.exec("ALTER TABLE study_research_consents ADD COLUMN membership_nonce TEXT NOT NULL DEFAULT ''");
 const lifeNonce=me=>{const value=lifeEligible(String(me));return value===true?'active':typeof value==='string'?value:'';};
 const fail=(m,s=403)=>{const e=new Error(m);e.status=s;throw e;};
 const domain=d=>{if(!['symptom','life'].includes(d))fail('研习区域不存在',404);return d;};
 const enabled=d=>db.prepare("SELECT value FROM study_comment_settings WHERE key='enabled'").get()?.value==='true'&&db.prepare('SELECT value FROM study_comment_settings WHERE key=?').get(`research:${domain(d)}:enabled`)?.value==='true';
 const member=(me,d)=>{if(!me||!accountEligible(String(me)))return false;const row=db.prepare('SELECT * FROM study_research_consents WHERE user_id=? AND domain=? AND version=?').get(String(me),d,topics.consentVersion);return !!row&&(d!=='life'||!!lifeNonce(me)&&row.membership_nonce===lifeNonce(me));};
 const assert=(me,d)=>{domain(d);if(!me)fail('登录并主动参加后才能阅读交流，古籍阅读无需参加',401);if(!enabled(d))fail('此研习交流尚未开放；古籍学习、退出和删除仍可用',503);if(!member(me,d))fail(d==='life'?'请先主动加入同辰雅集并单独确认人生片段交流':'请先完成成年核验与健康交流用途确认');};
 const alias=(me,d)=>db.prepare('SELECT public_id FROM study_research_aliases WHERE user_id=? AND domain=?').get(String(me),d)?.public_id;
 function join(me,d,body){
  domain(d);if(!me)fail('请先登录',401);if(!enabled(d))fail('审核值守尚未配置，此区域暂未开放',503);
  if(!body||Object.keys(body).some(k=>!['birthDate','adultConsent','inferenceConsent','publicScopeConsent','consentVersion'].includes(k))||body.adultConsent!==true||body.inferenceConsent!==true||body.publicScopeConsent!==true||body.consentVersion!==topics.consentVersion)fail('请分别确认成年、敏感信息推断风险及交流可见范围');
  ageCheck(body.birthDate,now());if(d==='life'&&!lifeEligible(String(me)))fail('请先主动加入同辰雅集，退出后不能继续发表人生片段');
  db.prepare('INSERT OR IGNORE INTO study_research_aliases VALUES (?,?,?)').run(String(me),d,'research-user-'+crypto.randomUUID());
  db.prepare('INSERT OR REPLACE INTO study_research_consents(user_id,domain,version,joined_ms,membership_nonce) VALUES (?,?,?,?,?)').run(String(me),d,topics.consentVersion,now(),d==='life'?lifeNonce(me):'');
  db.prepare('INSERT INTO study_comment_audit(actor,action,target,note,created_ms) VALUES (?,?,?,?,?)').run(String(me),'RESEARCH_JOIN',d,topics.consentVersion,now());
  return {success:true,message:'已按本次用途参加；出生日期不保存，也没有读取私人记录',...state(me,d)};
 }
 function leave(me,d){
  domain(d);if(!me)fail('请先登录',401);
  db.exec('BEGIN IMMEDIATE');try{
   db.prepare("UPDATE study_comments SET status='REMOVED',pinned=0 WHERE id IN (SELECT comment_id FROM study_comment_research WHERE domain=?) AND user_id=?").run(d,String(me));
   db.prepare("UPDATE study_comments SET status='REMOVED',pinned=0 WHERE parent_id IN (SELECT id FROM study_comments WHERE user_id=? AND status='REMOVED')").run(String(me));
   const ids=db.prepare('SELECT c.id FROM study_comments c JOIN study_comment_research m ON m.comment_id=c.id WHERE m.domain=? AND c.user_id=?').all(d,String(me));
   for(const row of ids)erase(row.id);
   db.prepare('DELETE FROM study_research_consents WHERE user_id=? AND domain=?').run(String(me),d);db.prepare('INSERT INTO study_comment_audit(actor,action,target,note,created_ms) VALUES (?,?,?,?,?)').run(String(me),'RESEARCH_LEAVE',d,'撤下本人该域片段',now());db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return {success:true,message:'已退出并撤下本人该区域片段；不会删除你的本机私人记录，既有他人本机摘录无法远程收回'};
 }
 function erase(id){db.prepare("UPDATE study_comments SET content='',nickname='',content_hash='',review_note='',evidence_url='' WHERE id=?").run(id);db.prepare('DELETE FROM study_comment_safety WHERE comment_id=?').run(id);db.prepare('DELETE FROM study_comment_research WHERE comment_id=?').run(id);}
 function state(me,d){return {domain:domain(d),enabled:enabled(d),joined:member(me,d),eligible:d!=='life'||!!me&&lifeEligible(String(me)),consentVersion:topics.consentVersion};}
 function row(r,viewer){const d=domainFor(r.target_id);if(!d)return {};const publicId=alias(r.user_id,d);return {authorId:publicId,authorName:'研习者 '+String(publicId).slice(-6),mine:String(r.user_id)===String(viewer),research:JSON.parse(db.prepare('SELECT metadata_json FROM study_comment_research WHERE comment_id=?').get(r.id)?.metadata_json||'null')};}
 function visible(r){const d=domainFor(r.target_id);if(!d)return true;if(!member(r.user_id,d))return false;if(r.parent_id){const p=db.prepare('SELECT user_id FROM study_comments WHERE id=?').get(r.parent_id);return !!p&&member(p.user_id,d);}return true;}
 return {assert,join,leave,state,row,visible,member,erase,
  prepare:(id,body)=>prepareResearch(id,body),
  attach:(id,metadata)=>db.prepare('INSERT INTO study_comment_research VALUES (?,?,?)').run(id,metadata.domain,JSON.stringify(metadata)),
  resolveUser:id=>db.prepare('SELECT user_id FROM study_research_aliases WHERE public_id=?').get(String(id))?.user_id||id,
  publicUser:id=>db.prepare('SELECT public_id FROM study_research_aliases WHERE user_id=? ORDER BY domain LIMIT 1').get(String(id))?.public_id||id,
  configure:(d,value,actor='admin',confirmation={})=>{domain(d);if(value===true&&(confirmation.operatorConfirmed!==true||confirmation.channelDisclosureConfirmed!==true||typeof confirmation.note!=='string'||confirmation.note.trim().length<8))fail('开放前须确认人工审核值守、渠道披露并填写依据',400);if(typeof value!=='boolean')fail('开关无效',400);db.prepare('UPDATE study_comment_settings SET value=? WHERE key=?').run(String(value),`research:${d}:enabled`);db.prepare('INSERT INTO study_comment_audit(actor,action,target,note,created_ms) VALUES (?,?,?,?,?)').run(String(actor),'RESEARCH_CONFIG',d,String(confirmation.note||'关闭研习交流').slice(0,500),now());return {success:true};}
 };
}
module.exports={createResearchDomain};
