"use client";
export function StudyDetailNav({items}:{items:ReadonlyArray<readonly [string,string]>}){
 const reveal=(id:string)=>{const target=document.getElementById(id);if(!target)return;for(let parent:HTMLElement|null=target;parent;parent=parent.parentElement)if(parent instanceof HTMLDetailsElement)parent.open=true;target.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});};
 return <nav aria-label="本页目录" style={{display:"flex",gap:8,overflowX:"auto",padding:"10px 12px",background:"white"}}>{items.map(([id,label])=><button key={id} type="button" onClick={()=>reveal(id)} style={{flexShrink:0,minHeight:40,padding:"8px 12px",border:"1px solid #e3d8eb",borderRadius:20,background:"#faf7fc",color:"#7131a3",fontSize:13}}>{label}</button>)}</nav>;
}
