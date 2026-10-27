import type {NoticeContext,NoticeItem} from '../../backend_deploy/announcementPolicy';
import {eligibleNotice} from '../../backend_deploy/announcementPolicy';
interface Store {getItem(key:string):string|null;setItem(key:string,value:string):void}
const KEY='yandao_notice_display_v1';
const DAY=86400000;
interface State {lastPopupAt:number;dismissed:string[]}
const id=(item:NoticeItem,context:NoticeContext)=>`${context.channel}:${item.id}:${item.revision}`;
function read(store:Store):State {const value=JSON.parse(store.getItem(KEY)||'{"lastPopupAt":0,"dismissed":[]}');if(!Number.isFinite(value.lastPopupAt)||!Array.isArray(value.dismissed)||value.dismissed.some((x:unknown)=>typeof x!=='string'))throw Error('NOTICE_STORAGE_INVALID');return value;}
export function startupNotice(items:unknown[],context:NoticeContext,store:Store,now=Date.now()):NoticeItem|null {
 try {const state=read(store);if(state.lastPopupAt>now || now-state.lastPopupAt<DAY)return null;
  return items.find((item):item is NoticeItem=>eligibleNotice(item,context,now)&&item.popup===true&&!state.dismissed.includes(id(item,context)))||null;
 } catch {return null;}
}
export function markNoticeShown(store:Store,now=Date.now()):boolean {try{const state=read(store);store.setItem(KEY,JSON.stringify({...state,lastPopupAt:now}));return true;}catch{return false;}}
export function rememberNotice(item:NoticeItem,context:NoticeContext,store:Store):void {try{const state=read(store),key=id(item,context);if(!state.dismissed.includes(key))store.setItem(KEY,JSON.stringify({...state,dismissed:[...state.dismissed,key].slice(-200)}));}catch{/* A blocked preference store must not block closing. */}}
