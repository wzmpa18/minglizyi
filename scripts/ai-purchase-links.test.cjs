const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const source=ts.transpileModule(fs.readFileSync('src/components/AIAccessLinks.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function markup(channel){const exports={};vm.runInNewContext(source,{exports,require:name=>{
 if(name==='next/link')return {default:({href,children})=>React.createElement('a',{href},children)};
 if(name==='@/lib/releaseFeatures')return {IS_GOOGLE_PLAY_BUILD:channel==='google',IS_IOS_FULL_BUILD:channel==='ios-full-learning'};
 if(name==='@/lib/platformGate')return {isPaymentsBlocked:()=>channel==='google',PAYMENT_DISABLED_TIP:'本渠道暂未开放购买'};
 return require(name);
}});return renderToStaticMarkup(React.createElement(exports.AIAccessLinks));}
test('Apple tool purchase navigation reaches actual StoreKit membership/credits pages without external checkout',()=>{
 const html=markup('ios-full-learning');assert.ok(html.includes('App Store'));assert.ok(html.includes('href="/membership"'));assert.ok(html.includes('href="/ai-credits"'));assert.ok(html.includes('恢复购买'));assert.ok(!html.includes('/profile/wallet'));assert.ok(!/wechat|weixin|支付宝|扫码/.test(html));
});
test('web and domestic purchase navigation shares actual membership/credits pages; Google has no unsupported checkout',()=>{
 const html=markup('default');assert.ok(html.includes('href="/membership"'));assert.ok(html.includes('href="/ai-credits"'));
 const google=markup('google');assert.ok(google.includes('暂未开放购买'));assert.ok(!google.includes('<a'));
});
