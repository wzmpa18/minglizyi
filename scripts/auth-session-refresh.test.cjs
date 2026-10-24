const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),ts=require('typescript');
function fixture(respond){
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
 let token='old',clears=0,rotations=0;const calls=[];
 const auth={getUserToken:()=>token,getLoginState:()=>({isLoggedIn:!!token,profile:{userId:'fixture'},token}),replaceUserToken:t=>{token=t;rotations++;},clearLoginState:()=>{token=null;clears++;}};
 const ctx={exports:{},require:name=>name==='./auth'?auth:{clientPlatformHeaders:()=>({'X-Client-Platform':'android'})},window:{location:{pathname:'/zhongyi/anatomy3d/',search:''}},localStorage:storage,sessionStorage:storage,Headers,console,Date,JSON,Promise};
 ctx.fetch=async(url,options)=>{calls.push({url,options});return respond(url,options,calls);};
 const code=ts.transpileModule(fs.readFileSync('src/lib/authInterceptor.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,ctx);return {api:ctx.exports,values,calls,state:()=>({token,clears,rotations})};
}
const reply=(status,data)=>({status,ok:status>=200&&status<300,json:async()=>data});
test('cookie-only nested production refresh rotates access credential and retries with new bearer',async()=>{
 const f=fixture((url,o)=>url.includes('refresh-token')?reply(200,{success:true,data:{accessToken:'new',expiresIn:604800}}):reply(o.headers.get('Authorization')==='Bearer new'?200:401,{}));
 assert.equal((await f.api.fetchWithAuth('/api/private')).status,200);
 const refresh=f.calls.find(c=>c.url.includes('refresh-token'));assert.equal(refresh.options.credentials,'include');assert.equal(refresh.options.body,'{}');
 assert.equal(f.state().token,'new');assert.equal(f.state().clears,0);assert.equal(f.state().rotations,1);
});
test('network failure and 503 during refresh retain login and saved profile',async()=>{
 for(const failure of ['network','503']){const f=fixture(url=>{if(url.includes('refresh-token')){if(failure==='network')throw Error('offline');return reply(503,{});}return reply(401,{});});
 await assert.rejects(f.api.fetchWithAuth('/api/private'),/当前登录资料仍保留/);assert.equal(f.state().token,'old');assert.equal(f.state().clears,0);}
});
test('actual refresh rejection clears credentials and preserves return route',async()=>{
 const f=fixture(()=>reply(401,{}));await f.api.fetchWithAuth('/api/private');assert.equal(f.state().clears,1);assert.equal(f.values.get('yandao_login_redirect'),'/zhongyi/anatomy3d/');
});
test('concurrent expired requests share one refresh and both use rotated token',async()=>{
 let count=0;const f=fixture(async(url,o)=>{if(url.includes('refresh-token')){count++;await new Promise(r=>setTimeout(r,5));return reply(200,{success:true,data:{accessToken:'new'}});}return reply(o.headers.get('Authorization')==='Bearer new'?200:401,{});});
 const responses=await Promise.all([f.api.fetchWithAuth('/a'),f.api.fetchWithAuth('/b')]);assert.ok(responses.every(r=>r.status===200));assert.equal(count,1);
});
test('startup cookie-only refresh preserves login through temporary outage',async()=>{
 const f=fixture(()=>reply(503,{}));f.values.set('yandao_token_expiry','1');await f.api.restoreLoginState();assert.equal(f.state().clears,0);assert.equal(f.state().token,'old');
});

test('credential rotation respects session-only login and leaves profile unchanged',()=>{
 const local=new Map(),session=new Map();const store=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)});
 const ctx={exports:{},window:{},localStorage:store(local),sessionStorage:store(session)};
 const code=ts.transpileModule(fs.readFileSync('src/lib/auth.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,ctx);session.set('yandao_user_token','old');session.set('yandao_user_profile','original-profile');ctx.exports.replaceUserToken('new');
 assert.equal(session.get('yandao_user_token'),'new');assert.equal(local.has('yandao_user_token'),false);assert.equal(session.get('yandao_user_profile'),'original-profile');
});
