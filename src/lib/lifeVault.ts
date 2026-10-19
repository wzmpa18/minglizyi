import {LifeSearchIndex,lifeSearchText,validateLifeEntry,type LifeEntry,type LifeAttachment,type LifeRevision} from "./lifeRecords";
import {b64,unb64,randomBytes,importVaultKey,passwordKey,seal,unseal,sha256,type Sealed} from "./lifeVaultCrypto";
export interface VaultStorage {commit:(rows:{key:string;value:unknown}[],check?:{key:string;etag:string|null})=>Promise<void>;read:<T>(key:string)=>Promise<T|undefined>;page:(prefix:string,after?:string,limit?:number)=>Promise<{key:string;value:unknown}[]>;}
export interface VaultHeader {schema:1;id:string;createdAt:string;salt:string;password:Sealed;recoverySalt:string;recovery:Sealed;}
export interface VaultBackup {format:"YANDAO_PRIVATE_BACKUP";schema:1;kdf:"PBKDF2-SHA256-600000";salt:string;payload:Sealed;}
const registry="life:registry:v1",headerKey=(id:string)=>`life:${id}:header`,prefix=(id:string)=>`life:${id}:data:`;
const aad=(id:string,key:string)=>`life-v1|${id}|${key}`;
export class LifeVault {
 readonly storage:VaultStorage;readonly header:VaultHeader;
 readonly index=new LifeSearchIndex();readonly entries=new Map<string,LifeEntry>();
 private key:CryptoKey|null=null;private root:Uint8Array|null=null;private chain=Promise.resolve();
 private constructor(storage:VaultStorage,header:VaultHeader){this.storage=storage;this.header=header;}
 static async list(storage:VaultStorage){return await storage.read<{id:string;createdAt:string}[]>(registry)||[];}
 private static async register(storage:VaultStorage,h:VaultHeader){
  for(let attempt=0;attempt<5;attempt++){const marker=await storage.read<{etag:string}>(registry+":generation"),list=await LifeVault.list(storage);if(list.some(x=>x.id===h.id))return;try{await storage.commit([{key:registry,value:[...list,{id:h.id,createdAt:h.createdAt}]},{key:registry+":generation",value:{etag:crypto.randomUUID()}}],{key:registry+":generation",etag:marker?.etag??null});return;}catch{if(attempt===4)throw Error("档案目录并发更新，请重试；原档案未覆盖");}}
 }
 static async create(storage:VaultStorage,password:string,register=true){
  const id=crypto.randomUUID(),createdAt=new Date().toISOString(),salt=b64(randomBytes(16)),recoverySalt=b64(randomBytes(16)),root=randomBytes(32),recoveryCode=b64(randomBytes(32));
  const header:VaultHeader={schema:1,id,createdAt,salt,recoverySalt,password:await seal(await passwordKey(password,salt),b64(root),aad(id,"password")),recovery:await seal(await passwordKey(recoveryCode,recoverySalt),b64(root),aad(id,"recovery"))};
  await storage.commit([{key:headerKey(id),value:header}]);if(register)await LifeVault.register(storage,header);
  const vault=new LifeVault(storage,header);vault.root=root;vault.key=await importVaultKey(root);return {vault,recoveryCode};
 }
 static async open(storage:VaultStorage,id:string,password:string,recovery=false){
  const h=await storage.read<VaultHeader>(headerKey(id));if(!h||h.schema!==1||h.id!==id)throw Error("档案不存在或版本不受支持");
  const root=unb64(await unseal<string>(await passwordKey(password,recovery?h.recoverySalt:h.salt),recovery?h.recovery:h.password,aad(id,recovery?"recovery":"password")));
  const vault=new LifeVault(storage,h);vault.root=root;vault.key=await importVaultKey(root);await vault.reload();return vault;
 }
 get id(){return this.header.id;}
 get unlocked(){return !!this.key;}
 lock(){this.key=null;this.root?.fill(0);this.root=null;this.entries.clear();this.index.clear();}
 private active(){if(!this.key)throw Error("档案已锁定，请用独立档案密码解锁");return this.key;}
 private serial<T>(run:()=>Promise<T>):Promise<T>{const task=this.chain.then(run);this.chain=task.then(()=>{},()=>{});return task;}
 private async read<T>(key:string){const row=await this.storage.read<Sealed>(prefix(this.id)+key);return row?unseal<T>(this.active(),row,aad(this.id,key)):undefined;}
 private async rows(){const all:{key:string;value:unknown}[]=[];let after="";for(;;){const page=await this.storage.page(prefix(this.id),after,100);all.push(...page);if(page.length<100)break;after=page.at(-1)!.key;}return all;}
 async reload(){this.active();this.entries.clear();this.index.clear();let after="";for(;;){const page=await this.storage.page(prefix(this.id)+"entry:",after,100);for(const r of page){const key=r.key.slice(prefix(this.id).length),e=await unseal<LifeEntry>(this.active(),r.value as Sealed,aad(this.id,key));validateLifeEntry(e,this.id);this.entries.set(e.id,e);if(!e.deletedAt)this.index.put(e.id,lifeSearchText(e));}if(page.length<100)break;after=page.at(-1)!.key;}}
 newEntry():LifeEntry {this.active();const now=new Date().toISOString();return {schema:1,id:crypto.randomUUID(),ownerProfileId:this.id,dataClass:"PRIVATE_LOCAL",consentScope:"LOCAL_ONLY",title:"",text:"",occurredAt:now,createdAt:now,updatedAt:now,categories:["生活随记"],tags:[],people:[],sourceRefs:[{kind:"SELF"}],attachments:[],revision:0,draft:true};}
 async save(input:LifeEntry,keepVersion=true){return this.serial(async()=>{
  this.active();validateLifeEntry(input,this.id);const stored=await this.storage.read<Sealed>(prefix(this.id)+"entry:"+input.id);const previous=stored?await unseal<LifeEntry>(this.active(),stored,aad(this.id,"entry:"+input.id)):undefined;
  if(previous&&previous.revision!==input.revision)throw Error("此记录已被另一页面修改；请保留当前草稿，刷新后比较，未覆盖原记录");
  const entry:LifeEntry={...structuredClone(input),updatedAt:new Date().toISOString(),revision:(previous?.revision||0)+1};
  const rows:{key:string;value:unknown}[]=[];
  if(previous&&keepVersion){const k=`revision:${entry.id}:${String(previous.revision).padStart(12,"0")}`;rows.push({key:prefix(this.id)+k,value:await seal(this.active(),{entry:previous,savedAt:entry.updatedAt} satisfies LifeRevision,aad(this.id,k))});}
  rows.push({key:prefix(this.id)+"generation",value:{etag:crypto.randomUUID()}});
  const k="entry:"+entry.id;rows.push({key:prefix(this.id)+k,value:await seal(this.active(),entry,aad(this.id,k))});
  await this.storage.commit(rows,{key:prefix(this.id)+k,etag:stored?.etag??null});const verified=await this.read<LifeEntry>(k);if(verified?.revision!==entry.revision)throw Error("未能核实保存，请保留当前输入");
  this.entries.set(entry.id,entry);if(entry.deletedAt)this.index.remove(entry.id);else this.index.put(entry.id,lifeSearchText(entry));return structuredClone(entry);
 });}
 async versions(id:string){const page=await this.storage.page(prefix(this.id)+`revision:${id}:`,"",1000);return Promise.all(page.map(r=>unseal<LifeRevision>(this.active(),r.value as Sealed,aad(this.id,r.key.slice(prefix(this.id).length)))));}
 async addAttachment(file:File):Promise<LifeAttachment>{return this.serial(async()=>{
  this.active();if(!["image/jpeg","image/png","image/webp","application/pdf","text/plain"].includes(file.type))throw Error("仅支持JPEG/PNG/WebP、PDF和纯文字；不会执行HTML、SVG或宏");
  // Explicit capability bound, never truncate or silently compress original files.
  if(file.size>64*1024*1024)throw Error("此版本单个原件上限64MiB，未导入或截断；请按页选择，原文件不变");
  const estimate=typeof navigator!=="undefined"?await navigator.storage?.estimate?.():undefined;
  if(estimate?.quota&&estimate.usage!==undefined&&estimate.quota-estimate.usage<file.size*2)throw Error("剩余空间不足，未导入；不会自动删除旧记录");
  const attachment:LifeAttachment={id:crypto.randomUUID(),name:file.name,type:file.type,bytes:file.size,sha256:"",chunks:[]};
  const original=new Uint8Array(await file.arrayBuffer());attachment.sha256=await sha256(original);
  for(let offset=0;offset<original.length;offset+=512*1024){const key=`blob:${attachment.id}:${offset}`,value=b64(original.subarray(offset,offset+512*1024));await this.storage.commit([{key:prefix(this.id)+key,value:await seal(this.active(),value,aad(this.id,key))}]);attachment.chunks.push(key);}
  return attachment;
 });}
 async attachment(a:LifeAttachment){const chunks:Uint8Array[]=[];for(const key of a.chunks){const value=await this.read<string>(key);if(value===undefined)throw Error("原件分块缺失，请从有效备份恢复");chunks.push(unb64(value));}const bytes=new Uint8Array(a.bytes);let i=0;for(const c of chunks){if(i+c.length>bytes.length)throw Error("原件长度错误");bytes.set(c,i);i+=c.length;}if(i!==a.bytes||await sha256(bytes)!==a.sha256)throw Error("原件校验失败，未展示损坏内容");return new Blob([bytes],{type:a.type});}
 async backup(password:string):Promise<Blob>{return this.serial(async()=>{
  this.active();const generation=await this.storage.read<{etag:string}>(prefix(this.id)+"generation");const rows=(await this.rows()).filter(r=>!r.key.endsWith(":generation"));const after=await this.storage.read<{etag:string}>(prefix(this.id)+"generation");if(generation?.etag!==after?.etag)throw Error("备份期间档案发生修改，请停止其他页面的写入后重试，原备份不变");if(JSON.stringify(rows).length>180*1024*1024)throw Error("此版本完整包上限约180MiB，请分档案备份；未生成无法恢复的超大包");const salt=b64(randomBytes(16));
  const body={schema:1,header:this.header,root:b64(this.root!),rows,counts:{entries:this.entries.size,attachments:[...this.entries.values()].reduce((n,e)=>n+e.attachments.length,0)},madeAt:new Date().toISOString()};
  const encoded=await seal(await passwordKey(password,salt),body,"yandao-user-backup-v1");
  const backup:VaultBackup={format:"YANDAO_PRIVATE_BACKUP",schema:1,kdf:"PBKDF2-SHA256-600000",salt,payload:encoded};
  // Read back cryptographically before offering the package; saving to a cloud provider remains the user's separate operation.
  const verified=await unseal<typeof body>(await passwordKey(password,salt),backup.payload,"yandao-user-backup-v1");if(verified.rows.length!==rows.length)throw Error("备份读回失败");
  return new Blob([JSON.stringify(backup)],{type:"application/octet-stream"});
 });}
 static async inspectBackup(blob:Blob,password:string){
  if(blob.size>256*1024*1024)throw Error("此版本恢复包上限256MiB；未修改原库，请在有足够内存的设备处理分批导出");
  const data=JSON.parse(await blob.text()) as VaultBackup;if(data.format!=="YANDAO_PRIVATE_BACKUP"||data.schema!==1||data.kdf!=="PBKDF2-SHA256-600000")throw Error("备份版本或格式不受支持，原库未改变");
  const body=await unseal<{schema:1;header:VaultHeader;root:string;rows:{key:string;value:Sealed}[];madeAt:string}>(await passwordKey(password,data.salt),data.payload,"yandao-user-backup-v1");
  if(body.schema!==1||body.header?.schema!==1||!Array.isArray(body.rows))throw Error("备份结构无效");const root=unb64(body.root);if(root.length!==32)throw Error("备份密钥无效");
  const key=await importVaultKey(root),seen=new Set<string>(),entries:LifeEntry[]=[],plain=new Map<string,unknown>();
  for(const row of body.rows){if(typeof row.key!=="string"||!row.key.startsWith(prefix(body.header.id)))throw Error("备份包含越界数据");const k=row.key.slice(prefix(body.header.id).length);if(!/^(entry:[-\w]+|revision:[-\w]+:\d+|blob:[-\w]+:\d+)$/.test(k)||seen.has(k))throw Error("备份包含重复或非法路径");seen.add(k);const value=await unseal<unknown>(key,row.value,aad(body.header.id,k));plain.set(k,value);if(k.startsWith("entry:")){validateLifeEntry(value,body.header.id);entries.push(value);}}
  for(const e of entries)for(const a of e.attachments){const bytes=new Uint8Array(a.bytes);let offset=0;for(const k of a.chunks){const value=plain.get(k);if(typeof value!=="string")throw Error("备份原件缺页");const chunk=unb64(value);if(offset+chunk.length>bytes.length)throw Error("备份原件长度无效");bytes.set(chunk,offset);offset+=chunk.length;}if(offset!==a.bytes||await sha256(bytes)!==a.sha256)throw Error("备份原件哈希错误");}
  return {body,entries,plain,summary:{entries:entries.length,attachments:entries.reduce((n,e)=>n+e.attachments.length,0),madeAt:body.madeAt,dates:entries.map(e=>e.occurredAt).sort(),remindersRestored:false}};
 }
 static async restore(storage:VaultStorage,inspected:Awaited<ReturnType<typeof LifeVault.inspectBackup>>,newPassword:string){
  // Restore into an independent vault. Existing vaults remain unchanged; reminders are not armed.
  const created=await LifeVault.create(storage,newPassword,false),vault=created.vault;
  for(const [oldKey,oldValue] of inspected.plain){const value=structuredClone(oldValue);if(oldKey.startsWith("entry:")){const e=value as LifeEntry;e.ownerProfileId=vault.id;e.reminders=e.reminders?.map(r=>({...r,calendarEventId:undefined,needsConfirmation:true}));}if(oldKey.startsWith("revision:"))(value as LifeRevision).entry.ownerProfileId=vault.id;await storage.commit([{key:prefix(vault.id)+oldKey,value:await seal(vault.active(),value,aad(vault.id,oldKey))}]);}
  await vault.reload();if(vault.entries.size!==inspected.entries.length)throw Error("恢复核查失败，原库仍保留");await LifeVault.register(storage,vault.header);return created;
 }
}
