'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {validateStudyText,countStudyCharacters}=require('../backend_deploy/studyCommentPolicy');
const {createStudyCommentStore}=require('../backend_deploy/studyCommentStore');
function setup(){const db=new DatabaseSync(':memory:');let time=Date.UTC(2026,9,18);const service=createStudyCommentStore(db,new Set(['standard:LU1','standard:LU2','standard:LU3','standard:LU4','standard:LU5']),()=>time);service.setConfig('test-admin',{enabled:true});let seq=0;return {db,service,tick:()=>{time+=31000;},body:(content,parentId=null)=>({content,parentId,requestId:`test-request-${String(++seq).padStart(8,'0')}`})};}
test('500 visible characters, combining marks and emoji work; 501 and media do not get truncated into accepted posts',()=>{
 for(const unit of ['字','👨‍👩‍👧‍👦','e\u0301','👍🏽']){assert.equal(countStudyCharacters(unit.repeat(500)),500);assert.equal(validateStudyText(unit.repeat(500)).ok,true);assert.equal(validateStudyText(unit.repeat(501)).ok,false);}
 for(const text of ['<img src="x">','![图](https://x/a.png)','data:image/png;base64,aaaa','A'.repeat(1000),'自行针刺','直刺1寸','联系我买课','13812345678'])assert.equal(validateStudyText(text).ok,false,text);
 assert.equal(validateStudyText('这个术语是什么意思？').ok,true);
});
test('everything is pending until manual approval; read, reply, block, report and deletion stay isolated',()=>{
 const {db,service:s,body,tick}=setup();
 const first=s.submit('standard:LU1','alice','甲',body('请解释此处古籍术语'));
 assert.equal(s.list('standard:LU1').length,0);
 assert.equal(db.prepare('SELECT status FROM study_comments WHERE id=?').get(first.id).status,'PENDING');
 assert.throws(()=>s.submit('standard:LU2','bob','乙',body('另一个穴位的回复',first.id)),/原留言/);
 s.review(first.id,'reviewer',{status:'APPROVED',note:'已核对为正常术语问题'});
 const reply=s.submit('standard:LU1','bob','乙',body('可以先看经脉原文',first.id));
 assert.equal(s.list('standard:LU1').length,1);
 s.review(reply.id,'reviewer',{status:'APPROVED',note:'学习资料建议，无操作指导'});
 assert.throws(()=>s.submit('standard:LU1','carol','丙',body('拒绝形成孤儿深层回复',reply.id)),/嵌套/);
 assert.equal(s.list('standard:LU1').length,2);assert.equal(s.list('standard:LU2').length,0);
 s.report(first.id,'bob','资料表述可能有误');assert.equal(s.queue().reports.length,1);
 s.block('bob','alice');assert.equal(s.list('standard:LU1','bob').length,0);assert.equal(s.list('standard:LU1','alice').length,1);
 s.block('bob','alice',true);assert.equal(s.list('standard:LU1','bob').length,2);
 assert.throws(()=>s.remove(first.id,'bob'),/只能删除/);
 s.remove(first.id,'alice');assert.equal(s.list('standard:LU1').length,0);
 assert.throws(()=>s.review(first.id,'reviewer',{status:'APPROVED',note:'不能恢复已删'}),/已删除/);
 assert.ok(db.prepare('SELECT COUNT(*) n FROM study_comment_audit').get().n>=5);db.close();
});
test('strict target/payload, idempotency, mute, duplicate content and per-point rate limits are enforced on the server',()=>{
 const {db,service:s,body,tick}=setup();
 assert.throws(()=>s.submit('unknown','a','甲',body('内容')),/讨论对象/);
 assert.throws(()=>s.submit('standard:LU1','a','甲',{...body('内容'),userId:'b'}),/仅接受/);
 assert.throws(()=>s.submit('standard:LU1','a','甲',body('字'.repeat(501))),/500/);
 const request=body('第一条');const first=s.submit('standard:LU1','a','甲',request);
 assert.equal(s.submit('standard:LU1','a','甲',request).id,first.id);
 assert.throws(()=>s.submit('standard:LU1','a','甲',{...request,content:'不同内容'}),/请求编号/);
 assert.throws(()=>s.submit('standard:LU1','a','甲',body('过快')),/30秒/);tick();
 assert.throws(()=>s.submit('standard:LU1','a','甲',body('第一条')),/相同内容/);
 for(let i=2;i<=5;i++){s.submit('standard:LU1','a','甲',body(`第${i}条`));tick();}
 assert.throws(()=>s.submit('standard:LU1','a','甲',body('第六条')),/本讨论区/);
 s.mute('admin','a',24,'违规待复核');assert.throws(()=>s.submit('standard:LU2','a','甲',body('不能绕过禁言')),/账号暂不可/);
 s.setConfig('admin',{enabled:false});assert.equal(s.list('standard:LU1').length,0);assert.throws(()=>s.submit('standard:LU2','b','乙',body('关闭时不能发布')),/暂未开放/);
 db.close();
});
test('rejected parent, server defaults, pin evidence and per-day limits remain closed by default',()=>{
 const {db,service:s,body,tick}=setup();
 const first=s.submit('standard:LU1','a','甲',body('学习解答'));
 assert.throws(()=>s.review(first.id,'admin',{status:'APPROVED',note:'缺少来源不可置顶',pinned:true}),/依据链接/);
 s.review(first.id,'admin',{status:'REJECTED',note:'拒绝展示'});assert.equal(s.list('standard:LU1').length,0);
 for(let n=1;n<=20;n++){s.submit(`standard:LU${Math.floor((n-1)/5)+1}`,'b','乙',body(`正常学习问题${n}`));tick();}
 assert.throws(()=>s.submit('standard:LU5','b','乙',body('第二十一条')),/20条/);
 const isolated=new DatabaseSync(':memory:');const fresh=createStudyCommentStore(isolated,new Set(['standard:LU1']));assert.equal(fresh.config('standard:LU1').enabled,false);
 db.close();isolated.close();
});


test('tool discussions share the moderated store and never use a private chart as target',()=>{
 const {STUDY_TOOL_TARGETS}=require('../backend_deploy/studyToolTargets');
 const db=new DatabaseSync(':memory:'); const s=createStudyCommentStore(db,new Set(STUDY_TOOL_TARGETS));
 try {
 s.setConfig('admin',{enabled:true});
 const body={content:'如何阅读这个盘面的干支？',requestId:'tool-comment-request-123456'};
 const posted=s.submit('tool:bazi','learner','学友',body);
 assert.equal(s.list('tool:bazi').length,0);
 s.review(posted.id,'admin',{status:'APPROVED',note:'正常术语提问'});
 assert.equal(s.list('tool:bazi').length,1);assert.equal(s.list('tool:ziwei').length,0);
 assert.throws(()=>s.submit('tool:bazi:private-birthday','learner','学友',body),/讨论对象/);
 s.setConfig('admin',{targetId:'tool:bazi',enabled:false});
 assert.equal(s.list('tool:bazi').length,0);
 assert.equal(s.remove(posted.id,'learner').success,true);
 } finally {db.close();}
});
