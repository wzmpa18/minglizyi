'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');

test('real password recovery uses one-time ownership proof, preserves both accounts and revokes old sessions',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'guoxue-reset-http-'));
 process.env.DB_PATH=path.join(root,'accounts.db');process.env.ADMIN_DATA_DIR=root;
 process.env.JWT_SECRET=crypto.randomBytes(40).toString('hex');
 const express=require('express'),Database=require('better-sqlite3'),bcrypt=require('bcrypt');
 const initial=new Database(process.env.DB_PATH);
 initial.exec(`CREATE TABLE users(user_id INTEGER PRIMARY KEY AUTOINCREMENT,phone TEXT UNIQUE,email TEXT UNIQUE,password_hash TEXT NOT NULL,nickname TEXT,invite_code TEXT,invited_by INTEGER,created_at TEXT,phone_verified_at TEXT,status TEXT DEFAULT 'active',deleted_at TEXT,member_level TEXT,membership_expiry TEXT,updated_at TEXT);`);
 const insert=initial.prepare('INSERT INTO users(user_id,phone,email,password_hash,member_level,membership_expiry) VALUES(?,?,?,?,?,?)');
 const oldHash=bcrypt.hashSync('Oldpass123',4);
 insert.run(100000,null,'founder@example.test',oldHash,'basic',null);
 insert.run(100001,'13800000001',null,oldHash,'monthly','2099-01-01T00:00:00.000Z');
 insert.run(100002,null,'Synthetic@example.test',oldHash,'basic',null);
 insert.run(100075,null,'last-synthetic@example.test',oldHash,'basic',null);initial.close();
 const registration=require('../backend_deploy/register_routes');const db=registration.initDatabase();
 const auth=require('../backend_deploy/middleware/auth'),codes=require('../backend_deploy/verificationStore');
 const {createBusinessIdentityGate,publicRequest}=require('../backend_deploy/businessIdentityGate');
 const app=express();app.use(express.json());app.use(createBusinessIdentityGate({verifyToken:auth.verifyToken,
  getUser:id=>db.prepare('SELECT user_id,phone,phone_verified_at,status,deleted_at,auth_version FROM users WHERE user_id=?').get(id),resolveAdminKey:()=>null,journal:{append:()=>{}}}));
 app.use('/api/auth',registration.createRouter());
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const post=async(route,body)=>{const r=await fetch(origin+'/api/auth/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')};};
 try{
  assert.equal(publicRequest('POST','/api/auth/reset-password'),true);
  assert.equal(publicRequest('GET','/api/auth/reset-password'),false);
  assert.equal(publicRequest('POST','/api/auth/reset-password/other'),false);
  const login=await post('login',{account:'13800000001',password:'Oldpass123'});
  assert.equal(login.status,200);const oldAccess=login.body.data.accessToken;
  const oldRefresh=decodeURIComponent(/yd_refresh_token=([^;]+)/.exec(login.cookie)[1]);
  assert.ok(auth.verifyToken('Bearer '+oldAccess));
  assert.equal((await post('reset-password',{account:'13800000001',smsCode:'000000',newPassword:'Newpass123'})).status,400);
  assert.equal(db.prepare('SELECT password_hash FROM users WHERE user_id=100001').get().password_hash,oldHash);
  codes.setCode('sms:13800000001','654321','127.0.0.1');
  assert.equal((await post('reset-password',{account:'13800000001',smsCode:'654321',newPassword:'short'})).status,400);
  const reset=await post('reset-password',{account:'13800000001',smsCode:'654321',newPassword:'Newpass123'});
  assert.equal(reset.status,200);assert.ok(!reset.body.data);assert.ok(reset.cookie.includes('Expires='));
  const profile=await fetch(origin+'/api/auth/profile',{headers:{Authorization:'Bearer '+oldAccess}});assert.equal(profile.status,401);
  assert.equal((await post('refresh-token',{refreshToken:oldRefresh})).status,401);
  assert.equal((await post('login',{account:'13800000001',password:'Oldpass123'})).status,401);
  assert.equal((await post('login',{account:'13800000001',password:'Newpass123'})).status,200);
  assert.equal((await post('reset-password',{account:'13800000001',smsCode:'654321',newPassword:'Againpass123'})).status,400);
  const phone=db.prepare('SELECT * FROM users WHERE user_id=100001').get();
  assert.equal(phone.member_level,'monthly');assert.equal(phone.membership_expiry,'2099-01-01T00:00:00.000Z');
  assert.ok(phone.phone_verified_at);assert.equal(phone.auth_version,1);assert.ok(!phone.password_hash.includes('Newpass123'));
  codes.setCode('email:synthetic@example.test','765432','127.0.0.1');
  assert.equal((await post('reset-password',{account:'synthetic@example.test',smsCode:'765432',newPassword:'Emailpass123'})).status,400);
  assert.equal((await post('reset-password',{account:'synthetic@example.test',emailCode:'765432',newPassword:'Emailpass123'})).status,200);
  assert.equal((await post('login',{account:'Synthetic@example.test',password:'Emailpass123'})).status,200);
  assert.equal(db.prepare('SELECT phone_verified_at FROM users WHERE user_id=100002').get().phone_verified_at,null);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n,4);
  assert.equal((await post('reset-password',{account:'missing@example.test',emailCode:'765432',newPassword:'Emailpass123'})).status,400);
  codes.setCode('sms:13800000001','123456','127.0.0.1');
  for(let n=0;n<5;n++)assert.equal((await post('reset-password',{account:'13800000001',smsCode:'000000',newPassword:'Againpass123'})).status,400);
  assert.equal((await post('reset-password',{account:'13800000001',smsCode:'123456',newPassword:'Againpass123'})).status,400);
  assert.equal(db.prepare('SELECT auth_version FROM users WHERE user_id=100001').get().auth_version,1);
 }finally{
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  db.close();auth.getDB()?.close();fs.rmSync(root,{recursive:true,force:true});
 }
});
