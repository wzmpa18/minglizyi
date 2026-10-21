'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {validateStudyCatalog,MAX_CATALOG_BYTES}=require('./studyContentPolicy');
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
function createStudyContentStore(file){
 function read(){const info=fs.lstatSync(file);if(!info.isFile()||info.isSymbolicLink()||info.size>MAX_CATALOG_BYTES)throw Error('课程包不可读取');const raw=fs.readFileSync(file),catalog=JSON.parse(raw),result=validateStudyCatalog(catalog);if(!result.ok)throw Error('课程包校验失败');return {catalog,raw,sha256:digest(raw)};}
 function publish(catalog,expectedRevision,reviewed){
  const valid=validateStudyCatalog(catalog);if(!valid.ok){const error=Error(valid.errors.join('；'));error.status=400;throw error;}
  if(reviewed!==true){const error=Error('请核对正文、题目解析和原创/来源许可后再发布');error.status=400;throw error;}
  const raw=Buffer.from(JSON.stringify(catalog,null,2)+'\n');if(raw.length>MAX_CATALOG_BYTES){const error=Error('课程包超过2MB');error.status=400;throw error;}
  const lock=file+'.lock';let handle;
  try{handle=fs.openSync(lock,'wx',0o600);}catch{const error=Error('另一个发布正在进行，请刷新后核对');error.status=409;throw error;}
  try{
   const old=read();if(expectedRevision!==old.catalog.revision||catalog.revision!==expectedRevision+1){const error=Error('资料已更新，请重新读取后合并修改');error.status=409;throw error;}
   fs.writeFileSync(file+'.previous',old.raw,{mode:0o600});
   const pending=file+'.next';let pendingHandle,owned=false;
   try{pendingHandle=fs.openSync(pending,'wx',0o600);owned=true;fs.writeFileSync(pendingHandle,raw);fs.fsyncSync(pendingHandle);fs.closeSync(pendingHandle);pendingHandle=undefined;fs.renameSync(pending,file);owned=false;}
   finally{if(pendingHandle!==undefined)fs.closeSync(pendingHandle);if(owned)fs.unlinkSync(pending);}
   const audit={revision:catalog.revision,previousRevision:old.catalog.revision,sha256:digest(raw),lessons:catalog.lessons.length,publishedAt:new Date().toISOString(),review:'editor checked original/source rights; not medical professional certification'};
   // Bounded operational evidence. No keys, user records or private content.
   let history=[];try{history=JSON.parse(fs.readFileSync(file+'.audit.json','utf8'));if(!Array.isArray(history))history=[];}catch{}
   fs.writeFileSync(file+'.audit.json',JSON.stringify([...history.slice(-99),audit],null,2)+'\n',{mode:0o600});
   return {...read(),audit};
  }finally{fs.closeSync(handle);fs.unlinkSync(lock);}
 }
 return {read,publish};
}
module.exports={createStudyContentStore};
