import type {Position3} from "./atlasInteraction";
export interface CameraPose {position:Position3;target:Position3}
export interface ViewState {flow?:boolean;flowSpeed?:number;underwear?:boolean;cameraRestore?:CameraPose;isolateIds?:string[];visible:string[];hidden:string[];faded:string[];selected:string|null;isolate:boolean;opacity:number;view:string;reset:number;focus:number;points:boolean;meridian:string;point:string|null;side:1|-1;section:number|null;explode:number;region?:string|null;continuous:boolean}
export const initialView=():ViewState=>({flow:false,flowSpeed:1,underwear:true,visible:["integumentary","sensory"],hidden:[],faded:[],selected:null,isolate:false,opacity:1,view:"front",reset:0,focus:0,points:false,meridian:"",point:null,side:1,section:null,explode:0,region:null,continuous:false});
export interface Snapshot {view:ViewState;isolation:ViewState|null}
export const copyView=(s:ViewState):ViewState=>({...s,visible:[...s.visible],hidden:[...s.hidden],faded:[...s.faded],isolateIds:s.isolateIds?[...s.isolateIds]:undefined});
export const copySnapshot=(s:Snapshot):Snapshot=>({view:copyView(s.view),isolation:s.isolation?copyView(s.isolation):null});
export function isolateView(s:Snapshot,ids:string[],systems:string[],selected:string):Snapshot {
 const base=s.isolation||s.view;
 return {isolation:copyView(base),view:{...copyView(s.view),visible:[...systems],hidden:s.view.hidden.filter(id=>!ids.includes(id)),selected,isolate:true,isolateIds:[...ids],cameraRestore:undefined,points:false,region:null,explode:0,section:null,focus:s.view.focus+1}};
}
export function leaveIsolation(s:Snapshot):Snapshot {return s.isolation?{view:{...copyView(s.isolation),focus:s.view.focus+1},isolation:null}:copySnapshot(s);}
export function hideStructures(s:Snapshot,ids:string[],underlying:string[]):Snapshot {
 const next=copySnapshot(s);
 next.view={...next.view,visible:Array.from(new Set([...next.view.visible,...underlying])),hidden:Array.from(new Set([...next.view.hidden,...ids])),faded:next.view.faded.filter(id=>!ids.includes(id)),selected:null,point:null};return next;
}
export class AtlasHistory {
 private past:Snapshot[]=[];private future:Snapshot[]=[];
 private limit:number; constructor(limit=30){this.limit=limit;}
 get undoCount(){return this.past.length;}get redoCount(){return this.future.length;}
 record(current:Snapshot){this.past=[...this.past.slice(-(this.limit-1)),copySnapshot(current)];this.future=[];}
 undo(current:Snapshot){const prior=this.past.pop();if(!prior)return null;this.future.push(copySnapshot(current));return copySnapshot(prior);}
 redo(current:Snapshot){const next=this.future.pop();if(!next)return null;this.past.push(copySnapshot(current));return copySnapshot(next);}
}
export interface HoldFeedback {x:number;y:number;name:string;id?:string;progress:number}
export type PickPosition=Position3;
