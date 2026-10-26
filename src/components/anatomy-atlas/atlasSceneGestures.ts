import type {Position3} from "./atlasInteraction";

export interface SceneGestureHit {key:string;position?:Position3;code?:string;side?:1|-1}
export interface SceneHoldProgress {x:number;y:number;hit:SceneGestureHit;progress:number}
interface GestureTracker {
 start(id:number,x:number,y:number,time:number,count:number):void;
 move(id:number,x:number,y:number):void;
 finish(id:number,x:number,y:number,time:number,key:string):"tap"|"double"|"long"|null;
 cancel():void;
}
export interface SceneGestureClock {
 now():number;
 later(fn:()=>void,ms:number):unknown;
 cancelLater(id:unknown):void;
 every(fn:()=>void,ms:number):unknown;
 cancelEvery(id:unknown):void;
}
interface Options {
 tracker:GestureTracker;
 pick(x:number,y:number,meshOnly:boolean):SceneGestureHit|null;
 peelOnTap():boolean;
 onPeel(hit:SceneGestureHit):void;
 onSelect(hit:SceneGestureHit,kind:"tap"|"double"):void;
 onHold(progress:SceneHoldProgress|null):void;
 clock?:SceneGestureClock;
}
type Pointer={pointerId:number;clientX:number;clientY:number;button?:number};
const realClock:SceneGestureClock={now:()=>performance.now(),later:(fn,ms)=>setTimeout(fn,ms),cancelLater:id=>clearTimeout(id as ReturnType<typeof setTimeout>),every:(fn,ms)=>setInterval(fn,ms),cancelEvery:id=>clearInterval(id as ReturnType<typeof setInterval>)};
const structure=(hit:SceneGestureHit|null):hit is SceneGestureHit&{position:Position3}=>!!hit?.position&&!hit.code;

/** One-second hold peels; ordinary taps still identify. Every peel re-rays the
 * current visible anatomy. Document-level contacts include a second finger on
 * the toolbar, and never re-arm until the next single-finger gesture. */
export class AtlasSceneGestures {
 private pointers=new Set<number>();
 private active:{id:number;startX:number;startY:number;x:number;y:number;startedAt:number}|null=null;
 private timer:unknown|undefined;
 private progress:unknown|undefined;
 private peeled=false;
 private clock:SceneGestureClock;
 private options:Options;
 constructor(options:Options){this.options=options;this.clock=options.clock||realClock;}
 private clearTimers(){if(this.timer!==undefined)this.clock.cancelLater(this.timer);if(this.progress!==undefined)this.clock.cancelEvery(this.progress);this.timer=undefined;this.progress=undefined;this.options.onHold(null);}
 private cancelGesture(){this.clearTimers();this.active=null;this.peeled=false;this.options.tracker.cancel();}
 private peel=()=>{
  if(this.progress!==undefined)this.clock.cancelEvery(this.progress);this.progress=undefined;this.timer=undefined;this.options.onHold(null);
  const active=this.active;if(!active||this.pointers.size!==1)return;
  const hit=this.options.pick(active.x,active.y,true);if(!structure(hit)){this.cancelGesture();return;}
  this.peeled=true;this.options.tracker.cancel();this.options.onPeel(hit);
  if(this.active===active&&this.pointers.size===1)this.timer=this.clock.later(this.peel,800);
 };
 pointerDown(event:Pointer,insideCanvas:boolean){
  if(event.button!==undefined&&event.button!==0)return;
  this.clearTimers();this.pointers.add(event.pointerId);this.peeled=false;
  if(!insideCanvas||this.pointers.size!==1){this.cancelGesture();return;}
  const now=this.clock.now();this.active={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,startedAt:now};
  this.options.tracker.start(event.pointerId,event.clientX,event.clientY,now,this.pointers.size);
  const hit=this.options.pick(event.clientX,event.clientY,true);if(!structure(hit))return;
  this.progress=this.clock.every(()=>{const active=this.active;if(active)this.options.onHold({x:active.x,y:active.y,hit,progress:Math.min(1,(this.clock.now()-active.startedAt)/1000)});},40);
  this.timer=this.clock.later(this.peel,1000);
 }
 pointerMove(event:Pointer){
  this.options.tracker.move(event.pointerId,event.clientX,event.clientY);
  const active=this.active;if(!active||active.id!==event.pointerId)return;
  if(Math.hypot(event.clientX-active.startX,event.clientY-active.startY)>8){this.cancelGesture();return;}
  active.x=event.clientX;active.y=event.clientY;
 }
 pointerUp(event:Pointer,insideCanvas:boolean){
  this.clearTimers();this.pointers.delete(event.pointerId);const active=this.active;this.active=null;
  if(!insideCanvas||!active||active.id!==event.pointerId||this.peeled){this.peeled=false;this.options.tracker.cancel();return;}
  const hit=this.options.pick(event.clientX,event.clientY,false),kind=this.options.tracker.finish(event.pointerId,event.clientX,event.clientY,this.clock.now(),hit?.key||"");
  if(!hit||!kind||kind==="long")return;
  if(this.options.peelOnTap()&&structure(hit))this.options.onPeel(hit);else this.options.onSelect(hit,kind);
 }
 pointerCancel(event:Pick<Pointer,"pointerId">){this.pointers.delete(event.pointerId);this.cancelGesture();}
 /** blur, hidden, unmount and an explicit cancellation discard all contacts. */
 stop(){this.pointers.clear();this.cancelGesture();}
}
