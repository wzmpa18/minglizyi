export const STUDY_MARKER="__yandaoAtlasScene",STUDY_SCOPE="__yandaoStudyScope",STUDY_INDEX="__yandaoStudyIndex",ATLAS_MODEL_TOKEN="__yandaoAtlasContextToken",DETAIL_PROOF="__yandaoAtlasDetailProof";
const STAMP="yandao-atlas-detail-stamp-v1",ACTIVE="yandao-atlas-detail-proof-active-v1",ARRIVAL_TTL=15000,READING_TTL=4*60*60*1000;
type StorageLike=Pick<Storage,"getItem"|"setItem"|"removeItem">;
export interface OwnedStudyEntry {owner:string;scope:string;index:number}
interface DetailStamp {schema:1;id:string;at:number;token:string;detailScope:string;modelScope:string;modelOwner:string;modelIndex:number;departureLength:number}
export interface AtlasDetailProof extends DetailStamp {acceptedAt:number;detailIndex:number}
const token=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{32}$/.test(v);
const owner=(v:unknown):v is string=>typeof v==="string"&&/^[a-z0-9-]{8,100}$/.test(v);
const integer=(v:unknown,min=0)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<1e8;
const stateRecord=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
export function normalizedStudyScope(value:string):string|null {
 if(typeof value!=="string"||value.length>8000||!value.startsWith("/")||value.startsWith("//"))return null;
 const clean=value.split("#",1)[0],index=clean.indexOf("?"),path=(index<0?clean:clean.slice(0,index)).replace(/\/+$/,"")||"/",query=new URLSearchParams(index<0?"":clean.slice(index+1)).toString();return path+(query?"?"+query:"");
}
const pathOf=(scope:string)=>scope.split("?",1)[0];
export const isAtlasModelScope=(scope:string)=>pathOf(scope)==="/zhongyi/anatomy3d";
const detailMatches=(scope:string,value:string)=>{const q=new URLSearchParams(scope.split("?")[1]||"");return pathOf(scope)==="/zhongyi/meridian"&&!!q.get("acupoint")&&q.get("atlasReturn")===value;};
export function ownedStudyEntry(value:unknown,scope:string,length:number):OwnedStudyEntry|null {
 const s=stateRecord(value),key=normalizedStudyScope(scope);if(!key||!owner(s[STUDY_MARKER])||s[STUDY_SCOPE]!==key||!integer(s[STUDY_INDEX],1)||Number(s[STUDY_INDEX])>=length)return null;return{owner:s[STUDY_MARKER] as string,scope:key,index:s[STUDY_INDEX] as number};
}
export function atlasModelTokenFromState(value:unknown,scope:string,length:number):string|null {const s=stateRecord(value);return ownedStudyEntry(value,scope,length)&&token(s[ATLAS_MODEL_TOKEN])?s[ATLAS_MODEL_TOKEN] as string:null;}
export function clearAtlasDetailNavigation(storage:StorageLike){try{storage.removeItem(STAMP);storage.removeItem(ACTIVE);}catch{/* Unavailable private storage never authorizes history traversal. */}}
export function withoutStudyNavigation(value:unknown):Record<string,unknown> {const state={...stateRecord(value)};for(const key of [STUDY_MARKER,STUDY_SCOPE,STUDY_INDEX,ATLAS_MODEL_TOKEN,DETAIL_PROOF])delete state[key];return state;}
function validStamp(s:any):s is DetailStamp {return !!s&&s.schema===1&&token(s.id)&&token(s.token)&&Number.isFinite(s.at)&&owner(s.modelOwner)&&integer(s.modelIndex,1)&&integer(s.departureLength,2)&&s.departureLength>s.modelIndex&&typeof s.modelScope==="string"&&normalizedStudyScope(s.modelScope)===s.modelScope&&isAtlasModelScope(s.modelScope)&&typeof s.detailScope==="string"&&normalizedStudyScope(s.detailScope)===s.detailScope&&detailMatches(s.detailScope,s.token);}
/** A plain same-tab application Link calls this after saving its model context. */
export function stampAtlasDetail(storage:StorageLike,input:{token:string;detailHref:string;modelScope:string;state:unknown;historyLength:number},now=Date.now()):boolean {
 try{storage.removeItem(STAMP);storage.removeItem(ACTIVE);const modelScope=normalizedStudyScope(input.modelScope),detailScope=normalizedStudyScope(input.detailHref),entry=modelScope?ownedStudyEntry(input.state,modelScope,input.historyLength):null;if(!entry||!isAtlasModelScope(entry.scope)||!token(input.token)||stateRecord(input.state)[ATLAS_MODEL_TOKEN]!==input.token||!detailScope||!detailMatches(detailScope,input.token))return false;
  const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);const id=Array.from(bytes,n=>n.toString(16).padStart(2,"0")).join("");const stamp:DetailStamp={schema:1,id,at:now,token:input.token,detailScope,modelScope:entry.scope,modelOwner:entry.owner,modelIndex:entry.index,departureLength:input.historyLength};storage.setItem(STAMP,JSON.stringify(stamp));return true;
 }catch{return false;}
}
/** The expected depth uses the owned entry index, not raw history.length:
 * length also includes forward entries left by a prior return. */
export function consumeAtlasDetailStamp(storage:StorageLike,scope:string,historyLength:number,now=Date.now()):AtlasDetailProof|null {
 try{const raw=storage.getItem(STAMP);if(!raw)return null;storage.removeItem(STAMP);if(raw.length>16000)return null;const s=JSON.parse(raw);if(!validStamp(s)||s.detailScope!==normalizedStudyScope(scope)||now-s.at<0||now-s.at>ARRIVAL_TTL||historyLength!==s.modelIndex+2)return null;const proof:AtlasDetailProof={...s,acceptedAt:now,detailIndex:s.modelIndex+1};storage.setItem(ACTIVE,JSON.stringify(proof));return proof;}catch{return null;}
}
export function atlasDetailBaseState(value:unknown,proof:AtlasDetailProof):Record<string,unknown> {const state=withoutStudyNavigation(value);return {...state,[STUDY_INDEX]:proof.detailIndex,[DETAIL_PROOF]:proof};}
/** Only the proven detail base may make the second hop back to its model.
 * A child image or the detail sentinel is never that base. The proof is one-use. */
export function takeAtlasDetailReturn(storage:StorageLike,value:unknown,scope:string,length:number,now=Date.now()):AtlasDetailProof|null {
 try{const state=stateRecord(value),shown=state[DETAIL_PROOF] as AtlasDetailProof,raw=storage.getItem(ACTIVE);if(!raw||raw.length>16000||!shown)return null;const p=JSON.parse(raw) as AtlasDetailProof;
  if(!validStamp(p)||!Number.isFinite(p.acceptedAt)||p.acceptedAt<p.at||p.acceptedAt-p.at>ARRIVAL_TTL||now-p.at<0||now-p.at>READING_TTL||p.detailIndex!==p.modelIndex+1||state[STUDY_INDEX]!==p.detailIndex||length<=p.detailIndex||normalizedStudyScope(scope)!==p.detailScope||JSON.stringify(shown)!==JSON.stringify(p))return null;
  storage.removeItem(ACTIVE);return p;
 }catch{return null;}
}
