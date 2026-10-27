/** Official text-only learning/service notices. Legacy rows are retained, never auto-published. */
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const policy=require('./announcementPolicy');
const DATA_FILE=path.join(__dirname,'data','announcements.json');
function verifyAdmin(req){
 const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token)return false;
 if(process.env.ADMIN_API_KEY && token===process.env.ADMIN_API_KEY)return true;
 try{const a=require('./adminRoles').resolveAdminKey(token);return !!a&&['SUPER_ADMIN','ADMIN','OPERATOR_ADMIN','CONTENT_ADMIN'].includes(a.role);}catch{return false;}
}
function readAll(){if(!fs.existsSync(DATA_FILE))return [];const rows=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));if(!Array.isArray(rows))throw Error('INVALID_NOTICE_STORAGE');return rows;}
function writeAll(rows){
 fs.mkdirSync(path.dirname(DATA_FILE),{recursive:true});
 if(fs.existsSync(DATA_FILE)&&!fs.existsSync(DATA_FILE+'.legacy-original'))fs.copyFileSync(DATA_FILE,DATA_FILE+'.legacy-original',fs.constants.COPYFILE_EXCL);
 const temp=DATA_FILE+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temp,JSON.stringify(rows,null,2)+'\n',{mode:0o600,flag:'wx'});fs.renameSync(temp,DATA_FILE);
}
function normalize(body,existing,now){
 const stamp=new Date(now).toISOString();
 const item={id:existing?.id||'a_'+crypto.randomUUID(),schema:policy.SCHEMA,title:String(body.title||'').trim(),content:String(body.content||'').trim(),kind:body.kind,publisher:'言道国学官方通知',purpose:'NOTICE_ONLY',
 level:body.level||'info',channels:Array.isArray(body.channels)?body.channels:[],platforms:Array.isArray(body.platforms)?body.platforms:[],minVersion:String(body.minVersion||''),maxVersion:String(body.maxVersion||''),
 popup:body.popup===true,published:body.published===true,pinned:body.pinned===true,publishAt:String(body.publishAt||''),expiresAt:String(body.expiresAt||''),link:null,createdAt:existing?.createdAt||stamp,updatedAt:stamp};
 const fingerprint=JSON.stringify([item.title,item.content,item.kind,item.level,item.pinned,item.channels,item.platforms,item.minVersion,item.maxVersion,item.popup,item.publishAt,item.expiresAt]);
 const unchanged=existing?._noticeFingerprint===fingerprint;
 item.revision=unchanged?existing.revision:Math.max(0,Number(existing?.revision)||0)+1;
 const reference=String(body.reviewReference||'').trim();
 item.review=body.reviewApproved===true && reference.length>=3?{status:'APPROVED',revision:item.revision,reference,approvedAt:stamp,scope:'COMPANY_CONTENT_REVIEW'}:unchanged?existing.review:{status:'DRAFT',revision:item.revision,reference:'',approvedAt:null,scope:'COMPANY_CONTENT_REVIEW'};
 item._noticeFingerprint=fingerprint;
 if(existing){const {history,...previous}=existing;item.history=[...(Array.isArray(history)?history:[]),previous];}
 return item;
}
function createAnnouncementRouter(options={}){
 const router=require('express').Router(),read=options.readAll||readAll,write=options.writeAll||writeAll,admin=options.verifyAdmin||verifyAdmin,now=options.now||Date.now;
 router.get('/public',(req,res)=>{
  res.set('Cache-Control','private, no-store');
  try{const context={channel:String(req.headers['x-store-channel']||'unknown'),platform:String(req.headers['x-client-platform']||'unknown'),version:String(req.headers['x-client-version']||'')};
   const rows=read().filter(item=>policy.eligibleNotice(item,context,now())).sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||Date.parse(b.publishAt)-Date.parse(a.publishAt)).slice(0,20).map(policy.publicNotice);
   res.json({success:true,announcements:rows,total:rows.length});
  }catch{res.status(503).json({success:false,error:'公告暂不可用',announcements:[],total:0});}
 });
 router.use((req,res,next)=>{if(!admin(req))return res.status(401).json({success:false,error:'未授权访问'});next();});
 router.get('/',(_req,res)=>{try{res.json({success:true,data:{announcements:read()}});}catch{res.status(503).json({success:false,error:'公告记录读取失败，未修改原件'});}});
 function save(req,res,existing){
  const item=normalize(req.body||{},existing,now()),error=policy.noticeError(item);
  if(error)return res.status(400).json({success:false,error});
  if(item.published&&!policy.reviewed(item))return res.status(400).json({success:false,error:'发布前请完成本公司正文、渠道、版本与时窗审核留证；这不表示商店批准'});
  const rows=read(),index=existing?rows.findIndex(row=>row.id===existing.id):-1;
  if(existing&&index<0)return res.status(409).json({success:false,error:'记录已变化，请刷新'});
  if(index<0)rows.push(item);else rows[index]=item;write(rows);
  res.json({success:true,data:item,message:item.published?'纯文本通知已发布':'通知草稿已保存'});
 }
 router.post('/',(req,res)=>{try{save(req,res,null);}catch{res.status(503).json({success:false,error:'公告保存失败，原件保留'});}});
 router.put('/:id',(req,res)=>{try{const row=read().find(item=>item.id===req.params.id);if(!row)return res.status(404).json({success:false,error:'公告不存在'});save(req,res,row);}catch{res.status(503).json({success:false,error:'公告保存失败，原件保留'});}});
 router.delete('/:id',(req,res)=>{try{const rows=read(),row=rows.find(item=>item.id===req.params.id);if(!row)return res.status(404).json({success:false,error:'公告不存在'});row.published=false;row.archivedAt=new Date(now()).toISOString();write(rows);res.json({success:true,message:'公告已归档，原文记录保留'});}catch{res.status(503).json({success:false,error:'公告归档失败，原件保留'});}});
 return router;
}
const router=createAnnouncementRouter();router.createAnnouncementRouter=createAnnouncementRouter;router.normalizeNotice=normalize;module.exports=router;
