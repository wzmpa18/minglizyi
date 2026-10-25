"use client";
import {unzipSync} from 'fflate';
export interface LearningBundleFile {path:string;bytes:number;sha256:string;mime:string}
export interface LearningBundleMember {packId:string;version:string;sha256:string;bytes:number;entryPath:string}
export interface LearningBundleManifest {schema:'yandao.learning-bundle.v1';packId:'tcm-learning-complete'|'yixue-learning-complete';version:string;name:string;files:LearningBundleFile[];members:LearningBundleMember[]}
const safePath=(path:string)=>/^(?:data\/[a-z0-9-]+\.(?:json|pack)|assets\/(?:meridians|acupoint-photos)\/(?:skeleton\/)?[a-z0-9-]+\.(?:jpg|webp|png))$/.test(path);
const digest=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer))).map(x=>x.toString(16).padStart(2,'0')).join('');
function one(bytes:ArrayBuffer,path:string){return unzipSync(new Uint8Array(bytes),{filter:file=>file.name===path})[path];}
export function learningBundleManifest(bytes:ArrayBuffer):LearningBundleManifest {
 if(bytes.byteLength>300*1024*1024)throw Error('资料包超出当前容量范围');
 const raw=one(bytes,'manifest.json');if(!raw||raw.byteLength>1024*1024)throw Error('资料包目录无效');const m=JSON.parse(new TextDecoder().decode(raw)) as LearningBundleManifest;
 if(m.schema!=='yandao.learning-bundle.v1'||!['tcm-learning-complete','yixue-learning-complete'].includes(m.packId)||!/^\d+\.\d+\.\d+$/.test(m.version)||typeof m.name!=='string'||m.name.length>100||!Array.isArray(m.files)||m.files.length>5000||!Array.isArray(m.members)||m.members.length>40)throw Error('资料包目录协议不匹配');
 const files=new Map<string,LearningBundleFile>();let total=0;
 for(const f of m.files){if(!f||!safePath(f.path)||files.has(f.path)||!Number.isSafeInteger(f.bytes)||f.bytes<1||f.bytes>35*1024*1024||!/^[a-f0-9]{64}$/.test(f.sha256)||!['application/json','application/octet-stream','image/jpeg','image/webp','image/png'].includes(f.mime))throw Error('资料文件目录不完整');files.set(f.path,f);total+=f.bytes;}
 if(total>300*1024*1024)throw Error('资料解压容量超限');const ids=new Set<string>();
 for(const member of m.members){const file=files.get(member.entryPath);if(!/^[a-z0-9-]{2,80}$/.test(member.packId)||member.packId.endsWith('-learning-complete')||ids.has(member.packId)||!/^\d+\.\d+\.\d+$/.test(member.version)||!file||member.bytes!==file.bytes||member.sha256!==file.sha256||!member.entryPath.startsWith('data/'))throw Error('资料板块对应关系无效');ids.add(member.packId);}
 const seen=new Set<string>();unzipSync(new Uint8Array(bytes),{filter:file=>{if(seen.has(file.name)||file.name!=='manifest.json'&&!files.has(file.name))throw Error('资料包含未登记或重复文件');if(file.name!=='manifest.json'&&files.get(file.name)!.bytes!==file.originalSize)throw Error('资料声明尺寸不符');seen.add(file.name);return false;}});
 if(seen.size!==files.size+1||!seen.has('manifest.json'))throw Error('资料包缺件');return m;
}
export async function readLearningBundleFile(bytes:ArrayBuffer,path:string,expected?:{sha256:string;bytes:number}):Promise<Uint8Array>{
 const manifest=learningBundleManifest(bytes),record=manifest.files.find(f=>f.path===path);if(!record||expected&&(record.sha256!==expected.sha256||record.bytes!==expected.bytes))throw Error('资料文件未登记');const raw=one(bytes,path);if(!raw||raw.byteLength!==record.bytes||await digest(raw)!==record.sha256)throw Error('资料文件校验失败，原有效资料保留');return raw;
}
export async function validateLearningBundle(bytes:ArrayBuffer,expectedId:string,version:string):Promise<LearningBundleManifest>{
 const manifest=learningBundleManifest(bytes);if(manifest.packId!==expectedId||manifest.version!==version)throw Error('资料包版本对应错误');for(const record of manifest.files)await readLearningBundleFile(bytes,record.path,record);return manifest;
}
export function validateLearningBundleMedia(manifest:LearningBundleManifest,records:readonly {path:string;bytes:number;sha256:string;mime:string}[],referencedPaths:readonly string[]):void{
 const files=new Map(manifest.files.map(file=>[file.path,file])),paths=new Set<string>();
 for(const record of records){const file=files.get(record.path.replace(/^\//,''));if(paths.has(record.path)||!file||file.bytes!==record.bytes||file.sha256!==record.sha256||file.mime!==record.mime)throw Error('图片目录与完整资料包不一致，原有资料保留');paths.add(record.path);}
 if(referencedPaths.some(path=>!paths.has(path)))throw Error('文献引用的图片未完整收录，原有资料保留');
}
