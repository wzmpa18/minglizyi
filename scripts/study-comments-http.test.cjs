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

    process.env.SOCIAL_DB_PATH=path.join(root,'social.db');
    process.env.SOCIAL_RATE_LIMIT_CONFIG=path.join(root,'social-rate-limit.json');
    process.env.COMMENTS_ENABLED='true'; // Isolated worker only; production switches stay unchanged.
    process.env.POSTS_ENABLED='true';
    app.use('/api/social',require('../backend_deploy/socialApiRoutes').createRouter());
    const socialBase=`http://127.0.0.1:${server.address().port}/api/social`;
    async function social(route,method='GET',credential=bob,body){
      const response=await fetch(socialBase+route,{method,headers:{'Content-Type':'application/json',...(credential?{Authorization:'Bearer '+credential}:{})},body:body===undefined?undefined:JSON.stringify(body)});
      return {status:response.status,body:await response.json()};
    }
    assert.equal((await social('/posts')).status,200); // Initializes an isolated real schema.
    const socialDb=new Database(process.env.SOCIAL_DB_PATH);
    try{
      socialDb.exec(`INSERT INTO posts(post_id,user_id,nickname,content,status) VALUES
        ('visible','alice','甲','正常学习动态','active'),('blocked','banned','乙','屏蔽动态','active'),
        ('reverse','deleted','丙','双向屏蔽动态','active'),('hidden','alice','甲','已下架动态','hidden');
        INSERT INTO blacklists(user_id,blocked_id) VALUES ('bob','banned'),('deleted','bob');
        INSERT INTO favorites(user_id,post_id) SELECT 'bob',post_id FROM posts;
        INSERT INTO comments(id,post_id,user_id,nickname,content,parent_id,deleted) VALUES
          (1,'visible','banned','乙','屏蔽根评论',0,0), (2,'visible','alice','甲','屏蔽根的回复',1,0),
          (3,'visible','alice','甲','旧删除正文不得泄露',0,1), (4,'visible','alice','甲','可见回复',3,0);`);
      assert.deepEqual((await social('/posts')).body.posts.map(p=>p.postId),['visible']);
      assert.deepEqual((await social('/favorites/mine')).body.posts.map(p=>p.postId),['visible']);
      for(const postId of ['blocked','reverse','hidden']){
        for(const suffix of ['', '/comments'])assert.equal((await social('/posts/'+postId+suffix)).status,404);
        for(const [suffix,body] of [['/like',{}],['/favorite',{}],['/comments',{content:'验证不可评论'}]])
          assert.equal((await social('/posts/'+postId+suffix,'POST',bob,body)).status,404,postId+suffix);
      }
      const visibleComments=(await social('/posts/visible/comments')).body.comments;
      assert.deepEqual(visibleComments.map(c=>c.id),['3','4']);
      assert.equal(visibleComments[0].content,'该评论已删除');
      assert.equal((await social('/posts/visible/comments','POST',bob,{content:'不能回复已屏蔽作者',parentId:1})).status,404);
      assert.equal((await social('/posts/visible/comments','POST',bob,{content:'不能回复已删除根',parentId:4})).status,404);
      for(const id of ['missing','banned','deleted'])assert.equal((await social('/posts/visible/like','POST',token(id),{})).status,403);
      assert.equal((await social('/posts/visible/like','POST',jwt.sign({},process.env.JWT_SECRET),{})).status,401);
      assert.equal((await social('/posts/visible/like','POST','invalid-jwt',{})).status,401);
      assert.equal((await social('/posts/visible/like','POST',bob,{})).status,200);
      assert.equal((await social('/posts/visible/comments','POST',bob,{content:'正文与版本应对应阅读'})).status,200);
      process.env.PRICING_DATA_DIR=root;
      process.env.SALES_PROMOTION_FILE=path.join(root,'sales-promotion.json');
      const regular={plans:[{level:'basic',name:'普通会员',price:0},{level:'monthly',name:'月度会员',price:37,originalPrice:59,duration:'30天'}]};
      fs.writeFileSync(path.join(root,'admin-membership-config.json'),JSON.stringify(regular));
      fs.writeFileSync(path.join(root,'admin-ai-config.json'),JSON.stringify({singleUnlockPrice:9.9,packages:[{id:'pack_10',count:10,price:28}],timePlans:[{key:'single',price:2.9}],tools:[{id:'phone_number',price:18}]}));
      fs.writeFileSync(path.join(root,'tool-matrix.json'),JSON.stringify({tools:{phone_number:{price:18}}}));
      app.use('/api/public/pricing',require('../backend_deploy/publicPricingRoutes').router);
      const pricingBase=`http://127.0.0.1:${server.address().port}/api/public/pricing`;
      async function pricing(route='',method='GET',credential='',body){
        const response=await fetch(pricingBase+route,{method,headers:{'Content-Type':'application/json',...(credential?{Authorization:'Bearer '+credential}:{})},body:body===undefined?undefined:JSON.stringify(body)});
        return {status:response.status,body:await response.json()};
      }
      const initial=(await pricing('/promotion')).body.data;
      assert.equal(initial.enabled,false);
      const payload={expectedRevision:initial.revision,config:{...initial,enabled:true,discountPercent:20}};
      for(const credential of ['',alice,support,finance]) assert.ok([401,403].includes((await pricing('/promotion','PUT',credential,payload)).status));
      assert.equal((await pricing('/promotion','PUT',admin,payload)).status,200);
      assert.equal((await pricing('/promotion','PUT',admin,payload)).status,409);
      const catalog=(await pricing()).body.data;
      assert.equal(catalog.membershipPlans[1].price,29.6);assert.equal(catalog.membershipPlans[1].basePrice,37);
      assert.equal(catalog.ai.packages[0].price,22.4);assert.equal(catalog.ai.timePlans[0].price,2.32);assert.equal(catalog.ai.singleUnlockPrice,7.92);
      assert.equal(catalog.ai.tools[0].price,14.4);
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'admin-membership-config.json'),'utf8')),regular);
      const current=(await pricing('/promotion')).body.data;
      assert.equal((await pricing('/promotion','PUT',admin,{expectedRevision:current.revision,config:{...current,enabled:false}})).status,200);
      assert.equal((await pricing()).body.data.membershipPlans[1].price,37);
      console.log('PASS: real promotion HTTP public catalog, administrator-only writes, revision conflicts, sale prices and original-price preservation.');
      accounts.exec('DROP TABLE users');
      assert.equal((await social('/posts/visible/like','POST',bob,{})).status,503);
      console.log('PASS: real social HTTP routes enforce feed/detail/favorite/comment two-way blocks, inactive posts, deleted text, reply checks, real accounts and fail-closed database errors.');
    }finally{socialDb.close();}

  }finally{await new Promise(resolve=>server.close(resolve));accounts.close();}
}

if(process.argv[2]==='--worker'){
  worker(process.argv[3]).then(()=>process.exit(0)).catch(error=>{console.error(error.message);process.exit(1);});
}else{
  const test=require('node:test');
  test('acupoint and social HTTP lifecycles enforce real authentication, moderation and blocking',()=>{
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
