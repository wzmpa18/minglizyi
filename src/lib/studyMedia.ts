'use client';
import animations from '../../public/assets/meridians/ANIMATION-MANIFEST.json';
import photos from '../../public/assets/acupoint-photos/MANIFEST.json';
import { readOfflineFile, writeOfflineFile } from './durableOfflineStore';

export interface StudyAsset { path: string; bytes: number; sha256: string; mime: string }
export interface StudyMediaManifest { schema: 'yandao.study-media.v1'; version: number; records: StudyAsset[] }
const ORIGIN = 'https://yandaoguoxue.yandao.vip';
export const bundledStudyMedia: StudyMediaManifest = {
  schema: 'yandao.study-media.v1', version: 2026102501,
  records: [...animations.records.map(r => ({path:r.asset,bytes:r.bytes,sha256:r.sha256,mime:'image/webp'})),
    ...photos.records.map(r => ({path:'/assets/acupoint-photos/'+r.file,bytes:r.bytes,sha256:r.sha256,mime:r.file.endsWith('.jpg')?'image/jpeg':'image/webp'}))],
};
const active = new Map<string, Promise<string>>();
type AssetReader=(path:string)=>Promise<Uint8Array>;
let archiveReader:AssetReader|undefined;
let installedArchive:Promise<ArrayBuffer|null>|undefined;
async function fromInstalledArchive<T>(read:(bytes:ArrayBuffer)=>Promise<T>):Promise<T|null>{
  const {loadPackContent}=await import('./offlinePackClient');
  if(!installedArchive)installedArchive=loadPackContent('tcm-learning-complete');
  const request=installedArchive;
  try{const bytes=await request;return bytes?await read(bytes):null;}finally{if(installedArchive===request)installedArchive=undefined;}
}
async function recoverArchiveImage(path:string):Promise<Uint8Array|null>{
  return fromInstalledArchive(async bytes=>(await import('./learningBundleCodec')).readLearningBundleFile(bytes,path.replace(/^\//,'')));
}
async function recoverArchiveCatalogue():Promise<StudyMediaManifest|null>{
  return fromInstalledArchive(async bytes=>{
    const codec=await import('./learningBundleCodec');
    const raw=await codec.readLearningBundleFile(bytes,'data/tcm-study-media.json');
    const next=validateStudyMedia(JSON.parse(new TextDecoder().decode(raw)));
    codec.validateLearningBundleMedia(codec.learningBundleManifest(bytes),next.records,[]);
    return next;
  });
}
async function saveCatalogue(next:StudyMediaManifest){
  await writeOfflineFile('study-media-manifest',next);
  if(JSON.stringify(await readOfflineFile('study-media-manifest'))!==JSON.stringify(next))throw Error('图片目录保存未完成');
}
async function retainedCatalogue(){
  const previous=await readOfflineFile<StudyMediaManifest>('study-media-manifest').catch(()=>null);
  try{if(previous&&validateStudyMedia(previous).version>=bundledStudyMedia.version)return previous;}catch{/* preserve bundled originals */}
  return bundledStudyMedia;
}
export function releaseStudyMediaReader(){archiveReader=undefined;}
export async function installStudyMediaCatalogue(raw:unknown,reader:AssetReader){
  const next=validateStudyMedia(raw);
  const previous=await retainedCatalogue(),selected=previous.version>next.version?previous:next;
  if(selected===next)await saveCatalogue(next);
  archiveReader=reader;manifest=Promise.resolve(selected);
}
let manifest: Promise<StudyMediaManifest> | undefined;
export function validateStudyMedia(raw: unknown): StudyMediaManifest {
  const m = raw as StudyMediaManifest;
  if (!m || m.schema !== 'yandao.study-media.v1' || !Number.isSafeInteger(m.version) || !Array.isArray(m.records) || m.records.length > 2000) throw Error('图片目录无效');
  const paths = new Set<string>();
  for (const r of m.records) {
    if (!r || !/^\/assets\/(?:meridians|acupoint-photos)\/(?:skeleton\/)?[a-z0-9-]+\.(?:webp|jpg|png)$/.test(r.path) || paths.has(r.path) ||
        !/^[a-f0-9]{64}$/.test(r.sha256) || !Number.isSafeInteger(r.bytes) || r.bytes < 100 || r.bytes > 5_000_000 ||
        !['image/webp','image/jpeg','image/png'].includes(r.mime)) throw Error('图片目录校验失败');
    paths.add(r.path);
  }
  // Remote updates cannot quietly remove retained original animations/photos.
  if (bundledStudyMedia.records.some(original => {const current=m.records.find(r=>r.path===original.path);return !current||current.sha256!==original.sha256||current.bytes!==original.bytes||current.mime!==original.mime;})) throw Error('图片目录缺少原有资料或改动了受保护原件');
  return m;
}
export function studyMediaManifest(): Promise<StudyMediaManifest> {
  if (!manifest) manifest = (async () => {
    let retained=await retainedCatalogue();
    try{
      const archived=await recoverArchiveCatalogue();
      if(archived){
        if(archived.version>=retained.version){
          // The verified local archive remains a usable source even if a
          // separate metadata write was interrupted or cannot be read back.
          retained=archived;
          try{await saveCatalogue(archived);}catch{/* retry recovery next session; no data download */}
        }
        return retained;
      }
    }catch{/* a damaged archive never replaces a usable retained catalogue */}
    try {
      const response = await fetch(ORIGIN+'/data/tcm-study-media.json',{cache:'no-cache',credentials:'omit',signal:AbortSignal.timeout(5000)});
      if (!response.ok) throw Error('offline');
      const text = await response.text(); if (text.length > 1_000_000) throw Error('oversize');
      const next = validateStudyMedia(JSON.parse(text));
      if (next.version >= retained.version) { await saveCatalogue(next); retained = next; }
    } catch { /* durable or bundled catalogue remains available */ }
    return retained;
  })();
  return manifest;
}
if(typeof window!=='undefined')window.addEventListener('offline-pack-installed',event=>{
  const packId=(event as CustomEvent<{packId:string}>).detail?.packId;
  if(packId==='tcm-learning-complete'||packId==='tcm-study-media'){manifest=undefined;installedArchive=undefined;}
});
async function hash(bytes: Uint8Array) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer))).map(x=>x.toString(16).padStart(2,'0')).join('');
}
function encode(bytes: Uint8Array) { let value=''; for(let i=0;i<bytes.length;i+=8192)value+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(value); }
function decode(value: string) { return Uint8Array.from(atob(value),c=>c.charCodeAt(0)); }
export async function retainedStudyImage(path: string): Promise<string> {
  let catalog=await studyMediaManifest(),selected=catalog.records.find(r=>r.path===path);
  if(!selected){
    // A page may have cached the 30 bundled records before a complete archive
    // was installed. Repair that catalogue without downloading the archive.
    try{const archived=await recoverArchiveCatalogue();if(archived&&archived.version>=catalog.version){catalog=archived;selected=catalog.records.find(r=>r.path===path);manifest=Promise.resolve(archived);try{await saveCatalogue(archived);}catch{/* verified local data remains readable */}}}catch{/* normal missing-record error below */}
  }
  const record=selected;
  if (!record) throw Error('此图片尚未列入已核对目录');
  if (active.has(record.sha256)) return active.get(record.sha256)!;
  const task = (async () => {
    const key='study-image-'+record.sha256;
    const saved = await readOfflineFile<{data:string}> (key).catch(()=>null);
    if (saved?.data) { try { const bytes=decode(saved.data); if(bytes.length===record.bytes && await hash(bytes)===record.sha256)return 'data:'+record.mime+';base64,'+saved.data; } catch { /* retry a valid source */ } }
    const isBundled=bundledStudyMedia.records.some(r=>r.path===path&&r.sha256===record.sha256);
    const archived=archiveReader?await archiveReader(path).catch(()=>null):await recoverArchiveImage(path).catch(()=>null);
    if(archived){
      const bytes=archived;
      if(bytes.length!==record.bytes||await hash(bytes)!==record.sha256)throw Error('资料包中的图片校验失败');
      const data=encode(bytes);await writeOfflineFile(key,{data,sha256:record.sha256,mime:record.mime});
      if((await readOfflineFile<{data:string}>(key))?.data!==data)throw Error('图片保存读回失败');
      return 'data:'+record.mime+';base64,'+data;
    }
    const urls=isBundled?[path,ORIGIN+path]:[];
    if(!isBundled){
      const {fetchWithAuth}=await import('./authInterceptor');
      const response=await fetchWithAuth((process.env.NEXT_PUBLIC_API_BASE||'')+'/api/offline/study-image-link?path='+encodeURIComponent(path),{cache:'no-store'});
      if(!response.ok)throw Error('登录后可加载原图，已保存图片仍可离线查看');
      const info=await response.json(),url=new URL(info.downloadUrl);
      const extension=record.mime==='image/jpeg'?'jpg':record.mime==='image/png'?'png':'webp';
      if(info.success!==true||info.path!==path||info.sha256!==record.sha256||info.bytes!==record.bytes||info.mime!==record.mime||url.protocol!=='https:'||url.username||url.password||url.port||url.hash||!/^[a-z0-9-]+-\d+\.cos\.[a-z0-9-]+\.myqcloud\.com$/i.test(url.hostname)||url.pathname!=='/learning-content/study-media/'+record.sha256+'.'+extension)throw Error('原图下载地址校验未通过');
      urls.push(url.href);
    }
    for(const url of urls) {
      try {
        const response=await fetch(url,{credentials:'omit',cache:'no-cache',signal:AbortSignal.timeout(20000)});
        if(!response.ok)continue; const bytes=new Uint8Array(await response.arrayBuffer());
        if(bytes.length!==record.bytes || await hash(bytes)!==record.sha256)continue;
        const data=encode(bytes);await writeOfflineFile(key,{data,sha256:record.sha256,mime:record.mime});
        const read=await readOfflineFile<{data:string}>(key);if(read?.data!==data)throw Error('图片未保存成功');
        return 'data:'+record.mime+';base64,'+data;
      } catch { /* try the original local copy / cloud without deleting a valid image */ }
    }
    throw Error('图片暂未下载完成，请联网重试；原有资料保留');
  })();
  active.set(record.sha256,task);
  // Completed images live on disk; do not keep every full image in JS memory.
  void task.finally(()=>active.delete(record.sha256)).catch(()=>{});
  return task;
}
export async function prepareStudyImages(progress?:(done:number,total:number)=>void) {
  const catalog=await studyMediaManifest();let done=0;
  for(const record of catalog.records){await retainedStudyImage(record.path);progress?.(++done,catalog.records.length);}
  await writeOfflineFile('study-media-ready',{version:catalog.version,images:done,preparedAt:Date.now()});
}
