'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {isNewIOSFullProfile}=require('../backend_deploy/releaseProfilePolicy');
const {createPlatformFeatureGate}=require('../backend_deploy/platformFeatureGate');
const patch=fs.readFileSync(require('node:path').join(__dirname,'../public/native-api-patch.js'),'utf8');
function gate(platform,channel,version,path){
  let next=false,status=200;
  createPlatformFeatureGate()({headers:{'x-client-platform':platform,'x-store-channel':channel,'x-client-version':version},path},{status(n){status=n;return this;},json(){}},()=>{next=true;});
  return {next,status};
}
test('new full client is explicit and versioned; legacy clients and mini programs keep their policy',()=>{
  assert.equal(isNewIOSFullProfile('ios','ios-full-learning','25.0.115'),true);
  assert.equal(isNewIOSFullProfile('ios','ios-full-learning','25.0.114'),false);
  assert.equal(isNewIOSFullProfile('ios','default','25.0.115'),false);
  assert.equal(isNewIOSFullProfile('android','ios-full-learning','25.0.115'),false);
  assert.equal(isNewIOSFullProfile('ios','ios-full-learning','garbage'),false);
  assert.deepEqual(gate('ios','ios-full-learning','25.0.115','/api/yixue/bazi/learn'),{next:true,status:200});
  for(const [platform,channel,version] of [['ios','default','25.0.77'],['ios','ios-full-learning','25.0.114'],['wechat','ios-full-learning','25.0.115']]){
    assert.equal(gate(platform,channel,version,'/api/yixue/bazi/learn').status,403);
  }
  assert.equal(gate('ios','ios-full-learning','25.0.115','/api/payment/create').status,403);
  assert.equal(gate('android','tencent','25.0.114','/api/payment/create').next,true);
  assert.equal(gate('android','google','25.0.115','/api/payment/create').status,403);
});
function native(channel,platform='ios'){
  const calls=[],styles=[];
  const window={location:{origin:'https://localhost'},Capacitor:{isNativePlatform:()=>platform!=='web',getPlatform:()=>platform},fetch:(...args)=>{calls.push(args);return Promise.resolve({ok:true});}};
  const document={documentElement:{classList:{add:name=>styles.push(name)}},createElement:()=>({}),head:{appendChild:()=>{}}};
  vm.runInNewContext(patch.replace('"__YANDAO_STORE_CHANNEL__"',JSON.stringify(channel)).replace('"__YANDAO_CLIENT_VERSION__"','"25.0.115"'),{window,document,navigator:{userAgent:''},URL,Request,Headers});
  return {window,calls,styles};
}
test('full native profile exposes its identity on own API calls without changing external requests',async()=>{
  const app=native('ios-full-learning');
  await app.window.fetch('/api/study-comments/target/LU1',{headers:{Authorization:'Bearer test-user-token'},method:'POST',body:'{}'});
  const [url,init]=app.calls[0];
  assert.equal(url,'https://yandaoguoxue.yandao.vip/api/study-comments/target/LU1');
  assert.equal(init.headers.get('X-Store-Channel'),'ios-full-learning');
  assert.equal(init.headers.get('X-Client-Version'),'25.0.115');
  assert.equal(init.headers.get('X-Client-Platform'),'ios');
  assert.equal(init.headers.get('Authorization'),'Bearer test-user-token');
  assert.equal(init.body,'{}'); assert.equal(app.styles.length,0);
  await app.window.fetch('https://example.com/api/example');
  assert.equal(app.calls[1][0],'https://example.com/api/example');assert.equal(app.calls[1][1],undefined);
});
test('native URL and Request inputs preserve input headers and init overrides',async()=>{
  const app=native('ios-full-learning');
  await app.window.fetch(new URL('https://localhost/api/health'));
  assert.equal(app.calls[0][0],'https://yandaoguoxue.yandao.vip/api/health');
  await app.window.fetch(new Request('https://localhost/api/records',{headers:{Authorization:'Bearer initial',Accept:'application/json'}}),{headers:{Authorization:'Bearer override'}});
  assert.equal(app.calls[1][0].url,'https://yandaoguoxue.yandao.vip/api/records');
  assert.equal(app.calls[1][1].headers.get('Authorization'),'Bearer override');
  assert.equal(app.calls[1][1].headers.get('Accept'),'application/json');
});
test('legacy iOS keeps legacy navigation styling; browser fetch is unaffected',async()=>{
  const legacy=native('default');assert.deepEqual(legacy.styles,['ios-edu-shell']);
  const web=native('ios-full-learning','web');await web.window.fetch('/api/health');
  assert.equal(web.calls[0][0],'/api/health');assert.equal(web.calls[0][1],undefined);
});
