const {test} = require('node:test');
const assert = require('node:assert/strict');
const {activateHunyuanOnly} = require('../backend_deploy/aiProviderPolicy');

test('owner selection disables every non-Hunyuan fallback only inside the target process', () => {
  const original={HUNYUAN_API_KEY:'protected-hunyuan',HUNYUAN_MODEL:'hy3',ZHIPU_API_KEY:'protected-zhipu',DEEPSEEK_API_KEY:'protected-deepseek',OPENAI_API_KEY:'protected-openai',JWT_SECRET:'unchanged',WECHAT_MCH_ID:'unchanged'};
  const runtime={...original};
  assert.deepEqual(activateHunyuanOnly(runtime),{mode:'hunyuan-only',ready:true,model:'hy3'});
  for(const name of ['ZHIPU_API_KEY','DEEPSEEK_API_KEY','OPENAI_API_KEY'])assert.equal(runtime[name],'');
  assert.equal(runtime.HUNYUAN_API_KEY,original.HUNYUAN_API_KEY);
  assert.equal(runtime.JWT_SECRET,original.JWT_SECRET);
  assert.equal(runtime.WECHAT_MCH_ID,original.WECHAT_MCH_ID);
  assert.equal(original.ZHIPU_API_KEY,'protected-zhipu');
  assert.equal(activateHunyuanOnly(runtime).ready,true);
});

test('missing Hunyuan does not silently fall back to an undocumented provider', () => {
  const env={ZHIPU_API_KEY:'present'};
  assert.equal(activateHunyuanOnly(env).ready,false);
  assert.equal(env.ZHIPU_API_KEY,'');
});
