import type {Atlas,Part} from "./atlasPack";
import {regionAt,type Position3} from "./atlasInteraction";
export interface StructureUnit {id:string;name:string;zhName?:string;system:string;region:string;meshIds:string[];meshSystems:Record<string,string>;systems:string[];bounds:[number[],number[]];part:Part}
const ORGANS:Record<string,string>={heart:"cardiac",brain:"nervous",liver:"digestive",stomach:"digestive",spleen:"lymphatic",pancreas:"digestive","left lung":"respiratory","right lung":"respiratory","left kidney":"urinary","right kidney":"urinary","urinary bladder":"urinary",gallbladder:"digestive",prostate:"reproductive",duodenum:"digestive",jejunum:"digestive",ileum:"digestive",rectum:"digestive","ascending colon":"digestive","transverse colon":"digestive","descending colon":"digestive","sigmoid colon":"digestive"};
export function buildStructureIndex(atlas:Atlas){
 const parts=atlas.parts,partMap=new Map(parts.map(p=>[p.id,p])),concepts=new Map(atlas.concepts.map(c=>[c.id,c]));
 const byId=new Map<string,StructureUnit>(),meshToUnit=new Map<string,string>();
 const add=(id:string,members:Part[],system?:string)=>{if(!members.length)return;const c=concepts.get(id),first=members[0],bounds:[number[],number[]]=[[...first.bounds[0]],[...first.bounds[1]]];for(const p of members)for(let i=0;i<3;i++){bounds[0][i]=Math.min(bounds[0][i],p.bounds[0][i]);bounds[1][i]=Math.max(bounds[1][i],p.bounds[1][i]);}
  const center=bounds[0].map((n,i)=>(n+bounds[1][i])/2) as Position3;
  byId.set(id,{id,name:c?.name||first.name,zhName:c?.zhName||first.zhName,system:system||first.system,region:regionAt(center).id,meshIds:members.map(p=>p.id),meshSystems:Object.fromEntries(members.map(p=>[p.id,p.system])),systems:Array.from(new Set(members.map(p=>p.system))),bounds,part:first});
 };
 const direct=new Map<string,Part[]>();for(const p of parts){const c=concepts.get(p.conceptId),id=c?.elements.includes(p.id)?c.id:p.id;meshToUnit.set(p.id,id);const group=direct.get(id)||[];group.push(p);direct.set(id,group);}
 for(const [id,members] of direct)add(id,members);
 // Explicit source assemblies coexist with their substructures; source mesh totals never add them twice.
 for(const c of atlas.concepts)if(ORGANS[c.name.toLowerCase()]&&!byId.has(c.id))add(c.id,c.elements.flatMap(id=>partMap.has(id)?[partMap.get(id)!]:[]),ORGANS[c.name.toLowerCase()]);
 return {units:Array.from(byId.values()),byId,meshToUnit,parts,unitId:(id:string)=>meshToUnit.get(id)||id};
}
export type StructureIndex=ReturnType<typeof buildStructureIndex>;
export function unitStatus(u:StructureUnit,view:{visible:string[];hidden:string[];isolate:boolean;selected:string|null;isolateIds?:string[]}){const count=u.meshIds.filter(id=>!view.hidden.includes(id)&&(view.isolate?(view.isolateIds?view.isolateIds.includes(id):view.selected===u.id):view.visible.includes(u.meshSystems[id]||u.system))).length;return count===0?"hidden":count===u.meshIds.length?"visible":"partial";}
