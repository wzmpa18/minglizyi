'use strict';
const crypto=require('node:crypto');
const {VERSION}=require('./studyModerationAutomation');
/** This adapter is only for an explicitly sent collaboration/public text copy.
 * Never pass a private vault/health object, JWT or raw request to the model. */
function createSelectedTextModerator({screen,audit}){
 return async function moderate(content,context={}){
  const held=reason=>({status:'pending',reason,model:'tencent-tokenhub-hy3'});
  if(typeof content!=='string'||!content.trim())return held('本次文字无效，保持隔离');
  if(context.moderationVersion!==VERSION)return held('尚未取得本次文字的第三方审核授权，保持隔离；请更新客户端重新确认');
  if(!context.userId)return held('无法核验提交账号，保持隔离');
  try{
   const result=await screen({content,displayName:'学习者',moderationVersion:VERSION});
   const fingerprint=crypto.createHash('sha256').update(content).digest('hex');
   const trusted=result?.policyVersion===VERSION&&result?.fingerprint===fingerprint;
   const status=trusted&&result.decision==='BLOCK'?'rejected':trusted&&result.decision==='PASS'&&result.automatic===true&&Array.isArray(result.flags)&&result.flags.length===0?'active':'pending';
   await audit({userId:String(context.userId),contentHash:fingerprint,version:VERSION,status});
   return {status,reason:status==='active'?'规则与机器审核通过':status==='rejected'?'文字检出风险，请修改或通过用户反馈申请复核':'审核未能可靠判定，保持隔离；可修改或申请复核',model:'tencent-tokenhub-hy3'};
  }catch{return held('审核服务或审计暂不可用，保持隔离；未直接发布');}
 };
}
module.exports={createSelectedTextModerator};
