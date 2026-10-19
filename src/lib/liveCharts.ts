"use client";
import {getUserToken} from "./auth";
import {clientPlatformHeaders} from "./platformGate";
import {snapshot as project} from "../../backend_deploy/liveChartPolicy";
export interface LiveSnapshot {schemaVersion:1;toolKey:string;title:string;version:string;adapterVersion:number;engineVersion:string;renderVersion:number;data:Record<string,any>;allowedLayers:string[];redaction:Record<string,boolean>;visiblePillars?:number[];inferenceNotice:string;}
export interface LiveMessage {id:string;authorId:string;author:string;mine:boolean;text:string;at:string;status:string;chartRefs:{version:string;anchor:string}[];}
export interface LiveResult {success:boolean;error?:string;message?:string;id?:string;url?:string;pending?:boolean;mine?:boolean;state?:string;ownerName?:string;peerName?:string;charts?:LiveSnapshot[];permissions?:{view:boolean;archive:boolean;reshare:boolean;export:boolean;externalAI:boolean};expiresAt?:number;items?:any[];nextAfter?:number;nextBefore?:number;status?:string;}
export const makeLiveSnapshot=(tool:string,result:Record<string,unknown>,showPillars=false,visiblePillars?:number[])=>project(tool as keyof typeof import('../../backend_deploy/liveChartPolicy').ADAPTERS,result,{showPillars,visiblePillars}) as unknown as LiveSnapshot;
/** Only explicitly projected SHARED_COLLABORATION objects can reach this endpoint.
 * PRIVATE_LOCAL originals/OCR/search/AI never import or call this client. */
export async function liveRequest(path:string,method="GET",body?:unknown):Promise<LiveResult>{
 try{const token=getUserToken();if(!token)return {success:false,error:"请先登录，私人本机记录无需登录"};const response=await fetch(`/api/social/live${path}`,{method,headers:{"Content-Type":"application/json",...clientPlatformHeaders(),Authorization:`Bearer ${token}`},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});const json=await response.json();return response.ok?json:{success:false,error:json.error||`操作失败（${response.status}）`};}catch{return {success:false,error:"网络暂不可用，尚未确认送达，请手动重试"};}
}
