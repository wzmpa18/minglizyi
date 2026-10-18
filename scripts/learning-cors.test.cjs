const test=require('node:test'),assert=require('node:assert/strict');
const {learningCorsRules}=require('../backend_deploy/learningCorsPolicy');
const app={AllowedOrigins:['https://yandaoguoxue.yandao.vip','https://localhost'],AllowedMethods:['GET','HEAD'],AllowedHeaders:['Range','Content-Type'],ExposeHeaders:['ETag'],MaxAgeSeconds:3600};
test('only missing public client headers are added; origin and method permissions stay unchanged',()=>{
  const original=structuredClone(app),result=learningCorsRules([app])[0];
  assert.deepEqual(app,original);
  assert.deepEqual({...result,AllowedHeaders:original.AllowedHeaders},original);
  assert.deepEqual(result.AllowedHeaders,['Range','Content-Type','X-Client-Platform','X-Store-Channel','X-Client-Version']);
  assert.ok(!result.AllowedHeaders.includes('Authorization'));
});
test('unrelated bucket policies remain unchanged and repeated maintenance is idempotent',()=>{
  const other={AllowedOrigins:['https://another.example'],AllowedMethods:['PUT'],AllowedHeaders:['Content-Type']};
  const result=learningCorsRules([other,app]);assert.deepEqual(result[0],other);assert.deepEqual(learningCorsRules(result),result);
});
test('unknown or broader policies are not replaced with a fresh permissive policy',()=>{
  assert.throws(()=>learningCorsRules([]));assert.throws(()=>learningCorsRules(null));
  assert.throws(()=>learningCorsRules([{...app,AllowedOrigins:['*']}]));
  assert.throws(()=>learningCorsRules([{...app,AllowedMethods:['GET','PUT']}]));
});
