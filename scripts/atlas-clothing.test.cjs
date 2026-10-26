const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {buildSurfaceShorts,surfaceClothingVisible}=require('../src/components/anatomy-atlas/atlasClothing.ts');
const {initialView}=require('../src/components/anatomy-atlas/atlasState.ts');

// Deliberately synthetic closed surfaces, not anatomical coordinates or assets.
function fixture(){const positions=[],indices=[];
 function ellipsoid(cx,cy,cz,rx,ry,rz){const start=positions.length/3,n=32,m=24;for(let row=0;row<=m;row++){const p=Math.PI*row/m;for(let col=0;col<=n;col++){const t=2*Math.PI*col/n;positions.push(cx+rx*Math.sin(p)*Math.cos(t),cy+ry*Math.cos(p),cz+rz*Math.sin(p)*Math.sin(t));}}for(let row=0;row<m;row++)for(let col=0;col<n;col++){const a=start+row*(n+1)+col,b=a+1,c=a+n+1,d=c+1;indices.push(a,c,b,b,c,d);}}
 ellipsoid(0,.98,-.015,.16,.22,.115);ellipsoid(-.083,.67,-.015,.079,.27,.09);ellipsoid(.083,.67,-.015,.079,.27,.09);ellipsoid(0,.826,.082,.028,.046,.041);
 return {positions:new Float32Array(positions),indices:new Uint32Array(indices)};
}
const source=fixture(),digest=arrays=>arrays.map(a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex')).join(':'),before=digest([source.positions,source.indices]),fabric=buildSurfaceShorts(source);
function boundaries(mesh){const edges=new Map();for(let i=0;i<mesh.indices.length;i+=3)for(let j=0;j<3;j++){const a=mesh.indices[i+j],b=mesh.indices[i+(j+1)%3],key=a<b?a+':'+b:b+':'+a;edges.set(key,(edges.get(key)||0)+1);}const graph=new Map();for(const [key,count] of edges){assert.ok(count<=2,'cloth has no non-manifold edge');if(count!==1)continue;const [a,b]=key.split(':').map(Number);for(const [x,y] of [[a,b],[b,a]]){const list=graph.get(x)||[];list.push(y);graph.set(x,list);}}for(const neighbours of graph.values())assert.equal(neighbours.length,2,'every opening is a closed loop');let count=0;const visited=new Set();for(const start of graph.keys()){if(visited.has(start))continue;count++;const queue=[start];while(queue.length){const id=queue.pop();if(visited.has(id))continue;visited.add(id);queue.push(...graph.get(id));}}return count;}
function frontAt(mesh,x,y){let z=-Infinity;for(let i=0;i<mesh.indices.length;i+=3){const a=mesh.indices[i]*3,b=mesh.indices[i+1]*3,c=mesh.indices[i+2]*3,p=mesh.positions,x0=p[a],y0=p[a+1],x1=p[b],y1=p[b+1],x2=p[c],y2=p[c+1];if(x<Math.min(x0,x1,x2)||x>Math.max(x0,x1,x2)||y<Math.min(y0,y1,y2)||y>Math.max(y0,y1,y2))continue;const denominator=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2);if(Math.abs(denominator)<1e-12)continue;const u=((y1-y2)*(x-x2)+(x2-x1)*(y-y2))/denominator,v=((y2-y0)*(x-x2)+(x0-x2)*(y-y2))/denominator,w=1-u-v;if(Math.min(u,v,w)>=-1e-5)z=Math.max(z,u*p[a+2]+v*p[b+2]+w*p[c+2]);}return z;}

test('surface garment has a waist and two distinct leg openings, finite curved geometry and bounded size',()=>{
 assert.equal(fabric.positions.length/3,fabric.colors.length/3);assert.equal(fabric.uvs.length/2,fabric.positions.length/3);assert.ok(fabric.positions.length/3>1000&&fabric.positions.length/3<20000);
 for(const value of fabric.positions)assert.ok(Number.isFinite(value));for(const value of fabric.colors)assert.ok(value>=0&&value<=1);for(const id of fabric.indices)assert.ok(id>=0&&id<fabric.positions.length/3);
 assert.equal(boundaries(fabric),3);const depths=[];for(let i=2;i<fabric.positions.length;i+=3)depths.push(fabric.positions[i]);assert.ok(Math.max(...depths)-Math.min(...depths)>.15,'fabric wraps the front and back');assert.ok(new Set(depths.map(n=>n.toFixed(3))).size>100,'surface is not a constant-depth extrusion');
});

test('fabric covers the front centre without editing original skin or source coordinates',()=>{
 assert.equal(digest([source.positions,source.indices]),before);let checked=0;for(const x of [-.025,-.012,0,.012,.025])for(const y of [.79,.81,.83,.85,.87]){const skin=frontAt(source,x,y),cloth=frontAt(fabric,x,y);assert.ok(Number.isFinite(cloth));assert.ok(cloth>=skin-.001,'source centre must not penetrate fabric');checked++;}assert.equal(checked,25);
});

test('clothing follows its switch and never obstructs peeled, faded, isolated or internal observation',()=>{
 const state=initialView(),copy=JSON.stringify(state);assert.equal(surfaceClothingVisible(state),true);
 for(const change of [{underwear:false},{visible:['skeletal']},{hidden:['FJ2810']},{faded:['FJ2810']},{isolate:true},{explode:.2},{opacity:.65}])assert.equal(surfaceClothingVisible({...state,...change}),false);
 assert.equal(surfaceClothingVisible({...state,hidden:['FJ2813']}),true);assert.equal(JSON.stringify(state),copy);
});
