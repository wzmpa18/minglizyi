/** Defer layout changes until every document pointer in the gesture has ended.
 * A second finger may be on a label or sidebar rather than on the canvas. */
export class AtlasInteractionCompletion {
 private active=new Set<number>();private model=new Set<number>();private pending=false;
 pointerDown(id:number,onModel:boolean){if(this.active.size===0)this.pending=false;this.active.add(id);if(onModel)this.model.add(id);}
 pointerEnd(id:number){this.active.delete(id);if(this.model.delete(id))this.pending=true;return this.ready;}
 request(){this.pending=true;return this.ready;}
 get ready(){return this.pending&&this.active.size===0;}
 consume(){if(!this.ready)return false;this.pending=false;return true;}
 stop(){this.active.clear();this.model.clear();this.pending=false;}
}
