import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../backend_deploy/data/study-research-evidence.json';
import {evidenceFor,simulateEvidenceLearning} from '../src/lib/researchLearning';
import {researchSourceHref} from '../src/lib/lifeRecords';
test('symptom selection is deterministic; clearing never recommends unrelated cases, and case-only requires an actual case chapter',()=>{
 assert.equal(evidenceFor(data,[]).total,0);
 assert.equal(evidenceFor(data,['not-a-concept']).total,0);
 const all=evidenceFor(data,['头痛'],0,10000),cases=evidenceFor(data,['头痛'],0,10000,true);
 assert.ok(all.total>0&&cases.total>0&&cases.total<all.total);
 assert.ok(cases.items.every(c=>c.kind==='ANCIENT_CASE'&&c.caseTitle&&c.chapterId==='zhongzhong-original-5'));
 const a=evidenceFor(data,['头痛','咳嗽'],0,12),b=evidenceFor(data,['咳嗽','头痛'],0,12);
 assert.deepEqual(a.items.map(x=>x.id),b.items.map(x=>x.id));
});
test('simulation returns source-based learning questions rather than fabricated personal diagnosis or directions',async()=>{
 const result=await simulateEvidenceLearning(['头痛'],'bagang','zhenggu');
 assert.match(result,/匹配规则/);assert.match(result,/古籍原文出处/);assert.match(result,/不生成本人处方、药量、针刺或复位步骤/);
 assert.match(result,/未发送AI/);assert.doesNotMatch(result,/建议服用|您患有|触诊验证→轻手法/);
});
test('source returns use own routes and local fragments; arbitrary URLs and private payloads cannot become source links',()=>{
 assert.equal(researchSourceHref('research:symptom:s001','123'),'/zhongyi/bianzheng/#research-symptom-s001-123');
 assert.equal(researchSourceHref('research:life:environment','3'),'/discover/tongchen/#research-life-environment-3');
 for(const source of ['https://external.example','javascript:alert(1)','research:symptom:../health','PRIVATE_LOCAL:medical'])assert.equal(researchSourceHref(source,'123'),null);
 assert.equal(researchSourceHref('research:symptom:s001','secret-private-note'),null);
});
