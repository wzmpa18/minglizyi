import type {Snapshot,CameraPose} from "./atlasState";
export interface AtlasReturnContext {
 schema:1; at:number; snapshot:Snapshot; pose:CameraPose|null;
 past:Snapshot[]; future:Snapshot[]; quickList:"meridians"|"points"|"closed";
 page:"tree"|"points"|"info"|"settings"|"tools"; panel:boolean; pinned:boolean;
 treeScroll:number; quickScroll:number; anatomy?:Snapshot|null;
 expanded?:string[]; limits?:Record<string,number>; query?:string; pointQuery?:string;
}
const PREFIX="yandao-atlas-return-v1:",LATEST=PREFIX+"latest",MAX_BYTES=400000,TTL=4*60*60*1000;
export const validAtlasToken=(token:unknown):token is string=>typeof token==="string"&&/^[a-f0-9]{32}$/.test(token);
export function newAtlasToken():string {const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return Array.from(bytes,n=>n.toString(16).padStart(2,"0")).join("");}
export function atlasReturnHref(token:string|null,pointName?:string,side=1):string {
 const q=new URLSearchParams();if(validAtlasToken(token))q.set("atlasReturn",token);
 if(pointName)q.set("pointName",pointName);if(side===-1)q.set("side","-1");
 return "/zhongyi/anatomy3d/"+(q.size?"?"+q.toString():"");
}
const poseValid=(p:unknown)=>p===null||!!p&&typeof p==="object"&&((p as CameraPose).aspect===undefined||typeof (p as CameraPose).aspect==="number"&&Number.isFinite((p as CameraPose).aspect)&&(p as CameraPose).aspect!>=.05&&(p as CameraPose).aspect!<=20)&&["position","target"].every(key=>{
 const values=(p as Record<string,unknown>)[key];return Array.isArray(values)&&values.length===3&&values.every(n=>typeof n==="number"&&Number.isFinite(n)&&Math.abs(n)<100);
});
const idsValid=(value:unknown)=>Array.isArray(value)&&value.length<5000&&value.every(x=>typeof x==="string"&&x.length<120);
const nullableId=(value:unknown)=>value===null||typeof value==="string"&&value.length<120;
const bounded=(value:unknown,min:number,max:number)=>typeof value==="number"&&Number.isFinite(value)&&value>=min&&value<=max;
const viewValid=(v:any):boolean=>!!v&&["visible","hidden","faded"].every(key=>idsValid(v[key]))&&
 (v.isolateIds===undefined||idsValid(v.isolateIds))&&["points","isolate","continuous"].every(key=>typeof v[key]==="boolean")&&
 ["flow","underwear"].every(key=>v[key]===undefined||typeof v[key]==="boolean")&&
 ["selected","point"].every(key=>nullableId(v[key]))&&(v.region===undefined||nullableId(v.region))&&
 typeof v.view==="string"&&v.view.length<64&&typeof v.meridian==="string"&&v.meridian.length<120&&
 ["reset","focus"].every(key=>Number.isSafeInteger(v[key])&&v[key]>=0&&v[key]<1e8)&&
 bounded(v.opacity,.15,1)&&bounded(v.explode,0,1)&&(v.section===null||bounded(v.section,0,1.7))&&
 (v.flowSpeed===undefined||bounded(v.flowSpeed,.25,2))&&(v.side===1||v.side===-1)&&(v.cameraRestore===undefined||poseValid(v.cameraRestore));
const snapshotValid=(s:any):boolean=>!!s&&viewValid(s.view)&&(s.isolation===null||viewValid(s.isolation));
export function readAtlasContext(storage:Pick<Storage,"getItem">,token:string|null,now=Date.now()):AtlasReturnContext|null {
 try {if(!validAtlasToken(token))return null;const raw=storage.getItem(PREFIX+token);if(!raw||raw.length>MAX_BYTES)return null;
  const c=JSON.parse(raw);if(c.schema!==1||!Number.isFinite(c.at)||now-c.at>TTL||c.at>now+60000||!snapshotValid(c.snapshot)||!poseValid(c.pose)||![c.past,c.future].every(a=>Array.isArray(a)&&a.length<=30&&a.every(snapshotValid))||!["meridians","points","closed"].includes(c.quickList)||!["tree","points","info","settings","tools"].includes(c.page)||![c.treeScroll,c.quickScroll].every(n=>Number.isFinite(n)&&n>=0&&n<1e7)||typeof c.panel!=="boolean"||typeof c.pinned!=="boolean")return null;
  if(c.anatomy!==undefined&&c.anatomy!==null&&!snapshotValid(c.anatomy))return null;
  if(c.expanded!==undefined&&(!Array.isArray(c.expanded)||c.expanded.length>5000||c.expanded.some((id:unknown)=>typeof id!=="string"||id.length>120)))return null;
  if(c.limits!==undefined&&(!c.limits||typeof c.limits!=="object"||Array.isArray(c.limits)||Object.keys(c.limits).length>5000||Object.values(c.limits).some(n=>!Number.isInteger(n)||Number(n)<0||Number(n)>100000)))return null;
  if([c.query,c.pointQuery].some(value=>value!==undefined&&(typeof value!=="string"||value.length>300)))return null;return c;
 }catch{return null;}
}
export function latestAtlasToken(storage:Pick<Storage,"getItem">):string|null {try{const value=storage.getItem(LATEST);return validAtlasToken(value)?value:null;}catch{return null;}}
export function saveAtlasContext(storage:Pick<Storage,"getItem"|"setItem"|"removeItem">,token:string,context:AtlasReturnContext):boolean {
 try{if(!validAtlasToken(token))return false;const raw=JSON.stringify(context);if(raw.length>MAX_BYTES||!readAtlasContext({getItem:()=>raw},token,context.at))return false;
  const previous=latestAtlasToken(storage);storage.setItem(PREFIX+token,raw);storage.setItem(LATEST,token);
  if(previous&&previous!==token)storage.removeItem(PREFIX+previous);return true;
 }catch{return false;}
}
