'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
function fixture(){
 const routes=new Map(),module={exports:{}},state={signed:0,member:false};
 const router={get:(route,...handlers)=>routes.set('GET '+route,handlers),post:()=>{}};
 const engine={getPackFile:id=>({ok:true,row:{pack_id:id,access_level:id.startsWith('tcm-anatomy')?'MEMBER':'PUBLIC',version:'1.0.0'},deliveryProvider:'COS',objectKey:'offline-packs/'+id+'/1.0.0.pack',sha256:'a'.repeat(64),size:100})};
 const deps={express:{Router:()=>router},jsonwebtoken:{verify:token=>{if(token!=='ordinary-account')throw Error('invalid');return{userId:'ordinary-user'};}},fs,path,'./offlinePackEngine':engine,'./objectStorageEngine':{ObjectStorageService:{temporaryDownloadUrl:async()=>{state.signed++;return{ok:true,url:'https://private-object.invalid/signed'};}}},'./adminRoles':{adminAuth:()=>()=>{},audit:()=>{}},'./middleware/auth':{getMembershipFromDB:()=>({level:state.member?'monthly':'basic'}),MEMBER_LEVELS:{monthly:1,basic:0}}};
 deps['./studyMediaAccess']=require('../backend_deploy/studyMediaAccess');
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../backend_deploy/offlinePackRoutes.js'),'utf8'),{module,exports:module.exports,require:id=>{if(!(id in deps))throw Error(id);return deps[id];},process:{env:{JWT_SECRET:'synthetic-test-key-not-for-production-12345'}},console});module.exports();
 async function request(id,token){return new Promise((resolve,reject)=>{const req={params:{packId:id},headers:token?{authorization:'Bearer '+token}:{},query:{resolve:'1'}};const res={code:200,status(code){this.code=code;return this;},setHeader(){},json(body){resolve({status:this.code,body});}};try{routes.get('GET /packs/:packId/download')[0](req,res);}catch(error){reject(error);}});}
 return{request,state};
}
test('complete public learning packages require an account and accept ordinary accounts without membership',async()=>{const f=fixture();for(const id of ['tcm-learning-complete','yixue-classics-library']){assert.equal((await f.request(id)).status,401);assert.equal(f.state.signed,id==='tcm-learning-complete'?0:1);assert.equal((await f.request(id,'ordinary-account')).status,200);}assert.equal(f.state.signed,2);});
test('3D still requires membership and older public learning downloads keep their existing access',async()=>{const f=fixture();assert.equal((await f.request('tcm-anatomy-3d-v2','ordinary-account')).status,403);f.state.member=true;assert.equal((await f.request('tcm-anatomy-3d-v2','ordinary-account')).status,200);assert.equal((await f.request('guoxue-classics-approved')).status,200);});
