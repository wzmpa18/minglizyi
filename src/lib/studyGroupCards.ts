"use client";
import {getUserToken} from './auth';
import {clientPlatformHeaders} from './platformGate';
import type {LiveSnapshot} from './liveCharts';
export interface GroupCard {
 id:string;mine:boolean;ownerName:string;expiresAt:number;titles?:string[];
 charts?:LiveSnapshot[];permissions?:{view:boolean;archive:boolean;export:boolean;reshare:false;externalAI:false};
}
export interface GroupCardResult extends Partial<GroupCard> {
 success:boolean;error?:string;message?:string;items?:GroupCard[];nextCursor?:string;
}
/** Only explicit projected chart copies; never imports the private life vault. */
export async function groupCardRequest(group:string,path='',method='GET',body?:unknown):Promise<GroupCardResult>{
 if(!/^\d{1,16}$/.test(group))return {success:false,error:'学习群编号无效'};
 const token=getUserToken();if(!token)return {success:false,error:'请先登录原获准的群成员账号'};
 try{
  const response=await fetch(`/api/social/groups/${group}/cards${path}`,{method,headers:{'Content-Type':'application/json',...clientPlatformHeaders(),Authorization:`Bearer ${token}`},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  const data=await response.json();return response.ok?data:{success:false,error:data.error||`盘卡读取未完成（${response.status}）`};
 }catch{return {success:false,error:'授权盘卡暂不可用，未确认送达，请手动重试'};}
}
