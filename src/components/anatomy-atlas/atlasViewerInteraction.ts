/** Restrict native text actions to reading/editing surfaces, never the model UI.
 * This deliberately leaves pointer, touch and wheel events untouched. */
export function allowAtlasTextAction(root:HTMLElement,target:EventTarget|null):boolean {
 const node=target as Node|null;
 const element=node?.nodeType===1?node as Element:node?.parentElement;
 if(!element||!root.contains(element)||!element.closest(".atlas-stage"))return true;
 if(element.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'))return true;
 if(element.closest('button,summary,[data-atlas-control]'))return false;
 return Boolean(element.closest('[data-atlas-copyable]'));
}

export function installAtlasTextActionGuard(root:HTMLElement):()=>void {
 const guard=(event:Event)=>{if(!allowAtlasTextAction(root,event.target))event.preventDefault();};
 root.addEventListener("selectstart",guard,true);
 root.addEventListener("contextmenu",guard,true);
 return()=>{
  root.removeEventListener("selectstart",guard,true);
  root.removeEventListener("contextmenu",guard,true);
 };
}
