'use client';
import type {NiCourse,NiCourseChapter} from './niTeacherCourses';
import type {NiSourceAnchor} from './niLessonStudy';
import {verifyNiSourceAnchor,redactNiPrivateContacts} from './niLessonStudy';
import {readOfflineFileStrict,writeOfflineFile} from './durableOfflineStore';

export interface NiPersonalNote {text:string;updatedAt:number;userNoteRevision:number;courseRevision?:string;chapterSha256?:string;sourceSnapshot?:string;previousSources?:{courseRevision:string;chapterSha256:string;sourceSnapshot:string}[]}
export interface NiAnnotation {id:string;anchor:NiSourceAnchor;comment:string;createdAt:number}
export interface NiBookmark {courseId:string;chapterId:string;title:string;courseRevision:string;savedAt:number}
const userKey=(scope:string)=>{if(!/^[A-Za-z0-9_-]{1,100}$/.test(scope))throw Error('当前账号空间尚未就绪');return scope;};
const chapterKey=(id:string)=>{if(!/^[a-z0-9-]{1,120}$/.test(id))throw Error('课程章节编号无效');return id;};
export const niNoteStorageKey=(scope:string,chapterId:string)=>'ni-note-'+userKey(scope)+'-'+chapterKey(chapterId);
const markKey=(scope:string,chapterId:string)=>'ni-annotations-'+userKey(scope)+'-'+chapterKey(chapterId);
const bookmarksKey=(scope:string)=>'ni-bookmarks-'+userKey(scope);
function validNote(row:NiPersonalNote){return !!row&&typeof row.text==='string'&&row.text.length<=20000&&Number.isFinite(row.updatedAt)&&(row.userNoteRevision===undefined||(Number.isSafeInteger(row.userNoteRevision)&&row.userNoteRevision>=0));}
export async function readNiPersonalNote(scope:string,chapterId:string):Promise<NiPersonalNote|null>{
 const row=await readOfflineFileStrict<NiPersonalNote>(niNoteStorageKey(scope,chapterId));if(row===null)return null;if(!validNote(row))throw Error('已有笔记格式无法核实，暂不覆盖');return {...row,userNoteRevision:row.userNoteRevision||0};
}
export async function saveNiPersonalNote(scope:string,course:NiCourse,chapter:NiCourseChapter,text:string,expectedRevision:number):Promise<NiPersonalNote>{
 if(typeof text!=='string'||text.length>20000)throw Error('笔记超出长度范围');
 const key=niNoteStorageKey(scope,chapter.id),previous=await readNiPersonalNote(scope,chapter.id);
 if((previous?.userNoteRevision||0)!==expectedRevision)throw Error('本机笔记已在其他页面更新，请先复制当前文字再重新读取');
 const previousSources=[...(previous?.previousSources||[])];
 if(previous?.chapterSha256&&previous.chapterSha256!==chapter.sha256&&previous.sourceSnapshot&&previous.courseRevision&&!previousSources.some(row=>row.chapterSha256===previous.chapterSha256))previousSources.push({courseRevision:previous.courseRevision,chapterSha256:previous.chapterSha256,sourceSnapshot:previous.sourceSnapshot});
 const row:NiPersonalNote={text,updatedAt:Date.now(),userNoteRevision:expectedRevision+1,courseRevision:course.version,chapterSha256:chapter.sha256,sourceSnapshot:chapter.content,previousSources:previousSources.slice(-5)};
 await writeOfflineFile(key,row);if(JSON.stringify(await readOfflineFileStrict(key))!==JSON.stringify(row))throw Error('笔记保存读回尚未完成');return row;
}
export async function readNiAnnotations(scope:string,chapterId:string):Promise<NiAnnotation[]>{
 const rows=await readOfflineFileStrict<NiAnnotation[]>(markKey(scope,chapterId));if(rows===null)return [];
 if(!Array.isArray(rows)||rows.length>100||rows.some(row=>!row||typeof row.comment!=='string'||row.comment.length>2000||typeof row.anchor?.quote!=='string'||row.anchor.quote.length>15000||!Number.isFinite(row.createdAt)))throw Error('已有批注无法核实，暂不覆盖');return rows;
}
export async function addNiAnnotation(scope:string,course:NiCourse,chapter:NiCourseChapter,anchor:NiSourceAnchor,comment:string):Promise<NiAnnotation[]>{
 if(!verifyNiSourceAnchor(anchor,course,chapter)||typeof comment!=='string'||comment.length>2000)throw Error('批注的原文定位已变化，请从当前课节重新摘录');
 const rows=await readNiAnnotations(scope,chapter.id);if(rows.length>=100)throw Error('本节已有100条批注，请先导出保存');
 const now=Date.now(),row:NiAnnotation={id:chapter.id+'-'+now+'-'+rows.length,anchor,comment,createdAt:now};
 const next=[...rows,row],key=markKey(scope,chapter.id);await writeOfflineFile(key,next);if(JSON.stringify(await readOfflineFileStrict(key))!==JSON.stringify(next))throw Error('批注保存读回尚未完成');return next;
}
export async function readNiBookmarks(scope:string):Promise<NiBookmark[]>{
 const rows=await readOfflineFileStrict<NiBookmark[]>(bookmarksKey(scope));if(rows===null)return [];
 if(!Array.isArray(rows)||rows.length>2000||rows.some(row=>!row||typeof row.courseId!=='string'||typeof row.chapterId!=='string'||typeof row.title!=='string'))throw Error('已有收藏无法核实，暂不覆盖');return rows;
}
export async function setNiBookmark(scope:string,course:NiCourse,chapter:NiCourseChapter,enabled:boolean){
 const rows=(await readNiBookmarks(scope)).filter(row=>row.chapterId!==chapter.id);
 if(enabled){if(rows.length>=2000)throw Error('收藏已达上限');rows.push({courseId:course.id,chapterId:chapter.id,title:chapter.title,courseRevision:course.version,savedAt:Date.now()});}
 await writeOfflineFile(bookmarksKey(scope),rows);if(JSON.stringify(await readOfflineFileStrict(bookmarksKey(scope)))!==JSON.stringify(rows))throw Error('收藏保存尚未完成');return rows;
}
export function exportNiPersonalStudy(course:NiCourse,chapter:NiCourseChapter,note:NiPersonalNote|null,annotations:NiAnnotation[]){
 const exportedNote=note?{...note,sourceSnapshot:note.sourceSnapshot?redactNiPrivateContacts(note.sourceSnapshot):undefined,previousSources:note.previousSources?.map(row=>({...row,sourceSnapshot:redactNiPrivateContacts(row.sourceSnapshot)}))}:null;
 return {schema:'yandao.private.ni-study-export.v1',exportedAt:new Date().toISOString(),course:{id:course.id,title:course.title,version:course.version,sourceFile:course.source.filename,sourceSha256:course.source.sha256},chapter:{id:chapter.id,title:chapter.title,sha256:chapter.sha256},sourceSnapshotsContactRedacted:true,note:exportedNote,annotations};
}
