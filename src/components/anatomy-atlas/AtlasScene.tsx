"use client";
// Adapted binary geometry decoding and GPU part masks from Human Atlas / JIC TCM 3D.
// MIT: see public/licenses/tcm-3d/CODE-LICENSE.txt. Geometry has separate CC BY 4.0 terms.
import {useEffect,useRef} from "react";
import * as T from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {mergeGeometries} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {softenPelvicSurface} from "./teaching-skin";
import {AtlasGestureTracker,viewPreferences,BODY_REGIONS,boundsOverlap,insideRegion,type AtlasGesture,type Position3} from "./atlasInteraction";
import {SYSTEMS,selectionParts,type Dataset} from "./atlasPack";
import type {ViewState,HoldFeedback,CameraPose} from "./atlasState";
export type {ViewState} from "./atlasState";
interface Props {data:Dataset;state:ViewState;onSelect:(id:string,gesture?:AtlasGesture,position?:Position3)=>void;onPoint:(code:string,side:1|-1)=>void;onPose:(pose:CameraPose)=>void;onPeel:(id:string,position:Position3)=>void;onHold:(feedback:HoldFeedback|null)=>void;onReady:()=>void;onError:(message:string)=>void}
export default function AtlasScene({data,state,onSelect,onPoint,onPose,onPeel,onHold,onReady,onError}:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(state),callbacks=useRef({onSelect,onPoint,onPose,onPeel,onHold,onReady,onError});
 latest.current=state;callbacks.current={onSelect,onPoint,onPose,onPeel,onHold,onReady,onError};
 useEffect(()=>{
  const el=host.current;if(!el)return;const preferences=viewPreferences(data.atlas.viewerPreferences);let dead=false,frame=0;
  const geometries:T.BufferGeometry[]=[],materials:T.Material[]=[];
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:false});}catch{callbacks.current.onError("设备暂不支持3D显示，可继续使用原图谱与文字学习。");return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.localClippingEnabled=true;renderer.setClearColor(0xf7f4ef);el.appendChild(renderer.domElement);renderer.domElement.style.userSelect="none";renderer.domElement.style.setProperty("-webkit-touch-callout","none");
  const preventMenu=(e:Event)=>e.preventDefault();renderer.domElement.addEventListener("contextmenu",preventMenu);
  renderer.domElement.setAttribute("aria-label","三维人体：拖动旋转，双指或滚轮缩放，点击结构或穴位");
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.005,100),controls=new OrbitControls(camera,renderer.domElement);let dirty=true;const invalidate=()=>{dirty=true;callbacks.current.onPose({position:camera.position.toArray() as Position3,target:controls.target.toArray() as Position3});};controls.addEventListener("change",invalidate);
  controls.enableDamping=true;controls.minDistance=.08;controls.maxDistance=8;controls.target.set(0,.85,0);camera.position.set(.8,1,3.5);
  scene.add(new T.HemisphereLight(0xffffff,0x8c8279,2.7));const light=new T.DirectionalLight(0xffffff,3);light.position.set(2,3,4);scene.add(light);
  const backlight=new T.DirectionalLight(0xe1ecff,1.8);backlight.position.set(-2,1,-2);scene.add(backlight);
  const width=T.MathUtils.ceilPowerOfTwo(data.atlas.parts.length),mask=new Float32Array(width*4),texture=new T.DataTexture(mask,width,1,T.RGBAFormat,T.FloatType);texture.needsUpdate=true;
  const plane=new T.Plane(new T.Vector3(0,-1,0),1.7),regionPlanes=[new T.Plane(new T.Vector3(1,0,0),100),new T.Plane(new T.Vector3(-1,0,0),100),new T.Plane(new T.Vector3(0,1,0),100),new T.Plane(new T.Vector3(0,-1,0),100),new T.Plane(new T.Vector3(0,0,1),100),new T.Plane(new T.Vector3(0,0,-1),100)],clipPlanes=[plane,...regionPlanes],picks:T.Mesh[]=[],batches:{mesh:T.Mesh;ids:number[]}[]=[];
  const mats=new Map(SYSTEMS.map(([id,,color])=>{
   const m=new T.MeshStandardMaterial({color,roughness:.65,side:T.DoubleSide,clippingPlanes:clipPlanes});materials.push(m);
   m.onBeforeCompile=shader=>{
    shader.uniforms.partMask={value:texture};shader.uniforms.maskWidth={value:width};
    shader.vertexShader="attribute float partIndex;uniform sampler2D partMask;uniform float maskWidth;varying float shown;varying float chosen;varying float faded;\n"+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nvec4 state=texture2D(partMask,vec2((partIndex+0.5)/maskWidth,0.5));transformed+=state.xyz;shown=abs(state.w);chosen=step(1.5,abs(state.w));faded=step(state.w,-0.5);");
    shader.fragmentShader="varying float shown;varying float chosen;varying float faded;\n"+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace("#include <clipping_planes_fragment>","#include <clipping_planes_fragment>\nif(shown<0.5)discard;");
    shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>","#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.35,0.74,0.66),chosen*0.7);diffuseColor.a*=mix(1.0,0.22,faded);");
   };return [id,m] as const;
  }));
  const dotGeometry=new T.SphereGeometry(.0035,6,5);geometries.push(dotGeometry);
  const dotMaterial=new T.MeshBasicMaterial({color:0x8a3262,clippingPlanes:clipPlanes});materials.push(dotMaterial);
  const dots=new T.Group(),lines=new T.Group();scene.add(dots,lines);
  for(const point of data.surface.points){
   const dot=new T.Mesh(dotGeometry,dotMaterial),[code,side]=point.key.split(":");
   dot.position.fromArray(point.target.position).addScaledVector(new T.Vector3().fromArray(point.target.normal),.0015);
   dot.userData={code,side:Number(side)};dots.add(dot);
  }
  for(const path of data.surface.paths){const values=path.vertices;if(!Array.isArray(values))continue;
   const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(values as number[],3));geometries.push(g);
   const material=new T.LineBasicMaterial({color:0x87639e,clippingPlanes:clipPlanes});materials.push(material);const line=new T.LineSegments(g,material);line.userData.id=path.id;lines.add(line);
  }
  try{
   data.atlas.chunks.forEach((chunk,ci)=>{
    const raw=data.files[chunk.url];const buffer=new Uint8Array(raw).buffer;const groups=new Map<string,T.BufferGeometry[]>();
    data.atlas.parts.forEach((p,i)=>{
     if(p.chunk!==ci||p.id==="FJ2815"||p.id==="FJ2813")return;
     const g=new T.BufferGeometry();g.setAttribute("position",new T.BufferAttribute(new Float32Array(buffer,p.positions,p.vertexCount*3),3));
     g.setAttribute("normal",new T.BufferAttribute(new Int16Array(buffer,p.normals,p.vertexCount*3),3,true));g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));
     if(p.id==="FJ2810")softenPelvicSurface(g);else if(p.system==="integumentary"){g.deleteAttribute("normal");g.computeVertexNormals();}
     g.computeBoundingBox();g.computeBoundingSphere();geometries.push(g);const mesh=new T.Mesh(g);mesh.userData.index=i;picks.push(mesh);
     g.setAttribute("partIndex",new T.BufferAttribute(new Float32Array(g.getAttribute("position").count).fill(i),1));const list=groups.get(p.system)||[];list.push(g);groups.set(p.system,list);
    });
    groups.forEach((gs,id)=>{const g=mergeGeometries(gs);if(!g)throw Error("网格无法合并");geometries.push(g);const mesh=new T.Mesh(g,mats.get(id));mesh.frustumCulled=false;scene.add(mesh);batches.push({mesh,ids:data.atlas.parts.flatMap((p,i)=>p.chunk===ci&&p.system===id?[i]:[])});});
   });callbacks.current.onReady();
  }catch{callbacks.current.onError("模型数据无法显示，请恢复旧图谱或重新下载资源。");}
  let previous:ViewState|null=null,needsFit=true,previousAspect=0;
  const resize=()=>{const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);renderer.setSize(w,h);const aspect=w/h;if(previousAspect){camera.position.sub(controls.target).multiplyScalar(Math.min(1,previousAspect)/Math.min(1,aspect)).add(controls.target);}camera.aspect=aspect;previousAspect=aspect;camera.updateProjectionMatrix();controls.update();dirty=true;};
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  const fit=()=>{const s=latest.current;if(s.cameraRestore){camera.position.fromArray(s.cameraRestore.position);controls.target.fromArray(s.cameraRestore.target);controls.update();return;}const preserve=previous&&previous.view===s.view&&previous.reset===s.reset;const direction=preserve?camera.position.clone().sub(controls.target).normalize():s.view==="back"?new T.Vector3(0,0,-1):s.view==="side"?new T.Vector3(1,0,0):new T.Vector3(0,0,1);let center=new T.Vector3(0,preferences.overviewTargetY,0),distance=Math.max(preferences.overviewDistance,1.05/camera.aspect);
   const region=BODY_REGIONS.find(r=>r.id===s.region);if(region&&!s.isolate){const box=new T.Box3(new T.Vector3().fromArray(region.min),new T.Vector3().fromArray(region.max));center=box.getCenter(new T.Vector3());const size=box.getSize(new T.Vector3());distance=Math.max(size.y,size.x/camera.aspect)/(2*Math.tan(T.MathUtils.degToRad(17)))*1.2+size.z/2;}
   const parts=s.isolate&&s.isolateIds?data.atlas.parts.filter(p=>s.isolateIds!.includes(p.id)):s.selected?.startsWith("@system:")?data.atlas.parts.filter(p=>p.system===s.selected!.slice(8)):selectionParts(data.atlas,s.selected);if((s.isolate||s.selected)&&parts.length){const box=new T.Box3();parts.forEach(p=>box.union(new T.Box3(new T.Vector3().fromArray(p.bounds[0]),new T.Vector3().fromArray(p.bounds[1]))));center=box.getCenter(new T.Vector3());const size=box.getSize(new T.Vector3());distance=Math.max(.12,Math.max(size.y,size.x/camera.aspect,size.z)/(2*Math.tan(T.MathUtils.degToRad(17)))*1.4);}
   if(s.point&&!s.isolate){const target=data.surface.points.find(p=>p.key===`${s.point}:${s.side}`)?.target;if(target){center=new T.Vector3().fromArray(target.position);direction.fromArray(target.normal).normalize();distance=.55;}}
   controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance);controls.update();};
  const ray=new T.Raycaster(),mouse=new T.Vector2(),pointers=new Set<number>(),gesture=new AtlasGestureTracker(500);let hold:ReturnType<typeof setTimeout>|undefined,progress:ReturnType<typeof setInterval>|undefined,active:{id:number;x:number;y:number;time:number}|null=null,held=false;
  const clearHold=()=>{if(hold!==undefined)clearTimeout(hold);if(progress!==undefined)clearInterval(progress);hold=undefined;progress=undefined;callbacks.current.onHold(null);};
  const pick=(x:number,y:number,meshOnly=false)=>{
   const rect=renderer.domElement.getBoundingClientRect();mouse.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const s=latest.current,region=BODY_REGIONS.find(r=>r.id===s.region);
   const allowed=(p:T.Vector3)=>(s.section===null||p.y<=s.section)&&(!region||insideRegion(p.toArray() as Position3,region));
   if(!meshOnly&&s.points&&dots.visible){const hit=ray.intersectObjects(dots.children.filter(d=>d.visible)).find(h=>allowed(h.point));if(hit)return {key:"point:"+hit.object.userData.code,code:hit.object.userData.code as string,side:hit.object.userData.side as 1|-1};}
   const hit=ray.intersectObjects(picks.filter(m=>Math.abs(mask[m.userData.index*4+3])>.5)).find(h=>allowed(h.point));
   return hit?{key:data.atlas.parts[hit.object.userData.index].id,position:hit.point.toArray() as Position3}:null;
  };
  const dispatch=(hit:ReturnType<typeof pick>,kind:AtlasGesture)=>{if(!hit)return;if("code" in hit)callbacks.current.onPoint(hit.code!,hit.side!);else callbacks.current.onSelect(hit.key,kind,hit.position);};
  const peel=()=>{if(progress!==undefined)clearInterval(progress);progress=undefined;if(!active||pointers.size!==1)return;const hit=pick(active.x,active.y,true);if(!hit||!("position" in hit)){clearHold();active=null;return;}held=true;gesture.cancel();callbacks.current.onPeel(hit.key,hit.position!);callbacks.current.onHold(null);if(latest.current.continuous)hold=setTimeout(peel,650);};
  const start=(e:PointerEvent)=>{clearHold();pointers.add(e.pointerId);held=false;gesture.start(e.pointerId,e.clientX,e.clientY,performance.now(),pointers.size);if(pointers.size!==1){active=null;gesture.cancel();return;}active={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()};
   const hit=pick(e.clientX,e.clientY,true);if(!hit||!("position" in hit))return;const rect=renderer.domElement.getBoundingClientRect(),name=data.atlas.parts.find(p=>p.id===hit.key)?.name||hit.key;
   progress=setInterval(()=>{if(active)callbacks.current.onHold({x:e.clientX-rect.left,y:e.clientY-rect.top,name,id:hit.key,progress:Math.min(1,(performance.now()-active.time)/500)});},40);hold=setTimeout(peel,500);
  };
  const move=(e:PointerEvent)=>{gesture.move(e.pointerId,e.clientX,e.clientY);if(active&&Math.hypot(e.clientX-active.x,e.clientY-active.y)>8){active=null;clearHold();gesture.cancel();}};
  const end=(e:PointerEvent)=>{clearHold();pointers.delete(e.pointerId);active=null;if(held){held=false;gesture.cancel();return;}const hit=pick(e.clientX,e.clientY),kind=gesture.finish(e.pointerId,e.clientX,e.clientY,performance.now(),hit?.key||"");if(kind&&kind!=="long"){if(latest.current.continuous&&hit&&"position" in hit)callbacks.current.onPeel(hit.key,hit.position!);else dispatch(hit,kind);}};
  const cancel=(e:PointerEvent)=>{clearHold();pointers.delete(e.pointerId);active=null;held=false;gesture.cancel();};renderer.domElement.addEventListener("pointerdown",start);renderer.domElement.addEventListener("pointermove",move);renderer.domElement.addEventListener("pointerup",end);renderer.domElement.addEventListener("pointercancel",cancel);

  const stopHold=()=>{clearHold();active=null;held=false;pointers.clear();gesture.cancel();};
  const visibility=()=>{if(document.hidden)stopHold();};window.addEventListener("blur",stopHold);document.addEventListener("visibilitychange",visibility);
  const lost=(e:Event)=>{e.preventDefault();callbacks.current.onError("设备暂停了3D显示，请重新打开图谱。");};renderer.domElement.addEventListener("webglcontextlost",lost);
  const animate=()=>{if(dead)return;frame=requestAnimationFrame(animate);const s=latest.current;
   if(previous!==s||needsFit){dirty=true;
    const region=BODY_REGIONS.find(r=>r.id===s.region);regionPlanes.forEach((p,i)=>{p.constant=region?(i%2===0?-region.min[Math.floor(i/2)]:region.max[Math.floor(i/2)]):100;});
    const visible=new Set(s.visible),hidden=new Set(s.hidden),faded=new Set(s.faded),selected=new Set((s.selected?.startsWith("@system:")?[]:selectionParts(data.atlas,s.selected)).map(p=>p.id));
    data.atlas.parts.forEach((p,i)=>{const shown=(!region||boundsOverlap(p.bounds[0],p.bounds[1],region))&&!hidden.has(p.id)&&(s.isolate?(s.isolateIds?s.isolateIds.includes(p.id):selected.has(p.id)):visible.has(p.system));const group=SYSTEMS.findIndex(a=>a[0]===p.system),angle=group/SYSTEMS.length*Math.PI*2;const dx=Math.sin(angle)*s.explode*.35,dz=Math.cos(angle)*s.explode*.35;
     mask.set([dx,0,dz,shown?(selected.has(p.id)?2:1)*(faded.has(p.id)?-1:1):0],i*4);
    });picks.forEach(m=>{const i=m.userData.index;m.position.set(mask[i*4],0,mask[i*4+2]);m.updateMatrixWorld();});
    batches.forEach(b=>{b.mesh.visible=b.ids.some(i=>Math.abs(mask[i*4+3])>.5);});texture.needsUpdate=true;
    mats.forEach(m=>{m.opacity=s.opacity;m.transparent=s.opacity<1||s.faded.length>0;m.depthWrite=s.opacity>=1&&!s.faded.length;});plane.constant=s.section??100;
    dots.visible=s.points&&s.explode===0&&!s.isolate;lines.visible=dots.visible;
    dots.children.forEach(d=>{const p=data.points.find(p=>p.code===d.userData.code);d.visible=(!region||insideRegion(d.position.toArray() as Position3,region))&&(!s.meridian||p?.meridianId===s.meridian);d.scale.setScalar(s.point===d.userData.code&&s.side===d.userData.side?1.8:1);});
    lines.children.forEach(l=>{l.visible=!s.meridian||l.userData.id===s.meridian;});
    if(!previous||previous.reset!==s.reset||previous.view!==s.view||previous.focus!==s.focus||previous.point!==s.point||previous.side!==s.side||previous.region!==s.region||needsFit)fit();needsFit=false;previous=s;
   }controls.update();if(dirty){renderer.render(scene,camera);dirty=false;}
  };animate();
  return()=>{dead=true;window.removeEventListener("blur",stopHold);document.removeEventListener("visibilitychange",visibility);clearHold();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener("pointerdown",start);renderer.domElement.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("contextmenu",preventMenu);renderer.domElement.removeEventListener("pointerup",end);renderer.domElement.removeEventListener("pointercancel",cancel);renderer.domElement.removeEventListener("webglcontextlost",lost);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());texture.dispose();renderer.dispose();renderer.domElement.remove();};
 },[data]);
 return <div ref={host} style={{width:"100%",height:"100%",touchAction:"none"}}/>;
}
