const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file,deps={},context={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,URL,Date,console,require:name=>{if(name in deps)return deps[name];throw Error(name);},...context});return exports;}
const api=load('src/lib/learningShare.ts');
const signed=(id=100,host='yandaoguoxue.yandao.vip')=>`https://${host}/register?ref=${id}&ts=1793020000000&sig=${'a'.repeat(32)}`;
test('learning link preserves server signature fields, opens readable content and discards unrelated redirect parameters',()=>{
 const url=new URL(api.learningShareLink(signed()+'&code=ABC123&next=https://untrusted.example'));
 assert.equal(url.origin,'https://yandaoguoxue.yandao.vip');assert.equal(url.pathname,'/zhongyi/');
 assert.equal(url.searchParams.get('ref'),'100');assert.equal(url.searchParams.get('sig'),'a'.repeat(32));assert.equal(url.searchParams.get('ts'),'1793020000000');assert.equal(url.searchParams.get('code'),'ABC123');assert.equal(url.searchParams.has('next'),false);
 assert.ok(api.learningShareLink(signed(100,'www.yandao.vip')));
});
test('unsafe domains, external links, malformed signatures and duplicate identities cannot be copied as learning links',()=>{
 for(const text of ['', 'javascript:alert(1)',signed().replace('https:','http:'),signed(100,'yandaoguoxue.yandao.vip.evil.test'),signed().replace('.vip/','.vip:8443/'),signed().replace('https://','https://person:secret@'),signed().replace('/register?','/other?'),signed().replace('sig='+ 'a'.repeat(32),'sig=bad'),signed()+'&ref=200',signed()+'#token'])assert.equal(api.learningShareLink(text),'',text);
});
test('signed invite cache is scoped to the real login account and rejects a stale response after account change',async()=>{
 let id=null,token=null,calls=0,resolveFetch=null;
 const storage=new Map();
 const response=uid=>({ok:true,json:async()=>({success:true,data:{userId:uid,inviteCode:'ABC123',inviteLink:signed(uid)}})});
 let fetcher=async()=>{calls++;return response(id);};
 const invites=load('src/lib/inviteApi.ts',{'./auth':{getUserToken:()=>token,getUserProfile:()=>id?{userId:String(id)}:null},'./learningShare':api},{window:{location:{origin:'https://yandaoguoxue.yandao.vip'}},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},fetch:(...args)=>fetcher(...args)});
 assert.equal(await invites.getInviteLink(),null);assert.equal(calls,0);
 id=100;token='token-a';assert.equal((await invites.getInviteLink()).userId,100);assert.equal((await invites.getInviteLink()).userId,100);assert.equal(calls,1);
 id=200;token='token-b';assert.equal((await invites.getInviteLink()).userId,200);assert.equal(calls,2);
 fetcher=()=>new Promise(resolve=>{resolveFetch=resolve;});const pending=invites.getInviteLink(true);id=100;token='token-a-new';resolveFetch(response(200));assert.equal(await pending,null);
 fetcher=async()=>({ok:true,json:async()=>({success:true,data:{userId:100,inviteLink:signed(100,'evil.test')}})});assert.equal(await invites.getInviteLink(true),null);
});
test('non-AI learning access reads account-scoped server grants without treating them as AI or paid membership',async()=>{
 let token='token-a',id='100',active=true;
 const access=load('src/lib/nonAiLearningAccess.ts',{'./auth':{getUserToken:()=>token,getUserProfile:()=>({userId:id})},'./releaseFeatures':{STORE_CHANNEL:'default'}},{fetch:async()=>({ok:true,json:async()=>({success:true,data:{key:'non_ai_full_v1',active,granted:true,features:['anatomy3d','local-diagnosis-study'],aiCreditsGranted:0,membershipLevelChanged:false}})})});
 assert.equal(await access.canUseNonAiLearning('anatomy3d'),true);assert.equal(await access.canUseNonAiLearning('ai'),false);assert.equal(await access.canUseNonAiLearning('paid-ai-credits'),false);active=false;assert.equal(await access.canUseNonAiLearning('anatomy3d'),false);token=null;assert.equal(await access.getNonAiLearningAccess(),null);
});
