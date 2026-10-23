'use strict';
// Real HTTP/JWT/SQLite; synthetic isolated accounts, no SMS, purchase or AI calls.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
test('real HTTP: access identity, OTP binding, admin role, moderation and journal persistence',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'yandao-security-http-'));
 process.env.DB_PATH=path.join(root,'accounts.db');process.env.ADMIN_DATA_DIR=root;process.env.SECURITY_AUDIT_DB=path.join(root,'audit.db');process.env.AI_POLICY_DIR=root;
 process.env.JWT_SECRET=crypto.randomBytes(40).toString('hex');process.env.ADMIN_API_KEY=crypto.randomBytes(32).toString('hex');
 const express=require('express'),jwt=require('jsonwebtoken'),Database=require('better-sqlite3');
 const db=new Database(process.env.DB_PATH);
 db.exec("CREATE TABLE users(user_id INTEGER PRIMARY KEY AUTOINCREMENT,phone TEXT UNIQUE,email TEXT UNIQUE,password_hash TEXT DEFAULT '',nickname TEXT,invite_code TEXT,invited_by INTEGER,created_at TEXT,phone_verified_at TEXT,status TEXT DEFAULT 'active',deleted_at TEXT,member_level TEXT,membership_expiry TEXT,updated_at TEXT);INSERT INTO users(user_id,phone,email,phone_verified_at) VALUES(100000,'13800000001',NULL,'2026-10-21'),(100001,NULL,'synthetic@example.test',NULL),(100002,'13800000003',NULL,NULL),(100075,NULL,'last-synthetic@example.test',NULL);");
 const registration=require('../backend_deploy/register_routes');registration.initDatabase();
 const verification=require('../backend_deploy/verificationStore');
 const journal=require('../backend_deploy/securityAudit').getSecurityAudit();
 const auth=require('../backend_deploy/middleware/auth'),roles=require('../backend_deploy/adminRoles');
 const operator=roles.createAdminSession({username:'synthetic-operator',role:'OPERATOR_ADMIN'});
 const app=express();app.use(express.json());app.use(require('../backend_deploy/businessIdentityGate').createBusinessIdentityGate({verifyToken:auth.verifyToken,getUser:id=>db.prepare('SELECT * FROM users WHERE user_id=?').get(id),resolveAdminKey:roles.resolveAdminKey,journal}));app.use(require('../backend_deploy/publicTextGuard').publicTextGuard);
 app.use('/api/auth',registration.createRouter());
 app.get('/api/health',(_q,r)=>r.json({success:true}));app.get('/api/business',auth.authMiddleware,(_q,r)=>r.json({success:true}));
 app.get('/api/admin/security/events',roles.adminAuth('SUPPORT_ADMIN','audit'),(_q,r)=>r.json({success:true,data:journal.list()}));
 app.post('/api/social/posts',(_q,r)=>r.json({success:true}));app.post('/api/payment/callback/wechat',(_q,r)=>r.status(400).json({success:false,error:'signature_required'}));
 const token=id=>jwt.sign({userId:id},process.env.JWT_SECRET,{expiresIn:'5m'});
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const base=`http://127.0.0.1:${server.address().port}`;
 async function req(url,credential,method='GET',body){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(credential?{Authorization:'Bearer '+credential}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
 try{
  assert.equal((await req('/api/business')).status,401);
  assert.equal((await req('/api/business',token(100001))).status,200);
  assert.equal((await req('/api/social/posts',token(100001),'POST',{content:'test'})).data.code,'PHONE_VERIFICATION_REQUIRED');
  assert.equal((await req('/api/business',token(100002))).status,200);
  assert.equal((await req('/api/business',token(999999))).status,403);
  assert.equal((await req('/api/business',jwt.sign({userId:100000,type:'refresh'},process.env.JWT_SECRET))).status,401);
  assert.equal((await req('/api/business',token(100000))).status,200);
  assert.equal((await req('/api/auth/verify-phone',token(100001),'POST',{phone:'13800000009',code:'000000'})).status,400);
  verification.setCode('sms:13800000009','123456','127.0.0.1');
  assert.equal((await req('/api/auth/verify-phone',token(100001),'POST',{phone:'13800000009',code:'123456'})).status,200);
  assert.equal((await req('/api/business',token(100001))).status,200);
  assert.equal(db.prepare('SELECT user_id FROM users WHERE phone=?').get('13800000009').user_id,100001);
  verification.setCode('sms:13800000008','234567','127.0.0.1');
  const signed=await req('/api/auth/login-code',null,'POST',{phone:'13800000008',code:'234567'});
  assert.equal(signed.status,200);assert.equal(signed.data.data.user.userId,100076);assert.equal(signed.data.data.user.phoneVerified,true);
  assert.equal((await req('/api/business',signed.data.data.accessToken)).status,200);
  assert.equal((await req('/api/admin/security/events',token(100000))).status,401);
  assert.equal((await req('/api/admin/security/events',operator)).status,403);
  assert.equal((await req('/api/admin/security/events',process.env.ADMIN_API_KEY)).status,200);
  const auditor=roles.createAdminSession({username:'synthetic-auditor',role:'SECURITY_AUDITOR'});
  assert.equal((await req('/api/admin/security/events',auditor)).status,200);
  assert.equal((await req('/api/admin/unified/overview',auditor)).status,403);
  assert.equal((await req('/api/social/posts',token(100000),'POST',{content:'煽\u200b动 颠覆国家政权'})).status,422);
  assert.equal((await req('/api/social/posts',token(100000),'POST',{content:'学习古籍，互相尊重'})).status,200);
  assert.equal((await req('/api/payment/callback/wechat',null,'POST',{})).data.error,'signature_required');
  db.prepare("UPDATE users SET status='banned' WHERE user_id=100000").run();assert.equal((await req('/api/business',token(100000))).status,403);
  const stored=new Database(process.env.SECURITY_AUDIT_DB,{readonly:true});assert.ok(stored.prepare('SELECT COUNT(*) AS c FROM security_events').get().c>20);stored.close();
  assert.ok(!JSON.stringify(journal.list()).includes(process.env.ADMIN_API_KEY));
 }finally{await new Promise(resolve=>server.close(resolve));db.close();require('../backend_deploy/middleware/auth').getDB().close();/* audit singleton is process-scoped; Linux permits unlink of open SQLite fixtures */fs.rmSync(root,{recursive:true,force:true});}
});
