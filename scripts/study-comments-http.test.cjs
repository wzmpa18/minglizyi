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

    process.env.FEEDBACK_DATA_DIR=path.join(root,'feedback');
    app.use('/api/feedback',require('../backend_deploy/feedbackRoutes'));
    async function feedback(route,method='GET',credential=alice,body){
      const response=await fetch(`http://127.0.0.1:${server.address().port}/api/feedback`+route,{method,headers:{'Content-Type':'application/json',...(credential?{Authorization:'Bearer '+credential}:{})},body:body===undefined?undefined:JSON.stringify(body)});
      return {status:response.status,body:await response.json()};
    }
    assert.equal((await feedback('/list','GET','')).status,401);
    assert.equal((await feedback('/list?userId=bob')).status,403);
    for(const id of ['missing','banned','deleted'])assert.equal((await feedback('/list','GET',token(id))).status,403);
    const submittedFeedback=await feedback('/submit','POST',alice,{userId:'bob',userName:'forged',type:'complaint',title:'广告投诉',description:'请核对这个学习资料广告',contact:'private-test@example.invalid'});
    assert.equal(submittedFeedback.status,200);
    const ownFeedback=(await feedback('/list')).body.feedbacks[0];
    assert.equal(ownFeedback.userId,'alice');assert.equal(ownFeedback.userName,'学习甲');
    assert.equal((await feedback('/list','GET',bob)).body.feedbacks.length,0);
    assert.equal((await feedback('/admin/queue','GET',alice)).status,401);
    assert.equal((await feedback('/admin/queue','GET',finance)).status,403);
    assert.equal((await feedback('/admin/queue','GET',support)).body.feedbacks.length,1);
    const reply={status:'resolved',adminReply:'已复核并处理广告内容',expectedUpdatedAt:ownFeedback.createdAt};
    assert.equal((await feedback('/admin/'+ownFeedback.id,'PUT',support,reply)).status,200);
    assert.equal((await feedback('/admin/'+ownFeedback.id,'PUT',support,reply)).status,409);
    assert.equal((await feedback('/list')).body.feedbacks[0].adminReply,reply.adminReply);
    assert.equal((await feedback('/submit','POST',alice,{type:'complaint',title:'<script>x</script>',description:'不支持脚本形式的内容'})).status,400);
    for(let i=0;i<2;i++)assert.equal((await feedback('/submit','POST',alice,{type:'suggestion',title:'学习建议',description:'请完善资料的来源介绍'})).status,200);
    assert.equal((await feedback('/submit','POST',alice,{type:'suggestion',title:'重复建议',description:'超过限额应当暂缓提交'})).status,429);
    console.log('PASS: feedback private ownership, trusted account identity, no public contact listing, ops-only reply, optimistic conflicts, plain text and rate limits.');

    process.env.TONGCHEN_INDEX_KEY_FILE=path.join(root,'tongchen-index.key');
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
      const submitted=await social('/posts','POST',bob,{content:'学习交流投稿在审核前不可公开',circle:'TCM'});
      assert.equal(submitted.status,200);assert.equal(submitted.body.pendingReview,true);assert.equal(submitted.body.post.status,'pending');
      const pendingId=submitted.body.post.postId;
      assert.equal((await social('/posts/'+pendingId)).status,404);
      assert.ok((await social('/posts/mine')).body.posts.some(post=>post.postId===pendingId&&post.status==='pending'));
      assert.ok(!(await social('/posts')).body.posts.some(post=>post.postId===pendingId));
      assert.equal((await social('/posts/'+pendingId+'/like','POST',bob,{})).status,404);
      assert.equal((await social('/posts/'+pendingId,'DELETE',alice)).status,403);
      assert.equal((await social('/posts/'+pendingId,'DELETE',bob)).status,200);
      console.log('PASS: social posts require manual review, stay absent from feed/detail/likes before approval, and only their owner can withdraw them.');
      assert.equal((await social('/tongchen/mine','GET','')).status,401);
      assert.equal((await social('/tongchen/mine','PUT',token('deleted'),{})).status,403);
      assert.equal((await social('/tongchen/admin/config','PUT',support,{enabled:true})).status,403);
      const tc=(await social('/tongchen/admin/config','PUT',admin,{enabled:true})).body.config;
      const consent={birthDate:'1990-05-15',hour:12,minute:0,timeZone:'Asia/Shanghai',modes:['solar-md','date','hour','pillars'],interests:['古籍'],adultConsent:true,precisionConsent:true,consentVersion:tc.consentVersion};
      assert.equal((await social('/tongchen/mine','PUT',alice,{...consent,precisionConsent:false})).status,403);
      assert.equal((await social('/tongchen/mine','PUT',alice,consent)).status,200);
      assert.equal((await social('/tongchen/mine','PUT',bob,consent)).status,200);
      const peer=(await social('/tongchen/search','POST',alice,{mode:'date'})).body.items[0];
      assert.deepEqual(Object.keys(peer).sort(),['id','interests','nickname','ruleVersion']);
      const message={content:'一起核对古籍出处',requestId:crypto.randomUUID()};
      assert.equal((await social('/tongchen/peer/'+peer.id+'/messages','POST',alice,message)).status,403);
      assert.equal((await social('/tongchen/peer/'+peer.id+'/request','POST',alice,{})).status,200);
      let incoming=(await social('/tongchen/requests')).body.incoming[0];
      assert.equal((await social('/tongchen/request/'+incoming.requestId,'PUT',bob,{accept:false})).status,200);
      assert.equal((await social('/tongchen/peer/'+peer.id+'/messages','POST',alice,message)).status,403);
      assert.equal((await social('/tongchen/peer/'+peer.id+'/request','POST',alice,{})).status,200);
      incoming=(await social('/tongchen/requests')).body.incoming[0];
      assert.equal((await social('/tongchen/request/'+incoming.requestId,'PUT',bob,{accept:true})).status,200);
      assert.equal((await social('/messages/private/bob','POST',alice,{content:'旧接口不能绕过同辰审核',type:'image'})).status,403);
      assert.equal((await social('/tongchen/peer/'+peer.id+'/messages','POST',alice,{...message,images:['x.png']})).status,400);
      assert.equal((await social('/tongchen/peer/'+peer.id+'/messages','POST',alice,{...message,content:'学'.repeat(501)})).status,400);
      const sent=await social('/tongchen/peer/'+peer.id+'/messages','POST',alice,message);
      assert.equal(sent.status,200);assert.equal(sent.body.status,'pending');
      assert.equal((await social('/tongchen/peer/'+peer.id+'/messages','POST',alice,message)).body.duplicated,true);
      assert.equal((await social('/tongchen/peer/'+peer.id+'/messages','GET',alice)).body.items.length,0);
      const queued=(await social('/tongchen/admin/messages','GET',support)).body.items[0];
      assert.equal((await social('/tongchen/admin/message/'+queued.id,'PUT',support,{status:'active',reason:'人工核对学习讨论'})).body.success,true);
      assert.equal((await social('/tongchen/peer/'+peer.id+'/messages','GET',alice)).body.items[0].content,message.content);
      assert.equal((await social('/tongchen/peer/'+peer.id+'/block','POST',alice,{})).status,200);
      assert.equal((await social('/tongchen/peer/'+peer.id+'/messages','GET',alice)).status,404);
      assert.equal((await social('/tongchen/peer/'+peer.id+'/report','POST',alice,{reason:'屏蔽后仍能举报学习交流问题'})).status,200);
      assert.equal((await social('/tongchen/admin/config','PUT',admin,{enabled:false})).status,200);
      assert.equal((await social('/tongchen/mine','DELETE',alice)).status,200);
      assert.equal((await social('/tongchen/mine','GET',alice)).body.joined,false);
      console.log('PASS: Tongchen HTTP real accounts, roles, separate precision consent, mutual acceptance, no legacy/image bypass, 500 graphemes, pending privacy, manual approval, idempotency, block/report and withdrawal while disabled.');
      process.env.PRICING_DATA_DIR=root;
      process.env.SALES_PROMOTION_FILE=path.join(root,'sales-promotion.json');
      const regular={plans:[{level:'basic',name:'普通会员',price:0},{level:'monthly',name:'月度会员',price:37,originalPrice:59,duration:'30天'}]};
      fs.writeFileSync(path.join(root,'admin-membership-config.json'),JSON.stringify(regular));
      fs.writeFileSync(path.join(root,'admin-ai-config.json'),JSON.stringify({singleUnlockPrice:9.9,packages:[{id:'pack_10',count:10,price:28,validity:30}],timePlans:[{key:'single',price:2.9}],tools:[{id:'phone_number',price:18}]}));
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
      // Execute the actual payment module in an isolated module context. Only the
      // registration bootstrap is replaced with the already-tested JWT/DB middleware;
      // no payment credentials or provider requests exist in this worker.
      for(const key of ['WECHAT_MCH_ID','WECHAT_API_V3_KEY','WECHAT_API_CERT_PATH','WECHAT_CERT_SERIAL_NO','ALIPAY_APP_ID','ALIPAY_APP_PRIVATE_KEY','ALIPAY_PUBLIC_KEY'])delete process.env[key];
      accounts.exec(`DROP TABLE users; CREATE TABLE users(user_id INTEGER PRIMARY KEY,nickname TEXT,status TEXT,deleted_at TEXT,member_level TEXT DEFAULT 'basic',membership_expiry TEXT); INSERT INTO users(user_id,nickname,status) VALUES (123456,'测试购买账号','active');
        CREATE TABLE user_orders(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT,order_no TEXT UNIQUE,amount REAL,order_type TEXT,status TEXT,payment_method TEXT,created_at TEXT,paid_at TEXT);`);
      const actualRequire=require('node:module').createRequire(path.resolve(__dirname,'../backend_deploy/paymentRoutes.js'));
      const paymentModule={exports:{}};
      const context={module:paymentModule,exports:paymentModule.exports,__dirname:path.resolve(__dirname,'../backend_deploy'),process,Buffer,console,setInterval,clearInterval,URL,
        require:name=>name==='./register_routes'?{authMiddleware:require('../backend_deploy/middleware/auth').authMiddleware}:actualRequire(name)};
      require('node:vm').runInNewContext(fs.readFileSync(path.resolve(__dirname,'../backend_deploy/paymentRoutes.js'),'utf8'),context,{filename:'paymentRoutes.js'});
      app.use('/api/payment',paymentModule.exports.router);
      async function checkout(amount,extra={}){
        const response=await fetch(`http://127.0.0.1:${server.address().port}/api/payment/create`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token('123456')},body:JSON.stringify({type:'MEMBERSHIP',amount,extra:{membershipLevel:'monthly',...extra}})});
        return {status:response.status,body:await response.json()};
      }
      const staleCheckout=await checkout(0.01);
      assert.equal(staleCheckout.status,409,JSON.stringify(staleCheckout.body));
      assert.equal(accounts.prepare('SELECT COUNT(*) n FROM user_orders').get().n,0);
      assert.equal((await checkout(37,{salesPromotion:{discountPercent:99},growthCampaign:{commissionPolicy:'EXCLUDED'}})).status,200);
      const pending=accounts.prepare('SELECT amount,extra,status FROM user_orders').get();
      assert.equal(pending.amount,29.6);assert.equal(pending.status,'PENDING');
      const snapshot=JSON.parse(pending.extra);
      assert.equal(snapshot.salesPromotion.discountPercent,20);assert.equal(snapshot.salesPromotion.basePrice,37);assert.equal(snapshot.growthCampaign,undefined);
      assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/payment/pricing`).then(r=>r.json())).data.membershipPlans[1].price,29.6);
      const balanceRequest=async()=>{
        const response=await fetch(`http://127.0.0.1:${server.address().port}/api/payment/ai-credits`,{headers:{Authorization:'Bearer '+token('123456')}});
        return {status:response.status,body:await response.json()};
      };
      const buyPack=await fetch(`http://127.0.0.1:${server.address().port}/api/payment/create`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token('123456')},body:JSON.stringify({type:'AI_PACKAGE',amount:22.4,extra:{packageId:'pack_10',aiPackage:{count:999999},unlockTargetId:'forged'}})});
      assert.equal(buyPack.status,200);
      const packRow=accounts.prepare("SELECT * FROM user_orders WHERE order_type='AI_PACKAGE'").get();
      assert.equal(packRow.amount,22.4);
      const packExtra=JSON.parse(packRow.extra);
      assert.equal(packExtra.aiPackage.count,10);assert.equal(packExtra.unlockTargetId,undefined);
      const order={orderId:packRow.order_no,userId:'123456',type:'AI_PACKAGE',status:'PENDING',amount:packRow.amount,createdAt:packRow.created_at,extra:packExtra};
      context.deliverOrderBenefits(order);
      assert.equal((await balanceRequest()).body.data.credits,0);
      order.status='PAID';order.paidAt=new Date().toISOString();
      context.deliverOrderBenefits(order);
      assert.equal((await balanceRequest()).body.data.credits,10);
      order.benefitDelivered=false;context.deliverOrderBenefits(order);
      assert.equal((await balanceRequest()).body.data.credits,10);
      const realAuth=require('../backend_deploy/middleware/auth');
      for(let i=0;i<3;i++)assert.equal(realAuth.consumeAIQuotaInDB('123456').success,true);
      assert.equal((await balanceRequest()).body.data.credits,10);
      assert.equal(realAuth.consumeAIQuotaInDB('123456').success,true);
      assert.equal((await balanceRequest()).body.data.credits,9);
      const creditService=require('../backend_deploy/paymentAiCredits');
      creditService.grant(accounts,123456,'expired-test',2,'2025-01-01T00:00:00Z');
      assert.equal((await balanceRequest()).body.data.credits,9);
      accounts.prepare('UPDATE paid_ai_credits SET remaining=0 WHERE source_order_no=?').run(order.orderId);
      order.status='REFUNDED';order.benefitDelivered=false;context.deliverOrderBenefits(order);
      assert.equal((await balanceRequest()).body.data.credits,0);
      assert.equal(realAuth.consumeAIQuotaInDB('123456').success,false);
      assert.throws(()=>creditService.grant(accounts,123456,order.orderId,999,null));
      console.log('PASS: AI package purchase snapshot, pending cannot grant, paid delivery once, daily included allowance before purchased credits, expiry, refunds and invalid grant quantity.');
      const current=(await pricing('/promotion')).body.data;
      assert.equal((await pricing('/promotion','PUT',admin,{expectedRevision:current.revision,config:{...current,enabled:false}})).status,200);
      assert.equal((await pricing()).body.data.membershipPlans[1].price,37);
      assert.equal((await checkout(29.6)).status,409);
      assert.equal(accounts.prepare('SELECT COUNT(*) n FROM user_orders').get().n,2);
      console.log('PASS: real promotion HTTP public catalog, administrator-only writes, revision conflicts, sale prices and original-price preservation.');
      const matrixModule=require('../backend_deploy/toolAdminRoutes');
      app.use('/api/admin/tool-matrix',matrixModule.router);
      app.use('/api/public/tool-matrix',matrixModule.publicRouter);
      const origin=`http://127.0.0.1:${server.address().port}`;
      const matrix=async (adminRoute=false,patch,credential=admin)=>{
        const response=await fetch(origin+(adminRoute?'/api/admin/tool-matrix':'/api/public/tool-matrix'),{method:patch?'PUT':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+credential},body:patch?JSON.stringify(patch):undefined});
        return {status:response.status,body:await response.json()};
      };
      const defaults=(await matrix()).body.data.tools;
      for(const id of ['guoxue_books','academy_astronomy','zhongyi_yunqi']){assert.equal(defaults[id].payMode,'FREE');assert.equal(defaults[id].adEnabled,false);}
      const control={toolId:'academy_astronomy',patch:{payMode:'MEMBERSHIP',memberLevel:'monthly',adEnabled:true,adTitle:'经典学习课程',adImageUrl:'',adLinkUrl:'/books/'}};
      assert.equal((await matrix(true,control,support)).status,403);
      assert.equal((await matrix(true,control)).status,200);
      const published=(await matrix()).body.data.tools.academy_astronomy;
      assert.equal(published.memberLevel,'monthly');assert.equal(published.adEnabled,true);assert.equal(published.adLinkUrl,'/books/');
      assert.equal((await matrix(true,{toolId:'academy_astronomy',patch:{adLinkUrl:'javascript:alert(1)'}})).status,400);
      assert.equal((await matrix(true,{toolId:'academy_astronomy',patch:{memberLevel:'invented'}})).status,400);
      assert.equal((await matrix(true,{toolId:'academy_astronomy',patch:{script:'alert(1)'}})).status,400);
      assert.equal((await matrix(true,{toolId:'academy_astronomy',patch:{payMode:'FREE',memberLevel:'basic',adEnabled:false,adTitle:'',adLinkUrl:''}})).status,200);
      console.log('PASS: real administrator tool controls, new learning modules default free/ad-free, membership and static sponsorship fields, permissions and executable URL rejection.');
      accounts.exec('ALTER TABLE users RENAME TO inaccessible_users');
      assert.equal((await feedback('/list','GET',token('123456'))).status,503);
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
