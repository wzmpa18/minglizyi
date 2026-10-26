const test=require('node:test'),assert=require('node:assert/strict');
const p=require('../src/lib/studyNavigationProof.ts');
const token='a'.repeat(32),now=100000,model='/zhongyi/anatomy3d/?pointName=中府',detail='/zhongyi/meridian/?acupoint=中府&side=-1&atlasReturn='+token;
function storage(){const rows=new Map();return{getItem:key=>rows.get(key)||null,setItem:(key,value)=>rows.set(key,String(value)),removeItem:key=>rows.delete(key),rows};}
function source(){return{__NA:true,tree:{route:'model'},[p.STUDY_MARKER]:'qa-scene-owner-1234',[p.STUDY_SCOPE]:p.normalizedStudyScope(model),[p.STUDY_INDEX]:1,[p.ATLAS_MODEL_TOKEN]:token};}
function stamped(s=storage(),overrides={}){assert.equal(p.stampAtlasDetail(s,{token,detailHref:detail,modelScope:model,state:source(),historyLength:2,...overrides},now),true);return s;}
function accepted(){const s=stamped(),proof=p.consumeAtlasDetailStamp(s,detail,3,now+100);assert.ok(proof);return{s,proof,base:p.atlasDetailBaseState({__NA:true,tree:{route:'detail'},...source()},proof)};}

test('a source marker and its saved context token authorize only the exact next detail scope',()=>{
 const s=stamped(),proof=p.consumeAtlasDetailStamp(s,detail,3,now+14999);assert.ok(proof);assert.equal(proof.modelIndex,1);assert.equal(proof.detailIndex,2);assert.equal(proof.modelOwner,source()[p.STUDY_MARKER]);
 assert.equal(p.consumeAtlasDetailStamp(s,detail,3,now+14999),null);assert.equal(p.atlasModelTokenFromState(source(),model,2),token);
 for(const state of [{}, {...source(),[p.ATLAS_MODEL_TOKEN]:'b'.repeat(32)}, {...source(),[p.STUDY_MARKER]:1}, {...source(),[p.STUDY_INDEX]:2}, {...source(),[p.STUDY_SCOPE]:'/outside'}])assert.equal(p.stampAtlasDetail(storage(),{token,detailHref:detail,modelScope:model,state,historyLength:2},now),false);
});

test('arrival rejects changed points, sides, tokens, extra navigation, expiration and malformed stamps',()=>{
 for(const [scope,length,time] of [[detail.replace('中府','腹结'),3,now],[detail.replace('side=-1','side=1'),3,now],[detail.replace(token,'b'.repeat(32)),3,now],[detail,4,now],[detail,3,now+15001],[detail,3,now-1]]){const s=stamped();assert.equal(p.consumeAtlasDetailStamp(s,scope,length,time),null);assert.equal(s.rows.size,0);}
 for(const raw of ['{',' '.repeat(16001),JSON.stringify({schema:1,modelIndex:0})]){const s=storage();s.setItem('yandao-atlas-detail-stamp-v1',raw);assert.equal(p.consumeAtlasDetailStamp(s,detail,3,now),null);}
 const s=storage();assert.equal(p.stampAtlasDetail(s,{token,detailHref:'https://outside.invalid/',modelScope:model,state:source(),historyLength:2},now),false);
});

test('the proven detail base survives ordinary reading and authorizes exactly one second hop',()=>{
 const {s,proof,base}=accepted();assert.equal(base[p.STUDY_MARKER],undefined);assert.equal(base[p.STUDY_SCOPE],undefined);assert.equal(base[p.STUDY_INDEX],2);assert.deepEqual(base.tree,{route:'model'});
 assert.equal(p.takeAtlasDetailReturn(s,{...base,[p.STUDY_INDEX]:3},detail,5,now+60000),null);
 assert.equal(p.takeAtlasDetailReturn(s,base,detail,4,now+60000).id,proof.id);
 assert.equal(p.takeAtlasDetailReturn(s,base,detail,4,now+60001),null);
 const clean=p.withoutStudyNavigation(base);assert.deepEqual(clean,{__NA:true,tree:{route:'model'}});
});

test('foreign, expired and invalidated reader proofs never authorize browser traversal',()=>{
 for(const make of [()=>({scope:detail.replace('side=-1','side=1')}),()=>({base:{}}),()=>({time:now+4*60*60*1000+1}),()=>({length:2})]){const c=accepted(),change=make();assert.equal(p.takeAtlasDetailReturn(c.s,change.base||c.base,change.scope||detail,change.length||4,change.time||now+200),null);}
 const c=accepted();p.clearAtlasDetailNavigation(c.s);assert.equal(p.takeAtlasDetailReturn(c.s,c.base,detail,4,now+300),null);
 const unavailable={getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()}};assert.equal(p.consumeAtlasDetailStamp(unavailable,detail,3,now),null);assert.equal(p.takeAtlasDetailReturn(unavailable,{},detail,3,now),null);
});

test('forward entries do not turn the second and third reader trips into false arrivals',()=>{
 for(const historyLength of [2,4,5,20]){const s=stamped(storage(),{historyLength});const proof=p.consumeAtlasDetailStamp(s,detail,3,now+100);assert.ok(proof);assert.equal(proof.departureLength,historyLength);}
 assert.equal(p.normalizedStudyScope('//outside.invalid/path'),null);assert.equal(p.normalizedStudyScope('/zhongyi/meridian/?acupoint=A%20B#x'),'/zhongyi/meridian?acupoint=A+B');
});
