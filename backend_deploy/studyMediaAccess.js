'use strict';
const fs=require('fs'),path=require('path');
function createStudyMediaAccess(storage,manifestPath=process.env.STUDY_MEDIA_MANIFEST_PATH||path.join(__dirname,'data/tcm-study-media-approved.json')){
 const usage=new Map();
 return async function(req,res){
  if(!req.user||!req.user.userId)return res.status(401).json({success:false,error:'请先登录'});
  const requested=req.query.path;
  if(typeof requested!=='string'||!/^\/assets\/(?:meridians|acupoint-photos)\/(?:skeleton\/)?[a-z0-9-]+\.(?:jpg|webp|png)$/.test(requested))return res.status(400).json({success:false,error:'图片路径无效'});
  const now=Date.now(),id=String(req.user.userId),previous=usage.get(id),record=previous&&now-previous.start<60000?previous:{start:now,count:0};
  if(record.count>=120){res.setHeader('Retry-After','60');return res.status(429).json({success:false,error:'图片请求较多，请稍后重试'});}
  record.count++;usage.set(id,record);if(usage.size>10000)for(const [key,value]of usage)if(now-value.start>=60000)usage.delete(key);
  if(fs.statSync(manifestPath).size>1000000)throw Error('Study media catalogue too large');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(manifest.schema!=='yandao.study-media.v1'||!Array.isArray(manifest.records)||manifest.records.length>2000)throw Error('Study media catalogue invalid');
  const asset=manifest.records.find(x=>x.path===requested);
  if(!asset)return res.status(404).json({success:false,error:'图片未收录'});
  if(!/^[a-f0-9]{64}$/.test(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<100||asset.bytes>5000000||!['image/jpeg','image/webp','image/png'].includes(asset.mime))throw Error('Study media record invalid');
  const extension=asset.mime==='image/jpeg'?'jpg':asset.mime==='image/png'?'png':'webp';
  const signed=await storage.temporaryDownloadUrl('learning_content','study-media/'+asset.sha256+'.'+extension,180);
  if(!signed.ok)return res.status(503).json({success:false,error:'图片暂时无法读取，原有下载保留'});
  res.setHeader('Cache-Control','private, no-store');
  return res.json({success:true,path:asset.path,sha256:asset.sha256,bytes:asset.bytes,mime:asset.mime,downloadUrl:signed.url});
 };
}
module.exports={createStudyMediaAccess};
