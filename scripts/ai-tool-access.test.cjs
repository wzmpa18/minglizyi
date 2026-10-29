const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module'),{webcrypto}=require('node:crypto');
function client(){
 const values=new Map([['yandao_user_token','user-a']]);let token='user-a',calls=0,handler=async()=>new Response(JSON.stringify({success:true,content:'实际生成的教学内容'}),{status:200});
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const source=stripTypeScriptTypes(fs.readFileSync('src/lib/aiService.ts','utf8')).replace('import { getUserToken } from "./auth";','').replace(/^export /gm,'');
 const api=Function('getUserToken','window','localStorage','navigator','fetch','crypto','AbortSignal','TextEncoder',source+';return {getPermissionStatusFromServer,callAI,getEventDivination,requireAIContent};')(()=>token,{},storage,{onLine:true},async(...args)=>{calls++;return handler(...args)},webcrypto,AbortSignal,TextEncoder);
 return {api,values,setToken:t=>{token=t;values.set('yandao_user_token',t)},setHandler:h=>{handler=h},calls:()=>calls};
}
test('authoritative exhausted quota overrides stale local membership; paid credits override exhausted local usage',async()=>{
 const c=client();c.values.set('yandao_membership_status',JSON.stringify({level:'lifetime'}));c.setHandler(async()=>new Response(JSON.stringify({success:true,data:{remaining:0,dailyLimit:50,paidAccess:false}})));
 const denied=await c.api.getPermissionStatusFromServer();assert.equal(denied.canUseAI,false);assert.equal(denied.needPayment,true);
 c.setHandler(async()=>new Response(JSON.stringify({success:true,data:{remaining:0,dailyLimit:3,paidAccess:true}})));const allowed=await c.api.getPermissionStatusFromServer();assert.equal(allowed.canUseAI,true);assert.equal(allowed.paidAccess,true);
 c.values.delete('yandao_membership_status');c.setHandler(async()=>new Response(JSON.stringify({success:true,data:{remaining:49,dailyLimit:50,paidAccess:false,level:'monthly'}})));const renewed=await c.api.getPermissionStatusFromServer();assert.equal(renewed.isMember,true);assert.equal(renewed.level,'member');
 c.setHandler(async()=>new Response('{}',{status:401}));assert.equal((await c.api.getPermissionStatusFromServer()).needLogin,true);
});
test('AI cache keys bind full palace/chart content and account; identical requests reuse cache without a second charge',async()=>{
 const c=client();c.setHandler(async()=>new Response(JSON.stringify({success:true,content:'回复'+c.calls()})));
 const prefix='同一排盘前缀'.repeat(50);const a=await c.api.callAI({userPrompt:prefix+'子宫',cacheKey:'same-truncated-prefix'}),b=await c.api.callAI({userPrompt:prefix+'丑宫',cacheKey:'same-truncated-prefix'});
 assert.notEqual(a.content,b.content);assert.equal(c.calls(),2);
 assert.equal((await c.api.callAI({userPrompt:prefix+'子宫',cacheKey:'same-truncated-prefix'})).cached,true);assert.equal(c.calls(),2);
 c.setToken('user-b');assert.equal((await c.api.callAI({userPrompt:prefix+'子宫',cacheKey:'same-truncated-prefix'})).cached,false);assert.equal(c.calls(),3);
 c.setToken('');assert.equal((await c.api.callAI({userPrompt:prefix+'子宫',cacheKey:'same-truncated-prefix'})).errorCode,'AI_AUTH_REQUIRED');assert.equal(c.calls(),3);
});
test('rejected AI responses are errors, not successful/truncated reports, and user switching discards an in-flight result',async()=>{
 const c=client();c.setHandler(async()=>new Response(JSON.stringify({error:'quota',code:'AI_QUOTA_EXCEEDED'}),{status:403}));
 await assert.rejects(c.api.getEventDivination('大六壬','子宫','学习结构'),e=>e.code==='AI_QUOTA_EXCEEDED');
 assert.throws(()=>c.api.requireAIContent({success:false,errorCode:'AI_NOT_ENTITLED'}),e=>e.code==='AI_NOT_ENTITLED');
 c.setHandler(async()=>{c.setToken('user-b');return new Response(JSON.stringify({success:true,content:'属于原账号的结果'}))});
 assert.equal((await c.api.callAI({userPrompt:'新问题'})).success,false);
});
test('AI provenance survives normal response and account-scoped offline cache without relabelling old entries',async()=>{
 const c=client(), AIGC={Label:'1',ContentProducer:'东莞言道科技有限公司',ProduceID:'review-generated-id',ReservedCode1:'{}',ContentPropagator:'东莞言道科技有限公司',PropagateID:'review-generated-id',ReservedCode2:''};
 c.setHandler(async()=>new Response(JSON.stringify({success:true,content:'可对照的生成学习内容',AIGC})));
 const request={userPrompt:'节气的学习顺序',cacheKey:'metadata-check'};
 assert.deepEqual((await c.api.callAI(request)).AIGC,AIGC);
 const cached=await c.api.callAI(request);assert.equal(cached.cached,true);assert.deepEqual(cached.AIGC,AIGC);assert.equal(c.calls(),1);
 for(const [key,value] of c.values)if(key.startsWith('yandao_ai_cache_')){const old=JSON.parse(value);delete old.AIGC;c.values.set(key,JSON.stringify(old));}
 const old=await c.api.callAI(request);assert.equal(old.cached,true);assert.equal(old.AIGC,undefined);assert.equal(c.calls(),1);
});
const library=stripTypeScriptTypes(fs.readFileSync('src/lib/daliuren-interpretations.ts','utf8')).replace(/^export /gm,'');const palace=Function(library+';return getPalaceInterpretation')();
test('all twelve palace details use their selected ground/heaven/general/stem and distinct empty markers',()=>{
 const branches=[...'子丑寅卯辰巳午未申酉戌亥'];
 for(let i=0;i<12;i++){const earth=branches[i],heaven=branches[(i+3)%12],d=palace(earth,heaven,'贵','甲','父',['子','丑']);assert.equal(d.title,`${earth}宫 · 天盘${heaven}`);assert.ok(d.items[0].content.includes(`地盘为${earth}`));assert.ok(d.items[0].content.includes(`天盘为${heaven}`));assert.ok(d.items.some(x=>x.title.includes('天乙贵人')));assert.ok(d.items.some(x=>x.title.includes('甲')));assert.ok(d.items.at(-1).content.includes(`地盘${earth}${['子','丑'].includes(earth)?'在':'不在'}`));}
});

test('phone verification and service failures never become purchase prompts or trust stale membership',async()=>{
 const c=client();c.values.set('yandao_membership_status',JSON.stringify({level:'lifetime'}));
 for(const status of [403,500]){c.setHandler(async()=>new Response(JSON.stringify({code:status===403?'PHONE_VERIFICATION_REQUIRED':'UNAVAILABLE'}),{status}));const p=await c.api.getPermissionStatusFromServer();assert.equal(p.canUseAI,false);assert.equal(p.needPayment,false);assert.equal(p.verificationRequired,status===403);assert.ok(p.message.includes('无需重复'));}
 c.setHandler(async()=>{throw Error('offline')});const p=await c.api.getPermissionStatusFromServer();assert.equal(p.canUseAI,false);assert.equal(p.needPayment,false);
});
