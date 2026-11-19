'use strict';
// Fast, local-only social text filtering. No text is sent to a third-party AI,
// there is no per-send consent UI, quota, timeout or external-review queue.
const crypto=require('node:crypto');
const {validateStudyText}=require('./studyCommentPolicy');
const {localFlags}=require('./studyCommentSafety');
const VERSION='local-social-filter-20261119-v1';
const digest=value=>crypto.createHash('sha256').update(String(value)).digest('hex');

function automationCapability(){
 return {
  configured:true,
  automatic:true,
  provider:'platform-local',
  providerName:'平台本地敏感词规则',
  consentVersion:VERSION,
  privacyUrl:'',
  dailyLimit:0,
  manualReviewRequired:false,
  exceptionsHeld:false,
 };
}

function createAutomaticModerator(_db){
 async function screen(input){
  const content=typeof input?.content==='string'?input.content:'';
  const displayName=typeof input?.displayName==='string'?input.displayName:'学习者';
  const fingerprint=digest(content);
  const flags=localFlags(content+' '+displayName);
  const base={fingerprint,provider:'platform-local',flags,policyVersion:VERSION,automatic:true};
  for(const raw of [content,displayName]){
   const text=String(raw).normalize('NFKC').replace(/[\s\u200b-\u200f\ufeff]/g,'');
   const validation=validateStudyText(text);
   if(!validation.ok||/\b\d{17}[\dXx]\b|(?:姓名|住址|地址|病案号|身份证)[:：]/.test(text)){
    return {...base,decision:'BLOCK',automatic:false,reason:validation.error||'文字包含个人隐私或不支持的内容'};
   }
  }
  if(flags.length)return {...base,decision:'BLOCK',automatic:false,reason:'文字包含平台禁止发布的敏感内容，请修改后再发送'};
  return {...base,decision:'PASS',reason:'已通过平台本地敏感词过滤'};
 }
 return {screen,capability:automationCapability};
}

module.exports={VERSION,automationCapability,createAutomaticModerator};
