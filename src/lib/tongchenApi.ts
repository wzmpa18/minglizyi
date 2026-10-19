"use client";
import {consentForSocialText} from "./socialModerationConsent";
import {getUserToken} from "./auth";
import {clientPlatformHeaders} from "./platformGate";
export interface TongchenCard{id:string;nickname:string;interests:string[];ruleVersion:string;requestId?:number;schoolLabel?:string;schoolSelfReported?:boolean;}
export interface TongchenConfig{enabled:boolean;name:string;consentVersion:string;ruleVersion:string;searchPerDay:number;requestsPerDay:number;interests:string[];}
export interface TongchenResult{success:boolean;error?:string;message?:string;config?:TongchenConfig;joined?:boolean;schoolName?:string;schoolYear?:number|string;modes?:string[];interests?:string[];acceptRequests?:boolean;items?:TongchenCard[];incoming?:TongchenCard[];friends?:TongchenCard[];status?:string;}
export async function tongchenRequest<T=TongchenResult>(path:string,method="GET",body?:unknown):Promise<T>{
 try{if(method==='POST'&&/^\/peer\/[\w-]+\/messages$/.test(path)&&body&&typeof body==='object'){const content=(body as {content?:unknown}).content;if(typeof content!=='string')throw Error('仅支持文字交流');body={...body,moderationVersion:await consentForSocialText(content,'定向学习交流')};}const token=getUserToken(),res=await fetch(`/api/social/tongchen${path}`,{method,headers:{"Content-Type":"application/json",...clientPlatformHeaders(),...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});const data=await res.json();return (res.ok?data:{success:false,error:data.error||`请求未完成（${res.status}）`}) as T;}catch(error){return {success:false,error:error instanceof Error?error.message:"网络暂不可用，请稍后重试；尚未确认操作成功"} as T;}
}
