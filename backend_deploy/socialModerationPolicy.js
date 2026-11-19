'use strict';
const crypto=require('node:crypto');
const {VERSION}=require('./studyModerationAutomation');
const {localFlags}=require('./studyCommentSafety');
/**
 * Social delivery must not depend on a third-party AI call, a consent version,
 * a quota or an extra user confirmation. Routes already apply their local text
 * validation; this adapter only records a hash-only audit and lets the message
 * continue. Reports and administrator removal remain available afterwards.
 */
function createSelectedTextModerator({audit}){
 return async function moderate(content,context={}){
  const held=reason=>({status:'pending',reason,model:'platform-local'});
  if(typeof content!=='string'||!content.trim())return held('本次文字无效，保持隔离');
  if(!context.userId)return held('无法核验提交账号，保持隔离');
  const fingerprint=crypto.createHash('sha256').update(content).digest('hex');
  const flags=localFlags(content);
  if(flags.length){
   try{await audit({userId:String(context.userId),contentHash:fingerprint,version:VERSION,status:'rejected'});}catch{}
   return {status:'rejected',reason:'文字包含平台禁止发布的敏感内容，请修改后再发送',model:'platform-local'};
  }
  try{await audit({userId:String(context.userId),contentHash:fingerprint,version:VERSION,status:'active'});}catch{}
  return {status:'active',reason:'已通过平台基础文字校验',model:'platform-local'};
 };
}
module.exports={createSelectedTextModerator};
