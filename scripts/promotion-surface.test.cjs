'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,Date,require:name=>{if(name in deps)return deps[name];throw Error('Unexpected dependency '+name);}});return exports;}
test('every live marketing selector excludes the unconfirmed ten-person discount and AI-generated invitation rewards',()=>{
 const compliance=load('src/lib/marketing/compliance.ts');
 const templates=load('src/lib/marketing/viralTemplates.ts',{'./posterEngine':{},'./channels':{}});
 assert.equal(templates.VIRAL_TEMPLATES.length,3);assert.equal(templates.VIRAL_TEMPLATES.some(item=>item.id==='VIRAL_BARGAIN'),false);
 assert.equal(templates.getViralTemplate('VIRAL_BARGAIN').id,'VIRAL_MOMENTS');assert.equal(templates.buildViralRecs().length,3);
 for(const text of ['邀请朋友注册奖励50积分','邀请好友返现','分享佣金15%','注册送解析次数'])assert.equal(compliance.validateCopyText(text).passed,false,text);
 for(const item of templates.SHARE_COPY_LIBRARY)assert.equal(compliance.validateCopyText(item.text).passed,true,item.id);
 for(const item of templates.VIRAL_TEMPLATES){const copy=item.copy;assert.equal(compliance.validateCopySet([copy.title,copy.subtitle,...copy.sellingPoints,copy.benefitLine,copy.momentsCopy,copy.groupCopy]).passed,true,item.id);}
});
test('all six cash and poster routes render only learning share on store builds before cash hooks can execute',()=>{
 const jsx=(type,props)=>({type,props}),runtime={jsx,jsxs:jsx},ShareCode=()=>({learning:true});
 const paths=['src/app/invite/page.tsx','src/app/invite/poster/page.tsx','src/app/profile/promote/page.tsx','src/app/profile/team/page.tsx','src/app/profile/partner/page.tsx','src/app/profile/partner/apply/page.tsx'];
 for(const enabled of [false,true]){
  const Gate=load('src/components/PromotionPageGate.tsx',{'react/jsx-runtime':runtime,'@/lib/releaseFeatures':{PUBLIC_PROMOTION_ENABLED:enabled},'@/app/share-code/page':{default:ShareCode,__esModule:true}}).PromotionPageGate;
  for(const file of paths){
   const text=fs.readFileSync(path.join(root,file),'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
   const fn=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.DefaultKeyword));assert.ok(fn,file);
   const inner=fn.getText(source).match(/<([A-Z][A-Za-z0-9]+Content)\s*\/\s*>/);assert.ok(inner,file);
   const exports={};let cashHooks=0;const Cash=()=>{cashHooks++;return {cash:true};};
   const code=ts.transpileModule(fn.getText(source),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
   vm.runInNewContext(code,{exports,PromotionPageGate:Gate,[inner[1]]:Cash,require:name=>{assert.equal(name,'react/jsx-runtime');return runtime;}});
   const outer=exports.default(),selected=outer.type(outer.props),rendered=selected.type(selected.props);
   assert.equal(cashHooks,enabled?1:0,file);assert.equal(enabled?rendered.cash:rendered.learning,true,file);
  }
 }
});
