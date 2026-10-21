const {test}=require('node:test'),assert=require('node:assert/strict');
const q=require('../backend_deploy/liurenStudyQuality');
test('installed glossary clients receive server-owned chart study policy; unrelated requests remain unchanged',()=>{
 const old=[{role:'system',content:'只作名词释义，禁止财运等词'},{role:'user',content:'【大六壬排盘数据】日干支：戊辰；三传：寅→亥→申\n【用户提问】本盘求财如何研习'}];
 const x=q.applyStudyPolicy(old);assert.equal(x.applied,true);assert.ok(x.messages[0].content.startsWith(q.POLICY));assert.equal(x.messages[1],old[1]);assert.equal(x.messages.length,2);
 assert.equal(q.applyStudyPolicy([{role:'user',content:'请对以下大六壬排盘数据进行宫位解释：地盘子'}]).applied,true);
 const unrelated=[{role:'user',content:'中医文化中提到大六壬是什么？'}];assert.equal(q.applyStudyPolicy(unrelated).messages,unrelated);
});
const good='大六壬课式研习 · AI辅助分析\n'+('本课戊辰日，以戊土为日干，亥水在传统六亲分类为财。寅木为官鬼，申金为子孙。金生水、水生木，不能把传序当连续相克，未提供天将与遁干不足以复核取传，需核对四课。此为AI归纳，不是现实财富预测。').repeat(7)+'\n[R2]四課陰陽既具，須求三傳以為發用。';
test('quality failures do not become deliverable reports; correct explanation including refuted errors is allowed',()=>{
 assert.equal(q.validateStudyReport(good),null);
 assert.equal(q.validateStudyReport('仅有几个术语'), 'REPORT_TOO_SHALLOW');
 assert.equal(q.validateStudyReport(good.replace('[R2]','')), 'REPORT_MISSING_SOURCE');
 assert.equal(q.validateStudyReport(good+'\n亥水克申金，形成连续克制。'), 'REPORT_ELEMENT_ERROR');
 assert.equal(q.validateStudyReport(good+'\n亥水克申金是错误说法。'),null);
 assert.equal(q.validateStudyReport(good+'\n你明年必定发财。'), 'REPORT_DETERMINISTIC_CLAIM');
 assert.equal(q.validateStudyReport(good+'[R9]'), 'REPORT_UNKNOWN_SOURCE');
 const withRefs=q.appendSourceNotes(good);for(const r of q.REFERENCES){assert.ok(withRefs.includes(r.url));assert.ok(withRefs.includes(r.quote));}
});
test('server quality gate precedes quota consumption and returns explicit failure',()=>{
 const src=require('node:fs').readFileSync('backend_deploy/server.js','utf8');
 const quality=src.indexOf('validateStudyReport(content, studyRequest)');assert.ok(quality>=0);assert.ok(quality<src.indexOf('if (_quotaOwner && content)'));
 assert.ok(src.includes("code: 'AI_REPORT_QUALITY'"));assert.ok(src.includes("finish_reason === 'length'"));
});

test('known screenshot transmission relations and both chart formats are computed independently of the model',()=>{
 for(const line of ['三传: 寅→亥→申 (遥克法)','三传: 初传 寅，遁干丙→中传 亥，天将阴→末传 申，六亲子']) {
  const facts=q.studyFacts('日干支: 戊辰\n'+line);
  assert.ok(facts.includes('初传寅木：对戊土为克我，六亲官鬼'));
  assert.ok(facts.includes('中传亥水：对戊土为我克，六亲财'));
  assert.ok(facts.includes('末传申金：对戊土为我生，六亲子孙'));
  assert.ok(facts.includes('亥水生寅木'));assert.ok(facts.includes('申金生亥水'));
 }
 assert.equal(q.studyFacts('没有日干和三传'),'');
 assert.equal(q.validateStudyReport(good+'\n申金克亥水。'),'REPORT_ELEMENT_ERROR');
});
