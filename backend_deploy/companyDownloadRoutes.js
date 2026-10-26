'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const policy=require('./promotionPolicy');
const ALLOWED_ORIGINS=new Set(['https://yandaoguoxue.yandao.vip','https://www.yandao.vip']);
const RELEASE_FILE=process.env.COMPANY_DOWNLOAD_RELEASE_FILE||path.join(__dirname,'data','company_download_release.json');
const DOWNLOAD_ROOT='/root/yandaoguoxue/learning-downloads';
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const statKey=s=>[s.dev,s.ino,s.size,s.mtimeMs,s.ctimeMs].join(':');
const verifiedFiles=new Map();
function ensureTables(db){policy.ensureTables(db);db.exec(`CREATE TABLE IF NOT EXISTS company_download_tickets(
  ticket_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL,release_version TEXT NOT NULL,apk_sha256 TEXT NOT NULL,expected_bytes INTEGER NOT NULL,
  created_ms INTEGER NOT NULL,expires_ms INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'ISSUED',claimed_ms INTEGER,completed_ms INTEGER,result TEXT);`);}
async function verifyRelease(raw,root=DOWNLOAD_ROOT){
  if(!raw||!/^\d+(?:\.\d+){1,3}$/.test(raw.version||'')||!/^[a-f0-9]{64}$/.test(raw.sha256||'')||!Number.isSafeInteger(raw.bytes)||raw.bytes<1||raw.bytes>1024*1024*1024||typeof raw.path!=='string')throw Error('DOWNLOAD_RELEASE_NOT_CONFIGURED');
  const base=await fs.promises.realpath(root),file=await fs.promises.realpath(raw.path),s=await fs.promises.stat(file);
  if(!file.startsWith(base+path.sep)||!file.endsWith('.apk')||!s.isFile()||s.size!==raw.bytes)throw Error('DOWNLOAD_RELEASE_PATH_OR_SIZE_MISMATCH');
  const key=statKey(s),cached=verifiedFiles.get(file);
  if(!cached||cached.key!==key||cached.sha256!==raw.sha256){
    const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);
    if(hash.digest('hex')!==raw.sha256)throw Error('DOWNLOAD_RELEASE_SHA_MISMATCH');
    verifiedFiles.set(file,{key,sha256:raw.sha256});
  }
  return {...raw,path:file,statKey:key};
}
async function currentRelease(){
  const raw=JSON.parse(await fs.promises.readFile(RELEASE_FILE,'utf8'));
  const published=JSON.parse(await fs.promises.readFile(path.join(__dirname,'data','app-release-config.json'),'utf8'));
  const url=new URL(published.downloadUrl||''),match=/^\/downloads\/(\d+)\/([A-Za-z0-9_.-]+\.apk)$/.exec(url.pathname);
  if(raw.version!==published.latestVersion||url.protocol!=='https:'||url.hostname!=='yandaoguoxue.yandao.vip'||!match||path.resolve(raw.path)!==path.join(DOWNLOAD_ROOT,match[1],match[2]))throw Error('DOWNLOAD_RELEASE_NOT_CURRENT_PUBLICATION');
  return verifyRelease(raw);
}
function issueTicket(db,userId,release,now=Date.now()){
  ensureTables(db);
  if(!db.prepare('SELECT user_id FROM users WHERE user_id=?').get(Number(userId)))throw Error('ACCOUNT_NOT_FOUND');
  if(db.prepare("SELECT count(*) n FROM company_download_tickets WHERE user_id=? AND status IN ('ISSUED','CLAIMED') AND expires_ms>?").get(Number(userId),now).n>=3)throw Error('DOWNLOAD_TICKET_RATE_LIMIT');
  const ticket=crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO company_download_tickets(ticket_hash,user_id,release_version,apk_sha256,expected_bytes,created_ms,expires_ms) VALUES(?,?,?,?,?,?,?)')
    .run(digest(ticket),Number(userId),release.version,release.sha256,release.bytes,now,now+15*60*1000);
  return {ticket,expiresAt:now+15*60*1000,version:release.version,bytes:release.bytes,method:'POST',action:'/api/auth/company-download/file',evidenceQuality:'FULL_DOWNLOAD_ONLY_NOT_INSTALLATION'};
}
function claimTicket(db,ticket,release,now=Date.now()){
  ensureTables(db);if(typeof ticket!=='string'||!/^[a-zA-Z0-9_-]{43}$/.test(ticket))throw Error('INVALID_DOWNLOAD_TICKET');
  const hash=digest(ticket),changed=db.prepare("UPDATE company_download_tickets SET status='CLAIMED',claimed_ms=? WHERE ticket_hash=? AND status='ISSUED' AND expires_ms>? AND release_version=? AND apk_sha256=? AND expected_bytes=?")
    .run(now,hash,now,release.version,release.sha256,release.bytes);
  if(changed.changes!==1)throw Error('DOWNLOAD_TICKET_EXPIRED_OR_USED');
  return db.prepare('SELECT * FROM company_download_tickets WHERE ticket_hash=?').get(hash);
}
function knownStoreEvidence(db,userId){
  const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name));
  if(tables.has('apple_iap_transactions')){
    const row=db.prepare("SELECT transaction_id FROM apple_iap_transactions WHERE user_id=? AND environment='Production' LIMIT 1").get(Number(userId));
    if(row)return {distributionSource:'STORE_APPLE',evidenceRef:'apple_iap_transactions:Production',evidenceSha256:digest(String(row.transaction_id))};
  }
  if(tables.has('user_orders')){
    const cols=new Set(db.prepare('PRAGMA table_info(user_orders)').all().map(row=>row.name));
    if(cols.has('payment_method')){
      const rows=db.prepare("SELECT order_no,payment_method FROM user_orders WHERE user_id=? AND status IN ('PAID','REFUNDED','REFUND_PENDING')").all(Number(userId));
      const row=rows.find(item=>/apple|appstore|google|play.billing|huawei.iap|oppo.iap|vivo.iap|store.iap/i.test(item.payment_method||''));
      if(row)return {distributionSource:/apple|appstore/i.test(row.payment_method)?'STORE_APPLE':/google|play/i.test(row.payment_method)?'STORE_GOOGLE':'STORE_DOMESTIC',evidenceRef:'verified-store-order-ledger',evidenceSha256:digest(row.order_no+':'+row.payment_method)};
    }
  }
  return null;
}
function completeTicket(db,row){
  return db.transaction(()=>{
    const changed=db.prepare("UPDATE company_download_tickets SET status='DELIVERED',completed_ms=? WHERE ticket_hash=? AND status='CLAIMED'").run(Date.now(),row.ticket_hash);
    if(changed.changes!==1)return {ok:false,reason:'TICKET_ALREADY_FINAL'};
    const store=knownStoreEvidence(db,row.user_id);
    if(store)policy.recordDistributionEvidence(db,row.user_id,{...store,evidenceKind:'EXISTING_STORE_LEDGER',sourceQuality:'STORE_TRANSACTION_VERIFIED'},'DOWNLOAD_SERVER');
    const result=policy.recordDistributionEvidence(db,row.user_id,{distributionSource:'COMPANY_DIRECT',evidenceRef:'company-download-ticket:'+row.ticket_hash,evidenceSha256:row.apk_sha256,
      evidenceKind:'FULL_COMPANY_APK_DOWNLOAD',sourceQuality:'DOWNLOAD_COMPLETE_ORIGINAL_INSTALL_UNKNOWN',originalDistributionSource:'UNKNOWN'},'DOWNLOAD_SERVER');
    db.prepare('UPDATE company_download_tickets SET result=? WHERE ticket_hash=?').run(result.ok?'COMPANY_DOWNLOAD_COMPLETED':'STORE_OR_SOURCE_CONFLICT_PRESERVED',row.ticket_hash);
    return result;
  }).immediate();
}
async function streamTicket(db,ticket,release,res){
  const row=claimTicket(db,ticket,release);let bytes=0,sha='',done=false;
  const stream=fs.createReadStream(release.path),hash=crypto.createHash('sha256');
  const abort=()=>{if(done)return;done=true;stream.destroy();db.prepare("UPDATE company_download_tickets SET status='ABORTED',result='INCOMPLETE_TRANSFER' WHERE ticket_hash=? AND status='CLAIMED'").run(row.ticket_hash);};
  return new Promise(resolve=>{
    stream.on('data',chunk=>{bytes+=chunk.length;hash.update(chunk);});stream.on('end',()=>{sha=hash.digest('hex');});
    stream.on('error',()=>{abort();res.destroy();resolve({ok:false});});
    res.on('close',()=>{if(!res.writableFinished){abort();resolve({ok:false});}});
    res.on('finish',()=>{void(async()=>{
      if(done)return;done=true;
      try{
        const after=await fs.promises.stat(release.path);
        if(bytes!==release.bytes||sha!==release.sha256||statKey(after)!==release.statKey)throw Error('TRANSFER_BYTES_OR_SOURCE_CHANGED');
        resolve(completeTicket(db,row));
      }catch{db.prepare("UPDATE company_download_tickets SET status='ABORTED',result='TRANSFER_NOT_VERIFIED' WHERE ticket_hash=? AND status='CLAIMED'").run(row.ticket_hash);resolve({ok:false});}
    })();});
    res.statusCode=200;res.setHeader('Content-Type','application/vnd.android.package-archive');res.setHeader('Content-Length',String(release.bytes));res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Disposition','attachment; filename="YandaoGuoxue_'+release.version+'.apk"');stream.pipe(res);
  });
}
function createRouter({authRequired,getDb}){
  const express=require('express'),router=express.Router();
  const cors=(req,res,next)=>{
    const origin=req.headers.origin;
    if(origin&&!ALLOWED_ORIGINS.has(origin))return res.status(403).json({success:false,error:'下载请求来源无效'});
    if(origin){res.set('Access-Control-Allow-Origin',origin);res.set('Vary','Origin');}
    res.set('Access-Control-Allow-Headers','Authorization, Content-Type');res.set('Access-Control-Allow-Methods','POST, OPTIONS');
    if(req.method==='OPTIONS')return res.sendStatus(204);
    if(Number(req.headers['content-length']||0)>2048||JSON.stringify(req.body||{}).length>2048)return res.sendStatus(413);
    next();
  };
  router.use(cors);
  router.post('/ticket',authRequired,async(req,res)=>{
    try{const release=await currentRelease();res.set('Cache-Control','no-store').json({success:true,data:issueTicket(getDb(),req.user.userId,release)});}
    catch{res.status(503).json({success:false,error:'带来源记录的下载暂不可用，仍可使用普通官网下载'});}
  });
  router.post('/file',express.urlencoded({extended:false,limit:'2kb',parameterLimit:2}),async(req,res)=>{
    if(!ALLOWED_ORIGINS.has(req.headers.origin||'')||req.headers.range||Object.keys(req.body||{}).some(key=>key!=='ticket'))return res.sendStatus(403);
    try{await streamTicket(getDb(),req.body?.ticket,await currentRelease(),res);}
    catch{if(!res.headersSent)res.redirect(303,'https://yandaoguoxue.yandao.vip/app-download/latest.apk');}
  });
  return router;
}
module.exports={createRouter,ensureTables,verifyRelease,issueTicket,claimTicket,knownStoreEvidence,completeTicket,streamTicket};
