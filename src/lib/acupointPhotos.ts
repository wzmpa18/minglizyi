import bundled from "../../public/assets/acupoint-photos/MANIFEST.json";

export interface AcupointPhoto {id:string;codes:string[];title:string;file:string;author:string;license:string;licenseUrl:string;sourceUrl:string;caption:string;kind:"real-photo";changes:string;clinicalReviewed:boolean;bytes:number;sha256:string}
export interface PhotoManifest {schemaVersion:1;revision:number;records:AcupointPhoto[]}
export const PHOTO_ORIGIN="https://yandaoguoxue.yandao.vip";
export const PHOTO_PREFIX="/assets/acupoint-photos/";
const text=(s:unknown,max:number)=>typeof s==="string"&&s.length>0&&s.length<=max;
const trustedSource=(s:unknown)=>typeof s==="string"&&/^https:\/\/(commons\.wikimedia\.org|www\.frontiersin\.org)\//.test(s);
export function validatePhotoManifest(value:unknown):PhotoManifest {
 const m=value as PhotoManifest;
 if(!m||m.schemaVersion!==1||!Number.isSafeInteger(m.revision)||m.revision<1||!Array.isArray(m.records)||m.records.length>1000)throw Error("Invalid photo manifest");
 const ids=new Set<string>();
 for(const p of m.records){
  if(!p||!text(p.id,100)||ids.has(p.id)||!Array.isArray(p.codes)||!p.codes.length||p.codes.length>30||p.codes.some(c=>!/^((LU|LI|ST|SP|HT|SI|BL|KI|PC|TE|GB|LR|GV|CV)\d{1,2}|EX-HN3)$/.test(c))||!/^[-a-z0-9]+\.(jpg|jpeg|png|webp)$/.test(p.file)||!text(p.title,150)||!text(p.author,500)||!text(p.caption,3000)||!text(p.changes,500)||!trustedSource(p.sourceUrl)||!/^https:\/\/creativecommons\.org\/licenses\/(by|by-sa)\/(3\.0|4\.0)\/$/.test(p.licenseUrl)||!text(p.license,50)||p.kind!=="real-photo"||typeof p.clinicalReviewed!=="boolean"||!Number.isSafeInteger(p.bytes)||p.bytes<100||p.bytes>20_000_000||!/^[a-f0-9]{64}$/.test(p.sha256))throw Error("Invalid photo provenance");
  ids.add(p.id);
 }
 return m;
}
export const BUNDLED_PHOTOS=validatePhotoManifest(bundled);
let pending:Promise<PhotoManifest>|undefined;
/** Remote updates are bounded photo metadata, never HTML, code, purchases or permissions. */
export function loadPhotoManifest():Promise<PhotoManifest>{
 if(!pending)pending=(async()=>{
  const control=new AbortController(),timer=setTimeout(()=>control.abort(),5000);
  try{const r=await fetch(PHOTO_ORIGIN+PHOTO_PREFIX+"MANIFEST.json",{cache:"no-cache",credentials:"omit",signal:control.signal});if(!r.ok)throw Error("Unavailable");const raw=await r.text();if(raw.length>1_000_000)throw Error("Oversize");const m=validatePhotoManifest(JSON.parse(raw));return m.revision>=BUNDLED_PHOTOS.revision?m:BUNDLED_PHOTOS;}catch{return BUNDLED_PHOTOS;}finally{clearTimeout(timer);}
 })();
 return pending;
}
