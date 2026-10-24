export type AtlasGesture = "tap" | "double" | "long";
export type Position3 = [number,number,number];
export interface BodyRegion {id:string;name:string;min:Position3;max:Position3}
const region=(id:string,name:string,min:Position3,max:Position3):BodyRegion=>({id,name,min,max});
// Engineering observation boxes in the reference model's metre-based frame, not clinical boundaries.
export const BODY_REGIONS:BodyRegion[]=[
 region("head","头面部",[-.17,1.50,-.22],[.17,1.78,.22]),
 region("neck","颈部",[-.13,1.42,-.18],[.13,1.54,.18]),
 region("thorax","胸部",[-.18,1.20,-.25],[.18,1.46,.25]),
 region("abdomen","腹部",[-.19,1.00,-.25],[.19,1.27,.25]),
 region("pelvis","骨盆与髋部",[-.21,.83,-.25],[.21,1.04,.25]),
 ...([-1,1] as const).flatMap(side=>{
 const a=side===1?[.16,.42]:[-.42,-.16],b=side===1?[.005,.30]:[-.30,-.005];const name=side===1?"左":"右";
 return [region(`${side}-arm`,`${name}上肢`,[a[0],.75,-.25],[a[1],1.48,.25]),region(`${side}-leg`,`${name}下肢`,[b[0],-.08,-.28],[b[1],.95,.28])];
 })
];
export function regionAt([x,y]:Position3):BodyRegion {
 const id=y>1.50?"head":Math.abs(x)>.18&&y>.83?`${x>0?1:-1}-arm`:y>1.42?"neck":y>=1.20?"thorax":y>1.00?"abdomen":y>.83?"pelvis":`${x>=0?1:-1}-leg`;
 return BODY_REGIONS.find(r=>r.id===id)!;
}
export function insideRegion(p:Position3,r:BodyRegion):boolean{return p.every((v,i)=>v>=r.min[i]&&v<=r.max[i]);}
export function boundsOverlap(min:number[],max:number[],r:BodyRegion):boolean{return min.every((v,i)=>v<=r.max[i]&&max[i]>=r.min[i]);}
export const OBSERVATION_LAYERS=[
 {name:"体表",systems:["integumentary"]},
 {name:"肌肉与结缔组织",systems:["muscular","connective"]},
 {name:"脏器与血管",systems:["cardiac","arterial","venous","respiratory","digestive","urinary","lymphatic","endocrine","reproductive","sensory"]},
 {name:"骨骼与神经",systems:["skeletal","nervous"]},
];
/** Drag, multi-touch and cancellation never become a tap or a held selection. */
export class AtlasGestureTracker {
 private active:{id:number;x:number;y:number;time:number}|null=null;
 private last:{key:string;time:number}|null=null;
 start(id:number,x:number,y:number,time:number,count:number){this.active=count===1?{id,x,y,time}:null;if(count!==1)this.last=null;}
 move(id:number,x:number,y:number){if(this.active?.id===id&&Math.hypot(x-this.active.x,y-this.active.y)>8)this.cancel();}
 cancel(){this.active=null;this.last=null;}
 held(time:number){return !!this.active&&time-this.active.time>=3000;}
 finish(id:number,x:number,y:number,time:number,key:string):AtlasGesture|null{
 const a=this.active;this.active=null;if(!a||a.id!==id||Math.hypot(x-a.x,y-a.y)>8)return null;
 if(time-a.time>=3000){this.last=null;return "long";}
 if(this.last?.key===key&&time-this.last.time<350){this.last=null;return "double";}
 this.last={key,time};return "tap";
 }
}
