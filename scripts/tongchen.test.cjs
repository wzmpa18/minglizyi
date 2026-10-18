'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite');
const {Solar}=require('lunar-javascript');
const {createTongchenStore}=require('../backend_deploy/tongchenStore');
function setup(){
 const db=new DatabaseSync(':memory:');db.exec(`CREATE TABLE friend_requests(id INTEGER PRIMARY KEY,from_id TEXT,to_id TEXT,from_name TEXT,message TEXT,status TEXT);CREATE TABLE friendships(user_a TEXT,user_b TEXT,PRIMARY KEY(user_a,user_b));CREATE TABLE blacklists(user_id TEXT,blocked_id TEXT,PRIMARY KEY(user_id,blocked_id));CREATE TABLE reports(id INTEGER PRIMARY KEY,target_type TEXT,target_id TEXT,reporter_id TEXT,reporter_name TEXT,reason TEXT);`);
 let time=Date.UTC(2026,9,19),active=new Set(['alice','bob','carol','young','absent']);
 const store=createTongchenStore(db,{Solar,key:Buffer.alloc(32,7),userInfo:id=>active.has(id)?{nickname:id+'学友'}:null,now:()=>time});
 const birth=(patch={})=>({birthDate:'1990-05-15',hour:12,minute:0,timeZone:'Asia/Shanghai',modes:['solar-md','lunar-md','date','hour','pillars'],interests:['古籍'],adultConsent:true,precisionConsent:true,consentVersion:store.config().consentVersion,acceptRequests:true,...patch});
 store.configure({enabled:true});return {db,store,birth,active,tick:()=>{time+=61000;}};
}
test('opt-in, adult and precision consent are enforced; no raw birth details or implicit users in search',()=>{
 const {db,store:s,birth}=setup();try{
 assert.throws(()=>s.search('alice',{mode:'date'}),/主动加入/);
 assert.throws(()=>s.join('young',birth({birthDate:'2010-05-15'})),/18岁/);
 assert.throws(()=>s.join('alice',birth({precisionConsent:false})),/精度告知/);
 assert.throws(()=>s.join('alice',birth({customerRecordId:'private-record'})),/本人主动录入/);
 assert.throws(()=>s.join('alice',birth({hour:null})),/时辰不详/);
 s.join('alice',birth());s.join('bob',birth());
 const result=s.search('alice',{mode:'date'});assert.equal(result.items.length,1);assert.equal(result.items[0].nickname,'bob学友');
 assert.deepEqual(Object.keys(result.items[0]).sort(),['id','interests','nickname','ruleVersion']);
 const stored=db.prepare('SELECT * FROM tongchen_profiles WHERE user_id=?').get('alice');
 assert.equal(JSON.stringify(stored).includes('1990'),false);assert.equal(JSON.stringify(stored).includes('05-15'),false);assert.equal(stored.tokens.includes('庚午'),false);
 s.leave('bob');assert.equal(s.search('alice',{mode:'date'}).items.length,0);
 }finally{db.close();}
});
test('solar/lunar birthday, hour and exact pillar filters stay distinct and respect selected precision',()=>{
 const {db,store:s,birth,tick}=setup();try{
 s.join('alice',birth());s.join('bob',birth({hour:15}));s.join('carol',birth({birthDate:'1991-05-15',modes:['solar-md']}));
 assert.equal(s.search('alice',{mode:'solar-md'}).items.length,2);
 assert.equal(s.search('alice',{mode:'date'}).items.length,1);
 assert.equal(s.search('alice',{mode:'hour'}).items.length,0);
 assert.throws(()=>s.search('carol',{mode:'date'}),/单独同意/);
 assert.throws(()=>s.search('alice',{mode:'pillars',pillars:['甲丑','','','']}),/干支/);
 const ec=Solar.fromYmdHms(1990,5,15,12,0,0).getLunar().getEightChar();ec.setSect(1);
 assert.equal(s.search('alice',{mode:'pillars',pillars:[ec.getYear(),'','','']}).items.length,1);
 tick();assert.throws(()=>s.join('bob',birth({birthDate:'2023-02-30'})),/出生日期无效/);
 }finally{db.close();}
});
test('request rejection does not grant messaging; mutual acceptance, block and withdrawal reuse existing relationships',()=>{
 const {db,store:s,birth}=setup();try{
 s.join('alice',birth());s.join('bob',birth());const bob=s.search('alice',{mode:'date'}).items[0];
 assert.throws(()=>s.relation('alice',bob.id),/对方同意/);
 s.request('alice',bob.id);s.request('alice',bob.id);assert.equal(s.requests('bob').incoming.length,1);
 const request=s.requests('bob').incoming[0];s.answer('bob',request.requestId,false);
 assert.throws(()=>s.relation('alice',bob.id),/对方同意/);
 s.request('alice',bob.id);s.answer('bob',s.requests('bob').incoming[0].requestId,true);
 assert.equal(s.relation('alice',bob.id).user_id,'bob');assert.equal(db.prepare('SELECT source FROM friendships').get().source,'tongchen');
 s.block('alice',bob.id);assert.equal(s.search('alice',{mode:'date'}).items.length,0);assert.throws(()=>s.relation('alice',bob.id),/不可交流/);assert.equal(db.prepare('SELECT COUNT(*) n FROM friendships').get().n,0);
 }finally{db.close();}
});
test('operational stop keeps deletion available; closed requests and banned/deleted accounts do not appear',()=>{
 const {db,store:s,birth,active}=setup();try{
 s.join('alice',birth());s.join('bob',birth({acceptRequests:false}));let bob=s.search('alice',{mode:'date'}).items[0];assert.throws(()=>s.request('alice',bob.id),/关闭交流请求/);
 active.delete('bob');assert.equal(s.search('alice',{mode:'date'}).items.length,0);
 s.configure({name:'同辰读书会',enabled:false});assert.equal(s.config().name,'同辰读书会');assert.throws(()=>s.search('alice',{mode:'date'}),/暂未开放/);assert.equal(s.leave('alice').success,true);assert.equal(s.mine('alice').joined,false);
 }finally{db.close();}
});
