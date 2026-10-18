'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const assert=require('node:assert/strict');

async function worker(root){
  const Database=require('better-sqlite3'),express=require('express'),jwt=require('jsonwebtoken');
  const accountFile=path.join(root,'accounts.db');
  process.env.DB_PATH=accountFile;
  process.env.USER_DB_PATH=path.join(root,'must-not-use-this-account-database.db');
  process.env.STUDY_COMMENT_DB_PATH=path.join(root,'comments.db');
  process.env.ADMIN_DATA_DIR=root;
  process.env.AI_POLICY_DIR=root;
  process.env.JWT_SECRET=crypto.randomBytes(40).toString('hex');
  process.env.ADMIN_API_KEY=crypto.randomBytes(24).toString('hex');
  const support=crypto.randomBytes(24).toString('hex'),finance=crypto.randomBytes(24).toString('hex');
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  fs.writeFileSync(path.join(root,'admin_keys_v13.json'),JSON.stringify({keys:{[hash(support)]:{role:'SUPPORT_ADMIN',name:'test-support'},[hash(finance)]:{role:'FINANCE_ADMIN',name:'test-finance'}}}));
  const accounts=new Database(accountFile);
  accounts.exec("CREATE TABLE users(user_id TEXT PRIMARY KEY,nickname TEXT,status TEXT,deleted_at TEXT); INSERT INTO users VALUES ('alice','学习甲','active',NULL),('bob','学习乙','active',NULL),('banned','禁言账号','banned',NULL),('deleted','已注销','active','2026-01-01');");
  const app=express();app.use(express.json({limit:'100kb',verify:(req,_res,buffer)=>{req.rawBody=buffer.toString('utf8');}}));
  app.use('/api/study-comments',require('../backend_deploy/studyCommentsRoutes').createRouter());
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const base=`http://127.0.0.1:${server.address().port}/api/study-comments`;
  const token=id=>jwt.sign({userId:id},process.env.JWT_SECRET,{expiresIn:'5m'});
  const alice=token('alice'),bob=token('bob'),admin=process.env.ADMIN_API_KEY;
  const target='/target/standard%3ALU1';
  async function request(route,method='GET',credential='',body,origin){
    const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(credential?{Authorization:'Bearer '+credential}:{}),...(origin?{Origin:origin}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,body:await response.json()};
  }
  try{
    assert.equal((await request(target)).body.config.enabled,false);
    assert.equal((await request('/admin/queue')).status,401);
    assert.equal((await request('/admin/queue','GET',alice)).status,401);
    assert.equal((await request('/admin/queue','GET',finance)).status,403);
    assert.equal((await request('/admin/queue','GET',support)).status,200);
    assert.equal((await request('/admin/config','PUT',support,{enabled:true})).status,403);
    assert.equal((await request('/admin/config','PUT',admin,{enabled:true})).status,200);
    const submitBody={content:'学'.repeat(500),requestId:crypto.randomUUID()};
    for(const credential of ['', 'invalid-jwt'])assert.equal((await request(target,'POST',credential,submitBody)).status,401);
    for(const id of ['missing','banned','deleted'])assert.equal((await request(target,'POST',token(id),submitBody)).status,403);
    assert.equal((await request(target,'POST',alice,submitBody,'https://untrusted.example')).status,403);
    assert.equal((await request(target,'POST',alice,{...submitBody,userId:'bob'})).status,400);
    assert.equal((await request(target,'POST',alice,{...submitBody,images:['example.png']})).status,400);
    assert.equal((await request(target,'POST',alice,{...submitBody,content:'学'.repeat(501)})).status,400);
    assert.equal((await request(target,'POST',alice,{...submitBody,content:'x'.repeat(75000)})).status,413);
    const submitted=await request(target,'POST',alice,submitBody,'capacitor://localhost');
    assert.equal(submitted.status,200);assert.equal(submitted.body.pendingReview,true);
    const id=submitted.body.id;
    assert.equal((await request(target,'POST',alice,submitBody)).body.id,id);
    assert.equal((await request(target,'GET',bob)).body.comments.length,0);
    assert.equal((await request('/mine/standard%3ALU1','GET',alice)).body.items[0].status,'PENDING');
    assert.equal((await request('/admin/comment/'+id,'PUT',finance,{status:'APPROVED',note:'test'})).status,403);
    assert.equal((await request('/admin/comment/'+id,'PUT',support,{status:'APPROVED',note:'核对资料与文字后批准测试留言'})).status,200);
    assert.equal((await request(target,'GET',bob)).body.comments[0].content,submitBody.content);
    assert.equal((await request('/comment/'+id+'/report','POST',bob,{reason:'请复核引用资料的出处'})).status,200);
    assert.equal((await request('/blocks/alice','POST',bob)).status,200);
    assert.equal((await request(target,'GET',bob)).body.comments.length,0);
    assert.equal((await request('/blocks/alice','DELETE',bob)).status,200);
    assert.equal((await request('/comment/'+id,'DELETE',bob)).status,403);
    assert.equal((await request('/comment/'+id,'DELETE',alice)).status,200);
    assert.equal((await request(target,'GET',bob)).body.comments.length,0);
    assert.equal((await request('/admin/comment/'+id,'PUT',admin,{status:'APPROVED',note:'不得复活已删除评论'})).status,404);
    console.log('PASS: real HTTP/JWT/account lookup, role scopes, 500 characters, origin/body limits, pending moderation, idempotency, report, block and own deletion. Isolated data only.');
  }finally{await new Promise(resolve=>server.close(resolve));accounts.close();}
}

if(process.argv[2]==='--worker'){
  worker(process.argv[3]).then(()=>process.exit(0)).catch(error=>{console.error(error.message);process.exit(1);});
}else{
  const test=require('node:test');
  test('acupoint discussion HTTP lifecycle enforces real authentication and moderation',()=>{
    const tempRoot=fs.realpathSync(os.tmpdir());
    const root=fs.mkdtempSync(path.join(tempRoot,'guoxue-study-http-'));
    try{
      const result=require('node:child_process').spawnSync(process.execPath,[__filename,'--worker',root],{encoding:'utf8',timeout:45000,windowsHide:true});
      assert.equal(result.status,0,(result.stdout||'')+(result.stderr||'')+(result.error?.message||''));
      console.log(result.stdout.trim());
    }finally{
      const resolved=fs.realpathSync(root);
      assert.equal(path.dirname(resolved),tempRoot);assert.ok(path.basename(resolved).startsWith('guoxue-study-http-'));
      fs.rmSync(resolved,{recursive:true,force:true});
    }
  });
}
