const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');

function render(route){
 const file=path.resolve(__dirname,'../src/components/PrivacyConsentGate.tsx');
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 const target=new Module(file,module);target.filename=file;target.paths=module.paths;
 target.require=id=>{
  if(id==='react')return React;
  if(id==='next/navigation')return {usePathname:()=>route};
  if(id==='@/app/privacy/page')return {PrivacyPolicyDocument:()=>React.createElement('article',null,'Independent privacy policy')};
  throw new Error('Unexpected import '+id);
 };
 target._compile(compiled,file);
 return renderToStaticMarkup(React.createElement(target.exports.default,null,React.createElement('div',null,'Private application services')));
}
test('fresh direct privacy URLs render policy before consent and never mount app services',()=>{
 for(const url of ['/privacy','/privacy/','/privacy///']){
  const html=render(url);assert.match(html,/Independent privacy policy/);assert.doesNotMatch(html,/Private application services|隐私保护提示/);
 }
});
test('other routes still wait for consent; similar names do not bypass the gate',()=>{
 for(const url of ['/','/profile/','/privacy-settings','/privacy/anything']){
  const html=render(url);assert.doesNotMatch(html,/Private application services|Independent privacy policy/);
 }
});
