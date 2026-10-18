"use client";
import { getUserToken } from "./auth";
import { clientPlatformHeaders } from "./platformGate";
export { countStudyCharacters, validateStudyText, MAX_STUDY_CHARACTERS } from "../../backend_deploy/studyCommentPolicy";
export interface StudyComment { id:string; targetId:string; authorId:string; authorName:string; content:string; parentId:string|null; createdAt:string; pinned:boolean; evidenceUrl:string; }
export interface StudyCommentConfig { enabled:boolean; maxCharacters:number; reviewBeforePublish:boolean; contactUrl:string; schemaVersion:number; }
export interface StudyResult { success:boolean; error?:string; message?:string; pendingReview?:boolean; config?:StudyCommentConfig; comments?:StudyComment[]; items?:{id?:string;status?:string;userId?:string}[]; }
export async function studyRequest(path:string,method="GET",body?:unknown):Promise<StudyResult>{
  try {
    const token=getUserToken();
    const res=await fetch(`/api/study-comments${path}`,{method,headers:{"Content-Type":"application/json",...clientPlatformHeaders(),...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
    const result=await res.json();return res.ok?result:{success:false,error:result.error||`请求失败（${res.status}）`};
  }catch{return {success:false,error:"网络暂不可用，输入保留在本机；尚未发表"};}
}
