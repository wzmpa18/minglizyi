const {test} = require('node:test');
const assert = require('node:assert/strict');
const {labelAIResponse} = require('../backend_deploy/aiContentLabel');

test('generated text JSON has production/propagation identity without leaking request or rewriting content', () => {
  const original = {success:true, content:'节气是传统历法的学习内容。', usage:{total_tokens:10}, data:{content:'节气是传统历法的学习内容。'}};
  const result = labelAIResponse(original, {requestId:'private-request-value', provider:'tencent', model:'hy3'});
  assert.equal(result.content, original.content);
  assert.deepEqual(result.usage, original.usage);
  assert.equal(result.AIGC.Label, '1');
  assert.equal(result.AIGC.ContentProducer, '东莞言道科技有限公司');
  assert.match(result.AIGC.ProduceID, /^[a-f0-9-]{36}$/);
  assert.equal(result.AIGC.PropagateID, result.AIGC.ProduceID);
  assert.deepEqual(result.data.AIGC, result.AIGC);
  assert.equal(JSON.parse(result.AIGC.ReservedCode1).provider, 'tencent');
  assert.ok(!JSON.stringify(result).includes('private-request-value'));
  assert.equal(original.AIGC, undefined);
  assert.notEqual(labelAIResponse(original).AIGC.ProduceID, result.AIGC.ProduceID);
});

test('errors, empty answers and non-AI payloads are never relabelled as generated successes', () => {
  for (const input of [null, {success:false,content:'错误'}, {success:true,content:''}, {content:'古籍原文'}, {success:true,content:'  '}]) {
    assert.equal(labelAIResponse(input),input);
  }
});
