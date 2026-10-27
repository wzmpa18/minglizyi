export interface NoticeItem {
 schema:'yandao.notice.v1';id:string;revision:number;title:string;content:string;
 kind:'learning'|'service';publisher:'言道国学官方通知';purpose:'NOTICE_ONLY';
 level:'info'|'important'|'urgent';channels:string[];platforms:string[];
 minVersion:string;maxVersion:string;publishAt:string;expiresAt:string;
 popup:boolean;published:boolean;pinned:boolean;
 review:{status:'DRAFT'|'APPROVED';revision:number;reference:string;approvedAt:string|null;scope:'COMPANY_CONTENT_REVIEW'};
}
export interface NoticeContext {channel:string;platform:string;version:string}
export const SCHEMA:string;
export const CHANNELS:string[];
export const PLATFORMS:string[];
export const KINDS:string[];
export function compareVersion(a:string,b:string):number|null;
export function noticeError(value:unknown):string|null;
export function eligibleNotice(value:unknown,context:NoticeContext,now?:number):value is NoticeItem;
export function publicNotice(value:NoticeItem):NoticeItem;
