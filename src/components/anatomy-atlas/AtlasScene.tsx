"use client";
// Adapted binary geometry decoding and GPU part masks from Human Atlas / JIC TCM 3D.
// MIT: see public/licenses/tcm-3d/CODE-LICENSE.txt. Geometry has separate CC BY 4.0 terms.
import {useEffect,useRef} from "react";
import * as T from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {mergeGeometries} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {softenPelvicSurface} from "./teaching-skin";
import {SYSTEMS,selectionParts,type Dataset} from "./atlasPack";
export interface ViewState {visible:string[];hidden:string[];selected:string|null;isolate:boolean;opacity:number;view:string;reset:number;points:boolean;meridian:string;point:string|null;side:1|-1;section:number|null;explode:number}
interface Props {data:Dataset;state:ViewState;onSelect:(id:string)=>void;onPoint:(code:string,side:1|-1)=>void;onReady:()=>void;onError:(message:string)=>void}
export default function AtlasScene({data,state,onSelect,onPoint,onReady,onError}:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(state),callbacks=useRef({onSelect,onPoint,onReady,onError});
 latest.current=state;callbacks.current={onSelect,onPoint,onReady,onError};
 useEffect(()=>{
  const el=host.current;if(!el)return;let dead=false,frame=0;
  const geometries:T.BufferGeometry[]=[],materials:T.Material[]=[];
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:false});}catch{callbacks.current.onError("设备暂不支持3D显示，可继续使用原图谱与文字学习。");return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.localClippingEnabled=true;renderer.setClearColor(0xf7f4ef);el.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-label","三维人体：拖动旋转，双指或滚轮缩放，点击结构或穴位");
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.005,100),controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.minDistance=.08;controls.maxDistance=8;controls.target.set(0,.85,0);camera.position.set(.8,1,3.5);
  scene.add(new T.HemisphereLight(0xffffff,0x8c8279,2.7));const light=new T.DirectionalLight(0xffffff,3);light.position.set(2,3,4);scene.add(light);
  const backlight=new T.DirectionalLight(0xe1ecff,1.8);backlight.position.set(-2,1,-2);scene.add(backlight);
  const width=T.MathUtils.ceilPowerOfTwo(data.atlas.parts.length),mask=new Float32Array(width*4),texture=new T.DataTexture(mask,width,1,T.RGBAFormat,T.FloatType);texture.needsUpdate=true;
  const plane=new T.Plane(new T.Vector3(0,-1,0),1.7),picks:T.Mesh[]=[],batches:{mesh:T.Mesh;ids:number[]}[]=[];
  const mats=new Map(SYSTEMS.map(([id,,color])=>{
   const m=new T.MeshStandardMaterial({color,roughness:.65,side:T.DoubleSide,clippingPlanes:[plane]});materials.push(m);
   m.onBeforeCompile=shader=>{
    shader.uniforms.partMask={value:texture};shader.uniforms.maskWidth={value:width};
    shader.vertexShader="attribute float partIndex;uniform sampler2D partMask;uniform float maskWidth;varying float shown;varying float chosen;\n"+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nvec4 state=texture2D(partMask,vec2((partIndex+0.5)/maskWidth,0.5));transformed+=state.xyz;shown=abs(state.w);chosen=step(1.5,abs(state.w));");
    shader.fragmentShader="varying float shown;varying float chosen;\n"+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace("#include <clipping_planes_fragment>","#include <clipping_planes_fragment>\nif(shown<0.5)discard;");
    shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>","#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.35,0.74,0.66),chosen*0.7);");
   };return [id,m] as const;
  }));
  const dotGeometry=new T.SphereGeometry(.0035,6,5);geometries.push(dotGeometry);
  const dotMaterial=new T.MeshBasicMaterial({color:0x8a3262});materials.push(dotMaterial);
  const dots=new T.Group(),lines=new T.Group();scene.add(dots,lines);
  for(const point of data.surface.points){
   const dot=new T.Mesh(dotGeometry,dotMaterial),[code,side]=point.key.split(":");
   dot.position.fromArray(point.target.position).addScaledVector(new T.Vector3().fromArray(point.target.normal),.0015);
   dot.userData={code,side:Number(side)};dots.add(dot);
  }
  for(const path of data.surface.paths){const values=path.vertices;if(!Array.isArray(values))continue;
   const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(values as number[],3));geometries.push(g);
   const material=new T.LineBasicMaterial({color:0x87639e});materials.push(material);const line=new T.LineSegments(g,material);line.userData.id=path.id;lines.add(line);
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
  let previous:ViewState|null=null;
  const resize=()=>{const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  const fit=()=>{const s=latest.current;const direction=s.view==="back"?new T.Vector3(0,0,-1):s.view==="side"?new T.Vector3(1,0,0):new T.Vector3(0,0,1);let center=new T.Vector3(0,.85,0),distance=Math.max(3,1.05/camera.aspect);
   const parts=selectionParts(data.atlas,s.selected);if(s.isolate&&parts.length){const box=new T.Box3();parts.forEach(p=>box.union(new T.Box3(new T.Vector3().fromArray(p.bounds[0]),new T.Vector3().fromArray(p.bounds[1]))));center=box.getCenter(new T.Vector3());const size=box.getSize(new T.Vector3());distance=Math.max(.12,Math.max(size.y,size.x/camera.aspect,size.z)/(2*Math.tan(T.MathUtils.degToRad(17)))*1.4);}
   if(s.point&&!s.isolate){const target=data.surface.points.find(p=>p.key===`${s.point}:${s.side}`)?.target;if(target){center=new T.Vector3().fromArray(target.position);direction.fromArray(target.normal).normalize();distance=.55;}}
   controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance);controls.update();};
  const ray=new T.Raycaster(),mouse=new T.Vector2(),pointers=new Set<number>();let down:{x:number;y:number;id:number}|null=null;
  const start=(e:PointerEvent)=>{pointers.add(e.pointerId);down=pointers.size===1?{x:e.clientX,y:e.clientY,id:e.pointerId}:null;};
  const end=(e:PointerEvent)=>{pointers.delete(e.pointerId);if(!down||e.pointerId!==down.id||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6){down=null;return;}down=null;
   const rect=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);
   const s=latest.current;
   if(s.points){const hit=ray.intersectObjects(dots.children.filter(d=>d.visible))[0];if(hit){callbacks.current.onPoint(hit.object.userData.code,hit.object.userData.side);return;}}
   const hits=ray.intersectObjects(picks.filter(m=>mask[m.userData.index*4+3]>.5)).filter(h=>s.section===null||h.point.y<=s.section);
   if(hits[0])callbacks.current.onSelect(data.atlas.parts[hits[0].object.userData.index].id);
  };
  const cancel=(e:PointerEvent)=>{pointers.delete(e.pointerId);down=null;};renderer.domElement.addEventListener("pointerdown",start);renderer.domElement.addEventListener("pointerup",end);renderer.domElement.addEventListener("pointercancel",cancel);
  const lost=(e:Event)=>{e.preventDefault();callbacks.current.onError("设备暂停了3D显示，请重新打开图谱。");};renderer.domElement.addEventListener("webglcontextlost",lost);
  const animate=()=>{if(dead)return;frame=requestAnimationFrame(animate);const s=latest.current;
   if(previous!==s){
    const visible=new Set(s.visible),hidden=new Set(s.hidden),selected=new Set(selectionParts(data.atlas,s.selected).map(p=>p.id));
    data.atlas.parts.forEach((p,i)=>{const shown=!hidden.has(p.id)&&(s.isolate?selected.has(p.id):visible.has(p.system));const group=SYSTEMS.findIndex(a=>a[0]===p.system),angle=group/SYSTEMS.length*Math.PI*2;const dx=Math.sin(angle)*s.explode*.35,dz=Math.cos(angle)*s.explode*.35;
     mask.set([dx,0,dz,shown?(selected.has(p.id)?2:1):0],i*4);
    });picks.forEach(m=>{const i=m.userData.index;m.position.set(mask[i*4],0,mask[i*4+2]);m.updateMatrixWorld();});
    batches.forEach(b=>{b.mesh.visible=b.ids.some(i=>mask[i*4+3]>.5);});texture.needsUpdate=true;
    mats.forEach(m=>{m.opacity=s.opacity;m.transparent=s.opacity<1;m.depthWrite=s.opacity>=1;});plane.constant=s.section??100;
    dots.visible=s.points&&s.explode===0&&!s.isolate;lines.visible=dots.visible;
    dots.children.forEach(d=>{const p=data.points.find(p=>p.code===d.userData.code);d.visible=!s.meridian||p?.meridianId===s.meridian;d.scale.setScalar(s.point===d.userData.code&&s.side===d.userData.side?1.8:1);});
    lines.children.forEach(l=>{l.visible=!s.meridian||l.userData.id===s.meridian;});
    if(!previous||previous.reset!==s.reset||previous.view!==s.view||previous.isolate!==s.isolate||previous.point!==s.point||previous.side!==s.side)fit();previous=s;
   }controls.update();renderer.render(scene,camera);
  };animate();
  return()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener("pointerdown",start);renderer.domElement.removeEventListener("pointerup",end);renderer.domElement.removeEventListener("pointercancel",cancel);renderer.domElement.removeEventListener("webglcontextlost",lost);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());texture.dispose();renderer.dispose();renderer.domElement.remove();};
 },[data]);
 return <div ref={host} style={{width:"100%",height:"100%",touchAction:"none"}}/>;
}
