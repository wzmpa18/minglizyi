import type {ViewState} from "./atlasState";

export interface SkinGeometry {positions:ArrayLike<number>;indices:ArrayLike<number>}
export interface SurfaceShorts {positions:Float32Array;indices:Uint32Array;colors:Float32Array;uvs:Float32Array;sampledTriangles:number}
type Triangle={x0:number;y0:number;z0:number;x1:number;y1:number;z1:number;x2:number;y2:number;z2:number;minX:number;maxX:number;minY:number;maxY:number;den:number};
const clamp=(value:number,min=0,max=1)=>Math.max(min,Math.min(max,value));
const blend=(a:number,b:number,t:number)=>a+(b-a)*t;
const smooth=(value:number)=>{const t=clamp(value);return t*t*(3-2*t);};
const softMaximum=(a:number,b:number,radius=.004)=>(a+b+Math.sqrt((a-b)*(a-b)+radius*radius))/2;
const TOP=1.025,HEM=.725,CLEARANCE=.003;

/** A separate fabric surface fitted to source skin, never a modification of anatomy. */
export function buildSurfaceShorts(skin:SkinGeometry):SurfaceShorts {
 if(skin.positions.length%3||skin.indices.length%3)throw Error("Invalid skin geometry");
 const triangles:Triangle[]=[];
 for(let i=0;i<skin.indices.length;i+=3){
  const a=skin.indices[i]*3,b=skin.indices[i+1]*3,c=skin.indices[i+2]*3;
  const x0=skin.positions[a],y0=skin.positions[a+1],z0=skin.positions[a+2],x1=skin.positions[b],y1=skin.positions[b+1],z1=skin.positions[b+2],x2=skin.positions[c],y2=skin.positions[c+1],z2=skin.positions[c+2];
  if(![x0,y0,z0,x1,y1,z1,x2,y2,z2].every(Number.isFinite))throw Error("Invalid skin coordinate");
  const minX=Math.min(x0,x1,x2),maxX=Math.max(x0,x1,x2),minY=Math.min(y0,y1,y2),maxY=Math.max(y0,y1,y2);
  if(minY>TOP+.012||maxY<HEM-.012||minX>.18||maxX<-.18)continue;
  triangles.push({x0,y0,z0,x1,y1,z1,x2,y2,z2,minX,maxX,minY,maxY,den:(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2)});
 }
 if(triangles.length<12)throw Error("Source skin is unavailable for clothing");
 // The arms are separate cross sections outside the pelvic frame. Measuring
 // the real surface avoids the old constant-depth slab and rectangular sides.
 const widths=Array.from({length:49},(_,row)=>{
  const y=blend(HEM,TOP,row/48);let width=.12;
  for(const t of triangles){if(y<t.minY||y>t.maxY)continue;
   const points=[[t.x0,t.y0],[t.x1,t.y1],[t.x2,t.y2]];
   for(let edge=0;edge<3;edge++){const a=points[edge],b=points[(edge+1)%3];if(a[1]===b[1]||y<Math.min(a[1],b[1])||y>Math.max(a[1],b[1]))continue;const x=blend(a[0],b[0],(y-a[1])/(b[1]-a[1]));if(Math.abs(x)<.18)width=Math.max(width,Math.abs(x));}
  }
  return Math.min(.176,width);
 });
 const widthAt=(y:number)=>{const at=clamp((y-HEM)/(TOP-HEM))*48,i=Math.min(47,Math.floor(at));return blend(widths[i],widths[i+1],at-i);};
 const sample=(x:number,y:number)=>{let front=-Infinity,back=Infinity;
  for(const t of triangles){if(x<t.minX-.00001||x>t.maxX+.00001||y<t.minY-.00001||y>t.maxY+.00001||Math.abs(t.den)<1e-12)continue;
   const a=((t.y1-t.y2)*(x-t.x2)+(t.x2-t.x1)*(y-t.y2))/t.den,b=((t.y2-t.y0)*(x-t.x2)+(t.x0-t.x2)*(y-t.y2))/t.den,c=1-a-b;
   if(a<-.0001||b<-.0001||c<-.0001)continue;const z=a*t.z0+b*t.z1+c*t.z2;front=Math.max(front,z);back=Math.min(back,z);
  }
  return Number.isFinite(front)?{front,back}:null;
 };
 const positions:number[]=[],indices:number[]=[],colors:number[]=[],uvs:number[]=[],columns=64,rows=32,stride=columns+1,panelSize=stride*(rows+1);
 const color=(u:number,v:number,y:number,front:boolean)=>{
  const band=y>1.005?1:0,hem=smooth((v-.955)/.045),seam=front?Math.exp(-Math.pow(u/.018,2))*.025:0;
  const shade=1-.24*band-.12*hem-seam;
  return [.075*shade,.155*shade,.265*shade]; // linear RGB; muted woven blue
 };
 for(let panel=0;panel<2;panel++)for(let row=0;row<=rows;row++)for(let column=0;column<=columns;column++){
  const u=column/columns*2-1,v=row/rows,front=panel===0;
  const crotch=Math.exp(-Math.pow(u/.18,2)),hem=HEM+(front?.04:.06)*crotch,y=blend(TOP,hem,v),bodyX=u*widthAt(y)*.995;
  const hit=sample(bodyX,y)||sample(bodyX*.98,y)||sample(bodyX*.94,y);
  let z=hit?(front?hit.front:hit.back):(front?.075:-.085);
  if(front&&Math.abs(bodyX)<.12&&y<.95){
   // A round, varying-depth fabric envelope bridges the crotch instead of
   // tracing genital skin or creating a constant-depth rectangular pouch.
   const peak=.078+.04*Math.exp(-Math.pow((y-.825)/.08,2));
   const envelope=peak*Math.sqrt(Math.max(0,1-Math.pow(bodyX/.12,2)));
   z=blend(z,softMaximum(z,envelope),smooth((.95-y)/.045));
  }else if(!front){
   // Fabric spans the gluteal cleft; it is not a skin-coloured anatomical cast.
   const peak=.09+.057*Math.exp(-Math.pow((y-.91)/.10,2));
   const envelope=peak*Math.sqrt(Math.max(0,1-Math.pow(bodyX/.18,2)));
   z=-softMaximum(-z,envelope);
  }
  z+=front?CLEARANCE:-CLEARANCE;
  positions.push(bodyX+u*CLEARANCE,y,z);colors.push(...color(u,v,y,front));uvs.push(column/columns,v);
 }
 for(let panel=0;panel<2;panel++)for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
  const a=panel*panelSize+row*stride+column,b=a+1,c=a+stride,d=c+1;
  if(panel===0)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);
 }
 // Side seams connect curved front/back surfaces, rather than an extrusion wall.
 for(let row=0;row<rows;row++)for(const column of [0,columns]){
  const a=row*stride+column,b=a+stride,c=a+panelSize,d=b+panelSize;
  if(column===0)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);
 }
 // A curved narrow gusset joins the two panels and leaves two real leg openings.
 const first=29,last=35,gussetRows=8,gusset:number[][]=[];
 for(let row=0;row<=gussetRows;row++){
  const line:number[]=[],t=row/gussetRows;
  for(let column=first;column<=last;column++){
   const a=rows*stride+column,b=a+panelSize;
   if(row===0){line.push(a);continue;}if(row===gussetRows){line.push(b);continue;}
   const index=positions.length/3,x=blend(positions[a*3],positions[b*3],t),y=blend(positions[a*3+1],positions[b*3+1],t)-.004*Math.sin(t*Math.PI),z=blend(positions[a*3+2],positions[b*3+2],t);
   positions.push(x,y,z);colors.push(.064,.132,.226);uvs.push(column/columns,1+t*.12);line.push(index);
  }
  gusset.push(line);
 }
 for(let row=0;row<gussetRows;row++)for(let column=0;column<last-first;column++){const a=gusset[row][column],b=gusset[row][column+1],c=gusset[row+1][column],d=gusset[row+1][column+1];indices.push(a,b,c,b,d,c);}
 return {positions:new Float32Array(positions),indices:new Uint32Array(indices),colors:new Float32Array(colors),uvs:new Float32Array(uvs),sampledTriangles:triangles.length};
}

export function surfaceClothingVisible(state:Pick<ViewState,"underwear"|"visible"|"hidden"|"faded"|"isolate"|"explode"|"opacity">):boolean {
 return state.underwear!==false&&state.visible.includes("integumentary")&&!state.hidden.includes("FJ2810")&&!state.faded.includes("FJ2810")&&!state.isolate&&state.explode===0&&state.opacity>=.99;
}
