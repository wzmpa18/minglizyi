"use client";
import {getUserToken} from './auth';
export const SOCIAL_MODERATION_VERSION='public-moderation-20261019-v1';
export interface SocialReviewPreview {id:string;text:string;scope:'公开学习交流'|'定向学习交流'|'学习群资料';}
let pending:{preview:SocialReviewPreview;resolve:(value:boolean)=>void}|null=null;
const listeners=new Set<()=>void>();
export const socialReviewSnapshot=()=>pending?.preview||null;
export const subscribeSocialReview=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export function finishSocialReview(accepted:boolean){const active=pending;pending=null;listeners.forEach(fn=>fn());active?.resolve(accepted);}
/** One visible, per-send consent; neither local diaries nor account identity are
 * read. A cancel/auth switch ends this request without making a network call. */
export async function consentForSocialText(text:string,scope:SocialReviewPreview['scope']){
 if(!text.trim())throw Error('请先填写拟发送的文字');
 if(pending)throw Error('请先处理当前文字发送确认');
 const token=getUserToken();if(!token)throw Error('请先登录');
 const accepted=await new Promise<boolean>(resolve=>{pending={preview:{id:crypto.randomUUID(),text,scope},resolve};listeners.forEach(fn=>fn());});
 if(!accepted)throw Error('已取消发送，未交给第三方机器审核');
 if(token!==getUserToken())throw Error('账号已切换，请重新核对拟发送文字');
 return SOCIAL_MODERATION_VERSION;
}
