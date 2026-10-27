"use client";
// Adapted binary geometry decoding and GPU part masks from Human Atlas / JIC TCM 3D.
// MIT: see public/licenses/tcm-3d/CODE-LICENSE.txt. Geometry has separate CC BY 4.0 terms.
import {useEffect,useRef} from "react";
import * as T from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {mergeGeometries} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {arrangePointLabels,meridianColor,displayPointCode,displayPointName,type LabelCandidate} from "./atlasPointLabels";
import {AtlasGestureTracker,viewPreferences,BODY_REGIONS,boundsOverlap,insideRegion,type AtlasGesture,type Position3} from "./atlasInteraction";
import {SYSTEMS,selectionParts,type Dataset} from "./atlasPack";
import type {ViewState,HoldFeedback,CameraPose} from "./atlasState";
import {buildSurfaceShorts,surfaceClothingVisible} from "./atlasClothing";
import {AtlasSceneGestures,type SceneGestureHit} from "./atlasSceneGestures";
import {AtlasInteractionCompletion} from "./atlasInteractionCompletion";
import {buildAtlasMeridianPlan,renderPointTarget,meridianFlowFragment,EXTRAORDINARY_COLORS} from "./atlasMeridianRoutes";
export type {ViewState} from "./atlasState";
interface Props {data:Dataset;state:ViewState;onSelect:(id:string,gesture?:AtlasGesture,position?:Position3)=>void;onPoint:(code:string,side:1|-1)=>void;onPose:(pose:CameraPose)=>void;onPeel:(id:string,position:Position3)=>void;onHold:(feedback:HoldFeedback|null)=>void;onReady:()=>void;onError:(message:string)=>void;onModelInteraction?:()=>void}
export default function AtlasScene({data,state,onSelect,onPoint,onPose,onPeel,onHold,onReady,onError,onModelInteraction}:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(state),callbacks=useRef({onSelect,onPoint,onPose,onPeel,onHold,onReady,onError,onModelInteraction});
 latest.current=state;callbacks.current={onSelect,onPoint,onPose,onPeel,onHold,onReady,onError,onModelInteraction};
 useEffect(()=>{
  const el=host.current;if(!el)return;const preferences=viewPreferences(data.atlas.viewerPreferences);let dead=false,frame=0;
  const geometries:T.BufferGeometry[]=[],materials:T.Material[]=[];
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:false});}catch{callbacks.current.onError("设备暂不支持3D显示，可继续使用原图谱与文字学习。");return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.localClippingEnabled=true;renderer.setClearColor(0x101417);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;el.appendChild(renderer.domElement);renderer.domElement.style.userSelect="none";renderer.domElement.style.setProperty("-webkit-touch-callout","none");
  const names=document.createElement("div");names.setAttribute("aria-label","当前可见穴位名称");Object.assign(names.style,{position:"absolute",inset:"0",pointerEvents:"none",overflow:"hidden"});el.appendChild(names);
  const preventMenu=(e:Event)=>e.preventDefault();renderer.domElement.addEventListener("contextmenu",preventMenu);
  renderer.domElement.setAttribute("aria-label","三维人体：拖动旋转，双指或滚轮缩放，点击结构或穴位");
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.005,100),controls=new OrbitControls(camera,renderer.domElement);let dirty=true;const invalidate=()=>{dirty=true;callbacks.current.onPose({position:camera.position.toArray() as Position3,target:controls.target.toArray() as Position3,aspect:camera.aspect});};controls.addEventListener("change",invalidate);
  controls.enableDamping=true;controls.minDistance=.08;controls.maxDistance=8;controls.target.set(0,.85,0);camera.position.set(.8,1,3.5);
  scene.add(new T.HemisphereLight(0xffffff,0x8c8279,1.6));const light=new T.DirectionalLight(0xffffff,2.1);light.position.set(2,3,4);scene.add(light);
  const backlight=new T.DirectionalLight(0xe1ecff,.9);backlight.position.set(-2,1,-2);scene.add(backlight);
  // Camera-relative fill keeps the observed face readable during a rotation.
  // Original packed normals and source skin/hair/eye materials remain intact.
  const viewFill=new T.DirectionalLight(0xfff5eb,.8);viewFill.position.set(.3,.5,1);viewFill.target.position.set(0,0,-1);camera.add(viewFill,viewFill.target);scene.add(camera);
  const width=T.MathUtils.ceilPowerOfTwo(data.atlas.parts.length),mask=new Float32Array(width*4),texture=new T.DataTexture(mask,width,1,T.RGBAFormat,T.FloatType);texture.needsUpdate=true;
  const plane=new T.Plane(new T.Vector3(0,-1,0),1.7),regionPlanes=[new T.Plane(new T.Vector3(1,0,0),100),new T.Plane(new T.Vector3(-1,0,0),100),new T.Plane(new T.Vector3(0,1,0),100),new T.Plane(new T.Vector3(0,-1,0),100),new T.Plane(new T.Vector3(0,0,1),100),new T.Plane(new T.Vector3(0,0,-1),100)],clipPlanes=[plane,...regionPlanes],picks:T.Mesh[]=[],batches:{mesh:T.Mesh;ids:number[]}[]=[];
  const flowTime={value:0},flowActive={value:0};let flowTick=performance.now();
  const mats=new Map(SYSTEMS.map(([id,,color])=>{
   const m=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.65,side:T.DoubleSide,clippingPlanes:clipPlanes});materials.push(m);
   m.customProgramCacheKey=()=>"atlas-part-v1";
   m.onBeforeCompile=shader=>{
    shader.uniforms.partMask={value:texture};shader.uniforms.maskWidth={value:width};

    shader.vertexShader="attribute float partIndex;uniform sampler2D partMask;uniform float maskWidth;varying float shown;varying float chosen;varying float faded;\n"+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nvec4 state=texture2D(partMask,vec2((partIndex+0.5)/maskWidth,0.5));transformed+=state.xyz;shown=abs(state.w);chosen=step(1.5,abs(state.w));faded=step(state.w,-0.5);");
    shader.fragmentShader="varying float shown;varying float chosen;varying float faded;\n"+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace("#include <clipping_planes_fragment>","#include <clipping_planes_fragment>\nif(shown<0.5)discard;");
    shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>","#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.35,0.74,0.66),chosen*0.7);diffuseColor.a*=mix(1.0,0.22,faded);");
   };return [id,m] as const;
  }));
  // Fit a removable fabric surface to the original skin; no flat extrusion,
  // skin paint, anatomy reshaping or changes to point coordinates.
  const skinPart=data.atlas.parts.find(part=>part.id==="FJ2810")!;
  const skinBuffer=new Uint8Array(data.files[data.atlas.chunks[skinPart.chunk].url]).buffer;
  const fabric=buildSurfaceShorts({positions:new Float32Array(skinBuffer,skinPart.positions,skinPart.vertexCount*3),indices:new Uint32Array(skinBuffer,skinPart.indices,skinPart.indexCount)});
  const shortsGeometry=new T.BufferGeometry();shortsGeometry.setAttribute("position",new T.BufferAttribute(fabric.positions,3));shortsGeometry.setAttribute("color",new T.BufferAttribute(fabric.colors,3));shortsGeometry.setAttribute("uv",new T.BufferAttribute(fabric.uvs,2));shortsGeometry.setIndex(new T.BufferAttribute(fabric.indices,1));shortsGeometry.computeVertexNormals();geometries.push(shortsGeometry);
  const shortsMaterial=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.94,metalness:0,side:T.DoubleSide,clippingPlanes:clipPlanes});materials.push(shortsMaterial);const shorts=new T.Mesh(shortsGeometry,shortsMaterial);shorts.name="surface-fitted-blue-briefs";scene.add(shorts);
  const dotGeometry=new T.SphereGeometry(.004,8,6);geometries.push(dotGeometry);
  const pointByCode=new Map(data.points.map(p=>[p.code,p]));
  const meridianPlan=buildAtlasMeridianPlan(data),pointTargets=new Map(data.surface.points.map(point=>[point.key,renderPointTarget(point.key,point.target,meridianPlan.compatible,meridianPlan.derivation)]));
  const dotMaterials=new Map(Array.from(new Set(data.points.map(p=>p.meridianId))).map(id=>{const m=new T.MeshBasicMaterial({color:meridianColor(id),clippingPlanes:clipPlanes});materials.push(m);return[id,m] as const;}));
  const chosenDotMaterial=new T.MeshBasicMaterial({color:0xff71c7,clippingPlanes:clipPlanes});materials.push(chosenDotMaterial);const dots=new T.Group(),lines=new T.Group();scene.add(dots,lines);
  const pointNames:{dot:T.Mesh;normal:T.Vector3;button:HTMLButtonElement;key:string;code:string;side:1|-1;name:string}[]=[];
  for(const point of data.surface.points){
   const [code,side]=point.key.split(":"),entry=pointByCode.get(code);if(!entry)continue;
   const dot=new T.Mesh(dotGeometry,dotMaterials.get(entry.meridianId));
   const target=pointTargets.get(point.key)!;dot.position.fromArray(target.position);
   dot.userData={code,side:Number(side)};dots.add(dot);
   const pointName=displayPointName(entry.name),button=document.createElement("button");button.type="button";button.textContent=pointName;button.setAttribute("aria-label",`${pointName} ${displayPointCode(code)} ${entry.midline?"正中":Number(side)===1?"左侧":"右侧"}穴位资料`);button.title=`${pointName} ${displayPointCode(code)} · ${code==="GV24+"?"经外奇穴":entry.meridian}`;
   Object.assign(button.style,{display:"none",position:"absolute",pointerEvents:"auto",border:"0",borderRadius:"2px",background:"transparent",color:"#fff",font:"12px system-ui",padding:"3px 2px",height:"24px",whiteSpace:"nowrap",lineHeight:"18px",textShadow:"0 1px 3px #000,1px 0 2px #000,-1px 0 2px #000",touchAction:"manipulation"});
   button.addEventListener("pointerdown",e=>e.stopPropagation());button.addEventListener("click",e=>{e.stopPropagation();callbacks.current.onPoint(code,Number(side) as 1|-1);finishInteraction();});names.appendChild(button);pointNames.push({dot,normal:new T.Vector3().fromArray(target.normal),button,key:point.key,code,side:Number(side) as 1|-1,name:pointName});
  }
  for(const path of meridianPlan.paths){
   const g=new T.BufferGeometry();g.setAttribute("position",new T.BufferAttribute(path.positions,3));g.setAttribute("lineDistance",new T.BufferAttribute(path.distances,1));geometries.push(g);
   const material=new T.LineBasicMaterial({color:EXTRAORDINARY_COLORS[path.id]||meridianColor(path.id),clippingPlanes:clipPlanes});
   material.customProgramCacheKey=()=>"atlas-surface-moving-dashes-v1";
   material.onBeforeCompile=shader=>{shader.uniforms.flowTime=flowTime;shader.uniforms.flowActive=flowActive;shader.vertexShader="attribute float lineDistance;varying float travelDistance;\n"+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\ntravelDistance=lineDistance;");shader.fragmentShader="uniform float flowTime;uniform float flowActive;varying float travelDistance;\n"+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>","#include <color_fragment>\n"+meridianFlowFragment);};
   materials.push(material);const line=new T.LineSegments(g,material);line.userData={id:path.id,routeKind:path.routeKind};lines.add(line);
  }
  try{
   data.atlas.chunks.forEach((chunk,ci)=>{
    const raw=data.files[chunk.url];const buffer=new Uint8Array(raw).buffer;const groups=new Map<string,T.BufferGeometry[]>();
    data.atlas.parts.forEach((p,i)=>{
     if(p.chunk!==ci)return;
     const g=new T.BufferGeometry();g.setAttribute("position",new T.BufferAttribute(new Float32Array(buffer,p.positions,p.vertexCount*3),3));
     g.setAttribute("normal",new T.BufferAttribute(new Int16Array(buffer,p.normals,p.vertexCount*3),3,true));g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));
     // Preserve source anatomy, including the original skin and hair geometry.
     let tint=SYSTEMS.find(s=>s[0]===p.system)?.[2]||"#cda78e";const name=p.name.toLowerCase();
     if(name.includes("hair")||name.includes("eyebrow"))tint="#332923";else if(name==="lip")tint="#a95558";else if(name.includes("iris")||name.includes("choroid"))tint="#513d29";else if(name.includes("sclera")||name.includes("cornea"))tint="#eee7d7";
     const colour=new T.Color(tint),colours=new Float32Array(p.vertexCount*3);for(let v=0;v<p.vertexCount;v++)colours.set([colour.r,colour.g,colour.b],v*3);g.setAttribute("color",new T.BufferAttribute(colours,3));
     g.computeBoundingBox();g.computeBoundingSphere();geometries.push(g);const mesh=new T.Mesh(g);mesh.userData.index=i;picks.push(mesh);
     g.setAttribute("partIndex",new T.BufferAttribute(new Float32Array(g.getAttribute("position").count).fill(i),1));const transparentMedia=p.system==="sensory"&&/cornea|lens|chamber|vitreous/.test(name),groupKey=p.system+(transparentMedia?":clear":"");if(transparentMedia&&!mats.has(groupKey)){const original=mats.get(p.system)!;const clear=original.clone();clear.onBeforeCompile=original.onBeforeCompile;clear.customProgramCacheKey=original.customProgramCacheKey;clear.userData.clearMedia=true;clear.opacity=.12;clear.transparent=true;clear.depthWrite=false;materials.push(clear);mats.set(groupKey,clear);}const list=groups.get(groupKey)||[];list.push(g);groups.set(groupKey,list);
    });
    groups.forEach((gs,id)=>{const g=mergeGeometries(gs);if(!g)throw Error("网格无法合并");geometries.push(g);const mesh=new T.Mesh(g,mats.get(id));mesh.frustumCulled=false;scene.add(mesh);batches.push({mesh,ids:data.atlas.parts.flatMap((p,i)=>p.chunk===ci&&p.system===id.split(":")[0]?[i]:[])});});
   });callbacks.current.onReady();
  }catch{callbacks.current.onError("模型数据无法显示，请恢复旧图谱或重新下载资源。");}
  let previous:ViewState|null=null,needsFit=true,previousAspect=0;
  const resize=()=>{const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);renderer.setSize(w,h);const aspect=w/h;if(previousAspect){camera.position.sub(controls.target).multiplyScalar(Math.min(1,previousAspect)/Math.min(1,aspect)).add(controls.target);}camera.aspect=aspect;previousAspect=aspect;camera.updateProjectionMatrix();controls.update();dirty=true;};
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  const fit=()=>{const s=latest.current;if(s.cameraRestore){camera.position.fromArray(s.cameraRestore.position);controls.target.fromArray(s.cameraRestore.target);const savedAspect=s.cameraRestore.aspect;if(typeof savedAspect==="number"&&Number.isFinite(savedAspect)&&savedAspect>=.05&&savedAspect<=20)camera.position.sub(controls.target).multiplyScalar(Math.min(1,savedAspect)/Math.min(1,camera.aspect)).add(controls.target);controls.update();return;}const preserve=previous&&previous.view===s.view&&previous.reset===s.reset;const direction=preserve?camera.position.clone().sub(controls.target).normalize():s.view==="back"?new T.Vector3(0,0,-1):s.view==="side"?new T.Vector3(1,0,0):new T.Vector3(0,0,1);let center=new T.Vector3(0,preferences.overviewTargetY,0),distance=Math.max(preferences.overviewDistance,1.05/camera.aspect);
   const region=BODY_REGIONS.find(r=>r.id===s.region);if(region&&!s.isolate){const box=new T.Box3(new T.Vector3().fromArray(region.min),new T.Vector3().fromArray(region.max));center=box.getCenter(new T.Vector3());const size=box.getSize(new T.Vector3());distance=Math.max(size.y,size.x/camera.aspect)/(2*Math.tan(T.MathUtils.degToRad(17)))*1.2+size.z/2;}
   const parts=s.isolate&&s.isolateIds?data.atlas.parts.filter(p=>s.isolateIds!.includes(p.id)):s.selected?.startsWith("@system:")?data.atlas.parts.filter(p=>p.system===s.selected!.slice(8)):selectionParts(data.atlas,s.selected);if((s.isolate||s.selected)&&parts.length){const box=new T.Box3();parts.forEach(p=>box.union(new T.Box3(new T.Vector3().fromArray(p.bounds[0]),new T.Vector3().fromArray(p.bounds[1]))));center=box.getCenter(new T.Vector3());const size=box.getSize(new T.Vector3());distance=Math.max(.12,Math.max(size.y,size.x/camera.aspect,size.z)/(2*Math.tan(T.MathUtils.degToRad(17)))*1.4);}
   if(s.point&&!s.isolate){const target=pointTargets.get(`${s.point}:${s.side}`);if(target){center=new T.Vector3().fromArray(target.position);direction.fromArray(target.normal).normalize();distance=(center.y>1.5?.55:center.y>1.15?.8:.6)/Math.min(1,camera.aspect);}}
   controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance);controls.update();};
  const ray=new T.Raycaster(),mouse=new T.Vector2();
  const pick=(x:number,y:number,meshOnly=false)=>{
   const rect=renderer.domElement.getBoundingClientRect();mouse.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const s=latest.current,region=BODY_REGIONS.find(r=>r.id===s.region);
   const allowed=(p:T.Vector3)=>(s.section===null||p.y<=s.section)&&(!region||insideRegion(p.toArray() as Position3,region));
   if(!meshOnly&&s.points&&dots.visible){const rect=renderer.domElement.getBoundingClientRect(),candidate=pointNames.filter(p=>p.dot.visible).map(p=>{const screen=p.dot.position.clone().project(camera),toCamera=camera.position.clone().sub(p.dot.position).normalize();return{p,z:screen.z,facing:p.normal.dot(toCamera),distance:Math.hypot((screen.x+1)*rect.width/2-(x-rect.left),(-screen.y+1)*rect.height/2-(y-rect.top))};}).filter(p=>p.z>-1&&p.z<1&&p.facing>0&&p.distance<=16).sort((a,b)=>a.distance-b.distance)[0];if(candidate)return {key:"point:"+candidate.p.code,code:candidate.p.code,side:candidate.p.side};}
   const hit=ray.intersectObjects(picks.filter(m=>Math.abs(mask[m.userData.index*4+3])>.5)).find(h=>allowed(h.point));
   return hit?{key:data.atlas.parts[hit.object.userData.index].id,position:hit.point.toArray() as Position3}:null;
  };
  const dispatch=(hit:SceneGestureHit,kind:"tap"|"double")=>{if(hit.code)callbacks.current.onPoint(hit.code,hit.side!);else callbacks.current.onSelect(hit.key,kind,hit.position);};
  const interaction=new AtlasSceneGestures({tracker:new AtlasGestureTracker(1000),pick,peelOnTap:()=>latest.current.continuous,onPeel:hit=>callbacks.current.onPeel(hit.key,hit.position!),onSelect:dispatch,onHold:feedback=>{if(!feedback){callbacks.current.onHold(null);return;}const rect=renderer.domElement.getBoundingClientRect();callbacks.current.onHold({x:feedback.x-rect.left,y:feedback.y-rect.top,id:feedback.hit.key,name:data.atlas.parts.find(part=>part.id===feedback.hit.key)?.name||feedback.hit.key,progress:feedback.progress});}});
  const completion=new AtlasInteractionCompletion();
  let wheelFrame=0;const scheduleCompletion=()=>{cancelAnimationFrame(wheelFrame);wheelFrame=requestAnimationFrame(()=>{if(completion.consume())callbacks.current.onModelInteraction?.();});};
  const finishInteraction=()=>{completion.request();scheduleCompletion();};
  const start=(event:PointerEvent)=>{cancelAnimationFrame(wheelFrame);completion.pointerDown(event.pointerId,event.target===renderer.domElement);interaction.pointerDown(event,event.target===renderer.domElement);},move=(event:PointerEvent)=>interaction.pointerMove(event),end=(event:PointerEvent)=>{interaction.pointerUp(event,event.target===renderer.domElement);if(completion.pointerEnd(event.pointerId))scheduleCompletion();},cancel=(event:PointerEvent)=>{interaction.pointerCancel(event);if(completion.pointerEnd(event.pointerId))scheduleCompletion();};
  const onWheel=()=>finishInteraction();renderer.domElement.addEventListener("wheel",onWheel,{passive:true});
  // Capture across this document so a second finger on an overlay or a release
  // outside the canvas cancels the same pending peel gesture.
  window.addEventListener("pointerdown",start,true);window.addEventListener("pointermove",move,true);window.addEventListener("pointerup",end,true);window.addEventListener("pointercancel",cancel,true);
  const stopHold=()=>{completion.stop();interaction.stop();},visibility=()=>{if(document.hidden)stopHold();};window.addEventListener("blur",stopHold);document.addEventListener("visibilitychange",visibility);
  const lost=(e:Event)=>{e.preventDefault();interaction.stop();callbacks.current.onError("设备暂停了3D显示，请重新打开图谱。");};renderer.domElement.addEventListener("webglcontextlost",lost);
  const animate=()=>{if(dead)return;frame=requestAnimationFrame(animate);const s=latest.current;shorts.visible=surfaceClothingVisible(s);const now=performance.now(),elapsed=Math.min(100,Math.max(0,now-flowTick));flowTick=now;flowActive.value=s.flow?1:0;if(s.flow&&s.points&&!document.hidden){flowTime.value+=elapsed/1000*.35*Math.max(.25,Math.min(2,s.flowSpeed??1));dirty=true;}
   if(previous!==s||needsFit){dirty=true;
    const region=BODY_REGIONS.find(r=>r.id===s.region);regionPlanes.forEach((p,i)=>{p.constant=region?(i%2===0?-region.min[Math.floor(i/2)]:region.max[Math.floor(i/2)]):100;});
    const visible=new Set(s.visible),hidden=new Set(s.hidden),faded=new Set(s.faded),selected=new Set((s.selected?.startsWith("@system:")?[]:selectionParts(data.atlas,s.selected)).map(p=>p.id));
    data.atlas.parts.forEach((p,i)=>{const shown=p.id!=="FJ2815"&&(!region||boundsOverlap(p.bounds[0],p.bounds[1],region))&&!hidden.has(p.id)&&(s.isolate?(s.isolateIds?s.isolateIds.includes(p.id):selected.has(p.id)):visible.has(p.system));const group=SYSTEMS.findIndex(a=>a[0]===p.system),angle=group/SYSTEMS.length*Math.PI*2;const dx=Math.sin(angle)*s.explode*.35,dz=Math.cos(angle)*s.explode*.35;
     mask.set([dx,0,dz,shown?(selected.has(p.id)?2:1)*(faded.has(p.id)?-1:1):0],i*4);
    });picks.forEach(m=>{const i=m.userData.index;m.position.set(mask[i*4],0,mask[i*4+2]);m.updateMatrixWorld();});
    batches.forEach(b=>{b.mesh.visible=b.ids.some(i=>Math.abs(mask[i*4+3])>.5);});texture.needsUpdate=true;
    mats.forEach(m=>{m.opacity=s.opacity*(m.userData.clearMedia ? .12 : 1);m.transparent=!!m.userData.clearMedia||s.opacity<1||s.faded.length>0;m.depthWrite=!m.userData.clearMedia&&s.opacity>=1&&!s.faded.length;});plane.constant=s.section??100;
    dots.visible=s.points&&s.explode===0&&!s.isolate;lines.visible=dots.visible;
    const studyRoute=meridianPlan.catalogue.find(route=>route.id===s.meridian);
    dots.children.forEach(d=>{const p=data.points.find(p=>p.code===d.userData.code);d.visible=(!region||insideRegion(d.position.toArray() as Position3,region))&&(!s.meridian||p?.meridianId===s.meridian||!!studyRoute?.anchorCodes.includes(d.userData.code));const chosen=s.point===d.userData.code&&s.side===d.userData.side;(d as T.Mesh).material=chosen?chosenDotMaterial:dotMaterials.get(p?.meridianId||"")!;d.scale.setScalar(chosen?1.8:1);});
    lines.children.forEach(l=>{l.visible=!s.meridian||l.userData.id===s.meridian;});
    if(!previous||previous.reset!==s.reset||previous.view!==s.view||previous.focus!==s.focus||previous.point!==s.point||previous.side!==s.side||previous.region!==s.region||needsFit)fit();needsFit=false;previous=s;
   }controls.update();if(dirty){
    const candidates:(LabelCandidate&{button:HTMLButtonElement})[]=[];
    const head=BODY_REGIONS.find(r=>r.id==="head")!,focused=data.surface.points.find(p=>p.key===`${s.point}:${s.side}`)?.target.position;const headFocus=!!focused&&insideRegion(focused as Position3,head);
    for(const p of pointNames){p.button.style.display="none";if(!dots.visible||!p.dot.visible||(headFocus&&!insideRegion(p.dot.position.toArray() as Position3,head)))continue;const projected=p.dot.position.clone().project(camera),toCamera=camera.position.clone().sub(p.dot.position).normalize();if(projected.z< -1||projected.z>1||p.normal.dot(toCamera)<=.06)continue;const w=Math.max(28,p.name.length*12+6),anchorX=(projected.x+1)*el.clientWidth/2,anchorY=(-projected.y+1)*el.clientHeight/2;const x=anchorX+w+10<el.clientWidth?anchorX+7:anchorX-w-7;candidates.push({key:p.key,x,y:anchorY-12,width:w,height:24,selected:s.point===p.code&&s.side===p.side,button:p.button});}
    const canvasRect=el.getBoundingClientRect(),blocked=Array.from(el.closest(".atlas-viewer")?.querySelectorAll(".atlas-titlebar,.atlas-nav,.atlas-actions,.atlas-label,.atlas-quick-list,.atlas-side:not([hidden]),[data-atlas-point-summary]")||[]).map(node=>{const r=node.getBoundingClientRect();return{x:r.left-canvasRect.left,y:r.top-canvasRect.top,width:r.width,height:r.height};});
    for(const p of arrangePointLabels(candidates,el.clientWidth,el.clientHeight,s.meridian?Math.min(22,Math.max(8,Math.floor(el.clientWidth/35))):8,blocked)){Object.assign(p.button.style,{display:"block",left:p.x+"px",top:p.y+"px",fontWeight:p.selected?"700":"400",color:p.selected?"#ffb0df":"#fff",outline:"none"});}
    renderer.render(scene,camera);dirty=false;}
  };animate();
  return()=>{dead=true;window.removeEventListener("blur",stopHold);document.removeEventListener("visibilitychange",visibility);interaction.stop();cancelAnimationFrame(frame);cancelAnimationFrame(wheelFrame);renderer.domElement.removeEventListener("wheel",onWheel);observer.disconnect();controls.dispose();window.removeEventListener("pointerdown",start,true);window.removeEventListener("pointermove",move,true);renderer.domElement.removeEventListener("contextmenu",preventMenu);window.removeEventListener("pointerup",end,true);window.removeEventListener("pointercancel",cancel,true);renderer.domElement.removeEventListener("webglcontextlost",lost);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());texture.dispose();renderer.dispose();renderer.domElement.remove();names.remove();};
 },[data]);
 return <div ref={host} style={{width:"100%",height:"100%",touchAction:"none"}}/>;
}
