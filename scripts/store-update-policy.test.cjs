'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const runtime={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
function evaluate(text,dependencies={},globals={}){const exports={};vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,Date,URL,console,process:{env:{}},require:name=>{if(name in dependencies)return dependencies[name];throw Error('Unexpected dependency '+name);},...globals});return exports;}
function load(file,deps={},globals={}){return evaluate(fs.readFileSync(path.join(root,file),'utf8'),deps,globals);}
const policy=load('src/lib/appUpdatePolicy.ts');
const storeChannels=['oppo','vivo','honor','huawei','tencent','google','ios-full-learning','xiaomi','samsung','lenovo'];
const newer={latestVersion:'99.9.9',latestVersionCode:999999,downloadUrl:'https://yandaoguoxue.yandao.vip/downloads/future.apk',downloadPage:'https://yandaoguoxue.yandao.vip/friend',forceUpdate:true,releaseNotes:[]};
function hooks(seed=[]){const effects=[];let cursor=0;return {effects,useState:initial=>[cursor<seed.length?seed[cursor++]:typeof initial==='function'?initial():initial,()=>{}],useEffect:callback=>effects.push(callback),useRef:initial=>({current:initial})};}
function variable(file,name,globals){const text=fs.readFileSync(path.join(root,file),'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let found;function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(source)===name)found=node;ts.forEachChild(node,visit);}visit(source);assert.ok(found,'Missing actual handler '+name);return evaluate('const '+found.getText(source)+';exports.handler='+name+';',{},globals).handler;}
for(const channel of storeChannels)test(channel+': real startup components, native release helper and APK intent cannot request, prompt or route company updates',async()=>{
 let calls=0,timers=0;const noCall=()=>{calls++;throw Error('company update side effect');};
 const native=load('src/lib/nativeDetect.ts',{'./releaseFeatures':{STORE_CHANNEL:channel},'./appUpdatePolicy':policy},{fetch:noCall,window:{}});
 assert.equal(await native.fetchLatestRelease(),null);assert.equal(native.isNativeShellOutdated({versionCode:1,versionName:'1.0.0'},newer),false);assert.throws(()=>native.buildAndroidIntentUrl(newer.downloadUrl),/应用商店/);assert.equal(calls,0);
 for(const [file,seed] of [['src/components/AppUpgradeChecker.tsx',[{versionCode:1,versionName:'1.0.0'},newer,false]],['src/components/VersionChecker.tsx',['99.9.9','99.9.9']]]){
  const react=hooks(seed),api=load(file,{react,'react/jsx-runtime':runtime,'@/lib/releaseFeatures':{STORE_CHANNEL:channel},'@/lib/appUpdatePolicy':policy,'@/lib/cachePurge':{reloadWithCachePurge:noCall},'@/lib/nativeDetect':{detectNativeShell:noCall,fetchLatestRelease:noCall,isNativeShellOutdated:()=>true,isNativeShellSync:()=>true}}, {window:{},document:{addEventListener:noCall,removeEventListener(){}},setTimeout:()=>timers++,setInterval:()=>timers++,clearTimeout(){},clearInterval(){},sessionStorage:{getItem:noCall},localStorage:{getItem:noCall}});
  assert.equal(api.default(),null,file);for(const callback of react.effects)callback();
 }
 assert.equal(calls,0);assert.equal(timers,0);
});
test('actual profile manual check, download buttons and friend download/copy handlers reject all store channels before network/navigation',async()=>{
 for(const STORE_CHANNEL of storeChannels){let network=0,nav=0,notices=0;const blocked=()=>{network++;throw Error('not permitted');};const location={set href(_value){nav++;}};
  const base={...policy,STORE_CHANNEL,showToast:()=>notices++,setDownloadMessage:()=>notices++,setToast:()=>notices++,window:{location},detectNativeShell:blocked,fetchLatestRelease:blocked,fetch:blocked,getUserToken:blocked,setUpdateCheck:blocked,downloadBusy:false,isNativeShellSync:()=>true,useCallback:callback=>callback,device:'android',token:'fixture',data:{landing:{downloadPage:newer.downloadPage}}};
  await variable('src/app/profile/page.tsx','handleCheckUpdate',base)();
  await variable('src/app/download/page.tsx','handleDownloadAPK',base)();
  variable('src/app/friend/page.tsx','triggerDownload',base)();
  await variable('src/app/friend/page.tsx','handleCopyLink',base)();
  variable('src/app/share/result/page.tsx','openApp',base)();
  variable('src/app/share/result/page.tsx','recordDownload',base)();
  assert.equal(network,0,STORE_CHANNEL);assert.equal(nav,0,STORE_CHANNEL);assert.equal(notices,4,STORE_CHANNEL);
 }
});
test('store share landing never renders remote APK or open-app fallback links even before native detection',()=>{
 for(const STORE_CHANNEL of storeChannels){
  const data={valid:true,title:'学习分享',landing:{androidDownloadEnabled:true,androidUrl:newer.downloadUrl,downloadPage:newer.downloadPage,iosStoreEnabled:true,iosStoreUrl:'https://apps.apple.com/example'}};
  const react=hooks([data,false,'',false,'android','fixture']);
  const text=fs.readFileSync(path.join(root,'src/app/share/result/page.tsx'),'utf8'),source=ts.createSourceFile('page.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),fn=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='ShareResultPage');
  const api=evaluate(fn.getText(source),{'react/jsx-runtime':runtime},{...react,...policy,STORE_CHANNEL,useCallback:callback=>callback,useRouter:()=>({push(){}}),useNativeShell:()=>false,BRAND:'#7B2FBE',BRAND_DARK:'#222',TOOL_LABELS:{},extractLines:()=>[]});
  const output=JSON.stringify(api.default());assert.ok(!output.includes('future.apk'),STORE_CHANNEL);assert.ok(!output.includes('下载Android APP'),STORE_CHANNEL);assert.ok(!output.includes('打开APP'),STORE_CHANNEL);assert.ok(output.includes('学习分享'),STORE_CHANNEL);
 }
});
test('the actual store download landing renders a store-managed message without fetching APK metadata or generating a company QR',()=>{
 for(const STORE_CHANNEL of storeChannels){let calls=0;const react=hooks(),text=fs.readFileSync(path.join(root,'src/app/download/page.tsx'),'utf8'),source=ts.createSourceFile('page.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),fn=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='DownloadPage');
  const api=evaluate(fn.getText(source),{'react/jsx-runtime':runtime},{...react,...policy,STORE_CHANNEL,useIOSNativeShell:()=>false,BRAND:'#7B2FBE',APK_URL_FALLBACK:newer.downloadUrl,BrandHeader:()=>null,fetch:()=>{calls++;throw Error('metadata request');},makeQrDataUrl:()=>{calls++;throw Error('company QR');}});
  const output=api.default();for(const callback of react.effects)callback();assert.equal(calls,0,STORE_CHANNEL);assert.ok(JSON.stringify(output).includes('应用商店'),STORE_CHANNEL);assert.ok(!JSON.stringify(output).includes('future.apk'),STORE_CHANNEL);
 }
});
test('company website/internal releases remain available but cannot make an upgrade compulsory; native web bundles do not poll remote web builds',async()=>{
 for(const channel of ['default','internal']){
  let requests=0;const native=load('src/lib/nativeDetect.ts',{'./releaseFeatures':{STORE_CHANNEL:channel},'./appUpdatePolicy':policy},{fetch:async()=>{requests++;return {ok:true,json:async()=>({data:newer})};}});
  assert.equal((await native.fetchLatestRelease()).forceUpdate,false);assert.equal(requests,1);assert.match(native.buildAndroidIntentUrl(newer.downloadUrl),/^intent:/);
  assert.equal(policy.mayRefreshWebBuild(channel,false),true);assert.equal(policy.mayRefreshWebBuild(channel,true),false);
  const react=hooks([{versionCode:1,versionName:'1.0.0'},newer,false]);
  const api=load('src/components/AppUpgradeChecker.tsx',{react,'react/jsx-runtime':runtime,'@/lib/releaseFeatures':{STORE_CHANNEL:channel},'@/lib/appUpdatePolicy':policy,'@/lib/nativeDetect':{isNativeShellOutdated:()=>true}},{});
  assert.ok(JSON.stringify(api.default()).includes('稍后再说'),'even a raw forceUpdate=true fixture must retain Later');
 }
 assert.equal(policy.usesCompanyAppDistribution('unknown'),false);
});
test('real public version HTTP router suppresses all explicit store APK responses through headers/query and retains non-forced website downloads',async()=>{
 const express=require('express'),{createBusinessIdentityGate}=require('../backend_deploy/businessIdentityGate');let decorated=0;
 const mod={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'backend_deploy/appVersionRoutes.js'),'utf8'),{module:mod,exports:mod.exports,__dirname:path.join(root,'backend_deploy'),console,process:{env:{}},require:name=>{
  if(name==='express')return express;if(name==='path')return path;if(name==='fs')return {existsSync:()=>true,readFileSync:()=>JSON.stringify(newer)};
  if(name==='./publicAndroidInstallerRoutes')return {createRouter:()=>express.Router(),decoratePublicRelease:value=>{decorated++;return value;}};throw Error(name);
 }});
 const app=express();app.use(createBusinessIdentityGate({verifyToken:()=>null,getUser:()=>null,resolveAdminKey:()=>null,journal:{append(){}}}));app.use('/api/public/app-version',mod.exports.router);
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const url='http://127.0.0.1:'+server.address().port+'/api/public/app-version';
 try{
  for(const channel of storeChannels)for(const [suffix,headers] of [['?platform=android',{'X-Store-Channel':channel}],['',{'X-Client-Platform':channel}],['?platform='+channel,{}]]){
   const response=await fetch(url+suffix,{headers});assert.equal(response.status,200);const data=(await response.json()).data;
   assert.equal(data.downloadUrl,'',channel);assert.equal(data.forceUpdate,false,channel);assert.deepEqual(data.releaseNotes,[],channel);
   if(channel==='google')assert.match(data.downloadPage,/^https:\/\/play.google.com\//);else assert.equal(data.downloadPage,'',channel);
   if(channel!=='ios-full-learning')assert.equal(data.latestVersionCode,0,channel);
  }
  assert.equal(decorated,0,'store metadata must never enter the company APK decorator');
  for(const channel of ['default','internal']){const data=(await (await fetch(url,{headers:{'X-Store-Channel':channel}})).json()).data;assert.equal(data.downloadUrl,newer.downloadUrl);assert.equal(data.latestVersionCode,newer.latestVersionCode);assert.equal(data.forceUpdate,false);}
  assert.equal(decorated,2);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
