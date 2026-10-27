'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file,context={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{exports,require,process:{cwd:()=>root,env:{}},...context});return exports;}
test('production API version headers use the exact canonical package version, independently of stale build identifiers',()=>{
 const canonical=require('../package.json').version.replace(/^v/,'');
 const config=load('next.config.ts').default;assert.equal(config.env.NEXT_PUBLIC_CLIENT_VERSION,canonical);
 const client=load('src/lib/releaseFeatures.ts',{process:{env:{NEXT_PUBLIC_CLIENT_VERSION:config.env.NEXT_PUBLIC_CLIENT_VERSION,NEXT_PUBLIC_STORE_CHANNEL:'ios-full-learning'}}});
 assert.equal(client.CLIENT_VERSION,canonical);assert.equal(client.PUBLIC_PROMOTION_ENABLED,false);
 const future=load('src/lib/releaseFeatures.ts',{process:{env:{NEXT_PUBLIC_CLIENT_VERSION:'25.0.999',NEXT_PUBLIC_STORE_CHANNEL:'google'}}});
 assert.equal(future.CLIENT_VERSION,'25.0.999');assert.equal(future.PUBLIC_PROMOTION_ENABLED,false);
});
