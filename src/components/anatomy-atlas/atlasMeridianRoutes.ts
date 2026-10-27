import routeData from "../../data/atlasClassicalRoutes.json";
import type {Dataset,Surface} from "./atlasPack";

type Position=number[];
export interface RouteStudyMetadata {id:string;name:string;routeKind:"classical-surface-schematic";description:string;omitted:string;sourceBookId:string;sourceChapterId:string;sourceChapterTitle:string;sourceUrl:string;anchorCodes:string[];professionallyCalibrated:boolean;additionalSources?:{name:string;url:string;scope:string}[]}
export const EXTRAORDINARY_ROUTES=routeData.routes as RouteStudyMetadata[];
export const routeStudyMetadata=(id:string|null|undefined)=>EXTRAORDINARY_ROUTES.find(route=>route.id===id);
export const EXTRAORDINARY_COLORS:Record<string,string>={CHONG:"#e87494",DAI:"#4dd9bd",YIN_WEI:"#b19aff",YANG_WEI:"#f0bc6a",YIN_QIAO:"#67b9f0",YANG_QIAO:"#e783d7"};
export const MERIDIAN_RENDER_CLEARANCE=.0015;
export const MERIDIAN_DASH_PERIOD=.034;
export const MERIDIAN_DASH_FILL=.72;
type Projected={position:Position;normal:Position;projectionDistance:number};
type RouteDataset=Pick<Dataset,"version"|"atlas"|"surface"|"verifiedFiles"|"routeDerivation">;
type RouteDerivation=typeof routeData;
export interface MeridianRenderPath {id:string;positions:Float32Array;distances:Float32Array;routeKind:"original-surface"|"classical-surface-schematic";sourcePathIndex?:number}
const offset=(p:Position,n:Position)=>p.map((value,i)=>value+n[i]*MERIDIAN_RENDER_CLEARANCE);
const distance=(a:Position,b:Position)=>Math.hypot(...a.map((value,i)=>value-b[i]));

/** The original surface is immutable; the pinned derivation is only used when
 * every source path agrees with its exact original Float64 coordinate signature. */
export function surfacePathSignature(values:number[]):string {
 const bytes=new Uint8Array(8),view=new DataView(bytes.buffer);let hash=2166136261;
 for(const value of values){view.setFloat64(0,value,true);for(const byte of bytes)hash=Math.imul(hash^byte,16777619)>>>0;}
 return hash.toString(16).padStart(8,"0");
}
export function validateRouteDerivation(value:unknown,data:RouteDataset):value is RouteDerivation {
 if(!value||typeof value!=="object")return false;const v=value as RouteDerivation;
 const finite=(n:unknown,max=3)=>typeof n==="number"&&Number.isFinite(n)&&Math.abs(n)<=max;
 const vector=(p:unknown)=>Array.isArray(p)&&p.length===3&&p.every(n=>finite(n));
 const normal=(p:unknown)=>vector(p)&&Math.abs(Math.hypot(...p as number[])-1)<.02;
 const text=(s:unknown,max=2000)=>typeof s==="string"&&s.length>0&&s.length<=max;
 const safeId=(s:unknown)=>typeof s==="string"&&/^[a-z0-9-]{1,100}$/.test(s);
 const ids=new Set(["CHONG","DAI","YIN_WEI","YANG_WEI","YIN_QIAO","YANG_QIAO"]),skin=data.atlas.parts.find(part=>part.id==="FJ2810");
 if(v.schema!=="yandao.atlas.classical-surface-routes.v1"||!skin||skin.vertexCount!==v.sourceSkinVertexCount||skin.indexCount!==v.sourceSkinIndexCount||!data.atlas.chunks[skin.chunk]||data.atlas.chunks[skin.chunk].url!==v.sourceSkinChunkUrl||!/^[a-f0-9]{64}$/.test(v.sourceSkinChunkSha256)||data.verifiedFiles?.[v.sourceSkinChunkUrl]!==v.sourceSkinChunkSha256)return false;
 if(!Array.isArray(v.routes)||v.routes.length!==6||new Set(v.routes.map(r=>r?.id)).size!==6||v.routes.some(r=>!r||!ids.has(r.id)||r.routeKind!=="classical-surface-schematic"||r.professionallyCalibrated!==false||![r.name,r.description,r.omitted,r.sourceChapterTitle].every(s=>text(s))||!safeId(r.sourceBookId)||!safeId(r.sourceChapterId)||!text(r.sourceUrl,800)||!Array.isArray(r.anchorCodes)||r.anchorCodes.length>80||r.anchorCodes.some(code=>typeof code!=="string"||!/^[A-Z]{2}[0-9]{1,2}\+?$/.test(code))))return false;
 if(data.surface.paths.length!==26||!Array.isArray(v.sourcePathSignatures)||v.sourcePathSignatures.length!==data.surface.paths.length||!Array.isArray(v.sourcePathRendering)||v.sourcePathRendering.length!==data.surface.paths.length)return false;
 for(let index=0;index<data.surface.paths.length;index++){const path=data.surface.paths[index],render=v.sourcePathRendering[index];if(!Array.isArray(path.vertices)||v.sourcePathSignatures[index]!==surfacePathSignature(path.vertices as number[])||!render||render.id!==String(path.id||path.meridianId||"")||!Array.isArray(render.positions)||render.positions.length!==path.vertices.length||!Array.isArray(render.normals)||render.normals.length!==path.vertices.length||!Array.isArray(render.projectionDistances)||render.projectionDistances.length!==path.vertices.length/3||!render.positions.every(n=>finite(n))||!render.normals.every(n=>finite(n,1.01))||!render.projectionDistances.every(n=>finite(n,.1)&&n>=0))return false;}
 let total=0;const curve=(p:{points:unknown;normals:unknown})=>{if(!p||!Array.isArray(p.points)||p.points.length<2||p.points.length>2048||!Array.isArray(p.normals)||p.normals.length!==p.points.length)return false;total+=p.points.length;return p.points.every(vector)&&p.normals.every(normal);};
 if(!Array.isArray(v.paths)||v.paths.length>300||v.paths.some(p=>!ids.has(p.id)||!curve(p)))return false;
 if(!Array.isArray(v.sourceGapRepairs)||v.sourceGapRepairs.length>64||v.sourceGapRepairs.some(p=>{if(!p||p.id!=="LI"||p.routeKind!=="source-gap-surface-repair"||p.professionallyCalibrated!==false||!Number.isInteger(p.sourcePathIndex)||!Number.isInteger(p.beforeSegment)||p.beforeSegment<1||!finite(p.originalGap,.065)||p.originalGap<=0||!curve(p))return true;const source=data.surface.paths[p.sourcePathIndex],values=source?.vertices as number[]|undefined,i=p.beforeSegment*6;return !values||String(source.id||source.meridianId)!=="LI"||i>=values.length||Math.abs(distance(values.slice(i-3,i),values.slice(i,i+3))-p.originalGap)>.00001;}))return false;
 const originals=new Map(data.surface.points.map(point=>[point.key,point.target.position]));
 const targets=v.pointRendering as Record<string,Projected>;if(!targets||typeof targets!=="object"||Array.isArray(targets)||Object.keys(targets).length>1000||Object.entries(targets).some(([key,p])=>!/^[A-Z]{2}[0-9]{1,2}\+?:-?1$/.test(key)||!p||!vector(p.position)||!normal(p.normal)||!finite(p.projectionDistance,.1)||p.projectionDistance<0||!originals.has(key)||Math.abs(distance(originals.get(key)!,p.position)-p.projectionDistance)>.00001))return false;
 return total<=50000;
}
function routeDerivationFor(data:RouteDataset):RouteDerivation|undefined {
 // The optional value is supplied only by decodeAtlas after manifest SHA checks.
 // Its content version may change while the anatomical chunk remains identical.
 if(data.verifiedFiles?.["classical-surface-routes.json"]&&validateRouteDerivation(data.routeDerivation,data))return data.routeDerivation;
 return validateRouteDerivation(routeData,data)?routeData:undefined;
}
export function getAtlasRouteCatalogue(data:RouteDataset):RouteStudyMetadata[]{
 return (routeDerivationFor(data)?.routes||[]) as RouteStudyMetadata[];
}
export function compatibleRouteDerivation(data:RouteDataset):boolean {
 return !!routeDerivationFor(data);
}
export function renderPointTarget(key:string,original:Surface["points"][number]["target"],compatible:boolean,derivation?:RouteDerivation):{position:Position;normal:Position} {
 const projected=compatible?((derivation||routeData).pointRendering as Record<string,Projected>)[key]:undefined;
 // Conservative outer-skin projection is display only. The source position,
 // face index and normal remain unchanged in the dataset and source archive.
 const target=projected&&projected.projectionDistance<=.012?projected:original;
 return {position:offset(target.position,target.normal),normal:[...target.normal]};
}
export function buildAtlasMeridianPlan(data:RouteDataset):{compatible:boolean;paths:MeridianRenderPath[];derivation?:RouteDerivation;catalogue:RouteStudyMetadata[]} {
 const selected=routeDerivationFor(data),compatible=!!selected,derivedData=selected||routeData,paths:MeridianRenderPath[]=[],travel=new Map<string,number>();
 const append=(id:string,pairs:number[],kind:MeridianRenderPath["routeKind"],key:string,sourcePathIndex?:number)=>{
  if(pairs.length%6||!pairs.every(Number.isFinite))return;
  const distances:number[]=[];let at=travel.get(key)||0;
  for(let i=0;i<pairs.length;i+=6){distances.push(at);at+=distance(pairs.slice(i,i+3),pairs.slice(i+3,i+6));distances.push(at);}
  travel.set(key,at);paths.push({id,positions:new Float32Array(pairs),distances:new Float32Array(distances),routeKind:kind,sourcePathIndex});
 };
 data.surface.paths.forEach((path,index)=>{
  if(!Array.isArray(path.vertices))return;const original=path.vertices as number[],derived=compatible?derivedData.sourcePathRendering[index]:undefined,pairs:number[]=[];
  const repairs=compatible?derivedData.sourceGapRepairs.filter(repair=>repair.sourcePathIndex===index):[];
  for(let segment=0;segment<original.length/6;segment++){
   const repair=repairs.find(repair=>repair.beforeSegment===segment);
   if(repair)for(let j=0;j<repair.points.length-1;j++)pairs.push(...offset(repair.points[j],repair.normals[j]),...offset(repair.points[j+1],repair.normals[j+1]));
   for(let endpoint=0;endpoint<2;endpoint++){
    const i=segment*6+endpoint*3;
    // A distant endpoint is left at its source position, rather than dragging
    // an internal/uncertain source branch onto a visible body surface.
    pairs.push(...(derived&&derived.projectionDistances[i/3]<=.012?offset(derived.positions.slice(i,i+3),derived.normals.slice(i,i+3)):original.slice(i,i+3)));
   }
  }
  append(String(path.id||path.meridianId||""),pairs,"original-surface","original:"+index,index);
 });
 if(compatible)for(const path of derivedData.paths){const pairs:number[]=[];for(let i=0;i<path.points.length-1;i++)pairs.push(...offset(path.points[i],path.normals[i]),...offset(path.points[i+1],path.normals[i+1]));append(path.id,pairs,"classical-surface-schematic",path.id==="DAI"?"DAI:loop":path.id+":"+path.side);}
 return {compatible,paths,derivation:selected,catalogue:(selected?.routes||[]) as RouteStudyMetadata[]};
}
/** A one-pixel original LineBasicMaterial; movement changes only dash phase. */
export const meridianFlowFragment=`
float phase=fract(travelDistance/${MERIDIAN_DASH_PERIOD.toFixed(3)}-flowTime);
if(flowActive>0.5&&phase>${MERIDIAN_DASH_FILL.toFixed(2)})discard;
float leading=smoothstep(0.40,0.70,phase)*flowActive;
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0,0.9,0.4),leading*0.8);
`;
