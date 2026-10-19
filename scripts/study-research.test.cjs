'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite');
const {createStudyCommentStore}=require('../backend_deploy/studyCommentStore');
const {topics,evidence,concepts,prepareResearch,ageCheck,privacyWarnings}=require('../backend_deploy/studyResearchPolicy');
const {countStudyCharacters}=require('../backend_deploy/studyCommentPolicy');
const target='research:symptom:s001',version=topics.consentVersion;
const consent={birthDate:'1990-05-15',adultConsent:true,inferenceConsent:true,publicScopeConsent:true,consentVersion:version};
const open={operatorConfirmed:true,channelDisclosureConfirmed:true,note:'隔离测试已安排审核值守与明确功能披露'};
function body(text='请讨论该术语在不同篇章的语境',mode='knowledge',fields){const research={mode,fields:fields||{question:text},confirmedFields:Object.keys(fields||{question:text}),archiveConsent:true,consentVersion:version};return {content:prepareResearch(target,research).content,research,requestId:require('node:crypto').randomUUID()};}
function fixture(){const db=new DatabaseSync(':memory:');let now=Date.UTC(2026,9,19),life=true;const s=createStudyCommentStore(db,new Set(),()=>now,{lifeEligible:()=>life});s.setConfig('owner',{enabled:true});return {db,s,tick:()=>now+=31000,exitLife:()=>life=false,join:id=>s.researchJoin(id,'symptom',consent)};}
test('all derived source cards locate literal original codepoints, and retain known editions instead of inventing medical cases',()=>{
 const books=[...require('../src/data/tcmOriginalEditions.json'),...require('../src/data/tcmClinicalOriginalEditions.json')];
 assert.equal(topics.categories.length,11);assert.equal(concepts.length,79);assert.equal(new Set(concepts.map(c=>c.conceptId)).size,79);assert.equal(evidence.cards.length,1053);
 for(const c of evidence.cards){const b=books.find(b=>b.id===c.bookId),ch=b?.chapters.find(ch=>ch.id===c.chapterId);assert.ok(ch);assert.equal(Array.from(ch.content).slice(c.start,c.end).join(''),c.quote);assert.ok(c.conceptIds.every(id=>concepts.some(x=>x.conceptId===id)));assert.ok(evidence.books.find(x=>x.id===b.id)?.license);}
});
test('field-by-field consent, authentic citation, privacy and visible-character limits are required, never silently truncated',()=>{
 const b=body();assert.throws(()=>prepareResearch(target,{...b.research,confirmedFields:[]}),/逐项/);assert.throws(()=>prepareResearch(target,{...b.research,archiveConsent:false}),/摘录许可/);
 assert.throws(()=>prepareResearch(target,{...b.research,fields:{...b.research.fields,privateVault:'forbidden'}}),/分享预览/);
 assert.throws(()=>prepareResearch(target,{...b.research,citationId:'invented-author-page'}),/来源不存在/);
 for(const t of ['电话13812345678','某医院的记录','姓名：某人','2026年10月19日','本人42岁','每日5克饭后','自行停药'])assert.ok(privacyWarnings(t).length,t);
 const prefix=countStudyCharacters(body('字').content)-1;
 assert.equal(countStudyCharacters(body('字'.repeat(500-prefix)).content),500);
 assert.throws(()=>body('字'.repeat(501-prefix)),/500/);
 assert.throws(()=>ageCheck('2015-01-01',Date.UTC(2026,9,19)),/成年人/);
});
test('research defaults closed; no guest, non-consenting or underage reader; birth date is discarded',()=>{
 const {db,s,join}=fixture();assert.equal(s.researchState('a','symptom').enabled,false);assert.throws(()=>s.list(target),/登录/);assert.throws(()=>join('a'),/未配置/);
 assert.throws(()=>s.research.configure('symptom',true,'owner',{}),/值守/);s.research.configure('symptom',true,'owner',open);
 assert.throws(()=>s.researchJoin('child','symptom',{...consent,birthDate:'2015-05-15'}),/成年人/);assert.throws(()=>s.list(target,'a'),/确认/);
 join('a');assert.equal(s.researchState('a','symptom').joined,true);assert.equal(JSON.stringify(db.prepare('SELECT * FROM study_research_consents').all()).includes(consent.birthDate),false);assert.equal(db.prepare('SELECT COUNT(*) n FROM study_comments').get().n,0);db.close();
});
test('two identities: pending, opaque aliases, reply, report, block, revised fragment and exit preserve domain privacy',()=>{
 const {db,s,tick,join}=fixture();s.research.configure('symptom',true,'owner',open);join('alice');join('bob');
 const first=s.submit(target,'alice','not-public-real-nickname',body());assert.equal(s.list(target,'bob').length,0);
 s.review(first.id,'moderator',{status:'APPROVED',safetyConfirmed:true,note:'逐条核对原文及风险'});
 let visible=s.list(target,'bob');assert.equal(visible.length,1);assert.notEqual(visible[0].authorId,'alice');assert.equal(JSON.stringify(visible).includes('not-public-real-nickname'),false);
 const alias=visible[0].authorId;assert.ok(alias.startsWith('research-user-'));assert.equal(s.list(target,'alice')[0].mine,true);
 const reply=s.submit(target,'bob','not-public-bob',{...body('同词的语境仍需查原文'),parentId:first.id});s.review(reply.id,'moderator',{status:'APPROVED',safetyConfirmed:true,note:'无诊疗处方或营销'});
 s.report(first.id,'bob','请复核引文');s.block('bob',alias);assert.equal(s.list(target,'bob').length,0);assert.equal(s.blocks('bob')[0].userId,alias);s.block('bob',alias,true);
 tick();const replacement=s.submit(target,'alice','not-public-real-nickname',{...body('修订后仅保留原文学习问题'),replaceId:first.id});assert.equal(s.list(target,'bob').length,0);assert.throws(()=>s.review(first.id,'moderator',{status:'APPROVED',safetyConfirmed:true,note:'不得复活'}),/已删除/);
 s.review(replacement.id,'moderator',{status:'APPROVED',safetyConfirmed:true,note:'重新审查修订内容'});assert.equal(s.list(target,'bob').length,1);
 s.researchLeave('alice','symptom');assert.equal(s.list(target,'bob').length,0);assert.equal(db.prepare('SELECT content FROM study_comments WHERE id=?').get(replacement.id).content,'');assert.throws(()=>s.list(target,'alice'),/确认/);assert.ok(db.prepare("SELECT COUNT(*) n FROM study_comment_audit WHERE action LIKE 'RESEARCH_%'").get().n>=4);db.close();
});
test('same-birth life domain requires independent consent and current matching membership; withdrawal hides historic fragments',()=>{
 const {db,s,exitLife}=fixture();s.research.configure('life',true,'owner',open);s.researchJoin('alice','life',consent);s.researchJoin('bob','life',consent);
 const id='research:life:environment',r={mode:'fragment',fields:{environment:'在不同环境长大',choices:'主动选择继续学习'},confirmedFields:['environment','choices'],archiveConsent:true,consentVersion:version};
 const item=s.submit(id,'alice','private-real-name',{content:prepareResearch(id,r).content,research:r,requestId:require('node:crypto').randomUUID()});s.review(item.id,'moderator',{status:'APPROVED',safetyConfirmed:true,note:'未包含生辰或客户资料'});assert.equal(s.list(id,'bob').length,1);
 exitLife();assert.throws(()=>s.list(id,'bob'),/同辰/);assert.equal(db.prepare('SELECT COUNT(*) n FROM study_research_consents').get().n,2);db.close();
});
